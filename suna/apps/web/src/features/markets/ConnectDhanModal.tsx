'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  ShieldCheck,
  Key,
  CheckCircle,
  ArrowRight,
  ArrowsClockwise,
  WarningCircle,
  LockKey,
  X,
  CaretRight,
  User,
  Clock,
  SignOut,
  Lightning,
} from '@phosphor-icons/react';
import { forceDhanSync } from './dhanLiveStore';
import { syncDhanOrders } from '@/features/trading/dhanOrdersSync';
import { syncDhanTradesToJournal } from '@/features/journal/dhanSync';

interface ConnectDhanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DhanAuthStatus {
  connected: boolean;
  clientId?: string;
  name?: string | null;
  expiryTime?: string | null;
  authMethod?: string;
  hasAutoAuthEnv?: boolean;
  hasConsentEnv?: boolean;
  disconnected?: boolean;
  lastAutoLoginError?: string | null;
}

const isDevMode = process.env.NODE_ENV !== 'production';

export default function ConnectDhanModal({ open, onOpenChange }: ConnectDhanModalProps) {
  const [authMode, setAuthMode] = useState<'consent' | 'totp' | 'token'>('consent');
  const [showDetails, setShowDetails] = useState(false);

  // Inputs (no hardcoded fake IDs or mock tokens)
  const [clientId, setClientId] = useState('');
  const [pin, setPin] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [directToken, setDirectToken] = useState('');

  // Server session state
  const [authStatus, setAuthStatus] = useState<DhanAuthStatus | null>(null);
  const [fundsData, setFundsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const segments = ['Options', 'Futures', 'Equities', 'Commodities'];
  const [segmentIndex, setSegmentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSegmentIndex((prev) => (prev + 1) % segments.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [segments.length]);

  const fetchStatusAndDetails = useCallback(async () => {
    try {
      // Purge any legacy client-stored token so server httpOnly cookie is single source of truth
      if (typeof window !== 'undefined') {
        localStorage.removeItem('kortix_dhan_access_token');
        localStorage.removeItem('kortix_dhan_client_id');
      }

      const statusRes = await fetch('/api/dhan/auth/status', { cache: 'no-store' });
      const statusData: DhanAuthStatus = await statusRes.json().catch(() => ({ connected: false }));
      setAuthStatus(statusData);

      if (statusData.connected) {
        if (statusData.clientId && !clientId) {
          setClientId(statusData.clientId);
        }
        const fundsRes = await fetch('/api/dhan?action=funds', { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => null);
        if (fundsRes?.ok && fundsRes?.data) {
          setFundsData(fundsRes.data);
        } else {
          setFundsData(null);
        }
      } else {
        setFundsData(null);
      }
    } catch {
      setAuthStatus({ connected: false });
    }
  }, [clientId]);

  useEffect(() => {
    if (!open) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const dhanParam = params.get('dhan');
      if (dhanParam === 'connected') {
        setShowDetails(true);
        setSuccessMessage('Connected to DhanHQ via official browser login!');
      } else if (dhanParam === 'missing_app_config') {
        setShowDetails(false);
        setErrorMessage(
          'Consent login requires DHAN_APP_ID and DHAN_APP_SECRET in .env.local (create an API key on web.dhan.co with callback http://localhost:3000/api/dhan/auth/callback), or use PIN + TOTP below.'
        );
        if (authMode === 'consent') setAuthMode('totp');
      } else if (dhanParam === 'missing_client_id') {
        setShowDetails(false);
        setErrorMessage('Enter your Dhan Client ID to start Consent login.');
      } else if (dhanParam === 'consent_failed' || dhanParam === 'error') {
        setShowDetails(false);
        setErrorMessage('Dhan login did not complete. Please try again or use PIN + TOTP.');
      } else {
        setShowDetails(false);
      }
    }

    fetchStatusAndDetails();
  }, [open, fetchStatusAndDetails]);

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanId = clientId.trim();
    const cleanPin = pin.trim();
    const cleanTotp = totpCode.trim();

    if (!cleanId || !cleanPin || !cleanTotp) {
      setErrorMessage('Enter your Dhan Client ID, PIN, and 6-digit Authenticator TOTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/dhan/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: cleanId, pin: cleanPin, totp: cleanTotp }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.ok) {
        setPin('');
        setTotpCode('');
        window.dispatchEvent(new CustomEvent('dhan-token-updated'));
        forceDhanSync();
        syncDhanOrders(true).catch(() => {});
        syncDhanTradesToJournal(undefined, true).catch(() => {});

        await fetchStatusAndDetails();
        setShowDetails(true);
        setSuccessMessage(`Connected live as Client ID ${data.clientId}!`);
      } else {
        setErrorMessage(data?.error || 'Login failed. Verify Client ID, PIN, and TOTP code.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error while authenticating with DhanHQ.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoConnectEnv = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const res = await fetch('/api/dhan/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useEnv: true }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.ok) {
        window.dispatchEvent(new CustomEvent('dhan-token-updated'));
        forceDhanSync();
        syncDhanOrders(true).catch(() => {});
        syncDhanTradesToJournal(undefined, true).catch(() => {});

        await fetchStatusAndDetails();
        setShowDetails(true);
        setSuccessMessage(`Zero-touch TOTP login active for Client ID ${data.clientId}!`);
      } else {
        setErrorMessage(data?.error || 'Auto-login failed. Verify .env.local credentials & system clock.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to connect with local credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyManualToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const token = directToken.trim();
    if (!token) {
      setErrorMessage('Paste a valid 24h DhanHQ Access Token.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/dhan/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, clientId: clientId.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.ok) {
        setDirectToken('');
        window.dispatchEvent(new CustomEvent('dhan-token-updated'));
        forceDhanSync();
        syncDhanOrders(true).catch(() => {});
        syncDhanTradesToJournal(undefined, true).catch(() => {});

        await fetchStatusAndDetails();
        setShowDetails(true);
        setSuccessMessage(`Verified token for Client ID ${data.clientId}!`);
      } else {
        setErrorMessage(data?.error || 'DhanHQ rejected this token.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to verify access token.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await fetch('/api/dhan/auth/status', { method: 'DELETE' });
      setFundsData(null);
      setShowDetails(false);
      await fetchStatusAndDetails();
      window.dispatchEvent(new CustomEvent('dhan-token-updated'));
      forceDhanSync();
    } finally {
      setLoading(false);
    }
  };

  const returnPath =
    typeof window !== 'undefined'
      ? `${window.location.pathname}`
      : '/projects/trading/admin/connectors';

  const consentStartHref = `/api/dhan/auth/start?returnTo=${encodeURIComponent(returnPath)}${
    clientId.trim() ? `&clientId=${encodeURIComponent(clientId.trim())}` : ''
  }`;

  const isConnected = Boolean(authStatus?.connected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-4xl w-[94vw] p-0 overflow-hidden bg-[#070B13] border border-zinc-800/90 text-zinc-100 shadow-2xl rounded-2xl md:rounded-3xl"
      >
        {/* Close Button top-right */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-50 rounded-full p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[520px]">
          {/* LEFT COLUMN: Official Dhan Brand Intro */}
          <div className="relative p-8 md:p-10 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0A101D] via-[#070B13] to-[#04070D] border-b md:border-b-0 md:border-r border-zinc-800/80">
            <svg
              className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="circuit" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                  <path
                    d="M 0 40 L 40 40 L 50 50 L 80 50 M 40 40 L 40 10 L 30 0"
                    fill="none"
                    stroke="#00D09C"
                    strokeWidth="1"
                  />
                  <circle cx="50" cy="50" r="2.5" fill="#00D09C" />
                  <circle cx="40" cy="10" r="2.5" fill="#00D09C" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#circuit)" />
            </svg>

            <div className="absolute top-1/4 -left-20 size-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            {/* Top Brand Bar */}
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logos/dhan.svg"
                  alt="Dhan"
                  className="size-9 rounded-xl object-contain shadow-lg shadow-emerald-500/20 shrink-0"
                />
                <span className="text-white font-bold text-xl tracking-tight">dhan</span>
              </div>

              <span className="text-zinc-600 font-light text-lg">|</span>

              <div className="flex items-center gap-2 text-white">
                <span className="font-semibold text-sm text-zinc-300 tracking-tight">DhanHQ v2 Live</span>
              </div>
            </div>

            {/* Middle */}
            <div className="relative z-10 my-10 space-y-4">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Welcome Super Trader
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Real-time encrypted connection to your Dhan account.<br />
                Session tokens stay server-side in HTTP-only cookies.
              </p>

              <div className="pt-3 text-sm font-medium text-zinc-300 flex items-center gap-1.5 flex-wrap">
                <span>Trading &amp; Investing in</span>
                <span className="text-[#00D09C] font-bold text-base transition-all duration-300">
                  {segments[segmentIndex]}
                </span>
              </div>
            </div>

            {/* Bottom */}
            <div className="relative z-10 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
              <span>Enable API &amp; TOTP under My Profile</span>
              <a
                href="https://web.dhan.co"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-0.5 border border-amber-500/40 hover:border-amber-400 px-2 py-0.5 rounded transition-colors"
              >
                <span>web.dhan.co</span>
                <CaretRight className="size-3" />
              </a>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="relative p-6 sm:p-8 flex flex-col justify-center bg-[#070B13] md:bg-zinc-950/40">
            {isConnected && showDetails ? (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="size-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
                    <CheckCircle className="size-8" />
                  </div>
                  <h2 className="text-lg font-bold text-white">DhanHQ Connected &amp; Live</h2>
                  <p className="text-xs text-zinc-400">
                    {authStatus?.name ? `${authStatus.name} · ` : ''}
                    Authenticated via {authStatus?.authMethod === 'consent' ? 'Consent OAuth' : authStatus?.authMethod === 'auto' ? 'Zero-Touch TOTP' : authStatus?.authMethod === 'totp' ? 'PIN + TOTP' : 'Access Token'}
                  </p>
                </div>

                {successMessage && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs text-center">
                    {successMessage}
                  </div>
                )}

                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-zinc-400 font-sans text-[11px]">Client ID</span>
                    <span className="font-bold text-white">{authStatus?.clientId}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-zinc-400 font-sans text-[11px]">Available Cash</span>
                    <span className="font-bold text-emerald-400">
                      {fundsData?.availabelBalance != null
                        ? `₹${Number(fundsData.availabelBalance).toFixed(2)}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-zinc-400 font-sans text-[11px]">Margin Utilized</span>
                    <span className="font-bold text-zinc-300">
                      {fundsData?.utilizedAmount != null
                        ? `₹${Number(fundsData.utilizedAmount).toFixed(2)}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-sans text-[11px] flex items-center gap-1">
                      <Clock className="size-3.5" />
                      Token Validity (24h)
                    </span>
                    <span className="text-amber-300/90 font-medium text-[11px]">
                      {authStatus?.expiryTime || 'Valid up to 24h'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={fetchStatusAndDetails}
                    className="flex-1 py-2 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowsClockwise className="size-3.5" />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDetails(false)}
                    className="py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Re-login
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="py-2 px-3 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/50 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <SignOut className="size-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-sm mx-auto bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-6 shadow-xl space-y-5">
                {isConnected && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                      <CheckCircle className="size-3.5" />
                      <span>Active: {authStatus?.clientId}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDetails(true)}
                      className="text-[11px] text-zinc-300 hover:text-white underline cursor-pointer"
                    >
                      View Balance &rarr;
                    </button>
                  </div>
                )}

                {/* Header */}
                <div className="flex flex-col items-center text-center space-y-1.5">
                  <img
                    src="/logos/dhan.svg"
                    alt="Dhan"
                    className="size-11 rounded-xl object-contain shadow-md"
                  />
                  <h2 className="text-lg font-bold text-white tracking-tight">Connect DhanHQ Account</h2>
                  <p className="text-[11px] text-zinc-400">
                    24-hour encrypted session via official DhanHQ v2
                  </p>
                </div>

                {/* Auth Mode Switcher: Consent OAuth vs PIN+TOTP */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('consent');
                      setErrorMessage(null);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      authMode === 'consent'
                        ? 'bg-zinc-800 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Browser Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('totp');
                      setErrorMessage(null);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      authMode === 'totp'
                        ? 'bg-zinc-800 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    PIN + TOTP
                  </button>
                </div>

                {/* VIEW 1: Official Dhan Consent OAuth Flow */}
                {authMode === 'consent' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Dhan Client ID
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          placeholder="Enter 10-digit Dhan Client ID"
                          className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 pr-10 font-mono"
                        />
                        <User className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
                      </div>
                    </div>

                    {!authStatus?.hasConsentEnv && (
                      <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-600/30 text-[11px] text-amber-300/90 leading-relaxed">
                        Consent browser login uses <code className="font-mono">DHAN_APP_ID</code> &amp;{' '}
                        <code className="font-mono">DHAN_APP_SECRET</code> from{' '}
                        <code className="font-mono">.env.local</code> (create API key in web.dhan.co with
                        redirect URL <code className="font-mono">http://localhost:3000/api/dhan/auth/callback</code>),
                        or switch to <strong>PIN + TOTP</strong>.
                      </div>
                    )}

                    {errorMessage && (
                      <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2">
                        <WarningCircle className="size-4 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <a
                      href={consentStartHref}
                      className="w-full bg-[#00D09C] hover:bg-emerald-500 text-zinc-950 font-bold text-xs py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="size-4" />
                      <span>Connect with Dhan</span>
                      <ArrowRight className="size-3.5" />
                    </a>

                    {authStatus?.hasAutoAuthEnv && (
                      <button
                        type="button"
                        onClick={handleAutoConnectEnv}
                        disabled={loading}
                        className="w-full py-2 px-3 rounded-xl bg-zinc-800/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Lightning className="size-3.5 text-emerald-400" />
                        <span>
                          {loading ? 'Connecting...' : 'One-Click Connect via .env.local TOTP'}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* VIEW 2: PIN + TOTP Flow */}
                {authMode === 'totp' && (
                  <div className="space-y-3.5">
                    {authStatus?.hasAutoAuthEnv && (
                      <button
                        type="button"
                        onClick={handleAutoConnectEnv}
                        disabled={loading}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Lightning className="size-3.5" />
                        <span>
                          {loading ? 'Authenticating...' : 'Use Configured .env.local TOTP (Zero-Touch)'}
                        </span>
                      </button>
                    )}

                    <form onSubmit={handleTotpSubmit} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Dhan Client ID
                        </label>
                        <input
                          type="text"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          placeholder="10-digit Dhan Client ID"
                          className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-medium text-zinc-300 mb-1">
                            Dhan PIN
                          </label>
                          <div className="relative">
                            <input
                              type="password"
                              value={pin}
                              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                              placeholder="6-digit PIN"
                              className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 font-mono pr-8"
                            />
                            <LockKey className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-zinc-300 mb-1">
                            6-Digit TOTP
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={totpCode}
                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-bold tracking-[0.25em] text-center text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>

                      {errorMessage && (
                        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
                          {errorMessage}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading || !clientId.trim() || !pin.trim() || totpCode.length !== 6}
                        className="w-full bg-[#00D09C] hover:bg-emerald-500 text-zinc-950 font-bold text-xs py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <ArrowsClockwise className="size-4 animate-spin" />
                            <span>Verifying with DhanHQ...</span>
                          </>
                        ) : (
                          <span>Verify &amp; Connect</span>
                        )}
                      </button>
                    </form>
                  </div>
                )}

                {/* VIEW 3: Dev-only 24h Token Paste */}
                {authMode === 'token' && isDevMode && (
                  <form onSubmit={handleVerifyManualToken} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-300">
                        Paste 24h DhanHQ Token (Dev Only)
                      </label>
                      <a
                        href="https://web.dhan.co"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-emerald-400 hover:underline"
                      >
                        web.dhan.co &rarr;
                      </a>
                    </div>

                    <textarea
                      value={directToken}
                      onChange={(e) => setDirectToken(e.target.value)}
                      placeholder="Validated live against /v2/profile before saving..."
                      rows={3}
                      className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl p-3 text-[11px] font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />

                    {errorMessage && (
                      <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
                        {errorMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !directToken.trim()}
                      className="w-full bg-[#00D09C] hover:bg-emerald-500 text-zinc-950 font-bold text-xs py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Key className="size-4" />
                      <span>{loading ? 'Verifying...' : 'Verify & Seal Session'}</span>
                    </button>
                  </form>
                )}

                {isDevMode && (
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                    {authMode === 'token' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('consent');
                          setErrorMessage(null);
                        }}
                        className="hover:text-zinc-300 hover:underline cursor-pointer"
                      >
                        &larr; Back to Login
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('token');
                          setErrorMessage(null);
                        }}
                        className="hover:text-zinc-300 hover:underline cursor-pointer"
                      >
                        Dev: Paste 24h Token
                      </button>
                    )}
                    <span className="font-mono text-[10px]">httpOnly AES-GCM</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
