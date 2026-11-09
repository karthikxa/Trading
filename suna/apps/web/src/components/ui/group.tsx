'use client';

import * as React from 'react';
import { cn } from '@kortix/ui';

export interface GroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'default' | 'lg';
}

export const Group = React.forwardRef<HTMLDivElement, GroupProps>(
  ({ className, orientation = 'horizontal', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="group"
        data-orientation={orientation}
        className={cn(
          'inline-flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 shadow-2xs isolate',
          orientation === 'vertical' ? 'flex-col' : 'flex-row',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Group.displayName = 'Group';

export const GroupSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="separator"
      className={cn('h-4 w-px bg-zinc-200 shrink-0 self-center mx-0.5', className)}
      {...props}
    />
  );
});
GroupSeparator.displayName = 'GroupSeparator';

export default Group;

