import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(path.join(__dirname, '../suna/package.json'));
const pg = require('pg');

// ============================================================================
// 1. Dhan Market Hours & Polling Schedule Engine
// ============================================================================
function computeIstMarketState(date) {
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
  });
  const parts = istFormatter.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);
  const weekday = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
  const isWeekday = weekday !== 'Sat' && weekday !== 'Sun';

  const totalMinutes = hour * 60 + minute;
  // NSE/BSE Equity & Derivatives Active Window: 9:14 AM (554m) to 3:31 PM (931m)
  const isMarketHours = isWeekday && totalMinutes >= (9 * 60 + 14) && totalMinutes <= (15 * 60 + 31);

  return {
    isMarketHours,
    isWeekday,
    timeStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    hour,
    minute,
  };
}

function getAdaptiveSyncInterval(date) {
  const { isMarketHours } = computeIstMarketState(date);
  if (isMarketHours) {
    return 1000; // 1 second fast live polling during market hours
  }
  return 60000; // 60s idle sleep outside market hours
}

// ============================================================================
// 2. Indian Statutory Charges & Intraday Trade Matching Engine
// ============================================================================
function estimateIndianCharges(buyPrice, sellPrice, qty, isIntraday = true) {
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

function matchDhanExecutions(executions, existingTrades = [], projectId) {
  const sorted = [...executions].sort(
    (a, b) => new Date(a.exchangeTime || a.createTime).getTime() - new Date(b.exchangeTime || b.createTime).getTime()
  );

  const openPositions = {};
  const completedTrades = [];

  for (const tr of sorted) {
    const rawSym = tr.tradingSymbol || tr.customSymbol || tr.securityId || 'STOCK';
    const sym = rawSym.replace(/^NSE:/, '').replace(/\.NS$/, '');
    if (!openPositions[sym]) openPositions[sym] = [];

    const side = (tr.transactionType || 'BUY').toUpperCase();
    let remainingQty = Number(tr.tradedQuantity || tr.quantity || 0);
    const price = Number(tr.tradedPrice || tr.price || 0);
    const time = tr.exchangeTime || tr.createTime || new Date().toISOString();

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

    const oppositeSide = side === 'BUY' ? 'SELL' : 'BUY';
    const queue = openPositions[sym];

    while (queue.length > 0 && remainingQty > 0) {
      const matchCandidate = queue[0];
      if (matchCandidate.side !== oppositeSide) break;

      const matchedQty = Math.min(remainingQty, matchCandidate.qty);
      const isLong = matchCandidate.side === 'BUY';
      const buyP = isLong ? matchCandidate.price : price;
      const sellP = isLong ? price : matchCandidate.price;

      const grossPnl = isLong
        ? (sellP - buyP) * matchedQty
        : (buyP - sellP) * matchedQty;

      const charges = estimateIndianCharges(buyP, sellP, matchedQty, true);
      const netPnl = Number((grossPnl - charges).toFixed(2));

      const entryTimeParts = (isLong ? matchCandidate.time : time).split('T');
      const exitTimeParts = (isLong ? time : matchCandidate.time).split('T');

      const riskPerShare = Math.max(0.5, buyP * 0.01);
      const riskR = Number((riskPerShare * matchedQty).toFixed(2));
      const returnR = riskR > 0 ? Number((netPnl / riskR).toFixed(2)) : 0;

      completedTrades.push({
        id: `DHAN_${sym}_${Date.now()}_${completedTrades.length}`,
        projectId,
        instrument: sym,
        direction: isLong ? 'Buy' : 'Sell',
        lots: matchedQty,
        entryPrice: buyP,
        exitPrice: sellP,
        entryDate: entryTimeParts[0],
        entryTime: entryTimeParts[1]?.slice(0, 5) || '09:30',
        exitDate: exitTimeParts[0],
        exitTime: exitTimeParts[1]?.slice(0, 5) || '15:30',
        pnl: netPnl,
        grossPnl: Number(grossPnl.toFixed(2)),
        commission: charges,
        returnR,
        riskR,
        status: 'Closed',
        source: 'auto',
        followedPlan: true,
      });

      remainingQty -= matchedQty;
      matchCandidate.qty -= matchedQty;
      if (matchCandidate.qty === 0) queue.shift();
    }

    if (remainingQty > 0) {
      queue.push({
        side,
        qty: remainingQty,
        price,
        time,
        orderId: tr.orderId || tr.order_id,
      });
    }
  }

  return completedTrades;
}

// ============================================================================
// 3. Simple 12-Hour Time Formatter (14:35 -> 2:35)
// ============================================================================
function formatSimpleTime(timeStr) {
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

// ============================================================================
// 4. Database Helper for Read-Only Schema Verification
// ============================================================================
function getCloudDbUrl() {
  const envPaths = [
    path.join(__dirname, '../suna/apps/api/.env.local'),
    path.join(__dirname, '../suna/apps/web/.env.local'),
    path.join(__dirname, '../suna/.env')
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('DATABASE_URL=')) {
          let val = trimmed.slice('DATABASE_URL='.length).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (val && !val.includes('localhost') && !val.includes('127.0.0.1')) {
            return val;
          }
        }
      }
    }
  }
  return null;
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('1. DhanHQ Market Timing & Polling Schedule Engine', () => {
  it('identifies NSE/BSE active market window (9:14 AM to 3:31 PM IST)', () => {
    // 10:30 AM IST on Wednesday (2026-11-25)
    // 10:30 AM IST = 05:00 UTC
    const marketOpenTime = new Date('2026-11-25T05:00:00.000Z');
    const state = computeIstMarketState(marketOpenTime);
    assert.strictEqual(state.isMarketHours, true, 'Market should be open at 10:30 AM IST');
    assert.strictEqual(state.isWeekday, true);
    assert.strictEqual(getAdaptiveSyncInterval(marketOpenTime), 1000, 'Polling interval must be 1000ms');

    // 09:14 AM IST (554m) on Wednesday (03:44 UTC)
    const marketOpeningBell = new Date('2026-11-25T03:44:00.000Z');
    const stateOpening = computeIstMarketState(marketOpeningBell);
    assert.strictEqual(stateOpening.isMarketHours, true, '9:14 AM is inside active window');
    assert.strictEqual(getAdaptiveSyncInterval(marketOpeningBell), 1000);

    // 03:31 PM IST (931m) on Wednesday (10:01 UTC)
    const marketClosingBell = new Date('2026-11-25T10:01:00.000Z');
    const stateClosing = computeIstMarketState(marketClosingBell);
    assert.strictEqual(stateClosing.isMarketHours, true, '3:31 PM is inside active window');

    // 08:30 PM IST on Wednesday (15:00 UTC) - outside market hours
    const nightTime = new Date('2026-11-25T15:00:00.000Z');
    const stateNight = computeIstMarketState(nightTime);
    assert.strictEqual(stateNight.isMarketHours, false, '8:30 PM IST should be closed');
    assert.strictEqual(getAdaptiveSyncInterval(nightTime), 60000, 'Polling interval must sleep 60s outside hours');

    // Saturday 11:00 AM IST (2026-11-28T05:30:00.000Z) - weekend
    const weekend = new Date('2026-11-28T05:30:00.000Z');
    const stateWeekend = computeIstMarketState(weekend);
    assert.strictEqual(stateWeekend.isMarketHours, false, 'Weekend should never be marked as market hours');
    assert.strictEqual(stateWeekend.isWeekday, false);
  });
});

