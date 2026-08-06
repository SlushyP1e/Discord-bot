// Working out who "the other person" is when a reaction command is used
// without naming anyone.
//
// In a one-on-one DM there's exactly one candidate, so making people type
// `/hug @them` at the only other person in the room is silly. In a server, or a
// group DM with a crowd, there's no unambiguous answer and we have to ask.

import { InteractionContextType } from 'discord.js';

/**
 * Collect the user IDs Discord tells us are in this channel.
 *
 * Depending on the context and how the app was installed, the recipients can
 * arrive as a Collection, a plain array of user objects, or a single
 * `recipientId` — and sometimes not at all, which is why callers must handle
 * an empty result.
 *
 * @returns {string[]} possibly empty, possibly including the invoker or the bot
 */
export function channelRecipientIds(channel) {
  if (!channel) return [];
  const ids = [];

  const { recipients } = channel;
  if (recipients) {
    const list = typeof recipients.values === 'function' ? [...recipients.values()] : recipients;
    if (Array.isArray(list)) {
      for (const entry of list) {
        const id = typeof entry === 'string' ? entry : entry?.id;
        if (id) ids.push(id);
      }
    }
  }
  if (channel.recipientId) ids.push(channel.recipientId);
  if (channel.recipient?.id) ids.push(channel.recipient.id);

  return [...new Set(ids)];
}

/**
 * Pick the implied target of a reaction command.
 *
 * @param {object} opts
 * @param {string[]} opts.recipientIds  from channelRecipientIds()
 * @param {string} opts.invokerId
 * @param {string} opts.botId
 * @param {boolean} opts.inGuild
 * @param {boolean} opts.isBotDm        a DM with the bot itself
 * @returns {{ok: true, userId: string} | {ok: false, reason: 'guild'|'crowded'|'unknown'}}
 */
export function resolveImplicitTarget({ recipientIds, invokerId, botId, inGuild, isBotDm }) {
  // A server has no "other person" — there could be thousands.
  if (inGuild) return { ok: false, reason: 'guild' };

  const others = recipientIds.filter((id) => id !== invokerId);
  const humans = others.filter((id) => id !== botId);

  if (humans.length === 1) return { ok: true, userId: humans[0] };
  if (humans.length > 1) return { ok: false, reason: 'crowded' };

  // No humans left. In a DM with the bot, the bot *is* the other person —
  // which works even when Discord sends us no recipients at all.
  if (isBotDm || others.includes(botId)) return { ok: true, userId: botId };

  return { ok: false, reason: 'unknown' };
}

/** Convenience wrapper that reads everything it needs off an interaction. */
export function implicitTargetFor(interaction) {
  return resolveImplicitTarget({
    recipientIds: channelRecipientIds(interaction.channel),
    invokerId: interaction.user.id,
    botId: interaction.client.user.id,
    inGuild: Boolean(interaction.guildId),
    isBotDm: interaction.context === InteractionContextType.BotDM,
  });
}
