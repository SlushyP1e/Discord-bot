export function createBlocklistRepo(db) {
  const insertGif = db.prepare(
    'INSERT OR IGNORE INTO blocked_gifs (url, reason, blocked_by, blocked_at) VALUES (?, ?, ?, ?)',
  );
  const hasGif = db.prepare('SELECT 1 FROM blocked_gifs WHERE url = ?');
  const countGif = db.prepare('SELECT COUNT(*) AS n FROM blocked_gifs');

  const insertAnime = db.prepare(
    'INSERT OR IGNORE INTO blocked_anime (name, blocked_by, blocked_at) VALUES (?, ?, ?)',
  );
  const hasAnime = db.prepare('SELECT 1 FROM blocked_anime WHERE name = ?');
  const countAnime = db.prepare('SELECT COUNT(*) AS n FROM blocked_anime');
  const listAnime = db.prepare('SELECT name FROM blocked_anime ORDER BY blocked_at DESC LIMIT ?');

  return {
    /** @returns true if newly blocked, false if it was already blocked. */
    blockGif: (url, reason, by) => insertGif.run(url, reason ?? null, by ?? null, Date.now()).changes > 0,
    isBlockedUrl: (url) => !!hasGif.get(url),

    // Anime names are stored/compared lowercased for case-insensitive matching.
    blockAnime: (name, by) => insertAnime.run(name.toLowerCase(), by ?? null, Date.now()).changes > 0,
    isBlockedAnime: (name) => (name ? !!hasAnime.get(name.toLowerCase()) : false),
    listAnime: (limit = 20) => listAnime.all(limit).map((r) => r.name),

    counts: () => ({ gifs: countGif.get().n, anime: countAnime.get().n }),
  };
}
