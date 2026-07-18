import test from 'node:test';
import assert from 'node:assert/strict';
import { GifService } from '../src/gif/gifService.js';

function makeProvider(name, urls = {}) {
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
  ];
  for (const cat of categories) {
    assert.ok(service.supports(cat), `no provider supports category "${cat}"`);
  }
});
