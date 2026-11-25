'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  PlugsConnectedIcon,
  ArrowClockwiseIcon,
  LockKeyIcon,
} from '@phosphor-icons/react';
import { cn } from '../../internal/lib/utils';

export function DhanConnectorCard({
  projectId,
  onOpenConnect,
}: {
  projectId: string;
  onOpenConnect?: () => void;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState('');
  const [fundsData, setFundsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchLiveDetails = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setLoading(true);
    try {
      const statusRes = await fetch('/api/dhan/auth/status', { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => ({ connected: false }));

      if (!statusRes?.connected) {
        setIsConnected(false);
        setClientId('');
        setFundsData(null);
        return;
      }

      setIsConnected(true);
      setClientId(statusRes.clientId || '');

      const fundsRes = await fetch('/api/dhan?action=funds', { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => null);
      if (fundsRes?.ok && fundsRes?.data) {
        setFundsData(fundsRes.data);
      }
    } catch (err) {
      console.warn('Failed to fetch Dhan profile details:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveDetails();

    const onTokenUpdate = () => {
      fetchLiveDetails();
    };

    window.addEventListener('dhan-token-updated', onTokenUpdate);
    return () => window.removeEventListener('dhan-token-updated', onTokenUpdate);
  }, [fetchLiveDetails]);

  const handleDisconnect = async () => {
    if (!confirm('Disconnect DhanHQ account from this local environment?')) return;
    await fetch('/api/dhan/auth/status', { method: 'DELETE' }).catch(() => {});
    setIsConnected(false);
    setClientId('');
    setFundsData(null);
    window.dispatchEvent(new CustomEvent('dhan-token-updated'));
  };

  const handleConnectClick = () => {
    if (onOpenConnect) {
      onOpenConnect();
    } else {
      window.dispatchEvent(new CustomEvent('open-connect-dhan-modal'));
    }
  };

  return (
    <div
      data-project-id={projectId}
      className="w-full mb-6 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/20 via-zinc-900/90 to-zinc-950 p-5 sm:p-6 shadow-lg shadow-emerald-950/10 transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-start sm:items-center gap-3.5">
          <img
            src="/logos/dhan.svg"
            alt="Dhan"
            className="size-12 rounded-xl object-contain shadow-md shadow-emerald-500/20 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">DhanHQ Trading Gateway</h3>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Connected · Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <span className="size-1.5 rounded-full bg-amber-400" />
                  Not Connected
                </span>
              )}
              <span className="text-[10px] text-zinc-500 font-mono">NSE / BSE Stock Broker</span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
              Official Indian stock broker integration for live trading execution, portfolio streaming, orders &amp; audit journaling.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {isConnected ? (
            <>
              <button
                type="button"
                onClick={fetchLiveDetails}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Refresh live balance and profile details from DhanHQ"
              >
                <ArrowClockwiseIcon className={cn('size-3.5', loading && 'animate-spin')} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleConnectClick}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium transition-colors cursor-pointer"
              >
                Switch Account
              </button>

              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 border border-rose-800/50 text-xs font-medium transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnectClick}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
            >
              <PlugsConnectedIcon className="size-4" />
              <span>Connect Dhan Account</span>
            </button>
          )}
        </div>
      </div>

      {isConnected ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 font-mono text-xs">
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3">
            <span className="text-[10px] text-zinc-400 font-sans block mb-1">Dhan Client ID</span>
            <span className="font-bold text-zinc-200">{clientId || '—'}</span>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3">
            <span className="text-[10px] text-zinc-400 font-sans block mb-1">Available Cash</span>
            <span className="font-bold text-emerald-400">
              {fundsData?.availabelBalance != null ? `₹${Number(fundsData.availabelBalance).toFixed(2)}` : '—'}
            </span>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3">
            <span className="text-[10px] text-zinc-400 font-sans block mb-1">Margin Used</span>
            <span className="font-bold text-zinc-300">
              {fundsData?.utilizedAmount != null ? `₹${Number(fundsData.utilizedAmount).toFixed(2)}` : '—'}
            </span>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3">
            <span className="text-[10px] text-zinc-400 font-sans block mb-1">Trading Segments</span>
            <span className="font-medium text-emerald-400 text-[11px] truncate block">
              NSE_EQ · NSE_FNO · BSE
            </span>
          </div>
        </div>
      ) : (
        <div className="pt-3 flex items-center gap-2 text-xs text-zinc-400">
          <LockKeyIcon className="size-4 text-emerald-400 shrink-0" />
          <span>
            Connect securely via official Dhan Consent browser login or Client ID + PIN + 6-digit TOTP. Tokens stay encrypted server-side.
          </span>
        </div>
      )}
    </div>
  );
}
