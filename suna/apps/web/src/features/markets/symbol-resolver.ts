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
  'HAL', 'BEL', 'VEDL', 'IRFC', 'RVNL', 'BHEL', 'TRENT', 'TATAPOWER',
  'DLF', 'POLYCAB', 'INDIGO', 'HCLTECH', 'NESTLEIND', 'HEROMOTOCO',
  'EICHERMOT', 'DRREDDY', 'DIVISLAB', 'CIPLA', 'APOLLOHOSP', 'SHRIRAMFIN',
  'CHOLAFIN', 'BPCL', 'IOC', 'HDFCLIFE', 'SBILIFE', 'PIDILITIND', 'HAVELLS',
  'DABUR', 'GODREJCP', 'BRITANNIA', 'GRASIM', 'TECHM', 'LTIM', 'INDUSINDBK',
  'SIEMENS', 'ABB', 'CUMMINSIND', 'PERSISTENT', 'OFSS', 'BOSCHLTD', 'COLPAL',
  // Popular Indian mid/small caps & active Dhan traded equities
  'IDEA', 'IOB', 'CENTRALBK', 'YESBANK', 'SUZLON', 'IRCTC', 'PNB', 'CANBK',
  'BANKBARODA', 'UNIONBANK', 'IDFCFIRSTB', 'SAIL', 'NMDC', 'GAIL', 'RECLTD',
  'PFC', 'NHPC', 'SJVN', 'IREDA', 'HUDCO', 'MRF', 'PAGEIND', 'UBL', 'JUBLFOOD',
  'MOTHERSON', 'ASHOKLEY', 'BATAINDIA', 'FEDERALBNK', 'BANDHANBNK', 'IDBI',
  'BANKINDIA', 'MAHABANK', 'UCOBANK', 'PSB', 'INDIANB', 'CANFINHOME', 'L&TFH',
  'MUTHOOTFIN', 'MANAPPURAM', 'ABCAPITAL', 'M&MFIN', 'POONAWALLA', 'CHAMBLFERT',
  'COROMANDEL', 'DEEPAKFERT', 'GNFC', 'GSFC', 'RCF', 'TATACHEM', 'UPL',
  'PIIND', 'AARTIIND', 'ATUL', 'SRF', 'NAVINFLUOR', 'SUMICHEM', 'FINEORG',
  'CONCOR', 'GMRINFRA', 'ADANIPOWER', 'JSWENERGY', 'NHPC', 'SJVN', 'TORNTPOWER',
  'CESC', 'IEX', 'BSE', 'CDSL', 'MCX', 'ANGELONE', 'MOTILALOFS', 'KFINTECH',
  'CAMS', 'SUNDARMFIN', 'CREDITACC', 'FIVESTAR', 'AAVAS', 'HOMEFIRST',
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

