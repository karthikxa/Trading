'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@kortix/ui';
import {
  ShieldCheck,
  QrCode,
  Key,
  CheckCircle,
  ArrowRight,
  ArrowsClockwise,
  WarningCircle,
  DeviceMobile,
  LockKey,
} from '@phosphor-icons/react';
import { forceDhanSync } from './dhanLiveStore';
import { syncDhanOrders } from '@/features/trading/dhanOrdersSync';
import { syncDhanTradesToJournal } from '@/features/journal/dhanSync';

interface ConnectDhanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ConnectDhanModal({ open, onOpenChange }: ConnectDhanModalProps) {
  const [activeTab, setActiveTab] = useState<'otp' | 'qr' | 'token'>('otp');

  // Form states
  const [clientId, setClientId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kortix_dhan_client_id') || '1114824544';
    }
    return '1114824544';
  });
  const [pin, setPin] = useState('221007');
  const [otpCode, setOtpCode] = useState('');
  const [directToken, setDirectToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kortix_dhan_access_token') || '';
    }
    return '';
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Submit OTP / Authenticator Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanOtp = otpCode.trim();
    if (!cleanOtp) {
      setErrorMessage('Please enter the 6-digit OTP / TOTP code from your Authenticator app.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/dhan?action=verify_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId.trim(),
          pin: pin.trim(),
          totp: cleanOtp,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.accessToken) {
        // Save to browser
        localStorage.setItem('kortix_dhan_access_token', data.accessToken);
        localStorage.setItem('kortix_dhan_client_id', clientId.trim());

        // Notify app
        window.dispatchEvent(new CustomEvent('dhan-token-updated'));
        forceDhanSync();
        syncDhanOrders(true).catch(() => {});
        syncDhanTradesToJournal(undefined, true).catch(() => {});

        setSuccessMessage(`Connected successfully as ${data.clientName || 'Trader'} (${clientId})! Real Dhan data is now active.`);
        setTimeout(() => {
          onOpenChange(false);
        }, 1200);
      } else {
        setErrorMessage(data?.error || 'Invalid OTP/TOTP or PIN. Please check the code showing in your authenticator app.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error while contacting DhanHQ auth service.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Direct Access Token Save
  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const token = directToken.trim();
    if (!token) {
      setErrorMessage('Please paste a valid Dhan Access Token.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/dhan?action=save_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        localStorage.setItem('kortix_dhan_access_token', token);
        localStorage.setItem('kortix_dhan_client_id', clientId.trim());
        window.dispatchEvent(new CustomEvent('dhan-token-updated'));
        forceDhanSync();
        syncDhanOrders(true).catch(() => {});
        syncDhanTradesToJournal(undefined, true).catch(() => {});

        setSuccessMessage('DhanHQ Access Token saved! Live real-time sync connected.');
        setTimeout(() => {
          onOpenChange(false);
        }, 1200);
      } else {
        setErrorMessage('Failed to register token with server.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl rounded-2xl">
        {/* Header with Dhan Branding */}
        <div className="relative p-6 pb-4 bg-gradient-to-b from-emerald-950/40 via-zinc-900 to-zinc-950 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-emerald-500/20 shrink-0">
              DH
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                Connect to DhanHQ
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] px-2 py-0">
                  TradingView Broker
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                Connect your live Dhan account to stream real funds, positions, orders, and PnL with zero simulated data.
              </DialogDescription>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-5 p-1 bg-zinc-900/90 border border-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => { setActiveTab('otp'); setErrorMessage(null); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer',
                activeTab === 'otp'
                  ? 'bg-emerald-500 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              )}
            >
              <ShieldCheck className="size-4 shrink-0" />
              <span>OTP / App Code</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('qr'); setErrorMessage(null); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer',
                activeTab === 'qr'
                  ? 'bg-emerald-500 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              )}
            >
              <QrCode className="size-4 shrink-0" />
              <span>QR Code Scan</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('token'); setErrorMessage(null); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer',
                activeTab === 'token'
                  ? 'bg-emerald-500 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              )}
            >
              <Key className="size-4 shrink-0" />
              <span>Access Token</span>
            </button>
          </div>
        </div>

        {/* Tab 1: OTP / Authenticator Verification */}
        {activeTab === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Dhan Client ID
                </label>
                <Input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono text-xs focus-visible:ring-emerald-500"
                  placeholder="1114824544"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Dhan 6-Digit PIN
                </label>
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono text-xs focus-visible:ring-emerald-500"
                  placeholder="221007"
                  maxLength={6}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1 flex items-center justify-between">
                <span>Enter 6-Digit OTP / Authenticator Code</span>
                <span className="text-[10px] text-emerald-400 font-normal flex items-center gap-1">
                  <DeviceMobile className="size-3" />
                  From Google Authenticator / Dhan App
                </span>
              </label>
              <Input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="bg-zinc-900/90 border-emerald-500/50 text-emerald-400 font-mono text-lg tracking-[0.35em] text-center font-bold h-11 focus-visible:ring-emerald-500"
                placeholder="••••••"
                maxLength={6}
                autoFocus
                required
              />
              <p className="text-[11px] text-zinc-400 mt-1.5 flex items-center gap-1">
                <LockKey className="size-3 text-zinc-400 shrink-0" />
                Valid for 30 seconds. Generates official 24-hr JWT Access Token directly from DhanHQ.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2">
                <WarningCircle className="size-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="size-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || otpCode.length < 4}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <ArrowsClockwise className="size-4 animate-spin" />
                  <span>Verifying with DhanHQ...</span>
                </>
              ) : (
                <>
                  <span>Verify & Connect Live to Dhan</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* Tab 2: QR Code Scan Instructions */}
        {activeTab === 'qr' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl">
              {/* Dynamic QR Code representation */}
              <div className="relative size-36 bg-white p-2 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                <div className="w-full h-full border-2 border-dashed border-zinc-400 rounded-lg flex flex-col items-center justify-center text-zinc-800 text-center p-2">
                  <div className="size-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs mb-1">
                    DH
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">Scan via</span>
                  <span className="text-[9px] text-zinc-500">Dhan Mobile App</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2 text-xs text-zinc-300">
                <div className="font-semibold text-white">How to connect with QR Scan:</div>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px] leading-relaxed">
                  <li>Open the <strong className="text-zinc-200">Dhan App</strong> on your smartphone.</li>
                  <li>Tap your <strong className="text-zinc-200">Profile Icon</strong> at the top left.</li>
                  <li>Select <strong className="text-zinc-200">Login to Desktop Web</strong> (QR Scanner).</li>
                  <li>Or open the official Dhan Web authentication portal below:</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={() => window.open('https://web.dhan.co', '_blank')}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs py-2 rounded-lg transition-colors border border-zinc-700 flex items-center justify-center gap-2"
              >
                <span>Open Dhan Web Login</span>
                <ArrowRight className="size-3.5" />
              </Button>
              <Button
                type="button"
                onClick={() => {
                  forceDhanSync();
                  syncDhanOrders(true);
                  syncDhanTradesToJournal(undefined, true);
                  onOpenChange(false);
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs py-2 rounded-lg font-semibold transition-colors"
              >
                Done Scanning
              </Button>
            </div>
          </div>
        )}

        {/* Tab 3: Direct Token Paste */}
        {activeTab === 'token' && (
          <form onSubmit={handleSaveToken} className="p-6 space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1 flex items-center justify-between">
                <span>DhanHQ Access Token (24h or 30-day)</span>
                <a
                  href="https://web.dhan.co"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Generate at web.dhan.co &rarr;
                </a>
              </label>
              <textarea
                value={directToken}
                onChange={(e) => setDirectToken(e.target.value)}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 break-all resize-none"
                placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9..."
                required
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                Found under: <strong>web.dhan.co</strong> &gt; Profile &gt; <strong>Access DhanHQ APIs</strong> &gt; Generate Access Token.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <WarningCircle className="size-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="size-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !directToken.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <ArrowsClockwise className="size-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>Save Token & Connect Live</span>
                  <CheckCircle className="size-4" />
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
