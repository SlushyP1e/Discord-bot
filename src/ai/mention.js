// Helpers for chatting by @mention or by replying to the bot, kept separate
// from the Discord plumbing so they can be tested directly.

/**
 * Strip the bot's own @mention out of a message and tidy the whitespace.
 * Handles both the plain `<@id>` and nickname `<@!id>` forms.
 */
export function stripBotMention(content, botId) {
  return (content ?? '')
    .replace(new RegExp(`<@!?${botId}>`, 'g'), ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Decide whether a message is talking to the bot.
 *
 * A direct @mention counts; @everyone / @here / a role that happens to include
 * the bot does not — otherwise every announcement ping would cost an API call.
 *
 * @param {object} msg
 * @param {boolean} msg.mentionedDirectly  bot is in message.mentions.users
 * @param {boolean} msg.repliesToBot       message is a reply to one of ours
 * @param {boolean} msg.isDM
 * @param {boolean} msg.mentionsEveryone
 */
export function isTalkingToBot({ mentionedDirectly, repliesToBot, isDM, mentionsEveryone }) {
  if (mentionsEveryone) return false;
  return Boolean(isDM || mentionedDirectly || repliesToBot);
}
