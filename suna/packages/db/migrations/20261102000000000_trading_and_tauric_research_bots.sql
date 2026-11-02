-- 20261102000000000_trading_and_tauric_research_bots.sql
-- Migration for Trading schema and TauricResearch bots

CREATE SCHEMA IF NOT EXISTS trading;
GRANT USAGE ON SCHEMA trading TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS trading.agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  group_category TEXT NOT NULL,
  shape TEXT NOT NULL,
  color TEXT NOT NULL,
  expression TEXT NOT NULL,
  description TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  system_prompt TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trading.agent_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  agent_ids TEXT[] NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trading.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT 'us',
  name TEXT,
  price NUMERIC(15, 4),
  change_percent NUMERIC(10, 4),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trading.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main Trading Portfolio',
  cash_balance NUMERIC(15, 2) DEFAULT 100000.00,
  currency TEXT DEFAULT 'USD',
  positions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trading.swarm_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  agent_id TEXT REFERENCES trading.agents(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('BUY', 'SELL', 'HOLD')),
  confidence NUMERIC(5, 2),
  reasoning TEXT,
  risk_score NUMERIC(5, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

GRANT ALL ON ALL TABLES IN SCHEMA trading TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA trading TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA trading GRANT ALL ON TABLES TO service_role, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA trading GRANT SELECT ON TABLES TO anon;
