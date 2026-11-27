'use client';

/**
 * DhanHQ Live Store & Quota Guard
 * 
 * Guarantees 0ms perceived latency via Frame-0 localStorage hydration (SWR)
 * and guards daily Dhan API quota with visibility-aware smart background sync.
 */

import { dhanMarketFeed, MarketTick } from './dhanMarketFeedWs';
import { dhanOrderUpdates } from '@/features/trading/dhanOrderUpdateWs';
import { applyDhanOrderAlert } from '@/features/trading/dhanOrdersSync';

export interface DhanPositionsSummary {
  realizedProfit: number;
  unrealizedProfit: number;
  totalDayPnl: number;
  positionsCount: number;
  openPositionsCount: number;
  lastUpdated: string;
}

export interface DhanLiveSnapshot {
  funds: {
    dhanClientId?: string;
    availabelBalance?: number;
    utilizedAmount?: number;
    withdrawableBalance?: number;
    sodLimit?: number;
    collateralAmount?: number;
  } | null;
  positions: any[];
  summary: DhanPositionsSummary;
  lastSyncTimestamp: number;
  isLive: boolean;
  isTokenExpired?: boolean;
}

const STORAGE_KEY = 'kortix_dhan_live_cache_v2';
const HIGH_FREQ_TICK_MS = 50; // 50ms ultra-high-frequency (20 updates/sec) reactive tick loop

// Indian Standard Time (IST) Market Hours Check (9:15 AM to 3:30 PM, Monday - Friday)
export function getIstMarketState(): {
  isMarketHours: boolean;
  isWeekday: boolean;
  timeStr: string;
  hour: number;
  minute: number;
} {
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
  });
  const parts = istFormatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);
  const weekday = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
  const isWeekday = weekday !== 'Sat' && weekday !== 'Sun';

  const totalMinutes = hour * 60 + minute;
  // NSE/BSE Equity & Derivatives Active Window: 9:14 AM (554m) to 3:31 PM (931m)
  const isMarketHours = isWeekday && totalMinutes >= (9 * 60 + 14) && totalMinutes <= (15 * 60 + 31);

  return {
    isMarketHours,
    isWeekday,
    timeStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    hour,
    minute,
  };
}

// Adaptive polling interval based on market session & scheduled milestones:
// - 9:14 AM to 3:31 PM (Live Market): 700ms (ultra-fast sub-second live polling)
// - Off-market: 60s idle (with automatic trigger at 12:00 AM midnight and 8:00 AM morning)
export function getAdaptiveSyncInterval(): number {
  const { isMarketHours } = getIstMarketState();
  if (isMarketHours) {
    return 700; // 700ms ultra-fast live polling during market hours (9:14 AM - 3:31 PM IST)
  }
  return 60000; // 60s idle sleep outside market hours
}

function getInitialSnapshot(): DhanLiveSnapshot {
  if (typeof window === 'undefined') {
    return {
      funds: null,
      positions: [],
      summary: {
        realizedProfit: 0,
        unrealizedProfit: 0,
        totalDayPnl: 0,
        positionsCount: 0,
        openPositionsCount: 0,
        lastUpdated: new Date().toISOString(),
      },
      lastSyncTimestamp: 0,
      isLive: false,
    };
  }

  try {
    // Purge legacy client-stored token keys now that auth lives strictly in httpOnly cookie
    window.localStorage.removeItem('kortix_dhan_access_token');
    window.localStorage.removeItem('kortix_dhan_client_id');

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.funds?.dhanClientId) {
        return {
          funds: parsed.funds || null,
          positions: Array.isArray(parsed.positions) ? parsed.positions : [],
          summary: parsed.summary || {
            realizedProfit: 0,
            unrealizedProfit: 0,
            totalDayPnl: 0,
            positionsCount: 0,
            openPositionsCount: 0,
            lastUpdated: new Date().toISOString(),
          },
          lastSyncTimestamp: parsed.lastSyncTimestamp || 0,
          isLive: Boolean(parsed.isLive),
        };
      }
    }
  } catch {}

  return {
    funds: null,
    positions: [],
    summary: {
      realizedProfit: 0,
      unrealizedProfit: 0,
      totalDayPnl: 0,
      positionsCount: 0,
      openPositionsCount: 0,
      lastUpdated: new Date().toISOString(),
    },
    lastSyncTimestamp: 0,
    isLive: false,
  };
}

let currentSnapshot: DhanLiveSnapshot = getInitialSnapshot();
const subscribers = new Set<(snapshot: DhanLiveSnapshot) => void>();
let syncTimer: any = null;
let tickTimer: any = null;
let isFetching = false;

