'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar as CalendarIcon, Check, ChevronDown, Clock } from 'lucide-react';
import { cn } from '@kortix/ui/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';

const QUARTER_HOUR_SLOTS: string[] = Array.from({ length: 24 * 4 }, (_, idx) => {
  const hrs = String(Math.floor(idx / 4)).padStart(2, '0');
  const mins = String((idx % 4) * 15).padStart(2, '0');
  return `${hrs}:${mins}`;
});

/**
 * Parse a YYYY-MM-DD string into a local Date (avoiding UTC midnight day shifts).
 */
export function parseIsoDate(iso?: string | null): Date | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Format a local Date into a YYYY-MM-DD calendar key.
 */
export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatReadableDate(iso?: string | null): string {
  const date = parseIsoDate(iso);
  if (!date) return 'Pick a date';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function normalizeTimeValue(raw: string): string | null {
  const trimmed = raw.trim();
  const colonMatch = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (colonMatch) {
    const h = Number(colonMatch[1]);
    const m = Number(colonMatch[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return null;
  }
  const compactMatch = /^(\d{2})(\d{2})$/.exec(trimmed);
  if (compactMatch) {
    const h = Number(compactMatch[1]);
    const m = Number(compactMatch[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  return null;
}

interface JournalDatePickerProps {
  id?: string;
  value: string;
  onChange: (nextIsoDate: string) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * COSS UI Popover + Calendar date selector replacing native <input type="date">.
 */
export function JournalDatePicker({
  id,
  value,
  onChange,
  ariaLabel,
  className,
}: JournalDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const [viewMonth, setViewMonth] = useState<Date>(() => selectedDate ?? new Date());

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setViewMonth(selectedDate ?? new Date());
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            aria-label={ariaLabel}
            className={cn(
              'h-9 w-full flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium font-sans tabular-nums text-zinc-950 shadow-2xs',
              'hover:bg-zinc-50 hover:border-zinc-300 focus:outline-none',
              'data-[popup-open]:border-zinc-400 transition-colors cursor-pointer',
              className
            )}
          >
            <span className={selectedDate ? 'text-zinc-950' : 'text-zinc-400'}>
              {formatReadableDate(value)}
            </span>
            <CalendarIcon className="size-3.5 text-zinc-400 shrink-0" />
          </button>
        }
      />
      <PopoverPopup align="start" sideOffset={6} className="p-2.5 w-auto font-sans">
        <Calendar
          mode="single"
          captionLayout="dropdown-buttons"
          month={viewMonth}
          onMonthChange={setViewMonth}
          selected={selectedDate}
          onSelect={(day) => {
            if (day) {
              onChange(formatIsoDate(day));
              setOpen(false);
            }
          }}
          initialFocus
        />
        <div className="mt-1.5 pt-2 border-t border-zinc-100 flex items-center justify-between px-1 font-sans">
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              onChange(formatIsoDate(today));
              setViewMonth(today);
              setOpen(false);
            }}
            className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-950 px-2 py-1 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            Today
          </button>
          <span className="text-[11px] text-zinc-400 tabular-nums">{value || 'YYYY-MM-DD'}</span>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

interface JournalTimeSelectProps {
  id?: string;
  value: string;
  onChange: (nextTime: string) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Editable COSS time input + Popover preset list so traders can type exact custom times (e.g. 09:37)
 * or pick a quick 15-minute slot from the dropdown.
 */
export function JournalTimeSelect({
  id,
  value,
  onChange,
  ariaLabel,
  className,
}: JournalTimeSelectProps) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
    activeEl?.scrollIntoView({ block: 'center' });
  }, [open]);

  const timeOptions = useMemo(() => {
    const normalized = normalizeTimeValue(value);
    if (!normalized || QUARTER_HOUR_SLOTS.includes(normalized)) {
      return QUARTER_HOUR_SLOTS;
    }
    return [...QUARTER_HOUR_SLOTS, normalized].sort();
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^0-9:]/g, '').slice(0, 5);
    setDraft(sanitized);
    const parsed = normalizeTimeValue(sanitized);
    if (parsed) {
      onChange(parsed);
    }
  };

  const handleInputBlur = () => {
    const parsed = normalizeTimeValue(draft);
    if (parsed) {
      setDraft(parsed);
      onChange(parsed);
    } else {
      setDraft(value);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn('relative flex items-center w-full font-sans', className)}>
        <Clock className="pointer-events-none absolute left-3 size-3.5 text-zinc-400" />
        <input
          id={id}
          type="text"
          inputMode="numeric"
          aria-label={ariaLabel}
          value={draft}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="HH:mm"
          className={cn(
            'h-9 w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-8 text-[13px] font-medium font-sans tabular-nums text-zinc-950 shadow-2xs',
            'hover:border-zinc-300 focus:outline-none focus:border-zinc-400 transition-colors'
          )}
        />
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={`Choose ${ariaLabel || 'time'} preset`}
              className="absolute right-1 inline-flex size-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
            </button>
          }
        />
      </div>
      <PopoverPopup align="end" sideOffset={6} className="w-36 p-1 font-sans">
        <div
          ref={listRef}
          role="listbox"
          aria-label={`${ariaLabel || 'Time'} presets`}
          className="max-h-56 overflow-y-auto space-y-0.5"
        >
          {timeOptions.map((slot) => {
            const isSelected = slot === value;
            return (
              <button
                key={slot}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setDraft(slot);
                  onChange(slot);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-sans tabular-nums transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 font-medium'
                )}
              >
                <span>{slot}</span>
                {isSelected && <Check className="size-3.5 text-zinc-950 shrink-0" />}
              </button>
            );
          })}
        </div>
      </PopoverPopup>
    </Popover>
  );
}
