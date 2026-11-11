import {
  getTradingJournalTrades,
  saveTradingJournalTrade,
  deleteTradingJournalTrade as deleteBackendTrade,
} from '@kortix/sdk';
import { Direction, JournalTrade } from './types';

const LOCAL_STORAGE_KEY = 'kortix_trading_journal_trades_v2';
const DAY_NOTES_STORAGE_KEY = 'kortix_trading_journal_day_notes_v1';
const PENDING_SYNC_KEY = 'kortix_trading_journal_pending_sync_v1';

interface PendingSyncState {
  upserts: Record<string, Record<string, unknown>>;
  deletes: string[];
}

function getPendingSync(): PendingSyncState {
  if (typeof window === 'undefined') return { upserts: {}, deletes: [] };
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return { upserts: {}, deletes: [] };
    const parsed = JSON.parse(raw);
    return {
      upserts: parsed?.upserts && typeof parsed.upserts === 'object' ? parsed.upserts : {},
      deletes: Array.isArray(parsed?.deletes) ? parsed.deletes : [],
    };
  } catch {
    return { upserts: {}, deletes: [] };
  }
}

function savePendingSync(state: PendingSyncState): void {
  if (typeof window === 'undefined') return;
  try {
    if (Object.keys(state.upserts).length === 0 && state.deletes.length === 0) {
      localStorage.removeItem(PENDING_SYNC_KEY);
    } else {
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(state));
    }
  } catch {
    // Fallback if large base64 exceeds quota inside pending sync queue
    try {
      const compactUpserts: Record<string, Record<string, unknown>> = {};
      for (const [id, row] of Object.entries(state.upserts)) {
        compactUpserts[id] = {
          ...row,
          chart_htf: typeof row.chart_htf === 'string' && row.chart_htf.startsWith('data:') ? null : row.chart_htf,
          chart_mtf: typeof row.chart_mtf === 'string' && row.chart_mtf.startsWith('data:') ? null : row.chart_mtf,
          chart_ltf: typeof row.chart_ltf === 'string' && row.chart_ltf.startsWith('data:') ? null : row.chart_ltf,
        };
      }
      localStorage.setItem(
        PENDING_SYNC_KEY,
        JSON.stringify({ upserts: compactUpserts, deletes: state.deletes })
      );
    } catch {
      // Ignore quota errors
    }
  }
}

function markPendingUpsert(id: string, rowPayload: Record<string, unknown>): void {
  const state = getPendingSync();
  state.upserts[id] = rowPayload;
  state.deletes = state.deletes.filter((d) => d !== id);
  savePendingSync(state);
}

function clearPendingUpsert(id: string): void {
  const state = getPendingSync();
  if (state.upserts[id]) {
    delete state.upserts[id];
    savePendingSync(state);
  }
}

function markPendingDelete(id: string): void {
  const state = getPendingSync();
  delete state.upserts[id];
  if (!state.deletes.includes(id)) {
    state.deletes.push(id);
  }
  savePendingSync(state);
}

function clearPendingDelete(id: string): void {
  const state = getPendingSync();
  if (state.deletes.includes(id)) {
    state.deletes = state.deletes.filter((d) => d !== id);
    savePendingSync(state);
  }
}

const inFlightUpserts = new Map<string, Promise<void>>();
const upsertSequence = new Map<string, number>();

function syncUpsertBackground(id: string, rowPayload: Record<string, unknown>): void {
  const seq = (upsertSequence.get(id) ?? 0) + 1;
  upsertSequence.set(id, seq);

  const prev = inFlightUpserts.get(id) ?? Promise.resolve();
  const task = prev
    .catch(() => undefined)
    .then(async () => {
      try {
        // Skip slow upload if already deleted before this request started
        if (getPendingSync().deletes.includes(id)) {
          return;
        }
        const savedRow = await saveTradingJournalTrade(rowPayload);
        // Only clear pending upsert if no newer edit queued while this one was in flight
        if (savedRow && savedRow.id && upsertSequence.get(id) === seq) {
          clearPendingUpsert(id);
        }
        // If user deleted the trade while POST was already in flight, ensure DB removes it
        if (getPendingSync().deletes.includes(id)) {
          await deleteBackendTrade(id);
          clearPendingDelete(id);
        }
      } catch (err) {
        console.warn('[journal] background trade save deferred to pending queue:', err);
      }
    })
    .finally(() => {
      if (inFlightUpserts.get(id) === task) {
        inFlightUpserts.delete(id);
      }
    });

  inFlightUpserts.set(id, task);
}

