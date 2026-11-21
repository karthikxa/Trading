'use client';

import React from 'react';
import StockSymbolIcon from '../markets/StockSymbolIcon';
import { cn } from '@kortix/ui';

interface TradingPairIconProps {
  symbol: string;
  logoid?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

// Crisp inline circular vector flags matching Kortix & TradingView design (Image 1 & 4)
function FlagEU({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="size-full shrink-0">
      <circle cx="50" cy="50" r="50" fill="#003399" />
      <g fill="#ffcc00" transform="translate(50, 50)">
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x = 32 * Math.sin(angle);
          const y = -32 * Math.cos(angle);
          return (
            <polygon
              key={i}
              points="0,-4 1.2,-1.2 4,-1.2 1.6,0.5 2.5,3.2 0,1.6 -2.5,3.2 -1.6,0.5 -4,-1.2 -1.2,-1.2"
              transform={`translate(${x},${y})`}
            />
          );
        })}
      </g>
    </svg>
  );
}

function FlagUS({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="size-full shrink-0">
      <defs>
        <clipPath id="us-circle-clip">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath="url(#us-circle-clip)">
        <rect width="100" height="100" fill="#ffffff" />
        <rect y="0" width="100" height="7.69" fill="#e1261c" />
        <rect y="15.38" width="100" height="7.69" fill="#e1261c" />
        <rect y="30.77" width="100" height="7.69" fill="#e1261c" />
        <rect y="46.15" width="100" height="7.69" fill="#e1261c" />
        <rect y="61.54" width="100" height="7.69" fill="#e1261c" />
        <rect y="76.92" width="100" height="7.69" fill="#e1261c" />
        <rect y="92.31" width="100" height="7.69" fill="#e1261c" />
        {/* Navy Canton */}
        <rect width="48" height="53.85" fill="#1b365d" />
        {/* Stars array */}
        <g fill="#ffffff" transform="scale(0.88) translate(4, 3)">
          <circle cx="6" cy="8" r="2.2" />
          <circle cx="16" cy="8" r="2.2" />
          <circle cx="26" cy="8" r="2.2" />
          <circle cx="36" cy="8" r="2.2" />
          <circle cx="11" cy="17" r="2.2" />
          <circle cx="21" cy="17" r="2.2" />
          <circle cx="31" cy="17" r="2.2" />
          <circle cx="6" cy="26" r="2.2" />
          <circle cx="16" cy="26" r="2.2" />
          <circle cx="26" cy="26" r="2.2" />
          <circle cx="36" cy="26" r="2.2" />
          <circle cx="11" cy="35" r="2.2" />
          <circle cx="21" cy="35" r="2.2" />
          <circle cx="31" cy="35" r="2.2" />
          <circle cx="6" cy="44" r="2.2" />
          <circle cx="16" cy="44" r="2.2" />
          <circle cx="26" cy="44" r="2.2" />
          <circle cx="36" cy="44" r="2.2" />
        </g>
      </g>
    </svg>
  );
}

function FlagIN({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="size-full shrink-0">
      <defs>
        <clipPath id="in-circle-clip">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath="url(#in-circle-clip)">
        <rect y="0" width="100" height="33.33" fill="#FF9933" />
        <rect y="33.33" width="100" height="33.34" fill="#FFFFFF" />
        <rect y="66.67" width="100" height="33.33" fill="#128807" />
        {/* Ashoka Chakra */}
        <circle cx="50" cy="50" r="13" fill="none" stroke="#000080" strokeWidth="1.8" />
        <circle cx="50" cy="50" r="2.5" fill="#000080" />
        {[...Array(24)].map((_, i) => {
          const angle = (i * 15 * Math.PI) / 180;
          return (
            <line
              key={i}
              x1="50"
              y1="50"
              x2={50 + 12 * Math.sin(angle)}
              y2={50 - 12 * Math.cos(angle)}
              stroke="#000080"
              strokeWidth="0.8"
            />
          );
        })}
      </g>
    </svg>
  );
}

function FlagGB({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="size-full shrink-0">
      <defs>
        <clipPath id="gb-circle-clip">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath="url(#gb-circle-clip)">
        <rect width="100" height="100" fill="#012169" />
        <path d="M0,0 L100,100 M100,0 L0,100" stroke="#fff" strokeWidth="16" />
        <path d="M0,0 L100,100 M100,0 L0,100" stroke="#C8102E" strokeWidth="10" />
        <path d="M50,0 v100 M0,50 h100" stroke="#fff" strokeWidth="26" />
        <path d="M50,0 v100 M0,50 h100" stroke="#C8102E" strokeWidth="16" />
      </g>
    </svg>
  );
}

