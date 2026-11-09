'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { JournalTrade } from './types';
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
  const [dayNote, setDayNote] = useState('');

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

  // Filtered trades list
  const filteredTrades = trades.filter((t) => {
    if (filterMode === 'wins' && t.pnl <= 0) return false;
    if (filterMode === 'losses' && t.pnl >= 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.instrument.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
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
            className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${
              netPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'
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
                avgR >= 0 ? 'text-emerald-700' : 'text-rose-700'
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
              <span className="text-sm font-bold font-mono text-emerald-700">{wins}</span>
              <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">
                Wins
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold font-mono text-rose-700">{losses}</span>
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
          <TabsList size="sm" variant="default" className="w-full grid grid-cols-3">
            <TabsTab value="trades">Trades ({trades.length})</TabsTab>
            <TabsTab value="routine">Routine</TabsTab>
            <TabsTab value="notes">Notes</TabsTab>
          </TabsList>

          {/* TAB 1: TRADES LIST */}
          <TabsPanel value="trades" className="flex flex-col gap-3 pt-2">
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
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md ${
                    filterMode === 'wins'
                      ? 'bg-emerald-700 text-white shadow-xs'
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
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md ${
                    filterMode === 'losses'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-transparent'
                  }`}
                >
                  Losses
                </Button>
              </div>

              <Button
                variant="outline"
                size="xs"
                onClick={() => onAddTradeForDate(date)}
                className="h-7 text-xs font-semibold gap-1"
              >
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>

            {/* Trades List */}
            {filteredTrades.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
                <ClipboardList className="size-6 text-zinc-300" />
                <span>No trades recorded for this day</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredTrades.map((t) => {
                  const isProfitable = t.pnl >= 0;
                  return (
                    <Card
                      key={t.id}
                      onClick={() => onSelectTrade(t)}
                      className="p-3 rounded-xl border-zinc-200/90 bg-white hover:bg-zinc-50/80 hover:border-zinc-300 transition-all cursor-pointer flex flex-row items-center justify-between group shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-zinc-100 flex items-center justify-center text-xs font-mono font-bold text-zinc-800">
                          {t.instrument.slice(0, 3)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-zinc-950 tracking-tight">
                              {t.instrument}
                            </span>
                            <span
                              className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                                t.direction === 'Buy' ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {t.direction === 'Buy' ? (
                                <TrendingUp className="size-3" />
                              ) : (
                                <TrendingDown className="size-3" />
                              )}
                              {t.direction}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400">
                            {t.entryTime} · {t.lots} lots
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span
                          className={`text-xs font-mono font-bold tracking-tight ${
                            isProfitable ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {formatCurrency(t.pnl)}
                        </span>
                        {t.returnR !== null && t.returnR !== undefined && (
                          <span className="text-[10px] font-mono text-zinc-500">
                            {t.returnR >= 0 ? `+${t.returnR}R` : `${t.returnR}R`}
                          </span>
                        )}
                      </div>
                    </Card>
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
