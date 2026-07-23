import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFixedUrls, detectPlatform } from '../src/linkfix/linkFixer.js';

test('rewrites each platform to its primary fixer, keeping the path', () => {
  assert.equal(
    buildFixedUrls('https://x.com/user/status/12345').urls[0],
    'https://fxtwitter.com/user/status/12345',
  );
  assert.equal(
    buildFixedUrls('https://www.tiktok.com/@someone/video/98765').urls[0],
    'https://vxtiktok.com/@someone/video/98765',
  );
  assert.equal(
    buildFixedUrls('https://www.instagram.com/reel/AbC123/').urls[0],
    'https://ddinstagram.com/reel/AbC123/',
  );
  assert.equal(
    buildFixedUrls('https://www.reddit.com/r/x/comments/abc/title/').urls[0],
    'https://rxddit.com/r/x/comments/abc/title/',
  );
});

test('lists fallbacks in priority order', () => {
  assert.deepEqual(buildFixedUrls('https://twitter.com/a/status/1').urls, [
    'https://fxtwitter.com/a/status/1',
    'https://vxtwitter.com/a/status/1',
    'https://fixupx.com/a/status/1',
  ]);
});

test('strips tracking query params and fragments', () => {
  assert.equal(
    buildFixedUrls('https://x.com/u/status/1?s=20&t=abc#frag').urls[0],
    'https://fxtwitter.com/u/status/1',
  );
});

test('handles short links and subdomains', () => {
  assert.equal(buildFixedUrls('https://vm.tiktok.com/ZMabc123/').urls[0], 'https://vxtiktok.com/ZMabc123/');
  assert.equal(buildFixedUrls('https://mobile.twitter.com/a/status/9').urls[0], 'https://fxtwitter.com/a/status/9');
});

test('single-service platforms return one url', () => {
  const bsky = buildFixedUrls('https://bsky.app/profile/x/post/abc');
  assert.equal(bsky.urls.length, 1);
  assert.equal(bsky.urls[0], 'https://fxbsky.app/profile/x/post/abc');
});

test('detectPlatform is case-insensitive and www-agnostic', () => {
  assert.equal(detectPlatform('WWW.X.COM').name, 'Twitter / X');
  assert.equal(detectPlatform('unknown.example.com'), undefined);
});

test('returns null for unsupported or invalid input', () => {
  assert.equal(buildFixedUrls('https://youtube.com/watch?v=abc'), null);
  assert.equal(buildFixedUrls('not a url'), null);
  assert.equal(buildFixedUrls('mailto:someone@example.com'), null);
  assert.equal(buildFixedUrls('ftp://x.com/file'), null);
  assert.equal(buildFixedUrls(''), null);
});
