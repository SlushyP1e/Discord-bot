import { EmbedBuilder, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { COLORS } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Show someone's avatar in full size 🖼️")
    .setContexts(InteractionContextType.Guild)
    .addUserOption((o) => o.setName('user').setDescription('Whose avatar (default: you)')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`🖼️ ${user.displayName}'s avatar`)
      .setImage(user.displayAvatarURL({ size: 1024 }));
    await interaction.reply({ embeds: [embed] });
  },
};
