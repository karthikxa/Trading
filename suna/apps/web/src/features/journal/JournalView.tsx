'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  BookOpen,
  PanelRightClose,
  PanelRightOpen,
  Loader2,
} from 'lucide-react';
import { CurrencyMode, JournalTrade } from './types';
import {
  getJournalTrades,
  saveJournalTrade,
  deleteJournalTrade,
} from './storage';
import { TradingCalendar } from './TradingCalendar';
import { MonthlySummaryCard } from './MonthlySummaryCard';
import { WeeklyBreakdownCard } from './WeeklyBreakdownCard';
import { DayDetailsDrawer } from './DayDetailsDrawer';
import { AddTradeView } from './AddTradeView';
import { TradeDetailView } from './TradeDetailView';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface JournalViewProps {
  projectId?: string;
}

export default function JournalView({ projectId }: JournalViewProps) {
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calendar Date: Default to February 2026 matching reference images
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(1); // 1 = February (0-indexed)

  // Selected date for side drawer
  const [selectedDate, setSelectedDate] = useState<string>('2026-02-12');
  const [drawerOpen, setDrawerOpen] = useState(true);

  // View state: 'calendar' | 'add' | 'detail'
  const [viewMode, setViewMode] = useState<'calendar' | 'add' | 'detail'>('calendar');
  const [activeTrade, setActiveTrade] = useState<JournalTrade | null>(null);

  // Currency Mode: '$' | '%' | 'R'
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('$');

  // Load trades on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const loaded = await getJournalTrades(projectId);
        if (isMounted) setTrades(loaded);
      } catch (err) {
        console.error('Failed to load journal trades:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  // Handlers for month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpThisMonth = () => {
    setCurrentYear(2026);
    setCurrentMonth(1); // February
  };

  // Day selection from Calendar
  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setDrawerOpen(true);
  };

  // Click on a trade in Drawer or Calendar
  const handleOpenTradeDetail = (trade: JournalTrade) => {
    setActiveTrade(trade);
    setViewMode('detail');
  };

  // Open "Add Manual Trade" form
  const handleOpenAddTrade = (dateStr?: string) => {
    if (dateStr) setSelectedDate(dateStr);
    setViewMode('add');
  };

  // Save Trade handler
  const handleSaveTrade = async (tradeData: Partial<JournalTrade>) => {
    const saved = await saveJournalTrade(tradeData, projectId);
    setTrades((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    setSelectedDate(saved.entryDate);
    setViewMode('calendar');
  };

  // Delete Trade handler
  const handleDeleteTrade = async (tradeId: string) => {
    await deleteJournalTrade(tradeId);
    setTrades((prev) => prev.filter((t) => t.id !== tradeId));
    setViewMode('calendar');
  };

  // Selected date trades
  const selectedDateTrades = trades.filter((t) => t.entryDate === selectedDate);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#fafafa] text-zinc-950 font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR (Strict COSS UI Components)                             */}
      {/* ========================================================================= */}
      <header className="px-6 py-3.5 border-b border-zinc-200/90 bg-white shadow-2xs flex items-center justify-between shrink-0 select-none">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold text-zinc-950 tracking-tight">Journal</h1>
          <p className="text-xs text-zinc-400 hidden sm:block font-normal">
            Review your trades, emotions, and patterns to build consistency and self-awareness.
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Currency / Mode toggle ($ | % | R) using Button components */}
          <div className="flex items-center p-0.5 rounded-xl bg-zinc-100 border border-zinc-200 shadow-2xs">
            {(['$', '%', 'R'] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                variant={currencyMode === mode ? 'default' : 'ghost'}
                size="xs"
                onClick={() => setCurrencyMode(mode)}
                className={`font-mono font-bold h-7 px-3 rounded-lg ${
                  currencyMode === mode
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-transparent'
                }`}
              >
                {mode}
              </Button>
            ))}
          </div>

          {/* Add Manual Trade Button using COSS Button */}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => handleOpenAddTrade(selectedDate)}
            className="bg-zinc-950 hover:bg-zinc-800 text-white font-semibold shadow-xs gap-1.5 h-8 px-4 rounded-xl cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Add Manual Trade</span>
          </Button>

          {/* Toggle Right Drawer using COSS Button */}
          {viewMode === 'calendar' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDrawerOpen((prev) => !prev)}
              className="h-8 w-8 p-0 rounded-xl border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 shadow-2xs"
              title={drawerOpen ? 'Collapse side panel' : 'Expand side panel'}
            >
              {drawerOpen ? (
                <PanelRightClose className="size-4" />
              ) : (
                <PanelRightOpen className="size-4" />
              )}
            </Button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. BODY CONTENT (CALENDAR | ADD | DETAIL)                                 */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Main Work Area */}
        <main className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 min-w-0 w-full">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="size-6 animate-spin text-zinc-950" />
              <span className="text-xs font-medium">Loading trade journal...</span>
            </div>
          ) : viewMode === 'add' ? (
            /* ==================== VIEW 2: ADD TRADE ==================== */
            <AddTradeView
              onBack={() => setViewMode('calendar')}
              onSave={handleSaveTrade}
              initialDate={selectedDate}
            />
          ) : viewMode === 'detail' && activeTrade ? (
            /* ==================== VIEW 4 & 5: TRADE DETAIL ==================== */
            <TradeDetailView
              trade={activeTrade}
              allTrades={trades}
              onBack={() => setViewMode('calendar')}
              onDelete={handleDeleteTrade}
              onEdit={(t) => {
                setActiveTrade(t);
                setViewMode('add');
              }}
              onNavigateTrade={(next) => setActiveTrade(next)}
            />
          ) : (
            /* ==================== VIEW 1: BIG CALENDAR & SUMMARY ==================== */
            <div className="flex flex-col gap-8 w-full">
              {/* Big Monthly Calendar with Boxes */}
              <TradingCalendar
                currentYear={currentYear}
                currentMonth={currentMonth}
                trades={trades}
                selectedDate={selectedDate}
                currencyMode={currencyMode}
                onSelectDate={handleSelectDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onJumpThisMonth={handleJumpThisMonth}
              />

              {/* Bottom Cards: Monthly Summary & Weekly Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-7">
                  <MonthlySummaryCard trades={trades} />
                </div>
                <div className="lg:col-span-5">
                  <WeeklyBreakdownCard trades={trades} />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ========================================================================= */}
        {/* 3. SIDE-OVER DRAWER (VIEW 3: DAY DETAILS)                                 */}
        {/* ========================================================================= */}
        {viewMode === 'calendar' && drawerOpen && (
          <DayDetailsDrawer
            date={selectedDate}
            trades={selectedDateTrades}
            onClose={() => setDrawerOpen(false)}
            onSelectTrade={handleOpenTradeDetail}
            onChangeDate={(newDate) => setSelectedDate(newDate)}
            onAddTradeForDate={(dt) => handleOpenAddTrade(dt)}
          />
        )}
      </div>
    </div>
  );
}
