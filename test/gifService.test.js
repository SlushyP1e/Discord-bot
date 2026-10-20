import test from 'node:test';
import assert from 'node:assert/strict';
import { GifService, headValidate } from '../src/gif/gifService.js';

function makeProvider(name, _urls = {}) {
  return {
    name,
    map: { hug: 'hug' },
    url: (cat) => `https://${name}/api/${cat}`,
    extract: (data) => ({ url: data?.url, anime: data?.anime }),
  };
}

function okResponse(url, anime) {
  return { ok: true, json: async () => ({ url, anime }) };
}

test('returns a gif from the first (primary) provider', async () => {
  const service = new GifService({
    providers: [makeProvider('primary'), makeProvider('backup')],
    fetchFn: async (url) => {
      assert.ok(url.startsWith('https://primary/'));
      return okResponse('https://cdn/gif1.gif');
    },
  });
  const result = await service.getGif('hug');
  assert.equal(result.url, 'https://cdn/gif1.gif');
  assert.equal(result.provider, 'primary');
});

test('threads the source anime name through when a provider reports it', async () => {
  const service = new GifService({
    providers: [makeProvider('primary')],
    fetchFn: async () => okResponse('https://cdn/gif.gif', 'Clannad'),
  });
  const result = await service.getGif('hug');
  assert.equal(result.anime, 'Clannad');
});

test('falls back to the next provider when the first fails', async () => {
  const service = new GifService({
    providers: [makeProvider('primary'), makeProvider('backup')],
    fetchFn: async (url) => {
      if (url.startsWith('https://primary/')) throw new Error('boom');
      return okResponse('https://cdn/gif2.gif');
    },
  });
  const result = await service.getGif('hug');
  assert.equal(result.provider, 'backup');
});

test('falls back when a provider returns non-OK or malformed responses', async () => {
  let calls = [];
  const service = new GifService({
    providers: [makeProvider('a'), makeProvider('b'), makeProvider('c')],
    fetchFn: async (url) => {
      calls.push(url);
      if (url.startsWith('https://a/')) return { ok: false, status: 503, json: async () => ({}) };
      if (url.startsWith('https://b/')) return { ok: true, json: async () => ({ nope: true }) };
      return okResponse('https://cdn/gif3.gif');
    },
  });
  const result = await service.getGif('hug');
  assert.equal(result.provider, 'c');
  assert.equal(calls.length, 3);
});

test('skips providers that do not support the category', async () => {
  const noHug = { name: 'nohug', map: {}, url: () => 'https://nohug/x', extract: (d) => d?.url };
  const service = new GifService({
    providers: [noHug, makeProvider('backup')],
    fetchFn: async (url) => {
      assert.ok(!url.startsWith('https://nohug/'), 'unsupported provider must not be called');
      return okResponse('https://cdn/gif.gif');
    },
  });
  const result = await service.getGif('hug');
  assert.equal(result.provider, 'backup');
});

test('circuit breaker: provider is skipped after repeated failures, retried after cooldown', async () => {
  let primaryCalls = 0;
  const service = new GifService({
    providers: [makeProvider('flaky'), makeProvider('backup')],
    failureThreshold: 3,
    cooldownMs: 60_000,
    fetchFn: async (url) => {
      if (url.startsWith('https://flaky/')) {
        primaryCalls += 1;
        throw new Error('down');
      }
      return okResponse('https://cdn/gif.gif');
    },
  });

  // 3 failures trip the breaker...
  await service.getGif('hug');
  await service.getGif('hug');
  await service.getGif('hug');
  assert.equal(primaryCalls, 3);
  assert.equal(service.getStatus().find((p) => p.name === 'flaky').up, false);

  // ...so the next request skips flaky entirely.
  await service.getGif('hug');
  assert.equal(primaryCalls, 3);

  // After the cooldown expires it gets another chance.
  service.state.get('flaky').downUntil = Date.now() - 1;
  await service.getGif('hug');
  assert.equal(primaryCalls, 4);
});

test('serves a cached gif when every provider is down', async () => {
  let fail = false;
  const service = new GifService({
    providers: [makeProvider('only')],
    fetchFn: async () => {
      if (fail) throw new Error('outage');
      return okResponse('https://cdn/cached.gif');
    },
  });

  const first = await service.getGif('hug');
  assert.equal(first.provider, 'only');

  fail = true;
  const second = await service.getGif('hug');
  assert.equal(second.url, 'https://cdn/cached.gif');
  assert.equal(second.provider, 'cache');
});

test('skips a blocked GIF url and fetches another from the same provider', async () => {
  let call = 0;
  const service = new GifService({
    providers: [makeProvider('p')],
    isBlockedUrl: (u) => u === 'https://cdn/bad.gif',
    fetchFn: async () => okResponse(call++ === 0 ? 'https://cdn/bad.gif' : 'https://cdn/good.gif'),
  });
  const result = await service.getGif('hug');
  assert.equal(result.url, 'https://cdn/good.gif');
});

test('skips GIFs whose source anime is blocked', async () => {
  let call = 0;
  const service = new GifService({
    providers: [makeProvider('p')],
    isBlockedAnime: (a) => a === 'BadShow',
    fetchFn: async () =>
      call++ === 0 ? okResponse('https://cdn/1.gif', 'BadShow') : okResponse('https://cdn/2.gif', 'GoodShow'),
  });
  const result = await service.getGif('hug');
  assert.equal(result.anime, 'GoodShow');
});

test('returns null when every fetched GIF is blocked and nothing is cached', async () => {
  const service = new GifService({
    providers: [makeProvider('p')],
    isBlockedUrl: () => true,
    fetchFn: async () => okResponse('https://cdn/x.gif'),
  });
  assert.equal(await service.getGif('hug'), null);
});

