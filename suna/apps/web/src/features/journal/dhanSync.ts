import { JournalTrade, Direction } from './types';
import { getLocalTrades } from './storage';

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
  if (typeof timestamp === 'string' && timestamp.includes('T')) {
    const parts = timestamp.split('T');
    const dateStr = parts[0];
    const timeStr = (parts[1] || '09:30').slice(0, 5);
    return { date: dateStr, time: timeStr };
  }
  const d = new Date(timestamp);
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
 * Match raw chronological executions into completed round-trip trades
 */
export function matchDhanExecutions(
  executions: any[],
  existingTrades: JournalTrade[] = [],
  projectId?: string
): JournalTrade[] {
  // Index existing trades by ID so we don't overwrite user notes / confluences / chartHtf
  const existingMap = new Map<string, JournalTrade>();
  for (const t of existingTrades) {
    existingMap.set(t.id, t);
  }

  // Sort chronological ascending
  const sorted = [...executions].sort(
    (a, b) => new Date(a.exchangeTime || a.createTime).getTime() - new Date(b.exchangeTime || b.createTime).getTime()
  );

  const openPositions: Record<string, any[]> = {};
  const completedTrades: JournalTrade[] = [];

  for (const tr of sorted) {
    const rawSym = tr.customSymbol || tr.tradingSymbol || tr.securityId || 'STOCK';
    const sym = rawSym.replace(/^NSE:/, '').replace(/\.NS$/, '');
    if (!openPositions[sym]) openPositions[sym] = [];

    const side = (tr.transactionType || 'BUY').toUpperCase(); // BUY or SELL
    let remainingQty = Number(tr.tradedQuantity || tr.quantity || 0);
    const price = Number(tr.tradedPrice || tr.price || 0);
    const time = tr.exchangeTime || tr.createTime || new Date().toISOString();

    // Exact statutory charges from Dhan or estimated fallback
    const statFee = Number(
      (
        (tr.brokerageCharges || 0) +
        (tr.exchangeTransactionCharges || 0) +
        (tr.sebiTax || 0) +
        (tr.serviceTax || 0) +
        (tr.stampDuty || 0) +
        (tr.stt || 0)
      ).toFixed(2)
    );
    const totalFee = statFee > 0 ? statFee : estimateIndianCharges(price, price, remainingQty, true);
    const feePerUnit = remainingQty > 0 ? totalFee / remainingQty : 0;

    const oppositeSide = side === 'BUY' ? 'SELL' : 'BUY';

    while (remainingQty > 0 && openPositions[sym].length > 0) {
      const matchIdx = openPositions[sym].findIndex((o) => o.side === oppositeSide);
      if (matchIdx === -1) break;

      const openOrder = openPositions[sym][matchIdx];
      const matchQty = Math.min(openOrder.qty, remainingQty);

      const isLong = openOrder.side === 'BUY';
      const entryPrice = openOrder.price;
      const exitPrice = price;

      // Profit & Loss calculation:
      // For Long: (Exit - Entry) * Qty
      // For Short: (Entry - Exit) * Qty
      const grossPnl = isLong ? (exitPrice - entryPrice) * matchQty : (entryPrice - exitPrice) * matchQty;
      const openFeePortion = Number((openOrder.feePerUnit * matchQty).toFixed(2));
      const closeFeePortion = Number((feePerUnit * matchQty).toFixed(2));
      const tradeFees = Number((openFeePortion + closeFeePortion).toFixed(2));
      const netPnl = Number((grossPnl - tradeFees).toFixed(2));

      const entryParts = (openOrder.time || '').split('T');
      const exitParts = (time || '').split('T');

      const entryDate = entryParts[0] || new Date().toISOString().split('T')[0];
      const entryTime = (entryParts[1] || '09:30').slice(0, 5);
      const exitDate = exitParts[0] || entryDate;
      const exitTime = (exitParts[1] || '15:30').slice(0, 5);

      // Estimated Risk & Return calculation:
      // Default risk is 1% of entry price or min ₹0.50 per share
      const riskPerShare = Math.max(0.5, entryPrice * 0.01);
      const riskR = Number((riskPerShare * matchQty).toFixed(2));
      const returnR = riskR > 0 ? Number((netPnl / riskR).toFixed(2)) : null;

      // Auto-calculated Stop Loss & Take Profit:
      const stopLoss = isLong
        ? Number((entryPrice - riskPerShare).toFixed(2))
        : Number((entryPrice + riskPerShare).toFixed(2));
      const takeProfit = isLong
        ? Number((entryPrice + riskPerShare * 2).toFixed(2))
        : Number((entryPrice - riskPerShare * 2).toFixed(2));

      const tradeId = `dhan_${openOrder.orderId}_${tr.orderId}_${matchQty}`;
      const existing = existingMap.get(tradeId);

      const journalTrade: JournalTrade = {
        id: tradeId,
        projectId: projectId || existing?.projectId,
        instrument: sym,
        direction: (isLong ? 'Buy' : 'Sell') as Direction,
        lots: matchQty,
        entryPrice: Number(entryPrice.toFixed(2)),
        exitPrice: Number(exitPrice.toFixed(2)),
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
        notes: existing?.notes || `Dhan execution order #${openOrder.orderId} & #${tr.orderId}. Product: ${tr.productType || 'INTRADAY'}. Segment: ${tr.exchangeSegment || 'NSE_EQ'}.`,
        chartHtf: existing?.chartHtf,
        chartMtf: existing?.chartMtf,
        chartLtf: existing?.chartLtf,
        source: 'auto',
        createdAt: existing?.createdAt || openOrder.time,
        updatedAt: new Date().toISOString(),
      };

      completedTrades.push(journalTrade);

      remainingQty -= matchQty;
      openOrder.qty -= matchQty;
      if (openOrder.qty <= 0) {
        openPositions[sym].splice(matchIdx, 1);
      }
    }

    if (remainingQty > 0) {
      openPositions[sym].push({
        orderId: tr.orderId || Math.random().toString(36).substring(7),
        side,
        qty: remainingQty,
        price,
        time,
        feePerUnit,
      });
    }
  }

  // Sort newest first
  return completedTrades.reverse();
}

