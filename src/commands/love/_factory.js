import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { COLORS, errorEmbed, loveEmbed, ordinal, simpleEmbed } from '../../utils/embeds.js';
import { DM_AND_GUILD, scopeId } from '../../utils/scope.js';

/** Registry of targeted actions so button handlers can look up their config. */
export const LOVE_ACTIONS = new Map();

const BACK_WINDOW_MS = 60 * 60_000; // 1 hour to press the "back!" button

// Landmark counts → celebratory flavor, in ascending order.
const MILESTONES = [
  [10, 'iconic'],
  [25, 'a whole vibe'],
  [50, 'certified besties'],
  [100, 'true love'],
  [250, 'unstoppable'],
  [500, 'the stuff of legend'],
  [1000, 'absolutely feral for each other'],
];

/**
 * Celebratory line when a pair's count hits a landmark, else undefined.
 * Exported for testing.
 */
export function milestoneLine(count, noun) {
  const hit = MILESTONES.find(([n]) => n === count);
  if (!hit) return undefined;
  return `🎉 That's ${count} ${noun}s together — ${hit[1]}!`;
}

async function buildActionEmbed(ctx, opts, guildId, giver, receiver) {
  const gif = await ctx.gifService.getGif(opts.category);
  const count = ctx.db.interactions.increment(guildId, giver.id, receiver.id, opts.name);
  const footerParts = [`That's the ${ordinal(count)} ${opts.noun} from ${giver.displayName} to ${receiver.displayName}! 💌`];
  if (gif?.anime) footerParts.push(`From: ${gif.anime}`);
  const milestone = milestoneLine(count, opts.noun);
  if (milestone) footerParts.push(milestone);
  const embed = loveEmbed({
    description: `${opts.emoji} **${giver.displayName}** ${opts.verb} **${receiver.displayName}**!`,
    gifUrl: gif?.url,
    footer: footerParts.join(' • '),
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
    .setContexts(DM_AND_GUILD)
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
      const embed = await buildActionEmbed(ctx, opts, scopeId(interaction), interaction.user, target);

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
    // Leave the button intact for the real target.
    return interaction.reply({
      embeds: [errorEmbed(`Only <@${targetId}> can ${opts.name} back! 👀`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  // Acknowledge by removing the button from its own message. update() is
  // authorized by the component interaction's token, so it reliably strips the
  // button in both guild-install and user-install contexts (unlike a separate
  // message.edit, which fails when the bot isn't a guild member).
  await interaction.update({ components: [] });

  if (Date.now() - interaction.message.createdTimestamp > BACK_WINDOW_MS) {
    return interaction.followUp({
      embeds: [errorEmbed('This button has expired — send a new one instead! ⏰')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const originalUser = await interaction.client.users.fetch(originalUserId);
  const embed = await buildActionEmbed(ctx, opts, scopeId(interaction), interaction.user, originalUser);
  await interaction.followUp({ embeds: [embed] });
}

/** Creates a solo mood command like /dance. */
export function mood(opts) {
  const data = new SlashCommandBuilder()
    .setName(opts.name)
    .setDescription(opts.description)
    .setContexts(DM_AND_GUILD);

  return {
    data,
    async execute(interaction, ctx) {
      await interaction.deferReply();
      const gif = await ctx.gifService.getGif(opts.category);
      const embed = loveEmbed({
        description: `${opts.emoji} **${interaction.user.displayName}** ${opts.verb}`,
        gifUrl: gif?.url,
        footer: gif?.anime ? `From: ${gif.anime}` : undefined,
      });
      await interaction.editReply({ embeds: [embed] });
    },
  };
}