function FlagJP({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="size-full shrink-0">
      <circle cx="50" cy="50" r="50" fill="#ffffff" />
      <circle cx="50" cy="50" r="23" fill="#bc002d" />
    </svg>
  );
}

function FlagCH({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="size-full shrink-0">
      <circle cx="50" cy="50" r="50" fill="#d52b1e" />
      <rect x="42" y="20" width="16" height="60" fill="#fff" rx="2" />
      <rect x="20" y="42" width="60" height="16" fill="#fff" rx="2" />
    </svg>
  );
}

function FlagAU({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="size-full shrink-0">
      <defs>
        <clipPath id="au-circle-clip">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath="url(#au-circle-clip)">
        <rect width="100" height="100" fill="#00008b" />
        <g transform="scale(0.5)">
          <rect width="100" height="50" fill="#012169" />
          <path d="M0,0 L100,50 M100,0 L0,50" stroke="#fff" strokeWidth="8" />
          <path d="M0,0 L100,50 M100,0 L0,50" stroke="#C8102E" strokeWidth="5" />
          <path d="M50,0 v50 M0,25 h100" stroke="#fff" strokeWidth="12" />
          <path d="M50,0 v50 M0,25 h100" stroke="#C8102E" strokeWidth="7" />
        </g>
        <circle cx="75" cy="35" r="3" fill="#fff" />
        <circle cx="85" cy="50" r="3" fill="#fff" />
        <circle cx="75" cy="75" r="4" fill="#fff" />
        <circle cx="65" cy="60" r="3" fill="#fff" />
        <circle cx="30" cy="75" r="5.5" fill="#fff" />
      </g>
    </svg>
  );
}

function FlagCA({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="size-full shrink-0">
      <defs>
        <clipPath id="ca-circle-clip">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath="url(#ca-circle-clip)">
        <rect width="100" height="100" fill="#ff0000" />
        <rect x="25" width="50" height="100" fill="#ffffff" />
        <path
          d="M50,25 l4,10 8,-2 -4,8 8,4 -9,3 3,9 -7,-4 -1,12 -1,-12 -7,4 3,-9 -9,-3 8,-4 -4,-8 8,2 z"
          fill="#ff0000"
        />
      </g>
    </svg>
  );
}

