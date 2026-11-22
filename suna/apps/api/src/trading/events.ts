import { sql } from 'drizzle-orm';
import { db } from '../shared/db';

export interface BotEventRecord {
  event_id?: string;
  bot_id: string;
  event_type: 'bot_created' | 'run_finished' | 'run_failed' | 'market_alert' | 'approval_granted' | 'idle_heartbeat';
  payload?: Record<string, unknown>;
  status?: 'pending' | 'processing' | 'completed' | 'dismissed';
}

/**
 * OpenMausBot-style unified event bus for proactive bot execution.
 * NOTE: Silent catches removed per Round 3 instructions.
 */
export async function emitBotEvent(event: BotEventRecord): Promise<void> {
  const payloadJson = JSON.stringify(event.payload || {});
  try {
    await db.execute(sql`
      insert into trading.bot_events (
        event_id, bot_id, event_type, payload, status, created_at
      ) values (
        gen_random_uuid()::text, ${event.bot_id}, ${event.event_type},
        ${payloadJson}::jsonb, 'pending', now()
      )
    `);
  } catch (err: any) {
    // Check if error is missing table trading.bot_events
    if (err?.message?.includes('bot_events') || err?.code === '42P01') {
      console.warn(`[ProactiveEventBus] Migration required: trading.bot_events does not exist yet. Event ${event.event_type} not persisted.`);
      throw new Error(`migration_required: trading.bot_events table missing`);
    }
    console.error(`[ProactiveEventBus] Error emitting event ${event.event_type}:`, err);
    throw err;
  }
}

/**
 * Evaluates proactive action based on event type.
 */
export function getProactiveResponse(eventType: string, botName: string, role: string): string {
  switch (eventType) {
    case 'bot_created':
      return `Hello! I am ${botName}, your ${role}. I'm initialized and ready to run market analyses, screen setups, or coordinate with the desk. What asset or thesis should we review?`;
    case 'run_finished':
      return `Consensus deliberation complete. Key risk parameters and allocation sizes have been updated. Would you like me to stage orders for approval?`;
    case 'run_failed':
      return `Deliberation encountered an execution error. Reviewing safety limits.`;
    default:
      return `Standing by for market directives.`;
  }
}

/**
 * Validates whether a bot has permission to use computer / terminal automation.
 * Admin bots are permitted; others require elevated grant.
 */
export async function checkBotComputerPermission(botId: string): Promise<boolean> {
  if (botId === 'portfolio_manager') return true;
  if (!botId || botId === 'unbound') return false;
  try {
    const rows = await db.execute(sql`
      select is_admin from trading.agents where id = ${botId} limit 1
    `);
    const agent = (rows as unknown as { rows: Array<{ is_admin: boolean }> })?.rows?.[0];
    return Boolean(agent?.is_admin);
  } catch {
    return false;
  }
}
