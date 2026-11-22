'use client';

import { useQuery } from '@tanstack/react-query';
import { getTradingAgents, type BackendTradingAgent } from '@kortix/sdk';
import type { BotShape, BotExpression } from './bot-avatar';

export type TradingAgentStatus =
  | 'typing'
  | 'waiting for approval'
  | 'idle';

export interface TradingAgentDef {
  id: string;
  name: string;
  role: string;
  group: 'Analysts' | 'Researchers' | 'Management' | 'Risk Management' | 'Execution';
  shape: BotShape;
  color: string;
  expression: BotExpression;
  status?: TradingAgentStatus;
  lastAction?: string;
  time?: string;
  chatPreview?: string;
  timeText?: string;
  description: string;
  directives?: string;
  isAdmin?: boolean;
  isPinned?: boolean;
  unread?: boolean;
  isArchived?: boolean;
  system_prompt?: string | null;
}

export function tradingAgentQueryKey() {
  return ['trading-agents'] as const;
}

function resolveAgentStatus(row: BackendTradingAgent): {
  status: TradingAgentStatus;
  chatPreview: string;
  timeText: string;
} {
  // Real status: default to idle unless real pending approval exists
  const hasPendingApproval = Boolean(row.pending_approvals_count && row.pending_approvals_count > 0);
  if (hasPendingApproval) {
    return {
      status: 'waiting for approval',
      chatPreview: 'Waiting for approval...',
      timeText: '',
    };
  }
  return {
    status: 'idle',
    chatPreview: '',
    timeText: '',
  };
}

export function mapBackendAgentToDef(row: BackendTradingAgent): TradingAgentDef {
  const isPm = row.id === 'portfolio_manager' || row.is_admin;
  const statusInfo = resolveAgentStatus(row);
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    group: (row.group_category as TradingAgentDef['group']) || (isPm ? 'Execution' : 'Analysts'),
    shape: (row.shape as BotShape) || (isPm ? 'circle' : 'square'),
    color: row.color || (isPm ? '#F97316' : '#10B981'),
    expression: (row.expression as BotExpression) || 'attentive',
    status: statusInfo.status,
    chatPreview: statusInfo.chatPreview,
    timeText: statusInfo.timeText,
    lastAction: statusInfo.chatPreview,
    time: statusInfo.timeText,
    description: row.description || '',
    isAdmin: Boolean(row.is_admin),
    isPinned: Boolean(row.is_pinned),
    isArchived: Boolean(row.is_archived),
    system_prompt: row.system_prompt,
  };
}