export function getDhanLiveSnapshot(): DhanLiveSnapshot {
  return currentSnapshot;
}

export function subscribeDhanLive(callback: (snapshot: DhanLiveSnapshot) => void): () => void {
  subscribers.add(callback);
  // Send current state on 0ms
  callback(currentSnapshot);

  if (subscribers.size === 1) {
    startLiveSync();
  }

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      stopLiveSync();
    }
  };
}

async function performSync(force = false) {
  if (typeof window === 'undefined') return;
  // Guard daily quota: strictly skip polling if tab is in the background or minimized
  if (!force && document.visibilityState !== 'visible') {
    return;
  }

  if (isFetching) return;
  isFetching = true;

  try {
    const [fundsRes, posRes] = await Promise.all([
      fetch(`/api/dhan?action=funds${force ? '&force=true' : ''}`, { credentials: 'same-origin' }).then((r) => r.json()).catch(() => null),
      fetch(`/api/dhan?action=positions${force ? '&force=true' : ''}`, { credentials: 'same-origin' }).then((r) => r.json()).catch(() => null),
    ]);

    const isTokenExpired = Boolean(
      fundsRes?.status === 401 ||
      posRes?.status === 401 ||
      fundsRes?.data?.errorCode === 'DH-901' ||
      posRes?.data?.errorCode === 'DH-901'
    );

    if (isTokenExpired) {
      // Preserve previous dashboard values while marking live feed as disconnected
      currentSnapshot = {
        ...currentSnapshot,
        lastSyncTimestamp: Date.now(),
        isLive: false,
        isTokenExpired: true,
      };
      try {
        dhanMarketFeed.disconnect();
        dhanOrderUpdates.disconnect();
      } catch {}
      // If we don't have cached values in memory yet, hydrate last saved snapshot from Supabase
      if (!currentSnapshot.funds) {
        fetch('/api/dhan/auth/status?includeSnapshot=1', { cache: 'no-store' })
          .then((r) => r.json())
          .then((statusData) => {
            if (statusData?.snapshot?.funds && !currentSnapshot.funds) {
              currentSnapshot = {
                ...currentSnapshot,
                funds: statusData.snapshot.funds,
                positions: Array.isArray(statusData.snapshot.positions)
                  ? statusData.snapshot.positions
                  : currentSnapshot.positions,
                summary: statusData.snapshot.summary || currentSnapshot.summary,
              };
              try {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSnapshot));
                window.localStorage.setItem('kortix_trading_dhan_funds', JSON.stringify(currentSnapshot.funds));
                window.localStorage.setItem('kortix_trading_dhan_positions', JSON.stringify(currentSnapshot.positions));
              } catch {}
              subscribers.forEach((cb) => cb(currentSnapshot));
              window.dispatchEvent(new CustomEvent('trading-dhan-live-updated', { detail: currentSnapshot }));
            }
          })
          .catch(() => {});
      }
      subscribers.forEach((cb) => cb(currentSnapshot));
      window.dispatchEvent(new CustomEvent('trading-dhan-live-updated', { detail: currentSnapshot }));
      return;
    }

    let changed = false;
    const nextFunds = fundsRes?.data?.availabelBalance != null ? fundsRes.data : currentSnapshot.funds;
    const nextPositions = Array.isArray(posRes?.data) ? posRes.data : currentSnapshot.positions;

    let nextSummary: DhanPositionsSummary = currentSnapshot.summary;
    if (posRes?.summary) {
      nextSummary = posRes.summary;
    } else if (Array.isArray(nextPositions)) {
      const realizedProfit = Number(
        nextPositions.reduce((acc, pos) => acc + (Number(pos.realizedProfit) || 0), 0).toFixed(2)
      );
      const unrealizedProfit = Number(
        nextPositions.reduce((acc, pos) => acc + (Number(pos.unrealizedProfit) || 0), 0).toFixed(2)
      );
      nextSummary = {
        realizedProfit,
        unrealizedProfit,
        totalDayPnl: Number((realizedProfit + unrealizedProfit).toFixed(2)),
        positionsCount: nextPositions.length,
        openPositionsCount: nextPositions.filter((pos) => Number(pos.netQty || 0) !== 0).length,
        lastUpdated: new Date().toISOString(),
      };
    }

    if (Array.isArray(nextPositions) && nextPositions.length > 0) {
      const subscriptions = nextPositions
        .filter((pos) => pos.securityId)
        .map((pos) => ({
          ExchangeSegment: pos.exchangeSegment || 'NSE_EQ',
          SecurityId: String(pos.securityId),
        }));
      if (subscriptions.length > 0) {
        dhanMarketFeed.subscribe(subscriptions, 15);
      }
    }

    if (
      JSON.stringify(nextFunds) !== JSON.stringify(currentSnapshot.funds) ||
      JSON.stringify(nextPositions) !== JSON.stringify(currentSnapshot.positions) ||
      JSON.stringify(nextSummary) !== JSON.stringify(currentSnapshot.summary)
    ) {
      changed = true;
    }

    if (changed || !currentSnapshot.isLive || isTokenExpired !== currentSnapshot.isTokenExpired) {
      currentSnapshot = {
        funds: nextFunds,
        positions: nextPositions,
        summary: nextSummary,
        lastSyncTimestamp: Date.now(),
        isLive: !isTokenExpired,
        isTokenExpired,
      };

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSnapshot));
        window.localStorage.setItem('kortix_trading_dhan_funds', JSON.stringify(nextFunds));
        window.localStorage.setItem('kortix_trading_dhan_positions', JSON.stringify(nextPositions));
      } catch {}

      subscribers.forEach((cb) => cb(currentSnapshot));

      // Broadcast window event for any non-React listeners
      window.dispatchEvent(
        new CustomEvent('trading-dhan-live-updated', { detail: currentSnapshot })
      );
    }
  } catch (err) {
    console.warn('Dhan live background sync paused:', err);
  } finally {
    isFetching = false;
  }
}

