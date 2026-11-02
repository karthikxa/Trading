'use client';

import React, { useEffect, useState } from 'react';
import { Pin } from 'lucide-react';
import { toast } from 'sonner';
import { isSymbolInWatchlist, toggleWatchlistSymbol } from './watchlist.store';
import { cn } from '@kortix/ui';

interface WatchlistButtonProps {
  symbol: string;
  name?: string;
  exchange?: string;
  variant?: 'button' | 'icon';
  className?: string;
  onWatchlistChange?: (symbol: string, added: boolean) => void;
}

export const WatchlistButton = ({
  symbol,
  name,
  exchange,
  variant = 'icon',
  className,
  onWatchlistChange,
}: WatchlistButtonProps) => {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    setPinned(isSymbolInWatchlist(symbol));
    const onUpdate = () => setPinned(isSymbolInWatchlist(symbol));
    window.addEventListener('watchlist-updated', onUpdate);
    return () => window.removeEventListener('watchlist-updated', onUpdate);
  }, [symbol]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const added = toggleWatchlistSymbol(symbol, name, exchange);
    setPinned(added);
    if (added) {
      toast.success(`Pinned ${symbol} to watchlist`);
    } else {
      toast.success(`Unpinned ${symbol} from watchlist`);
    }
    onWatchlistChange?.(symbol, added);
  };

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-black transition-colors cursor-pointer',
          className,
        )}
      >
        <Pin className={cn('size-4 fill-white text-white', !pinned && 'fill-none')} />
        <span>{pinned ? 'Pinned' : 'Pin Symbol'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={pinned ? `Unpin ${symbol}` : `Pin ${symbol}`}
      title={pinned ? `Unpin ${symbol}` : `Pin ${symbol}`}
      className={cn(
        'inline-flex items-center justify-center size-8 rounded-lg text-zinc-900 transition-colors hover:bg-zinc-100 cursor-pointer',
        className,
      )}
    >
      <Pin
        className={cn(
          'size-4 text-zinc-950 transition-all',
          pinned ? 'fill-zinc-950 stroke-zinc-950 scale-110' : 'fill-none stroke-zinc-950 opacity-70 hover:opacity-100',
        )}
      />
    </button>
  );
};

export default WatchlistButton;

