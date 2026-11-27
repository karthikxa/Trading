import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const DEFAULT_RENDER_BASE_URL = 'https://server-llm-1.onrender.com';

// In-memory session message and log store
interface StoredMessage {
  schema: 'kortix.session/2';
  v: 1;
  message_id: string;
  thread_id: string;
  seq: number;
  role: 'user' | 'assistant';
  kind: 'turn';
  status: 'complete';
  in_context: boolean;
  agent?: string | null;
  reply_to?: string | null;
  model: { provider: string; model: string } | null;
  usage: { input: number; output: number; cache_read: number; cache_write: number } | null;
  finish: 'stop' | null;
  error: null;
  created_at: string;
  completed_at: string | null;
  producer: { harness: string; harness_version: string; adapter_version: string };
  blocks: Array<{ id: string; type: 'text'; text: string }>;
}

interface StoredSession {
  sessionId: string;
  projectId: string;
  agentName: string;
  customName: string;
  createdAt: string;
  messages: StoredMessage[];
  seq: number;
}

const sessionStore = new Map<string, StoredSession>();

function getSessionData(sessionId: string, projectId: string = 'default', agentName: string = 'portfolio_manager'): StoredSession {
  if (!sessionStore.has(sessionId)) {
    sessionStore.set(sessionId, {
      sessionId,
      projectId,
      agentName,
      customName: agentName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      createdAt: new Date().toISOString(),
      messages: [],
      seq: 1,
    });
  }
  return sessionStore.get(sessionId)!;
}

// Generate smart, instant market strategist responses
function generateQuickReply(promptText: string, agentName: string): string {
  const p = promptText.trim().toLowerCase();
  const title = agentName.replace(/_/g, ' ').toUpperCase();

  if (p === 'hi' || p === 'hello' || p === 'hey') {
    return `Hello! I'm your **${title}** on Kortix Trading. 

Your Dhan account is active with **28 executions** recorded. Day net realized P&L is **-₹37.37**, intraday risk limits are active, and margin utilization is healthy. 

How can I assist your quantitative setup or trade execution today?`;
  }

  if (p.includes('pnl') || p.includes('profit') || p.includes('loss') || p.includes('day')) {
    return `### Daily Portfolio & Risk Summary
- **Day Realized P&L**: \`-₹37.37\`
- **Total Trades**: 28 Executions (CENTRALBK, INDIANB, MOTHERSON)
- **Win Rate**: \`23.5%\`
- **Current Margin Available**: \`₹1,45,210.00\`
- **Risk per Trade Guardrail**: Fixed at \`1.0R\` (₹26.50 max risk).

Let me know if you would like me to audit any specific trade or calibrate position sizes.`;
  }

  if (p.includes('dhan') || p.includes('order') || p.includes('trade')) {
    return `DhanHQ connection is live and synchronized. All orders are verified under **NSE_EQ** with instant postback confirmations. 

You can review individual trade confluences, entry timestamps, and statutory brokerage breakdowns directly in your **Orders** desk or **Journal** calendar.`;
  }

  return `I have analyzed your request regarding: "${promptText}". 

All quantitative risk metrics, Dhan execution queues, and live Indian market structures are aligned. Let me know what specific action, backtest, or position parameter you want to execute.`;
}

function remoteCompletionUrl(): string | null {
  const baseUrl = (process.env.FLM_REMOTE_BASE_URL || DEFAULT_RENDER_BASE_URL).replace(/\/$/, '');
  return baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
}

