import { JournalTrade, Direction } from './types';
import { getLocalTrades } from './storage';
import { formatSimpleTime } from '@/features/trading/dhanOrdersSync';

/**
 * Calculate Indian Stock Exchange (NSE/BSE) estimated statutory charges
 * - STT: 0.1% on delivery or 0.025% on intraday sell
 * - Exchange turnover charge: ~0.00325%
 * - GST: 18% on exchange charges & brokerage
 * - SEBI charges: ₹10 per crore
 * - Stamp Duty: 0.015% on buy
 */
export function estimateIndianCharges(
  buyPrice: number,
  sellPrice: number,
  qty: number,
  isIntraday = true
): number {
  const buyTurnover = buyPrice * qty;
  const sellTurnover = sellPrice * qty;
  const totalTurnover = buyTurnover + sellTurnover;

  const stt = isIntraday ? sellTurnover * 0.00025 : totalTurnover * 0.001;
  const exchangeTxn = totalTurnover * 0.0000325;
  const gst = exchangeTxn * 0.18;
  const sebiCharges = (totalTurnover / 10000000) * 10;
  const stampDuty = buyTurnover * 0.00015;

  const totalCharges = stt + exchangeTxn + gst + sebiCharges + stampDuty;
  return Number(totalCharges.toFixed(2));
}

/**
 * Format timestamp into Asia/Kolkata (IST) date and time strings
 */
export function formatToKolkataTime(timestamp: string | Date | number): { date: string; time: string } {
  if (typeof timestamp === 'string' && !timestamp.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(timestamp)) {
    // Naive IST timestamp from Dhan without timezone offset
    const clean = timestamp.trim();
    const parts = clean.split(/[T ]+/);
    if (parts[0] && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
      return {
        date: parts[0],
        time: (parts[1] || '09:30').slice(0, 5),
      };
    }
  }
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) {
    return { date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), time: '09:30' };
  }
  const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const timeStr = d.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  return { date: dateStr, time: timeStr };
}

/**
 * Determine the global trading session based on Asia/Kolkata (IST) time:
 * - 9:30 AM – 12:30 PM: Asian (Tokyo & Sydney) Sessions
 * - 12:30 PM – 1:30 PM: Asian (Tokyo Session)
 * - 1:30 PM – 2:30 PM: Tokyo + London Overlap
 * - 2:30 PM – 3:30 PM: London Session
 * - 7:00 PM – 1:30 AM: New York Session
 */
export function getIndianTradingSession(timeStr: string): string {
  if (!timeStr) return 'Asian (Tokyo & Sydney)';
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const totalMins = (isNaN(h) ? 9 : h) * 60 + (isNaN(m) ? 30 : m);

  // 9:15 AM - 12:30 PM: Indian Market + Asian (Tokyo & Sydney)
  if (totalMins >= 555 && totalMins < 750) {
    return 'Asian (Tokyo & Sydney)';
  }
  // 12:30 PM - 1:30 PM: Indian Market + Tokyo Session
  else if (totalMins >= 750 && totalMins < 810) {
    return 'Asian (Tokyo Session)';
  }
  // 1:30 PM - 2:30 PM: Tokyo + London Overlap
  else if (totalMins >= 810 && totalMins < 870) {
    return 'Tokyo + London Overlap';
  }
  // 2:30 PM - 3:30 PM: Indian Market + London Session
  else if (totalMins >= 870 && totalMins <= 930) {
    return 'London Session';
  }
  // 7:00 PM - 1:30 AM: New York Session
  else if (totalMins >= 1140 || totalMins < 90) {
    return 'New York Session';
  }
  // 3:30 PM - 7:00 PM: European / London late session
  else if (totalMins > 930 && totalMins < 1140) {
    return 'London Session';
  }
  return 'Asian Pre-Market';
}

/**
 * Match raw chronological executions into consolidated round-trip trades
 * (Multiple partial fills & scale-in/scale-out orders for one position from open to flat = 1 trade)
 */
