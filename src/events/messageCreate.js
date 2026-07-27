import { Events } from 'discord.js';
import { config } from '../config.js';
import { checkCooldown } from '../utils/cooldowns.js';
import { checkAiAccess } from '../ai/settings.js';
import { buildSystemPrompt } from '../ai/persona.js';
import { isTalkingToBot, stripBotMention } from '../ai/mention.js';
import { splitText } from '../utils/split.js';
import { isOwner } from '../utils/owner.js';

// Chat by @mentioning the bot or replying to one of its messages — the same
// brain as /ask, sharing its conversation memory and its cooldown.
//
// Requires the privileged Message Content intent, so it's opt-in via
// AI_MENTION_CHAT (see .env.example). When a message isn't allowed to use the
// AI we stay SILENT rather than replying with a refusal: a mention is easy to
// fire off by accident, and a bot that answers every stray ping with an error
// is worse than one that says nothing.

const MENTION_COOLDOWN_MS = 8000;
const DISCORD_MESSAGE_LIMIT = 2000;

// Never let the model's output ping anyone, whatever it writes.
const NO_PINGS = { parse: [], repliedUser: false };

/** Keep the typing indicator alive while `fn` runs (each one lasts ~10s). */
async function withTyping(channel, fn) {
  channel.sendTyping().catch(() => {});
  const interval = setInterval(() => channel.sendTyping().catch(() => {}), 8000);
  try {
    return await fn();
  } finally {
    clearInterval(interval);
  }
}

/** Is this message a reply to something the bot itself sent? */
async function repliesToBot(message, botId) {
  const refId = message.reference?.messageId;
  if (!refId) return false;
  const cached = message.channel.messages.cache.get(refId);
  if (cached) return cached.author?.id === botId;
  try {
    return (await message.channel.messages.fetch(refId)).author?.id === botId;
  } catch {
    return false; // deleted or unfetchable
  }
}

/** Explain a silent skip when AI_DEBUG is on. Always returns undefined. */
function skip(reason) {
  if (config.ai.debug) console.log(`[ai] ignored a message: ${reason}`);
}

export default {
  name: Events.MessageCreate,
  async execute(message, ctx) {
    if (!config.ai.mentionChat) return;

    try {
      // DMs can arrive uncached; hydrate before touching content/author.
      if (message.partial) {
        try {
          message = await message.fetch();
        } catch {
          return;
        }
      }

      if (message.author?.bot || message.system || message.webhookId) {
        return skip('sent by a bot, webhook or Discord itself');
      }

      const botId = message.client.user.id;
      const isDM = !message.guildId;
      const triggered = isTalkingToBot({
        mentionedDirectly: message.mentions.users.has(botId),
        repliesToBot: await repliesToBot(message, botId),
        isDM,
        mentionsEveryone: message.mentions.everyone,
      });
      if (!triggered) {
        // An empty content on a message that looks like it mentions the bot is
        // the signature of a missing Message Content intent.
        if (!message.content && !message.attachments?.size) {
          return skip(
            'it had NO readable content — the Message Content intent is almost ' +
              'certainly not granted to this application',
          );
        }
        return skip('it was not a direct mention or a reply to me');
      }

      // Same rules as /ask: owner anywhere, everyone else only in allow-listed
      // servers. Refusals are silent here (see the note at the top).
      const access = checkAiAccess({
        isOwner: isOwner(ctx, message.author.id),
        guildId: message.guildId,
        settings: ctx.aiSettings,
      });
      if (!access.ok) {
        return skip(
          message.guildId
            ? `server ${message.guildId} is not on the allow-list (/aiconfig allow)`
            : 'DMs are owner-only',
        );
      }
      if (!ctx.aiSettings.hasApiKey()) return skip('no API key is configured (/aiconfig key)');

      const text = stripBotMention(message.content, botId);
      if (!text) {
        return skip(
          message.content
            ? 'nothing was left after removing my mention'
            : 'the message content was empty — is the Message Content intent granted?',
        );
      }

      // Shared with /ask, so one person can't get two budgets by switching.
      if (checkCooldown(message.author.id, 'ask:ai', MENTION_COOLDOWN_MS) > 0) {
        message.react('⏳').catch(() => {});
        return;
      }

      const channelId = message.channelId;
      const userId = message.author.id;
      const messages = [
        { role: 'system', content: buildSystemPrompt(ctx.aiSettings.persona) },
        ...ctx.conversations.get(channelId, userId),
        { role: 'user', content: text },
      ];

      let answer;
      try {
        answer = await withTyping(message.channel, () => ctx.aiClient.chat(messages));
      } catch (err) {
        console.error('AI mention reply failed:', err.message);
        message.react('😵‍💫').catch(() => {});
        return;
      }

      ctx.conversations.push(channelId, userId, 'user', text);
      ctx.conversations.push(channelId, userId, 'assistant', answer);

      // Plain text rather than an embed — this is a conversation, not a command.
      const chunks = splitText(answer, DISCORD_MESSAGE_LIMIT);
      await message.reply({ content: chunks[0], allowedMentions: NO_PINGS });
      for (const chunk of chunks.slice(1)) {
        await message.channel.send({ content: chunk, allowedMentions: NO_PINGS });
      }
    } catch (err) {
      console.error('messageCreate error:', err);
    }
  },
};