const FULL_RECONCILE_INTERVAL_MS = 30 * 60 * 1000; // Every 30 minutes (48x/24h = ~192 API calls/day, well within Dhan quota)
let lastFullReconcileAt = 0;

function scheduleNextSync() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  const { isMarketHours } = getIstMarketState();
  const now = Date.now();

  // Automatic full reconciliation every 30 minutes (24/7 while connected, safe for quota & account)
  if (now - lastFullReconcileAt >= FULL_RECONCILE_INTERVAL_MS) {
    lastFullReconcileAt = now;
    performSync(true); // Force 1 full API sync for all dashboard metrics
    try {
      if (typeof window !== 'undefined') {
        import('@/features/journal/dhanSync').then((m) => m.syncDhanTradesToJournal(undefined, true)).catch(() => {});
        import('@/features/trading/dhanOrdersSync').then((m) => m.syncDhanOrders(true)).catch(() => {});
      }
    } catch {}
  }

  // Live market hours (9:14 AM - 3:31 PM): 700ms (server micro-TTL + quota guard protects Dhan API)
  // Outside market hours: 60s idle sleep
  const intervalMs = isMarketHours ? 700 : 60000;

  syncTimer = setTimeout(async () => {
    await performSync();
    scheduleNextSync();
  }, intervalMs);
}

function handleLiveMarketTick(tick: MarketTick) {
  if (!currentSnapshot.positions || currentSnapshot.positions.length === 0) return;
  let changed = false;

  const updatedPositions = currentSnapshot.positions.map((pos) => {
    if (String(pos.securityId) === String(tick.securityId)) {
      changed = true;
      const netQty = Number(pos.netQty || 0);
      const buyAvg = Number(pos.buyAvg || pos.costPrice || 0);
      const sellAvg = Number(pos.sellAvg || 0);
      const ltp = tick.ltp;

      let unrealized = Number(pos.unrealizedProfit || 0);
      if (netQty > 0 && buyAvg > 0) {
        unrealized = Number(((ltp - buyAvg) * netQty).toFixed(2));
      } else if (netQty < 0 && sellAvg > 0) {
        unrealized = Number(((sellAvg - ltp) * Math.abs(netQty)).toFixed(2));
      }

      return {
        ...pos,
        lastTradedPrice: ltp,
        unrealizedProfit: unrealized,
      };
    }
    return pos;
  });

  if (changed) {
    const realizedProfit = Number(
      updatedPositions.reduce((acc, pos) => acc + (Number(pos.realizedProfit) || 0), 0).toFixed(2)
    );
    const unrealizedProfit = Number(
      updatedPositions.reduce((acc, pos) => acc + (Number(pos.unrealizedProfit) || 0), 0).toFixed(2)
    );
    currentSnapshot = {
      ...currentSnapshot,
      positions: updatedPositions,
      summary: {
        ...currentSnapshot.summary,
        realizedProfit,
        unrealizedProfit,
        totalDayPnl: Number((realizedProfit + unrealizedProfit).toFixed(2)),
        lastUpdated: new Date().toISOString(),
      },
      lastSyncTimestamp: Date.now(),
      isLive: true,
    };
    subscribers.forEach((cb) => cb(currentSnapshot));
  }
}

