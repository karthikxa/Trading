/**
 * /v1/trading — the Tauric Swarm control surface.
 *
 * Auth: supabaseAuth (mounted in app.ts). Identity via `c.get('userId')`.
 * Serves the Markets terminal and the Agents sidebar:
 *   GET   /agents           — the seeded roster (with persisted customizations)
 *   PATCH /agents/:id       — customize name/role/prompt ("Edit Identity")
 *   POST  /swarm/run        — full Tauric pipeline run (analysts → debate →
 *                             synthesis → risk gate), persists decisions
 *   GET   /swarm/decisions  — decision history (ticker filter)
 *   POST  /chat             — direct bot chat (Muas-style single-agent call)
 */

import { OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { sql } from 'drizzle-orm';
import type { AppEnv } from '../types';
import { db } from '../shared/db';
import { listAgents, chatWithAgent, runSwarmAnalysis, type SwarmRunReport } from './swarm';
import type { SwarmAgentRow } from './swarm';

/** db.execute returns an array-RowList in this driver — normalize both shapes. */
function resultRows<T>(result: unknown): T[] {
  return Array.isArray(result) ? (result as T[]) : (((result as { rows?: T[] }).rows) ?? []);
}

export const tradingApp = new OpenAPIHono<AppEnv>();

/**
 * In-flight swarm run registry. The full analyst→debate→synthesis→risk
 * pipeline takes 15–45 s, which exceeds the API's 25 s request deadline and a
 * browser's 30 s abort, so POST /swarm/run returns 202 with a run_id at once
 * and the client polls GET /swarm/runs/:id. This registry keeps the report for
 * that poll. replica-local: run results are client-polling state, not durable
 * data — decisions themselves persist to trading.swarm_decisions inside the
 * pipeline, and a restart makes the caller re-run (last-resort read-back is
 * decisions history).
 */
type SwarmRunState =
  | { status: 'running'; ticker: string; startedAt: string }
  | { status: 'done'; ticker: string; startedAt: string; finishedAt: string; report: SwarmRunReport }
  | { status: 'error'; ticker: string; startedAt: string; finishedAt: string; error: string };

const swarmRuns = new Map<string, SwarmRunState>();
const SWARM_RUNS_MAX = 50;

function registerSwarmRun(runId: string, ticker: string): void {
  // Prune finished runs beyond the cap so the registry cannot grow unbounded.
  if (swarmRuns.size >= SWARM_RUNS_MAX) {
    for (const [id, state] of swarmRuns) {
      if (state.status !== 'running') swarmRuns.delete(id);
      if (swarmRuns.size < SWARM_RUNS_MAX) break;
    }
  }
  swarmRuns.set(runId, { status: 'running', ticker, startedAt: new Date().toISOString() });
}

function startSwarmRun(runId: string, ticker: string, payload: Parameters<typeof runSwarmAnalysis>[0], analysisDate?: string): void {
  registerSwarmRun(runId, ticker);
  void runSwarmAnalysis(payload, analysisDate)
    .then((report) => {
      swarmRuns.set(runId, { status: 'done', ticker, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), report });
    })
    .catch((e) => {
      swarmRuns.set(runId, { status: 'error', ticker, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), error: String(e).slice(0, 400) });
    });
}

const jsonError = (c: Context<AppEnv>, status: number, error: string) => c.json({ error }, status as 400 | 401 | 404 | 500 | 503);

tradingApp.get('/agents', async (c: Context<AppEnv>) => {
  try {
    return c.json({ agents: await listAgents() });
  } catch (e) {
    return jsonError(c, 500, `agents: ${String(e).slice(0, 200)}`);
  }
});

tradingApp.patch('/agents/:id', async (c: Context<AppEnv>) => {
  const id = c.req.param('id') ?? '';
  const body = await c.req.json().catch(() => null) as {
    system_prompt?: unknown;
    name?: unknown;
    role?: unknown;
  } | null;
  if (!body) return jsonError(c, 400, 'JSON body required');

  // `system_prompt` explicit null / "" clears the customization (template
  // resumes); an absent key leaves the stored prompt untouched.
  const hasPromptField = Object.prototype.hasOwnProperty.call(body, 'system_prompt');
  const systemPrompt = hasPromptField && typeof body.system_prompt === 'string' && body.system_prompt.trim()
    ? body.system_prompt.trim()
    : null;
  const clearPrompt = hasPromptField;
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null;
  const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim() : null;
  if (!hasPromptField && name == null && role == null) {
    return jsonError(c, 400, 'Nothing to update; pass system_prompt, name and/or role');
  }
  try {
    const rows = await db.execute(sql`
      update trading.agents
      set
        system_prompt = case when ${clearPrompt} then ${systemPrompt} else system_prompt end,
        name = coalesce(${name}, name),
        role = coalesce(${role}, role),
        updated_at = now()
      where id = ${id}
      returning id
    `);
    if (!resultRows<{ id: string }>(rows).length) return jsonError(c, 404, `Unknown agent: ${id}`);
    return c.json({ updated: true, id });
  } catch (e) {
    return jsonError(c, 500, `agent update: ${String(e).slice(0, 200)}`);
  }
});

