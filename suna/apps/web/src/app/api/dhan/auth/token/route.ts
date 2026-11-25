import { NextRequest, NextResponse } from 'next/server';
import { saveSession } from '@/lib/dhan/session';
import { resetAutoLoginCooldown } from '@/lib/dhan/autologin';

/**
 * Verifies a pasted 24h Dhan Web access token directly against /v2/profile
 * before sealing it in the server-side httpOnly session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? '').trim();
    const clientIdInput = String(body?.clientId ?? '').trim();

    if (!token || token.length < 30 || token.includes('KMJLAiT4SSPZ7AW')) {
      return NextResponse.json(
        { ok: false, error: 'Please provide a valid DhanHQ access token.' },
        { status: 400 }
      );
    }

    const verifyHeaders: Record<string, string> = {
      'access-token': token,
      Accept: 'application/json',
    };
    if (clientIdInput) {
      verifyHeaders['client-id'] = clientIdInput;
    }

    const profileRes = await fetch('https://api.dhan.co/v2/profile', {
      method: 'GET',
      headers: verifyHeaders,
      cache: 'no-store',
    });
    const profile = await profileRes.json().catch(() => ({}));

    if (!profileRes.ok || profile?.errorCode || !profile?.dhanClientId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            profile?.errorMessage ||
            profile?.message ||
            'DhanHQ rejected this token (expired or invalid).',
        },
        { status: 401 }
      );
    }

    resetAutoLoginCooldown();
    await saveSession({
      clientId: String(profile.dhanClientId || clientIdInput),
      accessToken: token,
      expiryTime: profile.tokenValidity ? String(profile.tokenValidity) : undefined,
      name: profile.dhanClientName ? String(profile.dhanClientName) : undefined,
      authMethod: 'manual',
    });

    return NextResponse.json({
      ok: true,
      clientId: String(profile.dhanClientId),
      name: profile.dhanClientName || null,
      expiryTime: profile.tokenValidity || null,
      authMethod: 'manual',
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to verify Dhan token.' },
      { status: 500 }
    );
  }
}
