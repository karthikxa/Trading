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

const DEFAULT_WATCHLIST: WatchlistEntry[] = [
  { symbol: 'BTCUSD', name: 'Bitcoin / U.S. Dollar', exchange: 'CRYPTO', type: 'crypto', price: 74500.0, change: -242.0, changePercent: -0.32, addedAt: new Date().toISOString() },
  { symbol: 'EURUSD', name: 'Euro / U.S. Dollar', exchange: 'FOREXCOM', type: 'forex', price: 1.1196, change: 0.006, changePercent: 0.54, addedAt: new Date().toISOString() },
  { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', type: 'stock', price: 254.1, change: -2.15, changePercent: -0.84, addedAt: new Date().toISOString() },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'stock', price: 141.2, change: 3.42, changePercent: 2.48, addedAt: new Date().toISOString() },
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'stock', price: 235.4, change: 1.85, changePercent: 0.79, addedAt: new Date().toISOString() },
];

let hasSyncedSupabase = false;

export function getStoredWatchlist(): WatchlistEntry[] {
  if (typeof window === 'undefined') return DEFAULT_WATCHLIST;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let items = DEFAULT_WATCHLIST;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Strip SPY and QQQ if user removed them or if left from prior session
        items = parsed.filter((i) => i.symbol !== 'SPY' && i.symbol !== 'QQQ');
        if (items.length === 0) items = DEFAULT_WATCHLIST;
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WATCHLIST));
    }

    // Trigger non-blocking cloud sync from Supabase once
    if (!hasSyncedSupabase) {
      hasSyncedSupabase = true;
      syncWatchlistFromSupabase();
    }

    return items;
  } catch {
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

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      window.dispatchEvent(new Event('watchlist-updated'));
    }
  } catch (err) {
    console.warn('Supabase watchlist sync background warn:', err);
  }
}

export function saveWatchlist(items: WatchlistEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('watchlist-updated'));

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
}

export function toggleWatchlistSymbol(symbol: string, name?: string, exchange?: string): boolean {
  const sym = symbol.toUpperCase().trim();
  const list = getStoredWatchlist();
  const exists = list.some((i) => i.symbol === sym);
  if (exists) {
    const next = list.filter((i) => i.symbol !== sym);
    saveWatchlist(next);

    // Delete from Supabase
    (async () => {
      try {
        const supabase = createClient();
        await supabase.from('watchlists').delete().eq('symbol', sym);
      } catch (err) {
        console.warn('Failed to delete from Supabase watchlists:', err);
      }
    })();

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
  const list = getStoredWatchlist();
  return list.some((i) => i.symbol === sym);
}
