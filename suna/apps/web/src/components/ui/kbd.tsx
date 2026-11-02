'use client';

import * as React from 'react';
import { cn } from '@kortix/ui/lib/utils';

export function Kbd({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded px-1 font-mono text-[11px] font-medium text-zinc-600 bg-zinc-100 border border-zinc-200 shadow-2xs select-none [&_svg]:size-3 shrink-0',
        className,
      )}
      {...props}
    />
  );
}

export function KbdGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn('inline-flex items-center gap-1 shrink-0', className)}
      {...props}
    />
  );
}

