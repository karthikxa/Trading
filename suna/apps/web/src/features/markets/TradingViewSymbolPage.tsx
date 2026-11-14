'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Bell,
  Share2,
  Bookmark,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  Building2,
  Users,
  Globe,
  MapPin,
  Calendar,
  DollarSign,
  BarChart3,
  MessageSquare,
  Newspaper,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@kortix/ui';
import TradingViewWidget from './TradingViewWidget';
import TvLiveChart from './TvLiveChart';
import KortixPinIcon from './KortixPinIcon';
import StockSymbolIcon from './StockSymbolIcon';
import { resolveTradingViewSymbol } from './symbol-resolver';

interface TradingViewSymbolPageProps {
  symbol: string;
  name?: string;
  onSelectPeer?: (symbol: string) => void;
}

const PEERS = [
  { symbol: 'CSCO', name: 'Cisco Systems, Inc.', price: 95.64, change: -6.24 },
  { symbol: 'MSI', name: 'Motorola Solutions, Inc.', price: 531.20, change: 0.15 },
  { symbol: 'GRMN', name: 'Garmin Ltd.', price: 283.03, change: -1.10 },
  { symbol: 'UI', name: 'Ubiquiti Inc.', price: 669.76, change: -1.97 },
  { symbol: 'CIEN', name: 'Ciena Corporation', price: 280.54, change: -4.57 },
  { symbol: 'VSAT', name: 'ViaSat, Inc.', price: 67.72, change: -4.94 },
  { symbol: 'ONDS', name: 'Ondas Inc', price: 5.16, change: -3.01 },
  { symbol: 'DGII', name: 'Digi International Inc.', price: 55.43, change: -5.15 },
  { symbol: 'CALX', name: 'Calix, Inc', price: 32.17, change: -1.56 },
  { symbol: 'ARLO', name: 'Arlo Technologies, Inc.', price: 11.86, change: 0.25 },
  { symbol: 'HLIT', name: 'Harmonic Inc.', price: 10.34, change: -1.24 },
];

const COMMUNITY_MINDS = [
  { author: 'mapricha11', time: '2 days ago', text: 'Bullish continuation pattern setting up near the $355-$358 zone.', likes: 202 },
  { author: 'sunnynirmaan', time: '4 days ago', text: 'Q4 iPhone numbers proved the resilient demand despite supply chain noise.', likes: 49 },
  { author: 'Jshi1211', time: '6 days ago', text: 'Taking partial profits at 360 call wall, watching for pullback entry at 345.', likes: 142 },
  { author: 'moneyflow_trader', time: '2 days ago', text: 'Institutional accumulation confirmed on volume profile.', likes: 141 },
  { author: 'gubye', time: '2 days ago', text: 'Ascending triangle breakout on 4H chart targets 368.', likes: 36 },
  { author: 'NormalFella87', time: '20 hours ago', text: 'Services growth will offset any short-term hardware supply constraint.', likes: 92 },
];

const IDEAS = [
  {
    title: 'Apple hits record high as data center risk spares it, 345 key',
    author: 'inkicho_exness',
    date: 'Nov 12',
    likes: 4,
    summary: 'Apple is trading near 356, at a new all-time high, after bouncing from the ascending channel floor near 325.',
  },
  {
    title: 'One AAPL, Spoils the Whole SPX',
    author: 'DigitalSurfTrading',
    date: 'Nov 8',
    likes: 7,
    summary: 'While NASDAQ:AAPL has performed amazingly well, the strong structure suggests approaching a multi-year descent.',
  },
  {
    title: 'Anatomy of the 200W SMA: The Illusion of a Universal Template',
    author: 'TotoshkaTrades',
    date: '13 hours ago',
    likes: 1,
    summary: 'Global reversals should be sought on the weekly chart where major institutional algorithms anchor.',
  },
  {
    title: 'AAPL GEX – ATH Breakout, 360 Call Wall Confluence in Focus',
    author: 'TanukiTrade',
    date: 'Nov 12',
    likes: 11,
    summary: 'AAPL has broken to a fresh all-time high and is now trading just below 360, the dominant call wall.',
  },
];

