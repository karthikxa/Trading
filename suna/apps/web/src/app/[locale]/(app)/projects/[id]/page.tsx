'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from '@/i18n/use-translations';
import { ProjectHome } from '@kortix/ui/workspace';
import { useAccountState } from '@kortix/ui/internal/billing/index';
import {
  billingDialogArgs,
  resolveBillingState,
} from '@kortix/ui/internal/lib/billing/billing-gate-state';
import { useProjectSendGate } from '@/hooks/projects/use-project-send-gate';
import { isBillingEnabled } from '@/lib/config';
import { useComposerPrefillStore } from '@kortix/ui/internal/stores/composer-prefill-store';
import { useUpgradeDialogStore } from '@kortix/ui/internal/stores/upgrade-dialog-store';
import { getProjectDetail } from '@kortix/sdk';
import { contract, qk } from '@kortix/sdk/react';
import { useQuery } from '@tanstack/react-query';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  Pin,
  Search,
  Plus,
  X,
  LineChart,
  CalendarClock,
  MoveVertical,
  Gauge,
  Landmark,
  Bell,
} from 'lucide-react';

import MarketSwitcher from '@/features/markets/MarketSwitcher';
import TradingViewWidget from '@/features/markets/TradingViewWidget';
import TvMiniChart from '@/features/markets/TvMiniChart';
import TvScreener from '@/features/markets/TvScreener';
import TvEconomicCalendar from '@/features/markets/TvEconomicCalendar';
import WatchlistTable from '@/features/markets/WatchlistTable';
import TvLiveChart from '@/features/markets/TvLiveChart';
import GodsEyeSpecView from '@/features/spec/GodsEyeSpecView';
import JournalView from '@/features/journal/JournalView';
import SearchCommand, { openSearch } from '@/features/markets/SearchCommand';
import StockSymbolIcon from '@/features/markets/StockSymbolIcon';
import { resolveTradingViewSymbol } from '@/features/markets/symbol-resolver';
import { MARKETS } from '@/features/markets/markets';
import { getStoredWatchlist, type WatchlistEntry } from '@/features/markets/watchlist.store';
import type { MarketId } from '@/features/markets/types';
import { cn } from '@kortix/ui';
import '@/features/markets/terminal.css';
import AgentProfileHub from '@/features/markets/AgentProfileHub';
import BotComputerPanel from '@/features/markets/BotComputerPanel';
import BotEditDrawer from '@/features/markets/BotEditDrawer';
import { BotAvatar } from '@/features/markets/BotAvatar';
import { TAURIC_TRADING_AGENTS, type TradingAgentDef } from '@kortix/ui/workspace/sidebar/trading-agents-nav';

import { promptFromSearchParams } from './prompt-from-search-params';

const FREE_ONBOARDING_UPGRADE_MODAL_KEY = 'kortix:free-onboarding-upgrade-modal-shown';

interface StockTabItem {
  id: string; // 'stock:AAPL'
  symbol: string;
  name: string;
}

