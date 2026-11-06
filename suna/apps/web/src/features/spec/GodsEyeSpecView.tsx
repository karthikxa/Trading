'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Maximize2,
  Minimize2,
  ExternalLink,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { cn } from '@kortix/ui';

export default function GodsEyeSpecView() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [worldAppUrl, setWorldAppUrl] = useState('http://localhost:3005/?welcome=0');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname || 'localhost';
      setWorldAppUrl(`http://${host}:3005/?welcome=0`);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [refreshKey]);

  const reloadMap = () => {
    setIsLoading(true);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col gap-3.5 w-full h-full max-w-[1920px] mx-auto text-zinc-100">
      {/* ======================================================== */}
      {/* 1. KORTIX TOP BAR                                        */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-inner">
            <Globe className="size-5" />
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-bold tracking-tight text-white font-mono">
              GOD&apos;S EYE VIEW
            </h1>
            <span className="hidden sm:inline-block text-zinc-600">/</span>
            <span className="hidden sm:inline-block text-xs text-zinc-400">
              Spatial Intelligence &amp; 3D Photorealistic World Console
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live 3D Engine
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reloadMap}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
            title="Reset Map & Orbit"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>

          <a
            href={worldAppUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-colors"
            title="Open in new window"
          >
            <ExternalLink className="size-3.5" />
            <span className="hidden md:inline">Popout</span>
          </a>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. FULL IMMERSIVE 3D MAP VIEWPORT                        */}
      {/* ======================================================== */}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#09090b] shadow-2xl transition-all',
          isFullscreen
            ? 'fixed inset-2 z-50 rounded-2xl border-emerald-500/50 shadow-emerald-500/20'
            : 'h-[calc(100vh-140px)] min-h-[640px]',
        )}
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#09090b]/90 backdrop-blur-xs text-zinc-400">
            <Loader2 className="size-8 text-emerald-400 animate-spin" />
            <p className="text-xs font-mono font-medium text-zinc-300 tracking-wide">
              Initializing God&apos;s Eye 3D Satellite Earth &amp; Telemetry...
            </p>
          </div>
        )}

        <iframe
          key={refreshKey}
          src={worldAppUrl}
          onLoad={() => setIsLoading(false)}
          className="size-full border-0 rounded-2xl"
          title="God's Eye View Spatial Intelligence"
          allow="camera; microphone; geolocation; fullscreen; accelerometer; gyroscope"
        />
      </div>
    </div>
  );
}
