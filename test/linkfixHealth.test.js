import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const realFetch = globalThis.fetch;

function stubFetch(handler) {
  globalThis.fetch = async () => handler();
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

// The module caches verdicts for 15 minutes, which would poison these tests,
// so reimport a fresh instance each time via a cache-busting query.
function fresh() {
  return import(`../src/linkfix/health.js?cache=${Math.random()}`);
}

test('drops unreachable hosts and keeps priority order', async () => {
  const { hostAlive, pickWorkingUrls } = await fresh();

  stubFetch(() => ({ status: 200 }));
  assert.equal(await hostAlive('alive.example.com'), true);

  stubFetch(() => { throw new Error('ECONNREFUSED'); });
  assert.equal(await hostAlive('dead.example.com'), false);

  const result = await pickWorkingUrls([
    'https://dead.example.com/reel/1/',
    'https://alive.example.com/reel/1/',
    'https://also-dead.example.com/reel/1/',
  ]);
  assert.deepEqual(result, ['https://alive.example.com/reel/1/']);
});

test('returns full list when every host is dead', async () => {
  const { pickWorkingUrls } = await fresh();
  stubFetch(() => { throw new Error('DNS'); });
  const urls = ['https://a.example.com/reel/1/', 'https://b.example.com/reel/1/'];
  assert.deepEqual(await pickWorkingUrls(urls), urls);
});

test('hostAlive verdicts: 5xx dies, 404 stays alive, throws never propagate', async () => {
  const { hostAlive } = await fresh();

  stubFetch(() => ({ status: 503 }));
  assert.equal(await hostAlive('down.example.com'), false);

  stubFetch(() => ({ status: 404 }));
  assert.equal(await hostAlive('up.example.com'), true);

  stubFetch(() => { throw new Error('boom'); });
  assert.equal(await hostAlive('down2.example.com'), false);
});