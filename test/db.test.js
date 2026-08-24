import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/db/database.js';

const G = 'guild1';

test('interaction counters increment per pair and action', () => {
  const db = createDatabase(':memory:');

  assert.equal(db.interactions.increment(G, 'alice', 'bob', 'hug'), 1);
  assert.equal(db.interactions.increment(G, 'alice', 'bob', 'hug'), 2);
  assert.equal(db.interactions.increment(G, 'alice', 'bob', 'kiss'), 1);
  assert.equal(db.interactions.increment(G, 'bob', 'alice', 'hug'), 1);
  // A different guild starts from scratch.
  assert.equal(db.interactions.increment('guild2', 'alice', 'bob', 'hug'), 1);

  const given = db.interactions.topGiven(G, 'alice');
  assert.deepEqual(given[0], { action: 'hug', total: 2 });

  const received = db.interactions.topReceived(G, 'bob');
  assert.equal(received.find((r) => r.action === 'hug').total, 2);

  assert.equal(db.interactions.favoriteTarget(G, 'alice').target_id, 'bob');
  assert.equal(db.interactions.biggestFan(G, 'bob').user_id, 'alice');
  db.close();
});

test('marriage lifecycle: marry, lookup from both sides, divorce', () => {
  const db = createDatabase(':memory:');

  assert.equal(db.marriages.get(G, 'alice'), undefined);
  db.marriages.marry(G, 'bob', 'alice');

  const fromA = db.marriages.get(G, 'alice');
  const fromB = db.marriages.get(G, 'bob');
  assert.ok(fromA && fromB);
  assert.equal(fromA.married_at, fromB.married_at);
  assert.deepEqual([fromA.user_a, fromA.user_b].sort(), ['alice', 'bob']);

  // Same users can be married in a different guild independently.
  db.marriages.marry('guild2', 'alice', 'bob');

  assert.equal(db.marriages.divorce(G, 'bob'), true);
  assert.equal(db.marriages.get(G, 'alice'), undefined);
  assert.equal(db.marriages.divorce(G, 'bob'), false);
  assert.ok(db.marriages.get('guild2', 'alice'), 'other guild marriage untouched');
  db.close();
});

test('marry is atomic: refuses when either partner is already married', () => {
  const db = createDatabase(':memory:');

  assert.equal(db.marriages.marry(G, 'alice', 'bob'), true);
  // Either side proposing to someone else loses the race.
  assert.equal(db.marriages.marry(G, 'alice', 'carol'), false);
  assert.equal(db.marriages.marry(G, 'dave', 'bob'), false);
  assert.ok(db.marriages.get(G, 'alice'), 'original marriage intact');

  // After a divorce the same pair can remarry.
  db.marriages.divorce(G, 'alice');
  assert.equal(db.marriages.marry(G, 'bob', 'alice'), true);

  // Other guilds are unaffected by who's married where.
  assert.equal(db.marriages.marry('guild2', 'alice', 'carol'), true);
  db.close();
});

test('blocklist blocks gifs (idempotent) and anime (case-insensitive)', () => {
  const db = createDatabase(':memory:');

  assert.equal(db.blocklist.isBlockedUrl('http://x/a.gif'), false);
  assert.equal(db.blocklist.blockGif('http://x/a.gif', 'reported', 'owner'), true);
  assert.equal(db.blocklist.blockGif('http://x/a.gif', 'reported', 'owner'), false);
  assert.equal(db.blocklist.isBlockedUrl('http://x/a.gif'), true);

  assert.equal(db.blocklist.isBlockedAnime('Bad Show'), false);
  db.blocklist.blockAnime('Bad Show', 'owner');
  assert.equal(db.blocklist.isBlockedAnime('bad show'), true);
  assert.equal(db.blocklist.isBlockedAnime(undefined), false);

  assert.deepEqual(db.blocklist.counts(), { gifs: 1, anime: 1 });
  db.close();
});
