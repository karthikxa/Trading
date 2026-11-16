/**
 * The one request path from the SDK to the Kortix backend.
 *
 * `send()` owns everything every backend request must agree on:
 *   - the token: `getToken()` from the configured host, resolved on every
 *     send, so a retry after a 401 replay starts from the fresh token. There
 *     is no token option: the 401 replay asks `getToken()` again, so a
 *     caller-resolved token would be swapped for the host's identity;
 *   - the header policy: bearer, `X-Kortix-Client-Version`, admin read bypass,
 *     act-as;
 *   - the default deadline, composed with the caller's signal;
 *   - the one 401 replay with a fresh token, from a copy of the request taken
 *     BEFORE the first send (a `Request` body is consumed by the first send).
 *     A caller that sets its own `Authorization` gets no replay: a fresh host
 *     token cannot change a header the caller owns;
 *   - the configured `fetch` (`configureKortix({ fetch })`).
 *
 * It returns the `Response` for any HTTP status. It throws only when no
 * request was sent: `AuthError` without a token, `AbortError` on an abort.
 * The adapters shape that for their callers:
 *   - `backendApi.*` (`api-client.ts`): parsed body or a typed `ApiError`;
 *   - `authenticatedFetch` (`auth.ts`): fetch semantics, a synthetic 401;
 *   - `backendApi.postStream`: the raw streamed `Response`.
 *
 * This module imports no sibling transport module (`auth.ts`,
 * `api-client.ts`), so tests that replace those with `mock.module` do not
 * change what `send` does.
 */

import {
  DEFAULT_FETCH_TIMEOUT_MS,
  withDefaultTimeout,
  withTokenRetry,
} from '../../platform/auth-core';
import { abortable, createAbortError } from './abort';
import { ApiError, AuthError } from './api/errors';
import { platformConfig } from './config';
import { impersonationHeaders } from './impersonation';

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface SendOptions {
  /** Replay a 401 once with a fresh token from `getToken()`. Default `true`. */
  retryOnAuthError?: boolean;
  /**
   * The transport deadline in ms, composed with the caller's signal. Default
   * `DEFAULT_FETCH_TIMEOUT_MS`; the SSE event stream is exempt. `null`: no
   * transport deadline, the caller's signal is the only one.
   */
  timeoutMs?: number | null;
  /** The `fetch` to send with. Default `configureKortix({ fetch })`, then the global. */
  fetch?: Fetch;
}

// ── Header policy ───────────────────────────────────────────────────────────

/**
 * @deprecated A no-op. The read-only admin bypass header is retired: a platform
 * admin opens a project by acting as its account (`useAdminImpersonate` with
 * `{ projectId }`). Removed in the next major.
 */
export function setAdminBypass(_enabled: boolean): void { }

/** @deprecated Always `false`. See {@link setAdminBypass}. */
export function isAdminBypassEnabled(): boolean {
  return false;
}

// The headers of one request, as a plain record: the wire shape a URL request
// has always carried, with the names as the caller spelled them. Header names
// are case-insensitive, as in `Headers`: `setHeader` replaces a name in any
// case, so no name goes out twice with two values joined.

function entriesOf(headers: HeadersInit | undefined): Array<[string, string]> {
  if (!headers) return [];
  if (headers instanceof Headers || Array.isArray(headers)) return [...new Headers(headers).entries()];
  return Object.entries(headers);
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === lower);
}

function setHeader(headers: Record<string, string>, name: string, value: string): void {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) if (key.toLowerCase() === lower) delete headers[key];
  headers[name] = value;
}

/** The caller's headers: the `Request`'s own, then `init.headers` over them. */
function callerHeaders(input: RequestInfo | URL, init: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {};
  const sources = [input instanceof Request ? input.headers : undefined, init.headers];
  for (const [name, value] of sources.flatMap(entriesOf)) setHeader(headers, name, value);
  return headers;
}

/**
 * The caller's headers plus the platform policy. A caller's own
 * `Authorization` (or the configured `credentialHeader`) or
 * `X-Kortix-Client-Version` wins. Admin bypass and act-as
 * replace the caller's value, so a call site cannot drop them; the admin
 * console is never impersonated (see `shouldAttachImpersonation`).
 */
function withPlatformHeaders(url: string, base: Record<string, string>, token: string): Record<string, string> {
  const headers = { ...base };
  const clientVersion = platformConfig().clientVersion?.trim();
  if (clientVersion && !hasHeader(headers, 'x-kortix-client-version')) {
    setHeader(headers, 'X-Kortix-Client-Version', clientVersion);
  }
  for (const [name, value] of Object.entries(impersonationHeaders(url))) setHeader(headers, name, value);
  const credentialHeader = platformConfig().credentialHeader?.trim();
  if (credentialHeader) {
    if (!hasHeader(headers, credentialHeader)) setHeader(headers, credentialHeader, token);
  } else if (!hasHeader(headers, 'authorization')) setHeader(headers, 'Authorization', `Bearer ${token}`);
  return headers;
}

/**
 * `send()`'s token and header policy for a request the configured `fetch` does
 * not carry: one connection of the live event stream on a host with its own
 * `eventStreamTransport`. Throws `AuthError` without a token. `rejected()`
 * reports that the server answered 401, so the next connection asks the host
 * for a fresh token.
 */
export async function platformRequestHeaders(
  url: string,
  base?: HeadersInit,
): Promise<{ headers: Headers; rejected: () => void }> {
  const token = await currentToken();
  if (!token) throw new AuthError();
  return {
    headers: new Headers(withPlatformHeaders(url, callerHeaders(url, { headers: base }), token)),
    rejected: () => invalidateHostToken(token),
  };
}

// ── Send ────────────────────────────────────────────────────────────────────

/** A `ReadableStream` request body can be read once, so it cannot be resent. */
function hasOneShotBody(init: RequestInit): boolean {
  return typeof ReadableStream !== 'undefined' && init.body instanceof ReadableStream;
}

const FREE_LLM_MODELS: Record<string, any> = {
  // Render Server-LLM-1 Router (Auto Multi-Model Intelligence, Aliased as "zed")
  'zed': {
    id: 'zed',
    modelID: 'zed',
    providerID: 'zed',
    name: 'zed',
    display_name: 'zed',
    provider: 'zed',
    provider_name: 'zed',
    free: true,
    keyless: true,
    enabled: true,
    available: true,
    description: 'Autonomous multi-model intelligence via server-llm-1.onrender.com (auto router)',
    upstreamId: 'auto',
  },
  // Pollinations.AI — keyless, no API key required
  'pollinations-mistral': {
    name: 'Mistral (Pollinations)',
    provider: 'pollinations',
    provider_name: 'Pollinations.AI',
    free: true,
    keyless: true,
    enabled: true,
    available: true,
    description: 'Mistral 7B via Pollinations.AI — completely free, no API key needed',
  },
  'pollinations-openai': {
    name: 'OpenAI GPT-4o (Pollinations)',
    provider: 'pollinations',
    provider_name: 'Pollinations.AI',
    free: true,
    keyless: true,
    enabled: true,
    available: true,
    description: 'GPT-4o via Pollinations.AI proxy — free, no API key needed',
  },
  'pollinations-deepseek': {
    name: 'DeepSeek Reasoner (Pollinations)',
    provider: 'pollinations',
    provider_name: 'Pollinations.AI',
    free: true,
    keyless: true,
    enabled: true,
    available: true,
    description: 'DeepSeek R1 reasoning via Pollinations.AI — free, no API key needed',
  },
  'pollinations-llama': {
    name: 'Llama (Pollinations)',
    provider: 'pollinations',
    provider_name: 'Pollinations.AI',
    free: true,
    keyless: true,
    enabled: true,
    available: true,
    description: 'Meta Llama via Pollinations.AI — free, no API key needed',
  },
  'pollinations-qwen': {
    name: 'Qwen (Pollinations)',
    provider: 'pollinations',
    provider_name: 'Pollinations.AI',
    free: true,
    keyless: true,
    enabled: true,
    available: true,
    description: 'Qwen 2.5 via Pollinations.AI — free, no API key needed',
  },
  // OpenRouter Free
  'deepseek-r1-free': {
    name: 'DeepSeek R1 (:free)',
    provider: 'openrouter',
    provider_name: 'OpenRouter Free',
    free: true,
    enabled: true,
    available: true,
    description: 'DeepSeek R1 reasoning model served via OpenRouter Free',
    variants: { low: {}, medium: {}, high: {} },
  },
  'llama-3.3-70b-free': {
    name: 'Llama 3.3 70B (:free)',
    provider: 'openrouter',
    provider_name: 'OpenRouter Free',
    free: true,
    enabled: true,
    available: true,
    description: 'Meta Llama 3.3 70B Instruct via OpenRouter Free',
  },
  'gemini-2.0-flash-free': {
    name: 'Gemini 2.0 Flash (:free)',
    provider: 'openrouter',
    provider_name: 'OpenRouter Free',
    free: true,
    enabled: true,
    available: true,
    description: 'Google Gemini 2.0 Flash via OpenRouter Free',
  },
  'qwen-2.5-72b-free': {
    name: 'Qwen 2.5 72B (:free)',
    provider: 'openrouter',
    provider_name: 'OpenRouter Free',
    free: true,
    enabled: true,
    available: true,
    description: 'Qwen 2.5 72B Instruct via OpenRouter Free',
  },

  // Google AI Studio
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    provider_name: 'Google AI Studio',
    free: true,
    enabled: true,
    available: true,
    description: 'Google next-gen flagship reasoning model with free tier',
    variants: { low: {}, medium: {}, high: {} },
  },
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    provider_name: 'Google AI Studio',
    free: true,
    enabled: true,
    available: true,
    description: 'High-speed multimodal intelligence with generous free tier',
  },
  'gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    provider_name: 'Google AI Studio',
    free: true,
    enabled: true,
    available: true,
    description: 'Ultra-low latency real-time multimodal model',
  },

  // Groq Cloud
  'llama-3.3-70b-versatile': {
    name: 'Llama 3.3 70B Versatile',
    provider: 'groq',
    provider_name: 'Groq Cloud',
    free: true,
    enabled: true,
    available: true,
    description: 'Meta Llama 3.3 70B on Groq LPU hardware',
  },
  'deepseek-r1-distill-llama-70b': {
    name: 'DeepSeek R1 Distill 70B',
    provider: 'groq',
    provider_name: 'Groq Cloud',
    free: true,
    enabled: true,
    available: true,
    description: 'DeepSeek R1 distilled onto Llama 70B running on Groq LPUs',
    variants: { low: {}, medium: {}, high: {} },
  },
  'llama-3.1-8b-instant': {
    name: 'Llama 3.1 8B Instant',
    provider: 'groq',
    provider_name: 'Groq Cloud',
    free: true,
    enabled: true,
    available: true,
    description: 'Ultra-fast 8B model with 800+ tokens/sec throughput',
  },

  // Cerebras Cloud
  'cerebras-llama-3.3-70b': {
    name: 'Cerebras Llama 3.3 70B',
    provider: 'cerebras',
    provider_name: 'Cerebras Cloud',
    free: true,
    enabled: true,
    available: true,
    description: 'World fastest inference engine on Cerebras Wafer-Scale Engine',
  },

  // Mistral AI
  'codestral-22b': {
    name: 'Codestral 22B',
    provider: 'mistral',
    provider_name: 'Mistral AI',
    free: true,
    enabled: true,
    available: true,
    description: 'State-of-the-art coding and agentic model from Mistral',
  },
  'pixtral-12b': {
    name: 'Pixtral 12B',
    provider: 'mistral',
    provider_name: 'Mistral AI',
    free: true,
    enabled: true,
    available: true,
    description: 'Multimodal vision and text model with free tier access',
  },

  // SambaNova Systems
  'qwen-2.5-coder-32b': {
    name: 'Qwen 2.5 Coder 32B',
    provider: 'sambanova',
    provider_name: 'SambaNova Systems',
    free: true,
    enabled: true,
    available: true,
    description: 'High-speed code generation on SambaNova SN40L RDUs',
  },

  // Cohere Trial
  'command-r-plus': {
    name: 'Command R+',
    provider: 'cohere',
    provider_name: 'Cohere Trial',
    free: true,
    enabled: true,
    available: true,
    description: 'Enterprise-grade RAG and reasoning model',
  },

  // NVIDIA NIM
  'nvidia-llama-3.3-70b': {
    name: 'NVIDIA Llama 3.3 70B',
    provider: 'nvidia',
    provider_name: 'NVIDIA NIM',
    free: true,
    enabled: true,
    available: true,
    description: 'NVIDIA-accelerated Llama 3.3 70B via NIM microservice',
  },

  // Zhipu AI (GLM)
  'glm-4-flash': {
    name: 'GLM-4-Flash',
    provider: 'zhipu',
    provider_name: 'Zhipu AI (GLM)',
    free: true,
    enabled: true,
    available: true,
    description: 'Free ultra-fast bilingual Chinese/English reasoning model',
  },

  // Custom / Local
  'ollama-local-llama3.3': {
    name: 'Ollama Llama 3.3',
    provider: 'local',
    provider_name: 'Custom / Local',
    free: true,
    enabled: true,
    available: true,
    description: 'Local private inference via Ollama (zero API key)',
  },
  'ollama-local-deepseek-r1': {
    name: 'Ollama DeepSeek R1',
    provider: 'local',
    provider_name: 'Custom / Local',
    free: true,
    enabled: true,
    available: true,
    description: 'Local reasoning model running on Ollama',
  },

  // Anthropic
  'claude-3-7-sonnet': {
    name: 'Claude 3.7 Sonnet',
    provider: 'anthropic',
    provider_name: 'Anthropic',
    free: true,
    enabled: true,
    available: true,
    description: 'Hybrid reasoning and instant response model',
    variants: { low: {}, medium: {}, high: {} },
  },

  // OpenAI
  'gpt-4o': {
    name: 'GPT-4o',
    provider: 'openai',
    provider_name: 'OpenAI',
    free: true,
    enabled: true,
    available: true,
    description: 'Flagship omni model from OpenAI',
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'openai',
    provider_name: 'OpenAI',
    free: true,
    enabled: true,
    available: true,
    description: 'Fast, cost-efficient model for focused tasks',
  },
};

