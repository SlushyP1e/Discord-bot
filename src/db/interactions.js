export function createInteractionsRepo(db) {
  const upsert = db.prepare(`
    INSERT INTO interactions (guild_id, user_id, target_id, action, count) VALUES (?, ?, ?, ?, 1)
    ON CONFLICT (guild_id, user_id, target_id, action) DO UPDATE SET count = count + 1
  `);
  const getCount = db.prepare(
    'SELECT count FROM interactions WHERE guild_id = ? AND user_id = ? AND target_id = ? AND action = ?',
  );
  const topGiven = db.prepare(`
    SELECT action, SUM(count) AS total FROM interactions
    WHERE guild_id = ? AND user_id = ? GROUP BY action ORDER BY total DESC LIMIT ?
  `);
  const topReceived = db.prepare(`
    SELECT action, SUM(count) AS total FROM interactions
    WHERE guild_id = ? AND target_id = ? GROUP BY action ORDER BY total DESC LIMIT ?
  `);
  const favoriteTarget = db.prepare(`
    SELECT target_id, SUM(count) AS total FROM interactions
    WHERE guild_id = ? AND user_id = ? GROUP BY target_id ORDER BY total DESC LIMIT 1
  `);
  const biggestFan = db.prepare(`
    SELECT user_id, SUM(count) AS total FROM interactions
    WHERE guild_id = ? AND target_id = ? GROUP BY user_id ORDER BY total DESC LIMIT 1
  `);

  return {
    /** Records one interaction and returns the new pair count. */
    increment(guildId, userId, targetId, action) {
      upsert.run(guildId, userId, targetId, action);
      return getCount.get(guildId, userId, targetId, action).count;
    },
    topGiven: (guildId, userId, limit = 5) => topGiven.all(guildId, userId, limit),
    topReceived: (guildId, userId, limit = 5) => topReceived.all(guildId, userId, limit),
    favoriteTarget: (guildId, userId) => favoriteTarget.get(guildId, userId),
    biggestFan: (guildId, userId) => biggestFan.get(guildId, userId),
  };
}
