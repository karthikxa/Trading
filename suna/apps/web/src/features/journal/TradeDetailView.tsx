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
} from 'lucide-react';
import { JournalTrade } from './types';
import { uploadChartImage, saveJournalTrade } from './storage';

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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-16 font-sans text-zinc-900 animate-in fade-in-50 duration-200">
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <div className="flex items-center justify-between w-full max-w-5xl mb-3 text-white">
            <span className="font-mono text-sm font-semibold">{lightboxImage.title}</span>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              <X className="size-5" />
            </button>
          </div>
          <div
            className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR                                                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-950 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            <span>Journal</span>
          </button>

          {/* Top Actions: Share, Focus, Prev, Next */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Trade link copied to clipboard!');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors"
            >
              <Share2 className="size-3.5" />
              <span>Share Trade</span>
            </button>

            <button
              type="button"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors"
            >
              <Maximize2 className="size-3.5" />
              <span>Focus Mode</span>
            </button>

            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                disabled={!prevTrade}
                onClick={() => prevTrade && onNavigateTrade(prevTrade)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors"
              >
                <ChevronLeft className="size-3.5" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                disabled={!nextTrade}
                onClick={() => nextTrade && onNavigateTrade(nextTrade)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors"
              >
                <span>Next Trade</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Title row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="size-8 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-mono font-bold text-zinc-700">
            {currentTrade.instrument.slice(0, 3)}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 flex items-center gap-2">
            <span>{currentTrade.instrument}</span>
            <span className="text-zinc-400 font-normal">·</span>
            <span
              className={`flex items-center gap-1 font-semibold ${
                currentTrade.direction === 'Buy' ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {currentTrade.direction === 'Buy' ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
              {currentTrade.direction}
            </span>
            <span className="text-zinc-400 font-normal">·</span>
            <span className="text-zinc-600 font-normal">{formattedDateTitle}</span>
          </h1>

          {/* Badge: Manual / Auto */}
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 ${
              currentTrade.source === 'auto'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
            }`}
          >
            {currentTrade.source === 'auto' && <Zap className="size-3 text-amber-500 fill-amber-500" />}
            {currentTrade.source === 'auto' ? 'Auto' : 'Manual'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN 2-COLUMN VIEW (White Theme)                                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: TRADE DETAILS & METRICS (5 cols)                             */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-5">
            <h2 className="text-sm font-semibold text-zinc-900">Trade Details</h2>

            {/* Big Net P&L */}
            <div className="flex flex-col gap-0.5 pb-4 border-b border-zinc-100">
              <span
                className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                  isWin ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatCurrency(currentTrade.pnl)}
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Net PnL
              </span>
            </div>

            {/* Instrument / Direction / Lots */}
            <div className="grid grid-cols-3 gap-2 pb-4 border-b border-zinc-100">
              <div className="flex flex-col">
                <span className="text-sm font-bold font-mono text-zinc-900 flex items-center gap-1">
                  {currentTrade.instrument}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  Instrument
                </span>
              </div>

              <div className="flex flex-col">
                <span
                  className={`text-sm font-bold flex items-center gap-1 ${
                    currentTrade.direction === 'Buy' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {currentTrade.direction === 'Buy' ? '↑ Buy' : '↓ Sell'}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  Direction
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-bold font-mono text-zinc-900">
                  {currentTrade.lots.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  Lot Size
                </span>
              </div>
            </div>

            {/* Context: Date, Session, Duration */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-zinc-100">
              <span className="text-xs font-semibold text-zinc-500">Context</span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Date</span>
                <span className="text-zinc-900 font-medium">{formattedDateTitle}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Session</span>
                <span className="text-zinc-900 font-medium">{currentTrade.session || 'London'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Duration</span>
                <span className="text-zinc-900 font-mono">{currentTrade.duration || '15m'}</span>
              </div>
            </div>

            {/* Execution: Prices, SL, TP, Split Orders */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-zinc-100">
              <span className="text-xs font-semibold text-zinc-500">Execution</span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">
                  {currentTrade.splitOrders && currentTrade.splitOrders.length > 0
                    ? 'Avg Entry Price'
                    : 'Entry / Exit Price'}
                </span>
                <span className="text-zinc-900 font-mono font-medium">
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

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Stop Loss</span>
                <span className="text-zinc-900 font-mono">
                  {currentTrade.stopLoss ? currentTrade.stopLoss.toFixed(5) : 'Not Set'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Take Profit</span>
                <span className="text-zinc-900 font-mono">
                  {currentTrade.takeProfit ? currentTrade.takeProfit.toFixed(5) : 'Not Set'}
                </span>
              </div>
            </div>

            {/* Performance: Risk R, Return R */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-zinc-100">
              <span className="text-xs font-semibold text-zinc-500">Performance</span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Risk (R)</span>
                <span className="text-zinc-900 font-mono">
                  {currentTrade.riskR !== null ? `${currentTrade.riskR}R` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Return (R)</span>
                <span
                  className={`font-mono font-semibold ${
                    (currentTrade.returnR || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {currentTrade.returnR !== null
                    ? `${currentTrade.returnR >= 0 ? '+' : ''}${currentTrade.returnR}R`
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Costs */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-zinc-100">
              <span className="text-xs font-semibold text-zinc-500">Costs</span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Fees</span>
                <span className="text-zinc-900 font-mono font-medium">
                  {currentTrade.commission !== undefined
                    ? formatCurrency(currentTrade.commission)
                    : '$0.00'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Swap</span>
                <span className="text-zinc-900 font-mono font-medium">
                  {currentTrade.swap !== undefined ? formatCurrency(currentTrade.swap) : '$0.00'}
                </span>
              </div>
            </div>

            {/* Actions: Delete / Edit */}
            <div className="flex items-center justify-between pt-1">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Confirm?</span>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-950"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => onEdit(currentTrade)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs text-zinc-800 font-medium transition-colors shadow-2xs"
              >
                <Edit className="size-3.5" />
                <span>Edit Trade</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: CHARTS + REVIEW & REFLECTION (7 cols)                       */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Charts Card */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Charts</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Screenshots reviewing context + execution:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* HTF */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono font-medium text-zinc-600">HTF (4H/Daily)</span>
                {currentTrade.chartHtf ? (
                  <div
                    onClick={() =>
                      setLightboxImage({ url: currentTrade.chartHtf!, title: `${currentTrade.instrument} HTF Chart` })
                    }
                    className="relative rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden h-40 flex items-center justify-center cursor-pointer group shadow-2xs"
                  >
                    <img
                      src={currentTrade.chartHtf}
                      alt="HTF Chart"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ZoomIn className="size-5 text-white" />
                    </div>
                  </div>
                ) : (
                  <label className="rounded-xl border border-dashed border-zinc-300 hover:border-purple-400 bg-zinc-50/70 hover:bg-zinc-50 h-40 flex flex-col items-center justify-center cursor-pointer group transition-colors">
                    <Upload className="size-5 text-zinc-400 group-hover:text-purple-600 mb-1" />
                    <span className="text-[11px] font-medium text-zinc-600 group-hover:text-purple-700">
                      Upload HTF
                    </span>
                    <span className="text-[9px] text-zinc-400">Attach screenshot</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadImage(e, 'htf')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* MTF */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono font-medium text-zinc-600">MTF (1H/15M)</span>
                {currentTrade.chartMtf ? (
                  <div
                    onClick={() =>
                      setLightboxImage({ url: currentTrade.chartMtf!, title: `${currentTrade.instrument} MTF Chart` })
                    }
                    className="relative rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden h-40 flex items-center justify-center cursor-pointer group shadow-2xs"
                  >
                    <img
                      src={currentTrade.chartMtf}
                      alt="MTF Chart"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ZoomIn className="size-5 text-white" />
                    </div>
                  </div>
                ) : (
                  <label className="rounded-xl border border-dashed border-zinc-300 hover:border-purple-400 bg-zinc-50/70 hover:bg-zinc-50 h-40 flex flex-col items-center justify-center cursor-pointer group transition-colors">
                    <Upload className="size-5 text-zinc-400 group-hover:text-purple-600 mb-1" />
                    <span className="text-[11px] font-medium text-zinc-600 group-hover:text-purple-700">
                      Upload MTF
                    </span>
                    <span className="text-[9px] text-zinc-400">Attach screenshot</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadImage(e, 'mtf')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* LTF */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono font-medium text-zinc-600">LTF (5M/1M)</span>
                {currentTrade.chartLtf ? (
                  <div
                    onClick={() =>
                      setLightboxImage({ url: currentTrade.chartLtf!, title: `${currentTrade.instrument} LTF Chart` })
                    }
                    className="relative rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden h-40 flex items-center justify-center cursor-pointer group shadow-2xs"
                  >
                    <img
                      src={currentTrade.chartLtf}
                      alt="LTF Chart"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ZoomIn className="size-5 text-white" />
                    </div>
                  </div>
                ) : (
                  <label className="rounded-xl border border-dashed border-zinc-300 hover:border-purple-400 bg-zinc-50/70 hover:bg-zinc-50 h-40 flex flex-col items-center justify-center cursor-pointer group transition-colors">
                    <Upload className="size-5 text-zinc-400 group-hover:text-purple-600 mb-1" />
                    <span className="text-[11px] font-medium text-zinc-600 group-hover:text-purple-700">
                      Upload LTF
                    </span>
                    <span className="text-[9px] text-zinc-400">Attach screenshot</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadImage(e, 'ltf')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Review & Reflection Card */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-5">
            <h2 className="text-sm font-semibold text-zinc-900">Review & Reflection</h2>

            {/* Plan followed */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                {currentTrade.followedPlan ? (
                  <CheckCircle className="size-4 text-emerald-600" />
                ) : (
                  <XCircle className="size-4 text-rose-600" />
                )}
                <span className="text-xs font-semibold text-zinc-900">
                  {currentTrade.followedPlan ? 'I followed my trade plan' : 'Did not follow trade plan'}
                </span>
              </div>

              <span className="text-xs font-medium text-zinc-500">
                Plan: <span className="text-zinc-900 font-semibold">{currentTrade.planName}</span>
              </span>
            </div>

            {/* Entry Confluences */}
            <div className="flex flex-col gap-2 pb-3 border-b border-zinc-100">
              <span className="text-xs font-semibold text-zinc-600">Entry Confluences</span>
              <div className="flex flex-wrap gap-1.5">
                {currentTrade.confluences && currentTrade.confluences.length > 0 ? (
                  currentTrade.confluences.map((c) => (
                    <span
                      key={c}
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium"
                    >
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-400">None logged</span>
                )}
              </div>
            </div>

            {/* Trade Management */}
            <div className="flex flex-col gap-1.5 pb-3 border-b border-zinc-100">
              <span className="text-xs font-semibold text-zinc-600">Trade Management</span>
              <p className="text-xs text-zinc-800 font-medium">
                {currentTrade.tradeManagement || 'Standard execution, let runner ride.'}
              </p>
            </div>

            {/* Mistakes */}
            <div className="flex flex-col gap-2 pb-3 border-b border-zinc-100">
              <span className="text-xs font-semibold text-zinc-600">Mistakes</span>
              <div className="flex flex-wrap gap-1.5">
                {currentTrade.mistakes && currentTrade.mistakes.length > 0 ? (
                  currentTrade.mistakes.map((m) => (
                    <span
                      key={m}
                      className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-medium"
                    >
                      {m}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-emerald-700 font-medium">
                    None · Zero mistakes
                  </span>
                )}
              </div>
            </div>

            {/* Emotions */}
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-zinc-100">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-zinc-400 uppercase font-semibold">
                  Entry Emotion
                </span>
                <span className="text-xs font-semibold text-zinc-800">
                  {currentTrade.entryEmotion || '😐 Neutral'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-zinc-400 uppercase font-semibold">
                  Exit Emotion
                </span>
                <span className="text-xs font-semibold text-zinc-800">
                  {currentTrade.exitEmotion || '😌 Relieved'}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-600">Trader Reflection Notes</span>
              <div className="bg-zinc-50 border border-zinc-200/80 p-3.5 rounded-xl text-xs text-zinc-800 leading-relaxed">
                {currentTrade.notes || 'No reflections logged for this trade.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
