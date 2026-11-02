import { DotsThreeIcon as MoreHorizontal, CaretRight as ChevronRightIcon } from '@phosphor-icons/react';
import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import { cn } from '../lib/utils';

function Breadcrumb({ ...props }: React.ComponentProps<'nav'>) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        'text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs wrap-break-word sm:gap-2',
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn('inline-flex items-center gap-1.5', className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  asChild,
  render,
  className,
  children,
  ...props
}: React.ComponentProps<'a'> & {
  asChild?: boolean;
  render?: React.ReactElement<{ className?: string; children?: React.ReactNode }>;
}) {
  if (render) {
    return React.cloneElement(render, {
      ...props,
      className: cn('hover:text-foreground cursor-pointer transition-colors', className, render.props?.className),
      children: children ?? render.props?.children,
    });
  }

  const Comp = asChild ? Slot : 'a';

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn('hover:text-foreground cursor-pointer transition-colors', className)}
      {...props}
    >
      {children}
    </Comp>
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('text-foreground font-normal', className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn('text-zinc-400 [&>svg]:size-3 shrink-0', className)}
      {...props}
    >
      {children ?? <ChevronRightIcon className="size-3 text-zinc-400" />}
    </li>
  );
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn('flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors', className)}
      {...props}
    >
      <MoreHorizontal className="size-3.5" />
      <span className="sr-only">More</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