function syncDeleteBackground(tradeId: string): void {
  const pendingUpsert = inFlightUpserts.get(tradeId) ?? Promise.resolve();
  void pendingUpsert
    .catch(() => undefined)
    .then(async () => {
      try {
        await deleteBackendTrade(tradeId);
        clearPendingDelete(tradeId);
      } catch (err) {
        console.warn('[journal] background trade delete deferred to pending queue:', err);
      }
    });
}

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

function finiteNumberOr(val: unknown, fallback: number): number {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function finiteNumberOrNull(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function normalizeDirection(dir: unknown): Direction {
  const s = String(dir || 'Buy');
  if (s === 'Sell' || s === 'Short') return 'Sell';
  return 'Buy';
}

// Convert DB snake_case row to TS camelCase JournalTrade
function rowToTrade(row: any): JournalTrade {
  return {
    id: row.id,
    projectId: row.project_id || undefined,
    userId: row.user_id || undefined,
    entryDate: typeof row.entry_date === 'string' ? row.entry_date.split('T')[0] : String(row.entry_date || ''),
    entryTime: row.entry_time || '00:00',
    exitDate: typeof row.exit_date === 'string' ? row.exit_date.split('T')[0] : (row.exit_date || undefined),
    exitTime: row.exit_time || undefined,
    instrument: String(row.instrument || '').toUpperCase(),
    direction: normalizeDirection(row.direction),
    lots: Math.max(0, finiteNumberOr(row.lots, 0)),
    entryPrice: finiteNumberOr(row.entry_price, 0),
    exitPrice: finiteNumberOr(row.exit_price, 0),
    stopLoss: finiteNumberOrNull(row.stop_loss),
    takeProfit: finiteNumberOrNull(row.take_profit),
    pnl: finiteNumberOr(row.pnl, 0),
    riskR: finiteNumberOrNull(row.risk_r),
    returnR: finiteNumberOrNull(row.return_r),
    swap: finiteNumberOr(row.swap, 0),
    commission: finiteNumberOr(row.commission, 0),
    followedPlan: row.followed_plan !== false,
    planName: typeof row.plan_name === 'string' ? row.plan_name : '',
    confluences: Array.isArray(row.confluences) ? row.confluences.filter((c: unknown) => typeof c === 'string' && c.trim()) : [],
    tradeManagement: typeof row.trade_management === 'string' ? row.trade_management : '',
    mistakes: Array.isArray(row.mistakes) ? row.mistakes.filter((m: unknown) => typeof m === 'string' && m.trim()) : [],
    entryEmotion: row.entry_emotion || undefined,
    exitEmotion: row.exit_emotion || undefined,
    notes: typeof row.notes === 'string' ? row.notes : '',
    chartHtf: row.chart_htf || undefined,
    chartMtf: row.chart_mtf || undefined,
    chartLtf: row.chart_ltf || undefined,
    session: row.session || 'London',
    duration: typeof row.duration === 'string' ? row.duration : '',
    splitOrders: Array.isArray(row.split_orders) && row.split_orders.length > 0
      ? row.split_orders.map((so: any, idx: number) => ({
          id: so.id ? String(so.id) : String(so.orderId || idx + 1),
          orderNumber: Number(so.orderNumber || so.orderId || idx + 1),
          lots: finiteNumberOr(so.lots, 0),
          entryPrice: finiteNumberOr(so.entryPrice ?? so.price, 0),
          exitPrice: finiteNumberOr(so.exitPrice ?? so.price, 0),
          sl: so.sl ? String(so.sl) : undefined,
          tp: so.tp ? String(so.tp) : undefined,
        }))
      : undefined,
    source: row.source === 'auto' ? 'auto' : 'manual',
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
    instrument: (trade.instrument || 'EURUSD').trim().toUpperCase(),
    direction: normalizeDirection(trade.direction),
    lots: Math.max(0, finiteNumberOr(trade.lots, 0)),
    entry_price: finiteNumberOr(trade.entryPrice, 0),
    exit_price: finiteNumberOr(trade.exitPrice, 0),
    stop_loss: finiteNumberOrNull(trade.stopLoss),
    take_profit: finiteNumberOrNull(trade.takeProfit),
    pnl: finiteNumberOr(trade.pnl, 0),
    risk_r: finiteNumberOrNull(trade.riskR),
    return_r: finiteNumberOrNull(trade.returnR),
    swap: finiteNumberOr(trade.swap, 0),
    commission: finiteNumberOr(trade.commission, 0),
    followed_plan: trade.followedPlan ?? true,
    plan_name: trade.planName?.trim() || null,
    confluences: trade.confluences || [],
    trade_management: trade.tradeManagement?.trim() || null,
    mistakes: trade.mistakes || [],
    entry_emotion: trade.entryEmotion || null,
    exit_emotion: trade.exitEmotion || null,
    notes: trade.notes?.trim() ? trade.notes : null,
    chart_htf: trade.chartHtf || null,
    chart_mtf: trade.chartMtf || null,
    chart_ltf: trade.chartLtf || null,
    session: trade.session || 'London',
    duration: trade.duration?.trim() || null,
    split_orders: trade.splitOrders || [],
    source: trade.source === 'auto' ? 'auto' : 'manual',
  };
}

/** Sort newest date first, then newest entry time first */
export function sortJournalTrades(trades: JournalTrade[]): JournalTrade[] {
  return [...trades].sort((a, b) => {
    const dateCmp = (b.entryDate || '').localeCompare(a.entryDate || '');
    if (dateCmp !== 0) return dateCmp;
    const timeCmp = (b.entryTime || '00:00').localeCompare(a.entryTime || '00:00');
    if (timeCmp !== 0) return timeCmp;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

// Local storage fallback helpers
export function getLocalTrades(): JournalTrade[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortJournalTrades(parsed) : [];
  } catch {
    return [];
  }
}

function saveLocalTrades(trades: JournalTrade[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trades));
  } catch {
    // QuotaExceededError fallback: strip large base64 chart images in localStorage cache only
    try {
      const stripped = trades.map((t) => ({
        ...t,
        chartHtf: t.chartHtf?.startsWith('data:') ? undefined : t.chartHtf,
        chartMtf: t.chartMtf?.startsWith('data:') ? undefined : t.chartMtf,
        chartLtf: t.chartLtf?.startsWith('data:') ? undefined : t.chartLtf,
      }));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stripped));
    } catch (innerErr) {
      console.error('Failed to save trades to local storage:', innerErr);
    }
  }
}

