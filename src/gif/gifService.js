import nekosBest from './providers/nekosBest.js';
import waifuPics from './providers/waifuPics.js';
import otakuGifs from './providers/otakuGifs.js';
import purrbot from './providers/purrbot.js';
import nekosLife from './providers/nekosLife.js';

export const defaultProviders = [nekosBest, waifuPics, otakuGifs, purrbot, nekosLife];

/**
 * GIF fetcher with multi-provider failover.
 *
 * - Tries providers in priority order; each request has a hard timeout.
 * - Circuit breaker: a provider that fails `failureThreshold` times in a row
 *   is skipped for `cooldownMs`, then given another chance.
 * - Every successful GIF URL is remembered per category; if every provider is
 *   down, a cached URL is served so the bot keeps working during full outages.
 */
export class GifService {
  constructor({
    providers = defaultProviders,
    fetchFn = globalThis.fetch,
    timeoutMs = 5000,
    failureThreshold = 3,
    cooldownMs = 5 * 60_000,
    cacheSize = 25,
    // Blocklist predicates — a returned GIF is dropped (and another fetched) when
    // its URL or source anime is blocked. Default: nothing blocked.
    isBlockedUrl = () => false,
    isBlockedAnime = () => false,
    blockedRetries = 3,
  } = {}) {
    this.providers = providers;
    this.fetchFn = fetchFn;
    this.timeoutMs = timeoutMs;
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.cacheSize = cacheSize;
    this.isBlockedUrl = isBlockedUrl;
    this.isBlockedAnime = isBlockedAnime;
    this.blockedRetries = blockedRetries;
    this.state = new Map(providers.map((p) => [p.name, { failures: 0, downUntil: 0 }]));
    this.cache = new Map();
  }

  supports(category) {
    return this.providers.some((p) => p.map[category]);
  }

  #isBlocked(entry) {
    return this.isBlockedUrl(entry.url) || this.isBlockedAnime(entry.anime);
  }

  /** @returns {Promise<{url: string, anime?: string, provider: string} | null>} never throws */
  async getGif(category) {
    for (const provider of this.providers) {
      const mapped = provider.map[category];
      if (!mapped) continue;

      const state = this.state.get(provider.name);
      if (state.downUntil > Date.now()) continue;

      // Retry the same provider a few times if it hands back a blocked GIF,
      // before falling through to the next provider.
      for (let attempt = 0; attempt < this.blockedRetries; attempt++) {
        let entry;
        try {
          const res = await this.fetchFn(provider.url(mapped), {
            signal: AbortSignal.timeout(this.timeoutMs),
            headers: { accept: 'application/json', 'user-agent': 'SlushyLove Discord Bot' },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const { url, anime } = provider.extract(await res.json()) ?? {};
          if (typeof url !== 'string' || !url.startsWith('http')) throw new Error('no gif url in response');
          entry = { url, anime };
        } catch {
          state.failures += 1;
          if (state.failures >= this.failureThreshold) {
            state.downUntil = Date.now() + this.cooldownMs;
            state.failures = 0;
          }
          break; // network/parse error — move on to the next provider
        }

        state.failures = 0;
        state.downUntil = 0;
        if (this.#isBlocked(entry)) continue; // blocked — ask this provider again
        this.#remember(category, entry);
        return { url: entry.url, anime: entry.anime, provider: provider.name };
      }
    }

    // Last resort: a cached GIF, skipping anything now blocked.
    const cached = (this.cache.get(category) ?? []).filter((e) => !this.#isBlocked(e));
    if (cached.length) {
      const pick = cached[Math.floor(Math.random() * cached.length)];
      return { url: pick.url, anime: pick.anime, provider: 'cache' };
    }
    return null;
  }

  #remember(category, entry) {
    let bucket = this.cache.get(category);
    if (!bucket) this.cache.set(category, (bucket = []));
    if (bucket.some((e) => e.url === entry.url)) return;
    bucket.push(entry);
    if (bucket.length > this.cacheSize) bucket.shift();
  }

  getStatus() {
    const now = Date.now();
    return this.providers.map((p) => {
      const state = this.state.get(p.name);
      return { name: p.name, up: state.downUntil <= now };
    });
  }
}
