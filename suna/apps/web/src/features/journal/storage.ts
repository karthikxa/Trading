import {
  getTradingJournalTrades,
  saveTradingJournalTrade,
  deleteTradingJournalTrade as deleteBackendTrade,
} from '@kortix/sdk';
import { JournalTrade } from './types';
import { INITIAL_MOCK_TRADES } from './mockData';

const LOCAL_STORAGE_KEY = 'kortix_trading_journal_trades_v2';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Convert DB snake_case row to TS camelCase JournalTrade
function rowToTrade(row: any): JournalTrade {
  return {
    id: row.id,
    projectId: row.project_id || undefined,
    userId: row.user_id || undefined,
    entryDate: typeof row.entry_date === 'string' ? row.entry_date.split('T')[0] : row.entry_date,
    entryTime: row.entry_time || '00:00',
    exitDate: typeof row.exit_date === 'string' ? row.exit_date.split('T')[0] : (row.exit_date || undefined),
    exitTime: row.exit_time || undefined,
    instrument: row.instrument,
    direction: row.direction,
    lots: Number(row.lots) || 1,
    entryPrice: Number(row.entry_price) || 0,
    exitPrice: Number(row.exit_price) || 0,
    stopLoss: row.stop_loss !== null && row.stop_loss !== undefined ? Number(row.stop_loss) : null,
    takeProfit: row.take_profit !== null && row.take_profit !== undefined ? Number(row.take_profit) : null,
    pnl: Number(row.pnl) || 0,
    riskR: row.risk_r !== null && row.risk_r !== undefined ? Number(row.risk_r) : null,
    returnR: row.return_r !== null && row.return_r !== undefined ? Number(row.return_r) : null,
    swap: Number(row.swap) || 0,
    commission: Number(row.commission) || 0,
    followedPlan: row.followed_plan !== false,
    planName: row.plan_name || 'A+ Setup Checklist',
    confluences: Array.isArray(row.confluences) ? row.confluences : [],
    tradeManagement: row.trade_management || '',
    mistakes: Array.isArray(row.mistakes) ? row.mistakes : [],
    entryEmotion: row.entry_emotion || undefined,
    exitEmotion: row.exit_emotion || undefined,
    notes: row.notes || '',
    chartHtf: row.chart_htf || undefined,
    chartMtf: row.chart_mtf || undefined,
    chartLtf: row.chart_ltf || undefined,
    session: row.session || 'London',
    duration: row.duration || '0m',
    splitOrders: Array.isArray(row.split_orders) ? row.split_orders : undefined,
    source: row.source || 'manual',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Convert TS camelCase JournalTrade to DB snake_case row
function tradeToRow(trade: Partial<JournalTrade>, projectId?: string) {
  const tradeId = trade.id && UUID_REGEX.test(trade.id) ? trade.id : generateUuid();
  return {
    id: tradeId,
    project_id: projectId || trade.projectId || null,
    entry_date: trade.entryDate || new Date().toISOString().split('T')[0],
    entry_time: trade.entryTime || '09:30',
    exit_date: trade.exitDate || null,
    exit_time: trade.exitTime || null,
    instrument: (trade.instrument || 'EURUSD').toUpperCase(),
    direction: trade.direction || 'Buy',
    lots: trade.lots ?? 1,
    entry_price: trade.entryPrice ?? 0,
    exit_price: trade.exitPrice ?? 0,
    stop_loss: trade.stopLoss ?? null,
    take_profit: trade.takeProfit ?? null,
    pnl: trade.pnl ?? 0,
    risk_r: trade.riskR ?? null,
    return_r: trade.returnR ?? null,
    swap: trade.swap ?? 0,
    commission: trade.commission ?? 0,
    followed_plan: trade.followedPlan ?? true,
    plan_name: trade.planName || 'A+ Setup Checklist',
    confluences: trade.confluences || [],
    trade_management: trade.tradeManagement || null,
    mistakes: trade.mistakes || [],
    entry_emotion: trade.entryEmotion || null,
    exit_emotion: trade.exitEmotion || null,
    notes: trade.notes || null,
    chart_htf: trade.chartHtf || null,
    chart_mtf: trade.chartMtf || null,
    chart_ltf: trade.chartLtf || null,
    session: trade.session || 'London',
    duration: trade.duration || null,
    split_orders: trade.splitOrders || [],
    source: trade.source || 'manual',
  };
}

// Local storage fallback helpers
export function getLocalTrades(): JournalTrade[] {
  if (typeof window === 'undefined') return INITIAL_MOCK_TRADES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_TRADES));
      return INITIAL_MOCK_TRADES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MOCK_TRADES;
  } catch {
    return INITIAL_MOCK_TRADES;
  }
}

