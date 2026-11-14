'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CaretLeft,
  CaretRight,
  CaretDown,
  X,
  MagnifyingGlass,
  PencilSimple,
  Microphone,
  Info,
  Check,
  CheckCircle,
  WarningCircle,
  ArrowUp,
  ArrowDown,
} from '@phosphor-icons/react';
import { JournalTrade } from './types';
import { getDayNote, saveDayNote } from './storage';
import { TradingPairIcon } from './TradingPairIcon';
import { Button } from '@kortix/ui';
import { Badge } from '@kortix/ui';
import { Tabs, TabsList, TabsTrigger } from '@kortix/ui';
import Hint from '@kortix/ui/hint';
import { SidebarGlyph } from '@kortix/ui/icons';
import { cn } from '@kortix/ui/lib/utils';

export function RightPanelGlyph({ className = 'size-4' }: { className?: string }) {
  return <SidebarGlyph className={cn('size-4 -scale-x-100', className)} />;
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
    const timer = setTimeout(() => setNoteSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [noteSaved]);

  // Voice note dictation using Web Speech API
  const handleVoiceDictation = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice dictation is not supported by your browser.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const updated = noteInput ? `${noteInput} ${transcript}` : transcript;
          setNoteInput(updated);
          saveDayNote(date, updated);
          setNoteSaved(true);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Date parsing & navigation
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  const stepDate = (deltaDays: number) => {
    const next = new Date(year, month - 1, day + deltaDays);
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, '0');
    const d = String(next.getDate()).padStart(2, '0');
    onChangeDate(`${y}-${m}-${d}`);
  };

  const formattedDateTitle = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  });

  const todayStr = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();
  const isToday = date === todayStr;

  // Calculate day metrics
  const netPnl = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const totalTrades = trades.length;
  const wins = trades.filter((t) => (t.pnl || 0) > 0).length;
  const losses = trades.filter((t) => (t.pnl || 0) < 0).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  const validRTrades = trades.filter((t) => typeof t.riskMultiple === 'number');
  const avgR =
    validRTrades.length > 0
      ? validRTrades.reduce((acc, t) => acc + (t.riskMultiple || 0), 0) / validRTrades.length
      : 0;

  // Plan compliance & Violations calculation
  const followedCount = trades.filter((t) => t.followedPlan === true).length;
  const violationsList: { instrument: string; mistake: string; time?: string }[] = [];
  trades.forEach((t) => {
    if (t.mistakes && t.mistakes.length > 0) {
      t.mistakes.forEach((m) => {
        violationsList.push({
          instrument: t.instrument,
          mistake: m,
          time: t.entryTime,
        });
      });
    } else if (t.followedPlan === false) {
      violationsList.push({
        instrument: t.instrument,
        mistake: 'Plan not followed (Rule deviation)',
        time: t.entryTime,
      });
    }
  });

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
    <aside className="w-full sm:w-[360px] md:w-[380px] shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-full font-sans z-20 select-none shadow-none overflow-hidden">
      {/* 1. DRAWER TOP BAR (Kortix Sidebar Header style) */}
      <div className="flex items-center justify-between px-3.5 h-[49px] border-b border-sidebar-border/30 bg-sidebar shrink-0">
        <div className="flex items-center gap-1 text-sidebar-foreground min-w-0">
          <Hint label="Previous Day">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => stepDate(-1)}
              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <CaretLeft className="size-3.5" />
            </Button>
          </Hint>
          <Hint label="Next Day">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => stepDate(1)}
              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <CaretRight className="size-3.5" />
            </Button>
          </Hint>
          <span className="text-xs font-semibold text-sidebar-foreground ml-1 truncate">
            {formattedDateTitle} {isToday && '· Today'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {!isToday && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onChangeDate(todayStr)}
              className="h-7 text-xs px-2.5 font-medium cursor-pointer"
            >
              Today
            </Button>
          )}
          <Hint label="Collapse panel">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Collapse panel"
              title="Collapse panel"
              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <SidebarGlyph className="size-4 -scale-x-100" />
            </Button>
          </Hint>
        </div>
      </div>

      {/* 2. DRAWER BODY (Kortix Sidebar Content) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* Net Daily P&L Card */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 flex flex-col gap-1 shadow-2xs">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Net PnL
            </span>
            <Badge
              variant={netPnl > 0 ? 'secondary' : netPnl < 0 ? 'destructive' : 'outline'}
              size="xs"
              className={netPnl > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/60' : ''}
            >
              {totalTrades} trade{totalTrades === 1 ? '' : 's'}
            </Badge>
          </div>
          <div
            className={`text-2xl font-semibold font-sans tabular-nums tracking-tight ${
              netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(netPnl)}
          </div>

          {/* Metrics 3-column grid */}
          <div className="grid grid-cols-3 gap-2 pt-2.5 mt-2 border-t border-border/60 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate</span>
              <span className="font-medium tabular-nums text-foreground mt-0.5">{winRate.toFixed(1)}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg R</span>
              <span className={`font-medium tabular-nums mt-0.5 ${avgR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {avgR >= 0 ? `+${avgR.toFixed(2)}R` : `${avgR.toFixed(2)}R`}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Record</span>
              <span className="font-medium tabular-nums mt-0.5">
                <span className="text-emerald-600 dark:text-emerald-400">{wins}W</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-rose-600 dark:text-rose-400">{losses}L</span>
              </span>
            </div>
          </div>
        </div>

        {/* Routine & Guardrail Checklists */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground pb-3 border-b border-border/70">
          {/* Plan Followed */}
          <div>
            <button
              type="button"
              onClick={() => setShowPlanInfo((prev) => !prev)}
              className="w-full flex items-center justify-between hover:bg-muted/50 p-1.5 -mx-1.5 rounded-lg transition-colors text-left cursor-pointer"
            >
              <span className="text-muted-foreground font-medium">Plan Followed</span>
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <span>{planStatus}</span>
                <Info className={`size-3 transition-colors ${showPlanInfo ? 'text-foreground' : 'text-muted-foreground'}`} />
              </span>
            </button>
            {showPlanInfo && (
              <div className="mt-1.5 p-2.5 rounded-lg bg-muted/40 border border-border/70 text-[11px] space-y-1.5 animate-in fade-in duration-150">
                {totalTrades === 0 ? (
                  <p className="text-muted-foreground italic">No trades logged for this date.</p>
                ) : (
                  trades.map((t, i) => (
                    <div key={t.id || i} className="flex items-center justify-between text-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        {t.followedPlan ? (
                          <Check className="size-3 text-emerald-600 font-bold" />
                        ) : (
                          <X className="size-3 text-rose-600 font-bold" />
                        )}
                        <span>{t.instrument}</span>
                        <span className="text-muted-foreground font-normal">({t.entryTime || '00:00'})</span>
                      </span>
                      <span className="text-muted-foreground text-[10px] truncate max-w-[130px]">
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
              className="w-full flex items-center justify-between hover:bg-muted/50 p-1.5 -mx-1.5 rounded-lg transition-colors text-left cursor-pointer"
            >
              <span className="text-muted-foreground font-medium">Guardrail violations</span>
              <span className="flex items-center gap-1 font-semibold text-foreground">
                {violationsCount > 0 ? (
                  <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                    <WarningCircle weight="fill" className="size-3.5 shrink-0" />
                    <span>{violationsCount}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-foreground font-semibold">
                    <CheckCircle weight="fill" className="size-3.5 text-emerald-600 shrink-0" />
                    <span>0</span>
                  </span>
                )}
                <CaretDown className={`size-3 text-muted-foreground transition-transform duration-200 ${showViolations ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {showViolations && (
              <div className="mt-1.5 p-2 rounded-lg bg-muted/40 border border-border/70 text-[11px] space-y-1 animate-in fade-in duration-150">
                {violationsList.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <CheckCircle weight="fill" className="size-3.5 shrink-0" />
                    <span>No violations</span>
                  </div>
                ) : (
                  violationsList.map((v, i) => (
                    <div key={i} className="flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-rose-50/70 dark:hover:bg-rose-950/30 transition-colors">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                        <WarningCircle weight="fill" className="size-3.5 shrink-0" />
                        <span>{v.mistake.replace(/^Guardrail:\s*/i, '').replace(/^Missing\s*/i, '')}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground font-sans tabular-nums">
                        {v.instrument} {v.time ? `· ${v.time}` : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Trades Journaled */}
          <div className="flex items-center justify-between p-1.5 -mx-1.5">
            <span className="text-muted-foreground font-medium">Trades Journaled</span>
            <span className="font-semibold text-foreground">
              {totalTrades > 0 ? `${totalTrades} Logged` : '0 Logged'}
            </span>
          </div>
        </div>

        {/* Daily Note Input (persisted per date) */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-card border border-border/80 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <PencilSimple className="size-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Add a note for this day..."
              value={noteInput}
              onChange={(e) => handleNoteChange(e.target.value)}
              onBlur={() => saveDayNote(date, noteInput)}
              className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground w-full select-text"
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
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                isListening ? 'text-rose-600 animate-pulse' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Microphone className="size-3.5" />
            </button>
          </div>
        </div>

        {/* 3. TRADES LIST SECTION */}
        <div className="flex flex-col gap-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-foreground">Trades</h3>
              <p className="text-[11px] text-muted-foreground">Tap a trade to see details</p>
            </div>
            {filteredTrades.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => onSelectTrade(filteredTrades[0])}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground h-6 px-2 rounded-md hover:bg-muted transition-colors cursor-pointer"
                title="View full trade details"
              >
                <span>View details</span>
                <CaretRight className="size-3" />
              </Button>
            )}
          </div>

          {/* Filter Bar with Kortix Tabs & Search */}
          <div className="flex items-center justify-between gap-2">
            <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as any)}>
              <TabsList size="xs" className="h-7 bg-muted/60 p-0.5">
                <TabsTrigger size="xs" value="all" className="text-xs px-2.5 h-6">All</TabsTrigger>
                <TabsTrigger size="xs" value="wins" className="text-xs px-2.5 h-6">Wins</TabsTrigger>
                <TabsTrigger size="xs" value="losses" className="text-xs px-2.5 h-6">Losses</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-28">
              <input
                type="text"
                placeholder="Instrument"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-2 pr-6 py-1 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring select-text"
              />
              <MagnifyingGlass className="size-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-1 border-b border-border/60 pb-1 gap-1">
            <div className="col-span-3">Instrument</div>
            <div className="col-span-2 text-center">Time</div>
            <div className="col-span-2 text-center">Dir</div>
            <div className="col-span-2 text-center">Emotions</div>
            <div className="col-span-3 text-right">PnL</div>
          </div>

          {/* Trade Rows */}
          {filteredTrades.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No trades found
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border/40">
              {filteredTrades.map((t) => {
                const isWin = t.pnl >= 0;
                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTrade(t)}
                    className="grid grid-cols-12 items-center py-2.5 px-1 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors group select-none gap-1"
                  >
                    <div className="col-span-3 flex items-center gap-1.5 min-w-0">
                      <TradingPairIcon symbol={t.instrument} size="sm" />
                      <span className="font-semibold text-xs text-foreground truncate">
                        {t.instrument}
                      </span>
                    </div>

                    <div className="col-span-2 text-center font-sans tabular-nums text-[11px] text-muted-foreground">
                      {t.entryTime}
                    </div>

                    <div className="col-span-2 flex items-center justify-center">
                      <span
                        className={cn(
                          'text-[10px] font-semibold flex items-center gap-0.5',
                          t.direction === 'Buy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        )}
                      >
                        {t.direction === 'Buy' ? (
                          <>
                            <ArrowUp className="size-2.5" />
                            <span>Buy</span>
                          </>
                        ) : (
                          <>
                            <ArrowDown className="size-2.5" />
                            <span>Sell</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="col-span-2 text-center text-[11px] text-foreground truncate">
                      {t.entryEmotion ? (
                        <span className="truncate block">{t.entryEmotion}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </div>

                    <div className="col-span-3 flex items-center justify-end gap-1 font-sans tabular-nums text-xs font-medium min-w-0">
                      <span className={cn('truncate', isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                        {formatCompactCurrency(t.pnl)}
                      </span>
                      <CaretRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
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
