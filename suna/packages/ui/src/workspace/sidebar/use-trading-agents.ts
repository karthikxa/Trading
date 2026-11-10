'use client';

import { useQuery } from '@tanstack/react-query';
import { getTradingAgents, type BackendTradingAgent } from '@kortix/sdk';
import type { BotShape, BotExpression } from './bot-avatar';

export interface TradingAgentDef {
  id: string;
  name: string;
  role: string;
  group: 'Analysts' | 'Researchers' | 'Management' | 'Risk Management' | 'Execution';
  shape: BotShape;
  color: string;
  expression: BotExpression;
  lastAction: string;
  time: string;
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

export function mapBackendAgentToDef(row: BackendTradingAgent): TradingAgentDef {
  const isPm = row.id === 'portfolio_manager' || row.is_admin;
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    group: (row.group_category as TradingAgentDef['group']) || (isPm ? 'Execution' : 'Analysts'),
    shape: (row.shape as BotShape) || (isPm ? 'circle' : 'square'),
    color: row.color || (isPm ? '#8B5CF6' : '#10B981'),
    expression: (row.expression as BotExpression) || 'attentive',
    lastAction: isPm ? 'Lead Portfolio Manager & Swarm Lead' : 'Active swarm agent',
    time: 'Active',
    description: row.description || '',
    isAdmin: Boolean(row.is_admin),
    system_prompt: row.system_prompt,
  };
}

export function useTradingAgents() {
  return useQuery({
    queryKey: tradingAgentQueryKey(),
    queryFn: async (): Promise<TradingAgentDef[]> => {
      const data = await getTradingAgents();
      return (data.agents || []).map(mapBackendAgentToDef);
    },
    staleTime: 60_000,
  });
}
