import test from 'node:test';
import assert from 'node:assert/strict';
import { tallyLine } from '../src/commands/fun/wouldyourather.js';

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