'use client';

import React from 'react';
import { MARKETS } from './markets';
import type { MarketId } from './types';
import { cn } from '@kortix/ui';

interface MarketSwitcherProps {
  active: MarketId;
  onChange: (id: MarketId) => void;
  className?: string;
}

export default function MarketSwitcher({ active, onChange, className }: MarketSwitcherProps) {
  return (
    <div className={cn('overflow-x-auto pb-1 [scrollbar-width:none]', className)}>
      <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100/90 border border-zinc-200/80 shadow-2xs">
        {MARKETS.map((m) => {
          const isActive = active === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                isActive
                  ? 'bg-white text-zinc-950 shadow-xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50',
              )}
            >
              {m.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

