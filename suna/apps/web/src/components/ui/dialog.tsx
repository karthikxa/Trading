'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@kortix/ui/lib/utils';
import { X } from 'lucide-react';

export const Dialog = DialogPrimitive.Root;

export interface DialogTriggerProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger> {
  render?: React.ReactElement<{ className?: string; children?: React.ReactNode }>;
}

export const DialogTrigger = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Trigger>,
  DialogTriggerProps
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
DialogTrigger.displayName = 'DialogTrigger';

export interface DialogCloseProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close> {
  render?: React.ReactElement<{ className?: string; children?: React.ReactNode; onClick?: React.MouseEventHandler }>;
}

export const DialogClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  DialogCloseProps
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
DialogClose.displayName = 'DialogClose';

export interface DialogPopupProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  showCloseButton?: boolean;
}

export const DialogPopup = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogPopupProps
>(({ className, children, showCloseButton = true, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0',
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
DialogPopup.displayName = 'DialogPopup';

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base font-semibold text-zinc-950 tracking-tight leading-none', className)}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-xs text-zinc-500', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

export const DialogPanel = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('grid gap-4 py-2', className)} {...props} />
);
DialogPanel.displayName = 'DialogPanel';

export const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex items-center justify-end gap-2 pt-2', className)}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

