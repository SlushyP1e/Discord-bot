import { EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { COLORS, errorEmbed } from '../../utils/embeds.js';
import { splitText } from '../../utils/split.js';
import { checkCooldown } from '../../utils/cooldowns.js';
import { checkAiAccess } from '../../ai/settings.js';
import { buildSystemPrompt } from '../../ai/persona.js';
import { NoApiKeyError, AIRequestError } from '../../ai/client.js';
import { formatUsage } from '../../ai/usage.js';
import { isOwner } from '../../utils/owner.js';

// AI calls cost the owner money, so /ask gets a longer leash than the 3s
// global command cooldown.
const ASK_COOLDOWN_MS = 8000;

/** A friendly, in-character message for whatever went wrong upstream. */
function failureMessage(err) {
  if (err instanceof AIRequestError) {
    if (err.reason === 'length') {
      return 'I ran out of room thinking that one through 🫠 My owner can raise `AI_MAX_TOKENS`.';
    }
    if (err.status === 400) {
      return "My provider didn't like that request 🤨 My owner should check the model name in `/aiconfig status`.";
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

    const question = interaction.options.getString('question').trim();
    const ephemeral = interaction.options.getBoolean('private') ?? false;
    const channelId = interaction.channelId;
    const userId = interaction.user.id;

    if (interaction.options.getBoolean('fresh')) ctx.conversations.clear(channelId, userId);

    await interaction.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : {});

    const messages = [
      { role: 'system', content: buildSystemPrompt(ctx.aiSettings.persona) },
      ...ctx.conversations.get(channelId, userId),
      { role: 'user', content: question },
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
      let text = failureMessage(err);
      // The owner is the only one who can act on a provider error, and the only
      // one it's safe to show, so they get the real message instead of a trip
      // to the container logs.
      if (isOwner(ctx, interaction.user.id) && err.detail) {
        text += `\n\n**Provider said:**\n\`\`\`\n${err.detail.slice(0, 900)}\n\`\`\``;
      }
      return interaction.editReply({ embeds: [errorEmbed(text)] });
    }

    // Only remember exchanges that actually completed.
    ctx.conversations.push(channelId, userId, 'user', question);
    ctx.conversations.push(channelId, userId, 'assistant', answer);

    const chunks = splitText(answer);
    const first = new EmbedBuilder()
      .setColor(COLORS.love)
      .setAuthor({
        name: `${interaction.user.displayName} asked...`,
        iconURL: interaction.user.displayAvatarURL({ size: 64 }),
      })
      .setDescription(chunks[0])
      // The question, and what it cost in tokens when the provider says.
      .setFooter({ text: [`💭 ${question.slice(0, 180)}`, formatUsage(usage)].filter(Boolean).join('\n') });

    await interaction.editReply({ embeds: [first] });
    for (const chunk of chunks.slice(1)) {
      await interaction.followUp({
        embeds: [new EmbedBuilder().setColor(COLORS.love).setDescription(chunk)],
        ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
      });
    }
  },
};
