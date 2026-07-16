import { EmbedBuilder, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { COLORS } from '../../utils/embeds.js';
import { LOVE_ACTIONS } from '../love/_factory.js';

function formatRows(rows) {
  if (!rows.length) return '*nothing yet... go spread some love!*';
  return rows
    .map((r) => {
      const emoji = LOVE_ACTIONS.get(r.action)?.emoji ?? '💞';
      return `${emoji} **${r.total}×** ${r.action}`;
    })
    .join('\n');
}

export default {
  data: new SlashCommandBuilder()
    .setName('lovestats')
    .setDescription('See someone\'s love statistics 📊💞')
    .setContexts(InteractionContextType.Guild)
    .addUserOption((o) =>
      o.setName('user').setDescription('Whose stats to show (default: you)'),
    ),
  async execute(interaction, ctx) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const { interactions, marriages } = ctx.db;

    const given = interactions.topGiven(interaction.guildId, user.id);
    const received = interactions.topReceived(interaction.guildId, user.id);
    const favorite = interactions.favoriteTarget(interaction.guildId, user.id);
    const fan = interactions.biggestFan(interaction.guildId, user.id);
    const marriage = marriages.get(interaction.guildId, user.id);

    const extras = [];
    if (favorite) extras.push(`💘 Favorite person: <@${favorite.target_id}> (${favorite.total} interactions)`);
    if (fan) extras.push(`🥰 Biggest fan: <@${fan.user_id}> (${fan.total} interactions)`);
    if (marriage) {
      const spouse = marriage.user_a === user.id ? marriage.user_b : marriage.user_a;
      extras.push(`💍 Married to <@${spouse}>`);
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.love)
      .setTitle(`💞 Love stats — ${user.displayName}`)
      .setThumbnail(user.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: '💌 Most given', value: formatRows(given), inline: true },
        { name: '📬 Most received', value: formatRows(received), inline: true },
      );
    if (extras.length) embed.setDescription(extras.join('\n'));

    await interaction.reply({ embeds: [embed] });
  },
};