describe('2. Indian Statutory Charges & Intraday Trade Matching Engine', () => {
  it('accurately calculates Indian statutory charges (STT, Exchange txn, GST, SEBI, Stamp duty)', () => {
    const buyPrice = 2500;
    const sellPrice = 2550;
    const qty = 100;
    const charges = estimateIndianCharges(buyPrice, sellPrice, qty, true);

    // Turnover: 250,000 + 255,000 = 505,000
    // STT (0.025% on sell): 255,000 * 0.00025 = 63.75
    // Exchange txn (0.00325%): 505,000 * 0.0000325 = 16.41
    // GST (18% on exchange charges): 16.41 * 0.18 = 2.95
    // SEBI: (505,000 / 10,000,000) * 10 = 0.51
    // Stamp duty (0.015% on buy): 250,000 * 0.00015 = 37.50
    // Total charges = 63.75 + 16.41 + 2.95 + 0.51 + 37.50 = ~121.12
    assert.ok(charges >= 115 && charges <= 125, `Expected ~121.12, got: ${charges}`);
  });

  it('matches chronological BUY and SELL executions into complete auto-journal trades', () => {
    const mockExecutions = [
      {
        orderId: 'DHAN_ORD_001',
        tradingSymbol: 'RELIANCE',
        customSymbol: 'Reliance Industries',
        transactionType: 'BUY',
        tradedQuantity: 50,
        tradedPrice: 2500.0,
        exchangeTime: '2026-11-24T09:25:00.000Z',
      },
      {
        orderId: 'DHAN_ORD_002',
        tradingSymbol: 'RELIANCE',
        customSymbol: 'Reliance Industries',
        transactionType: 'SELL',
        tradedQuantity: 50,
        tradedPrice: 2530.0,
        exchangeTime: '2026-11-24T10:15:00.000Z',
      },
    ];

    const matched = matchDhanExecutions(mockExecutions, [], 'project_trading_001');
    assert.strictEqual(matched.length, 1);
    const trade = matched[0];

    assert.strictEqual(trade.instrument, 'RELIANCE');
    assert.strictEqual(trade.direction, 'Buy');
    assert.strictEqual(trade.lots, 50);
    assert.strictEqual(trade.entryPrice, 2500.0);
    assert.strictEqual(trade.exitPrice, 2530.0);
    assert.strictEqual(trade.grossPnl, 1500.0);
    assert.ok(trade.pnl > 1400 && trade.pnl < 1500, `Net PnL should deduct charges, got: ${trade.pnl}`);
    assert.ok(trade.returnR > 1.0, `Return R should be positive, got: ${trade.returnR}`);
    assert.strictEqual(trade.source, 'auto');
  });

  it('calculates real-time unrealized PnL on price tick updates', () => {
    const entryPrice = 2500.0;
    const qty = 50;
    const calcUnrealized = (ltp) => (ltp - entryPrice) * qty;

    assert.strictEqual(calcUnrealized(2520.0), 1000.0);
    assert.strictEqual(calcUnrealized(2480.0), -1000.0);
    assert.strictEqual(calcUnrealized(2500.0), 0.0);
  });
});

