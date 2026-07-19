import path from 'node:path';

export const config = {
  token: process.env.DISCORD_TOKEN,
  // Optional: register commands to a single guild for instant availability while testing.
  guildId: process.env.GUILD_ID || null,
  // Optional override for who can block GIFs. Defaults to the Discord app owner.
  ownerId: process.env.OWNER_ID || null,
  dataDir: process.env.DATA_DIR || './data',
};

export const dbPath = path.join(config.dataDir, 'slushylove.db');
