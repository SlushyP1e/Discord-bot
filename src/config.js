import path from 'node:path';

export const config = {
  token: process.env.DISCORD_TOKEN,
  // Optional: register commands to a single guild for instant availability while testing.
  guildId: process.env.GUILD_ID || null,
  dataDir: process.env.DATA_DIR || './data',
};

export const dbPath = path.join(config.dataDir, 'slushylove.db');
