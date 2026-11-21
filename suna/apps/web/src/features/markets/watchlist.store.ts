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
  { symbol: 'CENTRALBK', name: 'Central Bank of India', exchange: 'NSE', type: 'stock', price: 34.40, change: 0.12, changePercent: 0.35, addedAt: new Date().toISOString() },
  { symbol: 'IOB', name: 'Indian Overseas Bank', exchange: 'NSE', type: 'stock', price: 32.05, change: -0.05, changePercent: -0.16, addedAt: new Date().toISOString() },
  { symbol: 'IDEA', name: 'Vodafone Idea', exchange: 'NSE', type: 'stock', price: 12.20, change: 0.10, changePercent: 0.83, addedAt: new Date().toISOString() },
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', exchange: 'NSE', type: 'stock', price: 2980.50, change: 18.20, changePercent: 0.61, addedAt: new Date().toISOString() },
  { symbol: 'SPY', name: 'S&P 500 ETF', exchange: 'AMEX', type: 'fund', price: 586.20, change: -1.23, changePercent: -0.21, addedAt: new Date().toISOString() },
  { symbol: 'BTCUSD', name: 'Bitcoin / U.S. Dollar', exchange: 'CRYPTO', type: 'crypto', price: 91450.0, change: 1042.0, changePercent: 1.15, addedAt: new Date().toISOString() },
];

const TOP_ORDER_SYMBOLS = ['CENTRALBK', 'IOB', 'IDEA'];

function sortWithTopPriority(items: WatchlistEntry[]): WatchlistEntry[] {
  const topMap = new Map<string, WatchlistEntry>();
  const others: WatchlistEntry[] = [];

  // Index existing items
  for (const item of items) {
    const sym = item.symbol.toUpperCase().trim();
    if (TOP_ORDER_SYMBOLS.includes(sym)) {
      topMap.set(sym, item);
    } else {
      others.push(item);
    }
  }

  // Ensure all top order symbols exist, using DEFAULT_WATCHLIST as fallback
  const topList: WatchlistEntry[] = [];
  for (const sym of TOP_ORDER_SYMBOLS) {
    if (topMap.has(sym)) {
      topList.push(topMap.get(sym)!);
    } else {
      const def = DEFAULT_WATCHLIST.find((d) => d.symbol.toUpperCase() === sym);
      if (def) topList.push(def);
    }
  }

  return [...topList, ...others];
}

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
        items = sortWithTopPriority(parsed);
      }
    } else {
      items = sortWithTopPriority(DEFAULT_WATCHLIST);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
