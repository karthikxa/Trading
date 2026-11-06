import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { WarningCircleIcon, InfoIcon, CheckCircleIcon, WarningIcon } from '@phosphor-icons/react';

const alertVariants = cva(
  'relative w-full rounded-2xl border p-3.5 text-sm transition-colors [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-3.5 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-white text-zinc-900 border-zinc-200/90 shadow-2xs',
        destructive:
          'border-red-200/80 bg-red-50/60 text-red-950 [&>svg]:text-red-600 shadow-2xs',
        info: 'border-blue-200/80 bg-blue-50/60 text-blue-950 [&>svg]:text-blue-600 shadow-2xs',
        success:
          'border-emerald-200/80 bg-emerald-50/60 text-emerald-950 [&>svg]:text-emerald-600 shadow-2xs',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, children, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  >
    {variant === 'destructive' ? (
      <WarningCircleIcon className="size-4 shrink-0 text-red-600" weight="fill" />
    ) : variant === 'info' ? (
      <InfoIcon className="size-4 shrink-0 text-blue-600" weight="fill" />
    ) : variant === 'success' ? (
      <CheckCircleIcon className="size-4 shrink-0 text-emerald-600" weight="fill" />
    ) : null}
    {children}
  </div>
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-semibold leading-none tracking-tight text-xs', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-xs text-zinc-600 [&_p]:leading-relaxed space-y-1', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };

