import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { COLORS, simpleEmbed } from '../../utils/embeds.js';

const ANSWERS = [
  'It is certain. ✅', 'Without a doubt. 💯', 'Yes — definitely. ✨', 'You may rely on it. 👍',
  'As I see it, yes. 🙂', 'Most likely. 🌟', 'Outlook good. ☀️', 'Signs point to yes. 📈',
  'Reply hazy, try again. 🌫️', 'Ask again later. ⏳', 'Better not tell you now... 🤫',
  'Cannot predict now. 🔮', 'Concentrate and ask again. 🧘',
  'Don\'t count on it. 🙅', 'My reply is no. ❌', 'My sources say no. 📉',
  'Outlook not so good. 🌧️', 'Very doubtful. 😬', 'Absolutely not. 💀', 'In your dreams. 😴',
];

export default {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question 🎱')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
    .addStringOption((o) =>
      o.setName('question').setDescription('Your question').setRequired(true).setMaxLength(200),
    ),
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    await interaction.reply({
      embeds: [simpleEmbed(COLORS.fun, `🎱 **${interaction.user.displayName} asks:** ${question}\n\n**The 8-ball says:** ${answer}`)],
    });
  },
};