/**
 * Fetch all trades for project, flushing any pending instant mutations first
 */
export async function getJournalTrades(projectId?: string): Promise<JournalTrade[]> {
  try {
    // Replay any queued optimistic saves/deletes from an immediate reload before reading DB
    const pending = getPendingSync();
    if (pending.deletes.length > 0 || Object.keys(pending.upserts).length > 0) {
      await Promise.allSettled([
        ...pending.deletes.map(async (id) => {
          if (UUID_REGEX.test(id)) {
            await deleteBackendTrade(id);
          }
          clearPendingDelete(id);
        }),
        ...Object.entries(pending.upserts).map(async ([id, row]) => {
          const savedRow = await saveTradingJournalTrade(row);
          if (savedRow && savedRow.id) {
            clearPendingUpsert(id);
          }
        }),
      ]);
    }

    const rows = await getTradingJournalTrades(projectId);
    if (Array.isArray(rows)) {
      const remaining = getPendingSync();
      const deletedSet = new Set(remaining.deletes);
      const dbMap = new Map<string, JournalTrade>();
      rows.forEach((r) => {
        const t = rowToTrade(r);
        if (!deletedSet.has(t.id)) {
          dbMap.set(t.id, t);
        }
      });
      // Re-apply any offline/still-pending upserts on top
      for (const [id, pendingRow] of Object.entries(remaining.upserts)) {
        if (!deletedSet.has(id)) {
          dbMap.set(id, rowToTrade(pendingRow));
        }
      }
      const merged = sortJournalTrades(Array.from(dbMap.values()));
      saveLocalTrades(merged);
      return merged;
    }
  } catch (err) {
    console.warn('[journal] backend fetch failed, using local trades cache:', err);
  }

  return getLocalTrades();
}

/**
 * Save / Create / Update trade INSTANTLY locally and sync Backend API in background
 */
