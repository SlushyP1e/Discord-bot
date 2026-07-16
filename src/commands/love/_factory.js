import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { COLORS, errorEmbed, loveEmbed, ordinal, simpleEmbed } from '../../utils/embeds.js';

/** Registry of targeted actions so button handlers can look up their config. */
export const LOVE_ACTIONS = new Map();

const BACK_WINDOW_MS = 2 * 60_000;

async function buildActionEmbed(ctx, opts, guildId, giver, receiver) {
  const gif = await ctx.gifService.getGif(opts.category);
  const count = ctx.db.interactions.increment(guildId, giver.id, receiver.id, opts.name);
  const embed = loveEmbed({
    description: `${opts.emoji} **${giver.displayName}** ${opts.verb} **${receiver.displayName}**!`,
    gifUrl: gif?.url,
    footer: `That's the ${ordinal(count)} ${opts.noun} from ${giver.displayName} to ${receiver.displayName}! 💌`,
  });
  if (!gif) {
    embed.setDescription(
      `${embed.data.description}\n\n*(all my GIF sources are napping right now, but the ${opts.noun} still counts! 😴)*`,
    );
  }
  return embed;
}

/** Creates a targeted interaction command like /hug @user. */
export function targeted(opts) {
  LOVE_ACTIONS.set(opts.name, opts);

  const data = new SlashCommandBuilder()
    .setName(opts.name)
    .setDescription(opts.description)
    .setContexts(InteractionContextType.Guild)
    .addUserOption((o) =>
      o.setName('user').setDescription(`Who do you want to ${opts.name}?`).setRequired(true),
    );

  return {
    data,
    async execute(interaction, ctx) {
      const target = interaction.options.getUser('user');

      if (target.id === interaction.user.id) {
        return interaction.reply({ embeds: [simpleEmbed(COLORS.fun, opts.self)] });
      }
      if (target.id === interaction.client.user.id) {
        return interaction.reply({ embeds: [simpleEmbed(COLORS.love, opts.bot)] });
      }

      await interaction.deferReply();
      const embed = await buildActionEmbed(ctx, opts, interaction.guildId, interaction.user, target);

      const components = [];
      if (opts.backLabel) {
        components.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`love:back:${opts.name}:${interaction.user.id}:${target.id}`)
              .setLabel(opts.backLabel)
              .setEmoji(opts.emoji)
              .setStyle(ButtonStyle.Secondary),
          ),
        );
      }
      await interaction.editReply({ embeds: [embed], components });
    },
  };
}

/** Handles the "X back!" button under a targeted interaction. */
export async function handleLoveBack(interaction, ctx) {
  const [, , actionName, originalUserId, targetId] = interaction.customId.split(':');
  const opts = LOVE_ACTIONS.get(actionName);
  if (!opts) return;

  if (interaction.user.id !== targetId) {
    return interaction.reply({
      embeds: [errorEmbed(`Only <@${targetId}> can ${opts.name} back! 👀`)],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (Date.now() - interaction.message.createdTimestamp > BACK_WINDOW_MS) {
    return interaction.update({ components: [] });
  }

  await interaction.deferReply();
  // Remove the button from the original message so it can only be used once.
  await interaction.message.edit({ components: [] }).catch(() => {});

  const originalUser = await interaction.client.users.fetch(originalUserId);
  const embed = await buildActionEmbed(ctx, opts, interaction.guildId, interaction.user, originalUser);
  await interaction.editReply({ embeds: [embed] });
}

/** Creates a solo mood command like /dance. */
export function mood(opts) {
  const data = new SlashCommandBuilder()
    .setName(opts.name)
    .setDescription(opts.description)
    .setContexts(InteractionContextType.Guild);

  return {
    data,
    async execute(interaction, ctx) {
      await interaction.deferReply();
      const gif = await ctx.gifService.getGif(opts.category);
      const embed = loveEmbed({
        description: `${opts.emoji} **${interaction.user.displayName}** ${opts.verb}`,
        gifUrl: gif?.url,
      });
      await interaction.editReply({ embeds: [embed] });
    },
  };
}
