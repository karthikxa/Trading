/**
 * FreeLLMAPI gateway surfaces on the API's own /v1:
 *   GET  /v1/models             — enabled model catalog (OpenAI list shape)
 *   POST /v1/chat/completions   — OpenAI chat completions (stream synthesized)
 *   POST /v1/messages           — Anthropic Messages API translation layer
 *
 * Auth: `Bearer <FLM_MASTER_KEY>` (the Customize → FreeLLMAPI panel's master
 * key, default flm_sk_live_free_gateway_9921) or a Supabase JWT. This is what
 * lets the panel's copy-paste snippets (Claude Code, Python OpenAI SDK,
 * TradingAgents' OpenAI-compatible provider) call the platform directly.
 */

import { OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { config } from '../config';
import { verifySupabaseJwt } from '../shared/jwt-verify';
import { chatComplete, enabledModels, type FlmMessage } from './freellm';
import type { AppEnv } from '../types';

export const tradingGatewayApp = new OpenAPIHono<AppEnv>();

function bearerToken(c: Context<AppEnv>): string {
  const authz = c.req.header('authorization') || '';
  return authz.startsWith('Bearer ') ? authz.slice(7).trim() : '';
}

async function gatewayAuthorized(c: Context<AppEnv>): Promise<boolean> {
  const token = bearerToken(c);
  if (!token) return false;
  if (config.FLM_MASTER_KEY && token === config.FLM_MASTER_KEY) return true;
  const verified = await verifySupabaseJwt(token);
  return verified.ok === true;
}

function unauthorized(c: Context<AppEnv>) {
  return c.json({ error: { message: 'Missing or invalid credentials (FreeLLMAPI master key or platform JWT)' } }, 401 as const);
}

function toFlmMessages(raw: unknown): FlmMessage[] | null {
  if (!Array.isArray(raw)) return null;
  const out: FlmMessage[] = [];
  for (const m of raw) {
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    let text = '';
    if (typeof content === 'string') text = content;
    else if (Array.isArray(content)) {
      text = content
        .map((part) =>
          typeof part === 'string'
            ? part
            : typeof (part as { text?: unknown })?.text === 'string'
              ? (part as { text: string }).text
              : '',
        )
        .join('\n');
    }
    if (typeof role !== 'string' || !text) return null;
    out.push({ role: role === 'system' || role === 'assistant' ? (role as 'system' | 'assistant') : 'user', content: text });
  }
  return out.length ? out : null;
}

const CHUNK_SPLIT = /(\s+)/;

tradingGatewayApp.get('/models', async (c: Context<AppEnv>) => {
  if (!(await gatewayAuthorized(c))) return unauthorized(c);
  const catalog = enabledModels();
  return c.json({
    object: 'list',
    data: catalog.map((m) => ({
      id: m.id,
      object: 'model',
      owned_by: m.provider,
      freellmapi: { tier: m.tier, keyless: m.keyless, priority: m.priority },
    })),
  });
});

tradingGatewayApp.post('/chat/completions', async (c: Context<AppEnv>) => {
  if (!(await gatewayAuthorized(c))) return unauthorized(c);
  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return c.json({ error: { message: 'JSON body required' } }, 400 as const);
  const messages = toFlmMessages(body.messages);
  if (!messages) return c.json({ error: { message: 'messages[] required (string or content-part arrays)' } }, 400 as const);

  const result = await chatComplete({
    messages,
    model: typeof body.model === 'string' ? body.model : undefined,
    maxTokens: typeof body.max_tokens === 'number' ? body.max_tokens : 700,
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.3,
  });

  if (!result.ok) {
    return c.json({ error: { message: result.error, type: 'freellmapi_no_route' } }, 503 as const);
  }

  const created = Math.floor(Date.now() / 1000);
  if (body.stream === true) {
    const chunks = result.content.split(CHUNK_SPLIT).filter((p) => p.length);
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (obj: unknown) => {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
        };
        try {
          for (const piece of chunks) {
            send({
              id: `chatcmpl-flm-${created}`,
              object: 'chat.completion.chunk',
              created,
              model: result.model,
              choices: [{ index: 0, delta: { content: piece }, finish_reason: null }],
            });
          }
          send({
            id: `chatcmpl-flm-${created}`,
            object: 'chat.completion.chunk',
            created,
            model: result.model,
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          });
          controller.enqueue(enc.encode('data: [DONE]\n\n'));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        'x-freellmapi-model': result.model,
        'x-freellmapi-provider': encodeURIComponent(result.providerName),
        'x-freellmapi-latency-ms': String(result.latencyMs),
        'x-freellmapi-attempts': String(result.attempts.length),
      },
    });
  }

  return c.json({
    id: `chatcmpl-flm-${created}`,
    object: 'chat.completion',
    created,
    model: result.model,
    choices: [
      { index: 0, message: { role: 'assistant', content: result.content }, finish_reason: 'stop' },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    freellmapi: {
      provider: result.providerName,
      latency_ms: result.latencyMs,
      attempts: result.attempts,
    },
  });
});

tradingGatewayApp.post('/messages', async (c: Context<AppEnv>) => {
  if (!(await gatewayAuthorized(c))) return unauthorized(c);
  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return c.json({ error: 'JSON body required' }, 400 as const);
  const messages = toFlmMessages(body.messages);
  if (!messages) return c.json({ error: 'messages[] required' }, 400 as const);

  const systemText = typeof body.system === 'string'
    ? body.system
    : Array.isArray(body.system)
      ? (body.system as Array<{ text?: string }>).map((b) => b.text ?? '').join('\n')
      : undefined;
  const flmMessages: FlmMessage[] = systemText
    ? [{ role: 'system', content: systemText }, ...messages]
    : messages;

  const result = await chatComplete({
    messages: flmMessages,
    model: typeof body.model === 'string' ? body.model : undefined,
    maxTokens: typeof body.max_tokens === 'number' ? body.max_tokens : 700,
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.3,
  });
  if (!result.ok) {
    return c.json({ type: 'error', error: { type: 'no_route', message: result.error } }, 503 as const);
  }

  const created = Math.floor(Date.now() / 1000);
  if (body.stream === true) {
    const chunks = result.content.split(CHUNK_SPLIT).filter((p) => p.length);
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const event = (name: string, data: unknown) => {
          controller.enqueue(enc.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        try {
          event('message_start', {
            type: 'message_start',
            message: { id: `msg_flm_${created}`, type: 'message', role: 'assistant', model: result.model, content: [], stop_reason: null, usage: { input_tokens: 0, output_tokens: 0 } },
          });
          event('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });
          for (const piece of chunks) {
            event('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: piece } });
          }
          event('content_block_stop', { type: 'content_block_stop', index: 0 });
          event('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 0 } });
          event('message_stop', { type: 'message_stop' });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        'x-freellmapi-model': result.model,
        'x-freellmapi-provider': encodeURIComponent(result.providerName),
      },
    });
  }

  return c.json({
    id: `msg_flm_${created}`,
    type: 'message',
    role: 'assistant',
    model: result.model,
    content: [{ type: 'text', text: result.content }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
    freellmapi: { provider: result.providerName, latency_ms: result.latencyMs },
  });
});