function FlagNZ({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="size-full shrink-0">
      <defs>
        <clipPath id="nz-circle-clip">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath="url(#nz-circle-clip)">
        <rect width="100" height="100" fill="#00247d" />
        <circle cx="75" cy="35" r="3" fill="#cc142b" stroke="#fff" strokeWidth="0.8" />
        <circle cx="85" cy="52" r="2.8" fill="#cc142b" stroke="#fff" strokeWidth="0.8" />
        <circle cx="75" cy="72" r="3.5" fill="#cc142b" stroke="#fff" strokeWidth="0.8" />
        <circle cx="65" cy="52" r="2.8" fill="#cc142b" stroke="#fff" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

function FlagGold({ size }: { size: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 flex items-center justify-center text-white font-bold text-[9px] shadow-2xs shrink-0"
    >
      Au
    </div>
  );
}

function FlagCrypto({ symbol, size }: { symbol: string; size: number }) {
  const isBtc = symbol.includes('BTC') || symbol === 'XBT';
  if (isBtc) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-[#f7931a] flex items-center justify-center text-white font-bold shadow-2xs shrink-0"
      >
        <span className="font-serif text-[13px] leading-none">₿</span>
      </div>
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-[#627eea] flex items-center justify-center text-white font-bold shadow-2xs shrink-0"
    >
      <span className="font-sans text-[12px] leading-none">Ξ</span>
    </div>
  );
}

function CurrencyBadge({ code, size = 32 }: { code: string; size?: number }) {
  const upper = code.toUpperCase();
  switch (upper) {
    case 'EUR':
      return <FlagEU size={size} />;
    case 'USD':
      return <FlagUS size={size} />;
    case 'INR':
      return <FlagIN size={size} />;
    case 'GBP':
      return <FlagGB size={size} />;
    case 'JPY':
      return <FlagJP size={size} />;
    case 'CHF':
      return <FlagCH size={size} />;
    case 'AUD':
      return <FlagAU size={size} />;
    case 'CAD':
      return <FlagCA size={size} />;
    case 'NZD':
      return <FlagNZ size={size} />;
    case 'BTC':
    case 'XBT':
      return <FlagCrypto symbol="BTC" size={size} />;
    case 'ETH':
      return <FlagCrypto symbol="ETH" size={size} />;
    case 'XAU':
    case 'GOLD':
      return <FlagGold size={size} />;
    default:
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-full bg-zinc-800 text-white font-sans text-[9px] font-bold flex items-center justify-center shrink-0"
        >
          {code.slice(0, 2)}
        </div>
      );
  }
}

export function TradingPairIcon({
  symbol,
  logoid,
  size = 'md',
  className = '',
}: TradingPairIconProps) {
  const clean = symbol.toUpperCase().replace(/^.*:/, '').trim();
  const badgeSize = size === 'xs' ? 22 : size === 'sm' ? 28 : size === 'md' ? 32 : 38;

  // S&P 500 ETF: SPY (Red circle with white 500, Image 8)
  if (clean === 'SPY' || clean === 'SPX' || clean === 'INX') {
    return (
      <div
        style={{ width: badgeSize, height: badgeSize }}
        className={cn(
          'flex items-center justify-center rounded-full bg-[#dc2626] text-white shrink-0 shadow-2xs font-bold font-sans tracking-tight',
          className,
        )}
      >
        <span className="text-[11px] font-sans font-bold leading-none">500</span>
      </div>
    );
  }

  // US30 / Dow Jones
  if (clean === 'US30' || clean.includes('DOW')) {
    return (
      <div
        style={{ width: badgeSize, height: badgeSize }}
        className={cn('rounded-full overflow-hidden ring-2 ring-background shadow-xs shrink-0 bg-white', className)}
      >
        <CurrencyBadge code="USD" size={badgeSize} />
      </div>
    );
  }

  // BTC / Crypto pairs (BTCUSD, BTCUSDT, ETHUSD, ETHUSDT) -> Overlapping badges (Image 8)
  if (clean === 'BTCUSD' || clean === 'BTCUSDT') {
    return (
      <div className={cn('flex items-center -space-x-2 shrink-0', className)}>
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className="rounded-full overflow-hidden ring-2 ring-background shadow-xs z-10 shrink-0 flex items-center justify-center bg-white"
        >
          <CurrencyBadge code="BTC" size={badgeSize} />
        </div>
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className="rounded-full overflow-hidden ring-2 ring-background shadow-xs z-0 shrink-0 flex items-center justify-center bg-white"
        >
          <CurrencyBadge code="USD" size={badgeSize} />
        </div>
      </div>
    );
  }

  if (clean === 'ETHUSD' || clean === 'ETHUSDT') {
    return (
      <div className={cn('flex items-center -space-x-2 shrink-0', className)}>
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className="rounded-full overflow-hidden ring-2 ring-background shadow-xs z-10 shrink-0 flex items-center justify-center bg-white"
        >
          <CurrencyBadge code="ETH" size={badgeSize} />
        </div>
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className="rounded-full overflow-hidden ring-2 ring-background shadow-xs z-0 shrink-0 flex items-center justify-center bg-white"
        >
          <CurrencyBadge code="USD" size={badgeSize} />
        </div>
      </div>
    );
  }

  // Gold pair: XAUUSD
  if (clean === 'XAUUSD') {
    return (
      <div className={cn('flex items-center -space-x-2 shrink-0', className)}>
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className="rounded-full overflow-hidden ring-2 ring-background shadow-xs z-10 shrink-0 flex items-center justify-center bg-white"
        >
          <CurrencyBadge code="XAU" size={badgeSize} />
        </div>
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className="rounded-full overflow-hidden ring-2 ring-background shadow-xs z-0 shrink-0 flex items-center justify-center bg-white"
        >
          <CurrencyBadge code="USD" size={badgeSize} />
        </div>
      </div>
    );
  }

  // Standard 6-character Forex currency pairs: EURUSD, USDINR, GBPUSD, USDJPY, GBPJPY, etc. (Image 1 & 4)
  if (clean.length === 6 && !clean.startsWith('BTC') && !clean.startsWith('ETH')) {
    const base = clean.slice(0, 3);
    const quote = clean.slice(3, 6);

    return (
      <div className={cn('flex items-center -space-x-2 shrink-0', className)}>
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className="rounded-full overflow-hidden ring-2 ring-background shadow-xs z-10 shrink-0 flex items-center justify-center bg-white"
        >
          <CurrencyBadge code={base} size={badgeSize} />
        </div>
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className="rounded-full overflow-hidden ring-2 ring-background shadow-xs z-0 shrink-0 flex items-center justify-center bg-white"
        >
          <CurrencyBadge code={quote} size={badgeSize} />
        </div>
      </div>
    );
  }

  // Otherwise, use StockSymbolIcon for single stocks, indices, ETFs
  return (
    <StockSymbolIcon
      symbol={clean}
      logoid={logoid}
      size={size}
      className={className}
    />
  );
}

export default TradingPairIcon;
