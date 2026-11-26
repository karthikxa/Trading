import { NextRequest, NextResponse } from 'next/server';
import { CONSENT_COOKIE, saveSession } from '@/lib/dhan/session';
import { resetAutoLoginCooldown, setCachedSession } from '@/lib/dhan/autologin';

const RETURN_TO_COOKIE = 'dhan_return_to';

function getPublicOrigin(req: NextRequest): string {
  const fwdHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = fwdHost || req.headers.get('host') || 'localhost:3000';
  const fwdProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const proto = isLocal ? 'http' : (fwdProto || 'https');
  return `${proto}://${host}`;
}

function getSafeReturnTo(raw?: string): string {
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
  const tokenId = req.nextUrl.searchParams.get('tokenId')?.trim();
  const rawReturnTo = req.cookies.get(RETURN_TO_COOKIE)?.value;
  const isPopup = rawReturnTo === '__popup_close__';
  const returnTo = getSafeReturnTo(isPopup ? undefined : rawReturnTo);

  const errorRedirect = (reason: string) => {
    const res = NextResponse.redirect(`${origin}${withQueryParam(returnTo, 'dhan', reason)}`);
    res.cookies.delete({ name: CONSENT_COOKIE, path: '/api/dhan/auth' });
    res.cookies.delete({ name: RETURN_TO_COOKIE, path: '/api/dhan/auth' });
    return res;
  };

  if (!tokenId) {
    return errorRedirect('error');
  }

  const appId = process.env.DHAN_APP_ID?.trim() || 'eb34eed3';
  const appSecret = process.env.DHAN_APP_SECRET?.trim() || '592b81bb-0819-4982-be86-ac7b5983bdfe';
  if (!appId || !appSecret) {
    return errorRedirect('missing_app_config');
  }

  const consumeUrl = `https://auth.dhan.co/app/consumeApp-consent?tokenId=${encodeURIComponent(tokenId)}`;
  const headers = {
    app_id: appId,
    app_secret: appSecret,
    Accept: 'application/json',
  };

  try {
    let res = await fetch(consumeUrl, { method: 'GET', headers, cache: 'no-store' });
    if (res.status === 405) {
      res = await fetch(consumeUrl, { method: 'POST', headers, cache: 'no-store' });
    }

    const rawText = await res.text().catch(() => '');
    let data: any = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = {};
    }

    if (!res.ok || !data?.accessToken) {
      console.error('[Dhan Callback] consumeApp-consent failed:', res.status, rawText.slice(0, 300));
      return errorRedirect('error');
    }

    const session = {
      clientId: String(data.dhanClientId),
      accessToken: String(data.accessToken),
      expiryTime: data.expiryTime ? String(data.expiryTime) : undefined,
      name: data.dhanClientName ? String(data.dhanClientName) : undefined,
      authMethod: 'consent' as const,
    };

    await saveSession(session);
    setCachedSession(session);
    resetAutoLoginCooldown();

    if (isPopup) {
      const htmlRes = new NextResponse(
        `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#09090b;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><p style="font-size:15px;font-weight:600;color:#34d399">DhanHQ Connected!</p><p style="font-size:12px;color:#a1a1aa">Closing window...</p></div><script>try{window.opener&&window.opener.postMessage({type:'dhan-connected'},'*');}catch{}setTimeout(function(){window.close();},150);</script></body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
      htmlRes.cookies.delete({ name: CONSENT_COOKIE, path: '/api/dhan/auth' });
      htmlRes.cookies.delete({ name: RETURN_TO_COOKIE, path: '/api/dhan/auth' });
      return htmlRes;
    }

    const okRedirect = NextResponse.redirect(`${origin}${withQueryParam(returnTo, 'dhan', 'connected')}`);
    okRedirect.cookies.delete({ name: CONSENT_COOKIE, path: '/api/dhan/auth' });
    okRedirect.cookies.delete({ name: RETURN_TO_COOKIE, path: '/api/dhan/auth' });
    return okRedirect;
  } catch (err) {
    console.error('[Dhan Callback] Exception:', err);
    return errorRedirect('error');
  }
}
