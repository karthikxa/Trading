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
export function setAdminBypass(_enabled: boolean): void {}

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

function createInitialSession(sessionId: string): MockSessionRecord {
  const promptText = 'Explain moving average in 1 sentence for trading';
  const replyText = `A moving average (MA) is a technical indicator that smooths out price data over a specified period by constantly updating an average price, helping traders identify trend direction and dynamic support/resistance levels.`;
  const now = new Date(Date.now() - 60000).toISOString();
  const uId = 'msg-user-init';
  const aId = 'msg-asst-init';

  return {
    session_id: sessionId,
    project_id: 'proj-trading',
    title: 'Trading Chat',
    created_at: now,
    messages: [
      {
        schema: 'kortix.session/2',
        v: 1,
        message_id: uId,
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
        blocks: [{ id: 'b-' + uId, type: 'text', text: promptText }],
      },
      {
        schema: 'kortix.session/2',
        v: 1,
        message_id: aId,
        thread_id: 'thread-main',
        seq: 2,
        role: 'assistant',
        kind: 'turn',
        status: 'complete',
        in_context: true,
        model: { provider: 'openrouter', model: 'deepseek-r1-free' },
        usage: { input: 35, output: 85, cache_read: 0, cache_write: 0 },
        finish: 'stop',
        error: null,
        created_at: new Date(Date.now() - 58000).toISOString(),
        completed_at: new Date(Date.now() - 55000).toISOString(),
        producer: { harness: 'kortix-api', harness_version: '1', adapter_version: '1' },
        blocks: [{ id: 'b-' + aId, type: 'text', text: replyText }],
      },
    ],
  };
}

const mockSessions = new Map<string, MockSessionRecord>();
const defaultSessId = 'sess-trading-default';
mockSessions.set(defaultSessId, createInitialSession(defaultSessId));

