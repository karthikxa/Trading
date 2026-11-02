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
    name: 'India',
    short: 'IN',
    timeZone: 'Asia/Kolkata',
    hours: { open: hm(9, 15), close: hm(15, 30) },
    feed: 'End of day',
    pulse: [
      { symbol: 'BSE:SENSEX', label: 'Sensex' },
      { symbol: 'BSE:RELIANCE', label: 'Reliance' },
      { symbol: 'BSE:TCS', label: 'TCS' },
      { symbol: 'BSE:HDFCBANK', label: 'HDFC Bank' },
    ],
    groups: [
      {
        title: 'Banks & Financial',
        symbols: [
          ['BSE:HDFCBANK', 'HDFC Bank'],
          ['BSE:ICICIBANK', 'ICICI Bank'],
          ['BSE:SBIN', 'State Bank of India'],
          ['BSE:KOTAKBANK', 'Kotak Mahindra'],
        ],
      },
      {
        title: 'Technology & Giants',
        symbols: [
          ['BSE:TCS', 'TCS'],
          ['BSE:INFY', 'Infosys'],
          ['BSE:RELIANCE', 'Reliance'],
          ['BSE:LT', 'Larsen & Toubro'],
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

