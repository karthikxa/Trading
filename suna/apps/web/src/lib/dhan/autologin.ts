import { totp } from './totp';
import {
  saveSession,
  isExplicitlyDisconnected,
  parseExpiryMs,
  type DhanSession,
} from './session';

const g = globalThis as unknown as { __dhanSession?: DhanSession | null };

export function getCachedSession(): DhanSession | null {
  const s = g.__dhanSession ?? null;
  if (!s) return null;
  const expMs = parseExpiryMs(s.expiryTime);
  if (expMs !== null && expMs <= Date.now()) {
    g.__dhanSession = null;
    return null;
  }
  return s;
}

export function setCachedSession(s: DhanSession | null): void {
  g.__dhanSession = s;
}

let inflight: Promise<DhanSession | null> | null = null;
let failureCooldownUntil = 0;
let lastAutoLoginError: string | null = null;

const FAILURE_COOLDOWN_MS = 15 * 60 * 1000; // Prevent repeated PIN/TOTP attempts that risk account lock

export function getLastAutoLoginError(): string | null {
  return lastAutoLoginError;
}

export function getAutoLoginState(): { lastError: string | null; cooldownSecondsLeft: number } {
  return {
    lastError: lastAutoLoginError,
    cooldownSecondsLeft: Math.max(0, Math.ceil((failureCooldownUntil - Date.now()) / 1000)),
  };
}

export function resetAutoLoginCooldown(): void {
  failureCooldownUntil = 0;
  lastAutoLoginError = null;
}

/**
 * Zero-touch DhanHQ session refresh using .env.local DHAN_CLIENT_ID + DHAN_PIN + DHAN_TOTP_SECRET.
 * Deduplicated via single-flight promise so concurrent dashboard polls trigger at most one login,
 * with a failure circuit-breaker to protect against account lockout.
 */
export async function autoLogin(options?: { force?: boolean }): Promise<DhanSession | null> {
  const force = Boolean(options?.force);

  if (!force) {
    if (Date.now() < failureCooldownUntil) {
      return null;
    }
    if (await isExplicitlyDisconnected()) {
      return null;
    }
  } else {
    resetAutoLoginCooldown();
  }

  inflight ??= doLogin().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function doLogin(): Promise<DhanSession | null> {
  const clientId = process.env.DHAN_CLIENT_ID?.trim();
  const pin = process.env.DHAN_PIN?.trim();
  const secret = process.env.DHAN_TOTP_SECRET?.trim();
  if (!clientId || !pin || !secret) {
    return null;
  }

  try {
    const code = totp(secret);
    const url = new URL('https://auth.dhan.co/app/generateAccessToken');
    url.search = new URLSearchParams({
      dhanClientId: clientId,
      pin,
      totp: code,
    }).toString();

    const res = await fetch(url, { method: 'POST', cache: 'no-store' });
    const rawText = await res.text().catch(() => '');
    let data: any = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = {};
    }

    if (!res.ok || !data?.accessToken) {
      const sanitizedBody =
        typeof rawText === 'string' && rawText.trim()
          ? rawText.replace(/"accessToken"\s*:\s*"[^"]*"/gi, '"accessToken":"[redacted]"')
          : JSON.stringify({
              errorCode: data?.errorCode,
              errorMessage: data?.errorMessage,
              message: data?.message,
              status: data?.status,
            });
      lastAutoLoginError = `HTTP ${res.status}: ${sanitizedBody}`;
      failureCooldownUntil = Date.now() + FAILURE_COOLDOWN_MS;
      return null;
    }

    lastAutoLoginError = null;
    failureCooldownUntil = 0;

    const session: DhanSession = {
      clientId: String(data.dhanClientId || clientId),
      accessToken: String(data.accessToken),
      expiryTime: data.expiryTime ? String(data.expiryTime) : undefined,
      name: data.dhanClientName ? String(data.dhanClientName) : undefined,
      authMethod: 'auto',
    };

    await saveSession(session);
    setCachedSession(session);
    return session;
  } catch (err) {
    lastAutoLoginError = err instanceof Error ? err.message : 'Network error during Dhan login';
    failureCooldownUntil = Date.now() + FAILURE_COOLDOWN_MS;
    return null;
  }
}
