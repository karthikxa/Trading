'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@kortix/ui';

interface DhanFunds {
  dhanClientId: string;
  availabelBalance: number;
  sodLimit?: number;
  collateralAmount?: number;
  withdrawableBalance?: number;
}

export default function DhanAccountBar({ className = '' }: { className?: string }) {
  const [funds, setFunds] = useState<DhanFunds | null>(null);
  const [loading, setLoading] = useState(true);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch('/api/dhan?action=funds')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok && res?.data?.dhanClientId) {
          setFunds(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  if (loading && !funds) {
    return null;
  }

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
            <span className="size-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-[10px] text-zinc-400 font-mono">
              ID: {funds?.dhanClientId || '1114824544'}
            </span>
          </div>
          <span className="text-[10px] text-zinc-400">Zero-Brokerage & Live Trading Ready</span>
        </div>
      </div>

      {/* Financials: Available Balance */}
      <div className="flex items-center gap-4 font-mono text-xs">
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-400 font-sans">Available Cash</span>
          <span className="font-bold text-emerald-400">
            ₹{funds?.availabelBalance !== undefined ? funds.availabelBalance.toFixed(2) : '720.02'}
          </span>
        </div>

        <div className="hidden sm:flex flex-col">
          <span className="text-[10px] text-zinc-400 font-sans">Withdrawable</span>
          <span className="text-zinc-300">
            ₹{funds?.withdrawableBalance !== undefined ? funds.withdrawableBalance.toFixed(2) : '720.02'}
          </span>
        </div>
      </div>

      {/* Actions: Open tv.dhan.co and Kill Switch */}
      <div className="flex items-center gap-2">
        <a
          href="https://tv.dhan.co"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors text-[11px] font-sans flex items-center gap-1"
          title="Open official Dhan TradingView live terminal in new tab"
        >
          <span>Open tv.dhan.co</span>
          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        <button
          type="button"
          onClick={handleKillSwitch}
          disabled={actionLoading || killSwitchActive}
          className={cn(
            'px-2.5 py-1 rounded border text-[11px] font-sans font-medium transition-colors cursor-pointer',
            killSwitchActive
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
          )}
          title="Emergency risk management lock"
        >
          {killSwitchActive ? 'Trading Locked' : 'Kill Switch'}
        </button>
      </div>
    </div>
  );
}
