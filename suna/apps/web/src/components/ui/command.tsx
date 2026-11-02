'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@kortix/ui/lib/utils';

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

interface CommandContextValue {
  search: string;
  setSearch: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  items?: any[];
  activeValue: string | null;
  setActiveValue: (val: string | null) => void;
}

const CommandContext = React.createContext<CommandContextValue | null>(null);

export function useCommandContext() {
  const ctx = React.useContext(CommandContext);
  if (!ctx) {
    throw new Error('Command components must be used within Command / CommandDialog');
  }
  return ctx;
}

export interface CommandDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function CommandDialog({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: CommandDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange?.(nextOpen);
      setInternalOpen(nextOpen);
    },
    [onOpenChange],
  );

  const [search, setSearch] = React.useState('');
  const [activeValue, setActiveValue] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setSearch('');
      setActiveValue(null);
    }
  }, [open]);

  return (
    <CommandContext.Provider
      value={{
        search,
        setSearch,
        open,
        setOpen,
        activeValue,
        setActiveValue,
      }}
    >
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        {children}
      </DialogPrimitive.Root>
    </CommandContext.Provider>
  );
}

export interface CommandDialogTriggerProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger> {
  render?: React.ReactElement<{ className?: string; children?: React.ReactNode; onClick?: React.MouseEventHandler }>;
}

export const CommandDialogTrigger = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Trigger>,
  CommandDialogTriggerProps
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
CommandDialogTrigger.displayName = 'CommandDialogTrigger';

export interface CommandDialogPopupProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  'aria-label'?: string;
}

export const CommandDialogPopup = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  CommandDialogPopupProps
>(({ className, children, 'aria-label': ariaLabel = 'Search dialog', ...props }, ref) => {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200" />
      <DialogPrimitive.Content
        ref={ref}
        aria-label={ariaLabel}
        className={cn(
          'fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 font-sans outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0',
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">{ariaLabel}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">
          Search and select from the list
        </DialogPrimitive.Description>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
CommandDialogPopup.displayName = 'CommandDialogPopup';

export interface CommandProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: any[];
}

export function Command({ items, className, children, ...props }: CommandProps) {
  const ctx = React.useContext(CommandContext);
  const [internalSearch, setInternalSearch] = React.useState('');
  const [internalActiveValue, setInternalActiveValue] = React.useState<string | null>(null);

  const value: CommandContextValue = React.useMemo(() => {
    if (ctx) {
      return {
        ...ctx,
        items: items ?? ctx.items,
      };
    }
    return {
      search: internalSearch,
      setSearch: setInternalSearch,
      open: true,
      setOpen: () => {},
      items,
      activeValue: internalActiveValue,
      setActiveValue: setInternalActiveValue,
    };
  }, [ctx, items, internalSearch, internalActiveValue]);

  return (
    <CommandContext.Provider value={value}>
      <div
        className={cn('flex flex-col h-full w-full bg-white text-zinc-950 overflow-hidden', className)}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  );
}

export interface CommandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, placeholder = 'Search...', ...props }, ref) => {
    const { search, setSearch } = useCommandContext();
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-100 bg-white">
        <SearchIcon className="size-4 text-zinc-400 shrink-0" />
        <input
          ref={ref}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none border-none font-sans',
            className,
          )}
          autoFocus
          {...props}
        />
      </div>
    );
  },
);
CommandInput.displayName = 'CommandInput';

