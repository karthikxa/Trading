'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';

import { Close } from '../icons/close';
import { withPortalContainer } from '../lib/portal-container';
import { cn } from '../lib/utils';
import { useUiStrings } from '../providers/ui-provider';
import {
  dialogContentZ,
  DialogDepthProvider,
  dialogOverlayZ,
  useDialogDepth,
  useDialogRootLayer,
} from '../lib/z-stack';
import { cva, VariantProps } from 'class-variance-authority';
import { buttonVariants } from './button';
import { triggerVariants, type TriggerVariantProps } from './trigger-variants';

/** @deprecated In feature code use `Modal` (`@kortix/ui/modal`). `Dialog` is the primitive other components build on. */
const Dialog = ({ open, defaultOpen, onOpenChange, ...props }: DialogPrimitive.DialogProps) => {
  const layer = useDialogRootLayer({ open, defaultOpen, onOpenChange });

  return (
    <DialogDepthProvider depth={layer.depth}>
      <DialogPrimitive.Root {...props} open={layer.open} onOpenChange={layer.onOpenChange} />
    </DialogDepthProvider>
  );
};

const DialogTrigger = ({
  className,
  variant,
  size,
  asChild,
  render,
  children,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Trigger>, 'size'> &
  TriggerVariantProps & {
    render?: React.ReactElement<{ className?: string; children?: React.ReactNode }>;
  }) => {
  if (render) {
    return (
      <DialogPrimitive.Trigger asChild {...props}>
        {React.cloneElement(render, {
          className: cn(render.props?.className, className),
          children: children ?? render.props?.children,
        })}
      </DialogPrimitive.Trigger>
    );
  }

  return (
    <DialogPrimitive.Trigger
      asChild={asChild}
      // With `asChild` the child owns its styling — merging ours would double it.
      className={asChild ? className : cn(triggerVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Trigger>
  );
};

const DialogPortal = withPortalContainer(DialogPrimitive.Portal);

const DialogClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close> & {
    render?: React.ReactElement<{ className?: string; children?: React.ReactNode; onClick?: React.MouseEventHandler }>;
  }
>(({ render, children, asChild, className, ...props }, ref) => {
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

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, style, ...props }, ref) => {
  const depth = useDialogDepth();

  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 bg-black/65 backdrop-blur-xs duration-moderate',
        className,
      )}
      style={{ zIndex: dialogOverlayZ(depth), ...style }}
      {...props}
    />
  );
});
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogVariants = cva(
  cn(
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 border p-5 shadow-lg duration-moderate sm:max-w-lg sm:rounded-lg',
  ),
  {
    variants: {
      variant: {
        default: 'bg-sidebar border-muted/60',
        transparent: 'bg-transparent border-none p-0',
      },
    },
    defaultVariants: {
      variant: 'transparent',
    },
  },
);

/** @deprecated In feature code use `ModalContent` (`@kortix/ui/modal`). */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> &
    VariantProps<typeof DialogVariants> & {
      hideCloseButton?: boolean;
      showOverlay?: boolean;
      overlayClassName?: string;
    }
>(
  (
    {
      className,
      children,
      hideCloseButton = false,
      showOverlay = true,
      overlayClassName,
      style,
      ...props
    },
    ref,
  ) => {
    const depth = useDialogDepth();
    const strings = useUiStrings();

    return (
      <DialogPortal>
        {showOverlay && <DialogOverlay className={overlayClassName} />}
        <DialogPrimitive.Content
          ref={ref}
          className={cn(DialogVariants({ variant: 'default' }), className)}
          style={{ zIndex: dialogContentZ(depth), ...style }}
          {...props}
        >
          {children}
          {!hideCloseButton && (
            <DialogPrimitive.Close
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                'absolute top-3 right-3',
              )}
            >
              <Close className="h-4 w-4" />
              <span className="sr-only">{strings.close}</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  },
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg leading-none font-semibold tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-muted-foreground text-sm', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

const DialogPopup = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, ...props }, ref) => (
  <DialogContent
    ref={ref}
    className={cn('rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-2xl outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0', className)}
    {...props}
  />
));
DialogPopup.displayName = 'DialogPopup';

const DialogPanel = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('grid gap-4 py-2', className)} {...props} />
);
DialogPanel.displayName = 'DialogPanel';

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPanel,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
