'use client';

import React, { useState } from 'react';
import { cn } from '@kortix/ui';
import { Landmark, Cpu, Dna, Gem, Globe, Flame } from 'lucide-react';

interface StockSymbolIconProps {
  symbol: string;
  type?: string;
  logoid?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const TRADINGVIEW_KNOWN_LOGOS: Record<string, string> = {
  AAPL: 'https://s3-symbol-logo.tradingview.com/apple.svg',
  NVDA: 'https://s3-symbol-logo.tradingview.com/nvidia.svg',
  TSLA: 'https://s3-symbol-logo.tradingview.com/tesla.svg',
  MSFT: 'https://s3-symbol-logo.tradingview.com/microsoft.svg',
  AMZN: 'https://s3-symbol-logo.tradingview.com/amazon.svg',
  GOOGL: 'https://s3-symbol-logo.tradingview.com/alphabet.svg',
  GOOG: 'https://s3-symbol-logo.tradingview.com/alphabet.svg',
  META: 'https://s3-symbol-logo.tradingview.com/meta.svg',
  NFLX: 'https://s3-symbol-logo.tradingview.com/netflix.svg',
  AMD: 'https://s3-symbol-logo.tradingview.com/advanced-micro-devices.svg',
  INTC: 'https://s3-symbol-logo.tradingview.com/intel.svg',

  // ETFs & Indices
  SPY: 'https://s3-symbol-logo.tradingview.com/indices/s-and-p-500.svg',
  SPX: 'https://s3-symbol-logo.tradingview.com/indices/s-and-p-500.svg',
  INX: 'https://s3-symbol-logo.tradingview.com/indices/s-and-p-500.svg',
  QQQ: 'https://s3-symbol-logo.tradingview.com/indices/nasdaq-100.svg',
  NDX: 'https://s3-symbol-logo.tradingview.com/indices/nasdaq-100.svg',
  DIA: 'https://s3-symbol-logo.tradingview.com/indices/dow-30.svg',
  DJI: 'https://s3-symbol-logo.tradingview.com/indices/dow-30.svg',
  IWM: 'https://s3-symbol-logo.tradingview.com/indices/russell-2000.svg',

  // Crypto
  BTC: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCBTC.svg',
  BTCUSD: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCBTC.svg',
  BTCUSDT: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCBTC.svg',
  ETH: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCETH.svg',
  ETHUSD: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCETH.svg',
  ETHUSDT: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCETH.svg',
  SOL: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCSOL.svg',
  SOLUSD: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCSOL.svg',
  SOLUSDT: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCSOL.svg',
  BNB: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCBNB.svg',
  BNBUSD: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCBNB.svg',
  BNBUSDT: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCBNB.svg',
  XRP: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCXRP.svg',
  XRPUSD: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCXRP.svg',
  XRPUSDT: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCXRP.svg',
  DOGE: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCDOGE.svg',
  DOGEUSD: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCDOGE.svg',
  DOGEUSDT: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCDOGE.svg',
  ADA: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCADA.svg',
  ADAUSD: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCADA.svg',
  ADAUSDT: 'https://s3-symbol-logo.tradingview.com/crypto/XTVCADA.svg',

  // Forex
  EURUSD: 'https://s3-symbol-logo.tradingview.com/country/EU.svg',
  EURGBP: 'https://s3-symbol-logo.tradingview.com/country/EU.svg',
  EURJPY: 'https://s3-symbol-logo.tradingview.com/country/EU.svg',
  GBPUSD: 'https://s3-symbol-logo.tradingview.com/country/GB.svg',
  GBPJPY: 'https://s3-symbol-logo.tradingview.com/country/GB.svg',
  USDJPY: 'https://s3-symbol-logo.tradingview.com/country/JP.svg',
  AUDUSD: 'https://s3-symbol-logo.tradingview.com/country/AU.svg',
  USDCAD: 'https://s3-symbol-logo.tradingview.com/country/CA.svg',
  USDCHF: 'https://s3-symbol-logo.tradingview.com/country/CH.svg',

  // India Equities
  CENTRALBK: 'https://s3-symbol-logo.tradingview.com/central-bank-of-india--big.svg',
  'CENTRAL BANK OF INDIA': 'https://s3-symbol-logo.tradingview.com/central-bank-of-india--big.svg',
  CENTRALBANKOFINDIA: 'https://s3-symbol-logo.tradingview.com/central-bank-of-india--big.svg',
  IOB: 'https://s3-symbol-logo.tradingview.com/indian-overseas-bank--big.svg',
  'INDIAN OVERSEAS BANK': 'https://s3-symbol-logo.tradingview.com/indian-overseas-bank--big.svg',
  INDIANOVERSEASBANK: 'https://s3-symbol-logo.tradingview.com/indian-overseas-bank--big.svg',
  IDEA: 'https://s3-symbol-logo.tradingview.com/vodafone-idea--big.svg',
  'VODAFONE IDEA': 'https://s3-symbol-logo.tradingview.com/vodafone-idea--big.svg',
  VODAFONEIDEA: 'https://s3-symbol-logo.tradingview.com/vodafone-idea--big.svg',
  RELIANCE: 'https://s3-symbol-logo.tradingview.com/reliance-industrial-infrastructure--big.svg',
  TCS: 'https://s3-symbol-logo.tradingview.com/tata-consultancy--big.svg',
  HDFCBANK: 'https://s3-symbol-logo.tradingview.com/hdfc-bank--big.svg',
  ICICIBANK: 'https://s3-symbol-logo.tradingview.com/icici-bank--big.svg',
  INFY: 'https://s3-symbol-logo.tradingview.com/infosys--big.svg',
  SBIN: 'https://s3-symbol-logo.tradingview.com/state-bank--big.svg',
  BHARTIARTL: 'https://s3-symbol-logo.tradingview.com/airtel--big.svg',
  ITC: 'https://s3-symbol-logo.tradingview.com/itc--big.svg',
  KOTAKBANK: 'https://s3-symbol-logo.tradingview.com/kotak-mahindra-bank--big.svg',
  LT: 'https://s3-symbol-logo.tradingview.com/larsen-and-toubro--big.svg',
  AXISBANK: 'https://s3-symbol-logo.tradingview.com/axis-bank--big.svg',
  WIPRO: 'https://s3-symbol-logo.tradingview.com/wipro--big.svg',
  HCLTECH: 'https://s3-symbol-logo.tradingview.com/hcl-technologies--big.svg',
  MARUTI: 'https://s3-symbol-logo.tradingview.com/maruti-suzuki-india--big.svg',
  TATAMOTORS: 'https://s3-symbol-logo.tradingview.com/tata-motors--big.svg',
  TATASTEEL: 'https://s3-symbol-logo.tradingview.com/tata-steel--big.svg',
  TITAN: 'https://s3-symbol-logo.tradingview.com/titan-company--big.svg',
  BAJFINANCE: 'https://s3-symbol-logo.tradingview.com/bajaj-finance--big.svg',
  BAJAJFINSV: 'https://s3-symbol-logo.tradingview.com/bajaj-finserv--big.svg',
  'BAJAJ-AUTO': 'https://s3-symbol-logo.tradingview.com/bajaj-auto--big.svg',
  ASIANPAINT: 'https://s3-symbol-logo.tradingview.com/asian-paints--big.svg',
  ULTRACEMCO: 'https://s3-symbol-logo.tradingview.com/ultratech-cement--big.svg',
  SUNPHARMA: 'https://s3-symbol-logo.tradingview.com/sun-pharmaceutical--big.svg',
  NTPC: 'https://s3-symbol-logo.tradingview.com/ntpc--big.svg',
  POWERGRID: 'https://s3-symbol-logo.tradingview.com/power-grid--big.svg',
  COALINDIA: 'https://s3-symbol-logo.tradingview.com/coal-india--big.svg',
  ONGC: 'https://s3-symbol-logo.tradingview.com/oil-and-natural-gas--big.svg',
  ZOMATO: 'https://s3-symbol-logo.tradingview.com/zomato--big.svg',
  DRREDDY: 'https://s3-symbol-logo.tradingview.com/dr-reddys--big.svg',
  CIPLA: 'https://s3-symbol-logo.tradingview.com/cipla--big.svg',
  EICHERMOT: 'https://s3-symbol-logo.tradingview.com/eicher-motors--big.svg',
  HINDALCO: 'https://s3-symbol-logo.tradingview.com/hindalco--big.svg',
  VEDL: 'https://s3-symbol-logo.tradingview.com/vedanta--big.svg',
  TRENT: 'https://s3-symbol-logo.tradingview.com/trent--big.svg',
  BEL: 'https://s3-symbol-logo.tradingview.com/bharat-electronics--big.svg',
  HAL: 'https://s3-symbol-logo.tradingview.com/hindustan-aeronautics--big.svg',
  DLF: 'https://s3-symbol-logo.tradingview.com/dlf--big.svg',
  VBL: 'https://s3-symbol-logo.tradingview.com/varun-beverages--big.svg',
  IOC: 'https://s3-symbol-logo.tradingview.com/indian-oil--big.svg',
  GAIL: 'https://s3-symbol-logo.tradingview.com/gail--big.svg',
  PIDILITIND: 'https://s3-symbol-logo.tradingview.com/pidilite--big.svg',
  SIEMENS: 'https://s3-symbol-logo.tradingview.com/siemens--big.svg',
  HAVELLS: 'https://s3-symbol-logo.tradingview.com/havells--big.svg',
  DABUR: 'https://s3-symbol-logo.tradingview.com/dabur--big.svg',
  POLYCAB: 'https://s3-symbol-logo.tradingview.com/polycab--big.svg',
  SHREECEM: 'https://s3-symbol-logo.tradingview.com/shree-cement--big.svg',
  BPCL: 'https://s3-symbol-logo.tradingview.com/bharat-petroleum--big.svg',
  GRASIM: 'https://s3-symbol-logo.tradingview.com/grasim--big.svg',
  APOLLOHOSP: 'https://s3-symbol-logo.tradingview.com/apollo-hospitals--big.svg',
  INDUSINDBK: 'https://s3-symbol-logo.tradingview.com/indusind-bank--big.svg',
  NESTLEIND: 'https://s3-symbol-logo.tradingview.com/nestle--big.svg',
  BRITANNIA: 'https://s3-symbol-logo.tradingview.com/britannia--big.svg',
  HINDUNILVR: 'https://s3-symbol-logo.tradingview.com/unilever--big.svg',
  SUZLON: 'https://s3-symbol-logo.tradingview.com/suzlon-energy--big.svg',
  BSE: 'https://s3-symbol-logo.tradingview.com/bse--big.svg',

  // Indian Indices
  NIFTY: 'https://s3-symbol-logo.tradingview.com/indices/nifty-50--big.svg',
  NIFTY50: 'https://s3-symbol-logo.tradingview.com/indices/nifty-50--big.svg',
  'NIFTY 50': 'https://s3-symbol-logo.tradingview.com/indices/nifty-50--big.svg',
  BANKNIFTY: 'https://s3-symbol-logo.tradingview.com/indices/nifty-bank-index--big.svg',
  FINNIFTY: 'https://s3-symbol-logo.tradingview.com/indices/finnifty--big.svg',
  MIDCPNIFTY: 'https://s3-symbol-logo.tradingview.com/indices/nifty-midcap-select-index--big.svg',
  SENSEX: 'https://s3-symbol-logo.tradingview.com/indices/bse-sensex--big.svg',
  BANKEX: 'https://s3-symbol-logo.tradingview.com/indices/bse-bankex-index--big.svg',
  INDIAVIX: 'https://s3-symbol-logo.tradingview.com/indices/india-vix--big.svg',
  'INDIA VIX': 'https://s3-symbol-logo.tradingview.com/indices/india-vix--big.svg',
  'NIFTY IT': 'https://s3-symbol-logo.tradingview.com/indices/nifty-it-index--big.svg',
  NIFTYIT: 'https://s3-symbol-logo.tradingview.com/indices/nifty-it-index--big.svg',
  'NIFTY AUTO': 'https://s3-symbol-logo.tradingview.com/indices/nifty-auto-index--big.svg',
  NIFTYAUTO: 'https://s3-symbol-logo.tradingview.com/indices/nifty-auto-index--big.svg',
  'NIFTY PHARMA': 'https://s3-symbol-logo.tradingview.com/indices/nifty-pharma-index--big.svg',
  NIFTYPHARMA: 'https://s3-symbol-logo.tradingview.com/indices/nifty-pharma-index--big.svg',
  'NIFTY METAL': 'https://s3-symbol-logo.tradingview.com/indices/nifty-metal-index--big.svg',
  NIFTYMETAL: 'https://s3-symbol-logo.tradingview.com/indices/nifty-metal-index--big.svg',
  'NIFTY FMCG': 'https://s3-symbol-logo.tradingview.com/indices/nifty-fmcg-index--big.svg',
  NIFTYFMCG: 'https://s3-symbol-logo.tradingview.com/indices/nifty-fmcg-index--big.svg',
  'NIFTY NEXT 50': 'https://s3-symbol-logo.tradingview.com/indices/nifty-next-50-index--big.svg',
  'NIFTY ENERGY': 'https://s3-symbol-logo.tradingview.com/indices/nifty-energy-index--big.svg',

  // Indian ETFs
  NIFTYBEES: 'https://s3-symbol-logo.tradingview.com/indices/nifty-50--big.svg',
  BANKBEES: 'https://s3-symbol-logo.tradingview.com/indices/nifty-bank-index--big.svg',
  GOLDBEES: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
  SILVERBEES: 'https://s3-symbol-logo.tradingview.com/metal/silver.svg',
  ITBEES: 'https://s3-symbol-logo.tradingview.com/indices/nifty-it-index--big.svg',
  JUNIORBEES: 'https://s3-symbol-logo.tradingview.com/indices/nifty-next-50-index--big.svg',
  LIQUIDBEES: 'https://s3-symbol-logo.tradingview.com/nippon-life-india-asset--big.svg',
  MON100: 'https://s3-symbol-logo.tradingview.com/motilal--big.svg',
  CPSEETF: 'https://s3-symbol-logo.tradingview.com/nippon-life-india-asset--big.svg',
  BHARAT22: 'https://s3-symbol-logo.tradingview.com/icici-prudential-bank--big.svg',

  // Metals & Commodities
  GOLD: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
  XAUUSD: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
  SILVER: 'https://s3-symbol-logo.tradingview.com/metal/silver.svg',
  XAGUSD: 'https://s3-symbol-logo.tradingview.com/metal/silver.svg',
  USOIL: 'https://s3-symbol-logo.tradingview.com/crude-oil.svg',
  UKOIL: 'https://s3-symbol-logo.tradingview.com/crude-oil.svg',

  // Additional Popular Stocks
  COIN: 'https://s3-symbol-logo.tradingview.com/coinbase.svg',
  PLTR: 'https://s3-symbol-logo.tradingview.com/palantir.svg',
  AVGO: 'https://s3-symbol-logo.tradingview.com/broadcom.svg',
  CRM: 'https://s3-symbol-logo.tradingview.com/salesforce.svg',
  UBER: 'https://s3-symbol-logo.tradingview.com/uber.svg',
};

const FAILED_LOGO_URLS = new Set<string>();

export const StockSymbolIcon = React.memo(function StockSymbolIcon({
  symbol,
  type,
  logoid,
  size = 'md',
  className,
}: StockSymbolIconProps) {
  const cleanSym = symbol.toUpperCase().replace(/^.*:/, '').trim();

  const sizeClasses = {
    xs: 'size-[22px] text-[9px]',
    sm: 'size-[28px] text-[10.5px]',
    md: 'size-[32px] text-[12px]',
    lg: 'size-[40px] text-sm',
  }[size];

  // 1. Prioritize authentic real TradingView SVG CDN logo for verified visual accuracy
  const primaryUrl = React.useMemo(() => {
    if (logoid) {
      if (logoid.startsWith('http')) return logoid;
      const clean = logoid.replace(/\.svg$/, '');
      return `https://s3-symbol-logo.tradingview.com/${clean}--big.svg`;
    }
    if (cleanSym.includes('CENTRAL BANK') || cleanSym === 'CENTRALBK') {
      return 'https://s3-symbol-logo.tradingview.com/central-bank-of-india--big.svg';
    }
    if (cleanSym.includes('INDIAN OVERSEAS') || cleanSym === 'IOB') {
      return 'https://s3-symbol-logo.tradingview.com/indian-overseas-bank--big.svg';
    }
    if (
      (cleanSym.includes('VODAFONE') || cleanSym === 'IDEA' || cleanSym === 'IDEA1!') &&
      !cleanSym.includes('FORGE') &&
      !cleanSym.includes('IDEAL')
    ) {
      return 'https://s3-symbol-logo.tradingview.com/vodafone-idea--big.svg';
    }
    return TRADINGVIEW_KNOWN_LOGOS[cleanSym] || TRADINGVIEW_KNOWN_LOGOS[cleanSym.replace(/\s+/g, '')] || null;
  }, [logoid, cleanSym]);

  const [currentSrc, setCurrentSrc] = useState<string | null>(primaryUrl);
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    setCurrentSrc(primaryUrl);
    setHasError(false);
  }, [primaryUrl]);

