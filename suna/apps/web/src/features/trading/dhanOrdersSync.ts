/**
 * DhanHQ Orders & Executions Synchronization Service
 * 
 * Harmonizes live order book updates from DhanHQ Trading APIs (/orders, /trades)
 * and persists to Supabase (dhan_orders table) and high-speed local cache.
 */

export interface DhanOrderItem {
  orderId: string;
  exchangeOrderId?: string;
  dhanClientId?: string;
  tradingSymbol: string;
  customSymbol?: string;
  securityId?: string;
  isin?: string;
  exchangeSegment: string;
  transactionType: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_MARKET';
  productType: 'CNC' | 'INTRADAY' | 'MARGIN' | 'MTF';
  orderStatus: 'TRADED' | 'PENDING' | 'REJECTED' | 'CANCELLED' | 'TRANSIT' | 'EXPIRED';
  quantity: number;
  disclosedQuantity: number;
  price: number;
  triggerPrice: number;
  tradedQuantity: number;
  avgTradedPrice: number;
  turnover: number;
  pnl: number;
  grossPnl?: number;
  isExitTrade?: boolean;
  isEntryTrade?: boolean;
  tradeDirection?: 'Buy' | 'Sell';
  entryPrice?: number;
  exitPrice?: number;
  entryDate?: string;
  entryTimeStr?: string;
  exitDate?: string;
  exitTimeStr?: string;
  timeframe?: string;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  riskR?: number;
  returnR?: number;
  totalFees?: number;
  swap?: number;
  brokerageCharges: number;
  serviceTax: number;
  exchangeCharges: number;
  sebiTax: number;
  stampDuty: number;
  stt: number;
  totalCharges: number;
  validity: string;
  omsErrorCode?: string;
  omsErrorDescription?: string;
  tradingSession: string;
  exchangeTime: string;
  createTime?: string;
  updateTime?: string;
  rawData?: any;
}

const ORDERS_STORAGE_KEY = 'kortix_trading_dhan_orders_v1';

/**
 * Computes exact market session based on Kolkata IST time window
 */
export function getTradingSessionForTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Indian Market + Asian Session';

    // Format into Asia/Kolkata hours and minutes
    const istString = d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    const [hStr, mStr] = istString.split(':');
    const hour = parseInt(hStr, 10);
    const minute = parseInt(mStr, 10);
    const timeMinutes = hour * 60 + minute;

    // 9:30 AM (570) to 12:30 PM (750)
    if (timeMinutes >= 570 && timeMinutes < 750) {
      return 'Indian Market + Asian (Tokyo & Sydney) Sessions';
    }
    // 12:30 PM (750) to 1:30 PM (810)
    if (timeMinutes >= 750 && timeMinutes < 810) {
      return 'Indian Market + Tokyo Session';
    }
    // 1:30 PM (810) to 2:30 PM (870)
    if (timeMinutes >= 810 && timeMinutes < 870) {
      return 'Indian Market + Tokyo + London Overlap';
    }
    // 2:30 PM (870) to 3:30 PM (930)
    if (timeMinutes >= 870 && timeMinutes <= 930) {
      return 'Indian Market + London Session';
    }

    return 'Post-Market / Off-Hours';
  } catch {
    return 'Indian Market + Asian Session';
  }
}

/**
 * Simple 12-hour time formatter (e.g. 14:35 -> 2:35, 09:15 -> 9:15)
 */