export async function saveJournalTrade(
  trade: Partial<JournalTrade>,
  projectId?: string
): Promise<JournalTrade> {
  const assignedId = trade.id && UUID_REGEX.test(trade.id) ? trade.id : generateUuid();
  const fullTrade: JournalTrade = {
    id: assignedId,
    projectId: projectId || trade.projectId,
    entryDate: trade.entryDate || new Date().toISOString().split('T')[0],
    entryTime: trade.entryTime || '09:30',
    exitDate: trade.exitDate,
    exitTime: trade.exitTime,
    instrument: (trade.instrument || 'EURUSD').trim().toUpperCase(),
    direction: normalizeDirection(trade.direction),
    lots: Math.max(0, finiteNumberOr(trade.lots, 0)),
    entryPrice: finiteNumberOr(trade.entryPrice, 0),
    exitPrice: finiteNumberOr(trade.exitPrice, 0),
    stopLoss: finiteNumberOrNull(trade.stopLoss),
    takeProfit: finiteNumberOrNull(trade.takeProfit),
    pnl: finiteNumberOr(trade.pnl, 0),
    riskR: finiteNumberOrNull(trade.riskR),
    returnR: finiteNumberOrNull(trade.returnR),
    swap: finiteNumberOr(trade.swap, 0),
    commission: finiteNumberOr(trade.commission, 0),
    followedPlan: trade.followedPlan ?? true,
    planName: trade.planName?.trim() || '',
    confluences: trade.confluences || [],
    tradeManagement: trade.tradeManagement?.trim() || '',
    mistakes: trade.mistakes || [],
    entryEmotion: trade.entryEmotion,
    exitEmotion: trade.exitEmotion,
    notes: trade.notes || '',
    chartHtf: trade.chartHtf,
    chartMtf: trade.chartMtf,
    chartLtf: trade.chartLtf,
    session: trade.session || 'London',
    duration: trade.duration?.trim() || '',
    splitOrders: trade.splitOrders,
    source: trade.source === 'auto' ? 'auto' : 'manual',
    createdAt: trade.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Update localStorage immediately so UI transitions in <5ms
  const localList = getLocalTrades();
  const existingIdx = localList.findIndex((t) => t.id === assignedId);
  const updatedList = sortJournalTrades(
    existingIdx >= 0
      ? localList.map((t, idx) => (idx === existingIdx ? fullTrade : t))
      : [fullTrade, ...localList]
  );
  saveLocalTrades(updatedList);

  // 2. Queue & fire non-blocking Backend API sync
  const rowPayload = tradeToRow(fullTrade, projectId || trade.projectId);
  markPendingUpsert(assignedId, rowPayload);
  void syncUpsertBackground(assignedId, rowPayload);

  return fullTrade;
}

/**
 * Delete a trade INSTANTLY locally and sync Backend API in background
 */
export async function deleteJournalTrade(tradeId: string): Promise<boolean> {
  const localList = getLocalTrades().filter((t) => t.id !== tradeId);
  saveLocalTrades(localList);

  if (UUID_REGEX.test(tradeId)) {
    markPendingDelete(tradeId);
    void syncDeleteBackground(tradeId);
  }

  return true;
}

/**
 * Per-date daily journal notes persisted locally
 */
export function getDayNote(date: string): string {
  if (typeof window === 'undefined' || !date) return '';
  try {
    const raw = localStorage.getItem(DAY_NOTES_STORAGE_KEY);
    if (!raw) return '';
    const map = JSON.parse(raw) as Record<string, string>;
    return typeof map[date] === 'string' ? map[date] : '';
  } catch {
    return '';
  }
}

export function saveDayNote(date: string, note: string): void {
  if (typeof window === 'undefined' || !date) return;
  try {
    const raw = localStorage.getItem(DAY_NOTES_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    if (note.trim()) {
      map[date] = note;
    } else {
      delete map[date];
    }
    localStorage.setItem(DAY_NOTES_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save day note:', err);
  }
}

/**
 * Upload Chart Image (HTF, MTF, LTF)
 * Validates image type and compresses large screenshots into crisp WebP/JPEG Data URI
 * to prevent localStorage quota exhaustion and oversized DB payloads.
 */
export async function uploadChartImage(
  file: File,
  _timeframe: 'htf' | 'mtf' | 'ltf'
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload a valid image file (PNG, JPG, WebP).');
  }
  const MAX_RAW_SIZE = 15 * 1024 * 1024; // 15MB sanity limit
  if (file.size > MAX_RAW_SIZE) {
    throw new Error('Image exceeds 15MB maximum upload limit.');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  // Preserve exact original resolution & crispness (zero lossy compression up to 8MB)
  if (file.size <= 8 * 1024 * 1024 || file.type === 'image/svg+xml' || typeof document === 'undefined') {
    return rawDataUrl;
  }

  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIM = 3840;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/webp', 0.95);
      if (compressed.startsWith('data:image/webp') && compressed.length < rawDataUrl.length) {
        resolve(compressed);
      } else {
        const png = canvas.toDataURL('image/png');
        resolve(png.length < rawDataUrl.length ? png : rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}
