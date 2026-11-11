'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Upload,
  X,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Image as ImageIcon,
  Plus,
  Eye,
  Trash2,
  Clock,
} from 'lucide-react';
import { Direction, JournalTrade } from './types';
import { uploadChartImage } from './storage';
import { ChartLightbox } from './ChartLightbox';
import { InstrumentPicker } from './InstrumentPicker';
import { JournalDatePicker, JournalTimeSelect } from './JournalDateTimeFields';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { Field, FieldLabel } from '@/components/ui/field';
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
  /** Pre-fill with an existing trade to edit all fields & charts */
  editTrade?: JournalTrade | null;
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

const ENTRY_EMOTIONS = ['Confident', 'Neutral', 'Revenge', 'FOMO', 'Fearful', 'Impatient'];
const EXIT_EMOTIONS = ['Relieved', 'Disciplined', 'Greedy', 'Frustrated', 'Regret', 'Neutral'];

const GUARDRAIL_PILLARS = ['Structure', 'Orderflow & POI', 'Execution', 'Session & Time'];
const CRYPTO_PREFIXES = ['BTC', 'ETH', 'SOL', 'XRP', 'LTC', 'DOGE', 'ADA', 'BNB', 'AVAX'];

function isGuardrailMistake(m: string): boolean {
  return GUARDRAIL_PILLARS.some(
    (p) => m === p || m === `Missing ${p}` || m.startsWith('[guardrail]') || m.startsWith('Guardrail:')
  );
}

/** Contract size per 1.0 lot depending on asset class */
function getContractMultiplier(symbol: string, refPrice: number): number {
  const clean = symbol.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (clean.startsWith('XAU')) return 100; // 100 oz Gold per standard lot
  if (clean.startsWith('XAG')) return 5000; // 5000 oz Silver per standard lot
  if (CRYPTO_PREFIXES.some((p) => clean.startsWith(p))) return 1;
  if (clean.length === 6) {
    if (clean.endsWith('JPY')) {
      return refPrice > 0 ? 100000 / refPrice : 1000;
    }
    return 100000;
  }
  return 1;
}

interface ComputedMetrics {
  riskR: string;
  returnR: string;
  pnl: string;
}

function isOutOfPriceScale(price: number, refPrice: number): boolean {
  if (price <= 0 || refPrice <= 0) return false;
  return price < refPrice * 0.5 || price > refPrice * 2;
}

function computeTradeMetrics(params: {
  entryPrice: string;
  exitPrice: string;
  stopLoss: string;
  takeProfit: string;
  lots: string;
  direction: Direction;
  instrument: string;
  commission: string;
  swap: string;
  manualPnl?: string;
  isPnlCustom?: boolean;
}): ComputedMetrics {
  const ep = parseFloat(params.entryPrice) || 0;
  const xp = parseFloat(params.exitPrice) || 0;
  const sl = parseFloat(params.stopLoss) || 0;
  const tp = parseFloat(params.takeProfit) || 0;
  const l = Math.max(0, parseFloat(params.lots) || 0);
  const comm = parseFloat(params.commission) || 0;
  const swp = parseFloat(params.swap) || 0;
  // Fees & commission reduce net P&L regardless of whether entered as positive or negative
  const feeDebit = Math.abs(comm);

  let riskDist = 0;
  const slValidScale = sl > 0 && !isOutOfPriceScale(sl, ep);
  if (ep > 0 && slValidScale) {
    riskDist = params.direction === 'Buy' ? ep - sl : sl - ep;
  }

  const tpValidScale = tp > 0 && !isOutOfPriceScale(tp, ep);
  const targetPrice = xp > 0 ? xp : tpValidScale ? tp : 0;
  const mult = getContractMultiplier(params.instrument, xp > 0 ? xp : ep);

  const autoRiskR = riskDist > 0 ? '1.0' : '0';

  let autoPnl = '0';
  if (ep > 0 && targetPrice > 0 && l > 0) {
    const diff = params.direction === 'Buy' ? targetPrice - ep : ep - targetPrice;
    const gross = diff * l * mult;
    const net = Math.round((gross - feeDebit + swp) * 100) / 100;
    autoPnl = net.toString();
  }

  const customPnlNum = params.isPnlCustom ? parseFloat(params.manualPnl ?? '') : NaN;
  let autoReturnR = '0';
  if (riskDist > 0) {
    const dollarRisk = l > 0 ? riskDist * l * mult : 0;
    if (dollarRisk > 0 && Number.isFinite(customPnlNum)) {
      autoReturnR = Number((customPnlNum / dollarRisk).toFixed(2)).toString();
    } else if (targetPrice > 0) {
      const rewardDist = params.direction === 'Buy' ? targetPrice - ep : ep - targetPrice;
      if (xp > 0 && dollarRisk > 0) {
        const netDollar = rewardDist * l * mult - feeDebit + swp;
        autoReturnR = Number((netDollar / dollarRisk).toFixed(2)).toString();
      } else {
        autoReturnR = Number((rewardDist / riskDist).toFixed(2)).toString();
      }
    }
  }

  return { riskR: autoRiskR, returnR: autoReturnR, pnl: autoPnl };
}

