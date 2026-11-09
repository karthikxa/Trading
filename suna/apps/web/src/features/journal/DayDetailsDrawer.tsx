'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Mic,
  Search,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  ClipboardList,
} from 'lucide-react';
import { JournalTrade } from './types';

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
  const [showNoteInput, setShowNoteInput] = useState(false);

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
  const isPlanFollowed = totalTrades === 0 || planFollowedCount >= totalTrades / 2;

  // Filter trades
  const filteredTrades = trades.filter((trade) => {
    if (filterMode === 'wins' && trade.pnl <= 0) return false;
    if (filterMode === 'losses' && trade.pnl >= 0) return false;
    if (
      searchQuery &&
      !trade.instrument.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const formatCurrency = (amount: number) => {
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="w-full lg:w-[430px] shrink-0 bg-white border-l border-zinc-200/90 flex flex-col h-full overflow-hidden shadow-xl font-sans animate-in slide-in-from-right duration-200">
      {/* ========================================================================= */}
      {/* 1. DRAWER TOP BAR                                                         */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-100 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => stepDate(-1)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => stepDate(1)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
          <h2 className="text-sm font-bold text-zinc-900 ml-1">{formattedDateTitle}</h2>
        </div>

        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              type="button"
              onClick={jumpToToday}
              className="text-xs px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium transition-colors"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DRAWER SCROLLABLE BODY                                                 */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-5">
        {/* Big Net P&L Display */}
        <div className="flex flex-col gap-0.5">
          <div
            className={`text-3xl font-black tracking-tight font-mono ${
              netPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(netPnl)}
          </div>
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
            Net P&amp;L
          </span>
        </div>

        {/* 5-Item Mini Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 bg-zinc-50/80 p-3.5 rounded-xl border border-zinc-200/70">
          <div className="flex flex-col">
            <span className="text-sm font-bold font-mono text-zinc-900">
              {winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">
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
            <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">
              Average R
            </span>
          </div>
          <div className="flex flex-col pt-2.5 border-t border-zinc-200/60">
            <span className="text-sm font-bold font-mono text-zinc-900">
              {totalTrades} <span className="text-xs text-zinc-500 font-normal">trades</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">
              Total Trades
            </span>
          </div>
          <div className="flex items-center gap-4 pt-2.5 border-t border-zinc-200/60">
            <div className="flex flex-col">
              <span className="text-sm font-bold font-mono text-emerald-600">{wins}</span>
              <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">
                Wins
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold font-mono text-rose-600">{losses}</span>
              <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">
                Losses
              </span>
            </div>
          </div>
        </div>

        {/* Checklist / Guardrail Cards */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-50/50 border border-zinc-200/60 text-xs">
            <span className="text-zinc-600">Plan Followed</span>
            <span
              className={`font-semibold flex items-center gap-1.5 ${
                isPlanFollowed ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {isPlanFollowed ? (
                <>
                  <CheckCircle className="size-3.5" /> Yes
                </>
              ) : (
                <>
                  <XCircle className="size-3.5" /> No
                </>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-50/50 border border-zinc-200/60 text-xs">
            <span className="text-zinc-600">Guardrail Violations</span>
            <span className="text-zinc-700 font-mono font-medium">
              {losses > 2 ? `${losses} violations` : '0 violations'}
            </span>
          </div>

          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-50/50 border border-zinc-200/60 text-xs">
            <span className="text-zinc-600">Pre-Market Routine</span>
            <span className="text-emerald-600 font-medium">Completed 3/3</span>
          </div>

          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-50/50 border border-zinc-200/60 text-xs">
            <span className="text-zinc-600">Trades Journaled</span>
            <span className="text-zinc-800 font-medium">
              {totalTrades > 0 ? `${totalTrades}/${totalTrades} Logged` : '0'}
            </span>
          </div>
        </div>

        {/* Note Bar */}
        <div className="flex flex-col gap-2">
          {!showNoteInput ? (
            <button
              type="button"
              onClick={() => setShowNoteInput(true)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-dashed border-zinc-200 hover:border-zinc-300 bg-zinc-50/40 text-xs text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Plus className="size-3.5 text-[#704fe6]" />
                <span>Add a note or voice reflection</span>
              </span>
              <Mic className="size-3.5 text-zinc-400" />
            </button>
          ) : (
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-white border border-zinc-200 shadow-2xs">
              <textarea
                rows={2}
                placeholder="Day reflection..."
                value={dayNote}
                onChange={(e) => setDayNote(e.target.value)}
                className="w-full bg-transparent text-xs text-zinc-900 placeholder-zinc-400 focus:outline-hidden resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNoteInput(false)}
                  className="text-[11px] text-zinc-500 hover:text-zinc-800 px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowNoteInput(false)}
                  className="text-[11px] bg-[#704fe6] hover:bg-[#5f3dd4] text-white font-semibold px-2.5 py-1 rounded-lg"
                >
                  Save Note
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TRADES LIST SECTION                                                       */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Trades
              </h3>
              <p className="text-[10px] text-zinc-400">Tap a trade to see details</p>
            </div>
            <button
              type="button"
              onClick={() => onAddTradeForDate(date)}
              className="text-[11px] flex items-center gap-1 text-[#704fe6] hover:text-[#5f3dd4] font-semibold bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg transition-colors"
            >
              <Plus className="size-3" />
              <span>Add</span>
            </button>
          </div>

          {/* Filter Pills & Search */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/80 shrink-0">
              {(['all', 'wins', 'losses'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium capitalize transition-all ${
                    filterMode === mode
                      ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="relative flex-1">
              <Search className="size-3 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Instrument..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg pl-7 pr-2.5 py-1 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-purple-600"
              />
            </div>
          </div>

          {/* Trade Rows */}
          {filteredTrades.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
              <ClipboardList className="size-6 text-zinc-300" />
              <span className="text-xs">No trades logged on this date.</span>
              <button
                type="button"
                onClick={() => onAddTradeForDate(date)}
                className="mt-1 text-xs text-[#704fe6] hover:underline font-medium"
              >
                + Log trade now
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredTrades.map((trade) => {
                const isWin = trade.pnl >= 0;
                return (
                  <div
                    key={trade.id}
                    onClick={() => onSelectTrade(trade)}
                    className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/80 hover:border-zinc-300 transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="size-7 rounded-lg bg-zinc-100 flex items-center justify-center text-[10px] font-mono font-bold text-zinc-700 border border-zinc-200">
                        {trade.instrument.slice(0, 3)}
                      </span>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900 group-hover:text-[#704fe6] transition-colors">
                            {trade.instrument}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold flex items-center gap-0.5 ${
                              trade.direction === 'Buy'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {trade.direction === 'Buy' ? (
                              <TrendingUp className="size-2.5" />
                            ) : (
                              <TrendingDown className="size-2.5" />
                            )}
                            {trade.direction}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {trade.entryTime || '09:30'} · {trade.lots} lots
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span
                        className={`text-xs font-mono font-bold ${
                          isWin ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatCurrency(trade.pnl)}
                      </span>
                      {trade.returnR !== null && (
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {trade.returnR >= 0 ? `+${trade.returnR}R` : `${trade.returnR}R`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
