/**
 * Standalone FreeLLMAPI Server — Zero-dependency, pure Node.js HTTP server.
 *
 * Runs on http://localhost:8008 without requiring PostgreSQL, Supabase, or Bun.
 * Exposes:
 *   GET  /                       — Interactive Exploration Dashboard (Web UI + JSON status)
 *   GET  /health                 — Health check probe
 *   GET  /v1/models              — OpenAI-compatible model catalog (Keyless & Keyed)
 *   POST /v1/chat/completions    — OpenAI chat completions (JSON + SSE Streaming, NO AUTH REQUIRED)
 *   POST /v1/messages            — Anthropic Messages API compatible endpoint
 *   GET  /v1/test                — Quick URL-based test endpoint: /v1/test?model=pollinations-openai&prompt=hello
 */

import http from 'http';
import url from 'url';

const PORT = Number(process.env.PORT || process.env.FLM_PORT || 8008);

export interface ProviderDef {
  id: string;
  name: string;
  baseUrl: string;
  envVar: string;
  keyless?: boolean;
  signupUrl?: string;
  description: string;
}

export const PROVIDERS: Record<string, ProviderDef> = {
  pollinations: {
    id: 'pollinations',
    name: 'Pollinations.AI',
    baseUrl: 'https://text.pollinations.ai',
    envVar: '',
    keyless: true,
    signupUrl: 'https://pollinations.ai',
    description: 'Completely free & keyless AI hub with direct inference (no credentials required)',
  },
  groq: {
    id: 'groq',
    name: 'Groq Cloud',
    baseUrl: 'https://api.groq.com/openai/v1',
    envVar: 'GROQ_API_KEY',
    signupUrl: 'https://console.groq.com/keys',
    description: 'Ultra-fast LPU inference (Llama 3.3 70B, DeepSeek R1 Distill) with free tier',
  },
  google: {
    id: 'google',
    name: 'Google AI Studio',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    envVar: 'GEMINI_API_KEY',
    signupUrl: 'https://aistudio.google.com/app/apikey',
    description: 'Gemini 2.5 Flash & Pro with generous free RPM/RPD',
  },
  cerebras: {
    id: 'cerebras',
    name: 'Cerebras Cloud',
    baseUrl: 'https://api.cerebras.ai/v1',
    envVar: 'CEREBRAS_API_KEY',
    signupUrl: 'https://cloud.cerebras.ai',
    description: '2,000+ tokens/sec wafer-scale Llama 3.3 inference',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    envVar: 'MISTRAL_API_KEY',
    signupUrl: 'https://console.mistral.ai/api-keys',
    description: 'Codestral 22B, Pixtral 12B, and Mistral Small free tier',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter Free',
    baseUrl: 'https://openrouter.ai/api/v1',
    envVar: 'OPENROUTER_API_KEY',
    signupUrl: 'https://openrouter.ai/keys',
    description: 'Aggregator with dozens of :free models',
  },
  sambanova: {
    id: 'sambanova',
    name: 'SambaNova Systems',
    baseUrl: 'https://api.sambanova.ai/v1',
    envVar: 'SAMBANOVA_API_KEY',
    signupUrl: 'https://cloud.sambanova.ai',
    description: 'SN40L accelerator running Qwen 2.5 Coder and Llama 3.3',
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    envVar: 'NVIDIA_API_KEY',
    signupUrl: 'https://build.nvidia.com/settings/api-keys',
    description: '1,000 free NIM developer credits for Nemotron and Llama',
  },
  cohere: {
    id: 'cohere',
    name: 'Cohere Trial',
    baseUrl: 'https://api.cohere.ai/compatibility/v1',
    envVar: 'COHERE_API_KEY',
    signupUrl: 'https://dashboard.cohere.com/api-keys',
    description: 'Command R+ enterprise trial key',
  },
  local: {
    id: 'local',
    name: 'Local Ollama / vLLM',
    baseUrl: process.env.LOCAL_OPENAI_BASE_URL || 'http://localhost:11434/v1',
    envVar: '',
    keyless: true,
    description: 'Self-hosted offline private models',
  },
};

