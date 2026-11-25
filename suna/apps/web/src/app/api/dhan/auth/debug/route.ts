import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, SESSION_COOKIE } from '@/lib/dhan/session';
import {
  autoLogin,
  getAutoLoginState,
  getCachedSession,
} from '@/lib/dhan/autologin';
import { totp } from '@/lib/dhan/totp';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const clientId = process.env.DHAN_CLIENT_ID?.trim() ?? '';
  const pin = process.env.DHAN_PIN?.trim() ?? '';
  const totpSecret = process.env.DHAN_TOTP_SECRET?.trim() ?? '';
  const sessionSecret = process.env.SESSION_SECRET?.trim() ?? '';

  const cleanedTotpSecret = totpSecret.replace(/[=\s]/g, '');
  const totpSecretValidBase32 =
    cleanedTotpSecret.length > 0 && /^[A-Z2-7]+$/i.test(cleanedTotpSecret);

  const nowSec = Math.floor(Date.now() / 1000);
  const secondsLeftInWindow = 30 - (nowSec % 30);
  const currentTotpCode = totpSecretValidBase32 ? totp(totpSecret) : null;

  const cookieStore = await cookies();
  const hasDhanSessionCookie = Boolean(cookieStore.get(SESSION_COOKIE)?.value);

  const session = await getSession();
  const cachedSession = getCachedSession();

  let loginResult: { ok: boolean; hasToken: boolean } | undefined;
  if (req.nextUrl.searchParams.get('login') === '1') {
    const loggedIn = await autoLogin({ force: true });
    loginResult = {
      ok: Boolean(loggedIn?.accessToken),
      hasToken: Boolean(loggedIn?.accessToken),
    };
  }

  return NextResponse.json(
    {
      env: {
        DHAN_CLIENT_ID: Boolean(clientId),
        DHAN_PIN: Boolean(pin),
        DHAN_TOTP_SECRET: Boolean(totpSecret),
        SESSION_SECRET: Boolean(sessionSecret),
      },
      validation: {
        clientIdLength: clientId.length,
        clientIdDigitsOnly: clientId.length > 0 && /^\d+$/.test(clientId),
        pinLength: pin.length,
        pinDigitsOnly: pin.length > 0 && /^\d+$/.test(pin),
        totpSecretLength: totpSecret.length,
        totpSecretValidBase32,
      },
      clock: {
        serverIsoTime: new Date().toISOString(),
        currentTotpCode,
        secondsLeftInWindow,
      },
      sessionState: {
        hasDhanSessionCookie,
        getSessionActive: Boolean(session),
        getSessionExpiryTime: session?.expiryTime ?? null,
        getCachedSessionSet: Boolean(cachedSession),
      },
      autoLoginState: getAutoLoginState(),
      ...(loginResult !== undefined ? { loginResult } : {}),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
