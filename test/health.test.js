import test from 'node:test';
import assert from 'node:assert/strict';
import { startHealthServer } from '../src/health.js';

async function listen(server) {
  await new Promise((resolve) => {
    if (server.listening) resolve();
    else server.once('listening', resolve);
  });
  return server.address().port;
}

test('health endpoint reports readiness and 404s other paths', async () => {
  // A stand-in for the discord.js client: `user` only exists once the
  // gateway is connected.
  const fakeClient = { user: null };
  const server = startHealthServer({ port: 0, client: fakeClient });
  try {
    const port = await listen(server);
    const base = `http://127.0.0.1:${port}`;

    const before = await (await fetch(`${base}/healthz`)).json();
    assert.equal(before.ok, true);
    assert.equal(before.ready, false);
    assert.equal(typeof before.uptimeSec, 'number');

    fakeClient.user = { id: 'bot' };
    const after = await (await fetch(`${base}/healthz`)).json();
    assert.equal(after.ready, true);

    assert.equal((await fetch(`${base}/other`)).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
