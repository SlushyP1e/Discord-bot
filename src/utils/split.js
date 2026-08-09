// Split a long AI reply into Discord-safe chunks, preferring to break on a
// paragraph, then a line, then a word — so we never truncate an answer and
// rarely cut mid-word.

/** Shorten to `maxLen` characters, ending in an ellipsis when it had to cut. */
export function truncate(text, maxLen) {
  if (!text || text.length <= maxLen) return text ?? '';
  return `${text.slice(0, maxLen - 1).trimEnd()}…`;
}

/**
 * @param {string} text
 * @param {number} [maxLen] defaults to the embed description limit.
 * @returns {string[]} one or more chunks, each at most `maxLen` characters.
 */
export function splitText(text, maxLen = 4000) {
  if (!text) return [];
  if (text.length <= maxLen) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    const slice = remaining.slice(0, maxLen);
    // Take the last natural boundary in the window, but only if it isn't so
    // early that we'd emit a stream of tiny fragments.
    let cut = -1;
    for (const candidate of [slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'), slice.lastIndexOf(' ')]) {
      if (candidate > maxLen * 0.5) {
        cut = candidate;
        break;
      }
    }
    if (cut === -1) cut = maxLen; // one giant unbroken token

    chunks.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}
