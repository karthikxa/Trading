-- 20261109000000000_trading_journal.sql
-- Migration for Trading Journal schema and chart storage

CREATE SCHEMA IF NOT EXISTS trading;
GRANT USAGE ON SCHEMA trading TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS trading.journal_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_time TEXT,
  exit_date DATE,
  exit_time TEXT,
  instrument TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('Buy', 'Sell', 'Long', 'Short')),
  lots NUMERIC(15, 2) DEFAULT 1.0,
  entry_price NUMERIC(18, 5),
  exit_price NUMERIC(18, 5),
  stop_loss NUMERIC(18, 5),
  take_profit NUMERIC(18, 5),
  pnl NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
  risk_r NUMERIC(10, 2),
  return_r NUMERIC(10, 2),
  swap NUMERIC(15, 2) DEFAULT 0.00,
  commission NUMERIC(15, 2) DEFAULT 0.00,
  followed_plan BOOLEAN DEFAULT TRUE,
  plan_name TEXT DEFAULT 'A+ Setup Checklist',
  confluences TEXT[] DEFAULT '{}',
  trade_management TEXT,
  mistakes TEXT[] DEFAULT '{}',
  entry_emotion TEXT,
  exit_emotion TEXT,
  notes TEXT,
  chart_htf TEXT,
  chart_mtf TEXT,
  chart_ltf TEXT,
  session TEXT,
  duration TEXT,
  split_orders JSONB DEFAULT '[]'::jsonb,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_trades_date ON trading.journal_trades (entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_trades_project ON trading.journal_trades (project_id);
CREATE INDEX IF NOT EXISTS idx_journal_trades_instrument ON trading.journal_trades (instrument);

-- Grant privileges
GRANT ALL ON TABLE trading.journal_trades TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE trading.journal_trades TO anon;

-- Storage Bucket for journal screenshots (if supabase storage schema exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('journal-charts', 'journal-charts', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

