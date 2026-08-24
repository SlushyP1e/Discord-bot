export function createMarriagesRepo(db) {
  const find = db.prepare(
    'SELECT * FROM marriages WHERE guild_id = ? AND (user_a = ? OR user_b = ?)',
  );
  // Checks-and-inserts atomically: succeeds only when NEITHER partner is
  // already married in this guild. Two proposals being accepted at the same
  // moment (double-click, two buttons) can't both win.
  const marryIfFree = db.prepare(`
    INSERT INTO marriages (guild_id, user_a, user_b, married_at)
    SELECT ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM marriages
      WHERE guild_id = ? AND (user_a IN (?, ?) OR user_b IN (?, ?))
    )
  `);
  const remove = db.prepare(
    'DELETE FROM marriages WHERE guild_id = ? AND (user_a = ? OR user_b = ?)',
  );

  return {
    /** @returns {{guild_id: string, user_a: string, user_b: string, married_at: number} | undefined} */
    get(guildId, userId) {
      return find.get(guildId, userId, userId);
    },
    /** @returns {boolean} true when the marriage was created. */
    marry(guildId, userIdA, userIdB) {
      const [a, b] = [userIdA, userIdB].sort();
      return marryIfFree.run(guildId, a, b, Date.now(), guildId, a, b, a, b).changes > 0;
    },
    divorce(guildId, userId) {
      return remove.run(guildId, userId, userId).changes > 0;
    },
  };
}
