import { NextRequest, NextResponse } from 'next/server';
import {
  clearSession,
  getDhanEnvCapabilities,
  getSession,
  isExplicitlyDisconnected,
} from '@/lib/dhan/session';
import { getDhanConnectionRecord, saveDhanDashboardSnapshot } from '@/lib/dhan/db';
import { getLastAutoLoginError, resetAutoLoginCooldown } from '@/lib/dhan/autologin';

export async function GET(req: NextRequest) {
  const includeSnapshot = req.nextUrl.searchParams.get('includeSnapshot') === '1';
  const [session, disconnected, dbRecord] = await Promise.all([
    getSession(),
    isExplicitlyDisconnected(),
    includeSnapshot ? getDhanConnectionRecord('trading') : Promise.resolve(null),
  ]);
  const caps = getDhanEnvCapabilities();

  const snapshot =
    includeSnapshot && dbRecord
      ? {
          funds: dbRecord.snapshot_funds,
          positions: dbRecord.snapshot_positions,
          summary: dbRecord.snapshot_summary,
          lastSyncedAt: dbRecord.last_synced_at,
          lastClientId: dbRecord.client_id,
        }
      : undefined;

  if (!session) {
    return NextResponse.json(
      {
        connected: false,
        disconnected,
        ...caps,
        lastAutoLoginError: getLastAutoLoginError(),
        ...(snapshot ? { snapshot } : {}),
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
      ...(snapshot ? { snapshot } : {}),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      funds?: unknown;
      positions?: unknown[];
      summary?: unknown;
    };
    await saveDhanDashboardSnapshot('trading', {
      funds: body.funds,
      positions: body.positions,
      summary: body.summary,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function DELETE() {
  await clearSession(true);
  resetAutoLoginCooldown();
  if (process.env.DHAN_ACCESS_TOKEN) {
    delete process.env.DHAN_ACCESS_TOKEN;
  }
  return NextResponse.json({ ok: true, connected: false });
}
