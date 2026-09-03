import test from 'node:test';
import assert from 'node:assert/strict';
import { tallyLine, resultsBreakdown } from '../src/commands/fun/wouldyourather.js';

test('leader gets the crown', () => {
  assert.equal(tallyLine(3, 7), '📊 **A:** 3  ·  **B:** 7 👑');
  assert.equal(tallyLine(7, 3), '📊 **A:** 7 👑  ·  **B:** 3');
});

test('tie crowns neither side', () => {
  assert.equal(tallyLine(3, 3), '📊 **A:** 3  ·  **B:** 3');
  assert.equal(tallyLine(0, 0), '📊 No votes yet — be the first!');
});

test('zero on one side still picks a winner', () => {
  assert.equal(tallyLine(0, 2), '📊 **A:** 0  ·  **B:** 2 👑');
  assert.equal(tallyLine(2, 0), '📊 **A:** 2 👑  ·  **B:** 0');
});

test('results breakdown lists voters per side', () => {
  const voters = new Map([
    ['u1', 'a'],
    ['u2', 'b'],
    ['u3', 'a'],
  ]);
  const out = resultsBreakdown('cats', 'dogs', voters);
  assert.ok(out.includes('🅰️ cats — 2 votes: <@u1>, <@u3>'));
  assert.ok(out.includes('🅱️ dogs — 1 vote: <@u2>'));
});

test('results breakdown shows no votes for an empty side', () => {
  const out = resultsBreakdown('cats', 'dogs', new Map());
  assert.ok(out.includes('🅰️ cats — no votes yet'));
  assert.ok(out.includes('🅱️ dogs — no votes yet'));
});