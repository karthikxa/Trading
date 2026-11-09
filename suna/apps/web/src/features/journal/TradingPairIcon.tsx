'use client';

import React from 'react';
import StockSymbolIcon from '../markets/StockSymbolIcon';

interface TradingPairIconProps {
  symbol: string;
  size?: 'sm' | 'md';
  className?: string;
}

// Crisp inline SVGs for currency flags in circular badges
function FlagEU({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className="size-full object-cover">
      <rect width="512" height="512" fill="#003399" />
      <g fill="#ffcc00" transform="translate(256,256) scale(26)">
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x = 7 * Math.sin(angle);
          const y = -7 * Math.cos(angle);
          return (
            <polygon
              key={i}
              points="0,-1 0.3,-0.3 1,-0.3 0.4,0.1 0.6,0.8 0,0.4 -0.6,0.8 -0.4,0.1 -1,-0.3 -0.3,-0.3"
              transform={`translate(${x},${y}) scale(0.9)`}
            />
          );
        })}
      </g>
    </svg>
  );
}

function FlagUS({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className="size-full object-cover">
      <rect width="512" height="512" fill="#b22234" />
      <path d="M0,39.38h512v39.38H0z M0,118.15h512v39.38H0z M0,196.92h512v39.38H0z M0,275.69h512v39.38H0z M0,354.46h512v39.38H0z M0,433.23h512v39.38H0z" fill="#fff" />
      <rect width="205" height="275.7" fill="#3c3b6e" />
      <g fill="#fff">
        <circle cx="35" cy="40" r="10" />
        <circle cx="95" cy="40" r="10" />
        <circle cx="155" cy="40" r="10" />
        <circle cx="65" cy="80" r="10" />
        <circle cx="125" cy="80" r="10" />
        <circle cx="35" cy="120" r="10" />
        <circle cx="95" cy="120" r="10" />
        <circle cx="155" cy="120" r="10" />
        <circle cx="65" cy="160" r="10" />
        <circle cx="125" cy="160" r="10" />
        <circle cx="35" cy="200" r="10" />
        <circle cx="95" cy="200" r="10" />
        <circle cx="155" cy="200" r="10" />
      </g>
    </svg>
  );
}