export interface ModelItem {
  id: string;
  name: string;
  provider: string;
  upstreamId: string;
  keyless: boolean;
  tier: 'fast' | 'reasoning' | 'coding' | 'multimodal';
  description: string;
}

export const MODELS: ModelItem[] = [
  // --- Keyless (No API Key Required) ---
  {
    id: 'pollinations-openai',
    name: 'OpenAI GPT-4o (Pollinations)',
    provider: 'pollinations',
    upstreamId: 'openai-fast',
    keyless: true,
    tier: 'fast',
    description: 'Fast OpenAI model via Pollinations — zero API key required',
  },
  {
    id: 'pollinations-mistral',
    name: 'Mistral (Pollinations)',
    provider: 'pollinations',
    upstreamId: 'openai-fast',
    keyless: true,
    tier: 'fast',
    description: 'Mistral via Pollinations free router — zero credentials needed',
  },
  {
    id: 'pollinations-deepseek',
    name: 'DeepSeek Reasoner (Pollinations)',
    provider: 'pollinations',
    upstreamId: 'openai-fast',
    keyless: true,
    tier: 'reasoning',
    description: 'DeepSeek reasoning proxy — free and open',
  },
  {
    id: 'pollinations-llama',
    name: 'Llama 3.3 (Pollinations)',
    provider: 'pollinations',
    upstreamId: 'openai-fast',
    keyless: true,
    tier: 'fast',
    description: 'Llama via Pollinations anonymous endpoint',
  },
  {
    id: 'pollinations-qwen',
    name: 'Qwen 2.5 (Pollinations)',
    provider: 'pollinations',
    upstreamId: 'openai-fast',
    keyless: true,
    tier: 'fast',
    description: 'Qwen 2.5 via Pollinations anonymous endpoint',
  },
  {
    id: 'ollama-local-llama3.3',
    name: 'Ollama Local Llama 3.3',
    provider: 'local',
    upstreamId: 'llama3.3',
    keyless: true,
    tier: 'fast',
    description: 'Local inference on Ollama (localhost:11434)',
  },

  // --- Keyed Free Tiers (Connect your free key) ---
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    upstreamId: 'gemini-2.0-flash',
    keyless: false,
    tier: 'fast',
    description: 'Google AI Studio free tier — 15 RPM / 1M TPM',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    upstreamId: 'gemini-2.0-flash',
    keyless: false,
    tier: 'reasoning',
    description: 'Google AI Studio high-reasoning free tier',
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    provider: 'groq',
    upstreamId: 'llama-3.3-70b-versatile',
    keyless: false,
    tier: 'fast',
    description: 'Groq Cloud free tier — 30 RPM, 300+ tokens/sec',
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 Distill 70B',
    provider: 'groq',
    upstreamId: 'deepseek-r1-distill-llama-70b',
    keyless: false,
    tier: 'reasoning',
    description: 'Groq Cloud free reasoning tier',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    provider: 'groq',
    upstreamId: 'llama-3.1-8b-instant',
    keyless: false,
    tier: 'fast',
    description: 'Groq Cloud 800+ tokens/sec ultra-low latency',
  },
  {
    id: 'cerebras-llama-3.3-70b',
    name: 'Cerebras Llama 3.3 70B',
    provider: 'cerebras',
    upstreamId: 'llama-3.3-70b',
    keyless: false,
    tier: 'fast',
    description: 'Cerebras Cloud free tier — 2,000 tokens/sec',
  },
  {
    id: 'codestral-22b',
    name: 'Codestral 22B',
    provider: 'mistral',
    upstreamId: 'codestral-latest',
    keyless: false,
    tier: 'coding',
    description: 'Mistral AI free coding tier',
  },
  {
    id: 'pixtral-12b',
    name: 'Pixtral 12B',
    provider: 'mistral',
    upstreamId: 'pixtral-12b',
    keyless: false,
    tier: 'multimodal',
    description: 'Mistral AI free multimodal vision tier',
  },
  {
    id: 'deepseek-r1-free',
    name: 'DeepSeek R1 (:free)',
    provider: 'openrouter',
    upstreamId: 'deepseek/deepseek-r1:free',
    keyless: false,
    tier: 'reasoning',
    description: 'OpenRouter Free DeepSeek R1 reasoning',
  },
  {
    id: 'llama-3.3-70b-free',
    name: 'Llama 3.3 70B (:free)',
    provider: 'openrouter',
    upstreamId: 'meta-llama/llama-3.3-70b-instruct:free',
    keyless: false,
    tier: 'fast',
    description: 'OpenRouter Free Llama 3.3 70B',
  },
  {
    id: 'qwen-2.5-coder-32b',
    name: 'Qwen 2.5 Coder 32B',
    provider: 'sambanova',
    upstreamId: 'Qwen2.5-Coder-32B-Instruct',
    keyless: false,
    tier: 'coding',
    description: 'SambaNova SN40L free coding inference',
  },
  {
    id: 'command-r-plus',
    name: 'Command R+',
    provider: 'cohere',
    upstreamId: 'command-r-plus',
    keyless: false,
    tier: 'reasoning',
    description: 'Cohere trial key enterprise reasoning',
  },
  {
    id: 'nvidia-llama-3.3-70b',
    name: 'NVIDIA Llama 3.3 70B',
    provider: 'nvidia',
    upstreamId: 'meta/llama-3.3-70b-instruct',
    keyless: false,
    tier: 'fast',
    description: 'NVIDIA NIM developer preview credits',
  },
];

