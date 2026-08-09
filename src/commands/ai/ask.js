import { InteractionContextType, MessageFlags, SlashCommandBuilder, escapeMarkdown } from 'discord.js';
import { errorEmbed } from '../../utils/embeds.js';
import { splitText, truncate } from '../../utils/split.js';
import { checkCooldown } from '../../utils/cooldowns.js';
import { checkAiAccess } from '../../ai/settings.js';
import { buildSystemPrompt } from '../../ai/persona.js';
import { NoApiKeyError, AIRequestError } from '../../ai/client.js';
import { formatUsage } from '../../ai/usage.js';
import { buildUserContent, historyText, isSupportedImage } from '../../ai/vision.js';
import { isOwner } from '../../utils/owner.js';

// AI calls cost the owner money, so /ask gets a longer leash than the 3s
// global command cooldown.
const ASK_COOLDOWN_MS = 8000;

const DISCORD_MESSAGE_LIMIT = 2000;
// How much of the question is echoed back above the answer.
const QUESTION_PREVIEW = 200;
// Replies are plain text now, so the model's output could otherwise ping people.
const NO_PINGS = { parse: [] };

/** A friendly, in-character message for whatever went wrong upstream. */
function failureMessage(err, { hasImages = false } = {}) {
  if (err instanceof AIRequestError) {
    if (err.reason === 'length') {
      return 'I ran out of room thinking that one through 🫠 My owner can raise `AI_MAX_TOKENS`.';
    }
    if (err.status === 400) {
      return hasImages
        ? "My provider didn't like that request 🤨 This model might not be able to see images."
        : "My provider didn't like that request 🤨 My owner should check the model name in `/aiconfig status`.";
    }
    if (err.status === 401 || err.status === 403) {
      return 'My AI key got rejected 🔑 My owner needs to run `/aiconfig key` again.';
    }
    if (err.status === 402) {
      return "My AI account is out of credit 💸 Poke my owner about it!";
    }
    if (err.status === 429) {
      return "I'm being rate-limited right now 😵‍💫 Give me a minute and try again.";
    }
  }
  return "My brain fizzled out for a second there 😵‍💫 Try me again in a moment!";
}

export default {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask SlushyLove anything 🧠✨')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
    .addStringOption((o) =>
      o
        .setName('question')
        .setDescription('What do you want to ask?')
        .setRequired(true)
        .setMaxLength(1000),
    )
    .addAttachmentOption((o) =>
      o.setName('image').setDescription('An image for me to look at (png, jpg, webp or gif)'),
    )
    .addBooleanOption((o) =>
      o.setName('fresh').setDescription('Forget our previous messages and start a new chat'),
    )
    .addBooleanOption((o) =>
      o.setName('private').setDescription('Only you can see the answer'),
    ),

  async execute(interaction, ctx) {
    const access = checkAiAccess({
      isOwner: isOwner(ctx, interaction.user.id),
      userId: interaction.user.id,
      guildId: interaction.guildId,
      settings: ctx.aiSettings,
    });
    if (!access.ok) {
      return interaction.reply({
        embeds: [errorEmbed(access.reason)],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!ctx.aiSettings.hasApiKey()) {
      return interaction.reply({
        embeds: [errorEmbed("I don't have an AI brain plugged in yet 🔌 My owner needs to run `/aiconfig key`.")],
        flags: MessageFlags.Ephemeral,
      });
    }

    const remaining = checkCooldown(interaction.user.id, 'ask:ai', ASK_COOLDOWN_MS);
    if (remaining > 0) {
      return interaction.reply({
        embeds: [errorEmbed(`Let me catch my breath! Ask again in **${(remaining / 1000).toFixed(1)}s** 🧠💨`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    const question = (interaction.options.getString('question') ?? '').trim();
    const attachment = interaction.options.getAttachment('image');
    if (attachment && !isSupportedImage(attachment)) {
      return interaction.reply({
        embeds: [errorEmbed("I can only look at png, jpg, webp or gif files under 20 MB 🖼️")],
        flags: MessageFlags.Ephemeral,
      });
    }
    const images = attachment ? [attachment] : [];
    // Discord enforces a non-empty option, but "   " gets through and would be
    // sent to the provider as an empty turn.
    if (!question && !images.length) {
      return interaction.reply({
        embeds: [errorEmbed('You have to actually ask me something 🙄')],
        flags: MessageFlags.Ephemeral,
      });
    }
    const ephemeral = interaction.options.getBoolean('private') ?? false;
    const channelId = interaction.channelId;
    const userId = interaction.user.id;

    if (interaction.options.getBoolean('fresh')) ctx.conversations.clear(channelId, userId);

    await interaction.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : {});

    const messages = [
      { role: 'system', content: buildSystemPrompt(ctx.aiSettings.persona) },
      ...ctx.conversations.get(channelId, userId),
      { role: 'user', content: buildUserContent(question, images) },
    ];

    let answer;
    let usage;
    try {
      ({ text: answer, usage } = await ctx.aiClient.chat(messages));
    } catch (err) {
      if (err instanceof NoApiKeyError) {
        return interaction.editReply({
          embeds: [errorEmbed("I don't have an AI brain plugged in yet 🔌 My owner needs to run `/aiconfig key`.")],
        });
      }
      console.error('AI request failed:', err.message);
      let text = failureMessage(err, { hasImages: images.length > 0 });
      // The owner is the only one who can act on a provider error, and the only
      // one it's safe to show, so they get the real message instead of a trip
      // to the container logs.
      if (isOwner(ctx, interaction.user.id) && err.detail) {
        text += `\n\n**Provider said:**\n\`\`\`\n${err.detail.slice(0, 900)}\n\`\`\``;
      }
      return interaction.editReply({ embeds: [errorEmbed(text)] });
    }

    // Only remember exchanges that actually completed. The image itself is not
    // kept — see src/ai/vision.js for why.
    ctx.conversations.push(channelId, userId, 'user', historyText(question, images.length));
    ctx.conversations.push(channelId, userId, 'assistant', answer);

    // A plain message rather than an embed: it reads like a conversation, and
    // code blocks and links behave the way people expect. Escaped so a name or
    // a question full of markdown can't mangle the layout.
    const asker = escapeMarkdown(interaction.user.displayName);
    const asked = escapeMarkdown(truncate(question, QUESTION_PREVIEW));
    const usageLine = formatUsage(usage);

    const body = [
      `**${asker} asked;** ${asked}`,
      answer,
      // Subtext, so the token count sits quietly under the answer.
      usageLine ? `-# ${usageLine}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    // Split the whole thing, header included, so no chunk can exceed the limit.
    const chunks = splitText(body, DISCORD_MESSAGE_LIMIT);
    await interaction.editReply({ content: chunks[0], allowedMentions: NO_PINGS });
    for (const chunk of chunks.slice(1)) {
      await interaction.followUp({
        content: chunk,
        allowedMentions: NO_PINGS,
        ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
      });
    }
  },
};
