'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Pin,
  Home,
  Plus,
  X,
  Search,
  LogOut,
  LineChart,
  CalendarClock,
  Gauge,
  Landmark,
  MoveVertical,
  Star,
  Bell,
  ShieldCheck,
  Menu,
  Bot,
} from 'lucide-react';
import TickerTape from './TickerTape';
import MarketSwitcher from './MarketSwitcher';
import TradingViewWidget from './TradingViewWidget';
import TvScreener from './TvScreener';
import TvEconomicCalendar from './TvEconomicCalendar';
import TvEconomicMap from './TvEconomicMap';
import WatchlistTable from './WatchlistTable';
import AgentView from './AgentView';
import SearchCommand, { openSearch } from './SearchCommand';
import StockSymbolIcon from './StockSymbolIcon';
import { MARKETS } from './markets';
import { getStoredWatchlist, type WatchlistEntry } from './watchlist.store';
import type { MarketId } from './types';
import { cn } from '@kortix/ui';
import './terminal.css';

interface TabItem {
  id: string; // 'overview' | 'watchlist' | 'agent' | 'profile' | 'stock:AAPL'
  type: 'overview' | 'watchlist' | 'agent' | 'profile' | 'stock';
  symbol?: string;
  name?: string;
}

const DEFAULT_TABS: TabItem[] = [
  { id: 'overview', type: 'overview', name: 'Overview' },
  { id: 'watchlist', type: 'watchlist', name: 'Watchlist' },
  { id: 'stock:AAPL', type: 'stock', symbol: 'AAPL', name: 'Apple' },
];

