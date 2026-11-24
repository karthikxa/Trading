'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@kortix/ui';
import { getDhanLiveSnapshot, subscribeDhanLive, DhanLiveSnapshot } from './dhanLiveStore';

export default function DhanAccountBar({ className = '' }: { className?: string }) {
  // Synchronous 0ms frame-0 hydration from snapshot cache
  const [snapshot, setSnapshot] = useState<DhanLiveSnapshot>(() => getDhanLiveSnapshot());
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeDhanLive((next) => {
      setSnapshot(next);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateToken = async () => {
    const choice = window.prompt(
      'DhanHQ Authentication Setup:\n\n1. Type "A" to setup 100% Automated Daily Login (PIN + TOTP Secret Key)\n2. Or directly paste today’s Access Token below:',
      typeof window !== 'undefined' ? localStorage.getItem('kortix_dhan_access_token') || '' : ''
    );
    if (!choice) return;

    if (choice.trim().toUpperCase() === 'A') {
      const pin = window.prompt('Enter your 6-digit Dhan login PIN:');
      if (!pin) return;
      const totp = window.prompt('Enter your Dhan TOTP Secret Key (from Dhan Google Authenticator setup):');
      if (!totp) return;

      try {
        const res = await fetch('/api/dhan?action=auto_auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pin.trim(), totpSecret: totp.trim() }),
        });
        const data = await res.json();
        if (data.ok && data.accessToken) {
          localStorage.setItem('kortix_dhan_access_token', data.accessToken);
          window.dispatchEvent(new CustomEvent('dhan-token-updated'));
          alert('Automated Dhan Login Succeeded! Daily token generated and live sync active.');
        } else {
          alert('Auto-Login failed: ' + (data.error || 'Check your PIN and TOTP Secret'));
        }
      } catch (err: any) {
        alert('Auto-login error: ' + (err?.message || 'Network error'));
      }
    } else {
      localStorage.setItem('kortix_dhan_access_token', choice.trim());
      window.dispatchEvent(new CustomEvent('dhan-token-updated'));
      alert('Dhan Access Token updated! Syncing live orders, positions, and journal...');
    }
  };

  const handleKillSwitch = async () => {
    if (!confirm('Are you sure you want to activate the Dhan Kill Switch? This will disable trading to prevent further orders.')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/dhan?action=kill_switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ killSwitchStatus: 'ACTIVATE' }),
      });
      const data = await res.json();
      if (data.ok) {
        setKillSwitchActive(true);
        alert('Dhan Kill Switch activated successfully. Trading disabled for today.');
      } else {
        alert(data?.data?.errorMessage || 'Kill switch request sent to Dhan.');
      }
    } catch {
      alert('Error triggering Kill Switch.');
    } finally {
      setActionLoading(false);
    }
  };

  const funds = snapshot.funds;
  const summary = snapshot.summary;
  const liveDayPnl = summary.totalDayPnl;
  const isProfit = liveDayPnl >= 0;

  return (
    <div
      className={cn(
        'w-full bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white shadow-sm flex flex-wrap items-center justify-between gap-3',
        className
      )}
    >
      {/* Broker & Account Badge */}
      <div className="flex items-center gap-2.5">
        <div className="size-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-[10px]">
          DH
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-zinc-200">DhanHQ Account</span>
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              ID: {funds?.dhanClientId || '1114824544'}
            </span>
          </div>
          <span className="text-[10px] text-zinc-400">Zero-Brokerage & Live Trading Ready</span>
        </div>
      </div>

      {/* Financials: Available Balance & Today's Live PnL */}
      <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs">
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-400 font-sans">Available Cash</span>
          <span className="font-bold text-emerald-400">
            ₹{funds?.availabelBalance !== undefined ? funds.availabelBalance.toFixed(2) : '720.02'}
          </span>
        </div>

        {/* Live Fluctuating Today's PnL */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-400 font-sans">Today's PnL</span>
            <span className={cn('size-1.5 rounded-full', isProfit ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-pulse')} />
          </div>
          <span className={cn('font-bold', isProfit ? 'text-emerald-400' : 'text-rose-400')}>
            {isProfit ? '+' : ''}₹{liveDayPnl.toFixed(2)}
          </span>
        </div>

        <div className="hidden sm:flex flex-col">
          <span className="text-[10px] text-zinc-400 font-sans">Withdrawable</span>
          <span className="text-zinc-300">
            ₹{funds?.withdrawableBalance !== undefined ? funds.withdrawableBalance.toFixed(2) : '720.02'}
          </span>
        </div>
      </div>

      {/* Actions: Kill Switch & Token Management */}
      <div className="flex items-center gap-2">
        {snapshot.isTokenExpired ? (
          <button
            type="button"
            onClick={handleUpdateToken}
            className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-sans font-medium flex items-center gap-1 cursor-pointer hover:bg-amber-500/30 transition-all animate-pulse"
            title="Dhan token expired (DH-901). Click to renew today's access token."
          >
            <span>⚠️ Renew Dhan Token</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleUpdateToken}
            className="px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[11px] font-sans font-medium transition-colors cursor-pointer"
            title="Update daily DhanHQ Access Token"
          >
            Token
          </button>
        )}
        <button
          type="button"
          onClick={handleKillSwitch}
          disabled={actionLoading || killSwitchActive}
          className={cn(
            'px-2.5 py-1 rounded border text-[11px] font-sans font-medium transition-colors cursor-pointer',
            killSwitchActive
              ? 'bg-rose-950/60 text-rose-300 border-rose-800'
              : 'bg-zinc-800/80 hover:bg-rose-950/40 text-zinc-300 hover:text-rose-300 border-zinc-700 hover:border-rose-800'
          )}
          title="Emergency broker-level kill switch"
        >
          {killSwitchActive ? 'Trading Disabled' : 'Kill Switch'}
        </button>
      </div>
    </div>
  );
}
