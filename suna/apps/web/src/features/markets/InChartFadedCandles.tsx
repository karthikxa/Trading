'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@kortix/ui';
import QuantumStarIcon from './QuantumStarIcon';
import type { QuantumPredictionPayload, PredictedCandleStep } from './FadedCandlesProjection';
import { X, ArrowsOutCardinal, MagnifyingGlassPlus, MagnifyingGlassMinus } from '@phosphor-icons/react';

interface InChartFadedCandlesProps {
  data: QuantumPredictionPayload;
  onClose: () => void;
  watchlistOpen?: boolean;
}

/**
 * In-Chart Faded Candlesticks AI Predictor (Kronos + Laya)
 * Renders directly inside the TradingView Advanced Chart widget.
 * Features 2D dragging, dynamic scaling, translucent ghost candles, and zero reload.
 */
export default function InChartFadedCandles({
  data,
  onClose,
  watchlistOpen = false,
}: InChartFadedCandlesProps) {
  // 2D drag offset (X and Y) to position precisely over chart candles
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number }>({
    mouseX: 0,
    mouseY: 0,
    posX: 0,
    posY: 0,
  });

  const candles: PredictedCandleStep[] =
    data.predictedCandles && data.predictedCandles.length > 0
      ? data.predictedCandles
      : [
          {
            step: 1,
            label: '+1',
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

  // Price calculations
  const allPrices = [
    data.currentCandle.close,
    ...candles.flatMap((c) => [c.high, c.low, c.open, c.close]),
  ];
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const pRange = Math.max(maxP - minP, 0.5);

  const svgW = 320;
  const svgH = 190;
  const padTop = 26;
  const padBot = 28;
  const usableH = (svgH - padTop - padBot) * scaleMultiplier;

  const priceToY = (price: number) => {
    const ratio = (price - minP) / pRange;
    const mid = padTop + (svgH - padTop - padBot) / 2;
    return mid + (0.5 - ratio) * usableH;
  };

  const isBullish = data.predictedCandle.direction === 'bullish';

  // 2D Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Trajectory polyline points through close prices
  const trajectoryPoints = candles
    .map((c, idx) => {
      const x = 34 + idx * 58;
      const y = priceToY(c.close);
      return `${x},${y}`;
    })
    .join(' ');

  // Volatility cone polygon
  const upperCone = candles.map((c, idx) => `${34 + idx * 58},${priceToY(c.high)}`).join(' ');
  const lowerCone = candles
    .map((c, idx) => `${34 + (candles.length - 1 - idx) * 58},${priceToY(candles[candles.length - 1 - idx].low)}`)
    .join(' ');
  const conePolygon = `${upperCone} ${lowerCone}`;

  return (
    <div
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        right: watchlistOpen ? '320px' : '75px',
        top: '26%',
      }}
      className={cn(
        'absolute z-20 flex flex-col items-center pointer-events-auto select-none transition-shadow',
        isDragging && 'cursor-grabbing opacity-90'
      )}
    >
      {/* In-Chart Header Badge with Drag Bar and Controls */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          'flex items-center gap-2 rounded-full px-3 py-1 backdrop-blur-lg border text-[11px] font-medium shadow-lg cursor-grab active:cursor-grabbing transition-all mb-1',
          isBullish
            ? 'bg-zinc-950/85 border-emerald-500/40 text-emerald-400 ring-1 ring-emerald-500/20'
            : 'bg-zinc-950/85 border-rose-500/40 text-rose-400 ring-1 ring-rose-500/20'
        )}
        title="Drag anywhere on the chart to align with candles"
      >
        <ArrowsOutCardinal className="size-3 opacity-60 hover:opacity-100" />
        <QuantumStarIcon size={13} filled className={isBullish ? 'text-emerald-400' : 'text-rose-400'} glow />
        <span className="font-semibold tracking-tight font-sans">
          Kronos + Laya: {isBullish ? 'Bullish' : 'Bearish'} ({data.predictedCandle.changePct > 0 ? '+' : ''}
          {data.predictedCandle.changePct}%)
        </span>
        <span className="opacity-40">&bull;</span>
        <span className="text-[10px] opacity-80 font-mono font-bold">5 Faded Bars</span>

        {/* Height Zoom Controls */}
        <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-zinc-700/60" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setScaleMultiplier((m) => Math.min(2.5, m + 0.15))}
            className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title="Expand candle height"
          >
            <MagnifyingGlassPlus className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => setScaleMultiplier((m) => Math.max(0.5, m - 0.15))}
            className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title="Compress candle height"
          >
            <MagnifyingGlassMinus className="size-3" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 p-0.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title="Hide AI Predictor"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>

      {/* Direct In-Chart SVG Overlay - Ghost Candlesticks inside Chart Canvas */}
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="overflow-visible pointer-events-none drop-shadow-lg"
      >
        <defs>
          <linearGradient id="quantumConeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={isBullish ? '#10b981' : '#f43f5e'} stopOpacity="0.22" />
            <stop offset="100%" stopColor={isBullish ? '#10b981' : '#f43f5e'} stopOpacity="0.04" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Shaded Volatility Fan / Cone */}
        <polygon points={conePolygon} fill="url(#quantumConeGrad)" />

        {/* Volatility Boundary Rays */}
        {candles.map((c, idx) => {
          if (idx === 0) return null;
          const prev = candles[idx - 1];
          const x1 = 34 + (idx - 1) * 58;
          const y1Upper = priceToY(prev.high);
          const y1Lower = priceToY(prev.low);
          const x2 = 34 + idx * 58;
          const y2Upper = priceToY(c.high);
          const y2Lower = priceToY(c.low);
          return (
            <g key={`cone-ray-${c.step}`}>
              <line
                x1={x1}
                y1={y1Upper}
                x2={x2}
                y2={y2Upper}
                stroke={isBullish ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.45)'}
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <line
                x1={x1}
                y1={y1Lower}
                x2={x2}
                y2={y2Lower}
                stroke={isBullish ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.45)'}
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
            </g>
          );
        })}

        {/* Trajectory Guide Polyline */}
        <polyline
          points={trajectoryPoints}
          fill="none"
          stroke={isBullish ? 'rgba(52, 211, 153, 0.8)' : 'rgba(251, 113, 133, 0.8)'}
          strokeWidth="1.6"
          strokeDasharray="4 4"
        />

        {/* Faded Ghost Candlesticks (+1 to +5) */}
        {candles.map((c, idx) => {
          const isBull = c.direction === 'bullish';
          const cx = 34 + idx * 58;
          const wickTop = priceToY(c.high);
          const wickBot = priceToY(c.low);
          const openY = priceToY(c.open);
          const closeY = priceToY(c.close);
          const bodyTop = Math.min(openY, closeY);
          const bodyH = Math.max(Math.abs(closeY - openY), 4);
          const candleW = 14;

          // Progressive fading: earlier candles are more solid, future candles fade into the distance
          const opacity = Math.max(0.35, 0.95 - idx * 0.12);
          const strokeColor = isBull ? 'rgba(8, 153, 129, 0.95)' : 'rgba(242, 54, 69, 0.95)';
          const fillColor = isBull ? 'rgba(8, 153, 129, 0.52)' : 'rgba(242, 54, 69, 0.52)';

          return (
            <g key={c.step} style={{ opacity }}>
              {/* Upper & Lower Wick */}
              <line
                x1={cx}
                y1={wickTop}
                x2={cx}
                y2={wickBot}
                stroke={strokeColor}
                strokeWidth="1.6"
                strokeLinecap="round"
              />

              {/* Faded Candlestick Body */}
              <rect
                x={cx - candleW / 2}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="1.4"
                rx="1.5"
              />

              {/* Forecast Price Label */}
              <text
                x={cx}
                y={wickTop - 5}
                fill={strokeColor}
                fontSize="9.5"
                fontFamily="monospace"
                textAnchor="middle"
                fontWeight="700"
              >
                ${c.close}
              </text>

              {/* Bar Step Indicator */}
              <text
                x={cx}
                y={wickBot + 13}
                fill={isBull ? '#059669' : '#e11d48'}
                fontSize="9"
                fontFamily="monospace"
                textAnchor="middle"
                fontWeight="bold"
              >
                +{c.step}
              </text>
            </g>
          );
        })}

        {/* Target 1 Marker Line */}
        {data.laya?.target1 && (
          <g>
            <line
              x1={20}
              y1={priceToY(data.laya.target1)}
              x2={svgW}
              y2={priceToY(data.laya.target1)}
              stroke="#10b981"
              strokeWidth="1.2"
              strokeDasharray="4 3"
              opacity="0.75"
            />
            <text
              x={svgW + 4}
              y={priceToY(data.laya.target1) + 3}
              fill="#10b981"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              T1: ${data.laya.target1}
            </text>
          </g>
        )}

        {/* Stop Loss Marker Line */}
        {data.laya?.stopLoss && (
          <g>
            <line
              x1={20}
              y1={priceToY(data.laya.stopLoss)}
              x2={svgW}
              y2={priceToY(data.laya.stopLoss)}
              stroke="#f43f5e"
              strokeWidth="1.2"
              strokeDasharray="4 3"
              opacity="0.75"
            />
            <text
              x={svgW + 4}
              y={priceToY(data.laya.stopLoss) + 3}
              fill="#f43f5e"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              SL: ${data.laya.stopLoss}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