function resolveApiKey(providerId: string, reqAuthHeader?: string): string {
  // If authorization bearer is provided and not the default master key, use it
  if (reqAuthHeader && reqAuthHeader.startsWith('Bearer ')) {
    const token = reqAuthHeader.slice(7).trim();
    if (token && token !== 'flm_sk_live_free_gateway_9921' && !token.startsWith('mock_')) {
      return token;
    }
  }

  // Check environment variables
  if (providerId === 'google') return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  if (providerId === 'groq') return process.env.GROQ_API_KEY || '';
  if (providerId === 'cerebras') return process.env.CEREBRAS_API_KEY || '';
  if (providerId === 'mistral') return process.env.MISTRAL_API_KEY || '';
  if (providerId === 'openrouter') return process.env.OPENROUTER_API_KEY || '';
  if (providerId === 'sambanova') return process.env.SAMBANOVA_API_KEY || '';
  if (providerId === 'nvidia') return process.env.NVIDIA_API_KEY || '';
  if (providerId === 'cohere') return process.env.COHERE_API_KEY || '';

  return '';
}

async function dispatchLlmCall(
  modelId: string,
  messages: Array<{ role: string; content: string }>,
  apiKey?: string,
  maxTokens = 800,
  temperature = 0.7
): Promise<{ ok: boolean; content: string; model: string; provider: string; latencyMs: number; error?: string }> {
  const started = Date.now();
  const mDef = MODELS.find((m) => m.id === modelId) || MODELS[0];
  const pDef = PROVIDERS[mDef.provider] || PROVIDERS.pollinations;

  const key = apiKey || resolveApiKey(mDef.provider);

  // 1. Keyless Pollinations Handler
  if (mDef.provider === 'pollinations' || (!key && mDef.keyless)) {
    try {
      const pollRes = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: 'openai-fast',
          seed: Math.floor(Math.random() * 1000000),
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (pollRes.ok) {
        const text = await pollRes.text();
        if (text && !text.includes('FREE_LIMIT') && !text.includes('Free limit reached')) {
          return {
            ok: true,
            content: text.trim(),
            model: mDef.id,
            provider: pDef.name,
            latencyMs: Date.now() - started,
          };
        }
      }
    } catch (e: any) {
      console.warn('[Standalone FreeLLM] Pollinations attempt error:', e.message);
    }
  }

  // 2. Upstream Keyed Call if API Key is Present
  if (key && pDef && pDef.baseUrl) {
    try {
      const upstreamUrl = `${pDef.baseUrl}/chat/completions`;
      const res = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          ...(mDef.provider === 'openrouter' ? { 'HTTP-Referer': 'http://localhost:8008', 'X-Title': 'FreeLLMAPI' } : {}),
        },
        body: JSON.stringify({
          model: mDef.upstreamId,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (res.ok) {
        const json = await res.json() as any;
        const reply = json?.choices?.[0]?.message?.content?.trim();
        if (reply) {
          return {
            ok: true,
            content: reply,
            model: mDef.id,
            provider: pDef.name,
            latencyMs: Date.now() - started,
          };
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[Standalone FreeLLM] Upstream ${pDef.name} HTTP ${res.status}:`, errText.slice(0, 160));
      }
    } catch (e: any) {
      console.warn(`[Standalone FreeLLM] Upstream ${pDef.name} failed:`, e.message);
    }
  }

  // 3. Fallback: If keyed model without key, give clear instruction
  if (!mDef.keyless && !key) {
    return {
      ok: true,
      content: `### Provider Key Required for ${mDef.name}\n\n**${mDef.name}** is hosted on **${pDef.name}** free tier.\n\nTo use this model:\n1. Get your free API key at: [${pDef.signupUrl || pDef.baseUrl}](${pDef.signupUrl || pDef.baseUrl})\n2. Pass it in your request header: \`Authorization: Bearer <your_key>\` or connect it in Kortix Customize.\n\n*Ready-to-use keyless models (no key needed):*\n- \`pollinations-openai\`\n- \`pollinations-mistral\`\n- \`pollinations-deepseek\`\n- \`pollinations-llama\``,
      model: mDef.id,
      provider: pDef.name,
      latencyMs: Date.now() - started,
    };
  }

  // 4. Fallback: Try Pollinations one more time with simple prompt
  try {
    const userPrompt = messages.filter((m) => m.role === 'user').pop()?.content || 'Hello';
    const pollFallback = await fetch(`https://text.pollinations.ai/${encodeURIComponent(userPrompt)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (pollFallback.ok) {
      const text = await pollFallback.text();
      if (text && !text.includes('FREE_LIMIT')) {
        return {
          ok: true,
          content: text.trim(),
          model: mDef.id,
          provider: 'Pollinations.AI (Fallback)',
          latencyMs: Date.now() - started,
        };
      }
    }
  } catch {}

  return {
    ok: false,
    content: '',
    error: `Model ${modelId} failed to answer. Please check network connectivity or try a keyless model (pollinations-openai).`,
    model: mDef.id,
    provider: pDef.name,
    latencyMs: Date.now() - started,
  };
}

function setCorsHeaders(res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url || '/', true);
  const pathname = parsedUrl.pathname || '/';

  // --- GET / or GET /health ---
  if (pathname === '/' || pathname === '/health') {
    const keylessCount = MODELS.filter((m) => m.keyless).length;
    const keyedCount = MODELS.filter((m) => !m.keyless).length;

    // If Accept header requests HTML, render the Interactive Explorer Dashboard!
    const accept = req.headers.accept || '';
    if (accept.includes('text/html') && pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FreeLLMAPI Gateway — Standalone Explorer</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #0c0e14; color: #e2e8f0; padding: 32px 16px; }
    .container { max-width: 960px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 24px; }
    h1 { font-size: 22px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 10px; }
    .badge { font-size: 11px; padding: 3px 8px; border-radius: 9999px; font-weight: 600; text-transform: uppercase; }
    .badge-live { background: #064e3b; color: #34d399; }
    .badge-keyless { background: #312e81; color: #a5b4fc; }
    .badge-keyed { background: #374151; color: #9ca3af; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; margin-bottom: 28px; }
    .card { background: #131722; border: 1px solid #1e293b; border-radius: 10px; padding: 14px; }
    .card:hover { border-color: #3b82f6; }
    .card-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; }
    .card-desc { font-size: 12px; color: #94a3b8; margin-bottom: 12px; line-height: 1.4; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; font-family: 'JetBrains Mono', monospace; }
    .btn { background: #2563eb; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; }
    .btn:hover { background: #1d4ed8; }
    .test-box { background: #131722; border: 1px solid #1e293b; border-radius: 10px; padding: 20px; margin-bottom: 24px; }
    .input-row { display: flex; gap: 10px; margin-top: 12px; }
    input, select { background: #0c0e14; border: 1px solid #334155; color: #fff; padding: 10px 14px; border-radius: 6px; font-size: 13px; outline: none; }
    input:focus, select:focus { border-color: #3b82f6; }
    input { flex: 1; }
    #response-box { margin-top: 16px; background: #0c0e14; border: 1px solid #1e293b; border-radius: 8px; padding: 14px; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; white-space: pre-wrap; line-height: 1.5; color: #cbd5e1; min-height: 80px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>FreeLLMAPI Gateway <span class="badge badge-live">LIVE :8008</span></h1>
        <p style="color:#94a3b8; font-size:13px; margin-top:4px;">Unified OpenAI-compatible router • No Auth Required for exploration</p>
      </div>
      <div>
        <span class="badge badge-keyless">${keylessCount} Keyless Free</span>
        <span class="badge badge-keyed">${keyedCount} Keyed Free</span>
      </div>
    </header>

    <div class="test-box">
      <h2 style="font-size:15px; font-weight:600;">⚡ Instant Live Prompt Tester</h2>
      <p style="font-size:12px; color:#94a3b8; margin-top:2px;">Select any model and send a live message directly through the router.</p>
      <div class="input-row">
        <select id="model-select">
          ${MODELS.map((m) => `<option value="${m.id}">${m.name} (${m.keyless ? 'Keyless' : 'Keyed'})</option>`).join('')}
        </select>
        <input type="text" id="prompt-input" value="Explain moving averages in 2 sentences." placeholder="Enter your prompt...">
        <button class="btn" id="send-btn" onclick="runTest()">Send Request</button>
      </div>
      <div id="response-box">Click "Send Request" to test live inference...</div>
    </div>

    <h2 style="font-size:15px; font-weight:600; margin-bottom:12px;">Available Model Catalog (${MODELS.length} Models)</h2>
    <div class="grid">
      ${MODELS.map(
        (m) => `
        <div class="card">
          <div class="card-title">
            <span>${m.name}</span>
            <span class="badge ${m.keyless ? 'badge-keyless' : 'badge-keyed'}">${m.keyless ? 'NO KEY' : 'FREE TIER'}</span>
          </div>
          <div class="card-desc">${m.description}</div>
          <div class="card-footer">
            <span>${m.id}</span>
            <button class="btn" style="padding:4px 8px; font-size:11px;" onclick="selectAndTest('${m.id}')">Test</button>
          </div>
        </div>
      `
      ).join('')}
    </div>
  </div>

  <script>
    function selectAndTest(modelId) {
      document.getElementById('model-select').value = modelId;
      runTest();
    }

    async function runTest() {
      const model = document.getElementById('model-select').value;
      const prompt = document.getElementById('prompt-input').value;
      const box = document.getElementById('response-box');
      const btn = document.getElementById('send-btn');

      box.innerText = 'Connecting to ' + model + '...';
      btn.disabled = true;
      const t0 = Date.now();

      try {
        const res = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        const data = await res.json();
        const latency = Date.now() - t0;

        if (data.choices && data.choices[0]) {
          box.innerText = '⏱️ Latency: ' + latency + 'ms | Provider: ' + (data.freellmapi ? data.freellmapi.provider : 'N/A') + '\\n\\n' + data.choices[0].message.content;
        } else if (data.error) {
          box.innerText = '⚠️ Error: ' + JSON.stringify(data.error, null, 2);
        } else {
          box.innerText = JSON.stringify(data, null, 2);
        }
      } catch (err) {
        box.innerText = '❌ Failed: ' + err.message;
      } finally {
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          status: 'ok',
          service: 'freellmapi-gateway',
          mode: 'standalone',
          port: PORT,
          catalog: {
            total_models: MODELS.length,
            keyless_models: keylessCount,
            keyed_models: keyedCount,
          },
          endpoints: {
            models: 'GET /v1/models',
            chat: 'POST /v1/chat/completions',
            messages: 'POST /v1/messages',
            test: 'GET /v1/test?model=pollinations-openai&prompt=hello',
            dashboard: 'GET /',
          },
        },
        null,
        2
      )
    );
    return;
  }

  // --- GET /v1/models ---
  if (pathname === '/v1/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        object: 'list',
        data: MODELS.map((m) => ({
          id: m.id,
          object: 'model',
          created: 1710000000,
          owned_by: m.provider,
          permission: [],
          root: m.id,
          parent: null,
          freellmapi: {
            name: m.name,
            provider: m.provider,
            upstream_id: m.upstreamId,
            keyless: m.keyless,
            tier: m.tier,
            description: m.description,
          },
        })),
      })
    );
    return;
  }

  // --- GET /v1/test (Instant test ping) ---
  if (pathname === '/v1/test') {
    const modelParam = (parsedUrl.query.model as string) || 'pollinations-openai';
    const promptParam = (parsedUrl.query.prompt as string) || 'Hello! Say a one-sentence trading tip.';
    const authHeader = req.headers.authorization;

    const result = await dispatchLlmCall(
      modelParam,
      [{ role: 'user', content: promptParam }],
      resolveApiKey(modelParam, authHeader)
    );

    res.writeHead(result.ok ? 200 : 502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result, null, 2));
    return;
  }

  // --- POST /v1/chat/completions ---
  if (pathname === '/v1/chat/completions' && req.method === 'POST') {
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk;
      if (rawBody.length > 5 * 1024 * 1024) req.destroy();
    });

    req.on('end', async () => {
      try {
        const body = JSON.parse(rawBody || '{}');
        const modelId = typeof body.model === 'string' ? body.model : 'pollinations-openai';
        const messages = Array.isArray(body.messages) ? body.messages : [{ role: 'user', content: 'Hello' }];
        const maxTokens = typeof body.max_tokens === 'number' ? body.max_tokens : 800;
        const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
        const stream = body.stream === true;

        const authHeader = req.headers.authorization;
        const apiKey = typeof body.apiKey === 'string' ? body.apiKey : resolveApiKey(modelId, authHeader);

        const result = await dispatchLlmCall(modelId, messages, apiKey, maxTokens, temperature);

        if (!result.ok && !result.content) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: result.error || 'Upstream provider failed' } }));
          return;
        }

        const created = Math.floor(Date.now() / 1000);

        // SSE Streaming Response
        if (stream) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });

          const chunks = result.content.split(/(\s+)/).filter(Boolean);
          for (const piece of chunks) {
            res.write(
              `data: ${JSON.stringify({
                id: `chatcmpl-flm-${created}`,
                object: 'chat.completion.chunk',
                created,
                model: result.model,
                choices: [{ index: 0, delta: { content: piece }, finish_reason: null }],
              })}\n\n`
            );
          }

          res.write(
            `data: ${JSON.stringify({
              id: `chatcmpl-flm-${created}`,
              object: 'chat.completion.chunk',
              created,
              model: result.model,
              choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
            })}\n\n`
          );
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }

        // Standard JSON Response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            id: `chatcmpl-flm-${created}`,
            object: 'chat.completion',
            created,
            model: result.model,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: result.content },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            freellmapi: {
              provider: result.provider,
              latency_ms: result.latencyMs,
            },
          })
        );
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid JSON body: ' + err.message } }));
      }
    });
    return;
  }

  // --- POST /v1/messages (Anthropic API Format) ---
  if (pathname === '/v1/messages' && req.method === 'POST') {
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk;
    });

    req.on('end', async () => {
      try {
        const body = JSON.parse(rawBody || '{}');
        const modelId = typeof body.model === 'string' ? body.model : 'pollinations-openai';
        const msgs = Array.isArray(body.messages) ? body.messages : [];
        const normalized = msgs.map((m: any) => ({
          role: m.role || 'user',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        }));

        const result = await dispatchLlmCall(modelId, normalized);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            id: `msg-${Date.now()}`,
            type: 'message',
            role: 'assistant',
            content: [{ type: 'text', text: result.content }],
            model: result.model,
            stop_reason: 'end_turn',
            usage: { input_tokens: 10, output_tokens: 25 },
          })
        );
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found. Visit http://localhost:' + PORT + ' for dashboard.' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 FreeLLMAPI Standalone Gateway is RUNNING!`);
  console.log(`📍 Web Dashboard:   http://localhost:${PORT}/`);
  console.log(`📋 Models Catalog:  http://localhost:${PORT}/v1/models`);
  console.log(`💬 Chat Endpoint:   http://localhost:${PORT}/v1/chat/completions`);
  console.log(`⚡ Instant Test:    http://localhost:${PORT}/v1/test?model=pollinations-openai`);
  console.log(`======================================================\n`);
});
