import { NextRequest, NextResponse } from 'next/server';

// In-memory store for recent ticks, OHLC candles, and alerts
export interface DhanTick {
  symbol: string;
  cleanSymbol: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  action?: string;
  message?: string;
  timestamp: number;
}

// Global persistence in Node.js runtime across hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __DHAN_TICKS_STORE__: Map<string, DhanTick[]> | undefined;
  // eslint-disable-next-line no-var
  var __DHAN_SSE_CLIENTS__: Set<ReadableStreamDefaultController> | undefined;
  // eslint-disable-next-line no-var
  var __DHAN_ALERTS_LOG__: DhanTick[] | undefined;
}

if (!globalThis.__DHAN_TICKS_STORE__) {
  globalThis.__DHAN_TICKS_STORE__ = new Map();
}
if (!globalThis.__DHAN_SSE_CLIENTS__) {
  globalThis.__DHAN_SSE_CLIENTS__ = new Set();
}
if (!globalThis.__DHAN_ALERTS_LOG__) {
  globalThis.__DHAN_ALERTS_LOG__ = [];
}

const ticksStore = globalThis.__DHAN_TICKS_STORE__;
const sseClients = globalThis.__DHAN_SSE_CLIENTS__;
const alertsLog = globalThis.__DHAN_ALERTS_LOG__;

function normalizeSymbol(raw: string): string {
  if (!raw) return 'UNKNOWN';
  return raw
    .trim()
    .toUpperCase()
    .replace(/^NSE:/, '')
    .replace(/^BSE:/, '')
    .replace(/\.NS$/, '')
    .replace(/\.BO$/, '');
}

/**
 * Broadcast tick data to all connected SSE browser clients
 */
function broadcastTick(tick: DhanTick) {
  const payload = `data: ${JSON.stringify(tick)}\n\n`;
  const deadClients: ReadableStreamDefaultController[] = [];

  for (const client of sseClients) {
    try {
      client.enqueue(new TextEncoder().encode(payload));
    } catch {
      deadClients.push(client);
    }
  }

  for (const dead of deadClients) {
    sseClients.delete(dead);
  }
}

/**
 * POST /api/webhook/dhan
 * Target endpoint for Dhan TradingView Webhook Alerts
 */
export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await req.json().catch(() => ({}));
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        // Plain text fallback (e.g., "INDIANOVB BUY 31.99")
        const parts = text.trim().split(/\s+/);
        body = {
          symbol: parts[0] || 'ALERT',
          action: parts[1] || 'TRIGGER',
          price: parseFloat(parts[2]) || undefined,
          rawText: text,
        };
      }
    }

    // Extract symbol & pricing from various possible alert payload shapes
    const rawSymbol =
      body.symbol ||
      body.ticker ||
      body.instrument ||
      body.stock ||
      body.name ||
      'NSE:STOCK';

    const cleanSymbol = normalizeSymbol(rawSymbol);

    const price = Number(
      body.price ??
      body.close ??
      body.trigger_price ??
      body.ltp ??
      body.last_price ??
      body.val ??
      0
    );

    const high = body.high !== undefined ? Number(body.high) : price || undefined;
    const low = body.low !== undefined ? Number(body.low) : price || undefined;
    const open = body.open !== undefined ? Number(body.open) : price || undefined;
    const volume = body.volume !== undefined ? Number(body.volume) : undefined;
    const action = body.action || body.type || body.signal || 'ALERT';
    const message = body.message || body.note || (typeof body === 'string' ? body : undefined);

    const tick: DhanTick = {
      symbol: rawSymbol,
      cleanSymbol,
      price: isNaN(price) ? 0 : price,
      open,
      high,
      low,
      close: price,
      volume,
      action,
      message,
      timestamp: Date.now(),
    };

    // Append to ticks buffer (capped at 500 per symbol)
    const existing = ticksStore.get(cleanSymbol) || [];
    existing.push(tick);
    if (existing.length > 500) {
      existing.shift();
    }
    ticksStore.set(cleanSymbol, existing);

    // Append to recent global alerts log (capped at 50)
    alertsLog.unshift(tick);
    if (alertsLog.length > 50) {
      alertsLog.pop();
    }

    // Push real-time to active UI charts via Server-Sent Events
    broadcastTick(tick);

    return NextResponse.json(
      {
        ok: true,
        message: 'Dhan webhook received successfully',
        receivedTick: tick,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
      }
    );
  } catch (error: any) {
    console.error('Error processing Dhan webhook:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhook/dhan
 * - If ?stream=true: Returns Server-Sent Events (SSE) live data stream
 * - If ?symbol=XYZ: Returns latest price & recent tick history
 * - Default: Diagnostic summary and webhook test info
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isStream = searchParams.get('stream') === 'true' || searchParams.get('sse') === '1';
  const querySymbol = searchParams.get('symbol');

  // 1. Live SSE Stream for real-time chart updating
  if (isStream) {
    const stream = new ReadableStream({
      start(controller) {
        sseClients.add(controller);

        // Initial connection handshake
        const welcome = `data: ${JSON.stringify({ type: 'connected', time: Date.now() })}\n\n`;
        controller.enqueue(new TextEncoder().encode(welcome));

        // Keep-alive heartbeat every 20 seconds
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(`: ping\n\n`));
          } catch {
            clearInterval(heartbeat);
            sseClients.delete(controller);
          }
        }, 20000);

        req.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          sseClients.delete(controller);
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // 2. Query specific symbol's recent ticks
  if (querySymbol) {
    const clean = normalizeSymbol(querySymbol);
    const history = ticksStore.get(clean) || [];
    const latest = history[history.length - 1] || null;

    return NextResponse.json(
      {
        ok: true,
        symbol: querySymbol,
        cleanSymbol: clean,
        latest,
        historyCount: history.length,
        history: history.slice(-50),
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // 3. Status summary and connection instructions
  return NextResponse.json(
    {
      ok: true,
      service: 'Dhan Live Webhook Feed Bridge',
      status: 'active',
      publicWebhookUrl: process.env.PUBLIC_APP_URL ? `${process.env.PUBLIC_APP_URL}/api/webhook/dhan` : '/api/webhook/dhan',
      activeSseListeners: sseClients.size,
      totalSymbolsTracked: ticksStore.size,
      recentAlerts: alertsLog.slice(0, 10),
      instructions: {
        method: 'POST',
        sampleJson: {
          symbol: '{{ticker}}',
          price: 31.99,
          high: 32.50,
          low: 31.40,
          action: 'BUY',
          time: '{{time}}',
        },
      },
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
