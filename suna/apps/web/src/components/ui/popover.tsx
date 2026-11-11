'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from '@kortix/ui/lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export interface PopoverPopupProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Popup> {
  side?: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Positioner>['side'];
  align?: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Positioner>['align'];
  sideOffset?: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Positioner>['sideOffset'];
  alignOffset?: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Positioner>['alignOffset'];
}

/**
 * Floating COSS-styled popover surface built on @base-ui/react/popover.
 */
export const PopoverPopup = React.forwardRef<HTMLDivElement, PopoverPopupProps>(
  (
    {
      className,
      children,
      side = 'bottom',
      align = 'center',
      sideOffset = 6,
      alignOffset = 0,
      ...props
    },
    ref
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className="z-50 outline-none"
      >
        <PopoverPrimitive.Popup
          ref={ref}
          className={cn(
            'z-50 rounded-xl border border-zinc-200/90 bg-white p-3 text-zinc-950 shadow-xl outline-none',
            'origin-(--transform-origin) transition-[transform,opacity] duration-150 ease-out',
            'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
            className
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
);
PopoverPopup.displayName = 'PopoverPopup';

export const PopoverContent = PopoverPopup;

export const PopoverTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Title>
>(({ className, ...props }, ref) => (
  <PopoverPrimitive.Title
    ref={ref}
    className={cn('text-sm font-semibold text-zinc-950 tracking-tight', className)}
    {...props}
  />
));
PopoverTitle.displayName = 'PopoverTitle';

export const PopoverDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Description>
>(({ className, ...props }, ref) => (
  <PopoverPrimitive.Description
    ref={ref}
    className={cn('text-xs text-zinc-500', className)}
    {...props}
  />
));
PopoverDescription.displayName = 'PopoverDescription';

