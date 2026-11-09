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
  Plus,
} from 'lucide-react';
import { Direction, JournalTrade } from './types';
import { uploadChartImage } from './storage';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddTradeViewProps {
  onBack: () => void;
  onSave: (trade: Partial<JournalTrade>) => Promise<void>;
  initialDate?: string;
}

const CONFLUENCE_CATEGORIES = {
  structure: [
    'LQ sweep',
    'Internal BOS',
    'CHoCH',
    'Swing BOS',
    'Session High Sweep',
    'Session Low Sweep',
    'Asia Range Liquidity',
  ],
  orderflow: [
    'LTF POI Mitigation',
    'MTF POI mitigation',
    '4H FVG Fill',
    'Order Block',
    'Breaker Block',
    'Fair Value Gap',
    'Discount / Premium Array',
  ],
  execution: [
    'Breakout & Retest',
    'Volume Spike',
    'Wick Rejection',
    'Inducement Taken',
    'Momentum Shift',
    'SMR Confirmation',
  ],
  session: [
    'London Open Expansion',
    'London Close Reversal',
    'New York AM Silver Bullet',
    'New York PM Session',
    'Asia Open Accumulation',
  ],
};

const MISTAKE_CATEGORIES = {
  execution: [
    'Impatience',
    'too late',
    'front-running signal',
    'chasing price',
    'hesitation / missed entry',
  ],
  risk: [
    'overleveraged',
    'moved SL',
    'removed SL',
    'risked > 1%',
    'bad risk-to-reward',
  ],
  psychology: [
    'fomo',
    'revenge trading',
    'fighting trend',
    'boredom trade',
    'no clear invalidation',
    'overtrading',
  ],
};

const ENTRY_EMOTIONS = [
  'Confident',
  'Neutral',
  'Revenge',
  'FOMO',
  'Fearful',
  'Impatient',
];

const EXIT_EMOTIONS = [
  'Relieved',
  'Disciplined',
  'Greedy',
  'Frustrated',
  'Regret',
  'Neutral',
];

