import { EmbedBuilder, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { COLORS } from '../../utils/embeds.js';

// Deterministic per-pair score so shipping the same two people is stable.
function shipScore(idA, idB) {
  const [a, b] = [idA, idB].sort();
  let h = 0;
  for (const ch of `${a}:${b}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 101;
}

function bar(score) {
  const filled = Math.round(score / 10);
  return '💖'.repeat(filled) + '🖤'.repeat(10 - filled);
}

function verdict(score) {
  if (score >= 90) return 'SOULMATES!! Book the venue! 💒';
  if (score >= 70) return 'There is definitely something here... 👀💞';
  if (score >= 50) return 'A promising duo! Worth a shot. 💘';
  if (score >= 30) return 'Hmm... opposites attract? Sometimes? 🤔';
  if (score >= 10) return 'Awkward... let\'s just be friends. 😬';
  return 'The universe said no. Loudly. 💀';
}

export default {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Check the love compatibility between two people 💘')
    .setContexts(InteractionContextType.Guild)
    .addUserOption((o) => o.setName('user1').setDescription('First person').setRequired(true))
    .addUserOption((o) => o.setName('user2').setDescription('Second person (default: you)')),
  async execute(interaction, ctx) {
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2') ?? interaction.user;

    if (user1.id === user2.id) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLORS.love).setDescription(`💗 **${user1.displayName}** × **${user1.displayName}** = **100%**\n\n${bar(100)}\n\nSelf-love is the purest love of all! ✨`)],
      });
    }

    let score = shipScore(user1.id, user2.id);
    const marriage = ctx.db.marriages.get(interaction.guildId, user1.id);
    const marriedToEachOther =
      marriage && [marriage.user_a, marriage.user_b].includes(user2.id);
    if (marriedToEachOther) score = Math.max(score, 95);

    const nameA = user1.displayName;
    const nameB = user2.displayName;
    const shipName = nameA.slice(0, Math.ceil(nameA.length / 2)) + nameB.slice(Math.floor(nameB.length / 2));

    const embed = new EmbedBuilder()
      .setColor(COLORS.love)
      .setTitle(`💘 ${nameA} × ${nameB}`)
      .setDescription(
        `Ship name: **${shipName}**\n\n**${score}%** compatible\n${bar(score)}\n\n${verdict(score)}` +
        (marriedToEachOther ? '\n\n💍 *They\'re literally married. Obviously.*' : ''),
      );
    await interaction.reply({ embeds: [embed] });
  },
};
