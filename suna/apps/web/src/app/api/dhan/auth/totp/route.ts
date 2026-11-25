import { NextRequest, NextResponse } from 'next/server';
import { saveSession } from '@/lib/dhan/session';
import { autoLogin, getLastAutoLoginError, resetAutoLoginCooldown } from '@/lib/dhan/autologin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Mode 1: Explicit trigger of .env.local Zero-Touch TOTP auto-login
    if (body?.useEnv === true) {
      const session = await autoLogin({ force: true });
      if (!session) {
        return NextResponse.json(
          {
            ok: false,
            error:
              getLastAutoLoginError() ||
              'Failed to authenticate with local .env.local Dhan credentials.',
          },
          { status: 401 }
        );
      }
      return NextResponse.json({
        ok: true,
        clientId: session.clientId,
        name: session.name || null,
        expiryTime: session.expiryTime || null,
        authMethod: 'auto',
      });
    }

    // Mode 2: Interactive Client ID + PIN + 6-digit TOTP login
    const clientId = String(body?.clientId ?? '').trim();
    const pin = String(body?.pin ?? '').trim();
    const totp = String(body?.totp ?? '').trim();

    if (!/^\d+$/.test(clientId) || !/^\d{4,8}$/.test(pin) || !/^\d{6}$/.test(totp)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Valid numeric Dhan Client ID, 4-8 digit PIN, and 6-digit TOTP code are required.',
        },
        { status: 400 }
      );
    }

    const url = new URL('https://auth.dhan.co/app/generateAccessToken');
    url.search = new URLSearchParams({ dhanClientId: clientId, pin, totp }).toString();

    const r = await fetch(url, { method: 'POST', cache: 'no-store' });
    const data = await r.json().catch(() => ({}));

    if (!r.ok || !data?.accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error:
            data?.errorMessage ||
            data?.message ||
            'Invalid Client ID, PIN, or TOTP code from DhanHQ.',
        },
        { status: 401 }
      );
    }

    resetAutoLoginCooldown();
    await saveSession({
      clientId: String(data.dhanClientId || clientId),
      accessToken: String(data.accessToken),
      expiryTime: data.expiryTime ? String(data.expiryTime) : undefined,
      name: data.dhanClientName ? String(data.dhanClientName) : undefined,
      authMethod: 'totp',
    });

    return NextResponse.json({
      ok: true,
      clientId: String(data.dhanClientId || clientId),
      name: data.dhanClientName || null,
      expiryTime: data.expiryTime || null,
      authMethod: 'totp',
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to contact DhanHQ auth service.' },
      { status: 500 }
    );
  }
}
