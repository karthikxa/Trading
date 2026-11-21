import { NextRequest, NextResponse } from 'next/server';

const DHAN_BASE_URL = 'https://api.dhan.co/v2';

function getDhanHeaders(clientId?: string, token?: string) {
  const activeClientId = clientId || process.env.DHAN_CLIENT_ID || '1114824544';
  const activeToken =
    token ||
    process.env.DHAN_ACCESS_TOKEN ||
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJ1c2VyUmVnaW9uIjoiUjEiLCJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzk1MzM5ODI3LCJpYXQiOjE3OTUyNTM0MjcsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTE0ODI0NTQ0In0.KMJLAiT4SSPZ7AW-2s_a29jiPp7J9KxCQUAjdJjzjZuCFeg-KRuEFc22ulqXkthSyRldvM3awdUzbGSMCN2QAA';

  return {
    'client-id': activeClientId,
    'access-token': activeToken,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'funds';

    const headers = getDhanHeaders();

    let endpoint = `${DHAN_BASE_URL}/fundlimit`;
    if (action === 'positions') {
      endpoint = `${DHAN_BASE_URL}/positions`;
    } else if (action === 'holdings') {
      endpoint = `${DHAN_BASE_URL}/holdings`;
    } else if (action === 'orders') {
      endpoint = `${DHAN_BASE_URL}/orders`;
    } else if (action === 'trades') {
      endpoint = `${DHAN_BASE_URL}/trades`;
    } else if (action === 'profile') {
      endpoint = `${DHAN_BASE_URL}/profile`;
    }

    const res = await fetch(endpoint, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));

    return NextResponse.json({
      ok: res.ok,
      action,
      status: res.status,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to fetch Dhan data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'orders';
    const body = await req.json().catch(() => ({}));

    const headers = getDhanHeaders();

    let endpoint = `${DHAN_BASE_URL}/orders`;
    if (action === 'kill_switch') {
      endpoint = `${DHAN_BASE_URL}/tradercontrols/killswitch`;
    } else if (action === 'cancel_order') {
      const orderId = body.orderId || searchParams.get('orderId');
      endpoint = `${DHAN_BASE_URL}/orders/${orderId}`;
    }

    const res = await fetch(endpoint, {
      method: action === 'cancel_order' ? 'DELETE' : 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    return NextResponse.json({
      ok: res.ok,
      action,
      status: res.status,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to execute Dhan operation' },
      { status: 500 }
    );
  }
}
