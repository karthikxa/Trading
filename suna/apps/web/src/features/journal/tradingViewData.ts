'use client';

export interface SymbolMarketData {
  symbol: string;
  name: string;
  category: 'FOREX' | 'FUTURES' | 'CRYPTO';
  exchange: string;
  lastPrice: string;
  lastPriceSup?: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
  marketStatus: 'Market open' | 'Market closed';
  news: {
    headline: string;
    timeAgo: string;
  };
  performance: {
    '1W': { value: string; positive: boolean };
    '1M': { value: string; positive: boolean };
    '3M': { value: string; positive: boolean };
    '6M': { value: string; positive: boolean };
    'YTD': { value: string; positive: boolean };
    '1Y': { value: string; positive: boolean };
  };
}

export const SYMBOL_MARKET_REGISTRY: Record<string, SymbolMarketData> = {
  EURUSD: {
    symbol: 'EURUSD',
    name: 'Euro / U.S. Dollar',
    category: 'FOREX',
    exchange: 'FOREXCOM',
    lastPrice: '1.1196',
    lastPriceSup: '5',
    change: '+0.00605',
    changePercent: '+0.54%',
    isPositive: true,
    marketStatus: 'Market open',
    news: {
      headline: 'Fed hike bets support dollar; Aussie, NZ rally on AI stock rebound',
      timeAgo: '4 hours ago',
    },
    performance: {
      '1W': { value: '+0.34%', positive: true },
      '1M': { value: '-0.13%', positive: false },
      '3M': { value: '-3.01%', positive: false },
      '6M': { value: '-4.62%', positive: false },
      'YTD': { value: '-4.68%', positive: false },
      '1Y': { value: '-3.04%', positive: false },
    },
  },
  AUDCHF: {
    symbol: 'AUDCHF',
    name: 'Australian Dollar / Swiss Franc',
    category: 'FOREX',
    exchange: 'OANDA',
    lastPrice: '0.5842',
    lastPriceSup: '1',
    change: '+0.00412',
    changePercent: '+0.71%',
    isPositive: true,
    marketStatus: 'Market open',
    news: {
      headline: 'RBA maintains hawkish hold as Swiss National Bank cuts benchmark rate',
      timeAgo: '2 hours ago',
    },
    performance: {
      '1W': { value: '+1.12%', positive: true },
      '1M': { value: '+0.85%', positive: true },
      '3M': { value: '-1.40%', positive: false },
      '6M': { value: '-2.15%', positive: false },
      'YTD': { value: '+0.45%', positive: true },
      '1Y': { value: '-1.80%', positive: false },
    },
  },
  GBPJPY: {
    symbol: 'GBPJPY',
    name: 'British Pound / Japanese Yen',
    category: 'FOREX',
    exchange: 'SAXO',
    lastPrice: '191.45',
    lastPriceSup: '0',
    change: '-0.420',
    changePercent: '-0.22%',
    isPositive: false,
    marketStatus: 'Market open',
    news: {
      headline: 'BOJ intervention fears loom over currency pairs amid rising yields',
      timeAgo: '1 hour ago',
    },
    performance: {
      '1W': { value: '-0.45%', positive: false },
      '1M': { value: '+2.10%', positive: true },
      '3M': { value: '+5.32%', positive: true },
      '6M': { value: '+8.14%', positive: true },
      'YTD': { value: '+6.25%', positive: true },
      '1Y': { value: '+14.2%', positive: true },
    },
  },
  USDINR: {
    symbol: 'USDINR',
    name: 'U.S. Dollar / Indian Rupee',
    category: 'FOREX',
    exchange: 'FX_IDC',
    lastPrice: '93.9275',
    change: '+0.0325',
    changePercent: '+0.03%',
    isPositive: true,
    marketStatus: 'Market open',
    news: {
      headline: 'RBI forex reserves hover near all-time highs amid strong foreign inflows',
      timeAgo: '3 hours ago',
    },
    performance: {
      '1W': { value: '+0.08%', positive: true },
      '1M': { value: '+0.21%', positive: true },
      '3M': { value: '+0.65%', positive: true },
      '6M': { value: '+1.15%', positive: true },
      'YTD': { value: '+1.42%', positive: true },
      '1Y': { value: '+2.10%', positive: true },
    },
  },
  GBPUSD: {
    symbol: 'GBPUSD',
    name: 'British Pound / U.S. Dollar',
    category: 'FOREX',
    exchange: 'FOREXCOM',
    lastPrice: '1.3425',
    lastPriceSup: '1',
    change: '+0.00826',
    changePercent: '+0.62%',
    isPositive: true,
    marketStatus: 'Market open',
    news: {
      headline: 'Bank of England signals cautious easing trajectory as UK inflation slows',
      timeAgo: '5 hours ago',
    },
    performance: {
      '1W': { value: '+0.55%', positive: true },
      '1M': { value: '+1.20%', positive: true },
      '3M': { value: '-0.85%', positive: false },
      '6M': { value: '+2.30%', positive: true },
      'YTD': { value: '+1.90%', positive: true },
      '1Y': { value: '+3.45%', positive: true },
    },
  },
  USDJPY: {
    symbol: 'USDJPY',
    name: 'U.S. Dollar / Japanese Yen',
    category: 'FOREX',
    exchange: 'FOREXCOM',
    lastPrice: '157.90',
    lastPriceSup: '1',
    change: '-0.568',
    changePercent: '-0.36%',
    isPositive: false,
    marketStatus: 'Market open',
    news: {
      headline: 'Yen strengthens against major peers as Treasury yields ease',
      timeAgo: '3 hours ago',
    },
    performance: {
      '1W': { value: '-0.62%', positive: false },
      '1M': { value: '+1.45%', positive: true },
      '3M': { value: '+4.20%', positive: true },
      '6M': { value: '+7.80%', positive: true },
      'YTD': { value: '+5.10%', positive: true },
      '1Y': { value: '+11.5%', positive: true },
    },
  },
  XAUUSD: {
    symbol: 'XAUUSD',
    name: 'Gold / U.S. Dollar',
    category: 'FUTURES',
    exchange: 'TVC',
    lastPrice: '2,912.40',
    change: '+14.20',
    changePercent: '+0.49%',
    isPositive: true,
    marketStatus: 'Market open',
    news: {
      headline: 'Gold breaks out to record levels on central bank accumulation and geopolitical hedging',
      timeAgo: '2 hours ago',
    },
    performance: {
      '1W': { value: '+2.15%', positive: true },
      '1M': { value: '+5.80%', positive: true },
      '3M': { value: '+12.4%', positive: true },
      '6M': { value: '+18.9%', positive: true },
      'YTD': { value: '+16.2%', positive: true },
      '1Y': { value: '+31.4%', positive: true },
    },
  },
  INFY: {
    symbol: 'INFY',
    name: 'Infosys Limited',
    category: 'FUTURES',
    exchange: 'NSE',
    lastPrice: '1,151.80',
    change: '-23.60',
    changePercent: '-2.01%',
    isPositive: false,
    marketStatus: 'Market closed',
    news: {
      headline: 'IT sector faces consolidation after quarterly earnings guidance revisions',
      timeAgo: '6 hours ago',
    },
    performance: {
      '1W': { value: '-2.01%', positive: false },
      '1M': { value: '-4.12%', positive: false },
      '3M': { value: '+3.50%', positive: true },
      '6M': { value: '+8.20%', positive: true },
      'YTD': { value: '+1.10%', positive: true },
      '1Y': { value: '+15.8%', positive: true },
    },
  },
  BTCUSD: {
    symbol: 'BTCUSD',
    name: 'Bitcoin / U.S. Dollar',
    category: 'CRYPTO',
    exchange: 'BINANCE',
    lastPrice: '74,500',
    change: '-242',
    changePercent: '-0.32%',
    isPositive: false,
    marketStatus: 'Market open',
    news: {
      headline: 'Institutional ETF inflows resume as Bitcoin consolidates above key support',
      timeAgo: '1 hour ago',
    },
    performance: {
      '1W': { value: '+4.20%', positive: true },
      '1M': { value: '+11.8%', positive: true },
      '3M': { value: '+28.5%', positive: true },
      '6M': { value: '+42.1%', positive: true },
      'YTD': { value: '+55.0%', positive: true },
      '1Y': { value: '+112%', positive: true },
    },
  },
  ETHUSD: {
    symbol: 'ETHUSD',
    name: 'Ethereum / U.S. Dollar',
    category: 'CRYPTO',
    exchange: 'BINANCE',
    lastPrice: '2,123.2',
    change: '0.0',
    changePercent: '0.00%',
    isPositive: true,
    marketStatus: 'Market open',
    news: {
      headline: 'Ethereum layer-2 transactions reach record throughput following upgrade',
      timeAgo: '4 hours ago',
    },
    performance: {
      '1W': { value: '+1.80%', positive: true },
      '1M': { value: '+6.40%', positive: true },
      '3M': { value: '+15.2%', positive: true },
      '6M': { value: '+24.8%', positive: true },
      'YTD': { value: '+32.0%', positive: true },
      '1Y': { value: '+78.5%', positive: true },
    },
  },
  XRPUSD: {
    symbol: 'XRPUSD',
    name: 'XRP / U.S. Dollar',
    category: 'CRYPTO',
    exchange: 'BITSTAMP',
    lastPrice: '1.08817',
    change: '-0.02400',
    changePercent: '-2.16%',
    isPositive: false,
    marketStatus: 'Market open',
    news: {
      headline: 'Ripple expands cross-border liquidity corridors in Asia-Pacific',
      timeAgo: '5 hours ago',
    },
    performance: {
      '1W': { value: '-2.16%', positive: false },
      '1M': { value: '+14.5%', positive: true },
      '3M': { value: '+35.2%', positive: true },
      '6M': { value: '+48.0%', positive: true },
      'YTD': { value: '+62.0%', positive: true },
      '1Y': { value: '+85.0%', positive: true },
    },
  },
  LTCUSD: {
    symbol: 'LTCUSD',
    name: 'Litecoin / U.S. Dollar',
    category: 'CRYPTO',
    exchange: 'COINBASE',
    lastPrice: '50.54',
    change: '+0.47',
    changePercent: '+0.93%',
    isPositive: true,
    marketStatus: 'Market open',
    news: {
      headline: 'Litecoin hash rate hits new high as network activity expands',
      timeAgo: '7 hours ago',
    },
    performance: {
      '1W': { value: '+0.93%', positive: true },
      '1M': { value: '+3.15%', positive: true },
      '3M': { value: '-4.20%', positive: false },
      '6M': { value: '+1.50%', positive: true },
      'YTD': { value: '-2.10%', positive: false },
      '1Y': { value: '+12.4%', positive: true },
    },
  },
};

export function getSymbolMarketData(sym: string): SymbolMarketData {
  const clean = sym.toUpperCase().replace(/^.*:/, '').trim();
  if (SYMBOL_MARKET_REGISTRY[clean]) {
    return SYMBOL_MARKET_REGISTRY[clean];
  }

  // Fallback dynamic entry
  const isForex = clean.length === 6;
  return {
    symbol: clean,
    name: isForex ? `${clean.slice(0, 3)} / ${clean.slice(3, 6)}` : clean,
    category: isForex ? 'FOREX' : 'FUTURES',
    exchange: 'GLOBAL',
    lastPrice: '100.00',
    change: '+0.50',
    changePercent: '+0.50%',
    isPositive: true,
    marketStatus: 'Market open',
    news: {
      headline: `${clean} market liquidity remains stable across major trading desks`,
      timeAgo: '2 hours ago',
    },
    performance: {
      '1W': { value: '+0.50%', positive: true },
      '1M': { value: '+1.20%', positive: true },
      '3M': { value: '-0.80%', positive: false },
      '6M': { value: '+2.10%', positive: true },
      'YTD': { value: '+3.40%', positive: true },
      '1Y': { value: '+5.60%', positive: true },
    },
  };
}