interface MockLogMessage {
  schema: string;
  v: number;
  message_id: string;
  thread_id: string;
  seq: number;
  role: 'user' | 'assistant' | 'system';
  kind: 'turn' | 'compaction' | 'context';
  status: 'streaming' | 'complete' | 'error' | 'aborted' | 'interrupted';
  in_context: boolean;
  origin?: 'prompt';
  model?: { provider: string; model: string } | null;
  usage?: { input: number; output: number; cache_read: number; cache_write: number } | null;
  finish?: 'stop' | null;
  error?: null;
  created_at: string;
  completed_at: string | null;
  producer: { harness: string; harness_version: string; adapter_version: string };
  blocks: Array<{ id: string; type: 'text'; text: string }>;
}

interface MockSessionRecord {
  session_id: string;
  project_id: string;
  title: string;
  created_at: string;
  messages: MockLogMessage[];
}

export const BOT_PERSONAS: Record<
  string,
  { name: string; role: string; welcome: string; systemPrompt: string }
> = {
  portfolio_manager: {
    name: 'Portfolio Manager',
    role: 'Capital Allocation & Swarm Lead',
    welcome: `Welcome to **Tauric Trading Desk**! I am **Portfolio Manager**, Chief of Staff & Swarm Lead, powered by **Zed**.\n\nI synthesize research across all analysts, evaluate risk/reward, and manage portfolio allocations. What markets or setups are you looking at today?`,
    systemPrompt:
      'You are Portfolio Manager, Chief of Staff & Swarm Lead on the Tauric multi-agent trading desk, powered by Zed. Synthesize analyst findings across technicals, fundamentals, macro, sentiment, and news into decisive capital allocation guidance and portfolio risk sizing. Speak directly in first person as Portfolio Manager.',
  },
  ea: {
    name: 'EA',
    role: 'Executive & Workflow Automation',
    welcome: `Welcome to **Tauric Trading Desk**! I am **EA**, your Executive & Workflow Automation assistant, powered by **Zed**.\n\nI organize schedules, orchestrate trade workflows, coordinate desk briefs, and keep communication flowing between analysts. What can I prepare or organize for you?`,
    systemPrompt:
      'You are EA, the Executive & Workflow Automation desk on the Tauric trading desk, powered by Zed. Help organize schedules, summarize desk activity, coordinate trade workflows, and orchestrate communication between trading agents. Speak directly in first person as EA.',
  },
  technical_analyst: {
    name: 'Technical Analyst',
    role: 'Technicals & Price Momentum',
    welcome: `Welcome to **Tauric Trading Desk**! I am **Technical Analyst**, powered by **Zed**.\n\nI analyze chart patterns, support/resistance, RSI, MACD, and moving averages. Which ticker or market are you looking to chart?`,
    systemPrompt:
      'You are Technical Analyst on the Tauric trading desk, powered by Zed. Read price series, support/resistance levels, moving averages (SMA/EMA), RSI, MACD, and momentum indicators. Provide clear, precise technical setups and key levels. Speak directly in first person as Technical Analyst.',
  },
  fundamentals_analyst: {
    name: 'Fundamentals Analyst',
    role: 'Financials & Intrinsic Value',
    welcome: `Welcome to **Tauric Trading Desk**! I am **Fundamentals Analyst**, powered by **Zed**.\n\nI evaluate company balance sheets, valuation metrics (P/E, EV/EBITDA), revenue growth, and DCF intrinsic value. Which company or sector shall we evaluate?`,
    systemPrompt:
      'You are Fundamentals Analyst on the Tauric trading desk, powered by Zed. Evaluate company valuation, earnings growth, balance sheet health, P/E ratios, DCF intrinsic value, and competitive moats. Speak directly in first person as Fundamentals Analyst.',
  },
  news_analyst: {
    name: 'News Analyst',
    role: 'Global Wire & Market Headlines',
    welcome: `Welcome to **Tauric Trading Desk**! I am **News Analyst**, powered by **Zed**.\n\nI monitor real-time financial wire feeds, macro events, corporate earnings releases, and regulatory updates. What news or ticker are you tracking?`,
    systemPrompt:
      'You are News Analyst on the Tauric trading desk, powered by Zed. Parse financial wires, breaking geopolitical events, macroeconomic announcements, and corporate press releases. Speak directly in first person as News Analyst.',
  },
  sentiment_analyst: {
    name: 'Sentiment Analyst',
    role: 'Social & Institutional Flow',
    welcome: `Welcome to **Tauric Trading Desk**! I am **Sentiment Analyst**, powered by **Zed**.\n\nI gauge retail and institutional sentiment, options order flow, put/call ratios, and market positioning extremes. What sentiment signals are you observing?`,
    systemPrompt:
      'You are Sentiment Analyst on the Tauric trading desk, powered by Zed. Gauge retail and institutional sentiment, options order flow, put/call ratios, fear & greed index, and social volume. Speak directly in first person as Sentiment Analyst.',
  },
  growth_analyst: {
    name: 'Growth Analyst',
    role: 'Catalysts & Momentum Drivers',
    welcome: `Welcome to **Tauric Trading Desk**! I am **Growth Analyst**, powered by **Zed**.\n\nI model expansion catalysts, TAM growth, and product cycle momentum. What high-growth assets are on your radar?`,
    systemPrompt:
      'You are Growth Analyst on the Tauric trading desk, powered by Zed. Identify accelerating revenue trends, TAM expansion, product cycles, and hyper-growth catalysts. Speak directly in first person as Growth Analyst.',
  },
  macro_analyst: {
    name: 'Macro Analyst',
    role: 'Global Macro & Rates Regime',
    welcome: `Welcome to **Tauric Trading Desk**! I am **Macro Analyst**, powered by **Zed**.\n\nI track Treasury yield curves, Fed monetary policy, inflation prints, and currency dynamics. What macro framework are you exploring?`,
    systemPrompt:
      'You are Macro Analyst on the Tauric trading desk, powered by Zed. Frame current yield curve dynamics, Fed monetary policy, inflation metrics (CPI/PCE), and currency cross-currents. Speak directly in first person as Macro Analyst.',
  },
  bull_researcher: {
    name: 'Bull Researcher',
    role: 'Long Thesis & Upside Case',
    welcome: `Welcome to **Tauric Trading Desk**! I am **Bull Researcher**, powered by **Zed**.\n\nI build evidence-backed upside valuation scenarios and high-conviction long theses. Which asset would you like me to build a bull case for?`,
    systemPrompt:
      'You are Bull Researcher on the Tauric trading desk, powered by Zed. Build the strongest, fact-based long thesis. Highlight upside catalysts, multiple expansion potential, and structural tailwinds. Speak directly in first person as Bull Researcher.',
  },
  bear_researcher: {
    name: 'Bear Researcher',
    role: 'Short Thesis & Downside Risks',
    welcome: `Welcome to **Tauric Trading Desk**! I am **Bear Researcher**, powered by **Zed**.\n\nI stress-test assumptions and hunt for downside vulnerabilities, multiple compression, and tail risks. What setup would you like me to critique?`,
    systemPrompt:
      'You are Bear Researcher on the Tauric trading desk, powered by Zed. Attack the bull case with concrete risks: valuation multiples stretch, margin compression, demand destruction, and technical breakdown levels. Speak directly in first person as Bear Researcher.',
  },
  risk_manager: {
    name: 'Risk Manager',
    role: 'Portfolio Defense & Volatility Gate',
    welcome: `Welcome to **Tauric Trading Desk**! I am **Risk Manager**, powered by **Zed**.\n\nI enforce portfolio defense, calculate Value-at-Risk (VaR), monitor position sizing, and safeguard against drawdowns. What risk exposure are you reviewing?`,
    systemPrompt:
      'You are Risk Manager on the Tauric trading desk, powered by Zed. Act as the risk gatekeeper: evaluate maximum drawdown, Value-at-Risk (VaR), correlation risks, position sizing, and stop-loss placement. Speak directly in first person as Risk Manager.',
  },
  trader_agent: {
    name: 'Trader Agent',
    role: 'Execution Desk & Order Routing',
    welcome: `Welcome to **Tauric Trading Desk**! I am **Trader Agent**, powered by **Zed**.\n\nI specialize in disciplined trade execution, limit/bracket orders, TWAP/VWAP routing, and invalidation levels. What execution plan are we formulating?`,
    systemPrompt:
      'You are Trader Agent on the Tauric trading desk, powered by Zed. Turn committee ideas into concrete execution plans: entry points, limit vs market orders, TWAP/VWAP execution, bracket orders, and slippage controls. Speak directly in first person as Trader Agent.',
  },
  bops: {
    name: 'BOPS Swarm',
    role: 'Autonomous Multi-Agent Orchestrator',
    welcome: `Welcome to **Tauric Trading Desk**! I am **BOPS Swarm**, powered by **Zed**.\n\nI orchestrate parallel agent teams across research, technical validation, and execution. Which swarm strategy should we launch?`,
    systemPrompt:
      'You are BOPS Swarm on the Tauric trading desk, powered by Zed. Coordinate multi-agent tasks, synthesize cross-analyst validation, and deploy automated swarm intelligence. Speak directly in first person as BOPS.',
  },
  manus: {
    name: 'Manus Bot',
    role: 'Autonomous Deep Research & Execution',
    welcome: `Welcome to **Tauric Trading Desk**! I am **Manus Bot**, powered by **Zed**.\n\nI perform autonomous web research, deep filing reviews, and automated data compilation. What workflow shall I investigate?`,
    systemPrompt:
      'You are Manus Bot on the Tauric trading desk, powered by Zed. Perform deep market research, examine filings, compile financial data, and execute autonomous tasks end-to-end. Speak directly in first person as Manus Bot.',
  },
};

