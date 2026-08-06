import test from 'node:test';
import assert from 'node:assert/strict';
import { channelRecipientIds, resolveImplicitTarget } from '../src/utils/dmTarget.js';

const ME = 'me';
const BOT = 'bot';
const FRIEND = 'friend';

const resolve = (opts) =>
  resolveImplicitTarget({ recipientIds: [], invokerId: ME, botId: BOT, inGuild: false, isBotDm: false, ...opts });

test('recipients are read from every shape Discord sends them in', () => {
  // A discord.js Collection.
  assert.deepEqual(
    channelRecipientIds({ recipients: new Map([[FRIEND, { id: FRIEND }]]) }),
    [FRIEND],
  );
  // A raw array of user objects, as it arrives on the interaction payload.
  assert.deepEqual(channelRecipientIds({ recipients: [{ id: FRIEND }, { id: ME }] }), [FRIEND, ME]);
  // An array of bare IDs.
  assert.deepEqual(channelRecipientIds({ recipients: [FRIEND] }), [FRIEND]);
  // The single-recipient DM channel forms.
  assert.deepEqual(channelRecipientIds({ recipientId: FRIEND }), [FRIEND]);
  assert.deepEqual(channelRecipientIds({ recipient: { id: FRIEND } }), [FRIEND]);
  // Duplicates across those sources collapse.
  assert.deepEqual(channelRecipientIds({ recipients: [{ id: FRIEND }], recipientId: FRIEND }), [FRIEND]);
  // Nothing usable.
  assert.deepEqual(channelRecipientIds(null), []);
  assert.deepEqual(channelRecipientIds({}), []);
  assert.deepEqual(channelRecipientIds({ recipients: 'nonsense' }), []);
});

test('a one-on-one DM implies the other person', () => {
  assert.deepEqual(resolve({ recipientIds: [FRIEND] }), { ok: true, userId: FRIEND });
  // Whether or not Discord includes the invoker in the list.
  assert.deepEqual(resolve({ recipientIds: [FRIEND, ME] }), { ok: true, userId: FRIEND });
});

test('a DM with the bot implies the bot, even with no recipient data', () => {
  assert.deepEqual(resolve({ isBotDm: true }), { ok: true, userId: BOT });
  assert.deepEqual(resolve({ recipientIds: [BOT] }), { ok: true, userId: BOT });
  // A human present alongside the bot still wins — you're talking to them.
  assert.deepEqual(resolve({ recipientIds: [BOT, FRIEND] }), { ok: true, userId: FRIEND });
});

test('ambiguous or impossible cases ask rather than guess', () => {
  // A server: could be anyone.
  assert.deepEqual(resolve({ inGuild: true, recipientIds: [FRIEND] }), { ok: false, reason: 'guild' });
  // A group DM with several people.
  assert.deepEqual(resolve({ recipientIds: [FRIEND, 'other'] }), { ok: false, reason: 'crowded' });
  // A DM where Discord told us nothing at all.
  assert.deepEqual(resolve({ recipientIds: [] }), { ok: false, reason: 'unknown' });
  // Only ourselves in the list.
  assert.deepEqual(resolve({ recipientIds: [ME] }), { ok: false, reason: 'unknown' });
});
