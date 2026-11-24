'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Bell,
  Sparkles,
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

import JournalView from '@/features/journal/JournalView';
import OrdersView from '@/features/trading/OrdersView';
import { getLocalTrades } from '@/features/journal/storage';
import { syncDhanTradesToJournal } from '@/features/journal/dhanSync';
import { subscribeDhanLive, getDhanLiveSnapshot } from '@/features/markets/dhanLiveStore';
import type { JournalTrade } from '@/features/journal/types';
import SearchCommand, { openSearch, SearchButton } from '@/features/markets/SearchCommand';
import StockSymbolIcon from '@/features/markets/StockSymbolIcon';
import { resolveTradingViewSymbol } from '@/features/markets/symbol-resolver';
import TradingViewSymbolPage from '@/features/markets/TradingViewSymbolPage';
import { WallpaperBackground } from '@/components/ui/wallpaper-background';
import { MARKETS } from '@/features/markets/markets';
import { getStoredWatchlist, type WatchlistEntry } from '@/features/markets/watchlist.store';
import type { MarketId } from '@/features/markets/types';
import { cn } from '@kortix/ui';
import {
  Wallet,
  TrendUp,
  ChartLineUp,
  Target,
  Coins,
} from '@phosphor-icons/react';
import KortixPinIcon from '@/features/markets/KortixPinIcon';
import '@/features/markets/terminal.css';

import { promptFromSearchParams } from './prompt-from-search-params';

const FREE_ONBOARDING_UPGRADE_MODAL_KEY = 'kortix:free-onboarding-upgrade-modal-shown';

interface StockTabItem {
  id: string; // 'stock:AAPL'
  symbol: string;
  name: string;
}

export const CANONICAL_TRADING_PROJECT_ID = 'trading';

