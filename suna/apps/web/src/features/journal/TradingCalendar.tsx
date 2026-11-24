'use client';

import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Plus,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { CurrencyMode, JournalTrade } from './types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Group, GroupSeparator } from '@/components/ui/group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import { formatIsoDate, parseIsoDate } from './JournalDateTimeFields';
import { RightPanelGlyph } from './DayDetailsDrawer';
import { cn } from '@kortix/ui/lib/utils';

interface TradingCalendarProps {
  currentYear: number;
  currentMonth: number; // 0-indexed (0 = Jan, 1 = Feb, etc.)
  trades: JournalTrade[];
  selectedDate: string | null;
  currencyMode: CurrencyMode;
  drawerOpen?: boolean;
  isSyncingDhan?: boolean;
  onSyncDhan?: () => void;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onJumpThisMonth: () => void;
  onSelectYearMonth: (year: number, month: number) => void;
  onCurrencyModeChange: (mode: CurrencyMode) => void;
  onAddTrade: () => void;
  onToggleDrawer?: () => void;
}

// Local date string formatter without timezone shifting
function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const TradingCalendar = React.memo(function TradingCalendar({
  currentYear,
  currentMonth,
  trades,
  selectedDate,
  currencyMode,
  drawerOpen,
  isSyncingDhan,
  onSyncDhan,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onJumpThisMonth,
  onSelectYearMonth,
  onCurrencyModeChange,
  onAddTrade,
  onToggleDrawer,
}: TradingCalendarProps) {
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric' }
  );

  const calendarMonthDate = useMemo(
    () => new Date(currentYear, currentMonth, 1),
    [currentYear, currentMonth]
  );

  const selectedDateObj = useMemo(() => parseIsoDate(selectedDate), [selectedDate]);

  const now = new Date();
  const todayStr = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());

  // Helper to format currency/return
  const formatValue = (pnl: number, r: number) => {
    if (currencyMode === 'R') {
      const sign = r >= 0 ? '+' : '';
      return `${sign}${r.toFixed(2)}R`;
    }
    if (currencyMode === '%') {
      const pct = (pnl / 100000) * 100;
      const sign = pct >= 0 ? '+' : '';
      return `${sign}${pct.toFixed(2)}%`;
    }
    const sign = pnl >= 0 ? '+' : '-';
    return `${sign}₹${Math.abs(pnl).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Ultra-compact formatter for mobile phones (< 430px) so 7-column calendar strictly fits without blowout
  const formatCompactValue = (pnl: number, r: number) => {
    if (currencyMode === 'R') {
      const sign = r >= 0 ? '+' : '';
      return `${sign}${r.toFixed(1)}R`;
    }
    if (currencyMode === '%') {
      const pct = (pnl / 100000) * 100;
      const sign = pct >= 0 ? '+' : '';
      return `${sign}${pct.toFixed(1)}%`;
    }
    const sign = pnl >= 0 ? '+' : '-';
    const abs = Math.abs(pnl);
    if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}k`;
    return `${sign}₹${Math.round(abs)}`;
  };

  // Group trades by date (YYYY-MM-DD) with sub-0.05ms memoization
  const tradesByDate = useMemo(() => {
    const map: Record<string, JournalTrade[]> = {};
    for (let i = 0; i < trades.length; i++) {
      const t = trades[i];
      if (!map[t.entryDate]) map[t.entryDate] = [];
      map[t.entryDate].push(t);
    }
    return map;
  }, [trades]);

  // Calculate Calendar Days (Mon - Sun layout) with memoization
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = lastDayOfMonth.getDate();

    // Previous month trailing days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const cells: {
      cellId: string;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
    }[] = [];

    // Trailing previous month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = formatDateKey(prevYear, prevMonth, d);
      cells.push({
        cellId: `prev-${dateStr}`,
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
      });
    }

    // Current month active days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDateKey(currentYear, currentMonth, d);
      cells.push({
        cellId: `curr-${dateStr}`,
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
      });
    }

    // Next month leading days (to fill 35 or 42 grid cells)
    const totalCellsNeeded = cells.length <= 35 ? 35 : 42;
    const remaining = totalCellsNeeded - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = formatDateKey(nextYear, nextMonth, d);
      cells.push({
        cellId: `next-${dateStr}`,
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  const weekHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Card className="bg-white border-zinc-200/90 rounded-2xl shadow-2xs flex flex-col font-sans overflow-hidden p-0 gap-0">
      {/* ========================================================================= */}
      {/* CALENDAR CONTROLS BAR (COSS UI Components)                                */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-3 px-2.5 sm:px-5 py-2 sm:py-3.5 border-b border-zinc-200/80 bg-white">
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onPrevMonth}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg text-zinc-600 hover:text-zinc-950 border-zinc-200 shrink-0"
            title="Previous month"
          >
            <ChevronLeft className="size-3.5 sm:size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onNextMonth}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg text-zinc-600 hover:text-zinc-950 border-zinc-200 shrink-0"
            title="Next month"
          >
            <ChevronRight className="size-3.5 sm:size-4" />
          </Button>

          <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  aria-label="Open calendar date picker"
                  className="ml-0.5 sm:ml-1 inline-flex h-7 sm:h-8 items-center gap-1 sm:gap-2 rounded-lg px-1.5 sm:px-2.5 text-xs sm:text-base font-bold text-zinc-950 tracking-tight hover:bg-zinc-100/90 data-[popup-open]:bg-zinc-100 transition-colors cursor-pointer min-w-0 truncate"
                >
                  <CalendarIcon className="size-3.5 sm:size-4 text-zinc-500 shrink-0" />
                  <span className="truncate">{monthName}</span>
                  <ChevronDown className="size-3 sm:size-3.5 text-zinc-400 shrink-0" />
                </button>
              }
            />
            <PopoverPopup align="start" sideOffset={8} className="p-2.5 w-auto">
              <Calendar
                mode="single"
                captionLayout="dropdown-buttons"
                month={calendarMonthDate}
                onMonthChange={(nextMonth) => {
                  onSelectYearMonth(nextMonth.getFullYear(), nextMonth.getMonth());
                }}
                selected={selectedDateObj}
                onSelect={(day) => {
                  if (day) {
                    onSelectYearMonth(day.getFullYear(), day.getMonth());
                    onSelectDate(formatIsoDate(day));
                    setMonthPickerOpen(false);
                  }
                }}
                initialFocus
              />
              <div className="mt-1.5 pt-2 border-t border-zinc-100 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => {
                    onJumpThisMonth();
                    setMonthPickerOpen(false);
                  }}
                  className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-950 px-2 py-1 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Today
                </button>
                <span className="text-[11px] text-zinc-400">Pick month or date</span>
              </div>
            </PopoverPopup>
          </Popover>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onJumpThisMonth}
            className="hidden md:inline-flex h-7 sm:h-8 px-2 sm:px-3 text-xs rounded-lg bg-white hover:bg-zinc-50 text-zinc-800 font-semibold border-zinc-200 shadow-2xs cursor-pointer"
          >
            This Month
          </Button>

          {/* Filter Popover for Currency, Perc, Ratio (% RS R) */}
          <Popover>
            <PopoverTrigger
              type="button"
              className={cn(
                'inline-flex items-center gap-1 sm:gap-1.5 rounded-lg border border-border/70 bg-card px-2 sm:px-3 py-1 text-xs font-medium text-foreground shadow-2xs hover:bg-muted/50 transition-colors cursor-pointer font-sans h-7 sm:h-8 shrink-0'
              )}
            >
              <Filter className="size-3 sm:size-3.5 text-muted-foreground" />
              <span className="hidden xs:inline">Filter</span>
            </PopoverTrigger>
            <PopoverPopup align="end" className="w-56 p-3 flex flex-col gap-2.5 border border-border/80 bg-card shadow-xl rounded-xl font-sans z-50">
              <span className="text-xs font-semibold text-foreground">Return / Currency Filter</span>
              <div className="flex flex-col gap-1">
                {[
                  { mode: '₹' as CurrencyMode, label: 'Currency (₹ / RS)', desc: 'Show absolute net rupee profit and loss' },
                  { mode: '%' as CurrencyMode, label: 'Perc (%)', desc: 'Show percentage return on trading capital' },
                  { mode: 'R' as CurrencyMode, label: 'Ratio (R)', desc: 'Show risk-multiple return relative to R' },
                ].map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => onCurrencyModeChange(item.mode)}
                    className={cn(
                      'flex flex-col text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer',
                      (currencyMode === item.mode || (item.mode === '₹' && currencyMode === '$'))
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <span className="text-xs font-medium">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">{item.desc}</span>
                  </button>
                ))}
              </div>
            </PopoverPopup>
          </Popover>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onAddTrade}
            className="bg-zinc-950 hover:bg-zinc-800 text-white font-medium shadow-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3 rounded-lg cursor-pointer shrink-0 text-xs sm:text-sm"
          >
            <Plus className="size-3.5" />
            <span className="hidden xs:inline">Add Trade</span>
            <span className="xs:hidden">Add</span>
          </Button>

          {onToggleDrawer && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onToggleDrawer}
              aria-label={drawerOpen ? 'Close side panel' : 'Open side panel'}
              title={drawerOpen ? 'Close side panel' : 'Open side panel'}
              className="size-7 sm:size-8 rounded-lg border-zinc-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 cursor-pointer shadow-2xs shrink-0 flex items-center justify-center"
            >
              <RightPanelGlyph className="size-3.5 sm:size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7-COLUMN WEEKDAY HEADERS (Boxed Strip)                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/75 text-center text-[11px] sm:text-xs font-semibold text-zinc-500 divide-x divide-zinc-200/70">
        {weekHeaders.map((day) => (
          <div key={day} className="py-1.5 sm:py-2.5">
            <span className="sm:hidden">{day[0]}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* BOXED CALENDAR GRID (Mon - Sun)                                           */}
      {/* ========================================================================= */}
      <div className="p-1 sm:p-4 bg-zinc-50/30">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map((cell) => {
            const dayTrades = tradesByDate[cell.dateStr] || [];
            const hasTrades = dayTrades.length > 0;
            const dayPnl = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
            const dayR = dayTrades.reduce((acc, t) => acc + (t.returnR || 0), 0);
            const isProfitable = dayPnl >= 0;
            const isSelected = selectedDate === cell.dateStr;
            const isToday = todayStr === cell.dateStr;

            return (
              <div
                key={cell.cellId}
                onClick={() => onSelectDate(cell.dateStr)}
                className={`min-h-[58px] sm:min-h-[125px] p-1 sm:p-2.5 rounded-lg sm:rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative select-none ${!cell.isCurrentMonth
                    ? 'bg-zinc-100/40 border-zinc-200/50 text-zinc-400 opacity-40'
                    : hasTrades
                      ? isProfitable
                        ? isSelected
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 ring-1 ring-emerald-300/40 shadow-xs'
                          : 'bg-emerald-50/50 hover:bg-emerald-50/80 border-emerald-200/70 text-emerald-900 shadow-2xs hover:border-emerald-300'
                        : isSelected
                          ? 'bg-rose-50/80 border-rose-300 text-rose-900 ring-1 ring-rose-300/40 shadow-xs'
                          : 'bg-rose-50/50 hover:bg-rose-50/80 border-rose-200/70 text-rose-900 shadow-2xs hover:border-rose-300'
                      : isSelected
                        ? 'bg-zinc-50 border-zinc-300 ring-1 ring-zinc-200 shadow-xs'
                        : 'bg-white hover:bg-zinc-50/80 border-zinc-200/70 hover:border-zinc-300'
                  }`}
              >
                {/* Day Number and Today badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-[10px] sm:text-xs font-sans tabular-nums font-normal',
                      cell.isCurrentMonth ? 'text-zinc-600' : 'text-zinc-400',
                      isToday && 'font-bold text-zinc-950 sm:font-normal sm:text-zinc-600'
                    )}
                  >
                    {cell.dayNumber}
                  </span>

                  {isToday && (
                    <span className="text-[9px] sm:text-[10px] font-medium px-1 sm:px-2 py-0.5 rounded-full sm:rounded-sm bg-black text-white shadow-2xs">
                      <span className="hidden sm:inline">Today {cell.dayNumber}</span>
                      <span className="sm:hidden size-1.5 rounded-full bg-white inline-block" title="Today" />
                    </span>
                  )}
                </div>

                {/* Day Trades and Net P&L (Slim/Light Red & Green) */}
                {hasTrades && (
                  <div className="flex flex-col mt-auto pt-0.5 sm:pt-2 gap-0 sm:gap-0.5">
                    <span className="text-[8px] sm:text-[10px] font-normal text-zinc-500 truncate">
                      <span className="hidden sm:inline">{dayTrades.length} {dayTrades.length === 1 ? 'Trade' : 'Trades'}</span>
                      <span className="sm:hidden">{dayTrades.length}T</span>
                    </span>
                    <span
                      className={`text-[9px] sm:text-[13px] font-sans tabular-nums font-normal tracking-tight truncate ${isProfitable ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                    >
                      <span className="hidden sm:inline">{formatValue(dayPnl, dayR)}</span>
                      <span className="sm:hidden">{formatCompactValue(dayPnl, dayR)}</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
});

export default TradingCalendar;
