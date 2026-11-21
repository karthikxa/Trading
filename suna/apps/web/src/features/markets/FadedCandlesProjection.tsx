'use client';

import React from 'react';
import { cn } from '@kortix/ui';
import QuantumStarIcon from './QuantumStarIcon';
import { Sparkle, ArrowUpRight, ArrowDownRight, X, Cpu, Lightning } from '@phosphor-icons/react';

export interface PredictedCandleStep {
  step: number;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePct: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  volatilityUpper: number;
  volatilityLower: number;
}

export interface QuantumPredictionPayload {
  status: string;
  symbol: string;
  resolvedSymbol: string;
  timeframe: string;
  timestamp: number;
  currentCandle: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  };
  predictedCandle: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePct: number;
    direction: 'bullish' | 'bearish' | 'neutral';
  };
  predictedCandles?: PredictedCandleStep[];
  quantumAnalysis: {
    state: string;
    confidence: number;
    probabilities: {
      bullish: number;
      bearish: number;
      neutral: number;
    };
    volatilityCone: {
      lower: number;
      upper: number;
      bandwidthPct: number;
    };
    quantumPhase: string;
  };
  kronos: {
    loaded: boolean;
    architecture: string;
    codebookBits: number;
    s1Tokens: number[];
    s2Tokens: number[];
    predictedToken: number;
    latentNorm: number;
  };
  laya: {
    decision: string;
    convictionScore: number;
    system1LatencyMs: number;
    riskRewardRatio: string;
    target1: number;
    target2: number;
    stopLoss: number;
    reasoning: string;
  };
}

interface FadedCandlesProjectionProps {
  data: QuantumPredictionPayload;
  onClose: () => void;
}

