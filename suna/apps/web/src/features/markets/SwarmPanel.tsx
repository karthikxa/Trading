'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Brain,
  ChevronDown,
  Gavel,
  Gauge,
  Loader2,
  Network,
  Play,
  RotateCcw,
  ShieldAlert,
  Signal,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@kortix/ui';

/**
 * Swarm strategy run against the Kortix trading engine (apps/api/src/trading).
 *
 * Contract (verified):
 *   POST /v1/trading/swarm/run  -> 202 { run_id, status } immediately (the
 *   analyst→debate→committee→risk→execution pipeline outlives the 25s server
 *   deadline and a 30s browser abort), then poll
 *   GET /v1/trading/swarm/runs/:run_id until status !== 'running'. Decisions
 *   persist to trading.swarm_decisions and appear in the recent strip.
 */

type SwarmVote = {
  agentId: string;
  agentName?: string;
  signal: string | null;
  confidence: number | null;
  note: string;
  model?: string | null;
};

type SwarmDebate = {
  side: string;
  confidence: number | null;
  argument: string;
};

type SwarmPhase = {
  phase: string;
  agent: string;
  status: string;
  model?: string | null;
  latencyMs?: number | null;
  summary?: string | null;
};

type SwarmReport = {
  ticker: string;
  decision: string | null;
  confidence: number | null;
  risk_score: number | null;
  reasoning?: string;
  data_hint?: string | null;
  persisted?: boolean;
  votes?: SwarmVote[];
  debate?: SwarmDebate[];
  risk?: { veto?: boolean; risk_score?: number | null; critique?: string } | null;
  execution_note?: string | null;
  phases?: SwarmPhase[];
};

type RecentDecision = {
  ticker: string;
  agent_id: string;
  agent_name?: string | null;
  decision: string;
  confidence: string | number | null;
  reasoning?: string | null;
  created_at?: string;
};

type RunState = {
  runId: string;
  ticker: string;
  status: 'running' | 'done' | 'error';
  startedAt: number;
  report?: SwarmReport;
  error?: string;
};

const DECISION_STYLE: Record<string, string> = {
  buy: 'bg-emerald-600 text-white',
  sell: 'bg-red-600 text-white',
  hold: 'bg-zinc-900 text-white',
};

function decisionStyle(decision?: string | null): string {
  if (!decision) return 'bg-zinc-100 text-zinc-700';
  return DECISION_STYLE[decision.toLowerCase()] ?? 'bg-zinc-900 text-white';
}

function signalStyle(signal?: string | null): string {
  const s = (signal ?? '').toLowerCase();
  if (s === 'buy' || s === 'bullish') return 'text-emerald-700';
  if (s === 'sell' || s === 'bearish') return 'text-red-700';
  return 'text-zinc-500';
}

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) return { authorization: `Bearer ${token}` };
  } catch {
    // Fall through to the unauthenticated request; the API answers 401.
  }
  return {};
}

async function startSwarm(ticker: string): Promise<{ runId?: string; error?: string }> {
  const res = await fetch('/v1/trading/swarm/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ ticker }),
  });
  const body = (await res.json().catch(() => null)) as { run_id?: string; error?: unknown } | null;
  if (res.status === 202 && body?.run_id) return { runId: body.run_id };
  return { error: body?.error ? String(res.status) + ': ' + JSON.stringify(body) : `HTTP ${res.status}` };
}