export const DEFAULT_CANONICAL_TRADING_AGENTS: TradingAgentDef[] = [
  {
    id: 'portfolio_manager',
    name: 'Portfolio Manager',
    role: 'Capital Allocation & Lead',
    group: 'Management',
    shape: 'circle',
    color: '#F97316',
    expression: 'attentive',
    status: 'idle',
    description: 'Lead Portfolio Manager and Workspace Administrator. Directs multi-agent execution.',
    isAdmin: true,
  },
  {
    id: 'trader_agent',
    name: 'Trader Agent',
    role: 'Execution & Order Routing',
    group: 'Execution',
    shape: 'capsule',
    color: '#14B8A6',
    expression: 'focused',
    status: 'idle',
    description: 'Executes committee decisions into disciplined entry/exit staging.',
  },
  {
    id: 'risk_manager',
    name: 'Risk Manager',
    role: 'Position Sizing & VaR Guardrails',
    group: 'Risk Management',
    shape: 'cloud',
    color: '#DC2626',
    expression: 'attentive',
    status: 'idle',
    description: 'Enforces hard drawdown constraints and tail-risk gates.',
  },
  {
    id: 'technical_analyst',
    name: 'Technical Analyst',
    role: 'Price Action, MAs & Momentum',
    group: 'Analysts',
    shape: 'square',
    color: '#F97316',
    expression: 'focused',
    status: 'idle',
    description: 'Reads candlestick price structure, RSI, MACD, and key levels.',
  },
  {
    id: 'fundamentals_analyst',
    name: 'Fundamentals Analyst',
    role: 'Valuation & Earnings Quality',
    group: 'Analysts',
    shape: 'square',
    color: '#F59E0B',
    expression: 'attentive',
    status: 'idle',
    description: 'Examines balance sheets, multiples, earnings yield, and moat.',
  },
  {
    id: 'growth_analyst',
    name: 'Growth Analyst',
    role: 'Expansion & TAM Modeling',
    group: 'Analysts',
    shape: 'squircle',
    color: '#06B6D4',
    expression: 'friendly',
    status: 'idle',
    description: 'Evaluates hyper-growth metrics, reinvestment rates, and sector catalysts.',
  },
  {
    id: 'macro_analyst',
    name: 'Macro Analyst',
    role: 'Rates, FX & Global Liquidity',
    group: 'Analysts',
    shape: 'hexagon',
    color: '#6366F1',
    expression: 'attentive',
    status: 'idle',
    description: 'Monitors Treasury yields, Fed speak, dollar index, and commodity shocks.',
  },
  {
    id: 'news_analyst',
    name: 'News Analyst',
    role: 'Breaking Wire & Event Catalyst',
    group: 'Analysts',
    shape: 'pebble',
    color: '#EC4899',
    expression: 'attentive',
    status: 'idle',
    description: 'Monitors wire releases, earnings calls, filings, and breaking events.',
  },
  {
    id: 'sentiment_analyst',
    name: 'Sentiment Analyst',
    role: 'Crowd Positioning & Order Flow',
    group: 'Analysts',
    shape: 'circle',
    color: '#84CC16',
    expression: 'attentive',
    status: 'idle',
    description: 'Tracks put/call skew, retail volume, social mentions, and extreme fear/greed.',
  },
  {
    id: 'bull_researcher',
    name: 'Bull Researcher',
    role: 'Upside & Growth Catalyst',
    group: 'Researchers',
    shape: 'triangle',
    color: '#10B981',
    expression: 'friendly',
    status: 'idle',
    description: 'Builds evidence-backed upside valuation scenarios.',
  },
  {
    id: 'bear_researcher',
    name: 'Bear Researcher',
    role: 'Downside & Risk Thesis',
    group: 'Researchers',
    shape: 'triangle',
    color: '#EF4444',
    expression: 'skeptical',
    status: 'idle',
    description: 'Stress-tests assumptions to expose vulnerabilities.',
  },
  {
    id: 'ea',
    name: 'EA',
    role: 'Executive & Workflow Automation',
    group: 'Management',
    shape: 'droplet',
    color: '#3B82F6',
    expression: 'attentive',
    status: 'idle',
    description: 'Produces executive summaries and synchronizes watchlist briefs.',
  },
  {
    id: 'manus',
    name: 'Maus Bot',
    role: 'Autonomous Proactive Intelligence',
    group: 'Researchers',
    shape: 'orb',
    color: '#8B5CF6',
    expression: 'attentive',
    status: 'idle',
    description: 'Autonomous proactive trading desk intelligence modeled after OpenMausBot / Grok. Proactively monitors desk telemetry and initiates check-ins.',
  },
];

export function getAgentColorByName(name?: string): string {
  if (!name) return '#3B82F6';
  const clean = name.toLowerCase().replace(/[\s_-]+/g, '');
  if (clean.includes('manus') || clean.includes('maus')) return '#8B5CF6';
  for (const bot of DEFAULT_CANONICAL_TRADING_AGENTS) {
    if (
      bot.name.toLowerCase().replace(/[\s_-]+/g, '') === clean ||
      bot.id.replace(/[\s_-]+/g, '') === clean
    ) {
      return bot.color;
    }
  }
  return '#3B82F6';
}

export function useTradingAgents() {
  return useQuery({
    queryKey: tradingAgentQueryKey(),
    queryFn: async (): Promise<TradingAgentDef[]> => {
      try {
        const data = await getTradingAgents();
        if (data.agents && data.agents.length > 0) {
          return data.agents.map(mapBackendAgentToDef);
        }
      } catch (e) {
        // Fallback to canonical Tauric swarm agents
      }
      return DEFAULT_CANONICAL_TRADING_AGENTS;
    },
    initialData: DEFAULT_CANONICAL_TRADING_AGENTS,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
