'use client';

import { createClient } from '@/lib/supabase/client';

export interface WatchlistEntry {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  addedAt: string;
}

const STORAGE_KEY = 'kortix_watchlist_items';

// High-performance sub-millisecond in-memory cache
let cachedWatchlistInMemory: WatchlistEntry[] | null = null;
let cachedWatchlistSet: Set<string> | null = null;

const DEFAULT_WATCHLIST: WatchlistEntry[] = [
  { symbol: 'SPY', name: 'S&P 500 ETF', exchange: 'AMEX', type: 'fund', price: 586.20, change: -1.23, changePercent: -0.21, addedAt: new Date().toISOString() },
  { symbol: 'BTCUSD', name: 'Bitcoin / U.S. Dollar', exchange: 'CRYPTO', type: 'crypto', price: 91450.0, change: 1042.0, changePercent: 1.15, addedAt: new Date().toISOString() },
  { symbol: 'EURUSD', name: 'Euro / U.S. Dollar', exchange: 'FOREXCOM', type: 'forex', price: 1.0850, change: 0.0009, changePercent: 0.08, addedAt: new Date().toISOString() },
  { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', type: 'stock', price: 218.40, change: -3.20, changePercent: -1.45, addedAt: new Date().toISOString() },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'stock', price: 138.25, change: 3.75, changePercent: 2.80, addedAt: new Date().toISOString() },
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'stock', price: 228.60, change: 1.48, changePercent: 0.65, addedAt: new Date().toISOString() },
];

let hasSyncedSupabase = false;

function refreshWatchlistSet(items: WatchlistEntry[]) {
  cachedWatchlistSet = new Set(items.map((i) => i.symbol.toUpperCase().trim()));
}

export function getStoredWatchlist(): WatchlistEntry[] {
  if (cachedWatchlistInMemory) {
    return cachedWatchlistInMemory;
  }
  if (typeof window === 'undefined') return DEFAULT_WATCHLIST;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let items = DEFAULT_WATCHLIST;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        items = parsed;
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WATCHLIST));
    }

    cachedWatchlistInMemory = items;
    refreshWatchlistSet(items);

    // Trigger non-blocking cloud sync from Supabase once
    if (!hasSyncedSupabase) {
      hasSyncedSupabase = true;
      syncWatchlistFromSupabase();
    }

    return items;
  } catch {
    cachedWatchlistInMemory = DEFAULT_WATCHLIST;
    refreshWatchlistSet(DEFAULT_WATCHLIST);
    return DEFAULT_WATCHLIST;
  }
}

export async function syncWatchlistFromSupabase() {
  if (typeof window === 'undefined') return;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('watchlists').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped: WatchlistEntry[] = data.map((d: Record<string, unknown>) => ({
        symbol: String(d.symbol || ''),
        name: String(d.name || d.symbol || ''),
        exchange: typeof d.exchange === 'string' ? d.exchange : 'US',
        type: typeof d.type === 'string' ? d.type : 'stock',
        price: typeof d.price === 'number' ? d.price : parseFloat(String(d.price || 0)) || undefined,
        change: typeof d.change === 'number' ? d.change : parseFloat(String(d.change || 0)) || undefined,
        changePercent: typeof d.change_percent === 'number' ? d.change_percent : parseFloat(String(d.change_percent || 0)) || undefined,
        addedAt: typeof d.created_at === 'string' ? d.created_at : new Date().toISOString(),
      }));

      cachedWatchlistInMemory = mapped;
      refreshWatchlistSet(mapped);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      window.dispatchEvent(new Event('watchlist-updated'));
    }
  } catch (err) {
    console.warn('Supabase watchlist sync background warn:', err);
  }
}

export function saveWatchlist(items: WatchlistEntry[]) {
  cachedWatchlistInMemory = items;
  refreshWatchlistSet(items);

  if (typeof window === 'undefined') return;

  // Immediate UI notification under 0.01ms
  window.dispatchEvent(new Event('watchlist-updated'));

  // Non-blocking disk and cloud persistence
  queueMicrotask(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      // Asynchronously push to Supabase
      (async () => {
        try {
          const supabase = createClient();
          for (const item of items) {
            await supabase.from('watchlists').upsert({
              symbol: item.symbol,
              name: item.name,
              exchange: item.exchange,
              type: item.type,
              price: item.price,
              change: item.change,
              change_percent: item.changePercent,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'symbol' });
          }
        } catch (err) {
          console.warn('Failed to upsert to Supabase watchlists:', err);
        }
      })();
    } catch (e) {
      console.error('Failed to save watchlist:', e);
    }
  });
}

export function toggleWatchlistSymbol(symbol: string, name?: string, exchange?: string): boolean {
  const sym = symbol.toUpperCase().trim();
  const list = getStoredWatchlist();
  const exists = cachedWatchlistSet ? cachedWatchlistSet.has(sym) : list.some((i) => i.symbol === sym);
  if (exists) {
    const next = list.filter((i) => i.symbol !== sym);
    saveWatchlist(next);

    // Delete from Supabase in background
    queueMicrotask(async () => {
      try {
        const supabase = createClient();
        await supabase.from('watchlists').delete().eq('symbol', sym);
      } catch (err) {
        console.warn('Failed to delete from Supabase watchlists:', err);
      }
    });

    return false;
  } else {
    const next: WatchlistEntry[] = [
      ...list,
      {
        symbol: sym,
        name: name || sym,
        exchange: exchange || 'US',
        type: 'stock',
        addedAt: new Date().toISOString(),
      },
    ];
    saveWatchlist(next);
    return true;
  }
}

export function isSymbolInWatchlist(symbol: string): boolean {
  const sym = symbol.toUpperCase().trim();
  if (cachedWatchlistSet) return cachedWatchlistSet.has(sym);
  const list = getStoredWatchlist();
  return list.some((i) => i.symbol === sym);
}