/**
 * Fetch and sync all trades from Dhan account into the Journal
 * Prioritizes Supabase cache to avoid unnecessary calls to Dhan API
 */
export async function syncDhanTradesToJournal(
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
            entryDate: r.entry_date,
            entryTime: r.entry_time || '09:30',
            exitDate: r.exit_date || r.entry_date,
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
            notes: r.notes || '',
            chartHtf: r.chart_htf,
            chartMtf: r.chart_mtf,
            chartLtf: r.chart_ltf,
            source: r.source || 'auto',
          }));

          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'kortix_trading_journal_trades_v2',
              JSON.stringify(cachedTrades)
            );
            window.dispatchEvent(
              new CustomEvent('trading-journal-updated', { detail: cachedTrades })
            );
          }

          return {
            syncedCount: cachedTrades.length,
            trades: cachedTrades,
          };
        }
      } catch (err) {
        console.warn('Failed to load trades from Supabase cache, fallback to Dhan API:', err);
      }
    }

    // 2. Fetch all trades and funds concurrently from Dhan API
    const [allTradesRes, fundsRes] = await Promise.all([
      fetch('/api/dhan?action=all_trades').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/dhan?action=funds').then((r) => r.json()).catch(() => ({ data: {} })),
    ]);

    const executions = Array.isArray(allTradesRes?.data) ? allTradesRes.data : [];

    // 3. Fetch existing trades from local storage
    const currentTrades = getLocalTrades().filter(
      (t) => t.source === 'auto' || t.id.startsWith('dhan_')
    );

    // 4. Match round-trip trades
    const matchedTrades = matchDhanExecutions(executions, currentTrades, projectId);

    // 5. Save to localStorage and persist to Supabase
    if (typeof window !== 'undefined') {
      localStorage.setItem('kortix_trading_journal_trades_v2', JSON.stringify(matchedTrades));

      const avail = Number(fundsRes?.data?.availabelBalance || fundsRes?.data?.sodLimit || 0);
      if (avail > 0) {
        localStorage.setItem('kortix_trading_dhan_funds', JSON.stringify(fundsRes.data));
      }

      window.dispatchEvent(new CustomEvent('trading-journal-updated', { detail: matchedTrades }));

      // Persist to Supabase database so future visits never need to call Dhan again
      try {
        fetch('/api/journal/supabase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trades: matchedTrades }),
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