export function resolveTradingViewSymbol(raw: string, companyName?: string, explicitExchange?: string): ResolvedSymbolInfo {
  const trimmed = (raw || 'AAPL').trim().toUpperCase();

  // 0. If explicit exchange is provided as parameter (e.g. 'NSE', 'BSE', 'MCX')
  if (explicitExchange) {
    const ex = explicitExchange.trim().toUpperCase();
    const cleanSym = trimmed.includes(':') ? trimmed.split(':')[1] : trimmed.replace(/[^A-Z0-9!]/g, '');
    const full = `${ex}:${cleanSym}`;
    return {
      rawSymbol: raw,
      cleanSymbol: cleanSym,
      exchange: ex,
      fullSymbol: full,
      assetType: 'stock',
      isCorporateStock: true,
      name: companyName || cleanSym,
    };
  }

  // 1. If explicit exchange prefix is already present: e.g. "NSE:NIFTY", "BINANCE:BTCUSDT", "TVC:GOLD"
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    let exchange = parts[0].trim();
    const cleanSymbol = parts.slice(1).join(':').trim();

    // Guard: Prevent incorrect NASDAQ / US exchange mapping for Indian stocks (e.g. NASDAQ:IDEA -> NSE:IDEA)
    const upperClean = cleanSymbol.toUpperCase();
    if (
      upperClean === 'IDEA' ||
      upperClean === 'IOB' ||
      upperClean === 'CENTRALBK' ||
      INDIAN_TOP_STOCKS.has(upperClean)
    ) {
      if (exchange === 'NASDAQ' || exchange === 'NYSE' || exchange === 'UNIVERSAL' || !exchange) {
        exchange = 'NSE';
      }
    }

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

  // 3. Specific Indian Stock Overrides
  if (clean === 'IDEA') {
    return { rawSymbol: raw, cleanSymbol: 'IDEA', exchange: 'NSE', fullSymbol: 'NSE:IDEA', assetType: 'stock', isCorporateStock: true, name: companyName || 'Vodafone Idea Ltd' };
  }
  if (clean === 'IOB') {
    return { rawSymbol: raw, cleanSymbol: 'IOB', exchange: 'NSE', fullSymbol: 'NSE:IOB', assetType: 'stock', isCorporateStock: true, name: companyName || 'Indian Overseas Bank' };
  }
  if (clean === 'CENTRALBK') {
    return { rawSymbol: raw, cleanSymbol: 'CENTRALBK', exchange: 'NSE', fullSymbol: 'NSE:CENTRALBK', assetType: 'stock', isCorporateStock: true, name: companyName || 'Central Bank of India' };
  }

  // 4. Commodities
  if (COMMODITY_MAP[clean]) {
    const full = COMMODITY_MAP[clean];
    const [ex, sym] = full.split(':');
    return { rawSymbol: raw, cleanSymbol: sym, exchange: ex, fullSymbol: full, assetType: 'commodity', isCorporateStock: false, name: companyName || clean };
  }

  // 5. Forex (check before crypto generic endsWith USD)
  if (clean === 'USDINR') {
    return { rawSymbol: raw, cleanSymbol: 'USDINR', exchange: 'FX_IDC', fullSymbol: 'FX_IDC:USDINR', assetType: 'forex', isCorporateStock: false, name: 'USD to INR' };
  }
  if (FOREX_PAIRS.has(clean)) {
    return { rawSymbol: raw, cleanSymbol: clean, exchange: 'FX', fullSymbol: `FX:${clean}`, assetType: 'forex', isCorporateStock: false, name: companyName || clean };
  }

  // 6. Crypto
  if (CRYPTO_COINS.has(clean)) {
    const sym = `${clean}USDT`;
    return { rawSymbol: raw, cleanSymbol: sym, exchange: 'BINANCE', fullSymbol: `BINANCE:${sym}`, assetType: 'crypto', isCorporateStock: false, name: companyName || `${clean}/USDT` };
  }
  if (clean.endsWith('USDT') || (clean.endsWith('USD') && clean.length <= 7 && !clean.startsWith('USD'))) {
    return { rawSymbol: raw, cleanSymbol: clean, exchange: 'BINANCE', fullSymbol: `BINANCE:${clean}`, assetType: 'crypto', isCorporateStock: false, name: companyName || clean };
  }

  // 7. Indian Top Stocks
  if (INDIAN_TOP_STOCKS.has(clean)) {
    return { rawSymbol: raw, cleanSymbol: clean, exchange: 'NSE', fullSymbol: `NSE:${clean}`, assetType: 'stock', isCorporateStock: true, name: companyName || clean };
  }

  // 8. Indian Company Name Heuristic
  const cName = (companyName || '').toLowerCase();
  if (
    cName.includes('limited') ||
    cName.includes('ltd') ||
    cName.includes('india') ||
    cName.includes('bharat') ||
    cName.includes('bank')
  ) {
    if (!US_NYSE_STOCKS.has(clean) && !US_AMEX_ETFS.has(clean) && clean !== 'AAPL' && clean !== 'MSFT' && clean !== 'GOOGL' && clean !== 'AMZN' && clean !== 'TSLA' && clean !== 'META' && clean !== 'NVDA') {
      return { rawSymbol: raw, cleanSymbol: clean, exchange: 'NSE', fullSymbol: `NSE:${clean}`, assetType: 'stock', isCorporateStock: true, name: companyName || clean };
    }
  }

  // 9. Futures
  if (clean.endsWith('1!') || clean.endsWith('2!')) {
    const ex = clean.startsWith('ES') || clean.startsWith('NQ') || clean.startsWith('RTY') ? 'CME_MINI' : 'COMEX';
    return { rawSymbol: raw, cleanSymbol: clean, exchange: ex, fullSymbol: `${ex}:${clean}`, assetType: 'futures', isCorporateStock: false, name: companyName || clean };
  }

  // 10. US Equities / ETFs
  if (US_AMEX_ETFS.has(clean)) {
    return { rawSymbol: raw, cleanSymbol: clean, exchange: 'AMEX', fullSymbol: `AMEX:${clean}`, assetType: 'stock', isCorporateStock: false, name: companyName || clean };
  }
  if (US_NYSE_STOCKS.has(clean)) {
    return { rawSymbol: raw, cleanSymbol: clean, exchange: 'NYSE', fullSymbol: `NYSE:${clean}`, assetType: 'stock', isCorporateStock: true, name: companyName || clean };
  }

  // 11. Default: standard NASDAQ ticker or universal ticker without arbitrary forced prefix
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

export const resolveTradingSymbol = resolveTradingViewSymbol;

