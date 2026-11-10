import { backendApi } from '../../http/api-client';
import { unwrap } from './shared';

export interface BackendTradingAgent {
  id: string;
  name: string;
  role: string;
  group_category: string;
  shape: string;
  color: string;
  expression: string;
  description: string;
  is_admin: boolean;
  system_prompt?: string | null;
}

export interface TradingAgentsResponse {
  agents: BackendTradingAgent[];
}

/**
 * Fetch canonical Tauric Swarm agents from GET /v1/trading/agents.
 */
export async function getTradingAgents(): Promise<TradingAgentsResponse> {
  const res = await backendApi.get<TradingAgentsResponse>('/trading/agents', { showErrors: false });
  return unwrap(res, 'Failed to fetch trading agents');
}

