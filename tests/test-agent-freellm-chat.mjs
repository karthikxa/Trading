import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from '../suna/node_modules/pg/lib/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Database Connection (Zero migrations, read/insert only)
function getDbUrl() {
  const envPaths = [
    path.join(__dirname, '../suna/apps/api/.env.local'),
    path.join(__dirname, '../suna/apps/web/.env.local'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      const m = content.match(/DATABASE_URL=([^\r\n]+)/);
      if (m) return m[1].replace(/['"]/g, '').trim();
    }
  }
  return null;
}

const dbUrl = getDbUrl();
if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

// 2. FreeLLMAPI Caller with automatic cooldown handling
async function callFreeLlm(messages, model = 'openai-fast', agentName = 'Agent') {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    const start = Date.now();
    try {
      console.log(`\n⏳ [${agentName}] Querying FreeLLMAPI (${model})...`);
      const res = await fetch('https://text.pollinations.ai/openai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          seed: Math.floor(Math.random() * 1000000),
        }),
        signal: AbortSignal.timeout(30000),
      });

      const bodyText = await res.text();
      let data = null;
      try {
        data = JSON.parse(bodyText);
      } catch {}

      if (res.ok && data?.choices?.[0]?.message?.content) {
        const content = data.choices[0].message.content.trim();
        const latencyMs = Date.now() - start;
        return {
          ok: true,
          content,
          model: data.model || model,
          latencyMs,
        };
      }

      // Check for rate limit cooldown
      const waitMatch = bodyText.match(/wait\s+(\d+)\s+seconds/i);
      const waitSec = waitMatch ? parseInt(waitMatch[1], 10) + 2 : 40;
      console.warn(`⚠️ [${agentName}] Rate limit reached (${res.status}). Waiting ${waitSec}s cooldown...`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
    } catch (err) {
      console.warn(`⚠️ [${agentName}] Network error: ${err.message}. Retrying in 5s...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  return { ok: false, error: 'Max retries exceeded' };
}

// 3. Main Multi-Agent FreeLLM Conversation Runner
async function runRealAgentChat() {
  await client.connect();
  console.log('✅ Connected to Cloud PostgreSQL (schema: trading)');

  // Fetch registered agents from DB
  const agentRows = await client.query(`
    SELECT id, name, role, system_prompt
    FROM trading.agents
    ORDER BY id
  `);
  const agentMap = new Map();
  agentRows.rows.forEach((r) => agentMap.set(r.id, r));

  console.log(`✅ Loaded ${agentRows.rows.length} agents from trading.agents`);

  const projectId = 'b0000000-0000-0000-0000-000000000001';
  const sessionId = `swarm-live-${Date.now()}`;
  const ticker = 'RELIANCE';
  const marketContext = `
[MARKET BRIEF]:
- Asset: ${ticker} (NSE / Indian Equities)
- Current Price: ₹2,510.50 (+1.8% today)
- Market Structure: Breakout above ₹2,500 psychological resistance, test of 200-day SMA.
- Desk Capital: Available Balance ₹720.02. Goal Target: ₹1,00,000.
`.trim();

  console.log('\n======================================================');
  console.log('🚀 INITIATING LIVE MULTI-AGENT CHAT VIA FREELLM API');
  console.log(`   Session ID: ${sessionId}`);
  console.log(`   Ticker: ${ticker} | Capital: ₹720.02 | Target: ₹100,000`);
  console.log('======================================================');

  const conversationHistory = [];

  // Helper to persist message into trading.bot_messages
  async function persistMessage(agentId, agentName, content, metadata = {}) {
    const res = await client.query(`
      INSERT INTO trading.bot_messages (
        project_id, session_id, agent_id, agent_name, sender, content, metadata, created_at
      ) VALUES ($1, $2, $3, $4, 'agent', $5, $6, NOW())
      RETURNING id, created_at
    `, [projectId, sessionId, agentId, agentName, content, JSON.stringify(metadata)]);
    return res.rows[0];
  }

  // Define the multi-agent chat chain
  const chainSteps = [
    {
      agentId: 'technical_analyst',
      fallbackName: 'Technical Analyst',
      fallbackRole: 'Technicals & Price Momentum',
      prompt: `${marketContext}\n\nYou are Technical Analyst. Provide a concise 2-sentence technical appraisal of the ₹2,500 breakout on ${ticker}, identifying support/resistance and key volume triggers.`,
    },
    {
      agentId: 'bull_researcher',
      fallbackName: 'Bull Researcher',
      fallbackRole: 'Bullish Thesis & Upside Catalysts',
      prompt: (history) => `
${marketContext}
Previous Analysis from Technical Analyst:
"${history[0].content}"

You are Bull Researcher. Build a sharp 2-sentence long thesis addressing the Technical Analyst's setup and naming the next upside target.
`.trim(),
    },
    {
      agentId: 'bear_researcher',
      fallbackName: 'Bear Researcher',
      fallbackRole: 'Downside Risk & Short Arguments',
      prompt: (history) => `
${marketContext}
Bull Researcher's Thesis:
"${history[1].content}"

You are Bear Researcher. Directly challenge the Bull Researcher's argument in 2 sentences. Highlight the danger of false breakouts and overhead supply.
`.trim(),
    },
    {
      agentId: 'portfolio_manager',
      fallbackName: 'Portfolio Manager',
      fallbackRole: 'Capital Allocation & Swarm Lead',
      prompt: (history) => `
${marketContext}
Debate Summary:
- Bull Case: "${history[1].content}"
- Bear Rebuttal: "${history[2].content}"

You are Portfolio Manager. Synthesize this debate in 2 sentences. State your final committee decision (BUY, HOLD, or SELL) and capital allocation sizing given our ₹720 balance.
`.trim(),
    },
    {
      agentId: 'risk_manager',
      fallbackName: 'Risk Manager',
      fallbackRole: 'Drawdown & Volatility Guard',
      prompt: (history) => `
${marketContext}
Portfolio Manager's Decision:
"${history[3].content}"

You are Risk Manager. Issue your risk gate evaluation in 2 sentences: either APPROVE with hard stop-loss parameters or VETO if downside risk exceeds acceptable tolerance.
`.trim(),
    },
  ];

  for (let i = 0; i < chainSteps.length; i++) {
    const step = chainSteps[i];
    const agentData = agentMap.get(step.agentId);
    const agentName = agentData?.name || step.fallbackName;
    const agentRole = agentData?.role || step.fallbackRole;
    const sysPrompt = agentData?.system_prompt || `You are ${agentName}, ${agentRole} on the Tauric trading desk. Speak decisively in character.`;

    const userPrompt = typeof step.prompt === 'function' ? step.prompt(conversationHistory) : step.prompt;

    const messages = [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: userPrompt },
    ];

    const result = await callFreeLlm(messages, 'openai-fast', agentName);
    if (!result.ok) {
      console.error(`❌ Agent ${agentName} failed: ${result.error}`);
      break;
    }

    console.log(`\n💬 [${agentName} (${agentRole})] (${result.latencyMs}ms | model: ${result.model}):`);
    console.log(`   "${result.content}"`);

    conversationHistory.push({
      agentId: step.agentId,
      agentName,
      agentRole,
      content: result.content,
      model: result.model,
      latencyMs: result.latencyMs,
    });

    // Save to trading.bot_messages
    const saved = await persistMessage(step.agentId, agentName, result.content, {
      model: result.model,
      latencyMs: result.latencyMs,
      ticker,
      turn: i + 1,
    });
    console.log(`   ↳ Persisted to trading.bot_messages (ID: ${saved.id})`);
  }

  console.log('\n======================================================');
  console.log(`🎉 MULTI-AGENT CHAT COMPLETE: ${conversationHistory.length}/${chainSteps.length} AGENTS RESPONDED LIVE`);
  console.log('======================================================');

  await client.end();
}

runRealAgentChat().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
