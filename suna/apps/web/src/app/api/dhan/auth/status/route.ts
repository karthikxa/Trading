import { NextResponse } from 'next/server';
import {
  clearSession,
  getDhanEnvCapabilities,
  getSession,
  isExplicitlyDisconnected,
} from '@/lib/dhan/session';
import { getLastAutoLoginError, resetAutoLoginCooldown } from '@/lib/dhan/autologin';

export async function GET() {
  const [session, disconnected] = await Promise.all([
    getSession(),
    isExplicitlyDisconnected(),
  ]);
  const caps = getDhanEnvCapabilities();

  if (!session) {
    return NextResponse.json(
      {
        connected: false,
        disconnected,
        ...caps,
        lastAutoLoginError: getLastAutoLoginError(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      connected: true,
      clientId: session.clientId,
      name: session.name || null,
      expiryTime: session.expiryTime || null,
      authMethod: session.authMethod || 'totp',
      connectedAt: session.connectedAt || null,
      disconnected: false,
      ...caps,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function DELETE() {
  await clearSession(true);
  resetAutoLoginCooldown();
  if (process.env.DHAN_ACCESS_TOKEN) {
    delete process.env.DHAN_ACCESS_TOKEN;
  }
  return NextResponse.json({ ok: true, connected: false });
}
