import { NextRequest, NextResponse } from 'next/server';
import { refreshDhanAccessToken } from '@/features/markets/dhanAutoAuth';

const DHAN_BASE_URL = 'https://api.dhan.co/v2';

// ── In-Memory Smart Cache & Quota Guard ──────────────────────────────────────
interface CacheEntry {
  data: any;
  summary?: any;
  status: number;
  ok: boolean;
  timestamp: number;
}

const serverDhanCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<{ data: any; summary?: any; status: number; ok: boolean }>>();

// Sliding window rate-limit tracker to protect daily Dhan API quota
// Dhan allows up to 10 requests per second across REST endpoints.
// 1 call/sec per endpoint is ~60-120 req/min, safely under Dhan's 250 req/min threshold.
let callTimestamps: number[] = [];
const MAX_CALLS_PER_MINUTE = 150; // Dhan safe ceiling (under 250/min limit)

function isQuotaSafe(): boolean {
  const now = Date.now();
  callTimestamps = callTimestamps.filter((t) => now - t < 60000);
  return callTimestamps.length < MAX_CALLS_PER_MINUTE;
}

function recordDhanCall(): void {
  callTimestamps.push(Date.now());
}

// Micro-TTL per endpoint: balances 0ms speed with real-time freshness & quota protection
const CACHE_TTL_MS: Record<string, number> = {
  positions: 900,     // 900ms micro-TTL for live PnL & open positions (allows fast 1s polling with fresh upstream ticks)
  funds: 3000,        // 3s for cash / margin
  orders: 2000,       // 2s for active orders
  trades: 5000,       // 5s for today's trades
  all_trades: 180000, // 3 min for historical execution audit
  holdings: 60000,    // 1 min for equity holdings
  profile: 300000,    // 5 min for user profile
};

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
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'funds';
    const forceFresh = searchParams.get('force') === 'true';

    const cacheKey = `${action}_${searchParams.get('from') || ''}_${searchParams.get('to') || ''}_${searchParams.get('page') || ''}`;
    const cached = serverDhanCache.get(cacheKey);
    const ttl = CACHE_TTL_MS[action] || 10000;

    // 0ms Cache Hit: If fresh or if quota is under pressure, return instantaneously
    if (cached && !forceFresh && (Date.now() - cached.timestamp < ttl || !isQuotaSafe())) {
      return NextResponse.json(
        {
          ok: cached.ok,
          action,
          status: cached.status,
          data: cached.data,
          summary: cached.summary,
          cached: true,
          latencyMs: Date.now() - startTime,
          quotaRemaining: Math.max(0, MAX_CALLS_PER_MINUTE - callTimestamps.length),
        },
        {
          headers: {
            'X-Dhan-Cache': 'HIT',
            'X-Dhan-Latency': `${Date.now() - startTime}ms`,
          },
        }
      );
    }

    // Single-flight in-flight deduplication: concurrent requests await the identical outbound fetch
    if (inFlightRequests.has(cacheKey)) {
      const inFlight = await inFlightRequests.get(cacheKey)!;
      return NextResponse.json({
        ok: inFlight.ok,
        action,
        status: inFlight.status,
        data: inFlight.data,
        summary: inFlight.summary,
        cached: true,
        latencyMs: Date.now() - startTime,
      });
    }

    const fetchPromise = (async () => {
      const clientToken = req.headers.get('x-dhan-access-token') || searchParams.get('token');
      const clientDhanId = req.headers.get('x-dhan-client-id') || searchParams.get('clientId');
      const headers = getDhanHeaders(clientDhanId || undefined, clientToken || undefined);
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
          recordDhanCall();
          const allExecutions: any[] = [];
          const seen = new Set<string>();

          // 1. Fetch today's trades (single fast request)
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

          // 2. Fetch past trade pages up to 5 pages max to protect API quota
          for (let p = 0; p < 5; p++) {
            if (!isQuotaSafe()) break;
            try {
              recordDhanCall();
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
              if (addedCount === 0 || pageData.length < 50) break;
            } catch {
              break;
            }
          }

          return {
            ok: true,
            status: 200,
            data: allExecutions,
          };
        }

        endpoint = page !== null ? `${DHAN_BASE_URL}/trades/${fromDate}/${toDate}/${page}` : `${DHAN_BASE_URL}/trades`;
      } else if (action === 'profile') {
        endpoint = `${DHAN_BASE_URL}/profile`;
      }

      recordDhanCall();
      let res = await fetch(endpoint, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      let data = await res.json().catch(() => ({}));

      // If token expired (401 or DH-901), attempt automatic renewal via TOTP
      if (!res.ok && (res.status === 401 || data?.errorCode === 'DH-901')) {
        const renewed = await refreshDhanAccessToken();
        if (renewed.ok && renewed.accessToken) {
          headers['access-token'] = renewed.accessToken;
          res = await fetch(endpoint, {
            method: 'GET',
            headers,
            cache: 'no-store',
          });
          data = await res.json().catch(() => ({}));
        }
      }

      // Compute rich live summary for positions
      let summary: any = undefined;
      if (action === 'positions' && Array.isArray(data)) {
        const realizedProfit = Number(
          data.reduce((acc, p) => acc + (Number(p.realizedProfit) || 0), 0).toFixed(2)
        );
        const unrealizedProfit = Number(
          data.reduce((acc, p) => acc + (Number(p.unrealizedProfit) || 0), 0).toFixed(2)
        );
        const totalDayPnl = Number((realizedProfit + unrealizedProfit).toFixed(2));
        const openPositionsCount = data.filter((p) => Number(p.netQty || 0) !== 0).length;

        summary = {
          realizedProfit,
          unrealizedProfit,
          totalDayPnl,
          positionsCount: data.length,
          openPositionsCount,
          lastUpdated: new Date().toISOString(),
        };
      }

      return {
        ok: res.ok,
        status: res.status,
        data,
        summary,
      };
    })();

    inFlightRequests.set(cacheKey, fetchPromise);
    const result = await fetchPromise;
    inFlightRequests.delete(cacheKey);

    // Save to smart cache
    serverDhanCache.set(cacheKey, {
      ...result,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      ok: result.ok,
      action,
      status: result.status,
      data: result.data,
      summary: result.summary,
      cached: false,
      latencyMs: Date.now() - startTime,
      quotaRemaining: Math.max(0, MAX_CALLS_PER_MINUTE - callTimestamps.length),
    });
  } catch (err: any) {
    // Graceful fallback to stale cache if network/API throws
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'funds';
    const cacheKey = `${action}_${searchParams.get('from') || ''}_${searchParams.get('to') || ''}_${searchParams.get('page') || ''}`;
    const fallback = serverDhanCache.get(cacheKey);

    if (fallback) {
      return NextResponse.json({
        ok: fallback.ok,
        action,
        status: fallback.status,
        data: fallback.data,
        summary: fallback.summary,
        cached: true,
        staleFallback: true,
        latencyMs: Date.now() - startTime,
      });
    }

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

    if (action === 'auto_auth') {
      const pin = body.pin || req.headers.get('x-dhan-pin') || undefined;
      const totpSecret = body.totpSecret || req.headers.get('x-dhan-totp-secret') || undefined;
      const clientId = body.clientId || req.headers.get('x-dhan-client-id') || undefined;
      const result = await refreshDhanAccessToken({ clientId, pin, totpSecret });
      return NextResponse.json(result);
    }

    const headers = getDhanHeaders();

    let endpoint = `${DHAN_BASE_URL}/orders`;
    if (action === 'kill_switch') {
      endpoint = `${DHAN_BASE_URL}/tradercontrols/killswitch`;
    } else if (action === 'cancel_order') {
      const orderId = body.orderId || searchParams.get('orderId');
      endpoint = `${DHAN_BASE_URL}/orders/${orderId}`;
    }

    recordDhanCall();
    const res = await fetch(endpoint, {
      method: action === 'cancel_order' ? 'DELETE' : 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    // Invalidate orders and positions cache so subsequent reads pick up fresh data immediately
    serverDhanCache.delete('orders___');
    serverDhanCache.delete('positions___');

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
