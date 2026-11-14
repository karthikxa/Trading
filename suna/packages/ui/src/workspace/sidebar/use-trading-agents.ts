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
  isAdmin?: boolean;
  isPinned?: boolean;
  unread?: boolean;
  isArchived?: boolean;
  system_prompt?: string | null;
}

export function tradingAgentQueryKey() {
  return ['trading-agents'] as const;
}

function resolveAgentGrokInfo(id: string, name?: string): {
  status: TradingAgentStatus;
  chatPreview: string;
  timeText: string;
} {
  const key = `${id} ${name || ''}`.toLowerCase();

  if (key.includes('sales_outbound') || key.includes('sales outbound')) {
    return {
      status: 'typing',
      chatPreview: 'Typing...',
      timeText: '5:21 PM',
    };
  }
  if (key.includes('chief') || key.includes('portfolio') || key.includes('lead')) {
    return {
      status: 'idle',
      chatPreview: 'booked the venue and sent the calendar invite...',
      timeText: 'Yesterday',
    };
  }
  if (key.includes('inbox')) {
    return {
      status: 'idle',
      chatPreview: 'sent. inbox at zero, 5 drafts parked for review...',
      timeText: '2:20 PM',
    };
  }
  if (key.includes('account') || key.includes('billing') || key.includes('risk')) {
    return {
      status: 'idle',
      chatPreview: "invite's out to vicky. globex note uploaded...",
      timeText: '12:20 PM',
    };
  }
  if (key.includes('talent') || key.includes('scout')) {
    return {
      status: 'idle',
      chatPreview: '3 intros drafted in your voice, held for review...',
      timeText: '9:20 AM',
    };
  }
  if (key.includes('expense') || key.includes('designer') || key.includes('valuation')) {
    return {
      status: 'idle',
      chatPreview: 'report filed. 9 receipts, nothing outstanding...',
      timeText: '1:20 PM',
    };
  }
  if (key.includes('trader') || key.includes('execution') || key.includes('marketing') || key.includes('growth')) {
    return {
      status: 'waiting for approval',
      chatPreview: 'Waiting for approval...',
      timeText: 'Just now',
    };
  }
  if (key.includes('technical') || key.includes('ea') || key.includes('support')) {
    return {
      status: 'typing',
      chatPreview: 'Typing...',
      timeText: '3:45 PM',
    };
  }

  return {
    status: 'idle',
    chatPreview: 'synced workspace pipeline and updated watchlist...',
    timeText: '10:15 AM',
  };
}

export function mapBackendAgentToDef(row: BackendTradingAgent): TradingAgentDef {
  const isPm = row.id === 'portfolio_manager' || row.is_admin;
  const grok = resolveAgentGrokInfo(row.id, row.name);
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    group: (row.group_category as TradingAgentDef['group']) || (isPm ? 'Execution' : 'Analysts'),
    shape: (row.shape as BotShape) || (isPm ? 'circle' : 'square'),
    color: row.color || (isPm ? '#8B5CF6' : '#10B981'),
    expression: (row.expression as BotExpression) || 'attentive',
    status: grok.status,
    chatPreview: grok.chatPreview,
    timeText: grok.timeText,
    lastAction: grok.chatPreview,
    time: grok.timeText,
    description: row.description || '',
    isAdmin: Boolean(row.is_admin),
    system_prompt: row.system_prompt,
  };
}

export const DEFAULT_CANONICAL_TRADING_AGENTS: TradingAgentDef[] = [
  {
    id: 'portfolio_manager',
    name: 'Chief of Staff',
    role: 'Capital Allocation & Swarm Lead',
    group: 'Management',
    shape: 'circle',
    color: '#8B5CF6',
    expression: 'attentive',
    status: 'idle',
    description: 'Lead Portfolio Manager and Workspace Administrator. Synthesizes swarm intelligence and directs execution.',
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
    name: 'Executive Assistant',
    role: 'Operational Briefing & Notes',
    group: 'Management',
    shape: 'droplet',
    color: '#3B82F6',
    expression: 'attentive',
    status: 'idle',
    description: 'Produces executive summaries and synchronizes watchlist briefs.',
  },
];

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
  });
}
