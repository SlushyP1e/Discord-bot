import { EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { COLORS, simpleEmbed } from '../../utils/embeds.js';
import { requireOwner } from '../../utils/owner.js';

// Owner-only tools for managing the GIF blocklist. Individual GIFs are blocked
// via the "Block this GIF" right-click action; this handles anime-wide blocks
// and viewing the list.
export default {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('blocklist')
    .setDescription('Owner: manage the GIF blocklist')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
    .addSubcommand((s) =>
      s
        .setName('anime')
        .setDescription('Block every GIF from an anime by its source name')
        .addStringOption((o) =>
          o.setName('name').setDescription('Anime name (as shown in the "Anime:" footer)').setRequired(true),
        ),
    )
    .addSubcommand((s) => s.setName('show').setDescription('Show what is currently blocked')),
  async execute(interaction, ctx) {
    if (!(await requireOwner(interaction, ctx))) return;

    const sub = interaction.options.getSubcommand();
    if (sub === 'anime') {
      const name = interaction.options.getString('name').trim();
      const added = ctx.db.blocklist.blockAnime(name, interaction.user.id);
      return interaction.reply({
        embeds: [simpleEmbed(
          COLORS.success,
          added ? `🚫 Blocked all GIFs from **${name}**.` : `**${name}** was already blocked.`,
        )],
        flags: MessageFlags.Ephemeral,
      });
    }

    const { gifs, anime } = ctx.db.blocklist.counts();
    const animeList = ctx.db.blocklist.listAnime(20);
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('🚫 GIF blocklist')
      .addFields(
        { name: 'Blocked GIFs', value: `${gifs}`, inline: true },
        { name: 'Blocked anime', value: `${anime}`, inline: true },
      );
    if (animeList.length) embed.setDescription(`**Blocked anime:**\n${animeList.join(', ')}`);
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
