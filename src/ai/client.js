// Chat-completions client for any OpenAI-compatible provider (DeepSeek by
// default, but OpenAI / Groq / OpenRouter all speak the same dialect).
//
// The base URL, model and key are read from AiSettings on every call, so
// /aiconfig changes apply to the very next /ask with no restart.

import { normalizeUsage } from './usage.js';
import { buildRequestBody } from './dialect.js';

// Re-exported so callers have one place to import the AI client's surface from.
export { thinkingField, isReasoningModel } from './dialect.js';

/** No API key configured yet — the owner still needs to run /aiconfig key. */
export class NoApiKeyError extends Error {
  constructor() {
    super('No AI API key configured');
    this.name = 'NoApiKeyError';
  }
}

/** Any failed AI request: HTTP error, timeout, or an unusable response body. */
export class AIRequestError extends Error {
  constructor(message, { status, reason, detail } = {}) {
    super(message);
    this.name = 'AIRequestError';
    this.status = status;
    /** A non-HTTP failure kind, e.g. 'length' when the token cap ran out. */
    this.reason = reason;
    /** The provider's own error text. Shown to the owner, never to anyone else. */
    this.detail = detail;
  }
}

/**
 * Turn a base URL into a full completions endpoint.
 *   https://api.deepseek.com          → https://api.deepseek.com/chat/completions
 *   https://api.openai.com/v1/        → https://api.openai.com/v1/chat/completions
 *   https://x.dev/v1/chat/completions → unchanged (already an endpoint)
 */
/**
 * Dig the human-readable message out of a provider's error body.
 * They mostly use `{"error": {"message": "..."}}`, but not all of them, so the
 * raw text is the fallback.
 */
export function extractProviderMessage(body) {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body);
    const message = parsed?.error?.message ?? parsed?.message ?? parsed?.error;
    if (typeof message === 'string' && message.trim()) return message.trim().slice(0, 400);
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return String(body).trim().slice(0, 400) || null;
}

export function buildEndpoint(baseUrl) {
  const trimmed = (baseUrl || '').trim().replace(/\/+$/, '');
  if (/\/chat\/completions$/.test(trimmed)) return trimmed;
  return `${trimmed}/chat/completions`;
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
  const reasoningEffort = defaults.reasoningEffort ?? 'minimal';

  /**
   * @param {Array<{role: string, content: string}>} messages
   * @returns {Promise<{text: string, usage: object|null}>} the reply, plus the
   *   provider's token accounting when it reports any.
   */
  async function chat(messages) {
    const apiKey = settings.getApiKey();
    if (!apiKey) throw new NoApiKeyError();

    const endpoint = buildEndpoint(settings.baseUrl);
    const payload = buildRequestBody({
      endpoint,
      model: settings.model,
      messages,
      temperature,
      maxTokens,
      thinkingMode,
      reasoningEffort,
    });

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
        body: JSON.stringify(payload),
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
        detail: extractProviderMessage(detail),
      });
    }

    let body;
    try {
      body = await res.json();
    } catch (err) {
      throw new AIRequestError(`AI provider returned non-JSON: ${err.message}`);
    }

    const choice = body?.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      // A reasoning model can burn the whole completion budget on hidden
      // thinking and stop before writing a word. That's a cap problem, not a
      // broken provider, and it needs a different fix from the user.
      if (choice?.finish_reason === 'length') {
        throw new AIRequestError(
          'AI provider hit its token cap before writing an answer — raise AI_MAX_TOKENS or lower AI_REASONING_EFFORT',
          { reason: 'length' },
        );
      }
      throw new AIRequestError('AI provider returned an empty response');
    }
    return { text: content.trim(), usage: normalizeUsage(body?.usage) };
  }

  return { chat };
}
