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
    } else if (action === 'trades' || action === 'all_trades' || action === 'past_trades') {
      const fromDate = searchParams.get('from') || searchParams.get('fromDate') || '2026-01-01';
      const toDate = searchParams.get('to') || searchParams.get('toDate') || new Date().toISOString().split('T')[0];
      const page = searchParams.get('page');

      if (action === 'all_trades' || action === 'past_trades') {
        // Automatically fetch all pages and today's trades
        const allExecutions: any[] = [];
        const seen = new Set<string>();

        // 1. Fetch today's trades
        try {
          const todayRes = await fetch(`${DHAN_BASE_URL}/trades`, { headers, cache: 'no-store' });
          const todayData = await todayRes.json().catch(() => []);
          if (Array.isArray(todayData)) {
            for (const t of todayData) {
              const key = `${t.orderId}_${t.exchangeTradeId}_${t.exchangeTime}`;
              if (!seen.has(key)) {
                seen.add(key);
                allExecutions.push(t);
              }
            }
          }
        } catch {}

        // 2. Fetch past trade pages
        for (let p = 0; p < 20; p++) {
          try {
            const pageRes = await fetch(`${DHAN_BASE_URL}/trades/${fromDate}/${toDate}/${p}`, {
              headers,
              cache: 'no-store',
            });
            const pageData = await pageRes.json().catch(() => []);
            if (!Array.isArray(pageData) || pageData.length === 0) break;

            let addedCount = 0;
            for (const t of pageData) {
              const key = `${t.orderId}_${t.exchangeTradeId}_${t.exchangeTime}`;
              if (!seen.has(key)) {
                seen.add(key);
                allExecutions.push(t);
                addedCount++;
              }
            }
            if (addedCount === 0) break;
          } catch {
            break;
          }
        }

        return NextResponse.json({
          ok: true,
          action,
          status: 200,
          data: allExecutions,
        });
      }

      if (page !== null) {
        endpoint = `${DHAN_BASE_URL}/trades/${fromDate}/${toDate}/${page}`;
      } else {
        endpoint = `${DHAN_BASE_URL}/trades`;
      }
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
