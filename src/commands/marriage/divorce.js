import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { COLORS, errorEmbed, simpleEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('divorce')
    .setDescription('End your marriage 💔')
    .setContexts(InteractionContextType.Guild),
  async execute(interaction, ctx) {
    const marriage = ctx.db.marriages.get(interaction.guildId, interaction.user.id);
    if (!marriage) {
      return interaction.reply({ embeds: [errorEmbed('You\'re not married! Nothing to divorce... yet. 😌')] });
    }
    const spouse = marriage.user_a === interaction.user.id ? marriage.user_b : marriage.user_a;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`divorce:confirm:${interaction.user.id}`)
        .setLabel('Yes, divorce 💔')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`divorce:cancel:${interaction.user.id}`)
        .setLabel('Wait, no! 💞')
        .setStyle(ButtonStyle.Secondary),
    );
    await interaction.reply({
      embeds: [simpleEmbed(COLORS.error, `Are you sure you want to divorce <@${spouse}>? 🥺`)],
      components: [row],
    });
  },
};

/** Handles the confirm/cancel buttons on a divorce. */
export async function handleDivorceButton(interaction, ctx) {
  const [, choice, userId] = interaction.customId.split(':');

  if (interaction.user.id !== userId) {
    return interaction.reply({
      embeds: [errorEmbed('This isn\'t your divorce! Stay out of it. 🍿')],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (choice === 'cancel') {
    return interaction.update({
      embeds: [simpleEmbed(COLORS.love, '💞 Crisis averted — the marriage lives on!')],
      components: [],
    });
  }

  const marriage = ctx.db.marriages.get(interaction.guildId, userId);
  if (!marriage) {
    return interaction.update({
      embeds: [errorEmbed('You\'re... not married anymore? That was fast.')],
      components: [],
    });
  }
  const spouse = marriage.user_a === userId ? marriage.user_b : marriage.user_a;
  ctx.db.marriages.divorce(interaction.guildId, userId);
  await interaction.update({
    embeds: [simpleEmbed(COLORS.error, `💔 **${interaction.user.displayName}** and <@${spouse}> are now divorced. F in the chat.`)],
    components: [],
  });
}