function FlagGB({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" className="size-full object-cover">
      <clipPath id="gb-circle"><rect width="60" height="60" /></clipPath>
      <g clipPath="url(#gb-circle)">
        <rect width="60" height="60" fill="#012169" />
        <path d="M0,0 L60,60 M60,0 L0,60" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,60 M60,0 L0,60" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v60 M0,30 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v60 M0,30 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

function FlagJP({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className="size-full object-cover">
      <rect width="512" height="512" fill="#fff" />
      <circle cx="256" cy="256" r="130" fill="#bc002d" />
    </svg>
  );
}

function FlagCH({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className="size-full object-cover">
      <rect width="512" height="512" fill="#d52b1e" />
      <rect x="216" y="106" width="80" height="300" fill="#fff" />
      <rect x="106" y="216" width="300" height="80" fill="#fff" />
    </svg>
  );
}

function FlagAU({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className="size-full object-cover">
      <rect width="512" height="512" fill="#00008b" />
      <g transform="scale(0.5)">
        <rect width="512" height="256" fill="#012169" />
        <path d="M0,0 L512,256 M512,0 L0,256" stroke="#fff" strokeWidth="40" />
        <path d="M0,0 L512,256 M512,0 L0,256" stroke="#C8102E" strokeWidth="24" />
        <path d="M256,0 v256 M0,128 h512" stroke="#fff" strokeWidth="60" />
        <path d="M256,0 v256 M0,128 h512" stroke="#C8102E" strokeWidth="36" />
      </g>
      <circle cx="380" cy="180" r="16" fill="#fff" />
      <circle cx="440" cy="260" r="16" fill="#fff" />
      <circle cx="380" cy="380" r="20" fill="#fff" />
      <circle cx="320" cy="300" r="16" fill="#fff" />
      <circle cx="150" cy="380" r="28" fill="#fff" />
    </svg>
  );
}

function FlagCA({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className="size-full object-cover">
      <rect width="512" height="512" fill="#ff0000" />
      <rect x="128" width="256" height="512" fill="#ffffff" />
      <path
        d="M256,128 l20,50 40,-10 -20,40 40,20 -45,15 15,45 -35,-20 -5,60 -5,-60 -35,20 15,-45 -45,-15 40,-20 -20,-40 40,10 z"
        fill="#ff0000"
      />
    </svg>
  );
}

function FlagNZ({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className="size-full object-cover">
      <rect width="512" height="512" fill="#00247d" />
      <g transform="scale(0.5)">
        <rect width="512" height="256" fill="#012169" />
        <path d="M0,0 L512,256 M512,0 L0,256" stroke="#fff" strokeWidth="40" />
        <path d="M0,0 L512,256 M512,0 L0,256" stroke="#C8102E" strokeWidth="24" />
        <path d="M256,0 v256 M0,128 h512" stroke="#fff" strokeWidth="60" />
        <path d="M256,0 v256 M0,128 h512" stroke="#C8102E" strokeWidth="36" />
      </g>
      <circle cx="380" cy="180" r="16" fill="#cc142b" stroke="#fff" strokeWidth="4" />
      <circle cx="430" cy="270" r="14" fill="#cc142b" stroke="#fff" strokeWidth="4" />
      <circle cx="380" cy="370" r="18" fill="#cc142b" stroke="#fff" strokeWidth="4" />
      <circle cx="330" cy="270" r="14" fill="#cc142b" stroke="#fff" strokeWidth="4" />
    </svg>
  );
}

function FlagIN({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className="size-full object-cover">
      <rect width="512" height="170.67" fill="#FF9933" />
      <rect y="170.67" width="512" height="170.67" fill="#FFFFFF" />
      <rect y="341.33" width="512" height="170.67" fill="#128807" />
      <circle cx="256" cy="256" r="60" fill="none" stroke="#000080" strokeWidth="8" />
      <circle cx="256" cy="256" r="14" fill="#000080" />
      {[...Array(24)].map((_, i) => {
        const angle = (i * 15 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1="256"
            y1="256"
            x2={256 + 56 * Math.sin(angle)}
            y2={256 - 56 * Math.cos(angle)}
            stroke="#000080"
            strokeWidth="4"
          />
        );
      })}
    </svg>
  );
}

function FlagGold({ size }: { size: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 flex items-center justify-center text-white font-bold text-[8px] shadow-2xs"
    >
      Au
    </div>
  );
}

function FlagCrypto({ symbol, size }: { symbol: string; size: number }) {
  const isBtc = symbol.includes('BTC');
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full flex items-center justify-center text-white font-bold text-[9px] shadow-2xs ${
        isBtc ? 'bg-[#f7931a]' : 'bg-[#627eea]'
      }`}
    >
      {isBtc ? '₿' : 'Ξ'}
    </div>
  );
}

function getCurrencyBadge(code: string, size = 18) {
  switch (code.toUpperCase()) {
    case 'EUR':
      return <FlagEU size={size} />;
    case 'USD':
      return <FlagUS size={size} />;
    case 'GBP':
      return <FlagGB size={size} />;
    case 'JPY':
      return <FlagJP size={size} />;
    case 'CHF':
      return <FlagCH size={size} />;
    case 'AUD':
      return <FlagAU size={size} />;
    case 'INR':
      return <FlagIN size={size} />;
    case 'CAD':
      return <FlagCA size={size} />;
    case 'NZD':
      return <FlagNZ size={size} />;
    case 'XAU':
    case 'GOLD':
      return <FlagGold size={size} />;
    case 'BTC':
    case 'ETH':
      return <FlagCrypto symbol={code} size={size} />;
    default:
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-full bg-zinc-800 text-white font-mono text-[8px] font-bold flex items-center justify-center"
        >
          {code.slice(0, 2)}
        </div>
      );
  }
}

export function TradingPairIcon({ symbol, size = 'md', className = '' }: TradingPairIconProps) {
  const clean = symbol.toUpperCase().replace(/^.*:/, '').trim();

  // US30 / Dow Jones
  if (clean === 'US30' || clean.includes('DOW')) {
    const badgeSize = size === 'sm' ? 18 : 22;
    return (
      <div
        style={{ width: badgeSize, height: badgeSize }}
        className={`rounded-full overflow-hidden ring-2 ring-white shadow-2xs shrink-0 ${className}`}
      >
        <FlagUS size={badgeSize} />
      </div>
    );
  }

  // If it's a 6-character forex currency pair like EURUSD, GBPJPY, AUDCHF
  if (clean.length === 6 && !clean.startsWith('BTC') && !clean.startsWith('ETH')) {
    const base = clean.slice(0, 3);
    const quote = clean.slice(3, 6);
    const badgeSize = size === 'sm' ? 18 : 22;

    return (
      <div className={`flex items-center -space-x-2 shrink-0 ${className}`}>
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className="rounded-full overflow-hidden ring-2 ring-white shadow-2xs z-10 shrink-0"
        >
          {getCurrencyBadge(base, badgeSize)}
        </div>
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className="rounded-full overflow-hidden ring-2 ring-white shadow-2xs z-0 shrink-0"
        >
          {getCurrencyBadge(quote, badgeSize)}
        </div>
      </div>
    );
  }

  // Gold pair: XAUUSD
  if (clean === 'XAUUSD') {
    const badgeSize = size === 'sm' ? 18 : 22;
    return (
      <div className={`flex items-center -space-x-2 shrink-0 ${className}`}>
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className="rounded-full overflow-hidden ring-2 ring-white shadow-2xs z-10 shrink-0"
        >
          <FlagGold size={badgeSize} />
        </div>
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className="rounded-full overflow-hidden ring-2 ring-white shadow-2xs z-0 shrink-0"
        >
          <FlagUS size={badgeSize} />
        </div>
      </div>
    );
  }

  // BTC / Crypto pair: BTCUSD
  if (clean === 'BTCUSD' || clean === 'BTCUSDT') {
    const badgeSize = size === 'sm' ? 18 : 22;
    return (
      <div className={`flex items-center -space-x-2 shrink-0 ${className}`}>
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className="rounded-full overflow-hidden ring-2 ring-white shadow-2xs z-10 shrink-0"
        >
          <FlagCrypto symbol="BTC" size={badgeSize} />
        </div>
        <div
          style={{ width: badgeSize, height: badgeSize }}
          className="rounded-full overflow-hidden ring-2 ring-white shadow-2xs z-0 shrink-0"
        >
          <FlagUS size={badgeSize} />
        </div>
      </div>
    );
  }

  // Otherwise, use TradingView StockSymbolIcon
  return <StockSymbolIcon symbol={clean} size={size === 'sm' ? 'xs' : 'sm'} className={className} />;
}

export default TradingPairIcon;