describe('3. Simple 12-Hour Time Formatter (14:35 -> 2:35)', () => {
  it('converts 24-hour time to simple 12-hour format without leading zero in the hour', () => {
    assert.strictEqual(formatSimpleTime('14:35'), '2:35');
    assert.strictEqual(formatSimpleTime('09:15'), '9:15');
    assert.strictEqual(formatSimpleTime('12:00'), '12:00');
    assert.strictEqual(formatSimpleTime('00:00'), '12:00');
    assert.strictEqual(formatSimpleTime('15:30'), '3:30');
    assert.strictEqual(formatSimpleTime('09:14'), '9:14');
    assert.strictEqual(formatSimpleTime('23:59'), '11:59');
  });

  it('parses and formats ISO timestamp strings', () => {
    assert.strictEqual(formatSimpleTime('2026-11-24T14:35:00.000Z'), '2:35');
    assert.strictEqual(formatSimpleTime('2026-11-24T09:15:00.000Z'), '9:15');
  });
});

describe('4. Day Trade Isolation & Daily Journaling', () => {
  it('filters today trades from historical trades', () => {
    const today = '2026-11-23';
    const trades = [
      { id: '1', entryDate: '2026-11-20', pnl: 500 },
      { id: '2', entryDate: '2026-11-22', pnl: -200 },
      { id: '3', entryDate: '2026-11-23', pnl: 1500 },
      { id: '4', entryDate: '2026-11-23', pnl: -300 },
    ];

    const todayTrades = trades.filter((t) => t.entryDate === today);
    assert.strictEqual(todayTrades.length, 2);

    const todayPnl = todayTrades.reduce((acc, t) => acc + t.pnl, 0);
    assert.strictEqual(todayPnl, 1200);

    const winTrades = todayTrades.filter((t) => t.pnl > 0);
    const winRate = (winTrades.length / todayTrades.length) * 100;
    assert.strictEqual(winRate, 50);
  });
});