export function CommandPanel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'p-2 max-h-[380px] overflow-y-auto overscroll-contain outline-none focus:outline-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-200/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CommandEmpty({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { search, items } = useCommandContext();

  const isFilteredOut = React.useMemo(() => {
    if (!search.trim()) return false;
    if (!items || !Array.isArray(items)) return false;
    const q = search.toLowerCase().trim();
    const isGrouped = items.length > 0 && Array.isArray(items[0]?.items);

    if (isGrouped) {
      return !items.some((group: any) =>
        (group.items || []).some(
          (it: any) =>
            it.label?.toLowerCase().includes(q) ||
            it.value?.toLowerCase().includes(q) ||
            it.role?.toLowerCase().includes(q) ||
            it.description?.toLowerCase().includes(q),
        ),
      );
    }

    return !items.some(
      (it: any) =>
        it.label?.toLowerCase().includes(q) ||
        it.value?.toLowerCase().includes(q) ||
        it.role?.toLowerCase().includes(q) ||
        it.description?.toLowerCase().includes(q),
    );
  }, [search, items]);

  if (!isFilteredOut && search.trim() !== '' && (!items || items.length === 0)) {
    return null;
  }

  if (isFilteredOut) {
    return (
      <div
        className={cn('py-8 text-center text-xs text-zinc-400 font-sans', className)}
        {...props}
      >
        {children ?? 'No results found.'}
      </div>
    );
  }

  return null;
}

export interface CommandListProps {
  className?: string;
  children?: React.ReactNode | ((itemOrGroup: any, index: number) => React.ReactNode);
}

export function CommandList({ className, children }: CommandListProps) {
  const { items, search } = useCommandContext();

  if (typeof children === 'function' && Array.isArray(items)) {
    const q = search.toLowerCase().trim();
    const isGrouped = items.length > 0 && Array.isArray(items[0]?.items);

    if (isGrouped) {
      const filteredGroups = items
        .map((group: any) => {
          const matched = (group.items || []).filter(
            (it: any) =>
              !q ||
              it.label?.toLowerCase().includes(q) ||
              it.value?.toLowerCase().includes(q) ||
              it.role?.toLowerCase().includes(q) ||
              it.description?.toLowerCase().includes(q),
          );
          return { ...group, items: matched };
        })
        .filter((group: any) => group.items.length > 0);

      return (
        <div className={cn('flex flex-col gap-1', className)}>
          {filteredGroups.map((group, idx) => children(group, idx))}
        </div>
      );
    } else {
      // Flat list pattern (e.g. p-command-1 single list)
      const matched = items.filter(
        (it: any) =>
          !q ||
          it.label?.toLowerCase().includes(q) ||
          it.value?.toLowerCase().includes(q) ||
          it.role?.toLowerCase().includes(q) ||
          it.description?.toLowerCase().includes(q),
      );

      return (
        <div className={cn('flex flex-col gap-0.5', className)}>
          {matched.map((item, idx) => children(item, idx))}
        </div>
      );
    }
  }

  return <div className={cn('flex flex-col gap-1', className)}>{children}</div>;
}

interface GroupContextValue {
  items?: any[];
}
const GroupContext = React.createContext<GroupContextValue>({});

export interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: any[];
}

export function CommandGroup({ items, className, children, ...props }: CommandGroupProps) {
  return (
    <GroupContext.Provider value={{ items }}>
      <div className={cn('py-1', className)} {...props}>
        {children}
      </div>
    </GroupContext.Provider>
  );
}

export function CommandGroupLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-2.5 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider', className)}
      {...props}
    />
  );
}

export interface CommandCollectionProps {
  children: (item: any) => React.ReactNode;
}

export function CommandCollection({ children }: CommandCollectionProps) {
  const { items } = React.useContext(GroupContext);
  if (!items || !Array.isArray(items)) return null;

  return <>{items.map((item) => children(item))}</>;
}

export interface CommandItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  disabled?: boolean;
}

export function CommandItem({
  value,
  disabled = false,
  className,
  onClick,
  children,
  ...props
}: CommandItemProps) {
  return (
    <div
      role="option"
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        'group flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer select-none outline-none focus:outline-none',
        disabled && 'pointer-events-none opacity-40',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CommandSeparator({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) {
  return <hr className={cn('my-1 border-t border-zinc-100', className)} {...props} />;
}

export function CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('ml-auto font-mono text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-600', className)}
      {...props}
    />
  );
}

export function CommandFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/70 text-[11px] text-zinc-500 rounded-b-2xl select-none',
        className,
      )}
      {...props}
    />
  );
}
