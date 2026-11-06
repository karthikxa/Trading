/**
 * Tauric Swarm — the multi-agent trading pipeline.
 *
 * Mirrors the TauricResearch TradingAgents flow: the analyst team runs in
 * parallel on one shared data brief, bull/bear researchers debate, the
 * portfolio manager synthesizes, the risk manager gates, and the final
 * decision is persisted into `trading.swarm_decisions`. Every model call
 * routes through FreeLLMAPI (./freellm), so the whole pipeline runs on the
 * free tier with zero credentials.
 */

import { sql } from 'drizzle-orm';
import { db } from '../shared/db';
import { chatComplete, type FlmMessage } from './freellm';
import { loadMarketData } from './market-data';
import { DEFAULT_ANALYST_IDS, personaSystemPrompt } from './personas';

/** db.execute returns an array-RowList in this driver — normalize both shapes. */
function resultRows<T>(result: unknown): T[] {
  return Array.isArray(result) ? (result as T[]) : (((result as { rows?: T[] }).rows) ?? []);
}

export interface SwarmAgentRow {
  id: string;
  name: string;
  role: string;
  group_category: string;
  shape: string;
  color: string;
  expression: string;
  description: string | null;
  system_prompt: string | null;
}

export async function listAgents(): Promise<SwarmAgentRow[]> {
  const result = await db.execute(sql`
    select id, name, role, group_category, shape, color, expression,
           description, system_prompt
    from trading.agents
    order by case when is_admin then 0 else 1 end, id
  `);
  return resultRows<SwarmAgentRow>(result);
}

