// AES-256-GCM helpers used to keep the AI API key encrypted at rest.
//
// When CONFIG_SECRET is set, the key is stored as a self-describing envelope; a
// fresh salt + IV per write means the same key never encrypts identically. With
// no secret configured we fall back to storing it as-is inside the SQLite file
// (and warn once at startup).

import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';

const ALG = 'aes-256-gcm';

export function encryptString(plaintext, secret) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(secret, salt, 32);
  const cipher = createCipheriv(ALG, key, iv);
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    v: 1,
    alg: ALG,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
}

/** Reverse of encryptString(). Throws when the secret is wrong or data tampered with. */
export function decryptString(envelope, secret) {
  const key = scryptSync(secret, Buffer.from(envelope.salt, 'base64'), 32);
  const decipher = createDecipheriv(envelope.alg || ALG, key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.data, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
