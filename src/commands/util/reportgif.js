import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  InteractionContextType,
  MessageFlags,
} from 'discord.js';
import { COLORS, errorEmbed, simpleEmbed } from '../../utils/embeds.js';
import { isOwner } from '../../utils/owner.js';

// Right-click a bot message → Apps → "Block this GIF". Owner-only: adds the
// GIF's URL to the blocklist so the failover engine never serves it again.
export default {
  data: new ContextMenuCommandBuilder()
    .setName('Block this GIF')
    .setType(ApplicationCommandType.Message)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM),
  async execute(interaction, ctx) {
    if (!isOwner(ctx, interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Only the bot owner can block GIFs.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const message = interaction.targetMessage;
    const url = message.embeds?.[0]?.image?.url;
    if (!url) {
      return interaction.reply({
        embeds: [errorEmbed('That message has no GIF I can block.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const added = ctx.db.blocklist.blockGif(url, 'reported', interaction.user.id);
    // Best-effort: remove the offending message right now (may fail if the bot
    // isn't in the guild, e.g. user-installed — the block still applies going forward).
    await message.delete().catch(() => {});

    return interaction.reply({
      embeds: [simpleEmbed(
        COLORS.success,
        added ? '🚫 Blocked that GIF — I won\'t post it again.' : 'That GIF was already blocked.',
      )],
      flags: MessageFlags.Ephemeral,
    });
  },
};
