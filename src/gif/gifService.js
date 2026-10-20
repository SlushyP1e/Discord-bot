import nekosBest from './providers/nekosBest.js';
import waifuPics from './providers/waifuPics.js';
import otakuGifs from './providers/otakuGifs.js';
import purrbot from './providers/purrbot.js';
import nekosLife from './providers/nekosLife.js';

export const defaultProviders = [nekosBest, waifuPics, otakuGifs, purrbot, nekosLife];

/** Returns a shuffled copy of an array (Fisher–Yates). */
function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Confirms a GIF URL actually points to a live image, so we never post a dead
 * link (which Discord renders as a blank embed). Errs on the side of "usable":
 * if HEAD isn't supported or is blocked (403/405/429/501) or gives no
 * content-type, we allow it.
 * @returns {Promise<boolean>}
 */
export async function headValidate(url, { fetchFn = globalThis.fetch, timeoutMs = 4000 } = {}) {
  try {
    const res = await fetchFn(url, { method: 'HEAD', signal: AbortSignal.timeout(timeoutMs) });
    if ([403, 405, 429, 501].includes(res.status)) return true;
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
 * - A hard time `budgetMs` caps how long we'll keep trying providers before
 *   falling back to the cache — so a run of slow failures can't stall a
 *   deferred interaction for half a minute.
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
    // A passed liveness check is remembered per URL for this long, so repeat
    // requests skip the extra round-trip. 0 re-validates every time.
    validationTtlMs = 10 * 60_000,
    // Ceiling on total provider-hunting time per getGif() call.
    budgetMs = 8_000,
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
    this.validationTtlMs = validationTtlMs;
    this.budgetMs = budgetMs;
    this.state = new Map(providers.map((p) => [p.name, { failures: 0, downUntil: 0 }]));
    this.cache = new Map();
    /** @type {Map<string, number>} url → timestamp until which it's known live */
    this.validatedUntil = new Map();
  }

  supports(category) {
    return this.providers.some((p) => p.map[category]);
  }

  #isBlocked(entry) {
    return this.isBlockedUrl(entry.url) || this.isBlockedAnime(entry.anime);
  }

  async #isUsable(entry) {
    if (this.#isBlocked(entry)) return false;
    if (!this.validateUrl) return true;
    // A URL that passed recently doesn't need proving again.
    const okUntil = this.validatedUntil.get(entry.url);
    if (okUntil !== undefined) {
      if (okUntil > Date.now()) return true;
      this.validatedUntil.delete(entry.url);
    }
    if (!(await this.validateUrl(entry.url))) return false;
    if (this.validationTtlMs > 0) {
      this.validatedUntil.set(entry.url, Date.now() + this.validationTtlMs);
    }
    return true;
  }

  /** @returns {Promise<{url: string, anime?: string, provider: string} | null>} never throws */
  async getGif(category) {
    const deadline = Date.now() + this.budgetMs;
    for (const provider of this.providers) {
      const mapped = provider.map[category];
      if (!mapped) continue;
      // Past the time budget? Stop shopping and fall through to the cache.
      if (Date.now() >= deadline) break;

      const state = this.state.get(provider.name);
      if (state.downUntil > Date.now()) continue;

      // Retry the same provider a few times if it hands back a blocked GIF,
      // before falling through to the next provider.
      for (let attempt = 0; attempt < this.blockedRetries; attempt++) {
        if (Date.now() >= deadline) break;
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
    for (const pick of shuffle(this.cache.get(category) ?? [])) {
      if (!(await this.#isUsable(pick))) continue;
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