/** Fenced-JSON parser: survives prose wrappers and code fences. */
function parseJsonLoose(text: string): Record<string, unknown> | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNum(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function normalizeSignal(v: unknown): 'BUY' | 'SELL' | 'HOLD' | null {
  if (typeof v !== 'string') return null;
  const u = v.trim().toUpperCase();
  return u === 'BUY' || u === 'SELL' || u === 'HOLD' ? u : null;
}

export interface SwarmPhaseLog {
  phase: string;
  agent: string;
  model: string | null;
  provider: string | null;
  latencyMs: number | null;
  status: 'ok' | 'failed' | 'skipped';
  summary?: string;
}

export interface SwarmVote {
  agentId: string;
  agentName: string;
  signal: string | null;
  confidence: number | null;
  note: string;
  model: string | null;
}

export interface SwarmRunInput {
  ticker: string;
  analystIds?: string[];
  debateRounds?: number;
  note?: string;
  executor?: string;
}

export interface SwarmRunReport {
  ticker: string;
  decision: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  risk_score: number;
  execution_note: string;
  votes: SwarmVote[];
  debate: Array<{ side: 'bull' | 'bear'; argument: string; confidence: number }>;
  risk: { critique: string; veto: boolean; risk_score: number | null } | null;
  data_hint: string | null;
  phases: SwarmPhaseLog[];
  model_chain_default: string;
  persisted: boolean;
  run_id: string;
}

interface AgentCallOk {
  text: string;
  model: string;
  provider: string;
  latencyMs: number;
}

async function callAgent(
  row: SwarmAgentRow,
  userContent: string,
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<AgentCallOk | { error: string }> {
  const result = await chatComplete({
    messages: [
      { role: 'system', content: personaSystemPrompt(row) },
      { role: 'user', content: userContent },
    ],
    maxTokens: opts.maxTokens ?? 420,
    temperature: opts.temperature ?? 0.35,
  });
  if (result.ok) {
    return { text: result.content, model: result.model, provider: result.provider, latencyMs: result.latencyMs };
  }
  return { error: result.error };
}

function findAgent(id: string, agents: SwarmAgentRow[]): SwarmAgentRow | null {
  return agents.find((a) => a.id === id) ?? null;
}

export async function runSwarmAnalysis(input: SwarmRunInput, analysisDate?: string): Promise<SwarmRunReport> {
  const ticker = input.ticker.trim().toUpperCase();
  const analystIds = (input.analystIds?.length ? input.analystIds : DEFAULT_ANALYST_IDS).filter(
    (id) => DEFAULT_ANALYST_IDS.concat('growth_analyst', 'macro_analyst').includes(id),
  );
  const debateRounds = Math.min(Math.max(input.debateRounds ?? 1, 0), 3);
  const phases: SwarmPhaseLog[] = [];
  const runId = `swarm_${Date.now()}_${ticker}`;

  const agents = await listAgents();

  const market = await loadMarketData(ticker);
  let dataHint: string | null = null;
  let brief: string;
  if (market) {
    brief = market.brief;
    dataHint = `close ${market.series.close[market.series.close.length - 1]} via ${market.series.source}`;
  } else {
    brief = `TICKER: ${ticker}\n(Direct market data lookup failed — no price series available.\nAnalysts must answer HOLD with note "no data", unless the user note overrides.)`;
  }
  if (input.note?.trim()) brief += `\nUSER NOTE: ${input.note.trim()}`;
  if (analysisDate) brief += `\nANALYSIS DATE: ${analysisDate}`;

  // ── analyst team (parallel) ──────────────────────────────────────────────
  const votes: SwarmVote[] = [];
  const analystRows = analystIds
    .map((id) => findAgent(id, agents))
    .filter((r): r is SwarmAgentRow => Boolean(r));

  const analystSettled = await Promise.allSettled(
    analystRows.map(async (row) => {
      const res = await callAgent(row, `${brief}\n\nProduce your analyst JSON now.`);
      if ('error' in res) {
        phases.push({ phase: 'analyst', agent: row.id, model: null, provider: null, latencyMs: null, status: 'failed', summary: res.error });
        const vote: SwarmVote = { agentId: row.id, agentName: row.name, signal: null, confidence: null, note: 'model call failed', model: null };
        votes.push(vote);
        return vote;
      }
      const parsed = parseJsonLoose(res.text);
      const vote: SwarmVote = {
        agentId: row.id,
        agentName: row.name,
        signal: normalizeSignal(parsed?.['signal']),
        confidence: asNum(parsed?.['confidence']),
        note: asStr(parsed?.['note'], res.text.slice(0, 240)),
        model: res.model,
      };
      phases.push({ phase: 'analyst', agent: row.id, model: res.model, provider: res.provider, latencyMs: res.latencyMs, status: 'ok', summary: `${vote.signal ?? '?'} (${vote.confidence ?? '?'})` });
      votes.push(vote);
      return vote;
    }),
  );
  const analystErrors = analystSettled.filter((r) => r.status === 'rejected').length;
  if (analystErrors) {
    phases.push({ phase: 'analyst-loop', agent: '(dispatch)', model: null, provider: null, latencyMs: null, status: 'failed', summary: `${analystErrors} analyst promise(s) rejected` });
  }

  const analystDigest = votes.length
    ? votes.map((v) => `- ${v.agentName} (${v.agentId}): ${v.signal ?? 'n/a'} conf ${v.confidence ?? 'n/a'} — ${v.note}`).join('\n')
    : '- analysts returned nothing';

  // ── bull/bear debate ────────────────────────────────────────────────────
  const debate: SwarmRunReport['debate'] = [];
  const bull = findAgent('bull_researcher', agents);
  const bear = findAgent('bear_researcher', agents);
  const debateHistory: string[] = [];
  for (let round = 1; round <= debateRounds; round++) {
    for (const [side, row] of [
      ['bull', bull] as const,
      ['bear', bear] as const,
    ]) {
      if (!row) continue;
      const prior = debateHistory.length ? `PRIOR DEBATE: ${debateHistory.join(' | ')}` : '';
      const user = `${brief}\n\nANALYST REPORTS:\n${analystDigest}\n${prior}\n\n(Round ${round}) Produce your ${side} JSON now.`;
      const res = await callAgent(row, user, { maxTokens: 320 });
      if ('error' in res) {
        phases.push({ phase: `debate-${side}`, agent: row.id, model: null, provider: null, latencyMs: null, status: 'failed', summary: res.error });
        continue;
      }
      const parsed = parseJsonLoose(res.text);
      const argument = asStr(parsed?.['argument'], res.text.slice(0, 280));
      const confidence = asNum(parsed?.['confidence']) ?? 50;
      debate.push({ side, argument, confidence });
      debateHistory.push(`${side}: "${argument}"`);
      phases.push({ phase: `debate-${side}`, agent: row.id, model: res.model, provider: res.provider, latencyMs: res.latencyMs, status: 'ok', summary: argument.slice(0, 90) });
    }
  }

  // ── synthesis (portfolio manager) ────────────────────────────────────────
  const pm = findAgent('portfolio_manager', agents);
  let decision: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let confidence = 50;
  let reasoning = 'Synthesis unavailable — defaulting to HOLD.';
  let riskScore = 50;
  let executionNote = '';
  let riskResult: SwarmRunReport['risk'] = null;

  if (pm) {
    const debateBlock = debate.map((d) => `${d.side.toUpperCase()} (conf ${d.confidence}): ${d.argument}`).join('\n');
    const res = await callAgent(
      pm,
      `${brief}\n\nANALYST REPORTS:\n${analystDigest}\n\nDEBATE:\n${debateBlock || '(no debate ran)'}\n\nProduce your investment-committee JSON now.`,
      { maxTokens: 450 },
    );
    if ('error' in res) {
      phases.push({ phase: 'synthesis', agent: pm.id, model: null, provider: null, latencyMs: null, status: 'failed', summary: res.error });
    } else {
      const parsed = parseJsonLoose(res.text);
      decision = normalizeSignal(parsed?.['decision']) ?? decision;
      confidence = asNum(parsed?.['confidence']) ?? confidence;
      reasoning = asStr(parsed?.['reasoning'], res.text.slice(0, 300));
      riskScore = asNum(parsed?.['risk_score']) ?? riskScore;
      executionNote = asStr(parsed?.['execution_note']);
      phases.push({ phase: 'synthesis', agent: pm.id, model: res.model, provider: res.provider, latencyMs: res.latencyMs, status: 'ok', summary: `${decision} (conf ${confidence})` });

      // ── risk gate ──────────────────────────────────────────────────────
      const rm = findAgent('risk_manager', agents);
      if (rm) {
        const riskRes = await callAgent(
          rm,
          `${brief}\n\nPROPOSED COMMITTEE DECISION: ${decision} (confidence ${confidence}) — ${reasoning}\n\nProduce your risk-gate JSON now.`,
          { maxTokens: 260 },
        );
        if ('error' in riskRes) {
          phases.push({ phase: 'risk', agent: rm.id, model: null, provider: null, latencyMs: null, status: 'failed', summary: riskRes.error });
        } else {
          const rp = parseJsonLoose(riskRes.text);
          const veto = rp?.['veto'] === true || asStr(rp?.['veto']).toLowerCase() === 'true';
          riskResult = {
            critique: asStr(rp?.['critique']),
            veto,
            risk_score: asNum(rp?.['risk_score']),
          };
          phases.push({ phase: 'risk', agent: rm.id, model: riskRes.model, provider: riskRes.provider, latencyMs: riskRes.latencyMs, status: 'ok', summary: veto ? 'VETO' : riskResult.critique.slice(0, 90) });

          if (veto) {
            const adjRes = await callAgent(
              pm,
              `${brief}\n\nYOUR COMMITTEE PROPOSAL: ${decision} (confidence ${confidence}) — ${reasoning}\nRisk gate VETOED with risk score ${riskResult.risk_score ?? riskScore}: ${riskResult.critique}\n\nProduce your FINAL JSON now: adjust or restate the decision as needed to clear the risk gate.`,
              { maxTokens: 400 },
            );
            if ('error' in adjRes) {
              phases.push({ phase: 'final', agent: pm.id, model: null, provider: null, latencyMs: null, status: 'failed', summary: adjRes.error });
            } else {
              const p = parseJsonLoose(adjRes.text);
              decision = normalizeSignal(p?.['decision']) ?? decision;
              confidence = asNum(p?.['confidence']) ?? confidence;
              reasoning = asStr(p?.['reasoning'], reasoning);
              riskScore = asNum(p?.['risk_score']) ?? riskResult.risk_score ?? riskScore;
              executionNote = asStr(p?.['execution_note'], executionNote) || `${executionNote} | risk-cleared`.trim();
              phases.push({ phase: 'final', agent: pm.id, model: adjRes.model, provider: adjRes.provider, latencyMs: adjRes.latencyMs, status: 'ok', summary: `${decision} after veto` });
            }
          }
        }
      }
    }
  } else {
    phases.push({ phase: 'synthesis', agent: 'portfolio_manager', model: null, provider: null, latencyMs: null, status: 'skipped', summary: 'agent row missing' });
  }

  // ── execution desk note ────────────────────────────────────────────────
  const trader = findAgent(input.executor ?? 'trader_agent', agents);
  if (trader && decision !== 'HOLD') {
    const res = await callAgent(
      trader,
      `${brief}\n\nCOMMITTEE DECISION: ${decision} (confidence ${confidence}) — ${reasoning}\n\nProduce your execution JSON now.`,
      { maxTokens: 260 },
    );
    if (!('error' in res)) {
      const parsed = parseJsonLoose(res.text);
      const plan = asStr(parsed?.['plan'], '');
      if (plan) executionNote = executionNote ? `${executionNote} | ${plan}` : plan;
      phases.push({ phase: 'execution', agent: trader.id, model: res.model, provider: res.provider, latencyMs: res.latencyMs, status: 'ok', summary: plan.slice(0, 90) });
    }
  }

  // ── persist analyst votes + final committee decision ────────────────────
  let persisted = false;
  try {
    const voteRows = votes
      .filter((v) => v.signal)
      .map((v) => sql`(${ticker}, ${v.agentId}, ${v.signal}, ${v.confidence ?? 0}, ${v.note}, ${Math.min(v.confidence ?? 50, 99)})`);
    if (voteRows.length === 0) voteRows.push(sql`(${ticker}, 'portfolio_manager', ${decision}, ${confidence}, 'no analyst votes', ${riskScore})`);
    voteRows.push(sql`(${ticker}, 'portfolio_manager', ${decision}, ${confidence}, ${`${reasoning} — exec: ${executionNote || 'n/a'}`}, ${riskScore})`);
    await db.execute(sql`
      insert into trading.swarm_decisions (ticker, agent_id, decision, confidence, reasoning, risk_score)
      values ${sql.join(voteRows, sql`, `)}
    `);
    persisted = true;
  } catch {
    persisted = false;
  }

  return {
    ticker,
    decision,
    confidence,
    reasoning,
    risk_score: riskScore,
    execution_note: executionNote,
    votes,
    debate,
    risk: riskResult,
    data_hint: dataHint,
    phases,
    model_chain_default: 'beam-free > nemotron-free > xing-free > auto-free (+keyed tiers when configured)',
    persisted,
    run_id: runId,
  };
}

/** One Muas-style bot chat turn against a single agent persona. */
export async function chatWithAgent(
  agentId: string,
  message: string,
  history: FlmMessage[] = [],
): Promise<{ ok: true; reply: string; model: string; provider: string } | { ok: false; error: string }> {
  const agents = await listAgents();
  const row = findAgent(agentId, agents);
  if (!row) return { ok: false, error: `Unknown agent: ${agentId}` };

  let brief = '(No live market data available)';
  try {
    const skip = new Set(['BUY', 'SELL', 'HOLD', 'RSI', 'MACD', 'SMA', 'EPS', 'IPO', 'SEC', 'GDP', 'ETF']);
    const tickers = (message.match(/\b[A-Z]{1,5}\b/g) || []).filter((t) => !skip.has(t));
    const candidate = tickers[0];
    if (candidate) {
      const market = await loadMarketData(candidate);
      if (market) brief = market.brief;
    }
  } catch {
    // keep the placeholder brief
  }

  const result = await chatComplete({
    messages: [
      {
        role: 'system',
        content: `${personaSystemPrompt(row)}\nYou are in a direct chat with the user. Answer in plain prose (<= 120 words) unless asked otherwise.`,
      },
      ...history.slice(-8),
      { role: 'user', content: `${message}\n\n[MARKET DATA BRIEF — cite it when relevant]\n${brief}` },
    ],
    maxTokens: 420,
    temperature: 0.4,
  });
  if (result.ok) return { ok: true, reply: result.content, model: result.model, provider: result.provider };
  return { ok: false, error: result.error };
}
