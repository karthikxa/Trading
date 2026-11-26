import { NextRequest, NextResponse } from 'next/server';
import { CONSENT_COOKIE } from '@/lib/dhan/session';

export const RETURN_TO_COOKIE = 'dhan_return_to';

function getPublicOrigin(req: NextRequest): string {
  const fwdHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = fwdHost || req.headers.get('host') || 'localhost:3000';
  const fwdProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const proto = isLocal ? 'http' : (fwdProto || 'https');
  return `${proto}://${host}`;
}

function getSafeReturnTo(raw: string | null): string {
  const fallback = '/projects/trading/admin/connectors';
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return fallback;
  }
  return raw;
}

function withQueryParam(path: string, key: string, value: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

export async function GET(req: NextRequest) {
  const origin = getPublicOrigin(req);
  const isPopup = req.nextUrl.searchParams.get('popup') === '1';
  const returnTo = isPopup
    ? '__popup_close__'
    : getSafeReturnTo(req.nextUrl.searchParams.get('returnTo'));
  const formatJson = req.nextUrl.searchParams.get('format') === 'json';

  const appId = process.env.DHAN_APP_ID?.trim() || 'eb34eed3';
  const appSecret = process.env.DHAN_APP_SECRET?.trim() || '592b81bb-0819-4982-be86-ac7b5983bdfe';
  if (!appId || !appSecret) {
    if (formatJson) {
      return NextResponse.json(
        { error: 'DHAN_APP_ID and DHAN_APP_SECRET are not configured' },
        { status: 400 }
      );
    }
    return NextResponse.redirect(`${origin}${withQueryParam(getSafeReturnTo(null), 'dhan', 'missing_app_config')}`);
  }

  const clientId =
    req.nextUrl.searchParams.get('clientId')?.trim() ||
    process.env.DHAN_CLIENT_ID?.trim() ||
    '1114824544';

  if (!clientId) {
    if (formatJson) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }
    return NextResponse.redirect(`${origin}${withQueryParam(returnTo, 'dhan', 'missing_client_id')}`);
  }

  try {
    const res = await fetch(
      `https://auth.dhan.co/app/generate-consent?client_id=${encodeURIComponent(clientId)}`,
      {
        method: 'POST',
        headers: {
          app_id: appId,
          app_secret: appSecret,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.consentAppId) {
      if (formatJson) {
        return NextResponse.json({ error: 'consent failed', detail: data }, { status: 502 });
      }
      return NextResponse.redirect(`${origin}${withQueryParam(returnTo, 'dhan', 'consent_failed')}`);
    }

    const response = NextResponse.redirect(
      `https://auth.dhan.co/login/consentApp-login?consentAppId=${encodeURIComponent(data.consentAppId)}`
    );

    response.cookies.set(CONSENT_COOKIE, String(data.consentAppId), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 600,
      path: '/api/dhan/auth',
      secure: origin.startsWith('https://'),
    });
    response.cookies.set(RETURN_TO_COOKIE, returnTo, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 600,
      path: '/api/dhan/auth',
      secure: origin.startsWith('https://'),
    });
    return response;
  } catch {
    if (formatJson) {
      return NextResponse.json({ error: 'Failed to reach auth.dhan.co' }, { status: 502 });
    }
    return NextResponse.redirect(`${origin}${withQueryParam(returnTo, 'dhan', 'error')}`);
  }
}
