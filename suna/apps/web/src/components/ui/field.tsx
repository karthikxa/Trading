'use client';

import * as React from 'react';
import { cn } from '@kortix/ui/lib/utils';

export function Field({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="group"
      className={cn('flex flex-col gap-1.5 w-full', className)}
      {...props}
    />
  );
}

export function FieldLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-xs font-semibold text-zinc-700 leading-snug', className)}
      {...props}
    />
  );
}

export function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-[11px] text-zinc-500 leading-normal', className)}
      {...props}
    />
  );
}

export function FieldError({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-[11px] font-medium text-red-600 leading-normal', className)}
      {...props}
    />
  );
}

