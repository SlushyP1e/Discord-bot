import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { COLORS, simpleEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll some dice 🎲')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
    .addIntegerOption((o) =>
      o.setName('sides').setDescription('Sides per die (default 6)').setMinValue(2).setMaxValue(1000),
    )
    .addIntegerOption((o) =>
      o.setName('count').setDescription('Number of dice (default 1)').setMinValue(1).setMaxValue(10),
    ),
  async execute(interaction) {
    const sides = interaction.options.getInteger('sides') ?? 6;
    const count = interaction.options.getInteger('count') ?? 1;
    const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
    const total = rolls.reduce((a, b) => a + b, 0);
    const detail = count > 1 ? ` (${rolls.join(' + ')} = **${total}**)` : '';
    await interaction.reply({
      embeds: [simpleEmbed(COLORS.fun, `🎲 Rolled **${count}d${sides}**: **${rolls.join(', ')}**${detail}`)],
    });
  },
};
