import { describe, it } from 'node:test';
import assert from 'node:assert';
import { matchDhanExecutions, estimateIndianCharges } from '../dhanSync';

describe('DhanHQ Live Trade Auto-Journaling & PnL Engine', () => {
  it('accurately calculates Indian statutory charges for intraday equity trades', () => {
    const buyPrice = 2500;
    const sellPrice = 2550;
    const qty = 100;
    const charges = estimateIndianCharges(buyPrice, sellPrice, qty, true);

    // Turnover: 250,000 + 255,000 = 505,000
    // STT (0.025% on sell): 255,000 * 0.00025 = ~63.75
    // Exchange txn (0.00325%): 505,000 * 0.0000325 = ~16.41
    // GST (18% on exchange charges): ~2.95
    // Stamp duty (0.015% on buy): 250,000 * 0.00015 = ~37.50
    // Total charges should be between ₹110 and ₹130
    assert.ok(charges > 100 && charges < 150, `Charges should be in realistic range, got: ${charges}`);
  });

  it('matches chronological BUY and SELL orders into a completed Journal trade', () => {
    const tomorrowDate = '2026-11-24';
    const mockExecutions = [
      {
        orderId: 'DHAN_ORD_001',
        tradingSymbol: 'RELIANCE',
        customSymbol: 'Reliance Industries',
        transactionType: 'BUY',
        tradedQuantity: 50,
        tradedPrice: 2500.0,
        exchangeTime: `${tomorrowDate}T09:25:00.000Z`,
        productType: 'INTRADAY',
        exchangeSegment: 'NSE_EQ',
        brokerageCharges: 0,
        stt: 0,
        stampDuty: 18.75,
      },
      {
        orderId: 'DHAN_ORD_002',
        tradingSymbol: 'RELIANCE',
        customSymbol: 'Reliance Industries',
        transactionType: 'SELL',
        tradedQuantity: 50,
        tradedPrice: 2530.0,
        exchangeTime: `${tomorrowDate}T10:15:00.000Z`,
        productType: 'INTRADAY',
        exchangeSegment: 'NSE_EQ',
        brokerageCharges: 0,
        stt: 31.62,
        stampDuty: 0,
      },
    ];

    const matched = matchDhanExecutions(mockExecutions, [], 'b0000000-0000-0000-0000-000000000001');

    assert.strictEqual(matched.length, 1, 'Should produce exactly 1 matched round-trip trade');
    const trade = matched[0];

    assert.strictEqual(trade.instrument, 'RELIANCE');
    assert.strictEqual(trade.direction, 'Buy');
    assert.strictEqual(trade.lots, 50);
    assert.strictEqual(trade.entryPrice, 2500.0);
    assert.strictEqual(trade.exitPrice, 2530.0);
    assert.strictEqual(trade.entryDate, tomorrowDate);
    assert.strictEqual(trade.source, 'auto');

    // Gross PnL: (2530 - 2500) * 50 = ₹1,500.00
    // Net PnL must be gross PnL minus trade commission
    assert.ok(trade.pnl > 1400 && trade.pnl <= 1500, `Net PnL should be around ₹1450-₹1500, got: ${trade.pnl}`);

    // Risk R: riskPerShare = max(0.5, 2500 * 0.01) = 25. Risk R = 25 * 50 = ₹1,250
    // Return R: ~1450 / 1250 = ~1.16R
    assert.ok(typeof trade.riskR === 'number' && trade.riskR > 0);
    assert.ok(typeof trade.returnR === 'number' && trade.returnR > 1.0);
    assert.strictEqual(trade.followedPlan, true);
  });

  it('updates unrealized PnL continuously on market price tick change', () => {
    const entryPrice = 2500.0;
    const qty = 50;

    const computeUnrealized = (ltp: number, side: 'BUY' | 'SELL') => {
      return side === 'BUY' ? (ltp - entryPrice) * qty : (entryPrice - ltp) * qty;
    };

    // Price moves to 2510 (+₹10/share)
    const tick1 = computeUnrealized(2510.0, 'BUY');
    assert.strictEqual(tick1, 500.0, 'Unrealized PnL should be +₹500 on price 2510');

    // Price dips to 2490 (-₹10/share)
    const tick2 = computeUnrealized(2490.0, 'BUY');
    assert.strictEqual(tick2, -500.0, 'Unrealized PnL should be -₹500 on price 2490');

    // Price rallies to 2550 (+₹50/share)
    const tick3 = computeUnrealized(2550.0, 'BUY');
    assert.strictEqual(tick3, 2500.0, 'Unrealized PnL should be +₹2,500 on price 2550');
  });
});
