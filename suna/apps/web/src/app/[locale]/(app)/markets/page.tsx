import MarketsHub from '@/features/markets/MarketsHub';

export const metadata = {
  title: 'Markets & Stocks | Kortix',
  description: 'Global equities, indices, forex, crypto and watchlist',
};

export default function MarketsPage() {
  return (
    <main className="min-h-screen bg-zinc-50/40">
      <MarketsHub />
    </main>
  );
}

