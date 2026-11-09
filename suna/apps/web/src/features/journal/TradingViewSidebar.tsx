'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Maximize2,
  MoreHorizontal,
  LayoutGrid,
  Edit3,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { JournalTrade } from './types';
import { TradingPairIcon } from './TradingPairIcon';
import {
  SYMBOL_MARKET_REGISTRY,
  getSymbolMarketData,
  SymbolMarketData,
} from './tradingViewData';

interface TradingViewSidebarProps {
  date: string;
  formattedDateTitle: string;
  trades: JournalTrade[];
  onSelectTrade: (trade: JournalTrade) => void;
  onAddTradeForDate: (date: string, instrument?: string) => void;
}

export function TradingViewSidebar({
  date,
  formattedDateTitle,
  trades,
  onSelectTrade,
  onAddTradeForDate,
}: TradingViewSidebarProps) {
  // Selected symbol for the bottom individual chart pane
  // Default to the first traded symbol today if available, else EURUSD
  const initialSymbol = trades.length > 0 ? trades[0].instrument.toUpperCase() : 'EURUSD';
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);

  // Collapsible category state
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    FUTURES: false,
    FOREX: false,
    CRYPTO: false,
  });

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Group market items
  const allSymbols = Object.values(SYMBOL_MARKET_REGISTRY);

  // Group by category
  const futuresSymbols = allSymbols.filter((s) => s.category === 'FUTURES');
  const forexSymbols = allSymbols.filter((s) => s.category === 'FOREX');
  const cryptoSymbols = allSymbols.filter((s) => s.category === 'CRYPTO');

  // Selected symbol market data
  const currentMarketData = getSymbolMarketData(selectedSymbol);

  // Trades on this specific date for the selected symbol
  const symbolTradesToday = trades.filter(
    (t) => t.instrument.toUpperCase() === selectedSymbol.toUpperCase()
  );

  const formatCurrency = (val: number) => {
    const sign = val >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="flex flex-col h-full bg-white select-none font-sans text-zinc-950">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Watchlist dropdown + tools)                                */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-200/80 bg-white">
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-bold text-zinc-900 hover:text-zinc-600 transition-colors"
        >
          <span>Watchlist</span>
          <ChevronDown className="size-3.5 text-zinc-500" />
        </button>

        <div className="flex items-center gap-2 text-zinc-500">
          <button
            type="button"
            onClick={() => onAddTradeForDate(date, selectedSymbol)}
            className="p-1 hover:text-zinc-950 hover:bg-zinc-100 rounded-md transition-colors"
            title="Add trade"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            className="p-1 hover:text-zinc-950 hover:bg-zinc-100 rounded-md transition-colors"
            title="Focus mode"
          >
            <Maximize2 className="size-3.5" />
          </button>
          <button
            type="button"
            className="p-1 hover:text-zinc-950 hover:bg-zinc-100 rounded-md transition-colors"
            title="More actions"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. WATCHLIST TABLE (Collapsible Groups: FUTURES, FOREX, CRYPTO)            */}
      {/* ========================================================================= */}
      <div className="overflow-y-auto max-h-[210px] divide-y divide-zinc-100 border-b border-zinc-200/90 shrink-0">
        {/* Table column sub-header */}
        <div className="grid grid-cols-12 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-3 py-1.5 bg-zinc-50/70 border-b border-zinc-100 sticky top-0 z-10">
          <div className="col-span-5">Symbol</div>
          <div className="col-span-3 text-right">Last</div>
          <div className="col-span-2 text-right">Chg</div>
          <div className="col-span-2 text-right">Chg%</div>
        </div>

        {/* --- CATEGORY: FUTURES --- */}
        <div>
          <button
            type="button"
            onClick={() => toggleCategory('FUTURES')}
            className="w-full flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50/40 hover:bg-zinc-100/60 transition-colors"
          >
            {collapsedCategories.FUTURES ? (
              <ChevronRight className="size-3 text-zinc-400" />
            ) : (
              <ChevronDown className="size-3 text-zinc-400" />
            )}
            <span>FUTURES & COMMODITIES</span>
          </button>

          {!collapsedCategories.FUTURES &&
            futuresSymbols.map((item) => (
              <SymbolWatchlistRow
                key={item.symbol}
                item={item}
                isSelected={selectedSymbol === item.symbol}
                tradesToday={trades.filter((t) => t.instrument.toUpperCase() === item.symbol)}
                onSelect={() => setSelectedSymbol(item.symbol)}
              />
            ))}
        </div>

        {/* --- CATEGORY: FOREX --- */}
        <div>
          <button
            type="button"
            onClick={() => toggleCategory('FOREX')}
            className="w-full flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50/40 hover:bg-zinc-100/60 transition-colors"
          >
            {collapsedCategories.FOREX ? (
              <ChevronRight className="size-3 text-zinc-400" />
            ) : (
              <ChevronDown className="size-3 text-zinc-400" />
            )}
            <span>FOREX</span>
          </button>

          {!collapsedCategories.FOREX &&
            forexSymbols.map((item) => (
              <SymbolWatchlistRow
                key={item.symbol}
                item={item}
                isSelected={selectedSymbol === item.symbol}
                tradesToday={trades.filter((t) => t.instrument.toUpperCase() === item.symbol)}
                onSelect={() => setSelectedSymbol(item.symbol)}
              />
            ))}
        </div>

        {/* --- CATEGORY: CRYPTO --- */}
        <div>
          <button
            type="button"
            onClick={() => toggleCategory('CRYPTO')}
            className="w-full flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50/40 hover:bg-zinc-100/60 transition-colors"
          >
            {collapsedCategories.CRYPTO ? (
              <ChevronRight className="size-3 text-zinc-400" />
            ) : (
              <ChevronDown className="size-3 text-zinc-400" />
            )}
            <span>CRYPTO</span>
          </button>

          {!collapsedCategories.CRYPTO &&
            cryptoSymbols.map((item) => (
              <SymbolWatchlistRow
                key={item.symbol}
                item={item}
                isSelected={selectedSymbol === item.symbol}
                tradesToday={trades.filter((t) => t.instrument.toUpperCase() === item.symbol)}
                onSelect={() => setSelectedSymbol(item.symbol)}
              />
            ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. INDIVIDUAL CHART DETAILS PANE (Selected Symbol Deep Dive)              */}
      {/* ========================================================================= */}
      <div className="p-4 flex flex-col gap-3.5 bg-white">
        {/* Symbol Title & Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TradingPairIcon symbol={currentMarketData.symbol} size="md" />
            <h3 className="text-base font-bold text-zinc-950 tracking-tight">
              {currentMarketData.symbol}
            </h3>
          </div>

          <div className="flex items-center gap-1 text-zinc-400">
            <button
              type="button"
              className="p-1 hover:text-zinc-950 hover:bg-zinc-100 rounded-md transition-colors"
              title="Split Layout"
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onAddTradeForDate(date, currentMarketData.symbol)}
              className="p-1 hover:text-zinc-950 hover:bg-zinc-100 rounded-md transition-colors"
              title="Log Trade for this chart"
            >
              <Edit3 className="size-3.5" />
            </button>
            <button
              type="button"
              className="p-1 hover:text-zinc-950 hover:bg-zinc-100 rounded-md transition-colors"
              title="Options"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>
        </div>

        {/* Full Name & Market Category */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-xs text-zinc-600 font-medium">
            <span>{currentMarketData.name}</span>
            <ExternalLink className="size-3 text-zinc-400" />
            <span className="text-zinc-400 font-normal">· {currentMarketData.exchange}</span>
          </div>
          <span className="text-[11px] text-zinc-400">{currentMarketData.category}</span>
        </div>

        {/* Big Live Quote & Change */}
        <div className="flex flex-col gap-1 pb-1">
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-950">
              {currentMarketData.lastPrice}
            </span>
            {currentMarketData.lastPriceSup && (
              <span className="text-sm font-bold text-zinc-400 -ml-1">
                {currentMarketData.lastPriceSup}
              </span>
            )}
            <span className="text-xs font-semibold text-zinc-400">USD</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`font-semibold flex items-center gap-0.5 ${
                currentMarketData.isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {currentMarketData.change} {currentMarketData.changePercent}
            </span>
            <span className="text-zinc-300">·</span>
            <span className="flex items-center gap-1 text-zinc-500 text-[11px]">
              <span
                className={`size-1.5 rounded-full ${
                  currentMarketData.marketStatus === 'Market open' ? 'bg-emerald-500' : 'bg-zinc-400'
                }`}
              />
              {currentMarketData.marketStatus}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TODAY'S EXECUTED TRADES FOR THIS SPECIFIC STOCK (The core Journal view!) */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1">
              <Clock className="size-3 text-zinc-500" />
              <span>Traded Today ({formattedDateTitle})</span>
            </span>
            <span className="font-mono text-zinc-500 font-semibold">
              {symbolTradesToday.length} {symbolTradesToday.length === 1 ? 'trade' : 'trades'}
            </span>
          </div>

          {symbolTradesToday.length === 0 ? (
            <div className="py-2.5 text-center text-xs text-zinc-400 flex flex-col items-center gap-1.5">
              <span>No {selectedSymbol} trades logged for this day</span>
              <button
                type="button"
                onClick={() => onAddTradeForDate(date, selectedSymbol)}
                className="text-[11px] font-semibold text-zinc-900 underline hover:text-zinc-600 cursor-pointer"
              >
                + Log {selectedSymbol} trade at specific time
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 pt-0.5">
              {symbolTradesToday.map((t) => {
                const isWin = t.pnl >= 0;
                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTrade(t)}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-zinc-200/80 hover:border-zinc-400 hover:shadow-xs transition-all cursor-pointer group select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-zinc-700">
                        {t.entryTime}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border flex items-center gap-0.5 ${
                          t.direction === 'Buy'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {t.direction === 'Buy' ? (
                          <TrendingUp className="size-2.5 text-emerald-600" />
                        ) : (
                          <TrendingDown className="size-2.5 text-rose-600" />
                        )}
                        {t.direction}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {t.lots} lots
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-mono font-bold ${
                          isWin ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatCurrency(t.pnl)}
                      </span>
                      {t.returnR !== null && t.returnR !== undefined && (
                        <span
                          className={`text-[10px] font-mono ${
                            t.returnR >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {t.returnR >= 0 ? `+${t.returnR}R` : `${t.returnR}R`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* News Snippet (Pastel Purple Container from Screenshot) */}
        <div className="p-3.5 rounded-xl bg-[#f5f3ff] border border-purple-100 flex flex-col gap-1.5 text-xs text-zinc-800">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-700">
            <span>News</span>
            <span className="text-purple-300">·</span>
            <span className="text-purple-500 font-normal">{currentMarketData.news.timeAgo}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-700 font-medium">
            {currentMarketData.news.headline}
          </p>
          <button
            type="button"
            className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-0.5 mt-0.5 w-fit"
          >
            <span>More events</span>
            <span>&gt;</span>
          </button>
        </div>

        {/* Performance Grid (Exact 2x3 Matrix from Screenshot) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-zinc-950">Performance</span>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                ['1W', currentMarketData.performance['1W']],
                ['1M', currentMarketData.performance['1M']],
                ['3M', currentMarketData.performance['3M']],
                ['6M', currentMarketData.performance['6M']],
                ['YTD', currentMarketData.performance['YTD']],
                ['1Y', currentMarketData.performance['1Y']],
              ] as const
            ).map(([period, data]) => (
              <div
                key={period}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-center ${
                  data.positive
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50/70 border-rose-200 text-rose-800'
                }`}
              >
                <span className="text-xs font-mono font-bold">{data.value}</span>
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">{period}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Seasonals Link */}
        <div className="pt-1 flex items-center justify-between text-xs font-semibold text-zinc-600 hover:text-zinc-950 cursor-pointer">
          <span>Seasonals</span>
          <ChevronRight className="size-3.5 text-zinc-400" />
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Individual Watchlist Row in the Table
function SymbolWatchlistRow({
  item,
  isSelected,
  tradesToday,
  onSelect,
}: {
  item: SymbolMarketData;
  isSelected: boolean;
  tradesToday: JournalTrade[];
  onSelect: () => void;
}) {
  const hasTrades = tradesToday.length > 0;
  const netPnl = tradesToday.reduce((acc, t) => acc + (t.pnl || 0), 0);

  return (
    <div
      onClick={onSelect}
      className={`grid grid-cols-12 items-center px-3 py-2 cursor-pointer transition-colors text-xs select-none ${
        isSelected
          ? 'bg-zinc-100 font-semibold border-l-2 border-zinc-950'
          : 'hover:bg-zinc-50/90'
      }`}
    >
      {/* Symbol Column */}
      <div className="col-span-5 flex items-center gap-1.5 overflow-hidden pr-1">
        <TradingPairIcon symbol={item.symbol} size="sm" />
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-zinc-950 truncate tracking-tight text-xs">
            {item.symbol}
          </span>
          {hasTrades && (
            <span
              className={`text-[9px] font-mono font-semibold truncate ${
                netPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {tradesToday.length}T · {netPnl >= 0 ? '+' : ''}${Math.round(netPnl / 1000)}k
            </span>
          )}
        </div>
      </div>

      {/* Last Price */}
      <div className="col-span-3 text-right font-mono font-medium text-zinc-900 text-[11px] truncate">
        {item.lastPrice}
        {item.lastPriceSup && (
          <span className="text-[9px] text-zinc-400">{item.lastPriceSup}</span>
        )}
      </div>

      {/* Chg */}
      <div
        className={`col-span-2 text-right font-mono text-[10px] font-semibold truncate ${
          item.isPositive ? 'text-emerald-600' : 'text-rose-600'
        }`}
      >
        {item.change}
      </div>

      {/* Chg% */}
      <div
        className={`col-span-2 text-right font-mono text-[10px] font-semibold truncate ${
          item.isPositive ? 'text-emerald-600' : 'text-rose-600'
        }`}
      >
        {item.changePercent}
      </div>
    </div>
  );
}

export default TradingViewSidebar;
