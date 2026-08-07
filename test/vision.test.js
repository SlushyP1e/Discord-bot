import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSupportedImage,
  pickImages,
  buildUserContent,
  historyText,
  IMAGE_ONLY_PROMPT,
  MAX_IMAGES,
  MAX_BYTES,
} from '../src/ai/vision.js';

const png = { url: 'https://cdn.discordapp.com/a.png', contentType: 'image/png', size: 1000 };

test('only real, sendable images are accepted', () => {
  assert.equal(isSupportedImage(png), true);
  for (const type of ['image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'IMAGE/PNG']) {
    assert.equal(isSupportedImage({ ...png, contentType: type }), true, type);
  }
  // Things Discord will happily attach but a vision model won't take.
  for (const type of ['application/pdf', 'image/vnd.adobe.photoshop', 'video/mp4', 'text/plain', '']) {
    assert.equal(isSupportedImage({ ...png, contentType: type }), false, type);
  }
  assert.equal(isSupportedImage({ ...png, size: MAX_BYTES + 1 }), false, 'too big');
  assert.equal(isSupportedImage({ ...png, url: undefined }), false);
  assert.equal(isSupportedImage(null), false);
  // Raw API payloads use snake_case.
  assert.equal(isSupportedImage({ url: png.url, content_type: 'image/png' }), true);
});

test('images are collected from a Collection or an array, and capped', () => {
  const many = Array.from({ length: 10 }, (_, i) => ({ ...png, url: `https://cdn/${i}.png` }));
  assert.equal(pickImages(many).length, MAX_IMAGES);
  assert.equal(pickImages(new Map(many.map((m, i) => [String(i), m]))).length, MAX_IMAGES);
  // Non-images are filtered out, not counted against the cap.
  assert.deepEqual(pickImages([{ ...png, contentType: 'text/plain' }, png]), [png]);
  assert.deepEqual(pickImages(null), []);
  assert.deepEqual(pickImages(undefined), []);
});

test('content stays a plain string until there is an image to send', () => {
  assert.equal(buildUserContent('what is tuna'), 'what is tuna');
  assert.equal(buildUserContent('what is tuna', []), 'what is tuna');

  const parts = buildUserContent('what is this', [png]);
  assert.deepEqual(parts, [
    { type: 'text', text: 'what is this' },
    { type: 'image_url', image_url: { url: png.url } },
  ]);

  // An image with no caption still gets the model something to answer.
  assert.equal(buildUserContent('', [png])[0].text, IMAGE_ONLY_PROMPT);
});

test('memory keeps a placeholder, never the image itself', () => {
  // Re-sending an image on every follow-up would re-bill it, and Discord's
  // signed CDN links expire — so history records that one was sent, no more.
  assert.equal(historyText('what is this', 1), 'what is this [sent an image]');
  assert.equal(historyText('these?', 3), 'these? [sent 3 images]');
  assert.equal(historyText('', 1), '[sent an image]');
  assert.equal(historyText('no pictures here', 0), 'no pictures here');

  const remembered = historyText('what is this', 1);
  assert.ok(!remembered.includes('http'), 'no expiring URL may reach the history');
});