test('skips a dead-link GIF and returns a live one from the same provider', async () => {
  let call = 0;
  const service = new GifService({
    providers: [makeProvider('p')],
    validateUrl: async (u) => u === 'https://cdn/live.gif',
    fetchFn: async () => okResponse(call++ === 0 ? 'https://cdn/dead.gif' : 'https://cdn/live.gif'),
  });
  const result = await service.getGif('hug');
  assert.equal(result.url, 'https://cdn/live.gif');
});

test('returns null when every fetched GIF fails validation (caller shows the napping note)', async () => {
  const service = new GifService({
    providers: [makeProvider('a'), makeProvider('b')],
    validateUrl: async () => false,
    fetchFn: async () => okResponse('https://cdn/dead.gif'),
  });
  assert.equal(await service.getGif('hug'), null);
});

test('skips a dead cached GIF in the last-resort fallback', async () => {
  let live = true;
  const service = new GifService({
    providers: [makeProvider('only')],
    // Re-validate every time, so this checks the strict path — with the
    // default validation cache the just-verified URL would be trusted.
    validationTtlMs: 0,
    validateUrl: async (u) => (u === 'https://cdn/cached.gif' ? live : true),
    fetchFn: (() => {
      let n = 0;
      return async () => {
        if (n++ === 0) return okResponse('https://cdn/cached.gif'); // first call succeeds -> cached
        throw new Error('provider down');
      };
    })(),
  });

  // Prime the cache with a (then-live) gif.
  const first = await service.getGif('hug');
  assert.equal(first.url, 'https://cdn/cached.gif');

  // Now the provider is down and the cached gif has gone dead -> null, not blank.
  live = false;
  assert.equal(await service.getGif('hug'), null);
});

test('headValidate accepts live images and rejects dead/non-image links', async () => {
  const res = (status, contentType) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => contentType },
  });
  assert.equal(await headValidate('x', { fetchFn: async () => res(200, 'image/gif') }), true);
  assert.equal(await headValidate('x', { fetchFn: async () => res(404, 'text/html') }), false);
  assert.equal(await headValidate('x', { fetchFn: async () => res(405, null) }), true); // HEAD unsupported
  assert.equal(await headValidate('x', { fetchFn: async () => res(403, 'text/html') }), true); // hotlink protection
  assert.equal(await headValidate('x', { fetchFn: async () => res(429, 'text/html') }), true); // rate limited
  assert.equal(await headValidate('x', { fetchFn: async () => res(200, 'text/html') }), false);
  assert.equal(await headValidate('x', { fetchFn: async () => { throw new Error('boom'); } }), false);
});

test('returns null (never throws) when everything is down and cache is empty', async () => {
  const service = new GifService({
    providers: [makeProvider('a'), makeProvider('b')],
    fetchFn: async () => {
      throw new Error('total outage');
    },
  });
  const result = await service.getGif('hug');
  assert.equal(result, null);
});

test('real provider maps cover every command category', () => {
  const service = new GifService();
  // Every GIF category used by the love/mood commands must have >= 1 provider.
  const categories = [
    'hug', 'kiss', 'cuddle', 'lick', 'pat', 'slap', 'poke', 'bite', 'tickle', 'feed',
    'highfive', 'wave', 'handhold', 'nom', 'bonk', 'yeet', 'kick', 'punch', 'stare', 'boop',
    'dance', 'blush', 'cry', 'laugh', 'smile', 'wink', 'pout', 'smug', 'sleep', 'shrug', 'facepalm',
    // Newer reaction commands.
    'airkiss', 'nuzzle', 'pinch', 'peek', 'handshake', 'baka', 'shoot',
    'happy', 'celebrate', 'clap', 'cheers', 'shy', 'nervous', 'yawn', 'thumbsup',
  ];
  for (const cat of categories) {
    assert.ok(service.supports(cat), `no provider supports category "${cat}"`);
  }
});

test('a passed liveness check is remembered per URL (validation cache)', async () => {
  let validations = 0;
  const service = new GifService({
    providers: [makeProvider('only')],
    validateUrl: async () => {
      validations += 1;
      return true;
    },
    // Same URL every time — that's the case the cache exists for.
    fetchFn: async () => okResponse('https://cdn/same.gif'),
  });

  await service.getGif('hug');
  await service.getGif('hug');
  assert.equal(validations, 1, 'the second request must reuse the cached verdict');

  // An expired verdict gets re-proven.
  service.validatedUntil.set('https://cdn/same.gif', Date.now() - 1);
  await service.getGif('hug');
  assert.equal(validations, 2);
});

test('validationTtlMs: 0 re-validates on every request', async () => {
  let validations = 0;
  const service = new GifService({
    providers: [makeProvider('only')],
    validationTtlMs: 0,
    validateUrl: async () => {
      validations += 1;
      return true;
    },
    fetchFn: async () => okResponse('https://cdn/same.gif'),
  });

  await service.getGif('hug');
  await service.getGif('hug');
  assert.equal(validations, 2);
});

test('stops hunting providers once the time budget runs out', async () => {
  const slowFail = async () => {
    await new Promise((r) => setTimeout(r, 20));
    throw new Error('down');
  };
  let backupCalled = false;
  const service = new GifService({
    providers: [makeProvider('slow1'), makeProvider('backup')],
    budgetMs: 10,
    fetchFn: async (url) => {
      if (url.startsWith('https://backup/')) backupCalled = true;
      return slowFail();
    },
  });

  // Both providers are too slow for the budget: no provider answer, and the
  // second one isn't even attempted. Cache is empty -> null.
  assert.equal(await service.getGif('hug'), null);
  assert.equal(backupCalled, false, 'past the budget, later providers must be skipped');
});
