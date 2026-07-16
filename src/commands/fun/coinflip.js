import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { COLORS, simpleEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin 🪙')
    .setContexts(InteractionContextType.Guild),
  async execute(interaction) {
    const heads = Math.random() < 0.5;
    await interaction.reply({
      embeds: [simpleEmbed(COLORS.fun, `🪙 The coin lands on... **${heads ? 'Heads' : 'Tails'}**!`)],
    });
  },
};
