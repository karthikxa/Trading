import crypto from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function b32decode(secret: string): Buffer {
  let bits = '';
  for (const ch of secret.replace(/[=\s]/g, '').toUpperCase()) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Computes an RFC 6238 HMAC-SHA1 TOTP code from a Base32 secret.
 */
export function totp(secret: string, step = 30, digits = 6): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / step)));
  const hmac = crypto.createHmac('sha1', b32decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      (hmac[offset + 1] << 16) |
      (hmac[offset + 2] << 8) |
      hmac[offset + 3]) %
    10 ** digits;
  return String(code).padStart(digits, '0');
}
