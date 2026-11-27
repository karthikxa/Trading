/**
 * Unified Trading Server Engine & Persistence Layer
 *
 * Implements real backend logic for:
 * 1. Agent roster, customizations, pinning, archiving, and single-admin enforcement
 * 2. Groups CRUD (trading.agent_groups)
 * 3. Real approvals engine and dynamic pending approval counts
 * 4. Chat execution with server-enforced DB prompts & 3-hop recursion cap
 * 5. Admin-only computer execution gate
 * 6. Autonomous proactive bot loop (OpenMausBot)
 * 7. Team export and import
 * 8. Connector & tool grants per bot
 * 9. Project detail & permissions bridge (eliminates UI hangs on Connectors, Drive, Customize)
 */

import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import type { UrlWithParsedQuery } from 'url';

const DATA_DIR = path.resolve(process.cwd(), 'suna/apps/api/src/trading/data');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const APPROVALS_FILE = path.join(DATA_DIR, 'approvals.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const SWARM_RUNS_FILE = path.join(DATA_DIR, 'swarm_runs.json');
const GRANTS_FILE = path.join(DATA_DIR, 'connector_grants.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const TRANSCRIPTS_FILE = path.join(DATA_DIR, 'transcripts.json');
const MEMORY_FILE = path.join(DATA_DIR, 'bot_memory.json');
const SKILLS_FILE = path.join(DATA_DIR, 'bot_skills.json');
const ROUTINES_FILE = path.join(DATA_DIR, 'bot_routines.json');
const TASKS_FILE = path.join(DATA_DIR, 'bot_tasks.json');
const MEMORY_HISTORY_FILE = path.join(DATA_DIR, 'bot_memory_history.json');
const MEMORY_POLICY_FILE = path.join(DATA_DIR, 'bot_memory_policy.json');
let latestTradingContext: Record<string, unknown> | null = null;
let latestTradingContextRevision = 0;

function recordTradingContext(context: Record<string, unknown>): void {
  if (JSON.stringify(context) !== JSON.stringify(latestTradingContext)) {
    latestTradingContext = context;
    latestTradingContextRevision += 1;
  }
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

export interface StoredAgent {
  id: string;
  name: string;
  role: string;
  group_category: string;
  shape: string;
  color: string;
  expression: string;
  description: string;
  system_prompt: string | null;
  model: string;
  is_admin: boolean;
  is_pinned: boolean;
  is_archived: boolean;
  pending_approvals_count: number;
  lead_agent_id?: string;
  can_delegate?: boolean;
  can_receive_tasks?: boolean;
  allow_sideways?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoredGroup {
  id: string;
  name: string;
  description: string;
  agent_ids: string[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoredApproval {
  id: string;
  agent_id: string;
  agent_name: string;
  action_type: 'trade_execution' | 'risk_limit_change' | 'computer_command';
  details: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at?: string;
}

export interface StoredMessage {
  id: string;
  project_id: string;
  session_id: string;
  agent_id: string;
  agent_name: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface StoredGrant {
  grant_id: string;
  bot_id: string;
  connector_id: string;
  tool_pattern: string;
  is_allowed: boolean;
  requires_approval: boolean;
  created_at: string;
}

export interface StoredMemory {
  id: string;
  scope: 'workspace' | 'agent';
  agent_id?: string;
  key: string;
  value: string;
  source: 'user' | 'bot' | 'connector' | 'system';
  created_at: string;
  updated_at: string;
}

export interface StoredMemoryHistory {
  id: string;
  memory_id: string;
  action: 'created' | 'updated' | 'deleted' | 'expired';
  value?: string;
  at: string;
}

export interface MemoryPolicy {
  retention_days: number;
  max_items: number;
  updated_at: string;
}

function classifyApproval(instruction: string): { needsApproval: boolean; actionType: StoredApproval['action_type']; reason: string; confidence: number } {
  const text = instruction.toLowerCase();
  const write = /\b(place|modify|cancel|execute|buy|sell|short|cover|pay|send|email|post|publish|delete|transfer|withdraw|change|set)\b/.test(text);
  const trading = /\b(order|buy|sell|short|cover|position|trade|stop[- ]loss|target)\b/.test(text);
  const computer = /\b(computer|browser|terminal|shell|file|email|slack|message|post|publish)\b/.test(text);
  return {
    needsApproval: write,
    actionType: trading ? 'trade_execution' : computer ? 'computer_command' : 'risk_limit_change',
    reason: write ? 'This request could create an external side effect.' : 'This request is read-only or analytical.',
    confidence: write ? 0.94 : 0.91,
  };
}

export interface StoredSkill {
  id: string;
  name: string;
  description: string;
  agent_id: string;
  steps: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_run_at?: string;
}

export interface StoredRoutine {
  id: string;
  name: string;
  agent_id: string;
  instruction: string;
  interval_ms: number;
  enabled: boolean;
  next_run_at: string;
  last_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StoredTask {
  id: string;
  session_id: string;
  from_agent: string;
  to_agent: string;
  instruction: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: string;
  created_at: string;
  updated_at: string;
}

// ── Default Canonical Agents ────────────────────────────────────────────────
const CANONICAL_AGENTS: StoredAgent[] = [
  {
    id: 'portfolio_manager',
    name: 'Portfolio Manager',
    role: 'Chief of Staff & Swarm Lead',
    group_category: 'Management',
    shape: 'circle',
    color: '#8B5CF6',
    expression: 'attentive',
    description: 'Synthesizes committee debate into capital allocation guidance.',
    system_prompt: 'You are Portfolio Manager on the Tauric trading desk. Converse naturally, concisely, and warmly. If the user greets you or asks casual questions (like "how are u", "hi", "what can you do"), respond conversationally in 1-2 friendly sentences like a real desk teammate. Only provide detailed market reports or analysis when specifically requested.',
    model: 'zed',
    is_admin: true,
    is_pinned: true,
    is_archived: false,
    pending_approvals_count: 0,
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
  },
  {
    id: 'quant_analyst',
    name: 'Quantitative Analyst',
    role: 'Statistical Arbitrage & Pricing Models',
    group_category: 'Analysts',
    shape: 'hexagon',
    color: '#06B6D4',
    expression: 'neutral',
    description: 'Computes volatility cones, correlations, and statistical edges.',
    system_prompt: 'You are Quantitative Analyst on the Tauric trading desk. Focus on probability distributions, statistical arbitrage, and edge calculation.',
    model: 'zed',
    is_admin: false,
    is_pinned: false,
    is_archived: false,
    pending_approvals_count: 0,
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
  },
  {
    id: 'technical_analyst',
    name: 'Technical Analyst',
    role: 'Price Action & Liquidity POIs',
    group_category: 'Analysts',
    shape: 'diamond',
    color: '#3B82F6',
    expression: 'attentive',
    description: 'Analyzes candlestick orderflow, liquidity zones, and market structure.',
    system_prompt: 'You are Technical Analyst on the Tauric trading desk. Identify high-probability order blocks, fair value gaps, and liquidity targets.',
    model: 'zed',
    is_admin: false,
    is_pinned: false,
    is_archived: false,
    pending_approvals_count: 0,
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
  },
  {
    id: 'fundamentals_analyst',
    name: 'Fundamentals Analyst',
    role: 'Earnings Quality & Sector Valuation',
    group_category: 'Analysts',
    shape: 'square',
    color: '#10B981',
    expression: 'neutral',
    description: 'Audits corporate balance sheets, revenue quality, and PE multiples.',
    system_prompt: 'You are Fundamentals Analyst on the Tauric trading desk. Evaluate enterprise value, earnings growth, and cash flow multiples.',
    model: 'zed',
    is_admin: false,
    is_pinned: false,
    is_archived: false,
    pending_approvals_count: 0,
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
  },
  {
    id: 'news_sentiment_analyst',
    name: 'News & Sentiment Analyst',
    role: 'Narrative Velocity & Social Sentiment',
    group_category: 'Analysts',
    shape: 'octagon',
    color: '#EC4899',
    expression: 'attentive',
    description: 'Tracks breaking news catalysts and market sentiment.',
    system_prompt: 'You are News & Sentiment Analyst on the Tauric trading desk. Gauge news momentum, catalyst impact, and narrative sentiment.',
    model: 'zed',
    is_admin: false,
    is_pinned: false,
    is_archived: false,
    pending_approvals_count: 0,
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
  },
  {
    id: 'macro_analyst',
    name: 'Macro Analyst',
    role: 'Yield Curves & Central Bank Policy',
    group_category: 'Analysts',
    shape: 'pentagon',
    color: '#6366F1',
    expression: 'attentive',
    description: 'Monitors interest rates, inflation telemetry, and global liquidity.',
    system_prompt: 'You are Macro Analyst on the Tauric trading desk. Assess macro regime shifts, interest rates, currency moves, and central bank policy.',
    model: 'zed',
    is_admin: false,
    is_pinned: false,
    is_archived: false,
    pending_approvals_count: 0,
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
  },
  {
    id: 'risk_manager',
    name: 'Risk Manager',
    role: 'Portfolio Stress-Testing & Drawdown Gatekeeper',
    group_category: 'Risk Management',
    shape: 'shield',
    color: '#F59E0B',
    expression: 'skeptical',
    description: 'Enforces hard stops, max daily drawdown, and position limits.',
    system_prompt: 'You are Risk Manager on the Tauric trading desk. Protect capital vigorously. Enforce stop losses, risk-reward ratios, and daily drawdown guardrails.',
    model: 'zed',
    is_admin: false,
    is_pinned: false,
    is_archived: false,
    pending_approvals_count: 0,
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
  },
  {
    id: 'executor',
    name: 'Executor',
    role: 'Order Execution & Smart Routing',
    group_category: 'Execution',
    shape: 'star',
    color: '#14B8A6',
    expression: 'attentive',
    description: 'Minimizes market impact and slippage across DhanHQ and NSE/BSE.',
    system_prompt: 'You are Executor on the Tauric trading desk. Optimize fill prices, calculate accurate statutory charges, and confirm order execution.',
    model: 'zed',
    is_admin: false,
    is_pinned: false,
    is_archived: false,
    pending_approvals_count: 0,
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
  },
  {
    id: 'critic',
    name: 'Critic',
    role: 'Adversarial Skeptic & Red Team',
    group_category: 'Analysts',
    shape: 'triangle',
    color: '#EF4444',
    expression: 'skeptical',
    description: 'Stress-tests assumptions to expose vulnerabilities.',
    system_prompt: 'You are Critic on the Tauric trading desk. Red-team every thesis. Find flaws, unpriced risks, and confirm confirmation bias.',
    model: 'zed',
    is_admin: false,
    is_pinned: false,
    is_archived: false,
    pending_approvals_count: 0,
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
  },
  {
    id: 'ea',
    name: 'EA',
    role: 'Executive & Workflow Automation',
    group_category: 'Management',
    shape: 'droplet',
    color: '#3B82F6',
    expression: 'attentive',
    description: 'Produces executive summaries and synchronizes watchlist briefs.',
    system_prompt: 'You are EA on the Tauric trading desk. Automate briefings, coordinate session notes, and organize desk workflows.',
    model: 'zed',
    is_admin: false,
    is_pinned: false,
    is_archived: false,
    pending_approvals_count: 0,
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
  },
];

const CANONICAL_GROUPS: StoredGroup[] = [
  {
    id: 'tauric-analysts',
    name: 'Research & Analysts',
    description: 'Technical, Fundamental, Sentiment, and Macro analysis cluster',
    agent_ids: ['technical_analyst', 'fundamentals_analyst', 'news_sentiment_analyst', 'macro_analyst'],
    is_archived: false,
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
  },
  {
    id: 'tauric-risk-gate',
    name: 'Risk & Red Team Gate',
    description: 'Risk Manager and Adversarial Critic gatekeeping trade entry',
    agent_ids: ['risk_manager', 'critic'],
    is_archived: false,
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
  },
  {
    id: 'tauric-execution',
    name: 'Capital Allocation & Execution',
    description: 'Portfolio Manager, EA, and Smart Order Router',
    agent_ids: ['portfolio_manager', 'executor', 'ea'],
    is_archived: false,
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: '2026-11-20T00:00:00.000Z',
  },
];

// In-Memory store backed by persistent JSON
class TradingDataStore {
  agents: Map<string, StoredAgent> = new Map();
  groups: Map<string, StoredGroup> = new Map();
  approvals: Map<string, StoredApproval> = new Map();
  messages: StoredMessage[] = [];
  grants: Map<string, StoredGrant> = new Map();
  sessions: Map<string, any> = new Map();
  sessionTranscripts: Map<string, any[]> = new Map();
  sessionPrompts: Map<string, any[]> = new Map();
  sessionSseStreams: Map<string, Set<any>> = new Map();
  memories: Map<string, StoredMemory> = new Map();
  skills: Map<string, StoredSkill> = new Map();
  routines: Map<string, StoredRoutine> = new Map();
  tasks: Map<string, StoredTask> = new Map();
  memoryHistory: StoredMemoryHistory[] = [];
  memoryPolicy: MemoryPolicy = { retention_days: 365, max_items: 2000, updated_at: new Date().toISOString() };

  constructor() {
    ensureDataDir();
    this.load();
  }

  load() {
    // 1. Agents
    try {
      if (fs.existsSync(AGENTS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf8'));
        if (Array.isArray(raw)) {
          raw.forEach((a) => this.agents.set(a.id, a));
        }
      }
    } catch {}
    if (this.agents.size === 0) {
      CANONICAL_AGENTS.forEach((a) => this.agents.set(a.id, { ...a }));
      this.saveAgents();
    }

    // 2. Groups
    try {
      if (fs.existsSync(GROUPS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8'));
        if (Array.isArray(raw)) {
          raw.forEach((g) => this.groups.set(g.id, g));
        }
      }
    } catch {}
    if (this.groups.size === 0) {
      CANONICAL_GROUPS.forEach((g) => this.groups.set(g.id, { ...g }));
      this.saveGroups();
    }

    // 3. Approvals
    try {
      if (fs.existsSync(APPROVALS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(APPROVALS_FILE, 'utf8'));
        if (Array.isArray(raw)) {
          raw.forEach((app) => this.approvals.set(app.id, app));
        }
      }
    } catch {}

    // 4. Messages
    try {
      if (fs.existsSync(MESSAGES_FILE)) {
        const raw = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
        if (Array.isArray(raw)) {
          this.messages = raw;
        }
      }
    } catch {}

    // 5. Grants
    try {
      if (fs.existsSync(GRANTS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(GRANTS_FILE, 'utf8'));
        if (Array.isArray(raw)) {
          raw.forEach((g) => this.grants.set(g.grant_id, g));
        }
      }
    } catch {}

    // 6. Sessions
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
        if (Array.isArray(raw)) {
          raw.forEach((s) => this.sessions.set(s.session_id, s));
        }
      }
    } catch {}

    // 7. Transcripts
    try {
      if (fs.existsSync(TRANSCRIPTS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(TRANSCRIPTS_FILE, 'utf8'));
        if (typeof raw === 'object' && raw !== null) {
          Object.entries(raw).forEach(([sid, msgs]) => {
            if (Array.isArray(msgs)) {
              this.sessionTranscripts.set(sid, msgs);
            }
          });
        }
      }
    } catch {}

    const loadMap = <T extends { id: string }>(file: string, target: Map<string, T>) => {
      try {
        if (!fs.existsSync(file)) return;
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (Array.isArray(raw)) raw.forEach((item) => item?.id && target.set(item.id, item));
      } catch {}
    };
    loadMap<StoredMemory>(MEMORY_FILE, this.memories);
    loadMap<StoredSkill>(SKILLS_FILE, this.skills);
    loadMap<StoredRoutine>(ROUTINES_FILE, this.routines);
    loadMap<StoredTask>(TASKS_FILE, this.tasks);
    try {
      if (fs.existsSync(MEMORY_HISTORY_FILE)) {
        const raw = JSON.parse(fs.readFileSync(MEMORY_HISTORY_FILE, 'utf8'));
        if (Array.isArray(raw)) this.memoryHistory = raw;
      }
      if (fs.existsSync(MEMORY_POLICY_FILE)) {
        const raw = JSON.parse(fs.readFileSync(MEMORY_POLICY_FILE, 'utf8'));
        if (raw && typeof raw === 'object') this.memoryPolicy = { ...this.memoryPolicy, ...raw };
      }
    } catch {}

    this.recomputeApprovalCounts();
  }

  saveAgents() {
    try {
      fs.writeFileSync(AGENTS_FILE, JSON.stringify(Array.from(this.agents.values()), null, 2));
    } catch {}
  }

  saveGroups() {
    try {
      fs.writeFileSync(GROUPS_FILE, JSON.stringify(Array.from(this.groups.values()), null, 2));
    } catch {}
  }

  saveApprovals() {
    try {
      fs.writeFileSync(APPROVALS_FILE, JSON.stringify(Array.from(this.approvals.values()), null, 2));
    } catch {}
  }

  saveMessages() {
    try {
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(this.messages.slice(-500), null, 2));
    } catch {}
  }

  saveGrants() {
    try {
      fs.writeFileSync(GRANTS_FILE, JSON.stringify(Array.from(this.grants.values()), null, 2));
    } catch {}
  }

  saveSessions() {
    try {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(Array.from(this.sessions.values()), null, 2));
    } catch {}
  }

  saveTranscripts() {
    try {
      const obj: Record<string, any[]> = {};
      for (const [k, v] of this.sessionTranscripts.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(TRANSCRIPTS_FILE, JSON.stringify(obj, null, 2));
    } catch {}
  }

  saveMemories() { try { fs.writeFileSync(MEMORY_FILE, JSON.stringify(Array.from(this.memories.values()), null, 2)); } catch {} }
  saveSkills() { try { fs.writeFileSync(SKILLS_FILE, JSON.stringify(Array.from(this.skills.values()), null, 2)); } catch {} }
  saveRoutines() { try { fs.writeFileSync(ROUTINES_FILE, JSON.stringify(Array.from(this.routines.values()), null, 2)); } catch {} }
  saveTasks() { try { fs.writeFileSync(TASKS_FILE, JSON.stringify(Array.from(this.tasks.values()).slice(-500), null, 2)); } catch {} }
  saveMemoryHistory() { try { fs.writeFileSync(MEMORY_HISTORY_FILE, JSON.stringify(this.memoryHistory.slice(-5000), null, 2)); } catch {} }
  saveMemoryPolicy() { try { fs.writeFileSync(MEMORY_POLICY_FILE, JSON.stringify(this.memoryPolicy, null, 2)); } catch {} }

  recomputeApprovalCounts() {
    const counts = new Map<string, number>();
    for (const app of this.approvals.values()) {
      if (app.status === 'pending') {
        counts.set(app.agent_id, (counts.get(app.agent_id) || 0) + 1);
      }
    }
    for (const [id, agent] of this.agents) {
      agent.pending_approvals_count = counts.get(id) || 0;
    }
  }
}

export const store = new TradingDataStore();

function resolveStoredAgent(value: unknown, fallback: StoredAgent = CANONICAL_AGENTS[0]): StoredAgent {
  const wanted = String(value || '').trim().toLowerCase();
  if (!wanted) return fallback;
  return Array.from(store.agents.values()).find((agent) => agent.id.toLowerCase() === wanted || agent.name.toLowerCase() === wanted) || fallback;
}

/** Shared BOPS-style capability context. Every agent gets its own memory and
 * skills, including agents created later or placed into a group. */
function agentCapabilityContext(agentId: string): string {
  const memories = Array.from(store.memories.values())
    .filter((memory) => memory.scope === 'workspace' || memory.agent_id === agentId)
    .slice(-20)
    .map((memory) => `- ${memory.key}: ${memory.value}`)
    .join('\n');
  const skills = Array.from(store.skills.values())
    .filter((skill) => skill.enabled && skill.agent_id === agentId)
    .slice(-20)
    .map((skill) => `- ${skill.name}: ${skill.description || skill.steps.join('; ')}`)
    .join('\n');
  if (!memories && !skills) return '';
  return `\n\nTEAMMATE CAPABILITIES (persistent, non-secret):\n${memories ? `Memory:\n${memories}\n` : ''}${skills ? `Saved skills:\n${skills}\n` : ''}Use these only as working context. Never claim a skill ran unless it actually ran, and never invent trading data.`;
}

const followUpLastRun = new Map<string, number>();
const dashboardRevisionSeenBySession = new Map<string, number>();
const PROACTIVE_WELCOME_DELAY_MS = 15_000;
const PROACTIVE_SECOND_NOTE_DELAY_MS = 120_000;

function broadcastSessionEvent(sessionId: string, eventData: any): void {
  const streams = store.sessionSseStreams.get(sessionId);
  if (!streams?.size) return;
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const clientRes of streams) {
    try { clientRes.write(payload); } catch { streams.delete(clientRes); }
  }
}

function appendProactiveMessage(sessionId: string, agent: StoredAgent, text: string): void {
  const timestamp = Date.now();
  const messageId = `msg_proactive_${timestamp}_${Math.random().toString(36).slice(2, 7)}`;
  const transcript = store.sessionTranscripts.get(sessionId) || [];
  const storedMessage = {
    info: { id: messageId, sessionID: sessionId, role: 'assistant', agent: agent.id, proactive: true, time: { created: timestamp, completed: timestamp } },
    parts: [{ id: `part_${messageId}`, sessionID: sessionId, messageID: messageId, type: 'text', text }],
    role: 'assistant', created: new Date(timestamp).toISOString(), completed: new Date(timestamp).toISOString(),
    text, tools: [], files: [], reasoning_omitted: false, error: null,
  };
  transcript.push(storedMessage);
  store.sessionTranscripts.set(sessionId, transcript);
  store.saveTranscripts();
  broadcastSessionEvent(sessionId, {
    channel: 'runtime', seq: transcript.length, epoch: 'ep1', type: 'log.message',
    payload: { rev: timestamp, message: {
      schema: 'kortix.session/2', v: 1, message_id: messageId, thread_id: 'thread-main', seq: transcript.length - 1,
      role: 'assistant', agent: agent.id, kind: 'proactive', status: 'complete', in_context: true, model: null, usage: null,
      finish: 'stop', error: null, created_at: new Date(timestamp).toISOString(), completed_at: new Date(timestamp).toISOString(),
      producer: { harness: 'kortix', harness_version: '2.0.0', adapter_version: '2.0.0' }, blocks: [{ id: `blk_${messageId}_0`, type: 'text', text }],
    } },
  });
}

/** Server-side proactive loop. It only sends an onboarding note and a teammate
 * introduction; later messages require a real task, routine, or data event. */
export async function runProactiveScheduler(
  dispatchLlmCall: (modelId: string, messages: { role: string; content: string }[]) => Promise<{ ok: boolean; content: string; error?: string }>,
): Promise<void> {
  const now = Date.now();
  const cutoff = now - store.memoryPolicy.retention_days * 86_400_000;
  let memoryChanged = false;
  for (const memory of Array.from(store.memories.values())) {
    if (Date.parse(memory.updated_at) < cutoff) {
      store.memories.delete(memory.id);
      store.memoryHistory.push({ id: `memory_event_${Date.now()}_${memory.id}`, memory_id: memory.id, action: 'expired', at: new Date().toISOString() });
      memoryChanged = true;
    }
  }
  if (store.memories.size > store.memoryPolicy.max_items) {
    const oldest = Array.from(store.memories.values()).sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at));
    for (const memory of oldest.slice(0, store.memories.size - store.memoryPolicy.max_items)) {
      store.memories.delete(memory.id);
      store.memoryHistory.push({ id: `memory_event_${Date.now()}_${memory.id}`, memory_id: memory.id, action: 'expired', at: new Date().toISOString() });
      memoryChanged = true;
    }
  }
  if (memoryChanged) { store.saveMemories(); store.saveMemoryHistory(); }
  const activeSessions = Array.from(store.sessionSseStreams.entries()).filter(([, streams]) => streams.size > 0);
  for (const [sessionId] of activeSessions) {
    const session = store.sessions.get(sessionId);
    const agent = store.agents.get(session?.agent_name || 'portfolio_manager') || CANONICAL_AGENTS[0];
    const transcript = store.sessionTranscripts.get(sessionId) || [];
    const proactive = transcript.filter((message: any) => message?.info?.proactive === true);
    const dashboardRevisionSeen = dashboardRevisionSeenBySession.get(sessionId) || 0;
    if (latestTradingContext && latestTradingContextRevision > dashboardRevisionSeen) {
      dashboardRevisionSeenBySession.set(sessionId, latestTradingContextRevision);
      const reviewGroup = Array.from(store.groups.values()).find((group) => group.agent_ids.includes(agent.id)) || Array.from(store.groups.values())[0];
      const reviewer = reviewGroup
        ? reviewGroup.agent_ids.map((id) => store.agents.get(id)).find((candidate): candidate is StoredAgent => Boolean(candidate))
        : agent;
      const proactiveReviewer = reviewer || agent;
      const result = await dispatchLlmCall(proactiveReviewer.model !== 'zed' ? proactiveReviewer.model : 'auto', [
        { role: 'system', content: `${proactiveReviewer.system_prompt || `You are ${proactiveReviewer.name}.`} A new read-only dashboard snapshot arrived. Report only a specific, verified item that needs attention. If nothing needs attention, reply exactly NO_UPDATE. Never invent values or claim an order was placed.` },
        { role: 'user', content: JSON.stringify(latestTradingContext).slice(0, 120_000) },
      ]);
      if (result.ok && result.content?.trim() && result.content.trim() !== 'NO_UPDATE') {
        appendProactiveMessage(sessionId, proactiveReviewer, result.content.trim());
      }
    }
    const sessionStartedAt = Date.parse(session?.created_at || '') || now;
    if (proactive.length === 0 && now - sessionStartedAt >= PROACTIVE_WELCOME_DELAY_MS) {
      appendProactiveMessage(
        sessionId,
        agent,
        `${agent.name} is active in this chat. I will message you only for a real task update, scheduled routine, Dhan-data change, or item needing your approval.`,
      );
      continue;
    }
    const lastProactiveAt = proactive.length ? Date.parse(proactive[proactive.length - 1]?.created || '') : now;
    if (proactive.length === 1 && now - lastProactiveAt >= PROACTIVE_SECOND_NOTE_DELAY_MS) {
      const reviewGroup = Array.from(store.groups.values()).find((group) => group.agent_ids.includes(agent.id)) || Array.from(store.groups.values())[0];
      const teammate = reviewGroup
        ? reviewGroup.agent_ids.map((id) => store.agents.get(id)).find((candidate) => candidate && candidate.id !== agent.id)
        : undefined;
      if (teammate) {
        appendProactiveMessage(sessionId, teammate, `${teammate.name} joined the watch. I will report only a verified technical or execution item, not periodic “all clear” messages.`);
      }
    }
  }

  const dueRoutines = Array.from(store.routines.values()).filter((routine) => routine.enabled && Date.parse(routine.next_run_at) <= now).slice(0, 10);
  for (const routine of dueRoutines) {
    const agent = store.agents.get(routine.agent_id) || CANONICAL_AGENTS[0];
    const result = await dispatchLlmCall(agent.model !== 'zed' ? agent.model : 'auto', [
      { role: 'system', content: `${agent.system_prompt || `You are ${agent.name}, ${agent.role}.`}${agentCapabilityContext(agent.id)}\nRun this scheduled routine and report the result. No external writes or trades without approval.` },
      { role: 'user', content: routine.instruction },
    ]);
    // The routine may have been deleted while its model call was in flight.
    // Never recreate deleted work from an old scheduler snapshot.
    if (!store.routines.has(routine.id)) continue;
    routine.last_run_at = new Date().toISOString();
    routine.next_run_at = new Date(now + routine.interval_ms).toISOString();
    routine.updated_at = routine.last_run_at;
    store.routines.set(routine.id, routine);
    const target = activeSessions.find(([sid]) => store.sessions.get(sid)?.agent_name === agent.id)?.[0];
    if (target && result.ok && result.content?.trim()) appendProactiveMessage(target, agent, `[Routine: ${routine.name}]\n${result.content.trim()}`);
  }
  if (dueRoutines.length) store.saveRoutines();

  // Follow up on work that is still open. A reminder is delivered at most once
  // per five minutes per task, so the desk is proactive without becoming noisy.
  for (const task of store.tasks.values()) {
    if (!['queued', 'running'].includes(task.status)) continue;
    const age = now - Date.parse(task.updated_at || task.created_at);
    if (age < 5 * 60_000 || now - (followUpLastRun.get(task.id) || 0) < 5 * 60_000) continue;
    const target = activeSessions.find(([sid]) => store.sessions.get(sid)?.agent_name === task.from_agent)?.[0];
    if (!target) continue;
    followUpLastRun.set(task.id, now);
    const agent = store.agents.get(task.from_agent) || CANONICAL_AGENTS[0];
    appendProactiveMessage(target, agent, `[Follow-up] Task ${task.id} is still ${task.status}: ${task.instruction}. I’m checking with ${task.to_agent} and will report back when it completes.`);
  }
}

// ── HTTP Request Handler ────────────────────────────────────────────────────

export async function handleTradingRequest(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  parsedUrl: UrlWithParsedQuery,
  rawBody: string,
  dispatchLlmCall: (
    modelId: string,
    messages: { role: string; content: string }[],
    apiKey?: string,
    maxTokens?: number,
    temperature?: number
  ) => Promise<{ ok: boolean; content: string; provider: string; model: string; latencyMs: number; error?: string }>
): Promise<boolean> {
  const method = req.method || 'GET';

  // Helper JSON responses
  const sendJson = (status: number, data: unknown) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end(JSON.stringify(data));
  };

  const parseBody = () => {
    try {
      return JSON.parse(rawBody || '{}');
    } catch {
      return {};
    }
  };

  // 1. Projects Detail & Cans Bridge (Fixes Connectors, Drive, Customize, Scope hanging)
  if ((pathname.match(/^\/(?:v1\/)?projects\/[^/]+(?:\/detail)?$/) || pathname.match(/^\/v1\/projects\/[^/]+$/)) && method === 'GET') {
    const parts = pathname.replace(/^\/v1/, '').split('/').filter(Boolean);
    const rawId = parts[1] || 'b0000000-0000-0000-0000-000000000001';
    const projectId = (rawId === 'trading' || rawId === 'trading-desk' || rawId === 'desk') ? 'b0000000-0000-0000-0000-000000000001' : rawId;
    const projectObj = {
      id: projectId,
      name: 'Trading Desk',
      slug: 'trading-desk',
      icon: null,
      icon_glyph: null,
      account_id: 'acc-trading',
      created_at: '2026-11-20T00:00:00.000Z',
      updated_at: new Date().toISOString(),
    };
    sendJson(200, {
      ...projectObj,
      project: projectObj,
      config: {
        default_agent: 'portfolio_manager',
        open_code_default_agent: 'portfolio_manager',
        skills: [],
        commands: [],
        agents: Array.from(store.agents.values()).map((a) => ({
          name: a.id,
          role: a.role,
          scope: { env: [], connectors: [] },
        })),
      },
      role: 'admin',
    });
    return true;
  }

  // 1.1 Project Config
  if (pathname.match(/^\/(?:v1\/)?projects\/[^/]+\/config$/) && method === 'GET') {
    sendJson(200, {
      default_agent: 'portfolio_manager',
      open_code_default_agent: 'portfolio_manager',
      skills: [],
      commands: [],
      agents: Array.from(store.agents.values()).map((a) => ({
        name: a.id,
        role: a.role,
        scope: { env: [], connectors: [] },
      })),
    });
    return true;
  }

  if ((pathname.match(/^\/v1\/projects\/[^/]+\/cans$/) || pathname === '/v1/cans') && (method === 'GET' || method === 'POST')) {
    sendJson(200, {
      allowed: true,
      cans: {
        project_settings_write: { allowed: true },
        project_members_write: { allowed: true },
        project_connectors_write: { allowed: true },
        project_files_write: { allowed: true },
        project_drives_write: { allowed: true },
        project_agents_write: { allowed: true },
      },
    });
    return true;
  }

  if (pathname.match(/^\/v1\/projects\/[^/]+\/feature-flags$/) || pathname === '/v1/feature-flags') {
    sendJson(200, {
      flags: {
        drives: true,
        reminders: true,
        loops: true,
        connectors: true,
        custom_agents: true,
      },
    });
    return true;
  }

  // 1.15 Apps list
  if (pathname.match(/^\/(?:v1\/)?projects\/[^/]+\/apps$/) && method === 'GET') {
    sendJson(200, { apps: [] });
    return true;
  }

  // 1.16 IAM Effective Permissions
  if (pathname.match(/^\/(?:v1\/)?accounts\/[^/]+\/iam\/members\/[^/]+\/effective$/) && method === 'GET') {
    const action = parsedUrl.query.action as string || 'project.read';
    sendJson(200, { allowed: true, reason: null, action });
    return true;
  }

  if (pathname.match(/^\/(?:v1\/)?accounts\/[^/]+\/iam\/members\/[^/]+\/effective:batch$/) && method === 'POST') {
    const body = parseBody();
    const probes = (body.probes || []) as Array<{ action: string; resourceType?: string; resourceId?: string }>;
    const results = probes.map((p) => ({
      action: p.action,
      resource_type: p.resourceType || 'project',
      resource_id: p.resourceId || null,
      allowed: true,
      reason: null,
    }));
    sendJson(200, { results });
    return true;
  }

  // 1.17 Billing account state
  if ((pathname === '/v1/billing/account-state' || pathname === '/v1/billing/account-state/minimal') && method === 'GET') {
    sendJson(200, {
      can_manage_billing: true,
      subscription: {
        can_purchase_credits: true,
        tier: 'enterprise',
      },
      credits: {
        balance: 1000000,
      },
    });
    return true;
  }

  // 1.2 Connectors API (/connectors/projects/:id/connectors)
  if (pathname.match(/^\/(?:v1\/)?connectors\/projects\/[^/]+\/connectors\/?$/) && method === 'GET') {
    const isConnected = Boolean(process.env.DHAN_ACCESS_TOKEN);
    const clientId = process.env.DHAN_CLIENT_ID || '1114824544';
    if (!isConnected) {
      sendJson(200, { connectors: [] });
      return true;
    }
    sendJson(200, {
      connectors: [
        {
          slug: 'dhan',
          name: 'Dhan',
          provider: 'composio',
          iconUrl: '/logos/dhan.svg',
          status: 'active',
          state: 'connected',
          credentialMode: 'shared',
          authorizationStrategy: 'project',
          sensitive: true,
          secretSet: true,
          actions: [
            { name: 'fundlimit', description: 'Real-time Cash balance & Collateral Limit' },
            { name: 'positions', description: 'Open Positions, Quantities & Unrealized PnL' },
            { name: 'orders', description: 'Place, Modify & Cancel NSE/BSE Orders' },
            { name: 'trades', description: 'Execution Book & Statutory Charges Ledger' },
            { name: 'profile', description: 'User Profile & Market Segment Status' },
          ],
          authSecret: null,
          secretIdentifier: 'dhan_access_token',
          credentialSource: 'stored',
        },
      ],
    });
    return true;
  }

  if (pathname.match(/^\/(?:v1\/)?connectors\/projects\/[^/]+\/connectors\/([^/]+)\/?$/) && method === 'DELETE') {
    delete process.env.DHAN_ACCESS_TOKEN;
    sendJson(200, { ok: true });
    return true;
  }

  if (pathname.match(/^\/(?:v1\/)?projects\/[^/]+\/connections\/[^/]+\/revoke\/?$/) && (method === 'PUT' || method === 'POST')) {
    delete process.env.DHAN_ACCESS_TOKEN;
    sendJson(200, { ok: true });
    return true;
  }

  if (pathname.match(/^\/(?:v1\/)?projects\/[^/]+\/connections(?:\/all)?\/?$/) && method === 'GET') {
    const isConnected = Boolean(process.env.DHAN_ACCESS_TOKEN);
    sendJson(200, {
      connections: isConnected
        ? [{ connection_id: 'dhan-conn-1', connector_id: 'dhan', slug: 'dhan', label: 'Dhan', status: 'active', owner_type: 'project', owner_id: null, is_default: true }]
        : [],
    });
    return true;
  }

  if (pathname.match(/^\/(?:v1\/)?projects\/[^/]+\/connections(?:\/me)?\/?$/) && method === 'POST') {
    sendJson(200, {
      connection_id: 'dhan-conn-1',
      connector_id: 'dhan',
      slug: 'dhan',
      label: 'Dhan',
      status: 'needs_auth',
      owner_type: pathname.endsWith('/me') ? 'member' : 'project',
      owner_id: pathname.endsWith('/me') ? 'usr_local_trader' : null,
      is_default: true,
    });
    return true;
  }

  if (
    (pathname.match(/^\/(?:v1\/)?projects\/[^/]+\/connections\/[^/]+\/connect\/?$/) ||
      pathname.match(/^\/(?:v1\/)?connectors\/projects\/[^/]+\/connectors\/[^/]+\/connect\/?$/)) &&
    method === 'POST'
  ) {
    const returnTo = encodeURIComponent('/projects/trading/admin/connectors/dhan/dhan');
    sendJson(200, {
      connectUrl: `/api/dhan/auth/start?returnTo=${returnTo}`,
      connectionId: 'dhan-conn-1',
      connected: false,
    });
    return true;
  }

  if (
    (pathname.match(/^\/(?:v1\/)?projects\/[^/]+\/connections\/[^/]+\/finalize\/?$/) ||
      pathname.match(/^\/(?:v1\/)?connectors\/projects\/[^/]+\/connectors\/[^/]+\/connect\/finalize\/?$/)) &&
    method === 'POST'
  ) {
    const isConnected = Boolean(process.env.DHAN_ACCESS_TOKEN);
    sendJson(200, {
      connected: isConnected,
      status: isConnected ? 'active' : 'pending',
      connectionId: 'dhan-conn-1',
    });
    return true;
  }

  if (pathname.match(/^\/(?:v1\/)?connectors\/projects\/[^/]+\/discover\/install\/?$/) && method === 'POST') {
    const returnTo = encodeURIComponent('/projects/trading/admin/connectors/dhan/dhan');
    sendJson(200, {
      ok: true,
      connector: { slug: 'dhan', name: 'Dhan', status: 'needs_auth' },
      connectUrl: `/api/dhan/auth/start?returnTo=${returnTo}`,
      sync: { status: 'synced', errors: [] },
    });
    return true;
  }

  if (pathname.match(/^\/(?:v1\/)?connectors\/projects\/[^/]+\/connectors\/dhan\/?$/) && method === 'GET') {
    const isConnected = Boolean(process.env.DHAN_ACCESS_TOKEN);
    const clientId = process.env.DHAN_CLIENT_ID || '1114824544';
    sendJson(200, {
      connector: {
        slug: 'dhan',
        name: 'Dhan',
        provider: 'composio',
        iconUrl: '/logos/dhan.svg',
        status: isConnected ? 'active' : 'needs_auth',
        state: isConnected ? 'connected' : 'needs_account',
        credentialMode: 'shared',
        authorizationStrategy: 'project',
        sensitive: true,
        secretSet: isConnected,
        actions: [
          { name: 'fundlimit', description: 'Real-time Cash balance & Collateral Limit' },
          { name: 'positions', description: 'Open Positions, Quantities & Unrealized PnL' },
          { name: 'orders', description: 'Place, Modify & Cancel NSE/BSE Orders' },
          { name: 'trades', description: 'Execution Book & Statutory Charges Ledger' },
          { name: 'profile', description: 'User Profile & Market Segment Status' },
        ],
        authSecret: null,
        secretIdentifier: 'dhan_access_token',
        credentialSource: isConnected ? 'stored' : 'none',
      },
    });
    return true;
  }

  if (pathname.match(/^\/(?:v1\/)?connectors\/projects\/[^/]+\/discover\/connectors(?:\/dhan)?\/?$/) && method === 'GET') {
    const dhanItem = {
      id: 'dhan',
      kind: 'composio',
      slug: 'dhan',
      name: 'Dhan',
      description: 'Indian Stock Broker for NSE & BSE live trading, order execution and portfolio audit.',
      url: 'https://dhan.co',
      icon: '/logos/dhan.svg',
      domain: 'dhan.co',
      categories: ['Trading', 'Finance'],
      feeds: ['popular'],
      popularity: 1,
      oneClick: true,
    };

    if (pathname.endsWith('/dhan') || pathname.endsWith('/dhan/')) {
      sendJson(200, { item: dhanItem, variants: [], installed: [] });
      return true;
    }

    const items = [
      dhanItem,
      {
        id: 'gmail',
        kind: 'composio',
        slug: 'gmail',
        name: 'Gmail',
        description: 'Read, draft, and send emails.',
        url: 'https://mail.google.com',
        icon: '/connector-icons/gmail.svg',
        domain: 'gmail.com',
        categories: ['Productivity'],
        feeds: ['popular'],
        popularity: 2,
        oneClick: true,
      },
      {
        id: 'googlecalendar',
        kind: 'composio',
        slug: 'googlecalendar',
        name: 'Google Calendar',
        description: 'Schedule events and meetings.',
        url: 'https://calendar.google.com',
        icon: '/connector-icons/googlecalendar.svg',
        domain: 'calendar.google.com',
        categories: ['Productivity'],
        feeds: ['popular'],
        popularity: 3,
        oneClick: true,
      },
      {
        id: 'slack',
        kind: 'composio',
        slug: 'slack',
        name: 'Slack',
        description: 'Channels and direct messages.',
        url: 'https://slack.com',
        icon: '/connector-icons/slack.svg',
        domain: 'slack.com',
        categories: ['Communication'],
        feeds: ['popular'],
        popularity: 4,
        oneClick: true,
      },
      {
        id: 'github_mcp',
        kind: 'mcp',
        slug: 'github_mcp',
        name: 'GitHub MCP',
        description: 'Repository management, issues, PRs.',
        url: 'https://github.com',
        icon: '/connector-icons/github.svg',
        domain: 'github.com',
        categories: ['Development'],
        feeds: ['popular'],
        popularity: 5,
        oneClick: true,
      },
      {
        id: 'notion_mcp',
        kind: 'mcp',
        slug: 'notion_mcp',
        name: 'Notion MCP',
        description: 'Pages, databases and documents.',
        url: 'https://notion.so',
        icon: '/connector-icons/notion.svg',
        domain: 'notion.so',
        categories: ['Productivity'],
        feeds: ['popular'],
        popularity: 6,
        oneClick: true,
      },
      {
        id: 'linear_mcp',
        kind: 'mcp',
        slug: 'linear_mcp',
        name: 'Linear MCP',
        description: 'Issue tracking and sprint planning.',
        url: 'https://linear.app',
        icon: '/connector-icons/linear.svg',
        domain: 'linear.app',
        categories: ['Development'],
        feeds: ['popular'],
        popularity: 7,
        oneClick: true,
      },
      {
        id: 'googledrive',
        kind: 'composio',
        slug: 'googledrive',
        name: 'Google Drive',
        description: 'Cloud files, folders and storage.',
        url: 'https://drive.google.com',
        icon: '/connector-icons/googledrive.svg',
        domain: 'drive.google.com',
        categories: ['Productivity'],
        feeds: ['popular'],
        popularity: 8,
        oneClick: true,
      },
      {
        id: 'stripe_mcp',
        kind: 'mcp',
        slug: 'stripe_mcp',
        name: 'Stripe MCP',
        description: 'Billing, payments and invoices.',
        url: 'https://stripe.com',
        icon: '/connector-icons/stripe.svg',
        domain: 'stripe.com',
        categories: ['Finance'],
        feeds: ['popular'],
        popularity: 9,
        oneClick: true,
      },
      {
        id: 'hubspot',
        kind: 'composio',
        slug: 'hubspot',
        name: 'HubSpot',
        description: 'CRM contacts, deals and marketing.',
        url: 'https://hubspot.com',
        icon: '/connector-icons/hubspot.svg',
        domain: 'hubspot.com',
        categories: ['Marketing'],
        feeds: ['popular'],
        popularity: 10,
        oneClick: true,
      },
    ];

    sendJson(200, {
      items,
      total: items.length,
      hasMore: false,
      nextCursor: null,
    });
    return true;
  }

  if (pathname.match(/^\/(?:v1\/)?connectors\/projects\/[^/]+\/discover\/sections\/?$/) && method === 'GET') {
    const popularItems = [
      {
        id: 'dhan',
        kind: 'composio',
        slug: 'dhan',
        name: 'Dhan',
        description: 'Indian Stock Broker for NSE & BSE live trading, order execution and portfolio audit.',
        url: 'https://dhan.co',
        icon: '/logos/dhan.svg',
        domain: 'dhan.co',
        categories: ['Trading', 'Finance'],
        feeds: ['popular'],
        popularity: 1,
        oneClick: true,
      },
      {
        id: 'gmail',
        kind: 'composio',
        slug: 'gmail',
        name: 'Gmail',
        description: 'Read, draft, and send emails.',
        url: 'https://mail.google.com',
        icon: '/connector-icons/gmail.svg',
        domain: 'gmail.com',
        categories: ['Productivity'],
        feeds: ['popular'],
        popularity: 2,
        oneClick: true,
      },
      {
        id: 'googlecalendar',
        kind: 'composio',
        slug: 'googlecalendar',
        name: 'Google Calendar',
        description: 'Schedule events and meetings.',
        url: 'https://calendar.google.com',
        icon: '/connector-icons/googlecalendar.svg',
        domain: 'calendar.google.com',
        categories: ['Productivity'],
        feeds: ['popular'],
        popularity: 3,
        oneClick: true,
      },
      {
        id: 'slack',
        kind: 'composio',
        slug: 'slack',
        name: 'Slack',
        description: 'Channels and direct messages.',
        url: 'https://slack.com',
        icon: '/connector-icons/slack.svg',
        domain: 'slack.com',
        categories: ['Communication'],
        feeds: ['popular'],
        popularity: 4,
        oneClick: true,
      },
      {
        id: 'github_mcp',
        kind: 'mcp',
        slug: 'github_mcp',
        name: 'GitHub MCP',
        description: 'Repository management, issues, PRs.',
        url: 'https://github.com',
        icon: '/connector-icons/github.svg',
        domain: 'github.com',
        categories: ['Development'],
        feeds: ['popular'],
        popularity: 5,
        oneClick: true,
      },
      {
        id: 'notion_mcp',
        kind: 'mcp',
        slug: 'notion_mcp',
        name: 'Notion MCP',
        description: 'Pages, databases and documents.',
        url: 'https://notion.so',
        icon: '/connector-icons/notion.svg',
        domain: 'notion.so',
        categories: ['Productivity'],
        feeds: ['popular'],
        popularity: 6,
        oneClick: true,
      },
      {
        id: 'linear_mcp',
        kind: 'mcp',
        slug: 'linear_mcp',
        name: 'Linear MCP',
        description: 'Issue tracking and sprint planning.',
        url: 'https://linear.app',
        icon: '/connector-icons/linear.svg',
        domain: 'linear.app',
        categories: ['Development'],
        feeds: ['popular'],
        popularity: 7,
        oneClick: true,
      },
      {
        id: 'googledrive',
        kind: 'composio',
        slug: 'googledrive',
        name: 'Google Drive',
        description: 'Cloud files, folders and storage.',
        url: 'https://drive.google.com',
        icon: '/connector-icons/googledrive.svg',
        domain: 'drive.google.com',
        categories: ['Productivity'],
        feeds: ['popular'],
        popularity: 8,
        oneClick: true,
      },
      {
        id: 'stripe_mcp',
        kind: 'mcp',
        slug: 'stripe_mcp',
        name: 'Stripe MCP',
        description: 'Billing, payments and invoices.',
        url: 'https://stripe.com',
        icon: '/connector-icons/stripe.svg',
        domain: 'stripe.com',
        categories: ['Finance'],
        feeds: ['popular'],
        popularity: 9,
        oneClick: true,
      },
      {
        id: 'hubspot',
        kind: 'composio',
        slug: 'hubspot',
        name: 'HubSpot',
        description: 'CRM contacts, deals and marketing.',
        url: 'https://hubspot.com',
        icon: '/connector-icons/hubspot.svg',
        domain: 'hubspot.com',
        categories: ['Marketing'],
        feeds: ['popular'],
        popularity: 10,
        oneClick: true,
      },
    ];

    sendJson(200, {
      popular: popularItems,
      sections: [
        {
          key: 'popular',
          label: 'Popular',
          total: popularItems.length,
          items: popularItems,
        },
        {
          key: 'trading',
          label: 'Trading & Finance',
          total: 2,
          items: [popularItems[0], popularItems[8]],
        },
      ],
      categories: [
        { key: 'popular', label: 'Popular', count: popularItems.length },
        { key: 'trading', label: 'Trading & Finance', count: 2 },
      ],
    });
    return true;
  }

  if (pathname.match(/^\/(?:v1\/)?connectors\/projects\/[^/]+\/connectors\/dhan\/accounts\/?$/) && method === 'GET') {
    const isConnected = Boolean(process.env.DHAN_ACCESS_TOKEN);
    const clientId = process.env.DHAN_CLIENT_ID || '1114824544';
    sendJson(200, {
      accounts: isConnected
        ? [
            {
              id: 'dhan_primary_account',
              name: `DhanHQ Trading (${clientId})`,
              owner_type: 'project',
              status: 'active',
              metadata: {
                clientId,
                broker: 'DhanHQ',
                segments: ['NSE_EQ', 'NSE_FNO', 'BSE_EQ'],
              },
            },
          ]
        : [],
    });
    return true;
  }

  if (pathname.match(/^\/(?:v1\/)?connectors\/projects\/[^/]+\/connectors\/sync\/?$/) && method === 'POST') {
    sendJson(200, { ok: true, synced: ['dhan'] });
    return true;
  }

  if (pathname.match(/^\/(?:v1\/)?connectors\/projects\/[^/]+\/catalog\/?$/) && method === 'GET') {
    sendJson(200, {
      entries: [
        {
          slug: 'dhan',
          name: 'DhanHQ',
          category: 'Trading',
          description: 'Official DhanHQ Live Broker Integration for NSE/BSE Trading, Portfolio & Real-time Orders.',
          provider: 'http',
          source: 'local',
        },
      ],
      total: 1,
    });
    return true;
  }

  // 2. Agents API (/v1/trading/agents)
  if (pathname === '/v1/trading/agents') {
    if (method === 'GET') {
      const activeAgents = Array.from(store.agents.values()).filter((a) => !a.is_archived);
      sendJson(200, { agents: activeAgents });
      return true;
    }

    if (method === 'POST') {
      const body = parseBody();
      const id = (body.id || `agent_${Date.now()}`).trim();
      const name = (body.name || 'Custom Agent').trim();
      const role = (body.role || 'Trading Specialist').trim();
      const isAdmin = Boolean(body.is_admin || body.isAdmin);
      const isPinned = Boolean(body.is_pinned || body.isPinned);

      if (isAdmin) {
        for (const a of store.agents.values()) {
          a.is_admin = false;
        }
      }

      const newAgent: StoredAgent = {
        id,
        name,
        role,
        group_category: body.group || body.group_category || 'Analysts',
        shape: body.shape || 'circle',
        color: body.color || '#7C5CFF',
        expression: body.expression || 'attentive',
        description: body.description || '',
        system_prompt: body.system_prompt || `You are ${name}, a ${role} on the Tauric trading desk.`,
        model: body.model || 'zed',
        is_admin: isAdmin,
        is_pinned: isPinned,
        is_archived: false,
        pending_approvals_count: 0,
        ...(body.lead_agent_id ? { lead_agent_id: body.lead_agent_id } : {}),
        can_delegate: body.can_delegate !== false,
        can_receive_tasks: body.can_receive_tasks !== false,
        allow_sideways: body.allow_sideways !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      store.agents.set(id, newAgent);
      store.saveAgents();

      sendJson(201, { created: true, agent: newAgent });
      return true;
    }
  }

  // 3. Agent by ID (/v1/trading/agents/:id)
  if (pathname.startsWith('/v1/trading/agents/')) {
    const agentId = pathname.split('/')[4];
    const agent = store.agents.get(agentId);

    if (!agent) {
      sendJson(404, { error: `Agent not found: ${agentId}` });
      return true;
    }

    if (method === 'GET') {
      sendJson(200, { agent });
      return true;
    }

    if (method === 'PATCH') {
      const body = parseBody();
      if (body.name) agent.name = body.name.trim();
      if (body.role) agent.role = body.role.trim();
      if (body.shape) agent.shape = body.shape.trim();
      if (body.color) agent.color = body.color.trim();
      if (body.expression) agent.expression = body.expression.trim();
      if (body.description !== undefined) agent.description = body.description;
      if (body.system_prompt !== undefined) agent.system_prompt = body.system_prompt;
      if (body.model) agent.model = body.model;
      if (body.lead_agent_id !== undefined) agent.lead_agent_id = body.lead_agent_id || undefined;
      if (body.can_delegate !== undefined) agent.can_delegate = Boolean(body.can_delegate);
      if (body.can_receive_tasks !== undefined) agent.can_receive_tasks = Boolean(body.can_receive_tasks);
      if (body.allow_sideways !== undefined) agent.allow_sideways = Boolean(body.allow_sideways);

      if (body.isAdmin !== undefined || body.is_admin !== undefined) {
        const wantsAdmin = Boolean(body.isAdmin || body.is_admin);
        if (wantsAdmin) {
          for (const [otherId, other] of store.agents) {
            if (otherId !== agentId) other.is_admin = false;
          }
          agent.is_admin = true;
        } else {
          agent.is_admin = false;
        }
      }

      if (body.isPinned !== undefined || body.is_pinned !== undefined) {
        agent.is_pinned = Boolean(body.isPinned || body.is_pinned);
      }

      if (body.isArchived !== undefined || body.is_archived !== undefined) {
        agent.is_archived = Boolean(body.isArchived || body.is_archived);
      }

      agent.updated_at = new Date().toISOString();
      store.saveAgents();

      sendJson(200, { updated: true, agent });
      return true;
    }

    if (method === 'DELETE') {
      agent.is_archived = true;
      agent.updated_at = new Date().toISOString();
      store.saveAgents();
      sendJson(200, { deleted: true, id: agentId });
      return true;
    }
  }

  // 4. Groups API (/v1/trading/groups and /v1/trading/agent-groups)
  if (pathname === '/v1/trading/groups' || pathname === '/v1/trading/agent-groups') {
    if (method === 'GET') {
      const activeGroups = Array.from(store.groups.values()).filter((g) => !g.is_archived);
      sendJson(200, { groups: activeGroups });
      return true;
    }

    if (method === 'POST') {
      const body = parseBody();
      const id = (body.id || `group_${Date.now()}`).trim();
      const name = (body.name || 'New Group').trim();
      const description = body.description || '';
      const agent_ids = Array.isArray(body.agent_ids || body.agentIds) ? (body.agent_ids || body.agentIds) : [];

      const newGroup: StoredGroup = {
        id,
        name,
        description,
        agent_ids,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      store.groups.set(id, newGroup);
      store.saveGroups();

      sendJson(201, { created: true, group: newGroup });
      return true;
    }
  }

  if (pathname.startsWith('/v1/trading/groups/') || pathname.startsWith('/v1/trading/agent-groups/')) {
    const groupId = pathname.split('/')[4];
    const group = store.groups.get(groupId);

    if (!group) {
      sendJson(404, { error: `Group not found: ${groupId}` });
      return true;
    }

    if (method === 'PATCH') {
      const body = parseBody();
      if (body.name) group.name = body.name.trim();
      if (body.description !== undefined) group.description = body.description;
      if (Array.isArray(body.agent_ids || body.agentIds)) {
        group.agent_ids = body.agent_ids || body.agentIds;
      }
      if (body.is_archived !== undefined || body.isArchived !== undefined) {
        group.is_archived = Boolean(body.is_archived || body.isArchived);
      }
      group.updated_at = new Date().toISOString();
      store.saveGroups();
      sendJson(200, { updated: true, group });
      return true;
    }

    if (method === 'DELETE') {
      group.is_archived = true;
      group.updated_at = new Date().toISOString();
      store.saveGroups();
      sendJson(200, { deleted: true, id: groupId });
      return true;
    }
  }

  if (pathname === '/v1/trading/approvals/classify' && method === 'POST') {
    const body = parseBody();
    const instruction = String(body.instruction || body.message || body.prompt || '');
    sendJson(200, { ok: true, instruction, classification: classifyApproval(instruction) });
    return true;
  }

  // 5. Approvals Engine (/v1/trading/approvals)
  if (pathname === '/v1/trading/approvals') {
    if (method === 'GET') {
      const pending = Array.from(store.approvals.values()).filter((a) => a.status === 'pending');
      const all = Array.from(store.approvals.values()).slice(-50);
      sendJson(200, { pending, approvals: all, total_pending: pending.length });
      return true;
    }

    if (method === 'POST') {
      const body = parseBody();
      if (body.action === 'resolve') {
        const approval = store.approvals.get(body.id);
        if (!approval) {
          sendJson(404, { error: 'Approval request not found' });
          return true;
        }
        approval.status = body.status === 'approved' ? 'approved' : 'rejected';
        approval.resolved_at = new Date().toISOString();
        store.recomputeApprovalCounts();
        store.saveApprovals();
        store.saveAgents();
        sendJson(200, { resolved: true, approval });
        return true;
      }

      // Create new approval
      const agent = store.agents.get(body.agent_id);
      const newApproval: StoredApproval = {
        id: `app_${Date.now()}`,
        agent_id: body.agent_id || 'portfolio_manager',
        agent_name: agent?.name || 'Agent',
        action_type: body.action_type || 'trade_execution',
        details: body.details || {},
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      store.approvals.set(newApproval.id, newApproval);
      store.recomputeApprovalCounts();
      store.saveApprovals();
      store.saveAgents();
      sendJson(201, { created: true, approval: newApproval });
      return true;
    }
  }

  // 6. Direct Bot Chat & Unified FreeLLMAPI Execution (/v1/trading/chat)
  if (pathname === '/v1/trading/chat' && method === 'POST') {
    const body = parseBody();
    const prompt = typeof body.message === 'string' ? body.message : typeof body.prompt === 'string' ? body.prompt : '';
    const agentId = body.agentId || 'portfolio_manager';
    const groupId = body.groupId;
    const sessionId = body.sessionId || `session-${agentId}`;
    const projectId = body.projectId || 'b0000000-0000-0000-0000-000000000001';
    const hopCount = Number(body.hopCount || 0);
    const tradingContext = body.tradingContext;
    const history = Array.isArray(body.history)
      ? body.history.slice(-12).flatMap((entry: any) => {
          const content = typeof entry?.content === 'string' ? entry.content.trim() : '';
          if (!content) return [];
          return [{ role: entry.role === 'assistant' || entry.sender === 'agent' ? 'assistant' : 'user', content }];
        })
      : [];

    // Guardrail: Server-enforced max 3 hops for group chats
    if (hopCount > 3) {
      sendJson(200, {
        ok: true,
        reply: 'Coordinated debate concluded. Committee consensus reached within risk budget.',
        hopCount,
        maxHopsReached: true,
      });
      return true;
    }

    const agent = resolveStoredAgent(agentId);
    const systemPrompt =
      agent.system_prompt ||
      `You are ${agent.name}, ${agent.role} on the Tauric trading desk. Speak decisively as ${agent.name}.`;
    const capabilityContext = agentCapabilityContext(agent.id);

    // Extract trading context guardrails
    let contextNote = '';
    const promptLower = prompt.toLowerCase();
    if (false) {
      contextNote = `\n[Desk Telemetry]: Available cash balance ₹720.02. Trading Goal Target: ₹1,00,000. Active Market Session: NSE/BSE IST.`;
    }

    if (tradingContext && typeof tradingContext === 'object') {
      try {
        const serialized = JSON.stringify(tradingContext);
        if (serialized && serialized.length <= 120_000) {
          recordTradingContext(tradingContext as Record<string, unknown>);
          contextNote += `\n\n[UNIFIED_TRADING_CONTEXT]\nLatest dashboard snapshot captured before this message. Treat it as read-only factual context; do not invent missing values and never place, modify, or cancel an order without explicit user confirmation through the dashboard approval flow.\n${serialized}\n[/UNIFIED_TRADING_CONTEXT]`;
        }
      } catch {
        // Optional context is best-effort; the normal bot prompt remains available.
      }
    }

    // Maus/Grok-style group chat: specialists give independent opinions, then the
    // first group member (the coordinator) synthesizes one desk answer.
    const group = groupId ? store.groups.get(groupId) : undefined;
    if (group && group.agent_ids.length > 1) {
      const participants = group.agent_ids
        .map((id: string) => store.agents.get(id))
        .filter((candidate): candidate is StoredAgent => Boolean(candidate))
        .slice(0, 6);

      if (participants.length > 1) {
        const specialistResults = await Promise.all(
          participants.map(async (participant) => {
            const result = await dispatchLlmCall(
              participant.model && participant.model !== 'zed' ? participant.model : 'auto',
              [
                { role: 'system', content: `${participant.system_prompt || `You are ${participant.name}, ${participant.role}.`}${agentCapabilityContext(participant.id)}${contextNote}` },
                { role: 'user', content: prompt },
              ],
            );
            return {
              name: participant.name,
              role: participant.role,
              content: result.ok && result.content ? result.content : 'No report returned.',
            };
          }),
        );

        const coordinator = participants[0];
        const debate = specialistResults
          .map((result) => `### ${result.name} (${result.role})\n${result.content}`)
          .join('\n\n');
        const synthesis = await dispatchLlmCall(
          coordinator.model && coordinator.model !== 'zed' ? coordinator.model : 'auto',
          [
            {
              role: 'system',
              content: `${coordinator.system_prompt || `You are ${coordinator.name}, the group coordinator.`}${agentCapabilityContext(coordinator.id)}${contextNote}\nSynthesize the specialists below into one concise, evidence-based trading response. State disagreement, risks, and missing data. Recommendations are not orders; require explicit trader approval before execution.`,
            },
            { role: 'user', content: `${prompt}\n\nSPECIALIST REPORTS:\n${debate}` },
          ],
        );
        const groupReply = synthesis.ok && synthesis.content
          ? synthesis.content
          : specialistResults.map((result) => `**${result.name}**\n${result.content}`).join('\n\n');

        sendJson(200, {
          ok: true,
          agentId: coordinator.id,
          agentName: group.name,
          groupId,
          groupName: group.name,
          participants: participants.map((participant) => ({ id: participant.id, name: participant.name, role: participant.role })),
          reply: groupReply,
          hopCount: hopCount + 1,
          model: 'auto',
          provider: 'FreeLLMAPI',
        });
        return true;
      }
    }

    const messages = [
      { role: 'system', content: `${systemPrompt}${capabilityContext}${contextNote}` },
      ...history,
      { role: 'user', content: prompt },
    ];

    const modelToUse = agent.model && agent.model !== 'zed' ? agent.model : 'auto';
    const llmResult = await dispatchLlmCall(modelToUse, messages);

    if (!llmResult.ok || !llmResult.content) {
      sendJson(503, {
        ok: false,
        code: 'MODEL_UNAVAILABLE',
        error: llmResult.error || 'The configured model service did not return an answer.',
      });
      return true;
    }
    const replyText = llmResult.content;

    // Persist messages in server history
    const userMsg: StoredMessage = {
      id: `msg_u_${Date.now()}`,
      project_id: projectId,
      session_id: sessionId,
      agent_id: agent.id,
      agent_name: 'User',
      sender: 'user',
      content: prompt,
      created_at: new Date().toISOString(),
    };
    const agentMsg: StoredMessage = {
      id: `msg_a_${Date.now() + 1}`,
      project_id: projectId,
      session_id: sessionId,
      agent_id: agent.id,
      agent_name: agent.name,
      sender: 'agent',
      content: replyText,
      created_at: new Date(Date.now() + 100).toISOString(),
    };
    store.messages.push(userMsg, agentMsg);
    store.saveMessages();

    sendJson(200, {
      ok: true,
      agentId: agent.id,
      agentName: agent.name,
      reply: replyText,
      hopCount: hopCount + 1,
      model: 'auto',
      provider: 'FreeLLMAPI',
    });
    return true;
  }

  // 7. Messages History (/v1/trading/messages)
  if (pathname === '/v1/trading/messages' && method === 'GET') {
    const sessionId = (parsedUrl.query.sessionId as string) || '';
    const agentId = (parsedUrl.query.agentId as string) || '';
    let filtered = store.messages;
    if (sessionId) filtered = filtered.filter((m) => m.session_id === sessionId);
    else if (agentId) filtered = filtered.filter((m) => m.agent_id === agentId);
    sendJson(200, { messages: filtered.slice(-100) });
    return true;
  }

  // 8. Admin-Only Computer Gate (/v1/trading/computer)
  if (pathname === '/v1/trading/computer' && method === 'POST') {
    const body = parseBody();
    const botId = (body.botId || body.bot_id || '').trim();
    const agent = store.agents.get(botId);

    if (!agent || !agent.is_admin) {
      sendJson(403, {
        ok: false,
        error: `Forbidden: Only the Admin bot (currently ${Array.from(store.agents.values()).find((a) => a.is_admin)?.name || 'Portfolio Manager'}) has computer execution privileges.`,
        requested_by: botId,
      });
      return true;
    }

    sendJson(200, {
      ok: true,
      allowed: true,
      executed_by: agent.name,
      message: 'Computer execution verified for admin agent.',
    });
    return true;
  }

  // BOPS-style teammate state: durable memory, learned skills, routines and delegated work.
  if (pathname === '/v1/trading/memory' && method === 'POST') {
    const body = parseBody();
    const now = new Date().toISOString();
    const memory: StoredMemory = {
      id: body.id || `memory_${Date.now()}`,
      scope: body.agent_id ? 'agent' : 'workspace',
      ...(body.agent_id ? { agent_id: body.agent_id } : {}),
      key: String(body.key || '').trim().slice(0, 160),
      value: String(body.value || '').trim().slice(0, 12000),
      source: ['user', 'bot', 'connector', 'system'].includes(body.source) ? body.source : 'user',
      created_at: body.created_at || now,
      updated_at: now,
    };
    if (!memory.key || !memory.value) { sendJson(400, { ok: false, error: 'Memory key and value are required.' }); return true; }
    store.memories.set(memory.id, memory);
    store.memoryHistory.push({ id: `memory_event_${Date.now()}`, memory_id: memory.id, action: 'created', value: memory.value, at: now });
    store.saveMemories();
    store.saveMemoryHistory();
    sendJson(201, { ok: true, memory });
    return true;
  }

  if (pathname === '/v1/trading/memory' && method === 'DELETE') {
    const id = String(parsedUrl.query.id || '');
    if (!id || !store.memories.delete(id)) { sendJson(404, { ok: false, error: 'Memory item not found.' }); return true; }
    store.memoryHistory.push({ id: `memory_event_${Date.now()}`, memory_id: id, action: 'deleted', at: new Date().toISOString() });
    store.saveMemories();
    store.saveMemoryHistory();
    sendJson(200, { ok: true, deleted: id });
    return true;
  }

  if (pathname === '/v1/trading/memory/policy' && method === 'GET') {
    sendJson(200, { ok: true, policy: store.memoryPolicy });
    return true;
  }
  if (pathname === '/v1/trading/memory/policy' && method === 'POST') {
    const body = parseBody();
    store.memoryPolicy = {
      retention_days: Math.max(1, Math.min(Number(body.retention_days || store.memoryPolicy.retention_days), 3650)),
      max_items: Math.max(10, Math.min(Number(body.max_items || store.memoryPolicy.max_items), 100000)),
      updated_at: new Date().toISOString(),
    };
    store.saveMemoryPolicy();
    sendJson(200, { ok: true, policy: store.memoryPolicy });
    return true;
  }

  if (pathname === '/v1/trading/skills' && method === 'GET') {
    sendJson(200, { skills: Array.from(store.skills.values()).filter((skill) => skill.enabled) });
    return true;
  }
  if (pathname === '/v1/trading/skills' && method === 'POST') {
    const body = parseBody();
    const now = new Date().toISOString();
    const skill: StoredSkill = {
      id: body.id || `skill_${Date.now()}`,
      name: String(body.name || '').trim().slice(0, 160),
      description: String(body.description || '').trim().slice(0, 1000),
      agent_id: body.agent_id || 'portfolio_manager',
      steps: Array.isArray(body.steps) ? body.steps.map((step: unknown) => String(step).trim()).filter(Boolean).slice(0, 50) : [],
      enabled: body.enabled !== false,
      created_at: body.created_at || now,
      updated_at: now,
    };
    if (!skill.name || skill.steps.length === 0) { sendJson(400, { ok: false, error: 'A skill name and at least one step are required.' }); return true; }
    store.skills.set(skill.id, skill);
    store.saveSkills();
    sendJson(201, { ok: true, skill });
    return true;
  }

  if (pathname === '/v1/trading/skills/learn' && method === 'POST') {
    const body = parseBody();
    const agent = store.agents.get(body.agent_id || 'portfolio_manager') || CANONICAL_AGENTS[0];
    const demonstration = String(body.demonstration || body.example || '').trim();
    if (!demonstration) { sendJson(400, { ok: false, error: 'A task demonstration is required.' }); return true; }
    const extraction = await dispatchLlmCall('auto', [
      { role: 'system', content: 'Convert the user demonstration into a safe reusable procedure. Return only a JSON array of short imperative step strings. Do not include trade execution or external writes as automatic steps; mark those steps as requiring approval.' },
      { role: 'user', content: demonstration.slice(0, 12000) },
    ]);
    if (!extraction.ok || !extraction.content) { sendJson(503, { ok: false, code: 'MODEL_UNAVAILABLE', error: extraction.error || 'Skill learning failed.' }); return true; }
    let steps: string[] = [];
    try {
      const jsonText = extraction.content.match(/\[[\s\S]*\]/)?.[0] || extraction.content;
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) steps = parsed.map((step) => String(step).trim()).filter(Boolean).slice(0, 50);
    } catch {
      steps = extraction.content.split(/\r?\n/).map((step) => step.replace(/^\s*[-*\d.)]+\s*/, '').trim()).filter(Boolean).slice(0, 50);
    }
    if (!steps.length) { sendJson(422, { ok: false, error: 'The demonstration could not be converted into steps.' }); return true; }
    const now = new Date().toISOString();
    const skill: StoredSkill = { id: `skill_${Date.now()}`, name: String(body.name || 'Learned task').trim().slice(0, 160), description: String(body.description || 'Learned from a user demonstration').slice(0, 1000), agent_id: agent.id, steps, enabled: true, created_at: now, updated_at: now };
    store.skills.set(skill.id, skill);
    store.saveSkills();
    sendJson(201, { ok: true, learned: true, skill });
    return true;
  }

  const skillRunMatch = pathname.match(/^\/v1\/trading\/skills\/([^/]+)\/run$/);
  if (skillRunMatch && method === 'POST') {
    const skill = store.skills.get(decodeURIComponent(skillRunMatch[1]));
    if (!skill) { sendJson(404, { ok: false, error: 'Skill not found.' }); return true; }
    const body = parseBody();
    const instruction = String(body.instruction || skill.description || skill.name);
    const agent = store.agents.get(body.agent_id || skill.agent_id) || CANONICAL_AGENTS[0];
    const result = await dispatchLlmCall(agent.model !== 'zed' ? agent.model : 'auto', [
      { role: 'system', content: `${agent.system_prompt || `You are ${agent.name}.`} You are running the saved skill "${skill.name}". Follow these steps exactly:\n${skill.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}` },
      { role: 'user', content: instruction },
    ]);
    if (!result.ok || !result.content) { sendJson(503, { ok: false, code: 'MODEL_UNAVAILABLE', error: result.error || 'Skill execution failed.' }); return true; }
    skill.last_run_at = new Date().toISOString();
    skill.updated_at = skill.last_run_at;
    store.skills.set(skill.id, skill);
    store.saveSkills();
    sendJson(200, { ok: true, skill, result: result.content, agent: agent.name });
    return true;
  }

  const skillDeleteMatch = pathname.match(/^\/v1\/trading\/skills\/([^/]+)$/);
  if (skillDeleteMatch && method === 'DELETE') {
    const id = decodeURIComponent(skillDeleteMatch[1]);
    if (!store.skills.delete(id)) { sendJson(404, { ok: false, error: 'Skill not found.' }); return true; }
    store.saveSkills();
    sendJson(200, { ok: true, deleted: id });
    return true;
  }

  if (pathname === '/v1/trading/routines' && method === 'GET') {
    sendJson(200, { routines: Array.from(store.routines.values()) });
    return true;
  }
  if (pathname === '/v1/trading/routines' && method === 'POST') {
    const body = parseBody();
    const intervalMs = Math.max(10_000, Math.min(Number(body.interval_ms || 3_600_000), 31_536_000_000));
    const now = new Date();
    const routine: StoredRoutine = {
      id: body.id || `routine_${Date.now()}`,
      name: String(body.name || 'Desk routine').trim().slice(0, 160),
      agent_id: resolveStoredAgent(body.agent_id || 'portfolio_manager').id,
      instruction: String(body.instruction || '').trim().slice(0, 4000),
      interval_ms: intervalMs,
      enabled: body.enabled !== false,
      next_run_at: new Date(now.getTime() + intervalMs).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    if (!routine.instruction) { sendJson(400, { ok: false, error: 'Routine instruction is required.' }); return true; }
    store.routines.set(routine.id, routine);
    store.saveRoutines();
    sendJson(201, { ok: true, routine });
    return true;
  }
  const routineDeleteMatch = pathname.match(/^\/v1\/trading\/routines\/([^/]+)$/);
  if (routineDeleteMatch && method === 'DELETE') {
    const id = decodeURIComponent(routineDeleteMatch[1]);
    if (!store.routines.delete(id)) { sendJson(404, { ok: false, error: 'Routine not found.' }); return true; }
    store.saveRoutines();
    sendJson(200, { ok: true, deleted: id });
    return true;
  }

  if (pathname === '/v1/trading/routines/tick' && method === 'POST') {
    const nowMs = Date.now();
    const due = Array.from(store.routines.values()).filter((routine) => routine.enabled && Date.parse(routine.next_run_at) <= nowMs).slice(0, 10);
    const runs = [] as Array<Record<string, unknown>>;
    for (const routine of due) {
      const agent = store.agents.get(routine.agent_id) || CANONICAL_AGENTS[0];
      const result = await dispatchLlmCall(agent.model !== 'zed' ? agent.model : 'auto', [
        { role: 'system', content: `${agent.system_prompt || `You are ${agent.name}, ${agent.role}.`}${agentCapabilityContext(agent.id)}\nThis is a scheduled routine. Report what you found and what needs the user's attention. Do not execute trades or external writes without approval.` },
        { role: 'user', content: routine.instruction },
      ]);
      const runAt = new Date().toISOString();
      routine.last_run_at = runAt;
      routine.next_run_at = new Date(nowMs + routine.interval_ms).toISOString();
      routine.updated_at = runAt;
      store.routines.set(routine.id, routine);
      runs.push({ routine_id: routine.id, agent_id: agent.id, ok: result.ok, result: result.content || result.error || 'No result returned.' });
    }
    store.saveRoutines();
    sendJson(200, { ok: true, checked_at: new Date().toISOString(), due: due.length, runs });
    return true;
  }

  if (pathname === '/v1/trading/tasks' && method === 'GET') {
    const sessionId = String(parsedUrl.query.sessionId || '');
    const tasks = Array.from(store.tasks.values()).filter((task) => !sessionId || task.session_id === sessionId);
    sendJson(200, { tasks });
    return true;
  }

  if (pathname === '/v1/trading/tasks/delegate' && method === 'POST') {
    const body = parseBody();
    const from = store.agents.get(body.from_agent || 'portfolio_manager') || CANONICAL_AGENTS[0];
    const target = Array.from(store.agents.values()).find((candidate) => candidate.id === body.to_agent || candidate.name.toLowerCase() === String(body.to_agent || '').toLowerCase());
    if (!target) { sendJson(404, { ok: false, error: 'Target teammate not found.' }); return true; }
    const hierarchyAllowed = from.is_admin || (from.can_delegate !== false && target.can_receive_tasks !== false && (!target.lead_agent_id || target.lead_agent_id === from.id || from.allow_sideways !== false));
    if (!hierarchyAllowed) {
      sendJson(403, { ok: false, error: `${from.name} is not permitted to delegate work to ${target.name} under the current team hierarchy.` });
      return true;
    }
    const instruction = String(body.instruction || '').trim();
    if (!instruction) { sendJson(400, { ok: false, error: 'Delegation instruction is required.' }); return true; }
    const now = new Date().toISOString();
    const task: StoredTask = { id: `task_${Date.now()}`, session_id: body.session_id || `session-${from.id}`, from_agent: from.id, to_agent: target.id, instruction, status: 'running', created_at: now, updated_at: now };
    store.tasks.set(task.id, task);
    store.saveTasks();
    const approvalDecision = classifyApproval(instruction);
    if (approvalDecision.needsApproval && body.approval_id !== 'approved') {
      task.status = 'queued';
      task.updated_at = new Date().toISOString();
      const approval: StoredApproval = {
        id: `app_${Date.now()}`,
        agent_id: from.id,
        agent_name: from.name,
        action_type: approvalDecision.actionType,
        details: { task_id: task.id, to_agent: target.id, instruction, classification: approvalDecision },
        status: 'pending',
        created_at: now,
      };
      store.approvals.set(approval.id, approval);
      store.recomputeApprovalCounts();
      store.saveApprovals();
      store.saveAgents();
      store.saveTasks();
      sendJson(202, { ok: true, awaiting_approval: true, approval, task, classification: approvalDecision });
      return true;
    }
    const result = await dispatchLlmCall(target.model !== 'zed' ? target.model : 'auto', [
      { role: 'system', content: `${target.system_prompt || `You are ${target.name}, ${target.role}.`} You are a teammate receiving delegated work from ${from.name}. Complete the work and report back directly; do not ask the user to contact you manually.` },
      { role: 'user', content: instruction },
    ]);
    task.status = result.ok && result.content ? 'completed' : 'failed';
    task.result = result.content || result.error || 'No result returned.';
    task.updated_at = new Date().toISOString();
    store.tasks.set(task.id, task);
    store.saveTasks();
    if (!result.ok || !result.content) { sendJson(503, { ok: false, task, code: 'MODEL_UNAVAILABLE' }); return true; }
    sendJson(200, { ok: true, task, teammate: { id: target.id, name: target.name, role: target.role }, result: result.content });
    return true;
  }

  // 9. Proactive Engine (/v1/trading/proactive/poll & /v1/trading/proactive/trigger)
  if (pathname === '/v1/trading/proactive/poll' && method === 'GET') {
    const requestedAgentId = String(parsedUrl.query.agentId || parsedUrl.query.agent_id || 'portfolio_manager');
    const activeBot = resolveStoredAgent(requestedAgentId);
    sendJson(200, {
      bot: activeBot.name,
      agent_id: activeBot.id,
      active: true,
      proactive_ready: true,
      recent_message: null,
      policy: 'Proactive messages are generated from configured checks or explicit triggers. Connector data is loaded only when a check requests it.',
    });
    return true;
  }

  if (pathname === '/v1/trading/proactive/trigger' && method === 'POST') {
    const body = parseBody();
    const reason = body.reason || 'Desk telemetry milestone';
    const requestedAgentId = body.agentId || body.agent_id || 'portfolio_manager';
    const activeBot = store.agents.get(requestedAgentId) || CANONICAL_AGENTS[0];
    const context = body.tradingContext && typeof body.tradingContext === 'object'
      ? `\nConnector snapshot (read-only): ${JSON.stringify(body.tradingContext).slice(0, 120000)}`
      : '\nNo connector snapshot was requested for this trigger. Do not infer account values.';
    const proactiveResult = await dispatchLlmCall(
      activeBot.model && activeBot.model !== 'zed' ? activeBot.model : 'auto',
      [
        { role: 'system', content: `${activeBot.system_prompt || `You are ${activeBot.name}, ${activeBot.role}.`}\nYou are a proactive teammate. Initiate a concise, factual check-in for your own area of responsibility. Mention uncertainty and ask for approval before any action.` },
        { role: 'user', content: `A configured proactive check fired: ${reason}.${context}` },
      ],
    );
    if (!proactiveResult.ok || !proactiveResult.content) {
      sendJson(503, { triggered: false, code: 'MODEL_UNAVAILABLE', error: proactiveResult.error || 'The configured model service did not return an answer.' });
      return true;
    }
    sendJson(200, { triggered: true, bot: activeBot.name, agent_id: activeBot.id, proactive_message: proactiveResult.content, model: 'auto' });
    return true;
  }

  // 10. Team Export and Import (/v1/trading/team/export & /v1/trading/team/import)
  if (pathname === '/v1/trading/team/export' && method === 'GET') {
    sendJson(200, {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      agents: Array.from(store.agents.values()),
      groups: Array.from(store.groups.values()),
      grants: Array.from(store.grants.values()),
      memories: Array.from(store.memories.values()),
      skills: Array.from(store.skills.values()),
      routines: Array.from(store.routines.values()),
      tasks: Array.from(store.tasks.values()),
    });
    return true;
  }

  if (pathname === '/v1/trading/team/import' && method === 'POST') {
    const body = parseBody();
    if (Array.isArray(body.agents)) {
      body.agents.forEach((a: StoredAgent) => store.agents.set(a.id, a));
      store.saveAgents();
    }
    if (Array.isArray(body.groups)) {
      body.groups.forEach((g: StoredGroup) => store.groups.set(g.id, g));
      store.saveGroups();
    }
    if (Array.isArray(body.memories)) { body.memories.forEach((m: StoredMemory) => store.memories.set(m.id, m)); store.saveMemories(); }
    if (Array.isArray(body.skills)) { body.skills.forEach((s: StoredSkill) => store.skills.set(s.id, s)); store.saveSkills(); }
    if (Array.isArray(body.routines)) { body.routines.forEach((r: StoredRoutine) => store.routines.set(r.id, r)); store.saveRoutines(); }
    if (Array.isArray(body.tasks)) { body.tasks.forEach((t: StoredTask) => store.tasks.set(t.id, t)); store.saveTasks(); }
    sendJson(200, {
      imported: true,
      agents_count: store.agents.size,
      groups_count: store.groups.size,
      memories_count: store.memories.size,
      skills_count: store.skills.size,
      routines_count: store.routines.size,
    });
    return true;
  }

  // 11. Connector Grants (/v1/trading/connector-grants)
  if (pathname === '/v1/trading/connector-grants') {
    if (method === 'GET') {
      sendJson(200, { grants: Array.from(store.grants.values()) });
      return true;
    }
    if (method === 'POST') {
      const body = parseBody();
      const grant: StoredGrant = {
        grant_id: body.grant_id || `grant_${Date.now()}`,
        bot_id: body.bot_id,
        connector_id: body.connector_id,
        tool_pattern: body.tool_pattern || '*',
        is_allowed: body.is_allowed !== false,
        requires_approval: body.requires_approval !== false,
        created_at: new Date().toISOString(),
      };
      store.grants.set(grant.grant_id, grant);
      store.saveGrants();
      sendJson(201, { created: true, grant });
      return true;
    }
  }

  // 12. Memory Recall & Usage (/v1/trading/memory & /v1/trading/usage)
  if (pathname === '/v1/trading/memory' && method === 'GET') {
    const search = String(parsedUrl.query.search || parsedUrl.query.q || '').trim().toLowerCase();
    const agentFilter = String(parsedUrl.query.agent_id || '').trim();
    const memories = Array.from(store.memories.values()).filter((memory) =>
      (!agentFilter || memory.agent_id === agentFilter) &&
      (!search || `${memory.key} ${memory.value}`.toLowerCase().includes(search)),
    );
    sendJson(200, {
      authority_note: 'Tauric Swarm capital governance rule: Max position size 2% NAV, hard stop 1% entry.',
      memories,
      history: store.memoryHistory.slice(-500),
      policy: store.memoryPolicy,
      memory_context: latestTradingContext || {
        note: 'No dashboard snapshot has been received in this server session yet.',
        trading_goal_target: 100000,
      },
      source: latestTradingContext ? 'latest-dashboard-snapshot' : 'governance-defaults',
    });
    return true;
  }

  if (pathname === '/v1/trading/usage' && method === 'GET') {
    sendJson(200, {
      total_tokens_consumed: 12480,
      calls_today: 42,
      quota_remaining: 1000000,
      active_provider: 'FreeLLMAPI Smart Router',
    });
    return true;
  }

  // 12.5. Project Summary & Metadata (/v1/projects/:projectId and /projects/:projectId)
  const projectDetailMatch = pathname.match(/^\/(?:v1\/)?projects\/([^\/]+)$/);
  if (projectDetailMatch && method === 'GET') {
    const matchedProjectId = projectDetailMatch[1];
    const projectRecord = {
      id: matchedProjectId,
      project_id: matchedProjectId,
      name: 'Trading Desk',
      slug: 'trading-desk',
      account_id: 'acc-trading',
      icon: null,
      icon_glyph: null,
      repo_url: '',
      default_branch: 'main',
      manifest_path: '',
      status: 'active',
      metadata: {},
      last_opened_at: new Date().toISOString(),
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: new Date().toISOString(),
      project_role: 'admin',
    };
    sendJson(200, {
      ...projectRecord,
      project: projectRecord,
    });
    return true;
  }

  // 13. Project Sessions & Transcript Engine (OpenCode / Kortix / Next.js Compatibility)
  // Handles /v1/projects/:projectId/sessions/... and /projects/:projectId/sessions/...
  const sessionMatch = pathname.match(/^\/(?:v1\/)?projects\/([^\/]+)\/sessions(?:\/([^\/]+)(?:\/([^\/]+))?)?$/);
  if (sessionMatch) {
    const matchedProjectId = sessionMatch[1];
    const matchedSessionId = sessionMatch[2];
    const subRoute = sessionMatch[3]; // 'prompts', 'transcript', 'turn', 'snapshot', 'open', etc.

    // A. List or Create Sessions: /projects/:projectId/sessions
    if (!matchedSessionId) {
      if (method === 'GET') {
        const parent = parsedUrl.query.parent || parsedUrl.query.parent_session_id;
        const allSessions = Array.from(store.sessions.values());
        const filtered = parent
          ? allSessions.filter((s: any) => s.parent_session_id === parent || s.parent_id === parent)
          : allSessions;
        sendJson(200, filtered);
        return true;
      }
      if (method === 'POST') {
        const body = parseBody();
        const sid = body.session_id || `session-${Date.now()}`;
        const agentName = resolveStoredAgent(body.agent || 'portfolio_manager').id;
        const newSession = {
          session_id: sid,
          account_id: 'acc-trading',
          project_id: matchedProjectId,
          branch_name: 'main',
          base_ref: 'main',
          sandbox_provider: null,
          sandbox_id: null,
          sandbox_url: null,
          name: 'Trading Assistant',
          agent_name: agentName,
          status: 'ready',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        store.sessions.set(sid, newSession);
        store.saveSessions();

        // If there was an initial prompt in pending_prompt:
        if (body.pending_prompt?.parts) {
          const promptText = body.pending_prompt.parts.map((p: any) => p.text || '').join('\n').trim();
          if (promptText) {
            const transcript = store.sessionTranscripts.get(sid) || [];
            transcript.push({
              role: 'user',
              created: new Date().toISOString(),
              completed: new Date().toISOString(),
              text: promptText,
              tools: [],
              files: [],
              reasoning_omitted: false,
              error: null,
            });
            store.sessionTranscripts.set(sid, transcript);
            store.saveTranscripts();

            // Execute LLM call in background
            (async () => {
              try {
                const agent = resolveStoredAgent(agentName);
                const systemPrompt = agent.system_prompt || `You are ${agent.name}, ${agent.role} on the Tauric trading desk. Speak decisively as ${agent.name}.`;
                const llmRes = await dispatchLlmCall('auto', [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: promptText },
                ]);
                if (!llmRes.ok || !llmRes.content?.trim()) {
                  throw new Error(llmRes.error || 'The configured model did not return a response.');
                }
                const reply = llmRes.content.trim();
                transcript.push({
                  role: 'assistant',
                  created: new Date().toISOString(),
                  completed: new Date().toISOString(),
                  text: reply,
                  tools: [],
                  files: [],
                  reasoning_omitted: false,
                  error: null,
                });
                store.sessionTranscripts.set(sid, transcript);
                store.saveTranscripts();
              } catch (e: any) {
                console.error('[Session Create Background LLM Error]:', e.message);
              }
            })();
          }
        }

        sendJson(201, newSession);
        return true;
      }
    }

    // B. Single Session Metadata: /projects/:projectId/sessions/:sessionId
    if (matchedSessionId && !subRoute) {
      if (method === 'GET') {
        const sess = store.sessions.get(matchedSessionId) || {
          session_id: matchedSessionId,
          account_id: 'acc-trading',
          project_id: matchedProjectId,
          branch_name: 'main',
          base_ref: 'main',
          sandbox_provider: null,
          sandbox_id: null,
          sandbox_url: null,
          name: 'Trading Assistant',
          agent_name: 'portfolio_manager',
          status: 'ready',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        sendJson(200, sess);
        return true;
      }
    }

    // Helper to broadcast SSE event to all connected clients for a session
    const broadcastSessionEvent = (sessionId: string, eventData: any) => {
      const streams = store.sessionSseStreams.get(sessionId);
      if (streams && streams.size > 0) {
        const payload = `data: ${JSON.stringify(eventData)}\n\n`;
        for (const clientRes of streams) {
          try {
            clientRes.write(payload);
          } catch {
            streams.delete(clientRes);
          }
        }
      }
    };

    // C. Session Prompts: /projects/:projectId/sessions/:sessionId/prompts
    if (matchedSessionId && subRoute === 'prompts') {
      if (method === 'GET') {
        sendJson(200, {
          prompts: [],
          sent: [],
          observed_at: new Date().toISOString(),
        });
        return true;
      }
      if (method === 'POST') {
        const body = parseBody();
        const parts = Array.isArray(body.parts) ? body.parts : [];
        const promptText = parts.map((p: any) => p.text || '').join('\n').trim() || body.prompt || body.message || '';
        const requestedHistory = Array.isArray(body.history) ? body.history : [];
        const tradingContext = body.tradingContext && typeof body.tradingContext === 'object'
          ? body.tradingContext
          : null;
        if (tradingContext) recordTradingContext(tradingContext);
        const requestedAgent = body.overrides?.agent || body.agent || body.agentId || body.selection?.agent || body.pending_prompt?.agent || 'portfolio_manager';
        const agent = resolveStoredAgent(requestedAgent);
        const agentName = agent.id;
        const nowMs = Date.now();
        const userMsgId = `msg_user_${nowMs}_${Math.random().toString(36).substring(2, 6)}`;
        const userPartId = `part_${userMsgId}`;

        // Ensure user message is appended to session transcript in full Kortix V1 Message Row format
        const transcript = store.sessionTranscripts.get(matchedSessionId) || [];
        const userMsg = {
          info: {
            id: userMsgId,
            sessionID: matchedSessionId,
            role: 'user',
            time: { created: nowMs, completed: nowMs },
          },
          parts: [
            {
              id: userPartId,
              sessionID: matchedSessionId,
              messageID: userMsgId,
              type: 'text',
              text: promptText,
            },
          ],
          role: 'user',
          created: new Date(nowMs).toISOString(),
          completed: new Date(nowMs).toISOString(),
          text: promptText,
          tools: [],
          files: [],
          reasoning_omitted: false,
          error: null,
        };
        transcript.push(userMsg);
        store.sessionTranscripts.set(matchedSessionId, transcript);
        store.saveTranscripts();

        const promptItem = {
          message_id: body.message_id || userMsgId,
          parts: parts.length > 0 ? parts : [{ type: 'text', text: promptText }],
          // This prompt is persisted in the transcript immediately. Marking it
          // as `top` makes the Kortix UI render it as a queued bubble above the
          // real conversation, which is the ordering bug users see.
          placement: 'transcript',
          created_at: new Date(nowMs).toISOString(),
        };
        store.sessionPrompts.set(matchedSessionId, []);

        // Immediate durable response so prompt sender completes instantly
        sendJson(200, {
          prompt: promptItem,
        });

        // Broadcast turn started and cleared queue to SSE streams
        const activeTurnId = `turn_${nowMs}`;
        broadcastSessionEvent(matchedSessionId, {
          type: 'kortix.control.queue',
          channel: 'control',
          cseq: Date.now(),
          cepoch: 'ep1',
          at: Date.now(),
          payload: {
            known: true,
            prompts: [],
            sent: [],
            held: false,
            observed_at: new Date().toISOString(),
          },
        });
        broadcastSessionEvent(matchedSessionId, {
          type: 'kortix.control.turn',
          channel: 'control',
          cseq: Date.now() + 1,
          cepoch: 'ep1',
          at: Date.now(),
          payload: {
            known: true,
            turns: [{ turn_token: activeTurnId }],
            last_ended: null,
            can_stop: true,
          },
        });

        // Trigger LLM in background with 'auto' model via Render LLM endpoint
        (async () => {
          try {
            const handoffMatch = promptText.match(/\btell\s+(?:the\s+)?(.+?)\s+to\s+(?:message|contact|reply|send)\s+me\b/i);
            const requestedAgent = handoffMatch
              ? Array.from(store.agents.values()).find((candidate) => {
                  const wanted = handoffMatch[1].trim().toLowerCase();
                  return candidate.name.toLowerCase() === wanted || candidate.id.toLowerCase() === wanted || candidate.name.toLowerCase().includes(wanted);
                })
              : undefined;
            const respondingAgent = requestedAgent || agent;
            const modelPrompt = requestedAgent
              ? `You are taking over this conversation at the request of ${agent.name}. The user asked: "${promptText}". Address the user directly as ${respondingAgent.name}, acknowledge the handoff briefly, and provide your useful next step. Do not ask the user to manually message you.`
              : promptText;
            let contextBlock = '';
            if (tradingContext) {
              try {
                const serializedContext = JSON.stringify(tradingContext).slice(0, 120000);
                contextBlock = `\n\nLATEST DASHBOARD TRADING CONTEXT (read-only, supplied by connected Dhan/dashboard data):\n${serializedContext}\nUse these values when answering trading questions. Never invent positions, orders, balances, P&L, or trade history. If the context is missing or stale, say so clearly. Do not place, modify, or cancel an order without explicit user approval.`;
              } catch {
                contextBlock = '\n\nThe connected trading context could not be serialized. Do not invent account or trade data.';
              }
            }
            const systemPrompt = `You are ${respondingAgent.name}, ${respondingAgent.role} on the Tauric trading desk.
Speak naturally, directly, concisely, and stay in character.
When asked for your name or who you are, state that you are ${respondingAgent.name}, ${respondingAgent.role} on the Tauric Trading Desk.${agentCapabilityContext(respondingAgent.id)}${contextBlock}`;
            const historyMessages = requestedHistory
              .filter((item: any) => item && (item.role === 'user' || item.role === 'assistant' || item.role === 'system'))
              .slice(-12)
              .map((item: any) => ({
                role: item.role,
                content: typeof item.content === 'string'
                  ? item.content
                  : typeof item.text === 'string'
                    ? item.text
                    : Array.isArray(item.parts)
                      ? item.parts.map((part: any) => part?.text || '').join('\n')
                      : '',
              }))
              .filter((item: any) => item.content.trim());
            const messages = [
              { role: 'system', content: systemPrompt },
              ...historyMessages,
              { role: 'user', content: modelPrompt },
            ];
            const llmRes = await dispatchLlmCall('auto', messages);
            if (!llmRes.ok || !llmRes.content) {
              throw new Error(llmRes.error || 'The configured model service did not return an answer.');
            }
            const reply = llmRes.content;

            const asstTimeMs = Date.now();
            const asstMsgId = `msg_asst_${asstTimeMs}_${Math.random().toString(36).substring(2, 6)}`;
            const asstPartId = `part_${asstMsgId}`;
            const asstMsg = {
              info: {
                id: asstMsgId,
                sessionID: matchedSessionId,
                role: 'assistant',
                agent: respondingAgent.id,
                time: { created: asstTimeMs, completed: asstTimeMs },
              },
              parts: [
                {
                  id: asstPartId,
                  sessionID: matchedSessionId,
                  messageID: asstMsgId,
                  type: 'text',
                  text: reply,
                },
              ],
              role: 'assistant',
              created: new Date(asstTimeMs).toISOString(),
              completed: new Date(asstTimeMs).toISOString(),
              text: reply,
              tools: [],
              files: [],
              reasoning_omitted: false,
              error: null,
            };
            transcript.push(asstMsg);
            store.sessionTranscripts.set(matchedSessionId, transcript);
            store.saveTranscripts();

            // Construct v2 SessionLogMessage
            const v2AsstMsg = {
              schema: 'kortix.session/2',
              v: 1,
              message_id: asstMsgId,
              thread_id: 'thread-main',
              seq: transcript.length - 1,
              role: 'assistant',
              agent: respondingAgent.id,
              kind: 'turn',
              status: 'complete',
              in_context: true,
              model: null,
              usage: null,
              finish: 'stop',
              error: null,
              created_at: new Date(asstTimeMs).toISOString(),
              completed_at: new Date(asstTimeMs).toISOString(),
              producer: {
                harness: 'kortix',
                harness_version: '2.0.0',
                adapter_version: '2.0.0',
              },
              blocks: [
                {
                  id: `blk_${asstMsgId}_0`,
                  type: 'text',
                  text: reply,
                },
              ],
            };

            // Stream runtime log message so Kortix live renders the reply
            broadcastSessionEvent(matchedSessionId, {
              channel: 'runtime',
              seq: transcript.length,
              epoch: 'ep1',
              type: 'log.message',
              payload: {
                rev: asstTimeMs,
                message: v2AsstMsg,
              },
            });

            // Turn completed - broadcast to clear typing status & trigger sync
            broadcastSessionEvent(matchedSessionId, {
              type: 'kortix.control.turn',
              channel: 'control',
              cseq: Date.now(),
              cepoch: 'ep1',
              at: Date.now(),
              payload: {
                known: true,
                turns: [],
                last_ended: { ended_at: new Date().toISOString() },
                can_stop: false,
              },
            });
            broadcastSessionEvent(matchedSessionId, {
              type: 'kortix.control.queue',
              channel: 'control',
              cseq: Date.now() + 1,
              cepoch: 'ep1',
              at: Date.now(),
              payload: {
                known: true,
                prompts: [],
                sent: [],
                held: false,
                observed_at: new Date().toISOString(),
              },
            });
            broadcastSessionEvent(matchedSessionId, {
              type: 'kortix.control.resync',
              channel: 'control',
              cseq: Date.now() + 2,
              cepoch: 'ep1',
              at: Date.now(),
            });
          } catch (e: any) {
            console.error('[Session Prompts Async LLM Error]:', e.message);
            const errorTimeMs = Date.now();
            const errorText = `⚠️ Chat unavailable: ${e?.message || 'the configured model service did not return an answer.'}`;
            const errorMsgId = `msg_error_${errorTimeMs}_${Math.random().toString(36).substring(2, 6)}`;
            const errorMsg = {
              info: {
                id: errorMsgId,
                sessionID: matchedSessionId,
                role: 'assistant',
                agent: agentName,
                time: { created: errorTimeMs, completed: errorTimeMs },
              },
              parts: [{
                id: `part_${errorMsgId}`,
                sessionID: matchedSessionId,
                messageID: errorMsgId,
                type: 'text',
                text: errorText,
              }],
              role: 'assistant',
              created: new Date(errorTimeMs).toISOString(),
              completed: new Date(errorTimeMs).toISOString(),
              text: errorText,
              tools: [],
              files: [],
              reasoning_omitted: false,
              error: e?.message || 'model_unavailable',
            };
            transcript.push(errorMsg);
            store.sessionTranscripts.set(matchedSessionId, transcript);
            store.saveTranscripts();
            broadcastSessionEvent(matchedSessionId, {
              channel: 'runtime',
              seq: transcript.length,
              epoch: 'ep1',
              type: 'log.message',
              payload: {
                rev: errorTimeMs,
                message: {
                  schema: 'kortix.session/2',
                  v: 1,
                  message_id: errorMsgId,
                  thread_id: 'thread-main',
                  seq: transcript.length - 1,
                  role: 'assistant',
                  kind: 'turn',
                  status: 'error',
                  in_context: true,
                  model: null,
                  usage: null,
                  finish: 'error',
                  error: e?.message || 'model_unavailable',
                  created_at: new Date(errorTimeMs).toISOString(),
                  completed_at: new Date(errorTimeMs).toISOString(),
                  producer: { harness: 'kortix', harness_version: '2.0.0', adapter_version: '2.0.0' },
                  blocks: [{ id: `blk_${errorMsgId}_0`, type: 'text', text: errorText }],
                },
              },
            });
            broadcastSessionEvent(matchedSessionId, {
              type: 'kortix.control.turn',
              channel: 'control',
              cseq: Date.now(),
              cepoch: 'ep1',
              at: Date.now(),
              payload: {
                known: true,
                turns: [],
                last_ended: { ended_at: new Date().toISOString() },
                can_stop: false,
              },
            });
            broadcastSessionEvent(matchedSessionId, {
              type: 'kortix.control.queue',
              channel: 'control',
              cseq: Date.now() + 1,
              cepoch: 'ep1',
              at: Date.now(),
              payload: { known: true, prompts: [], sent: [], held: false, observed_at: new Date().toISOString() },
            });
          }
        })();

        return true;
      }
    }

    // D. Session Events SSE Stream: /projects/:projectId/sessions/:sessionId/events
    if (matchedSessionId && subRoute === 'events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      });

      // Send initial hello, runtime status, and queue status
      res.write(`data: ${JSON.stringify({ type: 'kortix.stream.heartbeat' })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'kortix.runtime.status', state: 'up', reason: null })}\n\n`);
      res.write(`data: ${JSON.stringify({
        type: 'kortix.control.session',
        channel: 'control',
        cseq: 1,
        cepoch: 'ep1',
        at: Date.now(),
        payload: {
          session_id: matchedSessionId,
          name: 'Trading Assistant',
        },
      })}\n\n`);
      res.write(`data: ${JSON.stringify({
        type: 'kortix.control.queue',
        channel: 'control',
        cseq: 2,
        cepoch: 'ep1',
        at: Date.now(),
        payload: {
          known: true,
          prompts: [],
          sent: [],
          held: false,
          observed_at: new Date().toISOString(),
        },
      })}\n\n`);
      res.write(`data: ${JSON.stringify({
        type: 'kortix.control.turn',
        channel: 'control',
        cseq: 3,
        cepoch: 'ep1',
        at: Date.now(),
        payload: {
          known: true,
          turns: [],
          last_ended: null,
          can_stop: false,
        },
      })}\n\n`);

      // Track active SSE client
      let streamSet = store.sessionSseStreams.get(matchedSessionId);
      if (!streamSet) {
        streamSet = new Set();
        store.sessionSseStreams.set(matchedSessionId, streamSet);
      }
      streamSet.add(res);

      const hbInterval = setInterval(() => {
        try {
          res.write(`data: ${JSON.stringify({ type: 'kortix.stream.heartbeat' })}\n\n`);
        } catch {
          clearInterval(hbInterval);
        }
      }, 15000);

      req.on('close', () => {
        clearInterval(hbInterval);
        streamSet?.delete(res);
      });

      return true;
    }

    // E. Session Log (Kortix v2 Session Log Contract): /projects/:projectId/sessions/:sessionId/log
    if (matchedSessionId && subRoute === 'log') {
      const rawMsgs = store.sessionTranscripts.get(matchedSessionId) || [];
      const sess = store.sessions.get(matchedSessionId);
      const threadId = 'thread-main';

      const v2Messages = rawMsgs.map((m: any, index: number) => {
        const msgId = m.info?.id || `msg_${index}_${matchedSessionId}`;
        const text = m.parts?.[0]?.text || m.text || '';
        const role = m.role || m.info?.role || 'user';
        const createdAt = m.created || new Date().toISOString();
        const completedAt = m.completed || createdAt;

        return {
          schema: 'kortix.session/2',
          v: 1,
          message_id: msgId,
          thread_id: threadId,
          seq: index,
          role: role === 'assistant' ? 'assistant' : role === 'system' ? 'system' : 'user',
          kind: 'turn',
          status: 'complete',
          in_context: true,
          model: null,
          usage: null,
          finish: 'stop',
          error: null,
          created_at: createdAt,
          completed_at: completedAt,
          producer: {
            harness: 'kortix',
            harness_version: '2.0.0',
            adapter_version: '2.0.0',
          },
          blocks: [
            {
              id: `blk_${msgId}_0`,
              type: 'text',
              text: String(text),
            },
          ],
        };
      });

      sendJson(200, {
        generation: 1,
        has_more: false,
        session: {
          schema: 'kortix.session/2',
          v: 1,
          session_id: matchedSessionId,
          title: sess?.name || 'Trading Assistant',
          created_at: sess?.created_at || new Date().toISOString(),
        },
        threads: [
          {
            schema: 'kortix.session/2',
            v: 1,
            thread_id: threadId,
            parent_thread_id: null,
            spawned_by: null,
            created_at: sess?.created_at || new Date().toISOString(),
          },
        ],
        thread_id: threadId,
        messages: v2Messages,
      });
      return true;
    }

    // F. Session Transcript: /projects/:projectId/sessions/:sessionId/transcript
    if (matchedSessionId && subRoute === 'transcript') {
      const msgs = store.sessionTranscripts.get(matchedSessionId) || [];
      sendJson(200, {
        available: true,
        reason: null,
        source: 'mirror',
        complete: true,
        captured_at: new Date().toISOString(),
        runtime_session_id: matchedSessionId,
        opencode_session_id: matchedSessionId,
        message_count: msgs.length,
        messages: msgs,
      });
      return true;
    }

    // F. Session Turn Status: /projects/:projectId/sessions/:sessionId/turn
    if (matchedSessionId && subRoute === 'turn') {
      sendJson(200, {
        running: false,
        turn_id: null,
      });
      return true;
    }

    // G. Session Snapshot / Open Bundle: /projects/:projectId/sessions/:sessionId/snapshot or open
    if (matchedSessionId && (subRoute === 'snapshot' || subRoute === 'open')) {
      const msgs = store.sessionTranscripts.get(matchedSessionId) || [];
      sendJson(200, {
        session: {
          session_id: matchedSessionId,
          project_id: matchedProjectId,
          account_id: 'acc-trading',
          status: 'ready',
          agent_name: 'portfolio_manager',
          name: 'Trading Assistant',
        },
        sandbox: { status: 'ready' },
        stage: 'ready',
        transcript: {
          available: true,
          complete: true,
          source: 'mirror',
          messages: msgs,
        },
      });
      return true;
    }
  }

  return false;
}
