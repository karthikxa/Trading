'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Share2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  TrendingUp,
  TrendingDown,
  Zap,
  CheckCircle,
  XCircle,
  ZoomIn,
  X,
  Upload,
  Calendar as CalendarIcon,
  Layers,
  Activity,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { JournalTrade } from './types';
import { uploadChartImage, saveJournalTrade } from './storage';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogPopup, DialogClose } from '@/components/ui/dialog';

interface TradeDetailViewProps {
  trade: JournalTrade;
  allTrades: JournalTrade[];
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
  onEdit: (trade: JournalTrade) => void;
  onNavigateTrade: (nextTrade: JournalTrade) => void;
}

export function TradeDetailView({
  trade,
  allTrades,
  onBack,
  onDelete,
  onEdit,
  onNavigateTrade,
}: TradeDetailViewProps) {
  const [currentTrade, setCurrentTrade] = useState<JournalTrade>(trade);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadingTf, setUploadingTf] = useState<string | null>(null);

  // Pagination
  const currentIndex = allTrades.findIndex((t) => t.id === currentTrade.id);
  const prevTrade = currentIndex > 0 ? allTrades[currentIndex - 1] : null;
  const nextTrade = currentIndex < allTrades.length - 1 ? allTrades[currentIndex + 1] : null;

  // Format Date for Title
  const [year, month, day] = currentTrade.entryDate.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const formattedDateTitle = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isWin = currentTrade.pnl >= 0;

  const formatCurrency = (amount: number) => {
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(currentTrade.id);
      onBack();
    } catch (err) {
      console.error('Delete trade failed:', err);
      setIsDeleting(false);
    }
  };

  const handleUploadImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    timeframe: 'htf' | 'mtf' | 'ltf'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTf(timeframe);
    try {
      const url = await uploadChartImage(file, timeframe);
      const updated = {
        ...currentTrade,
        ...(timeframe === 'htf' ? { chartHtf: url } : {}),
        ...(timeframe === 'mtf' ? { chartMtf: url } : {}),
        ...(timeframe === 'ltf' ? { chartLtf: url } : {}),
      };
      await saveJournalTrade(updated);
      setCurrentTrade(updated);
    } catch (err) {
      console.error('Failed to upload image:', err);
    } finally {
      setUploadingTf(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full px-6 py-6 sm:px-8 sm:py-8 pb-16 font-sans text-zinc-950">
      {/* COSS Dialog Modal for Chart Zoom Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogPopup className="max-w-5xl bg-zinc-950 text-white border-zinc-800 p-4">
          <div className="flex items-center justify-between w-full mb-3">
            <span className="font-mono text-sm font-semibold">{lightboxImage?.title}</span>
            <DialogClose className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300">
              <X className="size-4" />
            </DialogClose>
          </div>
          {lightboxImage && (
            <div className="relative max-h-[80vh] w-full flex items-center justify-center overflow-hidden rounded-xl bg-black">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </div>
          )}
        </DialogPopup>
      </Dialog>

      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR (Strict COSS UI Buttons & Badges)                    */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 p-0 hover:bg-transparent"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Calendar</span>
          </Button>

          {/* Top Actions: Share, Focus, Prev, Next */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Trade link copied to clipboard!');
                }
              }}
              className="text-xs font-semibold gap-1.5 h-8"
            >
              <Share2 className="size-3.5" />
              <span>Share</span>
            </Button>

            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!prevTrade}
                onClick={() => prevTrade && onNavigateTrade(prevTrade)}
                className="text-xs font-semibold gap-1 h-8"
              >
                <ChevronLeft className="size-3.5" />
                <span>Prev</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!nextTrade}
                onClick={() => nextTrade && onNavigateTrade(nextTrade)}
                className="text-xs font-semibold gap-1 h-8"
              >
                <span>Next</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Title row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="size-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center text-xs font-mono font-bold shadow-2xs">
            {currentTrade.instrument.slice(0, 3)}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 flex items-center gap-2">
            <span>{currentTrade.instrument}</span>
            <span className="text-zinc-300 font-normal">·</span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${
                currentTrade.direction === 'Buy'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {currentTrade.direction === 'Buy' ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              {currentTrade.direction}
            </span>
            <span className="text-zinc-300 font-normal">·</span>
            <span className="text-zinc-600 font-normal">{formattedDateTitle}</span>
          </h1>

          {/* Badge: Manual / Auto */}
          <Badge
            variant="secondary"
            className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
              currentTrade.source === 'auto'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-zinc-100 text-zinc-700 border-zinc-200'
            }`}
          >
            {currentTrade.source === 'auto' && <Zap className="size-3 text-amber-500 fill-amber-500" />}
            {currentTrade.source === 'auto' ? 'Auto Logged' : 'Manual Entry'}
          </Badge>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN 2-COLUMN VIEW                                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: TRADE DETAILS & METRICS (5 cols)                             */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <Card className="bg-white border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-5">
            <h2 className="text-sm font-bold text-zinc-950">Trade Details</h2>

            {/* Big Net P&L */}
            <div className="flex flex-col gap-0.5 pb-4 border-b border-zinc-100">
              <span
                className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                  isWin ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatCurrency(currentTrade.pnl)}
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Net Profit / Loss
              </span>
            </div>

            {/* Instrument / Direction / Lots */}
            <div className="grid grid-cols-3 gap-2 pb-4 border-b border-zinc-100">
              <div className="flex flex-col">
                <span className="text-sm font-bold font-mono text-zinc-950 flex items-center gap-1">
                  {currentTrade.instrument}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  Instrument
                </span>
              </div>

              <div className="flex flex-col">
                <span
                  className={`text-sm font-semibold flex items-center gap-1 ${
                    currentTrade.direction === 'Buy' ? 'text-emerald-800' : 'text-rose-800'
                  }`}
                >
                  {currentTrade.direction === 'Buy' ? '↑ Buy' : '↓ Sell'}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  Direction
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-bold font-mono text-zinc-950">
                  {currentTrade.lots.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  Lot Size
                </span>
              </div>
            </div>

            {/* Context: Date, Session, Duration */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-zinc-100 text-xs">
              <span className="font-semibold text-zinc-400 uppercase text-[10px] tracking-wider">Context</span>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Date</span>
                <span className="text-zinc-950 font-medium">{formattedDateTitle}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Session</span>
                <span className="text-zinc-950 font-medium">{currentTrade.session || 'London'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Duration</span>
                <span className="text-zinc-950 font-mono">{currentTrade.duration || '15m'}</span>
              </div>
            </div>

            {/* Execution: Prices, SL, TP, Split Orders */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-zinc-100 text-xs">
              <span className="font-semibold text-zinc-400 uppercase text-[10px] tracking-wider">Execution</span>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">
                  {currentTrade.splitOrders && currentTrade.splitOrders.length > 0
                    ? 'Avg Entry Price'
                    : 'Entry / Exit Price'}
                </span>
                <span className="text-zinc-950 font-mono font-medium">
                  {currentTrade.entryPrice.toFixed(5)}
                  {(!currentTrade.splitOrders || currentTrade.splitOrders.length === 0) &&
                    ` / ${currentTrade.exitPrice.toFixed(5)}`}
                </span>
              </div>

              {/* Split Orders if present */}
              {currentTrade.splitOrders && currentTrade.splitOrders.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Split Orders ({currentTrade.splitOrders.length})
                  </span>
                  {currentTrade.splitOrders.map((so) => (
                    <div
                      key={so.id}
                      className="flex items-center justify-between text-[11px] font-mono text-zinc-700"
                    >
                      <span>
                        {so.orderNumber}. {so.lots} lots
                      </span>
                      <span>
                        {so.entryPrice.toFixed(5)} / {so.exitPrice.toFixed(5)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Stop Loss</span>
                <span className="text-zinc-950 font-mono font-medium">
                  {currentTrade.stopLoss !== null && currentTrade.stopLoss !== undefined
                    ? currentTrade.stopLoss.toFixed(5)
                    : 'Not Set'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Take Profit</span>
                <span className="text-zinc-950 font-mono font-medium">
                  {currentTrade.takeProfit !== null && currentTrade.takeProfit !== undefined
                    ? currentTrade.takeProfit.toFixed(5)
                    : 'Not Set'}
                </span>
              </div>
            </div>

            {/* Performance: Risk, Return */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-zinc-100 text-xs">
              <span className="font-semibold text-zinc-400 uppercase text-[10px] tracking-wider">Performance</span>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Risk (R)</span>
                <span className="text-zinc-950 font-mono font-medium">
                  {currentTrade.riskR !== null && currentTrade.riskR !== undefined
                    ? `${currentTrade.riskR}R`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Return (R)</span>
                <span
                  className={`font-mono font-bold ${
                    (currentTrade.returnR || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {currentTrade.returnR !== null && currentTrade.returnR !== undefined
                    ? `${currentTrade.returnR >= 0 ? '+' : ''}${currentTrade.returnR}R`
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Action buttons: Edit, Delete */}
            <div className="flex items-center justify-between pt-1">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-700 font-semibold">Confirm delete?</span>
                  <Button
                    variant="default"
                    size="xs"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-rose-600 hover:bg-rose-700 text-white h-7"
                  >
                    Yes, Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setConfirmDelete(false)}
                    className="h-7"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold p-0 hover:bg-transparent"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(currentTrade)}
                className="gap-1.5 text-xs font-semibold h-8"
              >
                <Edit className="size-3.5" />
                <span>Edit Trade</span>
              </Button>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: COSS TABS (CHARTS / CONFLUENCES / MISTAKES / REFLECTION)     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card className="bg-white border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
            <Tabs defaultValue="charts" className="w-full">
              <TabsList size="sm" variant="default" className="w-full flex overflow-x-auto">
                <TabsTab value="charts">Charts Proof</TabsTab>
                <TabsTab value="confluences">Strategy & Confluences</TabsTab>
                <TabsTab value="mistakes">Mistakes & Emotions</TabsTab>
                <TabsTab value="reflection">Trader Reflection</TabsTab>
              </TabsList>

              {/* TAB 1: CHARTS PROOF */}
              <TabsPanel value="charts" className="pt-4 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Multi-Timeframe Screenshots</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Click any screenshot to zoom in full resolution, or upload new proof.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* HTF Slot */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-zinc-700">HTF (4H / Daily)</span>
                    {currentTrade.chartHtf ? (
                      <div className="relative group rounded-xl overflow-hidden border border-zinc-200 bg-zinc-950 aspect-[4/3]">
                        <img
                          src={currentTrade.chartHtf}
                          alt="HTF Chart"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <button
                          type="button"
                          onClick={() => setLightboxImage({ url: currentTrade.chartHtf!, title: `${currentTrade.instrument} · HTF Context` })}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white cursor-pointer"
                        >
                          <ZoomIn className="size-6" />
                        </button>
                      </div>
                    ) : (
                      <label className="border border-dashed border-zinc-300 hover:border-zinc-950 bg-zinc-50/50 hover:bg-zinc-50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-[4/3] group">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadImage(e, 'htf')}
                        />
                        <Upload className="size-5 text-zinc-400 group-hover:text-zinc-950 transition-colors mb-1.5" />
                        <span className="text-xs font-semibold text-zinc-700 group-hover:text-zinc-950">
                          {uploadingTf === 'htf' ? 'Uploading...' : 'Upload HTF'}
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-0.5">Attach screenshot</span>
                      </label>
                    )}
                  </div>

                  {/* MTF Slot */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-zinc-700">MTF (1H / 15M)</span>
                    {currentTrade.chartMtf ? (
                      <div className="relative group rounded-xl overflow-hidden border border-zinc-200 bg-zinc-950 aspect-[4/3]">
                        <img
                          src={currentTrade.chartMtf}
                          alt="MTF Chart"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <button
                          type="button"
                          onClick={() => setLightboxImage({ url: currentTrade.chartMtf!, title: `${currentTrade.instrument} · MTF Structure` })}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white cursor-pointer"
                        >
                          <ZoomIn className="size-6" />
                        </button>
                      </div>
                    ) : (
                      <label className="border border-dashed border-zinc-300 hover:border-zinc-950 bg-zinc-50/50 hover:bg-zinc-50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-[4/3] group">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadImage(e, 'mtf')}
                        />
                        <Upload className="size-5 text-zinc-400 group-hover:text-zinc-950 transition-colors mb-1.5" />
                        <span className="text-xs font-semibold text-zinc-700 group-hover:text-zinc-950">
                          {uploadingTf === 'mtf' ? 'Uploading...' : 'Upload MTF'}
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-0.5">Attach screenshot</span>
                      </label>
                    )}
                  </div>

                  {/* LTF Slot */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-zinc-700">LTF (5M / 1M)</span>
                    {currentTrade.chartLtf ? (
                      <div className="relative group rounded-xl overflow-hidden border border-zinc-200 bg-zinc-950 aspect-[4/3]">
                        <img
                          src={currentTrade.chartLtf}
                          alt="LTF Chart"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <button
                          type="button"
                          onClick={() => setLightboxImage({ url: currentTrade.chartLtf!, title: `${currentTrade.instrument} · LTF Execution` })}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white cursor-pointer"
                        >
                          <ZoomIn className="size-6" />
                        </button>
                      </div>
                    ) : (
                      <label className="border border-dashed border-zinc-300 hover:border-zinc-950 bg-zinc-50/50 hover:bg-zinc-50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-[4/3] group">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadImage(e, 'ltf')}
                        />
                        <Upload className="size-5 text-zinc-400 group-hover:text-zinc-950 transition-colors mb-1.5" />
                        <span className="text-xs font-semibold text-zinc-700 group-hover:text-zinc-950">
                          {uploadingTf === 'ltf' ? 'Uploading...' : 'Upload LTF'}
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-0.5">Attach screenshot</span>
                      </label>
                    )}
                  </div>
                </div>
              </TabsPanel>

              {/* TAB 2: CONFLUENCES & STRATEGY */}
              <TabsPanel value="confluences" className="pt-4 space-y-4">
                <Card className="flex flex-row items-center justify-between p-3 rounded-xl bg-zinc-50 border-zinc-200/80 shadow-none">
                  <span className="text-xs font-semibold text-zinc-700">Adherence to Trade Plan</span>
                  <span
                    className={`text-xs font-bold flex items-center gap-1.5 ${
                      currentTrade.followedPlan ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {currentTrade.followedPlan ? (
                      <>
                        <CheckCircle className="size-4 text-emerald-600" /> Plan followed: {currentTrade.planName}
                      </>
                    ) : (
                      <>
                        <XCircle className="size-4 text-rose-600" /> Plan violated
                      </>
                    )}
                  </span>
                </Card>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-zinc-700">Validated Entry Confluences</span>
                  <div className="flex flex-wrap gap-2">
                    {currentTrade.confluences && currentTrade.confluences.length > 0 ? (
                      currentTrade.confluences.map((c) => (
                        <Badge
                          key={c}
                          variant="secondary"
                          className="text-xs font-medium px-3 py-1 rounded-xl bg-zinc-100 border-zinc-200 text-zinc-900"
                        >
                          ✓ {c}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400">None logged</span>
                    )}
                  </div>
                </div>

                {currentTrade.tradeManagement && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-xs font-semibold text-zinc-700">Trade Management Protocol</span>
                    <p className="text-xs text-zinc-600 bg-zinc-50 p-3 rounded-xl border border-zinc-200/70">
                      {currentTrade.tradeManagement}
                    </p>
                  </div>
                )}
              </TabsPanel>

              {/* TAB 3: MISTAKES & EMOTIONS */}
              <TabsPanel value="mistakes" className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3.5 rounded-xl border-zinc-200 bg-zinc-50 flex flex-col gap-1 shadow-none">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Entry Emotion</span>
                    <span className="text-sm font-semibold text-zinc-900">
                      {currentTrade.entryEmotion || 'Neutral'}
                    </span>
                  </Card>

                  <Card className="p-3.5 rounded-xl border-zinc-200 bg-zinc-50 flex flex-col gap-1 shadow-none">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Exit Emotion</span>
                    <span className="text-sm font-semibold text-zinc-900">
                      {currentTrade.exitEmotion || 'Disciplined'}
                    </span>
                  </Card>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-zinc-700">Mistakes & Rule Breaches</span>
                  <div className="flex flex-wrap gap-2">
                    {currentTrade.mistakes && currentTrade.mistakes.length > 0 ? (
                      currentTrade.mistakes.map((m) => (
                        <Badge
                          key={m}
                          variant="secondary"
                          className="text-xs font-medium px-3 py-1 rounded-xl bg-rose-50 border-rose-200 text-rose-700"
                        >
                          ✕ {m}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-700 font-medium">None · Zero mistakes executed</span>
                    )}
                  </div>
                </div>
              </TabsPanel>

              {/* TAB 4: REFLECTION & NOTES */}
              <TabsPanel value="reflection" className="pt-4 space-y-3">
                <span className="text-xs font-semibold text-zinc-700">Trader Reflection & Lessons</span>
                <p className="text-xs text-zinc-700 bg-zinc-50 p-4 rounded-xl border border-zinc-200 leading-relaxed min-h-[90px]">
                  {currentTrade.notes || 'No reflection recorded for this trade.'}
                </p>
              </TabsPanel>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
