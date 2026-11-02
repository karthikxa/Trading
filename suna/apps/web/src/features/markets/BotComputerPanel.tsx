'use client';

import React, { useState } from 'react';
import {
  Settings,
  X,
  ExternalLink,
  Moon,
  Sun,
  CalendarClock,
  Plus,
  Play,
  Check,
  Terminal,
  Folder,
  Music,
  Globe,
  Code,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@kortix/ui';

interface BotComputerPanelProps {
  adminAgentName?: string;
  onClose?: () => void;
  className?: string;
}

export default function BotComputerPanel({
  adminAgentName = 'Atlas',
  onClose,
  className = '',
}: BotComputerPanelProps) {
  const [runsOn, setRunsOn] = useState<'cloud' | 'local' | 'off'>('cloud');
  const [isAsleep, setIsAsleep] = useState(false);
  const [showLiveDesktopModal, setShowLiveDesktopModal] = useState(false);
  const [activeDesktopApp, setActiveDesktopApp] = useState<string | null>(null);

  return (
    <aside
      className={cn(
        'relative z-20 flex h-full w-[380px] shrink-0 flex-col border-l border-zinc-200 bg-white font-sans select-none overflow-hidden shadow-xs',
        className,
      )}
    >
      {/* 1. Header (Image 4 style: Settings on left, Computer in center, X on right) */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 bg-white shrink-0">
        <button
          type="button"
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          title="Computer Settings"
        >
          <Settings className="size-4" />
        </button>

        <h3 className="font-bold text-sm text-zinc-950 tracking-tight">Computer</h3>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          title="Close Computer"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Scrollable Content in Clean White Theme */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 [scrollbar-width:thin]">
        {/* Screen Title */}
        <div>
          <p className="text-xs font-medium text-zinc-500">{adminAgentName}&apos;s screen</p>
        </div>

        {/* 2. Desktop Screen Preview Card (Exact Image 4 layout with wallpaper & icons) */}
        <div
          onClick={() => setShowLiveDesktopModal(true)}
          className="group relative aspect-video w-full rounded-2xl border border-zinc-200/90 overflow-hidden shadow-xs bg-slate-900 cursor-pointer transition-all hover:border-zinc-300"
        >
          {isAsleep ? (
            /* Sleeping State */
            <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-2">
              <Moon className="size-6 text-zinc-500 animate-pulse" />
              <span className="text-xs font-medium">Computer is asleep</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAsleep(false);
                }}
                className="mt-1 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-semibold"
              >
                Wake Up
              </button>
            </div>
          ) : (
            /* Live Nature Wallpaper & Desktop Icons */
            <div className="absolute inset-0 bg-cover bg-center" style={{
              backgroundImage: `radial-gradient(circle at 60% 30%, #38bdf8 0%, #0369a1 40%, #0f172a 100%)`,
            }}>
              {/* Wallpaper Scenic Landscape Simulation */}
              <svg className="absolute inset-0 w-full h-full object-cover opacity-60" viewBox="0 0 400 225" preserveAspectRatio="none">
                <path d="M0,170 Q100,120 200,150 T400,130 L400,225 L0,225 Z" fill="#1e293b" />
                <path d="M0,185 Q140,140 280,175 T400,165 L400,225 L0,225 Z" fill="#0f172a" />
                {/* Simulated Bird on Rock (Image 4 exact reference homage) */}
                <circle cx="210" cy="115" r="5" fill="#e2e8f0" opacity="0.9" />
                <path d="M 215 116 L 222 118 L 215 120 Z" fill="#f59e0b" />
                <ellipse cx="208" cy="125" rx="7" ry="11" fill="#cbd5e1" opacity="0.9" />
              </svg>

              {/* Desktop Icons column on the left */}
              <div className="absolute top-2.5 left-2.5 flex flex-col gap-2.5 z-10">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDesktopApp('Files');
                    setShowLiveDesktopModal(true);
                  }}
                  className="flex flex-col items-center gap-0.5 group/icon cursor-pointer"
                >
                  <div className="size-5.5 rounded bg-blue-500/90 text-white flex items-center justify-center shadow-xs">
                    <Folder className="size-3.5 fill-white/20" />
                  </div>
                  <span className="text-[8.5px] text-white/90 font-medium drop-shadow-xs">Files</span>
                </div>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDesktopApp('Spotify');
                    setShowLiveDesktopModal(true);
                  }}
                  className="flex flex-col items-center gap-0.5 group/icon cursor-pointer"
                >
                  <div className="size-5.5 rounded bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Music className="size-3.5" />
                  </div>
                  <span className="text-[8.5px] text-white/90 font-medium drop-shadow-xs">Spotify</span>
                </div>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDesktopApp('Chrome');
                    setShowLiveDesktopModal(true);
                  }}
                  className="flex flex-col items-center gap-0.5 group/icon cursor-pointer"
                >
                  <div className="size-5.5 rounded bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Globe className="size-3.5" />
                  </div>
                  <span className="text-[8.5px] text-white/90 font-medium drop-shadow-xs">Chrome</span>
                </div>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDesktopApp('Terminal');
                    setShowLiveDesktopModal(true);
                  }}
                  className="flex flex-col items-center gap-0.5 group/icon cursor-pointer"
                >
                  <div className="size-5.5 rounded bg-zinc-900 text-white flex items-center justify-center shadow-xs border border-zinc-700">
                    <Terminal className="size-3" />
                  </div>
                  <span className="text-[8.5px] text-white/90 font-medium drop-shadow-xs">Terminal</span>
                </div>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDesktopApp('Code');
                    setShowLiveDesktopModal(true);
                  }}
                  className="flex flex-col items-center gap-0.5 group/icon cursor-pointer"
                >
                  <div className="size-5.5 rounded bg-sky-600 text-white flex items-center justify-center shadow-xs">
                    <Code className="size-3.5" />
                  </div>
                  <span className="text-[8.5px] text-white/90 font-medium drop-shadow-xs">Code</span>
                </div>
              </div>

              {/* Bottom Taskbar */}
              <div className="absolute inset-x-0 bottom-0 h-4.5 bg-black/45 backdrop-blur-xs flex items-center justify-between px-2 text-[9px] text-white/80">
                <span className="font-bold tracking-widest text-[10px]">⸬</span>
                <span className="font-mono">20:53</span>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="px-3 py-1.5 rounded-xl bg-white/90 text-zinc-950 text-xs font-semibold shadow-md flex items-center gap-1.5 backdrop-blur-xs">
                  <ExternalLink className="size-3.5" />
                  <span>Open live desktop</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Action Buttons (Open desktop & Sleep) */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowLiveDesktopModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <ExternalLink className="size-3.5 text-zinc-600" />
            <span>Open desktop</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAsleep((prev) => !prev)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold shadow-2xs transition-colors cursor-pointer',
              isAsleep
                ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800',
            )}
          >
            {isAsleep ? (
              <>
                <Sun className="size-3.5 text-amber-600" />
                <span>Wake</span>
              </>
            ) : (
              <>
                <Moon className="size-3.5 text-zinc-600" />
                <span>Sleep</span>
              </>
            )}
          </button>
        </div>

        {/* 4. Section: Runs on (Image 4 Segmented Control in White Theme) */}
        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-4 space-y-3">
          <div>
            <h4 className="font-bold text-xs text-zinc-950">Runs on</h4>
            <p className="text-[11.5px] text-zinc-500 mt-0.5">Pick where this bot&apos;s computer lives.</p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-200/70">
            <button
              type="button"
              onClick={() => setRunsOn('cloud')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center',
                runsOn === 'cloud'
                  ? 'bg-white text-zinc-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950',
              )}
            >
              Cloud box
            </button>

            <button
              type="button"
              onClick={() => setRunsOn('local')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center',
                runsOn === 'local'
                  ? 'bg-white text-zinc-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950',
              )}
            >
              This Mac
            </button>

            <button
              type="button"
              onClick={() => setRunsOn('off')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center',
                runsOn === 'off'
                  ? 'bg-white text-zinc-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950',
              )}
            >
              Off
            </button>
          </div>
        </div>

        {/* 5. Section: Routines (Image 4 Routines in White Theme) */}
        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-4 space-y-3">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-950">
              <CalendarClock className="size-4 text-zinc-700" />
              <span>Routines</span>
            </div>
            <p className="text-[11.5px] text-zinc-500 mt-0.5">
              Routines are recurring tasks this agent runs on a schedule.
            </p>
          </div>

          <button
            type="button"
            className="w-full py-2.5 rounded-xl border border-zinc-200/90 bg-white hover:bg-zinc-100 text-zinc-700 font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
          >
            Create Routine
          </button>
        </div>
      </div>

      {/* Live Desktop Interactive Modal when clicking "Open desktop" */}
      {showLiveDesktopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col h-[600px]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 bg-zinc-50">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-red-400" />
                <span className="size-3 rounded-full bg-amber-400" />
                <span className="size-3 rounded-full bg-emerald-400" />
                <span className="ml-2 font-bold text-xs text-zinc-900">
                  {adminAgentName}&apos;s Live Desktop — {activeDesktopApp || 'Cloud Workspace'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLiveDesktopModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Live Shell */}
            <div className="flex-1 bg-zinc-950 p-4 font-mono text-xs text-emerald-400 overflow-y-auto space-y-2">
              <p className="text-zinc-400"># MausBot Kernel v2.4 Live Shell connected ({adminAgentName})</p>
              <p className="text-zinc-400"># Memory: 16GB · GPU: NVIDIA H100 PCIe · IP: 10.0.4.18</p>
              <p className="text-emerald-400">$ tauric-swarm status --all</p>
              <p className="text-white">● 12 active agents registered in Trading Swarm</p>
              <p className="text-white">● Portfolio allocation model: balanced hedge (SPY hedge active)</p>
              <p className="text-white">● Real-time data feed: Finnhub + TradingView live stream</p>
              <p className="text-emerald-400">$ _</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