export function matchDhanExecutions(
  executions: any[],
  existingTrades: JournalTrade[] = [],
  projectId?: string
): JournalTrade[] {
  const existingMap = new Map<string, JournalTrade>();
  for (const t of existingTrades) {
    existingMap.set(t.id, t);
  }

  // Step 1: Accumulate partial fills sharing the same orderId
  const orderGrouped = new Map<string, any>();
  for (const raw of executions) {
    const orderId = String(raw.orderId || raw.exchangeOrderId || Math.random().toString(36).substring(7));
    const qty = Number(raw.tradedQuantity || raw.quantity || 0);
    const price = Number(raw.tradedPrice || raw.price || 0);
    const statFee = Number(
      (
        (raw.brokerageCharges || 0) +
        (raw.exchangeTransactionCharges || 0) +
        (raw.sebiTax || 0) +
        (raw.serviceTax || 0) +
        (raw.stampDuty || 0) +
        (raw.stt || 0)
      ).toFixed(4)
    );
    if (orderGrouped.has(orderId)) {
      const prev = orderGrouped.get(orderId)!;
      const totalQty = prev.qty + qty;
      prev.price = totalQty > 0 ? (prev.price * prev.qty + price * qty) / totalQty : price;
      prev.qty = totalQty;
      prev.statFee += statFee;
    } else {
      orderGrouped.set(orderId, {
        ...raw,
        orderId,
        qty,
        price,
        statFee,
        time: raw.exchangeTime || raw.createTime || new Date().toISOString(),
      });
    }
  }

  // Sort chronological ascending
  const sorted = [...orderGrouped.values()].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  // Step 2: Consolidate each full position lifecycle (0 -> open -> 0 flat) per symbol into ONE trade
  interface ActivePosition {
    isLong: boolean;
    netQty: number;
    entryQty: number;
    entryValueSum: number;
    exitQty: number;
    exitValueSum: number;
    totalFees: number;
    firstOrderId: string;
    lastOrderId: string;
    firstTime: string;
    lastTime: string;
    isIntraday: boolean;
  }

  const activeBySym: Record<string, ActivePosition> = {};
  const completedTrades: JournalTrade[] = [];

  for (const tr of sorted) {
    const rawSym = tr.customSymbol || tr.tradingSymbol || tr.securityId || 'STOCK';
    const sym = rawSym.replace(/^NSE:/, '').replace(/\.NS$/, '');
    const side = (tr.transactionType || 'BUY').toUpperCase(); // BUY or SELL
    let qty = Number(tr.qty || 0);
    if (qty <= 0) continue;
    const price = Number(tr.price || 0);
    const time = tr.time;
    const isIntraday = String(tr.productType || 'INTRADAY').toUpperCase() === 'INTRADAY';
    const feePerUnit = tr.qty > 0 ? tr.statFee / tr.qty : 0;

    while (qty > 0) {
      let pos = activeBySym[sym];
      if (!pos) {
        pos = {
          isLong: side === 'BUY',
          netQty: 0,
          entryQty: 0,
          entryValueSum: 0,
          exitQty: 0,
          exitValueSum: 0,
          totalFees: 0,
          firstOrderId: tr.orderId,
          lastOrderId: tr.orderId,
          firstTime: time,
          lastTime: time,
          isIntraday,
        };
        activeBySym[sym] = pos;
      }

      const isSameDirection = (pos.isLong && side === 'BUY') || (!pos.isLong && side === 'SELL');
      if (isSameDirection) {
        pos.netQty += qty;
        pos.entryQty += qty;
        pos.entryValueSum += price * qty;
        pos.totalFees += feePerUnit * qty;
        pos.lastOrderId = tr.orderId;
        pos.lastTime = time;
        qty = 0;
      } else {
        const closeQty = Math.min(pos.netQty, qty);
        pos.netQty -= closeQty;
        pos.exitQty += closeQty;
        pos.exitValueSum += price * closeQty;
        pos.totalFees += feePerUnit * closeQty;
        pos.lastOrderId = tr.orderId;
        pos.lastTime = time;
        qty -= closeQty;

        // Position returned to 0 (flat): emit ONE consolidated round-trip trade!
        if (pos.netQty <= 0) {
          const avgEntry = pos.entryQty > 0 ? pos.entryValueSum / pos.entryQty : 0;
          const avgExit = pos.exitQty > 0 ? pos.exitValueSum / pos.exitQty : 0;
          const totalLots = pos.entryQty;

          const grossPnl = pos.isLong
            ? (avgExit - avgEntry) * totalLots
            : (avgEntry - avgExit) * totalLots;

          const tradeFees =
            pos.totalFees > 0
              ? Number(pos.totalFees.toFixed(2))
              : estimateIndianCharges(
                  pos.isLong ? avgEntry : avgExit,
                  pos.isLong ? avgExit : avgEntry,
                  totalLots,
                  pos.isIntraday
                );
          const netPnl = Number((grossPnl - tradeFees).toFixed(2));

          const entryIst = formatToKolkataTime(pos.firstTime || new Date());
          const exitIst = formatToKolkataTime(pos.lastTime || new Date());
          const entryDate = entryIst.date;
          const entryTime = formatSimpleTime(entryIst.time);
          const exitDate = exitIst.date;
          const exitTime = formatSimpleTime(exitIst.time);

          const riskPerShare = Math.max(0.5, avgEntry * 0.01);
          const riskR = Number((riskPerShare * totalLots).toFixed(2));
          const returnR = riskR > 0 ? Number((netPnl / riskR).toFixed(2)) : null;

          const stopLoss = pos.isLong
            ? Number((avgEntry - riskPerShare).toFixed(2))
            : Number((avgEntry + riskPerShare).toFixed(2));
          const takeProfit = pos.isLong
            ? Number((avgEntry + riskPerShare * 2).toFixed(2))
            : Number((avgEntry - riskPerShare * 2).toFixed(2));

          const tradeId = `dhan_${pos.firstOrderId}_${pos.lastOrderId}_${totalLots}`;
          const existing = existingMap.get(tradeId);

          completedTrades.push({
            id: tradeId,
            projectId: projectId || existing?.projectId,
            instrument: sym,
            direction: (pos.isLong ? 'Buy' : 'Sell') as Direction,
            lots: totalLots,
            entryPrice: Number(avgEntry.toFixed(2)),
            exitPrice: Number(avgExit.toFixed(2)),
            stopLoss: existing?.stopLoss ?? stopLoss,
            takeProfit: existing?.takeProfit ?? takeProfit,
            entryDate,
            entryTime,
            exitDate,
            exitTime,
            session: getIndianTradingSession(entryTime),
            pnl: netPnl,
            commission: tradeFees,
            swap: 0,
            riskR: existing?.riskR ?? riskR,
            returnR: existing?.returnR ?? returnR,
            followedPlan: existing?.followedPlan ?? true,
            planName: existing?.planName || 'DhanHQ Execution',
            confluences: existing?.confluences || [],
            mistakes: existing?.mistakes || [],
            notes: existing?.notes && !existing.notes.trim().startsWith('Dhan execution order #') ? existing.notes : '',
            chartHtf: existing?.chartHtf,
            chartMtf: existing?.chartMtf,
            chartLtf: existing?.chartLtf,
            source: 'auto',
            createdAt: existing?.createdAt || pos.firstTime,
            updatedAt: new Date().toISOString(),
          });

          delete activeBySym[sym];
        }
      }
    }
  }

  return completedTrades.reverse();
}

