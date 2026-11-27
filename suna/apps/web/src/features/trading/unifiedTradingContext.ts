'use client';

import { getDhanLiveSnapshot } from '@/features/markets/dhanLiveStore';
import { getLocalTrades } from '@/features/journal/storage';
import { getLocalOrders } from './dhanOrdersSync';

export interface UnifiedTradingContext {
  capturedAt: string;
  market: {
    isLive: boolean;
    lastSyncTimestamp: number;
    funds: unknown;
    positions: unknown[];
    summary: unknown;
  };
  orders: unknown[];
  journal: unknown[];
}

function compact(value: any): any {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 100).map(compact);
  const result: Record<string, any> = {};
  for (const [key, item] of Object.entries(value)) {
    // Chart images and raw broker payloads are not useful to the model and can be very large.
    if (/^(rawData|chartHtf|chartMtf|chartLtf|image|screenshot)$/i.test(key)) continue;
    if (typeof item !== 'function') result[key] = compact(item);
  }
  return result;
}

/** Reads the same local-first data that the dashboard renders, at the moment a bot is asked. */
export function getUnifiedTradingContext(): UnifiedTradingContext {
  const snapshot = getDhanLiveSnapshot();
  return {
    capturedAt: new Date().toISOString(),
    market: {
      isLive: snapshot.isLive,
      lastSyncTimestamp: snapshot.lastSyncTimestamp,
      funds: compact(snapshot.funds),
      positions: compact(snapshot.positions),
      summary: compact(snapshot.summary),
    },
    orders: compact(getLocalOrders()),
    journal: compact(getLocalTrades()),
  };
}

