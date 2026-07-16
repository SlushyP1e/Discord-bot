export function createMarriagesRepo(db) {
  const find = db.prepare(
    'SELECT * FROM marriages WHERE guild_id = ? AND (user_a = ? OR user_b = ?)',
  );
  const insert = db.prepare(
    'INSERT INTO marriages (guild_id, user_a, user_b, married_at) VALUES (?, ?, ?, ?)',
  );
  const remove = db.prepare(
    'DELETE FROM marriages WHERE guild_id = ? AND (user_a = ? OR user_b = ?)',
  );

  return {
    /** @returns {{guild_id: string, user_a: string, user_b: string, married_at: number} | undefined} */
    get(guildId, userId) {
      return find.get(guildId, userId, userId);
    },
    marry(guildId, userIdA, userIdB) {
      const [a, b] = [userIdA, userIdB].sort();
      insert.run(guildId, a, b, Date.now());
    },
    divorce(guildId, userId) {
      return remove.run(guildId, userId, userId).changes > 0;
    },
  };
}