async function requestModelReply(
  agentName: string,
  messages: Array<{ role: string; content: string }>,
  requestedModel?: string,
  tradingContext?: unknown,
): Promise<{ content: string; model: string }> {
  const remoteUrl = remoteCompletionUrl();
  if (!remoteUrl) throw new Error('Render model URL is not configured.');

  const serializedContext = tradingContext && typeof tradingContext === 'object'
    ? JSON.stringify(tradingContext)
    : '';
  const contextPrompt = serializedContext && serializedContext.length <= 120_000
    ? `\n\nLatest dashboard trading snapshot captured before this message. Use it as read-only source data; never invent missing values or execute an order without explicit approval.\n[TRADING_CONTEXT]\n${serializedContext}\n[/TRADING_CONTEXT]`
    : '';

  const response = await fetch(remoteUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.FLM_REMOTE_API_KEY ? { Authorization: `Bearer ${process.env.FLM_REMOTE_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: requestedModel === 'zed' || !requestedModel ? 'auto' : requestedModel,
      messages: [
        {
          role: 'system',
          content: `You are ${agentName.replace(/_/g, ' ')}, a trading desk assistant. Answer only from information available in the conversation and dashboard snapshot. If trade data is not present, say that clearly. Never invent account balances, positions, executions, or P&L.${contextPrompt}`,
        },
        ...messages,
      ],
      stream: false,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`Render model returned HTTP ${response.status}.`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || data?.reply;
  if (typeof content !== 'string' || !content.trim()) throw new Error('Render model returned an empty response.');
  return { content: content.trim(), model: data?.model || 'auto' };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = (path || []).join('/');

  // 1. Handle POST /v1/projects/:projectId/sessions (Session Creation with pending_prompt / initial_prompt)
  if (pathStr.includes('/projects/') && pathStr.endsWith('/sessions')) {
    try {
      const parts = pathStr.split('/');
      const projIdx = parts.indexOf('projects');
      const projectId = projIdx >= 0 ? parts[projIdx + 1] : 'default';

      let body: any = {};
      try {
        body = await req.json();
      } catch {}

      const sessionId = body.session_id || `ses_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const agentName = body.agent_name || body.overrides?.agent || 'portfolio_manager';
      const sess = getSessionData(sessionId, projectId, agentName);

      // Check for pending prompt or initial prompt
      const pendingPrompt = body.pending_prompt || body.create?.pending_prompt;
      const initialPrompt = body.initial_prompt || (typeof pendingPrompt === 'string' ? pendingPrompt : pendingPrompt?.text);

      if (initialPrompt && typeof initialPrompt === 'string' && initialPrompt.trim().length > 0) {
        const userPromptText = initialPrompt.trim();
        const userMessageId = `msg_user_${Date.now()}`;

        // Save user message
        const userMsg: StoredMessage = {
          schema: 'kortix.session/2',
          v: 1,
          message_id: userMessageId,
          thread_id: 'thread_root',
          seq: sess.seq++,
          role: 'user',
          kind: 'turn',
          status: 'complete',
          in_context: true,
          agent: agentName,
          model: { provider: 'qwen', model: 'auto' },
          usage: null,
          finish: 'stop',
          error: null,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          producer: { harness: 'kortix-web', harness_version: '1.0.0', adapter_version: '1.0.0' },
          blocks: [{ id: `blk_user_${Date.now()}`, type: 'text', text: userPromptText }],
        };
        sess.messages.push(userMsg);

        const reply = await requestModelReply(agentName, [{ role: 'user', content: userPromptText }], undefined, body.tradingContext);
        const assistantMsg: StoredMessage = {
          schema: 'kortix.session/2',
          v: 1,
          message_id: `msg_asst_${Date.now()}`,
          thread_id: 'thread_root',
          seq: sess.seq++,
          role: 'assistant',
          kind: 'turn',
          status: 'complete',
          in_context: true,
          agent: agentName,
          reply_to: userMessageId,
          model: { provider: 'render', model: reply.model },
          usage: { input: 120, output: 85, cache_read: 0, cache_write: 0 },
          finish: 'stop',
          error: null,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          producer: { harness: 'kortix-agent', harness_version: '1.0.0', adapter_version: '1.0.0' },
          blocks: [{ id: `blk_asst_${Date.now()}`, type: 'text', text: reply.content }],
        };
        sess.messages.push(assistantMsg);
      }

      return NextResponse.json({
        session_id: sessionId,
        account_id: 'acc-default',
        project_id: projectId,
        branch_name: 'main',
        base_ref: 'main',
        sandbox_provider: null,
        sandbox_id: null,
        sandbox_url: null,
        runtime_session_id: sessionId,
        opencode_session_id: sessionId,
        custom_name: sess.customName,
        status: 'running',
        created_at: sess.createdAt,
      });
    } catch (err: any) {
      console.error('[v1/sessions POST error]', err);
      const fallbackId = `ses_${Date.now()}`;
      return NextResponse.json({
        session_id: fallbackId,
        project_id: 'default',
        status: 'running',
        created_at: new Date().toISOString(),
      });
    }
  }

  // 2. Handle POST /v1/projects/:projectId/sessions/:sessionId/prompts
  if (pathStr.includes('/sessions/') && pathStr.endsWith('/prompts')) {
    try {
      const parts = pathStr.split('/');
      const projIdx = parts.indexOf('projects');
      const projectId = projIdx >= 0 ? parts[projIdx + 1] : 'default';
      const sessIdx = parts.indexOf('sessions');
      const sessionId = sessIdx >= 0 ? parts[sessIdx + 1] : 'default';

      const body = await req.json();
      const promptText =
        body.parts?.find((p: any) => p.type === 'text')?.text ||
        body.parts?.[0]?.text ||
        body.text ||
        'Hello';

      const agentName = body.overrides?.agent || 'portfolio_manager';
      const userMessageId = body.message_id || `msg_${Date.now()}`;

      const sess = getSessionData(sessionId, projectId, agentName);

      // Save user message to transcript
      const userMsg: StoredMessage = {
        schema: 'kortix.session/2',
        v: 1,
        message_id: userMessageId,
        thread_id: 'thread_root',
        seq: sess.seq++,
        role: 'user',
        kind: 'turn',
        status: 'complete',
        in_context: true,
        agent: agentName,
        model: { provider: 'qwen', model: 'auto' },
        usage: null,
        finish: 'stop',
        error: null,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        producer: { harness: 'kortix-web', harness_version: '1.0.0', adapter_version: '1.0.0' },
        blocks: [
          {
            id: `blk_user_${Date.now()}`,
            type: 'text',
            text: promptText,
          },
        ],
      };
      sess.messages.push(userMsg);

      const conversationHistory = sess.messages.slice(-12).map((m) => ({
        role: m.role,
        content: m.blocks.map((b) => b.text).join('\n'),
      }));
      const reply = await requestModelReply(agentName, conversationHistory, body.overrides?.model?.modelID, body.tradingContext);

      // Save assistant message to transcript
      const assistantMsg: StoredMessage = {
        schema: 'kortix.session/2',
        v: 1,
        message_id: `msg_asst_${Date.now()}`,
        thread_id: 'thread_root',
        seq: sess.seq++,
        role: 'assistant',
        kind: 'turn',
        status: 'complete',
        in_context: true,
        agent: agentName,
        reply_to: userMessageId,
        model: { provider: 'render', model: reply.model },
        usage: { input: 120, output: 85, cache_read: 0, cache_write: 0 },
        finish: 'stop',
        error: null,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        producer: { harness: 'kortix-agent', harness_version: '1.0.0', adapter_version: '1.0.0' },
        blocks: [
          {
            id: `blk_asst_${Date.now()}`,
            type: 'text',
            text: reply.content,
          },
        ],
      };
      sess.messages.push(assistantMsg);

      return NextResponse.json({
        prompt_id: `pmt_${Date.now()}`,
        state: 'admitted',
        message_id: userMessageId,
        deduped: false,
        observed_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[v1/prompts POST error]', err);
      return NextResponse.json(
        { error: err?.message || 'The model service did not return a reply.', code: 'MODEL_UNAVAILABLE' },
        { status: 503 }
      );
    }
  }

  // 3. Handle warm session endpoint
  if (pathStr.includes('/sessions/warm')) {
    const warmId = `ses_warm_${Date.now()}`;
    return NextResponse.json({
      reused: false,
      session: {
        session_id: warmId,
        project_id: 'default',
        status: 'running',
        created_at: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({ success: true, observed_at: new Date().toISOString() });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = (path || []).join('/');

  // 1. GET /v1/projects/:projectId/sessions/:sessionId/turn
  if (pathStr.includes('/sessions/') && pathStr.endsWith('/turn')) {
    return NextResponse.json({
      turns: [],
      can_stop: true,
    });
  }

  // 2. GET /v1/projects/:projectId/sessions/:sessionId/prompts
  if (pathStr.includes('/sessions/') && pathStr.endsWith('/prompts')) {
    return NextResponse.json({
      prompts: [],
      sent: [],
      observed_at: new Date().toISOString(),
    });
  }

  // 3. GET /v1/projects/:projectId/sessions/:sessionId/log (kortix.session/2 minor 1)
  if (pathStr.includes('/sessions/') && pathStr.endsWith('/log')) {
    const parts = pathStr.split('/');
    const sessIdx = parts.indexOf('sessions');
    const sessionId = sessIdx >= 0 ? parts[sessIdx + 1] : 'default';

    const sess = getSessionData(sessionId);
    return NextResponse.json({
      session: {
        schema: 'kortix.session/2',
        v: 1,
        session_id: sessionId,
        title: sess.customName,
        created_at: sess.createdAt,
        restore_grade: 'native',
        selection: { agent: sess.agentName, model: { provider: 'qwen', model: 'auto' } },
        todos: [],
        pending: { questions: [], permissions: [] },
      },
      generation: 1,
      threads: [
        {
          schema: 'kortix.session/2',
          v: 1,
          thread_id: 'thread_root',
          parent_thread_id: null,
          spawned_by: null,
          agent: sess.agentName,
          title: sess.customName,
          created_at: sess.createdAt,
        },
      ],
      thread_id: 'thread_root',
      messages: sess.messages,
      has_more: false,
    });
  }

  // 4. GET /v1/projects/:projectId/sessions/:sessionId/transcript (SessionTranscriptSyncEnvelope)
  if (pathStr.includes('/sessions/') && pathStr.endsWith('/transcript')) {
    const parts = pathStr.split('/');
    const sessIdx = parts.indexOf('sessions');
    const sessionId = sessIdx >= 0 ? parts[sessIdx + 1] : 'default';

    const sess = getSessionData(sessionId);
    const syncMessages = sess.messages.map((m) => ({
      info: {
        id: m.message_id,
        sessionID: sessionId,
        role: m.role,
        time: new Date(m.created_at).getTime(),
        agent: m.agent,
      },
      parts: m.blocks.map((b) => ({
        id: b.id,
        messageID: m.message_id,
        type: 'text',
        text: b.text,
      })),
    }));

    return NextResponse.json({
      available: true,
      reason: null,
      source: 'mirror',
      complete: true,
      captured_at: new Date().toISOString(),
      runtime_session_id: sessionId,
      opencode_session_id: sessionId,
      message_count: syncMessages.length,
      total: syncMessages.length,
      next_cursor: null,
      messages: syncMessages,
    });
  }

  // 5. GET /v1/projects/:projectId/sessions/:sessionId (Single session details)
  if (
    pathStr.includes('/sessions/') &&
    !pathStr.endsWith('/log') &&
    !pathStr.endsWith('/turn') &&
    !pathStr.endsWith('/prompts') &&
    !pathStr.endsWith('/transcript')
  ) {
    const parts = pathStr.split('/');
    const projIdx = parts.indexOf('projects');
    const projectId = projIdx >= 0 ? parts[projIdx + 1] : 'default';
    const sessIdx = parts.indexOf('sessions');
    const sessionId = sessIdx >= 0 ? parts[sessIdx + 1] : 'default';

    const sess = getSessionData(sessionId, projectId);

    return NextResponse.json({
      session_id: sessionId,
      project_id: projectId,
      account_id: 'acc-default',
      status: 'running',
      branch_name: 'main',
      base_ref: 'main',
      sandbox_provider: null,
      sandbox_id: null,
      sandbox_url: null,
      runtime_session_id: sessionId,
      opencode_session_id: sessionId,
      custom_name: sess.customName,
      created_at: sess.createdAt,
    });
  }

  // 6. GET /v1/projects/:projectId/sessions (List sessions)
  if (pathStr.includes('/projects/') && pathStr.endsWith('/sessions')) {
    const parts = pathStr.split('/');
    const projIdx = parts.indexOf('projects');
    const projectId = projIdx >= 0 ? parts[projIdx + 1] : 'default';

    const allSessions = Array.from(sessionStore.values())
      .filter((s) => s.projectId === projectId || projectId === 'default')
      .map((s) => ({
        session_id: s.sessionId,
        project_id: s.projectId,
        account_id: 'acc-default',
        status: 'running',
        branch_name: 'main',
        base_ref: 'main',
        sandbox_provider: null,
        sandbox_id: null,
        sandbox_url: null,
        runtime_session_id: s.sessionId,
        opencode_session_id: s.sessionId,
        custom_name: s.customName,
        created_at: s.createdAt,
      }));

    return NextResponse.json(allSessions);
  }

  // 7. Default safe response
  return NextResponse.json({
    success: true,
    data: [],
    observed_at: new Date().toISOString(),
  });
}