export default function ProjectIndexPage() {
  const tI18nComplete = useTranslations('hardcodedUi.i18nComplete');
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Active view management: 'chat' | 'overview' | 'watchlist' | 'spec' | 'stock' | 'agent' | 'journal'
  const queryTab = searchParams.get('tab');
  const [activeView, setActiveView] = useState<'chat' | 'overview' | 'watchlist' | 'spec' | 'stock' | 'agent' | 'journal'>(
    queryTab === 'overview'
      ? 'overview'
      : queryTab === 'watchlist'
        ? 'watchlist'
        : queryTab === 'journal'
          ? 'journal'
          : queryTab === 'spec'
            ? 'spec'
            : queryTab === 'agent'
              ? 'agent'
              : 'chat',
  );

  // Tabs only contain individual stocks
  const [stockTabs, setStockTabs] = useState<StockTabItem[]>([
    { id: 'stock:AAPL', symbol: 'AAPL', name: 'Apple' },
    { id: 'stock:NVDA', symbol: 'NVDA', name: 'NVIDIA' },
  ]);
  const [activeStockTab, setActiveStockTab] = useState<string>('stock:AAPL');

  const [activeMarket, setActiveMarket] = useState<MarketId>('us');
  const [watchlistItems, setWatchlistItems] = useState<WatchlistEntry[]>([]);
  const [selectedWatchlistStock, setSelectedWatchlistStock] = useState<string>('AAPL');
  const [editingAgent, setEditingAgent] = useState<TradingAgentDef | null>(null);
  const [showComputer, setShowComputer] = useState(true);

  // Listen for edit agent drawer trigger
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<TradingAgentDef>;
      if (custom.detail) {
        setEditingAgent(custom.detail);
      }
    };
    window.addEventListener('open-bot-edit-drawer', handler);
    return () => window.removeEventListener('open-bot-edit-drawer', handler);
  }, []);

  // Watchlist updates
  useEffect(() => {
    setWatchlistItems(getStoredWatchlist());
    const onWatchlistChange = () => setWatchlistItems(getStoredWatchlist());
    window.addEventListener('watchlist-updated', onWatchlistChange);
    return () => window.removeEventListener('watchlist-updated', onWatchlistChange);
  }, []);

  // Sync view from search params
  useEffect(() => {
    if (queryTab === 'overview') {
      setActiveView('overview');
    } else if (queryTab === 'watchlist') {
      setActiveView('watchlist');
    } else if (queryTab === 'journal') {
      setActiveView('journal');
    } else if (queryTab === 'spec') {
      setActiveView('spec');
    } else if (queryTab === 'agent') {
      setActiveView('agent');
    } else if (queryTab === 'chat' || (!queryTab && activeView !== 'stock')) {
      setActiveView('chat');
    }
  }, [queryTab]);

  // Open a stock tab
  const openStockTab = (symbolRaw: string, companyName?: string) => {
    const resolved = resolveTradingViewSymbol(symbolRaw, companyName);
    const tabId = `stock:${resolved.fullSymbol}`;
    const name = companyName || resolved.name || resolved.cleanSymbol;
    setStockTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) return prev;
      return [...prev, { id: tabId, symbol: resolved.fullSymbol, name }];
    });
    setActiveStockTab(tabId);
    setActiveView('stock');
  };

  // Close tab
  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStockTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      if (activeStockTab === tabId) {
        if (next.length > 0) {
          setActiveStockTab(next[0].id);
        } else {
          setActiveView('chat');
        }
      }
      return next;
    });
  };

  // Listen to search modal selection
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

  const { data: projectDetail } = useQuery({
    queryKey: qk.project.detail(projectId),
    queryFn: () => getProjectDetail(projectId),
    enabled: !!projectId,
    ...contract('config'),
  });
  const projectAccountId = projectDetail?.project?.account_id ?? undefined;
  const { data: accountState } = useAccountState({ accountId: projectAccountId });
  const openUpgradeDialog = useUpgradeDialogStore((s) => s.openUpgradeDialog);
  const beforeSend = useProjectSendGate(projectId);

  useEffect(() => {
    if (!isBillingEnabled() || !accountState || !projectAccountId) return;
    if (resolveBillingState(accountState) !== 'no_subscription') return;

    const storageKey = `${FREE_ONBOARDING_UPGRADE_MODAL_KEY}:${projectAccountId}`;
    if (window.localStorage.getItem(storageKey) === '1') return;

    window.localStorage.setItem(storageKey, '1');
    openUpgradeDialog(
      billingDialogArgs('no_subscription', accountState, projectAccountId, tI18nComplete),
    );
  }, [accountState, projectAccountId, openUpgradeDialog, tI18nComplete]);

  const seededRef = useRef(false);
  useEffect(() => {
    if (!projectId) return;
    const prompt = seededRef.current ? null : promptFromSearchParams(searchParams);
    if (prompt) {
      seededRef.current = true;
      useComposerPrefillStore.getState().setPrefill(projectId, prompt);
    }
    if (!prompt) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, pathname, projectId, router]);

  const currentMarketObj = MARKETS.find((m) => m.id === activeMarket) || MARKETS[0];
  const currentStockItem =
    stockTabs.find((t) => t.id === activeStockTab) || stockTabs[0] || {
      id: 'stock:NASDAQ:AAPL',
      symbol: 'NASDAQ:AAPL',
      name: 'Apple',
    };
  const resolvedActive = resolveTradingViewSymbol(currentStockItem.symbol, currentStockItem.name);
  const activeStockSymbol = resolvedActive.cleanSymbol;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background font-sans">
      {/* Main Workspace Body */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* ========================================================================= */}
        {/* VIEW 1: KORTIX CHAT COMPOSER WITH PROMPT SUGGESTIONS & ADMIN COMPUTER     */}
        {/* ========================================================================= */}
        {activeView === 'chat' && (() => {
          const selectedAgentId = searchParams.get('agentId');
          const selectedAgent = TAURIC_TRADING_AGENTS.find((a) => a.id === selectedAgentId) || null;
          const isAdminAgent = selectedAgent?.isAdmin || selectedAgent?.id === 'portfolio_manager';

          return (
            <div className="h-full flex flex-row overflow-hidden flex-1 min-h-0">
              {/* Left Column: Chat Area */}
              <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto">
                {selectedAgent && (
                  <div className="px-6 py-3 border-b border-border/80 bg-card/60 flex items-center justify-between shrink-0 select-none">
                    <div className="flex items-center gap-3 min-w-0">
                      <BotAvatar
                        shape={selectedAgent.shape}
                        color={selectedAgent.color}
                        expression={selectedAgent.expression}
                        size={30}
                        isAnimated={true}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground truncate">
                            {selectedAgent.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{selectedAgent.role}</p>
                      </div>
                    </div>

                    {isAdminAgent && (
                      <button
                        type="button"
                        onClick={() => setShowComputer((prev) => !prev)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground shadow-2xs transition-colors cursor-pointer shrink-0"
                      >
                        <span>{showComputer ? 'Hide Computer' : 'Open Computer'}</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="flex-1 flex flex-col justify-center min-h-0">
                  <ProjectHome projectId={projectId} beforeSend={beforeSend} onboarding>
                    {/* Quick suggestion prompt chips below the centered composer */}
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2 pb-6">
                      {[
                        'Analyze Apple (AAPL)',
                        'Analyze Tesla (TSLA)',
                        'Analyze NVIDIA (NVDA)',
                        'Analyze S&P 500 momentum',
                        'Compare Apple vs AMD & Microsoft',
                        'Market breakdown & key technicals',
                      ].map((promptText) => (
                        <button
                          key={promptText}
                          type="button"
                          onClick={() => {
                            useComposerPrefillStore.getState().setPrefill(projectId, promptText);
                          }}
                          className="rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/80 px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer font-sans shadow-2xs"
                        >
                          {promptText}
                        </button>
                      ))}
                    </div>
                  </ProjectHome>
                </div>
              </div>

              {/* Right Column: Docked Bot Computer (For Admin Agent) */}
              {selectedAgent && isAdminAgent && showComputer && (
                <BotComputerPanel
                  adminAgentName={selectedAgent.name}
                  onClose={() => setShowComputer(false)}
                />
              )}
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* VIEW 2: MARKETS OVERVIEW                                                  */}
        {/* ========================================================================= */}
        {activeView === 'overview' && (
          <div className="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
            <header className="terminal-page-head">
              <div>
                <h1 className="terminal-page-title">Markets Overview</h1>
                <p className="terminal-page-sub">
                  {currentMarketObj.name} · open now · realtime data
                </p>
              </div>
            </header>

            <MarketSwitcher active={activeMarket} onChange={(m) => setActiveMarket(m)} />

            {/* Index pulse */}
            <section className="hatch">
              <div className="hatch-head">
                <div>
                  <h2 className="hatch-title">Index pulse</h2>
                  <p className="hatch-sub">Tracking ETFs via Finnhub</p>
                </div>
                <span className="text-xs text-zinc-400 font-medium">Delayed · refreshed hourly</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-1">
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

            {/* Sparklines */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <section className="hatch">
                <div className="hatch-card p-2 sm:p-3 overflow-hidden bg-white">
                  <TradingViewWidget
                    scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js"
                    config={{
                      symbol: 'AMEX:SPY',
                      width: '100%',
                      height: 220,
                      locale: 'en',
                      dateRange: '1M',
                      colorTheme: 'light',
                      isTransparent: true,
                      autosize: false,
                      largeChartUrl: '',
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
                      symbol: 'NASDAQ:QQQ',
                      width: '100%',
                      height: 220,
                      locale: 'en',
                      dateRange: '1M',
                      colorTheme: 'light',
                      isTransparent: true,
                      autosize: false,
                      largeChartUrl: '',
                      chartOnly: false,
                      noTimeScale: false,
                    }}
                    height={220}
                  />
                </div>
              </section>
            </div>

            {/* Leaders & Heatmap */}
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
                      showChart: true,
                      locale: 'en',
                      isTransparent: true,
                      tabs: currentMarketObj.groups.map(({ title, symbols }) => ({
                        title,
                        symbols: symbols.map(([name, displayName]) => ({ s: name, d: displayName })),
                      })),
                    }}
                    height={560}
                  />
                </div>
              </div>

              <div className="terminal-panel">
                <div className="terminal-panel-head">
                  <div>
                    <h2 className="terminal-panel-title">S&P 500 Heatmap</h2>
                    <p className="terminal-panel-sub">Sized by market cap, colored by today's move</p>
                  </div>
                </div>
                <div className="p-2 bg-white">
                  <TradingViewWidget
                    scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js"
                    config={{
                      dataSource: 'SPX500',
                      blockSize: 'market_cap_calc',
                      blockColor: 'change',
                      locale: 'en',
                      colorTheme: 'light',
                      hasTopBar: false,
                      isDataSetEnabled: false,
                      isZoomEnabled: true,
                      hasSymbolTooltip: true,
                      isTransparent: true,
                    }}
                    height={560}
                  />
                </div>
              </div>
            </div>

            {/* Screener */}
            <div className="terminal-panel">
              <div className="terminal-panel-head">
                <div>
                  <h2 className="terminal-panel-title">Stock Screener</h2>
                  <p className="terminal-panel-sub">Top global equities sorted by capitalization</p>
                </div>
              </div>
              <div className="p-2 bg-white">
                <TvScreener screenerType="stock" columns="overview" screen="most_capitalized" height={560} />
              </div>
            </div>

            {/* Top stories (replacing Economic Map) & Economic Calendar */}
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: FULL WATCHLIST VIEW                                                */}
        {/* ========================================================================= */}
        {activeView === 'watchlist' && (
          <div className="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
            <header className="terminal-page-head">
              <div>
                <h1 className="terminal-page-title">Watchlist</h1>
                <p className="terminal-page-sub">
                  {watchlistItems.length} {watchlistItems.length === 1 ? 'symbol' : 'symbols'} tracked live
                </p>
              </div>
            </header>

            <WatchlistTable
              selectedSymbol={selectedWatchlistStock}
              onSelectSymbol={(sym) => {
                setSelectedWatchlistStock(sym);
                openStockTab(sym);
              }}
            />

            {/* Live Chart for selected stock */}
            <div className="terminal-panel mt-2">
              <div className="terminal-panel-head">
                <div className="flex items-center gap-2">
                  <Pin className="size-4 text-zinc-950 fill-zinc-950" />
                  <h2 className="terminal-panel-title">
                    Live Chart: {selectedWatchlistStock}
                  </h2>
                </div>
              </div>
              <div className="p-2 bg-white">
                <TvLiveChart
                  symbol={selectedWatchlistStock}
                  height={560}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW: SPEC (God's Eye View - bilawalsidhu/gods-eye-view)                  */}
        {/* ========================================================================= */}
        {activeView === 'spec' && <GodsEyeSpecView />}

        {/* ========================================================================= */}
        {/* VIEW: JOURNAL                                                             */}
        {/* ========================================================================= */}
        {activeView === 'journal' && <JournalView projectId={projectId} />}

        {/* ========================================================================= */}
        {/* VIEW 4: SINGLE-STOCK RESEARCH TERMINAL                                     */}
        {/* ========================================================================= */}
        {activeView === 'stock' && (
          <div className="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
            {/* Header Shell with tv-mini-chart Web Component replacing static text/mini */}
            <section className="hatch">
              <div className="flex flex-col gap-4 p-4 sm:p-6 bg-white rounded-2xl border border-zinc-200/90 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                  <div className="flex items-center gap-3">
                    <StockSymbolIcon symbol={activeStockSymbol} size="lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">
                          {currentStockItem.name || activeStockSymbol}
                        </h1>
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-mono font-bold text-zinc-700">
                          {activeStockSymbol}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 font-medium">
                        {resolvedActive.cleanSymbol} · {resolvedActive.exchange} · {resolvedActive.assetType.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Live TradingView Mini Chart Web Component (<tv-mini-chart>) */}
                    <TvMiniChart symbol={resolvedActive.fullSymbol} width={340} height={120} />

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
                        onClick={() => openStockTab(activeStockSymbol, currentStockItem.name)}
                        className="flex items-center gap-1.5 rounded-xl bg-black px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-zinc-900 transition-colors cursor-pointer"
                      >
                        <Pin className="size-3.5" />
                        <span>Pin</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4 Bento stats cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
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
                      <span>Market cap / Venue</span>
                    </div>
                    <div>
                      <p className="text-[19px] font-bold tracking-tight text-zinc-950 font-mono">
                        {resolvedActive.exchange}
                      </p>
                      <p className="text-[11.5px] text-zinc-400 mt-0.5">{resolvedActive.assetType.toUpperCase()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Upper Grid: Candlestick Chart + Technical Analysis Gauge */}
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="terminal-panel">
                <div className="terminal-panel-head">
                  <div>
                    <h2 className="terminal-panel-title">Chart ({resolvedActive.fullSymbol})</h2>
                    <p className="terminal-panel-sub">
                      Live from TradingView · switch interval and style in the chart
                    </p>
                  </div>
                </div>
                <div className="p-2 bg-white">
                  <TvLiveChart
                    symbol={resolvedActive.fullSymbol}
                    height={560}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
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
                        interval: '1h',
                        width: '100%',
                        isTransparent: true,
                        height: 380,
                        symbol: resolvedActive.fullSymbol,
                        showIntervalTabs: true,
                        displayMode: 'single',
                        locale: 'en',
                        colorTheme: 'light',
                      }}
                      height={380}
                    />
                  </div>
                </div>

                <div className="terminal-panel p-4 flex flex-col justify-between bg-white">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      {resolvedActive.isCorporateStock ? 'Dividend Yield' : 'Asset Category'}
                    </h3>
                    <p className="text-2xl font-bold font-mono text-zinc-950 mt-1 capitalize">
                      {resolvedActive.isCorporateStock
                        ? (activeStockSymbol === 'AAPL' ? '0.52%' : '—')
                        : resolvedActive.assetType}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    {resolvedActive.isCorporateStock
                      ? 'Annualized payout relative to share price'
                      : `24/7 Tick Stream via ${resolvedActive.exchange}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Middle Row 1: Top stories timeline */}
            <div className="terminal-panel">
              <div className="terminal-panel-head">
                <div>
                  <h2 className="terminal-panel-title">Top Stories</h2>
                  <p className="terminal-panel-sub">Latest {resolvedActive.cleanSymbol} headlines via TradingView</p>
                </div>
              </div>
              <div className="p-2 bg-white">
                <TradingViewWidget
                  scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-timeline.js"
                  config={{
                    feedMode: 'symbol',
                    symbol: resolvedActive.fullSymbol,
                    market: resolvedActive.assetType === 'crypto' ? 'crypto' : resolvedActive.assetType === 'forex' ? 'forex' : 'stock',
                    colorTheme: 'light',
                    isTransparent: true,
                    displayMode: 'regular',
                    width: '100%',
                    height: 480,
                    locale: 'en',
                  }}
                  height={480}
                />
              </div>
            </div>

            {/* Middle Row 2: Comparison Chart (left) & Profile (right) */}
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="terminal-panel">
                <div className="terminal-panel-head">
                  <div>
                    <h2 className="terminal-panel-title">Comparison Overview</h2>
                    <p className="terminal-panel-sub">
                      Performance vs benchmark ({resolvedActive.assetType === 'forex' ? 'GBP/USD' : resolvedActive.assetType === 'crypto' ? 'ETH/USD' : 'S&P 500'}) · percentage scale
                    </p>
                  </div>
                </div>
                <div className="p-2 bg-white">
                  <TradingViewWidget
                    scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js"
                    config={{
                      symbols: [
                        [
                          currentStockItem.name || resolvedActive.cleanSymbol,
                          `${resolvedActive.fullSymbol}|1D`,
                        ],
                      ],
                      chartOnly: true,
                      width: '100%',
                      height: 420,
                      locale: 'en',
                      colorTheme: 'light',
                      autosize: false,
                      showVolume: false,
                      showMA: false,
                      hideDateRanges: false,
                      hideMarketStatus: true,
                      hideSymbolLogo: true,
                      scalePosition: 'right',
                      scaleMode: 'Percentage',
                      fontFamily: '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
                      fontSize: '10',
                      noTimeScale: false,
                      valuesTracking: '1',
                      changeMode: 'price-only',
                      chartType: 'line',
                      maLineColor: '#2962FF',
                      maLineWidth: 1,
                      maLength: 9,
                      lineWidth: 2,
                      lineType: 0,
                      compareSymbol: {
                        symbol:
                          resolvedActive.assetType === 'forex'
                            ? 'FX:GBPUSD'
                            : resolvedActive.assetType === 'crypto'
                            ? 'BINANCE:ETHUSDT'
                            : resolvedActive.cleanSymbol === 'NVDA'
                            ? 'NASDAQ:AAPL'
                            : 'NASDAQ:NVDA',
                        lineColor: 'rgba(41, 98, 255, 1)',
                        lineWidth: 2,
                      },
                      dateRanges: [
                        '1w|15',
                        '1m|60',
                        '3m|60',
                        '12m|1D',
                      ],
                      bottomColor: 'rgba(255, 255, 255, 0)',
                      dateFormat: 'MMM dd, yyyy',
                      timeHoursFormat: '12-hours',
                    }}
                    height={420}
                  />
                </div>
              </div>

              <div className="terminal-panel">
                <div className="terminal-panel-head">
                  <div>
                    <h2 className="terminal-panel-title">Profile</h2>
                    <p className="terminal-panel-sub">
                      {resolvedActive.isCorporateStock
                        ? 'What the company does and stories'
                        : `${resolvedActive.cleanSymbol} asset overview & market specifications`}
                    </p>
                  </div>
                </div>
                <div className="p-2 bg-white">
                  {resolvedActive.isCorporateStock ? (
                    <TradingViewWidget
                      scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js"
                      config={{
                        width: '100%',
                        height: 420,
                        colorTheme: 'light',
                        isTransparent: true,
                        symbol: resolvedActive.fullSymbol,
                        locale: 'en',
                      }}
                      height={420}
                    />
                  ) : (
                    <div className="p-5 space-y-4 font-sans text-xs">
                      <div className="flex justify-between items-center py-2.5 border-b border-zinc-100">
                        <span className="text-zinc-500 font-medium">Exchange Venue</span>
                        <span className="font-bold text-zinc-950 font-mono">{resolvedActive.exchange}</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-zinc-100">
                        <span className="text-zinc-500 font-medium">Asset Class</span>
                        <span className="font-bold text-zinc-950 uppercase">{resolvedActive.assetType}</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-zinc-100">
                        <span className="text-zinc-500 font-medium">Trading Schedule</span>
                        <span className="font-bold text-emerald-600">24/7 Real-Time Active</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-zinc-100">
                        <span className="text-zinc-500 font-medium">Data Stream Latency</span>
                        <span className="font-bold text-emerald-600">0 ms Tick-by-Tick</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-zinc-500 font-medium">Full Ticker Symbol</span>
                        <span className="font-mono font-semibold text-zinc-800">{resolvedActive.fullSymbol}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Grid: Financials (left) & Vertical Multi-Symbol Area Chart (right) */}
            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="terminal-panel">
                <div className="terminal-panel-head">
                  <div>
                    <h2 className="terminal-panel-title">
                      {resolvedActive.isCorporateStock ? 'Financials' : 'Market Specifications'}
                    </h2>
                    <p className="terminal-panel-sub">
                      {resolvedActive.isCorporateStock
                        ? 'Income statement, balance sheet and ratios'
                        : `${resolvedActive.cleanSymbol} contract parameters and liquidity info`}
                    </p>
                  </div>
                </div>
                <div className="p-2 bg-white">
                  {resolvedActive.isCorporateStock ? (
                    <TradingViewWidget
                      scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-financials.js"
                      config={{
                        isTransparent: true,
                        largeChartUrl: '',
                        displayMode: 'regular',
                        width: '100%',
                        height: 520,
                        colorTheme: 'light',
                        symbol: resolvedActive.fullSymbol,
                        locale: 'en',
                      }}
                      height={520}
                    />
                  ) : (
                    <div className="p-6 space-y-5 font-sans">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80">
                          <span className="text-[11px] font-semibold text-zinc-500 uppercase">Contract Base</span>
                          <p className="text-base font-bold text-zinc-950 font-mono mt-1">
                            {resolvedActive.cleanSymbol.slice(0, 3)}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80">
                          <span className="text-[11px] font-semibold text-zinc-500 uppercase">Quote Currency</span>
                          <p className="text-base font-bold text-zinc-950 font-mono mt-1">
                            {resolvedActive.cleanSymbol.slice(3) || 'USD'}
                          </p>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/60">
                        <span className="text-xs font-semibold text-emerald-800">Global Liquidity Feed</span>
                        <p className="text-xs text-emerald-700 mt-1">
                          Direct institutional market quotes streamed continuously from {resolvedActive.exchange}. Multi-timeframe execution analysis available in the Journal.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="terminal-panel">
                <div className="terminal-panel-head">
                  <div>
                    <h2 className="terminal-panel-title">Market Area Comparison</h2>
                    <p className="terminal-panel-sub">Multi-symbol dynamic area chart</p>
                  </div>
                </div>
                <div className="p-2 bg-white flex justify-center">
                  <TradingViewWidget
                    scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js"
                    config={{
                      symbols:
                        resolvedActive.assetType === 'forex'
                          ? [
                              ['EUR/USD', 'FX:EURUSD|1D'],
                              ['GBP/USD', 'FX:GBPUSD|1D'],
                              ['USD/JPY', 'FX:USDJPY|1D'],
                            ]
                          : resolvedActive.assetType === 'crypto'
                          ? [
                              ['BTC/USD', 'BINANCE:BTCUSDT|1D'],
                              ['ETH/USD', 'BINANCE:ETHUSDT|1D'],
                              ['SOL/USD', 'BINANCE:SOLUSDT|1D'],
                            ]
                          : [
                              [
                                currentStockItem.name || resolvedActive.cleanSymbol,
                                `${resolvedActive.fullSymbol}|1D`,
                              ],
                              ['NASDAQ:AMD|1D'],
                              ['NASDAQ:MSFT|1D'],
                            ],
                      chartOnly: true,
                      width: 320,
                      height: 520,
                      locale: 'en',
                      colorTheme: 'light',
                      autosize: false,
                      showVolume: false,
                      showMA: false,
                      hideDateRanges: false,
                      hideMarketStatus: false,
                      hideSymbolLogo: false,
                      scalePosition: 'left',
                      scaleMode: 'Normal',
                      fontFamily: 'Andale Mono, monospace',
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
                      dateRanges: [
                        '1d|5',
                      ],
                      lineColor: 'rgba(41, 98, 255, 1)',
                      topColor: 'rgba(41, 98, 255, 0.24)',
                      bottomColor: 'rgba(209, 212, 220, 0.13)',
                      dateFormat: 'MM/dd/yy',
                      timeHoursFormat: '12-hours',
                    }}
                    height={520}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: TAURICRESEARCH TRADING AGENT PROFILE HUB                          */}
        {/* ========================================================================= */}
        {activeView === 'agent' && (
          <AgentProfileHub
            agentId={searchParams.get('agentId')}
            projectId={projectId}
            onOpenChat={(prompt) => {
              if (prompt) {
                useComposerPrefillStore.getState().setPrefill(projectId, prompt);
              }
              setActiveView('chat');
            }}
          />
        )}
      </div>

      {/* Global Search Dialog Modal (⌘K) */}
      <SearchCommand />

      {/* Right-Side Bot Identity Editor Drawer (Image 1 & 3) */}
      <BotEditDrawer
        isOpen={!!editingAgent}
        agent={editingAgent}
        onClose={() => setEditingAgent(null)}
        onSave={(updated) => {
          setEditingAgent(null);
        }}
      />
    </div>
  );
}
