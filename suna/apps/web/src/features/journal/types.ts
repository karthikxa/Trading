export type Direction = 'Buy' | 'Sell';
export type CurrencyMode = '$' | '%' | 'R';

export interface SplitOrder {
  id: string;
  orderNumber: number;
  lots: number;
  entryPrice: number;
  exitPrice: number;
  sl?: string;
  tp?: string;
}

export interface JournalTrade {
  id: string;
  projectId?: string;
  userId?: string;
  entryDate: string; // YYYY-MM-DD
  entryTime: string; // HH:mm
  exitDate?: string;
  exitTime?: string;
  instrument: string; // e.g. "AUDCHF", "EURUSD"
  direction: Direction;
  lots: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  pnl: number;
  riskR?: number | null;
  returnR?: number | null;
  swap?: number;
  commission?: number;
  followedPlan: boolean;
  planName: string;
  confluences: string[];
  tradeManagement?: string;
  mistakes: string[];
  entryEmotion?: string;
  exitEmotion?: string;
  notes?: string;
  chartHtf?: string;
  chartMtf?: string;
  chartLtf?: string;
  session?: string; // 'London' | 'New York' | 'Asian' | 'Pre-Market'
  duration?: string; // e.g. '11h 11m'
  splitOrders?: SplitOrder[];
  source: 'manual' | 'auto';
  createdAt?: string;
  updatedAt?: string;
}

export interface DaySummary {
  date: string; // YYYY-MM-DD
  totalTrades: number;
  netPnl: number;
  winRate: number;
  avgR: number;
  wins: number;
  losses: number;
  planFollowed: boolean;
  guardrailViolations: number;
  preMarketRoutine: string;
  tradesJournaled: string;
  trades: JournalTrade[];
}

