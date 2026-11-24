import crypto from 'node:crypto';

function base32Decode(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Computes RFC 6238 Time-based One-Time Password (TOTP) from a base32 secret.
 */
export function generateTotp(secret: string, timeStepSec = 30): string {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStepSec);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

/**
 * Automatically authenticates with DhanHQ using TOTP and generates a fresh 24-hour access token.
 */
export async function refreshDhanAccessToken(params?: {
  clientId?: string;
  pin?: string;
  totpSecret?: string;
}): Promise<{ ok: boolean; accessToken?: string; error?: string }> {
  const clientId = params?.clientId || process.env.DHAN_CLIENT_ID || '1114824544';
  const pin = params?.pin || process.env.DHAN_PIN;
  const totpSecret = params?.totpSecret || process.env.DHAN_TOTP_SECRET;

  if (!pin || !totpSecret) {
    return {
      ok: false,
      error: 'DHAN_PIN and DHAN_TOTP_SECRET are required for automated daily renewal.',
    };
  }

  try {
    const totp = generateTotp(totpSecret);
    const authUrl = new URL('https://auth.dhan.co/app/generateAccessToken');
    authUrl.searchParams.set('dhanClientId', clientId);
    authUrl.searchParams.set('pin', pin);
    authUrl.searchParams.set('totp', totp);

    const res = await fetch(authUrl.toString(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.accessToken) {
      process.env.DHAN_ACCESS_TOKEN = data.accessToken;
      return {
        ok: true,
        accessToken: data.accessToken,
      };
    }

    return {
      ok: false,
      error: data?.errorMessage || data?.error || `Auth failed with status ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown auth error',
    };
  }
}
