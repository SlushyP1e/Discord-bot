import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { COLORS, simpleEmbed } from '../../utils/embeds.js';

// Deterministic so rating the same thing twice gives the same answer.
function rating(text) {
  let h = 0;
  for (const ch of text.toLowerCase().trim()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 11;
}

const REACTIONS = ['🗑️', '😬', '😕', '🤔', '😐', '🙂', '😊', '😄', '🤩', '💖', '👑'];

export default {
  data: new SlashCommandBuilder()
    .setName('rate')
    .setDescription('Have SlushyLove rate anything out of 10 ⭐')
    .setContexts(InteractionContextType.Guild)
    .addStringOption((o) =>
      o.setName('thing').setDescription('What should I rate?').setRequired(true).setMaxLength(150),
    ),
  async execute(interaction) {
    const thing = interaction.options.getString('thing');
    const score = rating(thing);
    await interaction.reply({
      embeds: [simpleEmbed(COLORS.fun, `⭐ I rate **${thing}** a solid **${score}/10** ${REACTIONS[score]}`)],
    });
  },
};
