'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslations } from '@/i18n/use-translations';
import { ProjectHome, SidebarToggle } from '@kortix/ui/workspace';
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
  X,
  LineChart,
  CalendarClock,
  MoveVertical,
  Gauge,
  Landmark,
  Bell,
  ArrowLeft,
} from 'lucide-react';

import MarketSwitcher from '@/features/markets/MarketSwitcher';
import TradingViewWidget from '@/features/markets/TradingViewWidget';
import TvSymbolInfo from '@/features/markets/TvSymbolInfo';
import TvCompanyProfile from '@/features/markets/TvCompanyProfile';
import TvSeasonalChart from '@/features/markets/TvSeasonalChart';
import TvTickers from '@/features/markets/TvTickers';
import TvScreener from '@/features/markets/TvScreener';
import TvEconomicCalendar from '@/features/markets/TvEconomicCalendar';
import WatchlistTable from '@/features/markets/WatchlistTable';
import TvLiveChart from '@/features/markets/TvLiveChart';
import GodsEyeSpecView from '@/features/spec/GodsEyeSpecView';
import JournalView from '@/features/journal/JournalView';
import { getLocalTrades } from '@/features/journal/storage';
import type { JournalTrade } from '@/features/journal/types';
import SearchCommand, { openSearch, SearchButton } from '@/features/markets/SearchCommand';
import StockSymbolIcon from '@/features/markets/StockSymbolIcon';
import { resolveTradingViewSymbol } from '@/features/markets/symbol-resolver';
import TradingViewSymbolPage from '@/features/markets/TradingViewSymbolPage';
import { WallpaperBackground } from '@/components/ui/wallpaper-background';
import { MARKETS } from '@/features/markets/markets';
import { getStoredWatchlist, type WatchlistEntry } from '@/features/markets/watchlist.store';
import type { MarketId } from '@/features/markets/types';
import {
  cn,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@kortix/ui';
import Hint from '@kortix/ui/hint';
import {
  Monitor,
  CaretDown,
  Plus,
  DotsThreeVertical,
  Users,
  Wallet,
  TrendUp,
  ChartLineUp,
  BookOpen,
  Target,
  MagnifyingGlass,
  PushPin,
} from '@phosphor-icons/react';
import KortixPinIcon from '@/features/markets/KortixPinIcon';
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import '@/features/markets/terminal.css';
import BotComputerPanel from '@/features/markets/BotComputerPanel';
import BotEditDrawer from '@/features/markets/BotEditDrawer';
import { BotAvatar } from '@/features/markets/BotAvatar';
import { useTradingAgents, type TradingAgentDef } from '@kortix/ui/workspace/sidebar/trading-agents-nav';

import { promptFromSearchParams } from './prompt-from-search-params';

const FREE_ONBOARDING_UPGRADE_MODAL_KEY = 'kortix:free-onboarding-upgrade-modal-shown';

interface StockTabItem {
  id: string; // 'stock:AAPL'
  symbol: string;
  name: string;
}

export const CANONICAL_TRADING_PROJECT_ID = 'b0000000-0000-0000-0000-000000000001';

const DEFAULT_PORTFOLIO_MANAGER: TradingAgentDef = {
  id: 'portfolio_manager',
  name: 'Chief of Staff',
  role: 'Capital Allocation & Swarm Lead',
  group: 'Management',
  shape: 'circle',
  color: '#8B5CF6',
  expression: 'attentive',
  description: 'Lead Portfolio Manager and Workspace Administrator. Synthesizes swarm intelligence and directs execution.',
  isAdmin: true,
};

export default function ProjectIndexPage() {
  const tI18nComplete = useTranslations('hardcodedUi.i18nComplete');
  const { id: rawProjectId } = useParams<{ id: string }>();
  const projectId = rawProjectId === 'proj-trading' ? CANONICAL_TRADING_PROJECT_ID : rawProjectId;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Cleanly replace URL if visiting via legacy slug
  useEffect(() => {
    if (rawProjectId === 'proj-trading') {
      const q = searchParams.toString();
      router.replace(`/projects/${CANONICAL_TRADING_PROJECT_ID}${q ? `?${q}` : ''}`);
    }
  }, [rawProjectId, searchParams, router]);

  // Active view management: 'chat' | 'overview' | 'watchlist' | 'spec' | 'stock' | 'agent' | 'journal' | 'chart'
  const queryTab = searchParams.get('tab');
  const [activeView, setActiveView] = useState<'chat' | 'overview' | 'watchlist' | 'spec' | 'stock' | 'agent' | 'journal' | 'chart'>(
    queryTab === 'overview'
      ? 'overview'
      : queryTab === 'watchlist'
        ? 'watchlist'
        : queryTab === 'journal'
          ? 'journal'
          : queryTab === 'spec'
            ? 'spec'
            : queryTab === 'chart'
              ? 'chart'
              : 'chat',
  );

  const [tradingGoal, setTradingGoal] = useState<{ targetAmount: number; targetDate: string }>({
    targetAmount: 125000,
    targetDate: '2026-12-31',
  });

  useEffect(() => {
    const loadGoal = () => {
      try {
        const saved = localStorage.getItem('kortix_trading_goal_v1');
        if (saved) {
          setTradingGoal(JSON.parse(saved));
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadGoal();
    window.addEventListener('trading-goal-updated', loadGoal);
    return () => window.removeEventListener('trading-goal-updated', loadGoal);
  }, []);

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
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupAgentIds, setNewGroupAgentIds] = useState<string[]>([]);

  const handleOpenCreateAgent = () => {
    const newAgent: TradingAgentDef = {
      id: `agent-custom-${Date.now()}`,
      name: 'Custom Agent',
      role: 'Trading Specialist',
      group: 'Analysts',
      shape: 'circle',
      color: '#10B981',
      expression: 'attentive',
      status: 'idle',
      description: 'Custom AI trading agent identity',
      timeText: 'Just now',
      chatPreview: 'Ready for market analysis',
      lastAction: 'Ready for market analysis',
      time: 'Just now',
    };
    setEditingAgent(newAgent);
  };

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

  // Browser Back/Forward navigation listener to properly redirect to the previous page
  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      const tab = url.searchParams.get('tab');
      if (tab === 'overview') {
        setActiveView('overview');
      } else if (tab === 'watchlist') {
        setActiveView('watchlist');
      } else if (tab === 'journal') {
        setActiveView('journal');
      } else if (tab === 'spec') {
        setActiveView('spec');
      } else if (tab === 'chart') {
        const symbol = url.searchParams.get('symbol');
        if (symbol) {
          setSelectedWatchlistStock(symbol);
        }
        setActiveView('chart');
      } else if (tab === 'stock') {
        const symbol = url.searchParams.get('symbol');
        if (symbol) {
          const tabId = `stock:${symbol}`;
          setStockTabs((prev) => {
            if (prev.some((t) => t.id === tabId)) return prev;
            return [...prev, { id: tabId, symbol, name: symbol }];
          });
          setActiveStockTab(tabId);
        }
        setActiveView('stock');
      } else {
        setActiveView('chat');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
    } else if (queryTab === 'chart') {
      const symbol = searchParams.get('symbol');
      if (symbol) {
        setSelectedWatchlistStock(symbol);
      }
      setActiveView('chart');
    } else if (queryTab === 'stock') {
      const symbol = searchParams.get('symbol');
      if (symbol) {
        const tabId = `stock:${symbol}`;
        setStockTabs((prev) => {
          if (prev.some((t) => t.id === tabId)) return prev;
          return [...prev, { id: tabId, symbol, name: symbol }];
        });
        setActiveStockTab(tabId);
      }
      setActiveView('stock');
    } else {
      setActiveView('chat');
    }
  }, [queryTab, searchParams]);

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
    router.push(`/projects/${projectId}?tab=stock&symbol=${resolved.fullSymbol}`);
  };

  // Close tab
  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStockTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      if (activeStockTab === tabId) {
        if (next.length > 0) {
          setActiveStockTab(next[0].id);
          router.push(`/projects/${projectId}?tab=stock&symbol=${next[0].symbol}`);
        } else {
          setActiveView('chat');
          router.push(`/projects/${projectId}`);
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
  const { data: tradingAgents = [] } = useTradingAgents();

  const [journalTrades, setJournalTrades] = useState<JournalTrade[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return getLocalTrades();
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    setJournalTrades(getLocalTrades());
    const onJournalUpdate = () => {
      setJournalTrades(getLocalTrades());
    };
    window.addEventListener('trading-journal-updated', onJournalUpdate);
    return () => window.removeEventListener('trading-journal-updated', onJournalUpdate);
  }, []);

  const [startingCapital, setStartingCapital] = useState<number>(() => {
    if (typeof window === 'undefined') return 100000;
    try {
      const saved = window.localStorage.getItem('kortix_trading_starting_capital');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch {}
    return 100000;
  });

  useEffect(() => {
    const handleGoalUpdate = () => {
      try {
        const savedCapital = window.localStorage.getItem('kortix_trading_starting_capital');
        if (savedCapital) {
          const val = parseFloat(savedCapital);
          if (!isNaN(val) && val > 0) setStartingCapital(val);
        }
      } catch {}
    };
    window.addEventListener('trading-goal-updated', handleGoalUpdate);
    window.addEventListener('storage', handleGoalUpdate);
    return () => {
      window.removeEventListener('trading-goal-updated', handleGoalUpdate);
      window.removeEventListener('storage', handleGoalUpdate);
    };
  }, []);

  const totalJournalTrades = journalTrades.length;
  const winJournalTrades = journalTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const lossJournalTrades = journalTrades.filter((t) => (t.pnl ?? 0) < 0).length;
  const winRateJournal = totalJournalTrades > 0 ? ((winJournalTrades / totalJournalTrades) * 100).toFixed(1) : '0.0';
  const totalJournalPnl = journalTrades.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
  const totalAccountMoney = startingCapital + totalJournalPnl;
  const pnlPercent = ((totalJournalPnl / (startingCapital || 1)) * 100).toFixed(2);

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

  const marketTickers = useMemo(() => {
    if (resolvedActive.assetType === 'crypto') {
      return [
        resolvedActive.fullSymbol,
        'BINANCE:BTCUSDT',
        'BINANCE:ETHUSDT',
        'BINANCE:SOLUSDT',
        'BINANCE:BNBUSDT',
        'BINANCE:XRPUSDT',
        'BINANCE:DOGEUSDT',
        'BINANCE:ADAUSDT',
        'BINANCE:AVAXUSDT',
        'BINANCE:LINKUSDT',
        'BINANCE:SUIUSDT',
        'BITSTAMP:BTCUSD',
        'BITSTAMP:ETHUSD',
      ]
        .filter((sym, idx, arr) => arr.indexOf(sym) === idx)
        .join(',');
    }

    if (resolvedActive.assetType === 'forex') {
      return [
        resolvedActive.fullSymbol,
        'FX:EURUSD',
        'FX:GBPUSD',
        'FX:USDJPY',
        'FX:AUDUSD',
        'FX:USDCAD',
        'FX:USDCHF',
        'FX:NZDUSD',
        'FX:EURGBP',
        'FX:EURJPY',
        'FOREXCOM:SPXUSD',
      ]
        .filter((sym, idx, arr) => arr.indexOf(sym) === idx)
        .join(',');
    }

    return [
      resolvedActive.fullSymbol,
      'FOREXCOM:SPXUSD',
      'FOREXCOM:NSXUSD',
      'NASDAQ:AAPL',
      'NASDAQ:NVDA',
      'NASDAQ:MSFT',
      'NASDAQ:TSLA',
      'NASDAQ:AMZN',
      'NASDAQ:GOOGL',
      'NASDAQ:META',
      'NYSE:JPM',
    ]
      .filter((sym, idx, arr) => arr.indexOf(sym) === idx)
      .join(',');
  }, [resolvedActive.assetType, resolvedActive.fullSymbol]);

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden bg-background font-sans">
      {/* Main Workspace Body */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* ========================================================================= */}
        {/* VIEW 1: KORTIX CHAT COMPOSER WITH PROMPT SUGGESTIONS & ADMIN COMPUTER     */}
        {/* ========================================================================= */}
        {activeView === 'chat' && (() => {
          const selectedAgentId = searchParams.get('agentId');
          const selectedAgent =
            tradingAgents.find((a) => a.id === selectedAgentId) || tradingAgents[0] || DEFAULT_PORTFOLIO_MANAGER;

          return (
            <div className="h-full flex flex-row overflow-hidden flex-1 min-h-0">
              {/* Left Column: Chat Area */}
              <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto">
                {selectedAgent && (
                  <div className="px-6 py-3 border-b border-transparent bg-transparent flex items-center justify-between shrink-0 select-none z-10">
                    <div className="flex items-center gap-3 min-w-0">
                      <SidebarToggle />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-3 min-w-0 text-left hover:bg-muted/50 p-1 -m-1 rounded-xl transition-colors cursor-pointer group outline-none"
                            title="Switch agent"
                          >
                            <BotAvatar
                              shape={selectedAgent.shape}
                              color={selectedAgent.color}
                              expression={selectedAgent.expression}
                              size={30}
                              isAnimated={true}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-bold text-foreground truncate">
                                  {selectedAgent.name}
                                </span>
                                <CaretDown className="size-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">{selectedAgent.role}</p>
                            </div>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
                          {tradingAgents.map((agent) => (
                            <DropdownMenuItem
                              key={agent.id}
                              onClick={() => {
                                router.push(`/projects/${projectId}?tab=chat&agentId=${agent.id}`);
                              }}
                              className={cn(
                                'flex items-center gap-2.5 px-3 py-2 cursor-pointer rounded-lg',
                                agent.id === selectedAgent.id ? 'bg-muted font-medium' : '',
                              )}
                            >
                              <BotAvatar
                                shape={agent.shape}
                                color={agent.color}
                                expression={agent.expression}
                                size={22}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground truncate">{agent.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{agent.role}</p>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Right side corner: Kortix style computer toggle button */}
                    <div className="ml-auto flex items-center gap-2">
                      <Hint label={showComputer ? 'Hide computer' : 'Open computer'}>
                        <Button
                          type="button"
                          variant={showComputer ? 'secondary' : 'ghost'}
                          size="icon"
                          onClick={() => setShowComputer((prev) => !prev)}
                          aria-label={showComputer ? 'Hide computer' : 'Open computer'}
                          className="size-8 cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <Monitor className="size-4" weight={showComputer ? 'fill' : 'regular'} />
                        </Button>
                      </Hint>
                    </div>
                  </div>
                )}

                <div className="flex-1 flex flex-col justify-center min-h-0 [&_.absolute.top-2.left-2]:hidden">
                  <ProjectHome projectId={projectId} beforeSend={beforeSend}>
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

              {/* Right Column: Docked Bot Computer (Toggled via computer icon) */}
              {selectedAgent && showComputer && !editingAgent && (
                <BotComputerPanel
                  adminAgentName={selectedAgent.name}
                  onClose={() => setShowComputer(false)}
                />
              )}

              {/* Right Column: Docked Bot Identity Editor Drawer (Proper Compression) */}
              {editingAgent && (
                <BotEditDrawer
                  isOpen={true}
                  agent={editingAgent}
                  mode="docked"
                  onClose={() => setEditingAgent(null)}
                  onSave={(updated) => {
                    setEditingAgent(null);
                  }}
                />
              )}
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* VIEW 2: MARKETS OVERVIEW (KORTIX DESIGN SYSTEM)                            */}
        {/* ========================================================================= */}
        {activeView === 'overview' && (
          <div id="overview-scroll-container" className="w-full h-full flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto bg-background text-foreground">
            {/* Kortix Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40 font-sans">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground font-sans">
                    Overview
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SearchButton />
              </div>
            </div>

            {/* KPI Performance Cards Container with Selected Wallpaper */}
            <div className="relative p-3.5 sm:p-4 rounded-2xl border border-border/70 overflow-hidden shadow-2xs">
              <div className="absolute inset-0 pointer-events-none opacity-85 overflow-hidden">
                <WallpaperBackground />
              </div>
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {/* 1. Total Balance */}
                <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                      <Wallet className="size-3.5 text-muted-foreground" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground font-sans">Total Balance</span>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl sm:text-[23px] font-normal tracking-tight tabular-nums text-foreground font-sans">
                      ${totalAccountMoney.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground font-sans">
                    <span className={cn(
                      'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium font-sans',
                      totalJournalPnl > 0
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : totalJournalPnl < 0
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-muted text-muted-foreground'
                    )}>
                      {totalJournalPnl > 0 ? '+' : ''}{pnlPercent}%
                    </span>
                  </div>
                </div>

                {/* 2. Realized PnL */}
                <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                      <ChartLineUp className="size-3.5 text-muted-foreground" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground font-sans">Realized PnL</span>
                  </div>
                  <div className="mt-3">
                    <div className={cn(
                      'text-2xl sm:text-[23px] font-normal tracking-tight tabular-nums font-sans',
                      totalJournalPnl > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : totalJournalPnl < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-foreground'
                    )}>
                      {totalJournalPnl > 0 ? '+' : ''}${totalJournalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground font-sans">
                    {totalJournalPnl !== 0 && (
                      <span className={cn(
                        'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium font-sans',
                        totalJournalPnl > 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      )}>
                        {totalJournalPnl > 0 ? 'Profit' : 'Loss'}
                      </span>
                    )}
                    <span className="font-sans">Across {totalJournalTrades} {totalJournalTrades === 1 ? 'trade' : 'trades'}</span>
                  </div>
                </div>

                {/* 3. Win / Loss Record */}
                <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                      <TrendUp className="size-3.5 text-muted-foreground" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground font-sans">Win / Loss Record</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2 font-sans">
                    <span className="text-2xl sm:text-[23px] font-normal tracking-tight tabular-nums text-foreground font-sans">
                      <span className={winJournalTrades > 0 ? 'text-emerald-600 dark:text-emerald-400 font-normal' : 'text-foreground'}>{winJournalTrades}W</span>
                      <span className="text-muted-foreground/40 font-normal mx-1">/</span>
                      <span className={lossJournalTrades > 0 ? 'text-rose-600 dark:text-rose-400 font-normal' : 'text-foreground'}>{lossJournalTrades}L</span>
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground font-sans">
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-muted text-foreground font-sans">
                      {winRateJournal}% Win Rate
                    </span>
                  </div>
                </div>

                {/* 4. Target */}
                <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                      <Target className="size-3.5 text-muted-foreground" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground font-sans">Target</span>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl sm:text-[23px] font-normal tracking-tight tabular-nums text-foreground font-sans">
                      ${tradingGoal.targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground font-sans">
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-sans">
                      {totalAccountMoney > 0
                        ? `+${(((tradingGoal.targetAmount - totalAccountMoney) / totalAccountMoney) * 100).toFixed(1)}% Goal`
                        : '+25.0% Goal'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Watchlist Section (Clean Kortix Card) */}
            <WatchlistTable
              selectedSymbol={selectedWatchlistStock}
              onSelectSymbol={(sym) => {
                setSelectedWatchlistStock(sym);
                openStockTab(sym);
              }}
            />

            {/* Dynamic Mini Charts based on the first 2 top watchlist items (Image 3) */}
            {(() => {
              const top1 = watchlistItems[0] || { symbol: 'BTCUSD', name: 'Bitcoin / U.S. Dollar' };
              const top2 = watchlistItems[1] || { symbol: 'EURUSD', name: 'Euro / U.S. Dollar' };
              const resolvedTop1 = resolveTradingViewSymbol(top1.symbol, top1.name);
              const resolvedTop2 = resolveTradingViewSymbol(top2.symbol, top2.name);

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                  <div
                    onClick={() => openStockTab(top1.symbol, top1.name)}
                    className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs overflow-hidden cursor-pointer hover:border-border transition-colors group font-sans"
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors font-sans">
                          {top1.name || top1.symbol}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground uppercase">{top1.symbol}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">1M Overview</span>
                    </div>
                    <div className="overflow-hidden rounded-lg">
                      <TradingViewWidget
                        scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js"
                        config={{
                          symbol: resolvedTop1.fullSymbol,
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
                  </div>

                  <div
                    onClick={() => openStockTab(top2.symbol, top2.name)}
                    className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs overflow-hidden cursor-pointer hover:border-border transition-colors group font-sans"
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors font-sans">
                          {top2.name || top2.symbol}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground uppercase">{top2.symbol}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">1M Overview</span>
                    </div>
                    <div className="overflow-hidden rounded-lg">
                      <TradingViewWidget
                        scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js"
                        config={{
                          symbol: resolvedTop2.fullSymbol,
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
                  </div>
                </div>
              );
            })()}

            {/* Leaders & Heatmap */}
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Market Leaders</h2>
                    <p className="text-xs text-muted-foreground">12-month performance trend across asset groups</p>
                  </div>
                </div>
                <div className="p-3 bg-card">
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

              <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">S&P 500 Heatmap</h2>
                    <p className="text-xs text-muted-foreground">Sized by market cap, colored by session move</p>
                  </div>
                </div>
                <div className="p-3 bg-card">
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
            <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Global Stock Screener</h2>
                  <p className="text-xs text-muted-foreground">Top global equities sorted by market capitalization</p>
                </div>
              </div>
              <div className="p-3 bg-card">
                <TvScreener screenerType="stock" columns="overview" screen="most_capitalized" height={560} />
              </div>
            </div>

            {/* Top stories & Economic Calendar */}
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Top Stories</h2>
                    <p className="text-xs text-muted-foreground">Live market news & breaking developments</p>
                  </div>
                </div>
                <div className="p-3 bg-card">
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

              <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Economic Calendar</h2>
                    <p className="text-xs text-muted-foreground">Key global economic releases & announcements</p>
                  </div>
                </div>
                <div className="p-3 bg-card">
                  <TvEconomicCalendar height={520} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: FULL WATCHLIST VIEW (KORTIX DESIGN SYSTEM)                         */}
        {/* ========================================================================= */}
        {activeView === 'watchlist' && (
          <div className="w-full h-full flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto bg-background text-foreground">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40 font-sans">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground font-sans">
                  Watchlist
                </h1>
              </div>
              <SearchButton />
            </div>

            <WatchlistTable
              selectedSymbol={selectedWatchlistStock}
              onSelectSymbol={(sym) => {
                setSelectedWatchlistStock(sym);
                openStockTab(sym);
              }}
            />

            {/* Chart for selected stock */}
            <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden mt-2 font-sans">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <ChartLineUp className="size-4 text-foreground" />
                  <h2 className="text-sm font-semibold text-foreground font-sans">
                    Chart
                  </h2>
                </div>
              </div>
              <div className="p-3 bg-card">
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
        {/* VIEW: CHART (FULLSCREEN ADVANCED TRADINGVIEW CHART ALONE)                 */}
        {/* ========================================================================= */}
        {activeView === 'chart' && (
          <div className="relative w-full h-full flex-1 flex flex-col overflow-hidden bg-background">
            <TvLiveChart
              symbol={searchParams.get('symbol') || selectedWatchlistStock || 'NASDAQ:AAPL'}
              height="100%"
              className="w-full h-full flex-1 !rounded-none !border-0"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: SINGLE-STOCK RESEARCH TERMINAL                                     */}
        {/* ========================================================================= */}
        {activeView === 'stock' && (
          <div className="w-full px-4 sm:px-6 py-4 flex flex-col gap-6">
            {/* Header Shell */}
            <section className="hatch">
              <div className="flex flex-col gap-3 p-4 sm:p-5 bg-white rounded-2xl border border-zinc-200/90 shadow-2xs">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 shadow-2xs hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    <Bell className="size-3.5 text-zinc-700" />
                    <span>Set alert</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openStockTab(activeStockSymbol, currentStockItem?.name)}
                    className="flex items-center justify-center size-8 rounded-lg border border-zinc-200/90 bg-white text-zinc-800 shadow-2xs hover:bg-zinc-50 transition-colors cursor-pointer"
                    title="Pin to tabs"
                  >
                    <Pin className="size-3.5" />
                  </button>
                </div>

                {/* Live TradingView Symbol Info Widget */}
                <div className="pt-1">
                  <TvSymbolInfo symbol={resolvedActive.fullSymbol} theme="light" />
                </div>
              </div>
            </section>

            {/* 1. Vertical Multi-Symbol Area Chart & 2. Tickers Widget (above candlestick chart) */}
            <div className="terminal-panel">
              <div className="p-2 bg-white">
                <TradingViewWidget
                  scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js"
                  config={{
                    symbols:
                      resolvedActive.assetType === 'crypto'
                        ? [
                            [currentStockItem?.name || resolvedActive.cleanSymbol, `${resolvedActive.fullSymbol}|1D`],
                            ['Ethereum', 'BINANCE:ETHUSDT|1D'],
                            ['Solana', 'BINANCE:SOLUSDT|1D'],
                          ]
                        : resolvedActive.assetType === 'forex'
                        ? [
                            [currentStockItem?.name || resolvedActive.cleanSymbol, `${resolvedActive.fullSymbol}|1D`],
                            ['Euro / US Dollar', 'FX:EURUSD|1D'],
                            ['British Pound', 'FX:GBPUSD|1D'],
                          ]
                        : [
                            [
                              currentStockItem?.name || resolvedActive.cleanSymbol,
                              `${resolvedActive.fullSymbol}|1D`,
                            ],
                            ['Google', 'GOOGL|1D'],
                            ['Microsoft', 'MSFT|1D'],
                          ],
                    chartOnly: true,
                    width: '100%',
                    height: 500,
                    locale: 'en',
                    colorTheme: 'light',
                    autosize: true,
                    showVolume: false,
                    showMA: false,
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
                    headerFontSize: 'medium',
                    lineWidth: 2,
                    lineType: 0,
                    dateRanges: [
                      '1d|1',
                      '1m|30',
                      '3m|60',
                      '12m|1D',
                      '60m|1W',
                      'all|1M',
                    ],
                  }}
                  height={500}
                />
              </div>

              {/* Tickers widget directly attached below vertical chart */}
              <div className="p-3 border-t border-zinc-100 bg-white">
                <TvTickers
                  symbols={marketTickers}
                  hideChart={true}
                />
              </div>
            </div>

            {/* Upper Grid: Candlestick Chart + Technical Analysis Gauge */}
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="terminal-panel">
                <div className="p-2 bg-white">
                  <TvLiveChart
                    symbol={resolvedActive.fullSymbol}
                    height={560}
                    onExpand={() => {
                      setSelectedWatchlistStock(resolvedActive.fullSymbol);
                      setActiveView('chart');
                      const targetUrl = `${pathname}?tab=chart&symbol=${encodeURIComponent(resolvedActive.fullSymbol)}`;
                      window.history.pushState({}, '', targetUrl);
                      router.push(targetUrl);
                    }}
                  />
                </div>
              </div>

              <div className="terminal-panel">
                <div className="p-2 bg-white h-full flex items-center justify-center">
                  <TradingViewWidget
                    scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"
                    config={{
                      interval: '1h',
                      width: '100%',
                      isTransparent: true,
                      height: 560,
                      symbol: resolvedActive.fullSymbol,
                      showIntervalTabs: true,
                      displayMode: 'single',
                      locale: 'en',
                      colorTheme: 'light',
                    }}
                    height={560}
                  />
                </div>
              </div>
            </div>

            {/* Middle Row 1: Top stories timeline */}
            <div className="terminal-panel">
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
                <div className="p-2 bg-white">
                  <TradingViewWidget
                    scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js"
                    config={{
                      symbols: [
                        [
                          currentStockItem?.name || resolvedActive.cleanSymbol,
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
                <div className="p-2 bg-white">
                  <TvCompanyProfile symbol={resolvedActive.fullSymbol} height={420} />
                </div>
              </div>
            </div>

            {/* Seasonal Chart Widget */}
            <div className="terminal-panel">
              <div className="p-2 bg-white">
                <TvSeasonalChart symbol={resolvedActive.fullSymbol} height={420} />
              </div>
            </div>

            {/* Financials Widget */}
            <div className="terminal-panel">
              <div className="p-2 bg-white">
                <TradingViewWidget
                  scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-financials.js"
                  config={{
                    isTransparent: true,
                    largeChartUrl: '',
                    displayMode: 'regular',
                    width: '100%',
                    height: 550,
                    colorTheme: 'light',
                    symbol: resolvedActive.fullSymbol,
                    locale: 'en',
                  }}
                  height={550}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Search Dialog Modal (⌘K) */}
      <SearchCommand />

      {/* Create Group Modal */}
      <Dialog open={showCreateGroupModal} onOpenChange={setShowCreateGroupModal}>
        <DialogPopup className="sm:max-w-md p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Create Multi-Agent Group</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select agents to combine into a collaborative trading swarm desk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Group Name</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Alpha Momentum Swarm"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:border-zinc-950"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Select Agents</label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-1">
                {tradingAgents.map((agent) => {
                  const isChecked = newGroupAgentIds.includes(agent.id);
                  return (
                    <label
                      key={agent.id}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors',
                        isChecked ? 'border-zinc-950 bg-zinc-50 dark:bg-zinc-800/50' : 'border-border hover:bg-muted/50',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <BotAvatar shape={agent.shape} color={agent.color} expression={agent.expression} size={20} />
                        <span className="text-xs font-medium text-foreground">{agent.name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewGroupAgentIds((prev) => [...prev, agent.id]);
                          } else {
                            setNewGroupAgentIds((prev) => prev.filter((id) => id !== agent.id));
                          }
                        }}
                        className="size-4 rounded text-zinc-950"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCreateGroupModal(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!newGroupName.trim() || newGroupAgentIds.length === 0}
              onClick={() => {
                setShowCreateGroupModal(false);
              }}
              className="bg-zinc-950 text-white hover:bg-zinc-800 cursor-pointer"
            >
              Create Group
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