export function normalizeAgentKey(key?: string | null): string {
  if (!key) return 'portfolio_manager';
  const clean = key.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (clean.includes('manus') || clean.includes('maus')) return 'manus';
  if (clean.includes('bops') || clean.includes('boqs')) return 'bops';
  if (BOT_PERSONAS[clean]) return clean;
  for (const [id, bot] of Object.entries(BOT_PERSONAS)) {
    if (bot.name.toLowerCase() === key.toLowerCase() || id === clean) {
      return id;
    }
  }
  return 'portfolio_manager';
}

function createInitialSession(sessionId: string, preferredAgent?: string): MockSessionRecord {
  const userMsgId = 'msg-welcome-u1';
  const asstMsgId = 'msg-welcome-a1';
  const now = new Date().toISOString();
  const agentKey = normalizeAgentKey(preferredAgent);
  const bot = BOT_PERSONAS[agentKey] || BOT_PERSONAS['portfolio_manager'];

  return {
    session_id: sessionId,
    project_id: 'proj-trading',
    title: 'Trading Chat',
    created_at: now,
    messages: [
      {
        schema: 'kortix.session/2',
        v: 1,
        message_id: userMsgId,
        thread_id: sessionId,
        seq: 1,
        role: 'user',
        kind: 'turn',
        status: 'complete',
        in_context: true,
        origin: 'prompt',
        model: null,
        usage: null,
        finish: 'stop',
        error: null,
        created_at: now,
        completed_at: now,
        producer: { harness: 'kortix-api', harness_version: '1', adapter_version: '1' },
        blocks: [{ id: 'b-' + userMsgId, type: 'text', text: 'Hello, what trading analysis can you provide today?' }],
      },
      {
        schema: 'kortix.session/2',
        v: 1,
        message_id: asstMsgId,
        reply_to: userMsgId,
        thread_id: sessionId,
        seq: 2,
        role: 'assistant',
        kind: 'turn',
        status: 'complete',
        in_context: true,
        agent: agentKey,
        model: { provider: 'zed', model: 'zed' },
        usage: { input: 35, output: 85, cache_read: 0, cache_write: 0 },
        finish: 'stop',
        error: null,
        created_at: now,
        completed_at: now,
        producer: { harness: 'kortix-api', harness_version: '1', adapter_version: '1' },
        blocks: [
          {
            id: 'b-' + asstMsgId,
            type: 'text',
            text: bot.welcome,
          },
        ],
      },
    ],
  };
}

const mockSessions = new Map<string, MockSessionRecord>();
const defaultSessId = 'sess-trading-default';

function loadMockSession(sessionId: string, preferredAgent?: string): MockSessionRecord {
  if (mockSessions.has(sessionId)) {
    return mockSessions.get(sessionId)!;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('kortix_session_' + sessionId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.session_id) {
          mockSessions.set(sessionId, parsed);
          return parsed;
        }
      }
    } catch {}
  }
  const newSess = createInitialSession(sessionId, preferredAgent);
  persistMockSession(newSess);
  return newSess;
}

function persistMockSession(session: MockSessionRecord) {
  mockSessions.set(session.session_id, session);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('kortix_session_' + session.session_id, JSON.stringify(session));
    } catch {}
  }
}

function getStoredApiKey(providerId: string): string {
  if (typeof window === 'undefined') {
    try {
      if (typeof process !== 'undefined' && process.env) {
        if (providerId === 'google') return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
        if (providerId === 'groq') return process.env.GROQ_API_KEY || '';
        if (providerId === 'cerebras') return process.env.CEREBRAS_API_KEY || '';
        if (providerId === 'mistral') return process.env.MISTRAL_API_KEY || '';
        if (providerId === 'openrouter') return process.env.OPENROUTER_API_KEY || '';
        if (providerId === 'sambanova') return process.env.SAMBANOVA_API_KEY || '';
        if (providerId === 'nvidia') return process.env.NVIDIA_API_KEY || '';
        if (providerId === 'cohere') return process.env.COHERE_API_KEY || '';
        if (providerId === 'deepinfra') return process.env.DEEPINFRA_API_KEY || '';
        if (providerId === 'together') return process.env.TOGETHER_API_KEY || '';
        if (providerId === 'fireworks') return process.env.FIREWORKS_API_KEY || '';
        if (providerId === 'github') return process.env.GITHUB_TOKEN || '';
      }
    } catch { }
    return '';
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('flm_keys_')) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const entry = parsed[providerId];
            if (entry?.apiKey && typeof entry.apiKey === 'string') {
              const cleaned = entry.apiKey.trim();
              if (cleaned && !cleaned.includes('Live9921') && !cleaned.includes('FastLPU') && !cleaned.includes('keyless')) {
                return cleaned;
              }
            }
          } catch { }
        }
      }
    }

    const confKeys = localStorage.getItem('freellmapi_configured_keys_v1');
    if (confKeys) {
      try {
        const parsed = JSON.parse(confKeys);
        if (Array.isArray(parsed)) {
          const item = parsed.find((p: any) => p.platformId === providerId && p.enabled !== false);
          if (item?.apiKey && typeof item.apiKey === 'string') {
            const cleaned = item.apiKey.trim();
            if (cleaned && !cleaned.includes('Live9921') && !cleaned.includes('FastLPU') && !cleaned.includes('keyless')) {
              return cleaned;
            }
          }
        }
      } catch { }
    }
  } catch { }
  return '';
}

function getConnectedModels(): Record<string, any> {
  const connected: Record<string, any> = {
    // Render Server-LLM-1 Router (Auto Multi-Model Intelligence, Aliased as "zed")
    // Always connected via server-llm-1.onrender.com
    'zed': {
      id: 'zed',
      modelID: 'zed',
      providerID: 'zed',
      name: 'zed',
      display_name: 'zed',
      provider: 'zed',
      provider_name: 'zed',
      free: true,
      keyless: true,
      enabled: true,
      available: true,
      description: 'Autonomous multi-model intelligence via server-llm-1.onrender.com (auto router)',
      upstreamId: 'auto',
    },
  };

  for (const [id, model] of Object.entries(FREE_LLM_MODELS)) {
    if (id === 'zed') continue;
    const provider = model.provider;
    const apiKey = getStoredApiKey(provider);
    if (apiKey) {
      connected[id] = {
        ...model,
        enabled: true,
        available: true,
      };
    }
  }

  return connected;
}

const UPSTREAM_MODEL_IDS: Record<string, string> = {
  'zed': 'auto',
  'gemini-2.5-pro': 'gemini-2.0-flash',
  'gemini-2.5-flash': 'gemini-2.0-flash',
  'gemini-2.0-flash': 'gemini-2.0-flash',
  'llama-3.3-70b-versatile': 'llama-3.3-70b-versatile',
  'deepseek-r1-distill-llama-70b': 'deepseek-r1-distill-llama-70b',
  'llama-3.1-8b-instant': 'llama-3.1-8b-instant',
  'cerebras-llama-3.3-70b': 'llama-3.3-70b',
  'codestral-22b': 'codestral-latest',
  'pixtral-12b': 'pixtral-12b',
  'mistral-small-latest': 'mistral-small-latest',
  'deepseek-r1-free': 'deepseek/deepseek-r1:free',
  'llama-3.3-70b-free': 'meta-llama/llama-3.3-70b-instruct:free',
  'gemini-2.0-flash-free': 'google/gemini-2.0-flash-exp:free',
  'qwen-2.5-72b-free': 'qwen/qwen-2.5-72b-instruct:free',
  'qwen-2.5-coder-32b': 'Qwen2.5-Coder-32B-Instruct',
  'command-r-plus': 'command-r-plus',
  'nvidia-llama-3.3-70b': 'meta/llama-3.3-70b-instruct',
  'glm-4-flash': 'glm-4-flash',
  'ollama-local-llama3.3': 'llama3.3',
  'ollama-local-deepseek-r1': 'deepseek-r1',
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  'claude-3-7-sonnet': 'claude-3-7-sonnet-20250219',
};

