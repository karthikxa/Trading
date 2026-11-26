import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://hxkheycjotegkqrbxfff.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4a2hleWNqb3RlZ2txcmJ4ZmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MzA5OTYsImV4cCI6MjEwOTEwNjk5Nn0.o-pfnmjV6STjwQSJLLgvSfgfLm2A3swiVX8Pifpnw9k';

export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface DhanConnectionRecord {
  id: string;
  project_id: string;
  client_id: string | null;
  name: string | null;
  auth_method: string | null;
  status: 'active' | 'disconnected' | 'expired';
  connected_at: string | null;
  expires_at: string | null;
  disconnected_at: string | null;
  last_synced_at: string | null;
  snapshot_funds: Record<string, unknown> | null;
  snapshot_positions: unknown[] | null;
  snapshot_summary: Record<string, unknown> | null;
  updated_at: string;
}

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
}

function rowId(projectId = 'trading') {
  return `${projectId}:dhan`;
}

export async function upsertDhanConnection(input: {
  projectId?: string;
  clientId: string;
  name?: string | null;
  authMethod?: string;
  connectedAt?: string;
  expiresAt?: string;
}): Promise<DhanConnectionRecord | null> {
  try {
    const projectId = input.projectId || 'trading';
    const connectedAt = input.connectedAt || new Date().toISOString();
    const connectedMs = new Date(connectedAt).getTime();
    const expiresAt =
      input.expiresAt ||
      new Date((Number.isNaN(connectedMs) ? Date.now() : connectedMs) + TWENTY_FOUR_HOURS_MS).toISOString();

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('dhan_connections')
      .upsert(
        {
          id: rowId(projectId),
          project_id: projectId,
          client_id: input.clientId,
          name: input.name || null,
          auth_method: input.authMethod || 'totp',
          status: 'active',
          connected_at: connectedAt,
          expires_at: expiresAt,
          disconnected_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      .select('*')
      .maybeSingle();

    if (error) {
      console.warn('[dhan/db] upsertDhanConnection error:', error.message);
      return null;
    }
    return data as DhanConnectionRecord | null;
  } catch (err) {
    console.warn('[dhan/db] upsertDhanConnection failed:', err);
    return null;
  }
}

export async function markDhanDisconnected(
  projectId = 'trading',
  reason: 'disconnected' | 'expired' = 'disconnected',
): Promise<void> {
  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    const { error } = await supabase.from('dhan_connections').upsert(
      {
        id: rowId(projectId),
        project_id: projectId,
        status: reason,
        disconnected_at: now,
        updated_at: now,
      },
      { onConflict: 'id' },
    );
    if (error) {
      console.warn('[dhan/db] markDhanDisconnected error:', error.message);
    }
  } catch (err) {
    console.warn('[dhan/db] markDhanDisconnected failed:', err);
  }
}

export async function getDhanConnectionRecord(
  projectId = 'trading',
): Promise<DhanConnectionRecord | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('dhan_connections')
      .select('*')
      .eq('id', rowId(projectId))
      .maybeSingle();

    if (error || !data) return null;
    const record = data as DhanConnectionRecord;

    if (record.status === 'active' && record.expires_at) {
      const expMs = new Date(record.expires_at).getTime();
      if (!Number.isNaN(expMs) && Date.now() >= expMs) {
        await markDhanDisconnected(projectId, 'expired');
        return {
          ...record,
          status: 'expired',
          disconnected_at: new Date().toISOString(),
        };
      }
    }

    return record;
  } catch {
    return null;
  }
}

export async function saveDhanDashboardSnapshot(
  projectId = 'trading',
  snapshot: {
    funds?: unknown;
    positions?: unknown[];
    summary?: unknown;
  },
): Promise<void> {
  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      id: rowId(projectId),
      project_id: projectId,
      last_synced_at: now,
      updated_at: now,
    };
    if (snapshot.funds !== undefined) payload.snapshot_funds = snapshot.funds;
    if (snapshot.positions !== undefined) payload.snapshot_positions = snapshot.positions;
    if (snapshot.summary !== undefined) payload.snapshot_summary = snapshot.summary;

    await supabase.from('dhan_connections').upsert(payload, { onConflict: 'id' });
  } catch {
    // Non-blocking snapshot persistence
  }
}
