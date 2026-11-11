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

export interface TradingJournalResponse {
  trades: Record<string, unknown>[];
}

export interface TradingJournalSaveResponse {
  trade: Record<string, unknown>;
}

export interface TradingJournalDeleteResponse {
  deleted: boolean;
  id: string;
}

/**
 * Fetch persisted journal trades from GET /v1/trading/journal.
 */
export async function getTradingJournalTrades(projectId?: string): Promise<Record<string, unknown>[]> {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const res = await backendApi.get<TradingJournalResponse>(`/trading/journal${query}`, { showErrors: false });
  const data = unwrap(res, 'Failed to fetch trading journal trades');
  return data.trades || [];
}

/**
 * Upsert trade to POST /v1/trading/journal.
 */
export async function saveTradingJournalTrade(trade: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await backendApi.post<TradingJournalSaveResponse>('/trading/journal', trade, { showErrors: false });
  const data = unwrap(res, 'Failed to save trading journal trade');
  return data.trade;
}

export interface TradingJournalUploadResponse {
  url: string;
  path: string;
}

/**
 * Upload a chart screenshot (HTF/MTF/LTF) to POST /v1/trading/journal/upload
 * backed by the Supabase Storage `journal-charts` bucket.
 */
export async function uploadTradingJournalChart(
  file: File,
  timeframe: 'htf' | 'mtf' | 'ltf' = 'htf',
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('timeframe', timeframe);
  const res = await backendApi.upload<TradingJournalUploadResponse>('/trading/journal/upload', formData, {
    showErrors: false,
  });
  const data = unwrap(res, 'Failed to upload chart screenshot');
  return data.url;
}

/**
 * Delete trade from DELETE /v1/trading/journal/:id.
 */
export async function deleteTradingJournalTrade(tradeId: string): Promise<boolean> {
  const res = await backendApi.delete<TradingJournalDeleteResponse>(`/trading/journal/${encodeURIComponent(tradeId)}`, { showErrors: false });
  const data = unwrap(res, 'Failed to delete trading journal trade');
  return Boolean(data.deleted);
}


