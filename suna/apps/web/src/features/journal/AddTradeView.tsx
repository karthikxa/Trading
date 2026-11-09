'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Upload,
  X,
  Info,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { Direction, JournalTrade } from './types';
import { uploadChartImage } from './storage';

interface AddTradeViewProps {
  onBack: () => void;
  onSave: (trade: Partial<JournalTrade>) => Promise<void>;
  initialDate?: string;
}

const COMMON_CONFLUENCES = [
  'LQ sweep',
  'LTF POI Mitigation',
  'MTF POI mitigation',
  'MS',
  '4H FVG Fill',
  'Order Block',
  'Session High Sweep',
  'Session Low Sweep',
  'Breakout & Retest',
  'Volume Spike',
];

const COMMON_MISTAKES = [
  'Impatience',
  'too late',
  'overleveraged',
  'moved SL',
  'fomo',
  'fighting trend',
  'no clear invalidation',
];

const ENTRY_EMOTIONS = [
  '🤩 Confident',
  '😐 Neutral',
  '😡 Revenge',
  '😰 FOMO',
  '😨 Fearful',
  '😤 Impatient',
];

const EXIT_EMOTIONS = [
  '😌 Relieved',
  '🧘 Disciplined',
  '🤑 Greedy',
  '😡 Frustrated',
  '😔 Regret',
  '😐 Neutral',
];

