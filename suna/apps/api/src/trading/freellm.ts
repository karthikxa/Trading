/**
 * FreeLLMAPI — the free-tier model router.
 *
 * One OpenAI-compatible dispatch surface for the trading swarm and for the
 * /v1/models, /v1/chat/completions and /v1/messages gateway surfaces.
 * Supports all 34 real providers as per FreeLLMAPI (tashfeenahmed/freellmapi).
 */

import { config } from '../config';

export type FlmProviderId =
  | 'google'
  | 'groq'
  | 'cerebras'
  | 'mistral'
  | 'openrouter'
  | 'cohere'
  | 'nvidia'
  | 'huggingface'
  | 'cloudflare'
  | 'sambanova'
  | 'deepinfra'
  | 'together'
  | 'fireworks'
  | 'ai21'
  | 'lepton'
  | 'hyperbolic'
  | 'novita'
  | 'replicate'
  | 'perplexity'
  | 'github'
  | 'zhipu'
  | 'modelscope'
  | 'siliconflow'
  | 'qianfan'
  | 'hunyuan'
  | 'moonshot'
  | 'minimax'
  | 'zeroone'
  | 'baseten'
  | 'lambda'
  | 'scaleway'
  | 'upstage'
  | 'friendli'
  | 'pollinations'
  | 'local';

interface FlmProviderDef {
  id: FlmProviderId;
  name: string;
  baseUrl: string;
  envVar: string;
  /** True if this provider works without any API key */
  keyless?: boolean;
}

