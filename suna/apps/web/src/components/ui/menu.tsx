'use client';

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@kortix/ui/lib/utils';

export const Menu = DropdownMenuPrimitive.Root;

export interface MenuTriggerProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger> {
  render?: React.ReactElement<{ className?: string; children?: React.ReactNode }>;
}

export const MenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  MenuTriggerProps
>(({ render, children, className, asChild, ...props }, ref) => {
  if (render) {
    return (
      <DropdownMenuPrimitive.Trigger ref={ref} asChild {...props}>
        {React.cloneElement(render, {
          className: cn(render.props?.className, className),
          children: children ?? render.props?.children,
        })}
      </DropdownMenuPrimitive.Trigger>
    );
  }

  return (
    <DropdownMenuPrimitive.Trigger ref={ref} asChild={asChild} className={className} {...props}>
      {children}
    </DropdownMenuPrimitive.Trigger>
  );
});
MenuTrigger.displayName = 'MenuTrigger';

export interface MenuPopupProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {
  align?: 'start' | 'center' | 'end';
}

export const MenuPopup = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  MenuPopupProps
>(({ className, align = 'start', sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-zinc-950 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 font-sans text-xs',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
MenuPopup.displayName = 'MenuPopup';

export interface MenuItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  render?: React.ReactElement<{ className?: string; children?: React.ReactNode }>;
  inset?: boolean;
}

export const MenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  MenuItemProps
>(({ render, children, className, inset, asChild, ...props }, ref) => {
  if (render) {
    return (
      <DropdownMenuPrimitive.Item ref={ref} asChild {...props}>
        {React.cloneElement(render, {
          className: cn(
            'relative flex cursor-pointer select-none items-center rounded-lg px-2.5 py-1.5 text-xs outline-hidden transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 data-disabled:pointer-events-none data-disabled:opacity-50',
            inset && 'pl-8',
            render.props?.className,
            className,
          ),
          children: children ?? render.props?.children,
        })}
      </DropdownMenuPrimitive.Item>
    );
  }

  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      asChild={asChild}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-lg px-2.5 py-1.5 text-xs outline-hidden transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 data-disabled:pointer-events-none data-disabled:opacity-50',
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  );
});
MenuItem.displayName = 'MenuItem';

export const MenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-zinc-100 dark:bg-zinc-800', className)}
    {...props}
  />
));
MenuSeparator.displayName = 'MenuSeparator';

export const MenuGroup = DropdownMenuPrimitive.Group;
export const MenuSub = DropdownMenuPrimitive.Sub;
export const MenuSubTrigger = DropdownMenuPrimitive.SubTrigger;
export const MenuSubContent = DropdownMenuPrimitive.SubContent;

