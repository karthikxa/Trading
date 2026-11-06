import type { Market, MarketId } from './types';

const hm = (h: number, m = 0) => h * 60 + m;

export const MARKETS: Market[] = [
  {
    id: 'us',
    name: 'United States',
    short: 'US',
    timeZone: 'America/New_York',
    hours: { open: hm(9, 30), close: hm(16) },
    feed: 'Live',
    pulse: [
      { symbol: 'AMEX:SPY', label: 'S&P 500' },
      { symbol: 'NASDAQ:QQQ', label: 'Nasdaq 100' },
      { symbol: 'AMEX:DIA', label: 'Dow 30' },
      { symbol: 'AMEX:IWM', label: 'Russell 2000' },
    ],
    groups: [
      {
        title: 'Technology',
        symbols: [
          ['NASDAQ:AAPL', 'Apple'],
          ['NASDAQ:MSFT', 'Microsoft'],
          ['NASDAQ:NVDA', 'NVIDIA'],
          ['NASDAQ:GOOGL', 'Alphabet'],
          ['NASDAQ:META', 'Meta'],
          ['NASDAQ:TSLA', 'Tesla'],
        ],
      },
      {
        title: 'Financial & Consumer',
        symbols: [
          ['NYSE:JPM', 'JPMorgan Chase'],
          ['NYSE:BAC', 'Bank of America'],
          ['NASDAQ:AMZN', 'Amazon'],
          ['NYSE:WMT', 'Walmart'],
          ['NYSE:V', 'Visa'],
        ],
      },
    ],
    heatmap: 'stocks',
    news: 'stock',
  },
  {
    id: 'in',
    name: 'India (NSE/BSE)',
    short: 'IN',
    timeZone: 'Asia/Kolkata',
    hours: { open: hm(9, 15), close: hm(15, 30) },
    feed: 'Live',
    pulse: [
      { symbol: 'NSE:NIFTY', label: 'NIFTY 50' },
      { symbol: 'NSE:BANKNIFTY', label: 'Bank Nifty' },
      { symbol: 'BSE:SENSEX', label: 'Sensex' },
      { symbol: 'NSE:RELIANCE', label: 'Reliance' },
    ],
    groups: [
      {
        title: 'Indices & Bluechips',
        symbols: [
          ['NSE:NIFTY', 'NIFTY 50 Index'],
          ['NSE:BANKNIFTY', 'Bank Nifty Index'],
          ['NSE:RELIANCE', 'Reliance Industries'],
          ['NSE:TCS', 'Tata Consultancy Services'],
          ['NSE:HDFCBANK', 'HDFC Bank Ltd'],
          ['NSE:INFY', 'Infosys Ltd'],
        ],
      },
      {
        title: 'Banking & Heavyweights',
        symbols: [
          ['NSE:ICICIBANK', 'ICICI Bank Ltd'],
          ['NSE:SBIN', 'State Bank of India'],
          ['NSE:BHARTIARTL', 'Bharti Airtel'],
          ['NSE:ITC', 'ITC Limited'],
          ['NSE:LT', 'Larsen & Toubro'],
          ['NSE:TATAMOTORS', 'Tata Motors'],
        ],
      },
    ],
    news: 'stock',
  },
  {
    id: 'commodities',
    name: 'Commodities',
    short: 'COMM',
    timeZone: 'UTC',
    hours: '24/5',
    feed: 'Live',
    pulse: [
      { symbol: 'TVC:GOLD', label: 'Gold (XAU/USD)' },
      { symbol: 'TVC:SILVER', label: 'Silver (XAG/USD)' },
      { symbol: 'TVC:USOIL', label: 'WTI Crude Oil' },
      { symbol: 'TVC:NATURALGAS', label: 'Natural Gas' },
    ],
    groups: [
      {
        title: 'Precious Metals & Energy',
        symbols: [
          ['TVC:GOLD', 'Spot Gold / USD'],
          ['TVC:SILVER', 'Spot Silver / USD'],
          ['TVC:USOIL', 'WTI Crude Oil'],
          ['TVC:UKOIL', 'Brent Crude Oil'],
          ['TVC:NATURALGAS', 'Natural Gas'],
          ['TVC:COPPER', 'Copper'],
          ['TVC:PLATINUM', 'Platinum'],
        ],
      },
    ],
    news: 'forex',
  },
  {
    id: 'futures',
    name: 'Futures',
    short: 'FUT',
    timeZone: 'America/Chicago',
    hours: '24/5',
    feed: 'Live',
    pulse: [
      { symbol: 'CME_MINI:ES1!', label: 'S&P 500 E-mini' },
      { symbol: 'CME_MINI:NQ1!', label: 'Nasdaq 100 E-mini' },
      { symbol: 'CBOT:YM1!', label: 'Dow 30 E-mini' },
      { symbol: 'CME_MINI:RTY1!', label: 'Russell 2000' },
    ],
    groups: [
      {
        title: 'Index & Commodity Futures',
        symbols: [
          ['CME_MINI:ES1!', 'S&P 500 E-mini Continuous'],
          ['CME_MINI:NQ1!', 'Nasdaq 100 E-mini Continuous'],
          ['CBOT:YM1!', 'E-mini Dow ($5) Futures'],
          ['CME_MINI:RTY1!', 'E-mini Russell 2000'],
          ['COMEX:GC1!', 'Gold Futures Continuous'],
          ['NYMEX:CL1!', 'Crude Oil Futures Continuous'],
        ],
      },
    ],
    news: 'stock',
  },
  {
    id: 'de',
    name: 'Germany',
    short: 'DE',
    timeZone: 'Europe/Berlin',
    hours: { open: hm(9), close: hm(17, 30) },
    feed: 'End of day',
    pulse: [
      { symbol: 'XETR:SAP', label: 'SAP' },
      { symbol: 'XETR:SIE', label: 'Siemens' },
      { symbol: 'XETR:ALV', label: 'Allianz' },
      { symbol: 'XETR:AIR', label: 'Airbus' },
    ],
    groups: [
      {
        title: 'Leaders',
        symbols: [
          ['XETR:SAP', 'SAP'],
          ['XETR:SIE', 'Siemens'],
          ['XETR:BMW', 'BMW'],
          ['XETR:MBG', 'Mercedes-Benz'],
        ],
      },
    ],
    news: 'stock',
  },
  {
    id: 'ca',
    name: 'Canada',
    short: 'CA',
    timeZone: 'America/Toronto',
    hours: { open: hm(9, 30), close: hm(16) },
    feed: 'Delayed',
    pulse: [
      { symbol: 'TSX:RY', label: 'RBC' },
      { symbol: 'TSX:TD', label: 'TD Bank' },
      { symbol: 'TSX:SHOP', label: 'Shopify' },
      { symbol: 'TSX:ENB', label: 'Enbridge' },
    ],
    groups: [
      {
        title: 'Key Assets',
        symbols: [
          ['TSX:SHOP', 'Shopify'],
          ['TSX:RY', 'Royal Bank of Canada'],
          ['TSX:CNR', 'Canadian National Railway'],
        ],
      },
    ],
    news: 'stock',
  },
  {
    id: 'au',
    name: 'Australia',
    short: 'AU',
    timeZone: 'Australia/Sydney',
    hours: { open: hm(10), close: hm(16) },
    feed: 'Delayed',
    pulse: [
      { symbol: 'ASX:BHP', label: 'BHP Group' },
      { symbol: 'ASX:CBA', label: 'Commonwealth Bank' },
      { symbol: 'ASX:CSL', label: 'CSL Limited' },
      { symbol: 'ASX:NAB', label: 'National Australia Bank' },
    ],
    groups: [
      {
        title: 'ASX Leaders',
        symbols: [
          ['ASX:BHP', 'BHP Group'],
          ['ASX:CBA', 'Commonwealth Bank'],
          ['ASX:WES', 'Wesfarmers'],
        ],
      },
    ],
    news: 'stock',
  },
  {
    id: 'crypto',
    name: 'Crypto',
    short: 'CRYPTO',
    timeZone: 'UTC',
    hours: '24/7',
    feed: 'Live',
    pulse: [
      { symbol: 'BINANCE:BTCUSDT', label: 'Bitcoin' },
      { symbol: 'BINANCE:ETHUSDT', label: 'Ethereum' },
      { symbol: 'BINANCE:SOLUSDT', label: 'Solana' },
      { symbol: 'BINANCE:BNBUSDT', label: 'BNB' },
    ],
    groups: [
      {
        title: 'Major Cryptocurrencies',
        symbols: [
          ['BINANCE:BTCUSDT', 'Bitcoin (BTC/USDT)'],
          ['BINANCE:ETHUSDT', 'Ethereum (ETH/USDT)'],
          ['BINANCE:SOLUSDT', 'Solana (SOL/USDT)'],
          ['BINANCE:XRPUSDT', 'XRP (XRP/USDT)'],
          ['BINANCE:ADAUSDT', 'Cardano (ADA/USDT)'],
          ['BINANCE:DOGEUSDT', 'Dogecoin (DOGE/USDT)'],
        ],
      },
    ],
    heatmap: 'crypto',
    news: 'crypto',
  },
  {
    id: 'fx',
    name: 'Forex',
    short: 'FX',
    timeZone: 'UTC',
    hours: '24/5',
    feed: 'Live',
    pulse: [
      { symbol: 'FX:EURUSD', label: 'EUR / USD' },
      { symbol: 'FX:USDJPY', label: 'USD / JPY' },
      { symbol: 'FX:GBPUSD', label: 'GBP / USD' },
      { symbol: 'FX:AUDUSD', label: 'AUD / USD' },
    ],
    groups: [
      {
        title: 'Majors & Crosses',
        symbols: [
          ['FX:EURUSD', 'Euro / US Dollar'],
          ['FX:USDJPY', 'US Dollar / Japanese Yen'],
          ['FX:GBPUSD', 'British Pound / US Dollar'],
          ['FX:USDCHF', 'US Dollar / Swiss Franc'],
          ['FX:USDCAD', 'US Dollar / Canadian Dollar'],
        ],
      },
    ],
    news: 'forex',
  },
];

