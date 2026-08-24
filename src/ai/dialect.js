// Per-provider request-body shaping.
//
// "OpenAI-compatible" stopped meaning one thing. Classic chat models take
// `temperature` and `max_tokens`; OpenAI's reasoning models (GPT-5 family,
// o-series) reject both — they renamed the cap to `max_completion_tokens` and
// only accept the default temperature. DeepSeek meanwhile has its own
// `thinking` extension. This module owns those differences so the client
// itself stays a plain HTTP call.

// Reasoning models bill hidden thinking tokens against the completion cap, so a
// cap sized for chat replies can be swallowed whole before any answer is
// written. Keep a floor under it.
export const REASONING_MIN_TOKENS = 1200;

/**
 * Does this model use OpenAI's reasoning-model parameter set?
 *
 * Matched on the model name rather than the host, because the same models are
 * served under prefixed names by proxies (`openai/gpt-5-nano` on OpenRouter).
 */
export function isReasoningModel(model) {
  return /(?:^|\/)(?:gpt-5|o[1345])(?:[.-]|$)/i.test((model ?? '').trim());
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
 * Build the JSON body for a chat-completions call, in the dialect the target
 * model actually speaks.
 */
export function buildRequestBody({
  endpoint,
  model,
  messages,
  temperature,
  maxTokens,
  thinkingMode = 'auto',
  reasoningEffort = 'minimal',
}) {
  const body = { model, messages, stream: false };

  if (isReasoningModel(model)) {
    body.max_completion_tokens = Math.max(maxTokens, REASONING_MIN_TOKENS);
    // 'minimal' keeps the hidden thinking short, which is both cheaper and
    // much faster — the right trade for chat. 'default' leaves it unset.
    if (reasoningEffort && reasoningEffort !== 'default') {
      body.reasoning_effort = reasoningEffort;
    }
    return body;
  }

  body.temperature = temperature;
  body.max_tokens = maxTokens;
  const thinking = thinkingField(endpoint, thinkingMode);
  if (thinking) body.thinking = thinking;
  return body;
}
