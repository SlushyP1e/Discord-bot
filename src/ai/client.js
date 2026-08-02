// Chat-completions client for any OpenAI-compatible provider (DeepSeek by
// default, but OpenAI / Groq / OpenRouter all speak the same dialect).
//
// The base URL, model and key are read from AiSettings on every call, so
// /aiconfig changes apply to the very next /ask with no restart.

import { normalizeUsage } from './usage.js';

/** No API key configured yet — the owner still needs to run /aiconfig key. */
export class NoApiKeyError extends Error {
  constructor() {
    super('No AI API key configured');
    this.name = 'NoApiKeyError';
  }
}

/** Any failed AI request: HTTP error, timeout, or an unusable response body. */
export class AIRequestError extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.name = 'AIRequestError';
    this.status = status;
  }
}

/**
 * Turn a base URL into a full completions endpoint.
 *   https://api.deepseek.com          → https://api.deepseek.com/chat/completions
 *   https://api.openai.com/v1/        → https://api.openai.com/v1/chat/completions
 *   https://x.dev/v1/chat/completions → unchanged (already an endpoint)
 */
export function buildEndpoint(baseUrl) {
  const trimmed = (baseUrl || '').trim().replace(/\/+$/, '');
  if (/\/chat\/completions$/.test(trimmed)) return trimmed;
  return `${trimmed}/chat/completions`;
}

/**
 * Work out the `thinking` field for a request body, or null to leave it out.
 *
 * DeepSeek's V4 models think by default and bill those reasoning tokens as
 * output — expensive and slow for a chat bot that should be firing off
 * one-liners. So on DeepSeek we switch it off explicitly. It's a DeepSeek
 * extension though, not part of the OpenAI spec, so other providers (which
 * might reject an unknown field) never see it unless you ask for it by name.
 *
 * @param {string} endpoint
 * @param {'auto'|'disabled'|'enabled'|'omit'} mode
 */
export function thinkingField(endpoint, mode = 'auto') {
  if (mode === 'omit') return null;
  if (mode === 'auto') {
    let host;
    try {
      host = new URL(endpoint).hostname;
    } catch {
      return null;
    }
    return /(^|\.)deepseek\.com$/i.test(host) ? { type: 'disabled' } : null;
  }
  return { type: mode };
}

/**
 * @param {import('./settings.js').AiSettings} settings
 * @param {{timeoutMs?: number, temperature?: number, maxTokens?: number, thinking?: string}} [defaults]
 */
export function createAiClient(settings, defaults = {}) {
  const timeoutMs = defaults.timeoutMs ?? 30_000;
  const temperature = defaults.temperature ?? 0.9;
  const maxTokens = defaults.maxTokens ?? 400;
  const thinkingMode = defaults.thinking ?? 'auto';

  /**
   * @param {Array<{role: string, content: string}>} messages
   * @returns {Promise<{text: string, usage: object|null}>} the reply, plus the
   *   provider's token accounting when it reports any.
   */
  async function chat(messages) {
    const apiKey = settings.getApiKey();
    if (!apiKey) throw new NoApiKeyError();

    const endpoint = buildEndpoint(settings.baseUrl);
    const thinking = thinkingField(endpoint, thinkingMode);

    // Bail out rather than leaving the interaction hanging on a slow provider.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
          ...(thinking ? { thinking } : {}),
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new AIRequestError(`AI request timed out after ${timeoutMs}ms`);
      }
      throw new AIRequestError(`Network error contacting the AI provider: ${err.message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      // Surface the provider's own error in the logs, never to users.
      let detail = '';
      try {
        detail = (await res.text()).slice(0, 500);
      } catch { /* body already consumed or unreadable */ }
      throw new AIRequestError(`AI provider returned HTTP ${res.status}: ${detail}`, {
        status: res.status,
      });
    }

    let body;
    try {
      body = await res.json();
    } catch (err) {
      throw new AIRequestError(`AI provider returned non-JSON: ${err.message}`);
    }

    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new AIRequestError('AI provider returned an empty response');
    }
    return { text: content.trim(), usage: normalizeUsage(body?.usage) };
  }

  return { chat };
}