export function AddTradeView({ onBack, onSave, initialDate }: AddTradeViewProps) {
  const todayStr = initialDate || new Date().toISOString().split('T')[0];

  // Trade Details State
  const [entryDate, setEntryDate] = useState(todayStr);
  const [entryTime, setEntryTime] = useState('09:30');
  const [exitDate, setExitDate] = useState(todayStr);
  const [exitTime, setExitTime] = useState('11:00');
  const [instrument, setInstrument] = useState('EURUSD');
  const [direction, setDirection] = useState<Direction>('Buy');
  const [lots, setLots] = useState<number>(100);
  const [session, setSession] = useState('London');

  // Execution State
  const [entryPrice, setEntryPrice] = useState<number>(1.18423);
  const [exitPrice, setExitPrice] = useState<number>(1.18650);
  const [stopLoss, setStopLoss] = useState<string>('1.18100');
  const [takeProfit, setTakeProfit] = useState<string>('1.19000');
  const [pnlManual, setPnlManual] = useState<string>('');
  const [riskR, setRiskR] = useState<string>('1.0');
  const [returnR, setReturnR] = useState<string>('2.5');
  const [swap, setSwap] = useState<string>('0.00');
  const [commission, setCommission] = useState<string>('-150.00');

  // Reflection State
  const [followedPlan, setFollowedPlan] = useState(true);
  const [planName, setPlanName] = useState('A+ Setup Checklist');
  const [confluences, setConfluences] = useState<string[]>([
    'LQ sweep',
    'LTF POI Mitigation',
  ]);
  const [customConfluence, setCustomConfluence] = useState('');
  const [tradeManagement, setTradeManagement] = useState(
    'Partial at 1R, move SL to BE after 1R, set and forget'
  );
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [customMistake, setCustomMistake] = useState('');
  const [entryEmotion, setEntryEmotion] = useState('🤩 Confident');
  const [exitEmotion, setExitEmotion] = useState('🧘 Disciplined');
  const [notes, setNotes] = useState('');

  // Charts State
  const [chartHtf, setChartHtf] = useState<string>('');
  const [chartMtf, setChartMtf] = useState<string>('');
  const [chartLtf, setChartLtf] = useState<string>('');
  const [uploadingTimeframe, setUploadingTimeframe] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculated PnL if not overridden
  const calcPnl = () => {
    if (pnlManual !== '') return parseFloat(pnlManual) || 0;
    const diff = direction === 'Buy' ? exitPrice - entryPrice : entryPrice - exitPrice;
    const mult = instrument.includes('USD') || instrument.includes('CHF') ? 100000 : 100;
    const rough = diff * mult * lots;
    return Math.round(rough * 100) / 100;
  };

  const currentPnl = calcPnl();

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    timeframe: 'htf' | 'mtf' | 'ltf'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTimeframe(timeframe);
    try {
      const url = await uploadChartImage(file, timeframe);
      if (timeframe === 'htf') setChartHtf(url);
      if (timeframe === 'mtf') setChartMtf(url);
      if (timeframe === 'ltf') setChartLtf(url);
    } catch (err) {
      console.error('Failed to upload chart image:', err);
    } finally {
      setUploadingTimeframe(null);
    }
  };

  const toggleConfluence = (item: string) => {
    setConfluences((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addCustomConfluence = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (!customConfluence.trim()) return;
    if (!confluences.includes(customConfluence.trim())) {
      setConfluences([...confluences, customConfluence.trim()]);
    }
    setCustomConfluence('');
  };

  const toggleMistake = (item: string) => {
    setMistakes((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addCustomMistake = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (!customMistake.trim()) return;
    if (!mistakes.includes(customMistake.trim())) {
      setMistakes([...mistakes, customMistake.trim()]);
    }
    setCustomMistake('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        entryDate,
        entryTime,
        exitDate,
        exitTime,
        instrument: instrument.trim().toUpperCase(),
        direction,
        lots,
        entryPrice,
        exitPrice,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        takeProfit: takeProfit ? parseFloat(takeProfit) : null,
        pnl: currentPnl,
        riskR: riskR ? parseFloat(riskR) : null,
        returnR: returnR ? parseFloat(returnR) : null,
        swap: swap ? parseFloat(swap) : 0,
        commission: commission ? parseFloat(commission) : 0,
        followedPlan,
        planName,
        confluences,
        tradeManagement,
        mistakes,
        entryEmotion,
        exitEmotion,
        notes,
        chartHtf,
        chartMtf,
        chartLtf,
        session,
        duration: '1h 30m',
        source: 'manual',
      });
      onBack();
    } catch (err) {
      console.error('Failed to save trade:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-16 font-sans text-zinc-900 animate-in fade-in-50 duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-950 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          <span>Journal</span>
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Add Trade</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Log execution parameters, multi-timeframe chart proof, and emotional confluences.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: TRADE DETAILS (5 cols)                                       */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <CalendarIcon className="size-4 text-[#704fe6]" />
              <span>Trade Details</span>
            </h2>

            {/* Entry Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1.5">Entry Date</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-[#704fe6] focus:ring-1 focus:ring-[#704fe6]"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1.5">Entry Time</label>
                <input
                  type="time"
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-[#704fe6] focus:ring-1 focus:ring-[#704fe6]"
                  required
                />
              </div>
            </div>

            {/* Exit Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1.5">Exit Date</label>
                <input
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-[#704fe6] focus:ring-1 focus:ring-[#704fe6]"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1.5">Exit Time</label>
                <input
                  type="time"
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-[#704fe6] focus:ring-1 focus:ring-[#704fe6]"
                />
              </div>
            </div>

            {/* Instrument & Direction */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1.5">Instrument</label>
                <input
                  type="text"
                  placeholder="e.g. EURUSD, AUDCHF"
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 uppercase focus:outline-hidden focus:border-[#704fe6] focus:ring-1 focus:ring-[#704fe6] font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1.5">Direction</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 rounded-xl border border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setDirection('Buy')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      direction === 'Buy'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    <TrendingUp className="size-3.5" />
                    <span>Buy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('Sell')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      direction === 'Sell'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    <TrendingDown className="size-3.5" />
                    <span>Sell</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Lots & Session */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1.5">Lots / Size</label>
                <input
                  type="number"
                  step="0.01"
                  value={lots}
                  onChange={(e) => setLots(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-[#704fe6] font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-zinc-600 font-medium block mb-1.5">Session</label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-[#704fe6]"
                >
                  <option value="London">London</option>
                  <option value="New York">New York</option>
                  <option value="Asian">Asian</option>
                  <option value="Pre-Market">Pre-Market</option>
                </select>
              </div>
            </div>

            {/* Execution Sub-card */}
            <div className="pt-3 border-t border-zinc-100 flex flex-col gap-3">
              <span className="text-xs font-semibold text-zinc-800">Execution</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Entry Price</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono focus:outline-hidden focus:border-[#704fe6]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Exit Price</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono focus:outline-hidden focus:border-[#704fe6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Stop Loss</label>
                  <input
                    type="text"
                    placeholder="e.g. 1.18100"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono focus:outline-hidden focus:border-[#704fe6]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Take Profit</label>
                  <input
                    type="text"
                    placeholder="e.g. 1.19000"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono focus:outline-hidden focus:border-[#704fe6]"
                  />
                </div>
              </div>

              {/* Net P&L */}
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">
                  Net P&L ($) <span className="text-zinc-400 font-normal">(auto-calculated, editable)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={pnlManual !== '' ? pnlManual : currentPnl}
                    onChange={(e) => setPnlManual(e.target.value)}
                    className={`w-full bg-zinc-50 border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-hidden ${
                      currentPnl >= 0
                        ? 'text-emerald-700 border-emerald-300'
                        : 'text-rose-700 border-rose-300'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Performance (Risk R & Return R) */}
            <div className="pt-3 border-t border-zinc-100 flex flex-col gap-3">
              <span className="text-xs font-semibold text-zinc-800">Performance</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Risk (R)</label>
                  <input
                    type="text"
                    placeholder="1.0R"
                    value={riskR}
                    onChange={(e) => setRiskR(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono focus:outline-hidden focus:border-[#704fe6]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Return (R)</label>
                  <input
                    type="text"
                    placeholder="2.5R"
                    value={returnR}
                    onChange={(e) => setReturnR(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono focus:outline-hidden focus:border-[#704fe6]"
                  />
                </div>
              </div>
            </div>

            {/* Costs (Swap & Commission) */}
            <div className="pt-3 border-t border-zinc-100 flex flex-col gap-3">
              <span className="text-xs font-semibold text-zinc-800">Costs</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Swap ($)</label>
                  <input
                    type="text"
                    value={swap}
                    onChange={(e) => setSwap(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono focus:outline-hidden focus:border-[#704fe6]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Commission ($)</label>
                  <input
                    type="text"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono focus:outline-hidden focus:border-[#704fe6]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: CHARTS + REVIEW & REFLECTION (7 cols)                       */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Charts Card (HTF, MTF, LTF) */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  <ImageIcon className="size-4 text-[#704fe6]" />
                  <span>Charts</span>
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Add screenshots to review context + execution:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* HTF */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-600 font-medium">
                  <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700">
                    HTF <Info className="size-3 text-zinc-400" />
                  </span>
                  {chartHtf && (
                    <button
                      type="button"
                      onClick={() => setChartHtf('')}
                      className="text-zinc-400 hover:text-rose-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                <label className="relative border border-dashed border-zinc-300 hover:border-purple-400 bg-zinc-50/70 hover:bg-zinc-50 rounded-xl h-36 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all group">
                  {chartHtf ? (
                    <img
                      src={chartHtf}
                      alt="HTF Chart"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-zinc-400 group-hover:text-purple-600">
                      <Upload className="size-5 mb-1" />
                      <span className="text-[11px] font-medium text-zinc-600 group-hover:text-purple-700">
                        Upload HTF
                      </span>
                      <span className="text-[9px] text-zinc-400">Daily / 4H context</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileChange(e, 'htf')}
                    className="hidden"
                  />
                </label>
              </div>

              {/* MTF */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-600 font-medium">
                  <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700">
                    MTF <Info className="size-3 text-zinc-400" />
                  </span>
                  {chartMtf && (
                    <button
                      type="button"
                      onClick={() => setChartMtf('')}
                      className="text-zinc-400 hover:text-rose-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                <label className="relative border border-dashed border-zinc-300 hover:border-purple-400 bg-zinc-50/70 hover:bg-zinc-50 rounded-xl h-36 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all group">
                  {chartMtf ? (
                    <img
                      src={chartMtf}
                      alt="MTF Chart"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-zinc-400 group-hover:text-purple-600">
                      <Upload className="size-5 mb-1" />
                      <span className="text-[11px] font-medium text-zinc-600 group-hover:text-purple-700">
                        Upload MTF
                      </span>
                      <span className="text-[9px] text-zinc-400">1H / 15M structure</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileChange(e, 'mtf')}
                    className="hidden"
                  />
                </label>
              </div>

              {/* LTF */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-600 font-medium">
                  <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700">
                    LTF <Info className="size-3 text-zinc-400" />
                  </span>
                  {chartLtf && (
                    <button
                      type="button"
                      onClick={() => setChartLtf('')}
                      className="text-zinc-400 hover:text-rose-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                <label className="relative border border-dashed border-zinc-300 hover:border-purple-400 bg-zinc-50/70 hover:bg-zinc-50 rounded-xl h-36 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all group">
                  {chartLtf ? (
                    <img
                      src={chartLtf}
                      alt="LTF Chart"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-zinc-400 group-hover:text-purple-600">
                      <Upload className="size-5 mb-1" />
                      <span className="text-[11px] font-medium text-zinc-600 group-hover:text-purple-700">
                        Upload LTF
                      </span>
                      <span className="text-[9px] text-zinc-400">5M / 1M execution</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileChange(e, 'ltf')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Review & Reflection Card */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-5">
            <h2 className="text-sm font-semibold text-zinc-900">Review & Reflection</h2>

            {/* Plan followed & which plan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={followedPlan}
                  onChange={(e) => setFollowedPlan(e.target.checked)}
                  className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500 size-4"
                />
                <span className="text-xs font-medium text-zinc-800">I followed my trade plan</span>
              </label>

              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">
                  Which plan did you intend to follow?
                </label>
                <select
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-[#704fe6]"
                >
                  <option value="A+ Setup Checklist">A+ Setup Checklist</option>
                  <option value="Liquidity Sweep">Liquidity Sweep</option>
                  <option value="Breakout & Retest">Breakout & Retest</option>
                  <option value="Trend Continuation">Trend Continuation</option>
                  <option value="Supply & Demand Reversal">Supply & Demand Reversal</option>
                </select>
              </div>
            </div>

            {/* Entry Confluences */}
            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-2">
                Entry Confluences
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {COMMON_CONFLUENCES.map((item) => {
                  const active = confluences.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleConfluence(item)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                        active
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {active ? `✓ ${item}` : item}
                    </button>
                  );
                })}
              </div>

              {/* Custom Confluence Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add custom confluence..."
                  value={customConfluence}
                  onChange={(e) => setCustomConfluence(e.target.value)}
                  onKeyDown={addCustomConfluence}
                  className="flex-1 bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-purple-600"
                />
                <button
                  type="button"
                  onClick={addCustomConfluence}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Trade Management */}
            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-1">
                Trade Management
              </label>
              <input
                type="text"
                placeholder="e.g. Partial at 1R, move SL to BE after 1R, set and forget etc."
                value={tradeManagement}
                onChange={(e) => setTradeManagement(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-purple-600"
              />
            </div>

            {/* Mistakes */}
            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-2">
                Mistakes <span className="text-zinc-400 font-normal">(if any)</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {COMMON_MISTAKES.map((item) => {
                  const active = mistakes.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleMistake(item)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                        active
                          ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {active ? `✕ ${item}` : item}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add custom mistake..."
                  value={customMistake}
                  onChange={(e) => setCustomMistake(e.target.value)}
                  onKeyDown={addCustomMistake}
                  className="flex-1 bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-purple-600"
                />
                <button
                  type="button"
                  onClick={addCustomMistake}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Emotions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Entry Emotion</label>
                <select
                  value={entryEmotion}
                  onChange={(e) => setEntryEmotion(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-purple-600"
                >
                  {ENTRY_EMOTIONS.map((em) => (
                    <option key={em} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Exit Emotion</label>
                <select
                  value={exitEmotion}
                  onChange={(e) => setExitEmotion(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-purple-600"
                >
                  {EXIT_EMOTIONS.map((em) => (
                    <option key={em} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes / Reflection Textarea */}
            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-1">
                Add a note or voice reflection
              </label>
              <textarea
                rows={3}
                placeholder="What went well? What will you do differently next time?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-purple-600 resize-none"
              />
            </div>
          </div>

          {/* Bottom Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-xs font-semibold text-zinc-700 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#704fe6] hover:bg-[#5f3dd4] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Save Manual Trade</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