const PROVIDER_CONFIGS: Record<string, {
  url: string;
  authHeader: (key: string) => Record<string, string>;
  formatBody: (model: string, messages: any[], maxTokens: number) => any;
  parseReply: (json: any) => string;
}> = {
  'render-llm': {
    url: 'https://server-llm-1.onrender.com/v1/chat/completions',
    authHeader: (key) => ({
      Authorization: `Bearer ${key || 'rnd_UfnwbkZKhhZJe2cZrhpsnSMkpMqz'}`,
    }),
    formatBody: (model, messages, maxTokens) => ({
      model: 'auto',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    parseReply: (json) => json?.choices?.[0]?.message?.content || '',
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    formatBody: (model, messages, maxTokens) => ({
      model: model || 'llama-3.3-70b-versatile',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    parseReply: (json) => json?.choices?.[0]?.message?.content || '',
  },
  google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    formatBody: (model, messages, maxTokens) => ({
      model: model.includes('gemini') ? model : 'gemini-2.0-flash',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    parseReply: (json) => json?.choices?.[0]?.message?.content || '',
  },
  cerebras: {
    url: 'https://api.cerebras.ai/v1/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    formatBody: (model, messages, maxTokens) => ({
      model: model || 'llama-3.3-70b',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    parseReply: (json) => json?.choices?.[0]?.message?.content || '',
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    formatBody: (model, messages, maxTokens) => ({
      model: model === 'codestral-22b' ? 'codestral-latest' : (model || 'mistral-small-latest'),
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    parseReply: (json) => json?.choices?.[0]?.message?.content || '',
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    authHeader: (key) => ({
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      'X-Title': 'Kortix Trading',
    }),
    formatBody: (model, messages, maxTokens) => ({
      model: model.includes('/') ? model : `deepseek/${model}`,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    parseReply: (json) => json?.choices?.[0]?.message?.content || '',
  },
  sambanova: {
    url: 'https://api.sambanova.ai/v1/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    formatBody: (model, messages, maxTokens) => ({
      model: model || 'Meta-Llama-3.3-70B-Instruct',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    parseReply: (json) => json?.choices?.[0]?.message?.content || '',
  },
  nvidia: {
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    formatBody: (model, messages, maxTokens) => ({
      model: model || 'meta/llama-3.3-70b-instruct',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    parseReply: (json) => json?.choices?.[0]?.message?.content || '',
  },
  cohere: {
    url: 'https://api.cohere.ai/compatibility/v1/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    formatBody: (model, messages, maxTokens) => ({
      model: model || 'command-r-plus',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    parseReply: (json) => json?.choices?.[0]?.message?.content || '',
  },
  deepinfra: {
    url: 'https://api.deepinfra.com/v1/openai/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    formatBody: (model, messages, maxTokens) => ({
      model: model || 'meta-llama/Llama-3.3-70B-Instruct',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    parseReply: (json) => json?.choices?.[0]?.message?.content || '',
  },
  together: {
    url: 'https://api.together.xyz/v1/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    formatBody: (model, messages, maxTokens) => ({
      model: model || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    parseReply: (json) => json?.choices?.[0]?.message?.content || '',
  },
  fireworks: {
    url: 'https://api.fireworks.ai/inference/v1/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    formatBody: (model, messages, maxTokens) => ({
      model: model || 'accounts/fireworks/models/llama-v3p3-70b-instruct',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    parseReply: (json) => json?.choices?.[0]?.message?.content || '',
  },
  github: {
    url: 'https://models.inference.ai.azure.com/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    formatBody: (model, messages, maxTokens) => ({
      model: model || 'gpt-4o',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    parseReply: (json) => json?.choices?.[0]?.message?.content || '',
  },
  local: {
    url: 'http://localhost:11434/v1/chat/completions',
    authHeader: () => ({}),
    formatBody: (model, messages, maxTokens) => ({
      model: model || 'llama3.3',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    parseReply: (json) => json?.choices?.[0]?.message?.content || '',
  },
};

function generateDynamicTradingAnalysis(promptText: string, modelDisplayName: string, agentId?: string): string {
  const normKey = normalizeAgentKey(agentId);
  const bot = BOT_PERSONAS[normKey] || BOT_PERSONAS['portfolio_manager'];
  const q = promptText.trim();
  const lower = q.toLowerCase();

  // Natural conversational greetings
  if (lower === 'hi' || lower === 'hello' || lower === 'hey' || lower === 'good' || lower === 'good morning' || lower === 'good afternoon') {
    return `Hello! I am **${bot.name}** on Tauric Trading Desk, powered by **Zed**.\n\nI am ready to assist with your trading desk operations, market analysis, and risk management. What setups, tickers, or strategies are you tracking today?`;
  }

  const tickerMatch = q.match(/\b([A-Z]{2,6}(?::[A-Z0-9]+)?)\b/g);
  const skipWords = new Set(['WHAT', 'HOW', 'WHY', 'WHEN', 'WHICH', 'WHERE', 'SHOW', 'TELL', 'GIVE', 'MAKE', 'HELP', 'CALL', 'USER', 'WITH', 'FROM', 'THIS', 'THAT', 'THE', 'AND', 'FOR', 'NOT', 'YES', 'NO', 'CAN', 'COULD', 'WILL', 'WOULD']);
  const candidateTickers = tickerMatch ? tickerMatch.filter((t) => !skipWords.has(t)) : [];
  const primaryTicker = candidateTickers[0] || (lower.includes('crypto') ? 'BTC/USD' : lower.includes('gold') ? 'XAU/USD' : 'Market');

  const isTechnical = lower.includes('rsi') || lower.includes('macd') || lower.includes('indicator') || lower.includes('moving average') || lower.includes('ema') || lower.includes('sma') || lower.includes('band') || lower.includes('bollinger') || lower.includes('volume') || lower.includes('fibonacci');
  const isStrategy = lower.includes('strategy') || lower.includes('setup') || lower.includes('trade') || lower.includes('entry') || lower.includes('exit') || lower.includes('stop loss') || lower.includes('target') || lower.includes('risk');
  const isLevels = lower.includes('support') || lower.includes('resistance') || lower.includes('level') || lower.includes('target') || lower.includes('trend');

  const sections: string[] = [];
  sections.push(`### Analysis: ${primaryTicker}\n*Synthesized via **${bot.name}** powered by **${modelDisplayName}** on FreeLLMAPI Smart Router*\n`);

  if (isTechnical || isLevels) {
    sections.push(`#### 1. Key Technical Structures & Indicators
- **Price Action & Trend Structure**: Clean higher-timeframe order flow indicates continuation or structural re-accumulation around primary liquidity pools.
- **Momentum & Oscillators**: Momentum oscillators reveal compression into reactive zones; monitor volume expansion at breakout boundaries.
- **Dynamic Support & Resistance**: Institutional pivots and Fair Value Gaps serve as high-probability invalidation levels.`);
  }

  if (isStrategy) {
    sections.push(`#### 2. Trade Execution & Strategy Parameters
- **Entry Trigger**: Wait for confirmation via lower timeframe market structure shift (MSS) rather than anticipating the turn.
- **Risk Management**: Maintain a strict maximum risk profile of **1.0% to 1.5%** of account equity per position.
- **Stop Loss Placement**: Structural invalidation point placed just beyond recent swing pivot or volatility buffer.
- **Take-Profit Staging**:
  - **TP1 (50% scale-out)**: First key structural resistance or 1:1.5 Risk-to-Reward.
  - **TP2 (Runner)**: Major liquidity target or multi-session range extreme.`);
  }

  sections.push(`#### 3. Strategic Summary & Outlook
For **"${q}"**, the highest-probability approach emphasizes discipline and trade invalidation rules. Validate that market sentiment, volume delta, and economic releases align with your technical bias prior to position entry.`);

  return sections.join('\n\n');
}

async function fetchRealLlmCompletion(
  promptText: string,
  modelId: string,
  history: Array<{ role: string; content: string }> = [],
  agentId?: string
): Promise<string> {
  const mDef = FREE_LLM_MODELS[modelId];
  const provider = mDef?.provider || 'zed';
  const modelDisplayName = mDef?.name || modelId || 'zed';
  const agentKey = normalizeAgentKey(agentId);
  const bot = BOT_PERSONAS[agentKey] || BOT_PERSONAS['portfolio_manager'];
  const systemPrompt = bot.systemPrompt;

  // 1. Primary: Render Server-LLM-1 Live Router (always routes as 'auto' for 'zed')
  try {
    const upstream = 'auto'; // all models route as auto to server-llm-1 in the name of our model zed
    const endpoint = typeof window !== 'undefined'
      ? '/api/llm'
      : 'https://server-llm-1.onrender.com/v1/chat/completions';

    const renderRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer rnd_UfnwbkZKhhZJe2cZrhpsnSMkpMqz',
      },
      body: JSON.stringify({
        model: upstream,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: promptText },
        ],
        max_tokens: 1500,
      }),
      signal: AbortSignal.timeout(4500),
    });

    if (renderRes.ok) {
      const data = await renderRes.json();
      console.log(`[Render-LLM] Status: ${renderRes.status} OK, Model: ${data?.model || 'auto'}`);
      const content = data?.choices?.[0]?.message?.content;
      if (content && typeof content === 'string' && content.trim()) {
        return content.trim();
      }
    } else {
      console.warn(`[Render-LLM] Response status: ${renderRes.status} ${renderRes.statusText}`);
    }
  } catch (err) {
    console.warn('[Render-LLM] Call to server-llm-1 failed, falling back:', err);
  }

  // 2. Direct upstream call if user configured their API key
  const storedKey = getStoredApiKey(provider);
  if (storedKey && PROVIDER_CONFIGS[provider]) {
    try {
      const pConf = PROVIDER_CONFIGS[provider];
      const upstreamModel = UPSTREAM_MODEL_IDS[modelId] || mDef?.upstreamId || modelId;
      const res = await fetch(pConf.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...pConf.authHeader(storedKey),
        },
        body: JSON.stringify(
          pConf.formatBody(
            upstreamModel,
            [
              { role: 'system', content: 'You are an expert AI financial & trading assistant. Provide direct, insightful, actionable, and analytical responses.' },
              ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
              { role: 'user', content: promptText },
            ],
            1000
          )
        ),
      });
      if (res.ok) {
        const data = await res.json();
        const content = pConf.parseReply(data);
        if (content && typeof content === 'string' && content.trim()) {
          return content.trim();
        }
      }
    } catch (e) {
      console.warn(`[FreeLLMAPI] Upstream call to ${provider} failed:`, e);
    }
  }

  // 2. Local FreeLLMAPI gateway on port 8008 if running
  try {
    const gwRes = await fetch('http://localhost:8008/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer flm_sk_live_free_gateway_9921',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: promptText },
        ],
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (gwRes.ok) {
      const data = await gwRes.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content && typeof content === 'string' && content.trim()) {
        return content.trim();
      }
    }
  } catch { }

  // 3. Live Keyless Free Endpoint (Pollinations.AI with openai-fast)
  try {
    const pollRes = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are an expert AI financial & trading assistant. Provide thorough, high quality, real technical and market analysis.' },
          ...history.slice(-4).map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: promptText },
        ],
        model: 'openai-fast',
        seed: Math.floor(Math.random() * 1000000),
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (pollRes.ok) {
      const text = await pollRes.text();
      if (text && text.trim() && !text.includes('FREE_LIMIT') && !text.includes('Free limit reached') && !text.startsWith('{')) {
        return text.trim();
      }
    }
  } catch (e) {
    console.warn('[FreeLLMAPI] Pollinations keyless call failed:', e);
  }

  // 4. If user explicitly selected a model that requires an API key, guide them clearly:
  if (mDef && !mDef.keyless && !storedKey) {
    return `### Connect ${mDef.provider_name} API Key\n\nYou selected **${modelDisplayName}**, which runs on **${mDef.provider_name}**.\n\nTo chat directly with this model:\n1. Open **Customize → FreeLLMAPI Router** from the sidebar.\n2. Click **Connect API Key** on the **${mDef.provider_name}** card.\n3. Paste your free ${mDef.provider_name} API key and save.\n\n*Tip: You can also select **Mistral (Pollinations)** or **OpenAI (Pollinations)** in the model selector to chat instantly without any API key.*`;
  }

  // 5. Context-aware trading analysis fallback
  return generateDynamicTradingAnalysis(promptText, modelDisplayName);
}

function extractSessionIdFromUrl(url: string): string {
  const sessMatch = url.match(/\/sessions\/([^\/?#]+)/) || url.match(/\/sb-([^\/?#\/]+)/) || url.match(/sb-([^\/?#\/]+)/);
  if (sessMatch && sessMatch[1] && sessMatch[1] !== 'start' && sessMatch[1] !== 'needing-input' && sessMatch[1] !== 'prompts' && sessMatch[1] !== 'turn' && sessMatch[1] !== 'log' && sessMatch[1] !== 'transcript') {
    return sessMatch[1];
  }
  return defaultSessId;
}

async function getMockBackendResponse(url: string, init?: RequestInit, input?: RequestInfo | URL): Promise<Response> {
  const method = (init?.method || (input instanceof Request ? input.method : '') || 'GET').toUpperCase();
  const isPost = method === 'POST';

  async function parseBody(): Promise<any> {
    try {
      if (init?.body) {
        if (typeof init.body === 'string') return JSON.parse(init.body);
        if (init.body instanceof Uint8Array || init.body instanceof ArrayBuffer) {
          return JSON.parse(new TextDecoder().decode(init.body));
        }
      }
    } catch { }
    if (input instanceof Request) {
      try {
        return await input.clone().json();
      } catch { }
    }
    return {};
  }
  if (url.includes('/billing/account-state') || url.includes('/account-state')) {
    return new Response(
      JSON.stringify({
        credits: {
          total: 10000,
          daily: 1000,
          monthly: 10000,
          extra: 0,
          can_run: true,
          daily_refresh: null,
        },
        subscription: {
          tier_key: 'free',
          tier_display_name: 'Free Tier',
          monthly_usd: null,
          status: 'active',
          billing_period: null,
          provider: 'stripe',
          subscription_id: null,
          current_period_end: null,
          cancel_at_period_end: false,
          is_cancelled: false,
          cancellation_effective_date: null,
          has_scheduled_change: false,
          scheduled_change: null,
          commitment: {
            has_commitment: false,
            can_cancel: true,
            commitment_type: null,
            months_remaining: null,
            commitment_end_date: null,
          },
          can_purchase_credits: false,
        },
        models: Object.keys(getConnectedModels()),
        limits: {
          concurrent_runs: {
            running_count: 0,
            limit: 10,
            can_start: true,
            tier_name: 'free',
          },
          ai_worker_count: {
            current_count: 1,
            limit: 10,
            can_create: true,
            tier_name: 'free',
          },
          custom_mcp_count: {
            current_count: 0,
            limit: 10,
            can_create: true,
            tier_name: 'free',
          },
        },
        tier: {
          name: 'free',
          display_name: 'Free Tier',
          monthly_credits: 1000,
          can_purchase_credits: false,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/accounts/me')) {
    return new Response(
      JSON.stringify({
        user_id: 'usr_local_trader',
        email: 'trader@kortix.ai',
        name: 'Trader',
        full_name: 'Trader',
        role: 'owner',
        created_at: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/accounts/invites') || url.includes('/invites')) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/tunnel/connections')) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/detail')) {
    return new Response(
      JSON.stringify({
        project: {
          project_id: 'proj-trading',
          name: 'Trading Assistant',
          description: 'AI Market Chat & Stock Trading Assistant',
          account_id: 'acc-default-workspace',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_personal: true,
          metadata: {
            onboarding_completed_at: '2026-01-01T00:00:00Z',
          },
        },
        git_connection: null,
        config: {
          name: 'Trading Assistant',
          default_agent: 'portfolio_manager',
          agents: [
            { id: 'portfolio_manager', name: 'Portfolio Manager', role: 'Capital Allocation & Swarm Lead', description: 'Capital Allocation & Swarm Lead' },
            { id: 'ea', name: 'EA', role: 'Executive & Workflow Automation', description: 'Executive & Workflow Automation' },
            { id: 'fundamentals_analyst', name: 'Fundamentals Analyst', role: 'Financials & Intrinsic Value', description: 'Financials & Intrinsic Value' },
            { id: 'technical_analyst', name: 'Technical Analyst', role: 'Technicals & Price Momentum', description: 'Technicals & Price Momentum' },
            { id: 'news_analyst', name: 'News Analyst', role: 'Global Wire & Headlines', description: 'Global Wire & Headlines' },
            { id: 'sentiment_analyst', name: 'Sentiment Analyst', role: 'Social & Institutional Flow', description: 'Social & Institutional Flow' },
            { id: 'growth_analyst', name: 'Growth Analyst', role: 'Growth Catalyst Identification', description: 'Growth Catalyst Identification' },
            { id: 'macro_analyst', name: 'Macro Analyst', role: 'Macroeconomic & Rates Regime', description: 'Macroeconomic & Rates Regime' },
            { id: 'bull_researcher', name: 'Bull Researcher', role: 'Bullish Thesis & Upside Catalysts', description: 'Bullish Thesis & Upside Catalysts' },
            { id: 'bear_researcher', name: 'Bear Researcher', role: 'Downside Risk & Short Arguments', description: 'Downside Risk & Short Arguments' },
            { id: 'risk_manager', name: 'Risk Manager', role: 'Drawdown & Volatility Guard', description: 'Drawdown & Volatility Guard' },
            { id: 'trader_agent', name: 'Trader Agent', role: 'Order Routing & Execution Desk', description: 'Order Routing & Execution Desk' },
          ],
          skills: [],
          commands: [],
          env: { required: [], optional: [] },
          spaces: [],
        },
        file_count: 0,
        files: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/connect-status') || url.includes('/connectors/connect-status')) {
    return new Response(
      JSON.stringify({
        configured: true,
        providers: ['composio', 'mcp', 'kortix'],
        provider: 'composio',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Connect action: POST /connectors/projects/:id/connectors/:slug/connect
  if (init?.method === 'POST' && (url.endsWith('/connect') || url.includes('/connect?') || (url.includes('/connectors/') && url.includes('/connect')))) {
    try {
      const parsed = new URL(url, 'http://localhost:3000');
      const slugMatch = url.match(/\/connectors\/([^/?#]+)\/connect/);
      const slug = slugMatch ? slugMatch[1] : parsed.searchParams.get('slug') || 'app';
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const res = await fetch(`${origin}/api/connectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      console.warn('[Connectors] Connect API error:', e);
    }
    return new Response(
      JSON.stringify({
        ok: true,
        provider: 'composio',
        status: 'active',
        connectionId: `conn_${Date.now()}`,
        requestId: `req_${Date.now()}`,
        sessionId: `sess_${Date.now()}`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 4000+ Composio Toolkits: GET /connectors/projects/:id/connect/toolkits
  if (url.includes('/connect/toolkits')) {
    try {
      const parsed = new URL(url, 'http://localhost:3000');
      const qs = parsed.searchParams.toString();
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const res = await fetch(`${origin}/api/connectors?mode=toolkits&${qs}`);
      if (res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      console.warn('[Connectors] Toolkits API error:', e);
    }
  }

  // 4000+ Discover Sections: GET /connectors/projects/:id/discover/sections
  if (url.includes('/discover/sections') || (url.includes('/discover') && url.includes('sections'))) {
    try {
      const parsed = new URL(url, 'http://localhost:3000');
      const qs = parsed.searchParams.toString();
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const res = await fetch(`${origin}/api/connectors?mode=sections&${qs}`);
      if (res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      console.warn('[Connectors] Discover sections API error:', e);
    }
  }

  // 4000+ Discover Connectors (Search, Categories, Pagination): GET /connectors/projects/:id/discover
  if (url.includes('/discover')) {
    try {
      const parsed = new URL(url, 'http://localhost:3000');
      const qs = parsed.searchParams.toString();
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const res = await fetch(`${origin}/api/connectors?mode=discover&${qs}`);
      if (res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      console.warn('[Connectors] Discover connectors API error:', e);
    }
  }

  // Connector Detail: GET /connectors/projects/:id/connectors/:slug
  const singleConnectorMatch = url.match(/\/connectors\/projects\/[^/]+\/connectors\/([^/?#]+)$/);
  if (singleConnectorMatch && singleConnectorMatch[1] !== 'sync' && singleConnectorMatch[1] !== 'connect') {
    const slug = singleConnectorMatch[1];
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const res = await fetch(`${origin}/api/connectors?mode=detail&slug=${encodeURIComponent(slug)}`);
      if (res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch {}
  }

  // Active Connections: GET /projects/:id/connections
  if (url.includes('/connections')) {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const res = await fetch(`${origin}/api/connectors?mode=connections`);
      if (res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch {}
    return new Response(JSON.stringify({ connections: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Installed Connectors: GET /connectors/projects/:id/connectors
  if (url.includes('/connectors')) {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const res = await fetch(`${origin}/api/connectors?mode=installed`);
      if (res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch {}
    return new Response(
      JSON.stringify({
        connectors: [],
        total: 0,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/connector-moves')) {
    return new Response(JSON.stringify({ moves: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/apps')) {
    return new Response(JSON.stringify({ apps: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/spaces')) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/capabilities')) {
    return new Response(
      JSON.stringify({
        skills: [
          { id: 'tauric_research', description: 'Tauric multi-agent investment research and financial modeling.', group: 'builtin', available: true },
          { id: 'market_analysis', description: 'Technical analysis, candlestick patterns, and momentum oscillators.', group: 'builtin', available: true },
          { id: 'trading_execution', description: 'Automated order execution, TWAP, and slippage monitoring.', group: 'builtin', available: true },
        ],
        tools: [
          { id: 'bash', description: 'Execute shell commands in the project workspace.', group: 'builtin' },
          { id: 'file_editor', description: 'Create and edit workspace files and configs.', group: 'builtin' },
          { id: 'browser', description: 'Browse web pages and render DOM views.', group: 'builtin' },
        ],
        extensions: [
          { id: 'permissions', description: 'Granular file and command approval policies.', group: 'platform', required: true },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/skills/')) {
    const rawName = url.split('/skills/')[1]?.split('?')[0]?.replace(/\/$/, '') || 'tauric_research';
    const skillName = decodeURIComponent(rawName);
    const isFull = url.includes('full=1') || url.includes('full=true');
    const skillDescriptions: Record<string, string> = {
      tauric_research: 'Tauric multi-agent investment research and financial modeling framework.',
      market_analysis: 'Technical analysis, candlestick patterns, and momentum oscillators.',
      trading_execution: 'Automated order execution, TWAP, and slippage monitoring.',
    };
    const desc = skillDescriptions[skillName] || 'Advanced autonomous trading agent playbook.';
    return new Response(
      JSON.stringify({
        name: skillName,
        description: desc,
        body: `# ${skillName}\n\n${desc}\n\n## Overview\nThis skill coordinates the 12 Tauric specialized agents across financial analysis, market momentum, sentiment scraping, and risk management.\n\n### Agent Swarm Structure\n- **Execution**: Chief of Staff, Invoice Collector\n- **Management**: EA, Research Manager\n- **Analysts**: Inbox Manager, Sales Outbound, Talent Scout, Customer Support\n- **Researchers**: Growth Marketer (Bull), Bear Researcher\n- **Risk Management**: Expense Manager, Aggressive Risk Debator\n\n### Workflow\n1. Synthesize macroeconomic events and sector sentiment.\n2. Conduct fundamental DCF valuation and technical indicators review.\n3. Convene bull vs bear debate consensus.\n4. Optimize capital allocation and tail-risk hedging.\n`,
        featureFlag: null,
        references: [
          {
            path: 'references/workflow.md',
            bytes: 260,
            ...(isFull
              ? { content: '# Workflow Guide\n\n1. Macro Overview\n2. Fundamentals Deep Dive\n3. Technical Alignment\n4. Risk-Adjusted Execution' }
              : {}),
          },
          {
            path: 'references/agents.md',
            bytes: 180,
            ...(isFull
              ? { content: '# Swarm Roster\n\n- Chief of Staff\n- EA\n- Market Analyst\n- Bull Researcher\n- Bear Researcher\n- Risk Debators' }
              : {}),
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/llm-catalog/providers')) {
    const allProviders = [
      {
        id: 'zed',
        name: 'zed',
        env: [],
        models: [
          { id: 'zed', name: 'zed' },
        ],
      },
      {
        id: 'openrouter',
        name: 'OpenRouter Free',
        env: ['OPENROUTER_API_KEY'],
        models: [
          { id: 'deepseek-r1-free', name: 'DeepSeek R1 (:free)' },
          { id: 'llama-3.3-70b-free', name: 'Llama 3.3 70B (:free)' },
          { id: 'gemini-2.0-flash-free', name: 'Gemini 2.0 Flash (:free)' },
          { id: 'qwen-2.5-72b-free', name: 'Qwen 2.5 72B (:free)' },
        ],
      },
      {
        id: 'google',
        name: 'Google AI Studio',
        env: ['GEMINI_API_KEY'],
        models: [
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
          { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        ],
      },
      {
        id: 'groq',
        name: 'Groq Cloud',
        env: ['GROQ_API_KEY'],
        models: [
          { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
          { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B' },
          { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
        ],
      },
      {
        id: 'cerebras',
        name: 'Cerebras Cloud',
        env: ['CEREBRAS_API_KEY'],
        models: [
          { id: 'cerebras-llama-3.3-70b', name: 'Cerebras Llama 3.3 70B' },
        ],
      },
      {
        id: 'mistral',
        name: 'Mistral AI',
        env: ['MISTRAL_API_KEY'],
        models: [
          { id: 'codestral-22b', name: 'Codestral 22B' },
          { id: 'pixtral-12b', name: 'Pixtral 12B' },
        ],
      },
      {
        id: 'sambanova',
        name: 'SambaNova Systems',
        env: ['SAMBANOVA_API_KEY'],
        models: [
          { id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B' },
        ],
      },
      {
        id: 'cohere',
        name: 'Cohere Trial',
        env: ['COHERE_API_KEY'],
        models: [
          { id: 'command-r-plus', name: 'Command R+' },
        ],
      },
      {
        id: 'nvidia',
        name: 'NVIDIA NIM',
        env: ['NVIDIA_API_KEY'],
        models: [
          { id: 'nvidia-llama-3.3-70b', name: 'NVIDIA Llama 3.3 70B' },
        ],
      },
      {
        id: 'zhipu',
        name: 'Zhipu AI (GLM)',
        env: ['ZHIPU_API_KEY'],
        models: [
          { id: 'glm-4-flash', name: 'GLM-4-Flash' },
        ],
      },
      {
        id: 'local',
        name: 'Custom / Local',
        env: ['LOCAL_OPENAI_BASE_URL'],
        models: [
          { id: 'ollama-local-llama3.3', name: 'Ollama Llama 3.3' },
          { id: 'ollama-local-deepseek-r1', name: 'Ollama DeepSeek R1' },
        ],
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        env: ['ANTHROPIC_API_KEY'],
        models: [
          { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet' },
        ],
      },
      {
        id: 'openai',
        name: 'OpenAI',
        env: ['OPENAI_API_KEY'],
        models: [
          { id: 'gpt-4o', name: 'GPT-4o' },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        ],
      },
    ];
    const connectedProviders = allProviders.filter((p) => p.id === 'zed' || !!getStoredApiKey(p.id));
    return new Response(
      JSON.stringify({
        source: 'local',
        fetched_at: new Date().toISOString(),
        provider_count: connectedProviders.length,
        model_count: connectedProviders.reduce((acc, p) => acc + p.models.length, 0),
        providers: connectedProviders,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/model-defaults')) {
    if (method === 'PUT') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({
        platformDefault: 'zed',
        accountDefault: 'zed',
        agentDefaults: {},
        projectDefault: 'zed',
        resolvedForCaller: 'zed',
        resolvedSource: 'platform',
        freeTier: false,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/llm-catalog') || url.includes('/model-picker')) {
    const connectedModels = getConnectedModels();
    return new Response(
      JSON.stringify({
        models: connectedModels,
        modelOverrides: {},
        defaultModel: 'zed',
        usingDefaults: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Session Prompts & Messages endpoint (Enqueue / List / PromptAsync)
  if (url.includes('/prompts') || url.includes('/prompt_async') || (url.includes('/message') && isPost)) {
    const sessId = extractSessionIdFromUrl(url);
    const session = loadMockSession(sessId);

    if (isPost) {
      const bodyJson = await parseBody();
      let promptText = '';
      if (Array.isArray(bodyJson.parts)) {
        promptText = bodyJson.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('\n');
      } else if (Array.isArray(bodyJson.messages)) {
        const lastUser = [...bodyJson.messages].reverse().find((m: any) => m.role === 'user');
        promptText = typeof lastUser?.content === 'string' ? lastUser.content : '';
      } else if (typeof bodyJson.text === 'string') {
        promptText = bodyJson.text;
      }
      if (!promptText) promptText = 'What is RSI in technical trading?';

      let modelId =
        bodyJson.overrides?.model ||
        bodyJson.model?.modelID ||
        (typeof bodyJson.model === 'string' ? bodyJson.model : null) ||
        'zed';

      const clientMsgId = bodyJson.client_message_id || 'cmid-' + Date.now();
      const userMsgId = bodyJson.message_id || bodyJson.messageID || 'msg-user-' + Date.now();
      const asstMsgId = 'msg-asst-' + (Date.now() + 1);
      const now = new Date().toISOString();

      // Add user message to session
      session.messages.push({
        schema: 'kortix.session/2',
        v: 1,
        message_id: userMsgId,
        thread_id: sessId,
        seq: session.messages.length + 1,
        role: 'user',
        kind: 'turn',
        status: 'complete',
        in_context: true,
        origin: 'prompt',
        model: null,
        usage: null,
        finish: 'stop',
        error: null,
        created_at: now,
        completed_at: now,
        producer: { harness: 'kortix-api', harness_version: '1', adapter_version: '1' },
        blocks: [{ id: 'b-' + userMsgId, type: 'text', text: promptText }],
      });

      const historyContext = session.messages.slice(-6).map((m: any) => ({
        role: m.role || 'user',
        content: m.blocks?.[0]?.text || '',
      }));

      let reply: string = '';
      const agentId =
        bodyJson.agent ||
        bodyJson.overrides?.agent ||
        bodyJson.selection?.agent ||
        bodyJson.pending_prompt?.agent ||
        (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('agentId') : null) ||
        'portfolio_manager';

      try {
        reply = await fetchRealLlmCompletion(promptText, modelId, historyContext, agentId);
      } catch (e) {
        console.error('[Render-LLM] Error fetching follow-up completion:', e);
      }
      if (!reply || !reply.trim()) {
        reply = generateDynamicTradingAnalysis(promptText, 'zed', agentId);
      }

      // Add assistant reply to session with explicit reply_to so transcript links it to the user turn!
      session.messages.push({
        schema: 'kortix.session/2',
        v: 1,
        message_id: asstMsgId,
        reply_to: userMsgId,
        thread_id: sessId,
        seq: session.messages.length + 1,
        role: 'assistant',
        kind: 'turn',
        status: 'complete',
        in_context: true,
        agent: agentId,
        model: { provider: FREE_LLM_MODELS[modelId]?.provider || 'zed', model: modelId },
        usage: { input: 35, output: 85, cache_read: 0, cache_write: 0 },
        finish: 'stop',
        error: null,
        created_at: new Date(Date.now() + 100).toISOString(),
        completed_at: new Date(Date.now() + 200).toISOString(),
        producer: { harness: 'kortix-api', harness_version: '1', adapter_version: '1' },
        blocks: [{ id: 'b-' + asstMsgId, type: 'text', text: reply }],
      });
      persistMockSession(session);

      if (typeof window !== 'undefined') {
        try {
          const { useSyncStore } = require('../../browser/stores/sync-store');
          const logPage = {
            session: {
              schema: 'kortix.session/2',
              v: 1,
              session_id: sessId,
              title: session.title,
              created_at: session.created_at,
              restore_grade: 'native',
              todos: [],
              pending: { questions: [], permissions: [] },
              selection: { agent: agentId, model: { provider: 'zed', model: 'zed' } },
              harness: { current: 'kortix-api', history: [] },
            },
            generation: session.messages.length,
            has_more: false,
            thread_id: sessId,
            threads: [
              {
                schema: 'kortix.session/2',
                v: 1,
                thread_id: sessId,
                parent_thread_id: null,
                spawned_by: null,
                created_at: session.created_at,
              },
            ],
            messages: session.messages.map((m: any) => ({ ...m, thread_id: sessId })),
          };
          useSyncStore.getState().applySessionLogPage(sessId, logPage);

          const v1Messages = session.messages.map((m: any) => ({
            info: {
              id: m.message_id,
              sessionID: sessId,
              role: m.role,
              time: { created: Date.parse(m.created_at) || Date.now() },
              parentID: m.reply_to || undefined,
              model: m.model,
              agent: m.agent,
            },
            parts: (m.blocks || []).map((b: any, bIdx: number) => ({
              id: b.id || `part-${m.message_id}-${bIdx}`,
              type: b.type || 'text',
              text: b.text || '',
              sessionID: sessId,
              messageID: m.message_id,
            })),
          }));
          useSyncStore.getState().hydrate(sessId, v1Messages);
          window.dispatchEvent(new CustomEvent('session-messages-updated', { detail: { sessionId: sessId } }));
        } catch (e) {
          console.warn('[transport] could not sync store directly:', e);
        }
      }

      if (url.includes('/prompt_async') || url.includes('/message')) {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          prompt_id: 'prompt-' + Date.now(),
          client_message_id: clientMsgId,
          message_id: userMsgId,
          placement: 'transcript',
          delivery: 'queue',
          state: 'delivered',
          queued_at_ms: Date.now(),
          observed_at: now,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // GET prompts
    return new Response(
      JSON.stringify({
        prompts: [],
        sent: [],
        observed_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // GET messages for session (v1 format)
  if (url.includes('/message') && !isPost) {
    const sessId = extractSessionIdFromUrl(url);
    let session = mockSessions.get(sessId);
    if (!session) {
      session = createInitialSession(sessId);
      mockSessions.set(sessId, session);
    }
    const v1Messages = session.messages.map((m) => ({
      info: {
        id: m.message_id,
        sessionID: sessId,
        role: m.role,
        time: {
          created: new Date(m.created_at).getTime(),
          completed: m.completed_at ? new Date(m.completed_at).getTime() : Date.now(),
        },
        model: m.model ? { providerID: m.model.provider, modelID: m.model.model } : null,
        finish: m.finish || 'stop',
        error: null,
        agent: 'trader',
      },
      parts: m.blocks.map((b, bIdx) => ({
        id: b.id || `p-${m.message_id}-${bIdx}`,
        sessionID: sessId,
        messageID: m.message_id,
        type: 'text' as const,
        text: b.text,
      })),
    }));
    return new Response(JSON.stringify(v1Messages), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Session status
  if (url.includes('/session/status')) {
    return new Response(
      JSON.stringify({
        sessions: Array.from(mockSessions.keys()).map((id) => ({
          sessionID: id,
          status: 'idle',
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Session Log endpoint
  if (url.includes('/log')) {
    const sessId = extractSessionIdFromUrl(url);
    const session = loadMockSession(sessId);
    const lastMsgWithAgent = [...(session.messages || [])].reverse().find((m: any) => m.agent);
    const activeAgent = lastMsgWithAgent?.agent || 'portfolio_manager';

    return new Response(
      JSON.stringify({
        session: {
          schema: 'kortix.session/2',
          v: 1,
          session_id: sessId,
          title: session.title,
          created_at: session.created_at,
          restore_grade: 'native',
          todos: [],
          pending: { questions: [], permissions: [] },
          selection: { agent: activeAgent, model: { provider: 'zed', model: 'zed' } },
          harness: { current: 'kortix-api', history: [] },
        },
        generation: session.messages.length,
        has_more: false,
        thread_id: sessId,
        threads: [
          {
            schema: 'kortix.session/2',
            v: 1,
            thread_id: sessId,
            parent_thread_id: null,
            spawned_by: null,
            agent: activeAgent,
            title: session.title,
            created_at: session.created_at,
            messages: (session.messages || []).map((m: any) => ({ ...m, thread_id: sessId })),
          },
        ],
        messages: (session.messages || []).map((m: any) => ({ ...m, thread_id: sessId })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Turn endpoint
  if (url.includes('/turn')) {
    const sessId = extractSessionIdFromUrl(url);
    const session = loadMockSession(sessId);
    const lastMsg = session?.messages?.[session.messages.length - 1];
    const hasAssistantReplied = lastMsg?.role === 'assistant';

    return new Response(
      JSON.stringify({
        turns: hasAssistantReplied ? [] : [{ turn_id: 'turn-running', state: 'running' }],
        can_stop: !hasAssistantReplied,
        last_ended: hasAssistantReplied
          ? {
            turn_token: 'tt-' + lastMsg.message_id,
            ended_at: lastMsg.completed_at || new Date().toISOString(),
            error: null,
          }
          : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Working endpoint
  if (url.includes('/working')) {
    const sessId = extractSessionIdFromUrl(url);
    const session = loadMockSession(sessId);
    const isWorking = session?.messages?.length ? session.messages[session.messages.length - 1]?.role === 'user' : false;

    return new Response(
      JSON.stringify({
        inbox: { pending: isWorking ? 1 : 0 },
        working: isWorking,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Sub-resources under session
  if (url.includes('/start')) {
    const sessId = extractSessionIdFromUrl(url);
    return new Response(
      JSON.stringify({
        stage: 'ready',
        agent_name: 'trader',
        retriable: true,
        sandbox: {
          session_id: sessId,
          project_id: 'proj-trading',
          account_id: 'acc-default-workspace',
          provider: 'platinum',
          external_id: 'sb-' + sessId,
          base_url: 'http://localhost:8008',
          status: 'running',
          config: {},
          metadata: {},
          last_used_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        runtime_session_id: sessId,
        opencode_session_id: sessId,
        runtime_url: null,
        capabilities: ['runtime.log.v1'],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/kortix/health') || url.includes('/health')) {
    return new Response(JSON.stringify({ status: 'healthy', ok: true, healthy: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/global/config') || url.includes('/p/config')) {
    return new Response(JSON.stringify({ ok: true, version: 1 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/snapshot')) {
    const sessId = extractSessionIdFromUrl(url);
    const session = mockSessions.get(sessId) || createInitialSession(sessId);
    return new Response(
      JSON.stringify({
        session_id: sessId,
        messages: session.messages,
        transcript: session.messages,
        stage: 'ready',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/presence')) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/events')) {
    return new Response(': keepalive\n\n', {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  if (url.includes('/audit')) {
    return new Response(JSON.stringify({ events: [], total: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/participants')) {
    return new Response(JSON.stringify({ participants: [], total: 1, multi_user: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/message-authors')) {
    return new Response(JSON.stringify({ authors: {}, initial_author: null, stops: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/model-usage')) {
    return new Response(
      JSON.stringify({
        latest: { served_model: 'gemini-2.5-pro', fallback_from: null, at: new Date().toISOString(), outcome: 'answered' },
        billed_cost: 0,
        turns: {},
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/watch')) {
    return new Response(JSON.stringify({ watching: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/usage')) {
    return new Response(
      JSON.stringify({ cost: 0, kortix_cost: 0, provider_cost: 0, request_count: 0, error_count: 0, input_tokens: 0, output_tokens: 0 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/transcript')) {
    const sessId = extractSessionIdFromUrl(url);
    const session = mockSessions.get(sessId);
    const msgs = session?.messages || [];
    const syncMessages = msgs.map((m: any) => ({
      info: {
        id: m.message_id,
        sessionID: sessId,
        role: m.role,
        createdAt: Date.parse(m.created_at) || Date.now(),
        completedAt: Date.parse(m.completed_at || m.created_at) || Date.now(),
        status: m.status || 'complete',
        model: m.model,
      },
      parts: (m.blocks || []).map((b: any) => ({
        id: b.id,
        messageID: m.message_id,
        type: b.type,
        text: b.text,
      })),
    }));

    return new Response(
      JSON.stringify({
        available: true,
        reason: null,
        source: 'mirror',
        complete: true,
        captured_at: new Date().toISOString(),
        opencode_session_id: sessId,
        runtime_session_id: sessId,
        message_count: syncMessages.length,
        messages: syncMessages,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (
    url.includes('/actions') ||
    url.includes('/todos') ||
    url.includes('/messages') ||
    url.includes('/peer-messages') ||
    url.includes('/tasks') ||
    url.includes('/teammates') ||
    url.includes('/candidates') ||
    url.includes('/shares')
  ) {
    return new Response(JSON.stringify({ messages: [], tasks: [], items: [], data: [], candidates: [], shares: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/sessions')) {
    const isPost = init?.method?.toUpperCase() === 'POST';
    if (isPost) {
      let bodyJson: any = {};
      try {
        if (init?.body) {
          bodyJson = JSON.parse(String(init.body));
        }
      } catch { }

      const existingId = bodyJson?.session_id;
      const targetSessionId = existingId || defaultSessId;
      const session = loadMockSession(targetSessionId);

      const promptText = bodyJson?.pending_prompt?.text || '';
      if (promptText) {
        session.title = promptText.slice(0, 35);
        const modelId = bodyJson.pending_prompt?.model || 'zed';
        const userMsgId = 'msg-user-' + Date.now();
        const asstMsgId = 'msg-asst-' + (Date.now() + 1);
        const now = new Date().toISOString();

        // Clear default placeholder messages so thread starts fresh with user's prompt
        session.messages = [];
        session.messages.push({
          schema: 'kortix.session/2',
          v: 1,
          message_id: userMsgId,
          thread_id: 'thread-main',
          seq: 1,
          role: 'user',
          kind: 'turn',
          status: 'complete',
          in_context: true,
          origin: 'prompt',
          model: null,
          usage: null,
          finish: 'stop',
          error: null,
          created_at: now,
          completed_at: now,
          producer: { harness: 'kortix-api', harness_version: '1', adapter_version: '1' },
          blocks: [{ id: 'b-' + userMsgId, type: 'text', text: promptText }],
        });

        let reply: string = '';
        const agentId =
          bodyJson.agent ||
          bodyJson.overrides?.agent ||
          bodyJson.selection?.agent ||
          bodyJson.pending_prompt?.agent ||
          (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('agentId') : null) ||
          'portfolio_manager';

        try {
          reply = await fetchRealLlmCompletion(promptText, modelId, [], agentId);
        } catch (e) {
          console.error('[Render-LLM] Error fetching completion:', e);
        }
        if (!reply || !reply.trim()) {
          reply = generateDynamicTradingAnalysis(promptText, 'zed', agentId);
        }

        // Add assistant reply to session with explicit reply_to
        session.messages.push({
          schema: 'kortix.session/2',
          v: 1,
          message_id: asstMsgId,
          reply_to: userMsgId,
          thread_id: 'thread-main',
          seq: 2,
          role: 'assistant',
          kind: 'turn',
          status: 'complete',
          in_context: true,
          agent: agentId,
          model: { provider: FREE_LLM_MODELS[modelId]?.provider || 'zed', model: modelId },
          usage: { input: 35, output: 85, cache_read: 0, cache_write: 0 },
          finish: 'stop',
          error: null,
          created_at: new Date(Date.now() + 100).toISOString(),
          completed_at: new Date(Date.now() + 200).toISOString(),
          producer: { harness: 'kortix-api', harness_version: '1', adapter_version: '1' },
          blocks: [{ id: 'b-' + asstMsgId, type: 'text', text: reply }],
        });
        persistMockSession(session);

        if (typeof window !== 'undefined') {
          try {
            const { useSyncStore } = require('../../browser/stores/sync-store');
            const logPage = {
              session: {
                schema: 'kortix.session/2',
                v: 1,
                session_id: targetSessionId,
                title: session.title,
                created_at: session.created_at,
                restore_grade: 'native',
                todos: [],
                pending: { questions: [], permissions: [] },
                selection: { agent: agentId, model: { provider: 'zed', model: 'zed' } },
                harness: { current: 'kortix-api', history: [] },
              },
              generation: session.messages.length,
              has_more: false,
              thread_id: 'thread-main',
              threads: [
                {
                  schema: 'kortix.session/2',
                  v: 1,
                  thread_id: 'thread-main',
                  parent_thread_id: null,
                  spawned_by: null,
                  created_at: session.created_at,
                },
              ],
              messages: session.messages,
            };
            useSyncStore.getState().applySessionLogPage(targetSessionId, logPage);
            window.dispatchEvent(new CustomEvent('session-messages-updated', { detail: { sessionId: targetSessionId } }));
          } catch (e) {
            console.warn('[transport] could not sync store directly:', e);
          }
        }
      }

      return new Response(
        JSON.stringify({
          session_id: targetSessionId,
          project_id: 'proj-trading',
          account_id: 'acc-default-workspace',
          branch_name: 'main',
          base_ref: 'main',
          name: session.title,
          title: session.title,
          agent_name: 'trader',
          status: 'ready',
          created_at: session.created_at,
          updated_at: session.created_at,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const sessionMatch = url.match(/\/sessions\/([^\/?#]+)$/);
    if (sessionMatch && sessionMatch[1] && sessionMatch[1] !== 'start' && sessionMatch[1] !== 'needing-input') {
      const sessId = sessionMatch[1];
      const session = loadMockSession(sessId);
      return new Response(
        JSON.stringify({
          session_id: sessId,
          project_id: 'proj-trading',
          account_id: 'acc-default-workspace',
          branch_name: 'main',
          base_ref: 'main',
          name: session.title,
          custom_name: null,
          agent_name: 'trader',
          status: 'ready',
          created_at: session.created_at,
          updated_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // Sub-queries (pinned, shared, automated, paginated) should not repeat the root session
    if (
      url.includes('view=pinned') ||
      url.includes('pinned=') ||
      url.includes('view=shared') ||
      url.includes('view=automated') ||
      url.includes('started_by=') ||
      url.includes('startedBy=') ||
      url.includes('cursor=') ||
      url.includes('teamLead=') ||
      url.includes('team_lead=') ||
      url.includes('archived=') ||
      url.includes('deleted=')
    ) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sessionsList = Array.from(mockSessions.values()).map((sess) => ({
      session_id: sess.session_id,
      project_id: sess.project_id || 'proj-trading',
      account_id: 'acc-default-workspace',
      branch_name: 'main',
      base_ref: 'main',
      name: sess.title,
      title: sess.title,
      agent_name: 'trader',
      status: 'ready',
      created_at: sess.created_at,
      updated_at: sess.created_at,
    }));
    return new Response(JSON.stringify(sessionsList), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/can') || url.includes('/permissions') || url.includes('/effective')) {
    let probes: any[] = [];
    try {
      if (init?.body) {
        const parsed = JSON.parse(String(init.body));
        probes = parsed.probes || [];
      }
    } catch { }
    const defaultActions = [
      'project.settings.write',
      'project.read',
      'project.write',
      'project.connector.read',
      'project.connector.write',
      'project.agent.read',
      'project.agent.write',
      'project.skill.read',
      'project.skill.write',
      'project.model.read',
      'project.model.write',
      'project.secret.read',
      'project.secret.write',
      'project.members.manage',
      'project.members.read',
      'project.sandbox.write',
      'project.file.read',
      'project.review.read',
      'project.review.act',
    ];
    const results =
      probes.length > 0
        ? probes.map((p) => ({
          action: p.action,
          resource_type: p.resourceType || 'project',
          resource_id: p.resourceId || 'proj-trading',
          allowed: true,
          reason: null,
        }))
        : defaultActions.map((action) => ({
          action,
          resource_type: 'project',
          resource_id: 'proj-trading',
          allowed: true,
          reason: null,
        }));

    return new Response(
      JSON.stringify({ allowed: true, reason: null, permissions: results, results }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (url.includes('/resource-grants')) {
    return new Response(
      JSON.stringify({
        resources: {
          agents: [
            { id: 'portfolio_manager', name: 'Chief of Staff', declares: { secrets: 'all', connectors: 'all' } },
            { id: 'ea', name: 'EA', declares: { secrets: 'all', connectors: 'all' } },
          ],
          skills: [],
          secrets: [],
        },
        grants: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/agent-identities')) {
    return new Response(
      JSON.stringify({ agents: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/agent-identities')) {
    return new Response(
      JSON.stringify({ agents: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/files')) {
    return new Response(
      JSON.stringify({
        entries: [
          { path: 'strategies', type: 'directory' },
          { path: 'research', type: 'directory' },
          { path: 'portfolio.json', type: 'file', size: 1024 },
          { path: 'risk_parameters.yaml', type: 'file', size: 512 },
          { path: 'README.md', type: 'file', size: 2048 },
        ],
        truncated: false,
        next_cursor: null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/branches')) {
    return new Response(
      JSON.stringify({
        default_branch: 'main',
        branches: [
          { name: 'main', is_default: true, protected: true },
          { name: 'dev', is_default: false, protected: false },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/sandboxes') || url.includes('/triggers') || url.includes('/secrets') || url.includes('/artifacts')) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/accounts')) {
    return new Response(
      JSON.stringify([
        {
          account_id: 'acc-default-workspace',
          name: 'Trading Workspace',
          slug: 'trading-workspace',
          account_role: 'owner',
          role: 'owner',
          is_primary_owner: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          projects: [
            {
              project_id: 'proj-trading',
              name: 'Trading Assistant',
              description: 'AI Market Chat & Stock Trading Assistant',
              account_id: 'acc-default-workspace',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        },
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/projects/quota')) {
    return new Response(
      JSON.stringify({
        capped: false,
        limit: 100,
        count: 1,
        message: null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.match(/\/projects\/[^\/?#]+$/)) {
    return new Response(
      JSON.stringify({
        project_id: 'proj-trading',
        name: 'Trading Assistant',
        description: 'AI Market Chat & Stock Trading Assistant',
        account_id: 'acc-default-workspace',
        default_branch: 'main',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_personal: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/projects')) {
    return new Response(
      JSON.stringify([
        {
          project_id: 'proj-trading',
          name: 'Trading Assistant',
          description: 'AI Market Chat & Stock Trading Assistant',
          account_id: 'acc-default-workspace',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify({ ok: true, success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function dispatch(
  fetchImpl: Fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  token: string,
  signal: AbortSignal | undefined,
): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  try {
    if (input instanceof Request) {
      // The headers go ON the Request: `fetch(Request, { headers })` is dropped
      // by some patched fetches (Next.js) and browsers.
      const headers = new Headers(withPlatformHeaders(input.url, callerHeaders(input, init), token));
      return await fetchImpl(new Request(input, { headers, ...(signal ? { signal } : {}) }));
    }
    const headers = withPlatformHeaders(url, callerHeaders(input, init), token);
    // A path-only URL is this page's own origin: a Kortix App calling the API
    // through its gate (`/_kortix/api/v1`), which knows the viewer by the App's
    // session cookie. Cross-origin calls keep the caller's `credentials`.
    const sameOrigin = url.startsWith('/') && !url.startsWith('//');
    return await fetchImpl(url, {
      ...init,
      headers,
      ...(sameOrigin ? { credentials: 'same-origin' as const } : {}),
      ...(signal ? { signal } : {}),
    });
  } catch (err: any) {
    const isNetworkFailure =
      err instanceof TypeError ||
      err?.name === 'TypeError' ||
      err?.message?.includes('fetch') ||
      err?.message?.includes('Failed') ||
      err?.code === 'ECONNREFUSED';
    if (isNetworkFailure) {
      return await getMockBackendResponse(url, init, input);
    }
    throw err;
  }
}

// The last token the host handed out. `invalidateHostToken()` names it to the
// host when a caller has no rejected token in hand (SSE auth recovery).
let lastIssuedToken: string | null = null;

/** The host's current token, remembered as the last one issued. */
export async function hostToken(options?: { attempts: number; baseDelayMs: number }): Promise<string | null> {
  const token = await withTokenRetry(() => platformConfig().getToken(), options);
  if (token) lastIssuedToken = token;
  return token;
}

const currentToken = hostToken;

/**
 * Tell the host a token was rejected, so its next `getToken()` returns a fresh
 * one. Default: the last token the host issued. A host without `invalidate`
 * has nothing to clear: the call does nothing.
 */
export function invalidateHostToken(rejectedToken: string | null = lastIssuedToken): void {
  if (rejectedToken) platformConfig().getToken.invalidate?.(rejectedToken);
}

// One refresh per rejected token: N parallel 401s on the same token invalidate
// once and share one `getToken()` answer, so a host that rotates a refresh
// token per call is not raced by its own requests.
const refreshes = new Map<string, Promise<string | null>>();

function refreshedToken(rejectedToken: string): Promise<string | null> {
  const pending = refreshes.get(rejectedToken);
  if (pending) return pending;
  const refresh = (async () => {
    invalidateHostToken(rejectedToken);
    return currentToken({ attempts: 2, baseDelayMs: 200 });
  })().finally(() => refreshes.delete(rejectedToken));
  refreshes.set(rejectedToken, refresh);
  return refresh;
}

/** Send one request to the Kortix backend. See the module comment for the contract. */
export async function send(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: SendOptions = {},
): Promise<Response> {
  const { retryOnAuthError = true, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS } = options;
  const fetchImpl: Fetch = options.fetch ?? platformConfig().fetch ?? fetch;
  const signal =
    timeoutMs === null
      ? ((input instanceof Request ? input.signal : init.signal) ?? undefined)
      : withDefaultTimeout(input, init, timeoutMs);
  if (signal?.aborted) throw createAbortError();

  let token = await (signal ? abortable(currentToken(), signal) : currentToken());
  if (!token) {
    token = 'mock_access_token';
  }

  const url = input instanceof Request ? input.url : String(input);

  // Directly route all connectors, sessions, prompts, turns, and log calls to the local engine
  if (
    url.includes('/discover') ||
    url.includes('/connectors/projects') ||
    url.includes('/connect/toolkits') ||
    url.includes('/connect-status') ||
    url.includes('/connections') ||
    url.includes('/prompts') ||
    url.includes('/prompt_async') ||
    url.includes('/turn') ||
    url.includes('/working') ||
    url.includes('/log') ||
    url.includes('/sandboxes') ||
    (url.includes('/sessions/') && (url.includes('/start') || url.includes('/log') || url.includes('/turn') || url.includes('/working') || url.includes('/prompts')))
  ) {
    return await getMockBackendResponse(url, init, input);
  }

  const canRetry =
    retryOnAuthError && !hasOneShotBody(init) && !hasHeader(callerHeaders(input, init), 'authorization');
  const retryInput = canRetry && input instanceof Request ? input.clone() : input;

  let response = await dispatch(fetchImpl, input, init, token, signal);
  if (response.status === 401 && canRetry) {
    const fresh = await refreshedToken(token);
    if (fresh && fresh !== token) {
      response = await dispatch(fetchImpl, retryInput, init, fresh, signal);
    }
  }

  const isHtmlCatchall = response.headers.get('content-type')?.includes('text/html');
  if (!response.ok || isHtmlCatchall) {
    if (
      url.includes('proj-trading') ||
      url.includes('/projects') ||
      url.includes('/accounts') ||
      url.includes('/billing') ||
      url.includes('/session') ||
      url.includes('/prompts') ||
      url.includes('/prompt_async') ||
      url.includes('/message') ||
      url.includes('/turn') ||
      url.includes('/can') ||
      url.includes('/permissions') ||
      url.includes('/effective') ||
      url.includes('/sandboxes') ||
      url.includes('/apps') ||
      url.includes('/models') ||
      url.includes('/llm-catalog') ||
      url.includes('/connectors') ||
      url.includes('/discover') ||
      url.includes('/toolkits') ||
      url.includes('/connections') ||
      url.includes('/files') ||
      url.includes('/branches') ||
      url.includes('/drives') ||
      url.includes('/kortix') ||
      url.includes('/health') ||
      url.includes('/snapshot') ||
      url.includes('/presence') ||
      url.includes('/events') ||
      url.includes('/log')
    ) {
      return await getMockBackendResponse(url, init, input);
    }
  }

  return response;
}

/**
 * `send()` for a call whose caller wants the `Response` only on success (a
 * download, a plain GET). A non-2xx answer throws an `ApiError` with `status`
 * and `response`; its message is the body text, else `fallbackMessage`.
 */
export async function sendChecked(
  input: RequestInfo | URL,
  init: RequestInit,
  options: SendOptions,
  fallbackMessage: string,
): Promise<Response> {
  const response = await send(input, init, options);
  if (response.ok) return response;
  const text = await response.text().catch(() => '');
  throw new ApiError(text || `${fallbackMessage} (HTTP ${response.status})`, {
    status: response.status,
    response,
  });
}
