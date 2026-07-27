// A short, in-memory conversation memory so follow-up /ask questions make sense
// ("what about the second one?").
//
// Deliberately NOT persisted: it's scoped to one user in one channel, expires
// on its own, and disappears on restart. Nothing anyone says to the bot is
// written to disk.

const DEFAULT_MAX_TURNS = 8; // user+assistant messages kept, oldest dropped first
const DEFAULT_TTL_MS = 15 * 60 * 1000; // a thread goes cold after 15 minutes

export function createConversationStore({
  maxTurns = DEFAULT_MAX_TURNS,
  ttlMs = DEFAULT_TTL_MS,
} = {}) {
  /** @type {Map<string, {messages: Array<{role: string, content: string}>, touched: number}>} */
  const threads = new Map();

  function key(channelId, userId) {
    return `${channelId ?? 'dm'}:${userId}`;
  }

  /** Drop threads nobody has touched within the TTL. */
  function sweep(now) {
    for (const [k, thread] of threads) {
      if (now - thread.touched > ttlMs) threads.delete(k);
    }
  }

  return {
    /** @returns {Array<{role: string, content: string}>} history, oldest first. */
    get(channelId, userId) {
      const now = Date.now();
      const thread = threads.get(key(channelId, userId));
      if (!thread) return [];
      if (now - thread.touched > ttlMs) {
        threads.delete(key(channelId, userId));
        return [];
      }
      return thread.messages;
    },

    /** Append one turn, trimming the oldest once the window is full. */
    push(channelId, userId, role, content) {
      const now = Date.now();
      const k = key(channelId, userId);
      const thread = threads.get(k) ?? { messages: [], touched: now };
      thread.messages.push({ role, content });
      if (thread.messages.length > maxTurns) {
        thread.messages.splice(0, thread.messages.length - maxTurns);
      }
      thread.touched = now;
      threads.set(k, thread);
      if (threads.size > 5000) sweep(now);
    },

    clear(channelId, userId) {
      return threads.delete(key(channelId, userId));
    },

    get size() {
      return threads.size;
    },
  };
}
