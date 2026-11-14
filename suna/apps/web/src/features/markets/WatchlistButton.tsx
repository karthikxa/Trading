'use client';

import React, { useEffect, useState } from 'react';
import KortixPinIcon from './KortixPinIcon';
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
          'inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer',
          className,
        )}
      >
        <KortixPinIcon className="size-3.5 text-current" filled={pinned} />
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
        'inline-flex items-center justify-center size-8 rounded-lg transition-colors hover:bg-muted cursor-pointer',
        pinned ? 'text-foreground' : 'text-muted-foreground opacity-50 hover:opacity-100',
        className,
      )}
    >
      <KortixPinIcon
        className={cn(
          'size-4 transition-transform',
          pinned ? 'text-foreground scale-105' : 'text-muted-foreground'
        )}
        filled={pinned}
      />
    </button>
  );
};

export default WatchlistButton;
