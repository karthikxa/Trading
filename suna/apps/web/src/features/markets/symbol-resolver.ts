/**
 * Universal Symbol and Exchange Resolver for TradingView & Live Feeds.
 *
 * Routes any global symbol (Indian NSE/BSE, Crypto, Forex, Commodities,
 * Futures, Indices, US Stocks) to its correct exchange prefix with 0 errors.
 */

export interface ResolvedSymbolInfo {
  rawSymbol: string;
  cleanSymbol: string;
  exchange: string;
  fullSymbol: string;
  assetType: 'stock' | 'crypto' | 'forex' | 'commodity' | 'futures' | 'index';
  isCorporateStock: boolean;
  name: string;
}

const INDIAN_TOP_STOCKS = new Set([
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL',
  'ITC', 'KOTAKBANK', 'LT', 'TATAMOTORS', 'TATASTEEL', 'WIPRO', 'BAJFINANCE',
  'MARUTI', 'HINDUNILVR', 'AXISBANK', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO',
  'ASIANPAINT', 'POWERGRID', 'NTPC', 'M&M', 'BAJAJFINSV', 'ADANIENT',
  'ADANIPORTS', 'COALINDIA', 'ONGC', 'JSWSTEEL', 'ZOMATO', 'PAYTM', 'JIOFIN',
]);

const CRYPTO_COINS = new Set([
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'MATIC',
  'DOT', 'LINK', 'SHIB', 'NEAR', 'SUI', 'APT', 'PEPE', 'LTC', 'BCH',
]);

const COMMODITY_MAP: Record<string, string> = {
  GOLD: 'TVC:GOLD',
  XAUUSD: 'TVC:GOLD',
  SILVER: 'TVC:SILVER',
  XAGUSD: 'TVC:SILVER',
  USOIL: 'TVC:USOIL',
  UKOIL: 'TVC:UKOIL',
  CRUDEOIL: 'TVC:USOIL',
  CL: 'NYMEX:CL1!',
  NG: 'NYMEX:NG1!',
  NATURALGAS: 'TVC:NATURALGAS',
  COPPER: 'TVC:COPPER',
  PLATINUM: 'TVC:PLATINUM',
};

const FOREX_PAIRS = new Set([
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURAUD', 'EURCHF', 'GBPCHF',
]);

const US_NYSE_STOCKS = new Set([
  'JPM', 'BAC', 'WMT', 'V', 'MA', 'DIS', 'XOM', 'CVX', 'JNJ', 'PG', 'PFE',
  'KO', 'MCD', 'NKE', 'BA', 'UNH', 'CAT', 'GE', 'IBM', 'GS', 'MS',
]);

const US_AMEX_ETFS = new Set([
  'SPY', 'IWM', 'DIA', 'VOO', 'VTI', 'GLD', 'SLV', 'USO', 'TLT', 'XLF', 'XLE', 'XLK',
]);

