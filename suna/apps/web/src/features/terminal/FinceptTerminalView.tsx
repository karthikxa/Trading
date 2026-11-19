'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Cpu,
  RefreshCw,
  Search,
  BookOpen,
  Calendar,
  DollarSign,
  ChevronRight,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Database,
  Sliders,
  Send,
  Zap,
} from 'lucide-react';
import TradingViewWidget from '@/features/markets/TradingViewWidget';
import TradingPairIcon from '@/features/journal/TradingPairIcon';
import { cn } from '@kortix/ui';

interface OptionStrike {
  strike: number;
  callOI: number;
  callChangeOI: number;
  callLtp: number;
  callIv: number;
  putLtp: number;
  putIv: number;
  putChangeOI: number;
  putOI: number;
}

export default function FinceptTerminalView() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'markets' | 'research' | 'orders' | 'derivatives' | 'economics' | 'backtest' | 'cli'
  >('dashboard');

  const [symbol, setSymbol] = useState('RELIANCE.NS');
  const [commandInput, setCommandInput] = useState('');
  const [quoteData, setQuoteData] = useState<any>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  // CLI state
  const [cliHistory, setCliHistory] = useState<Array<{ cmd: string; out: string; time: string }>>([
    {
      cmd: 'init',
      out: `Fincept Institutional Terminal v2.4 initialized.
Connected to Python backend engine (yfinance / akshare / FRED / Fincept DataHub).
Type "help" for a list of institutional commands or use the tabs above.`,
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [cliPrompt, setCliPrompt] = useState('');
  const [isCliExecuting, setIsCliExecuting] = useState(false);
  const cliScrollRef = useRef<HTMLDivElement>(null);

  // Order Ticket state
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('limit');
  const [orderQty, setOrderQty] = useState('100');
  const [orderPrice, setOrderPrice] = useState('1375.00');
  const [orderSubmittedAlert, setOrderSubmittedAlert] = useState<string | null>(null);

  // Fetch initial quote
  const fetchQuote = async (sym: string) => {
    setIsLoadingQuote(true);
    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quote', symbol: sym }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuoteData(data);
        if (data.price) {
          setOrderPrice(Number(data.price).toFixed(2));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  useEffect(() => {
    fetchQuote(symbol);
  }, [symbol]);

  // Handle command bar enter
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = commandInput.trim();
    if (!clean) return;

    const parts = clean.split(/\s+/);
    const first = parts[0].toUpperCase();

    if (['DASHBOARD', 'DASH', 'D'].includes(first)) {
      setActiveTab('dashboard');
    } else if (['MARKETS', 'CHART', 'M'].includes(first)) {
      setActiveTab('markets');
    } else if (['RESEARCH', 'FA', 'DES', 'R'].includes(first)) {
      setActiveTab('research');
    } else if (['ORDERS', 'TRADE', 'O', 'EXEC'].includes(first)) {
      setActiveTab('orders');
    } else if (['DERIVATIVES', 'FNO', 'OPT', 'OPTIONS'].includes(first)) {
      setActiveTab('derivatives');
    } else if (['ECONOMICS', 'MACRO', 'ECO', 'FED'].includes(first)) {
      setActiveTab('economics');
    } else if (['BACKTEST', 'QUANT', 'BT'].includes(first)) {
      setActiveTab('backtest');
    } else if (['CLI', 'PYTHON', 'TERMINAL', 'HELP'].includes(first)) {
      setActiveTab('cli');
      if (first === 'HELP') {
        runCliCommand('help');
      }
    } else {
      // Treat as symbol lookup
      setSymbol(clean);
    }

    setCommandInput('');
  };

  // Run CLI prompt
  const runCliCommand = async (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === 'clear') {
      setCliHistory([]);
      setCliPrompt('');
      return;
    }

    setIsCliExecuting(true);
    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cli', command: trimmed }),
      });
      const data = await res.json();
      const output = data.output || JSON.stringify(data, null, 2);

      setCliHistory((prev) => [
        ...prev,
        { cmd: trimmed, out: output, time: new Date().toLocaleTimeString() },
      ]);
    } catch (err: any) {
      setCliHistory((prev) => [
        ...prev,
        { cmd: trimmed, out: `Error: ${err.message}`, time: new Date().toLocaleTimeString() },
      ]);
    } finally {
      setIsCliExecuting(false);
      setCliPrompt('');
      setTimeout(() => {
        if (cliScrollRef.current) {
          cliScrollRef.current.scrollTop = cliScrollRef.current.scrollHeight;
        }
      }, 50);
    }
  };

  // Mock Option Chain data for F&O
  const sampleStrikes: OptionStrike[] = [
    { strike: 1320, callOI: 24500, callChangeOI: 1200, callLtp: 68.5, callIv: 18.2, putLtp: 4.8, putIv: 21.4, putChangeOI: -500, putOI: 41200 },
    { strike: 1340, callOI: 31200, callChangeOI: 2400, callLtp: 51.0, callIv: 17.8, putLtp: 8.2, putIv: 20.1, putChangeOI: 850, putOI: 58900 },
    { strike: 1360, callOI: 62400, callChangeOI: 4500, callLtp: 36.2, callIv: 16.9, putLtp: 14.5, putIv: 19.3, putChangeOI: 3200, putOI: 78100 },
    { strike: 1380, callOI: 98100, callChangeOI: 8200, callLtp: 23.4, callIv: 16.5, putLtp: 24.8, putIv: 18.6, putChangeOI: 2100, putOI: 45300 },
    { strike: 1400, callOI: 142000, callChangeOI: 14300, callLtp: 13.8, callIv: 16.1, putLtp: 39.2, putIv: 18.2, putChangeOI: -1200, putOI: 32100 },
    { strike: 1420, callOI: 89400, callChangeOI: 6100, callLtp: 7.6, callIv: 15.8, putLtp: 57.0, putIv: 17.9, putChangeOI: -800, putOI: 19400 },
    { strike: 1440, callOI: 54100, callChangeOI: 3200, callLtp: 3.9, callIv: 15.5, putLtp: 78.5, putIv: 17.6, putChangeOI: -450, putOI: 12800 },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-background font-sans text-foreground overflow-hidden select-none">
      {/* 1. Fincept Institutional Header Band */}
      <div className="shrink-0 bg-card border-b border-border/80 px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        {/* Left: Terminal Brand & Active Symbol Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-amber-400 dark:bg-zinc-800 border border-zinc-700/60 shadow-2xs font-mono font-bold text-xs">
              FC
            </span>
            <div>
              <div className="flex items-center gap-2 leading-none">
                <span className="font-bold text-sm tracking-tight text-foreground font-sans">
                  FINCEPT TERMINAL
                </span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  LIVE
                </span>
              </div>
              <span className="text-[10.5px] text-muted-foreground font-mono">
                Institutional Quant & Execution Engine
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-border/80 hidden sm:block" />

          {/* Active Ticker Card */}
          <div className="flex items-center gap-2.5 bg-muted/40 rounded-xl px-2.5 py-1 border border-border/60">
            <TradingPairIcon symbol={symbol} size="sm" />
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-foreground font-sans tracking-tight">
                  {quoteData?.symbol || symbol}
                </span>
                <span className="text-[9.5px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground">
                  {quoteData?.exchange_name || 'NSE'}
                </span>
              </div>
              <span className="text-[10.5px] text-muted-foreground truncate max-w-[140px]">
                {quoteData?.name || 'Loading data...'}
              </span>
            </div>

            {quoteData?.price && (
              <div className="ml-2 pl-2 border-l border-border/60 text-right leading-tight">
                <div className="font-semibold text-xs tabular-nums text-foreground font-sans">
                  {quoteData.currency === 'INR' ? '₹' : '$'}
                  {Number(quoteData.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div
                  className={cn(
                    'text-[10px] font-medium tabular-nums flex items-center justify-end gap-0.5',
                    (quoteData.change ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {(quoteData.change ?? 0) >= 0 ? '+' : ''}
                  {Number(quoteData.change ?? 0).toFixed(2)} (
                  {Number(quoteData.change_percent ?? 0).toFixed(2)}%)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Command Prompt Bar */}
        <form
          onSubmit={handleCommandSubmit}
          className="flex-1 max-w-md flex items-center gap-2 bg-muted/60 border border-border/80 rounded-xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-ring focus-within:border-foreground/40 transition-all"
        >
          <span className="text-muted-foreground font-mono text-xs font-bold">&gt;</span>
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Command or Symbol (e.g. RELIANCE, NIFTY 50, AAPL, OPT, MACRO)..."
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-sans"
          />
          <button
            type="submit"
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Execute (Enter)"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </form>

        {/* Right: Quick Refresh & Broker Link */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchQuote(symbol)}
            disabled={isLoadingQuote}
            className="flex items-center gap-1.5 rounded-lg border border-border/80 px-2.5 py-1 text-xs font-medium hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className={cn('size-3', isLoadingQuote && 'animate-spin')} />
            <span>Sync</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px]">Broker Gateway Ready</span>
          </div>
        </div>
      </div>

      {/* 2. Fincept Function Key Tabs Bar */}
      <div className="shrink-0 bg-muted/30 border-b border-border/60 px-4 py-1.5 flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        {[
          { id: 'dashboard', label: 'Dashboard', key: 'F1', icon: Activity },
          { id: 'markets', label: 'Live Chart', key: 'F2', icon: Layers },
          { id: 'research', label: 'Equity Research', key: 'F3', icon: BookOpen },
          { id: 'orders', label: 'Trading & Depth', key: 'F4', icon: Zap },
          { id: 'derivatives', label: 'Derivatives / F&O', key: 'F5', icon: Sliders },
          { id: 'economics', label: 'Macro & Rates', key: 'F6', icon: Calendar },
          { id: 'backtest', label: 'Quant Backtester', key: 'F7', icon: Cpu },
          { id: 'cli', label: 'Terminal CLI', key: 'F8', icon: TerminalIcon },
        ].map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0 cursor-pointer font-sans',
                active
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
              <span
                className={cn(
                  'font-mono text-[9.5px] rounded px-1 py-0.2',
                  active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground/80',
                )}
              >
                {tab.key}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Terminal Workspace Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 lg:p-6 [scrollbar-width:thin] scrollbar-thin">
        {/* ============================================================== */}
        {/* SCREEN 1: DASHBOARD                                            */}
        {/* ============================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            {/* Global Market Ticker Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { sym: 'NIFTY 50', name: 'Nifty 50', price: '23,518.50', chg: '+142.20', pct: '+0.61%', up: true },
                { sym: 'BANKNIFTY', name: 'Bank Nifty', price: '50,380.20', chg: '+380.40', pct: '+0.76%', up: true },
                { sym: 'SENSEX', name: 'BSE Sensex', price: '77,580.10', chg: '+420.15', pct: '+0.54%', up: true },
                { sym: 'SPY', name: 'S&P 500 ETF', price: '598.40', chg: '-3.20', pct: '-0.53%', up: false },
                { sym: 'QQQ', name: 'Nasdaq 100', price: '512.60', chg: '-4.80', pct: '-0.92%', up: false },
                { sym: 'USDINR', name: 'USD / INR', price: '84.42', chg: '+0.04', pct: '+0.05%', up: true },
              ].map((m) => (
                <div
                  key={m.sym}
                  onClick={() => {
                    setSymbol(m.sym);
                    setActiveTab('markets');
                  }}
                  className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs hover:border-border transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                      {m.sym}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-semibold tabular-nums',
                        m.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                      )}
                    >
                      {m.pct}
                    </span>
                  </div>
                  <div className="mt-1 font-semibold text-sm text-foreground tabular-nums">{m.price}</div>
                  <div className="text-[10.5px] text-muted-foreground truncate">{m.name}</div>
                </div>
              ))}
            </div>

            {/* Split Grid: Live Market Movers & Institutional Wire */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left 2 Cols: Real-time Top Gainers & Sector Heat */}
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <Activity className="size-4 text-primary" />
                      <h3 className="font-semibold text-sm text-foreground">Top Institutional Volume Leaders</h3>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">NSE / BSE Real-time</span>
                  </div>

                  <div className="divide-y divide-border/40 mt-1">
                    {[
                      { sym: 'RELIANCE.NS', name: 'Reliance Industries', price: '1,375.60', chg: '+12.60 (+0.92%)', vol: '14.4M', up: true },
                      { sym: 'TCS.NS', name: 'Tata Consultancy Services', price: '4,180.50', chg: '+45.80 (+1.11%)', vol: '3.8M', up: true },
                      { sym: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', price: '1,745.20', chg: '-11.40 (-0.65%)', vol: '22.1M', up: false },
                      { sym: 'INFY.NS', name: 'Infosys Limited', price: '1,890.00', chg: '+24.50 (+1.31%)', vol: '9.5M', up: true },
                      { sym: 'ICICIBANK.NS', name: 'ICICI Bank Ltd', price: '1,280.40', chg: '+14.20 (+1.12%)', vol: '16.7M', up: true },
                      { sym: 'SBIN.NS', name: 'State Bank of India', price: '840.10', chg: '-4.60 (-0.54%)', vol: '18.9M', up: false },
                    ].map((row) => (
                      <div
                        key={row.sym}
                        onClick={() => {
                          setSymbol(row.sym);
                          setActiveTab('markets');
                        }}
                        className="py-2.5 flex items-center justify-between hover:bg-muted/40 px-2 rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <TradingPairIcon symbol={row.sym} size="sm" />
                          <div>
                            <div className="font-medium text-xs text-foreground">{row.sym}</div>
                            <div className="text-[11px] text-muted-foreground">{row.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-xs tabular-nums text-foreground">₹{row.price}</div>
                          <div
                            className={cn(
                              'text-[10.5px] tabular-nums font-medium',
                              row.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                            )}
                          >
                            {row.chg}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Macro Indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'India 10Y Yield', value: '6.82%', sub: '-2 bps' },
                    { label: 'India VIX', value: '14.15', sub: '-4.2% Vol' },
                    { label: 'US 10Y Yield', value: '4.41%', sub: '+3 bps' },
                    { label: 'Brent Crude', value: '$73.20', sub: '+1.1% Bbl' },
                  ].map((stat) => (
                    <div key={stat.label} className="p-3 bg-muted/30 border border-border/70 rounded-xl shadow-2xs">
                      <span className="text-[11px] text-muted-foreground font-medium">{stat.label}</span>
                      <div className="text-base font-bold text-foreground mt-0.5 tabular-nums">{stat.value}</div>
                      <span className="text-[10px] text-muted-foreground font-mono">{stat.sub}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Col: Institutional Wire Feed */}
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-4 text-primary" />
                      <h3 className="font-semibold text-sm text-foreground">Real-time News Wire</h3>
                    </div>
                    <span className="text-[10px] font-mono rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                      FEED ACTIVE
                    </span>
                  </div>

                  <div className="space-y-3 mt-3">
                    {[
                      { time: '15:28', tag: 'RBI', title: 'Reserve Bank of India maintains liquidity stance, keeps repo rate unchanged at 6.50%.' },
                      { time: '15:10', tag: 'TECH', title: 'Reliance Jio announces next-generation enterprise AI data center rollouts across Gujarat.' },
                      { time: '14:45', tag: 'MACRO', title: 'India October CPI inflation prints 6.21%, driven by food price seasonal normalization.' },
                      { time: '13:50', tag: 'EQUITY', title: 'Foreign Portfolio Investors (FPI) net buyers in Indian large-cap financial equities today.' },
                      { time: '12:30', tag: 'ENERGY', title: 'Crude oil stabilizes as OPEC+ hints at potential supply adjustments for Q1 2027.' },
                    ].map((item, i) => (
                      <div key={i} className="text-xs space-y-1 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">{item.time}</span>
                          <span className="text-[9.5px] font-mono px-1 py-0.2 rounded bg-primary/10 text-primary font-semibold">
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-foreground/90 font-sans leading-snug">{item.title}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>Source: Fincept News Wire API</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cli')}
                    className="text-primary hover:underline"
                  >
                    Run news &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 2: MARKETS & CHARTS                                      */}
        {/* ============================================================== */}
        {activeTab === 'markets' && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-foreground font-mono">{symbol}</span>
                  <span className="text-xs text-muted-foreground">Interactive Advanced Candlestick Chart</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {['1D', '5D', '1M', '1Y', '5Y'].map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[600px] w-full">
                <TradingViewWidget
                  scriptUrl="https://s3.tradingview.com/tv.js"
                  config={{
                    autosize: true,
                    symbol: symbol.includes(':') ? symbol : `BSE:${symbol.replace('.NS', '')}`,
                    interval: 'D',
                    timezone: 'Asia/Kolkata',
                    theme: 'light',
                    style: '1',
                    locale: 'en',
                    toolbar_bg: '#f1f3f6',
                    enable_publishing: false,
                    allow_symbol_change: true,
                    container_id: 'fincept_chart_container',
                  }}
                  height={600}
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 3: EQUITY RESEARCH                                      */}
        {/* ============================================================== */}
        {activeTab === 'research' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            {/* Fundamental Summary Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { k: 'Market Cap', v: '₹18.6T' },
                { k: 'P/E Ratio', v: '24.2x' },
                { k: 'P/B Ratio', v: '2.1x' },
                { k: 'EV / EBITDA', v: '12.8x' },
                { k: 'EPS (TTM)', v: '₹56.80' },
                { k: 'Dividend Yield', v: '0.72%' },
                { k: '52W High', v: `₹${quoteData?.fifty_two_week_high ?? '1,611.80'}` },
                { k: '52W Low', v: `₹${quoteData?.fifty_two_week_low ?? '1,152.20'}` },
              ].map((f) => (
                <div key={f.k} className="p-3 bg-card border border-border/80 rounded-xl shadow-2xs">
                  <span className="text-[10.5px] text-muted-foreground font-medium">{f.k}</span>
                  <div className="text-sm font-bold text-foreground mt-0.5 tabular-nums">{f.v}</div>
                </div>
              ))}
            </div>

            {/* Income & Balance Sheet Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
                <h3 className="font-semibold text-sm text-foreground mb-3 pb-2 border-b border-border/60">
                  Financial Performance (TTM)
                </h3>
                <div className="space-y-2.5 text-xs font-sans">
                  {[
                    { label: 'Total Revenue', val: '₹9,84,200 Cr', delta: '+8.4% YoY' },
                    { label: 'EBITDA', val: '₹1,78,400 Cr', delta: '+11.2% YoY' },
                    { label: 'Operating Margin', val: '18.1%', delta: '+45 bps' },
                    { label: 'Net Profit', val: '₹74,250 Cr', delta: '+7.1% YoY' },
                    { label: 'Free Cash Flow', val: '₹41,200 Cr', delta: '+14.6% YoY' },
                    { label: 'Debt to Equity', val: '0.42x', delta: 'Low Leverage' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">{row.label}</span>
                      <div className="text-right">
                        <span className="font-semibold text-foreground mr-2 tabular-nums">{row.val}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {row.delta}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Peer Comparison Table */}
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
                <h3 className="font-semibold text-sm text-foreground mb-3 pb-2 border-b border-border/60">
                  Sector Peer Multiples
                </h3>
                <table className="w-full text-left text-xs font-sans">
                  <thead className="text-[11px] text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="pb-2 font-medium">Company</th>
                      <th className="pb-2 text-right font-medium">P/E</th>
                      <th className="pb-2 text-right font-medium">EV/EBITDA</th>
                      <th className="pb-2 text-right font-medium">ROE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {[
                      { sym: 'RELIANCE', name: 'Reliance Industries', pe: '24.2', ev: '12.8', roe: '9.4%' },
                      { sym: 'TCS', name: 'Tata Consultancy', pe: '29.5', ev: '19.2', roe: '48.1%' },
                      { sym: 'INFY', name: 'Infosys Ltd', pe: '26.8', ev: '17.4', roe: '31.2%' },
                      { sym: 'LT', name: 'Larsen & Toubro', pe: '34.1', ev: '21.5', roe: '15.6%' },
                      { sym: 'ITC', name: 'ITC Limited', pe: '27.4', ev: '18.1', roe: '28.9%' },
                    ].map((peer) => (
                      <tr key={peer.sym} className="hover:bg-muted/30">
                        <td className="py-2">
                          <span className="font-semibold text-foreground">{peer.sym}</span>
                          <span className="text-[10px] text-muted-foreground block">{peer.name}</span>
                        </td>
                        <td className="py-2 text-right tabular-nums text-foreground">{peer.pe}x</td>
                        <td className="py-2 text-right tabular-nums text-foreground">{peer.ev}x</td>
                        <td className="py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          {peer.roe}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 4: TRADING & ORDERS (LEVEL 2 DEPTH)                     */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in-50 duration-200">
            {/* Left 2 Cols: Level 2 Depth Book Ladder */}
            <div className="lg:col-span-2 rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">
                    Level 2 Order Book & Depth Ladder ({symbol})
                  </h3>
                </div>
                <span className="text-xs font-mono text-muted-foreground">Exchange Depth: 5 x 5</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {/* Bids */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pb-1 border-b border-emerald-500/20">
                    <span>Bid Orders</span>
                    <span>Quantity</span>
                    <span>Price</span>
                  </div>
                  <div className="space-y-1.5 mt-2 font-mono text-xs">
                    {[
                      { orders: 42, qty: '12,500', price: '1,375.40' },
                      { orders: 38, qty: '8,400', price: '1,375.20' },
                      { orders: 65, qty: '19,200', price: '1,375.00' },
                      { orders: 21, qty: '5,100', price: '1,374.80' },
                      { orders: 54, qty: '14,800', price: '1,374.50' },
                    ].map((b, idx) => (
                      <div
                        key={idx}
                        className="relative flex justify-between py-1 px-1.5 rounded hover:bg-emerald-500/10 cursor-pointer"
                      >
                        <span className="text-muted-foreground text-[11px]">{b.orders}</span>
                        <span className="text-foreground">{b.qty}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{b.price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Asks */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-rose-600 dark:text-rose-400 pb-1 border-b border-rose-500/20">
                    <span>Price</span>
                    <span>Quantity</span>
                    <span>Ask Orders</span>
                  </div>
                  <div className="space-y-1.5 mt-2 font-mono text-xs">
                    {[
                      { price: '1,375.60', qty: '10,200', orders: 31 },
                      { price: '1,375.80', qty: '15,400', orders: 48 },
                      { price: '1,376.00', qty: '28,900', orders: 84 },
                      { price: '1,376.20', qty: '7,600', orders: 19 },
                      { price: '1,376.50', qty: '18,100', orders: 52 },
                    ].map((a, idx) => (
                      <div
                        key={idx}
                        className="relative flex justify-between py-1 px-1.5 rounded hover:bg-rose-500/10 cursor-pointer"
                      >
                        <span className="font-bold text-rose-600 dark:text-rose-400">₹{a.price}</span>
                        <span className="text-foreground">{a.qty}</span>
                        <span className="text-muted-foreground text-[11px]">{a.orders}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Spread metric */}
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span>Spread: ₹0.20 (0.015%)</span>
                <span>Total Bid Qty: 60,000 | Total Ask Qty: 80,200</span>
              </div>
            </div>

            {/* Right Col: Institutional Order Ticket */}
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground mb-3 pb-2 border-b border-border/60">
                  Execution Ticket
                </h3>

                {orderSubmittedAlert && (
                  <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>{orderSubmittedAlert}</span>
                  </div>
                )}

                {/* Side Toggle */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setOrderSide('buy')}
                    className={cn(
                      'py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                      orderSide === 'buy'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted',
                    )}
                  >
                    BUY (Long)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderSide('sell')}
                    className={cn(
                      'py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                      orderSide === 'sell'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted',
                    )}
                  >
                    SELL (Short)
                  </button>
                </div>

                {/* Type Selection */}
                <div className="flex items-center gap-2 mb-3 text-xs">
                  {(['market', 'limit', 'stop'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOrderType(t)}
                      className={cn(
                        'flex-1 py-1 rounded-lg font-medium capitalize text-center transition-colors',
                        orderType === t ? 'bg-muted text-foreground font-bold' : 'text-muted-foreground hover:bg-muted/50',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Inputs */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-muted-foreground block mb-1">Quantity (Shares)</label>
                    <input
                      type="number"
                      value={orderQty}
                      onChange={(e) => setOrderQty(e.target.value)}
                      className="w-full bg-muted/40 border border-border/80 rounded-xl px-3 py-1.5 text-foreground font-mono font-medium outline-none"
                    />
                  </div>

                  {orderType !== 'market' && (
                    <div>
                      <label className="text-muted-foreground block mb-1">Limit Price (₹)</label>
                      <input
                        type="number"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(e.target.value)}
                        className="w-full bg-muted/40 border border-border/80 rounded-xl px-3 py-1.5 text-foreground font-mono font-medium outline-none"
                      />
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/40 flex justify-between text-xs text-muted-foreground">
                    <span>Order Value:</span>
                    <span className="font-semibold text-foreground font-mono">
                      ₹{(Number(orderQty || 0) * Number(orderPrice || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOrderSubmittedAlert(
                    `Order Submitted: ${orderSide.toUpperCase()} ${orderQty} ${symbol} @ ₹${orderPrice} (Paper Gateway)`,
                  );
                  setTimeout(() => setOrderSubmittedAlert(null), 4000);
                }}
                className={cn(
                  'w-full py-2.5 mt-4 rounded-xl text-xs font-bold text-white transition-all shadow-2xs cursor-pointer',
                  orderSide === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500',
                )}
              >
                Send {orderSide.toUpperCase()} Order
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 5: DERIVATIVES / F&O (OPTIONS CHAIN)                    */}
        {/* ============================================================== */}
        {activeTab === 'derivatives' && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Sliders className="size-4 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">
                    NSE Derivatives Option Chain ({symbol.replace('.NS', '')})
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Expiry:</span>
                  <select className="bg-muted border border-border/80 rounded-lg px-2.5 py-1 text-xs text-foreground font-mono outline-none">
                    <option>26 NOV 2026 (Monthly)</option>
                    <option>03 DEC 2026 (Weekly)</option>
                    <option>10 DEC 2026 (Weekly)</option>
                    <option>31 DEC 2026 (Quarterly)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto mt-3">
                <table className="w-full text-center text-xs font-sans">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/60 text-[11px] font-semibold text-muted-foreground">
                      <th colSpan={4} className="py-2 text-emerald-600 dark:text-emerald-400 border-r border-border/60">
                        CALLS (CE)
                      </th>
                      <th className="py-2 bg-muted/80 text-foreground">STRIKE</th>
                      <th colSpan={4} className="py-2 text-rose-600 dark:text-rose-400 border-l border-border/60">
                        PUTS (PE)
                      </th>
                    </tr>
                    <tr className="border-b border-border/40 text-[10px] font-mono text-muted-foreground">
                      <th className="py-1.5 px-2">OI</th>
                      <th className="py-1.5 px-2">Chg OI</th>
                      <th className="py-1.5 px-2">IV (%)</th>
                      <th className="py-1.5 px-2 border-r border-border/60">LTP (₹)</th>
                      <th className="py-1.5 px-3 bg-muted/60 font-bold text-foreground">Strike Price</th>
                      <th className="py-1.5 px-2 border-l border-border/60">LTP (₹)</th>
                      <th className="py-1.5 px-2">IV (%)</th>
                      <th className="py-1.5 px-2">Chg OI</th>
                      <th className="py-1.5 px-2">OI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 font-mono text-xs">
                    {sampleStrikes.map((s) => {
                      const isAtm = s.strike === 1380;
                      return (
                        <tr
                          key={s.strike}
                          className={cn('hover:bg-muted/30 transition-colors', isAtm && 'bg-amber-500/10 font-bold')}
                        >
                          <td className="py-2 px-2 text-muted-foreground">{s.callOI.toLocaleString()}</td>
                          <td className="py-2 px-2 text-emerald-600 dark:text-emerald-400">+{s.callChangeOI}</td>
                          <td className="py-2 px-2 text-muted-foreground">{s.callIv}%</td>
                          <td className="py-2 px-2 font-bold text-foreground border-r border-border/60">₹{s.callLtp}</td>
                          <td className="py-2 px-3 bg-muted/50 font-bold text-foreground">
                            {s.strike} {isAtm && <span className="text-[9px] text-amber-500 ml-1">ATM</span>}
                          </td>
                          <td className="py-2 px-2 font-bold text-foreground border-l border-border/60">₹{s.putLtp}</td>
                          <td className="py-2 px-2 text-muted-foreground">{s.putIv}%</td>
                          <td className="py-2 px-2 text-rose-600 dark:text-rose-400">{s.putChangeOI}</td>
                          <td className="py-2 px-2 text-muted-foreground">{s.putOI.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* F&O Analytics Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground">Put-Call Ratio (PCR)</span>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">1.18 (Bullish Bias)</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Max Pain Strike</span>
                  <div className="text-sm font-bold text-foreground font-mono mt-0.5">₹1,380.00</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Implied Volatility Rank (IVR)</span>
                  <div className="text-sm font-bold text-foreground font-mono mt-0.5">28.4% (Normal)</div>
                </div>
                <div>
                  <span className="text-muted-foreground">F&O Lot Size</span>
                  <div className="text-sm font-bold text-foreground font-mono mt-0.5">250 Shares</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 6: MACRO & CENTRAL BANK RATES                           */}
        {/* ============================================================== */}
        {activeTab === 'economics' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            {/* Global Central Bank Policy Rates */}
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
              <h3 className="font-semibold text-sm text-foreground mb-3 pb-2 border-b border-border/60">
                Global Central Bank Key Policy Rates
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { cb: 'RBI (India)', rate: '6.50%', stance: 'Neutral', nextDate: 'Dec 06' },
                  { cb: 'US Federal Reserve', rate: '5.25 - 5.50%', stance: 'Easing Mode', nextDate: 'Dec 18' },
                  { cb: 'ECB (Eurozone)', rate: '3.75%', stance: 'Accommodative', nextDate: 'Dec 12' },
                  { cb: 'Bank of England', rate: '5.00%', stance: 'Restricted', nextDate: 'Dec 19' },
                  { cb: 'Bank of Japan', rate: '0.25%', stance: 'Tightening', nextDate: 'Dec 19' },
                  { cb: 'PBOC (China)', rate: '3.10%', stance: 'Stimulus', nextDate: 'Dec 20' },
                ].map((item) => (
                  <div key={item.cb} className="p-3 bg-muted/30 border border-border/70 rounded-xl">
                    <span className="text-[11px] font-medium text-muted-foreground">{item.cb}</span>
                    <div className="text-sm font-bold text-foreground font-mono mt-0.5">{item.rate}</div>
                    <div className="text-[10px] text-primary font-medium mt-1">{item.stance}</div>
                    <span className="text-[9.5px] text-muted-foreground font-mono">Next: {item.nextDate}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Macroeconomic Calendar */}
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
              <h3 className="font-semibold text-sm text-foreground mb-3 pb-2 border-b border-border/60">
                Institutional Macro Calendar
              </h3>
              <div className="divide-y divide-border/30 text-xs font-sans">
                {[
                  { date: 'Nov 22, 17:30', ctry: 'IN', event: 'India Foreign Exchange Reserves (USD)', actual: '$682.1B', prev: '$675.6B', imp: 'Med' },
                  { date: 'Nov 26, 19:00', ctry: 'US', event: 'US FOMC Meeting Minutes Release', actual: '--', prev: '--', imp: 'High' },
                  { date: 'Nov 29, 17:30', ctry: 'IN', event: 'India GDP Annual Growth Rate (Q3)', actual: '6.8% (Est)', prev: '6.7%', imp: 'High' },
                  { date: 'Dec 05, 19:00', ctry: 'US', event: 'US Non Farm Payrolls & Unemployment', actual: '--', prev: '4.1%', imp: 'High' },
                  { date: 'Dec 06, 10:00', ctry: 'IN', event: 'RBI Monetary Policy Committee Decision', actual: '6.50% (Est)', prev: '6.50%', imp: 'High' },
                ].map((cal, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between hover:bg-muted/30 px-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-muted-foreground">{cal.date}</span>
                      <span className="text-xs">{cal.ctry === 'IN' ? '🇮🇳' : '🇺🇸'}</span>
                      <span className="font-medium text-foreground">{cal.event}</span>
                    </div>
                    <div className="flex items-center gap-4 text-right font-mono">
                      <span className="text-muted-foreground text-[11px]">Prev: {cal.prev}</span>
                      <span className="font-bold text-foreground">{cal.actual}</span>
                      <span
                        className={cn(
                          'text-[9.5px] font-sans font-bold px-1.5 py-0.2 rounded',
                          cal.imp === 'High' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-600',
                        )}
                      >
                        {cal.imp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 7: QUANT BACKTESTER                                     */}
        {/* ============================================================== */}
        {activeTab === 'backtest' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Cpu className="size-4 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">Quantitative Strategy Simulation</h3>
                </div>
                <span className="text-xs font-mono text-muted-foreground">Engine: Vectorized NumPy / Pandas</span>
              </div>

              {/* Strategy Parameters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 text-xs font-sans">
                <div>
                  <label className="text-muted-foreground block mb-1">Strategy Model</label>
                  <select className="w-full bg-muted border border-border/80 rounded-xl px-3 py-1.5 text-foreground outline-none font-medium">
                    <option>Dual Moving Average (20/50 SMA)</option>
                    <option>Bollinger Band Volatility Breakout</option>
                    <option>Mean Reversion RSI Extreme</option>
                    <option>Momentum Trend Following (MACD)</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Time Horizon</label>
                  <select className="w-full bg-muted border border-border/80 rounded-xl px-3 py-1.5 text-foreground outline-none font-medium">
                    <option>3 Years (Daily)</option>
                    <option>1 Year (Hourly)</option>
                    <option>5 Years (Daily)</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Initial Capital</label>
                  <input
                    type="text"
                    defaultValue="₹10,00,000"
                    className="w-full bg-muted border border-border/80 rounded-xl px-3 py-1.5 text-foreground font-mono outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    Run Simulation
                  </button>
                </div>
              </div>

              {/* Results Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-3 border-t border-border/40">
                {[
                  { label: 'Total Return', val: '+68.4%', good: true },
                  { label: 'CAGR', val: '19.0%', good: true },
                  { label: 'Sharpe Ratio', val: '1.82', good: true },
                  { label: 'Max Drawdown', val: '-11.2%', good: false },
                  { label: 'Win Rate', val: '64.5%', good: true },
                  { label: 'Profit Factor', val: '2.14', good: true },
                ].map((s) => (
                  <div key={s.label} className="p-2.5 bg-muted/30 border border-border/70 rounded-xl">
                    <span className="text-[10.5px] text-muted-foreground">{s.label}</span>
                    <div
                      className={cn(
                        'text-sm font-bold font-mono mt-0.5',
                        s.good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                      )}
                    >
                      {s.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 8: INTERACTIVE TERMINAL CLI                             */}
        {/* ============================================================== */}
        {activeTab === 'cli' && (
          <div className="h-[620px] rounded-2xl border border-border/80 bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden shadow-2xl font-mono text-xs">
            {/* Terminal Header */}
            <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-rose-500/80" />
                  <span className="size-2.5 rounded-full bg-amber-500/80" />
                  <span className="size-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-bold text-zinc-300 ml-2 text-[11px]">
                  fincept-cli@local:~/fincept-qt/scripts
                </span>
              </div>
              <span className="text-[10px] text-zinc-500">Python 3.12 · UTF-8 · yfinance 1.8.0</span>
            </div>

            {/* Terminal Output Log */}
            <div ref={cliScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 [scrollbar-width:thin]">
              {cliHistory.map((h, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                    <span className="text-emerald-400 font-bold">&gt;</span>
                    <span className="text-zinc-200 font-semibold">{h.cmd}</span>
                    <span className="text-zinc-600 text-[10px] ml-auto">{h.time}</span>
                  </div>
                  <pre className="text-zinc-300 whitespace-pre-wrap font-mono text-[11.5px] bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80 leading-relaxed overflow-x-auto">
                    {h.out}
                  </pre>
                </div>
              ))}

              {isCliExecuting && (
                <div className="flex items-center gap-2 text-amber-400 text-xs">
                  <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Executing Fincept script...</span>
                </div>
              )}
            </div>

            {/* Prompt Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runCliCommand(cliPrompt);
              }}
              className="p-3 bg-zinc-900/90 border-t border-zinc-800 flex items-center gap-2 shrink-0"
            >
              <span className="text-emerald-400 font-bold text-sm select-none">&gt;</span>
              <input
                type="text"
                value={cliPrompt}
                onChange={(e) => setCliPrompt(e.target.value)}
                placeholder="Type command (e.g. quote RELIANCE.NS, info AAPL, financials TCS.NS, help)..."
                className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-600 font-mono text-xs"
                autoFocus
              />
              <button
                type="submit"
                disabled={isCliExecuting || !cliPrompt.trim()}
                className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Send className="size-3" />
                <span>Run</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
