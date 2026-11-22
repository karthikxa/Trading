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
    const status = searchParams.get('status');

    const supabase = getSupabase();
    let query = supabase.from('dhan_orders').select('*').order('exchange_time', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (status && status !== 'ALL') {
      query = query.eq('order_status', status.toUpperCase());
    }

    const { data, error } = await query;
    if (error) {
      // If table has not yet been executed in Supabase SQL editor
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json({ ok: true, data: [], tablePending: true });
      }
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
    const orders = Array.isArray(body?.orders) ? body.orders : body?.order ? [body.order] : [];

    if (orders.length === 0) {
      return NextResponse.json({ ok: true, message: 'No orders provided', count: 0 });
    }

    const supabase = getSupabase();

    const rows = orders.map((o: any) => ({
      order_id: String(o.orderId || o.order_id),
      project_id: o.projectId || o.project_id || 'b0000000-0000-0000-0000-000000000001',
      exchange_order_id: o.exchangeOrderId || o.exchange_order_id || null,
      dhan_client_id: String(o.dhanClientId || o.dhan_client_id || '1114824544'),
      trading_symbol: o.tradingSymbol || o.trading_symbol || o.customSymbol || 'STOCK',
      custom_symbol: o.customSymbol || o.custom_symbol || null,
      security_id: String(o.securityId || o.security_id || ''),
      isin: o.isin || null,
      exchange_segment: o.exchangeSegment || o.exchange_segment || 'NSE_EQ',
      transaction_type: (o.transactionType || o.transaction_type || 'BUY').toUpperCase(),
      order_type: (o.orderType || o.order_type || 'MARKET').toUpperCase(),
      product_type: (o.productType || o.product_type || 'INTRADAY').toUpperCase(),
      order_status: (o.orderStatus || o.order_status || 'TRADED').toUpperCase(),
      quantity: Number(o.quantity || o.tradedQuantity || 1),
      disclosed_quantity: Number(o.disclosedQuantity || o.disclosed_quantity || 0),
      price: Number(o.price || 0),
      trigger_price: Number(o.triggerPrice || o.trigger_price || 0),
      traded_quantity: Number(o.tradedQuantity || o.traded_quantity || o.quantity || 0),
      avg_traded_price: Number(o.avgTradedPrice || o.avg_traded_price || o.tradedPrice || o.price || 0),
      turnover: Number(
        o.turnover ||
        (Number(o.tradedQuantity || o.quantity || 0) * Number(o.tradedPrice || o.avgTradedPrice || o.price || 0))
      ),
      brokerage_charges: Number(o.brokerageCharges || o.brokerage_charges || 0),
      service_tax: Number(o.serviceTax || o.service_tax || 0),
      exchange_charges: Number(o.exchangeTransactionCharges || o.exchange_charges || 0),
      sebi_tax: Number(o.sebiTax || o.sebi_tax || 0),
      stamp_duty: Number(o.stampDuty || o.stamp_duty || 0),
      stt: Number(o.stt || 0),
      total_charges: Number(
        (Number(o.brokerageCharges || o.brokerage_charges || 0) +
          Number(o.serviceTax || o.service_tax || 0) +
          Number(o.exchangeTransactionCharges || o.exchange_charges || 0) +
          Number(o.sebiTax || o.sebi_tax || 0) +
          Number(o.stampDuty || o.stamp_duty || 0) +
          Number(o.stt || 0)).toFixed(4)
      ),
      validity: o.validity || 'DAY',
      oms_error_code: o.omsErrorCode || o.oms_error_code || null,
      oms_error_description: o.omsErrorDescription || o.oms_error_description || null,
      trading_session: o.tradingSession || o.trading_session || 'Indian Market + Asian Session',
      exchange_time: o.exchangeTime || o.exchange_time || new Date().toISOString(),
      create_time: o.createTime && o.createTime !== 'NA' ? o.createTime : (o.exchangeTime || new Date().toISOString()),
      update_time: o.updateTime && o.updateTime !== 'NA' ? o.updateTime : (o.exchangeTime || new Date().toISOString()),
      raw_data: o.rawData || o.raw_data || o,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from('dhan_orders').upsert(rows, { onConflict: 'order_id' }).select();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json({
          ok: true,
          count: rows.length,
          tablePending: true,
          message: 'Dhan orders parsed successfully. Run migration 20261121_dhan_orders.sql in Supabase SQL editor to enable cloud persistence.',
        });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      count: data?.length || rows.length,
      message: `Persisted ${rows.length} Dhan orders to Supabase`,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
