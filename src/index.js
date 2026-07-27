import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { config, dbPath } from './config.js';
import { createDatabase } from './db/database.js';
import { GifService, headValidate } from './gif/gifService.js';
import { AiSettings } from './ai/settings.js';
import { createAiClient } from './ai/client.js';
import { createConversationStore } from './ai/context.js';

if (!config.token) {
  console.error('❌ DISCORD_TOKEN is not set. Copy .env.example to .env and add your bot token.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const db = createDatabase(dbPath);
const aiSettings = new AiSettings({ repo: db.ai, defaults: config.ai });
const ctx = {
  client,
  db,
  gifService: new GifService({
    isBlockedUrl: (url) => db.blocklist.isBlockedUrl(url),
    isBlockedAnime: (anime) => db.blocklist.isBlockedAnime(anime),
    validateUrl: (url) => headValidate(url),
  }),
  // /ask: owner-managed settings, the provider client, and short-lived
  // per-user conversation memory (in-memory only, never written to disk).
  aiSettings,
  aiClient: createAiClient(aiSettings, {
    timeoutMs: config.ai.timeoutMs,
    temperature: config.ai.temperature,
    maxTokens: config.ai.maxTokens,
  }),
  conversations: createConversationStore(),
  // Resolved on ready to the Discord app owner (or config.ownerId override).
  ownerId: config.ownerId,
};

if (aiSettings.hasApiKey()) {
  console.log(`🧠 AI ready: ${aiSettings.provider} · ${aiSettings.model} (${aiSettings.allowedGuilds().length} server(s) allowed)`);
} else {
  console.log('🧠 AI not configured — the owner can run /aiconfig key to enable /ask');
}
if (!config.ai.secret) {
  console.warn('⚠️  CONFIG_SECRET is not set — the AI API key will be stored unencrypted in the database.');
}

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