tradingApp.post('/swarm/run', async (c: Context<AppEnv>) => {
  const body = await c.req.json().catch(() => null) as {
    ticker?: unknown;
    analystIds?: unknown;
    debateRounds?: unknown;
    note?: unknown;
    analysisDate?: unknown;
    executor?: unknown;
  } | null;
  const ticker = typeof body?.ticker === 'string' ? body.ticker.trim() : '';
  if (!ticker || ticker.length > 12) return jsonError(c, 400, 'ticker required (1-12 chars)');

  const payload = {
    ticker,
    analystIds: Array.isArray(body?.analystIds)
      ? body.analystIds.filter((x): x is string => typeof x === 'string')
      : undefined,
    debateRounds: typeof body?.debateRounds === 'number' ? body.debateRounds : undefined,
    note: typeof body?.note === 'string' ? body.note : undefined,
    executor: typeof body?.executor === 'string' ? body.executor : undefined,
  };
  const analysisDate = typeof body?.analysisDate === 'string' ? body.analysisDate : undefined;

  // Async: the pipeline outlives the 25 s request deadline, so answer at once
  // and let the client poll /swarm/runs/:id.
  const runId = `swarm_${Date.now()}_${ticker}`;
  startSwarmRun(runId, ticker, payload, analysisDate);
  return c.json({ run_id: runId, status: 'running', ticker }, 202 as const);
});

tradingApp.get('/swarm/runs/:id', async (c: Context<AppEnv>) => {
  const id = c.req.param('id') ?? '';
  if (!id) return jsonError(c, 400, 'run id required');
  const state = swarmRuns.get(id);
  if (!state) {
    return jsonError(c, 404, 'Unknown or expired run (process restarted or pruned) — read /swarm/decisions instead');
  }
  if (state.status === 'running') {
    return c.json({ run_id: id, status: 'running', ticker: state.ticker, started_at: state.startedAt });
  }
  if (state.status === 'error') {
    return c.json({ run_id: id, status: 'error', ticker: state.ticker, error: state.error, finished_at: state.finishedAt });
  }
  return c.json({
    run_id: id,
    status: 'done',
    ticker: state.ticker,
    started_at: state.startedAt,
    finished_at: state.finishedAt,
    report: state.report,
  });
});

tradingApp.get('/swarm/decisions', async (c: Context<AppEnv>) => {
  const ticker = c.req.query('ticker')?.trim().toUpperCase() ?? '';
  const limitRaw = Number(c.req.query('limit') ?? '50');
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
  try {
    const rows = await db.execute(sql`
      select d.ticker, d.agent_id, a.name as agent_name, d.decision, d.confidence, d.reasoning, d.risk_score, d.created_at
      from trading.swarm_decisions d
      left join trading.agents a on a.id = d.agent_id
      where ${ticker ? sql`d.ticker = ${ticker}` : sql`true`}
      order by d.created_at desc
      limit ${limit}
    `);
    return c.json({ decisions: resultRows<Record<string, unknown>>(rows) });
  } catch (e) {
    return jsonError(c, 500, `decisions: ${String(e).slice(0, 200)}`);
  }
});

tradingApp.post('/chat', async (c: Context<AppEnv>) => {
  const body = await c.req.json().catch(() => null) as {
    agentId?: unknown;
    message?: unknown;
    history?: unknown;
  } | null;
  const agentId = typeof body?.agentId === 'string' ? body.agentId : '';
  const message = typeof body?.message === 'string' ? body.message.slice(0, 4000) : '';
  if (!agentId || !message.trim()) return jsonError(c, 400, 'agentId and message required');

  const history = Array.isArray(body?.history)
    ? body.history
        .filter((m): m is { role: string; content: string } => Boolean(m) && typeof (m as { role?: unknown }).role === 'string' && typeof (m as { content?: unknown }).content === 'string')
        .slice(-10)
        .map((m) => ({ role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const), content: m.content }))
    : [];

  try {
    const result = await chatWithAgent(agentId, message, history);
    if (result.ok) {
      return c.json({ ok: true, reply: result.reply, model: result.model, provider: result.provider });
    }
    return jsonError(c, 503, result.error);
  } catch (e) {
    return jsonError(c, 500, `chat: ${String(e).slice(0, 200)}`);
  }
});
