// Liveness detection for embed-fixer services. Third-party fixer hosts go
// dark without warning (and get squatted by parked/redirect domains), so
// before serving a fixed link we probe each host once, cache the verdict for
// a while, and drop dead ones from the candidate list. If everything is down
// we fall back to the full list rather than refusing — the user can still
// cycle services manually with the button.

const CHECK_TTL_MS = 15 * 60_000; // re-probe a host at most every 15 min
const CHECK_TIMEOUT_MS = 4000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const results = new Map(); // host -> Promise<boolean> (single-flight + cache)
const checkedAt = new Map(); // host -> timestamp of last probe

/** Probe one host and report whether it served a plausible response. */
async function probe(host) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(`https://${host}/`, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT, accept: '*/*' },
    });
    // 4xx/200 mean the service is up (some fixers 404 on their root page);
    // 5xx and 429 are the "actually broken / rate-limited" signals.
    return res.status < 500 && res.status !== 429;
  } catch {
    return false; // DNS failure, refused, timeout, or a dead/TLS-broken host
  } finally {
    clearTimeout(timer);
  }
}

/** Resolves to whether a fixer host is currently reachable. Cached + deduped. */
export function hostAlive(host) {
  const last = checkedAt.get(host) ?? 0;
  if (Date.now() - last < CHECK_TTL_MS && results.has(host)) return results.get(host);
  checkedAt.set(host, Date.now());
  const verdict = probe(host).catch(() => false);
  results.set(host, verdict);
  return verdict;
}

/**
 * Drops fixer URLs whose host is currently unreachable, preserving priority
 * order. Returns the trimmed list — or the original list if all are dead.
 * @param {string[]} urls
 * @returns {Promise<string[]>}
 */
export async function pickWorkingUrls(urls) {
  const verdicts = new Map();
  await Promise.all(
    [...new Set(urls.map((u) => new URL(u).hostname))].map(async (host) => {
      verdicts.set(host, await hostAlive(host));
    }),
  );
  const kept = urls.filter((u) => verdicts.get(new URL(u).hostname));
  return kept.length ? kept : urls;
}