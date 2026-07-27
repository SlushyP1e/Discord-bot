import path from 'node:path';

/** Read a boolean-ish env var: 1/true/yes/on (any case) means true. */
function bool(value) {
  return /^(1|true|yes|on)$/i.test((value ?? '').trim());
}

/** Read a numeric env var, falling back when it's unset or not a number. */
function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  token: process.env.DISCORD_TOKEN,
  // Optional: register commands to a single guild for instant availability while testing.
  guildId: process.env.GUILD_ID || null,
  // Optional override for who can block GIFs. Defaults to the Discord app owner.
  ownerId: process.env.OWNER_ID || null,
  dataDir: process.env.DATA_DIR || './data',
  // Defaults for the /ask brain. Everything here can be overridden at runtime
  // by the owner with /aiconfig, which persists to the database.
  ai: {
    provider: process.env.AI_PROVIDER || 'deepseek',
    baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com',
    model: process.env.AI_MODEL || 'deepseek-v4-flash',
    apiKey: process.env.AI_API_KEY?.trim() || null,
    persona: process.env.AI_PERSONA?.trim() || null,
    // Used to encrypt the API key at rest. Strongly recommended.
    secret: process.env.CONFIG_SECRET?.trim() || null,
    timeoutMs: num(process.env.AI_TIMEOUT_MS, 30_000),
    // Kept fairly low on purpose: high temperature pushes replies toward
    // theatrical roleplay rather than actually answering.
    temperature: num(process.env.AI_TEMPERATURE, 0.7),
    // Output tokens are the pricey half of the bill, and chat replies should be
    // short anyway — this caps the worst case rather than the typical reply.
    maxTokens: num(process.env.AI_MAX_TOKENS, 400),
    // 'auto'     — turn DeepSeek's thinking mode OFF (it's on by default, and
    //              reasoning tokens bill as output). Other providers get no
    //              thinking field at all, since it isn't part of the OpenAI spec.
    // 'disabled' / 'enabled' — force it either way on any provider.
    // 'omit'     — never send the field.
    thinking: process.env.AI_THINKING?.trim() || 'auto',
    // How many past messages to resend as context on each /ask.
    memoryTurns: num(process.env.AI_MEMORY_TURNS, 8),
    // Chat by @mention / reply as well as /ask. Off by default because it needs
    // the privileged Message Content intent, which has to be switched on in the
    // Developer Portal first — requesting it without that stops the bot booting.
    mentionChat: bool(process.env.AI_MENTION_CHAT),
  },
};

export const dbPath = path.join(config.dataDir, 'slushylove.db');
