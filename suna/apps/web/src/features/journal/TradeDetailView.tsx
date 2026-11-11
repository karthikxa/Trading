'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Share2,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  Zap,
  Check,
  Eye,
  Loader2,
  ImageOff,
} from 'lucide-react';
import { JournalTrade } from './types';
import { ChartLightbox } from './ChartLightbox';
import { TradingPairIcon } from './TradingPairIcon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Keep synced with incoming trade prop when navigating Previous / Next or after Edit
  useEffect(() => {
    setCurrentTrade(trade);
    setConfirmDelete(false);
    setDeleteError(null);
  }, [trade]);

  // Pagination
  const currentIndex = allTrades.findIndex((t) => t.id === currentTrade.id);
  const prevTrade = currentIndex > 0 ? allTrades[currentIndex - 1] : null;
  const nextTrade = currentIndex >= 0 && currentIndex < allTrades.length - 1 ? allTrades[currentIndex + 1] : null;

  // Format Date for Title cleanly without timezone drift
  const dateParts = (currentTrade.entryDate || '').split('-').map(Number);
  const formattedDateTitle =
    dateParts.length === 3 && dateParts.every((n) => Number.isFinite(n) && n > 0)
      ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2]).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : currentTrade.entryDate;

  const isWin = currentTrade.pnl >= 0;

  const formatCurrency = (amount: number) => {
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleShareTrade = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'journal');
      url.searchParams.set('trade', currentTrade.id);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url.toString());
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      }
    } catch {
      // Clipboard blocked in non-HTTPS contexts
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(currentTrade.id);
      onBack();
    } catch (err) {
      console.error('Delete trade failed:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete trade. Please try again.');
      setIsDeleting(false);
    }
  };

  /**
   * Read-only chart display slot.
   * Charts can only be uploaded/modified/deleted by clicking "Edit Trade".
   */
  const renderReadOnlyChartSlot = (label: string, imageUrl?: string) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700">
        <span>{label}</span>
      </div>

      {imageUrl ? (
        <button
          type="button"
          aria-label={`Preview ${label} chart`}
          onClick={() =>
            setLightboxImage({
              url: imageUrl,
              title: `${currentTrade.instrument} · ${label}`,
            })
          }
          className="relative group rounded-xl overflow-hidden border border-zinc-200 bg-white aspect-[4/3] shadow-2xs cursor-pointer w-full text-left"
        >
          <img
            src={imageUrl}
            alt={`${label} Chart`}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="p-2.5 rounded-lg bg-white/20 text-white backdrop-blur-xs">
              <Eye className="size-4.5" />
            </span>
          </div>
        </button>
      ) : (
        <div className="border border-dashed border-zinc-200 bg-zinc-50/50 rounded-xl flex flex-col items-center justify-center text-center aspect-[4/3] select-none">
          <ImageOff className="size-4.5 text-zinc-300 mb-1.5" />
          <span className="text-[11px] text-zinc-400 font-medium">No {label} chart</span>
        </div>
      )}
    </div>
  );

  const cleanMistakes = Array.isArray(currentTrade.mistakes)
    ? currentTrade.mistakes.filter((m) => m && m.trim() && m.toLowerCase() !== 'none')
    : [];

  return (
    <div className="flex flex-col gap-8 w-full px-6 py-6 sm:px-8 sm:py-8 pb-16 font-sans text-zinc-950">
      {/* COSS Dialog Modal for Chart Zoom Lightbox */}
      <ChartLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />

      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR                                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-950 transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>Journal</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80">
          <div className="flex items-center gap-3 flex-wrap">
            <TradingPairIcon symbol={currentTrade.instrument} size="md" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 flex items-center gap-2 flex-wrap">
              <span>{currentTrade.instrument}</span>
              <span className="text-zinc-300 font-normal">·</span>
              <span className="text-sm font-medium text-zinc-600">
                {currentTrade.splitOrders && currentTrade.splitOrders.length > 0
                  ? `${currentTrade.splitOrders.length} positions`
                  : '1 position'}
              </span>
              <span className="text-zinc-300 font-normal">·</span>
              <span className="text-zinc-600 font-normal">{formattedDateTitle}</span>
            </h1>

            {currentTrade.source === 'auto' && (
              <Badge
                variant="secondary"
                className="text-[10px] font-sans font-bold flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200"
              >
                <Zap className="size-3 text-amber-500 fill-amber-500" />
                <span>Auto</span>
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShareTrade}
              className="text-xs font-medium gap-1.5 h-8 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            >
              {copiedShare ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied Link</span>
                </>
              ) : (
                <>
                  <Share2 className="size-3.5" />
                  <span>Share Trade</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFocusMode((prev) => !prev)}
              className="text-xs font-medium gap-1.5 h-8 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            >
              {isFocusMode ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              <span>{isFocusMode ? 'Exit Focus' : 'Focus Mode'}</span>
            </Button>

            <div className="flex items-center gap-1 ml-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!prevTrade}
                onClick={() => prevTrade && onNavigateTrade(prevTrade)}
                className="text-xs font-medium gap-1 h-8 border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" />
                <span>Previous</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!nextTrade}
                onClick={() => nextTrade && onNavigateTrade(nextTrade)}
                className="text-xs font-medium gap-1 h-8 border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              >
                <span>Next Trade</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN VIEW (STRICTLY READ-ONLY UNTIL "EDIT TRADE" IS CLICKED)          */}
      {/* ========================================================================= */}
      <div className={`grid grid-cols-1 ${isFocusMode ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-6 items-start`}>
        {/* LEFT COLUMN: TRADE DETAILS & METRICS */}
        <div className={isFocusMode ? 'hidden' : 'lg:col-span-5 flex flex-col gap-5'}>
          <Card className="bg-white border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-5">
            <h2 className="text-sm font-bold text-zinc-950">Trade Details</h2>

            {/* Net P&L */}
            <div className="flex flex-col gap-0.5 pb-4 border-b border-zinc-100">
              <span
                className={`text-2xl sm:text-3xl font-medium font-sans tabular-nums tracking-tight ${
                  isWin ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatCurrency(currentTrade.pnl)}
              </span>
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                NET PNL
              </span>
            </div>

            {/* Instrument / Direction / Lots */}
            <div className="grid grid-cols-3 gap-2 pb-4 border-b border-zinc-100">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold font-sans text-zinc-950 flex items-center gap-1.5">
                  <TradingPairIcon symbol={currentTrade.instrument} size="sm" />
                  <span>{currentTrade.instrument}</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  INSTRUMENT
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span
                  className={`text-sm font-semibold flex items-center gap-1 ${
                    currentTrade.direction === 'Buy' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {currentTrade.direction === 'Buy' ? '↑ Buy' : '↓ Sell'}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  DIRECTION
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold font-sans tabular-nums text-zinc-950">
                  {currentTrade.lots.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  LOT SIZE
                </span>
              </div>
            </div>

            {/* Context: Date, Time, Session, Duration */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-zinc-100 text-xs">
              <span className="font-semibold text-zinc-400 uppercase text-[10px] tracking-wider">Context:</span>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Date</span>
                <span className="text-zinc-950 font-medium">{formattedDateTitle}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Time</span>
                <span className="text-zinc-950 font-sans tabular-nums">
                  {currentTrade.entryTime}
                  {currentTrade.exitTime ? ` – ${currentTrade.exitTime}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Session</span>
                <span className="text-zinc-950 font-medium">{currentTrade.session || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Duration</span>
                <span className="text-zinc-950 font-sans tabular-nums">{currentTrade.duration || '—'}</span>
              </div>
            </div>

            {/* Execution: Prices, SL, TP, Split Orders */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-zinc-100 text-xs">
              <span className="font-semibold text-zinc-400 uppercase text-[10px] tracking-wider">Execution:</span>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">
                  {currentTrade.splitOrders && currentTrade.splitOrders.length > 0
                    ? 'Avg Entry Price'
                    : 'Entry / Exit Price'}
                </span>
                <span className="text-zinc-950 font-sans tabular-nums font-medium">
                  {Number(currentTrade.entryPrice ?? 0).toFixed(5)}
                  {(!currentTrade.splitOrders || currentTrade.splitOrders.length === 0) &&
                    ` / ${Number(currentTrade.exitPrice ?? 0).toFixed(5)}`}
                </span>
              </div>

              {currentTrade.splitOrders && currentTrade.splitOrders.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Split Orders ({currentTrade.splitOrders.length})
                  </span>
                  <div className="grid grid-cols-12 text-[10px] font-semibold text-zinc-400 border-b border-zinc-200/70 pb-1">
                    <span className="col-span-3">Order</span>
                    <span className="col-span-5 text-center">Entry / Exit</span>
                    <span className="col-span-2 text-center">SL</span>
                    <span className="col-span-2 text-right">TP</span>
                  </div>
                  {currentTrade.splitOrders.map((so) => (
                    <div
                      key={so.id}
                      className="grid grid-cols-12 items-center text-[11px] font-sans tabular-nums text-zinc-700 py-0.5"
                    >
                      <span className="col-span-3 truncate">
                        {so.orderNumber}. {so.lots}L
                      </span>
                      <span className="col-span-5 text-center truncate">
                        {Number(so.entryPrice ?? 0).toFixed(5)} / {Number(so.exitPrice ?? 0).toFixed(5)}
                      </span>
                      <span className="col-span-2 text-center text-zinc-400">{so.sl || '—'}</span>
                      <span className="col-span-2 text-right text-zinc-400">{so.tp || '—'}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Stop Loss</span>
                <span className="text-zinc-950 font-sans tabular-nums font-medium">
                  {currentTrade.stopLoss !== null && currentTrade.stopLoss !== undefined
                    ? Number(currentTrade.stopLoss).toFixed(5)
                    : 'Not Set'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Take Profit</span>
                <span className="text-zinc-950 font-sans tabular-nums font-medium">
                  {currentTrade.takeProfit !== null && currentTrade.takeProfit !== undefined
                    ? Number(currentTrade.takeProfit).toFixed(5)
                    : 'Not Set'}
                </span>
              </div>
            </div>

            {/* Performance: Risk, Return */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-zinc-100 text-xs">
              <span className="font-semibold text-zinc-400 uppercase text-[10px] tracking-wider">Performance:</span>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Risk (R)</span>
                <span className="text-zinc-950 font-sans tabular-nums font-medium">
                  {currentTrade.riskR !== null && currentTrade.riskR !== undefined
                    ? `${currentTrade.riskR}R`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Return (R)</span>
                <span
                  className={`font-sans tabular-nums font-medium ${
                    currentTrade.returnR === null || currentTrade.returnR === undefined
                      ? 'text-zinc-400'
                      : currentTrade.returnR >= 0
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                  }`}
                >
                  {currentTrade.returnR !== null && currentTrade.returnR !== undefined
                    ? `${currentTrade.returnR >= 0 ? '+' : ''}${currentTrade.returnR}R`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Costs: Fees, Swap */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-zinc-100 text-xs">
              <span className="font-semibold text-zinc-400 uppercase text-[10px] tracking-wider">Costs:</span>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Fees</span>
                <span className="text-zinc-950 font-sans tabular-nums font-medium">
                  {formatCurrency(currentTrade.commission || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Swap</span>
                <span className="text-zinc-950 font-sans tabular-nums font-medium">
                  {formatCurrency(currentTrade.swap || 0)}
                </span>
              </div>
            </div>

            {deleteError && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {deleteError}
              </div>
            )}

            {/* Action buttons: Delete, Edit Trade */}
            <div className="flex items-center justify-between pt-1">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-700 font-semibold">Confirm delete?</span>
                  <Button
                    type="button"
                    variant="default"
                    size="xs"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-rose-600 hover:bg-rose-700 text-white h-7 gap-1.5"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <span>Yes, Delete</span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={isDeleting}
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
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEdit(currentTrade)}
                className="gap-1.5 text-xs font-semibold h-8 cursor-pointer"
              >
                <Edit className="size-3.5" />
                <span>Edit Trade</span>
              </Button>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: READ-ONLY SINGLE PAGE (CHARTS + REVIEW & REFLECTION) */}
        <div className={isFocusMode ? 'lg:col-span-12 flex flex-col gap-6' : 'lg:col-span-7 flex flex-col gap-6'}>
          <Card className="bg-white border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-7">
            {/* 1. CHARTS SECTION (READ-ONLY) */}
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Charts</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Multi-timeframe screenshots for context and execution review
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {renderReadOnlyChartSlot('HTF', currentTrade.chartHtf)}
                {renderReadOnlyChartSlot('MTF', currentTrade.chartMtf)}
                {renderReadOnlyChartSlot('LTF', currentTrade.chartLtf)}
              </div>
            </div>

            {/* 2. REVIEW & REFLECTION SECTION (READ-ONLY) */}
            <div className="flex flex-col gap-5 pt-3 border-t border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-950">Review & Reflection</h3>

              {/* Plan Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`size-4 rounded flex items-center justify-center transition-colors ${
                      currentTrade.followedPlan
                        ? 'bg-zinc-950 text-white'
                        : 'border border-zinc-300 bg-white text-transparent'
                    }`}
                  >
                    {currentTrade.followedPlan && <Check className="size-3 stroke-[3]" />}
                  </div>
                  <span className="text-xs font-medium text-zinc-800">I followed my trade plan</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-zinc-400">Which plan did you intend to follow?</span>
                  <div className="text-xs font-medium text-zinc-900 bg-zinc-50 border border-zinc-200/80 rounded-lg px-3 py-1.5 min-h-[30px]">
                    {currentTrade.planName || <span className="text-zinc-400 italic">None</span>}
                  </div>
                </div>
              </div>

              {/* Confluences & Trade Management */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-zinc-500">Entry Confluences</span>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-zinc-50 border border-zinc-200/80 min-h-[44px] items-center">
                    {currentTrade.confluences && currentTrade.confluences.length > 0 ? (
                      currentTrade.confluences.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-zinc-800 shadow-2xs"
                        >
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400 italic">No confluences logged</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-zinc-500">Trade Management</span>
                  <div className="text-xs font-medium text-zinc-900 bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-2 min-h-[44px] flex items-center">
                    {currentTrade.tradeManagement || (
                      <span className="text-zinc-400 italic">None</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mistakes & Emotions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-zinc-500">Mistakes & Guardrails</span>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-zinc-50 border border-zinc-200/80 min-h-[44px] items-center">
                    {cleanMistakes.length > 0 ? (
                      cleanMistakes.map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700"
                        >
                          <AlertCircleFilled className="size-3 shrink-0" />
                          <span>{m.replace(/^Guardrail:\s*/i, '').replace(/^Missing\s*/i, '')}</span>
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                        <CheckCircleFilled className="size-3.5 shrink-0" />
                        <span>No violations</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium text-zinc-500">Entry Emotion</span>
                    <div className="text-xs font-medium text-zinc-900 bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-2 min-h-[44px] flex items-center truncate">
                      {currentTrade.entryEmotion || <span className="text-zinc-400 italic">—</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium text-zinc-500">Exit Emotion</span>
                    <div className="text-xs font-medium text-zinc-900 bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-2 min-h-[44px] flex items-center truncate">
                      {currentTrade.exitEmotion || <span className="text-zinc-400 italic">—</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reflection notes */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-zinc-500">Reflection Notes</span>
                <div className="text-xs text-zinc-800 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 leading-relaxed min-h-[85px]">
                  {currentTrade.notes ? (
                    <p className="whitespace-pre-wrap">{currentTrade.notes}</p>
                  ) : (
                    <span className="text-zinc-400 italic">No reflection notes recorded.</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
