'use client';

import * as React from 'react';
import { cn } from '@kortix/ui/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  sizeVariant?: 'sm' | 'default' | 'lg';
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, sizeVariant = 'default', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400/20 focus-visible:outline-none focus-visible:ring-0 outline-none disabled:cursor-not-allowed disabled:opacity-50 font-sans resize-y',
          sizeVariant === 'sm' && 'min-h-[60px] py-1.5 px-2.5 text-xs',
          sizeVariant === 'default' && 'min-h-[80px] py-2 px-3 text-xs',
          sizeVariant === 'lg' && 'min-h-[120px] py-2.5 px-3.5 text-sm',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

