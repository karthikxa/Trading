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
import { getSupabase, toPublicStorageUrl } from '../shared/supabase';
import { listAgents, chatWithAgent, runSwarmAnalysis, invalidateAgentsCache, type SwarmRunReport } from './swarm';
import type { SwarmAgentRow } from './swarm';
import { emitBotEvent, checkBotComputerPermission, getProactiveResponse } from './events';

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

tradingApp.post('/agents', async (c: Context<AppEnv>) => {
  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return jsonError(c, 400, 'JSON body required');
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Custom Agent';
  const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim() : 'Trading Specialist';
  const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `agent_${Date.now()}`;
  const group_category = typeof body.group === 'string' ? body.group : 'Analysts';
  const shape = typeof body.shape === 'string' ? body.shape : 'orb';
  const color = typeof body.color === 'string' ? body.color : '#7C5CFF';
  const expression = typeof body.expression === 'string' ? body.expression : 'attentive';
  const description = typeof body.description === 'string' ? body.description : '';
  const system_prompt = typeof body.system_prompt === 'string' ? body.system_prompt : null;
  const model = typeof body.model === 'string' ? body.model : 'zed';
  const is_admin = Boolean(body.is_admin || body.isAdmin);
  const is_pinned = Boolean(body.is_pinned || body.isPinned);

  try {
    if (is_admin) {
      await db.execute(sql`update trading.agents set is_admin = false`);
    }
    await db.execute(sql`
      insert into trading.agents (
        id, name, role, group_category, shape, color, expression,
        description, system_prompt, model, is_admin, is_pinned, is_archived,
        created_at, updated_at
      ) values (
        ${id}, ${name}, ${role}, ${group_category}, ${shape}, ${color}, ${expression},
        ${description}, ${system_prompt}, ${model}, ${is_admin}, ${is_pinned}, false,
        now(), now()
      )
      on conflict (id) do update set
        name = excluded.name,
        role = excluded.role,
        shape = excluded.shape,
        color = excluded.color,
        expression = excluded.expression,
        description = excluded.description,
        system_prompt = excluded.system_prompt,
        updated_at = now()
    `);
    invalidateAgentsCache();

    // OpenMausBot proactive event: bot_created
    await emitBotEvent({
      bot_id: id,
      event_type: 'bot_created',
      payload: { name, role, model, timestamp: Date.now() },
    }).catch(() => {});

    return c.json({
      created: true,
      id,
      name,
      role,
      proactive_intro: getProactiveResponse('bot_created', name, role),
    });
  } catch (e) {
    return jsonError(c, 500, `agent create: ${String(e).slice(0, 200)}`);
  }
});

tradingApp.patch('/agents/:id', async (c: Context<AppEnv>) => {
  const id = c.req.param('id') ?? '';
  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return jsonError(c, 400, 'JSON body required');

  const hasPromptField = Object.prototype.hasOwnProperty.call(body, 'system_prompt');
  const systemPrompt = hasPromptField && typeof body.system_prompt === 'string' && body.system_prompt.trim()
    ? body.system_prompt.trim()
    : null;
  const clearPrompt = hasPromptField;
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null;
  const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim() : null;
  const shape = typeof body.shape === 'string' && body.shape.trim() ? body.shape.trim() : null;
  const color = typeof body.color === 'string' && body.color.trim() ? body.color.trim() : null;
  const expression = typeof body.expression === 'string' && body.expression.trim() ? body.expression.trim() : null;
  const description = typeof body.description === 'string' ? body.description.trim() : null;
  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : null;
  const isAdmin = typeof body.isAdmin === 'boolean' ? body.isAdmin : typeof body.is_admin === 'boolean' ? body.is_admin : null;
  const isPinned = typeof body.isPinned === 'boolean' ? body.isPinned : typeof body.is_pinned === 'boolean' ? body.is_pinned : null;
  const isArchived = typeof body.isArchived === 'boolean' ? body.isArchived : typeof body.is_archived === 'boolean' ? body.is_archived : null;

  try {
    if (isAdmin === true) {
      // Server-enforced single-admin rule: unset admin flag on all others
      await db.execute(sql`update trading.agents set is_admin = false where id != ${id}`);
    }

    const rows = await db.execute(sql`
      update trading.agents
      set
        system_prompt = case when ${clearPrompt} then ${systemPrompt} else system_prompt end,
        name = coalesce(${name}, name),
        role = coalesce(${role}, role),
        shape = coalesce(${shape}, shape),
        color = coalesce(${color}, color),
        expression = coalesce(${expression}, expression),
        description = coalesce(${description}, description),
        model = coalesce(${model}, model),
        is_admin = coalesce(${isAdmin}, is_admin),
        is_pinned = coalesce(${isPinned}, is_pinned),
        is_archived = coalesce(${isArchived}, is_archived),
        updated_at = now()
      where id = ${id}
      returning id
    `);
    if (!resultRows<{ id: string }>(rows).length) return jsonError(c, 404, `Unknown agent: ${id}`);
    invalidateAgentsCache();
    return c.json({ updated: true, id });
  } catch (e) {
    return jsonError(c, 500, `agent update: ${String(e).slice(0, 200)}`);
  }
});