const QUICK_INSTRUMENTS = ['EURUSD', 'GBPUSD', 'AUDCHF', 'USDJPY', 'XAUUSD', 'BTCUSD', 'NDX100'];

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
  const [entryEmotion, setEntryEmotion] = useState('Confident');
  const [exitEmotion, setExitEmotion] = useState('Disciplined');
  const [notes, setNotes] = useState('');

  // Chart screenshots (HTF, MTF, LTF)
  const [chartHtf, setChartHtf] = useState<string | null>(null);
  const [chartMtf, setChartMtf] = useState<string | null>(null);
  const [chartLtf, setChartLtf] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-calculated PnL if not overridden manually
  const calculatedPnl = React.useMemo(() => {
    if (pnlManual !== '') return parseFloat(pnlManual) || 0;
    const diff = direction === 'Buy' ? exitPrice - entryPrice : entryPrice - exitPrice;
    return Math.round(diff * lots * 100000);
  }, [entryPrice, exitPrice, lots, direction, pnlManual]);

  const toggleConfluence = (item: string) => {
    setConfluences((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  const addCustomConfluence = () => {
    if (!customConfluence.trim()) return;
    if (!confluences.includes(customConfluence.trim())) {
      setConfluences((prev) => [...prev, customConfluence.trim()]);
    }
    setCustomConfluence('');
  };

  const toggleMistake = (item: string) => {
    setMistakes((prev) =>
      prev.includes(item) ? prev.filter((m) => m !== item) : [...prev, item]
    );
  };

  const addCustomMistake = () => {
    if (!customMistake.trim()) return;
    if (!mistakes.includes(customMistake.trim())) {
      setMistakes((prev) => [...prev, customMistake.trim()]);
    }
    setCustomMistake('');
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'htf' | 'mtf' | 'ltf'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(type);
    try {
      const publicUrl = await uploadChartImage(file);
      if (type === 'htf') setChartHtf(publicUrl);
      if (type === 'mtf') setChartMtf(publicUrl);
      if (type === 'ltf') setChartLtf(publicUrl);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        entryDate,
        entryTime,
        exitDate,
        exitTime,
        instrument: instrument.toUpperCase(),
        direction,
        lots,
        entryPrice,
        exitPrice,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        takeProfit: takeProfit ? parseFloat(takeProfit) : null,
        pnl: calculatedPnl,
        riskR: riskR ? parseFloat(riskR) : null,
        returnR: returnR ? parseFloat(returnR) : null,
        swap: parseFloat(swap) || 0,
        commission: parseFloat(commission) || 0,
        followedPlan,
        planName,
        confluences,
        tradeManagement,
        mistakes,
        entryEmotion,
        exitEmotion,
        notes,
        chartHtf: chartHtf || undefined,
        chartMtf: chartMtf || undefined,
        chartLtf: chartLtf || undefined,
        session,
        source: 'manual',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full font-sans pb-20">
      {/* Top Breadcrumb and Actions */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 p-0 hover:bg-transparent"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Calendar</span>
        </Button>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} className="h-8.5 px-4 font-medium">
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-zinc-950 text-white hover:bg-zinc-800 font-semibold shadow-xs h-8.5 px-5"
          >
            {isSaving ? 'Saving...' : 'Save Manual Trade'}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">Add Trade</h1>
        <p className="text-xs text-zinc-500">
          Log execution parameters, multi-timeframe chart proof, and emotional confluences.
        </p>
      </div>

      {/* Main 2-Column Spacious Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        {/* ========================================================================= */}
        {/* COLUMN 1: TRADE DETAILS & EXECUTION (5 Cols)                              */}
        {/* ========================================================================= */}
        <Card className="lg:col-span-5 bg-white border-zinc-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3.5">
            <h2 className="text-sm font-bold text-zinc-950 tracking-tight flex items-center gap-2">
              <CalendarIcon className="size-4 text-zinc-500" />
              Trade Details
            </h2>
            <Badge variant="secondary" className="bg-zinc-100 text-zinc-700 text-xs font-sans font-medium px-2.5 py-0.5 rounded-lg border-zinc-200">
              Manual Entry
            </Badge>
          </div>

          {/* Entry & Exit Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Entry Date</FieldLabel>
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Entry Time</FieldLabel>
              <Input
                type="time"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Exit Date</FieldLabel>
              <Input
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Exit Time</FieldLabel>
              <Input
                type="time"
                value={exitTime}
                onChange={(e) => setExitTime(e.target.value)}
              />
            </Field>
          </div>

          {/* Instrument and Quick Symbol Chips using Button */}
          <Field className="space-y-1.5">
            <FieldLabel>Instrument Symbol</FieldLabel>
            <Input
              type="text"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value.toUpperCase())}
              placeholder="e.g. EURUSD"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_INSTRUMENTS.map((sym) => (
                <Button
                  key={sym}
                  type="button"
                  variant={instrument === sym ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => setInstrument(sym)}
                  className={`h-6.5 px-2.5 text-[11px] font-sans font-medium rounded-lg transition-colors ${
                    instrument === sym
                      ? 'bg-zinc-950 text-white'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {sym}
                </Button>
              ))}
            </div>
          </Field>

          {/* Direction & Lots with Soft Colors */}
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Direction</FieldLabel>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-100/80 border border-zinc-200">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setDirection('Buy')}
                  className={`h-8 font-semibold gap-1.5 rounded-lg transition-all ${
                    direction === 'Buy'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs hover:bg-emerald-100'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-transparent'
                  }`}
                >
                  <TrendingUp className="size-3.5 text-emerald-600" />
                  Buy
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setDirection('Sell')}
                  className={`h-8 font-semibold gap-1.5 rounded-lg transition-all ${
                    direction === 'Sell'
                      ? 'bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs hover:bg-rose-100'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-transparent'
                  }`}
                >
                  <TrendingDown className="size-3.5 text-rose-600" />
                  Sell
                </Button>
              </div>
            </Field>

            <Field>
              <FieldLabel>Lots / Position Size</FieldLabel>
              <Input
                type="number"
                step="0.01"
                value={lots}
                onChange={(e) => setLots(parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>

          {/* Session using COSS Select */}
          <Field>
            <FieldLabel>Trading Session</FieldLabel>
            <Select value={session} onValueChange={setSession}>
              <SelectTrigger className="w-full h-9 rounded-xl border-zinc-200 bg-white text-xs">
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="London">London Session</SelectItem>
                <SelectItem value="New York">New York Session</SelectItem>
                <SelectItem value="Asian">Asian Session</SelectItem>
                <SelectItem value="Overlap">London / NY Overlap</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Execution Prices */}
          <div className="border-t border-zinc-100 pt-5 space-y-4">
            <h3 className="text-xs font-bold text-zinc-950 tracking-tight uppercase">Execution & Pricing</h3>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Entry Price</FieldLabel>
                <Input
                  type="number"
                  step="0.00001"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                />
              </Field>
              <Field>
                <FieldLabel>Exit Price</FieldLabel>
                <Input
                  type="number"
                  step="0.00001"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(parseFloat(e.target.value) || 0)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Stop Loss</FieldLabel>
                <Input
                  type="number"
                  step="0.00001"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Take Profit</FieldLabel>
                <Input
                  type="number"
                  step="0.00001"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Net P&L ($) (Auto-calculated / Editable)</FieldLabel>
              <Input
                type="number"
                value={pnlManual !== '' ? pnlManual : calculatedPnl}
                onChange={(e) => setPnlManual(e.target.value)}
                className={`font-mono font-bold ${
                  calculatedPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Risk (R)</FieldLabel>
                <Input
                  type="number"
                  step="0.1"
                  value={riskR}
                  onChange={(e) => setRiskR(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Return (R)</FieldLabel>
                <Input
                  type="number"
                  step="0.1"
                  value={returnR}
                  onChange={(e) => setReturnR(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Fees & Commission ($)</FieldLabel>
                <Input
                  type="number"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Swap ($)</FieldLabel>
                <Input
                  type="number"
                  value={swap}
                  onChange={(e) => setSwap(e.target.value)}
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* COLUMN 2: CHARTS & TABS (CONFLUENCES / MISTAKES / REFLECTION) (7 Cols)     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-8">
          {/* CHARTS UPLOAD BOXES (HTF, MTF, LTF) */}
          <Card className="bg-white border-zinc-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3.5">
              <div>
                <h2 className="text-sm font-bold text-zinc-950 tracking-tight flex items-center gap-2">
                  <ImageIcon className="size-4 text-zinc-500" />
                  Charts Proof
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Upload screenshots of Higher, Mid, and Lower Timeframe execution proof.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* HTF Slot */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-zinc-700">HTF (Daily / 4H)</span>
                <label className="border border-dashed border-zinc-300 hover:border-zinc-950 bg-zinc-50/50 hover:bg-zinc-50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[145px] group">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'htf')}
                  />
                  {chartHtf ? (
                    <div className="relative w-full h-full flex flex-col items-center">
                      <img src={chartHtf} alt="HTF Chart" className="h-24 w-auto object-cover rounded-lg shadow-2xs" />
                      <Badge variant="secondary" className="text-[10px] text-emerald-700 font-semibold mt-1 bg-emerald-50 border-emerald-200">Uploaded</Badge>
                    </div>
                  ) : (
                    <>
                      <Upload className="size-5 text-zinc-400 group-hover:text-zinc-950 transition-colors mb-2" />
                      <span className="text-xs font-semibold text-zinc-700 group-hover:text-zinc-950">
                        {isUploading === 'htf' ? 'Uploading...' : 'Upload HTF'}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">Click to browse</span>
                    </>
                  )}
                </label>
              </div>

              {/* MTF Slot */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-zinc-700">MTF (1H / 15M)</span>
                <label className="border border-dashed border-zinc-300 hover:border-zinc-950 bg-zinc-50/50 hover:bg-zinc-50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[145px] group">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'mtf')}
                  />
                  {chartMtf ? (
                    <div className="relative w-full h-full flex flex-col items-center">
                      <img src={chartMtf} alt="MTF Chart" className="h-24 w-auto object-cover rounded-lg shadow-2xs" />
                      <Badge variant="secondary" className="text-[10px] text-emerald-700 font-semibold mt-1 bg-emerald-50 border-emerald-200">Uploaded</Badge>
                    </div>
                  ) : (
                    <>
                      <Upload className="size-5 text-zinc-400 group-hover:text-zinc-950 transition-colors mb-2" />
                      <span className="text-xs font-semibold text-zinc-700 group-hover:text-zinc-950">
                        {isUploading === 'mtf' ? 'Uploading...' : 'Upload MTF'}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">Click to browse</span>
                    </>
                  )}
                </label>
              </div>

              {/* LTF Slot */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-zinc-700">LTF (5M / 1M)</span>
                <label className="border border-dashed border-zinc-300 hover:border-zinc-950 bg-zinc-50/50 hover:bg-zinc-50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[145px] group">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'ltf')}
                  />
                  {chartLtf ? (
                    <div className="relative w-full h-full flex flex-col items-center">
                      <img src={chartLtf} alt="LTF Chart" className="h-24 w-auto object-cover rounded-lg shadow-2xs" />
                      <Badge variant="secondary" className="text-[10px] text-emerald-700 font-semibold mt-1 bg-emerald-50 border-emerald-200">Uploaded</Badge>
                    </div>
                  ) : (
                    <>
                      <Upload className="size-5 text-zinc-400 group-hover:text-zinc-950 transition-colors mb-2" />
                      <span className="text-xs font-semibold text-zinc-700 group-hover:text-zinc-950">
                        {isUploading === 'ltf' ? 'Uploading...' : 'Upload LTF'}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">Click to browse</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </Card>

          {/* COSS TABS SECTION FOR CONFLUENCES */}
          <Card className="bg-white border-zinc-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3.5">
              <div>
                <h2 className="text-sm font-bold text-zinc-950 tracking-tight">Entry Confluences</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Categorized strategy confluences and validation reasons</p>
              </div>
              <Badge variant="secondary" className="font-sans text-xs font-semibold bg-zinc-100 text-zinc-800 px-3 py-1 rounded-lg">
                {confluences.length} Selected
              </Badge>
            </div>

            {/* Strict Coss Tabs Component */}
            <Tabs defaultValue="structure" className="w-full">
              <TabsList size="sm" variant="default" className="w-full overflow-x-auto flex p-1 rounded-xl bg-zinc-100/90 border border-zinc-200/80">
                <TabsTab value="structure" className="font-sans text-xs font-semibold tracking-normal py-1.5">Structure</TabsTab>
                <TabsTab value="orderflow" className="font-sans text-xs font-semibold tracking-normal py-1.5">Orderflow & POI</TabsTab>
                <TabsTab value="execution" className="font-sans text-xs font-semibold tracking-normal py-1.5">Execution</TabsTab>
                <TabsTab value="session" className="font-sans text-xs font-semibold tracking-normal py-1.5">Session & Time</TabsTab>
              </TabsList>

              <TabsPanel value="structure" className="pt-4">
                <div className="flex flex-wrap gap-2.5">
                  {CONFLUENCE_CATEGORIES.structure.map((item) => {
                    const isSelected = confluences.includes(item);
                    return (
                      <Button
                        key={item}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => toggleConfluence(item)}
                        className={`h-8 px-3.5 rounded-xl font-medium text-xs transition-colors ${
                          isSelected
                            ? 'bg-zinc-950 text-white shadow-2xs'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {item}
                      </Button>
                    );
                  })}
                </div>
              </TabsPanel>

              <TabsPanel value="orderflow" className="pt-4">
                <div className="flex flex-wrap gap-2.5">
                  {CONFLUENCE_CATEGORIES.orderflow.map((item) => {
                    const isSelected = confluences.includes(item);
                    return (
                      <Button
                        key={item}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => toggleConfluence(item)}
                        className={`h-8 px-3.5 rounded-xl font-medium text-xs transition-colors ${
                          isSelected
                            ? 'bg-zinc-950 text-white shadow-2xs'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {item}
                      </Button>
                    );
                  })}
                </div>
              </TabsPanel>

              <TabsPanel value="execution" className="pt-4">
                <div className="flex flex-wrap gap-2.5">
                  {CONFLUENCE_CATEGORIES.execution.map((item) => {
                    const isSelected = confluences.includes(item);
                    return (
                      <Button
                        key={item}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => toggleConfluence(item)}
                        className={`h-8 px-3.5 rounded-xl font-medium text-xs transition-colors ${
                          isSelected
                            ? 'bg-zinc-950 text-white shadow-2xs'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {item}
                      </Button>
                    );
                  })}
                </div>
              </TabsPanel>

              <TabsPanel value="session" className="pt-4">
                <div className="flex flex-wrap gap-2.5">
                  {CONFLUENCE_CATEGORIES.session.map((item) => {
                    const isSelected = confluences.includes(item);
                    return (
                      <Button
                        key={item}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => toggleConfluence(item)}
                        className={`h-8 px-3.5 rounded-xl font-medium text-xs transition-colors ${
                          isSelected
                            ? 'bg-zinc-950 text-white shadow-2xs'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {item}
                      </Button>
                    );
                  })}
                </div>
              </TabsPanel>
            </Tabs>

            {/* Custom Confluence Input */}
            <div className="flex items-center gap-2.5 pt-3">
              <Input
                type="text"
                placeholder="Add custom confluence..."
                value={customConfluence}
                onChange={(e) => setCustomConfluence(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomConfluence()}
                sizeVariant="default"
              />
              <Button variant="outline" size="sm" onClick={addCustomConfluence} className="h-9 px-4 gap-1.5 font-medium">
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>
          </Card>

          {/* COSS TABS SECTION FOR MISTAKES */}
          <Card className="bg-white border-zinc-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3.5">
              <div>
                <h2 className="text-sm font-bold text-zinc-950 tracking-tight">Mistakes & Rule Breaches</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Track execution errors to uncover subconscious leaks</p>
              </div>
              <Badge variant="secondary" className="font-sans text-xs font-semibold text-rose-700 bg-rose-50 border-rose-200 px-3 py-1 rounded-lg">
                {mistakes.length} Logged
              </Badge>
            </div>

            <Tabs defaultValue="execution-mistakes" className="w-full">
              <TabsList size="sm" variant="default" className="w-full flex p-1 rounded-xl bg-zinc-100/90 border border-zinc-200/80">
                <TabsTab value="execution-mistakes" className="font-sans text-xs font-semibold tracking-normal py-1.5">Execution</TabsTab>
                <TabsTab value="risk-mistakes" className="font-sans text-xs font-semibold tracking-normal py-1.5">Risk & Sizing</TabsTab>
                <TabsTab value="psychology-mistakes" className="font-sans text-xs font-semibold tracking-normal py-1.5">Psychology & FOMO</TabsTab>
              </TabsList>

              <TabsPanel value="execution-mistakes" className="pt-4">
                <div className="flex flex-wrap gap-2.5">
                  {MISTAKE_CATEGORIES.execution.map((item) => {
                    const isSelected = mistakes.includes(item);
                    return (
                      <Button
                        key={item}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => toggleMistake(item)}
                        className={`h-8 px-3.5 rounded-xl font-medium text-xs transition-colors ${
                          isSelected
                            ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs hover:bg-rose-100'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {isSelected ? '✕ ' : '+ '}
                        {item}
                      </Button>
                    );
                  })}
                </div>
              </TabsPanel>

              <TabsPanel value="risk-mistakes" className="pt-4">
                <div className="flex flex-wrap gap-2.5">
                  {MISTAKE_CATEGORIES.risk.map((item) => {
                    const isSelected = mistakes.includes(item);
                    return (
                      <Button
                        key={item}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => toggleMistake(item)}
                        className={`h-8 px-3.5 rounded-xl font-medium text-xs transition-colors ${
                          isSelected
                            ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs hover:bg-rose-100'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {isSelected ? '✕ ' : '+ '}
                        {item}
                      </Button>
                    );
                  })}
                </div>
              </TabsPanel>

              <TabsPanel value="psychology-mistakes" className="pt-4">
                <div className="flex flex-wrap gap-2.5">
                  {MISTAKE_CATEGORIES.psychology.map((item) => {
                    const isSelected = mistakes.includes(item);
                    return (
                      <Button
                        key={item}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => toggleMistake(item)}
                        className={`h-8 px-3.5 rounded-xl font-medium text-xs transition-colors ${
                          isSelected
                            ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs hover:bg-rose-100'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {isSelected ? '✕ ' : '+ '}
                        {item}
                      </Button>
                    );
                  })}
                </div>
              </TabsPanel>
            </Tabs>

            <div className="flex items-center gap-2.5 pt-3">
              <Input
                type="text"
                placeholder="Add custom mistake..."
                value={customMistake}
                onChange={(e) => setCustomMistake(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomMistake()}
                sizeVariant="default"
              />
              <Button variant="outline" size="sm" onClick={addCustomMistake} className="h-9 px-4 gap-1.5 font-medium">
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>
          </Card>

          {/* REVIEW, PLAN & EMOTIONS */}
          <Card className="bg-white border-zinc-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3.5">
              <h2 className="text-sm font-bold text-zinc-950 tracking-tight">Review & Reflection</h2>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={followedPlan}
                  onChange={(e) => setFollowedPlan(e.target.checked)}
                  className="rounded text-zinc-950 focus:ring-zinc-950 size-4"
                />
                <span className="text-xs font-semibold text-zinc-900">I followed my trade plan</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Entry Emotion</FieldLabel>
                <Select value={entryEmotion} onValueChange={setEntryEmotion}>
                  <SelectTrigger className="w-full h-9 rounded-xl border-zinc-200 bg-white text-xs">
                    <SelectValue placeholder="Select entry emotion" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRY_EMOTIONS.map((em) => (
                      <SelectItem key={em} value={em}>
                        {em}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Exit Emotion</FieldLabel>
                <Select value={exitEmotion} onValueChange={setExitEmotion}>
                  <SelectTrigger className="w-full h-9 rounded-xl border-zinc-200 bg-white text-xs">
                    <SelectValue placeholder="Select exit emotion" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXIT_EMOTIONS.map((em) => (
                      <SelectItem key={em} value={em}>
                        {em}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel>Trade Management Strategy</FieldLabel>
              <Input
                type="text"
                value={tradeManagement}
                onChange={(e) => setTradeManagement(e.target.value)}
                placeholder="e.g. Partial at 1R, move SL to BE..."
              />
            </Field>

            <Field>
              <FieldLabel>Reflection Notes</FieldLabel>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What went well? What will you do differently next time?"
              />
            </Field>
          </Card>
        </div>
      </div>
    </div>
  );
}
