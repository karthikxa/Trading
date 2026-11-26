'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@kortix/ui';
import {
  Receipt,
  CheckCircle,
  Clock,
  XCircle,
  MinusCircle,
  MagnifyingGlass,
  Funnel,
  DotsThreeVertical,
  CalendarBlank,
  Wallet,
  X,
  FilePdf,
  FileText,
  ShieldCheck,
  ArrowLeft,
  DownloadSimple,
  ShareNetwork,
  Copy,
  Check,
  TrendUp,
  Brain,
  Target,
  Sparkle,
  Compass,
} from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Menu, MenuTrigger, MenuPopup, MenuItem } from '@/components/ui/menu';
import { WallpaperBackground } from '@/components/ui/wallpaper-background';
import { SidebarToggle } from '@kortix/ui/workspace';
import StockSymbolIcon from '@/features/markets/StockSymbolIcon';
import ConnectDhanModal from '@/features/markets/ConnectDhanModal';
import {
  DhanOrderItem,
  syncDhanOrders,
  getLocalOrders,
  formatToKolkataIST,
  formatSimpleTime,
} from './dhanOrdersSync';

function formatTo12Hour(timeStr?: string): string {
  return formatSimpleTime(timeStr);
}

interface OrdersViewProps {
  projectId: string;
}

/**
 * Printable Order PDF with diagonal cross ZED watermark
 */

function getSessionInfo(timeStr?: string): { name: string; desc: string; window: string } {
  if (!timeStr) {
    return {
      name: 'Indian Market Regular Session',
      desc: 'NSE/BSE Main Equity Market Session',
      window: '9:15 AM – 3:30 PM IST',
    };
  }
  const match = timeStr.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)/i);
  if (!match) {
    return {
      name: 'Indian Market Regular Session',
      desc: 'NSE/BSE Main Equity Market Session',
      window: '9:15 AM – 3:30 PM IST',
    };
  }
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  const totalMins = h * 60 + m;

  if (totalMins >= 9 * 60 + 30 && totalMins < 12 * 60 + 30) {
    return {
      name: 'Indian Market + Asian (Tokyo & Sydney) Sessions',
      desc: 'Peak morning liquidity in NSE/BSE; Sydney closes at 12:30 PM IST.',
      window: '9:30 AM – 12:30 PM IST',
    };
  } else if (totalMins >= 12 * 60 + 30 && totalMins < 13 * 60 + 30) {
    return {
      name: 'Indian Market + Tokyo Session',
      desc: 'Mid-day consolidation in Indian equities while Tokyo enters its final hour.',
      window: '12:30 PM – 1:30 PM IST',
    };
  } else if (totalMins >= 13 * 60 + 30 && totalMins < 14 * 60 + 30) {
    return {
      name: 'Indian Market + Tokyo + London Overlap',
      desc: 'London opens at 1:30 PM IST; Tokyo closes at 2:30 PM IST.',
      window: '1:30 PM – 2:30 PM IST',
    };
  } else if (totalMins >= 14 * 60 + 30 && totalMins <= 15 * 60 + 30) {
    return {
      name: 'Indian Market + London Session',
      desc: 'Final hour of NSE/BSE trading; European institutional volume often drives late-day Indian market moves.',
      window: '2:30 PM – 3:30 PM IST',
    };
  }
  return {
    name: 'Indian Market Regular Session',
    desc: 'NSE/BSE Cash Equity Execution',
    window: '9:15 AM – 3:30 PM IST',
  };
}

