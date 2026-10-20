import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { COLORS, errorEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('marry')
    .setDescription('Propose to someone 💍')
    .setContexts(InteractionContextType.Guild)
    .addUserOption((o) =>
      o.setName('user').setDescription('The lucky person 💞').setRequired(true),
    ),
  async execute(interaction, ctx) {
    const target = interaction.options.getUser('user');
    const { marriages } = ctx.db;

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('You can\'t marry yourself... but hey, self-love is a journey too. 💖')] });
    }
    if (target.bot) {
      return interaction.reply({ embeds: [errorEmbed('Bots can\'t consent to marriage! We\'re married to our work. 🤖💼')] });
    }
    const existing = marriages.get(interaction.guildId, interaction.user.id);
    if (existing) {
      const spouse = existing.user_a === interaction.user.id ? existing.user_b : existing.user_a;
      return interaction.reply({ embeds: [errorEmbed(`You're already married to <@${spouse}>! One at a time, please. 😤`)] });
    }
    if (marriages.get(interaction.guildId, target.id)) {
      return interaction.reply({ embeds: [errorEmbed(`**${target.displayName}** is already married! Home-wrecking is not supported. 💔`)] });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.love)
      .setTitle('💍 A proposal!')
      .setDescription(
        `**${interaction.user.displayName}** got down on one knee...\n\n` +
        `${target}, will you marry **${interaction.user.displayName}**? 💞`,
      );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`marry:accept:${interaction.user.id}:${target.id}`)
        .setLabel('Yes! 💖')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`marry:decline:${interaction.user.id}:${target.id}`)
        .setLabel('No... 💔')
        .setStyle(ButtonStyle.Danger),
    );
    await interaction.reply({ content: `${target}`, embeds: [embed], components: [row] });
  },
};

/** How long the Yes/No buttons stay valid after a proposal is posted. */
const PROPOSAL_WINDOW_MS = 15 * 60_000;

/** Handles the Yes/No buttons on a proposal. */
export async function handleMarriageButton(interaction, ctx) {
  const [, choice, proposerId, targetId] = interaction.customId.split(':');

  if (interaction.user.id !== targetId) {
    return interaction.reply({
      embeds: [errorEmbed('This proposal isn\'t for you! 👀')],
      flags: MessageFlags.Ephemeral,
    });
  }

  // Stale proposals die quietly: buttons come off the message, and only the
  // target gets told why (same pattern as the "hug back" window).
  if (Date.now() - interaction.message.createdTimestamp > PROPOSAL_WINDOW_MS) {
    await interaction.update({ components: [] });
    return interaction.followUp({
      embeds: [errorEmbed('This proposal expired — pop the question again! 💍')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const { marriages } = ctx.db;
  const proposer = await interaction.client.users.fetch(proposerId).catch(() => null);
  if (!proposer) {
    return interaction.update({
      content: '',
      embeds: [errorEmbed('That person\'s account is gone — this proposal can\'t be completed. 💨')],
      components: [],
    });
  }

  if (choice === 'decline') {
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setDescription(`💔 **${interaction.user.displayName}** said no... someone get **${proposer.displayName}** some ice cream. 🍨`);
    return interaction.update({ content: '', embeds: [embed], components: [] });
  }

  // marry() is atomic: it returns false when one of you married someone else
  // while this proposal sat there — which also covers two clicks racing.
  if (!marriages.marry(interaction.guildId, proposerId, targetId)) {
    return interaction.update({
      content: '',
      embeds: [errorEmbed('One of you got married while this proposal was pending. Drama! 🍿')],
      components: [],
    });
  }
  const embed = new EmbedBuilder()
    .setColor(COLORS.love)
    .setTitle('🎉 Just married!')
    .setDescription(
      `💒 **${proposer.displayName}** and **${interaction.user.displayName}** are now married!\n\n` +
      'May your DMs be forever full of hugs. 🤗💞',
    );
  await interaction.update({ content: '', embeds: [embed], components: [] });
}
