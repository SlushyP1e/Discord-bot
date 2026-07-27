// Chat-completions client for any OpenAI-compatible provider (DeepSeek by
// default, but OpenAI / Groq / OpenRouter all speak the same dialect).
//
// The base URL, model and key are read from AiSettings on every call, so
// /aiconfig changes apply to the very next /ask with no restart.

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
 * @param {import('./settings.js').AiSettings} settings
 * @param {{timeoutMs?: number, temperature?: number, maxTokens?: number}} [defaults]
 */
export function createAiClient(settings, defaults = {}) {
  const timeoutMs = defaults.timeoutMs ?? 30_000;
  const temperature = defaults.temperature ?? 0.9;
  const maxTokens = defaults.maxTokens ?? 700;

  /**
   * @param {Array<{role: string, content: string}>} messages
   * @returns {Promise<string>} the assistant's reply text
   */
  async function chat(messages) {
    const apiKey = settings.getApiKey();
    if (!apiKey) throw new NoApiKeyError();

    // Bail out rather than leaving the interaction hanging on a slow provider.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
      res = await fetch(buildEndpoint(settings.baseUrl), {
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
    return content.trim();
  }

  return { chat };
}
