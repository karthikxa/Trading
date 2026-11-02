'use client';

import * as React from 'react';
import { cn } from '@kortix/ui/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  sizeVariant?: 'sm' | 'default' | 'lg';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', sizeVariant = 'default', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/20 focus-visible:outline-none focus-visible:ring-0 outline-none disabled:cursor-not-allowed disabled:opacity-50 font-sans',
          sizeVariant === 'sm' && 'h-8 py-1.5 px-2.5 text-xs',
          sizeVariant === 'default' && 'h-9 py-2 px-3 text-xs',
          sizeVariant === 'lg' && 'h-10 py-2.5 px-3.5 text-sm',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

