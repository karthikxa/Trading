'use client';

import * as React from 'react';
import { cn } from '@kortix/ui/lib/utils';

export function Form({
  className,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) {
  return <form className={cn('contents', className)} {...props} />;
}

