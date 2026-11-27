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

export interface DhanOrderAlertLike {
  orderId: string;
  orderStatus: DhanOrderItem['orderStatus'];
  transactionType: DhanOrderItem['transactionType'];
  exchangeSegment?: string;
  productType?: string;
  orderType?: string;
  validity?: string;
  tradingSymbol?: string;
  securityId?: string;
  quantity?: number;
  price?: number;
  triggerPrice?: number;
  disclosedQuantity?: number;
  filledQty?: number;
  pendingQty?: number;
  tradedPrice?: number;
  createTime?: string;
  updateTime?: string;
  exchangeTime?: string;
  omsErrorCode?: string;
  omsErrorDescription?: string;
}

const ORDERS_STORAGE_KEY = 'kortix_trading_dhan_orders_v1';
let lastRemoteSyncAt = 0;
let remoteSyncInFlight: Promise<DhanOrderItem[]> | null = null;

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

export function clearLocalOrders() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ORDERS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('dhan-orders-updated', { detail: { count: 0 } }));
  } catch {}
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

/** Apply a pushed order event before the REST reconciliation completes. */
export function applyDhanOrderAlert(alert: DhanOrderAlertLike): void {
  if (typeof window === 'undefined' || !alert.orderId) return;
  const current = getLocalOrders();
  const index = current.findIndex((order) => order.orderId === String(alert.orderId));
  const existing = index >= 0 ? current[index] : undefined;
  const symbol = normalizeSymbol(alert.tradingSymbol, existing?.customSymbol);
  const eventTime = alert.exchangeTime || alert.updateTime || alert.createTime || existing?.exchangeTime || new Date().toISOString();
  const next: DhanOrderItem = {
    orderId: String(alert.orderId),
    exchangeOrderId: existing?.exchangeOrderId,
    dhanClientId: existing?.dhanClientId,
    tradingSymbol: symbol.cleanSym,
    customSymbol: symbol.displayName,
    securityId: String(alert.securityId || existing?.securityId || ''),
    isin: existing?.isin || '',
    exchangeSegment: alert.exchangeSegment || existing?.exchangeSegment || 'NSE_EQ',
    transactionType: alert.transactionType || existing?.transactionType || 'BUY',
    orderType: (alert.orderType || existing?.orderType || 'MARKET').toUpperCase() as DhanOrderItem['orderType'],
    productType: (alert.productType || existing?.productType || 'INTRADAY').toUpperCase() as DhanOrderItem['productType'],
    orderStatus: alert.orderStatus,
    quantity: Number(alert.quantity ?? existing?.quantity ?? 0),
    disclosedQuantity: Number(alert.disclosedQuantity ?? existing?.disclosedQuantity ?? 0),
    price: Number(alert.price ?? existing?.price ?? 0),
    triggerPrice: Number(alert.triggerPrice ?? existing?.triggerPrice ?? 0),
    tradedQuantity: Number(alert.filledQty ?? existing?.tradedQuantity ?? 0),
    avgTradedPrice: Number(alert.tradedPrice ?? existing?.avgTradedPrice ?? alert.price ?? 0),
    turnover: existing?.turnover ?? 0,
    pnl: existing?.pnl ?? 0,
    brokerageCharges: existing?.brokerageCharges ?? 0,
    serviceTax: existing?.serviceTax ?? 0,
    exchangeCharges: existing?.exchangeCharges ?? 0,
    sebiTax: existing?.sebiTax ?? 0,
    stampDuty: existing?.stampDuty ?? 0,
    stt: existing?.stt ?? 0,
    totalCharges: existing?.totalCharges ?? 0,
    validity: alert.validity || existing?.validity || 'DAY',
    omsErrorCode: alert.omsErrorCode || existing?.omsErrorCode,
    omsErrorDescription: alert.omsErrorDescription || existing?.omsErrorDescription,
    tradingSession: getTradingSessionForTime(eventTime),
    exchangeTime: eventTime,
    createTime: alert.createTime || existing?.createTime,
    updateTime: alert.updateTime || existing?.updateTime,
    rawData: { ...(existing?.rawData || {}), ...alert },
  };
  const nextOrders = index >= 0
    ? current.map((order, orderIndex) => (orderIndex === index ? next : order))
    : [next, ...current];
  saveLocalOrders(nextOrders);
}

/**
 * Synchronizes orders from DhanHQ Live API & Supabase
 */
export async function syncDhanOrders(forceRefresh = false): Promise<DhanOrderItem[]> {
  const cached = getLocalOrders();

  // Return the cache immediately, but only start one background refresh for a
  // given freshness window. Previously every 1.5s dashboard tick scheduled a
  // new forced request, creating overlapping Dhan calls and stale responses.
  if (!forceRefresh && cached.length > 0) {
    if (Date.now() - lastRemoteSyncAt > 1500 && !remoteSyncInFlight) {
      remoteSyncInFlight = syncDhanOrders(true).finally(() => {
        remoteSyncInFlight = null;
      });
    }
    return cached;
  }

  if (remoteSyncInFlight) return remoteSyncInFlight;
  remoteSyncInFlight = syncDhanOrdersRemote().finally(() => {
    remoteSyncInFlight = null;
  });
  return remoteSyncInFlight;
}

