import { NextRequest, NextResponse } from 'next/server';
import catalogData from '@/features/journal/data/indian-market-catalog.json';

interface SymbolItem {
  symbol: string;
  name: string;
  category: string;
  exchange: string;
  logoid?: string;
}

const symbols: SymbolItem[] = catalogData as SymbolItem[];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const category = (searchParams.get('category') || 'All').trim();

  let filtered = symbols;

  if (category && category !== 'All') {
    filtered = filtered.filter((item) => item.category.toLowerCase() === category.toLowerCase());
  }

  if (q) {
    const qUpper = q.toUpperCase();
    const matches = filtered.filter(
      (item) =>
        item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    );

    // Smart relevance ranking:
    // 0: exact symbol match (e.g. RELIANCE)
    // 1: symbol prefix match (e.g. REL...)
    // 2: company name prefix match
    // 3: symbol substring match
    // 4: name substring match
    matches.sort((a, b) => {
      const aSym = a.symbol.toUpperCase();
      const bSym = b.symbol.toUpperCase();
      const aName = a.name.toUpperCase();
      const bName = b.name.toUpperCase();

      const aRank =
        aSym === qUpper
          ? 0
          : aSym.startsWith(qUpper)
            ? 1
            : aName.startsWith(qUpper)
              ? 2
              : aSym.includes(qUpper)
                ? 3
                : 4;
      const bRank =
        bSym === qUpper
          ? 0
          : bSym.startsWith(qUpper)
            ? 1
            : bName.startsWith(qUpper)
              ? 2
              : bSym.includes(qUpper)
                ? 3
                : 4;

      if (aRank !== bRank) return aRank - bRank;
      return aSym.localeCompare(bSym);
    });

    return NextResponse.json(matches.slice(0, 100));
  }

  // Return top 100 matches
  return NextResponse.json(filtered.slice(0, 100));
}
