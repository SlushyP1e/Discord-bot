const lastUsed = new Map();

/**
 * Returns remaining cooldown in ms (0 when the command may run, in which case
 * the cooldown is armed).
 */
export function checkCooldown(userId, commandName, ms = 3000) {
  const key = `${userId}:${commandName}`;
  const now = Date.now();
  const last = lastUsed.get(key) ?? 0;
  const remaining = last + ms - now;
  if (remaining > 0) return remaining;
  lastUsed.set(key, now);
  // Opportunistic cleanup so the map doesn't grow forever.
  if (lastUsed.size > 10_000) {
    for (const [k, t] of lastUsed) if (now - t > 60_000) lastUsed.delete(k);
  }
  return 0;
}

/** Clears an armed cooldown, e.g. when the command failed before doing work. */
export function resetCooldown(userId, commandName) {
  lastUsed.delete(`${userId}:${commandName}`);
}
