import { errorEmbed } from './embeds.js';
import { MessageFlags } from 'discord.js';

/** True when the given user is the bot owner (resolved on startup into ctx.ownerId). */
export function isOwner(ctx, userId) {
  return Boolean(ctx.ownerId) && userId === ctx.ownerId;
}

/**
 * Owner gate for a command's execute(). Replies with an ephemeral refusal and
 * returns false when the caller isn't the owner; returns true when they are.
 */
export async function requireOwner(interaction, ctx) {
  if (isOwner(ctx, interaction.user.id)) return true;
  await interaction.reply({
    embeds: [errorEmbed('Only the bot owner can use this.')],
    flags: MessageFlags.Ephemeral,
  });
  return false;
}