export default function ProjectIndexPage() {
  const tI18nComplete = useTranslations('hardcodedUi.i18nComplete');
  const { id: rawProjectId } = useParams<{ id: string }>();
  const projectId = (rawProjectId === 'proj-trading' || rawProjectId === 'b0000000-0000-0000-0000-000000000001') ? CANONICAL_TRADING_PROJECT_ID : rawProjectId;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Cleanly replace URL if visiting via legacy GUID or slug
  useEffect(() => {
    if (rawProjectId === 'proj-trading' || rawProjectId === 'b0000000-0000-0000-0000-000000000001') {
      const q = searchParams.toString();
      router.replace(`/projects/trading${q ? `?${q}` : ''}`);
    }
  }, [rawProjectId, searchParams, router]);

  // Active view management: 'chat' | 'overview' | 'stock' | 'journal' | 'chart' | 'orders'
  const queryTab = searchParams.get('tab');
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  useEffect(() => {
    const handleDrawer = (e: any) => {
      setIsEditDrawerOpen(Boolean(e.detail?.open));
    };
    window.addEventListener('edit-agent-drawer-toggle' as any, handleDrawer);
    return () => window.removeEventListener('edit-agent-drawer-toggle' as any, handleDrawer);
  }, []);

  const [activeView, setActiveView] = useState<'chat' | 'overview' | 'stock' | 'journal' | 'chart' | 'orders'>(
    queryTab === 'overview'
      ? 'overview'
      : queryTab === 'journal'
        ? 'journal'
        : queryTab === 'chart'
          ? 'chart'
          : queryTab === 'orders'
            ? 'orders'
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
  const [watchlistItems, setWatchlistItems] = useState<WatchlistEntry[]>(() => getStoredWatchlist());
  const [selectedWatchlistStock, setSelectedWatchlistStock] = useState<string>('AAPL');

  // Keep-alive set for sub-0.05ms instant tab switching
  const [visitedViews, setVisitedViews] = useState<Set<string>>(() => new Set([activeView]));

  useEffect(() => {
    setVisitedViews((prev) => {
      if (prev.has(activeView)) return prev;
      const next = new Set(prev);
      next.add(activeView);
      return next;
    });
  }, [activeView]);

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
      } else if (tab === 'journal') {
        setActiveView('journal');
      } else if (tab === 'orders') {
        setActiveView('orders');
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
    } else if (queryTab === 'journal') {
      setActiveView('journal');
    } else if (queryTab === 'orders') {
      setActiveView('orders');
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
  const openStockTab = (symbolRaw: string, companyName?: string, exchange?: string) => {
    const resolved = resolveTradingViewSymbol(symbolRaw, companyName, exchange);
    const tabId = `stock:${resolved.fullSymbol}`;
    const name = companyName || resolved.name || resolved.cleanSymbol;
    setStockTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) return prev;
      return [...prev, { id: tabId, symbol: resolved.fullSymbol, name }];
    });
    setActiveStockTab(tabId);
    setActiveView('stock');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
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
      const custom = e as CustomEvent<{ symbol: string; name?: string; exchange?: string }>;
      if (custom.detail?.symbol) {
        openStockTab(custom.detail.symbol, custom.detail.name, custom.detail.exchange);
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

  const [journalTrades, setJournalTrades] = useState<JournalTrade[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return getLocalTrades();
      } catch {}
    }
    return [];
  });

  const [dhanFunds, setDhanFunds] = useState<{ availabelBalance?: number; withdrawableBalance?: number; utilizedAmount?: number } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = window.localStorage.getItem('kortix_trading_dhan_funds');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [dhanPositions, setDhanPositions] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem('kortix_trading_dhan_positions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setJournalTrades(getLocalTrades());
    const onJournalUpdate = () => {
      setJournalTrades(getLocalTrades());
    };
    window.addEventListener('trading-journal-updated', onJournalUpdate);

    // Synchronous 0ms subscription with visibility-aware background sync & quota guard
    const unsubscribeDhan = subscribeDhanLive((snapshot) => {
      if (snapshot.funds) {
        setDhanFunds(snapshot.funds as any);
      }
      if (snapshot.positions) {
        setDhanPositions(snapshot.positions);
      }
    });

    // 2. Auto-sync Dhan trades if trades are empty or have old mock trades
    const local = getLocalTrades();
    const hasMock = local.some((t) => t.instrument === 'EURUSD' || !t.id.startsWith('dhan_'));
    if (local.length === 0 || hasMock) {
      syncDhanTradesToJournal(projectId)
        .then((res) => {
          if (res?.trades) {
            setJournalTrades(res.trades);
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('trading-journal-updated', onJournalUpdate);
      unsubscribeDhan();
    };
  }, [projectId]);

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
  
  // Dynamic IST Today Date string (e.g. '2026-11-23')
  const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const todayTrades = journalTrades.filter((t) => t.entryDate === todayDateStr);
  const todayJournalPnl = todayTrades.reduce((acc, t) => acc + (t.pnl ?? 0), 0);

  // Live fluctuating Realized & Unrealized PnL from Dhan active positions
  const dhanLiveRealized = Array.isArray(dhanPositions)
    ? Number(dhanPositions.reduce((acc: number, p: any) => acc + (Number(p.realizedProfit) || 0), 0).toFixed(2))
    : 0;

  // Use Dhan live realized PnL if available, otherwise journal today's trades or total
  const todayRealizedPnl = dhanLiveRealized !== 0
    ? dhanLiveRealized
    : (todayTrades.length > 0 ? todayJournalPnl : totalJournalPnl);
  const todayTradesCount = todayTrades.length > 0 ? todayTrades.length : totalJournalTrades;

  const displayBalance = dhanFunds?.availabelBalance != null ? dhanFunds.availabelBalance : (startingCapital + totalJournalPnl);
  const pnlPercent = displayBalance > 0 ? ((todayRealizedPnl / displayBalance) * 100).toFixed(2) : '0.00';

  // Live fluctuating Unrealized PnL from Dhan active positions
  const totalUnrealizedPnl = Array.isArray(dhanPositions)
    ? Number(dhanPositions.reduce((acc: number, p: any) => acc + (typeof p.unrealizedProfit === 'number' ? p.unrealizedProfit : 0), 0).toFixed(2))
    : 0;

  // Live Margin Used from Dhan funds utilizedAmount
  const marginUsed = Number(dhanFunds?.utilizedAmount || 0);

  // Active open positions count
  const openPositionsCount = Array.isArray(dhanPositions)
    ? dhanPositions.filter((p: any) => Number(p.netQty || 0) !== 0).length
    : 0;

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
    <div
      className={cn(
        'relative flex flex-col h-full w-full overflow-hidden bg-background font-sans transition-[margin] duration-200',
        isEditDrawerOpen && 'md:mr-[420px]'
      )}
    >
      {/* Main Workspace Body */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* ========================================================================= */}
        {/* VIEW 1: KORTIX PROJECT HOME COMPOSER                                      */}
        {/* ========================================================================= */}
        {visitedViews.has('chat') && (
          <div
            className={cn(
              'flex h-full min-h-0 flex-1 flex-col overflow-hidden',
              activeView !== 'chat' && 'hidden',
            )}
          >
            <div className="flex min-h-0 flex-1 flex-col justify-center">
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
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: MARKETS OVERVIEW (KORTIX DESIGN SYSTEM)                            */}
        {/* ========================================================================= */}
        {visitedViews.has('overview') && (
          <div id="overview-scroll-container" className={cn("w-full h-full flex-1 p-3 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6 overflow-y-auto bg-background text-foreground", activeView !== 'overview' && 'hidden')}>
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
              <div className="relative z-10 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-4">
                {/* 1. Total Balance */}
                <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-5 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                      <Wallet className="size-3.5 text-muted-foreground" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground font-sans">Total Balance</span>
                  </div>
                  <div className="mt-2.5 sm:mt-3">
                    <div className="text-lg sm:text-[23px] font-normal tracking-tight tabular-nums text-foreground font-sans">
                      ₹{displayBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-2.5 flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-medium text-muted-foreground font-sans">
                    <span className={cn(
                      'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10.5px] sm:text-[11px] font-medium font-sans',
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
                <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-5 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                      <ChartLineUp className="size-3.5 text-muted-foreground" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground font-sans">Realized PnL</span>
                  </div>
                  <div className="mt-2.5 sm:mt-3">
                    <div className={cn(
                      'text-lg sm:text-[23px] font-normal tracking-tight tabular-nums font-sans',
                      todayRealizedPnl > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : todayRealizedPnl < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-foreground'
                    )}>
                      {todayRealizedPnl > 0 ? '+' : todayRealizedPnl < 0 ? '-' : ''}₹{Math.abs(todayRealizedPnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-2.5 flex items-center justify-between text-[11px] sm:text-[11.5px] font-medium text-muted-foreground font-sans">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] sm:text-[11px] font-medium font-sans',
                        todayRealizedPnl > 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      )}>
                        {todayRealizedPnl >= 0 ? 'Profit' : 'Loss'}
                      </span>
                      <span className="font-sans hidden xs:inline">Day ({todayTradesCount})</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 tabular-nums hidden sm:inline">Total: {totalJournalPnl >= 0 ? '+' : ''}₹{totalJournalPnl.toFixed(2)}</span>
                  </div>
                </div>

                {/* 3. Unrealized PnL (Live Fluctuating) */}
                <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-5 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                      <TrendUp className="size-3.5 text-muted-foreground" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground font-sans">Unrealized PnL</span>
                  </div>
                  <div className="mt-2.5 sm:mt-3">
                    <div className={cn(
                      'text-lg sm:text-[23px] font-normal tracking-tight tabular-nums font-sans',
                      totalUnrealizedPnl > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : totalUnrealizedPnl < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-foreground'
                    )}>
                      {totalUnrealizedPnl > 0 ? '+' : totalUnrealizedPnl < 0 ? '-' : ''}₹{Math.abs(totalUnrealizedPnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-2.5 flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-medium text-muted-foreground font-sans">
                    {openPositionsCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-sans">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {openPositionsCount} Open
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] sm:text-[11px] font-medium bg-muted text-muted-foreground font-sans">
                        0 open
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Margin Used */}
                <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-5 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                      <Coins className="size-3.5 text-muted-foreground" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground font-sans">Margin Used</span>
                  </div>
                  <div className="mt-2.5 sm:mt-3">
                    <div className="text-lg sm:text-[23px] font-normal tracking-tight tabular-nums text-foreground font-sans">
                      ₹{marginUsed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-2.5 flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-medium text-muted-foreground font-sans">
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] sm:text-[11px] font-medium bg-muted text-muted-foreground font-sans truncate">
                      Avail: ₹{displayBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* 5. Win / Loss Record */}
                <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-5 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                      <TrendUp className="size-3.5 text-muted-foreground" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground font-sans">Win / Loss</span>
                  </div>
                  <div className="mt-2.5 sm:mt-3 flex items-baseline gap-2 font-sans">
                    <span className="text-lg sm:text-[23px] font-normal tracking-tight tabular-nums text-foreground font-sans">
                      <span className={winJournalTrades > 0 ? 'text-emerald-600 dark:text-emerald-400 font-normal' : 'text-foreground'}>{winJournalTrades}W</span>
                      <span className="text-muted-foreground/40 font-normal mx-0.5">/</span>
                      <span className={lossJournalTrades > 0 ? 'text-rose-600 dark:text-rose-400 font-normal' : 'text-foreground'}>{lossJournalTrades}L</span>
                    </span>
                  </div>
                  <div className="mt-2 sm:mt-2.5 flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-medium text-muted-foreground font-sans">
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] sm:text-[11px] font-medium bg-muted text-foreground font-sans">
                      {winRateJournal}% Win Rate
                    </span>
                  </div>
                </div>

                {/* 6. Target */}
                <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-5 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                      <Target className="size-3.5 text-muted-foreground" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground font-sans">Target</span>
                  </div>
                  <div className="mt-2.5 sm:mt-3">
                    <div className="text-lg sm:text-[23px] font-normal tracking-tight tabular-nums text-foreground font-sans">
                      ₹{tradingGoal.targetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-2.5 flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-medium text-muted-foreground font-sans">
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-sans">
                      {displayBalance > 0
                        ? `+${(((tradingGoal.targetAmount - displayBalance) / displayBalance) * 100).toFixed(1)}% Goal`
                        : '+25.0% Goal'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Watchlist Section (Clean Kortix Card) */}
            <WatchlistTable
              positions={dhanPositions}
              journalTrades={journalTrades}
              selectedSymbol={selectedWatchlistStock}
              onSelectSymbol={(sym, name, exchange) => {
                setSelectedWatchlistStock(sym);
                openStockTab(sym, name, exchange);
              }}
            />

            {/* Dynamic Mini Charts based on the first 2 top watchlist items (Image 3) */}
            {(() => {
              const top1 = watchlistItems[0] || { symbol: 'BTCUSD', name: 'Bitcoin / U.S. Dollar' };
              const top2 = watchlistItems[1] || { symbol: 'EURUSD', name: 'Euro / U.S. Dollar' };
              const resolvedTop1 = resolveTradingViewSymbol(top1.symbol, top1.name, top1.exchange);
              const resolvedTop2 = resolveTradingViewSymbol(top2.symbol, top2.name, top2.exchange);

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                  <div
                    onClick={() => openStockTab(top1.symbol, top1.name, top1.exchange)}
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
                        lazy={true}
                      />
                    </div>
                  </div>

                  <div
                    onClick={() => openStockTab(top2.symbol, top2.name, top2.exchange)}
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
                        lazy={true}
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
                    lazy={true}
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
                    lazy={true}
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
                    lazy={true}
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
        {/* VIEW: JOURNAL                                                             */}
        {/* ========================================================================= */}
        {visitedViews.has('journal') && (
          <div className={cn("w-full h-full flex-1 overflow-hidden", activeView !== 'journal' && 'hidden')}>
            <JournalView projectId={projectId} />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW: ORDERS (DHANHQ ORDER BOOK & AUDIT)                                  */}
        {/* ========================================================================= */}
        {visitedViews.has('orders') && (
          <div className={cn("w-full h-full flex-1 overflow-hidden", activeView !== 'orders' && 'hidden')}>
            <OrdersView projectId={projectId} />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW: CHART (FULLSCREEN ADVANCED TRADINGVIEW CHART ALONE)                 */}
        {/* ========================================================================= */}
        {visitedViews.has('chart') && (
          <div className={cn("relative w-full h-full min-h-0 flex-1 flex flex-col overflow-hidden bg-background", activeView !== 'chart' && 'hidden')}>
            <TvLiveChart
              symbol={searchParams.get('symbol') || selectedWatchlistStock || 'NASDAQ:AAPL'}
              height="100%"
              className="w-full h-full flex-1 !rounded-none !border-0"
              onSymbolChange={(sym) => {
                setSelectedWatchlistStock(sym);
                const targetUrl = `${pathname}?tab=chart&symbol=${encodeURIComponent(sym)}`;
                window.history.pushState({}, '', targetUrl);
              }}
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
                    lazy={true}
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
                  lazy={true}
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
                  lazy={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Search Dialog Modal (⌘K) */}
      <SearchCommand />
    </div>
  );
}