function saveLocalTrades(trades: JournalTrade[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trades));
  } catch (err) {
    console.error('Failed to save trades to local storage:', err);
  }
}

/**
 * Fetch all trades for project, with Backend API first and LocalStorage fallback
 */
export async function getJournalTrades(projectId?: string): Promise<JournalTrade[]> {
  try {
    const rows = await getTradingJournalTrades(projectId);
    if (Array.isArray(rows) && rows.length > 0) {
      const dbTrades = rows.map(rowToTrade);
      saveLocalTrades(dbTrades);
      return dbTrades;
    }
  } catch (err) {
    // Graceful fallback to local storage
    console.warn('[journal] backend fetch failed, using local trades cache:', err);
  }

  return getLocalTrades();
}

/**
 * Save / Create trade into Backend API and LocalStorage
 */
export async function saveJournalTrade(
  trade: Partial<JournalTrade>,
  projectId?: string
): Promise<JournalTrade> {
  const assignedId = trade.id && UUID_REGEX.test(trade.id) ? trade.id : generateUuid();
  const fullTrade: JournalTrade = {
    id: assignedId,
    projectId,
    entryDate: trade.entryDate || new Date().toISOString().split('T')[0],
    entryTime: trade.entryTime || '09:30',
    exitDate: trade.exitDate,
    exitTime: trade.exitTime,
    instrument: (trade.instrument || 'EURUSD').toUpperCase(),
    direction: trade.direction || 'Buy',
    lots: trade.lots ?? 1,
    entryPrice: trade.entryPrice ?? 0,
    exitPrice: trade.exitPrice ?? 0,
    stopLoss: trade.stopLoss ?? null,
    takeProfit: trade.takeProfit ?? null,
    pnl: trade.pnl ?? 0,
    riskR: trade.riskR ?? null,
    returnR: trade.returnR ?? null,
    swap: trade.swap ?? 0,
    commission: trade.commission ?? 0,
    followedPlan: trade.followedPlan ?? true,
    planName: trade.planName || 'A+ Setup Checklist',
    confluences: trade.confluences || [],
    tradeManagement: trade.tradeManagement || '',
    mistakes: trade.mistakes || [],
    entryEmotion: trade.entryEmotion,
    exitEmotion: trade.exitEmotion,
    notes: trade.notes || '',
    chartHtf: trade.chartHtf,
    chartMtf: trade.chartMtf,
    chartLtf: trade.chartLtf,
    session: trade.session || 'London',
    duration: trade.duration || '15m',
    splitOrders: trade.splitOrders,
    source: trade.source || 'manual',
    createdAt: trade.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Save to local storage immediately
  const localList = getLocalTrades();
  const existingIdx = localList.findIndex((t) => t.id === assignedId);
  const updatedList =
    existingIdx >= 0
      ? localList.map((t, idx) => (idx === existingIdx ? fullTrade : t))
      : [fullTrade, ...localList];
  saveLocalTrades(updatedList);

  // 2. Sync to Backend API
  try {
    const rowPayload = tradeToRow(fullTrade, projectId);
    const savedRow = await saveTradingJournalTrade(rowPayload);
    if (savedRow && savedRow.id) {
      return rowToTrade(savedRow);
    }
  } catch (err) {
    console.warn('[journal] backend trade save failed, retained in local storage:', err);
  }

  return fullTrade;
}

/**
 * Delete a trade from Backend API and LocalStorage
 */
export async function deleteJournalTrade(tradeId: string): Promise<boolean> {
  const localList = getLocalTrades().filter((t) => t.id !== tradeId);
  saveLocalTrades(localList);

  try {
    if (UUID_REGEX.test(tradeId)) {
      await deleteBackendTrade(tradeId);
    }
  } catch (err) {
    console.warn('[journal] backend trade delete failed:', err);
  }

  return true;
}

/**
 * Upload Chart Image (HTF, MTF, LTF)
 * Stores via FileReader Data URI
 */
export async function uploadChartImage(
  file: File,
  timeframe: 'htf' | 'mtf' | 'ltf'
): Promise<string> {
  const base64Promise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return await base64Promise;
}
