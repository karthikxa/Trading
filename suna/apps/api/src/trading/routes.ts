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

tradingApp.get('/journal', async (c: Context<AppEnv>) => {
  const projectId = c.req.query('projectId') ?? null;
  const limitRaw = Number(c.req.query('limit') ?? '200');
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

  try {
    const rows = await db.execute(sql`
      select *
      from trading.journal_trades
      where ${projectId ? sql`project_id = ${projectId} or project_id is null` : sql`true`}
      order by entry_date desc, coalesce(entry_time, '00:00') desc
      limit ${limit}
    `);
    return c.json({ trades: resultRows<Record<string, unknown>>(rows) });
  } catch (e) {
    return jsonError(c, 500, `journal get: ${String(e).slice(0, 200)}`);
  }
});

tradingApp.post('/journal', async (c: Context<AppEnv>) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, any> | null;
  if (!body) return jsonError(c, 400, 'JSON body required');

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const id = typeof body.id === 'string' && uuidRegex.test(body.id) ? body.id : crypto.randomUUID();

  const projectId =
    typeof body.project_id === 'string'
      ? body.project_id
      : typeof body.projectId === 'string'
        ? body.projectId
        : null;
  const entryDate = body.entry_date || body.entryDate || new Date().toISOString().split('T')[0];
  const entryTime = body.entry_time || body.entryTime || '09:30';
  const exitDate = body.exit_date || body.exitDate || null;
  const exitTime = body.exit_time || body.exitTime || null;
  const instrument = String(body.instrument || 'EURUSD').toUpperCase();
  const direction = body.direction || 'Buy';
  const lots = Number(body.lots) || 1;
  const entryPrice = Number(body.entry_price ?? body.entryPrice ?? 0);
  const exitPrice = Number(body.exit_price ?? body.exitPrice ?? 0);
  const stopLoss =
    body.stop_loss !== null && body.stopLoss !== null
      ? Number(body.stop_loss ?? body.stopLoss) || null
      : null;
  const takeProfit =
    body.take_profit !== null && body.takeProfit !== null
      ? Number(body.take_profit ?? body.takeProfit) || null
      : null;
  const pnl = Number(body.pnl ?? 0);
  const riskR =
    body.risk_r !== null && body.riskR !== null
      ? Number(body.risk_r ?? body.riskR) || null
      : null;
  const returnR =
    body.return_r !== null && body.returnR !== null
      ? Number(body.return_r ?? body.returnR) || null
      : null;
  const swap = Number(body.swap ?? 0);
  const commission = Number(body.commission ?? 0);
  const followedPlan = body.followed_plan !== false && body.followedPlan !== false;
  const planName = String(body.plan_name || body.planName || 'A+ Setup Checklist');
  const confluences = Array.isArray(body.confluences) ? body.confluences : [];
  const tradeManagement = body.trade_management || body.tradeManagement || null;
  const mistakes = Array.isArray(body.mistakes) ? body.mistakes : [];
  const entryEmotion = body.entry_emotion || body.entryEmotion || null;
  const exitEmotion = body.exit_emotion || body.exitEmotion || null;
  const notes = body.notes || null;
  const chartHtf = body.chart_htf || body.chartHtf || null;
  const chartMtf = body.chart_mtf || body.chartMtf || null;
  const chartLtf = body.chart_ltf || body.chartLtf || null;
  const session = body.session || 'London';
  const duration = body.duration || '15m';
  const splitOrders = body.split_orders
    ? JSON.stringify(body.split_orders)
    : body.splitOrders
      ? JSON.stringify(body.splitOrders)
      : '[]';
  const source = body.source || 'manual';

  const confluencesSql = confluences.length > 0
    ? sql`ARRAY[${sql.join(confluences.map((c) => sql`${c}`), sql`, `)}]::text[]`
    : sql`ARRAY[]::text[]`;
  const mistakesSql = mistakes.length > 0
    ? sql`ARRAY[${sql.join(mistakes.map((m) => sql`${m}`), sql`, `)}]::text[]`
    : sql`ARRAY[]::text[]`;

  try {
    const rows = await db.execute(sql`
      insert into trading.journal_trades (
        id, project_id, entry_date, entry_time, exit_date, exit_time,
        instrument, direction, lots, entry_price, exit_price,
        stop_loss, take_profit, pnl, risk_r, return_r, swap, commission,
        followed_plan, plan_name, confluences, trade_management, mistakes,
        entry_emotion, exit_emotion, notes, chart_htf, chart_mtf, chart_ltf,
        session, duration, split_orders, source, updated_at
      ) values (
        ${id}, ${projectId}, ${entryDate}, ${entryTime}, ${exitDate}, ${exitTime},
        ${instrument}, ${direction}, ${lots}, ${entryPrice}, ${exitPrice},
        ${stopLoss}, ${takeProfit}, ${pnl}, ${riskR}, ${returnR}, ${swap}, ${commission},
        ${followedPlan}, ${planName}, ${confluencesSql}, ${tradeManagement}, ${mistakesSql},
        ${entryEmotion}, ${exitEmotion}, ${notes}, ${chartHtf}, ${chartMtf}, ${chartLtf},
        ${session}, ${duration}, ${splitOrders}::jsonb, ${source}, now()
      )
      on conflict (id) do update set
        project_id = excluded.project_id,
        entry_date = excluded.entry_date,
        entry_time = excluded.entry_time,
        exit_date = excluded.exit_date,
        exit_time = excluded.exit_time,
        instrument = excluded.instrument,
        direction = excluded.direction,
        lots = excluded.lots,
        entry_price = excluded.entry_price,
        exit_price = excluded.exit_price,
        stop_loss = excluded.stop_loss,
        take_profit = excluded.take_profit,
        pnl = excluded.pnl,
        risk_r = excluded.risk_r,
        return_r = excluded.return_r,
        swap = excluded.swap,
        commission = excluded.commission,
        followed_plan = excluded.followed_plan,
        plan_name = excluded.plan_name,
        confluences = excluded.confluences,
        trade_management = excluded.trade_management,
        mistakes = excluded.mistakes,
        entry_emotion = excluded.entry_emotion,
        exit_emotion = excluded.exit_emotion,
        notes = excluded.notes,
        chart_htf = excluded.chart_htf,
        chart_mtf = excluded.chart_mtf,
        chart_ltf = excluded.chart_ltf,
        session = excluded.session,
        duration = excluded.duration,
        split_orders = excluded.split_orders,
        source = excluded.source,
        updated_at = now()
      returning *
    `);
    const created = resultRows<Record<string, unknown>>(rows)[0];
    return c.json({ trade: created });
  } catch (e) {
    return jsonError(c, 500, `journal save: ${String(e).slice(0, 200)}`);
  }
});

tradingApp.delete('/journal/:id', async (c: Context<AppEnv>) => {
  const id = c.req.param('id') ?? '';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) return jsonError(c, 400, 'Valid UUID required');

  try {
    const rows = await db.execute(sql`
      delete from trading.journal_trades
      where id = ${id}
      returning id
    `);
    if (!resultRows<{ id: string }>(rows).length) {
      return jsonError(c, 404, `Trade not found: ${id}`);
    }
    return c.json({ deleted: true, id });
  } catch (e) {
    return jsonError(c, 500, `journal delete: ${String(e).slice(0, 200)}`);
  }
});
