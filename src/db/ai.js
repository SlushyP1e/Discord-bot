// Storage for the AI feature: a tiny key/value table for provider settings and
// an allow-list of servers where /ask may be used. Both are owner-managed.

export function createAiRepo(raw) {
  const stmts = {
    get: raw.prepare('SELECT value FROM ai_settings WHERE key = ?'),
    set: raw.prepare(`
      INSERT INTO ai_settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `),
    del: raw.prepare('DELETE FROM ai_settings WHERE key = ?'),
    allow: raw.prepare(`
      INSERT INTO ai_guilds (guild_id, added_by, added_at) VALUES (?, ?, ?)
      ON CONFLICT (guild_id) DO NOTHING
    `),
    disallow: raw.prepare('DELETE FROM ai_guilds WHERE guild_id = ?'),
    isAllowed: raw.prepare('SELECT 1 FROM ai_guilds WHERE guild_id = ?'),
    list: raw.prepare('SELECT guild_id, added_at FROM ai_guilds ORDER BY added_at ASC'),
    allowUser: raw.prepare(`
      INSERT INTO ai_users (user_id, added_by, added_at) VALUES (?, ?, ?)
      ON CONFLICT (user_id) DO NOTHING
    `),
    disallowUser: raw.prepare('DELETE FROM ai_users WHERE user_id = ?'),
    isUserAllowed: raw.prepare('SELECT 1 FROM ai_users WHERE user_id = ?'),
    listUsers: raw.prepare('SELECT user_id, added_at FROM ai_users ORDER BY added_at ASC'),
  };

  return {
    /** @returns {string|null} */
    getSetting(key) {
      return stmts.get.get(key)?.value ?? null;
    },
    /** Passing null/empty deletes the row. */
    setSetting(key, value) {
      if (value == null || value === '') stmts.del.run(key);
      else stmts.set.run(key, value, Date.now());
    },

    /** @returns {boolean} true when the server was newly allowed. */
    allowGuild(guildId, addedBy) {
      return stmts.allow.run(guildId, addedBy ?? null, Date.now()).changes > 0;
    },
    /** @returns {boolean} true when a server was actually removed. */
    disallowGuild(guildId) {
      return stmts.disallow.run(guildId).changes > 0;
    },
    isGuildAllowed(guildId) {
      return Boolean(guildId) && Boolean(stmts.isAllowed.get(guildId));
    },
    /** @returns {Array<{guild_id: string, added_at: number}>} */
    listGuilds() {
      return stmts.list.all();
    },

    // Individually granted people, who may use the AI anywhere at all —
    // independent of the server allow-list.
    /** @returns {boolean} true when the person was newly granted access. */
    allowUser(userId, addedBy) {
      return stmts.allowUser.run(userId, addedBy ?? null, Date.now()).changes > 0;
    },
    /** @returns {boolean} true when access was actually revoked. */
    disallowUser(userId) {
      return stmts.disallowUser.run(userId).changes > 0;
    },
    isUserAllowed(userId) {
      return Boolean(userId) && Boolean(stmts.isUserAllowed.get(userId));
    },
    /** @returns {Array<{user_id: string, added_at: number}>} */
    listUsers() {
      return stmts.listUsers.all();
    },
  };
}
