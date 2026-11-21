'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@kortix/ui';
import QuantumStarIcon from './QuantumStarIcon';
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  ArrowsClockwise,
  Sparkle,
  Cpu,
  Lightning,
  ShieldCheck,
  Target,
  TrendUp,
  TrendDown,
} from '@phosphor-icons/react';

export interface QuantumPredictionData {
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

interface QuantumPredictorOverlayProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
  timeframe?: string;
  onTimeframeChange?: (tf: string) => void;
  onGhostToggle?: (enabled: boolean, prediction?: QuantumPredictionData) => void;
}

export default function QuantumPredictorOverlay({
  symbol,
  isOpen,
  onClose,
  timeframe = '1D',
  onTimeframeChange,
  onGhostToggle,
}: QuantumPredictorOverlayProps) {
  const [data, setData] = useState<QuantumPredictionData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTf, setSelectedTf] = useState<string>(timeframe);
  const [projectOnChart, setProjectOnChart] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'forecast' | 'models' | 'targets'>('forecast');

  const fetchPrediction = useCallback(async (sym: string, tf: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quantum/predict?symbol=${encodeURIComponent(sym)}&timeframe=${encodeURIComponent(tf)}`);
      if (!res.ok) throw new Error('Prediction API failed');
      const json: QuantumPredictionData = await res.json();
      setData(json);
      if (onGhostToggle && projectOnChart) {
        onGhostToggle(true, json);
      }
    } catch (err) {
      console.warn('[QuantumPredictor] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [onGhostToggle, projectOnChart]);

  useEffect(() => {
    if (isOpen) {
      fetchPrediction(symbol, selectedTf);
    }
  }, [isOpen, symbol, selectedTf, fetchPrediction]);

  const handleTfSelect = (tf: string) => {
    setSelectedTf(tf);
    if (onTimeframeChange) onTimeframeChange(tf);
    fetchPrediction(symbol, tf);
  };

  const handleGhostToggle = () => {
    const next = !projectOnChart;
    setProjectOnChart(next);
    if (onGhostToggle) {
      onGhostToggle(next, data || undefined);
    }
  };

  if (!isOpen) return null;

  const isBull = data?.predictedCandle?.direction === 'bullish';
  const isBear = data?.predictedCandle?.direction === 'bearish';

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background/95 backdrop-blur-md border-l border-border/80 shadow-2xl animate-in slide-in-from-right duration-300 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5 bg-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/20">
            <QuantumStarIcon size={18} glow />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Quantum Candle Predictor</h3>
              <span className="rounded bg-indigo-500/15 px-1.5 py-0.2 text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                Kronos + Laya
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {symbol} &bull; Next {selectedTf} Candlestick Forecast
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fetchPrediction(symbol, selectedTf)}
            disabled={loading}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh prediction"
          >
            <ArrowsClockwise className={cn('size-4', loading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Close overlay"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Timeframe Bar */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 bg-muted/20 text-xs">
        <span className="text-[11px] font-medium text-muted-foreground">Timeframe:</span>
        <div className="flex items-center gap-1">
          {['1m', '5m', '15m', '1h', '4h', '1D', '1W'].map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => handleTfSelect(tf)}
              className={cn(
                'rounded px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer',
                selectedTf === tf
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <div className="relative flex size-12 items-center justify-center rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/30">
              <QuantumStarIcon size={24} className="animate-spin text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Collapsing Quantum Wavefunction...</p>
              <p className="text-xs text-muted-foreground mt-0.5">Running Kronos BSQuantizer & Laya System 1 Inference</p>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Primary Forecast Card */}
            <div
              className={cn(
                'relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all',
                isBull
                  ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-card'
                  : isBear
                  ? 'border-rose-500/30 bg-gradient-to-br from-rose-500/5 via-card to-card'
                  : 'border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-card'
              )}
            >
              {/* Direction & Confidence Pill */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      isBull
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : isBear
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    )}
                  >
                    {isBull ? <ArrowUpRight className="size-3.5" /> : isBear ? <ArrowDownRight className="size-3.5" /> : null}
                    <span>{data.predictedCandle.direction.toUpperCase()} NEXT CANDLE</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">Confidence:</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {data.quantumAnalysis.confidence}%
                  </span>
                </div>
              </div>

              {/* Price Target & Projected Move */}
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                    ${data.predictedCandle.close.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs font-medium">
                    <span
                      className={cn(
                        'tabular-nums font-semibold',
                        isBull
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isBear
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-muted-foreground'
                      )}
                    >
                      {data.predictedCandle.change > 0 ? '+' : ''}${data.predictedCandle.change} ({data.predictedCandle.changePct > 0 ? '+' : ''}{data.predictedCandle.changePct}%)
                    </span>
                    <span className="text-muted-foreground">&bull; from ${data.currentCandle.close}</span>
                  </div>
                </div>

                {/* Mini Candlestick Graphic */}
                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-background/60 border border-border/50">
                  <div className="text-[10px] text-muted-foreground font-mono uppercase">Next Bar</div>
                  <div className="relative w-7 h-12 flex flex-col items-center justify-center my-1">
                    {/* Wick */}
                    <div
                      className={cn(
                        'w-0.5 h-10',
                        isBull ? 'bg-emerald-500' : isBear ? 'bg-rose-500' : 'bg-amber-500'
                      )}
                    />
                    {/* Body */}
                    <div
                      className={cn(
                        'absolute w-4 rounded-xs',
                        isBull
                          ? 'h-6 bg-emerald-500 border border-emerald-600'
                          : isBear
                          ? 'h-6 bg-rose-500 border border-rose-600'
                          : 'h-4 bg-amber-500 border border-amber-600'
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Predicted OHLC Grid */}
              <div className="mt-3.5 grid grid-cols-4 gap-2 pt-3 border-t border-border/60 text-center font-mono">
                <div className="rounded bg-muted/40 p-1.5">
                  <div className="text-[10px] text-muted-foreground">OPEN</div>
                  <div className="text-xs font-semibold text-foreground tabular-nums">${data.predictedCandle.open}</div>
                </div>
                <div className="rounded bg-muted/40 p-1.5">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">HIGH</div>
                  <div className="text-xs font-semibold text-foreground tabular-nums">${data.predictedCandle.high}</div>
                </div>
                <div className="rounded bg-muted/40 p-1.5">
                  <div className="text-[10px] text-rose-600 dark:text-rose-400">LOW</div>
                  <div className="text-xs font-semibold text-foreground tabular-nums">${data.predictedCandle.low}</div>
                </div>
                <div className="rounded bg-muted/40 p-1.5">
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400">CLOSE</div>
                  <div className="text-xs font-semibold text-foreground tabular-nums">${data.predictedCandle.close}</div>
                </div>
              </div>
            </div>

            {/* Quantum Superposition & Probability Distribution */}
            <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Sparkle className="size-3.5 text-indigo-500" />
                  <span>Quantum Probability Distribution</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Phase: {data.quantumAnalysis.quantumPhase}
                </span>
              </div>

              {/* Segmented Progress Bar */}
              <div className="h-2.5 w-full rounded-full bg-muted flex overflow-hidden">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${data.quantumAnalysis.probabilities.bullish}%` }}
                  title={`Bullish: ${data.quantumAnalysis.probabilities.bullish}%`}
                />
                <div
                  className="bg-amber-400 transition-all duration-500"
                  style={{ width: `${data.quantumAnalysis.probabilities.neutral}%` }}
                  title={`Neutral / Squeeze: ${data.quantumAnalysis.probabilities.neutral}%`}
                />
                <div
                  className="bg-rose-500 transition-all duration-500"
                  style={{ width: `${data.quantumAnalysis.probabilities.bearish}%` }}
                  title={`Bearish: ${data.quantumAnalysis.probabilities.bearish}%`}
                />
              </div>

              <div className="grid grid-cols-3 text-center text-xs pt-1">
                <div className="text-left">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Bullish</span>
                  <div className="font-semibold text-foreground tabular-nums">{data.quantumAnalysis.probabilities.bullish}%</div>
                </div>
                <div className="text-center">
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Neutral</span>
                  <div className="font-semibold text-foreground tabular-nums">{data.quantumAnalysis.probabilities.neutral}%</div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Bearish</span>
                  <div className="font-semibold text-foreground tabular-nums">{data.quantumAnalysis.probabilities.bearish}%</div>
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Wave State:</span>
                <span className="font-medium text-foreground">{data.quantumAnalysis.state}</span>
              </div>
            </div>

            {/* Model Architecture Synergy: Kronos + Laya */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Kronos Foundation Model */}
              <div className="rounded-xl border border-border/70 bg-card p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Cpu className="size-3.5 text-blue-500" />
                  <span>Kronos Model</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  BSQuantizer Hybrid Transformer
                </p>
                <div className="pt-1.5 space-y-1 text-[11px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Codebook:</span>
                    <span className="font-mono text-foreground">{data.kronos.codebookBits}-bit hybrid</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Next Token:</span>
                    <span className="font-mono text-indigo-500 font-semibold">#{data.kronos.predictedToken}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Latent Norm:</span>
                    <span className="font-mono text-foreground">{data.kronos.latentNorm}</span>
                  </div>
                </div>
              </div>

              {/* Laya System 1 Decision Engine */}
              <div className="rounded-xl border border-border/70 bg-card p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Lightning className="size-3.5 text-amber-500" />
                  <span>Laya System 1</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Fast Conviction Classifier
                </p>
                <div className="pt-1.5 space-y-1 text-[11px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Signal:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[90px]">
                      {data.laya.decision}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Latency:</span>
                    <span className="font-mono text-foreground">{data.laya.system1LatencyMs} ms</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>R:R Ratio:</span>
                    <span className="font-mono text-foreground">{data.laya.riskRewardRatio}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actionable Trade Targets */}
            <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <div className="flex items-center gap-1.5">
                  <Target className="size-3.5 text-indigo-500" />
                  <span>Actionable Execution Bounds</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Risk Managed</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans">Target 1</div>
                  <div className="text-xs font-bold text-foreground tabular-nums">${data.laya.target1}</div>
                </div>
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2">
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-sans">Target 2</div>
                  <div className="text-xs font-bold text-foreground tabular-nums">${data.laya.target2}</div>
                </div>
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2">
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-sans">Stop Loss</div>
                  <div className="text-xs font-bold text-foreground tabular-nums">${data.laya.stopLoss}</div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground italic leading-relaxed pt-1">
                &ldquo;{data.laya.reasoning}&rdquo;
              </p>
            </div>

            {/* Project on Chart Toggle */}
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-foreground">Project Ghost Candle on Chart</div>
                <div className="text-[11px] text-muted-foreground">Show holographic next-candle bar directly on chart</div>
              </div>
              <button
                type="button"
                onClick={handleGhostToggle}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden',
                  projectOnChart ? 'bg-indigo-600' : 'bg-muted'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                    projectOnChart ? 'translate-x-4' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
