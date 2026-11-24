/**
 * Proactive Agent Dispatches Engine
 * Handles autonomous alerts, strategy recommendations, and proactive trade dispatches
 * emitted by Kortix / Bops trading bots (e.g. Portfolio Manager, Risk Manager, Trader Agent).
 */

export type DispatchLevel = 'info' | 'notice' | 'warning' | 'alert' | 'critical';

export interface ProactiveApproval {
  id: string;
  dispatchId?: string;
  agentId: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'REBALANCE' | 'STOP_LOSS' | 'ALERT';
  quantity?: number;
  price?: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  reason?: string;
  confidence?: number;
  timestamp: string;
}

export interface ProactiveDispatch {
  id: string;
  agentId: string;
  agentName: string;
  type: 'trade_signal' | 'risk_warning' | 'market_opportunity' | 'system_status' | 'execution_report';
  message: string;
  level: DispatchLevel;
  symbol?: string;
  action?: 'BUY' | 'SELL' | 'HOLD' | 'REBALANCE' | 'STOP_LOSS' | 'ALERT';
  quantity?: number;
  price?: number;
  metadata?: Record<string, unknown>;
  approval?: ProactiveApproval;
  timestamp: string;
  read?: boolean;
}

type DispatchListener = (dispatch: ProactiveDispatch) => void;

class ProactiveDispatchStore {
  private dispatches: ProactiveDispatch[] = [];
  private listeners: Set<DispatchListener> = new Set();
  private maxHistory = 100;

  constructor() {
    // Initialize with recent system bootstrap notice if in browser
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('kortix_proactive_dispatches_v1');
        if (saved) {
          this.dispatches = JSON.parse(saved);
        }
      } catch {
        // Fallback to in-memory store
      }
    }
  }

  public dispatch(dispatchData: Omit<ProactiveDispatch, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): ProactiveDispatch {
    const item: ProactiveDispatch = {
      id: dispatchData.id || `disp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: dispatchData.timestamp || new Date().toISOString(),
      read: false,
      ...dispatchData,
    };

    this.dispatches.unshift(item);
    if (this.dispatches.length > this.maxHistory) {
      this.dispatches = this.dispatches.slice(0, this.maxHistory);
    }

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('kortix_proactive_dispatches_v1', JSON.stringify(this.dispatches));
        window.dispatchEvent(new CustomEvent('proactive-dispatch-event', { detail: item }));
      } catch {}
    }

    this.listeners.forEach((listener) => {
      try {
        listener(item);
      } catch (err) {
        console.error('[ProactiveDispatch] Listener error:', err);
      }
    });

    return item;
  }

  public subscribe(listener: DispatchListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getAll(): ProactiveDispatch[] {
    return [...this.dispatches];
  }

  public getByAgent(agentId: string): ProactiveDispatch[] {
    return this.dispatches.filter((d) => d.agentId === agentId);
  }

  public markAsRead(id: string): void {
    const item = this.dispatches.find((d) => d.id === id);
    if (item) {
      item.read = true;
    }
  }

  public clear(): void {
    this.dispatches = [];
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('kortix_proactive_dispatches_v1');
      } catch {}
    }
  }
}

export const dispatchStore = new ProactiveDispatchStore();

/**
 * Dispatches an automated proactive message from a trading agent
 */
export function dispatchProactiveAgentMessage(
  agentId: string,
  message: string,
  options?: Partial<Omit<ProactiveDispatch, 'agentId' | 'message'>>,
): ProactiveDispatch {
  const agentName = options?.agentName || agentId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return dispatchStore.dispatch({
    agentId,
    agentName,
    type: options?.type || 'market_opportunity',
    message,
    level: options?.level || 'info',
    symbol: options?.symbol,
    action: options?.action,
    quantity: options?.quantity,
    price: options?.price,
    metadata: options?.metadata,
    approval: options?.approval,
  });
}

/**
 * Gets the most recent proactive dispatch for a specific agent
 */
export function getProactiveDispatchForAgent(agentId: string): ProactiveDispatch | undefined {
  return dispatchStore.getByAgent(agentId)[0];
}

/**
 * Triggers a market alert for a given symbol
 */
export function triggerProactiveMarketAlert(
  symbol: string,
  reason: string,
  level: DispatchLevel = 'warning',
): ProactiveDispatch {
  return dispatchStore.dispatch({
    agentId: 'risk_manager',
    agentName: 'Risk Manager',
    type: 'risk_warning',
    message: `[${symbol}] ${reason}`,
    level,
    symbol,
    action: 'ALERT',
  });
}

/**
 * Subscribes to live proactive agent dispatches
 */
export function subscribeProactiveDispatches(callback: (dispatch: ProactiveDispatch) => void): () => void {
  return dispatchStore.subscribe(callback);
}

/**
 * React hook to access proactive agent dispatches
 */
export function useProactiveDispatches(agentId?: string) {
  const [dispatches, setDispatches] = (typeof window !== 'undefined' && (window as unknown as { React?: typeof import('react') }).React)
    ? (window as unknown as { React: typeof import('react') }).React.useState<ProactiveDispatch[]>(() =>
        agentId ? dispatchStore.getByAgent(agentId) : dispatchStore.getAll(),
      )
    : [agentId ? dispatchStore.getByAgent(agentId) : dispatchStore.getAll(), () => {}];

  return {
    dispatches,
    dispatchMessage: dispatchProactiveAgentMessage,
    getForAgent: getProactiveDispatchForAgent,
    triggerAlert: triggerProactiveMarketAlert,
  };
}

export default dispatchStore;