function startLiveSync() {
  if (typeof window === 'undefined') return;
  if (syncTimer || tickTimer) return;

  // Initialize official DhanHQ WebSockets (Market Feed + Order Updates)
  try {
    dhanMarketFeed.connect().catch(() => {});
    dhanOrderUpdates.connect().catch(() => {});
    dhanOrderUpdates.onOrderAlert((alert) => {
      applyDhanOrderAlert(alert);
      performSync(true).catch(() => {});
      // Order updates arrive before the slower dashboard reconciliation timer.
      // Refresh the two record collections immediately and broadcast once so
      // Journal, Orders, and any other mounted dashboard surface update together.
      Promise.all([
        import('@/features/journal/dhanSync').then((m) => m.syncDhanTradesToJournal(undefined, true)),
        import('@/features/trading/dhanOrdersSync').then((m) => m.syncDhanOrders(true)),
      ])
        .then(() => window.dispatchEvent(new CustomEvent('dhan-records-updated')))
        .catch(() => {});
    });
    dhanMarketFeed.onAnyTick((tick) => {
      handleLiveMarketTick(tick);
    });
  } catch {}

  // Immediate fast verification in background for funds, positions, journal, and orders
  performSync();
  try {
    import('@/features/journal/dhanSync').then((m) => m.syncDhanTradesToJournal(undefined, true)).catch(() => {});
    import('@/features/trading/dhanOrdersSync').then((m) => m.syncDhanOrders(true)).catch(() => {});
  } catch {}

  // 1. 50ms Ultra-High-Frequency Local UI Tick Loop (20 updates/second)
  // Pumps live reactive state to all components every 50ms with 0ms local latency
  tickTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && subscribers.size > 0) {
      subscribers.forEach((cb) => cb(currentSnapshot));
    }
  }, HIGH_FREQ_TICK_MS);

  // 2. Market-Aware Adaptive Polling (1s during 9:15-3:30; 12am/8am triggers)
  scheduleNextSync();

  // Resume sync immediately when tab becomes visible again
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

function stopLiveSync() {
  try {
    dhanMarketFeed.disconnect();
    dhanOrderUpdates.disconnect();
  } catch {}
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
  if (typeof window !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    performSync(true);
  }
}

export function forceDhanSync() {
  return performSync(true);
}

let lastDbSnapshotAt = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('trading-dhan-live-updated', () => {
    const now = Date.now();
    if (currentSnapshot.isLive && currentSnapshot.funds && now - lastDbSnapshotAt > 30_000) {
      lastDbSnapshotAt = now;
      fetch('/api/dhan/auth/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funds: currentSnapshot.funds,
          positions: currentSnapshot.positions,
          summary: currentSnapshot.summary,
        }),
      }).catch(() => {});
    }
  });

  window.addEventListener('dhan-token-updated', (e: Event) => {
    const detail = e instanceof CustomEvent ? e.detail : undefined;
    if (detail && detail.connected === false) {
      currentSnapshot = {
        funds: null,
        positions: [],
        summary: {
          realizedProfit: 0,
          unrealizedProfit: 0,
          totalDayPnl: 0,
          positionsCount: 0,
          openPositionsCount: 0,
          lastUpdated: new Date().toISOString(),
        },
        lastSyncTimestamp: Date.now(),
        isLive: false,
        isTokenExpired: true,
      };
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem('kortix_trading_dhan_funds');
        window.localStorage.removeItem('kortix_trading_dhan_positions');
        window.localStorage.removeItem('kortix_trading_dhan_orders_v1');
      } catch {}
      try {
        dhanMarketFeed.disconnect();
        dhanOrderUpdates.disconnect();
      } catch {}
      subscribers.forEach((cb) => cb(currentSnapshot));
      window.dispatchEvent(new CustomEvent('trading-dhan-live-updated', { detail: currentSnapshot }));
      window.dispatchEvent(new CustomEvent('dhan-orders-updated', { detail: { count: 0 } }));
      return;
    }

    // Reconnected: reconnect WebSockets and re-check & update all dashboard data
    try {
      dhanMarketFeed.connect().catch(() => {});
      dhanOrderUpdates.connect().catch(() => {});
    } catch {}
    performSync(true);
    import('@/features/journal/dhanSync').then((m) => m.syncDhanTradesToJournal(undefined, true)).catch(() => {});
    import('@/features/trading/dhanOrdersSync').then((m) => m.syncDhanOrders(true)).catch(() => {});
  });
}
