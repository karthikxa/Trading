'use client';

import React, { useState, useEffect } from 'react';
import { useTradingAgents, type TradingAgentDef } from '@kortix/ui/workspace/sidebar/trading-agents-nav';
import { BotAvatar, type BotShape, type BotExpression } from '@/features/markets/BotAvatar';
import { Bot, CheckCircle2, Cpu, GitBranch, Play, Save, Sparkles, ArrowRight, ShieldAlert, Sliders, Palette, Smile } from 'lucide-react';
import { cn } from '@kortix/ui';

interface AgentProfileHubProps {
  agentId?: string | null;
  projectId: string;
  onOpenChat: (initialPrompt?: string) => void;
}

const AVAILABLE_SHAPES: { id: BotShape; label: string }[] = [
  { id: 'circle', label: 'Circle' },
  { id: 'pebble', label: 'Pebble' },
  { id: 'squircle', label: 'Squircle' },
  { id: 'capsule', label: 'Capsule' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'hexagon', label: 'Hexagon' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'droplet', label: 'Droplet' },
];

const AVAILABLE_EXPRESSIONS: { id: BotExpression; label: string }[] = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'attentive', label: 'Attentive' },
  { id: 'surprised', label: 'Surprised' },
  { id: 'excited', label: 'Excited' },
  { id: 'happy', label: 'Happy' },
  { id: 'laughing', label: 'Laughing' },
  { id: 'angry', label: 'Angry' },
  { id: 'sad', label: 'Sad' },
  { id: 'scared', label: 'Scared' },
  { id: 'suspicious', label: 'Suspicious' },
  { id: 'confused', label: 'Confused' },
  { id: 'curious', label: 'Curious' },
  { id: 'proud', label: 'Proud' },
  { id: 'shy', label: 'Shy' },
  { id: 'unimpressed', label: 'Unimpressed' },
  { id: 'sleepy', label: 'Sleepy' },
];

const AVAILABLE_COLORS = [
  '#09090B', // Black
  '#795548', // Brown
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Gold
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B', // Slate / Grey
  '#F5F5F4', // Cream / Light
];

