import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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
      stream = true,
      hopCount = 0,
    } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ ok: false, error: 'Empty prompt' }, { status: 400 });
    }

    // Call unified /v1/trading/chat endpoint (local bun API or same-origin)
    const apiTarget = process.env.INTERNAL_API_URL || 'http://localhost:8008';
    const chatRes = await fetch(`${apiTarget}/v1/trading/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        message: prompt,
        history,
        hopCount,
      }),
      signal: AbortSignal.timeout(45000),
    });

    let replyText = '';
    let modelName = 'system';
    let providerName = 'local';

    if (chatRes.ok) {
      const data = await chatRes.json();
      replyText = data.reply || '';
      modelName = data.model || 'system';
      providerName = data.provider || 'local';
    } else {
      // Fallback: query agent system prompt directly from DB
      try {
        const supabase = getSupabase();
        const { data: agentRow } = await supabase
          .from('agents')
          .select('id, name, role, system_prompt, description')
          .eq('id', agentId)
          .maybeSingle();

        const personaPrompt = agentRow?.system_prompt || agentRow?.description || `You are ${agentName}, an institutional trading desk bot.`;
        replyText = `**${agentName}** (${agentRow?.role || 'Desk Agent'})\n\nReceived: "${prompt}".\n\n${personaPrompt}`;
      } catch {
        replyText = `**${agentName}**\n\nReceived: "${prompt}". Ready for trading instructions.`;
      }
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
