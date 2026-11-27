import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
const DEFAULT_RENDER_BASE_URL = 'https://server-llm-1.onrender.com';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * DB Message Record persistence (server-side, not in localStorage)
 */
async function ensureDbRecord(
  projectId: string,
  sessionId: string,
  agentId: string,
  agentName: string,
  prompt: string,
  reply: string,
) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const now = new Date();
    await supabase.from('bot_messages').insert([
      {
        project_id: projectId,
        session_id: sessionId,
        agent_id: agentId,
        agent_name: agentName,
        sender: 'user',
        content: prompt,
        created_at: now.toISOString(),
      },
      {
        project_id: projectId,
        session_id: sessionId,
        agent_id: agentId,
        agent_name: agentName,
        sender: 'agent',
        content: reply,
        created_at: new Date(now.getTime() + 100).toISOString(),
      },
    ]);
  } catch (err) {
    // Graceful error ignore: server store logs failure
  }
}

function buildTradingContextPrompt(context: unknown): string {
  if (!context || typeof context !== 'object') return '';
  try {
    const serialized = JSON.stringify(context);
    if (!serialized || serialized.length > 120_000) return '';
    return `\n\n[UNIFIED_TRADING_CONTEXT]\nThe following is the latest dashboard snapshot captured immediately before this message. Treat it as read-only factual context. Do not invent missing values. Never place, modify, or cancel an order without an explicit user confirmation through the dashboard approval flow.\n${serialized}\n[/UNIFIED_TRADING_CONTEXT]`;
  } catch {
    return '';
  }
}

function remoteCompletionUrl(): string | null {
  const baseUrl = (process.env.FLM_REMOTE_BASE_URL || DEFAULT_RENDER_BASE_URL).replace(/\/$/, '');
  return baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
}

function normalizeHistory(history: unknown): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(history)) return [];
  return history.slice(-12).flatMap((entry: any) => {
    const content = typeof entry?.content === 'string' ? entry.content.trim() : '';
    if (!content) return [];
    return [{ role: entry.sender === 'agent' || entry.role === 'assistant' ? 'assistant' : 'user', content }];
  });
}

/**
 * Chat handler: forwards directly to the same-origin /v1/trading/chat gateway
 * or local API server (http://localhost:8008/v1/trading/chat) where persona
 * and system prompt are pulled directly from trading.agents in the database.
 * NOTE (STOP 2): This file is proposed for deletion once clients fully migrate to /v1/trading/chat.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      agentId = 'portfolio_manager',
      agentName = 'Portfolio Manager',
      projectId = 'b0000000-0000-0000-0000-000000000001',
      sessionId = `session-${agentId}`,
      history = [],
      tradingContext,
      stream = true,
      hopCount = 0,
    } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ ok: false, error: 'Empty prompt' }, { status: 400 });
    }

    const apiTarget = process.env.INTERNAL_API_URL?.replace(/\/$/, '');
    const remoteUrl = remoteCompletionUrl();
    let replyText = '';
    let modelName = 'auto';
    let providerName = 'Render LLM';
    let upstreamError = 'No model service is configured.';
    const normalizedHistory = normalizeHistory(history);

    if (apiTarget) {
      const chatRes = await fetch(`${apiTarget}/v1/trading/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          agentName,
          message: prompt,
          history: normalizedHistory,
          hopCount,
          tradingContext,
          projectId,
          sessionId,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (chatRes.ok) {
        const data = await chatRes.json();
        replyText = data.reply || '';
        modelName = data.model || modelName;
        providerName = data.provider || providerName;
      } else {
        upstreamError = `Trading service returned HTTP ${chatRes.status}.`;
      }
    } else if (remoteUrl) {
      const remoteRes = await fetch(remoteUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.FLM_REMOTE_API_KEY ? { Authorization: `Bearer ${process.env.FLM_REMOTE_API_KEY}` } : {}),
          },
          body: JSON.stringify({
            model: body.model === 'zed' || !body.model ? 'auto' : body.model,
            messages: [
              { role: 'system', content: `You are ${agentName}, an institutional trading desk bot. Use the supplied unified trading context as the source of truth. Do not execute trades without explicit confirmation.${buildTradingContextPrompt(tradingContext)}` },
              ...normalizedHistory,
              { role: 'user', content: prompt },
            ],
            stream: false,
          }),
          signal: AbortSignal.timeout(30000),
        });
      if (remoteRes.ok) {
        const data = await remoteRes.json();
        replyText = data?.choices?.[0]?.message?.content || data?.reply || '';
        modelName = data?.model || modelName;
        providerName = data?.provider || providerName;
      } else {
        upstreamError = `Render model returned HTTP ${remoteRes.status}.`;
      }
    }

    if (!replyText) {
      return NextResponse.json(
        { ok: false, code: 'MODEL_UNAVAILABLE', error: upstreamError },
        { status: 503 },
      );
    }

    const messageId = `msg_${Date.now()}`;

    // Asynchronously persist to server database
    ensureDbRecord(projectId, sessionId, agentId, agentName, prompt, replyText).catch(() => {});

    if (stream) {
      // Stream SSE events matching OpenAI / Kortix named events
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `event: message.delta\ndata: ${JSON.stringify({
                id: messageId,
                delta: { type: 'text_delta', text: replyText },
              })}\n\n`
            )
          );
          controller.enqueue(
            encoder.encode(`event: message.stop\ndata: ${JSON.stringify({ stop_reason: 'end_turn' })}\n\n`)
          );
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return NextResponse.json({
      ok: true,
      agentId,
      agentName,
      reply: replyText,
      model: modelName,
      provider: providerName,
      timestamp: timeStr,
      lastMessageAt: Date.now(),
    });
  } catch (error: any) {
    console.error('[API /api/chat] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
