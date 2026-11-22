-- ============================================================================
-- Migration: DhanHQ Orders Table for Live & Historical Order Book
-- Description: Stores all DhanHQ trading orders, executions, status updates, 
--              and regulatory/brokerage fee breakdowns for real-time order tracking.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dhan_orders (
    order_id TEXT PRIMARY KEY,
    project_id TEXT DEFAULT 'b0000000-0000-0000-0000-000000000001',
    exchange_order_id TEXT,
    dhan_client_id TEXT DEFAULT '1114824544',
    trading_symbol TEXT NOT NULL,
    custom_symbol TEXT,
    security_id TEXT,
    isin TEXT,
    exchange_segment TEXT NOT NULL DEFAULT 'NSE_EQ',
    transaction_type TEXT NOT NULL, -- 'BUY' | 'SELL'
    order_type TEXT NOT NULL DEFAULT 'MARKET', -- 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_MARKET'
    product_type TEXT NOT NULL DEFAULT 'INTRADAY', -- 'CNC' | 'INTRADAY' | 'MARGIN' | 'MTF'
    order_status TEXT NOT NULL DEFAULT 'TRADED', -- 'TRANSIT' | 'PENDING' | 'REJECTED' | 'CANCELLED' | 'TRADED' | 'EXPIRED'
    quantity INTEGER NOT NULL DEFAULT 1,
    disclosed_quantity INTEGER DEFAULT 0,
    price NUMERIC(15, 2) DEFAULT 0,
    trigger_price NUMERIC(15, 2) DEFAULT 0,
    traded_quantity INTEGER DEFAULT 0,
    avg_traded_price NUMERIC(15, 2) DEFAULT 0,
    turnover NUMERIC(15, 2) DEFAULT 0,
    brokerage_charges NUMERIC(10, 4) DEFAULT 0,
    service_tax NUMERIC(10, 4) DEFAULT 0,
    exchange_charges NUMERIC(10, 4) DEFAULT 0,
    sebi_tax NUMERIC(10, 4) DEFAULT 0,
    stamp_duty NUMERIC(10, 4) DEFAULT 0,
    stt NUMERIC(10, 4) DEFAULT 0,
    total_charges NUMERIC(10, 4) DEFAULT 0,
    validity TEXT DEFAULT 'DAY',
    oms_error_code TEXT,
    oms_error_description TEXT,
    trading_session TEXT DEFAULT 'Indian Market + Asian Session',
    exchange_time TIMESTAMP WITH TIME ZONE,
    create_time TIMESTAMP WITH TIME ZONE,
    update_time TIMESTAMP WITH TIME ZONE,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_dhan_orders_project_id ON public.dhan_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_dhan_orders_symbol ON public.dhan_orders(trading_symbol);
CREATE INDEX IF NOT EXISTS idx_dhan_orders_status ON public.dhan_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_dhan_orders_exchange_time ON public.dhan_orders(exchange_time DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.dhan_orders ENABLE ROW LEVEL SECURITY;

-- Allow read & write policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'dhan_orders' AND policyname = 'Allow public read and write on dhan_orders'
    ) THEN
        CREATE POLICY "Allow public read and write on dhan_orders" 
        ON public.dhan_orders 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;