function getIntelligentMockReply(promptText: string, modelId: string): string {
  const mDef = FREE_LLM_MODELS[modelId];
  const modelDisplayName = mDef?.name || modelId;
  const lower = promptText.toLowerCase();
  if (lower.includes('moving average') || lower.includes('ma') || lower.includes('ema')) {
    return `A moving average (MA) is a technical indicator that smooths out price data over a specified period by constantly updating an average price, helping traders identify trend direction and dynamic support/resistance levels.`;
  } else if (lower.includes('rsi')) {
    return `The Relative Strength Index (RSI) is a momentum oscillator measuring the speed and velocity of directional price movements on a scale of 0 to 100, where readings above 70 indicate overbought conditions and below 30 indicate oversold territory.`;
  } else if (lower.includes('onboard')) {
    return `Welcome to Kortix Trading Assistant! All 36 free model endpoints via FreeLLMAPI Smart Router are fully operational. Select any model from the composer selector and send your market analysis prompts.`;
  }
  return `As your AI Trading Assistant powered by **${modelDisplayName}** on FreeLLMAPI Smart Router, I have evaluated your request: "${promptText}". Market structures are currently showing rotational liquidity. Maintain strict risk parameters (maximum 1-2% risk per position) and verify cross-timeframe volume confirmation.`;
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
    } catch {}
    if (input instanceof Request) {
      try {
        return await input.clone().json();
      } catch {}
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
        models: Object.keys(FREE_LLM_MODELS),
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
            { name: 'portfolio_manager', role: 'Chief of Staff', description: 'Capital Allocation & Swarm Lead' },
            { name: 'ea', role: 'EA', description: 'Executive & Workflow Automation' },
            { name: 'fundamentals_analyst', role: 'Inbox Manager', description: 'Financials & Intrinsic Value' },
            { name: 'technical_analyst', role: 'Sales Outbound', description: 'Technicals & Price Momentum' },
            { name: 'news_analyst', role: 'Talent Scout', description: 'Global Wire & Headlines' },
            { name: 'sentiment_analyst', role: 'Customer Support', description: 'Social & Institutional Flow' },
            { name: 'growth_analyst', role: 'Growth Marketer', description: 'Growth Catalyst Identification' },
            { name: 'macro_analyst', role: 'Marketing Lead', description: 'Macroeconomic & Rates Regime' },
            { name: 'bull_researcher', role: 'Billing Support', description: 'Bullish Thesis & Upside Catalysts' },
            { name: 'bear_researcher', role: 'Designer', description: 'Downside Risk & Short Arguments' },
            { name: 'risk_manager', role: 'Sales Inbound', description: 'Drawdown & Volatility Guard' },
            { name: 'trader_agent', role: 'Product Manager', description: 'Order Routing & Execution Desk' },
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
        providers: ['composio'],
        provider: 'composio',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/discover/sections') || (url.includes('/discover') && url.includes('sections'))) {
    const apps = [
      {
        id: 'gmail',
        slug: 'gmail',
        name: 'Gmail',
        description: 'Connect your Gmail to send, receive, search emails and summarize inbox threads via Composio.',
        provider: 'composio',
        category: 'Communication',
        categories: ['Communication'],
        icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/gmail.png',
        domain: 'mail.google.com',
        kind: 'composio',
        popularity: 1,
        rank: 1,
        variants: [{ id: 'gmail-oauth', kind: 'composio', name: 'Composio OAuth', oneClick: true }],
      },
      {
        id: 'github',
        slug: 'github',
        name: 'GitHub',
        description: 'Connect GitHub to create pull requests, read repository code, and trigger automated workflows.',
        provider: 'composio',
        category: 'Developer Tools',
        categories: ['Developer Tools'],
        icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/github.png',
        domain: 'github.com',
        kind: 'composio',
        popularity: 2,
        rank: 2,
        variants: [{ id: 'github-oauth', kind: 'composio', name: 'Composio OAuth', oneClick: true }],
      },
      {
        id: 'slack',
        slug: 'slack',
        name: 'Slack',
        description: 'Connect Slack to send notifications, post market reports, and coordinate across team channels.',
        provider: 'composio',
        category: 'Communication',
        categories: ['Communication'],
        icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/slack.png',
        domain: 'slack.com',
        kind: 'composio',
        popularity: 3,
        rank: 3,
        variants: [{ id: 'slack-oauth', kind: 'composio', name: 'Composio OAuth', oneClick: true }],
      },
      {
        id: 'google-drive',
        slug: 'google-drive',
        name: 'Google Drive',
        description: 'Access research documents, spreadsheets, financial models, and workspace files.',
        provider: 'composio',
        category: 'Productivity',
        categories: ['Productivity'],
        icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/google-drive.png',
        domain: 'drive.google.com',
        kind: 'composio',
        popularity: 4,
        rank: 4,
        variants: [{ id: 'gdrive-oauth', kind: 'composio', name: 'Composio OAuth', oneClick: true }],
      },
      {
        id: 'notion',
        slug: 'notion',
        name: 'Notion',
        description: 'Sync investment memos, strategy wikis, and trading logs with your team workspace.',
        provider: 'composio',
        category: 'Productivity',
        categories: ['Productivity'],
        icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/notion.png',
        domain: 'notion.so',
        kind: 'composio',
        popularity: 5,
        rank: 5,
        variants: [{ id: 'notion-oauth', kind: 'composio', name: 'Composio OAuth', oneClick: true }],
      },
    ];
    return new Response(
      JSON.stringify({
        popular: apps,
        sections: [
          {
            key: 'popular',
            label: 'Popular Apps',
            total: apps.length,
            items: apps,
          },
        ],
        categories: [
          { key: 'Communication', count: 2 },
          { key: 'Developer Tools', count: 1 },
          { key: 'Productivity', count: 2 },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/discover')) {
    const apps = [
      {
        id: 'gmail',
        slug: 'gmail',
        name: 'Gmail',
        description: 'Connect your Gmail to send, receive, search emails and summarize inbox threads via Composio.',
        provider: 'composio',
        category: 'Communication',
        categories: ['Communication'],
        icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/gmail.png',
        domain: 'mail.google.com',
        kind: 'composio',
        popularity: 1,
        rank: 1,
        variants: [{ id: 'gmail-oauth', kind: 'composio', name: 'Composio OAuth', oneClick: true }],
      },
      {
        id: 'github',
        slug: 'github',
        name: 'GitHub',
        description: 'Connect GitHub to create pull requests, read repository code, and trigger automated workflows.',
        provider: 'composio',
        category: 'Developer Tools',
        categories: ['Developer Tools'],
        icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/github.png',
        domain: 'github.com',
        kind: 'composio',
        popularity: 2,
        rank: 2,
        variants: [{ id: 'github-oauth', kind: 'composio', name: 'Composio OAuth', oneClick: true }],
      },
      {
        id: 'slack',
        slug: 'slack',
        name: 'Slack',
        description: 'Connect Slack to send notifications, post market reports, and coordinate across team channels.',
        provider: 'composio',
        category: 'Communication',
        categories: ['Communication'],
        icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/slack.png',
        domain: 'slack.com',
        kind: 'composio',
        popularity: 3,
        rank: 3,
        variants: [{ id: 'slack-oauth', kind: 'composio', name: 'Composio OAuth', oneClick: true }],
      },
      {
        id: 'google-drive',
        slug: 'google-drive',
        name: 'Google Drive',
        description: 'Access research documents, spreadsheets, financial models, and workspace files.',
        provider: 'composio',
        category: 'Productivity',
        categories: ['Productivity'],
        icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/google-drive.png',
        domain: 'drive.google.com',
        kind: 'composio',
        popularity: 4,
        rank: 4,
        variants: [{ id: 'gdrive-oauth', kind: 'composio', name: 'Composio OAuth', oneClick: true }],
      },
      {
        id: 'notion',
        slug: 'notion',
        name: 'Notion',
        description: 'Sync investment memos, strategy wikis, and trading logs with your team workspace.',
        provider: 'composio',
        category: 'Productivity',
        categories: ['Productivity'],
        icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/notion.png',
        domain: 'notion.so',
        kind: 'composio',
        popularity: 5,
        rank: 5,
        variants: [{ id: 'notion-oauth', kind: 'composio', name: 'Composio OAuth', oneClick: true }],
      },
    ];
    return new Response(
      JSON.stringify({
        items: apps,
        total: apps.length,
        hasMore: false,
        nextCursor: null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/connectors')) {
    return new Response(
      JSON.stringify({
        connectors: [
          {
            slug: 'gmail',
            name: 'Gmail',
            description: 'Connect your Gmail to send, receive, search emails and summarize inbox threads via Composio.',
            provider: 'composio',
            status: 'active',
            actions: [
              { name: 'send_email', description: 'Send an email' },
              { name: 'read_threads', description: 'Read email threads' },
            ],
          },
          {
            slug: 'github',
            name: 'GitHub',
            description: 'Connect GitHub to create pull requests, read repository code, and trigger automated workflows.',
            provider: 'composio',
            status: 'active',
            actions: [
              { name: 'create_pr', description: 'Create a pull request' },
              { name: 'get_repo', description: 'Get repository details' },
            ],
          },
          {
            slug: 'slack',
            name: 'Slack',
            description: 'Connect Slack to send notifications, post market reports, and coordinate across team channels.',
            provider: 'composio',
            status: 'active',
            actions: [
              { name: 'send_message', description: 'Post a Slack message' },
            ],
          },
        ],
        total: 3,
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

  if (url.includes('/connections')) {
    return new Response(JSON.stringify([]), {
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
    return new Response(
      JSON.stringify({
        source: 'local',
        fetched_at: new Date().toISOString(),
        provider_count: 12,
        model_count: Object.keys(FREE_LLM_MODELS).length,
        providers: [
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
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/llm-catalog') || url.includes('/model-picker')) {
    return new Response(
      JSON.stringify({
        models: FREE_LLM_MODELS,
        modelOverrides: {},
        defaultModel: 'gemini-2.5-pro',
        usingDefaults: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Session Prompts & Messages endpoint (Enqueue / List / PromptAsync)
  if (url.includes('/prompts') || url.includes('/prompt_async') || (url.includes('/message') && isPost)) {
    const sessId = extractSessionIdFromUrl(url);
    let session = mockSessions.get(sessId);
    if (!session) {
      session = createInitialSession(sessId);
      mockSessions.set(sessId, session);
    }

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
        'deepseek-r1-free';

      const clientMsgId = bodyJson.client_message_id || 'cmid-' + Date.now();
      const userMsgId = bodyJson.message_id || bodyJson.messageID || 'msg-user-' + Date.now();
      const asstMsgId = 'msg-asst-' + (Date.now() + 1);
      const now = new Date().toISOString();

      // Add user message to session
      session.messages.push({
        schema: 'kortix.session/2',
        v: 1,
        message_id: userMsgId,
        thread_id: 'thread-main',
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

      // Try calling local FreeLLMAPI router on port 8008 first (keyed providers),
      // then fall back to Pollinations.AI (keyless, no API key needed) 
      let reply = '';
      try {
        const flmRes = await fetch('http://localhost:8008/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer flm_sk_live_free_gateway_9921',
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: promptText }],
            max_tokens: 500,
          }),
        });
        if (flmRes.ok) {
          const data = await flmRes.json();
          reply = data?.choices?.[0]?.message?.content || '';
        }
      } catch {}

      // Fallback to Pollinations.AI (truly keyless, always works)
      if (!reply) {
        try {
          const pollinationsModel = FREE_LLM_MODELS[modelId]?.provider === 'local' ? 'mistral' :
            modelId.startsWith('pollinations-') ? modelId.replace('pollinations-', '') :
            'mistral';
          const pollRes = await fetch('https://text.pollinations.ai/openai/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: pollinationsModel,
              messages: [{ role: 'user', content: promptText }],
              max_tokens: 500,
            }),
          });
          if (pollRes.ok) {
            const data = await pollRes.json();
            reply = data?.choices?.[0]?.message?.content || '';
          }
        } catch {}
      }

      if (!reply) {
        reply = getIntelligentMockReply(promptText, modelId);
      }

      // Add assistant reply to session
      session.messages.push({
        schema: 'kortix.session/2',
        v: 1,
        message_id: asstMsgId,
        thread_id: 'thread-main',
        seq: session.messages.length + 1,
        role: 'assistant',
        kind: 'turn',
        status: 'complete',
        in_context: true,
        model: { provider: FREE_LLM_MODELS[modelId]?.provider || 'google', model: modelId },
        usage: { input: 35, output: 85, cache_read: 0, cache_write: 0 },
        finish: 'stop',
        error: null,
        created_at: new Date(Date.now() + 100).toISOString(),
        completed_at: new Date(Date.now() + 200).toISOString(),
        producer: { harness: 'kortix-api', harness_version: '1', adapter_version: '1' },
        blocks: [{ id: 'b-' + asstMsgId, type: 'text', text: reply }],
      });

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
    let session = mockSessions.get(sessId);
    if (!session) {
      session = createInitialSession(sessId);
      mockSessions.set(sessId, session);
    }

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
          selection: { agent: 'portfolio_manager', model: null },
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
            agent: 'portfolio_manager',
            title: session.title,
            created_at: session.created_at,
            messages: session.messages,
          },
        ],
        messages: session.messages,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Turn endpoint
  if (url.includes('/turn')) {
    const sessId = extractSessionIdFromUrl(url);
    const session = mockSessions.get(sessId);
    const lastMsg = session?.messages?.[session.messages.length - 1];

    return new Response(
      JSON.stringify({
        turns: [],
        can_stop: false,
        last_ended: lastMsg
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
    return new Response(
      JSON.stringify({
        inbox: { pending: 0 },
        working: false,
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
      } catch {}

      // Reuse the default session instead of creating a new one every time.
      // This prevents the sidebar from filling up with duplicate "Trading Chat" sessions.
      const existingId = bodyJson?.session_id;
      const reuseId = existingId && mockSessions.has(existingId) ? existingId : defaultSessId;
      const reuseSession = mockSessions.get(reuseId) || createInitialSession(reuseId);
      if (!mockSessions.has(reuseId)) mockSessions.set(reuseId, reuseSession);

      const promptText = bodyJson?.pending_prompt?.text || '';
      if (promptText) {
        const modelId = bodyJson.pending_prompt?.model || 'pollinations-mistral';
        const userMsgId = 'msg-user-' + Date.now();
        const asstMsgId = 'msg-asst-' + (Date.now() + 1);
        const now = new Date().toISOString();

        reuseSession.messages.push({
          schema: 'kortix.session/2',
          v: 1,
          message_id: userMsgId,
          thread_id: 'thread-main',
          seq: reuseSession.messages.length + 1,
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

        const reply = getIntelligentMockReply(promptText, modelId);
        reuseSession.messages.push({
          schema: 'kortix.session/2',
          v: 1,
          message_id: asstMsgId,
          thread_id: 'thread-main',
          seq: reuseSession.messages.length + 1,
          role: 'assistant',
          kind: 'turn',
          status: 'complete',
          in_context: true,
          model: { provider: FREE_LLM_MODELS[modelId]?.provider || 'pollinations', model: modelId },
          usage: { input: 35, output: 85, cache_read: 0, cache_write: 0 },
          finish: 'stop',
          error: null,
          created_at: new Date(Date.now() + 100).toISOString(),
          completed_at: new Date(Date.now() + 200).toISOString(),
          producer: { harness: 'kortix-api', harness_version: '1', adapter_version: '1' },
          blocks: [{ id: 'b-' + asstMsgId, type: 'text', text: reply }],
        });
      }

      return new Response(
        JSON.stringify({
          session_id: reuseId,
          project_id: 'proj-trading',
          account_id: 'acc-default-workspace',
          branch_name: 'main',
          base_ref: 'main',
          name: reuseSession.title,
          title: reuseSession.title,
          agent_name: 'trader',
          status: 'ready',
          created_at: reuseSession.created_at,
          updated_at: reuseSession.created_at,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const sessionMatch = url.match(/\/sessions\/([^\/?#]+)$/);
    if (sessionMatch && sessionMatch[1] && sessionMatch[1] !== 'start' && sessionMatch[1] !== 'needing-input') {
      const sessId = sessionMatch[1];
      let session = mockSessions.get(sessId);
      if (!session) {
        session = createInitialSession(sessId);
        mockSessions.set(sessId, session);
      }
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
      url.includes('view=shared') ||
      url.includes('view=automated') ||
      url.includes('cursor=') ||
      url.includes('teamLead=')
    ) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const defaultSession = mockSessions.get(defaultSessId) || createInitialSession(defaultSessId);
    const list = [{
      session_id: defaultSession.session_id,
      project_id: defaultSession.project_id,
      account_id: 'acc-default-workspace',
      branch_name: 'main',
      base_ref: 'main',
      name: defaultSession.title,
      title: defaultSession.title,
      agent_name: 'trader',
      status: 'ready',
      created_at: defaultSession.created_at,
      updated_at: defaultSession.created_at,
    }];
    return new Response(JSON.stringify(list), {
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
    } catch {}
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

  if (!response.ok) {
    const url = input instanceof Request ? input.url : String(input);
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
      url.includes('/connections') ||
      url.includes('/files') ||
      url.includes('/branches') ||
      url.includes('/drives')
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
