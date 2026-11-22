import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { db } from '../shared/db';

async function runMigrations() {
  const migrationsDir = path.resolve(process.cwd(), '../../../scratch/pending-migrations');
  console.log('[CloudMigration] Reading migrations from:', migrationsDir);

  const files = [
    '001_trading_agents_extended.sql',
    '002_swarm_runs.sql',
    '003_bot_events_and_proactive.sql',
    '004_connector_grants.sql',
    '005_bot_messages.sql',
  ];

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    if (!fs.existsSync(fullPath)) {
      console.error(`[CloudMigration] File not found: ${file}`);
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    console.log(`[CloudMigration] Applying ${file}...`);
    try {
      await db.execute(sql.raw(content));
      console.log(`[CloudMigration] SUCCESS: ${file} applied to Cloud Supabase.`);
    } catch (err: any) {
      console.error(`[CloudMigration] ERROR in ${file}:`, err?.message || err);
    }
  }

  // Grant privileges to Supabase roles
  try {
    await db.execute(sql.raw(`
      GRANT ALL ON ALL TABLES IN SCHEMA trading TO authenticated, service_role;
      GRANT SELECT ON ALL TABLES IN SCHEMA trading TO anon;
      ALTER DEFAULT PRIVILEGES IN SCHEMA trading GRANT ALL ON TABLES TO service_role, authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA trading GRANT SELECT ON TABLES TO anon;
    `));
    console.log('[CloudMigration] SUCCESS: Privileges granted to service_role, authenticated, and anon.');
  } catch (err: any) {
    console.error('[CloudMigration] Error granting privileges:', err?.message || err);
  }

  console.log('[CloudMigration] All authorized cloud migrations finished.');
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('[CloudMigration] Fatal error:', err?.message || err);
  process.exit(1);
});
