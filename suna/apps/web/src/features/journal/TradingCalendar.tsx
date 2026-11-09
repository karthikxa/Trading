'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { CurrencyMode, JournalTrade } from './types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface TradingCalendarProps {
  currentYear: number;
  currentMonth: number; // 0-indexed (0 = Jan, 1 = Feb, etc.)
  trades: JournalTrade[];
  selectedDate: string | null;
  currencyMode: CurrencyMode;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onJumpThisMonth: () => void;
}

// Local date string formatter without timezone shifting
function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function TradingCalendar({
  currentYear,
  currentMonth,
  trades,
  selectedDate,
  currencyMode,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onJumpThisMonth,
}: TradingCalendarProps) {
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric' }
  );

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
    return `${sign}$${Math.abs(pnl).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Group trades by date (YYYY-MM-DD)
  const tradesByDate: Record<string, JournalTrade[]> = {};
  trades.forEach((t) => {
    if (!tradesByDate[t.entryDate]) tradesByDate[t.entryDate] = [];
    tradesByDate[t.entryDate].push(t);
  });

  // Calculate Calendar Days (Mon - Sun layout)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  // Previous month trailing days
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
  const calendarCells: {
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
    calendarCells.push({
      cellId: `prev-${dateStr}`,
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  // Current month active days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDateKey(currentYear, currentMonth, d);
    calendarCells.push({
      cellId: `curr-${dateStr}`,
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
    });
  }

  // Next month leading days (to fill 35 or 42 grid cells)
  const totalCellsNeeded = calendarCells.length <= 35 ? 35 : 42;
  const remaining = totalCellsNeeded - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = formatDateKey(nextYear, nextMonth, d);
    calendarCells.push({
      cellId: `next-${dateStr}`,
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  const weekHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Card className="bg-white border-zinc-200/90 rounded-2xl shadow-2xs flex flex-col font-sans overflow-hidden p-0 gap-0">
      {/* ========================================================================= */}
      {/* CALENDAR CONTROLS BAR (COSS UI Components)                                */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-200/80 bg-white">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onPrevMonth}
            className="h-8 w-8 p-0 rounded-lg text-zinc-600 hover:text-zinc-950 border-zinc-200"
            title="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onNextMonth}
            className="h-8 w-8 p-0 rounded-lg text-zinc-600 hover:text-zinc-950 border-zinc-200"
            title="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
          <h2 className="text-sm sm:text-base font-bold text-zinc-950 ml-1.5 tracking-tight flex items-center gap-2">
            <CalendarIcon className="size-4 text-zinc-500" />
            {monthName}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onJumpThisMonth}
            className="h-8 px-3 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 font-semibold border-zinc-200 shadow-2xs cursor-pointer"
          >
            This Month
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7-COLUMN WEEKDAY HEADERS (Boxed Strip)                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/75 text-center text-xs font-semibold text-zinc-500 divide-x divide-zinc-200/70">
        {weekHeaders.map((day) => (
          <div key={day} className="py-2.5">
            {day}
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* BOXED CALENDAR GRID (Mon - Sun)                                           */}
      {/* ========================================================================= */}
      <div className="p-3 sm:p-4 bg-zinc-50/30">
        <div className="grid grid-cols-7 gap-2">
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
                className={`min-h-[110px] sm:min-h-[125px] p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative select-none ${
                  !cell.isCurrentMonth
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
                    className={`text-xs font-mono font-normal ${
                      cell.isCurrentMonth ? 'text-zinc-600' : 'text-zinc-400'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {isToday && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-sm bg-black text-white shadow-2xs">
                      Today {cell.dayNumber}
                    </span>
                  )}
                </div>

                {/* Day Trades and Net P&L (Slim/Light Red & Green) */}
                {hasTrades && (
                  <div className="flex flex-col mt-auto pt-2 gap-0.5">
                    <span className="text-[10px] font-normal text-zinc-500">
                      {dayTrades.length} {dayTrades.length === 1 ? 'Trade' : 'Trades'}
                    </span>
                    <span
                      className={`text-xs sm:text-[13px] font-mono font-normal tracking-tight truncate ${
                        isProfitable ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatValue(dayPnl, dayR)}
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
}
