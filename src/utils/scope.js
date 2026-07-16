import { InteractionContextType } from 'discord.js';

// Contexts for commands that work both in servers and in DMs with the bot.
// (Marriage, userinfo and serverinfo stay Guild-only — they need a server.)
export const DM_AND_GUILD = [InteractionContextType.Guild, InteractionContextType.BotDM];

// A stable key for per-pair interaction counters. In a guild it's the guild id;
// in a DM (no guild) we bucket by the initiating user so counts still work.
export function scopeId(interaction) {
  return interaction.guildId ?? `dm:${interaction.user.id}`;
}
