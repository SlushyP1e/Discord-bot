import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { errorEmbed } from '../../utils/embeds.js';
import { DM_AND_GUILD } from '../../utils/scope.js';
import { buildFixedUrls, SUPPORTED_PLATFORMS } from '../../linkfix/linkFixer.js';

const SESSION_TTL_MS = 60 * 60_000; // 1 hour to keep cycling fixer services
// messageId -> { urls, index, requesterId, expires }
const sessions = new Map();

function pruneSessions() {
  const now = Date.now();
  for (const [id, s] of sessions) if (s.expires < now) sessions.delete(id);
}

function tryAnotherButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('fix:next')
      .setLabel('Try another fixer')
      .setEmoji('🔁')
      .setStyle(ButtonStyle.Secondary),
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('fix')
    .setDescription('Turn a TikTok/X/Instagram/etc. link into a playable Discord embed 🔗')
    .setContexts(DM_AND_GUILD)
    .addStringOption((o) =>
      o.setName('link').setDescription('The social media link to fix').setRequired(true),
    ),
  async execute(interaction) {
    const fixed = buildFixedUrls(interaction.options.getString('link'));
    if (!fixed) {
      return interaction.reply({
        embeds: [errorEmbed(
          `I can't fix that link. Supported: ${SUPPORTED_PLATFORMS.join(', ')}.`,
        )],
        flags: MessageFlags.Ephemeral,
      });
    }

    const multi = fixed.urls.length > 1;
    await interaction.reply({
      content: fixed.urls[0],
      components: multi ? [tryAnotherButton()] : [],
    });

    if (multi) {
      const reply = await interaction.fetchReply();
      pruneSessions();
      sessions.set(reply.id, {
        urls: fixed.urls,
        index: 0,
        requesterId: interaction.user.id,
        expires: Date.now() + SESSION_TTL_MS,
      });
    }
  },
};

/** Cycles a /fix message to the next fixer service. */
export async function handleFixButton(interaction) {
  const session = sessions.get(interaction.message.id);
  if (!session || session.expires < Date.now()) {
    sessions.delete(interaction.message.id);
    return interaction.update({ components: [] });
  }
  if (interaction.user.id !== session.requesterId) {
    return interaction.reply({
      embeds: [errorEmbed('Only the person who ran `/fix` can switch services. 👀')],
      flags: MessageFlags.Ephemeral,
    });
  }

  session.index = (session.index + 1) % session.urls.length;
  session.expires = Date.now() + SESSION_TTL_MS;
  await interaction.update({ content: session.urls[session.index], components: [tryAnotherButton()] });
}
