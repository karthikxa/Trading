'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cn } from '@kortix/ui/lib/utils';

export type TabsVariant = 'default' | 'underline' | 'pills';
export type TabsSize = 'sm' | 'default' | 'lg';

const TabsListContext = React.createContext<{ size: TabsSize; variant: TabsVariant }>({
  size: 'default',
  variant: 'default',
});

export function Tabs({
  className,
  ...props
}: TabsPrimitive.Root.Props): React.ReactElement {
  return (
    <TabsPrimitive.Root
      className={cn('flex flex-col gap-3 data-[orientation=vertical]:flex-row', className)}
      data-slot="tabs"
      {...props}
    />
  );
}

export function TabsList({
  variant = 'default',
  size = 'default',
  className,
  children,
  ...props
}: TabsPrimitive.List.Props & {
  size?: TabsSize;
  variant?: TabsVariant;
}): React.ReactElement {
  return (
    <TabsListContext.Provider value={{ size, variant }}>
      <TabsPrimitive.List
        className={cn(
          'relative z-0 flex w-fit items-center gap-1 text-zinc-600',
          variant === 'default' &&
            'rounded-xl bg-zinc-100 p-1 border border-zinc-200/80',
          variant === 'underline' &&
            'border-b border-zinc-200 pb-px gap-4 bg-transparent',
          variant === 'pills' &&
            'bg-transparent gap-1.5',
          size === 'sm' && 'text-xs',
          size === 'default' && 'text-xs',
          size === 'lg' && 'text-sm',
          className,
        )}
        data-size={size}
        data-slot="tabs-list"
        {...props}
      >
        {children}
      </TabsPrimitive.List>
    </TabsListContext.Provider>
  );
}

export function TabsTab({
  className,
  size,
  children,
  ...props
}: TabsPrimitive.Tab.Props & {
  size?: TabsSize;
}): React.ReactElement {
  const ctx = React.useContext(TabsListContext);
  const resolvedSize = size ?? ctx.size;
  const variant = ctx.variant;

  return (
    <TabsPrimitive.Tab
      className={cn(
        'relative inline-flex items-center justify-center font-medium cursor-pointer select-none whitespace-nowrap transition-all duration-150 outline-none',
        // Default segmented pill
        variant === 'default' && [
          'rounded-lg px-3 py-1.5 text-zinc-600 hover:text-zinc-900',
          'data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-2xs data-[state=active]:font-semibold',
          'data-active:bg-white data-active:text-zinc-950 data-active:shadow-2xs data-active:font-semibold',
        ],
        // Underline variant
        variant === 'underline' && [
          'px-1 py-2 text-zinc-500 hover:text-zinc-900 border-b-2 border-transparent -mb-px',
          'data-[state=active]:border-zinc-950 data-[state=active]:text-zinc-950 data-[state=active]:font-semibold',
          'data-active:border-zinc-950 data-active:text-zinc-950 data-active:font-semibold',
        ],
        // Pills variant
        variant === 'pills' && [
          'rounded-lg px-3 py-1.5 border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50',
          'data-[state=active]:border-zinc-900 data-[state=active]:bg-zinc-900 data-[state=active]:text-white',
          'data-active:border-zinc-900 data-active:bg-zinc-900 data-active:text-white',
        ],
        resolvedSize === 'sm' && 'h-7 px-2.5 text-[11px]',
        resolvedSize === 'default' && 'h-8 px-3 text-xs',
        resolvedSize === 'lg' && 'h-9 px-4 text-sm',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      data-slot="tabs-tab"
      {...props}
    >
      {children}
    </TabsPrimitive.Tab>
  );
}

export function TabsPanel({
  className,
  ...props
}: TabsPrimitive.Panel.Props): React.ReactElement {
  return (
    <TabsPrimitive.Panel
      className={cn('flex-1 outline-none focus-visible:outline-none pt-1', className)}
      data-slot="tabs-panel"
      {...props}
    />
  );
}

export {
  TabsTab as TabsTrigger,
  TabsPanel as TabsContent,
};

