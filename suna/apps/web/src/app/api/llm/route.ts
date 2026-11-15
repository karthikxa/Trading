import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages || [
      { role: 'user', content: body.prompt || 'Hello' }
    ];
    // Map model zed to auto
    const upstreamModel = (body.model === 'zed' || !body.model) ? 'auto' : body.model;

    const payload = {
      model: upstreamModel,
      messages: messages,
      stream: false
    };

    console.log('[API /api/llm] Forwarding request to Render FreeLLMAPI:', {
      model: upstreamModel,
      messageCount: messages.length,
      lastUserMessage: messages[messages.length - 1]?.content?.slice(0, 80)
    });

    const res = await fetch('https://server-llm-1.onrender.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[API /api/llm] Render responded with error:', res.status, errText);
      return NextResponse.json(
        { error: errText, status: res.status },
        { status: res.status }
      );
    }

    const data = await res.json();
    console.log('[API /api/llm] Render responded 200 OK with model:', data?.model);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API /api/llm] Request failed:', err?.message || String(err));
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