function downloadOrderPdf(order: DhanOrderItem) {
  const ist = formatToKolkataIST(order.exchangeTime);
  const isBuy = (order.tradeDirection || order.transactionType) === 'BUY' || (order.tradeDirection || order.transactionType) === 'Buy';
  const pnlStr = order.pnl != null ? `${order.pnl >= 0 ? '+' : ''}${order.pnl.toFixed(2)} RS` : '0.00 RS';
  const session = getSessionInfo(ist.timeStr);
  const entryDate = order.entryDate || ist.dateStr;
  const entryTime = formatSimpleTime(order.entryTimeStr || ist.timeStr);
  const exitDate = order.exitDate || ist.dateStr;
  const exitTime = formatSimpleTime(order.exitTimeStr || ist.timeStr);
  const tradeQty = order.tradedQuantity || order.quantity || 1;
  const entryPrice = order.entryPrice ?? order.avgTradedPrice ?? order.price ?? 0;
  const exitPrice = order.exitPrice ?? order.avgTradedPrice ?? order.price ?? 0;
  const feesTotal = order.totalFees ?? order.totalCharges ?? 0;
  const riskR = order.riskR != null ? `${order.riskR.toFixed(1)}` : '-';
  const returnR = order.returnR != null ? `${order.returnR >= 0 ? '+' : ''}${order.returnR.toFixed(2)}` : '-';
  const stopLossStr = order.stopLossPrice ? `₹${order.stopLossPrice.toFixed(2)}` : '-';
  const takeProfitStr = order.takeProfitPrice ? `₹${order.takeProfitPrice.toFixed(2)}` : '-';

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ZED Trade Journal Execution - #${order.orderId}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0; padding: 25px; color: #111827; background: #ffffff; position: relative;
    }
    .zed-watermark {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 160px; font-weight: 900; letter-spacing: 0.25em;
      color: rgba(0, 0, 0, 0.05); user-select: none; pointer-events: none; z-index: 9999;
    }
    .header {
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px;
    }
    .brand { font-size: 22px; font-weight: 800; }
    .brand span { color: #0284c7; }
    .doc-title { font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; margin: 18px 0 8px 0; color: #374151; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
    .label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
    .val { font-size: 13px; font-weight: 600; color: #111827; margin-top: 2px; }
    .charges-grid { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; background: #fdfdfd; margin-bottom: 15px; }
    .charge-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; color: #4b5563; border-bottom: 1px dotted #e5e7eb; }
    .footer { font-size: 11px; color: #9ca3af; text-align: center; margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="zed-watermark">ZED</div>
  <div class="header">
    <div>
      <div class="brand">ZED <span>TRADING JOURNAL</span></div>
      <div class="doc-title">Official Trade Execution Note</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 13px; font-weight: 700;">Order #${order.orderId}</div>
      <div style="font-size: 11px; color: #6b7280;">${ist.fullStr}</div>
    </div>
  </div>

  <div class="section-title">Trade Details (${order.timeframe || '1m'})</div>
  <div class="grid-4">
    <div class="card"><div class="label">Entry Date</div><div class="val">${entryDate}</div></div>
    <div class="card"><div class="label">Entry Time</div><div class="val">${entryTime}</div></div>
    <div class="card"><div class="label">Exit Date</div><div class="val">${exitDate}</div></div>
    <div class="card"><div class="label">Exit Time</div><div class="val">${exitTime}</div></div>
    <div class="card"><div class="label">Symbol</div><div class="val">${order.tradingSymbol}</div></div>
    <div class="card"><div class="label">Direction</div><div class="val" style="color: ${isBuy ? '#059669' : '#dc2626'}">${isBuy ? 'Buy' : 'Sell'}</div></div>
    <div class="card"><div class="label">Lots / Position Size</div><div class="val">${tradeQty}</div></div>
    <div class="card"><div class="label">Trading Session</div><div class="val" style="font-size: 11px;">${session.name}</div></div>
  </div>

  <div class="section-title">Execution & Pricing</div>
  <div class="grid-4">
    <div class="card"><div class="label">Entry Price</div><div class="val">₹${entryPrice.toFixed(2)}</div></div>
    <div class="card"><div class="label">Exit Price</div><div class="val">₹${exitPrice.toFixed(2)}</div></div>
    <div class="card"><div class="label">Stop Loss (Price)</div><div class="val">${stopLossStr}</div></div>
    <div class="card"><div class="label">Take Profit (Price)</div><div class="val">${takeProfitStr}</div></div>
    <div class="card"><div class="label">Net P&L (₹)</div><div class="val" style="color: ${order.pnl >= 0 ? '#059669' : '#dc2626'}">${pnlStr}</div></div>
    <div class="card"><div class="label">Risk (R)</div><div class="val">${riskR}</div></div>
    <div class="card"><div class="label">Return (R)</div><div class="val">${returnR}</div></div>
    <div class="card"><div class="label">Fees & Commission (₹)</div><div class="val">₹${feesTotal.toFixed(2)}</div></div>
  </div>

  <div class="section-title">Statutory Charges Breakdown</div>
  <div class="charges-grid">
    <div class="charge-row"><span>Brokerage Charges</span><span>₹${order.brokerageCharges.toFixed(4)}</span></div>
    <div class="charge-row"><span>GST / Service Tax</span><span>₹${order.serviceTax.toFixed(4)}</span></div>
    <div class="charge-row"><span>Exchange Turnover Fee</span><span>₹${order.exchangeCharges.toFixed(4)}</span></div>
    <div class="charge-row"><span>SEBI Regulatory Fee</span><span>₹${order.sebiTax.toFixed(4)}</span></div>
    <div class="charge-row"><span>Stamp Duty</span><span>₹${order.stampDuty.toFixed(4)}</span></div>
    <div class="charge-row"><span>STT / Securities Transaction Tax</span><span>₹${order.stt.toFixed(4)}</span></div>
    <div class="charge-row" style="font-weight: 700; border-top: 1px solid #111827; margin-top: 4px; padding-top: 4px;"><span>Total Charges</span><span>₹${order.totalCharges.toFixed(4)}</span></div>
  </div>

  <div class="footer">
    Verified Electronic Order Confirmation Record • Certified by ZED Trading System
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function copyTextDirectly(text: string): boolean {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => { });
      return true;
    }
  } catch { }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

export default function OrdersView({ projectId }: OrdersViewProps) {
  const [orders, setOrders] = useState<DhanOrderItem[]>(() => getLocalOrders());
  const [loading, setLoading] = useState<boolean>(false);
  const [placingOrder, setPlacingOrder] = useState<{ symbol?: string; side?: string; timestamp?: number } | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TRADED' | 'PENDING' | 'REJECTED' | 'CANCELLED'>('ALL');
  const [productFilter, setProductFilter] = useState<'ALL' | 'INTRADAY' | 'CNC' | 'MARGIN'>('ALL');
  const [sideFilter, setSideFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => new Date());
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>(undefined);
  const [calendarMode, setCalendarMode] = useState<'single' | 'range'>('single');
  const [viewingOrder, setViewingOrder] = useState<DhanOrderItem | null>(null);
  const [sharingOrder, setSharingOrder] = useState<DhanOrderItem | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [viewShareCopied, setViewShareCopied] = useState(false);
  const [sharedMembers, setSharedMembers] = useState<string[]>([]);
  const [confluenceModalOpen, setConfluenceModalOpen] = useState(false);
  const [editingConfluence, setEditingConfluence] = useState('');
  const [editingNotes, setEditingNotes] = useState('');

  const fetchOrders = useCallback(async (force = false) => {
    try {
      const updated = await syncDhanOrders(force);
      setOrders((prev) => {
        if (prev.length === updated.length && JSON.stringify(prev) === JSON.stringify(updated)) {
          return prev;
        }
        return updated;
      });
    } catch (err) {
      console.error('Failed to refresh Dhan orders:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders(false);

    const onOrdersUpdated = () => {
      const fresh = getLocalOrders();
      setOrders((prev) => {
        if (prev.length === fresh.length && JSON.stringify(prev) === JSON.stringify(fresh)) {
          return prev;
        }
        return fresh;
      });
    };

    const handlePlacing = (e: any) => {
      setPlacingOrder(e.detail || { timestamp: Date.now() });
    };
    const handlePlaced = () => {
      setTimeout(() => setPlacingOrder(null), 1200);
    };

    window.addEventListener('dhan-orders-updated', onOrdersUpdated);
    window.addEventListener('dhan-order-placing', handlePlacing);
    window.addEventListener('dhan-order-placed', handlePlaced);

    // Live market polling every 1500ms with zero flicker
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchOrders(false);
      }
    }, 1500);

    return () => {
      window.removeEventListener('dhan-orders-updated', onOrdersUpdated);
      window.removeEventListener('dhan-order-placing', handlePlacing);
      window.removeEventListener('dhan-order-placed', handlePlaced);
      clearInterval(interval);
    };
  }, [fetchOrders]);

  // Derived KPI Metrics
  const metrics = useMemo(() => {
    const total = orders.length;
    const traded = orders.filter((o) => o.orderStatus === 'TRADED');
    const pending = orders.filter((o) => o.orderStatus === 'PENDING' || o.orderStatus === 'TRANSIT');
    const rejected = orders.filter((o) => o.orderStatus === 'REJECTED');
    const cancelled = orders.filter((o) => o.orderStatus === 'CANCELLED');

    const totalTurnover = traded.reduce((acc, o) => acc + (o.turnover || 0), 0);
    const totalCharges = traded.reduce((acc, o) => acc + (o.totalCharges || 0), 0);
    const totalPnl = traded.reduce((acc, o) => acc + (o.pnl || 0), 0);
    const fillRate = total > 0 ? ((traded.length / total) * 100).toFixed(1) : '100.0';

    // Day PnL: strictly calculated for the active / selected day (defaults to today in IST)
    const activeDateStr = selectedDate
      ? selectedDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const dayTraded = traded.filter((o) => {
      const d = (o.exchangeTime || o.entryDate || '').slice(0, 10);
      return d === activeDateStr;
    });

    const dayPnl = dayTraded.reduce((acc, o) => acc + (o.pnl || 0), 0);
    const dayCharges = dayTraded.reduce((acc, o) => acc + (o.totalCharges || 0), 0);

    return {
      total,
      tradedCount: traded.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      cancelledCount: cancelled.length,
      totalTurnover,
      totalCharges,
      totalPnl,
      dayPnl,
      dayCharges,
      activeDateStr,
      fillRate,
    };
  }, [orders, selectedDate]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    const list = orders.filter((o: DhanOrderItem) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING') {
          if (o.orderStatus !== 'PENDING' && o.orderStatus !== 'TRANSIT') return false;
        } else if (o.orderStatus !== statusFilter) {
          return false;
        }
      }

      // 2. Product Filter
      if (productFilter !== 'ALL' && o.productType !== productFilter) {
        return false;
      }

      // 3. Side Filter
      if (sideFilter !== 'ALL' && o.transactionType !== sideFilter) {
        return false;
      }

      // 4. Date Filter (Specific Day or Custom Range — defaults to Today)
      const orderDayKey = (() => {
        const raw = String(o.exchangeTime || '').trim();
        const directMatch = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T ]|$)/);
        if (directMatch && !raw.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(raw)) {
          return directMatch[1];
        }
        try {
          const parsed = new Date(raw);
          if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
          }
        } catch {}
        return '';
      })();

      if (dateRange?.from) {
        if (!orderDayKey) return false;
        const fromKey = dateRange.from.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const toKey = (dateRange.to ?? dateRange.from).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        if (orderDayKey < fromKey || orderDayKey > toKey) return false;
      } else if (selectedDate) {
        if (!orderDayKey) return false;
        const targetKey = selectedDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        if (orderDayKey !== targetKey) return false;
      }

      // 5. Search Filter (symbol, custom symbol, orderId)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSym = o.tradingSymbol.toLowerCase().includes(q);
        const matchName = (o.customSymbol || '').toLowerCase().includes(q);
        const matchId = o.orderId.toLowerCase().includes(q);
        const matchExId = (o.exchangeOrderId || '').toLowerCase().includes(q);
        if (!matchSym && !matchName && !matchId && !matchExId) return false;
      }

      return true;
    });

    // Sort by latest execution timestamp first (current day orders placed on top)
    return list.sort((a: DhanOrderItem, b: DhanOrderItem) => {
      const timeA = new Date(a.exchangeTime || a.updateTime || 0).getTime() || 0;
      const timeB = new Date(b.exchangeTime || b.updateTime || 0).getTime() || 0;
      return timeB - timeA;
    });
  }, [orders, statusFilter, productFilter, sideFilter, selectedDate, searchQuery]);

  // If user selected "View", render complete dedicated Order & Journal Details page strictly in Kortix UI
  if (viewingOrder) {
    const ist = formatToKolkataIST(viewingOrder.exchangeTime);
    const session = getSessionInfo(ist.timeStr);
    const isBuy = (viewingOrder.tradeDirection || viewingOrder.transactionType) === 'BUY' || (viewingOrder.tradeDirection || viewingOrder.transactionType) === 'Buy';
    const isTraded = viewingOrder.orderStatus === 'TRADED';
    const isPending = viewingOrder.orderStatus === 'PENDING' || viewingOrder.orderStatus === 'TRANSIT';
    const isRejected = viewingOrder.orderStatus === 'REJECTED';

    // Exact trade data matching Dhan round-trip
    const tradeQty = viewingOrder.tradedQuantity || viewingOrder.quantity || 1;
    const entryPrice = viewingOrder.entryPrice ?? viewingOrder.avgTradedPrice ?? viewingOrder.price ?? 0;
    const exitPrice = viewingOrder.exitPrice ?? viewingOrder.avgTradedPrice ?? viewingOrder.price ?? 0;
    const entryDate = viewingOrder.entryDate || ist.dateStr;
    const entryTime = formatSimpleTime(viewingOrder.entryTimeStr || ist.timeStr);
    const exitDate = viewingOrder.exitDate || ist.dateStr;
    const exitTime = formatSimpleTime(viewingOrder.exitTimeStr || ist.timeStr);
    const pnlVal = viewingOrder.pnl ?? 0;
    const pnlDisplay = `${pnlVal >= 0 ? '+' : ''}${pnlVal.toFixed(2)} RS`;
    const feesTotal = viewingOrder.totalFees ?? viewingOrder.totalCharges ?? 0;
    const riskR = viewingOrder.riskR ?? (entryPrice > 0 ? Number((Math.max(0.5, entryPrice * 0.01) * tradeQty).toFixed(1)) : undefined);
    const returnR = viewingOrder.returnR ?? (riskR && riskR > 0 ? Number((pnlVal / riskR).toFixed(2)) : undefined);
    const stopLossPrice = viewingOrder.stopLossPrice ?? (entryPrice > 0 ? (isBuy ? entryPrice - 0.5 : entryPrice + 0.5) : 0);
    const takeProfitPrice = viewingOrder.takeProfitPrice ?? (entryPrice > 0 ? (isBuy ? entryPrice + 1.0 : entryPrice - 1.0) : 0);

    // Retrieve user confluences and notes if user added any in localStorage
    let userConfluences: string[] = [];
    let userNotes = '';
    if (typeof window !== 'undefined') {
      try {
        const rawTrades = window.localStorage.getItem('kortix_trading_journal_trades_v2');
        if (rawTrades) {
          const parsed = JSON.parse(rawTrades);
          if (Array.isArray(parsed)) {
            const match = parsed.find((t: any) =>
              (t.id && t.id.includes(viewingOrder.orderId)) ||
              (t.instrument === viewingOrder.tradingSymbol && t.entryDate === entryDate && t.entryTime === entryTime)
            );
            if (match) {
              userConfluences = Array.isArray(match.confluences) ? match.confluences : [];
              userNotes = match.notes || '';
            }
          }
        }
      } catch { }
    }

    return (
      <div className="relative w-full h-full min-h-0 flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto bg-background text-foreground font-sans">
        {/* Top Header Bar strictly in Journal Report style */}
        <div className="w-full flex flex-col gap-4 pb-4 border-b border-border/40 font-sans">
          <div>
            <button
              type="button"
              onClick={() => setViewingOrder(null)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Orders</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <StockSymbolIcon symbol={viewingOrder.tradingSymbol} size="md" />
              <div className="flex items-baseline gap-2 flex-wrap font-sans">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                  {viewingOrder.tradingSymbol}
                </h1>
                <span className="text-muted-foreground/50 font-normal">·</span>
                <span className="text-xs sm:text-sm text-muted-foreground font-medium tabular-nums">
                  {ist.dateStr} {formatTo12Hour(ist.timeStr)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSharingOrder(viewingOrder);
                  if (typeof window !== 'undefined' && viewingOrder) {
                    const url = `${window.location.origin}${window.location.pathname}?tab=orders&orderId=${viewingOrder.orderId}`;
                    copyTextDirectly(url);
                    setViewShareCopied(true);
                    setTimeout(() => setViewShareCopied(false), 2000);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:bg-muted/50 transition-colors cursor-pointer font-sans active:scale-95"
              >
                {viewShareCopied ? (
                  <>
                    <Check className="size-3.5 text-foreground" />
                    <span>Copied Link</span>
                  </>
                ) : (
                  <>
                    <ShareNetwork className="size-3.5 text-muted-foreground" />
                    <span>Share</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => downloadOrderPdf(viewingOrder)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3.5 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:bg-muted/50 transition-colors cursor-pointer font-sans"
              >
                <DownloadSimple className="size-3.5 text-muted-foreground" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Journal Report Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
          {/* LEFT COLUMN: TRADE DETAILS & METRICS (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <Card className="bg-card border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col gap-5 font-sans">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <h2 className="text-sm font-bold text-foreground">Trade Details</h2>
                <Badge variant="outline" className="text-[11px] font-sans">
                  {viewingOrder.timeframe || '1m'}
                </Badge>
              </div>

              {/* Net P&L */}
              <div className="flex flex-col gap-0.5 pb-4 border-b border-border/40">
                <span
                  className={cn(
                    'text-2xl sm:text-3xl font-bold font-sans tabular-nums tracking-tight',
                    pnlVal > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : pnlVal < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-foreground'
                  )}
                >
                  {pnlDisplay}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  NET REALIZED PNL
                </span>
              </div>

              {/* Instrument / Direction / Lots */}
              <div className="grid grid-cols-3 gap-2 pb-4 border-b border-border/40">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold font-sans text-foreground flex items-center gap-1.5 truncate">
                    <StockSymbolIcon symbol={viewingOrder.tradingSymbol} size="sm" />
                    <span>{viewingOrder.tradingSymbol}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    INSTRUMENT
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      'text-sm font-semibold flex items-center gap-1',
                      isBuy ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {isBuy ? '↑ Buy' : '↓ Sell'}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    DIRECTION
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold font-sans tabular-nums text-foreground">
                    {tradeQty}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    LOT SIZE
                  </span>
                </div>
              </div>

              {/* Context: Date, Time, Session, Duration */}
              <div className="flex flex-col gap-2.5 pb-4 border-b border-border/40 text-xs">
                <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                  Context:
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Entry Date</span>
                  <span className="text-foreground font-medium">{entryDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Entry Time</span>
                  <span className="text-foreground font-sans tabular-nums">{formatTo12Hour(entryTime)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Exit Date</span>
                  <span className="text-foreground font-medium">{exitDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Exit Time</span>
                  <span className="text-foreground font-sans tabular-nums">{formatTo12Hour(exitTime)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 pt-1">
                  <span className="text-muted-foreground shrink-0">Session</span>
                  <div className="text-right">
                    <span className="text-foreground font-medium block">{session.name}</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">{session.window}</span>
                  </div>
                </div>
              </div>

              {/* Execution & Pricing */}
              <div className="flex flex-col gap-2.5 pb-4 border-b border-border/40 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Execution & Pricing:
                  </span>
                  <span
                    className={cn(
                      'text-[10.5px] font-bold tabular-nums px-2 py-0.5 rounded-md',
                      pnlVal >= 0
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {pnlVal >= 0 ? '+ Profit' : '- Loss'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Entry Price</span>
                  <span className="text-foreground font-sans tabular-nums font-medium">₹{entryPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Exit Price</span>
                  <span className="text-foreground font-sans tabular-nums font-medium">₹{exitPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stop Loss (Price)</span>
                  <span className="text-foreground font-sans tabular-nums font-medium">
                    {stopLossPrice > 0 ? `₹${stopLossPrice.toFixed(2)}` : 'Not Set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Take Profit (Price)</span>
                  <span className="text-foreground font-sans tabular-nums font-medium">
                    {takeProfitPrice > 0 ? `₹${takeProfitPrice.toFixed(2)}` : 'Not Set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Net P&L (₹)</span>
                  <span
                    className={cn(
                      'font-sans tabular-nums font-bold',
                      pnlVal > 0 ? 'text-emerald-600 dark:text-emerald-400' : pnlVal < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                    )}
                  >
                    {pnlDisplay}
                  </span>
                </div>
              </div>

              {/* Performance */}
              <div className="flex flex-col gap-2.5 pb-4 border-b border-border/40 text-xs">
                <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                  Performance:
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Risk (R)</span>
                  <span className="text-foreground font-sans tabular-nums font-medium">
                    {riskR != null ? `${riskR.toFixed(1)}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Return (R)</span>
                  <span
                    className={cn(
                      'font-sans tabular-nums font-medium',
                      returnR != null
                        ? returnR >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                        : 'text-muted-foreground'
                    )}
                  >
                    {returnR != null ? `${returnR >= 0 ? '+' : ''}${returnR.toFixed(2)}` : '—'}
                  </span>
                </div>
              </div>

              {/* Costs */}
              <div className="flex flex-col gap-2.5 pb-4 border-b border-border/40 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Costs:
                  </span>
                  <span className="text-[10px] text-muted-foreground">Statutory & Brokerage</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fees & Commission (₹)</span>
                  <span className="text-foreground font-sans tabular-nums font-medium">₹{feesTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Swap (₹)</span>
                  <span className="text-foreground font-sans tabular-nums font-medium">₹0.00</span>
                </div>
              </div>

              {/* Statutory & Brokerage Charges Breakdown */}
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-border/30">
                  <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Statutory & Brokerage Charges Breakdown
                  </span>
                  <span className="font-mono font-bold text-foreground tabular-nums">
                    ₹{viewingOrder.totalCharges.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Brokerage:</span>
                  <span className="font-mono text-foreground tabular-nums">₹{viewingOrder.brokerageCharges.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>GST / Service Tax:</span>
                  <span className="font-mono text-foreground tabular-nums">₹{viewingOrder.serviceTax.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Exchange Turnover:</span>
                  <span className="font-mono text-foreground tabular-nums">₹{viewingOrder.exchangeCharges.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>SEBI Charges:</span>
                  <span className="font-mono text-foreground tabular-nums">₹{viewingOrder.sebiTax.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Stamp Duty:</span>
                  <span className="font-mono text-foreground tabular-nums">₹{viewingOrder.stampDuty.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>STT:</span>
                  <span className="font-mono text-foreground tabular-nums">₹{viewingOrder.stt.toFixed(4)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: CONFLUENCES, REVIEW & AUDIT (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <Card className="bg-card border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6 font-sans">
              {/* 1. Entry Confluences, Review & Reflection */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Entry Confluences, Review & Reflection
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingConfluence(userConfluences.join(', '));
                      setEditingNotes(userNotes);
                      setConfluenceModalOpen(true);
                    }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>

                {/* Entry Confluences */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Entry Confluences
                  </span>
                  {userConfluences.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {userConfluences.map((conf, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted/60 border border-border/60 text-foreground shadow-2xs"
                        >
                          {conf}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/80 italic p-3 rounded-lg bg-muted/20 border border-border/40">
                      No entry confluences added yet.
                    </p>
                  )}
                </div>

                {/* Review & Reflection */}
                <div className="flex flex-col gap-2 pt-2 border-t border-border/30">
                  <span className="text-xs font-medium text-muted-foreground">
                    Review & Reflection
                  </span>
                  <p className="text-xs text-foreground leading-relaxed p-3.5 rounded-lg bg-muted/20 border border-border/40">
                    {userNotes || 'No reflection notes added yet.'}
                  </p>
                </div>
              </div>

              {/* 2. Audit & Clearing Identifiers */}
              <div className="flex flex-col gap-3 pt-3 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Audit & Clearing Identifiers
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Execution Date:</span>
                    <span className="font-medium text-foreground mt-0.5 block">{ist.dateStr}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Execution Time (IST):</span>
                    <span className="font-medium text-foreground mt-0.5 block">{formatTo12Hour(ist.timeStr)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Exchange Order ID:</span>
                    <span className="font-mono text-foreground mt-0.5 block truncate">{viewingOrder.exchangeOrderId || '1000000078573566'}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">ISIN:</span>
                    <span className="font-mono text-foreground mt-0.5 block truncate">{viewingOrder.isin || 'INE483A01010'}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Exchange Segment:</span>
                    <span className="font-mono text-foreground mt-0.5 block">{viewingOrder.exchangeSegment || 'NSE_EQ'}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Execution Type:</span>
                    <span className="font-medium text-foreground mt-0.5 block">Direct Market Access (DMA)</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Confluence & Reflection Notes Dialog */}
        <Dialog open={confluenceModalOpen} onOpenChange={(open) => !open && setConfluenceModalOpen(false)}>
          <DialogContent className="sm:max-w-md font-sans border border-border/80 bg-card shadow-2xl rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Target className="size-4 text-primary" />
                <span>Edit Journal Confluences & Reflection</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add your trade entry confluences and post-trade reflection notes.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2 text-xs font-sans">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground text-xs">Entry Confluences (comma-separated)</label>
                <input
                  type="text"
                  value={editingConfluence}
                  onChange={(e) => setEditingConfluence(e.target.value)}
                  placeholder="e.g. Support bounce, VWAP hold, Higher low"
                  className="w-full rounded-lg border border-border/70 bg-muted/30 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground text-xs">Review & Reflection Description</label>
                <textarea
                  rows={4}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Write your review, emotion notes, and execution reflections..."
                  className="w-full rounded-lg border border-border/70 bg-muted/30 p-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-border/40 pt-3">
              <button
                type="button"
                onClick={() => setConfluenceModalOpen(false)}
                className="inline-flex items-center justify-center rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:bg-muted/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && viewingOrder) {
                    try {
                      const rawTrades = window.localStorage.getItem('kortix_trading_journal_trades_v2');
                      let list = rawTrades ? JSON.parse(rawTrades) : [];
                      if (!Array.isArray(list)) list = [];
                      const newConfluences = editingConfluence.split(',').map((s) => s.trim()).filter(Boolean);

                      const existingIdx = list.findIndex((t: any) =>
                        (t.id && t.id.includes(viewingOrder.orderId)) ||
                        (t.instrument === viewingOrder.tradingSymbol && t.entryDate === (viewingOrder.entryDate || formatToKolkataIST(viewingOrder.exchangeTime).dateStr))
                      );

                      if (existingIdx !== -1) {
                        list[existingIdx].confluences = newConfluences;
                        list[existingIdx].notes = editingNotes;
                      } else {
                        list.push({
                          id: `dhan_${viewingOrder.orderId}`,
                          instrument: viewingOrder.tradingSymbol,
                          direction: viewingOrder.tradeDirection || viewingOrder.transactionType,
                          entryDate: viewingOrder.entryDate || formatToKolkataIST(viewingOrder.exchangeTime).dateStr,
                          entryTime: viewingOrder.entryTimeStr || formatToKolkataIST(viewingOrder.exchangeTime).timeStr.slice(0, 5),
                          confluences: newConfluences,
                          notes: editingNotes,
                        });
                      }
                      window.localStorage.setItem('kortix_trading_journal_trades_v2', JSON.stringify(list));
                      window.dispatchEvent(new CustomEvent('dhan-orders-updated'));
                    } catch { }
                  }
                  setConfluenceModalOpen(false);
                }}
                className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Save Details
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Share Order Dialog inside viewingOrder */}
        <Dialog open={!!sharingOrder} onOpenChange={(open) => !open && setSharingOrder(null)}>
          <DialogContent className="sm:max-w-md font-sans border border-border/80 bg-card shadow-2xl rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <ShareNetwork className="size-4 text-primary" />
                <span>Share Order #{sharingOrder?.orderId}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Share this {sharingOrder?.tradingSymbol} trade execution with workspace members or copy a direct link.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2 text-xs font-sans">
              {/* Copy Link Input */}
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-foreground text-xs">Direct Link</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={
                      typeof window !== 'undefined'
                        ? `${window.location.origin}${window.location.pathname}?tab=orders&orderId=${sharingOrder?.orderId}`
                        : ''
                    }
                    className="flex-1 rounded-lg border border-border/70 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && sharingOrder) {
                        const url = `${window.location.origin}${window.location.pathname}?tab=orders&orderId=${sharingOrder.orderId}`;
                        copyTextDirectly(url);
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 2000);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:bg-muted/50 transition-colors cursor-pointer outline-none focus:outline-none focus:ring-0"
                  >
                    {shareCopied ? (
                      <>
                        <Check className="size-3.5 text-foreground" />
                        <span className="text-foreground font-medium">copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5 text-muted-foreground" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Workspace Members to Share With */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                <span className="font-medium text-foreground text-xs">Share with Workspace Members</span>
                <div className="flex flex-col gap-1.5">
                  {[
                    { id: '1', name: 'Trading Team', role: 'Collaborator', tag: 'Team' },
                    { id: '2', name: 'Quantitative Analyst', role: 'Analyst', tag: 'Internal' },
                    { id: '3', name: 'Risk Management Desk', role: 'Reviewer', tag: 'Risk' },
                  ].map((member) => {
                    const isShared = sharedMembers.includes(member.id);
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground uppercase">
                            {member.name.substring(0, 2)}
                          </span>
                          <div>
                            <p className="font-medium text-foreground text-xs leading-none">{member.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{member.role}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isShared) {
                              setSharedMembers((prev) => [...prev, member.id]);
                            }
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                            isShared
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold cursor-default'
                              : 'border border-border/70 bg-card hover:bg-muted/60 text-foreground'
                          )}
                        >
                          {isShared ? 'Shared ✓' : 'Share'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-border/40 pt-3">
              <button
                type="button"
                onClick={() => setSharingOrder(null)}
                className="inline-flex items-center justify-center rounded-lg border border-border/70 bg-card px-4 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:bg-muted/50 transition-colors cursor-pointer"
              >
                Done
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex-1 p-3 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6 overflow-y-auto bg-background text-foreground font-sans">
      {/* 1. Header Section (Cleaned: removed long subtitle, 64 orders badge, Dhan Live Connected, and Sync button) */}
      <div className="flex items-center justify-between pb-2 border-b border-border/40 font-sans">
        <div className="flex items-center gap-1 sm:gap-2.5">
          <SidebarToggle className="-ml-2" />
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground font-sans">
            Orders
          </h1>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards with Selected Wallpaper */}
      <div className="relative p-3.5 sm:p-4 rounded-2xl border border-border/70 overflow-hidden shadow-2xs font-sans">
        <div className="absolute inset-0 pointer-events-none opacity-85 overflow-hidden">
          <WallpaperBackground />
        </div>
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4 font-sans">
          {/* Total Orders */}
          <div className="rounded-xl border border-border/70 bg-card/85 backdrop-blur-md p-3 sm:p-4 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                <Receipt className="size-3.5 text-muted-foreground" />
              </span>
              <span className="text-xs font-medium text-muted-foreground font-sans">Total Orders</span>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <div className="text-xl sm:text-2xl font-normal tracking-tight tabular-nums text-foreground font-sans">
                {metrics.total}
              </div>
            </div>
          </div>

          {/* Executed (Fills) */}
          <div className="rounded-xl border border-border/70 bg-card/85 backdrop-blur-md p-3 sm:p-4 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                <CheckCircle className="size-3.5 text-muted-foreground" />
              </span>
              <span className="text-xs font-medium text-muted-foreground font-sans">Executed (Fills)</span>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <div className="text-xl sm:text-2xl font-normal tracking-tight tabular-nums text-foreground font-sans">
                {metrics.tradedCount}
              </div>
            </div>
          </div>

          {/* Open / Pending */}
          <div className="rounded-xl border border-border/70 bg-card/85 backdrop-blur-md p-3 sm:p-4 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                <Clock className="size-3.5 text-muted-foreground" />
              </span>
              <span className="text-xs font-medium text-muted-foreground font-sans">Open / Pending</span>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <div className="text-xl sm:text-2xl font-normal tracking-tight tabular-nums text-foreground font-sans">
                {metrics.pendingCount}
              </div>
            </div>
          </div>

          {/* Day PnL (Calculated strictly for current/selected day) */}
          <div className="rounded-xl border border-border/70 bg-card/85 backdrop-blur-md p-3 sm:p-4 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
            <div className="flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                  <TrendUp className="size-3.5 text-muted-foreground" />
                </span>
                <span className="text-xs font-medium text-muted-foreground font-sans">Day PnL</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono font-medium hidden xs:inline">
                {metrics.activeDateStr}
              </span>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <div
                className={cn(
                  'text-lg sm:text-2xl font-normal tracking-tight tabular-nums font-sans',
                  metrics.dayPnl > 0
                    ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                    : metrics.dayPnl < 0
                      ? 'text-rose-600 dark:text-rose-400 font-medium'
                      : 'text-foreground'
                )}
              >
                {metrics.dayPnl >= 0 ? '+' : ''}{metrics.dayPnl.toFixed(2)} RS
              </div>
            </div>
          </div>

          {/* Total Charges & Fees */}
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-border/70 bg-card/85 backdrop-blur-md p-3 sm:p-4 shadow-2xs transition-all hover:border-border flex flex-col justify-between font-sans">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="size-6 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center shrink-0">
                <ShieldCheck className="size-3.5 text-muted-foreground" />
              </span>
              <span className="text-xs font-medium text-muted-foreground font-sans">Fees & Statutory</span>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <div className="text-xl sm:text-2xl font-normal tracking-tight tabular-nums text-foreground font-sans">
                ₹{metrics.totalCharges.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Status Tabs, Single Unified Filter Button & COSS UI Calendar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-sans">
        {/* Status Tabs */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/60 overflow-x-auto">
      {
        [
        { id: 'ALL', label: 'All Orders', count: metrics.total },
        { id: 'TRADED', label: 'Executed', count: metrics.tradedCount },
        { id: 'PENDING', label: 'Pending', count: metrics.pendingCount },
        { id: 'REJECTED', label: 'Rejected', count: metrics.rejectedCount },
        { id: 'CANCELLED', label: 'Cancelled', count: metrics.cancelledCount },
          ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id as any)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer font-sans whitespace-nowrap',
              statusFilter === tab.id
                ? 'bg-card text-foreground shadow-2xs font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.2 text-[10.5px]',
                statusFilter === tab.id ? 'bg-primary/10 text-primary font-bold' : 'bg-muted text-muted-foreground'
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
        </div>

        {/* Right side: Unified Filter Popover, Calendar Picker & Search */}
        <div className="flex items-center gap-2">
          {/* A. Unified Filter Popover Button (Replaces ALL BUY SELL & native select) */}
          <Popover>
            <PopoverTrigger
              type="button"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:bg-muted/50 transition-colors cursor-pointer font-sans',
                (sideFilter !== 'ALL' || productFilter !== 'ALL') && 'bg-muted/60 text-foreground font-semibold'
              )}
            >
              <Funnel className="size-3.5 text-muted-foreground" />
              <span>Filter</span>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3.5 flex flex-col gap-3.5 border border-border/80 bg-card shadow-xl rounded-xl font-sans">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-semibold text-foreground">Filter Orders</span>
                {(sideFilter !== 'ALL' || productFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSideFilter('ALL');
                      setProductFilter('ALL');
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Side Filter */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Order Side</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['ALL', 'BUY', 'SELL'] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setSideFilter(side)}
                      className={cn(
                        'px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer text-center',
                        sideFilter === side
                          ? side === 'BUY'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold'
                            : side === 'SELL'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold'
                              : 'bg-muted text-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                      )}
                    >
                      {side === 'ALL' ? 'All' : side === 'BUY' ? 'Buy' : 'Sell'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Filter */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Product Type</span>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'ALL', label: 'All Products' },
                    { id: 'INTRADAY', label: 'Intraday' },
                    { id: 'CNC', label: 'CNC' },
                    { id: 'MARGIN', label: 'Margin' },
                  ].map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => setProductFilter(prod.id as any)}
                      className={cn(
                        'px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer text-left truncate',
                        productFilter === prod.id
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                      )}
                    >
                      {prod.label}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* B. Calendar Date Picker (Today by default, plus Previous Days & Custom Range) */}
          <Popover>
            <PopoverTrigger
              type="button"
              aria-label="Filter by date"
              title={
                dateRange?.from
                  ? `Range: ${dateRange.from.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${(dateRange.to ?? dateRange.from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                  : selectedDate
                    ? `Filter: ${selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                    : 'All Dates'
              }
              className={cn(
                'inline-flex items-center justify-center size-8 rounded-lg border border-border/60 bg-card text-muted-foreground shadow-2xs hover:bg-muted/50 hover:text-foreground transition-colors cursor-pointer font-sans outline-none focus:outline-none focus:ring-0',
                (selectedDate || dateRange?.from) && 'bg-primary/10 text-primary border-primary/30 font-semibold'
              )}
            >
              <CalendarBlank className="size-4" />
            </PopoverTrigger>
            <PopoverContent align="end" className="p-0 border border-border/80 bg-card shadow-xl rounded-xl">
              <div className="px-2.5 pt-2.5 pb-1 flex items-center gap-1 border-b border-border/40">
                <button
                  type="button"
                  onClick={() => {
                    setCalendarMode('single');
                    setDateRange(undefined);
                    if (!selectedDate) setSelectedDate(new Date());
                  }}
                  className={cn(
                    'flex-1 text-[11px] font-medium py-1 px-2 rounded-md transition-colors cursor-pointer',
                    calendarMode === 'single'
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  Single Day
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarMode('range');
                    if (!dateRange?.from && selectedDate) {
                      setDateRange({ from: selectedDate, to: selectedDate });
                    }
                  }}
                  className={cn(
                    'flex-1 text-[11px] font-medium py-1 px-2 rounded-md transition-colors cursor-pointer',
                    calendarMode === 'range'
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  Custom Range
                </button>
              </div>
              <Calendar
                mode={calendarMode as any}
                selected={(calendarMode === 'range' ? dateRange : selectedDate) as any}
                onSelect={(val: any) => {
                  if (calendarMode === 'range') {
                    setDateRange(val);
                    if (val?.from) setSelectedDate(val.from);
                  } else {
                    setDateRange(undefined);
                    setSelectedDate(val);
                  }
                }}
                initialFocus
              />
              <div className="p-2 border-t border-border/40 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCalendarMode('single');
                    setDateRange(undefined);
                    setSelectedDate(new Date());
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1 rounded hover:bg-muted cursor-pointer"
                >
                  Today
                </button>
                {(selectedDate || dateRange?.from) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateRange(undefined);
                      setSelectedDate(undefined);
                    }}
                    className="text-xs text-destructive hover:text-destructive/80 font-medium px-2 py-1 rounded hover:bg-destructive/10 cursor-pointer"
                  >
                    All Dates
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* C. Search Input (Soft Kortix border, no harsh black ring) */}
          <div className="relative min-w-[180px] max-w-xs">
            <MagnifyingGlass className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol or ID..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border/60 bg-muted/20 text-xs text-foreground placeholder:text-muted-foreground/60 shadow-2xs focus:border-border/80 focus:bg-background focus:outline-none focus:ring-0 font-sans transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Table UI Built with components/ui/table & components/ui/badge */}
      <div className="w-full overflow-x-auto rounded-xl border border-border/70 bg-card shadow-2xs [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead className="whitespace-nowrap">Time</TableHead>
            <TableHead className="min-w-[120px]">Symbol</TableHead>
            <TableHead>Side</TableHead>
            <TableHead className="hidden sm:table-cell">Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="hidden lg:table-cell text-right">Order Price</TableHead>
            <TableHead className="text-right">Avg Price</TableHead>
            <TableHead className="text-right">PnL</TableHead>
            <TableHead className="hidden sm:table-cell text-right">Charges</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center w-14">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Order Placement Skeleton Row */}
          {placingOrder && (
            <TableRow className="animate-pulse bg-emerald-500/5 dark:bg-emerald-950/20 border-b border-emerald-500/30">
              <TableCell className="hidden sm:table-cell">
                <div className="h-4 w-16 bg-muted-foreground/20 rounded animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-12 bg-muted-foreground/20 rounded animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2.5 min-w-[120px]">
                  <div className="size-8 rounded-full bg-emerald-500/20 animate-pulse shrink-0 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                    {placingOrder.symbol?.slice(0, 2) || 'DH'}
                  </div>
                  <div className="space-y-1">
                    <div className="h-4 w-20 bg-muted-foreground/25 rounded font-semibold text-xs text-foreground">
                      {placingOrder.symbol || 'Routing Order...'}
                    </div>
                    <div className="h-3 w-14 bg-muted-foreground/15 rounded" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-sans text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse">
                  <span className="size-1.5 rounded-full mr-1.5 bg-emerald-500 animate-ping" />
                  {placingOrder.side || 'Order'}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="h-4 w-14 bg-muted-foreground/20 rounded animate-pulse" />
              </TableCell>
              <TableCell className="text-right">
                <div className="h-4 w-10 ml-auto bg-muted-foreground/20 rounded animate-pulse" />
              </TableCell>
              <TableCell className="text-right">
                <div className="h-4 w-14 ml-auto bg-muted-foreground/20 rounded animate-pulse" />
              </TableCell>
              <TableCell className="text-right">
                <div className="h-4 w-16 ml-auto bg-muted-foreground/20 rounded animate-pulse" />
              </TableCell>
              <TableCell className="text-right">
                <div className="h-4 w-12 ml-auto bg-muted-foreground/20 rounded animate-pulse" />
              </TableCell>
              <TableCell className="hidden sm:table-cell text-right">
                <div className="h-4 w-10 ml-auto bg-muted-foreground/20 rounded animate-pulse" />
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                  <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                  Placing...
                </span>
              </TableCell>
              <TableCell className="text-center">
                <div className="size-6 mx-auto rounded bg-muted-foreground/20 animate-pulse" />
              </TableCell>
            </TableRow>
          )}

          {filteredOrders.length === 0 && !placingOrder ? (
            <TableRow>
              <TableCell colSpan={12} className="py-12 text-center text-muted-foreground font-sans">
                <Receipt className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">No orders match the selected filters</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your search query, side, product or date filter.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            filteredOrders.map((order: DhanOrderItem) => {
              const ist = formatToKolkataIST(order.exchangeTime);
              const isBuy = order.transactionType === 'BUY';
              const isTraded = order.orderStatus === 'TRADED';
              const isPending = order.orderStatus === 'PENDING' || order.orderStatus === 'TRANSIT';
              const isRejected = order.orderStatus === 'REJECTED';
              const pnlValue = order.pnl != null ? order.pnl : 0;
              const pnlText = `${pnlValue >= 0 ? '+' : ''}${pnlValue.toFixed(2)} RS`;

              return (
                <TableRow key={order.orderId}>
                  {/* 1. Date */}
                  <TableCell className="hidden sm:table-cell font-normal text-muted-foreground tabular-nums">
                    {ist.dateStr}
                  </TableCell>

                  {/* 2. Time */}
                  <TableCell className="font-medium text-foreground tabular-nums whitespace-nowrap">
                    {ist.timeStr}
                  </TableCell>

                  {/* 3. Instrument (NSE_EQ removed) */}
                  <TableCell>
                    <div className="flex items-center gap-2.5 min-w-[120px]">
                      <StockSymbolIcon symbol={order.tradingSymbol} size="md" />
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground text-[13px] tracking-tight truncate max-w-[110px] sm:max-w-none">
                          {order.tradingSymbol}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[110px] sm:max-w-[170px]">
                          {order.customSymbol || order.tradingSymbol}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* 4. Side Badge with Kortix Component Badge */}
                  <TableCell>
                    <Badge variant="outline" className="font-sans text-xs">
                      <span
                        aria-hidden="true"
                        className={cn('size-1.5 rounded-full mr-1.5', isBuy ? 'bg-emerald-500' : 'bg-rose-500')}
                      />
                      {isBuy ? 'Buy' : 'Sell'}
                    </Badge>
                  </TableCell>

                  {/* 5. Product (MARKET removed, only Intraday or Delivery in Kortix font) */}
                  <TableCell className="hidden sm:table-cell font-medium text-foreground text-xs">
                    {order.productType === 'INTRADAY'
                      ? 'Intraday'
                      : order.productType === 'CNC'
                        ? 'Delivery'
                        : order.productType}
                  </TableCell>

                  {/* 6. Quantity */}
                  <TableCell className="text-right tabular-nums text-xs whitespace-nowrap">
                    <span className="font-semibold text-foreground">
                      {order.tradedQuantity > 0 ? order.tradedQuantity : order.quantity}
                    </span>
                    <span className="text-muted-foreground text-[11px]"> / {order.quantity}</span>
                  </TableCell>

                  {/* 7. Order Price */}
                  <TableCell className="hidden lg:table-cell text-right tabular-nums text-xs text-muted-foreground">
                    {order.price > 0 ? `₹${order.price.toFixed(2)}` : 'MKT'}
                  </TableCell>

                  {/* 8. Avg Traded Price */}
                  <TableCell className="text-right tabular-nums text-xs font-semibold text-foreground whitespace-nowrap">
                    ₹{order.avgTradedPrice.toFixed(2)}
                  </TableCell>

                  {/* 9. PnL (Replaced Turnover, e.g. +1.32 RS) */}
                  <TableCell className="text-right tabular-nums text-xs font-medium whitespace-nowrap">
                    <span
                      className={cn(
                        pnlValue > 0
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : pnlValue < 0
                            ? 'text-rose-600 dark:text-rose-400 font-semibold'
                            : 'text-muted-foreground'
                      )}
                    >
                      {pnlText}
                    </span>
                  </TableCell>

                  {/* 10. Charges */}
                  <TableCell className="hidden sm:table-cell text-right tabular-nums text-xs text-muted-foreground whitespace-nowrap">
                    ₹{order.totalCharges.toFixed(2)}
                  </TableCell>

                  {/* 11. Status Badge with Kortix Component Badge */}
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-sans text-xs">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'size-1.5 rounded-full mr-1.5',
                          isTraded
                            ? 'bg-emerald-500'
                            : isPending
                              ? 'bg-amber-500'
                              : isRejected
                                ? 'bg-red-500'
                                : 'bg-muted-foreground/64'
                        )}
                      />
                      {isTraded ? 'Traded' : isPending ? 'Pending' : isRejected ? 'Rejected' : 'Cancelled'}
                    </Badge>
                  </TableCell>

                  {/* 12. Action Column with Three Dots Menu */}
                  <TableCell className="text-center">
                    <Menu>
                      <MenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                          title="Actions"
                        >
                          <DotsThreeVertical className="size-4" weight="bold" />
                        </button>
                      </MenuTrigger>
                      <MenuPopup align="end" className="w-32 font-sans">
                        <MenuItem
                          onSelect={() => setViewingOrder(order)}
                          className="cursor-pointer text-xs py-1.5 px-2.5 font-medium"
                        >
                          View
                        </MenuItem>
                        <MenuItem
                          onSelect={() => setSharingOrder(order)}
                          className="cursor-pointer text-xs py-1.5 px-2.5 font-medium"
                        >
                          Share
                        </MenuItem>
                        <MenuItem
                          onSelect={() => downloadOrderPdf(order)}
                          className="cursor-pointer text-xs py-1.5 px-2.5 font-medium"
                        >
                          Download
                        </MenuItem>
                      </MenuPopup>
                    </Menu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>

    {/* Share Order Dialog */}
    <Dialog open={!!sharingOrder} onOpenChange={(open) => !open && setSharingOrder(null)}>
      <DialogContent className="sm:max-w-md font-sans border border-border/80 bg-card shadow-2xl rounded-xl">
    <DialogHeader>
      <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
        <ShareNetwork className="size-4 text-primary" />
        <span>Share Order #{sharingOrder?.orderId}</span>
      </DialogTitle>
      <DialogDescription className="text-xs text-muted-foreground">
        Share this {sharingOrder?.tradingSymbol} trade execution with workspace members or copy a direct link.
      </DialogDescription>
    </DialogHeader>

    <div className="flex flex-col gap-4 py-2 text-xs font-sans">
      {/* Copy Link Input */}
      <div className="flex flex-col gap-1.5">
        <span className="font-medium text-foreground text-xs">Direct Link</span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={
              typeof window !== 'undefined'
                ? `${window.location.origin}${window.location.pathname}?tab=orders&orderId=${sharingOrder?.orderId}`
                : ''
            }
            className="flex-1 rounded-lg border border-border/70 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground select-all outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && sharingOrder) {
                const url = `${window.location.origin}${window.location.pathname}?tab=orders&orderId=${sharingOrder.orderId}`;
                copyTextDirectly(url);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:bg-muted/50 transition-colors cursor-pointer outline-none focus:outline-none focus:ring-0"
          >
            {shareCopied ? (
              <>
                <Check className="size-3.5 text-foreground" />
                <span className="text-foreground font-medium">copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5 text-muted-foreground" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Workspace Members to Share With */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
        <span className="font-medium text-foreground text-xs">Share with Workspace Members</span>
        <div className="flex flex-col gap-1.5">
          {[
            { id: '1', name: 'Trading Team', role: 'Collaborator', tag: 'Team' },
            { id: '2', name: 'Quantitative Analyst', role: 'Analyst', tag: 'Internal' },
            { id: '3', name: 'Risk Management Desk', role: 'Reviewer', tag: 'Risk' },
          ].map((member) => {
            const isShared = sharedMembers.includes(member.id);
            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground uppercase">
                    {member.name.substring(0, 2)}
                  </span>
                  <div>
                    <p className="font-medium text-foreground text-xs leading-none">{member.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{member.role}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isShared) {
                      setSharedMembers((prev) => [...prev, member.id]);
                    }
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                    isShared
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold cursor-default'
                      : 'border border-border/70 bg-card hover:bg-muted/60 text-foreground'
                  )}
                >
                  {isShared ? 'Shared ✓' : 'Share'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    <DialogFooter className="border-t border-border/40 pt-3">
      <button
        type="button"
        onClick={() => setSharingOrder(null)}
        className="inline-flex items-center justify-center rounded-lg border border-border/70 bg-card px-4 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:bg-muted/50 transition-colors cursor-pointer"
      >
        Done
      </button>
    </DialogFooter>
  </DialogContent>
      </Dialog>

      {/* TradingView-Style Connect to DhanHQ Modal */}
      <ConnectDhanModal open={connectModalOpen} onOpenChange={setConnectModalOpen} />
    </div>
  );
}