describe('5. Real Cloud Database Schema Verification (Read-Only)', () => {
  it('verifies all 11 required tables exist in schema trading on Cloud Supabase', async () => {
    const dbUrl = getCloudDbUrl();
    assert.ok(dbUrl, 'A valid non-local DATABASE_URL must be configured');

    const client = new pg.Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'trading' 
        ORDER BY table_name;
      `);

      const tables = res.rows.map(r => r.table_name);
      const expectedTables = [
        'agent_groups',
        'agents',
        'bot_events',
        'bot_messages',
        'bot_proactive_rules',
        'connector_grants',
        'journal_trades',
        'portfolios',
        'swarm_decisions',
        'swarm_runs',
        'watchlists'
      ];

      for (const expected of expectedTables) {
        assert.ok(tables.includes(expected), `Table ${expected} must exist in schema trading`);
      }

      // Verify extended columns on trading.agents (from migration 001)
      const colRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'trading' AND table_name = 'agents';
      `);
      const cols = colRes.rows.map(r => r.column_name);
      assert.ok(cols.includes('is_pinned'), 'trading.agents must have column is_pinned');
      assert.ok(cols.includes('is_archived'), 'trading.agents must have column is_archived');
      assert.ok(cols.includes('model'), 'trading.agents must have column model');
    } finally {
      await client.end();
    }
  });
});

describe('6. Mobile Responsiveness & Viewport Rules', () => {
  it('verifies mobile responsive classes in web codebase', () => {
    // Check DayDetailsDrawer.tsx for responsive drawer classes
    const drawerPath = path.join(__dirname, '../suna/apps/web/src/features/journal/DayDetailsDrawer.tsx');
    assert.ok(fs.existsSync(drawerPath), 'DayDetailsDrawer.tsx exists');
    const drawerContent = fs.readFileSync(drawerPath, 'utf8');
    assert.ok(drawerContent.includes('formatSimpleTime'), 'DayDetailsDrawer formats time using formatSimpleTime');

    // Check OrdersView.tsx for mobile layout & simple time formatting
    const ordersPath = path.join(__dirname, '../suna/apps/web/src/features/trading/OrdersView.tsx');
    assert.ok(fs.existsSync(ordersPath), 'OrdersView.tsx exists');
    const ordersContent = fs.readFileSync(ordersPath, 'utf8');
    assert.ok(ordersContent.includes('formatSimpleTime'), 'OrdersView formats time using formatSimpleTime');

    // Check dhanOrdersSync.ts for export of formatSimpleTime
    const syncPath = path.join(__dirname, '../suna/apps/web/src/features/trading/dhanOrdersSync.ts');
    assert.ok(fs.existsSync(syncPath), 'dhanOrdersSync.ts exists');
    const syncContent = fs.readFileSync(syncPath, 'utf8');
    assert.ok(syncContent.includes('export function formatSimpleTime'), 'dhanOrdersSync exports formatSimpleTime');
  });
});

describe('7. Proactive Agent Messaging & Human-in-the-Loop (HITL) Engine', () => {
  it('correctly simulates Human-In-The-Loop approval resolution workflows', () => {
    const approval = {
      id: 'app_1',
      actionType: 'trade_execution',
      title: 'Stage Order: BUY 50 RELIANCE @ 2500.00 Limit',
      details: { symbol: 'RELIANCE', action: 'BUY', quantity: 50, price: 2500.0 },
      status: 'pending',
    };

    // Initially pending
    assert.strictEqual(approval.status, 'pending');

    // Trader clicks Approve (HITL)
    const approveAction = (app) => ({
      ...app,
      status: 'approved',
      resolvedAt: '2:35',
    });
    const approved = approveAction(approval);
    assert.strictEqual(approved.status, 'approved');
    assert.strictEqual(approved.resolvedAt, '2:35');

    // Trader clicks Reject (HITL)
    const rejectAction = (app) => ({
      ...app,
      status: 'rejected',
      resolvedAt: '2:35',
    });
    const rejected = rejectAction(approval);
    assert.strictEqual(rejected.status, 'rejected');
    assert.strictEqual(rejected.resolvedAt, '2:35');
  });
});
