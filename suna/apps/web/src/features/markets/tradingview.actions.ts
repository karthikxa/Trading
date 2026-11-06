'use server';

import type { TvSymbolResult } from './types';

// Fast in-memory cache to guarantee sub-50ms search response for common tickers
const searchCache = new Map<string, { timestamp: number; data: TvSymbolResult[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function searchTradingViewSymbols(
  query = '',
  category = '',
  exchange = '',
  start = 0,
): Promise<TvSymbolResult[]> {
  try {
    const trimmed = (query || '').trim();
    const cat = category === 'all' ? '' : category;
    const cleanExchange = exchange && exchange !== 'ALL' ? exchange : '';
    const cacheKey = `${trimmed.toLowerCase()}|${cat.toLowerCase()}|${cleanExchange.toLowerCase()}|${start}`;

    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const exchangeParam = cleanExchange ? `&exchange=${encodeURIComponent(cleanExchange)}` : '';
    const startParam = start > 0 ? `&start=${start}` : '';
    const cleanText = (val: unknown) =>
      typeof val === 'string' ? val.replace(/<[^>]*>/g, '').trim() : '';

    const url = `https://symbol-search.tradingview.com/symbol_search/v3/?text=${encodeURIComponent(
      trimmed,
    )}&hl=0&lang=en&search_type=${encodeURIComponent(cat)}&domain=production${exchangeParam}${startParam}`;

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Origin: 'https://www.tradingview.com',
      Referer: 'https://www.tradingview.com/',
    };

    const res = await fetch(url, {
      headers,
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error('TradingView symbol search failed with status:', res.status);
      return [];
    }

    const data = await res.json();
    const rawSymbols = Array.isArray(data?.symbols) ? data.symbols : [];

    const results: TvSymbolResult[] = rawSymbols.map((s: Record<string, unknown>) => ({
      symbol: cleanText(s.symbol),
      description: cleanText(s.description || s.symbol),
      type: cleanText(s.type),
      exchange: cleanText(s.exchange),
      country: typeof s.country === 'string' ? s.country : undefined,
      logoid: typeof s.logoid === 'string' ? s.logoid : undefined,
      sourceLogoid: typeof s['source-logoid'] === 'string' ? (s['source-logoid'] as string) : undefined,
      currency: typeof s.currency_code === 'string' ? s.currency_code : undefined,
    }));

    searchCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (error) {
    console.error('TradingView symbol search error:', error);
    return [];
  }
}