export function formatSimpleTime(timeStr?: string): string {
  if (!timeStr) return '';
  let clean = timeStr.trim();
  if (clean.includes('T')) {
    clean = clean.split('T')[1];
  }
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return clean;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = clean.match(/\b(AM|PM)\b/i)?.[1]?.toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m}`;
}

/**
 * Formats an ISO / Dhan time string to user-friendly Kolkata IST (14:35 -> 2:35)
 */
export function formatToKolkataIST(dateString: string): { dateStr: string; timeStr: string; fullStr: string } {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      return { dateStr: 'Today', timeStr: '--:--', fullStr: 'Pending' };
    }

    const dateStr = d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const rawTime = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const timeStr = formatSimpleTime(rawTime);

    return {
      dateStr,
      timeStr,
      fullStr: `${dateStr}, ${timeStr}`,
    };
  } catch {
    return { dateStr: 'Today', timeStr: '--:--', fullStr: 'Pending' };
  }
}

/**
 * Normalizes symbol display (e.g. "Central Bank of India" -> "CENTRALBK")
 */
export function normalizeSymbol(rawSymbol?: string, customSymbol?: string): { cleanSym: string; displayName: string } {
  const sym = (rawSymbol || customSymbol || 'STOCK').trim();
  const cSym = (customSymbol || '').trim();

  if (sym.toUpperCase().includes('CENTRAL BANK') || cSym.toUpperCase().includes('CENTRAL BANK')) {
    return { cleanSym: 'CENTRALBK', displayName: 'Central Bank of India' };
  }
  if (sym.toUpperCase().includes('INDIAN OVERSEAS') || cSym.toUpperCase().includes('INDIAN OVERSEAS') || sym.toUpperCase() === 'IOB') {
    return { cleanSym: 'IOB', displayName: 'Indian Overseas Bank' };
  }
  if (sym.toUpperCase().includes('VODAFONE') || cSym.toUpperCase().includes('VODAFONE') || sym.toUpperCase() === 'IDEA') {
    return { cleanSym: 'IDEA', displayName: 'Vodafone Idea Ltd' };
  }

  return {
    cleanSym: sym.replace(/NSE_EQ:|BSE_EQ:|-EQ/g, '').toUpperCase(),
    displayName: cSym || sym,
  };
}

export function getLocalOrders(): DhanOrderItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalOrders(orders: DhanOrderItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('dhan-orders-updated', { detail: { count: orders.length } }));
  } catch (err) {
    console.error('Failed to save local Dhan orders:', err);
  }
}

/**
 * Synchronizes orders from DhanHQ Live API & Supabase
 */
export async function syncDhanOrders(forceRefresh = false): Promise<DhanOrderItem[]> {
  const cached = getLocalOrders();

  // If not forcing refresh and we have recent cached orders, return them first
  if (!forceRefresh && cached.length > 0) {
    // Background refresh
    setTimeout(() => {
      syncDhanOrders(true).catch(() => {});
    }, 100);
    return cached;
  }

  try {
    // 1. Fetch today's orders & executions from Dhan
    const [ordersRes, tradesRes] = await Promise.all([
      fetch('/api/dhan?action=orders').then((r) => r.json()).catch(() => ({ ok: false, data: [] })),
      fetch('/api/dhan?action=all_trades').then((r) => r.json()).catch(() => ({ ok: false, data: [] })),
    ]);

    const liveOrdersList = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
    const tradesList = Array.isArray(tradesRes?.data) ? tradesRes.data : [];

    const orderMap = new Map<string, DhanOrderItem>();

    // Step A: Parse live orders from Dhan /orders endpoint
    for (const o of liveOrdersList) {
      const orderId = String(o.orderId);
      const { cleanSym, displayName } = normalizeSymbol(o.tradingSymbol, o.customSymbol);
      const qty = Number(o.quantity || o.tradedQuantity || 1);
      const filledQty = Number(o.filled_qty || o.tradedQuantity || 0);
      const price = Number(o.price || 0);
      const avgPrice = Number(o.avgTradedPrice || price || 0);
      const turnover = filledQty > 0 ? filledQty * avgPrice : qty * price;
      const exTime = o.exchangeTime || o.createTime || new Date().toISOString();

      orderMap.set(orderId, {
        orderId,
        exchangeOrderId: o.exchangeOrderId ? String(o.exchangeOrderId) : undefined,
        dhanClientId: String(o.dhanClientId || '1114824544'),
        tradingSymbol: cleanSym,
        customSymbol: displayName,
        securityId: String(o.securityId || ''),
        isin: o.isin || '',
        exchangeSegment: o.exchangeSegment || 'NSE_EQ',
        transactionType: (o.transactionType || 'BUY').toUpperCase() as 'BUY' | 'SELL',
        orderType: (o.orderType || 'MARKET').toUpperCase() as any,
        productType: (o.productType || 'INTRADAY').toUpperCase() as any,
        orderStatus: (o.orderStatus || 'PENDING').toUpperCase() as any,
        quantity: qty,
        disclosedQuantity: Number(o.disclosedQuantity || 0),
        price,
        triggerPrice: Number(o.triggerPrice || 0),
        tradedQuantity: filledQty,
        avgTradedPrice: avgPrice,
        turnover: Number(turnover.toFixed(2)),
        pnl: 0,
        brokerageCharges: 0,
        serviceTax: 0,
        exchangeCharges: 0,
        sebiTax: 0,
        stampDuty: 0,
        stt: 0,
        totalCharges: 0,
        validity: o.validity || 'DAY',
        omsErrorCode: o.omsErrorCode,
        omsErrorDescription: o.omsErrorDescription,
        tradingSession: getTradingSessionForTime(exTime),
        exchangeTime: exTime,
        createTime: o.createTime,
        updateTime: o.updateTime,
        rawData: o,
      });
    }

    // Step B: Synthesize executed orders from Dhan trades execution log
    for (const t of tradesList) {
      const orderId = String(t.orderId);
      const { cleanSym, displayName } = normalizeSymbol(t.tradingSymbol, t.customSymbol);
      const tradedQty = Number(t.tradedQuantity || 1);
      const tradedPrice = Number(t.tradedPrice || 0);
      const turnover = Number((tradedQty * tradedPrice).toFixed(2));
      const exTime = t.exchangeTime || new Date().toISOString();

      const brokerage = Number(t.brokerageCharges || 0);
      const serviceTax = Number(t.serviceTax || 0);
      const exchangeCharges = Number(t.exchangeTransactionCharges || 0);
      const sebiTax = Number(t.sebiTax || 0);
      const stampDuty = Number(t.stampDuty || 0);
      const stt = Number(t.stt || 0);
      const totalCharges = Number((brokerage + serviceTax + exchangeCharges + sebiTax + stampDuty + stt).toFixed(4));

      if (orderMap.has(orderId)) {
        // Enrich existing live order with exact execution details & fee breakdown
        const existing = orderMap.get(orderId)!;
        existing.orderStatus = 'TRADED';
        existing.exchangeOrderId = t.exchangeOrderId ? String(t.exchangeOrderId) : existing.exchangeOrderId;
        existing.tradedQuantity = tradedQty;
        existing.avgTradedPrice = tradedPrice;
        existing.turnover = turnover;
        existing.brokerageCharges = brokerage;
        existing.serviceTax = serviceTax;
        existing.exchangeCharges = exchangeCharges;
        existing.sebiTax = sebiTax;
        existing.stampDuty = stampDuty;
        existing.stt = stt;
        existing.totalCharges = totalCharges;
      } else {
        // Create full executed order record from execution
        orderMap.set(orderId, {
          orderId,
          exchangeOrderId: t.exchangeOrderId ? String(t.exchangeOrderId) : undefined,
          dhanClientId: String(t.dhanClientId || '1114824544'),
          tradingSymbol: cleanSym,
          customSymbol: displayName,
          securityId: String(t.securityId || ''),
          isin: t.isin || '',
          exchangeSegment: t.exchangeSegment || 'NSE_EQ',
          transactionType: (t.transactionType || 'BUY').toUpperCase() as 'BUY' | 'SELL',
          orderType: (t.orderType || 'MARKET').toUpperCase() as any,
          productType: (t.productType || 'INTRADAY').toUpperCase() as any,
          orderStatus: 'TRADED',
          quantity: tradedQty,
          disclosedQuantity: 0,
          price: tradedPrice,
          triggerPrice: 0,
          tradedQuantity: tradedQty,
          avgTradedPrice: tradedPrice,
          turnover,
          pnl: 0,
          brokerageCharges: brokerage,
          serviceTax,
          exchangeCharges,
          sebiTax,
          stampDuty,
          stt,
          totalCharges,
          validity: 'DAY',
          tradingSession: getTradingSessionForTime(exTime),
          exchangeTime: exTime,
          rawData: t,
        });
      }
    }

    // Step C: Compute real-time exact realized PnL per executed trade matching (Long & Short FIFO)
    const openPositions: Record<string, Array<{
      orderId: string;
      side: 'BUY' | 'SELL';
      qty: number;
      price: number;
      time: string;
      feePerUnit: number;
    }>> = {};

    const chronological = [...orderMap.values()].sort(
      (a, b) => new Date(a.exchangeTime).getTime() - new Date(b.exchangeTime).getTime()
    );

    for (const tr of chronological) {
      if (tr.orderStatus !== 'TRADED') continue;
      const sym = tr.tradingSymbol;
      if (!openPositions[sym]) openPositions[sym] = [];

      const side = tr.transactionType;
      let remainingQty = Number(tr.tradedQuantity || tr.quantity || 0);
      const price = Number(tr.avgTradedPrice || tr.price || 0);
      const time = tr.exchangeTime;
      const totalFee = Number(tr.totalCharges || 0);
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

        const grossPnl = isLong ? (exitPrice - entryPrice) * matchQty : (entryPrice - exitPrice) * matchQty;
        const openFeePortion = Number((openOrder.feePerUnit * matchQty).toFixed(2));
        const closeFeePortion = Number((feePerUnit * matchQty).toFixed(2));
        const tradeFees = Number((openFeePortion + closeFeePortion).toFixed(2));
        const netPnl = Number((grossPnl - tradeFees).toFixed(2));

        const entryParts = (openOrder.time || '').split('T');
        const exitParts = (time || '').split('T');
        const entryDate = entryParts[0] || new Date().toISOString().split('T')[0];
        const entryTime = formatSimpleTime(entryParts[1] || '09:30');
        const exitDate = exitParts[0] || entryDate;
        const exitTime = formatSimpleTime(exitParts[1] || '15:30');

        const riskPerShare = Math.max(0.5, entryPrice * 0.01);
        const riskR = Number((riskPerShare * matchQty).toFixed(2));
        const returnR = riskR > 0 ? Number((netPnl / riskR).toFixed(2)) : null;

        const stopLoss = isLong
          ? Number((entryPrice - riskPerShare).toFixed(2))
          : Number((entryPrice + riskPerShare).toFixed(2));
        const takeProfit = isLong
          ? Number((entryPrice + riskPerShare * 2).toFixed(2))
          : Number((entryPrice - riskPerShare * 2).toFixed(2));

        // Timeframe duration
        const d1 = new Date(openOrder.time).getTime();
        const d2 = new Date(time).getTime();
        const diffSecs = Math.max(1, Math.round((d2 - d1) / 1000));
        let timeframe = '1m';
        if (diffSecs < 120) timeframe = '1m';
        else if (diffSecs < 300) timeframe = '3m';
        else if (diffSecs < 600) timeframe = '5m';
        else if (diffSecs < 1800) timeframe = '15m';
        else timeframe = `${Math.round(diffSecs / 60)}m`;

        // Mark the exit order
        tr.isExitTrade = true;
        tr.tradeDirection = isLong ? 'Buy' : 'Sell';
        tr.entryPrice = Number(entryPrice.toFixed(2));
        tr.exitPrice = Number(exitPrice.toFixed(2));
        tr.entryDate = entryDate;
        tr.entryTimeStr = entryTime;
        tr.exitDate = exitDate;
        tr.exitTimeStr = exitTime;
        tr.timeframe = timeframe;
        tr.grossPnl = Number(grossPnl.toFixed(2));
        tr.pnl = netPnl;
        tr.stopLossPrice = stopLoss;
        tr.takeProfitPrice = takeProfit;
        tr.riskR = riskR;
        tr.returnR = returnR ?? undefined;
        tr.totalFees = tradeFees;
        tr.swap = 0;

        remainingQty -= matchQty;
        openOrder.qty -= matchQty;
        if (openOrder.qty <= 0) {
          openPositions[sym].splice(matchIdx, 1);
        }
      }

      if (remainingQty > 0) {
        openPositions[sym].push({
          orderId: tr.orderId,
          side,
          qty: remainingQty,
          price,
          time,
          feePerUnit,
        });
      }
    }

    const mergedOrders = Array.from(orderMap.values()).sort((a, b) => {
      const timeA = new Date(a.exchangeTime).getTime() || 0;
      const timeB = new Date(b.exchangeTime).getTime() || 0;
      return timeB - timeA;
    });

    if (mergedOrders.length > 0) {
      saveLocalOrders(mergedOrders);

      // Async push to Supabase table dhan_orders for cloud mitigation
      fetch('/api/orders/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: mergedOrders }),
      }).catch((err) => {
        console.warn('Non-blocking: could not push to Supabase dhan_orders:', err);
      });

      return mergedOrders;
    }

    return cached;
  } catch (err) {
    console.error('Failed to sync Dhan orders:', err);
    return cached;
  }
}