async function pollSwarm(runId: string): Promise<{
  status: 'running' | 'done' | 'error';
  report?: SwarmReport;
  error?: string;
}> {
  const res = await fetch(`/v1/trading/swarm/runs/${encodeURIComponent(runId)}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return { status: 'error', error: `Poll failed: HTTP ${res.status}` };
  const body = (await res.json()) as {
    status: 'running' | 'done' | 'error';
    report?: SwarmReport;
    error?: string;
  };
  return body;
}

async function loadRecent(ticker: string): Promise<RecentDecision[]> {
  try {
    const res = await fetch(`/v1/trading/swarm/decisions?ticker=${encodeURIComponent(ticker)}&limit=5`, {
      headers: await authHeaders(),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { decisions?: RecentDecision[] };
    return body.decisions ?? [];
  } catch {
    return [];
  }
}

export default function SwarmPanel() {
  const [ticker, setTicker] = useState('AAPL');
  const [run, setRun] = useState<RunState | null>(null);
  const [recent, setRecent] = useState<RecentDecision[]>([]);
  const [starting, setStarting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    void loadRecent('AAPL').then(setRecent);
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  // Elapsed seconds ticker while a run is in flight.
  useEffect(() => {
    if (!run || run.status !== 'running') return undefined;
    setElapsed(Math.round((Date.now() - run.startedAt) / 1000));
    const t = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [run?.runId, run?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRun = useCallback(async () => {
    const clean = ticker.trim().toUpperCase().slice(0, 12);
    if (!clean || starting) return;
    setStarting(true);
    setRun({ runId: '', ticker: clean, status: 'running', startedAt: Date.now() });
    const opener = await startSwarm(clean);
    setStarting(false);
    if (!opener.runId || cancelledRef.current) {
      setRun({ runId: '', ticker: clean, status: 'error', startedAt: Date.now(), error: opener.error ?? 'Could not start the run' });
      return;
    }
    setRun({ runId: opener.runId, ticker: clean, status: 'running', startedAt: Date.now() });

    // Poll up to ~100s (pipeline takes 15-45s; upstream quota errors finish fast).
    for (let i = 0; i < 40 && !cancelledRef.current; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      if (cancelledRef.current) return;
      const state = await pollSwarm(opener.runId);
      if (cancelledRef.current) return;
      if (state.status === 'running') continue;
      setRun({
        runId: opener.runId,
        ticker: clean,
        status: state.status,
        startedAt: Date.now(),
        report: state.report,
        error: state.error,
      });
      void loadRecent(clean).then(setRecent);
      return;
    }
    if (!cancelledRef.current) {
      setRun({ runId: opener.runId, ticker: clean, status: 'error', startedAt: Date.now(), error: 'Timed out waiting for the run' });
    }
  }, [ticker, starting]);

  const report = run?.status === 'done' ? run.report : null;
  const okPhases = (report?.phases ?? []).filter((p) => p.status !== 'failed').length;
  const failedPhases = (report?.phases ?? []).filter((p) => p.status === 'failed').length;

  return (
    <>
      <header className="terminal-page-head">
        <div>
          <h1 className="terminal-page-title">Agent Swarm</h1>
          <p className="terminal-page-sub">Multi-agent decision engine · analysts → debate → risk gate → verdict</p>
        </div>
      </header>

      {/* Run composer */}
      <div className="terminal-panel p-5 bg-white">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9./:-]/g, '').slice(0, 12))}
            placeholder="AAPL"
            aria-label="Ticker"
            className="h-9 w-28 rounded-lg border border-zinc-200 bg-zinc-50 px-3 font-mono text-sm font-semibold text-zinc-900 uppercase outline-none focus:border-zinc-500"
            disabled={run?.status === 'running'}
          />
          {run?.status === 'running' ? (
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white cursor-default"
              disabled
            >
              <Loader2 className="size-4 animate-spin" />
              Running… {elapsed}s
            </button>
          ) : (
            <button
              type="button"
              onClick={startRun}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              {starting || run ? <RotateCcw className="size-4" /> : <Play className="size-4" />}
              {starting ? 'Starting…' : run ? 'Run again' : 'Run swarm'}
            </button>
          )}
          {run?.status === 'running' && (
            <span className="text-xs text-zinc-500">
              12 agents analyse <span className="font-mono font-semibold">{run.ticker}</span> · takes 15–45 s
            </span>
          )}
        </div>

        {run && run.status !== 'running' && run.error && (
          <p className="mt-3 text-sm text-red-700">{run.error}</p>
        )}
      </div>

      {/* Report */}
      {report && (
        <>
          {/* Verdict */}
          <div className="terminal-panel p-5 bg-white mt-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className={cn('rounded-lg px-3 py-1.5 font-mono text-lg font-extrabold uppercase', decisionStyle(report.decision))}>
                {report.decision ?? '—'}
              </span>
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <Gauge className="size-4 text-zinc-400" />
                Confidence <span className="font-mono font-bold text-zinc-950">{report.confidence ?? '—'}</span>
                <span className="text-zinc-300">·</span>
                Risk <span className="font-mono font-bold text-zinc-950">{report.risk_score ?? '—'}</span>
              </div>
              {report.data_hint && (
                <span className="text-xs text-zinc-400 font-mono truncate">{report.data_hint}</span>
              )}
            </div>
            {report.reasoning && (
              <p className="mt-3 text-sm leading-relaxed text-zinc-700">{report.reasoning}</p>
            )}
            {report.execution_note && (
              <p className="mt-2 text-sm text-zinc-500">
                <span className="font-semibold text-zinc-700">Execution:</span> {report.execution_note}
              </p>
            )}
          </div>

          {/* Analyst votes */}
          {(report.votes?.length ?? 0) > 0 && (
            <div className="terminal-panel bg-white mt-4 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3">
                <Signal className="size-4 text-zinc-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Analyst votes</h3>
              </div>
              <div className="divide-y divide-zinc-100">
                {report.votes!.map((v, i) => (
                  <div key={`${v.agentId}-${i}`} className="flex items-start gap-3 px-5 py-3">
                    <span className={cn('mt-0.5 w-16 flex-none font-mono text-xs font-bold uppercase', signalStyle(v.signal))}>
                      {v.signal ?? ' abstained'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-semibold text-zinc-900">{v.agentName ?? v.agentId}</span>
                      <span className="ml-2 text-xs text-zinc-500 font-mono">conf {v.confidence ?? '—'}</span>
                      <p className="text-xs text-zinc-600 leading-relaxed" title={v.note}>
                        {v.note}
                      </p>
                    </div>
                    {v.model && <span className="text-[10px] font-mono text-zinc-400">{v.model}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Debate */}
          {(report.debate?.length ?? 0) > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {['bull', 'bear'].map((side) => {
                const entries = report.debate!.filter((d) => (d.side || '').toLowerCase().includes(side));
                if (!entries.length) return null;
                return (
                  <div key={side} className="terminal-panel bg-white overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3">
                      {side === 'bull' ? (
                        <Brain className="size-4 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="size-4 text-red-600" />
                      )}
                      <h3 className={cn('text-xs font-semibold uppercase tracking-wider', side === 'bull' ? 'text-emerald-700' : 'text-red-700')}>
                        {side} case
                      </h3>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {entries.map((d, i) => (
                        <p key={i} className="px-5 py-3 text-sm text-zinc-700 leading-relaxed">
                          <span className="font-mono text-xs font-bold text-zinc-400 mr-2">conf {d.confidence ?? '—'}</span>
                          {d.argument}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Risk gate */}
          {report.risk && (
            <div className="terminal-panel p-5 bg-white mt-4">
              <div className="flex items-center gap-2">
                <Gavel className={cn('size-4', report.risk.veto ? 'text-red-600' : 'text-zinc-400')} />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Risk gate</h3>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase',
                    report.risk.veto ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700',
                  )}
                >
                  {report.risk.veto ? 'veto' : 'cleared'}
                </span>
              </div>
              {report.risk.critique && <p className="mt-2 text-sm text-zinc-700 leading-relaxed">{report.risk.critique}</p>}
            </div>
          )}

          {/* Phase trace + persistence */}
          {(report.phases?.length ?? 0) > 0 && (
            <div className="terminal-panel px-5 py-3 bg-white mt-4">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                <span>
                  Phases <span className="font-mono font-bold text-zinc-950">{okPhases}/{okPhases + failedPhases}</span> answered
                </span>
                <span>
                  Persisted{' '}
                  <span className={cn('font-mono font-bold', report.persisted ? 'text-emerald-700' : 'text-red-700')}>
                    {report.persisted ? 'yes' : 'no'}
                  </span>
                </span>
                {failedPhases > 0 && (
                  <span className="text-zinc-400" title={report.phases!.filter((p) => p.status === 'failed').map((p) => `${p.phase}/${p.agent}: ${p.summary ?? ''}`).join('\n')}>
                    {failedPhases} phase{failedPhases > 1 ? 's' : ''} degraded (model quota)
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Recent persisted decisions */}
      {(recent.length ?? 0) > 0 && (
        <div className="terminal-panel bg-white mt-4 mb-6 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3">
            <Network className="size-4 text-zinc-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Recent decisions · {ticker.trim().toUpperCase() || 'watchlist'}
            </h3>
          </div>
          <div className="divide-y divide-zinc-100">
            {recent.slice(0, 5).map((d, i) => (
              <div key={`${d.agent_id}-${d.created_at}-${i}`} className="flex items-center gap-3 px-5 py-2.5">
                <span className={cn('rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase', decisionStyle(d.decision))}>
                  {d.decision}
                </span>
                <span className="w-28 flex-none truncate text-xs font-semibold text-zinc-800">{d.agent_name ?? d.agent_id}</span>
                <span className="font-mono text-xs text-zinc-500">conf {d.confidence ?? '—'}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">{d.reasoning}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1 border-t border-zinc-100 py-2 text-[10px] uppercase tracking-wider text-zinc-400 hover:text-zinc-600"
            onClick={() => {
              void loadRecent(ticker.trim().toUpperCase()).then(setRecent);
            }}
          >
            <ChevronDown className="size-3" /> Refresh history
          </button>
        </div>
      )}
    </>
  );
}