  const handleImageError = () => {
    if (currentSrc && currentSrc.includes('--big.svg')) {
      // Try normal .svg without --big
      setCurrentSrc(currentSrc.replace('--big.svg', '.svg'));
    } else if (currentSrc && !currentSrc.startsWith('/market-icons/') && logoid) {
      // Try local fallback if available
      setCurrentSrc(`/market-icons/${logoid.replace(/\//g, '_').replace(/\.svg$/, '')}.svg`);
    } else {
      setHasError(true);
    }
  };

  // Handle Options (CE / PE) contracts
  if (cleanSym.endsWith(' CE') || /\b\d+\s*CE$/.test(cleanSym)) {
    const optSizeClasses = {
      xs: 'size-[20px] text-[8px]',
      sm: 'size-[24px] text-[9.5px]',
      md: 'size-[28px] text-[10.5px]',
      lg: 'size-[36px] text-xs',
    }[size];
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300/80 font-medium shrink-0 shadow-2xs font-sans tracking-tight',
          optSizeClasses,
          className,
        )}
      >
        CE
      </div>
    );
  }

  if (cleanSym.endsWith(' PE') || /\b\d+\s*PE$/.test(cleanSym)) {
    const optSizeClasses = {
      xs: 'size-[20px] text-[8px]',
      sm: 'size-[24px] text-[9.5px]',
      md: 'size-[28px] text-[10.5px]',
      lg: 'size-[36px] text-xs',
    }[size];
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-300/80 font-medium shrink-0 shadow-2xs font-sans tracking-tight',
          optSizeClasses,
          className,
        )}
      >
        PE
      </div>
    );
  }

  // Handle Futures
  if (cleanSym.endsWith('-FUT') || cleanSym.endsWith(' FUT') || cleanSym.endsWith('1!')) {
    const futSizeClasses = {
      xs: 'size-[20px] text-[7.5px]',
      sm: 'size-[24px] text-[9px]',
      md: 'size-[28px] text-[10px]',
      lg: 'size-[36px] text-xs',
    }[size];
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-300/80 font-medium shrink-0 shadow-2xs font-sans tracking-tight',
          futSizeClasses,
          className,
        )}
      >
        FUT
      </div>
    );
  }

  // S&P 500 ETF: SPY (Red circle with white 500, Image 8)
  if (cleanSym === 'SPY' || cleanSym === 'SPX' || cleanSym === 'INX') {
    const spySizeClasses = {
      xs: 'size-[22px] text-[9px]',
      sm: 'size-[28px] text-[10.5px]',
      md: 'size-[32px] text-[12px]',
      lg: 'size-[38px] text-sm',
    }[size];
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#dc2626] text-white shrink-0 shadow-2xs font-bold font-sans tracking-tight',
          spySizeClasses,
          className,
        )}
      >
        <span className="font-bold leading-none">500</span>
      </div>
    );
  }

  // Indian Indices (Image 2 & 3: Decent size, bold circular badges)
  if (
    cleanSym === 'NIFTY' ||
    cleanSym === 'NIFTY50' ||
    cleanSym === 'NIFTY 50' ||
    cleanSym.includes('NIFTY50') ||
    cleanSym.includes('NIFTY 50')
  ) {
    const idxSizeClasses = {
      xs: 'size-[22px] text-[9px]',
      sm: 'size-[28px] text-[10.5px]',
      md: 'size-[32px] text-[12px]',
      lg: 'size-[38px] text-sm',
    }[size];
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#1b2559] text-white shrink-0 shadow-2xs font-bold font-sans tracking-tight',
          idxSizeClasses,
          className,
        )}
      >
        <span className="font-bold leading-none">50</span>
      </div>
    );
  }

  if (cleanSym.includes('BANKNIFTY') || cleanSym.includes('NIFTY BANK') || cleanSym === 'BANKEX') {
    const bankSizeClasses = {
      xs: 'size-[22px] p-1',
      sm: 'size-[28px] p-1.5',
      md: 'size-[32px] p-2',
      lg: 'size-[38px] p-2.5',
    }[size];
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#152a55] text-white shrink-0 shadow-2xs',
          bankSizeClasses,
          className,
        )}
      >
        <Landmark className="size-full text-white" />
      </div>
    );
  }

  if (cleanSym.includes('FINNIFTY') || cleanSym.includes('FINANCIAL SERVICES')) {
    const finSizeClasses = {
      xs: 'size-[22px] text-[8.5px]',
      sm: 'size-[28px] text-[10px]',
      md: 'size-[32px] text-[11px]',
      lg: 'size-[38px] text-xs',
    }[size];
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#4318ff] text-white shrink-0 shadow-2xs font-bold font-sans tracking-tight',
          finSizeClasses,
          className,
        )}
      >
        <span className="font-bold leading-none">FIN</span>
      </div>
    );
  }

  if (cleanSym.includes('MIDCPNIFTY') || cleanSym.includes('MIDCAP')) {
    const midSizeClasses = {
      xs: 'size-[22px] text-[9px]',
      sm: 'size-[28px] text-[10.5px]',
      md: 'size-[32px] text-[12px]',
      lg: 'size-[38px] text-sm',
    }[size];
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-zinc-100 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 shrink-0 shadow-2xs font-bold font-sans tracking-tight',
          midSizeClasses,
          className,
        )}
      >
        <span className="font-bold leading-none">MI</span>
      </div>
    );
  }

  if (cleanSym.includes('SENSEX')) {
    const sexSizeClasses = {
      xs: 'size-[22px] text-[9px]',
      sm: 'size-[28px] text-[10.5px]',
      md: 'size-[32px] text-[12px]',
      lg: 'size-[38px] text-sm',
    }[size];
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#0d2346] text-white shrink-0 shadow-2xs font-bold font-sans tracking-tight',
          sexSizeClasses,
          className,
        )}
      >
        <span className="font-bold leading-none">30</span>
      </div>
    );
  }

  // Vodafone Idea: IDEA, IDEA1!, IDEA CELLULAR (Image 7: Red circle with white "VI")
  const isVodafoneIdea =
    cleanSym === 'IDEA' ||
    cleanSym === 'IDEA1!' ||
    cleanSym.startsWith('IDEA ') ||
    cleanSym.startsWith('IDEA-') ||
    cleanSym.includes('VODAFONE') ||
    cleanSym.includes('IDEA CELLULAR') ||
    cleanSym.includes('IDEA_CELLULAR');
  const isNonVodafone =
    cleanSym.includes('FORGE') || cleanSym.includes('TECH') || cleanSym.includes('IDEAL');

  if (isVodafoneIdea && !isNonVodafone) {
    const viSizeClasses = {
      xs: 'size-[22px] text-[9px]',
      sm: 'size-[28px] text-[11px]',
      md: 'size-[32px] text-[13px]',
      lg: 'size-[38px] text-sm',
    }[size];
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#e60000] text-white shrink-0 shadow-2xs font-bold font-sans tracking-tight',
          viSizeClasses,
          className,
        )}
      >
        <span className="font-black tracking-tighter leading-none">VI</span>
      </div>
    );
  }

  // Central Bank of India (Image 6: Direct vector SVG, never fallback to letters)
  if (
    cleanSym === 'CENTRALBK' ||
    cleanSym.includes('CENTRAL BANK') ||
    cleanSym.includes('CENTRALBANK') ||
    cleanSym.includes('CENTRAL BK') ||
    cleanSym.includes('CENTRAL_BANK')
  ) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#F0F3FA] p-0.5 shrink-0 shadow-2xs overflow-hidden border border-zinc-200/80',
          sizeClasses,
          className,
        )}
        title="Central Bank of India"
      >
        <svg viewBox="0 0 56 56" className="size-full">
          <path fill="#F0F3FA" d="M0 0h56v56H0z" />
          <path
            fillRule="evenodd"
            d="M28.2 10H28L15.95 22H10v6l12 12.05V46h6l12.05-12H46v-6L34 15.96V10h-5.8zM28 43.53l10-9.5V28h-1v5.53l-9 9v1zm0-2.85l7-6.65V28h-1v5.53l-6 6v1.15zM28 34l6-6-6-6-6 6v-5.5l6-6v-1.15L21 22v6h1.03L28 34zm-10-6h1v-5.5l9-9v-1.3L18 22v6zm-1.5 0h-1.15L23 35h5v-1h-4.7l-6.8-6zm-3 0h-1l10 10H28v-1h-5l-9.5-9zM28 22h5.2l6.58 6h1.11l-7.59-7H28v1zm0-3h5.3l9.37 9h.97L33.5 18H28v1z"
            fill="#CC103D"
          />
        </svg>
      </div>
    );
  }

  // Indian Overseas Bank (IOB) (Direct vector SVG, never fallback to letters)
  if (
    cleanSym === 'IOB' ||
    cleanSym.includes('INDIAN OVERSEAS') ||
    cleanSym.includes('INDIANOVERSEAS') ||
    cleanSym.includes('INDIAN_OVERSEAS')
  ) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#06329F] p-0.5 shrink-0 shadow-2xs overflow-hidden',
          sizeClasses,
          className,
        )}
        title="Indian Overseas Bank"
      >
        <svg viewBox="0 0 56 56" className="size-full">
          <path d="M0 28a28 28 0 1156 0 28 28 0 01-56 0z" fill="#06329F" />
          <path
            d="M19.3 37.98L11 29.66v-1.42l8.3 8.32 8.2-8.22v1.42l-8.2 8.22zM11 32.67l8.3 8.32 8.2-8.22v-1.42l-8.2 8.22-8.3-8.32v1.42zm0 3L19.3 44l8.2-8.22v-1.42l-8.2 8.22-8.3-8.32v1.42zm25.8 2.31l-8.3-8.32v-1.42l8.3 8.33 8.2-8.22v1.41l-8.2 8.22zm-8.3-5.31l8.3 8.32 8.2-8.22v-1.42l-8.2 8.22-8.3-8.32v1.42zm0 3L36.8 44l8.2-8.22v-1.42l-8.2 8.22-8.3-8.32v1.42zm-2.3-7.48l.7-.7-7.72-7.76-7.6 7.63.7.7 6.9-6.91 7.02 7.04z"
            fill="#fff"
          />
          <path d="M25.4 28.98l-6.22-6.24-6.1 6.12.7.7 5.4-5.4 5.52 5.53.7-.7z" fill="#fff" />
          <path d="M23.9 30.49l-4.72-4.74-4.6 4.61.7.7 3.9-3.9 4.02 4.03.7-.7zm19.86-2.39l.7-.7-7.64-7.67-7.68 7.7.7.71 6.98-7 6.94 6.96z" fill="#fff" />
          <path d="M42.97 28.9l-6.15-6.16-6.18 6.2.7.7 5.48-5.48 5.44 5.45.7-.71z" fill="#fff" />
          <path d="M41.47 30.4l-4.65-4.65-4.68 4.69.71.7 3.97-3.98 3.94 3.95.7-.71zm-6.15-10.64l.71-.7L28 11l-8.03 8.05.7.71L28 12.42l7.32 7.34zm-.79.8L28 14l-6.53 6.55.7.7L28 15.43l5.82 5.83.71-.7zm-1.5 1.5L28 17.02l-5.03 5.04.7.7L28 18.44l4.32 4.34.7-.71z" fill="#fff" />
        </svg>
      </div>
    );
  }

  if (currentSrc && !hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full overflow-hidden shrink-0 bg-white border border-zinc-200/90 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <img
          src={currentSrc}
          alt={cleanSym}
          className="size-full object-cover rounded-full"
          onError={handleImageError}
          loading="eager"
          decoding="async"
        />
      </div>
    );
  }

  if (cleanSym === 'AAPL' || cleanSym.includes('APPLE')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-black text-white shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <svg
          viewBox="0 0 170 170"
          className={size === 'xs' || size === 'sm' ? 'size-2.5 fill-white' : 'size-3.5 fill-white'}
        >
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.77-7.97-12.24-14.67-6.08-9.05-10.83-19.16-14.25-30.33-3.41-11.17-5.12-21.75-5.12-31.74 0-14.07 3.69-25.75 11.07-35.03 7.38-9.28 16.65-14.04 27.81-14.28 4.79 0 10.22 1.25 16.29 3.75 6.07 2.5 9.77 3.75 11.11 3.75 1.56 0 5.56-1.32 12-3.96 6.44-2.64 12.08-3.79 16.92-3.46 12.57 1.05 22.42 5.86 29.56 14.44-11.01 6.64-16.34 15.77-16 27.38.33 9.4 3.99 17.27 10.98 23.6 6.99 6.33 15.11 9.94 24.36 10.83-2.34 7.23-5.28 14.24-8.81 21.03zM119.22 31.95c0-6.72 2.45-13.06 7.35-19.01 4.9-5.96 10.97-9.75 18.21-11.38.22 1.34.33 2.5.33 3.47 0 6.61-2.6 13.04-7.8 19.3-5.2 6.25-11.35 9.98-18.45 11.18-.33-1.12-.5-2.22-.5-3.3z" />
        </svg>
      </div>
    );
  }

  if (cleanSym === 'NVDA' || cleanSym.includes('NVIDIA')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-black text-[#76b900] shrink-0 shadow-2xs p-1.5',
          sizeClasses,
          className,
        )}
      >
        <svg viewBox="0 0 24 24" className="size-full fill-[#76b900]">
          <path d="M7.74 7.64c.54-.34 1.15-.6 1.78-.79V5.1c-.97.23-1.89.62-2.74 1.14l.96 1.4zm0 8.72l-.96 1.4c.85.52 1.77.91 2.74 1.14v-1.75c-.63-.19-1.24-.45-1.78-.79zm7.04-10.84v1.86c2.72.63 4.8 3.07 4.8 5.98 0 2.91-2.08 5.35-4.8 5.98v1.86c3.74-.68 6.55-3.93 6.55-7.84s-2.81-7.16-6.55-7.84zm-3.03 2.11v8.74c1.88-.47 3.29-2.18 3.29-4.37s-1.41-3.9-3.29-4.37z" />
        </svg>
      </div>
    );
  }

  if (cleanSym === 'TSLA' || cleanSym.includes('TESLA')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#e82127] text-white shrink-0 shadow-2xs p-1.5',
          sizeClasses,
          className,
        )}
      >
        <svg viewBox="0 0 100 100" className="size-full fill-white">
          <path d="M50 20c7.8 0 24.3 1.8 32.4 6.8l2.6-7.8C75.2 14.5 59.8 13 50 13c-9.8 0-25.2 1.5-35 6l2.6 7.8c8.1-5 24.6-6.8 32.4-6.8zm0 17.5c11.6 0 24.8 3.5 32 8.7l4.8-13.8C76 26.6 62.8 24 50 24s-26 2.6-36.8 8.4l4.8 13.8c7.2-5.2 20.4-8.7 32-8.7zm-6.2 13h12.4v36.5h-12.4z" />
        </svg>
      </div>
    );
  }

  if (cleanSym === 'MSFT' || cleanSym.includes('MICROSOFT')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-zinc-950 p-1 shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <div className="grid grid-cols-2 gap-0.5 size-full">
          <div className="bg-[#f25022] rounded-[1px]" />
          <div className="bg-[#7fba00] rounded-[1px]" />
          <div className="bg-[#00a4ef] rounded-[1px]" />
          <div className="bg-[#ffb900] rounded-[1px]" />
        </div>
      </div>
    );
  }

  if (cleanSym.startsWith('BTC') || cleanSym.includes('BITCOIN')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#f7931a] text-white font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <span className="font-serif text-sm">₿</span>
      </div>
    );
  }

  if (cleanSym.startsWith('ETH') || cleanSym.includes('ETHEREUM')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#627eea] text-white font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <svg
          viewBox="0 0 784.37 1277.39"
          className={size === 'xs' || size === 'sm' ? 'size-2.5 fill-white' : 'size-4 fill-white'}
        >
          <polygon points="392.07,0 383.5,29.11 383.5,873.74 392.07,882.29 784.13,650.54" />
          <polygon points="392.07,0 0,650.54 392.07,882.29 392.07,472.33" />
          <polygon points="392.07,956.52 387.24,962.41 387.24,1263.28 392.07,1277.38 784.37,724.89" />
          <polygon points="392.07,1277.38 392.07,956.52 0,724.89" />
        </svg>
      </div>
    );
  }

  if (cleanSym.startsWith('SOL')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-tr from-[#9945FF] to-[#14F195] text-white font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <span className="font-mono text-[9px]">◎</span>
      </div>
    );
  }

  if (cleanSym === 'SPY' || cleanSym === 'SPX' || cleanSym === 'INX') {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#1b365d] text-white shrink-0 shadow-2xs p-1 font-bold',
          sizeClasses,
          className,
        )}
      >
        <span className="text-[9px] font-sans tracking-tighter">S&P</span>
      </div>
    );
  }

  if (cleanSym === 'QQQ' || cleanSym === 'NDX') {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#0052cc] text-white shrink-0 shadow-2xs p-1 font-bold',
          sizeClasses,
          className,
        )}
      >
        <span className="text-[9px] font-sans tracking-tighter">100</span>
      </div>
    );
  }

  if (cleanSym.startsWith('EUR')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#003399] text-[#ffcc00] font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <span className="text-[10px] font-sans">€</span>
      </div>
    );
  }

  if (cleanSym.startsWith('GBP')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#c8102e] text-white font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <span className="text-[10px] font-sans">£</span>
      </div>
    );
  }

  if (cleanSym.startsWith('USD') && (cleanSym.includes('JPY') || cleanSym.includes('CHF') || cleanSym.includes('CAD'))) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#0a522c] text-white font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <span className="text-[10px] font-sans">$</span>
      </div>
    );
  }


  // Commodities: Gold
  if (cleanSym.includes('XAU') || cleanSym.includes('GOLD')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 text-white font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
        title="Gold"
      >
        <Globe className={size === 'xs' || size === 'sm' ? 'size-2.5' : 'size-4'} />
      </div>
    );
  }

  // Futures: Micro E-mini / E-mini Nasdaq
  if (cleanSym === 'MNQ' || cleanSym === 'NQ' || cleanSym.includes('NQ')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-zinc-900 text-zinc-100 font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <span className="font-mono text-[9px] font-bold">NQ</span>
      </div>
    );
  }

  // Fallback badge with ticker initials
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-zinc-900 text-white font-bold text-xs uppercase shrink-0 border border-zinc-800 shadow-2xs font-sans tracking-tight',
        sizeClasses,
        className,
      )}
    >
      <span>{cleanSym.slice(0, 2)}</span>
    </div>
  );
  if (cleanSym.startsWith('BTC') || cleanSym.includes('BITCOIN')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#f7931a] text-white font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <span className="font-serif">₿</span>
      </div>
    );
  }

  if (cleanSym.startsWith('ETH') || cleanSym.includes('ETHEREUM')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#627eea] text-white font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <svg
          viewBox="0 0 784.37 1277.39"
          className={size === 'xs' || size === 'sm' ? 'size-2.5 fill-white' : 'size-4 fill-white'}
        >
          <polygon points="392.07,0 383.5,29.11 383.5,873.74 392.07,882.29 784.13,650.54" />
          <polygon points="392.07,0 0,650.54 392.07,882.29 392.07,472.33" />
          <polygon points="392.07,956.52 387.24,962.41 387.24,1263.28 392.07,1277.38 784.37,724.89" />
          <polygon points="392.07,1277.38 392.07,956.52 0,724.89" />
        </svg>
      </div>
    );
  }

  if (cleanSym.startsWith('SOL')) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-tr from-[#9945FF] to-[#14F195] text-white font-bold shrink-0 shadow-2xs',
          sizeClasses,
          className,
        )}
      >
        <span className="font-mono text-[9px]">◎</span>
      </div>
    );
  }

  // Fallback badge with ticker initials
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-zinc-100 text-zinc-800 font-bold uppercase shrink-0 border border-zinc-200/80 shadow-2xs',
        sizeClasses,
        className,
      )}
    >
      <span>{cleanSym.slice(0, 2)}</span>
    </div>
  );
});

export default StockSymbolIcon;
