// Maps social-media hosts to "fixer" proxy services that provide proper video
// embeds in Discord. Each platform lists hosts in priority order (primary
// first, then fallbacks the user can cycle to). Rewriting is a pure host swap.

const PLATFORMS = [
  {
    name: 'Twitter / X',
    match: (h) => ['twitter.com', 'x.com', 'mobile.twitter.com'].includes(h),
    hosts: ['fxtwitter.com', 'vxtwitter.com', 'fixupx.com'],
  },
  {
    name: 'TikTok',
    match: (h) => h === 'tiktok.com' || h.endsWith('.tiktok.com'),
    hosts: ['tnktok.com', 'tiktxk.com'],
  },
  {
    name: 'Instagram',
    match: (h) => h === 'instagram.com' || h.endsWith('.instagram.com'),
    // zzinstagram (InstaEmbedRouter) is a self-healing router that fans out to
    // several upstream fixers, so it stays up when individual ones die. d.zz is
    // its media-only variant; vxinstagram is an independent SnapSave-backed fixer.
    hosts: ['zzinstagram.com', 'd.zzinstagram.com', 'vxinstagram.com'],
  },
  {
    name: 'Reddit',
    match: (h) => h === 'reddit.com' || h.endsWith('.reddit.com'),
    hosts: ['rxddit.com', 'vxreddit.com'],
  },
  {
    name: 'Threads',
    match: (h) => h === 'threads.net' || h.endsWith('.threads.net'),
    hosts: ['vxthreads.net', 'fixthreads.net'],
  },
  {
    name: 'Bluesky',
    match: (h) => h === 'bsky.app',
    hosts: ['fxbsky.app'],
  },
  {
    name: 'Pixiv',
    match: (h) => h === 'pixiv.net' || h.endsWith('.pixiv.net'),
    hosts: ['phixiv.net'],
  },
];

export const SUPPORTED_PLATFORMS = PLATFORMS.map((p) => p.name);

export function detectPlatform(hostname) {
  const h = hostname.toLowerCase().replace(/^www\./, '');
  return PLATFORMS.find((p) => p.match(h));
}

/**
 * Rewrites a social-media URL into an ordered list of fixed URLs (one per
 * fixer service). Strips tracking query params and fragments for a clean embed.
 * @returns {{platform: string, urls: string[]} | null} null if unsupported/invalid.
 */
export function buildFixedUrls(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl).trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const platform = detectPlatform(url.hostname);
  if (!platform) return null;

  url.search = '';
  url.hash = '';
  const path = url.pathname === '/' ? '' : url.pathname;

  return {
    platform: platform.name,
    urls: platform.hosts.map((host) => `https://${host}${path}`),
  };
}
