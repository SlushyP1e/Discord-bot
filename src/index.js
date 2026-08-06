import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
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

// Slash commands need nothing privileged. Chatting by @mention additionally
// needs to *read* messages, which means the Message Content intent — privileged,
// and Discord refuses the connection outright if it isn't enabled in the
// Developer Portal, so it's only requested when the feature is switched on.
const intents = [GatewayIntentBits.Guilds];
const partials = [];
if (config.ai.mentionChat) {
  intents.push(
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  );
  // Uncached DMs arrive as partials without these.
  partials.push(Partials.Channel, Partials.Message);
}

const client = new Client({ intents, partials });
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
    thinking: config.ai.thinking,
    reasoningEffort: config.ai.reasoningEffort,
  }),
  conversations: createConversationStore({ maxTurns: config.ai.memoryTurns }),
  // Resolved on ready to the Discord app owner (or config.ownerId override).
  ownerId: config.ownerId,
};

if (aiSettings.hasApiKey()) {
  console.log(`🧠 AI ready: ${aiSettings.provider} · ${aiSettings.model} (${aiSettings.allowedGuilds().length} server(s) allowed)`);
} else {
  console.log('🧠 AI not configured — the owner can run /aiconfig key to enable /ask');
}
// Always logged, so "why isn't it replying to mentions?" is answerable from the
// first lines of the log instead of by guesswork.
console.log(config.ai.mentionChat
  ? '💬 @mention + reply chat: ON'
  : `💬 @mention + reply chat: OFF (AI_MENTION_CHAT=${JSON.stringify(process.env.AI_MENTION_CHAT ?? '')}) — /ask still works`);
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
  // Discord slams the gateway shut (code 4014) when you ask for a privileged
  // intent the application hasn't been granted — a confusing failure unless you
  // know AI_MENTION_CHAT is what asked for it.
  if (/disallowed intents/i.test(err.message) || err.code === 'DisallowedIntents') {
    console.error(
      '   AI_MENTION_CHAT is on, which needs the MESSAGE CONTENT intent.\n' +
        '   Enable it at Developer Portal → your app → Bot → Privileged Gateway Intents,\n' +
        '   or set AI_MENTION_CHAT=false to go back to slash commands only.',
    );
  } else {
    console.error('   Double-check DISCORD_TOKEN in your .env file.');
  }
  process.exit(1);
});
