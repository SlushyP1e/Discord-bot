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
  // DeepSeek-specific: how much of the prompt was served from its cache, which
  // is billed at a fraction of the normal input rate.
  const cached = Number(usage.prompt_cache_hit_tokens) || 0;

  if (!prompt && !completion && !total) return null;
  return { prompt, completion, total, cached };
}

const n = (value) => value.toLocaleString('en-US');

/** One-line summary for an embed footer, or null when there's nothing to show. */
export function formatUsage(usage) {
  if (!usage) return null;
  const parts = [`${n(usage.prompt)} in`, `${n(usage.completion)} out`];
  if (usage.cached > 0) parts.push(`${n(usage.cached)} cached`);
  return `🪙 ${parts.join(' · ')} — ${n(usage.total)} tokens`;
}
