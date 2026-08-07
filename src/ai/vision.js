// Turning Discord attachments into the content parts a vision model expects.
//
// The important decision here is that images are sent for the turn they arrive
// on and then dropped from the conversation memory, replaced by a short text
// placeholder. Keeping them would re-send and re-bill the same picture on every
// follow-up question, and Discord's CDN links are signed and expire anyway, so
// stored ones would start failing after a while.

export const MAX_IMAGES = 4;
export const MAX_BYTES = 20 * 1024 * 1024;

// What vision models actually accept. Discord will happily attach a .psd.
const IMAGE_TYPES = /^image\/(png|jpe?g|webp|gif)$/i;

/** @param {{contentType?: string, size?: number, url?: string}} attachment */
export function isSupportedImage(attachment) {
  if (!attachment?.url) return false;
  if (!IMAGE_TYPES.test(attachment.contentType ?? attachment.content_type ?? '')) return false;
  if (typeof attachment.size === 'number' && attachment.size > MAX_BYTES) return false;
  return true;
}

/**
 * Usable images from a message's attachments (a Collection or an array),
 * capped so nobody can send twenty pictures in one go.
 */
export function pickImages(attachments, max = MAX_IMAGES) {
  if (!attachments) return [];
  const list =
    typeof attachments.values === 'function'
      ? [...attachments.values()]
      : Array.isArray(attachments)
        ? attachments
        : [];
  return list.filter(isSupportedImage).slice(0, max);
}

// Used when someone posts a picture with no words at all, so the model has
// something to answer rather than a bare image.
export const IMAGE_ONLY_PROMPT = 'What do you make of this?';

/**
 * The `content` for a user message: a plain string when there are no images,
 * otherwise OpenAI's multi-part array form.
 */
export function buildUserContent(text, images = []) {
  if (!images.length) return text;
  return [
    { type: 'text', text: text || IMAGE_ONLY_PROMPT },
    ...images.map((image) => ({ type: 'image_url', image_url: { url: image.url } })),
  ];
}

/** What goes into the rolling memory in place of the image itself. */
export function historyText(text, imageCount) {
  if (!imageCount) return text;
  const noun = imageCount === 1 ? 'an image' : `${imageCount} images`;
  return text ? `${text} [sent ${noun}]` : `[sent ${noun}]`;
}
