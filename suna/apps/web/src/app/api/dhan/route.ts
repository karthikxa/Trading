import { NextRequest, NextResponse } from 'next/server';
import { clearSession, getSession } from '@/lib/dhan/session';
import {
  autoLogin,
  getAutoLoginState,
  getCachedSession,
  setCachedSession,
} from '@/lib/dhan/autologin';

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
let callTimestamps: number[] = [];
const MAX_CALLS_PER_MINUTE = 180; // Dhan safe ceiling (under 250/min limit)
const MAX_DAILY_CALLS = 24500; // Daily quota safety ceiling (under Dhan's 25,000 limit)

let dailyCallCount = 0;
let dailyCallDate = new Date().toISOString().slice(0, 10);

function isQuotaSafe(): boolean {
  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);
  if (todayStr !== dailyCallDate) {
    dailyCallDate = todayStr;
    dailyCallCount = 0;
  }
  if (dailyCallCount >= MAX_DAILY_CALLS) {
    return false;
  }
  callTimestamps = callTimestamps.filter((t) => now - t < 60000);
  return callTimestamps.length < MAX_CALLS_PER_MINUTE;
}

function recordDhanCall(): void {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (todayStr !== dailyCallDate) {
    dailyCallDate = todayStr;
    dailyCallCount = 0;
  }
  dailyCallCount++;
  callTimestamps.push(Date.now());
}

// Micro-TTL per endpoint: balances 0ms speed with real-time freshness & quota protection
const CACHE_TTL_MS: Record<string, number> = {
  positions: 600,
  funds: 2500,
  fundlimit: 2500,
  orders: 1500,
  trades: 4000,
  all_trades: 180000,
  past_trades: 180000,
  holdings: 60000,
  profile: 300000,
};

const ACTION_ALLOWLIST = new Set([
  'funds',
  'fundlimit',
  'profile',
  'positions',
  'holdings',
  'orders',
  'trades',
  'all_trades',
  'past_trades',
]);

function buildDhanHeaders(clientId: string, accessToken: string) {
  return {
    'client-id': clientId,
    'access-token': accessToken,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const rawAction = searchParams.get('path') || searchParams.get('action') || 'funds';
    const action = rawAction === 'fundlimit' ? 'funds' : rawAction;
    if (!ACTION_ALLOWLIST.has(rawAction)) {
      return NextResponse.json({ ok: false, error: 'path not allowed' }, { status: 400 });
    }

    const forceFresh = searchParams.get('force') === 'true';

    const session = (await getSession()) ?? getCachedSession() ?? (await autoLogin());
    if (!session) {
      const autoState = getAutoLoginState();
      return NextResponse.json(
        {
          ok: false,
          error: 'not connected',
          status: 401,
          detail: autoState.lastError,
          retryInSeconds: autoState.cooldownSecondsLeft,
        },
        { status: 401 }
      );
    }

    const cacheKey = `${session.clientId}_${action}_${searchParams.get('from') || ''}_${searchParams.get('to') || ''}_${searchParams.get('page') || ''}`;
    const cached = serverDhanCache.get(cacheKey);
    const ttl = CACHE_TTL_MS[action] || 10000;

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

    if (inFlightRequests.has(cacheKey)) {
      const inFlight = await inFlightRequests.get(cacheKey)!;
      return NextResponse.json(
        {
          ok: inFlight.ok,
          action,
          status: inFlight.status,
          data: inFlight.data,
          summary: inFlight.summary,
          cached: true,
          latencyMs: Date.now() - startTime,
        },
        { status: inFlight.status === 401 ? 401 : 200 }
      );
    }

    const fetchPromise = (async () => {
      const headers = buildDhanHeaders(session.clientId, session.accessToken);
      let endpoint = `${DHAN_BASE_URL}/fundlimit`;

      if (action === 'profile') {
        endpoint = `${DHAN_BASE_URL}/profile`;
      } else if (action === 'positions') {
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

          try {
            const todayRes = await fetch(`${DHAN_BASE_URL}/trades`, { headers, cache: 'no-store' });
            if (todayRes.status === 401) {
              return { ok: false, status: 401, data: { errorCode: 'DH-901', errorMessage: 'Session expired' }, summary: undefined };
            }
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
              if (pageData.length < 10 || addedCount === 0) break;
            } catch {
              break;
            }
          }

          return {
            ok: true,
            status: 200,
            data: allExecutions,
            summary: undefined,
          };
        } else if (searchParams.get('from') || searchParams.get('fromDate') || page) {
          endpoint = `${DHAN_BASE_URL}/trades/${fromDate}/${toDate}/${page || '0'}`;
        } else {
          endpoint = `${DHAN_BASE_URL}/trades`;
        }
      }

      recordDhanCall();
      const res = await fetch(endpoint, { headers, cache: 'no-store' });
      const rawText = await res.text().catch(() => '');
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      // Auto-heal once if session token rejected upstream (no loop!)
      if (res.status === 401 || data?.errorCode === 'DH-901') {
        await clearSession(false);
        setCachedSession(null);
        return {
          ok: false,
          status: 401,
          data,
          summary: undefined,
        };
      }

      if (action === 'funds' && data && typeof data === 'object' && !Array.isArray(data)) {
        const cashVal = Number(data.availabelBalance || data.sodLimit || data.availableBalance || 0);
        if (cashVal > 0 && (data.availabelBalance === 0 || data.availabelBalance == null)) {
          data.availabelBalance = cashVal;
        }
      }

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
    let result: { data: any; summary?: any; status: number; ok: boolean };
    try {
      result = await fetchPromise;
    } finally {
      inFlightRequests.delete(cacheKey);
    }

    if (result.status === 401) {
      serverDhanCache.delete(cacheKey);
      return NextResponse.json(
        {
          ok: false,
          action,
          status: 401,
          data: result.data,
          error: 'DhanHQ session expired. Please reconnect.',
        },
        { status: 401 }
      );
    }

    if (result.ok) {
      serverDhanCache.set(cacheKey, {
        ...result,
        timestamp: Date.now(),
      });
    }

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

    const session = (await getSession()) ?? getCachedSession() ?? (await autoLogin());
    if (!session) {
      const autoState = getAutoLoginState();
      return NextResponse.json(
        {
          ok: false,
          error: 'not connected',
          status: 401,
          detail: autoState.lastError,
          retryInSeconds: autoState.cooldownSecondsLeft,
        },
        { status: 401 }
      );
    }

    const headers = buildDhanHeaders(session.clientId, session.accessToken);
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

    serverDhanCache.delete(`${session.clientId}_orders___`);
    serverDhanCache.delete(`${session.clientId}_positions___`);

    return NextResponse.json(
      {
        ok: res.ok,
        action,
        status: res.status,
        data,
      },
      { status: res.status === 401 ? 401 : 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to execute Dhan operation' },
      { status: 500 }
    );
  }
}
