import test from 'node:test';
import assert from 'node:assert/strict';
import { milestoneLine, pluralize } from '../src/commands/love/_factory.js';

test('milestoneLine only fires on landmark counts', () => {
  assert.equal(milestoneLine(9, 'hug'), undefined);
  assert.equal(milestoneLine(11, 'hug'), undefined);
  assert.equal(milestoneLine(101, 'hug'), undefined);
  assert.equal(milestoneLine(1, 'hug'), undefined);

  for (const n of [10, 25, 50, 100, 250, 500, 1000]) {
    const line = milestoneLine(n, 'hug');
    assert.ok(line, `expected a milestone line for ${n}`);
    assert.ok(line.includes(String(n)), 'line should mention the count');
    assert.ok(line.includes('hugs'), 'line should use the pluralized noun');
  }
});

test('pluralize handles nouns ending in s/x/z/ch/sh correctly', () => {
  assert.equal(pluralize('hug'), 'hugs');
  assert.equal(pluralize('boop'), 'boops');
  assert.equal(pluralize('high-five'), 'high-fives');
  assert.equal(pluralize('kiss'), 'kisses');
  assert.equal(pluralize('air kiss'), 'air kisses');
});

test('milestoneLine pluralizes an -s noun without mangling it', () => {
  const line = milestoneLine(100, 'kiss');
  assert.ok(line.includes('kisses'), 'should read "kisses", not "kisss"');
  assert.ok(!line.includes('kisss'), 'must not produce the triple-s bug');
});
