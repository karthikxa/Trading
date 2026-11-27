'use client';

import type { ConnectorConnectResult, ConnectorFinalizeResult } from '@kortix/sdk';

export interface ConnectLinkFlowOptions {
  openWindow?: () => Window | null;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 10 * 60_000;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function defaultOpenWindow(): Window | null {
  return window.open('', '_blank', 'popup,width=640,height=760');
}

function closePopupSafely(popup: Window): void {
  try {
    if (!popup.closed) popup.close();
  } catch {
    // A cross-origin page or browser policy can reject close(). The connection
    // result must still settle, so cleanup never replaces the real outcome.
  }
}

const POPUP_CLOSED_MESSAGE = 'The connection popup closed before authorization completed.';
const POPUP_WATCH_MS = 500;

/**
 * Rejects as soon as the popup is closed. A request that is still pending when
 * the person closes the window (a slow start or finalize) must not keep the
 * caller's button on a spinner: the flow races every request against this.
 */
function watchPopupClosed(popup: Window): { closed: Promise<never>; stop: () => void } {
  let timer: ReturnType<typeof setInterval> | undefined;
  const closed = new Promise<never>((_, reject) => {
    timer = setInterval(() => {
      let isClosed = false;
      try {
        isClosed = popup.closed;
      } catch {
        // A browser policy hides `closed`; the finalize poll still sees it.
      }
      if (isClosed) reject(new Error(POPUP_CLOSED_MESSAGE));
    }, POPUP_WATCH_MS);
  });
  // The race below consumes the rejection; this keeps an unraced one quiet.
  closed.catch(() => undefined);
  return { closed, stop: () => clearInterval(timer) };
}

function timeoutMessage(timeoutMs: number): string {
  const minutes = Math.max(1, Math.ceil(timeoutMs / 60_000));
  return `Authorization timed out after ${minutes} minute${minutes === 1 ? '' : 's'}. Try again.`;
}

export function connectLinkUrl(response: ConnectorConnectResult): string | null {
  return response.connectUrl || response.redirectUrl || null;
}

let activeAbort: (() => void) | null = null;

export function abortActiveConnectFlow(): void {
  activeAbort?.();
  activeAbort = null;
}

/**
 * Open a blank popup synchronously, request a hosted Connect Link, and poll the
 * normalized finalize endpoint until the provider reports an active account.
 *
 * Opening before the first await preserves browser user activation. Every
 * terminal path closes the popup when the browser permits it.
 */
export async function runConnectLinkFlow(
  start: () => Promise<ConnectorConnectResult>,
  finalize: () => Promise<ConnectorFinalizeResult>,
  options: ConnectLinkFlowOptions = {},
): Promise<{ connected: true }> {
  if (typeof window === 'undefined' && !options.openWindow) {
    throw new Error('Connect Link requires a browser window.');
  }

  const popup = (options.openWindow ?? defaultOpenWindow)();
  if (!popup) {
    // A no-auth toolkit completes in the start response and never needs a
    // browser window. Still attempt it when popups are blocked, but keep OAuth
    // fail-closed because its hosted authorization page cannot be shown.
    const response = await start();
    if (response.connected) return { connected: true };
    throw new Error('Your browser blocked the connection popup. Allow popups and try again.');
  }

  const watcher = watchPopupClosed(popup);
  let onAbortReject: ((err: Error) => void) | null = null;
  const abortPromise = new Promise<never>((_, reject) => {
    onAbortReject = reject;
  });
  abortPromise.catch(() => undefined);

  activeAbort = () => {
    closePopupSafely(popup);
    onAbortReject?.(new Error('Connection cancelled.'));
  };

  try {
    // The hosted page does not need access to the Kortix tab through window.opener.
    // Setting this on the same-origin blank page prevents reverse-tabnabbing after
    // navigation while keeping our Window reference for polling cleanup.
    try {
      popup.opener = null;
      if (popup.document) {
        const isDhanRoute =
          typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('/dhan');
        popup.document.write(
          isDhanRoute
            ? '<!DOCTYPE html><html><head><title>DhanHQ — Connecting...</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#090d16;color:#f8fafc;font-size:14px;}.loader{width:36px;height:36px;border:3px solid #1e293b;border-top:3px solid #00B386;border-radius:50%;animation:spin 0.6s linear infinite;margin:0 auto 16px;}@keyframes spin{to{transform:rotate(360deg)}}.brand{font-size:16px;font-weight:700;color:#00B386;margin-bottom:6px;letter-spacing:-0.01em}p{margin:0;color:#94a3b8;font-weight:500;font-size:13px;}</style></head><body><div style="text-align:center"><div class="loader"></div><div class="brand">DhanHQ</div><p>Connecting to DhanHQ Login...</p></div></body></html>'
            : '<!DOCTYPE html><html><head><title>Connecting...</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#090d16;color:#f8fafc;font-size:14px;}.loader{width:36px;height:36px;border:3px solid #1e293b;border-top:3px solid #6366f1;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;}@keyframes spin{to{transform:rotate(360deg)}}p{margin:0;color:#94a3b8;font-weight:500;}</style></head><body><div style="text-align:center"><div class="loader"></div><p>Opening OAuth Authorization...</p></div></body></html>'
        );
      }
    } catch {
      // Some browser WindowProxy implementations expose opener or document as restricted.
    }

    const response = await Promise.race([start(), watcher.closed, abortPromise]);
    if (response.connected) return { connected: true };
    const url = connectLinkUrl(response);
    if (!url) throw new Error('The connector did not return a Connect Link. Try again.');

    const isDhanAuth = url.includes('/api/dhan/auth/start') || url.includes('auth.dhan.co');
    const targetUrl =
      url.includes('/api/dhan/auth/start') && !url.includes('popup=1')
        ? `${url}${url.includes('?') ? '&' : '?'}popup=1`
        : url;

    if (popup.closed) {
      throw new Error(POPUP_CLOSED_MESSAGE);
    }

    popup.location.replace(targetUrl);

    // 0ms instant notification listener for DhanHQ callback (BroadcastChannel + postMessage)
    let cleanupChannel: (() => void) | undefined;
    const instantConnected = isDhanAuth
      ? new Promise<{ connected: true; clientId?: string; name?: string }>((resolve, reject) => {
          let bc: BroadcastChannel | null = null;
          const onMsg = (data: any) => {
            if (!data || typeof data !== 'object') return;
            if (data.type === 'dhan-connected') {
              resolve({ connected: true, clientId: data.clientId, name: data.name });
            } else if (data.type === 'dhan-error') {
              reject(new Error(`DhanHQ authorization failed (${data.reason || 'error'}).`));
            }
          };
          const handleWindowMessage = (e: MessageEvent) => onMsg(e.data);
          window.addEventListener('message', handleWindowMessage);
          try {
            if (typeof BroadcastChannel !== 'undefined') {
              bc = new BroadcastChannel('dhan-auth-channel');
              bc.onmessage = (e) => onMsg(e.data);
            }
          } catch {}
          cleanupChannel = () => {
            window.removeEventListener('message', handleWindowMessage);
            try {
              bc?.close();
            } catch {}
          };
        })
      : new Promise<never>(() => {});
    instantConnected.catch(() => undefined);

    const sleep = options.sleep ?? defaultSleep;
    const now = options.now ?? (() => Date.now());
    const pollIntervalMs = options.pollIntervalMs ?? (isDhanAuth ? 400 : DEFAULT_POLL_INTERVAL_MS);
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const deadline = now() + timeoutMs;

    try {
      while (true) {
        const result = await Promise.race([
          instantConnected,
          finalize(),
          watcher.closed,
          abortPromise,
        ]);
        if (result.connected) {
          if (isDhanAuth && typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('dhan-token-updated', {
                detail: {
                  connected: true,
                  clientId: 'clientId' in result ? result.clientId : undefined,
                  name: 'name' in result ? result.name : undefined,
                },
              }),
            );
          }
          return { connected: true };
        }
        if (popup.closed) {
          throw new Error(POPUP_CLOSED_MESSAGE);
        }

        const remainingMs = deadline - now();
        if (remainingMs <= 0) throw new Error(timeoutMessage(timeoutMs));
        await sleep(Math.min(pollIntervalMs, remainingMs));
      }
    } finally {
      cleanupChannel?.();
    }
  } finally {
    activeAbort = null;
    watcher.stop();
    closePopupSafely(popup);
  }
}
