import { EmbedBuilder, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { COLORS, simpleEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('partner')
    .setDescription('See who someone is married to 💞')
    .setContexts(InteractionContextType.Guild)
    .addUserOption((o) =>
      o.setName('user').setDescription('Whose marriage to check (default: you)'),
    ),
  async execute(interaction, ctx) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const marriage = ctx.db.marriages.get(interaction.guildId, user.id);

    if (!marriage) {
      const msg = user.id === interaction.user.id
        ? 'You\'re not married. The single life has its perks! ✨'
        : `**${user.displayName}** is not married. Shoot your shot? 👀`;
      return interaction.reply({ embeds: [simpleEmbed(COLORS.info, msg)] });
    }

    const spouse = marriage.user_a === user.id ? marriage.user_b : marriage.user_a;
    const days = Math.floor((Date.now() - marriage.married_at) / 86_400_000);
    const embed = new EmbedBuilder()
      .setColor(COLORS.love)
      .setTitle('💞 Marriage certificate')
      .setDescription(
        `**${user.displayName}** is married to <@${spouse}>!\n\n` +
        `📅 Married <t:${Math.floor(marriage.married_at / 1000)}:D> — **${days}** day${days === 1 ? '' : 's'} and counting 💍`,
      );
    await interaction.reply({ embeds: [embed] });
  },
};