/**
 * Fetch and sync all trades from Dhan account into the Journal
 * Prioritizes Supabase cache to avoid unnecessary calls to Dhan API
 */
let lastBackgroundDhanReconcileAt = 0;
let journalSyncInFlight: Promise<{ syncedCount: number; trades: JournalTrade[] }> | null = null;

function stableTradesChanged(prevRaw: string | null, nextTrades: JournalTrade[]): boolean {
  if (!prevRaw) return true;
  try {
    const nextJson = JSON.stringify(nextTrades);
    return prevRaw !== nextJson;
  } catch {
    return true;
  }
}

export function syncDhanTradesToJournal(
  projectId?: string,
  forceRefresh = false
): Promise<{
  syncedCount: number;
  trades: JournalTrade[];
}> {
  if (journalSyncInFlight) return journalSyncInFlight;
  journalSyncInFlight = syncDhanTradesToJournalRemote(projectId, forceRefresh).finally(() => {
    journalSyncInFlight = null;
  });
  return journalSyncInFlight;
}

async function syncDhanTradesToJournalRemote(
  projectId?: string,
  forceRefresh = false
): Promise<{
  syncedCount: number;
  trades: JournalTrade[];
}> {
  try {
    // 1. Check Supabase first (if not force refresh)
    if (!forceRefresh) {
      try {
        const supabaseRes = await fetch('/api/journal/supabase')
          .then((r) => r.json())
          .catch(() => null);

        if (supabaseRes?.ok && Array.isArray(supabaseRes.data) && supabaseRes.data.length > 0) {
          const cachedTrades: JournalTrade[] = supabaseRes.data.map((r: any) => ({
            id: r.id,
            projectId: r.project_id || projectId,
            instrument: r.instrument,
            direction: (r.direction || 'Buy') as Direction,
            lots: Number(r.lots || 1),
            entryPrice: Number(r.entry_price || 0),
            exitPrice: Number(r.exit_price || 0),
            entryDate: String(r.entry_date || '').trim().split(/[T ]+/)[0],
            entryTime: r.entry_time || '09:30',
            exitDate: String(r.exit_date || r.entry_date || '').trim().split(/[T ]+/)[0],
            exitTime: r.exit_time || '15:30',
            pnl: Number(r.pnl || 0),
            commission: Number(r.commission || 0),
            swap: Number(r.swap || 0),
            stopLoss: r.stop_loss,
            takeProfit: r.take_profit,
            riskR: r.risk_r,
            returnR: r.return_r,
            session: r.session || 'Asian (Tokyo & Sydney)',
            followedPlan: r.followed_plan ?? true,
            planName: r.plan_name || 'DhanHQ Execution',
            confluences: Array.isArray(r.confluences) ? r.confluences : [],
            mistakes: Array.isArray(r.mistakes) ? r.mistakes : [],
            notes: typeof r.notes === 'string' && !r.notes.trim().startsWith('Dhan execution order #') ? r.notes : '',
            chartHtf: r.chart_htf,
            chartMtf: r.chart_mtf,
            chartLtf: r.chart_ltf,
            source: r.source || 'auto',
          }));

          if (typeof window !== 'undefined') {
            const cleanedCache = cachedTrades.filter((t) => !String(t.id || '').includes('_test'));
            const prevRaw = localStorage.getItem('kortix_trading_journal_trades_v2');
            if (stableTradesChanged(prevRaw, cleanedCache)) {
              localStorage.setItem(
                'kortix_trading_journal_trades_v2',
                JSON.stringify(cleanedCache)
              );
              window.dispatchEvent(
                new CustomEvent('trading-journal-updated', { detail: cleanedCache })
              );
            }
            // No background auto-reconcile against Dhan API here.
            // The WebSocket handles live order/trade events; Supabase is the source of truth.
            // Auto-reconciling on a timer causes the calendar to blank when the token expires.
          }

          return {
            syncedCount: cachedTrades.filter((t) => !String(t.id || '').includes('_test')).length,
            trades: cachedTrades.filter((t) => !String(t.id || '').includes('_test')),
          };
        }
      } catch (err) {
        console.warn('Failed to load trades from Supabase cache, fallback to Dhan API:', err);
      }
    }

    // 2. Fetch all trades and funds concurrently from Dhan API (authenticated via httpOnly cookie)
    const [allTradesRes, fundsRes] = await Promise.all([
      fetch('/api/dhan?action=all_trades', { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/dhan?action=funds', { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({ data: {} })),
    ]);

    const executions = Array.isArray(allTradesRes?.data) ? allTradesRes.data : [];

    // 3. Fetch existing trades from local storage
    const allLocal = getLocalTrades();
    const currentTrades = allLocal.filter(
      (t) => t.source === 'auto' || t.id.startsWith('dhan_')
    );
    const manualTrades = allLocal.filter(
      (t) => t.source !== 'auto' && !t.id.startsWith('dhan_')
    );

    // 4. Match round-trip trades
    const matchedTrades = matchDhanExecutions(executions, currentTrades, projectId);
    const combinedTrades = [...matchedTrades, ...manualTrades];

    // 5. Save to localStorage and persist to Supabase
    // Guard: never overwrite existing local trades with an empty result — Dhan API
    // returns 0 trades when the token has just expired; that would blank the journal.
    const existingRaw = typeof window !== 'undefined' ? localStorage.getItem('kortix_trading_journal_trades_v2') : null;
    const existingCount = existingRaw ? (() => { try { const p = JSON.parse(existingRaw); return Array.isArray(p) ? p.length : 0; } catch { return 0; } })() : 0;
    const shouldWrite = combinedTrades.length > 0 || existingCount === 0;

    if (typeof window !== 'undefined' && shouldWrite) {
      localStorage.setItem('kortix_trading_journal_trades_v2', JSON.stringify(combinedTrades));

      const avail = Number(fundsRes?.data?.availabelBalance || fundsRes?.data?.sodLimit || 0);
      if (avail > 0) {
        localStorage.setItem('kortix_trading_dhan_funds', JSON.stringify(fundsRes.data));
      }

      window.dispatchEvent(new CustomEvent('trading-journal-updated', { detail: combinedTrades }));

      // Persist to Supabase database so future visits never need to call Dhan again
      try {
        fetch('/api/journal/supabase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trades: matchedTrades, replaceAuto: true }),
        }).catch((err) => console.warn('Supabase journal async persist error:', err));
      } catch {}
    }

    return {
      syncedCount: matchedTrades.length,
      trades: matchedTrades,
    };
  } catch (error) {
    console.error('Error syncing Dhan trades to journal:', error);
    return {
      syncedCount: 0,
      trades: getLocalTrades(),
    };
  }
}

/**
 * Reset old mock trades and start fresh with real Dhan data
 */
export function clearMockTrades(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('kortix_trading_journal_trades_v2');
    window.dispatchEvent(new CustomEvent('trading-journal-updated', { detail: [] }));
  } catch {}
}