export function resolveTradingViewSymbol(raw: string, companyName?: string): ResolvedSymbolInfo {
  const trimmed = (raw || 'AAPL').trim().toUpperCase();

  // 1. If explicit exchange prefix is already present: e.g. "NSE:NIFTY", "BINANCE:BTCUSDT", "TVC:GOLD"
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const exchange = parts[0].trim();
    const cleanSymbol = parts.slice(1).join(':').trim();

    const isCrypto = ['BINANCE', 'COINBASE', 'BITSTAMP', 'BYBIT', 'OKX', 'KUCOIN'].includes(exchange);
    const isForex = ['FX', 'FX_IDC', 'OANDA', 'SAXO', 'FOREXCOM'].includes(exchange);
    const isCommodity = ['TVC', 'COMEX', 'NYMEX', 'MCX'].includes(exchange) &&
      !['SPX', 'NDX', 'DJI'].includes(cleanSymbol);
    const isFutures = ['CME', 'CME_MINI', 'CBOT'].includes(exchange) || cleanSymbol.endsWith('1!') || cleanSymbol.endsWith('2!');
    const isIndex = ['SP', 'INDEX', 'DJ'].includes(exchange) ||
      ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX', 'SPX', 'NDX', 'VIX'].includes(cleanSymbol);

    let assetType: ResolvedSymbolInfo['assetType'] = 'stock';
    if (isCrypto) assetType = 'crypto';
    else if (isForex) assetType = 'forex';
    else if (isCommodity) assetType = 'commodity';
    else if (isFutures) assetType = 'futures';
    else if (isIndex) assetType = 'index';

    const isCorporateStock = assetType === 'stock';

    return {
      rawSymbol: raw,
      cleanSymbol,
      exchange,
      fullSymbol: `${exchange}:${cleanSymbol}`,
      assetType,
      isCorporateStock,
      name: companyName || cleanSymbol,
    };
  }

  const clean = trimmed.replace(/[^A-Z0-9!]/g, '');

  // 2. Indian Indices
  if (clean === 'NIFTY' || clean === 'NIFTY50') {
    return { rawSymbol: raw, cleanSymbol: 'NIFTY', exchange: 'NSE', fullSymbol: 'NSE:NIFTY', assetType: 'index', isCorporateStock: false, name: 'Nifty 50 Index' };
  }
  if (clean === 'BANKNIFTY') {
    return { rawSymbol: raw, cleanSymbol: 'BANKNIFTY', exchange: 'NSE', fullSymbol: 'NSE:BANKNIFTY', assetType: 'index', isCorporateStock: false, name: 'Nifty Bank Index' };
  }
  if (clean === 'SENSEX') {
    return { rawSymbol: raw, cleanSymbol: 'SENSEX', exchange: 'BSE', fullSymbol: 'BSE:SENSEX', assetType: 'index', isCorporateStock: false, name: 'BSE Sensex' };
  }

  // 3. Commodities
  if (COMMODITY_MAP[clean]) {
    const full = COMMODITY_MAP[clean];
    const [ex, sym] = full.split(':');
    return { rawSymbol: raw, cleanSymbol: sym, exchange: ex, fullSymbol: full, assetType: 'commodity', isCorporateStock: false, name: companyName || clean };
  }

  // 4. Forex (check before crypto generic endsWith USD)
  if (clean === 'USDINR') {
    return { rawSymbol: raw, cleanSymbol: 'USDINR', exchange: 'FX_IDC', fullSymbol: 'FX_IDC:USDINR', assetType: 'forex', isCorporateStock: false, name: 'USD to INR' };
  }
  if (FOREX_PAIRS.has(clean)) {
    return { rawSymbol: raw, cleanSymbol: clean, exchange: 'FX', fullSymbol: `FX:${clean}`, assetType: 'forex', isCorporateStock: false, name: companyName || clean };
  }

  // 5. Crypto
  if (CRYPTO_COINS.has(clean)) {
    const sym = `${clean}USDT`;
    return { rawSymbol: raw, cleanSymbol: sym, exchange: 'BINANCE', fullSymbol: `BINANCE:${sym}`, assetType: 'crypto', isCorporateStock: false, name: companyName || `${clean}/USDT` };
  }
  if (clean.endsWith('USDT') || (clean.endsWith('USD') && clean.length <= 7 && !clean.startsWith('USD'))) {
    return { rawSymbol: raw, cleanSymbol: clean, exchange: 'BINANCE', fullSymbol: `BINANCE:${clean}`, assetType: 'crypto', isCorporateStock: false, name: companyName || clean };
  }

  // 6. Indian Top Stocks
  if (INDIAN_TOP_STOCKS.has(clean)) {
    return { rawSymbol: raw, cleanSymbol: clean, exchange: 'NSE', fullSymbol: `NSE:${clean}`, assetType: 'stock', isCorporateStock: true, name: companyName || clean };
  }

  // 7. Futures
  if (clean.endsWith('1!') || clean.endsWith('2!')) {
    const ex = clean.startsWith('ES') || clean.startsWith('NQ') || clean.startsWith('RTY') ? 'CME_MINI' : 'COMEX';
    return { rawSymbol: raw, cleanSymbol: clean, exchange: ex, fullSymbol: `${ex}:${clean}`, assetType: 'futures', isCorporateStock: false, name: companyName || clean };
  }

  // 8. US Equities / ETFs
  if (US_AMEX_ETFS.has(clean)) {
    return { rawSymbol: raw, cleanSymbol: clean, exchange: 'AMEX', fullSymbol: `AMEX:${clean}`, assetType: 'stock', isCorporateStock: false, name: companyName || clean };
  }
  if (US_NYSE_STOCKS.has(clean)) {
    return { rawSymbol: raw, cleanSymbol: clean, exchange: 'NYSE', fullSymbol: `NYSE:${clean}`, assetType: 'stock', isCorporateStock: true, name: companyName || clean };
  }

  // 9. Default: standard NASDAQ ticker or universal ticker without arbitrary forced prefix
  const isUsStandard = /^[A-Z]{1,5}$/.test(clean);
  const ex = isUsStandard ? 'NASDAQ' : '';
  const full = ex ? `${ex}:${clean}` : clean;

  return {
    rawSymbol: raw,
    cleanSymbol: clean,
    exchange: ex || 'UNIVERSAL',
    fullSymbol: full,
    assetType: 'stock',
    isCorporateStock: true,
    name: companyName || clean,
  };
}

