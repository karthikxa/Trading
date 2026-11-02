import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CURATED_SYMBOLS = [
  { symbol: 'NIFTY', description: 'Nifty 50 Index', type: 'index', exchange: 'NSE', country: 'IN' },
  { symbol: 'NIFTY', description: 'GIFT NIFTY 50 INDEX FUTURES', type: 'futures', exchange: 'NSEIX', country: 'IN' },
  { symbol: 'NIFTY', description: 'S&P CNX NIFTY INDEX FUTURES', type: 'futures', exchange: 'NSE', country: 'IN' },
  { symbol: 'BANKNIFTY', description: 'Nifty Bank Index', type: 'index', exchange: 'NSE', country: 'IN' },
  { symbol: 'CNXIT', description: 'Nifty IT Index', type: 'index', exchange: 'NSE', country: 'IN' },
  { symbol: 'CNX500', description: 'Nifty 500 Index', type: 'index', exchange: 'NSE', country: 'IN' },
  { symbol: 'CNXSMALLCAP', description: 'Nifty SmallCap 100 Index', type: 'index', exchange: 'NSE', country: 'IN' },
  { symbol: 'NIFTY_MID_SELECT', description: 'Nifty MidCap Select Index', type: 'index', exchange: 'NSE', country: 'IN' },
  { symbol: 'CNXPHARMA', description: 'Nifty Pharma Index', type: 'index', exchange: 'NSE', country: 'IN' },
  { symbol: 'NIFTYSMLCAP250', description: 'Nifty SmallCap 250 Index', type: 'index', exchange: 'NSE', country: 'IN' },
  { symbol: 'AAPL', description: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'NVDA', description: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'TSLA', description: 'Tesla, Inc.', type: 'stock', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'MSFT', description: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'AMZN', description: 'Amazon.com, Inc.', type: 'stock', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'GOOGL', description: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'META', description: 'Meta Platforms, Inc.', type: 'stock', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'BTCUSD', description: 'Bitcoin / US Dollar', type: 'crypto', exchange: 'BINANCE' },
  { symbol: 'ETHUSD', description: 'Ethereum / US Dollar', type: 'crypto', exchange: 'BINANCE' },
  { symbol: 'SOLUSD', description: 'Solana / US Dollar', type: 'crypto', exchange: 'BINANCE' },
  { symbol: 'EURUSD', description: 'Euro / US Dollar', type: 'forex', exchange: 'FX_IDC' },
  { symbol: 'GBPUSD', description: 'British Pound / US Dollar', type: 'forex', exchange: 'FX_IDC' },
  { symbol: 'USDJPY', description: 'US Dollar / Japanese Yen', type: 'forex', exchange: 'FX_IDC' },
  { symbol: 'SPX', description: 'S&P 500 Index', type: 'index', exchange: 'S&P', country: 'US' },
  { symbol: 'NDX', description: 'NASDAQ 100 Index', type: 'index', exchange: 'NASDAQ', country: 'US' },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get('text') || searchParams.get('q') || '').trim();
  const searchType = (searchParams.get('search_type') || searchParams.get('category') || '').trim();

  try {
    const url = `https://symbol-search.tradingview.com/symbol_search/v3/?text=${encodeURIComponent(
      text,
    )}&hl=1&lang=en&search_type=${encodeURIComponent(
      searchType === 'all' ? '' : searchType,
    )}&domain=production`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        Origin: 'https://www.tradingview.com',
        Referer: 'https://www.tradingview.com/',
      },
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const data = await res.json();
      const raw = Array.isArray(data?.symbols) ? data.symbols : [];
      if (raw.length > 0) {
        const cleaned = raw.map((item: Record<string, unknown>) => ({
          symbol: String(item.symbol || '').replace(/<[^>]+>/g, ''),
          description: String(item.description || item.symbol || '').replace(/<[^>]+>/g, ''),
          type: String(item.type || 'stock'),
          exchange: String(item.exchange || ''),
          country: typeof item.country === 'string' ? item.country : undefined,
        }));
        return NextResponse.json({ symbols: cleaned });
      }
    }
  } catch (err) {
    console.error('TradingView symbol search fetch failed:', err);
  }

  // Fallback to Curated Symbols filtered by query and type
  const q = text.toUpperCase();
  const filtered = CURATED_SYMBOLS.filter((s) => {
    const matchQuery = !q || s.symbol.toUpperCase().includes(q) || s.description.toUpperCase().includes(q);
    const matchType = !searchType || searchType === 'all' || s.type.toLowerCase() === searchType.toLowerCase();
    return matchQuery && matchType;
  });

  return NextResponse.json({ symbols: filtered });
}

