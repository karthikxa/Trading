'use client';

import * as React from 'react';
import { DayPicker, type DropdownProps } from 'react-day-picker';
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@kortix/ui/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Custom COSS-styled combobox dropdown replacing native OS <select> for Month and Year
 * inside Calendar so dropdowns stay within Popover boundaries and never render OS chrome.
 */
function CalendarDropdown({
  value,
  onChange,
  children,
  'aria-label': ariaLabel,
}: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const options = React.useMemo(
    () =>
      React.Children.toArray(children)
        .filter(
          (child): child is React.ReactElement<{ value?: string | number; children?: React.ReactNode }> =>
            React.isValidElement(child)
        )
        .map((child) => ({
          value: String(child.props.value ?? ''),
          label: String(child.props.children ?? child.props.value ?? ''),
        })),
    [children]
  );

  const selectedOption = options.find((opt) => opt.value === String(value));

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
    activeEl?.scrollIntoView({ block: 'center' });
  }, [open]);

  const handleSelect = (nextValue: string) => {
    onChange?.({
      target: { value: nextValue },
    } as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block font-sans">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex h-7 max-w-[116px] items-center justify-between gap-1.5 rounded-lg border border-zinc-200/90 bg-white px-2.5 text-xs font-semibold text-zinc-950 shadow-2xs font-sans tabular-nums',
          'hover:bg-zinc-50 hover:border-zinc-300 focus:outline-none cursor-pointer transition-colors',
          open && 'bg-zinc-50 border-zinc-400'
        )}
      >
        <span className="truncate">{selectedOption?.label ?? value}</span>
        <ChevronDown className={cn('size-3 text-zinc-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            'absolute left-0 top-[calc(100%+4px)] z-[60] min-w-[128px] max-h-56 overflow-y-auto',
            'rounded-xl border border-zinc-200/90 bg-white p-1 text-zinc-950 shadow-xl font-sans'
          )}
        >
          {options.map((opt) => {
            const isSelected = opt.value === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-sans tabular-nums transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 font-medium'
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="size-3.5 text-zinc-950 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * COSS UI & Kortix-styled Calendar built on react-day-picker v8.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout,
  fromYear,
  toYear,
  ...props
}: CalendarProps) {
  const usesDropdowns = captionLayout === 'dropdown' || captionLayout === 'dropdown-buttons';

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      fromYear={usesDropdowns ? (fromYear ?? 2015) : fromYear}
      toYear={usesDropdowns ? (toYear ?? 2035) : toYear}
      className={cn('p-1 select-none font-sans', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'space-y-3',
        caption: 'flex justify-center pt-0.5 relative items-center min-h-8',
        caption_label: usesDropdowns
          ? 'sr-only'
          : 'text-sm font-semibold text-zinc-950 tracking-tight font-sans',
        caption_dropdowns: 'flex items-center justify-center gap-1.5 px-8',
        dropdown_month: 'inline-flex items-center',
        dropdown_year: 'inline-flex items-center',
        dropdown: 'cursor-pointer',
        nav: 'flex items-center gap-1',
        nav_button:
          'inline-flex items-center justify-center size-7 rounded-lg border border-zinc-200/80 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none',
        nav_button_previous: 'absolute left-0',
        nav_button_next: 'absolute right-0',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell:
          'text-zinc-400 rounded-md w-9 font-medium font-sans text-[11px] uppercase tracking-wider text-center',
        row: 'flex w-full mt-1',
        cell: cn(
          'relative p-0 text-center text-xs focus-within:relative focus-within:z-20',
          '[&:has([aria-selected])]:bg-zinc-100/80 [&:has([aria-selected].day-outside)]:bg-zinc-100/40',
          'first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg'
        ),
        day: 'inline-flex items-center justify-center size-9 p-0 font-medium font-sans tabular-nums text-xs rounded-lg text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer aria-selected:opacity-100',
        day_range_end: 'day-range-end',
        day_selected:
          '!bg-zinc-950 !text-white hover:!bg-zinc-900 hover:!text-white font-semibold shadow-2xs',
        day_today: 'bg-zinc-100 text-zinc-950 font-semibold ring-1 ring-inset ring-zinc-300/80',
        day_outside: 'day-outside text-zinc-300 opacity-60 hover:bg-zinc-50 hover:text-zinc-500',
        day_disabled: 'text-zinc-300 opacity-40 pointer-events-none',
        day_range_middle: 'aria-selected:bg-zinc-100 aria-selected:text-zinc-950',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="size-3.5" />,
        IconRight: () => <ChevronRight className="size-3.5" />,
        Dropdown: CalendarDropdown,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';
