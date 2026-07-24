import nekosBest from './providers/nekosBest.js';
import waifuPics from './providers/waifuPics.js';
import otakuGifs from './providers/otakuGifs.js';
import purrbot from './providers/purrbot.js';
import nekosLife from './providers/nekosLife.js';

export const defaultProviders = [nekosBest, waifuPics, otakuGifs, purrbot, nekosLife];

/**
 * Confirms a GIF URL actually points to a live image, so we never post a dead
 * link (which Discord renders as a blank embed). Errs on the side of "usable":
 * if HEAD isn't supported (405/501) or gives no content-type, we allow it.
 * @returns {Promise<boolean>}
 */
/** Returns a shuffled copy of an array (Fisher–Yates). */
function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function headValidate(url, { fetchFn = globalThis.fetch, timeoutMs = 4000 } = {}) {
  try {
    const res = await fetchFn(url, { method: 'HEAD', signal: AbortSignal.timeout(timeoutMs) });
    if (res.status === 405 || res.status === 501) return true; // HEAD not allowed — can't disprove
    if (!res.ok) return false;
    const type = res.headers?.get?.('content-type') ?? '';
    return type === '' || type.startsWith('image');
  } catch {
    return false;
  }
}

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
    // Optional async (url) => boolean liveness check. When set, GIFs that fail
    // it are skipped like blocked ones, so a dead link never reaches Discord.
    validateUrl = null,
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
    this.validateUrl = validateUrl;
    this.state = new Map(providers.map((p) => [p.name, { failures: 0, downUntil: 0 }]));
    this.cache = new Map();
  }

  supports(category) {
    return this.providers.some((p) => p.map[category]);
  }

  #isBlocked(entry) {
    return this.isBlockedUrl(entry.url) || this.isBlockedAnime(entry.anime);
  }

  async #isUsable(entry) {
    if (this.#isBlocked(entry)) return false;
    if (this.validateUrl && !(await this.validateUrl(entry.url))) return false;
    return true;
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
        // Skip blocked or dead-link GIFs — ask this provider again.
        if (!(await this.#isUsable(entry))) continue;
        this.#remember(category, entry);
        return { url: entry.url, anime: entry.anime, provider: provider.name };
      }
    }

    // Last resort: a cached GIF, skipping anything blocked or now dead.
    const cached = (this.cache.get(category) ?? []).filter((e) => !this.#isBlocked(e));
    for (const pick of shuffle(cached)) {
      if (this.validateUrl && !(await this.validateUrl(pick.url))) continue;
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
