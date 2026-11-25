'use client';

/**
 * DhanHQ Live Order Update WebSocket Client (`wss://api-order-update.dhan.co`)
 * 
 * - Pushes an instant event whenever an order is placed, traded, modified, or canceled
 * - Quota impact: 0 REST calls consumed
 * - Instant fill and execution updates without polling
 */

export interface DhanOrderAlertPayload {
  orderId: string;
  correlationId?: string;
  orderStatus: 'TRANSIT' | 'PENDING' | 'REJECTED' | 'CANCELLED' | 'TRADED' | 'EXPIRED';
  transactionType: 'BUY' | 'SELL';
  exchangeSegment: string;
  productType: string;
  orderType: string;
  validity: string;
  tradingSymbol: string;
  securityId: string;
  quantity: number;
  price: number;
  triggerPrice?: number;
  disclosedQuantity?: number;
  afterMarketOrder?: boolean;
  boId?: string;
  legName?: string;
  createTime?: string;
  updateTime?: string;
  exchangeTime?: string;
  drvExpiryDate?: string;
  drvOptionType?: string;
  drvStrikePrice?: number;
  omsErrorCode?: string;
  omsErrorDescription?: string;
  filledQty?: number;
  pendingQty?: number;
  tradedPrice?: number;
}

export interface DhanOrderAlertMessage {
  Type: string; // e.g. "order_alert"
  Payload?: DhanOrderAlertPayload;
  LoginRsp?: {
    MsgCode: number;
    Status: string;
  };
}

type OrderAlertListener = (alert: DhanOrderAlertPayload) => void;

class DhanOrderUpdateManager {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private reconnectTimer: any = null;
  private listeners = new Set<OrderAlertListener>();
  private isAuthenticated = false;

  public async connect(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return true;
    }
    if (this.isConnecting) return false;
    this.isConnecting = true;

    try {
      const res = await fetch('/api/dhan/auth/ws-session', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token || !data?.clientId) {
        this.isConnecting = false;
        return false;
      }

      const ws = new WebSocket('wss://api-order-update.dhan.co');

      ws.onopen = () => {
        this.ws = ws;
        this.isConnecting = false;

        // Send Dhan Order Update Login Authorization Payload (MsgCode 42)
        const loginPayload = {
          LoginReq: {
            MsgCode: 42,
            ClientId: String(data.clientId),
            Token: String(data.token),
          },
          UserType: 'SELF',
        };
        ws.send(JSON.stringify(loginPayload));
        console.log('[DhanOrderUpdate] Sent login handshake to order update WebSocket (0 REST quota)');
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : '';
          if (!raw) return;
          const msg: DhanOrderAlertMessage = JSON.parse(raw);

          if (msg.LoginRsp && msg.LoginRsp.MsgCode === 43) {
            this.isAuthenticated = msg.LoginRsp.Status === 'SUCCESS';
            console.log('[DhanOrderUpdate] Order update channel authenticated successfully');
            return;
          }

          if (msg.Type === 'order_alert' && msg.Payload) {
            const payload = msg.Payload;
            console.log(`[DhanOrderUpdate] Instant Order Event: #${payload.orderId} ${payload.orderStatus} @ ${payload.tradedPrice || payload.price}`);

            // Dispatch to registered callbacks
            this.listeners.forEach((cb) => cb(payload));

            // Notify reactive frontend listeners
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('dhan-order-alert', { detail: payload }));
              window.dispatchEvent(new CustomEvent('dhan-orders-updated'));
            }
          }
        } catch (err) {
          // Ignore parse errors on ping/pong frames
        }
      };

      ws.onerror = (err) => {
        console.warn('[DhanOrderUpdate] WebSocket error:', err);
      };

      ws.onclose = () => {
        this.ws = null;
        this.isConnecting = false;
        this.isAuthenticated = false;
        this.scheduleReconnect();
      };

      return true;
    } catch (err) {
      this.isConnecting = false;
      this.scheduleReconnect();
      return false;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {});
    }, 5000);
  }

  public onOrderAlert(callback: OrderAlertListener): () => void {
    this.listeners.add(callback);
    this.connect();
    return () => {
      this.listeners.delete(callback);
    };
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const dhanOrderUpdates = new DhanOrderUpdateManager();
