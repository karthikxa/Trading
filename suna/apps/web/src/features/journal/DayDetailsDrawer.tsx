'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  TrendingUp,
  TrendingDown,
  Edit2,
  Mic,
  Info,
  ChevronDown,
} from 'lucide-react';
import { JournalTrade } from './types';
import { TradingPairIcon } from './TradingPairIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  const [noteInput, setNoteInput] = useState('');

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

  // Filtered trades list (by All, Wins, Losses, and Search)
  const filteredTrades = trades.filter((t) => {
    if (filterMode === 'wins' && t.pnl <= 0) return false;
    if (filterMode === 'losses' && t.pnl >= 0) return false;
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

  const formatCompactCurrency = (val: number) => {
    const sign = val >= 0 ? '+' : '-';
    const abs = Math.abs(val);
    if (abs >= 1000000) {
      return `${sign}$${(abs / 1000000).toFixed(1)}M`;
    }
    if (abs >= 1000) {
      const kVal = (abs / 1000).toFixed(1);
      return `${sign}$${kVal.endsWith('.0') ? kVal.slice(0, -2) : kVal}K`;
    }
    return `${sign}$${abs.toFixed(2)}`;
  };

  return (
    <aside className="w-full sm:w-[380px] md:w-[410px] shrink-0 border-l border-zinc-200/90 bg-white flex flex-col h-full shadow-lg font-sans z-20 select-none">
      {/* ========================================================================= */}
      {/* 1. DRAWER TOP BAR (‹ › Date · Today / Today button / Close)               */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 bg-white">
        <div className="flex items-center gap-1.5 text-zinc-700">
          <button
            type="button"
            onClick={() => stepDate(-1)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-950 transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => stepDate(1)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-950 transition-colors"
            title="Next Day"
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="text-xs font-semibold text-zinc-900 ml-1">
            {formattedDateTitle} {isToday && '· Today'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              type="button"
              onClick={jumpToToday}
              className="text-xs px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 font-medium transition-colors"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-950 transition-colors"
            title="Close panel"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DRAWER BODY                                                            */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {/* --- Big Net Daily P&L --- */}
        <div className="flex flex-col gap-0.5">
          <div
            className={`text-3xl font-medium font-mono tracking-tight ${
              netPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(netPnl)}
          </div>
          <span className="text-[10px] font-medium tracking-wider text-zinc-400 uppercase">
            Net PnL
          </span>
        </div>

        {/* --- 2-Column Summary Metrics --- */}
        <div className="grid grid-cols-2 gap-4 pt-1 pb-3 border-b border-zinc-100 text-xs">
          <div className="flex flex-col">
            <span className="font-normal font-mono text-zinc-800 text-sm">
              {winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-normal">
              Win Rate
            </span>
          </div>
          <div className="flex flex-col">
            <span
              className={`font-normal font-mono text-sm ${
                avgR >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {avgR >= 0 ? `+${avgR.toFixed(2)}R` : `${avgR.toFixed(2)}R`}
            </span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-normal">
              Average R
            </span>
          </div>

          <div className="flex flex-col pt-1">
            <span className="font-normal font-mono text-zinc-800 text-sm">
              {totalTrades} / 5
            </span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-normal">
              Total Trades
            </span>
          </div>
          <div className="flex items-center gap-5 pt-1">
            <div className="flex flex-col">
              <span className="font-normal font-mono text-emerald-600 text-sm">{wins}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-normal">
                Wins
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-normal font-mono text-rose-600 text-sm">{losses}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-normal">
                Losses
              </span>
            </div>
          </div>
        </div>

        {/* --- Routine & Guardrail Checklists (Exact style from Reference Image) --- */}
        <div className="flex flex-col gap-2.5 text-xs text-zinc-600 pb-3 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Plan Followed</span>
            <span className="flex items-center gap-1 font-semibold text-zinc-700">
              <span>Partial</span>
              <Info className="size-3 text-zinc-400" />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Guardrail violations</span>
            <span className="flex items-center gap-1 font-semibold text-zinc-700">
              <span>2</span>
              <ChevronDown className="size-3 text-zinc-400" />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Pre-Market Routine</span>
            <span className="flex items-center gap-1 font-semibold text-zinc-700">
              <span className="text-zinc-400">Not Started 0/3</span>
              <ChevronDown className="size-3 text-zinc-400" />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Trades Journaled</span>
            <span className="font-semibold text-zinc-700">
              Incomplete {totalTrades > 0 ? `1/${totalTrades}` : '0/0'}
            </span>
          </div>
        </div>

        {/* --- Quick Add Note Input --- */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50/80 border border-zinc-200/60 text-xs text-zinc-400">
          <div className="flex items-center gap-2 flex-1">
            <Edit2 className="size-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Add a note"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-zinc-700 placeholder:text-zinc-400 w-full"
            />
          </div>
          <Mic className="size-3.5 text-zinc-400 cursor-pointer hover:text-zinc-700" />
        </div>

        {/* ======================================================================= */}
        {/* 3. TRADES SECTION (Image 2: [All] [Wins] [Losses] + Instrument 🔍)       */}
        {/* ======================================================================= */}
        <div className="flex flex-col gap-3 pt-1">
          {/* Section title */}
          <div>
            <h3 className="text-xs font-bold text-zinc-950">Trades</h3>
            <p className="text-[11px] text-zinc-400">Tap a trade to see details</p>
          </div>

          {/* Filter Bar: [All] [Wins] [Losses] and Instrument search */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/80">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterMode === 'all'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('wins')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterMode === 'wins'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Wins
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('losses')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterMode === 'losses'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Losses
              </button>
            </div>

            {/* Instrument Search */}
            <div className="relative w-28">
              <input
                type="text"
                placeholder="Instrument"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-2 pr-6 py-1 rounded-lg border border-zinc-200 bg-white text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
              />
              <Search className="size-3 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Table Header: Instrument | Time | Direction | Emotions | PnL */}
          <div className="grid grid-cols-12 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-1 pt-1 border-b border-zinc-100 pb-1">
            <div className="col-span-4">Instrument</div>
            <div className="col-span-2 text-center">Time</div>
            <div className="col-span-2 text-center">Direction</div>
            <div className="col-span-2 text-center">Emotions</div>
            <div className="col-span-2 text-right">PnL</div>
          </div>

          {/* Trade Rows with Real SVGs */}
          {filteredTrades.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-400">
              No trades found
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-zinc-50">
              {filteredTrades.map((t) => {
                const isWin = t.pnl >= 0;
                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTrade(t)}
                    className="grid grid-cols-12 items-center py-2.5 px-1 hover:bg-zinc-50/80 rounded-lg cursor-pointer transition-colors group select-none"
                  >
                    {/* Instrument + Real SVG Flag/Logo */}
                    <div className="col-span-4 flex items-center gap-1.5 overflow-hidden">
                      <TradingPairIcon symbol={t.instrument} size="sm" />
                      <span className="font-bold text-xs text-zinc-900 truncate">
                        {t.instrument}
                      </span>
                    </div>

                    {/* Time */}
                    <div className="col-span-2 text-center font-mono text-[11px] text-zinc-500">
                      {t.entryTime}
                    </div>

                    {/* Direction */}
                    <div className="col-span-2 flex items-center justify-center">
                      <span
                        className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                          t.direction === 'Buy' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {t.direction === 'Buy' ? '↑ Buy' : '↓ Sell'}
                      </span>
                    </div>

                    {/* Emotions */}
                    <div className="col-span-2 text-center text-xs">
                      {t.entryEmotion ? (
                        <span>{t.entryEmotion}</span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </div>

                    {/* PnL in Light Red or Light Green */}
                    <div className="col-span-2 text-right font-mono text-xs font-normal">
                      <span className={isWin ? 'text-emerald-600' : 'text-rose-600'}>
                        {formatCompactCurrency(t.pnl)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default DayDetailsDrawer;
