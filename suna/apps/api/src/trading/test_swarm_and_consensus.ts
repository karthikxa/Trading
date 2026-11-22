import { sql } from 'drizzle-orm';
import { db } from '../shared/db';

async function testSwarm() {
  console.log('--- Step 1: POST /v1/trading/swarm/run ---');
  const postRes = await fetch('http://localhost:8008/v1/trading/swarm/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker: 'RELIANCE',
      analystIds: ['fundamentals_analyst', 'technical_analyst'],
      debateRounds: 1,
      note: 'Analyst instructions: fundamentals_analyst views valuation as deeply undervalued (vote BUY), technical_analyst views breakdown below 200-SMA as critical resistance (vote SELL).',
    }),
  });

  const postJson = await postRes.json();
  console.log('Post Status:', postRes.status);
  console.log('Post Response:', JSON.stringify(postJson));

  const runId = postJson.run_id;
  if (!runId) {
    console.error('No run_id returned');
    return;
  }

  console.log('\n--- Step 2: Poll GET /v1/trading/swarm/runs/:id ---');
  let pollResult: any = null;
  for (let i = 0; i < 35; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`http://localhost:8008/v1/trading/swarm/runs/${runId}`);
    const data = await pollRes.json();
    console.log(`Poll #${i + 1} (${pollRes.status}): status=${data.status}`);
    if (data.status === 'done' || data.status === 'error') {
      pollResult = data;
      break;
    }
  }

  console.log('\n--- Step 3: Swarm Final Report ---');
  console.log(JSON.stringify(pollResult, null, 2));

  console.log('\n--- Step 4: Query trading.bot_messages for Consensus Message ---');
  try {
    const rows = await db.execute(sql`
      select id, project_id, session_id, agent_id, agent_name, sender, content, metadata, created_at
      from trading.bot_messages
      order by created_at desc
      limit 5
    `);
    const list = Array.isArray(rows) ? rows : (rows as any)?.rows ?? [];
    console.log('Latest trading.bot_messages rows:');
    console.log(JSON.stringify(list, null, 2));
  } catch (err) {
    console.error('DB query error:', err);
  }
}

testSwarm().catch(console.error);
