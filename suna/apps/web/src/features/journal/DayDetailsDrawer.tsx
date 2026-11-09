'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  ClipboardList,
  ShieldAlert,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { JournalTrade } from './types';
import { TradingPairIcon } from './TradingPairIcon';
import { getStoredWatchlist, WatchlistEntry } from '../markets/watchlist.store';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DayDetailsDrawerProps {
  date: string; // YYYY-MM-DD
  trades: JournalTrade[];
  onClose: () => void;
  onSelectTrade: (trade: JournalTrade) => void;
  onChangeDate: (newDate: string) => void;
  onAddTradeForDate: (date: string) => void;
}

export function DayDetailsDrawer({
  date,
  trades,
  onClose,
  onSelectTrade,
  onChangeDate,
  onAddTradeForDate,
}: DayDetailsDrawerProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'wins' | 'losses'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');
  const [dayNote, setDayNote] = useState('');
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);

  // Load user's TradingView watchlist
  useEffect(() => {
    setWatchlist(getStoredWatchlist());
    const onUpdate = () => setWatchlist(getStoredWatchlist());
    window.addEventListener('watchlist-updated', onUpdate);
    return () => window.removeEventListener('watchlist-updated', onUpdate);
  }, []);

  // Parse date
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const formattedDateTitle = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  });

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const isToday = todayStr === date;

  const stepDate = (offsetDays: number) => {
    const next = new Date(dateObj);
    next.setDate(next.getDate() + offsetDays);
    const yr = next.getFullYear();
    const mo = String(next.getMonth() + 1).padStart(2, '0');
    const da = String(next.getDate()).padStart(2, '0');
    onChangeDate(`${yr}-${mo}-${da}`);
  };

  const jumpToToday = () => {
    onChangeDate(todayStr);
  };

  // Aggregates
  const netPnl = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.pnl > 0).length;
  const losses = trades.filter((t) => t.pnl < 0).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const avgR =
    totalTrades > 0
      ? trades.reduce((acc, t) => acc + (t.returnR || 0), 0) / totalTrades
      : 0;

  const planFollowedCount = trades.filter((t) => t.followedPlan).length;
  const isPlanFollowed = totalTrades > 0 ? planFollowedCount === totalTrades : true;

  // Day's traded instruments and watchlist symbols
  const dayTradedSymbols = Array.from(new Set(trades.map((t) => t.instrument.toUpperCase())));
  const availableWatchlistSymbols = Array.from(
    new Set([...dayTradedSymbols, ...watchlist.map((w) => w.symbol.toUpperCase())])
  );

  // Filtered trades list (by Wins/Losses, selected symbol chip, and search query)
  const filteredTrades = trades.filter((t) => {
    if (filterMode === 'wins' && t.pnl <= 0) return false;
    if (filterMode === 'losses' && t.pnl >= 0) return false;
    if (selectedSymbol !== 'ALL' && t.instrument.toUpperCase() !== selectedSymbol) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.instrument.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (t.entryTime && t.entryTime.includes(q))
      );
    }
    return true;
  });

  const formatCurrency = (val: number) => {
    const sign = val >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <aside className="w-full sm:w-[410px] md:w-[440px] shrink-0 border-l border-zinc-200/90 bg-white flex flex-col h-full shadow-lg font-sans z-20">
      {/* ========================================================================= */}
      {/* 1. DRAWER HEADER (Navigation, Date, Close)                                */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200/80 bg-white">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => stepDate(-1)}
            className="h-8 w-8 p-0 rounded-lg text-zinc-500 hover:text-zinc-950"
            title="Previous Day"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => stepDate(1)}
            className="h-8 w-8 p-0 rounded-lg text-zinc-500 hover:text-zinc-950"
            title="Next Day"
          >
            <ChevronRight className="size-4" />
          </Button>
          <h2 className="text-sm font-bold text-zinc-950 ml-1">{formattedDateTitle}</h2>
        </div>

        <div className="flex items-center gap-2">
          {!isToday && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={jumpToToday}
              className="h-7 px-2.5 rounded-lg text-zinc-700 font-semibold"
            >
              Today
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-lg text-zinc-400 hover:text-zinc-950"
            title="Close panel"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DRAWER SCROLLABLE BODY                                                 */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
        {/* Net P&L Display Card using COSS Card */}
        <Card className="p-4 rounded-xl border-zinc-200/80 bg-zinc-50/50 flex flex-col gap-1 shadow-none">
          <div
            className={`text-2xl sm:text-3xl font-bold tracking-tight font-mono ${
              netPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(netPnl)}
          </div>
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Net Daily Profit / Loss
          </span>
        </Card>

        {/* 5-Item Mini Stats Grid using COSS Card */}
        <Card className="grid grid-cols-2 gap-2.5 bg-white p-3.5 rounded-xl border-zinc-200/90 shadow-2xs">
          <div className="flex flex-col">
            <span className="text-sm font-bold font-mono text-zinc-950">
              {winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">
              Win Rate
            </span>
          </div>
          <div className="flex flex-col">
            <span
              className={`text-sm font-bold font-mono ${
                avgR >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {avgR >= 0 ? `+${avgR.toFixed(2)}R` : `${avgR.toFixed(2)}R`}
            </span>
            <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">
              Average R
            </span>
          </div>
          <div className="flex flex-col pt-2.5 border-t border-zinc-100">
            <span className="text-sm font-bold font-mono text-zinc-950">
              {totalTrades} <span className="text-xs text-zinc-500 font-normal">trades</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">
              Total Trades
            </span>
          </div>
          <div className="flex items-center gap-4 pt-2.5 border-t border-zinc-100">
            <div className="flex flex-col">
              <span className="text-sm font-bold font-mono text-emerald-600">{wins}</span>
              <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">
                Wins
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold font-mono text-rose-600">{losses}</span>
              <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">
                Losses
              </span>
            </div>
          </div>
        </Card>

        {/* ======================================================================= */}
        {/* STRICT COSS TABS FOR DRAWER: TRADES | ROUTINE | NOTES                   */}
        {/* ======================================================================= */}
        <Tabs defaultValue="trades" className="w-full flex-1 flex flex-col">
          <TabsList size="sm" variant="default" className="w-full grid grid-cols-3 p-1 rounded-xl bg-zinc-100/90 border border-zinc-200/80">
            <TabsTab value="trades" className="font-sans text-xs font-semibold tracking-normal py-1.5">Trades ({trades.length})</TabsTab>
            <TabsTab value="routine" className="font-sans text-xs font-semibold tracking-normal py-1.5">Routine</TabsTab>
            <TabsTab value="notes" className="font-sans text-xs font-semibold tracking-normal py-1.5">Notes</TabsTab>
          </TabsList>

          {/* TAB 1: TRADES LIST (TradingView Watchlist Table Style) */}
          <TabsPanel value="trades" className="flex flex-col gap-3 pt-2">
            {/* Header Hint */}
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Tap a trade to see full details</span>
              <span className="font-mono text-[11px] font-semibold text-zinc-400">
                {filteredTrades.length} of {trades.length}
              </span>
            </div>

            {/* Filter Controls Row: [All] [Wins] [Losses] + Instrument Search + Add */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200">
                <Button
                  type="button"
                  variant={filterMode === 'all' ? 'default' : 'ghost'}
                  size="xs"
                  onClick={() => setFilterMode('all')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md ${
                    filterMode === 'all'
                      ? 'bg-zinc-950 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-transparent'
                  }`}
                >
                  All
                </Button>
                <Button
                  type="button"
                  variant={filterMode === 'wins' ? 'default' : 'ghost'}
                  size="xs"
                  onClick={() => setFilterMode('wins')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors ${
                    filterMode === 'wins'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-transparent'
                  }`}
                >
                  Wins
                </Button>
                <Button
                  type="button"
                  variant={filterMode === 'losses' ? 'default' : 'ghost'}
                  size="xs"
                  onClick={() => setFilterMode('losses')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors ${
                    filterMode === 'losses'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-transparent'
                  }`}
                >
                  Losses
                </Button>
              </div>

              {/* Instrument Search Input */}
              <div className="flex items-center gap-1.5 flex-1 max-w-[170px] justify-end">
                <div className="relative w-full">
                  <Input
                    type="text"
                    placeholder="Instrument..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 text-xs pl-2 pr-6 py-0 rounded-lg bg-white border-zinc-200 focus:border-zinc-900"
                  />
                  <Search className="size-3 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onAddTradeForDate(date)}
                  className="h-7 px-2 text-xs font-semibold gap-1 shrink-0"
                  title="Add trade on this day"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Quick Watchlist Symbol Filter Chips */}
            {availableWatchlistSymbols.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedSymbol('ALL')}
                  className={`px-2 py-0.5 rounded-md font-medium shrink-0 transition-colors ${
                    selectedSymbol === 'ALL'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-950'
                  }`}
                >
                  All Pairs
                </button>
                {availableWatchlistSymbols.map((sym) => {
                  const symTrades = trades.filter((t) => t.instrument.toUpperCase() === sym);
                  const isSelected = selectedSymbol === sym;
                  const hasTradesToday = symTrades.length > 0;
                  const symPnl = symTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setSelectedSymbol(isSelected ? 'ALL' : sym)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium shrink-0 transition-colors border ${
                        isSelected
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : hasTradesToday
                          ? symPnl >= 0
                            ? 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100'
                          : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <span>{sym}</span>
                      {hasTradesToday && (
                        <span
                          className={`text-[9px] font-mono px-1 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-black/5 text-zinc-700'
                          }`}
                        >
                          {symTrades.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TradingView Watchlist Table Header */}
            <div className="grid grid-cols-12 text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-3 py-1.5 bg-zinc-50/80 rounded-lg border border-zinc-200/60 mt-1">
              <div className="col-span-5">Instrument</div>
              <div className="col-span-2 text-center">Time</div>
              <div className="col-span-2 text-center">Direction</div>
              <div className="col-span-3 text-right">PnL / R</div>
            </div>

            {/* Trades List (TradingView Watchlist Rows) */}
            {filteredTrades.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-200 p-4 bg-zinc-50/40">
                <ClipboardList className="size-6 text-zinc-300" />
                <span>
                  {selectedSymbol !== 'ALL'
                    ? `No ${selectedSymbol} trades logged for this day`
                    : 'No trades recorded for this day'}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onAddTradeForDate(date)}
                  className="mt-1 text-xs"
                >
                  <Plus className="size-3.5 mr-1" />
                  Log Trade
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filteredTrades.map((t) => {
                  const isProfitable = t.pnl >= 0;
                  return (
                    <div
                      key={t.id}
                      onClick={() => onSelectTrade(t)}
                      className="grid grid-cols-12 items-center px-3 py-2.5 rounded-xl border border-zinc-200/80 bg-white hover:bg-zinc-50/90 hover:border-zinc-300 transition-all cursor-pointer group shadow-2xs select-none"
                    >
                      {/* Instrument with TradingView Pair Flag / Icon */}
                      <div className="col-span-5 flex items-center gap-2 overflow-hidden pr-1">
                        <TradingPairIcon symbol={t.instrument} size="sm" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-zinc-950 truncate tracking-tight">
                            {t.instrument}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 truncate">
                            {t.lots} lots
                          </span>
                        </div>
                      </div>

                      {/* Time We Traded on That Day */}
                      <div className="col-span-2 flex flex-col items-center justify-center">
                        <span className="text-xs font-mono font-medium text-zinc-700">
                          {t.entryTime}
                        </span>
                        <span className="text-[9px] text-zinc-400">Traded</span>
                      </div>

                      {/* Direction: Light Red / Green */}
                      <div className="col-span-2 flex items-center justify-center">
                        <span
                          className={`text-[10px] font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded-md border ${
                            t.direction === 'Buy'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {t.direction === 'Buy' ? (
                            <TrendingUp className="size-3 text-emerald-600" />
                          ) : (
                            <TrendingDown className="size-3 text-rose-600" />
                          )}
                          {t.direction}
                        </span>
                      </div>

                      {/* Profit or Loss: Light Red / Green */}
                      <div className="col-span-3 flex flex-col items-end">
                        <span
                          className={`text-xs font-mono font-bold tracking-tight ${
                            isProfitable ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(t.pnl)}
                        </span>
                        {t.returnR !== null && t.returnR !== undefined ? (
                          <span
                            className={`text-[10px] font-mono font-semibold ${
                              t.returnR >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {t.returnR >= 0 ? `+${t.returnR}R` : `${t.returnR}R`}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-400">1.0R</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsPanel>

          {/* TAB 2: ROUTINE & GUARDRAILS */}
          <TabsPanel value="routine" className="flex flex-col gap-3 pt-2">
            <Card className="flex flex-row items-center justify-between p-3 rounded-xl bg-zinc-50 border-zinc-200/70 text-xs shadow-none">
              <span className="text-zinc-600 font-medium">Plan Followed</span>
              <span
                className={`font-semibold flex items-center gap-1.5 ${
                  isPlanFollowed ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {isPlanFollowed ? (
                  <>
                    <CheckCircle className="size-3.5 text-emerald-600" /> Yes
                  </>
                ) : (
                  <>
                    <XCircle className="size-3.5 text-rose-600" /> No
                  </>
                )}
              </span>
            </Card>

            <Card className="flex flex-row items-center justify-between p-3 rounded-xl bg-zinc-50 border-zinc-200/70 text-xs shadow-none">
              <span className="text-zinc-600 font-medium">Guardrail Violations</span>
              <span className="font-semibold text-zinc-950">
                {trades.reduce((acc, t) => acc + (t.mistakes?.length || 0), 0)} violations
              </span>
            </Card>

            <Card className="flex flex-row items-center justify-between p-3 rounded-xl bg-zinc-50 border-zinc-200/70 text-xs shadow-none">
              <span className="text-zinc-600 font-medium">Pre-Market Routine</span>
              <span className="font-semibold text-emerald-700">Completed 3/3</span>
            </Card>

            <Card className="flex flex-row items-center justify-between p-3 rounded-xl bg-zinc-50 border-zinc-200/70 text-xs shadow-none">
              <span className="text-zinc-600 font-medium">Trades Journaled</span>
              <span className="font-semibold text-zinc-950 font-mono">
                {totalTrades}/{totalTrades} Logged
              </span>
            </Card>
          </TabsPanel>

          {/* TAB 3: NOTES & REFLECTION */}
          <TabsPanel value="notes" className="flex flex-col gap-3 pt-2">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-700">Daily Journal Reflection</span>
              <Textarea
                rows={4}
                value={dayNote}
                onChange={(e) => setDayNote(e.target.value)}
                placeholder="Write your thoughts, market context, psychological traps, or key lessons from today's session..."
              />
              <Button
                variant="default"
                size="sm"
                onClick={() => alert('Reflection saved!')}
                className="bg-zinc-950 text-white hover:bg-zinc-800 self-end font-semibold text-xs mt-1 h-8 px-4"
              >
                Save Reflection
              </Button>
            </div>
          </TabsPanel>
        </Tabs>
      </div>
    </aside>
  );
}
