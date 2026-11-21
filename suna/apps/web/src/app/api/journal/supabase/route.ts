import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hxkheycjotegkqrbxfff.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4a2hleWNqb3RlZ2txcmJ4ZmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MzA5OTYsImV4cCI6MjEwOTEwNjk5Nn0.o-pfnmjV6STjwQSJLLgvSfgfLm2A3swiVX8Pifpnw9k';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const supabase = getSupabase();
    let query = supabase.from('journal_trades').select('*').order('entry_date', { ascending: false });
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const trades = Array.isArray(body?.trades) ? body.trades : body?.trade ? [body.trade] : [];

    if (trades.length === 0) {
      return NextResponse.json({ ok: true, message: 'No trades provided', count: 0 });
    }

    const supabase = getSupabase();

    // Map frontend trades to snake_case Supabase table schema
    const rows = trades.map((t: any) => ({
      id: t.id,
      project_id: t.projectId || null,
      instrument: t.instrument || 'STOCK',
      direction: t.direction || 'Buy',
      lots: Number(t.lots || 1),
      entry_price: Number(t.entryPrice || 0),
      exit_price: Number(t.exitPrice || 0),
      entry_date: t.entryDate || new Date().toISOString().split('T')[0],
      entry_time: t.entryTime || '09:30',
      exit_date: t.exitDate || t.entryDate,
      exit_time: t.exitTime || '15:30',
      pnl: Number(t.pnl || 0),
      commission: Number(t.commission || 0),
      swap: Number(t.swap || 0),
      stop_loss: t.stopLoss != null ? Number(t.stopLoss) : null,
      take_profit: t.takeProfit != null ? Number(t.takeProfit) : null,
      risk_r: t.riskR != null ? Number(t.riskR) : null,
      return_r: t.returnR != null ? Number(t.returnR) : null,
      session: t.session || 'Indian Market + Asian Session',
      followed_plan: t.followedPlan ?? true,
      plan_name: t.planName || 'DhanHQ Execution',
      confluences: Array.isArray(t.confluences) ? t.confluences : [],
      mistakes: Array.isArray(t.mistakes) ? t.mistakes : [],
      notes: t.notes || null,
      chart_htf: t.chartHtf || null,
      chart_mtf: t.chartMtf || null,
      chart_ltf: t.chartLtf || null,
      source: t.source || 'auto',
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from('journal_trades').upsert(rows, { onConflict: 'id' }).select();

    if (error) {
      console.error('[supabase-journal] Error upserting trades:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      count: data?.length || rows.length,
      message: `Persisted ${rows.length} trades to Supabase`,
    });
  } catch (err: any) {
    console.error('[supabase-journal] Server error:', err);
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
