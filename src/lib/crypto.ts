import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_HEX = process.env.ENCRYPT_KEY || '';

if (!KEY_HEX || KEY_HEX.length !== 64) {
  // 开发模式下给个默认 key（仅开发用，生产必须设置）
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[WARN] ENCRYPT_KEY not set, using dev default. Set it with: openssl rand -hex 32');
  }
}
const KEY = Buffer.from(KEY_HEX.padEnd(64, '0'), 'hex').subarray(0, 32);

/** 加密明文，返回 base64（IV + authTag + ciphertext） */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/** 解密 */
export function decrypt(cipherText: string): string {
  const buf = Buffer.from(cipherText, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
}