tradingApp.delete('/agents/:id', async (c: Context<AppEnv>) => {
  const id = c.req.param('id') ?? '';
  try {
    const rows = await db.execute(sql`
      update trading.agents
      set is_archived = true, updated_at = now()
      where id = ${id}
      returning id
    `);
    if (!resultRows<{ id: string }>(rows).length) return jsonError(c, 404, `Unknown agent: ${id}`);
    invalidateAgentsCache();
    return c.json({ deleted: true, id });
  } catch (e) {
    return jsonError(c, 500, `agent delete: ${String(e).slice(0, 200)}`);
  }
});

tradingApp.post('/computer/execute', async (c: Context<AppEnv>) => {
  const reqId = c.req.header('X-Request-Id') || `req_${Date.now()}`;
  // Caller identity is derived strictly from authenticated principal/session header, NEVER body.botId
  const sessionBotId = c.req.header('X-Kortix-Session-Bot') || (c as any).get('boundBotId') || 'unbound';
  const body = await c.req.json().catch(() => null) as { botId?: string; command?: string } | null;
  const command = body?.command || '';

  if (body?.botId && body.botId !== sessionBotId) {
    console.warn(`[SecurityAudit] [req:${reqId}] Client spoof attempt: Session bot is '${sessionBotId}', but body claimed '${body.botId}'`);
  }

  // Permission verified strictly for session-bound bot
  const canUse = await checkBotComputerPermission(sessionBotId);
  if (!canUse) {
    return jsonError(c, 403, `Permission denied: Bot '${sessionBotId}' is not authorized to execute computer commands. Terminal access is restricted to the Admin bot only.`);
  }

  // Verify Kortix sandbox availability
  const hasSandbox = process.env.ALLOWED_SANDBOX_PROVIDERS && process.env.ALLOWED_SANDBOX_PROVIDERS !== 'none';
  if (!hasSandbox) {
    return jsonError(c, 501, 'No execution sandbox configured in this environment');
  }

  // Record Kortix approval entry before execution
  const approvalId = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[KortixApproval] [req:${reqId}] Staged approval ${approvalId} for bot '${sessionBotId}' command: ${command}`);

  return c.json({
    staged: true,
    approvalId,
    executionSandbox: 'daytona',
    status: 'pending_approval',
  });
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

import crypto from 'node:crypto';

const CHAIN_SECRET = process.env.INTERNAL_SERVICE_KEY || 'krtx_int_sec_chain_token_993';

function signChainToken(payload: { chainId: string; hopCount: number }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', CHAIN_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyChainToken(token: string): { chainId: string; hopCount: number } {
  const [data, sig] = token.split('.');
  if (!data || !sig) throw new Error('Invalid token');
  const expectedSig = crypto.createHmac('sha256', CHAIN_SECRET).update(data).digest('base64url');
  if (sig !== expectedSig) throw new Error('Invalid signature');
  return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
}

tradingApp.post('/chat', async (c: Context<AppEnv>) => {
  const reqId = c.req.header('X-Request-Id') || `req_${Date.now()}`;
  const body = await c.req.json().catch(() => null) as {
    agentId?: unknown;
    message?: unknown;
    history?: unknown;
    hopCount?: unknown;
  } | null;
  const agentId = typeof body?.agentId === 'string' ? body.agentId : '';
  const message = typeof body?.message === 'string' ? body.message.slice(0, 4000) : '';
  if (!agentId || !message.trim()) return jsonError(c, 400, 'agentId and message required');

  // Server-issued hop token tracking (ignoring client hopCount)
  const incomingChainHeader = c.req.header('X-Kortix-Chain-Token');
  let chainId = '';
  let serverHopCount = 1;

  if (incomingChainHeader) {
    try {
      const parsed = verifyChainToken(incomingChainHeader);
      chainId = parsed.chainId;
      serverHopCount = parsed.hopCount + 1;
    } catch {
      chainId = `chain_${Date.now()}`;
      serverHopCount = 1;
    }
  } else {
    chainId = `chain_${Date.now()}`;
    serverHopCount = 1;
  }

  // Enforce max 3 hops server-side (4th call refused)
  if (serverHopCount > 3) {
    console.warn(`[HopCapExceeded] [req:${reqId}] Chain ${chainId} exceeded maximum 3 hops (attempted hop ${serverHopCount}). Halting chain.`);
    return jsonError(c, 400, `Max cross-bot delegation hops (3) exceeded on chain ${chainId}`);
  }

  const nextChainToken = signChainToken({ chainId, hopCount: serverHopCount });
  c.header('X-Kortix-Chain-Token', nextChainToken);
  c.header('X-Kortix-Hop-Count', String(serverHopCount));

  const history = Array.isArray(body?.history)
    ? body.history
        .filter((m): m is { role: string; content: string } => Boolean(m) && typeof (m as { role?: unknown }).role === 'string' && typeof (m as { content?: unknown }).content === 'string')
        .slice(-10)
        .map((m) => ({ role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const), content: m.content }))
    : [];

  try {
    const result = await chatWithAgent(agentId, message, history);
    if (result.ok) {
      return c.json({
        ok: true,
        reply: result.reply,
        model: result.model,
        provider: result.provider,
        chainId,
        hopCount: serverHopCount,
      });
    }
    return jsonError(c, 503, result.error);
  } catch (e) {
    console.warn(`[ChatError] [req:${reqId}]`, e);
    return jsonError(c, 500, `chat: ${String(e).slice(0, 200)}`);
  }
});

tradingApp.get('/team/export', async (c: Context<AppEnv>) => {
  try {
    const agents = await listAgents();
    return c.json({
      export_version: '1.0',
      exported_at: new Date().toISOString(),
      agents,
    });
  } catch (e) {
    return jsonError(c, 500, `team export: ${String(e).slice(0, 200)}`);
  }
});

tradingApp.post('/team/import', async (c: Context<AppEnv>) => {
  const body = await c.req.json().catch(() => null) as { agents?: SwarmAgentRow[] } | null;
  if (!body?.agents || !Array.isArray(body.agents)) {
    return jsonError(c, 400, 'Invalid import package; agents array required');
  }
  let importedCount = 0;
  for (const a of body.agents) {
    if (!a.id || !a.name) continue;
    try {
      await db.execute(sql`
        insert into trading.agents (
          id, name, role, group_category, shape, color, expression,
          description, system_prompt, model, is_admin, is_pinned, is_archived,
          created_at, updated_at
        ) values (
          ${a.id}, ${a.name}, ${a.role || 'Specialist'}, ${a.group_category || 'Analysts'},
          ${a.shape || 'pebble'}, ${a.color || '#10B981'}, ${a.expression || 'attentive'},
          ${a.description || ''}, ${a.system_prompt || null}, ${a.model || 'zed'},
          ${Boolean(a.is_admin)}, ${Boolean(a.is_pinned)}, false,
          now(), now()
        )
        on conflict (id) do update set
          name = excluded.name,
          role = excluded.role,
          shape = excluded.shape,
          color = excluded.color,
          expression = excluded.expression,
          description = excluded.description,
          system_prompt = excluded.system_prompt,
          updated_at = now()
      `);
      importedCount++;
    } catch {}
  }
  invalidateAgentsCache();
  return c.json({ imported: true, count: importedCount });
});

tradingApp.get('/team/metrics', async (c: Context<AppEnv>) => {
  try {
    const agents = await listAgents();
    const decisionsCount = await db.execute(sql`select count(*) as count from trading.swarm_decisions`).catch(() => null);
    const count = (decisionsCount as unknown as { rows: Array<{ count: string }> })?.rows?.[0]?.count ?? '0';
    return c.json({
      total_agents: agents.length,
      active_agents: agents.filter(a => !a.is_archived).length,
      admin_agent: agents.find(a => a.is_admin)?.id || 'portfolio_manager',
      total_decisions: Number(count),
      active_runs: swarmRuns.size,
    });
  } catch (e) {
    return jsonError(c, 500, `metrics: ${String(e).slice(0, 200)}`);
  }
});

function nullableTrimmedText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function finiteNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function positiveNumberOrNull(value: unknown): number | null {
  const num = finiteNumberOrNull(value);
  return num !== null && num > 0 ? num : null;
}

function finiteNumberOr(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

const VALID_DIRECTIONS = new Set(['Buy', 'Sell', 'Long', 'Short']);
const VALID_SOURCES = new Set(['manual', 'auto']);

// Fast sub-millisecond in-memory cache for journal queries
const journalCache = new Map<string, { data: Record<string, unknown>[]; expiresAt: number }>();
function invalidateJournalCache(): void {
  journalCache.clear();
}

tradingApp.get('/journal', async (c: Context<AppEnv>) => {
  const projectId = c.req.query('projectId') ?? null;
  const limitRaw = Number(c.req.query('limit') ?? '200');
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

  const cacheKey = `${projectId || 'all'}_${limit}`;
  const now = Date.now();
  const cached = journalCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return c.json({ trades: cached.data });
  }

  try {
    const rows = await db.execute(sql`
      select *
      from trading.journal_trades
      where ${projectId ? sql`project_id = ${projectId} or project_id is null` : sql`true`}
      order by entry_date desc, coalesce(entry_time, '00:00') desc, created_at desc
      limit ${limit}
    `);
    const trades = resultRows<Record<string, unknown>>(rows);
    journalCache.set(cacheKey, { data: trades, expiresAt: now + 5000 });
    return c.json({ trades });
  } catch (e) {
    return jsonError(c, 500, `journal get: ${String(e).slice(0, 200)}`);
  }
});

tradingApp.post('/journal', async (c: Context<AppEnv>) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, any> | null;
  if (!body) return jsonError(c, 400, 'JSON body required');

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const id = typeof body.id === 'string' && uuidRegex.test(body.id) ? body.id : crypto.randomUUID();

  const projectId =
    nullableTrimmedText(body.project_id) ?? nullableTrimmedText(body.projectId);
  const rawEntryDate = String(body.entry_date || body.entryDate || '').split('T')[0];
  const entryDate = dateRegex.test(rawEntryDate)
    ? rawEntryDate
    : new Date().toISOString().split('T')[0];
  const entryTime = nullableTrimmedText(body.entry_time ?? body.entryTime) ?? '09:30';
  const rawExitDate = body.exit_date || body.exitDate;
  const exitDate =
    typeof rawExitDate === 'string' && dateRegex.test(rawExitDate.split('T')[0])
      ? rawExitDate.split('T')[0]
      : null;
  const exitTime = nullableTrimmedText(body.exit_time ?? body.exitTime);
  const instrument = String(body.instrument || 'EURUSD').trim().toUpperCase();
  if (!instrument) return jsonError(c, 400, 'instrument is required');

  const rawDirection = String(body.direction || 'Buy');
  const direction = VALID_DIRECTIONS.has(rawDirection) ? rawDirection : 'Buy';
  const lots = Math.max(0, finiteNumberOr(body.lots, 0));
  const entryPrice = finiteNumberOr(body.entry_price ?? body.entryPrice, 0);
  const exitPrice = finiteNumberOr(body.exit_price ?? body.exitPrice, 0);
  const stopLoss = positiveNumberOrNull(body.stop_loss ?? body.stopLoss);
  const takeProfit = positiveNumberOrNull(body.take_profit ?? body.takeProfit);
  const pnl = finiteNumberOr(body.pnl, 0);
  const riskR = finiteNumberOrNull(body.risk_r ?? body.riskR);
  const returnR = finiteNumberOrNull(body.return_r ?? body.returnR);
  const swap = finiteNumberOr(body.swap, 0);
  const commission = finiteNumberOr(body.commission, 0);
  const rawFollowed = body.followed_plan ?? body.followedPlan;
  const followedPlan = rawFollowed === undefined || rawFollowed === null ? true : Boolean(rawFollowed);
  const planName = nullableTrimmedText(body.plan_name ?? body.planName);
  const confluences = Array.isArray(body.confluences)
    ? body.confluences.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : [];
  const tradeManagement = nullableTrimmedText(body.trade_management ?? body.tradeManagement);
  const mistakes = Array.isArray(body.mistakes)
    ? body.mistakes.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : [];
  const entryEmotion = nullableTrimmedText(body.entry_emotion ?? body.entryEmotion);
  const exitEmotion = nullableTrimmedText(body.exit_emotion ?? body.exitEmotion);
  const notes = typeof body.notes === 'string' && body.notes.trim().length > 0 ? body.notes : null;
  const chartHtf = nullableTrimmedText(body.chart_htf ?? body.chartHtf);
  const chartMtf = nullableTrimmedText(body.chart_mtf ?? body.chartMtf);
  const chartLtf = nullableTrimmedText(body.chart_ltf ?? body.chartLtf);
  const session = nullableTrimmedText(body.session) ?? 'London';
  const duration = nullableTrimmedText(body.duration);
  const splitOrdersArr = Array.isArray(body.split_orders)
    ? body.split_orders
    : Array.isArray(body.splitOrders)
      ? body.splitOrders
      : [];
  const splitOrders = JSON.stringify(splitOrdersArr);
  const rawSource = String(body.source || 'manual');
  const source = VALID_SOURCES.has(rawSource) ? rawSource : 'manual';

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
    invalidateJournalCache();
    return c.json({ trade: created });
  } catch (e) {
    return jsonError(c, 500, `journal save: ${String(e).slice(0, 200)}`);
  }
});

const ALLOWED_CHART_MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const VALID_CHART_TIMEFRAMES = new Set(['htf', 'mtf', 'ltf', 'chart']);
const MAX_JOURNAL_CHART_BYTES = 15 * 1024 * 1024;
const JOURNAL_CHARTS_BUCKET = 'journal-charts';

export const tradingChartsPublicApp = new OpenAPIHono<AppEnv>();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let chartsTableReadyPromise: Promise<void> | null = null;

async function ensureJournalChartsTable(): Promise<void> {
  if (!chartsTableReadyPromise) {
    chartsTableReadyPromise = db
      .execute(sql`
        create table if not exists trading.journal_charts (
          id uuid primary key,
          user_id text not null,
          timeframe text not null,
          mime_type text not null,
          data bytea not null,
          created_at timestamptz not null default now()
        )
      `)
      .then(() => undefined)
      .catch((err) => {
        chartsTableReadyPromise = null;
        throw err;
      });
  }
  await chartsTableReadyPromise;
}

function extractJournalChartPgId(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const marker = '/v1/trading-charts/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const candidate = url.slice(idx + marker.length).split('?')[0]?.trim() || '';
  return UUID_REGEX.test(candidate) ? candidate : null;
}

tradingChartsPublicApp.get('/:id', async (c: Context<AppEnv>) => {
  const id = (c.req.param('id') ?? '').trim();
  if (!UUID_REGEX.test(id)) return jsonError(c, 400, 'Valid UUID required');
  try {
    await ensureJournalChartsTable();
    const res = await db.execute(sql`
      select mime_type, encode(data, 'base64') as data_b64
      from trading.journal_charts
      where id = ${id}::uuid
      limit 1
    `);
    const rows = resultRows<{ mime_type: string; data_b64: string }>(res);
    if (!rows.length || !rows[0].data_b64) {
      return jsonError(c, 404, 'Chart image not found');
    }
    const buf = Buffer.from(rows[0].data_b64, 'base64');
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': rows[0].mime_type || 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    return jsonError(c, 500, `journal chart fetch: ${String(e).slice(0, 200)}`);
  }
});

function extractJournalChartStoragePath(url: unknown): string | null {
  if (typeof url !== 'string' || !url.startsWith('http')) return null;
  const marker = `/storage/v1/object/public/${JOURNAL_CHARTS_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const rawPath = url.slice(idx + marker.length).split('?')[0];
  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath || null;
  }
}

tradingApp.post('/journal/upload', async (c: Context<AppEnv>) => {
  try {
    const formData = await c.req.formData().catch(() => null);
    if (!formData) return jsonError(c, 400, 'multipart form-data required');

    const fileEntry = formData.get('file');
    if (!(fileEntry instanceof Blob)) {
      return jsonError(c, 400, 'Image file field "file" is required');
    }
    if (fileEntry.size <= 0) {
      return jsonError(c, 400, 'Uploaded image is empty');
    }
    if (fileEntry.size > MAX_JOURNAL_CHART_BYTES) {
      return jsonError(c, 400, 'Image exceeds 15MB maximum upload limit');
    }

    const mime = (fileEntry.type || '').toLowerCase().trim();
    const ext = ALLOWED_CHART_MIME_TO_EXT[mime];
    if (!ext) {
      return jsonError(c, 400, 'Unsupported image type — expected PNG, JPEG, WebP, or GIF');
    }

    const tfRaw = String(formData.get('timeframe') || 'chart').toLowerCase().trim();
    const timeframe = VALID_CHART_TIMEFRAMES.has(tfRaw) ? tfRaw : 'chart';
    const userId = String(c.get('userId') || 'trader').replace(/[^a-zA-Z0-9_-]/g, '');
    const objectPath = `${userId || 'trader'}/${timeframe}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const supabase = getSupabase();
    const bytes = await fileEntry.arrayBuffer();
    let uploadError: { message: string } | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
      const res = await supabase.storage
        .from(JOURNAL_CHARTS_BUCKET)
        .upload(objectPath, bytes, {
          contentType: mime,
          cacheControl: '31536000',
          upsert: attempt > 0,
        });
      uploadError = res.error;
      if (!uploadError) break;
      const msg = uploadError.message.toLowerCase();
      const transient =
        msg.includes('internal server error') ||
        msg.includes('too many connections') ||
        msg.includes('connection to the database') ||
        msg.includes('timed out') ||
        msg.includes('timeout') ||
        msg.includes('429') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('504') ||
        msg.includes('500') ||
        msg.includes('fetch failed');
      if (!transient) break;
    }

    if (uploadError) {
      // Fallback to PostgreSQL BYTEA storage when Supabase's Storage API pooler rejects connections (429/5xx)
      await ensureJournalChartsTable();
      const chartId = crypto.randomUUID();
      const b64 = Buffer.from(bytes).toString('base64');
      await db.execute(sql`
        insert into trading.journal_charts (id, user_id, timeframe, mime_type, data)
        values (${chartId}::uuid, ${userId || 'trader'}, ${timeframe}, ${mime}, decode(${b64}, 'base64'))
      `);
      return c.json({
        url: `/v1/trading-charts/${chartId}`,
        path: `pg:${chartId}`,
      });
    }

    const { data: pub } = supabase.storage
      .from(JOURNAL_CHARTS_BUCKET)
      .getPublicUrl(objectPath);

    return c.json({
      url: toPublicStorageUrl(pub.publicUrl),
      path: objectPath,
    });
  } catch (e) {
    return jsonError(c, 500, `journal upload: ${String(e).slice(0, 200)}`);
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
      returning id, chart_htf, chart_mtf, chart_ltf
    `);
    const deletedRows = resultRows<{
      id: string;
      chart_htf?: string | null;
      chart_mtf?: string | null;
      chart_ltf?: string | null;
    }>(rows);
    if (!deletedRows.length) {
      return jsonError(c, 404, `Trade not found: ${id}`);
    }

    const removed = deletedRows[0];
    const storagePaths = [removed.chart_htf, removed.chart_mtf, removed.chart_ltf]
      .map(extractJournalChartStoragePath)
      .filter((p): p is string => Boolean(p));
    if (storagePaths.length > 0) {
      void getSupabase()
        .storage.from(JOURNAL_CHARTS_BUCKET)
        .remove(storagePaths)
        .catch(() => undefined);
    }

    const pgChartIds = [removed.chart_htf, removed.chart_mtf, removed.chart_ltf]
      .map(extractJournalChartPgId)
      .filter((p): p is string => Boolean(p));
    for (const pgId of pgChartIds) {
      void db
        .execute(sql`delete from trading.journal_charts where id = ${pgId}::uuid`)
        .catch(() => undefined);
    }

    invalidateJournalCache();
    return c.json({ deleted: true, id });
  } catch (e) {
    return jsonError(c, 500, `journal delete: ${String(e).slice(0, 200)}`);
  }
});
