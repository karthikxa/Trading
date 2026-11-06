/**
 * Market data for the trading swarm.
 *
 * Free, keyless sources only: Stooq daily OHLCV CSV, Yahoo Finance chart API
 * as fallback, Yahoo Finance RSS for headlines. Every fetch has a timeout and
 * a failure path, so a dead feed degrades the analysis instead of breaking
 * the run.
 */

export interface MarketSeries {
  ticker: string;
  source: 'stooq' | 'yahoo';
  dates: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export interface MarketStats {
  lastClose: number | null;
  prevClose: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  volatility20dPct: number | null;
  high52w: number | null;
  low52w: number | null;
  return1yPct: number | null;
  avgVolume50: number | null;
  volumeTrendPct: number | null;
}

export interface NewsItem {
  title: string;
  pubDate: string | null;
}

const FETCH_TIMEOUT_MS = 15_000;

async function timedFetch(url: string, extraHeaders: Record<string, string> = {}): Promise<Response> {
  return fetch(url, {
    headers: { 'user-agent': 'KortixTrading/1.0 (research)', ...extraHeaders },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

function parseCsv(csv: string): string[][] {
  return csv
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(',').map((cell) => cell.trim()));
}

async function stooqDaily(ticker: string): Promise<MarketSeries | null> {
  const t = ticker.toLowerCase();
  for (const symbol of [`${t}.us`, t]) {
    try {
      const res = await timedFetch(`https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`);
      if (!res.ok) continue;
      const text = await res.text();
      const rows = parseCsv(text);
      if (rows.length < 30 || !/^Date$/i.test(rows[0][0] ?? '')) continue;
      const dates: string[] = [];
      const open: number[] = [];
      const high: number[] = [];
      const low: number[] = [];
      const close: number[] = [];
      const volume: number[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const o = Number(r[1]);
        const h = Number(r[2]);
        const l = Number(r[3]);
        const c = Number(r[4]);
        const v = Number(r[5] || 0);
        if (!Number.isFinite(c) || c <= 0) continue;
        dates.push(r[0]);
        open.push(Number.isFinite(o) ? o : c);
        high.push(Number.isFinite(h) ? h : c);
        low.push(Number.isFinite(l) ? l : c);
        close.push(c);
        volume.push(Number.isFinite(v) ? v : 0);
      }
      if (close.length >= 30) return { ticker, source: 'stooq', dates, open, high, low, close, volume };
    } catch {
      // try next symbol
    }
  }
  return null;
}

async function binanceDaily(ticker: string): Promise<MarketSeries | null> {
  let sym = ticker.toUpperCase().replace(/^BINANCE:/, '').replace(/[^A-Z0-9]/g, '');
  if (['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA'].includes(sym)) {
    sym += 'USDT';
  }
  if (!sym.endsWith('USDT') && !sym.endsWith('USD') && !sym.endsWith('BUSD')) return null;

  try {
    const res = await timedFetch(`https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(sym)}&interval=1d&limit=365`);
    if (!res.ok) return null;
    const raw = (await res.json()) as Array<[number, string, string, string, string, string]>;
    if (!Array.isArray(raw) || raw.length < 30) return null;
    const dates: string[] = [];
    const open: number[] = [];
    const high: number[] = [];
    const low: number[] = [];
    const close: number[] = [];
    const volume: number[] = [];
    for (const k of raw) {
      dates.push(new Date(k[0]).toISOString().slice(0, 10));
      open.push(Number(k[1]));
      high.push(Number(k[2]));
      low.push(Number(k[3]));
      close.push(Number(k[4]));
      volume.push(Number(k[5]));
    }
    return { ticker, source: 'stooq' as const, dates, open, high, low, close, volume };
  } catch {
    return null;
  }
}

function resolveYahooTicker(raw: string): string[] {
  const t = raw.toUpperCase().replace(/^.*:/, '').trim();
  if (t === 'NIFTY' || t === 'NIFTY50') return ['^NSEI', 'NIFTY.NS'];
  if (t === 'BANKNIFTY') return ['^NSEBANK'];
  if (t === 'SENSEX') return ['^BSESN'];
  if (t === 'GOLD' || t === 'XAUUSD') return ['GC=F', 'GLD'];
  if (t === 'SILVER' || t === 'XAGUSD') return ['SI=F', 'SLV'];
  if (t === 'USOIL' || t === 'CRUDEOIL') return ['CL=F', 'USO'];
  if (t === 'EURUSD') return ['EURUSD=X'];
  if (t === 'GBPUSD') return ['GBPUSD=X'];
  if (t === 'USDINR') return ['INR=X'];
  if (['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC'].includes(t)) {
    return [`${t}.NS`, `${t}.BO`, t];
  }
  return [t, `${t}.NS`];
}

async function yahooDaily(ticker: string): Promise<MarketSeries | null> {
  const candidates = resolveYahooTicker(ticker);
  for (const sym of candidates) {
    try {
      const res = await timedFetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1y`,
        { accept: 'application/json' },
      );
      if (!res.ok) continue;
      const j = (await res.json()) as {
        chart?: {
          result?: Array<{
            timestamp?: number[];
            indicators?: {
              quote?: Array<{
                open?: Array<number | null>;
                high?: Array<number | null>;
                low?: Array<number | null>;
                close?: Array<number | null>;
                volume?: Array<number | null>;
              }>;
            };
          }>;
        };
      };
      const result = j.chart?.result?.[0];
      const quote = result?.indicators?.quote?.[0];
      if (!result?.timestamp || !quote?.close) continue;
      const dates: string[] = [];
      const open: number[] = [];
      const high: number[] = [];
      const low: number[] = [];
      const close: number[] = [];
      const volume: number[] = [];
      for (let i = 0; i < result.timestamp.length; i++) {
        const c = quote.close[i];
        if (c == null || !Number.isFinite(c)) continue;
        dates.push(new Date(result.timestamp[i] * 1000).toISOString().slice(0, 10));
        open.push(quote.open?.[i] ?? c);
        high.push(quote.high?.[i] ?? c);
        low.push(quote.low?.[i] ?? c);
        close.push(c);
        volume.push(quote.volume?.[i] ?? 0);
      }
      if (close.length >= 30) return { ticker, source: 'yahoo', dates, open, high, low, close, volume };
    } catch {
      continue;
    }
  }
  return null;
}

export async function getSeries(ticker: string): Promise<MarketSeries | null> {
  return (await binanceDaily(ticker)) ?? (await stooqDaily(ticker)) ?? (await yahooDaily(ticker));
}

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i];
  return sum / period;
}

function rsiWilder(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i === period - 1) {
      let seed = 0;
      for (let j = 0; j < period; j++) seed += values[j];
      prev = seed / period;
      out.push(prev);
    } else if (prev !== null) {
      prev = values[i] * k + prev * (1 - k);
      out.push(prev);
    } else {
      out.push(NaN);
    }
  }
  return out;
}

function macd(values: number[]): { line: number | null; signal: number | null; hist: number | null } {
  if (values.length < 35) return { line: null, signal: null, hist: null };
  const e12 = ema(values, 12);
  const e26 = ema(values, 26);
  const lineSeries: number[] = [];
  for (let i = 0; i < values.length; i++) {
    lineSeries.push(e12[i] - e26[i]);
  }
  const valid = lineSeries.filter((v) => Number.isFinite(v));
  const signalSeries = ema(valid, 9);
  const line = lineSeries[lineSeries.length - 1];
  const signal = signalSeries[signalSeries.length - 1];
  if (!Number.isFinite(line) || !Number.isFinite(signal)) return { line: null, signal: null, hist: null };
  return { line, signal, hist: line - signal };
}

function dailyReturns(values: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i++) out.push(Math.log(values[i] / values[i - 1]));
  return out;
}

export function computeStats(series: MarketSeries): MarketStats {
  const c = series.close;
  const v = series.volume;
  const last = c[c.length - 1] ?? null;
  const prev = c.length > 1 ? c[c.length - 2] : null;
  const macdResult = macd(c);
  const rets = dailyReturns(c.slice(-21));
  const mean = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0;
  const variance = rets.length
    ? rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (rets.length - 1)
    : 0;
  const volPct = Math.sqrt(variance) * Math.sqrt(252) * 100;
  const window = c.slice(-252);
  const avgVol = sma(v, 50);
  const volLast10 = v.slice(-10);
  const volPrior10 = v.slice(-20, -10);
  const volSum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const volumeTrend =
    avgVol && volPrior10.length === 10 && volSum(volPrior10) > 0
      ? ((volSum(volLast10) - volSum(volPrior10)) / volSum(volPrior10)) * 100
      : null;
  const return1y = c.length > 250 ? ((c[c.length - 1] / c[c.length - 251] - 1) * 100) : null;

  return {
    lastClose: last,
    prevClose: prev,
    sma50: sma(c, 50),
    sma200: sma(c, 200),
    rsi14: rsiWilder(c),
    macdLine: macdResult.line,
    macdSignal: macdResult.signal,
    macdHist: macdResult.hist,
    volatility20dPct: rets.length >= 20 ? volPct : null,
    high52w: window.length ? Math.max(...window) : null,
    low52w: window.length ? Math.min(...window) : null,
    return1yPct: return1y,
    avgVolume50: avgVol,
    volumeTrendPct: volumeTrend,
  };
}

async function yahooNews(ticker: string, limit = 6): Promise<NewsItem[]> {
  try {
    const res = await timedFetch(
      `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`,
      { accept: 'application/rss+xml, application/xml, text/xml' },
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match = itemRegex.exec(xml);
    while (match && items.length < limit) {
      const block = match[1];
      const title = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(block)?.[1]?.trim();
      const pubDate = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)?.[1]?.trim() ?? null;
      if (title) items.push({ title, pubDate });
      match = itemRegex.exec(xml);
    }
    return items;
  } catch {
    return [];
  }
}

export async function getNews(ticker: string): Promise<NewsItem[]> {
  return yahooNews(ticker);
}

/**
 * One dense, deterministic data brief shared by every agent in the run, so
 * the swarm reasons from the same numbers instead of asking its own analyst
 * model to do math.
 */
export function buildBrief(series: MarketSeries, stats: MarketStats, news: NewsItem[]): string {
  const c = series.close;
  const rows: string[] = [];
  rows.push(`TICKER: ${series.ticker} (data source: ${series.source})`);
  rows.push(`TRADING DAYS: ${c.length}, last ${series.dates[c.length - 1]}`);
  rows.push(`LAST CLOSE: ${c[c.length - 1]?.toFixed(2)} (prev ${c[c.length - 2]?.toFixed(2)})`);
  if (stats.sma50 != null) rows.push(`SMA50: ${stats.sma50.toFixed(2)} (price ${(c[c.length - 1] / stats.sma50 - 1).toFixed(4)}x of SMA50)`);
  if (stats.sma200 != null) rows.push(`SMA200: ${stats.sma200.toFixed(2)} (price ${(c[c.length - 1] / stats.sma200 - 1).toFixed(4)}x of SMA200)`);
  if (stats.rsi14 != null) rows.push(`RSI14: ${stats.rsi14.toFixed(1)}`);
  if (stats.macdLine != null) rows.push(`MACD(12,26): line ${stats.macdLine.toFixed(4)} signal ${stats.macdSignal?.toFixed(4)} hist ${stats.macdHist?.toFixed(4)}`);
  if (stats.volatility20dPct != null) rows.push(`ANNUALIZED VOL (20d): ${stats.volatility20dPct.toFixed(1)}%`);
  if (stats.high52w != null) rows.push(`52W HIGH: ${stats.high52w.toFixed(2)} | 52W LOW: ${stats.low52w?.toFixed(2)}`);
  if (stats.return1yPct != null) rows.push(`1Y RETURN: ${stats.return1yPct.toFixed(1)}%`);
  if (stats.avgVolume50 != null) rows.push(`AVG VOLUME 50D: ${stats.avgVolume50.toFixed(0)}${stats.volumeTrendPct != null ? `, last-10d vs prior-10d ${stats.volumeTrendPct!.toFixed(0)}%` : ''}`);
  const last20 = c.slice(-20).map((v) => v.toFixed(2)).join(', ');
  rows.push(`LAST 20 CLOSES (oldest first): ${last20}`);
  if (news.length) {
    rows.push('RECENT HEADLINES:');
    for (const n of news) rows.push(`- ${n.pubDate ? `[${n.pubDate}] ` : ''}${n.title}`);
  } else {
    rows.push('RECENT HEADLINES: none available');
  }
  return rows.join('\n');
}

export interface MarketData {
  series: MarketSeries;
  stats: MarketStats;
  news: NewsItem[];
  brief: string;
}

export async function loadMarketData(ticker: string): Promise<MarketData | null> {
  const series = await getSeries(ticker);
  if (!series) return null;
  const stats = computeStats(series);
  const news = await getNews(ticker);
  return { series, stats, news, brief: buildBrief(series, stats, news) };
}
