import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { COLORS, errorEmbed, simpleEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Let SlushyLove decide for you 🎯')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
    .addStringOption((o) =>
      o.setName('options')
        .setDescription('Choices separated by commas, e.g. "pizza, sushi, tacos"')
        .setRequired(true)
        .setMaxLength(300),
    ),
  async execute(interaction) {
    const options = interaction.options
      .getString('options')
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (options.length < 2) {
      return interaction.reply({ embeds: [errorEmbed('Give me at least two options to pick from! e.g. `pizza, sushi`')] });
    }
    const pick = options[Math.floor(Math.random() * options.length)];
    await interaction.reply({
      embeds: [simpleEmbed(COLORS.fun, `🎯 I choose... **${pick}**! No take-backs. 😌`)],
    });
  },
};
