import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { COLORS, simpleEmbed, errorEmbed } from '../../utils/embeds.js';

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

const POLL_TTL_MS = 24 * 60 * 60_000; // 24 hours, then the buttons expire
// messageId -> { a, b, voters: Map<userId, 'a'|'b'>, expires }
const polls = new Map();

function prunePolls() {
  const now = Date.now();
  for (const [id, poll] of polls) if (poll.expires < now) polls.delete(id);
}

function pollRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('wyr:a')
      .setLabel('🅰️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('wyr:b')
      .setLabel('🅱️')
      .setStyle(ButtonStyle.Primary),
  );
}

/**
 * Builds the live tally line shown at the bottom of the poll. The leading
 * option gets a crown; a tie crowns neither; zero votes says so.
 * @param {number} aVotes
 * @param {number} bVotes
 */
export function tallyLine(aVotes, bVotes) {
  if (aVotes === 0 && bVotes === 0) return '📊 No votes yet — be the first!';
  if (aVotes === bVotes) return `📊 **A:** ${aVotes}  ·  **B:** ${bVotes}`;
  return aVotes > bVotes
    ? `📊 **A:** ${aVotes} 👑  ·  **B:** ${bVotes}`
    : `📊 **A:** ${aVotes}  ·  **B:** ${bVotes} 👑`;
}

function pollEmbed(a, b, voters) {
  const counts = { a: 0, b: 0 };
  for (const choice of voters.values()) counts[choice]++;
  return simpleEmbed(
    COLORS.fun,
    `🤔 **Would you rather...**\n\n🅰️ ${a}\n\n**— or —**\n\n🅱️ ${b}\n\n${tallyLine(counts.a, counts.b)}`,
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('wouldyourather')
    .setDescription('Get a "would you rather" question 🤔')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM),
  async execute(interaction) {
    const [a, b] = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    await interaction.reply({ embeds: [pollEmbed(a, b, new Map())], components: [pollRow()] });

    const reply = await interaction.fetchReply();
    prunePolls();
    polls.set(reply.id, { a, b, voters: new Map(), expires: Date.now() + POLL_TTL_MS });
  },
};

/** Records a vote on a /wouldyourather poll. */
export async function handleWyrButton(interaction) {
  const poll = polls.get(interaction.message.id);

  // Expired or unknown poll: pull the buttons and tell the voter why.
  if (!poll || poll.expires < Date.now()) {
    polls.delete(interaction.message.id);
    await interaction.update({ components: [] });
    return interaction.followUp({
      embeds: [errorEmbed('This poll already ended — run `/wouldyourather` for a new one! 🤔')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const choice = interaction.customId.split(':')[1];
  const previous = poll.voters.get(interaction.user.id);
  if (previous) {
    return interaction.reply({
      embeds: [errorEmbed(`You already voted for **${previous === 'a' ? 'A' : 'B'}**! One vote per person. 👀`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  poll.voters.set(interaction.user.id, choice);
  poll.expires = Date.now() + POLL_TTL_MS;
  await interaction.update({ embeds: [pollEmbed(poll.a, poll.b, poll.voters)], components: [pollRow()] });
}
