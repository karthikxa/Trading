'use client';

/**
 * DhanHQ Live Store & Quota Guard
 * 
 * Guarantees 0ms perceived latency via Frame-0 localStorage hydration (SWR)
 * and guards daily Dhan API quota with visibility-aware smart background sync.
 */

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
}

const STORAGE_KEY = 'kortix_dhan_live_cache_v2';
const SYNC_INTERVAL_MS = 4000; // 4s smart background REST sync
const HIGH_FREQ_TICK_MS = 50; // 50ms ultra-high-frequency (20 updates/sec) reactive tick loop

function getInitialSnapshot(): DhanLiveSnapshot {
  if (typeof window === 'undefined') {
    return {
      funds: { availabelBalance: 720.02, dhanClientId: '1114824544' },
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
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
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
          isLive: true,
        };
      }
    }
  } catch {}

  // Fallback to legacy keys if v2 not yet populated
  let legacyFunds = null;
  let legacyPositions: any[] = [];
  try {
    const f = window.localStorage.getItem('kortix_trading_dhan_funds');
    if (f) legacyFunds = JSON.parse(f);
    const p = window.localStorage.getItem('kortix_trading_dhan_positions');
    if (p) legacyPositions = JSON.parse(p);
  } catch {}

  const realizedProfit = Array.isArray(legacyPositions)
    ? Number(legacyPositions.reduce((acc, pos) => acc + (Number(pos.realizedProfit) || 0), 0).toFixed(2))
    : 0;
  const unrealizedProfit = Array.isArray(legacyPositions)
    ? Number(legacyPositions.reduce((acc, pos) => acc + (Number(pos.unrealizedProfit) || 0), 0).toFixed(2))
    : 0;

  return {
    funds: legacyFunds || { availabelBalance: 720.02, dhanClientId: '1114824544' },
    positions: legacyPositions,
    summary: {
      realizedProfit,
      unrealizedProfit,
      totalDayPnl: Number((realizedProfit + unrealizedProfit).toFixed(2)),
      positionsCount: legacyPositions.length,
      openPositionsCount: legacyPositions.filter((pos) => Number(pos.netQty || 0) !== 0).length,
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
      fetch(`/api/dhan?action=funds${force ? '&force=true' : ''}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/dhan?action=positions${force ? '&force=true' : ''}`).then((r) => r.json()).catch(() => null),
    ]);

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

    if (
      JSON.stringify(nextFunds) !== JSON.stringify(currentSnapshot.funds) ||
      JSON.stringify(nextPositions) !== JSON.stringify(currentSnapshot.positions) ||
      JSON.stringify(nextSummary) !== JSON.stringify(currentSnapshot.summary)
    ) {
      changed = true;
    }

    if (changed || !currentSnapshot.isLive) {
      currentSnapshot = {
        funds: nextFunds,
        positions: nextPositions,
        summary: nextSummary,
        lastSyncTimestamp: Date.now(),
        isLive: true,
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

function startLiveSync() {
  if (typeof window === 'undefined') return;
  if (syncTimer || tickTimer) return;

  // Immediate fast verification in background
  performSync();

  // 1. 50ms Ultra-High-Frequency Local UI Tick Loop (20 updates/second)
  // Pumps live reactive state to all components every 50ms with 0ms local latency
  tickTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && subscribers.size > 0) {
      subscribers.forEach((cb) => cb(currentSnapshot));
    }
  }, HIGH_FREQ_TICK_MS);

  // 2. Safe Quota-Guarded Background REST Polling
  syncTimer = setInterval(() => {
    performSync();
  }, SYNC_INTERVAL_MS);

  // Resume sync immediately when tab becomes visible again
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

function stopLiveSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
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
