import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { COLORS, simpleEmbed } from '../../utils/embeds.js';

const QUESTIONS = [
  ['be able to talk to animals', 'speak every human language'],
  ['always be 10 minutes late', 'always be 20 minutes early'],
  ['have unlimited pizza for life', 'have unlimited tacos for life'],
  ['fight one horse-sized duck', 'fight a hundred duck-sized horses'],
  ['live without music', 'live without movies'],
  ['be famous but poor', 'be unknown but rich'],
  ['have a rewind button for your life', 'have a pause button for your life'],
  ['never use social media again', 'never watch another movie'],
  ['be able to fly', 'be able to turn invisible'],
  ['only whisper forever', 'only shout forever'],
  ['have hands for feet', 'have feet for hands'],
  ['know how you die', 'know when you die'],
  ['live in a world with no problems', 'live in a world where you rule'],
  ['eat only sweet food forever', 'eat only savory food forever'],
  ['always have to sing instead of speak', 'always have to dance everywhere you go'],
  ['have a personal chef', 'have a personal chauffeur'],
  ['be a cat', 'be a dog'],
  ['give up gaming for a year', 'give up snacks for a year'],
];

export default {
  data: new SlashCommandBuilder()
    .setName('wouldyourather')
    .setDescription('Get a "would you rather" question 🤔')
    .setContexts(InteractionContextType.Guild),
  async execute(interaction) {
    const [a, b] = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    await interaction.reply({
      embeds: [simpleEmbed(COLORS.fun, `🤔 **Would you rather...**\n\n🅰️ ${a}\n\n**— or —**\n\n🅱️ ${b}`)],
    });
  },
};
