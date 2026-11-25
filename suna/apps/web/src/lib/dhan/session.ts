import { cookies } from 'next/headers';
import crypto from 'node:crypto';

export const SESSION_COOKIE = 'dhan_session';
export const DISCONNECTED_COOKIE = 'dhan_disconnected';
export const CONSENT_COOKIE = 'dhan_consent';

export type DhanAuthMethod = 'consent' | 'totp' | 'auto' | 'manual';

export interface DhanSession {
  clientId: string;
  accessToken: string;
  expiryTime?: string;
  name?: string;
  authMethod?: DhanAuthMethod;
  connectedAt?: string;
}

const RUNTIME_FALLBACK_SEED =
  process.env.SESSION_SECRET ||
  process.env.DHAN_TOTP_SECRET ||
  crypto.randomBytes(32).toString('hex');

const g = globalThis as unknown as { __dhanSessionFallbackSeed?: string };
if (!g.__dhanSessionFallbackSeed) {
  g.__dhanSessionFallbackSeed = RUNTIME_FALLBACK_SEED;
}

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET || g.__dhanSessionFallbackSeed!;
  return crypto.createHash('sha256').update(secret).digest();
}

function seal(obj: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64url');
}

function unseal<T>(token: string): T | null {
  try {
    const buf = Buffer.from(token, 'base64url');
    if (buf.length < 29) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const dec = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
    return JSON.parse(dec) as T;
  } catch {
    return null;
  }
}

/** Parses Dhan expiry timestamps (typically IST without offset or ISO string). */
export function parseExpiryMs(expiryTime?: string): number | null {
  if (!expiryTime || typeof expiryTime !== 'string') return null;
  const trimmed = expiryTime.trim();
  if (!trimmed) return null;

  // Already carries explicit timezone (Z or +HH:MM / -HH:MM)
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
    const ms = new Date(trimmed).getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  // ISO-like without tz: YYYY-MM-DD HH:mm:ss or YYYY-MM-DDTHH:mm:ss
  const isoCandidate = trimmed.includes('T') ? `${trimmed}+05:30` : `${trimmed.replace(' ', 'T')}+05:30`;
  let ms = new Date(isoCandidate).getTime();
  if (!Number.isNaN(ms)) return ms;

  // Human-readable IST e.g. "May 22, 2025 14:30:00"
  ms = new Date(`${trimmed} GMT+0530`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export async function saveSession(session: DhanSession): Promise<void> {
  const cookieStore = await cookies();
  const payload: DhanSession = {
    ...session,
    connectedAt: session.connectedAt || new Date().toISOString(),
  };

  cookieStore.set(SESSION_COOKIE, seal(payload), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24,
  });

  // Explicit login clears any previous disconnect marker
  cookieStore.delete({ name: DISCONNECTED_COOKIE, path: '/' });
}

export async function getSession(): Promise<DhanSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const session = unseal<DhanSession>(raw);
  if (!session || !session.accessToken || !session.clientId) return null;

  const expMs = parseExpiryMs(session.expiryTime);
  if (expMs !== null && expMs < Date.now()) {
    return null;
  }
  return session;
}

export async function clearSession(markDisconnected = false): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SESSION_COOKIE, path: '/' });
  if (markDisconnected) {
    cookieStore.set(DISCONNECTED_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

export async function isExplicitlyDisconnected(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(DISCONNECTED_COOKIE)?.value === '1';
}

export function getDhanEnvCapabilities() {
  const hasAutoAuthEnv = Boolean(
    process.env.DHAN_CLIENT_ID?.trim() &&
      process.env.DHAN_PIN?.trim() &&
      process.env.DHAN_TOTP_SECRET?.trim()
  );
  const hasConsentEnv = Boolean(
    process.env.DHAN_APP_ID?.trim() && process.env.DHAN_APP_SECRET?.trim()
  );
  return {
    hasAutoAuthEnv,
    hasConsentEnv,
  };
}