async function syncDhanOrdersRemote(): Promise<DhanOrderItem[]> {
  const cached = getLocalOrders();
  lastRemoteSyncAt = Date.now();

  try {
    // 1. Fetch today's orders & executions from Dhan (authenticated via httpOnly session cookie)
    const [ordersHttp, tradesHttp] = await Promise.all([
      fetch('/api/dhan?action=orders', { credentials: 'same-origin', cache: 'no-store' }),
      fetch('/api/dhan?action=all_trades', { credentials: 'same-origin', cache: 'no-store' }),
    ]);

    if (ordersHttp.status === 401 || tradesHttp.status === 401) {
      clearLocalOrders();
      return [];
    }

    const [ordersRes, tradesRes] = await Promise.all([
      ordersHttp.json().catch(() => ({ ok: false, data: [] })),
      tradesHttp.json().catch(() => ({ ok: false, data: [] })),
    ]);

    if (ordersRes?.ok === false && String(ordersRes?.error || '').toLowerCase().includes('not connected')) {
      clearLocalOrders();
      return [];
    }

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
        dhanClientId: String(o.dhanClientId || ''),
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

    // Step B: Synthesize & accumulate executed orders from Dhan trades execution log
    const partialFillSeen = new Set<string>();
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
        const existing = orderMap.get(orderId)!;
        existing.orderStatus = 'TRADED';
        existing.exchangeOrderId = t.exchangeOrderId ? String(t.exchangeOrderId) : existing.exchangeOrderId;
        if (partialFillSeen.has(orderId)) {
          // Accumulate multiple partial fills for the same orderId
          const prevQty = existing.tradedQuantity || 0;
          const prevTurnover = prevQty * (existing.avgTradedPrice || 0);
          const nextQty = prevQty + tradedQty;
          existing.tradedQuantity = nextQty;
          existing.quantity = Math.max(existing.quantity, nextQty);
          existing.avgTradedPrice = nextQty > 0 ? Number(((prevTurnover + turnover) / nextQty).toFixed(4)) : tradedPrice;
          existing.turnover = Number((existing.turnover + turnover).toFixed(2));
          existing.brokerageCharges = Number((existing.brokerageCharges + brokerage).toFixed(4));
          existing.serviceTax = Number((existing.serviceTax + serviceTax).toFixed(4));
          existing.exchangeCharges = Number((existing.exchangeCharges + exchangeCharges).toFixed(4));
          existing.sebiTax = Number((existing.sebiTax + sebiTax).toFixed(4));
          existing.stampDuty = Number((existing.stampDuty + stampDuty).toFixed(4));
          existing.stt = Number((existing.stt + stt).toFixed(4));
          existing.totalCharges = Number((existing.totalCharges + totalCharges).toFixed(4));
        } else {
          partialFillSeen.add(orderId);
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
        }
      } else {
        partialFillSeen.add(orderId);
        // Create full executed order record from execution
        orderMap.set(orderId, {
          orderId,
          exchangeOrderId: t.exchangeOrderId ? String(t.exchangeOrderId) : undefined,
          dhanClientId: String(t.dhanClientId || ''),
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

    // Step C: Consolidate each full position lifecycle (0 -> open -> 0 flat) per symbol into ONE trade
    // matching dhanSync.ts 1:1 so Journal and Orders always agree on trade count and Net PnL.
    interface ActivePos {
      isLong: boolean;
      netQty: number;
      entryQty: number;
      entryValueSum: number;
      exitQty: number;
      exitValueSum: number;
      totalFees: number;
      firstOrder: DhanOrderItem;
      orderIds: string[];
    }

    const activeBySym: Record<string, ActivePos> = {};
    const consumedOrderIds = new Set<string>();

    const chronological = [...orderMap.values()].sort(
      (a, b) => new Date(a.exchangeTime).getTime() - new Date(b.exchangeTime).getTime()
    );

    for (const tr of chronological) {
      if (tr.orderStatus !== 'TRADED') continue;
      const sym = tr.tradingSymbol;
      const side = tr.transactionType;
      let qty = Number(tr.tradedQuantity || tr.quantity || 0);
      if (qty <= 0) continue;
      const price = Number(tr.avgTradedPrice || tr.price || 0);
      const time = tr.exchangeTime;
      const totalFee = Number(tr.totalCharges || 0);
      const feePerUnit = qty > 0 ? totalFee / qty : 0;

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
            firstOrder: tr,
            orderIds: [],
          };
          activeBySym[sym] = pos;
        }

        const isSameDirection = (pos.isLong && side === 'BUY') || (!pos.isLong && side === 'SELL');
        if (isSameDirection) {
          pos.netQty += qty;
          pos.entryQty += qty;
          pos.entryValueSum += price * qty;
          pos.totalFees += feePerUnit * qty;
          if (pos.orderIds.length > 0 && tr.orderId !== pos.firstOrder.orderId) {
            consumedOrderIds.add(tr.orderId);
          }
          pos.orderIds.push(tr.orderId);
          qty = 0;
        } else {
          const closeQty = Math.min(pos.netQty, qty);
          pos.netQty -= closeQty;
          pos.exitQty += closeQty;
          pos.exitValueSum += price * closeQty;
          pos.totalFees += feePerUnit * closeQty;
          qty -= closeQty;

          if (pos.netQty <= 0) {
            // Mark all earlier legs (including firstOrder) as consumed; `tr` holds the consolidated trade
            for (const oid of pos.orderIds) {
              if (oid !== tr.orderId) consumedOrderIds.add(oid);
            }

            const avgEntry = pos.entryQty > 0 ? Number((pos.entryValueSum / pos.entryQty).toFixed(2)) : 0;
            const avgExit = pos.exitQty > 0 ? Number((pos.exitValueSum / pos.exitQty).toFixed(2)) : Number(price.toFixed(2));
            const totalLots = pos.entryQty;

            const grossPnl = pos.isLong
              ? (avgExit - avgEntry) * totalLots
              : (avgEntry - avgExit) * totalLots;

            let legFees = pos.totalFees;
            if (legFees <= 0) {
              const isIntraday = tr.productType === 'INTRADAY';
              const buyP = pos.isLong ? avgEntry : avgExit;
              const sellP = pos.isLong ? avgExit : avgEntry;
              const buyT = buyP * totalLots;
              const sellT = sellP * totalLots;
              const totalT = buyT + sellT;
              legFees =
                (isIntraday ? sellT * 0.00025 : totalT * 0.001) +
                totalT * 0.0000325 * 1.18 +
                (totalT / 10000000) * 10 +
                buyT * 0.00015;
            }

            const roundedGross = Number(grossPnl.toFixed(2));
            const roundedFees = Number(legFees.toFixed(2));
            const netPnl = Number((roundedGross - roundedFees).toFixed(2));

            const entryDateObj = new Date(pos.firstOrder.exchangeTime || time);
            const exitDateObj = new Date(time);
            const entryDate = !isNaN(entryDateObj.getTime())
              ? entryDateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
              : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const exitDate = !isNaN(exitDateObj.getTime())
              ? exitDateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
              : entryDate;
            const entryTime = formatSimpleTime(
              !isNaN(entryDateObj.getTime())
                ? entryDateObj.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' })
                : '09:30'
            );
            const exitTime = formatSimpleTime(
              !isNaN(exitDateObj.getTime())
                ? exitDateObj.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' })
                : '15:30'
            );

            const riskPerShare = Math.max(0.5, avgEntry * 0.01);
            const riskR = Number((riskPerShare * totalLots).toFixed(2));
            const returnR = riskR > 0 ? Number((netPnl / riskR).toFixed(2)) : null;

            const stopLoss = pos.isLong
              ? Number((avgEntry - riskPerShare).toFixed(2))
              : Number((avgEntry + riskPerShare).toFixed(2));
            const takeProfit = pos.isLong
              ? Number((avgEntry + riskPerShare * 2).toFixed(2))
              : Number((avgEntry - riskPerShare * 2).toFixed(2));

            const d1 = entryDateObj.getTime();
            const d2 = exitDateObj.getTime();
            const diffSecs = Math.max(1, Math.round((d2 - d1) / 1000));
            let timeframe = '1m';
            if (diffSecs < 120) timeframe = '1m';
            else if (diffSecs < 300) timeframe = '3m';
            else if (diffSecs < 600) timeframe = '5m';
            else if (diffSecs < 1800) timeframe = '15m';
            else timeframe = `${Math.round(diffSecs / 60)}m`;

            tr.transactionType = pos.isLong ? 'BUY' : 'SELL';
            tr.isExitTrade = true;
            tr.tradeDirection = pos.isLong ? 'Buy' : 'Sell';
            tr.quantity = totalLots;
            tr.tradedQuantity = totalLots;
            tr.entryPrice = avgEntry;
            tr.exitPrice = avgExit;
            tr.avgTradedPrice = avgEntry;
            tr.turnover = Number(((avgEntry + avgExit) * totalLots).toFixed(2));
            tr.entryDate = entryDate;
            tr.entryTimeStr = entryTime;
            tr.exitDate = exitDate;
            tr.exitTimeStr = exitTime;
            tr.timeframe = timeframe;
            tr.grossPnl = roundedGross;
            tr.totalCharges = roundedFees;
            tr.pnl = netPnl;
            tr.stopLossPrice = stopLoss;
            tr.takeProfitPrice = takeProfit;
            tr.riskR = riskR;
            tr.returnR = returnR ?? undefined;
            tr.totalFees = roundedFees;
            tr.swap = 0;

            delete activeBySym[sym];
          } else {
            // Partial close: mark this closing leg as consumed into the active position
            if (qty === 0) consumedOrderIds.add(tr.orderId);
            pos.orderIds.push(tr.orderId);
          }
        }
      }
    }

    const mergedOrders = Array.from(orderMap.values())
      .filter((o) => !consumedOrderIds.has(o.orderId))
      .sort((a, b) => {
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

    saveLocalOrders([]);
    return [];
  } catch (err) {
    console.error('Failed to sync Dhan orders:', err);
    return cached;
  }
}
