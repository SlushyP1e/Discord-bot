import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { config, dbPath } from './config.js';
import { createDatabase } from './db/database.js';
import { GifService, headValidate } from './gif/gifService.js';

if (!config.token) {
  console.error('❌ DISCORD_TOKEN is not set. Copy .env.example to .env and add your bot token.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const db = createDatabase(dbPath);
const ctx = {
  client,
  db,
  gifService: new GifService({
    isBlockedUrl: (url) => db.blocklist.isBlockedUrl(url),
    isBlockedAnime: (anime) => db.blocklist.isBlockedAnime(anime),
    validateUrl: (url) => headValidate(url),
  }),
  // Resolved on ready to the Discord app owner (or config.ownerId override).
  ownerId: config.ownerId,
};

// Load commands: each file in src/commands/<category>/ exports a command (or an
// array of commands) as its default export. Files starting with _ are helpers.
const commandsRoot = path.join(import.meta.dirname, 'commands');
for (const category of readdirSync(commandsRoot)) {
  const dir = path.join(commandsRoot, category);
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.js') || file.startsWith('_')) continue;
    const mod = (await import(pathToFileURL(path.join(dir, file)))).default;
    for (const command of Array.isArray(mod) ? mod : [mod]) {
      client.commands.set(command.data.name, { ...command, category });
    }
  }
}
console.log(`📦 Loaded ${client.commands.size} commands`);

// Load events.
const eventsDir = path.join(import.meta.dirname, 'events');
for (const file of readdirSync(eventsDir)) {
  if (!file.endsWith('.js')) continue;
  const event = (await import(pathToFileURL(path.join(eventsDir, file)))).default;
  if (event.once) client.once(event.name, (...args) => event.execute(...args, ctx));
  else client.on(event.name, (...args) => event.execute(...args, ctx));
}

function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully 💤`);
  client.destroy();
  ctx.db.close();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

client.login(config.token).catch((err) => {
  console.error('❌ Failed to log in to Discord:', err.message);
  console.error('   Double-check DISCORD_TOKEN in your .env file.');
  process.exit(1);
});
