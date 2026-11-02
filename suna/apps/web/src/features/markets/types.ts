export type TvSymbolResult = {
  symbol: string;
  description: string;
  type: string;
  exchange: string;
  country?: string;
  logoid?: string;
  sourceLogoid?: string;
  currency?: string;
};

export type StockWithWatchlistStatus = {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  isInWatchlist?: boolean;
};

export type MarketId = 'us' | 'in' | 'de' | 'ca' | 'au' | 'crypto' | 'fx';

export type Hours = { open: number; close: number };

export type Market = {
  id: MarketId;
  name: string;
  short: string;
  timeZone: string;
  hours: Hours | '24/7' | '24/5';
  feed: 'Live' | 'Delayed' | 'End of day';
  pulse: { symbol: string; label: string; finnhub?: string }[];
  groups: { title: string; symbols: [symbol: string, name: string][] }[];
  heatmap?: 'stocks' | 'crypto';
  news: 'stock' | 'crypto' | 'forex';
};

