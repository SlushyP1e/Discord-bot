import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { COLORS, simpleEmbed, errorEmbed } from '../../utils/embeds.js';
import { checkAiAccess } from '../../ai/settings.js';
import { isOwner } from '../../utils/owner.js';
import { ASK_COOLDOWN_MS } from '../../ai/cooldown.js';
import { checkCooldown, resetCooldown } from '../../utils/cooldowns.js';
import { QUESTIONS } from './_wyrQuestions.js';

// Tells the AI exactly what shape to hand back so we can parse it, no matter
// how playful it gets with the wording.
const WYR_PROMPT = `You are generating one fresh "Would you rather?" question for a Discord server.
Pick two fun, distinct, roughly-balanced options that people will enjoy arguing about.
Keep each option under ~12 words. Do not repeat common cliches.
Reply with ONLY the two options on a single line, separated by " | " — nothing else, no numbering, no extra text.`;

/**
 * Splits the AI's reply into the two options. Returns null when the reply isn't
 * shaped like a valid pair, so the caller can fall back to the static list.
 * @param {string} text
 * @returns {[string, string] | null}
 */
export function parseWyrPair(text) {
  if (typeof text !== 'string') return null;
  const parts = text.split('|');
  if (parts.length !== 2) return null;
  const clean = parts.map((s) =>
    s
      .trim()
      .replace(/^["'’‘]+/, '')
      .replace(/["'’‘]+$/, '')
      .trim(),
  );
  if (!clean[0] || !clean[1]) return null;
  if (clean[0].length > 80 || clean[1].length > 80) return null;
  return clean;
}

/**
 * Asks the bot's AI for a brand-new pair of options. Returns null when the AI
 * isn't available (no key), the user has no access, the shared AI cooldown is
 * active, or the reply can't be parsed — the caller then falls back to the
 * local list.
 * @param {import('discord.js').CommandInteraction} interaction
 * @param {object} ctx
 * @returns {Promise<[string, string] | null>}
 */
async function aiPair(interaction, ctx) {
  if (!ctx.aiSettings?.hasApiKey()) return null;
  const access = checkAiAccess({
    isOwner: isOwner(ctx, interaction.user.id),
    userId: interaction.user.id,
    guildId: interaction.guildId,
    settings: ctx.aiSettings,
  });
  if (!access.ok) return null;
  if (checkCooldown(interaction.user.id, 'ask:ai', ASK_COOLDOWN_MS) > 0) return null;

  try {
    const { text } = await ctx.aiClient.chat([
      { role: 'system', content: WYR_PROMPT },
      { role: 'user', content: 'Give me a would-you-rather question.' },
    ]);
    return parseWyrPair(text);
  } catch {
    // A failed request shouldn't leave the user locked out of the shared AI
    // cooldown for a question that never arrived.
    resetCooldown(interaction.user.id, 'ask:ai');
    return null;
  }
}

const POLL_TTL_MS = 24 * 60 * 60_000; // 24 hours, then the buttons expire
// messageId -> { a, b, creatorId, voters: Map<userId, 'a'|'b'>, expires }
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
    new ButtonBuilder()
      .setCustomId('wyr:results')
      .setLabel('Results 🔎')
      .setStyle(ButtonStyle.Secondary),
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

/**
 * Formats who voted for what, for the poll creator's private results view.
 * @param {string} a
 * @param {string} b
 * @param {Map<string, 'a'|'b'>} voters
 */
export function resultsBreakdown(a, b, voters) {
  const groups = { a: [], b: [] };
  for (const [userId, choice] of voters) groups[choice].push(userId);
  const line = (label, option, ids) =>
    ids.length
      ? `${label} ${option} — ${ids.length} vote${ids.length === 1 ? '' : 's'}: ${ids.map((id) => `<@${id}>`).join(', ')}`
      : `${label} ${option} — no votes yet`;
  return `${line('🅰️', a, groups.a)}\n${line('🅱️', b, groups.b)}`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('wouldyourather')
    .setDescription('Get a "would you rather" question 🤔')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM),
  async execute(interaction, ctx) {
    // Defer before asking the AI: generation can take longer than Discord's
    // three-second window for a first response.
    await interaction.deferReply();

    // Prefer a freshly-generated question from the AI; fall back to the local
    // list when the AI is off, gated, cooling down, or had a hiccup.
    const [a, b] = (await aiPair(interaction, ctx)) ?? QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    await interaction.editReply({ embeds: [pollEmbed(a, b, new Map())], components: [pollRow()] });

    const reply = await interaction.fetchReply();
    prunePolls();
    polls.set(reply.id, { a, b, creatorId: interaction.user.id, voters: new Map(), expires: Date.now() + POLL_TTL_MS });
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

  // The creator alone gets to peek at who voted for what — everyone else is
  // told to buzz off (ephemerally, of course).
  if (choice === 'results') {
    if (interaction.user.id !== poll.creatorId) {
      return interaction.reply({
        embeds: [errorEmbed('Only the person who made this poll can peek at the results. 🤫')],
        flags: MessageFlags.Ephemeral,
      });
    }
    return interaction.reply({
      embeds: [simpleEmbed(COLORS.fun, `🤔 **Who voted**\n\n${resultsBreakdown(poll.a, poll.b, poll.voters)}`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  const previous = poll.voters.get(interaction.user.id);
  if (previous) {
    return interaction.reply({
      embeds: [errorEmbed(`You already voted for **${previous === 'a' ? 'A' : 'B'}**! One vote per person. 👀`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  poll.voters.set(interaction.user.id, choice);
  await interaction.update({ embeds: [pollEmbed(poll.a, poll.b, poll.voters)], components: [pollRow()] });
}