export default function MarketsHub() {
  const [tabs, setTabs] = useState<TabItem[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('overview');
  const [activeMarket, setActiveMarket] = useState<MarketId>('us');
  const [watchlistItems, setWatchlistItems] = useState<WatchlistEntry[]>([]);
  const [selectedWatchlistStock, setSelectedWatchlistStock] = useState<string>('AAPL');
  const [navOpen, setNavOpen] = useState(false);

  // Tab glider measurement
  const tabRefs = useRef(new Map<string, HTMLDivElement>());
  const [glider, setGlider] = useState<{ x: number; w: number } | null>(null);

  // Load watchlist items
  useEffect(() => {
    setWatchlistItems(getStoredWatchlist());
    const onWatchlistChange = () => setWatchlistItems(getStoredWatchlist());
    window.addEventListener('watchlist-updated', onWatchlistChange);
    return () => window.removeEventListener('watchlist-updated', onWatchlistChange);
  }, []);

  // Handle open symbol event (from SearchCommand)
  const openStockTab = (symbolRaw: string, companyName?: string) => {
    const symbol = symbolRaw.replace(/^.*:/, '').toUpperCase().trim();
    const tabId = `stock:${symbol}`;
    setTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) return prev;
      return [...prev, { id: tabId, type: 'stock', symbol, name: companyName || symbol }];
    });
    setActiveTabId(tabId);
  };

  useEffect(() => {
    const onSelect = (e: Event) => {
      const custom = e as CustomEvent<{ symbol: string; name?: string }>;
      if (custom.detail?.symbol) {
        openStockTab(custom.detail.symbol, custom.detail.name);
      }
    };
    window.addEventListener('selected-stock-symbol', onSelect);
    return () => window.removeEventListener('selected-stock-symbol', onSelect);
  }, []);

  // Update tab glider position
  useLayoutEffect(() => {
    const el = tabRefs.current.get(activeTabId);
    if (!el) {
      setGlider(null);
      return;
    }
    setGlider({ x: el.offsetLeft - 11, w: el.offsetWidth + 22 });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTabId, tabs]);

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabId === 'overview' || tabId === 'watchlist') return; // Pinned tabs
    const index = tabs.findIndex((t) => t.id === tabId);
    const nextTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      const fallback = nextTabs[Math.max(0, index - 1)] || nextTabs[0];
      setActiveTabId(fallback ? fallback.id : 'overview');
    }
  };

  const currentMarketObj = MARKETS.find((m) => m.id === activeMarket) || MARKETS[0];
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeStockSymbol = activeTab.type === 'stock' ? activeTab.symbol || 'AAPL' : selectedWatchlistStock;

  // TradingView chart config for current view
  const currentChartSymbol = activeTab.type === 'stock' ? `NASDAQ:${activeStockSymbol}` : `NASDAQ:${selectedWatchlistStock}`;

  return (
    <div className="terminal-shell">
      {/* Mobile Drawer Backdrop */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* ============ LEFT SIDEBAR ============ */}
      <aside
        className={cn(
          'terminal-sidebar max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[260px] max-lg:transition-transform max-lg:duration-200',
          navOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
        )}
      >
        {/* Terminal Brand Logo */}
        <div className="flex items-center gap-2.5 px-2 pt-1 pb-2">
          <Image
            src="/assets/images/logo.png"
            alt="OpenStock"
            width={140}
            height={36}
            priority
            unoptimized
            style={{ width: 'auto', height: 'auto', maxHeight: '34px' }}
          />
        </div>

        {/* Black Search stocks ⌘K button */}
        <button
          type="button"
          onClick={openSearch}
          className="flex h-10 w-full items-center gap-2.5 rounded-xl bg-zinc-950 px-3.5 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-black active:scale-[0.98] cursor-pointer"
        >
          <Search className="size-4 text-white" strokeWidth={2.5} />
          <span className="flex-1 text-left text-white font-semibold">Search stocks</span>
          <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[11px] font-mono font-medium text-white">⌘K</kbd>
        </button>

        {/* Primary Navigation */}
        <nav className="flex flex-col gap-0.5">
          <Link
            href="/projects"
            className="terminal-side-item"
            title="Go to Kortix Workspace"
          >
            <Home /> <span>Home</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setActiveTabId('overview');
              setNavOpen(false);
            }}
            className={cn('terminal-side-item text-left w-full', activeTabId === 'overview' && 'is-active')}
          >
            <LayoutDashboard /> <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTabId('watchlist');
              setNavOpen(false);
            }}
            className={cn('terminal-side-item text-left w-full', activeTabId === 'watchlist' && 'is-active')}
          >
            <Pin className="size-4" />
            <span className="flex-1">Watchlist</span>
            <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-xs font-bold text-zinc-700">
              {watchlistItems.length}
            </span>
          </button>
        </nav>

        {/* Watching Section */}
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
          <p className="terminal-side-label shrink-0">Watching</p>
          {watchlistItems.length === 0 ? (
            <p className="px-2.5 text-[12.5px] text-zinc-400">Pin a stock to track it here.</p>
          ) : (
            <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto [scrollbar-width:none]">
              {watchlistItems.map((item) => {
                const isTabActive = activeTabId === `stock:${item.symbol}`;
                return (
                  <li key={item.symbol}>
                    <button
                      type="button"
                      onClick={() => {
                        openStockTab(item.symbol, item.name);
                        setNavOpen(false);
                      }}
                      className={cn(
                        'terminal-side-item h-8.5 w-full text-left font-medium',
                        isTabActive && 'is-active',
                      )}
                    >
                      <span className="w-16 shrink-0 font-mono text-[12.5px] font-bold text-zinc-900">
                        {item.symbol}
                      </span>
                      <span className="truncate text-[12px] text-zinc-500">{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Profile Card at Bottom with generous padding */}
        <div className="mt-auto flex items-center gap-2.5 border-t border-zinc-200 pt-4 pb-2 px-1">
          <button
            type="button"
            onClick={() => {
              if (!tabs.some((t) => t.id === 'profile')) {
                setTabs((prev) => [...prev, { id: 'profile', type: 'profile', name: 'Profile' }]);
              }
              setActiveTabId('profile');
              setNavOpen(false);
            }}
            className={cn(
              '-m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-zinc-200/50 cursor-pointer text-left',
              activeTabId === 'profile' && 'bg-zinc-200/60 font-semibold',
            )}
          >
            <span className="grid size-8 flex-none place-items-center rounded-full bg-emerald-100 text-[13px] font-bold text-emerald-800">
              T
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-zinc-900">Trader</span>
              <span className="block truncate text-[11.5px] text-zinc-500">trader@openstock.org</span>
            </span>
          </button>
          <Link
            href="/auth"
            className="terminal-chrome-btn"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Link>
        </div>
      </aside>

      {/* ============ MAIN SHELL CONTAINER ============ */}
      <div className="terminal-shell-container">
        <div className="terminal-app">
          {/* ============ TOP BROWSER TABBAR ============ */}
          <header className="terminal-tabbar">
            {/* Mobile menu hamburger button */}
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="terminal-chrome-btn lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </button>

            {/* Tabs container with animated glider */}
            <div className="terminal-tabs pl-2 pr-2">
              <div
                className={cn('terminal-tab-glider', glider && 'is-ready')}
                style={glider ? { transform: `translateX(${glider.x}px)`, width: glider.w } : undefined}
                aria-hidden
              >
                <svg className="terminal-tab-glider-curve is-left" viewBox="0 0 12 12">
                  <path d="M12 0v12H0c6.627 0 12-5.373 12-12z" />
                </svg>
                <div className="terminal-tab-glider-body" />
                <svg className="terminal-tab-glider-curve is-right" viewBox="0 0 12 12">
                  <path d="M12 0v12H0c6.627 0 12-5.373 12-12z" />
                </svg>
              </div>

              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const isPinned = tab.id === 'overview' || tab.id === 'watchlist';
                return (
                  <div
                    key={tab.id}
                    ref={(el) => {
                      if (el) tabRefs.current.set(tab.id, el);
                      else tabRefs.current.delete(tab.id);
                    }}
                    onClick={() => setActiveTabId(tab.id)}
                    className={cn(
                      'terminal-tab',
                      isActive && 'is-active',
                      isPinned && 'pr-4',
                    )}
                  >
                    {/* Tab Icon */}
                    {tab.type === 'overview' && <LayoutDashboard />}
                    {tab.type === 'watchlist' && <Pin className="size-3.5" />}
                    {tab.type === 'agent' && <Bot className="size-3.5" />}
                    {tab.type === 'profile' && <Star className="size-3.5" />}
                    {tab.type === 'stock' && tab.symbol && (
                      <div className="size-4.5 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-zinc-100 border border-zinc-200">
                        <StockSymbolIcon symbol={tab.symbol} size="sm" />
                      </div>
                    )}

                    {/* Tab Label with SVG before stock name and the name */}
                    <span className="terminal-tab-label flex items-center gap-1.5">
                      {tab.type === 'stock' ? (
                        <>
                          <span className="font-semibold text-zinc-900">{tab.symbol}</span>
                          {tab.name && tab.name !== tab.symbol && (
                            <span className="text-zinc-500 text-[11.5px] font-normal truncate max-w-[120px]">
                              {tab.name}
                            </span>
                          )}
                        </>
                      ) : (
                        tab.name
                      )}
                    </span>

                    {/* Tab Close (X) button for open stock tabs */}
                    {!isPinned && (
                      <button
                        type="button"
                        aria-label={`Close ${tab.name}`}
                        className="terminal-tab-close relative z-10"
                        onClick={(e) => closeTab(tab.id, e)}
                      >
                        <X />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Plus (+) Button to search new stock */}
            <button
              type="button"
              onClick={openSearch}
              className="terminal-chrome-btn -ml-1"
              aria-label="Open a stock (⌘K)"
              title="Open a stock (⌘K)"
            >
              <Plus />
            </button>
          </header>

          {/* ============ WORKSPACE ============ */}
          <main className="terminal-workspace">
            <div className="terminal-workspace-inner">
              {/* ───────────────────────────────────────────────────────────── */}
              {/* 1. OVERVIEW VIEW */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab.type === 'overview' && (
                <>
                  {/* Top Ticker Tape */}
                  <TickerTape />

                  {/* Header: Markets */}
                  <header className="terminal-page-head">
                    <div>
                      <h1 className="terminal-page-title">Markets</h1>
                      <p className="terminal-page-sub">
                        {currentMarketObj.name} · open now · realtime data
                      </p>
                    </div>
                  </header>

                  {/* Market Switcher without bullet points */}
                  <MarketSwitcher
                    active={activeMarket}
                    onChange={(m) => setActiveMarket(m)}
                  />

                  {/* ============ INDEX PULSE HATCH SHELL (Exact OpenStock layout) ============ */}
                  <section className="hatch">
                    <div className="hatch-head">
                      <div>
                        <h2 className="hatch-title">Index pulse</h2>
                        <p className="hatch-sub">Tracking ETFs via Finnhub</p>
                      </div>
                      <span className="text-xs text-zinc-400 font-medium">Delayed · refreshed hourly</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-1">
                      {/* S&P 500 (SPY) */}
                      <div
                        onClick={() => openStockTab('AMEX:SPY', 'S&P 500')}
                        className="hatch-card p-4 sm:p-5 flex flex-col justify-between gap-3 min-h-[124px] hover:border-zinc-300 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-zinc-600">
                          <span className="flex items-center justify-center size-7 rounded-full bg-zinc-100 text-zinc-900">
                            <LineChart className="size-4" />
                          </span>
                          <span className="text-zinc-900 font-bold">S&P 500</span>
                          <span className="ml-auto text-xs font-mono font-medium text-zinc-400">SPY</span>
                        </div>
                        <div className="text-[25px] font-bold tracking-tight text-zinc-950 font-mono">
                          $586.42
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className="pulse-pill pulse-pill-up">↗ 0.37%</span>
                          <span className="text-[11.5px]">+2.15 vs prev close</span>
                        </div>
                      </div>

                      {/* Nasdaq 100 (QQQ) */}
                      <div
                        onClick={() => openStockTab('NASDAQ:QQQ', 'Nasdaq 100')}
                        className="hatch-card p-4 sm:p-5 flex flex-col justify-between gap-3 min-h-[124px] hover:border-zinc-300 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-zinc-600">
                          <span className="flex items-center justify-center size-7 rounded-full bg-zinc-100 text-zinc-900">
                            <LineChart className="size-4" />
                          </span>
                          <span className="text-zinc-900 font-bold">Nasdaq 100</span>
                          <span className="ml-auto text-xs font-mono font-medium text-zinc-400">QQQ</span>
                        </div>
                        <div className="text-[25px] font-bold tracking-tight text-zinc-950 font-mono">
                          $498.75
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className="pulse-pill pulse-pill-up">↗ 0.69%</span>
                          <span className="text-[11.5px]">+3.40 vs prev close</span>
                        </div>
                      </div>

                      {/* Dow 30 (DIA) */}
                      <div
                        onClick={() => openStockTab('AMEX:DIA', 'Dow 30')}
                        className="hatch-card p-4 sm:p-5 flex flex-col justify-between gap-3 min-h-[124px] hover:border-zinc-300 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-zinc-600">
                          <span className="flex items-center justify-center size-7 rounded-full bg-zinc-100 text-zinc-900">
                            <LineChart className="size-4" />
                          </span>
                          <span className="text-zinc-900 font-bold">Dow 30</span>
                          <span className="ml-auto text-xs font-mono font-medium text-zinc-400">DIA</span>
                        </div>
                        <div className="text-[25px] font-bold tracking-tight text-zinc-950 font-mono">
                          $422.30
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className="pulse-pill pulse-pill-down">↘ 0.20%</span>
                          <span className="text-[11.5px]">-0.85 vs prev close</span>
                        </div>
                      </div>

                      {/* Russell 2000 (IWM) */}
                      <div
                        onClick={() => openStockTab('AMEX:IWM', 'Russell 2000')}
                        className="hatch-card p-4 sm:p-5 flex flex-col justify-between gap-3 min-h-[124px] hover:border-zinc-300 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-zinc-600">
                          <span className="flex items-center justify-center size-7 rounded-full bg-zinc-100 text-zinc-900">
                            <LineChart className="size-4" />
                          </span>
                          <span className="text-zinc-900 font-bold">Russell 2000</span>
                          <span className="ml-auto text-xs font-mono font-medium text-zinc-400">IWM</span>
                        </div>
                        <div className="text-[25px] font-bold tracking-tight text-zinc-950 font-mono">
                          $221.80
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className="pulse-pill pulse-pill-up">↗ 0.50%</span>
                          <span className="text-[11.5px]">+1.10 vs prev close</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ============ MINI SYMBOL OVERVIEW WIDGETS (Exact OpenStock layout) ============ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <section className="hatch">
                      <div className="hatch-card p-2 sm:p-3 overflow-hidden bg-white">
                        <TradingViewWidget
                          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js"
                          config={{
                            symbol: "AMEX:SPY",
                            width: "100%",
                            height: 220,
                            locale: "en",
                            dateRange: "1M",
                            colorTheme: "light",
                            isTransparent: true,
                            autosize: false,
                            largeChartUrl: "",
                            chartOnly: false,
                            noTimeScale: false,
                          }}
                          height={220}
                        />
                      </div>
                    </section>

                    <section className="hatch">
                      <div className="hatch-card p-2 sm:p-3 overflow-hidden bg-white">
                        <TradingViewWidget
                          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js"
                          config={{
                            symbol: "NASDAQ:QQQ",
                            width: "100%",
                            height: 220,
                            locale: "en",
                            dateRange: "1M",
                            colorTheme: "light",
                            isTransparent: true,
                            autosize: false,
                            largeChartUrl: "",
                            chartOnly: false,
                            noTimeScale: false,
                          }}
                          height={220}
                        />
                      </div>
                    </section>
                  </div>

                  {/* 1. Leaders & Heatmap Split Grid */}
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    <div className="terminal-panel">
                      <div className="terminal-panel-head">
                        <div>
                          <h2 className="terminal-panel-title">Leaders</h2>
                          <p className="terminal-panel-sub">12-month trend by group</p>
                        </div>
                      </div>
                      <div className="p-2 bg-white">
                        <TradingViewWidget
                          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js"
                          config={{
                            colorTheme: 'light',
                            dateRange: '12M',
                            locale: 'en',
                            isTransparent: true,
                            showFloatingTooltip: true,
                            plotLineColorGrowing: '#059669',
                            plotLineColorFalling: '#e11d48',
                            tabs: currentMarketObj.groups.map(({ title, symbols }) => ({
                              title,
                              symbols: symbols.map(([s, d]) => ({ s, d })),
                            })),
                            support_host: 'https://www.tradingview.com',
                            showSymbolLogo: true,
                            showChart: true,
                          }}
                          height={560}
                        />
                      </div>
                    </div>

                    <div className="terminal-panel">
                      <div className="terminal-panel-head">
                        <div>
                          <h2 className="terminal-panel-title">
                            {currentMarketObj.id === 'crypto' ? 'Crypto Heatmap' : 'S&P 500 Heatmap'}
                          </h2>
                          <p className="terminal-panel-sub">Sized by market cap, coloured by today’s move</p>
                        </div>
                      </div>
                      <div className="p-2 bg-white">
                        <TradingViewWidget
                          scriptUrl={`https://s3.tradingview.com/external-embedding/embed-widget-${
                            currentMarketObj.id === 'crypto' ? 'crypto-coins-heatmap.js' : 'stock-heatmap.js'
                          }`}
                          config={{
                            dataSource: currentMarketObj.id === 'crypto' ? 'Crypto' : 'SPX500',
                            blockSize: currentMarketObj.id === 'crypto' ? 'market_cap_calc' : 'market_cap_basic',
                            blockColor: 'change',
                            grouping: 'sector',
                            isTransparent: true,
                            locale: 'en',
                            colorTheme: 'light',
                            hasTopBar: false,
                            isZoomEnabled: true,
                            hasSymbolTooltip: true,
                          }}
                          height={560}
                          allowExpand
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Stock Screener */}
                  <div className="terminal-panel">
                    <div className="terminal-panel-head">
                      <div>
                        <h2 className="terminal-panel-title">Stock Screener</h2>
                        <p className="terminal-panel-sub">Top stocks overview sorted by capitalization</p>
                      </div>
                    </div>
                    <div className="p-2 bg-white">
                      <TvScreener screenerType="stock" columns="overview" screen="most_capitalized" height={540} />
                    </div>
                  </div>

                  {/* 3. Top Stories (replacing Economic Map) & Economic Calendar Grid */}
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="terminal-panel">
                      <div className="terminal-panel-head">
                        <div>
                          <h2 className="terminal-panel-title">Top stories</h2>
                          <p className="terminal-panel-sub">Newest first</p>
                        </div>
                      </div>
                      <div className="p-2 bg-white">
                        <TradingViewWidget
                          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-timeline.js"
                          config={{
                            feedMode: 'all_symbols',
                            isTransparent: true,
                            displayMode: 'regular',
                            width: '100%',
                            height: 520,
                            colorTheme: 'light',
                            locale: 'en',
                          }}
                          height={520}
                        />
                      </div>
                    </div>
                    <div className="terminal-panel">
                      <div className="terminal-panel-head">
                        <div>
                          <h2 className="terminal-panel-title">Economic Calendar</h2>
                          <p className="terminal-panel-sub">Key global economic releases & announcements</p>
                        </div>
                      </div>
                      <div className="p-2 bg-white">
                        <TvEconomicCalendar height={520} />
                      </div>
                    </div>
                  </div>

                  {/* 4. Quotes & Top Stories */}
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <div className="terminal-panel">
                      <div className="terminal-panel-head">
                        <div>
                          <h2 className="terminal-panel-title">Quotes</h2>
                          <p className="terminal-panel-sub">{currentMarketObj.name} leaders by group</p>
                        </div>
                      </div>
                      <div className="p-2 bg-white">
                        <TradingViewWidget
                          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js"
                          config={{
                            locale: 'en',
                            showSymbolLogo: true,
                            colorTheme: 'light',
                            isTransparent: true,
                            symbolsGroups: currentMarketObj.groups.map(({ title, symbols }) => ({
                              name: title,
                              symbols: symbols.map(([name, displayName]) => ({ name, displayName })),
                            })),
                          }}
                          height={540}
                        />
                      </div>
                    </div>

                    <div className="terminal-panel">
                      <div className="terminal-panel-head">
                        <div>
                          <h2 className="terminal-panel-title">Top Stories</h2>
                          <p className="terminal-panel-sub">Curated market-moving news</p>
                        </div>
                      </div>
                      <div className="p-2 bg-white">
                        <TradingViewWidget
                          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-timeline.js"
                          config={{
                            displayMode: 'regular',
                            feedMode: 'market',
                            colorTheme: 'light',
                            isTransparent: true,
                            locale: 'en',
                            market: currentMarketObj.news || 'stock',
                          }}
                          height={540}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* 2. WATCHLIST VIEW */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab.type === 'watchlist' && (
                <>
                  <header className="terminal-page-head">
                    <div>
                      <h1 className="terminal-page-title">Watchlist</h1>
                      <p className="terminal-page-sub">
                        {watchlistItems.length} {watchlistItems.length === 1 ? 'symbol' : 'symbols'} tracked live
                      </p>
                    </div>
                  </header>

                  {/* Watchlist Table */}
                  <WatchlistTable
                    selectedSymbol={selectedWatchlistStock}
                    onSelectSymbol={(sym) => setSelectedWatchlistStock(sym)}
                  />

                  {/* Live Chart for the selected stock below table */}
                  <div className="terminal-panel mt-2">
                    <div className="terminal-panel-head">
                      <div className="flex items-center gap-2">
                        <Pin className="size-4 text-zinc-950 fill-zinc-950" />
                        <h2 className="terminal-panel-title">
                          Live Chart: NASDAQ:{selectedWatchlistStock}
                        </h2>
                      </div>
                    </div>
                    <div className="p-2 bg-white">
                      <TradingViewWidget
                        scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
                        config={{
                          autosize: true,
                          symbol: `NASDAQ:${selectedWatchlistStock}`,
                          interval: 'D',
                          timezone: 'Etc/UTC',
                          theme: 'light',
                          style: '1',
                          locale: 'en',
                          enable_publishing: false,
                          allow_symbol_change: true,
                          support_host: 'https://www.tradingview.com',
                        }}
                        height={520}
                        allowExpand
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* 3. STOCK DETAILS VIEW (Authentic OpenStock Layout) */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab.type === 'stock' && (
                <>
                  <TickerTape />

                  {/* Stock Header & 4 Bento Stats Cards in Hatch Shell */}
                  <section className="hatch">
                    <div className="hatch-card p-5">
                      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                        <div className="flex items-center gap-3">
                          <StockSymbolIcon symbol={activeStockSymbol} size="lg" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">
                                {activeTab.name || activeStockSymbol}
                              </h1>
                              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-mono font-bold text-zinc-700">
                                {activeStockSymbol}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5 font-medium">
                              {activeStockSymbol} · NASDAQ NMS - GLOBAL MARKET · Common Stock
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-2xl font-bold text-zinc-950 font-mono block">
                              {activeStockSymbol === 'TSLA' ? '$399.81' : '$235.40'}
                            </span>
                            <div className="flex items-center justify-end gap-1.5 text-xs">
                              <span className="text-emerald-600 font-bold font-mono">
                                {activeStockSymbol === 'TSLA' ? '+0.87%' : '+0.79%'}
                              </span>
                              <span className="text-zinc-500 font-mono">
                                {activeStockSymbol === 'TSLA' ? '(-$3.49)' : '(+$1.85)'}
                              </span>
                            </div>
                            <span className="text-[11px] text-zinc-400 block mt-0.5">
                              As of Oct 31, 1:30 AM · refreshed hourly
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-900 shadow-2xs hover:bg-zinc-100 transition-colors cursor-pointer"
                            >
                              <Bell className="size-3.5 text-zinc-700" />
                              <span>Set alert</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openStockTab(activeStockSymbol, activeTab.name)}
                              className="flex items-center gap-1.5 rounded-xl bg-black px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-zinc-900 transition-colors cursor-pointer"
                            >
                              <Pin className="size-3.5" />
                              <span>Pin</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 4 Bento stats cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
                        <div className="flex flex-col justify-between gap-2 p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/70">
                          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                            <span className="flex items-center justify-center size-6 rounded-full bg-zinc-200/60 text-zinc-700">
                              <CalendarClock className="size-3.5" />
                            </span>
                            <span>Open</span>
                          </div>
                          <div>
                            <p className="text-[19px] font-bold tracking-tight text-zinc-950 font-mono">
                              {activeStockSymbol === 'TSLA' ? '$393.22' : '$234.10'}
                            </p>
                            <p className="text-[11.5px] text-zinc-400 mt-0.5">First trade of the session</p>
                          </div>
                        </div>

                        <div className="flex flex-col justify-between gap-2 p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/70">
                          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                            <span className="flex items-center justify-center size-6 rounded-full bg-zinc-200/60 text-zinc-700">
                              <MoveVertical className="size-3.5" />
                            </span>
                            <span>Day range</span>
                          </div>
                          <div>
                            <p className="text-[19px] font-bold tracking-tight text-zinc-950 font-mono">
                              {activeStockSymbol === 'TSLA' ? '$387.52 – $404.22' : '$233.50 – $236.20'}
                            </p>
                            <p className="text-[11.5px] text-zinc-400 mt-0.5">Low to high</p>
                          </div>
                        </div>

                        <div className="flex flex-col justify-between gap-2 p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/70">
                          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                            <span className="flex items-center justify-center size-6 rounded-full bg-zinc-200/60 text-zinc-700">
                              <Gauge className="size-3.5" />
                            </span>
                            <span>Prev close</span>
                          </div>
                          <div>
                            <p className="text-[19px] font-bold tracking-tight text-zinc-950 font-mono">
                              {activeStockSymbol === 'TSLA' ? '$403.30' : '$233.55'}
                            </p>
                            <p className="text-[11.5px] text-zinc-400 mt-0.5">Last session</p>
                          </div>
                        </div>

                        <div className="flex flex-col justify-between gap-2 p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/70">
                          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                            <span className="flex items-center justify-center size-6 rounded-full bg-zinc-200/60 text-zinc-700">
                              <Landmark className="size-3.5" />
                            </span>
                            <span>Market cap</span>
                          </div>
                          <div>
                            <p className="text-[19px] font-bold tracking-tight text-zinc-950 font-mono">
                              {activeStockSymbol === 'TSLA' ? '1.58T' : '3.52T'}
                            </p>
                            <p className="text-[11.5px] text-zinc-400 mt-0.5">USD</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Upper Grid: Advanced Chart (Left) + Technicals & Dividend Yield (Right) */}
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] items-stretch w-full">
                    <div className="terminal-panel flex-1">
                      <div className="terminal-panel-head">
                        <div>
                          <h2 className="terminal-panel-title">Chart</h2>
                          <p className="terminal-panel-sub">
                            Live from TradingView · switch interval and style in the chart
                          </p>
                        </div>
                      </div>
                      <div className="p-2 bg-white">
                        <TradingViewWidget
                          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
                          config={{
                            autosize: true,
                            symbol: `NASDAQ:${activeStockSymbol}`,
                            interval: 'D',
                            timezone: 'Etc/UTC',
                            theme: 'light',
                            style: '1',
                            locale: 'en',
                            enable_publishing: false,
                            allow_symbol_change: true,
                            support_host: 'https://www.tradingview.com',
                          }}
                          height={520}
                          allowExpand
                        />
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-col gap-4">
                      <div className="terminal-panel">
                        <div className="terminal-panel-head">
                          <div>
                            <h2 className="terminal-panel-title">Technicals</h2>
                            <p className="terminal-panel-sub">Oscillators and moving averages, 1h</p>
                          </div>
                        </div>
                        <div className="p-2 bg-white">
                          <TradingViewWidget
                            scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"
                            config={{
                              symbol: `NASDAQ:${activeStockSymbol}`,
                              interval: '1h',
                              width: '100%',
                              isTransparent: true,
                              height: 380,
                              showIntervalTabs: true,
                              displayMode: 'single',
                              locale: 'en',
                              colorTheme: 'light',
                            }}
                            height={380}
                          />
                        </div>
                      </div>

                      <div className="terminal-panel p-4">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                          Dividend Yield
                        </h3>
                        <p className="text-2xl font-bold text-zinc-950 font-mono">
                          {activeStockSymbol === 'AAPL' ? '0.51%' : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Top Stories - Full Width below chart */}
                  <div className="terminal-panel">
                    <div className="terminal-panel-head">
                      <div>
                        <h2 className="terminal-panel-title">Top stories</h2>
                        <p className="terminal-panel-sub">Latest {activeStockSymbol} headlines via TradingView</p>
                      </div>
                    </div>
                    <div className="p-2 bg-white">
                      <TradingViewWidget
                        scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-timeline.js"
                        config={{
                          feedMode: 'symbol',
                          symbol: `NASDAQ:${activeStockSymbol}`,
                          market: 'stock',
                          colorTheme: 'light',
                          isTransparent: true,
                          displayMode: 'regular',
                          locale: 'en',
                        }}
                        height={460}
                      />
                    </div>
                  </div>

                  {/* Bottom Grid: Financial Statements & Profile */}
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] items-stretch w-full">
                    <div className="terminal-panel flex-1">
                      <div className="terminal-panel-head">
                        <div>
                          <h2 className="terminal-panel-title">Financials</h2>
                          <p className="terminal-panel-sub">Income statement, balance sheet and ratios</p>
                        </div>
                      </div>
                      <div className="p-2 bg-white">
                        <TradingViewWidget
                          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-financials.js"
                          config={{
                            symbol: `NASDAQ:${activeStockSymbol}`,
                            colorTheme: 'light',
                            isTransparent: true,
                            displayMode: 'regular',
                            width: '100%',
                            height: 520,
                            locale: 'en',
                          }}
                          height={520}
                        />
                      </div>
                    </div>

                    <div className="terminal-panel flex-1">
                      <div className="terminal-panel-head">
                        <div>
                          <h2 className="terminal-panel-title">Profile</h2>
                          <p className="terminal-panel-sub">What the company does</p>
                        </div>
                      </div>
                      <div className="p-2 bg-white">
                        <TradingViewWidget
                          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js"
                          config={{
                            symbol: `NASDAQ:${activeStockSymbol}`,
                            width: '100%',
                            height: 520,
                            colorTheme: 'light',
                            isTransparent: true,
                            locale: 'en',
                          }}
                          height={520}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* 4. AGENT VIEW (WHITE THEME) */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab.type === 'agent' && (
                <div className="h-[calc(100vh-84px)] -m-4 sm:-m-6 flex flex-col">
                  <AgentView />
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* 5. PROFILE VIEW */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab.type === 'profile' && (
                <>
                  <header className="terminal-page-head">
                    <div>
                      <h1 className="terminal-page-title">Profile</h1>
                      <p className="terminal-page-sub">Account settings & watchlist telemetry</p>
                    </div>
                  </header>

                  {/* User Profile Card */}
                  <div className="terminal-panel p-5 bg-white">
                    <div className="flex items-center gap-4">
                      <span className="grid size-14 flex-none place-items-center rounded-full bg-emerald-100 text-[22px] font-bold text-emerald-800">
                        T
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-bold text-zinc-950">Trader</h2>
                        <p className="text-sm text-zinc-500">trader@openstock.org · member since October 2026</p>
                      </div>
                    </div>
                  </div>

                  {/* Profile KPI Cards with generous top and bottom padding */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
                    <div className="p-5 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        <Star className="size-4 text-zinc-400" />
                        <span>Watching</span>
                      </div>
                      <span className="text-3xl font-extrabold text-zinc-950 font-mono">
                        {watchlistItems.length}
                      </span>
                    </div>

                    <div className="p-5 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        <Bell className="size-4 text-zinc-400" />
                        <span>Paused alerts</span>
                      </div>
                      <span className="text-3xl font-extrabold text-zinc-950 font-mono">0</span>
                    </div>

                    <div className="p-5 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        <ShieldCheck className="size-4 text-zinc-400" />
                        <span>Sign-in methods</span>
                      </div>
                      <span className="text-3xl font-extrabold text-zinc-950 font-mono">1</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ============ SEARCH COMMAND MODAL ============ */}
      <SearchCommand
        onSelectSymbol={(sym) => {
          openStockTab(sym);
        }}
      />
    </div>
  );
}
