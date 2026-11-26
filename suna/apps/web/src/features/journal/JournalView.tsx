'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CurrencyMode, JournalTrade } from './types';
import {
  getJournalTrades,
  saveJournalTrade,
  deleteJournalTrade,
  getLocalTrades,
  sortJournalTrades,
} from './storage';
import { syncDhanTradesToJournal } from './dhanSync';
import { TradingCalendar } from './TradingCalendar';
import { MonthlySummaryCard } from './MonthlySummaryCard';
import { WeeklyBreakdownCard } from './WeeklyBreakdownCard';
import { DayDetailsDrawer } from './DayDetailsDrawer';
import { AddTradeView } from './AddTradeView';
import { TradeDetailView } from './TradeDetailView';
import { Button } from '@kortix/ui';
import { SidebarToggle } from '@kortix/ui/workspace';
import Hint from '@kortix/ui/hint';
import { SidebarGlyph } from '@kortix/ui/icons';

interface JournalViewProps {
  projectId?: string;
}

export default function JournalView({ projectId }: JournalViewProps) {
  const [trades, setTrades] = useState<JournalTrade[]>(() =>
    sortJournalTrades(getLocalTrades())
  );

  // Calendar Date: Default to current date for production daily use
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());

  // Selected date for side drawer: formatted YYYY-MM-DD (defaults to today in IST)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // View state: 'calendar' | 'add' | 'detail'
  const [viewMode, setViewMode] = useState<'calendar' | 'add' | 'detail'>('calendar');
  const [activeTrade, setActiveTrade] = useState<JournalTrade | null>(null);
  // Trade being edited (pre-fills AddTradeView)
  const [editingTrade, setEditingTrade] = useState<JournalTrade | null>(null);

  // Currency Mode: '₹' | '%' | 'R'
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('₹');

  const [isSyncingDhan, setIsSyncingDhan] = useState(false);

  const handledDeepLinkRef = useRef(false);

  const syncCalendarToDate = useCallback((dateStr?: string) => {
    if (!dateStr) return;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return;
    const yr = Number(parts[0]);
    const mo = Number(parts[1]) - 1;
    if (Number.isFinite(yr) && Number.isFinite(mo) && mo >= 0 && mo <= 11) {
      setCurrentYear(yr);
      setCurrentMonth(mo);
    }
  }, []);

  const syncTradeUrlParam = useCallback((tradeId: string | null) => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (tradeId) {
        url.searchParams.set('trade', tradeId);
      } else {
        url.searchParams.delete('trade');
      }
      window.history.replaceState(null, '', url.toString());
    } catch {
      // Ignore history errors in restricted environments
    }
  }, []);

  const handleSyncDhan = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsSyncingDhan(true);
    try {
      const res = await syncDhanTradesToJournal(projectId);
      // CRITICAL: Never replace existing trades with an empty result.
      // Dhan API returns 0 trades when the token just expired — that must
      // not blank the calendar. Only update if we got real data.
      if (res && Array.isArray(res.trades) && res.trades.length > 0) {
        setTrades((prev) => {
          const sorted = sortJournalTrades(res.trades);
          if (prev.length === sorted.length && JSON.stringify(prev) === JSON.stringify(sorted)) {
            return prev;
          }
          return sorted;
        });
      }
    } catch (err) {
      console.error('Failed to sync Dhan trades:', err);
    } finally {
      if (!isBackground) setIsSyncingDhan(false);
    }
  }, [projectId]);

  // Load trades on mount & listen to live updates with zero flicker
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const loaded = await getJournalTrades(projectId);
        // Only force a Dhan sync if there are truly no trades at all.
        // The old `hasMock` check was incorrectly treating UUID manual trades as mocks.
        if (loaded.length === 0) {
          const synced = await syncDhanTradesToJournal(projectId);
          if (isMounted && Array.isArray(synced.trades) && synced.trades.length > 0) {
            setTrades(sortJournalTrades(synced.trades));
            return;
          }
        }
        if (isMounted && Array.isArray(loaded) && loaded.length > 0) {
          setTrades(sortJournalTrades(loaded));
        }
      } catch (err) {
        console.error('Failed to load journal trades:', err);
      }
    }
    loadData();

    const onJournalUpdated = (e: Event) => {
      // Use the event's detail directly — avoids a re-read from localStorage
      // that could race with an in-progress write and return stale/empty data.
      const incoming = (e as CustomEvent<JournalTrade[]>).detail;
      const fresh = Array.isArray(incoming) && incoming.length > 0
        ? incoming
        : getLocalTrades();
      // Never blank the calendar with an empty update
      if (fresh.length === 0) return;
      setTrades((prev) => {
        const sorted = sortJournalTrades(fresh);
        if (prev.length === sorted.length && JSON.stringify(prev) === JSON.stringify(sorted)) {
          return prev;
        }
        return sorted;
      });
    };
    window.addEventListener('trading-journal-updated', onJournalUpdated);

    // Supabase-backed sync: 60s is plenty — data is durable in Supabase.
    // 3s was causing back-to-back reconciles that wiped the calendar.
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleSyncDhan(true);
      }
    }, 60000);

    return () => {
      isMounted = false;
      window.removeEventListener('trading-journal-updated', onJournalUpdated);
      clearInterval(interval);
    };
  }, [projectId, handleSyncDhan]);

  // Open ?trade=<id> deep-link if present once trades are available
  useEffect(() => {
    if (handledDeepLinkRef.current || typeof window === 'undefined') return;
    const targetId = new URLSearchParams(window.location.search).get('trade');
    if (!targetId) {
      handledDeepLinkRef.current = true;
      return;
    }
    const found = trades.find((t) => t.id === targetId);
    if (found) {
      handledDeepLinkRef.current = true;
      setActiveTrade(found);
      if (found.entryDate) {
        setSelectedDate(found.entryDate);
        syncCalendarToDate(found.entryDate);
      }
      setViewMode('detail');
    }
  }, [trades, syncCalendarToDate]);

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
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const da = String(now.getDate()).padStart(2, '0');
    setSelectedDate(`${yr}-${mo}-${da}`);
  };

  const handleSelectYearMonth = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
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
    syncTradeUrlParam(trade.id);
  };

  // Open "Add Manual Trade" form
  const handleOpenAddTrade = (dateStr?: string) => {
    if (dateStr) setSelectedDate(dateStr);
    setEditingTrade(null);
    setViewMode('add');
    syncTradeUrlParam(null);
  };

  // Save Trade handler
  const handleSaveTrade = async (tradeData: Partial<JournalTrade>) => {
    const saved = await saveJournalTrade(tradeData, projectId);
    setTrades((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id);
      const next = idx >= 0 ? prev.map((t, i) => (i === idx ? saved : t)) : [saved, ...prev];
      return sortJournalTrades(next);
    });
    if (saved.entryDate) {
      setSelectedDate(saved.entryDate);
      syncCalendarToDate(saved.entryDate);
    }
    // If we were editing an existing trade, go back to its detail view
    if (editingTrade) {
      setActiveTrade(saved);
      setEditingTrade(null);
      setViewMode('detail');
      syncTradeUrlParam(saved.id);
    } else {
      setActiveTrade(null);
      setViewMode('calendar');
      syncTradeUrlParam(null);
    }
  };

  // Delete Trade handler
  const handleDeleteTrade = async (tradeId: string) => {
    await deleteJournalTrade(tradeId);
    setTrades((prev) => prev.filter((t) => t.id !== tradeId));
    setActiveTrade(null);
    setEditingTrade(null);
    setViewMode('calendar');
    syncTradeUrlParam(null);
  };

  // Selected date trades
  const selectedDateTrades = useMemo(
    () => trades.filter((t) => t.entryDate === selectedDate),
    [trades, selectedDate]
  );

  // Active month trades and label for MonthlySummary & WeeklyBreakdown
  const monthLabel = useMemo(
    () =>
      new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [currentYear, currentMonth]
  );

  const monthTrades = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-`;
    return trades.filter((t) => t.entryDate?.startsWith(prefix));
  }, [trades, currentYear, currentMonth]);

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden bg-background text-foreground font-sans">
      {/* ========================================================================= */}
      {/* BODY CONTENT (CALENDAR | ADD | DETAIL)                                    */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {viewMode === 'add' ? (
          /* ==================== VIEW 2: ADD TRADE ==================== */
          <main className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 min-w-0 w-full">
            <AddTradeView
              key={editingTrade ? editingTrade.id : 'new'}
              onBack={() => {
                // If editing, go back to detail view; else back to calendar
                if (editingTrade && activeTrade) {
                  setEditingTrade(null);
                  setViewMode('detail');
                  syncTradeUrlParam(activeTrade.id);
                } else {
                  setEditingTrade(null);
                  setViewMode('calendar');
                  syncTradeUrlParam(null);
                }
              }}
              onSave={handleSaveTrade}
              initialDate={selectedDate}
              editTrade={editingTrade}
            />
          </main>
        ) : viewMode === 'detail' && activeTrade ? (
          /* ==================== VIEW 4 & 5: TRADE DETAIL ==================== */
          <main className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 min-w-0 w-full">
            <TradeDetailView
              trade={activeTrade}
              allTrades={trades}
              onBack={() => {
                setViewMode('calendar');
                syncTradeUrlParam(null);
              }}
              onDelete={handleDeleteTrade}
              onEdit={(t) => {
                setActiveTrade(t);
                setEditingTrade(t);
                setViewMode('add');
                syncTradeUrlParam(null);
              }}
              onNavigateTrade={(next) => {
                setActiveTrade(next);
                if (next.entryDate) {
                  setSelectedDate(next.entryDate);
                  syncCalendarToDate(next.entryDate);
                }
                syncTradeUrlParam(next.id);
              }}
            />
          </main>
        ) : (
          /* ==================== VIEW 1: BIG CALENDAR & SIDEBAR (LOAD AT SAME TIME) ==================== */
          <>
            <main className="flex-1 overflow-y-auto px-4 pt-4 pb-20 sm:px-6 sm:pt-6 sm:pb-12 lg:px-6 lg:pt-6 lg:pb-12 min-w-0 w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-full">
                {/* Mobile & collapsed-sidebar header matching CapabilityPageShell (Customize/Connectors/Drive/Apps) */}
                <div className="flex items-center gap-1 sm:hidden">
                  <SidebarToggle className="-ml-2" />
                  <h1 className="text-foreground text-lg font-medium">Journal</h1>
                </div>
                {/* Big Monthly Calendar with Boxes */}
                <TradingCalendar
                  currentYear={currentYear}
                  currentMonth={currentMonth}
                  trades={trades}
                  selectedDate={selectedDate}
                  currencyMode={currencyMode}
                  drawerOpen={drawerOpen}
                  onSelectDate={handleSelectDate}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onJumpThisMonth={handleJumpThisMonth}
                  onSelectYearMonth={handleSelectYearMonth}
                  onCurrencyModeChange={setCurrencyMode}
                  onAddTrade={() => handleOpenAddTrade(selectedDate)}
                  onToggleDrawer={() => setDrawerOpen((prev) => !prev)}
                />

                {/* Bottom Cards: Monthly Summary & Weekly Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  <div className="lg:col-span-7">
                    <MonthlySummaryCard trades={monthTrades} monthLabel={monthLabel} />
                  </div>
                  <div className="lg:col-span-5">
                    <WeeklyBreakdownCard
                      trades={monthTrades}
                      currentYear={currentYear}
                      currentMonth={currentMonth}
                    />
                  </div>
                </div>
              </div>
            </main>

            {/* Sidebar drawer loads in tandem with calendar (Kortix docked sidebar style) */}
            {drawerOpen && (
              <DayDetailsDrawer
                date={selectedDate}
                trades={selectedDateTrades}
                onClose={() => setDrawerOpen(false)}
                onSelectTrade={handleOpenTradeDetail}
                onChangeDate={(newDate) => {
                  setSelectedDate(newDate);
                  syncCalendarToDate(newDate);
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