export const PROVIDERS: Record<FlmProviderId, FlmProviderDef> = {
  google: { id: 'google', name: 'Google AI Studio', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', envVar: 'GEMINI_API_KEY' },
  groq: { id: 'groq', name: 'Groq Cloud', baseUrl: 'https://api.groq.com/openai/v1', envVar: 'GROQ_API_KEY' },
  cerebras: { id: 'cerebras', name: 'Cerebras Cloud', baseUrl: 'https://api.cerebras.ai/v1', envVar: 'CEREBRAS_API_KEY' },
  mistral: { id: 'mistral', name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1', envVar: 'MISTRAL_API_KEY' },
  openrouter: { id: 'openrouter', name: 'OpenRouter Free', baseUrl: 'https://openrouter.ai/api/v1', envVar: 'OPENROUTER_API_KEY' },
  cohere: { id: 'cohere', name: 'Cohere Trial', baseUrl: 'https://api.cohere.ai/compatibility/v1', envVar: 'COHERE_API_KEY' },
  nvidia: { id: 'nvidia', name: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1', envVar: 'NVIDIA_API_KEY' },
  huggingface: { id: 'huggingface', name: 'Hugging Face Inference', baseUrl: 'https://api-inference.huggingface.co/v1', envVar: 'HUGGINGFACE_API_KEY' },
  cloudflare: { id: 'cloudflare', name: 'Cloudflare Workers AI', baseUrl: 'https://api.cloudflare.com/client/v4/accounts/ai/v1', envVar: 'CLOUDFLARE_API_KEY' },
  sambanova: { id: 'sambanova', name: 'SambaNova Systems', baseUrl: 'https://api.sambanova.ai/v1', envVar: 'SAMBANOVA_API_KEY' },
  deepinfra: { id: 'deepinfra', name: 'DeepInfra', baseUrl: 'https://api.deepinfra.com/v1/openai', envVar: 'DEEPINFRA_API_KEY' },
  together: { id: 'together', name: 'Together AI', baseUrl: 'https://api.together.xyz/v1', envVar: 'TOGETHER_API_KEY' },
  fireworks: { id: 'fireworks', name: 'Fireworks AI', baseUrl: 'https://api.fireworks.ai/inference/v1', envVar: 'FIREWORKS_API_KEY' },
  ai21: { id: 'ai21', name: 'AI21 Labs', baseUrl: 'https://api.ai21.com/studio/v1', envVar: 'AI21_API_KEY' },
  lepton: { id: 'lepton', name: 'Lepton AI', baseUrl: 'https://api.lepton.ai/v1', envVar: 'LEPTON_API_KEY' },
  hyperbolic: { id: 'hyperbolic', name: 'Hyperbolic', baseUrl: 'https://api.hyperbolic.xyz/v1', envVar: 'HYPERBOLIC_API_KEY' },
  novita: { id: 'novita', name: 'Novita AI', baseUrl: 'https://api.novita.ai/v3/openai', envVar: 'NOVITA_API_KEY' },
  replicate: { id: 'replicate', name: 'Replicate', baseUrl: 'https://api.replicate.com/v1', envVar: 'REPLICATE_API_TOKEN' },
  perplexity: { id: 'perplexity', name: 'Perplexity AI', baseUrl: 'https://api.perplexity.ai', envVar: 'PERPLEXITY_API_KEY' },
  github: { id: 'github', name: 'GitHub Models', baseUrl: 'https://models.inference.ai.azure.com', envVar: 'GITHUB_TOKEN' },
  zhipu: { id: 'zhipu', name: 'Zhipu AI (GLM)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', envVar: 'ZHIPU_API_KEY' },
  modelscope: { id: 'modelscope', name: 'ModelScope (Alibaba)', baseUrl: 'https://api-inference.modelscope.cn/v1', envVar: 'MODELSCOPE_API_KEY' },
  siliconflow: { id: 'siliconflow', name: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1', envVar: 'SILICONFLOW_API_KEY' },
  qianfan: { id: 'qianfan', name: 'Baidu Qianfan', baseUrl: 'https://qianfan.baidubce.com/v2', envVar: 'BAIDU_API_KEY' },
  hunyuan: { id: 'hunyuan', name: 'Tencent Hunyuan', baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1', envVar: 'HUNYUAN_SECRET_KEY' },
  moonshot: { id: 'moonshot', name: 'Moonshot AI', baseUrl: 'https://api.moonshot.cn/v1', envVar: 'MOONSHOT_API_KEY' },
  minimax: { id: 'minimax', name: 'MiniMax', baseUrl: 'https://api.minimax.chat/v1', envVar: 'MINIMAX_API_KEY' },
  zeroone: { id: 'zeroone', name: '01.AI', baseUrl: 'https://api.01.ai/v1', envVar: 'ZEROONE_API_KEY' },
  baseten: { id: 'baseten', name: 'Baseten', baseUrl: 'https://bridge.baseten.co/v1', envVar: 'BASETEN_API_KEY' },
  lambda: { id: 'lambda', name: 'Lambda Cloud', baseUrl: 'https://api.lambdalabs.com/v1', envVar: 'LAMBDA_API_KEY' },
  scaleway: { id: 'scaleway', name: 'Scaleway', baseUrl: 'https://api.scaleway.ai/v1', envVar: 'SCALEWAY_API_KEY' },
  upstage: { id: 'upstage', name: 'Upstage AI', baseUrl: 'https://api.upstage.ai/v1/solar', envVar: 'UPSTAGE_API_KEY' },
  friendli: { id: 'friendli', name: 'FriendliAI', baseUrl: 'https://inference.friendli.ai/v1', envVar: 'FRIENDLI_TOKEN' },
  /** Truly keyless — no API key required; uses public OpenAI-compatible endpoint */
  pollinations: { id: 'pollinations', name: 'Pollinations.AI', baseUrl: 'https://text.pollinations.ai/openai', envVar: '', keyless: true },
  local: { id: 'local', name: 'Custom / Local', baseUrl: process.env.LOCAL_OPENAI_BASE_URL || 'http://localhost:11434/v1', envVar: 'LOCAL_OPENAI_BASE_URL' },
};

export interface FlmModelDef {
  /** Public FreeLLMAPI model id (what callers ask for). */
  id: string;
  /** Upstream model id sent to the provider. */
  upstreamId: string;
  provider: FlmProviderId;
  tier: 'reasoning' | 'fast' | 'coding' | 'multimodal';
  priority: number;
  /** True if this model requires no API key */
  keyless?: boolean;
}

export const FLM_MODELS: FlmModelDef[] = [
  // Keyless models — no API key required (always available)
  { id: 'pollinations-mistral', upstreamId: 'mistral', provider: 'pollinations', tier: 'fast', priority: 11, keyless: true },
  { id: 'pollinations-openai', upstreamId: 'openai', provider: 'pollinations', tier: 'fast', priority: 10, keyless: true },
  { id: 'pollinations-deepseek', upstreamId: 'deepseek-reasoner', provider: 'pollinations', tier: 'reasoning', priority: 10, keyless: true },
  { id: 'pollinations-llama', upstreamId: 'llama', provider: 'pollinations', tier: 'fast', priority: 9, keyless: true },
  { id: 'pollinations-qwen', upstreamId: 'qwen', provider: 'pollinations', tier: 'fast', priority: 9, keyless: true },
  // Keyed models (enabled when env var is set)
  { id: 'gemini-2.5-flash', upstreamId: 'gemini-2.5-flash', provider: 'google', tier: 'fast', priority: 10 },
  { id: 'gemini-2.5-pro', upstreamId: 'gemini-2.5-pro', provider: 'google', tier: 'reasoning', priority: 9 },
  { id: 'llama-3.3-70b-versatile', upstreamId: 'llama-3.3-70b-versatile', provider: 'groq', tier: 'fast', priority: 10 },
  { id: 'deepseek-r1-distill-llama-70b', upstreamId: 'deepseek-r1-distill-llama-70b', provider: 'groq', tier: 'reasoning', priority: 9 },
  { id: 'cerebras-llama-3.3-70b', upstreamId: 'llama-3.3-70b', provider: 'cerebras', tier: 'fast', priority: 9 },
  { id: 'codestral-22b', upstreamId: 'codestral-latest', provider: 'mistral', tier: 'coding', priority: 8 },
  { id: 'pixtral-12b', upstreamId: 'pixtral-12b', provider: 'mistral', tier: 'multimodal', priority: 8 },
  { id: 'deepseek-r1-free', upstreamId: 'deepseek/deepseek-r1:free', provider: 'openrouter', tier: 'reasoning', priority: 7 },
  { id: 'qwen-2.5-coder-32b', upstreamId: 'Qwen2.5-72B-Instruct', provider: 'sambanova', tier: 'coding', priority: 8 },
  { id: 'command-r-plus', upstreamId: 'command-r-plus', provider: 'cohere', tier: 'reasoning', priority: 8 },
  { id: 'nvidia-llama-3.3-70b', upstreamId: 'meta/llama-3.3-70b-instruct', provider: 'nvidia', tier: 'fast', priority: 8 },
  { id: 'glm-4-flash', upstreamId: 'glm-4-flash', provider: 'zhipu', tier: 'fast', priority: 8 },
];

export interface FlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface FlmChatRequest {
  messages: FlmMessage[];
  /** Public FreeLLMAPI model id; unknown ids fall through to the default chain. */
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface FlmAttempt {
  model: string;
  provider: string;
  status: number;
  latencyMs: number;
}

export interface FlmChatOk {
  ok: true;
  content: string;
  /** Public FreeLLMAPI id of the model that answered. */
  model: string;
  provider: string;
  providerName: string;
  latencyMs: number;
  attempts: FlmAttempt[];
  raw: unknown;
}

export interface FlmChatFail {
  ok: false;
  error: string;
  attempts: FlmAttempt[];
}

export function providerApiKey(providerId: FlmProviderId): string {
  const plat = PROVIDERS[providerId];
  if (!plat) return '';

  // Check config object first
  const configKey = (config as unknown as Record<string, unknown>)[`FLM_${providerId.toUpperCase()}_API_KEY`] as string || '';
  if (configKey) return configKey;

  // Standard environment variables
  if (providerId === 'google') return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.FLM_GOOGLE_API_KEY || '';
  if (providerId === 'groq') return process.env.GROQ_API_KEY || process.env.FLM_GROQ_API_KEY || '';
  if (providerId === 'cerebras') return process.env.CEREBRAS_API_KEY || process.env.FLM_CEREBRAS_API_KEY || '';
  if (providerId === 'mistral') return process.env.MISTRAL_API_KEY || process.env.FLM_MISTRAL_API_KEY || '';
  if (providerId === 'openrouter') return process.env.OPENROUTER_API_KEY || process.env.FLM_OPENROUTER_API_KEY || '';
  if (providerId === 'sambanova') return process.env.SAMBANOVA_API_KEY || process.env.FLM_SAMBANOVA_API_KEY || '';
  if (providerId === 'nvidia') return process.env.NVIDIA_API_KEY || process.env.FLM_NVIDIA_API_KEY || '';
  if (providerId === 'cohere') return process.env.COHERE_API_KEY || process.env.FLM_COHERE_API_KEY || '';
  if (providerId === 'huggingface') return process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '';
  if (providerId === 'cloudflare') return process.env.CLOUDFLARE_API_KEY || '';
  if (providerId === 'deepinfra') return process.env.DEEPINFRA_API_KEY || '';
  if (providerId === 'together') return process.env.TOGETHER_API_KEY || '';
  if (providerId === 'fireworks') return process.env.FIREWORKS_API_KEY || '';
  if (providerId === 'ai21') return process.env.AI21_API_KEY || '';
  if (providerId === 'lepton') return process.env.LEPTON_API_KEY || '';
  if (providerId === 'hyperbolic') return process.env.HYPERBOLIC_API_KEY || '';
  if (providerId === 'novita') return process.env.NOVITA_API_KEY || '';
  if (providerId === 'replicate') return process.env.REPLICATE_API_TOKEN || '';
  if (providerId === 'perplexity') return process.env.PERPLEXITY_API_KEY || '';
  if (providerId === 'github') return process.env.GITHUB_TOKEN || '';
  if (providerId === 'zhipu') return process.env.ZHIPU_API_KEY || '';
  if (providerId === 'modelscope') return process.env.MODELSCOPE_API_KEY || '';
  if (providerId === 'siliconflow') return process.env.SILICONFLOW_API_KEY || '';
  if (providerId === 'qianfan') return process.env.BAIDU_API_KEY || '';
  if (providerId === 'hunyuan') return process.env.HUNYUAN_SECRET_KEY || '';
  if (providerId === 'moonshot') return process.env.MOONSHOT_API_KEY || '';
  if (providerId === 'minimax') return process.env.MINIMAX_API_KEY || '';
  if (providerId === 'zeroone') return process.env.ZEROONE_API_KEY || '';
  if (providerId === 'baseten') return process.env.BASETEN_API_KEY || '';
  if (providerId === 'lambda') return process.env.LAMBDA_API_KEY || '';
  if (providerId === 'scaleway') return process.env.SCALEWAY_API_KEY || '';
  if (providerId === 'upstage') return process.env.UPSTAGE_API_KEY || '';
  if (providerId === 'friendli') return process.env.FRIENDLI_TOKEN || '';
  if (providerId === 'local') return process.env.LOCAL_OPENAI_BASE_URL || 'http://localhost:11434/v1';

  return process.env[plat.envVar] || '';
}

export function enabledModels(): FlmModelDef[] {
  // Keyless models are always enabled; keyed models require a set env var
  return FLM_MODELS.filter((m) => {
    if (m.keyless || PROVIDERS[m.provider]?.keyless) return true;
    return !!providerApiKey(m.provider);
  });
}

function defaultChain(): FlmModelDef[] {
  const enabled = enabledModels();
  if (enabled.length > 0) {
    return enabled.sort((a, b) => b.priority - a.priority);
  }
  // If no keyed providers configured yet, return all known models so discovery works
  return [...FLM_MODELS].sort((a, b) => b.priority - a.priority);
}

function resolveChain(modelId: string | undefined): FlmModelDef[] {
  const chain = defaultChain();
  if (!modelId) return chain;
  const requested = FLM_MODELS.find((m) => m.id === modelId);
  if (!requested) return chain;
  const rest = chain.filter((m) => m.id !== modelId);
  return [requested, ...rest];
}

async function dispatchOne(
  model: FlmModelDef,
  bodyMessages: FlmMessage[],
  maxTokens: number,
  temperature: number,
  timeoutMs: number,
): Promise<Response> {
  const provider = PROVIDERS[model.provider];
  const key = providerApiKey(model.provider);
  const flooredTokens = Math.max(maxTokens, 320);

  // Pollinations uses a standard OpenAI-compatible endpoint; no auth needed
  return fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({
      messages: bodyMessages,
      max_tokens: flooredTokens,
      temperature,
      stream: false,
      model: model.upstreamId,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

/** Failover triggers: status code suggesting this route is unable to answer. */
function shouldFailOver(status: number): boolean {
  return status === 401 || status === 403 || status === 408 || status === 429 || status >= 500;
}

/**
 * Run a chat completion through the provider chain.
 * Returns the first model in the chain that answers with usable content.
 */
export async function chatComplete(req: FlmChatRequest): Promise<FlmChatOk | FlmChatFail> {
  const chain = resolveChain(req.model);
  const attempts: FlmAttempt[] = [];
  const maxTokens = req.maxTokens ?? 700;
  const temperature = req.temperature ?? 0.3;

  for (const model of chain) {
    const started = Date.now();
    let res: Response;
    try {
      res = await dispatchOne(model, req.messages, maxTokens, temperature, req.timeoutMs ?? 90_000);
    } catch {
      attempts.push({ model: model.id, provider: model.provider, status: 0, latencyMs: Date.now() - started });
      continue;
    }
    attempts.push({ model: model.id, provider: model.provider, status: res.status, latencyMs: Date.now() - started });
    if (!res.ok) {
      if (shouldFailOver(res.status)) continue;
      const errText = await res.text().catch(() => '');
      return { ok: false, error: `${model.id}: HTTP ${res.status} ${errText.slice(0, 240)}`, attempts };
    }
    const json = (await res.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string } }> }
      | null;
    const content = json?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) continue;
    return {
      ok: true,
      content,
      model: model.id,
      provider: model.provider,
      providerName: PROVIDERS[model.provider].name,
      latencyMs: attempts[attempts.length - 1].latencyMs,
      attempts,
      raw: json,
    };
  }

  return {
    ok: false,
    error: 'No FreeLLMAPI model answered (all chain attempts failed)',
    attempts,
  };
}