function calculateTradeDuration(
  entryDate: string,
  entryTime: string,
  exitDate: string,
  exitTime: string
): string {
  if (!entryDate || !exitDate || !entryTime || !exitTime) return '';
  const start = new Date(`${entryDate}T${entryTime}`);
  const end = new Date(`${exitDate}T${exitTime}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return '0m';
  const totalMins = Math.round(diffMs / 60000);
  if (totalMins < 60) return `${totalMins}m`;
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  return parts.join(' ');
}

/**
 * Controlled decimal sanitizer that preserves "-", "-0.", "0.", and leading zeros cleanly
 * instead of HTML5 <input type="number"> swallowing "-" keystrokes.
 */
function sanitizeDecimalInput(raw: string, allowNegative: boolean): string {
  if (raw === '') return '';
  let cleaned = '';
  let hasDot = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '-' && allowNegative && cleaned.length === 0) {
      cleaned += '-';
    } else if (ch >= '0' && ch <= '9') {
      cleaned += ch;
    } else if (ch === '.' && !hasDot) {
      cleaned += '.';
      hasDot = true;
    }
  }
  if (cleaned === '' || cleaned === '-') return cleaned;
  const neg = cleaned.startsWith('-');
  const body = neg ? cleaned.slice(1) : cleaned;
  const normalizedBody =
    body.length > 1 && body.startsWith('0') && !body.startsWith('0.')
      ? body.replace(/^0+/, '') || '0'
      : body;
  return neg ? `-${normalizedBody}` : normalizedBody;
}

export function AddTradeView({ onBack, onSave, initialDate, editTrade }: AddTradeViewProps) {
  const isEditMode = !!editTrade;
  const defaultDate = initialDate || editTrade?.entryDate || new Date().toISOString().split('T')[0];

  // Trade Details State
  const [entryDate, setEntryDate] = useState(editTrade?.entryDate || defaultDate);
  const [entryTime, setEntryTime] = useState(editTrade?.entryTime || '09:30');
  const [exitDate, setExitDate] = useState(editTrade?.exitDate || defaultDate);
  const [exitDateSynced, setExitDateSynced] = useState(!editTrade?.exitDate || editTrade.exitDate === editTrade.entryDate);
  const [exitTime, setExitTime] = useState(editTrade?.exitTime || '11:00');
  const [instrument, setInstrument] = useState(editTrade?.instrument || 'EURUSD');
  const [direction, setDirection] = useState<Direction>(editTrade?.direction || 'Buy');
  const [lots, setLots] = useState<string>(String(editTrade?.lots ?? '0'));
  const [session, setSession] = useState(editTrade?.session || 'London');

  // Execution State
  const initMetrics = editTrade
    ? computeTradeMetrics({
        entryPrice: String(editTrade.entryPrice ?? '0'),
        exitPrice: String(editTrade.exitPrice ?? '0'),
        stopLoss: String(editTrade.stopLoss ?? '0'),
        takeProfit: String(editTrade.takeProfit ?? '0'),
        lots: String(editTrade.lots ?? '0'),
        direction: editTrade.direction || 'Buy',
        instrument: editTrade.instrument || 'EURUSD',
        commission: String(editTrade.commission ?? '0.00'),
        swap: String(editTrade.swap ?? '0.00'),
      })
    : null;
  const initPnlAuto = initMetrics ? parseFloat(initMetrics.pnl) || 0 : 0;
  const initPnlIsCustom =
    isEditMode &&
    (editTrade?.pnl ?? 0) !== 0 &&
    Math.abs((editTrade?.pnl ?? 0) - initPnlAuto) > 0.01;
  const initMetricsWithPnl =
    editTrade && initPnlIsCustom
      ? computeTradeMetrics({
          entryPrice: String(editTrade.entryPrice ?? '0'),
          exitPrice: String(editTrade.exitPrice ?? '0'),
          stopLoss: String(editTrade.stopLoss ?? '0'),
          takeProfit: String(editTrade.takeProfit ?? '0'),
          lots: String(editTrade.lots ?? '0'),
          direction: editTrade.direction || 'Buy',
          instrument: editTrade.instrument || 'EURUSD',
          commission: String(editTrade.commission ?? '0.00'),
          swap: String(editTrade.swap ?? '0.00'),
          manualPnl: String(editTrade.pnl),
          isPnlCustom: true,
        })
      : initMetrics;

  const [entryPrice, setEntryPrice] = useState<string>(String(editTrade?.entryPrice ?? '0'));
  const [exitPrice, setExitPrice] = useState<string>(String(editTrade?.exitPrice ?? '0'));
  const [stopLoss, setStopLoss] = useState<string>(String(editTrade?.stopLoss ?? '0'));
  const [takeProfit, setTakeProfit] = useState<string>(String(editTrade?.takeProfit ?? '0'));
  const [pnlManual, setPnlManual] = useState<string>(String(editTrade?.pnl ?? '0'));
  const [isPnlCustom, setIsPnlCustom] = useState(initPnlIsCustom);
  const [pnlSignMode, setPnlSignMode] = useState<'auto' | 'profit' | 'loss'>(
    isEditMode && (editTrade?.pnl ?? 0) < 0
      ? 'loss'
      : isEditMode && (editTrade?.pnl ?? 0) > 0
        ? 'profit'
        : 'auto'
  );
  const [riskR, setRiskR] = useState<string>(String(editTrade?.riskR ?? '0'));
  const [isRiskCustom, setIsRiskCustom] = useState(
    isEditMode &&
      editTrade?.riskR !== null &&
      editTrade?.riskR !== undefined &&
      editTrade.riskR !== 0 &&
      Math.abs(editTrade.riskR - (parseFloat(initMetricsWithPnl?.riskR ?? '0') || 0)) > 0.01
  );
  const [returnR, setReturnR] = useState<string>(String(editTrade?.returnR ?? '0'));
  const [isReturnCustom, setIsReturnCustom] = useState(
    isEditMode &&
      editTrade?.returnR !== null &&
      editTrade?.returnR !== undefined &&
      editTrade.returnR !== 0 &&
      Math.abs(editTrade.returnR - (parseFloat(initMetricsWithPnl?.returnR ?? '0') || 0)) > 0.01
  );
  const [swap, setSwap] = useState<string>(String(editTrade?.swap ?? '0.00'));
  const [commission, setCommission] = useState<string>(String(editTrade?.commission ?? '0.00'));

  // Reflection State
  const [followedPlan, setFollowedPlan] = useState(editTrade?.followedPlan ?? true);
  const [planName, setPlanName] = useState(editTrade?.planName || '');
  const [confluences, setConfluences] = useState<string[]>(editTrade?.confluences || []);
  const [customConfluence, setCustomConfluence] = useState('');
  const [tradeManagement, setTradeManagement] = useState(editTrade?.tradeManagement || '');
  const [mistakes, setMistakes] = useState<string[]>(
    editTrade?.mistakes?.filter((m) => m && m.toLowerCase() !== 'none' && !isGuardrailMistake(m)) || []
  );
  const [customMistake, setCustomMistake] = useState('');
  const [entryEmotion, setEntryEmotion] = useState(editTrade?.entryEmotion || 'Confident');
  const [exitEmotion, setExitEmotion] = useState(editTrade?.exitEmotion || 'Disciplined');
  const [notes, setNotes] = useState(editTrade?.notes || '');

  // Chart screenshots (HTF, MTF, LTF)
  const [chartHtf, setChartHtf] = useState<string | null>(editTrade?.chartHtf || null);
  const [chartMtf, setChartMtf] = useState<string | null>(editTrade?.chartMtf || null);
  const [chartLtf, setChartLtf] = useState<string | null>(editTrade?.chartLtf || null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Guardrail pillar status (used for green tab dots & saved guardrail violations)
  const hasStructure = confluences.some((c) => CONFLUENCE_CATEGORIES.structure.includes(c));
  const hasOrderflow = confluences.some((c) => CONFLUENCE_CATEGORIES.orderflow.includes(c));
  const hasExecution = confluences.some((c) => CONFLUENCE_CATEGORIES.execution.includes(c));
  const hasSession = confluences.some((c) => CONFLUENCE_CATEGORIES.session.includes(c));

  const missingConfluences = React.useMemo(() => {
    const list: string[] = [];
    if (!hasStructure) list.push('Structure');
    if (!hasOrderflow) list.push('Orderflow & POI');
    if (!hasExecution) list.push('Execution');
    if (!hasSession) list.push('Session & Time');
    return list;
  }, [hasStructure, hasOrderflow, hasExecution, hasSession]);

  const liveDuration = React.useMemo(
    () => calculateTradeDuration(entryDate, entryTime, exitDate, exitTime),
    [entryDate, entryTime, exitDate, exitTime]
  );

  // Auto-calculate Risk (R), Return (R), Net P&L when inputs change and user hasn't overridden
  useEffect(() => {
    const auto = computeTradeMetrics({
      entryPrice,
      exitPrice,
      stopLoss,
      takeProfit,
      lots,
      direction,
      instrument,
      commission,
      swap,
      manualPnl: pnlManual,
      isPnlCustom,
    });
    if (!isRiskCustom) setRiskR(auto.riskR);
    if (!isReturnCustom) setReturnR(auto.returnR);
    if (!isPnlCustom) setPnlManual(auto.pnl);
  }, [
    entryPrice,
    exitPrice,
    stopLoss,
    takeProfit,
    lots,
    direction,
    instrument,
    commission,
    swap,
    pnlManual,
    isRiskCustom,
    isReturnCustom,
    isPnlCustom,
  ]);

  const toggleConfluence = (item: string) => {
    setConfluences((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  const addCustomConfluence = () => {
    const clean = customConfluence.trim();
    if (!clean) return;
    if (!confluences.includes(clean)) {
      setConfluences((prev) => [...prev, clean]);
    }
    setCustomConfluence('');
  };

  const toggleMistake = (item: string) => {
    setMistakes((prev) =>
      prev.includes(item) ? prev.filter((m) => m !== item) : [...prev, item]
    );
  };

  const addCustomMistake = () => {
    const clean = customMistake.trim();
    if (!clean || clean.toLowerCase() === 'none') return;
    if (!mistakes.includes(clean)) {
      setMistakes((prev) => [...prev, clean]);
    }
    setCustomMistake('');
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'htf' | 'mtf' | 'ltf'
  ) => {
    const file = e.target.files?.[0];
    // Reset input so choosing the same filename again still triggers onChange
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    setIsUploading(type);
    try {
      const publicUrl = await uploadChartImage(file, type);
      if (type === 'htf') setChartHtf(publicUrl);
      if (type === 'mtf') setChartMtf(publicUrl);
      if (type === 'ltf') setChartLtf(publicUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to process image.');
    } finally {
      setIsUploading(null);
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const ep = parseFloat(entryPrice) || 0;
      const xp = parseFloat(exitPrice) || 0;
      const sl = parseFloat(stopLoss) || 0;
      const tp = parseFloat(takeProfit) || 0;
      const l = Math.max(0, parseFloat(lots) || 0);
      const comm = parseFloat(commission) || 0;
      const swp = parseFloat(swap) || 0;

      // Shared auto-calculation fallback whenever not explicitly customized or left blank
      const auto = computeTradeMetrics({
        entryPrice,
        exitPrice,
        stopLoss,
        takeProfit,
        lots,
        direction,
        instrument,
        commission,
        swap,
        manualPnl: pnlManual,
        isPnlCustom,
      });

      const parsedRiskR = riskR.trim() !== '' ? parseFloat(riskR) : NaN;
      let finalRiskR: number | null =
        Number.isFinite(parsedRiskR) && parsedRiskR > 0 ? parsedRiskR : null;
      if (!isRiskCustom && parseFloat(auto.riskR) > 0) {
        finalRiskR = parseFloat(auto.riskR);
      }

      const parsedReturnR = returnR.trim() !== '' ? parseFloat(returnR) : NaN;
      let finalReturnR: number | null = Number.isFinite(parsedReturnR) ? parsedReturnR : null;
      if (!isReturnCustom && auto.returnR !== '0') {
        finalReturnR = parseFloat(auto.returnR);
      }

      const parsedPnl = pnlManual.trim() !== '' ? parseFloat(pnlManual) : NaN;
      let finalPnl = Number.isFinite(parsedPnl) ? parsedPnl : parseFloat(auto.pnl) || 0;
      if (!isPnlCustom) {
        finalPnl = parseFloat(auto.pnl) || 0;
      }
      if (Object.is(finalPnl, -0)) finalPnl = 0;

      const allMistakes = Array.from(new Set([...mistakes, ...missingConfluences]));

      await onSave({
        ...(editTrade ? { id: editTrade.id } : {}),
        entryDate,
        entryTime,
        exitDate: exitDate || undefined,
        exitTime: exitTime || undefined,
        instrument: (instrument || 'EURUSD').trim().toUpperCase(),
        direction,
        lots: l,
        entryPrice: ep,
        exitPrice: xp,
        stopLoss: sl > 0 ? sl : null,
        takeProfit: tp > 0 ? tp : null,
        pnl: finalPnl,
        riskR: finalRiskR,
        returnR: finalReturnR,
        swap: swp,
        commission: comm,
        followedPlan,
        planName: planName.trim(),
        confluences,
        tradeManagement: tradeManagement.trim(),
        mistakes: allMistakes,
        entryEmotion,
        exitEmotion,
        notes,
        chartHtf: chartHtf || undefined,
        chartMtf: chartMtf || undefined,
        chartLtf: chartLtf || undefined,
        session,
        duration: liveDuration || editTrade?.duration || '',
        splitOrders: editTrade?.splitOrders,
        source: editTrade?.source || 'manual',
      });
    } catch (err) {
      console.error('Save trade failed:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save trade. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  function ChartUploadSlot({
    type,
    title,
    value,
    onClear,
  }: {
    type: 'htf' | 'mtf' | 'ltf';
    title: string;
    value: string | null;
    onClear: () => void;
  }) {
    const labelText = `Upload ${type.toUpperCase()}`;
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-zinc-700">{title}</span>
        {value ? (
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-zinc-200 bg-white group shadow-2xs">
            <img
              src={value}
              alt={`${type.toUpperCase()} Chart`}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5">
              <button
                type="button"
                title="View fullscreen"
                onClick={() => setPreviewImage({ url: value, title })}
                className="p-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition-colors cursor-pointer"
              >
                <Eye className="size-4.5" />
              </button>
              <button
                type="button"
                title="Remove chart"
                onClick={onClear}
                className="p-2.5 rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white backdrop-blur-xs transition-colors cursor-pointer"
              >
                <Trash2 className="size-4.5" />
              </button>
            </div>
          </div>
        ) : (
          <label className="border border-dashed border-zinc-300 hover:border-zinc-950 bg-zinc-50/50 hover:bg-zinc-50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-[4/3] group">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, type)}
            />
            <Upload className="size-5 text-zinc-400 group-hover:text-zinc-950 transition-colors mb-2" />
            <span className="text-xs font-semibold text-zinc-700 group-hover:text-zinc-950">
              {isUploading === type ? 'Processing...' : labelText}
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Click to browse</span>
          </label>
        )}
      </div>
    );
  }

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
          <span>Back to Journal</span>
        </Button>

        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onBack} className="h-8.5 px-4 font-medium">
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || isUploading !== null}
            className="bg-zinc-950 text-white hover:bg-zinc-800 font-semibold shadow-xs h-8.5 px-5"
          >
            {isSaving ? 'Saving...' : isEditMode ? 'Update Trade' : 'Save Trade'}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">
          {isEditMode ? `Edit Trade · ${editTrade?.instrument}` : 'Add Trade'}
        </h1>
        <p className="text-xs text-zinc-500">
          Log execution parameters, multi-timeframe chart proof, and emotional confluences.
        </p>
      </div>

      {saveError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 font-medium">
          {saveError}
        </div>
      )}

      {/* Main 2-Column Layout */}
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
            {liveDuration && (
              <span className="inline-flex items-center gap-1 text-[11px] font-sans tabular-nums text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                <Clock className="size-3" />
                {liveDuration}
              </span>
            )}
          </div>

          {/* Entry & Exit Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="entry-date-picker">Entry Date</FieldLabel>
              <JournalDatePicker
                id="entry-date-picker"
                ariaLabel="Entry Date"
                value={entryDate}
                onChange={(val) => {
                  setEntryDate(val);
                  if (exitDateSynced) setExitDate(val);
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="entry-time-select">Entry Time</FieldLabel>
              <JournalTimeSelect
                id="entry-time-select"
                ariaLabel="Entry Time"
                value={entryTime}
                onChange={setEntryTime}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="exit-date-picker">Exit Date</FieldLabel>
              <JournalDatePicker
                id="exit-date-picker"
                ariaLabel="Exit Date"
                value={exitDate}
                onChange={(val) => {
                  setExitDate(val);
                  setExitDateSynced(false);
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="exit-time-select">Exit Time</FieldLabel>
              <JournalTimeSelect
                id="exit-time-select"
                ariaLabel="Exit Time"
                value={exitTime}
                onChange={setExitTime}
              />
            </Field>
          </div>

          {/* Instrument */}
          <Field className="space-y-1.5">
            <FieldLabel>Instrument Symbol</FieldLabel>
            <InstrumentPicker value={instrument} onChange={setInstrument} />
          </Field>

          {/* Direction & Lots */}
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
                type="text"
                inputMode="decimal"
                value={lots}
                onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                onChange={(e) => setLots(sanitizeDecimalInput(e.target.value, false))}
                onBlur={() => { if (lots.trim() === '' || lots.trim() === '.') setLots('0'); }}
                placeholder="0.00"
              />
            </Field>
          </div>

          {/* Session */}
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
                  type="text"
                  inputMode="decimal"
                  value={entryPrice}
                  onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                  onChange={(e) => setEntryPrice(sanitizeDecimalInput(e.target.value, false))}
                  onBlur={() => { if (entryPrice.trim() === '' || entryPrice.trim() === '.') setEntryPrice('0'); }}
                  placeholder="0.00000"
                />
              </Field>
              <Field>
                <FieldLabel>Exit Price</FieldLabel>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={exitPrice}
                  onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                  onChange={(e) => setExitPrice(sanitizeDecimalInput(e.target.value, false))}
                  onBlur={() => { if (exitPrice.trim() === '' || exitPrice.trim() === '.') setExitPrice('0'); }}
                  placeholder="0.00000"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Stop Loss (Price)</FieldLabel>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={stopLoss}
                  onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                  onChange={(e) => setStopLoss(sanitizeDecimalInput(e.target.value, false))}
                  onBlur={() => { if (stopLoss.trim() === '' || stopLoss.trim() === '.') setStopLoss('0'); }}
                  placeholder="0.00000"
                />
              </Field>
              <Field>
                <FieldLabel>Take Profit (Price)</FieldLabel>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={takeProfit}
                  onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                  onChange={(e) => setTakeProfit(sanitizeDecimalInput(e.target.value, false))}
                  onBlur={() => { if (takeProfit.trim() === '' || takeProfit.trim() === '.') setTakeProfit('0'); }}
                  placeholder="0.00000"
                />
              </Field>
            </div>

            {(() => {
              const epNum = parseFloat(entryPrice) || 0;
              const xpNum = parseFloat(exitPrice) || 0;
              const priceMove =
                epNum > 0 && xpNum > 0 && epNum !== xpNum
                  ? direction === 'Buy'
                    ? xpNum - epNum
                    : epNum - xpNum
                  : 0;
              const trimmedPnl = pnlManual.trim();
              const parsedPnlNum = parseFloat(trimmedPnl);
              const hasNumericVal = Number.isFinite(parsedPnlNum) && parsedPnlNum !== 0;
              const isLossSelected =
                trimmedPnl.startsWith('-') ||
                (Number.isFinite(parsedPnlNum) && parsedPnlNum < 0) ||
                (!hasNumericVal && (pnlSignMode === 'loss' || (pnlSignMode === 'auto' && priceMove < 0)));

              const applySignToggle = (mode: 'profit' | 'loss') => {
                setPnlSignMode(mode);
                const unsigned = trimmedPnl.replace(/^-+/, '');
                if (mode === 'loss') {
                  if (unsigned && unsigned !== '0' && unsigned !== '0.00') {
                    setPnlManual(`-${unsigned}`);
                  }
                  setIsPnlCustom(true);
                } else {
                  if (unsigned !== trimmedPnl) {
                    setPnlManual(unsigned || '0');
                  }
                  setIsPnlCustom(true);
                }
              };

              const pnlColorClass =
                trimmedPnl.startsWith('-') && (trimmedPnl === '-' || (Number.isFinite(parsedPnlNum) && parsedPnlNum <= 0))
                  ? 'text-rose-700'
                  : Number.isFinite(parsedPnlNum) && parsedPnlNum > 0
                    ? 'text-emerald-700'
                    : Number.isFinite(parsedPnlNum) && parsedPnlNum < 0
                      ? 'text-rose-700'
                      : 'text-zinc-950';

              return (
                <Field>
                  <FieldLabel>Net P&L ($)</FieldLabel>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={pnlManual}
                    onFocus={(e) => {
                      if (e.target.value === '0' || e.target.value === '0.00' || e.target.value === '-0') {
                        e.target.select();
                      }
                    }}
                    onChange={(e) => {
                      const raw = e.target.value;
                      let val = sanitizeDecimalInput(raw.replace(/\+/g, ''), true);
                      if (val === '') {
                        setPnlSignMode(priceMove < 0 ? 'loss' : 'auto');
                        setPnlManual('');
                        setIsPnlCustom(true);
                        return;
                      }
                      const deletedLeadingMinus =
                        pnlManual.startsWith('-') && raw === pnlManual.slice(1);
                      if (deletedLeadingMinus || raw.includes('+')) {
                        setPnlSignMode('profit');
                      } else if (val.startsWith('-')) {
                        setPnlSignMode('loss');
                      } else if (
                        pnlSignMode === 'loss' ||
                        (!isPnlCustom && pnlSignMode === 'auto' && priceMove < 0)
                      ) {
                        val = `-${val}`;
                        setPnlSignMode('loss');
                      } else if (Number(val) > 0) {
                        setPnlSignMode('profit');
                      }
                      setPnlManual(val);
                      setIsPnlCustom(true);
                    }}
                    onBlur={() => {
                      const t = pnlManual.trim();
                      if (t === '' || t === '-' || t === '-.' || t === '-0' || t === '-0.0' || t === '-0.00') {
                        setPnlSignMode('auto');
                        setIsPnlCustom(false);
                      }
                    }}
                    className={`font-sans tabular-nums font-bold ${pnlColorClass}`}
                  />
                  <div
                    role="group"
                    aria-label="Trade outcome sign"
                    className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-100/80 border border-zinc-200 mt-1.5"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => applySignToggle('profit')}
                      className={`h-8 font-semibold gap-1.5 rounded-lg transition-all ${
                        !isLossSelected
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs hover:bg-emerald-100'
                          : 'text-zinc-600 hover:text-zinc-950 hover:bg-transparent'
                      }`}
                    >
                      <TrendingUp className="size-3.5 text-emerald-600" />
                      + Profit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => applySignToggle('loss')}
                      className={`h-8 font-semibold gap-1.5 rounded-lg transition-all ${
                        isLossSelected
                          ? 'bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs hover:bg-rose-100'
                          : 'text-zinc-600 hover:text-zinc-950 hover:bg-transparent'
                      }`}
                    >
                      <TrendingDown className="size-3.5 text-rose-600" />
                      - Loss
                    </Button>
                  </div>
                </Field>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Risk (R)</FieldLabel>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={riskR}
                  onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                  onChange={(e) => {
                    const val = sanitizeDecimalInput(e.target.value, false);
                    setRiskR(val);
                    setIsRiskCustom(true);
                  }}
                  onBlur={() => {
                    if (riskR.trim() === '' || riskR.trim() === '.') {
                      setIsRiskCustom(false);
                    }
                  }}
                />
              </Field>
              <Field>
                <FieldLabel>Return (R)</FieldLabel>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={returnR}
                  onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                  onChange={(e) => {
                    const val = sanitizeDecimalInput(e.target.value, true);
                    setReturnR(val);
                    setIsReturnCustom(true);
                  }}
                  onBlur={() => {
                    if (returnR.trim() === '' || returnR.trim() === '-' || returnR.trim() === '-.') {
                      setIsReturnCustom(false);
                    }
                  }}
                  className={
                    (parseFloat(returnR) || 0) < 0
                      ? 'font-sans tabular-nums text-rose-700'
                      : (parseFloat(returnR) || 0) > 0
                        ? 'font-sans tabular-nums text-emerald-700'
                        : 'font-sans tabular-nums'
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Fees & Commission ($)</FieldLabel>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={commission}
                  onFocus={(e) => { if (e.target.value === '0' || e.target.value === '0.00') e.target.select(); }}
                  onChange={(e) => setCommission(sanitizeDecimalInput(e.target.value, true))}
                  onBlur={() => {
                    if (commission.trim() === '' || commission.trim() === '-') setCommission('0.00');
                  }}
                />
              </Field>
              <Field>
                <FieldLabel>Swap ($)</FieldLabel>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={swap}
                  onFocus={(e) => { if (e.target.value === '0' || e.target.value === '0.00') e.target.select(); }}
                  onChange={(e) => setSwap(sanitizeDecimalInput(e.target.value, true))}
                  onBlur={() => {
                    if (swap.trim() === '' || swap.trim() === '-') setSwap('0.00');
                  }}
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* COLUMN 2: CHARTS & CONFLUENCES / MISTAKES / REFLECTION (7 Cols)           */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-8">
          {/* CHARTS UPLOAD */}
          <Card className="bg-white border-zinc-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3.5">
              <div>
                <h2 className="text-sm font-bold text-zinc-950 tracking-tight flex items-center gap-2">
                  <ImageIcon className="size-4 text-zinc-500" />
                  Charts Proof
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Upload HTF, MTF, LTF screenshots for execution proof.
                </p>
              </div>
            </div>

            {uploadError && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {uploadError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ChartUploadSlot
                type="htf"
                title="HTF (Daily / 4H)"
                value={chartHtf}
                onClear={() => setChartHtf(null)}
              />
              <ChartUploadSlot
                type="mtf"
                title="MTF (1H / 15M)"
                value={chartMtf}
                onClear={() => setChartMtf(null)}
              />
              <ChartUploadSlot
                type="ltf"
                title="LTF (5M / 1M)"
                value={chartLtf}
                onClear={() => setChartLtf(null)}
              />
            </div>
          </Card>

          {/* ENTRY CONFLUENCES (Green dots on satisfied tabs — no intrusive yellow banner) */}
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

            <Tabs defaultValue="structure" className="w-full">
              <TabsList size="sm" variant="default" className="w-full overflow-x-auto flex p-1 rounded-xl bg-zinc-100/90 border border-zinc-200/80">
                <TabsTab value="structure" className="font-sans text-xs font-semibold tracking-normal py-1.5 gap-1.5">
                  <span>Structure</span>
                  {hasStructure && <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </TabsTab>
                <TabsTab value="orderflow" className="font-sans text-xs font-semibold tracking-normal py-1.5 gap-1.5">
                  <span>Orderflow & POI</span>
                  {hasOrderflow && <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </TabsTab>
                <TabsTab value="execution" className="font-sans text-xs font-semibold tracking-normal py-1.5 gap-1.5">
                  <span>Execution</span>
                  {hasExecution && <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </TabsTab>
                <TabsTab value="session" className="font-sans text-xs font-semibold tracking-normal py-1.5 gap-1.5">
                  <span>Session & Time</span>
                  {hasSession && <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </TabsTab>
              </TabsList>

              {(['structure', 'orderflow', 'execution', 'session'] as const).map((tab) => (
                <TabsPanel key={tab} value={tab} className="pt-4">
                  <div className="flex flex-wrap gap-2.5">
                    {CONFLUENCE_CATEGORIES[tab].map((item) => {
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
              ))}
            </Tabs>

            {/* Visible removable chips for custom/all selected confluences */}
            {confluences.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-100">
                {confluences.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200/80"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() => toggleConfluence(c)}
                      className="text-zinc-400 hover:text-zinc-950 cursor-pointer"
                      aria-label={`Remove ${c}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-1">
              <Input
                type="text"
                placeholder="Add custom confluence..."
                value={customConfluence}
                onChange={(e) => setCustomConfluence(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomConfluence();
                  }
                }}
                sizeVariant="default"
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomConfluence} className="h-9 px-4 gap-1.5 font-medium">
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>
          </Card>

          {/* MISTAKES & RULE BREACHES */}
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
                <TabsTab value="psychology-mistakes" className="font-sans text-xs font-semibold tracking-normal py-1.5">Psychology</TabsTab>
              </TabsList>

              {(['execution', 'risk', 'psychology'] as const).map((tab) => (
                <TabsPanel key={tab} value={`${tab}-mistakes`} className="pt-4">
                  <div className="flex flex-wrap gap-2.5">
                    {MISTAKE_CATEGORIES[tab].map((item) => {
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
              ))}
            </Tabs>

            {/* Visible removable chips for custom/selected mistakes */}
            {mistakes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-100">
                {mistakes.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200"
                  >
                    <span>{m}</span>
                    <button
                      type="button"
                      onClick={() => toggleMistake(m)}
                      className="text-rose-400 hover:text-rose-800 cursor-pointer"
                      aria-label={`Remove ${m}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-1">
              <Input
                type="text"
                placeholder="Add custom mistake..."
                value={customMistake}
                onChange={(e) => setCustomMistake(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomMistake();
                  }
                }}
                sizeVariant="default"
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomMistake} className="h-9 px-4 gap-1.5 font-medium">
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
                  className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 size-4 cursor-pointer accent-zinc-950"
                />
                <span className="text-xs font-semibold text-zinc-900">I followed my trade plan</span>
              </label>
            </div>

            <Field>
              <FieldLabel>Which plan did you intend to follow?</FieldLabel>
              <Input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. A+ Setup Checklist, Trend Pullback, Break & Retest..."
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Entry Emotion</FieldLabel>
                <Select value={entryEmotion} onValueChange={setEntryEmotion}>
                  <SelectTrigger className="w-full h-9 rounded-xl border-zinc-200 bg-white text-xs">
                    <SelectValue placeholder="Select entry emotion" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRY_EMOTIONS.map((em) => (
                      <SelectItem key={em} value={em}>{em}</SelectItem>
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
                      <SelectItem key={em} value={em}>{em}</SelectItem>
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

      {/* Lightbox Dialog */}
      <ChartLightbox image={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}
