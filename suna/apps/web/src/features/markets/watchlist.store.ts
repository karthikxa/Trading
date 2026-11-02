'use client';

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
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'stock', price: 235.4, change: 1.85, changePercent: 0.79, addedAt: new Date().toISOString() },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'stock', price: 141.2, change: 3.42, changePercent: 2.48, addedAt: new Date().toISOString() },
  { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', type: 'stock', price: 254.1, change: -2.15, changePercent: -0.84, addedAt: new Date().toISOString() },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'stock', price: 428.5, change: 0.95, changePercent: 0.22, addedAt: new Date().toISOString() },
  { symbol: 'BTCUSDT', name: 'Bitcoin / Tether', exchange: 'BINANCE', type: 'crypto', price: 71200.0, change: 1450.0, changePercent: 2.08, addedAt: new Date().toISOString() },
];

export function getStoredWatchlist(): WatchlistEntry[] {
  if (typeof window === 'undefined') return DEFAULT_WATCHLIST;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WATCHLIST));
      return DEFAULT_WATCHLIST;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

export function saveWatchlist(items: WatchlistEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('watchlist-updated'));
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

