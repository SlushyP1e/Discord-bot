// Live AI settings.
//
// Two layers: environment defaults (from config.ai) with anything the owner has
// saved via /aiconfig layered on top. Everything reads through this object on
// each call, so /aiconfig takes effect immediately — no restart needed.

import { encryptString, decryptString } from './secret.js';

const KEYS = {
  apiKey: 'api_key',
  baseUrl: 'base_url',
  model: 'model',
  provider: 'provider',
  persona: 'persona',
};

/** Wrap a raw key for storage, encrypting it when a CONFIG_SECRET is available. */
function packKey(apiKey, secret) {
  if (secret) return JSON.stringify({ enc: true, envelope: encryptString(apiKey, secret) });
  return JSON.stringify({ enc: false, value: apiKey });
}

/** Reverse of packKey(). Returns null when the value can't be recovered. */
function unpackKey(stored, secret) {
  let parsed;
  try {
    parsed = JSON.parse(stored);
  } catch {
    // Written by an older build (or edited by hand) as a bare string.
    return stored.trim() || null;
  }
  if (!parsed?.enc) return parsed?.value?.trim() || null;
  if (!secret) {
    console.warn('⚠️  The saved AI key is encrypted but CONFIG_SECRET is not set — cannot use it.');
    return null;
  }
  try {
    return decryptString(parsed.envelope, secret);
  } catch (err) {
    console.error('❌ Could not decrypt the saved AI key (wrong CONFIG_SECRET?):', err.message);
    return null;
  }
}

// DeepSeek retired these aliases on 2026-07-24; requests using them now fail.
// Anything saved with an older build gets rewritten on startup so the bot
// doesn't silently break.
const RETIRED_MODELS = {
  'deepseek-chat': 'deepseek-v4-flash',
  'deepseek-reasoner': 'deepseek-v4-flash',
};

export class AiSettings {
  /**
   * @param {object} opts
   * @param {ReturnType<import('../db/ai.js').createAiRepo>} opts.repo
   * @param {object} opts.defaults  config.ai — env-provided fallbacks.
   */
  constructor({ repo, defaults }) {
    this.repo = repo;
    this.defaults = defaults;
    this.secret = defaults.secret || null;
    this.#migrateRetiredModel();
  }

  #migrateRetiredModel() {
    const stored = this.repo.getSetting(KEYS.model);
    const replacement = stored && RETIRED_MODELS[stored];
    if (!replacement) return;
    this.repo.setSetting(KEYS.model, replacement);
    console.warn(`⚠️  Model "${stored}" has been retired by the provider — switched to "${replacement}".`);
  }

  #setting(key, fallback) {
    return this.repo.getSetting(key) ?? fallback;
  }

  get provider() {
    return this.#setting(KEYS.provider, this.defaults.provider);
  }
  get baseUrl() {
    return this.#setting(KEYS.baseUrl, this.defaults.baseUrl);
  }
  get model() {
    return this.#setting(KEYS.model, this.defaults.model);
  }
  /** Owner-set personality flavour, or null for the built-in persona only. */
  get persona() {
    return this.#setting(KEYS.persona, this.defaults.persona);
  }
  /** Env-only: how to handle DeepSeek's thinking mode. See config.ai.thinking. */
  get thinking() {
    return this.defaults.thinking ?? 'auto';
  }

  getApiKey() {
    const stored = this.repo.getSetting(KEYS.apiKey);
    if (stored) return unpackKey(stored, this.secret);
    return this.defaults.apiKey || null;
  }

  hasApiKey() {
    return Boolean(this.getApiKey());
  }

  /** True when the key currently stored is encrypted at rest — decided by the
   * envelope's own flag, not by whether CONFIG_SECRET happens to be set now
   * (it may have been added after a plaintext key was saved). */
  get keyEncrypted() {
    const stored = this.repo.getSetting(KEYS.apiKey);
    if (!stored) return false;
    try {
      return JSON.parse(stored)?.enc === true;
    } catch {
      return false; // a bare string written outside packKey()
    }
  }

  /** Only defined, non-empty fields are changed. */
  setProvider({ apiKey, baseUrl, model, provider } = {}) {
    if (apiKey) this.repo.setSetting(KEYS.apiKey, packKey(apiKey.trim(), this.secret));
    if (baseUrl) this.repo.setSetting(KEYS.baseUrl, baseUrl.trim().replace(/\/+$/, ''));
    if (model) this.repo.setSetting(KEYS.model, model.trim());
    if (provider) this.repo.setSetting(KEYS.provider, provider.trim());
  }

  /** Forget the stored key. Falls back to AI_API_KEY from the environment, if any. */
  clearApiKey() {
    this.repo.setSetting(KEYS.apiKey, null);
  }

  /** Pass null/empty to fall back to the built-in persona. */
  setPersona(text) {
    this.repo.setSetting(KEYS.persona, text?.trim() || null);
  }

  // ── Server allow-list ──────────────────────────────────────────────────────
  allowGuild(guildId, addedBy) {
    return this.repo.allowGuild(guildId, addedBy);
  }
  disallowGuild(guildId) {
    return this.repo.disallowGuild(guildId);
  }
  isGuildAllowed(guildId) {
    return this.repo.isGuildAllowed(guildId);
  }
  allowedGuilds() {
    return this.repo.listGuilds().map((row) => row.guild_id);
  }

  // ── Per-person grants ──────────────────────────────────────────────────────
  allowUser(userId, addedBy) {
    return this.repo.allowUser(userId, addedBy);
  }
  disallowUser(userId) {
    return this.repo.disallowUser(userId);
  }
  isUserAllowed(userId) {
    return this.repo.isUserAllowed(userId);
  }
  allowedUsers() {
    return this.repo.listUsers().map((row) => row.user_id);
  }
}

/**
 * Decide whether an interaction may use the AI. Three ways in, checked in order:
 *
 *   1. The owner, always and everywhere.
 *   2. Someone the owner granted personally with /access give — also anywhere,
 *      including DMs and servers the bot isn't even in (via a user install).
 *   3. Anyone at all, but only inside a server on the allow-list.
 *
 * So an empty allow-list with no grants means the AI is owner-only, and DMs
 * stay closed to everyone else — the owner is the one paying for the calls.
 *
 * @returns {{ok: true} | {ok: false, reason: string}}
 */
export function checkAiAccess({ isOwner, userId, guildId, settings }) {
  if (isOwner) return { ok: true };
  if (settings.isUserAllowed(userId)) return { ok: true };
  if (!guildId) {
    return { ok: false, reason: 'My AI brain only works inside servers — try `/ask` there instead! 💭' };
  }
  if (!settings.isGuildAllowed(guildId)) {
    return {
      ok: false,
      reason:
        "My AI brain isn't switched on in this server 💤\n" +
        'Only my owner can enable it here, with `/aiconfig allow`.',
    };
  }
  return { ok: true };
}
