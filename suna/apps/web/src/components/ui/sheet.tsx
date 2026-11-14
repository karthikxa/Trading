'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@kortix/ui/lib/utils';
import { X } from 'lucide-react';

export const Sheet = DialogPrimitive.Root;

export interface SheetTriggerProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger> {
  render?: React.ReactElement<{ className?: string; children?: React.ReactNode }>;
}

export const SheetTrigger = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Trigger>,
  SheetTriggerProps
>(({ render, children, className, asChild, ...props }, ref) => {
  if (render) {
    return (
      <DialogPrimitive.Trigger ref={ref} asChild {...props}>
        {React.cloneElement(render, {
          className: cn(render.props?.className, className),
          children: children ?? render.props?.children,
        })}
      </DialogPrimitive.Trigger>
    );
  }

  return (
    <DialogPrimitive.Trigger ref={ref} asChild={asChild} className={className} {...props}>
      {children}
    </DialogPrimitive.Trigger>
  );
});
SheetTrigger.displayName = 'SheetTrigger';

export interface SheetCloseProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close> {
  render?: React.ReactElement<{ className?: string; children?: React.ReactNode; onClick?: React.MouseEventHandler }>;
}

export const SheetClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  SheetCloseProps
>(({ render, children, className, asChild, ...props }, ref) => {
  if (render) {
    return (
      <DialogPrimitive.Close ref={ref} asChild {...props}>
        {React.cloneElement(render, {
          className: cn(render.props?.className, className),
          children: children ?? render.props?.children,
        })}
      </DialogPrimitive.Close>
    );
  }

  return (
    <DialogPrimitive.Close ref={ref} asChild={asChild} className={className} {...props}>
      {children}
    </DialogPrimitive.Close>
  );
});
SheetClose.displayName = 'SheetClose';

export interface SheetPopupProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: 'top' | 'right' | 'bottom' | 'left';
  showCloseButton?: boolean;
  overlayClassName?: string;
  hideOverlay?: boolean;
}

export const SheetPopup = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetPopupProps
>(({ className, children, side = 'right', showCloseButton = true, overlayClassName, hideOverlay = false, ...props }, ref) => (
  <DialogPrimitive.Portal>
    {!hideOverlay && (
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-black/10 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          overlayClassName,
        )}
      />
    )}
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-y-0 right-0 z-50 flex h-full w-full sm:max-w-md flex-col bg-white border-l border-zinc-200/90 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right font-sans outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0',
        side === 'left' && 'right-auto left-0 border-r border-l-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
        side === 'top' && 'inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        side === 'bottom' && 'inset-x-0 bottom-0 top-auto h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetPopup.displayName = 'SheetPopup';

export const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1 p-5 border-b border-zinc-100 bg-zinc-50/70', className)} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base font-semibold text-zinc-950 tracking-tight leading-none', className)}
    {...props}
  />
));
SheetTitle.displayName = 'SheetTitle';

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-xs text-zinc-500', className)}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';

export const SheetPanel = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex-1 overflow-y-auto p-5 space-y-4 [scrollbar-width:thin]', className)} {...props} />
);
SheetPanel.displayName = 'SheetPanel';

export const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex items-center justify-end gap-2 p-4 border-t border-zinc-100 bg-zinc-50/70', className)}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

