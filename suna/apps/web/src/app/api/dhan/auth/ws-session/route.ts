import { NextResponse } from 'next/server';
import { getSession } from '@/lib/dhan/session';
import { getCachedSession, autoLogin } from '@/lib/dhan/autologin';

/**
 * Endpoint for frontend WebSocket managers to acquire active credentials
 * (clientId + accessToken) without exposing cookies to third-party scripts.
 */
export async function GET() {
  try {
    let session = (await getSession()) ?? getCachedSession();
    if (!session?.accessToken) {
      session = await autoLogin();
    }

    if (!session?.accessToken || !session?.clientId) {
      return NextResponse.json(
        { ok: false, error: 'Not authenticated with DhanHQ' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      clientId: session.clientId,
      token: session.accessToken,
      expiryTime: session.expiryTime || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to retrieve WebSocket session' },
      { status: 500 }
    );
  }
}