const ETFS_HOLDING = [
  { symbol: 'VTI', name: 'Vanguard Morningstar Total Stock Market ETF', weight: '6.63%', value: '154.27 B' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', weight: '7.39%', value: '127.64 B' },
  { symbol: 'IVV', name: 'iShares Core S&P 500 ETF', weight: '7.97%', value: '69.76 B' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF TRUST', weight: '7.91%', value: '63.80 B' },
  { symbol: 'VUG', name: 'Vanguard Morningstar Growth ETF', weight: '12.51%', value: '49.03 B' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust, Series 1', weight: '8.44%', value: '40.19 B' },
  { symbol: 'VGT', name: 'Vanguard Information Tech ETF', weight: '15.92%', value: '28.39 B' },
  { symbol: 'XLK', name: 'State Street Technology Select Sector SPDR ETF', weight: '16.25%', value: '18.98 B' },
];

const FAQS = [
  { q: "What's the stock price today?", a: "Current trading price is live on the interactive TradingView widget above, updated in real time during active exchange sessions." },
  { q: "What is the market capitalization?", a: "Market capitalization stands at approximately $5.18 Trillion USD, making it one of the largest publicly traded companies worldwide." },
  { q: "When is the next earnings release date?", a: "The next quarterly earnings release is scheduled for Nov 4, 2027 with consensus estimates tracked on the earnings widget." },
  { q: "Does the company pay dividends?", a: "Yes, indicated dividend yield is 0.30% with an annualized distribution schedule." },
  { q: "How volatile is this stock?", a: "1-Year Beta is 0.66, indicating moderate volatility relative to the broader S&P 500 market index." },
];

export default function TradingViewSymbolPage({
  symbol: rawSymbol,
  name: initialName,
  onSelectPeer,
}: TradingViewSymbolPageProps) {
  const resolved = resolveTradingViewSymbol(rawSymbol, initialName);
  const cleanSym = resolved.cleanSymbol || 'AAPL';
  const fullSym = resolved.fullSymbol || 'NASDAQ:AAPL';
  const companyTitle =
    (initialName && !initialName.includes(':') ? initialName : null) ||
    (resolved.name && !resolved.name.includes(':') && resolved.name !== cleanSym ? resolved.name : null) ||
    (cleanSym === 'AAPL' ? 'Apple Inc' : cleanSym === 'QQQ' ? 'Invesco QQQ Trust' : cleanSym === 'TSLA' ? 'Tesla, Inc.' : cleanSym === 'NVDA' ? 'NVIDIA Corporation' : cleanSym);

  const [activeSubTab, setActiveSubTab] = useState('Overview');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const SUB_TABS = [
    'Overview',
    'Financials',
    'Filings',
    'News',
    'Community',
    'Technicals',
    'Forecasts',
    'Seasonals',
    'Options',
    'ETFs',
    'Bonds',
  ];

  return (
    <div className="w-full flex-1 flex flex-col gap-6 p-4 sm:p-6 lg:p-8 bg-background text-foreground font-sans overflow-y-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col gap-4 p-5 sm:p-6 bg-card rounded-2xl border border-border/70 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <StockSymbolIcon symbol={cleanSym} size="lg" />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                  {companyTitle}
                </h1>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground uppercase tracking-wide">
                  {cleanSym}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {resolved.exchange}
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-1.5">
                <span className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums text-foreground font-sans">
                  {cleanSym === 'AAPL' ? '$356.27' : cleanSym === 'QQQ' ? '$498.75' : '$235.40'}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">USD</span>
                <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="size-4" />
                  +1.39 (+0.39%)
                </span>
                <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                  At close at 06:29 GMT+5:30
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href={`/projects/b0000000-0000-0000-0000-000000000001?tab=chart`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/50 transition-colors"
            >
              <span>See on Supercharts</span>
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </Link>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Bell className="size-3.5 text-muted-foreground" />
              <span>Set alert</span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <KortixPinIcon className="size-3.5" />
              <span>Pin</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs bar */}
        <div className="flex items-center gap-1 overflow-x-auto pt-3 border-t border-border/50 [scrollbar-width:none]">
          {SUB_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveSubTab(tab)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer font-sans',
                activeSubTab === tab
                  ? 'bg-foreground text-background font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main Interactive Symbol Overview Chart Widget */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground font-sans">
              {companyTitle} ({cleanSym})
            </span>
            <span className="text-xs text-muted-foreground">Live interactive market overview</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">TradingView Supercharts</span>
        </div>
        <div className="overflow-hidden rounded-xl bg-background border border-border/50">
          <TradingViewWidget
            scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js"
            config={{
              symbols: [[`${cleanSym}`, `${fullSym}|1D`]],
              chartOnly: false,
              width: '100%',
              height: 480,
              locale: 'en',
              colorTheme: 'light',
              autosize: false,
              showVolume: true,
              showMA: true,
              hideDateRanges: false,
              hideMarketStatus: false,
              hideSymbolLogo: false,
              scalePosition: 'right',
              scaleMode: 'Normal',
              fontFamily: '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
              fontSize: '10',
              noTimeScale: false,
              valuesTracking: '1',
              changeMode: 'price-and-percent',
              chartType: 'area',
              maLineColor: '#2962FF',
              maLineWidth: 1,
              maLength: 9,
              lineWidth: 2,
              lineType: 0,
              dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M'],
            }}
            height={480}
          />
        </div>
      </div>

      {/* 3. Peers for comparison (Carousel Chips) */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className="text-sm font-semibold text-foreground font-sans">Peers for comparison</h2>
            <p className="text-xs text-muted-foreground font-sans">Select to compare correlated sector equities</p>
          </div>
          <span className="text-xs text-muted-foreground font-sans">{PEERS.length} Peers</span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
          {PEERS.map((peer) => {
            const isPos = peer.change >= 0;
            return (
              <button
                key={peer.symbol}
                type="button"
                onClick={() => onSelectPeer?.(peer.symbol)}
                className="flex flex-col justify-between p-3 min-w-[170px] rounded-xl bg-muted/30 hover:bg-muted/60 border border-border/60 transition-all text-left shadow-2xs cursor-pointer group shrink-0"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-foreground font-sans group-hover:text-primary transition-colors">
                    {peer.symbol}
                  </span>
                  <ArrowUpRight className="size-3 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <p className="text-[11px] text-muted-foreground truncate max-w-[140px] font-sans mt-0.5">
                  {peer.name}
                </p>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-xs font-semibold tabular-nums text-foreground font-sans">
                    ${peer.price.toFixed(2)}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] font-semibold tabular-nums',
                      isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {isPos ? '+' : ''}{peer.change.toFixed(2)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Key facts today */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground font-sans">Key facts today</h2>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Analyze the impact
          </button>
        </div>
        <div className="space-y-3 pt-3.5">
          <div className="flex items-start gap-3">
            <span className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />
            <p className="text-xs sm:text-[13px] leading-relaxed text-foreground font-sans">
              <strong className="font-semibold">{companyTitle} ({cleanSym})</strong> posted fiscal Q4 2026 iPhone revenue of $57.6 billion, up 17% year over year despite supply limits, setting quarterly revenue and upgrade records.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />
            <p className="text-xs sm:text-[13px] leading-relaxed text-foreground font-sans">
              <strong className="font-semibold">{companyTitle} ({cleanSym})</strong> expects fiscal Q1 2027 gross margin of 45%–46%, down from 47.9% in the prior quarter, citing pricier memory and Siri AI costs. Shortages may limit Mac and iPad supply.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />
            <p className="text-xs sm:text-[13px] leading-relaxed text-foreground font-sans">
              <strong className="font-semibold">{companyTitle} ({cleanSym})</strong> expects Services revenue to grow 8%–9% in fiscal Q1 2027, down from 10% last quarter, citing licensing and currency headwinds.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Key stats & Latest earnings grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key stats */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs">
          <h2 className="text-sm font-semibold text-foreground font-sans pb-3 border-b border-border/50">
            Key stats
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            <div>
              <p className="text-xs text-muted-foreground font-sans">Market cap</p>
              <p className="text-base font-bold text-foreground font-sans mt-0.5 tabular-nums">5.18 T USD</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Dividend yield</p>
              <p className="text-base font-bold text-foreground font-sans mt-0.5 tabular-nums">0.30%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">P/E Ratio (TTM)</p>
              <p className="text-base font-bold text-foreground font-sans mt-0.5 tabular-nums">39.54</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Basic EPS (TTM)</p>
              <p className="text-base font-bold text-foreground font-sans mt-0.5 tabular-nums">9.01 USD</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Net income (FY)</p>
              <p className="text-base font-bold text-foreground font-sans mt-0.5 tabular-nums">132.18 B USD</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Revenue (FY)</p>
              <p className="text-base font-bold text-foreground font-sans mt-0.5 tabular-nums">478.83 B USD</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Shares float</p>
              <p className="text-base font-bold text-foreground font-sans mt-0.5 tabular-nums">14.51 B</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Beta (1Y)</p>
              <p className="text-base font-bold text-foreground font-sans mt-0.5 tabular-nums">0.66</p>
            </div>
          </div>
        </div>

        {/* Latest earnings */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <h2 className="text-sm font-semibold text-foreground font-sans">Latest earnings</h2>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Reported Beat
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              <div>
                <p className="text-xs text-muted-foreground font-sans">Report date</p>
                <p className="text-sm font-bold text-foreground font-sans mt-0.5">Nov 3, 2026</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">Period</p>
                <p className="text-sm font-bold text-foreground font-sans mt-0.5">Q4 2026</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">EPS</p>
                <p className="text-sm font-bold text-foreground font-sans mt-0.5 tabular-nums">2.10 USD</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">Revenue</p>
                <p className="text-sm font-bold text-foreground font-sans mt-0.5 tabular-nums">114.48 B USD</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-4 font-sans">
              September-quarter revenue rose 12% to a record $114.5B, while FY revenue and EPS also set records. Memory costs and supply constraints weigh on margins and deliveries; December revenue is forecast to grow 7%–10%.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-4">
            <button
              type="button"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border/80 bg-background hover:bg-muted/40 transition-colors shadow-2xs"
            >
              Earnings call
            </button>
            <button
              type="button"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border/80 bg-background hover:bg-muted/40 transition-colors shadow-2xs"
            >
              Earnings materials
            </button>
          </div>
        </div>
      </div>

      {/* 6. Company Info & Employees */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs">
          <h2 className="text-sm font-semibold text-foreground font-sans pb-3 border-b border-border/50">
            Company info
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs font-sans">
            <div>
              <p className="text-muted-foreground">Sector</p>
              <p className="font-semibold text-foreground mt-0.5">Electronic Technology</p>
            </div>
            <div>
              <p className="text-muted-foreground">Industry</p>
              <p className="font-semibold text-foreground mt-0.5">Telecommunications Equipment</p>
            </div>
            <div>
              <p className="text-muted-foreground">CEO</p>
              <p className="font-semibold text-foreground mt-0.5">John Ternus</p>
            </div>
            <div>
              <p className="text-muted-foreground">Website</p>
              <a href="https://apple.com" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline mt-0.5 inline-flex items-center gap-1">
                apple.com <ExternalLink className="size-3" />
              </a>
            </div>
            <div>
              <p className="text-muted-foreground">Headquarters</p>
              <p className="font-semibold text-foreground mt-0.5">Cupertino, CA</p>
            </div>
            <div>
              <p className="text-muted-foreground">Founded</p>
              <p className="font-semibold text-foreground mt-0.5">1976</p>
            </div>
            <div>
              <p className="text-muted-foreground">IPO date</p>
              <p className="font-semibold text-foreground mt-0.5">Dec 12, 1980</p>
            </div>
            <div>
              <p className="text-muted-foreground">ISIN / CFI</p>
              <p className="font-semibold text-foreground mt-0.5 font-mono">US0378331005</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-4 pt-3 border-t border-border/40 font-sans">
            Apple, Inc engages in the design, manufacture, and sale of smartphones, personal computers, tablets, wearables and accessories, and other variety of related services. It operates through Americas, Europe, Greater China, Japan, and Rest of Asia Pacific segments.
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground font-sans pb-3 border-b border-border/50">
              Employees
            </h2>
            <div className="space-y-4 pt-4 text-xs font-sans">
              <div>
                <p className="text-muted-foreground">Employees (FY)</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-bold text-foreground">167 K</span>
                  <span className="text-emerald-600 font-semibold">+1 K (+0.60%)</span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Revenue / Employee (1Y)</p>
                <p className="text-lg font-bold text-foreground mt-0.5 tabular-nums">2.87 M USD</p>
              </div>
              <div>
                <p className="text-muted-foreground">Net income / Employee (1Y)</p>
                <p className="text-lg font-bold text-foreground mt-0.5 tabular-nums">791.47 K USD</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Technicals & Analyst Consensus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div>
              <h2 className="text-sm font-semibold text-foreground font-sans">Technicals</h2>
              <p className="text-xs text-muted-foreground font-sans">Summary oscillator and trend gauge</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Strong Buy
            </span>
          </div>
          <div className="p-2">
            <TradingViewWidget
              scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"
              config={{
                interval: '1h',
                width: '100%',
                isTransparent: true,
                height: 380,
                symbol: fullSym,
                showIntervalTabs: true,
                displayMode: 'single',
                locale: 'en',
                colorTheme: 'light',
              }}
              height={380}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div>
              <h2 className="text-sm font-semibold text-foreground font-sans">Financial Statements</h2>
              <p className="text-xs text-muted-foreground font-sans">Income statement, balance sheet, and cash flow</p>
            </div>
          </div>
          <div className="p-2">
            <TradingViewWidget
              scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-financials.js"
              config={{
                isTransparent: true,
                largeChartUrl: '',
                displayMode: 'regular',
                width: '100%',
                height: 380,
                colorTheme: 'light',
                symbol: fullSym,
                locale: 'en',
              }}
              height={380}
            />
          </div>
        </div>
      </div>

      {/* 8. Community forum & Top News Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Community forum */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground font-sans">Community forum</h2>
            </div>
            <span className="text-xs font-semibold text-muted-foreground font-sans">Minds</span>
          </div>
          <div className="divide-y divide-border/40 max-h-[380px] overflow-y-auto pt-1 [scrollbar-width:none]">
            {COMMUNITY_MINDS.map((mind, idx) => (
              <div key={idx} className="py-3 flex flex-col gap-1 font-sans">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground font-mono">@{mind.author}</span>
                  <span className="text-muted-foreground text-[11px]">{mind.time}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-normal mt-0.5">
                  {mind.text}
                </p>
                <div className="text-[11px] text-muted-foreground/80 mt-1">
                  ♥ {mind.likes}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ideas stream */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground font-sans">Trading Ideas & Analysis</h2>
            </div>
            <span className="text-xs font-semibold text-muted-foreground font-sans">Editor&apos;s picks</span>
          </div>
          <div className="divide-y divide-border/40 max-h-[380px] overflow-y-auto pt-1 [scrollbar-width:none]">
            {IDEAS.map((idea, idx) => (
              <div key={idx} className="py-3 font-sans">
                <h3 className="text-xs font-bold text-foreground hover:text-primary transition-colors cursor-pointer">
                  {idea.title}
                </h3>
                <p className="text-[11.5px] text-muted-foreground line-clamp-2 mt-1 leading-normal">
                  {idea.summary}
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
                  <span>by {idea.author}</span>
                  <span>{idea.date} · {idea.likes} likes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 9. ETFs Holding the stock */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs">
        <h2 className="text-sm font-semibold text-foreground font-sans pb-3 border-b border-border/50">
          ETFs holding the stock
        </h2>
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs font-sans">
            <thead className="border-b border-border/40 text-muted-foreground font-medium">
              <tr>
                <th className="py-2.5 px-3">Symbol / Name</th>
                <th className="py-2.5 px-3 text-right">Weight</th>
                <th className="py-2.5 px-3 text-right">Market Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {ETFS_HOLDING.map((etf) => (
                <tr key={etf.symbol} className="hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-foreground mr-2 font-mono">{etf.symbol}</span>
                    <span className="text-muted-foreground">{etf.name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-foreground tabular-nums">
                    {etf.weight}
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums">
                    ${etf.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 10. Frequently Asked Questions (Accordion) */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs mb-8">
        <h2 className="text-sm font-semibold text-foreground font-sans pb-3 border-b border-border/50">
          Frequently asked questions
        </h2>
        <div className="divide-y divide-border/40 pt-1">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-3 font-sans">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex items-center justify-between w-full text-left font-medium text-xs sm:text-[13px] text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed pl-2 border-l-2 border-primary/50">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
