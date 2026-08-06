// Token accounting from a chat-completions response.
//
// Every OpenAI-compatible provider returns `usage`, but the field set varies —
// DeepSeek adds cache hit/miss counts, some providers omit the block entirely.
// Both are handled: a missing block just means no usage line is shown.

/** Pull a provider's `usage` object into a predictable shape, or null. */
export function normalizeUsage(usage) {
  if (!usage || typeof usage !== 'object') return null;

  const prompt = Number(usage.prompt_tokens) || 0;
  const completion = Number(usage.completion_tokens) || 0;
  const total = Number(usage.total_tokens) || prompt + completion;
  // How much of the prompt was served from cache, billed at a fraction of the
  // normal input rate. DeepSeek and OpenAI report it under different names.
  const cached =
    Number(usage.prompt_cache_hit_tokens) || Number(usage.prompt_tokens_details?.cached_tokens) || 0;
  // Hidden thinking on reasoning models. Invisible in the reply, but included
  // in completion_tokens and paid for at the output rate.
  const reasoning = Number(usage.completion_tokens_details?.reasoning_tokens) || 0;

  if (!prompt && !completion && !total) return null;
  return { prompt, completion, total, cached, reasoning };
}

const n = (value) => value.toLocaleString('en-US');

/** One-line summary for an embed footer, or null when there's nothing to show. */
export function formatUsage(usage) {
  if (!usage) return null;
  const parts = [`${n(usage.prompt)} in`, `${n(usage.completion)} out`];
  if (usage.reasoning > 0) parts.push(`${n(usage.reasoning)} thinking`);
  if (usage.cached > 0) parts.push(`${n(usage.cached)} cached`);
  return `🪙 ${parts.join(' · ')} — ${n(usage.total)} tokens`;
}
