import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createInteractionsRepo } from './interactions.js';
import { createMarriagesRepo } from './marriages.js';
import { createBlocklistRepo } from './blocklist.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS interactions (
  guild_id  TEXT NOT NULL,
  user_id   TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action    TEXT NOT NULL,
  count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id, target_id, action)
);
CREATE INDEX IF NOT EXISTS idx_interactions_target ON interactions (guild_id, target_id);

CREATE TABLE IF NOT EXISTS marriages (
  guild_id   TEXT NOT NULL,
  user_a     TEXT NOT NULL,
  user_b     TEXT NOT NULL,
  married_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_a, user_b)
);
CREATE INDEX IF NOT EXISTS idx_marriages_b ON marriages (guild_id, user_b);

CREATE TABLE IF NOT EXISTS blocked_gifs (
  url        TEXT PRIMARY KEY,
  reason     TEXT,
  blocked_by TEXT,
  blocked_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS blocked_anime (
  name       TEXT PRIMARY KEY,
  blocked_by TEXT,
  blocked_at INTEGER NOT NULL
);
`;

export function createDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const raw = new Database(path);
  raw.pragma('journal_mode = WAL');
  raw.exec(SCHEMA);
  return {
    raw,
    interactions: createInteractionsRepo(raw),
    marriages: createMarriagesRepo(raw),
    blocklist: createBlocklistRepo(raw),
    close: () => raw.close(),
  };
}