export default function AgentProfileHub({ agentId, projectId, onOpenChat }: AgentProfileHubProps) {
  const { data: tradingAgents = [] } = useTradingAgents();
  const currentAgent = tradingAgents.find((a) => a.id === agentId) || tradingAgents[0] || {
    id: 'portfolio_manager',
    name: 'Portfolio Manager',
    role: 'Capital Allocation & Swarm Lead',
    group: 'Execution' as const,
    shape: 'circle' as BotShape,
    color: '#8B5CF6',
    expression: 'attentive' as BotExpression,
    lastAction: 'Directs swarm capital allocation',
    time: 'Active',
    description: 'Lead Portfolio Manager and Workspace Administrator.',
  };

  // Bot Appearance state (customizable like reference image 1 & 2)
  const [shape, setShape] = useState<BotShape>(currentAgent.shape);
  const [color, setColor] = useState<string>(currentAgent.color);
  const [expression, setExpression] = useState<BotExpression>(currentAgent.expression);

  const [activeModel, setActiveModel] = useState('Claude 3.7 Sonnet (Reasoning)');
  const [temperature, setTemperature] = useState(0.2);
  const [customPrompt, setCustomPrompt] = useState(
    `You are the ${currentAgent.name} in the TauricResearch / TradingAgents collaborative multi-agent hedge fund.
Your role: ${currentAgent.role}.
Objective: ${currentAgent.description}
Analyze data with point-in-time integrity, identify non-consensus alpha, debate findings, and output structured conclusions.`
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6 font-sans">
      {/* Header Banner */}
      <section className="hatch">
        <div className="flex flex-col gap-5 p-5 sm:p-7 bg-white rounded-2xl border border-zinc-200/90 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center size-16 rounded-2xl bg-zinc-50 border border-zinc-200/80 shadow-xs">
                <BotAvatar shape={shape} color={color} expression={expression} size={50} />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">
                    {currentAgent.name}
                  </h1>
                  <span className="rounded-md bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-800">
                    {currentAgent.role}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    Synced with TauricResearch/TradingAgents
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1 font-medium max-w-2xl">
                  {currentAgent.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onOpenChat(`[${currentAgent.name}] Start specialized analysis on the current watchlist and market leaders.`)}
                className="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <Play className="size-3.5 fill-white" />
                <span>Run Agent Session</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <Save className="size-3.5 text-zinc-600" />
                <span>{savedSuccess ? 'Saved!' : 'Save Profile'}</span>
              </button>
            </div>
          </div>

          {/* All 12 Agents Quick Bar with Bot Avatars */}
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] pt-1">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider shrink-0 mr-1">All 12 Bots:</span>
            {tradingAgents.map((a) => {
              const isSelected = a.id === currentAgent.id;
              return (
                <a
                  key={a.id}
                  href={`/projects/${projectId}?tab=agent&agentId=${a.id}`}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer border',
                    isSelected
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200/80',
                  )}
                >
                  <BotAvatar shape={a.shape} color={a.color} size={18} expression={a.expression} />
                  <span>{a.name}</span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Configuration Grid */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* Left: Persona, Bot Customizer & Directives */}
        <div className="flex flex-col gap-6">
          {/* Bot Visual Customizer (Shape, Expression, Color from reference image 1 & 2) */}
          <div className="terminal-panel">
            <div className="terminal-panel-head">
              <div className="flex items-center justify-between w-full">
                <div>
                  <h2 className="terminal-panel-title">Bot Visual Identity</h2>
                  <p className="terminal-panel-sub">
                    Customize shape, color palette, and facial expression for this agent
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <BotAvatar shape={shape} color={color} expression={expression} size={36} />
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5 flex flex-col gap-4 bg-white text-xs">
              {/* Shape Selection */}
              <div className="flex flex-col gap-2">
                <span className="font-bold text-zinc-700">Shape</span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {AVAILABLE_SHAPES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setShape(s.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-2 rounded-xl border text-[11px] font-medium transition-all cursor-pointer',
                        shape === s.id
                          ? 'border-zinc-950 bg-zinc-50 text-zinc-950 shadow-xs font-bold'
                          : 'border-zinc-200 text-zinc-500 hover:border-zinc-300',
                      )}
                    >
                      <BotAvatar shape={s.id} color={color} size={24} expression={expression} />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Expression Selection */}
              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100">
                <span className="font-bold text-zinc-700">Expression</span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {AVAILABLE_EXPRESSIONS.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setExpression(e.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-2 rounded-xl border text-[11px] font-medium transition-all cursor-pointer',
                        expression === e.id
                          ? 'border-zinc-950 bg-zinc-50 text-zinc-950 shadow-xs font-bold'
                          : 'border-zinc-200 text-zinc-500 hover:border-zinc-300',
                      )}
                    >
                      <BotAvatar shape={shape} color={color} size={24} expression={e.id} />
                      <span className="truncate max-w-full">{e.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100">
                <span className="font-bold text-zinc-700">Colour Palette</span>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        'size-7 rounded-full transition-transform cursor-pointer border border-black/10',
                        color === c ? 'scale-120 ring-2 ring-zinc-950 ring-offset-2' : 'hover:scale-110',
                      )}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* System Persona & Prompt Directives */}
          <div className="terminal-panel">
            <div className="terminal-panel-head">
              <div>
                <h2 className="terminal-panel-title">Agent Profile & System Persona</h2>
                <p className="terminal-panel-sub">
                  Define specialized trading directives, heuristics, and reasoning style
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-5 flex flex-col gap-4 bg-white">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-700">System Directives & Strategy Logic</label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-zinc-200 p-3.5 text-xs font-mono leading-relaxed text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  placeholder="Enter system prompt and specialized trading logic..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-700">Backbone Reasoning Model</label>
                  <select
                    value={activeModel}
                    onChange={(e) => setActiveModel(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-xs font-semibold text-zinc-900 focus:border-zinc-950 focus:outline-none"
                  >
                    <option>Claude 3.7 Sonnet (Reasoning)</option>
                    <option>GPT-4.5 / GPT-5 preview</option>
                    <option>Gemini 2.5 Pro (Deep Research)</option>
                    <option>DeepSeek R1 (Quant & Logic)</option>
                    <option>Qwen 2.5 72B Financial</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-zinc-700">Sampling Temperature</label>
                    <span className="font-mono font-bold text-zinc-900">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-black mt-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Deterministic (0.0)</span>
                    <span>Creative (1.0)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Collaborative Swarm Pipeline (Grok bot style) */}
        <div className="flex flex-col gap-6">
          <div className="terminal-panel">
            <div className="terminal-panel-head">
              <div>
                <h2 className="terminal-panel-title">Tauric Multi-Agent Collaboration</h2>
                <p className="terminal-panel-sub">
                  All 12 agents working in synchrony across the trading pipeline
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-5 flex flex-col gap-3.5 bg-white text-xs">
              {/* Stage 1: Analysts */}
              <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900">1. Data Ingestion & Analysis</span>
                  <span className="text-[10px] text-zinc-400 font-mono">Stage 1</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                  {tradingAgents.filter(a => a.group === 'Analysts').map(a => (
                    <div
                      key={a.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-xl border transition-all',
                        currentAgent.id === a.id
                          ? 'border-zinc-950 bg-zinc-950 text-white font-bold shadow-xs'
                          : 'border-zinc-200 bg-white text-zinc-800',
                      )}
                    >
                      <BotAvatar shape={a.shape} color={a.color} size={20} expression={a.expression} />
                      <span className="truncate">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center text-zinc-400">
                <ArrowRight className="size-4 rotate-90" />
              </div>

              {/* Stage 2: Researchers & Debate */}
              <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900">2. Bull vs. Bear Structured Debate</span>
                  <span className="text-[10px] text-zinc-400 font-mono">Stage 2</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11.5px]">
                  {tradingAgents.filter(a => a.group === 'Researchers' || a.group === 'Management').map(a => (
                    <div
                      key={a.id}
                      className={cn(
                        'flex items-center gap-1.5 p-2 rounded-xl border transition-all',
                        currentAgent.id === a.id
                          ? 'border-zinc-950 bg-zinc-950 text-white font-bold shadow-xs'
                          : 'border-zinc-200 bg-white text-zinc-800',
                      )}
                    >
                      <BotAvatar shape={a.shape} color={a.color} size={18} expression={a.expression} />
                      <span className="truncate">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center text-zinc-400">
                <ArrowRight className="size-4 rotate-90" />
              </div>

              {/* Stage 3: Risk Management Triad */}
              <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900">3. Risk Management Committee</span>
                  <span className="text-[10px] text-zinc-400 font-mono">Stage 3</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11.5px]">
                  {tradingAgents.filter(a => a.group === 'Risk Management').map(a => (
                    <div
                      key={a.id}
                      className={cn(
                        'flex items-center gap-1.5 p-2 rounded-xl border transition-all',
                        currentAgent.id === a.id
                          ? 'border-zinc-950 bg-zinc-950 text-white font-bold shadow-xs'
                          : 'border-zinc-200 bg-white text-zinc-800',
                      )}
                    >
                      <BotAvatar shape={a.shape} color={a.color} size={18} expression={a.expression} />
                      <span className="truncate">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center text-zinc-400">
                <ArrowRight className="size-4 rotate-90" />
              </div>

              {/* Stage 4: Execution & Allocation */}
              <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900">4. Execution & Final Allocation</span>
                  <span className="text-[10px] text-zinc-400 font-mono">Stage 4</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                  {tradingAgents.filter(a => a.group === 'Execution').map(a => (
                    <div
                      key={a.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-xl border transition-all',
                        currentAgent.id === a.id
                          ? 'border-zinc-950 bg-zinc-950 text-white font-bold shadow-xs'
                          : 'border-zinc-200 bg-white text-zinc-800',
                      )}
                    >
                      <BotAvatar shape={a.shape} color={a.color} size={20} expression={a.expression} />
                      <span className="truncate">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
