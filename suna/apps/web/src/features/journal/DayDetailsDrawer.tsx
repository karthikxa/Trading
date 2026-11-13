'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Edit2,
  Mic,
  Info,
  ChevronDown,
  Check,
} from 'lucide-react';
import { JournalTrade } from './types';
import { getDayNote, saveDayNote } from './storage';
import { TradingPairIcon } from './TradingPairIcon';
import { Button } from '@/components/ui/button';

/**
 * Matches Kortix's rounded split-panel menu icon, mirrored to indicate a right-side panel.
 */
export function RightPanelGlyph({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      aria-hidden="true"
      className={`-scale-x-100 ${className}`}
    >
      <rect x="2.625" y="3.625" width="18.75" height="16.75" rx="4" />
      <path d="M9.25 3.625v16.75" />
    </svg>
  );
}

function AlertCircleFilled({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#EF4444" />
      <path d="M12 7V13" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1.2" fill="white" />
    </svg>
  );
}

function CheckCircleFilled({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#10B981" />
      <path d="M8 12.5L10.5 15L16 9.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const GUARDRAIL_PILLARS = ['Structure', 'Orderflow & POI', 'Execution', 'Session & Time'];

interface DayDetailsDrawerProps {
  date: string; // YYYY-MM-DD
  trades: JournalTrade[];
  onClose: () => void;
  onSelectTrade: (trade: JournalTrade) => void;
  onChangeDate: (newDate: string) => void;
}

export function DayDetailsDrawer({
  date,
  trades,
  onClose,
  onSelectTrade,
  onChangeDate,
}: DayDetailsDrawerProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'wins' | 'losses'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [noteInput, setNoteInput] = useState(() => getDayNote(date));
  const [noteSaved, setNoteSaved] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showPlanInfo, setShowPlanInfo] = useState(false);
  const [showViolations, setShowViolations] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Sync per-date note whenever user navigates dates
  useEffect(() => {
    setNoteInput(getDayNote(date));
    setNoteSaved(false);
  }, [date]);

  const handleNoteChange = (val: string) => {
    setNoteInput(val);
    saveDayNote(date, val);
    setNoteSaved(true);
  };

  useEffect(() => {
    if (!noteSaved) return;
    const t = setTimeout(() => setNoteSaved(false), 1500);
    return () => clearTimeout(t);
  }, [noteSaved]);

  const handleVoiceDictation = () => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript;
      if (transcript) {
        const nextVal = noteInput.trim() ? `${noteInput.trim()} ${transcript}` : transcript;
        handleNoteChange(nextVal);
      }
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    setIsListening(true);
    rec.start();
  };

  // Parse YYYY-MM-DD safely without UTC shift
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

  const violationsList = React.useMemo(() => {
    const list: { mistake: string; instrument: string; time?: string }[] = [];
    trades.forEach((t) => {
      if (Array.isArray(t.mistakes)) {
        t.mistakes.forEach((m) => {
          if (m && m.trim() && m.toLowerCase() !== 'none') {
            const cleanM = m.trim();
            const isPillarMistake = GUARDRAIL_PILLARS.some(
              (p) =>
                cleanM === p ||
                cleanM === `Missing ${p}` ||
                cleanM.toLowerCase() === p.toLowerCase() ||
                cleanM.toLowerCase() === `missing ${p.toLowerCase()}`
            );
            // If the user provided entry confluences (custom or standard) or followed plan,
            // do not flag missing generic pillars as guardrail violations
            if (isPillarMistake && (t.followedPlan || (t.confluences && t.confluences.length > 0))) {
              return;
            }
            list.push({
              mistake: cleanM,
              instrument: t.instrument,
              time: t.entryTime,
            });
          }
        });
      }
    });
    return list;
  }, [trades]);

  const followedCount = trades.filter((t) => t.followedPlan).length;
  const planStatus =
    totalTrades === 0
      ? 'No trades'
      : followedCount === totalTrades
        ? 'All Followed'
        : followedCount === 0
          ? 'None Followed'
          : `Partial (${followedCount}/${totalTrades})`;

  const violationsCount = violationsList.length;

  // Filtered trades list
  const filteredTrades = trades.filter((t) => {
    if (filterMode === 'wins' && t.pnl <= 0) return false;
    if (filterMode === 'losses' && t.pnl >= 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.instrument.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (t.entryTime && t.entryTime.includes(q)) ||
        (t.entryEmotion && t.entryEmotion.toLowerCase().includes(q))
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
    <aside className="w-full sm:w-[360px] md:w-[380px] shrink-0 border-l border-zinc-200 bg-white flex flex-col h-full font-sans z-20 select-none shadow-none">
      {/* 1. DRAWER TOP BAR */}
      <div className="flex items-center justify-between px-5 h-[53px] border-b border-zinc-200/80 bg-white shrink-0">
        <div className="flex items-center gap-1.5 text-zinc-700">
          <button
            type="button"
            onClick={() => stepDate(-1)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-950 transition-colors cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => stepDate(1)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-950 transition-colors cursor-pointer"
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
              onClick={() => onChangeDate(todayStr)}
              className="text-xs px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 font-medium transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Close panel"
          >
            <RightPanelGlyph className="size-4" />
          </button>
        </div>
      </div>

      {/* 2. DRAWER BODY */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-200 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-track]:bg-transparent">
        {/* Net Daily P&L */}
        <div className="flex flex-col gap-0.5">
          <div
            className={`text-3xl font-medium font-sans tabular-nums tracking-tight ${
              netPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(netPnl)}
          </div>
          <span className="text-[10px] font-medium tracking-wider text-zinc-400 uppercase">
            Net PnL
          </span>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-1 pb-3 border-b border-zinc-100 text-xs">
          <div className="flex flex-col">
            <span className="font-normal font-sans tabular-nums text-zinc-800 text-sm">
              {winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-normal">
              Win Rate
            </span>
          </div>
          <div className="flex flex-col">
            <span
              className={`font-normal font-sans tabular-nums text-sm ${
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
            <span className="font-normal font-sans tabular-nums text-zinc-800 text-sm">
              {totalTrades}
            </span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-normal">
              Total Trades
            </span>
          </div>
          <div className="flex items-center gap-5 pt-1">
            <div className="flex flex-col">
              <span className="font-normal font-sans tabular-nums text-emerald-600 text-sm">{wins}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-normal">
                Wins
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-normal font-sans tabular-nums text-rose-600 text-sm">{losses}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-normal">
                Losses
              </span>
            </div>
          </div>
        </div>

        {/* Routine & Guardrail Checklists */}
        <div className="flex flex-col gap-2.5 text-xs text-zinc-600 pb-3 border-b border-zinc-100">
          {/* Plan Followed */}
          <div>
            <button
              type="button"
              onClick={() => setShowPlanInfo((prev) => !prev)}
              className="w-full flex items-center justify-between hover:bg-zinc-50/80 p-1 -mx-1 rounded-md transition-colors text-left cursor-pointer"
            >
              <span className="text-zinc-500">Plan Followed</span>
              <span className="flex items-center gap-1 font-semibold text-zinc-700">
                <span>{planStatus}</span>
                <Info className={`size-3 transition-colors ${showPlanInfo ? 'text-zinc-900' : 'text-zinc-400'}`} />
              </span>
            </button>
            {showPlanInfo && (
              <div className="mt-1.5 p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/70 text-[11px] space-y-1.5 animate-in fade-in duration-150">
                {totalTrades === 0 ? (
                  <p className="text-zinc-400 italic">No trades logged for this date.</p>
                ) : (
                  trades.map((t, i) => (
                    <div key={t.id || i} className="flex items-center justify-between text-zinc-700">
                      <span className="flex items-center gap-1.5 font-medium">
                        {t.followedPlan ? (
                          <Check className="size-3 text-emerald-600 stroke-[3]" />
                        ) : (
                          <X className="size-3 text-rose-600 stroke-[3]" />
                        )}
                        <span>{t.instrument}</span>
                        <span className="text-zinc-400 font-normal">({t.entryTime || '00:00'})</span>
                      </span>
                      <span className="text-zinc-500 text-[10px] truncate max-w-[130px]">
                        {t.followedPlan ? (t.planName || 'Plan Followed') : 'Deviated from plan'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Guardrail Violations */}
          <div>
            <button
              type="button"
              onClick={() => setShowViolations((prev) => !prev)}
              className="w-full flex items-center justify-between hover:bg-zinc-50/80 p-1 -mx-1 rounded-md transition-colors text-left cursor-pointer"
            >
              <span className="text-zinc-500">Guardrail violations</span>
              <span className="flex items-center gap-1 font-semibold text-zinc-700">
                {violationsCount > 0 ? (
                  <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                    <AlertCircleFilled className="size-3.5 shrink-0" />
                    <span>{violationsCount}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-zinc-700 font-semibold">
                    <CheckCircleFilled className="size-3.5 shrink-0" />
                    <span>0</span>
                  </span>
                )}
                <ChevronDown className={`size-3 text-zinc-400 transition-transform duration-200 ${showViolations ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {showViolations && (
              <div className="mt-1.5 p-2 rounded-lg bg-zinc-50 border border-zinc-200/70 text-[11px] space-y-1 animate-in fade-in duration-150">
                {violationsList.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <CheckCircleFilled className="size-3.5 shrink-0" />
                    <span>No violations</span>
                  </div>
                ) : (
                  violationsList.map((v, i) => (
                    <div key={i} className="flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-rose-50/70 transition-colors">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-rose-700">
                        <AlertCircleFilled className="size-3.5 shrink-0" />
                        <span>{v.mistake.replace(/^Guardrail:\s*/i, '').replace(/^Missing\s*/i, '')}</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 font-sans tabular-nums">
                        {v.instrument} {v.time ? `· ${v.time}` : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Trades Journaled */}
          <div className="flex items-center justify-between p-1 -mx-1">
            <span className="text-zinc-500">Trades Journaled</span>
            <span className="font-semibold text-zinc-700">
              {totalTrades > 0 ? `${totalTrades} Logged` : '0 Logged'}
            </span>
          </div>
        </div>

        {/* Daily Note Input (persisted per date) */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50/80 border border-zinc-200/60 text-xs text-zinc-400">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Edit2 className="size-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              placeholder="Add a note for this day..."
              value={noteInput}
              onChange={(e) => handleNoteChange(e.target.value)}
              onBlur={() => saveDayNote(date, noteInput)}
              className="bg-transparent border-none outline-none text-xs text-zinc-700 placeholder:text-zinc-400 w-full select-text"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {noteSaved && (
              <span className="text-[10px] text-emerald-600 font-medium">Saved</span>
            )}
            <button
              type="button"
              onClick={handleVoiceDictation}
              title={isListening ? 'Stop recording' : 'Voice note'}
              className={`p-0.5 rounded transition-colors cursor-pointer ${
                isListening ? 'text-rose-600 animate-pulse' : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Mic className="size-3.5" />
            </button>
          </div>
        </div>

        {/* 3. TRADES LIST SECTION */}
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-zinc-950">Trades</h3>
              <p className="text-[11px] text-zinc-400">Tap a trade to see details</p>
            </div>
            {filteredTrades.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => onSelectTrade(filteredTrades[0])}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-950 h-6 px-2 rounded-md hover:bg-zinc-100 transition-colors"
                title="View full trade details"
              >
                <span>View details</span>
                <ChevronRight className="size-3" />
              </Button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200/80">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
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
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
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
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  filterMode === 'losses'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Losses
              </button>
            </div>

            <div className="relative w-28">
              <input
                type="text"
                placeholder="Instrument"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-2 pr-6 py-1 rounded-lg border border-zinc-200 bg-white text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 select-text"
              />
              <Search className="size-3 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Table Header — clean column spacing so nothing overlaps */}
          <div className="grid grid-cols-12 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-1 pt-1 border-b border-zinc-100 pb-1 gap-1">
            <div className="col-span-3">Instrument</div>
            <div className="col-span-2 text-center">Time</div>
            <div className="col-span-2 text-center">Dir</div>
            <div className="col-span-2 text-center">Emotions</div>
            <div className="col-span-3 text-right">PnL</div>
          </div>

          {/* Trade Rows */}
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
                    className="grid grid-cols-12 items-center py-2.5 px-1 hover:bg-zinc-50/80 rounded-lg cursor-pointer transition-colors group select-none gap-1"
                  >
                    <div className="col-span-3 flex items-center gap-1.5 min-w-0">
                      <TradingPairIcon symbol={t.instrument} size="sm" />
                      <span className="font-bold text-xs text-zinc-900 truncate">
                        {t.instrument}
                      </span>
                    </div>

                    <div className="col-span-2 text-center font-sans tabular-nums text-[11px] text-zinc-500">
                      {t.entryTime}
                    </div>

                    <div className="col-span-2 flex items-center justify-center">
                      <span
                        className={`text-[10px] font-semibold ${
                          t.direction === 'Buy' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {t.direction === 'Buy' ? '↑ Buy' : '↓ Sell'}
                      </span>
                    </div>

                    <div className="col-span-2 text-center text-[11px] text-zinc-700 truncate">
                      {t.entryEmotion ? (
                        <span className="truncate block">{t.entryEmotion}</span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </div>

                    <div className="col-span-3 flex items-center justify-end gap-1 font-sans tabular-nums text-xs font-normal min-w-0">
                      <span className={`truncate ${isWin ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCompactCurrency(t.pnl)}
                      </span>
                      <ChevronRight className="size-3.5 text-zinc-300 group-hover:text-zinc-700 group-hover:translate-x-0.5 transition-all shrink-0" />
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