export default function FadedCandlesProjection({ data, onClose }: FadedCandlesProjectionProps) {
  const candles: PredictedCandleStep[] =
    data.predictedCandles && data.predictedCandles.length > 0
      ? data.predictedCandles
      : [
          {
            step: 1,
            label: '+1 Bar',
            open: data.predictedCandle.open,
            high: data.predictedCandle.high,
            low: data.predictedCandle.low,
            close: data.predictedCandle.close,
            volume: data.predictedCandle.volume,
            change: data.predictedCandle.change,
            changePct: data.predictedCandle.changePct,
            direction: data.predictedCandle.direction,
            volatilityUpper: data.predictedCandle.high,
            volatilityLower: data.predictedCandle.low,
          },
        ];

  // Global scale for vertical positioning of candles
  const allPrices = [
    data.currentCandle.close,
    ...candles.flatMap((c) => [c.high, c.low, c.open, c.close]),
  ];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;

  // Convert price to Y percentage (0% top, 100% bottom, with 12% padding)
  const priceToY = (p: number) => {
    const norm = (p - minPrice) / priceRange;
    return 88 - norm * 76; // keep within 12% to 88%
  };

  const isOverallBull = data.predictedCandle.direction === 'bullish';

  return (
    <div className="absolute right-4 top-16 z-30 flex flex-col w-[360px] sm:w-[440px] rounded-2xl border border-indigo-500/30 bg-background/85 backdrop-blur-xl shadow-2xl p-4 transition-all duration-300 animate-in fade-in zoom-in-95 select-none ring-1 ring-indigo-500/20">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-500 ring-1 ring-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.3)]">
            <QuantumStarIcon size={16} glow />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-foreground font-sans">
                QUANTUM TRAJECTORY
              </span>
              <span className="rounded bg-indigo-500/15 px-1.5 py-0.2 text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                KRONOS + LAYA
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Faded Forecast: Next {candles.length} Candlesticks ({data.symbol})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
              isOverallBull
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
            )}
          >
            {isOverallBull ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            <span>{isOverallBull ? 'BULLISH' : 'BEARISH'}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Hide trajectory projection"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Candlesticks Visualization Canvas */}
      <div className="relative w-full h-48 my-3 rounded-xl bg-card/60 border border-border/50 overflow-hidden flex flex-col justify-between p-2">
        {/* Subtle grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-border border-dashed w-full" />
          <div className="border-b border-border border-dashed w-full" />
          <div className="border-b border-border border-dashed w-full" />
          <div className="border-b border-border border-dashed w-full" />
        </div>

        {/* Current Candle Reference Line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-zinc-400/40 pointer-events-none z-0"
          style={{ top: `${priceToY(data.currentCandle.close)}%` }}
        >
          <span className="absolute left-1 -top-2 text-[8px] font-mono text-muted-foreground bg-background/80 px-1 rounded">
            Curr: ${data.currentCandle.close}
          </span>
        </div>

        {/* 5 Faded Candlesticks */}
        <div className="relative w-full h-full flex items-stretch justify-around px-2 z-10">
          {candles.map((candle, idx) => {
            const isBull = candle.direction === 'bullish';
            const topY = priceToY(candle.high);
            const botY = priceToY(candle.low);
            const openY = priceToY(candle.open);
            const closeY = priceToY(candle.close);
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(closeY - openY), 4);
            const opacity = 0.88 - idx * 0.12; // Gradual fade: +1 is 0.88, +5 is 0.40

            return (
              <div
                key={candle.step}
                className="relative flex flex-col items-center justify-center flex-1 group transition-all"
                style={{ opacity }}
              >
                {/* Vertical Wick Line */}
                <div
                  className={cn(
                    'absolute w-[1.5px] rounded-full transition-colors',
                    isBull ? 'bg-emerald-400/80' : 'bg-rose-400/80'
                  )}
                  style={{
                    top: `${topY}%`,
                    height: `${Math.max(botY - topY, 6)}%`,
                  }}
                />

                {/* Translucent / Faded Candle Body */}
                <div
                  className={cn(
                    'absolute w-4 sm:w-5 rounded-xs transition-all shadow-sm',
                    isBull
                      ? 'bg-emerald-500/40 border border-emerald-400/80 group-hover:bg-emerald-500/60'
                      : 'bg-rose-500/40 border border-rose-400/80 group-hover:bg-rose-500/60'
                  )}
                  style={{
                    top: `${bodyTop}%`,
                    height: `${bodyHeight}%`,
                  }}
                />

                {/* Price label tooltip on hover */}
                <div className="absolute top-1 text-[8px] font-mono text-muted-foreground group-hover:text-foreground">
                  ${candle.close}
                </div>

                {/* Step pill at the bottom */}
                <div className="absolute bottom-0 flex flex-col items-center">
                  <span className="text-[9px] font-mono font-semibold text-foreground/80">
                    +{candle.step}
                  </span>
                  <span
                    className={cn(
                      'text-[8px] font-mono font-medium',
                      isBull ? 'text-emerald-500' : 'text-rose-500'
                    )}
                  >
                    {candle.changePct > 0 ? '+' : ''}
                    {candle.changePct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Model Inference Telemetry */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-[10px]">
        <div className="rounded-lg bg-muted/40 p-1.5 border border-border/40">
          <div className="text-[9px] text-muted-foreground font-sans">Confidence</div>
          <div className="text-xs font-bold text-foreground tabular-nums">
            {data.quantumAnalysis.confidence}%
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-1.5 border border-border/40">
          <div className="text-[9px] text-muted-foreground font-sans">Target 1</div>
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            ${data.laya.target1}
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-1.5 border border-border/40">
          <div className="text-[9px] text-muted-foreground font-sans">Stop Loss</div>
          <div className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            ${data.laya.stopLoss}
          </div>
        </div>
      </div>

      {/* Quantum State Footnote */}
      <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground px-1">
        <span className="truncate max-w-[240px]">
          {data.quantumAnalysis.state}
        </span>
        <span className="font-mono text-indigo-500 font-semibold">
          Token #{data.kronos.predictedToken}
        </span>
      </div>
    </div>
  );
}
