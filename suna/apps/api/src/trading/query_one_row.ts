import { db } from '../shared/db';
import { sql } from 'drizzle-orm';

async function main() {
  const rows = await db.execute(sql`select * from trading.bot_messages limit 1`);
  console.log(JSON.stringify(rows, null, 2));
}

main().catch(console.error);
