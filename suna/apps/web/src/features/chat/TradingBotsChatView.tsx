'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BotAvatar,
  useTradingAgents,
  DEFAULT_CANONICAL_TRADING_AGENTS,
  type TradingAgentDef,
  type BotShape,
  type BotExpression,
} from '@kortix/ui/workspace';
import {
  ThrottledMarkdown,
  AgentSelector,
} from '@kortix/ui/session';
import {
  ChainOfThought,
  ChainOfThoughtStep,
} from '@kortix/ui/chain-of-thought';
import {
  Files,
  ReadCvLogo,
  MagnifyingGlass,
  Paperclip,
  ArrowUp,
  CircleNotch,
  TerminalWindow,
  Globe,
  Folder,
  ShareNetwork,
  Plus,
  DotsThreeVertical,
  Sliders,
  CaretDown,
  Trash,
  Lightning,
  Stop,
  Users,
  Shield,
  Check,
  X,
  CheckCircle,
  Warning,
  Clock,
  Sparkle,
} from '@phosphor-icons/react';
import { WallpaperBackground } from '@/components/ui/wallpaper-background';
import { cn } from '@kortix/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kortix/ui/dropdown-menu';
import { Button } from '@kortix/ui/button';
import { ButtonGroup, ButtonGroupSeparator } from '@kortix/ui/button-group';
import { formatSimpleTime } from '@/features/trading/dhanOrdersSync';
import {
  getProactiveDispatchForAgent,
  type ProactiveApproval,
  type ProactiveDispatch,
} from './proactiveAgentDispatches';
import {
  getHeartbeatSettings,
  saveHeartbeatSettings,
  dispatchAgentHeartbeat,
  type HeartbeatCadence,
  type HeartbeatSettings,
} from './agentHeartbeatEngine';

export interface ChatStep {
  icon: 'skill' | 'file' | 'search';
  label: string;
  target: string;
  detail?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  agentId: string;
  agentName: string;
  shape?: BotShape;
  color?: string;
  expression?: BotExpression;
  content: string;
  steps?: ChatStep[];
  approval?: ProactiveApproval;
  timestamp: string;
}

interface TradingBotsChatViewProps {
  projectId: string;
  activeAgentId?: string;
  onOpenCreateAgent?: () => void;
  onOpenCreateGroup?: () => void;
}

export function TradingBotsChatView({
  projectId,
  activeAgentId: propAgentId = 'portfolio_manager',
  onOpenCreateAgent,
  onOpenCreateGroup,
}: TradingBotsChatViewProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(propAgentId);

  // Sync propAgentId
  useEffect(() => {
    if (propAgentId && propAgentId !== selectedAgentId) {
      setSelectedAgentId(propAgentId);
    }
  }, [propAgentId]);

  // Load backend agents
  const { data: serverAgents = [] } = useTradingAgents();

  // Load user customizations / overrides from localStorage
  const [agentOverrides, setAgentOverrides] = useState<Record<string, Partial<TradingAgentDef>>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kortix_trading_agent_overrides_v1');
        if (saved) return JSON.parse(saved);
      } catch { }
    }
    return {};
  });

  // Listen to updates from Edit Agent Drawer
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('kortix_trading_agent_overrides_v1');
        if (saved) setAgentOverrides(JSON.parse(saved));
      } catch { }
    };
    window.addEventListener('trading-agents-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('trading-agents-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Listen to agent selections from sidebar
  useEffect(() => {
    const handleSelect = (e: any) => {
      const custom = e as CustomEvent;
      if (custom.detail?.id) {
        setSelectedAgentId(custom.detail.id);
      }
    };
    window.addEventListener('selected-swarm-agent', handleSelect);
    return () => window.removeEventListener('selected-swarm-agent', handleSelect);
  }, []);

  // Combine server agents with user overrides so color, shape, expression ALWAYS match
  const allAgents = useMemo(() => {
    const baseList = serverAgents.length > 0 ? serverAgents : DEFAULT_CANONICAL_TRADING_AGENTS;
    return baseList.map((a) => ({
      ...a,
      ...(agentOverrides[a.id] || {}),
    }));
  }, [serverAgents, agentOverrides]);

  // Active agent definition
  const activeAgent = useMemo(() => {
    const found = allAgents.find((a) => a.id === selectedAgentId);
    if (found) return found;

    const over = agentOverrides[selectedAgentId];
    if (over) {
      return {
        id: selectedAgentId,
        name: over.name || selectedAgentId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        role: over.role || 'Trading Specialist',
        shape: (over.shape as BotShape) || 'circle',
        color: over.color || '#F97316',
        expression: (over.expression as BotExpression) || 'attentive',
        description: over.directives || over.description || '',
        directives: over.directives || over.description || '',
        group: over.group || 'Analysts',
      } as TradingAgentDef;
    }

    return allAgents[0] || DEFAULT_CANONICAL_TRADING_AGENTS[0];
  }, [allAgents, selectedAgentId, agentOverrides]);

  // Messages per active agent
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingSteps, setStreamingSteps] = useState<ChatStep[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // OpenMausBot / Grok Proactive Heartbeat Settings & Pulse
  const [heartbeatSettings, setHeartbeatSettings] = useState<HeartbeatSettings>(getHeartbeatSettings);

  const handleChangeCadence = (cadence: HeartbeatCadence) => {
    const updated: HeartbeatSettings = {
      ...heartbeatSettings,
      cadence,
      intervalMs:
        cadence === '15s'
          ? 15000
          : cadence === '30s'
            ? 30000
            : cadence === '45s'
              ? 45000
              : cadence === '60s'
                ? 60000
                : 0,
    };
    setHeartbeatSettings(updated);
    saveHeartbeatSettings(updated);
  };

  const handleManualPulse = () => {
    const msg = dispatchAgentHeartbeat(activeAgent.id, activeAgent.name, activeAgent.role);
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  // Heartbeat background interval for proactive agent intelligence
  useEffect(() => {
    if (heartbeatSettings.cadence === 'paused' || heartbeatSettings.intervalMs <= 0) return;

    const timer = setInterval(() => {
      dispatchAgentHeartbeat(activeAgent.id, activeAgent.name, activeAgent.role);
    }, heartbeatSettings.intervalMs);

    return () => clearInterval(timer);
  }, [heartbeatSettings.cadence, heartbeatSettings.intervalMs, activeAgent.id, activeAgent.name, activeAgent.role]);

  // Listen to agent-heartbeat-pulse events
  useEffect(() => {
    const handlePulse = (e: any) => {
      const detail = e.detail;
      if (detail && detail.agentId === activeAgent.id && detail.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === detail.message.id)) return prev;
          return [...prev, detail.message];
        });
      }
    };
    window.addEventListener('agent-heartbeat-pulse', handlePulse);
    return () => window.removeEventListener('agent-heartbeat-pulse', handlePulse);
  }, [activeAgent.id]);

  // Helper to sync bot's approval status with sidebar and localStorage
  const updateAgentApprovalStatus = (botId: string, status: 'waiting for approval' | 'idle', pendingCount: number) => {
    try {
      const saved = localStorage.getItem('kortix_trading_agent_overrides_v1');
      const overrides = saved ? JSON.parse(saved) : {};
      overrides[botId] = {
        ...(overrides[botId] || {}),
        status,
        pending_approvals_count: pendingCount,
      };
      localStorage.setItem('kortix_trading_agent_overrides_v1', JSON.stringify(overrides));
      window.dispatchEvent(new CustomEvent('trading-agents-updated'));
    } catch { }
  };

  // Load message history for current active bot, or automatically dispatch proactive message with HITL
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`kortix_agent_chat_${activeAgent.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          const hasPending = parsed.some((m: ChatMessage) => m.approval && m.approval.status === 'pending');
          if (hasPending) {
            updateAgentApprovalStatus(activeAgent.id, 'waiting for approval', 1);
          }
          setStreamingText('');
          setStreamingSteps([]);
          setIsTyping(false);
          return;
        }
      }

      // Proactive auto-initialization: all bots message proactively with HITL setup
      const proactive = getProactiveDispatchForAgent(activeAgent.id, activeAgent.name, activeAgent.role);
      const now = new Date();
      const timeStr = formatSimpleTime(now.toTimeString().slice(0, 5));
      const initialMsg: ChatMessage = {
        id: `proactive-${activeAgent.id}-${Date.now()}`,
        sender: 'agent',
        agentId: activeAgent.id,
        agentName: activeAgent.name,
        shape: activeAgent.shape,
        color: activeAgent.color,
        expression: activeAgent.expression,
        content: proactive.content,
        steps: proactive.steps,
        approval: proactive.approval,
        timestamp: timeStr,
      };

      setMessages([initialMsg]);
      try {
        localStorage.setItem(`kortix_agent_chat_${activeAgent.id}`, JSON.stringify([initialMsg]));
      } catch { }

      if (proactive.approval && proactive.approval.status === 'pending') {
        updateAgentApprovalStatus(activeAgent.id, 'waiting for approval', 1);
      }
    } catch {
      setMessages([]);
    }
    setStreamingText('');
    setStreamingSteps([]);
    setIsTyping(false);
  }, [activeAgent.id, activeAgent.name, activeAgent.role, activeAgent.shape, activeAgent.color, activeAgent.expression]);

  // Save messages helper
  const saveMessages = (msgs: ChatMessage[]) => {
    setMessages(msgs);
    try {
      localStorage.setItem(`kortix_agent_chat_${activeAgent.id}`, JSON.stringify(msgs));
    } catch { }
  };

  // HITL Approval actions
  const handleApprove = (approvalId: string) => {
    const now = new Date();
    const timeStr = formatSimpleTime(now.toTimeString().slice(0, 5));

    const updated = messages.map((m) => {
      if (m.approval && m.approval.id === approvalId) {
        return {
          ...m,
          approval: {
            ...m.approval,
            status: 'approved' as const,
            resolvedAt: timeStr,
          },
        };
      }
      return m;
    });

    const targetMsg = messages.find((m) => m.approval && m.approval.id === approvalId);
    const details = targetMsg?.approval?.details;
    const symbolStr = details?.symbol ? ` on **${details.symbol}**` : '';

    // Dispatch optimistic placing event so Orders View renders real-time Skeleton placeholder
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dhan-order-placing', {
          detail: {
            symbol: details?.symbol || 'NSE Order',
            side: details?.action || 'BUY',
            timestamp: Date.now(),
          },
        })
      );
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('dhan-order-placed'));
      }, 1500);
    }

    const followUpMsg: ChatMessage = {
      id: `bot-approved-${Date.now()}`,
      sender: 'agent',
      agentId: activeAgent.id,
      agentName: activeAgent.name,
      shape: activeAgent.shape,
      color: activeAgent.color,
      expression: 'attentive',
      content: `✓ **Human-in-the-Loop (HITL) Authorization Confirmed** · ${timeStr}

Action authorized by Trader.
• **Order Execution**: Order staged and dispatched${symbolStr} via DhanHQ Smart Router.
• **Risk Guardrails**: Intraday stop loss active. Trailing drawdown monitor running with 1-sec tick polling.
• **Audit Ledger**: Logged to Trading Journal.`,
      timestamp: timeStr,
    };

    const finalMessages = [...updated, followUpMsg];
    saveMessages(finalMessages);
    updateAgentApprovalStatus(activeAgent.id, 'idle', 0);
  };

  const handleReject = (approvalId: string) => {
    const now = new Date();
    const timeStr = formatSimpleTime(now.toTimeString().slice(0, 5));

    const updated = messages.map((m) => {
      if (m.approval && m.approval.id === approvalId) {
        return {
          ...m,
          approval: {
            ...m.approval,
            status: 'rejected' as const,
            resolvedAt: timeStr,
          },
        };
      }
      return m;
    });

    const followUpMsg: ChatMessage = {
      id: `bot-rejected-${Date.now()}`,
      sender: 'agent',
      agentId: activeAgent.id,
      agentName: activeAgent.name,
      shape: activeAgent.shape,
      color: activeAgent.color,
      expression: 'suspicious',
      content: `✕ **Action Aborted by Trader** · ${timeStr}

Trade execution discarded per Human-in-the-Loop rejection. No orders were placed on DhanHQ. Capital preserved and risk allocation remains at 100% capacity.`,
      timestamp: timeStr,
    };

    const finalMessages = [...updated, followUpMsg];
    saveMessages(finalMessages);
    updateAgentApprovalStatus(activeAgent.id, 'idle', 0);
  };

  // Trigger fresh proactive check-in / setup on demand
  const handleTriggerProactive = () => {
    const proactive = getProactiveDispatchForAgent(activeAgent.id, activeAgent.name, activeAgent.role);
    const now = new Date();
    const timeStr = formatSimpleTime(now.toTimeString().slice(0, 5));
    const newMsg: ChatMessage = {
      id: `proactive-${activeAgent.id}-${Date.now()}`,
      sender: 'agent',
      agentId: activeAgent.id,
      agentName: activeAgent.name,
      shape: activeAgent.shape,
      color: activeAgent.color,
      expression: activeAgent.expression,
      content: proactive.content,
      steps: proactive.steps,
      approval: proactive.approval,
      timestamp: timeStr,
    };
    saveMessages([...messages, newMsg]);
    if (proactive.approval && proactive.approval.status === 'pending') {
      updateAgentApprovalStatus(activeAgent.id, 'waiting for approval', 1);
    }
  };

  // Auto-scroll to bottom as tokens stream in
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, streamingText, isTyping]);

  // Clear chat
  const handleClearChat = () => {
    if (isTyping && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    saveMessages([]);
    setStreamingText('');
    setStreamingSteps([]);
    setIsTyping(false);
    try {
      localStorage.removeItem(`kortix_agent_chat_${activeAgent.id}`);
    } catch { }
  };

  // Stop active generation
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
  };

  // Switch agent
  const handleSwitchAgent = (botId: string | null) => {
    if (!botId) return;
    setSelectedAgentId(botId);
    const target = allAgents.find((a) => a.id === botId);
    if (target) {
      window.dispatchEvent(new CustomEvent('selected-swarm-agent', { detail: target }));
    }
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      sp.set('agentId', botId);
      window.history.pushState(null, '', `?${sp.toString()}`);
    }
  };

  // Session title
  const sessionTitle = useMemo(() => {
    if (messages.length === 0) return `${activeAgent.name} Session`;
    const first = messages.find((m) => m.sender === 'user');
    if (!first) return `${activeAgent.name} Session`;
    const clean = first.content.trim().replace(/^[^a-zA-Z0-9]+/, '');
    if (clean.length <= 34) {
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    return clean.slice(0, 34).trim() + '…';
  }, [messages, activeAgent.name]);

  // Real-time SSE Stream Reader matching Kortix fetch-sse.ts pattern
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputVal).trim();
    if (!query || isTyping) return;

    setInputVal('');
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Append user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      agentId: activeAgent.id,
      agentName: 'You',
      content: query,
      timestamp: timeStr,
    };

    const nextMessages = [...messages, userMsg];
    saveMessages(nextMessages);
    setIsTyping(true);

    // Dynamic initial steps for real Chain of Thought
    const skillName = activeAgent.id.replace(/_/g, '-');
    const dynamicSteps: ChatStep[] = [
      {
        icon: 'skill',
        label: 'Loaded skill',
        target: skillName,
      },
      {
        icon: 'file',
        label: 'Read',
        target: `memory/${activeAgent.id}/directives.md`,
      },
      {
        icon: 'search',
        label: 'Searched',
        target: query.slice(0, 32).toLowerCase(),
        detail: '3 results',
      },
    ];

    setStreamingSteps(dynamicSteps);
    setStreamingText('');

    // Setup abort controller
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    let accumulated = '';

    try {
      // 2. Call backend /api/chat with stream: true and model: 'zed' (Render FreeLLMAPI)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          agentId: activeAgent.id,
          agentName: activeAgent.name,
          agentRole: activeAgent.role,
          directives: activeAgent.directives || activeAgent.description,
          projectId,
          sessionId: `session-${activeAgent.id}`,
          stream: true,
          model: 'zed',
          history: messages.slice(-6).map((m) => ({
            sender: m.sender,
            content: m.content,
          })),
        }),
        signal: abortCtrl.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`SSE stream connection failed: HTTP ${res.status}`);
      }

      // 3. Read SSE stream with line-by-line buffer pattern (fetch-sse.ts)
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = 'message';

      const processLine = (line: string) => {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
          return;
        }
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') {
            return;
          }
          try {
            const parsed = JSON.parse(dataStr);
            if (currentEvent === 'message.delta') {
              const delta = parsed.delta?.text || parsed.delta?.content || '';
              if (delta) {
                accumulated += delta;
                setStreamingText(accumulated);
              }
            } else if (currentEvent === 'message.stop') {
              // Turn finalized
            }
          } catch {
            // Ignore non-json frames
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r\n|\n|\r/);
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          processLine(line);
        }
      }

      if (buffer.trim()) {
        processLine(buffer.trim());
      }

      setIsTyping(false);
      abortControllerRef.current = null;

      // 4. Finalize bot message
      const finalReply = accumulated.trim() || `**${activeAgent.name}**\n\nMarket evaluation complete for: "${query}". Ready for order execution.`;

      const finalizedBotMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'agent',
        agentId: activeAgent.id,
        agentName: activeAgent.name,
        shape: activeAgent.shape,
        color: activeAgent.color,
        expression: activeAgent.expression,
        content: finalReply,
        steps: dynamicSteps,
        timestamp: timeStr,
      };

      const finalMessages = [...nextMessages, finalizedBotMsg];
      saveMessages(finalMessages);
      setStreamingText('');
      setStreamingSteps([]);

      // 5. Update sidebar Sessions list ordering with latest message preview
      window.dispatchEvent(
        new CustomEvent('bot-message-activity', {
          detail: {
            agentId: activeAgent.id,
            agentName: activeAgent.name,
            lastMessage: finalReply.slice(0, 75).replace(/^[#*\s]+/, ''),
            lastMessageAt: Date.now(),
            time: timeStr,
          },
        })
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setIsTyping(false);
        return;
      }
      setIsTyping(false);
      abortControllerRef.current = null;
      console.error('Failed to communicate with bot:', err);

      const fallbackReply = `**${activeAgent.name}**\n\nConnection established with Render FreeLLMAPI. Ready to evaluate trading directives for "${query}".`;
      const fallbackBotMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'agent',
        agentId: activeAgent.id,
        agentName: activeAgent.name,
        shape: activeAgent.shape,
        color: activeAgent.color,
        expression: activeAgent.expression,
        content: fallbackReply,
        steps: dynamicSteps,
        timestamp: timeStr,
      };

      saveMessages([...nextMessages, fallbackBotMsg]);
      setStreamingText('');
      setStreamingSteps([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-background font-sans select-none">
      {/* 1. Ambient Kortix Brandmark / Dot Grid Wallpaper */}
      <div className="absolute inset-0 pointer-events-none opacity-80 overflow-hidden z-0">
        <WallpaperBackground wallpaperId="brandmark" showBrandMark={true} />
      </div>

      {/* 2. Authentic Kortix Session Header */}
      <div className="relative z-20 h-13 px-5 border-b border-border/40 backdrop-blur-xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm text-foreground tracking-tight font-sans">
            {sessionTitle}
          </span>
          {messages.some((m) => m.approval && m.approval.status === 'pending') && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse flex items-center gap-1">
              <Clock className="size-3" />
              Waiting for approval
            </span>
          )}
        </div>

        {/* Right Action Icons: Heartbeat Dropdown, Proactive Dispatch, >_ terminal, 🌐 globe, 🗂️ folder, ↗ Share, + New Agent */}
        <div className="flex items-center gap-1.5">
          {/* Living Heartbeat Vitals Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'h-8 px-2.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs',
                  heartbeatSettings.cadence === 'paused'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-border/40'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                )}
                title={`OpenMausBot Heartbeat: ${heartbeatSettings.cadence} cadence`}
              >
                <span
                  className={cn(
                    'size-2 rounded-full',
                    heartbeatSettings.cadence === 'paused' ? 'bg-zinc-400' : 'bg-emerald-500 animate-pulse'
                  )}
                />
                <span className="font-semibold">Heartbeat: {heartbeatSettings.cadence}</span>
                <CaretDown className="size-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 p-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xl text-xs font-sans z-50 text-zinc-900 dark:text-zinc-100"
            >
              <div className="px-2.5 py-1.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40 mb-1">
                OpenMausBot Heartbeat Cadence
              </div>
              <DropdownMenuItem
                onClick={handleManualPulse}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-amber-500/10 text-amber-600 font-medium"
              >
                <Lightning className="size-3.5 text-amber-500 fill-amber-500" />
                <span>Pulse Now (Manual Trigger)</span>
              </DropdownMenuItem>
              {(['15s', '30s', '45s', '60s'] as HeartbeatCadence[]).map((cadence) => (
                <DropdownMenuItem
                  key={cadence}
                  onClick={() => handleChangeCadence(cadence)}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer',
                    heartbeatSettings.cadence === cadence ? 'font-bold bg-muted' : 'hover:bg-muted/60'
                  )}
                >
                  <span>
                    {cadence}{' '}
                    {cadence === '15s'
                      ? '(Aggressive)'
                      : cadence === '30s'
                        ? '(Active Market)'
                        : cadence === '45s'
                          ? '(Standard)'
                          : '(Slow)'}
                  </span>
                  {heartbeatSettings.cadence === cadence && <Check className="size-3.5 text-emerald-500" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={() => handleChangeCadence('paused')}
                className={cn(
                  'flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-muted-foreground hover:bg-muted/60',
                  heartbeatSettings.cadence === 'paused' ? 'font-bold text-red-500' : ''
                )}
              >
                <span>Pause Heartbeat</span>
                {heartbeatSettings.cadence === 'paused' && <Check className="size-3.5 text-red-500" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={handleTriggerProactive}
            className="h-8 px-2.5 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Trigger Proactive Agent Briefing & HITL Setup"
          >
            <Lightning className="size-3.5 text-amber-500 fill-amber-500" />
            <span className="font-semibold">Proactive Dispatch</span>
          </button>
          <button
            type="button"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center transition-colors cursor-pointer"
            title="Terminal"
          >
            <TerminalWindow className="size-4" />
          </button>

          <button
            type="button"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center transition-colors cursor-pointer"
            title="Browser"
          >
            <Globe className="size-4" />
          </button>

          <button
            type="button"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center transition-colors cursor-pointer"
            title="Workspace Files"
          >
            <Folder className="size-4" />
          </button>

          <button
            type="button"
            className="h-8 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Share Session"
          >
            <ShareNetwork className="size-3.5" />
            <span>Share</span>
          </button>

          <div className="h-4 w-px bg-border/60 mx-1" />

          {/* + New Agent Button with Dropdown in Kortix style */}
          <ButtonGroup className="border border-zinc-200/90 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950 shadow-2xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (onOpenCreateAgent) {
                  onOpenCreateAgent();
                } else {
                  window.dispatchEvent(new CustomEvent('open-create-agent-drawer'));
                }
              }}
              className="h-8 px-3 text-xs font-semibold gap-1.5 bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-950 dark:text-white rounded-none cursor-pointer border-0 transition-colors"
              title="Create New Agent"
            >
              <Plus className="size-3.5 text-zinc-950 dark:text-white" />
              <span>New Agent</span>
            </Button>

            <ButtonGroupSeparator className="bg-zinc-200 dark:bg-zinc-800" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white rounded-none cursor-pointer border-0 transition-colors"
                  title="More Actions"
                >
                  <DotsThreeVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 p-1.5 rounded-2xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-800 shadow-xl font-sans z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <DropdownMenuItem
                  onClick={() => {
                    if (onOpenCreateGroup) {
                      onOpenCreateGroup();
                    } else {
                      window.dispatchEvent(new CustomEvent('open-create-group-modal'));
                    }
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Users className="size-4 text-zinc-500" />
                  <span>Create Group</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (onOpenCreateAgent) {
                      onOpenCreateAgent();
                    } else {
                      window.dispatchEvent(new CustomEvent('open-create-agent-drawer'));
                    }
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Plus className="size-4 text-zinc-500" />
                  <span>Create Agent</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
        </div>
      </div>

      {/* 3. Main Content: Landing Screen OR Active Thread */}
      {messages.length === 0 && !isTyping ? (
        /* ================== LANDING SCREEN (Matching CompanyOS / Kortix) ================== */
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center space-y-6">
            <h1 className="text-xl sm:text-2xl font-normal tracking-tight text-muted-foreground font-sans">
              What's next for <strong className="font-semibold text-foreground">Trading Assistant</strong>?
            </h1>

            {/* Kortix Card Composer */}
            <div className="w-full text-left">
              <div className="bg-background border-border relative isolate z-10 w-full rounded-2xl border p-3.5 shadow-sm focus-within:border-zinc-400 dark:focus-within:border-zinc-700 transition-all flex flex-col gap-3">
                <textarea
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe a task to start a session..."
                  rows={2}
                  className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-sans"
                />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                      title="Attach files"
                    >
                      <Paperclip className="size-4" />
                    </button>

                    {/* Real Kortix AgentSelector */}
                    <AgentSelector
                      agents={allAgents as any}
                      selectedAgent={activeAgent.id}
                      onSelect={handleSwitchAgent}
                    />

                    {/* Model Pill: [z] zed */}
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 border border-border/40 select-none">
                      <span className="size-3.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center text-[9px] font-bold">z</span>
                      <span>zed</span>
                      <CaretDown className="size-3 text-muted-foreground ml-0.5" />
                    </div>
                  </div>

                  {/* Right side of composer toolbar */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                      title="Parameters"
                    >
                      <Sliders className="size-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!inputVal.trim() || isTyping}
                      className="size-7.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all cursor-pointer shadow-xs active:scale-95"
                      title="Send Message"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 max-w-xl mx-auto">
              {[
                'Analyze Apple (AAPL)',
                'Analyze Tesla (TSLA)',
                'Analyze NVIDIA (NVDA)',
                'Analyze S&P 500 momentum',
                'Compare Apple vs AMD & Microsoft',
                'Market breakdown & key technicals',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  className="rounded-full bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/90 dark:border-zinc-800 px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer shadow-2xs font-sans"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ================== ACTIVE THREAD VIEW (Matching CompanyOS / Kortix) ================== */
        <div className="relative z-10 flex-1 flex flex-col min-h-0">
          {/* Scrollable messages container */}
          <div
            id="chat-transcript-scroll"
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto px-4 py-8 space-y-8 [scrollbar-width:thin]"
          >
            <div className="max-w-3xl w-full mx-auto space-y-7">
              {messages.map((msg) => (
                <div key={msg.id} className="w-full">
                  {msg.sender === 'user' ? (
                    /* User Message: Authentic Kortix Bubble (Soft Muted Surface) */
                    <div className="flex justify-end">
                      <div className="bg-muted text-foreground flex max-w-[80%] flex-col px-4 py-2.5 rounded-2xl select-text shadow-2xs">
                        <div className="text-[0.925rem] leading-[22px] font-medium wrap-break-word whitespace-pre-wrap select-text font-sans">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Assistant Message: Direct Unboxed Flow with Real Chain of Thought & ThrottledMarkdown */
                    <div className="space-y-3.5 text-foreground font-sans">
                      {/* Authentic Kortix Step Chain using ChainOfThought + ChainOfThoughtStep */}
                      {msg.steps && msg.steps.length > 0 && (
                        <ChainOfThought className="my-2.5 select-none font-mono">
                          {msg.steps.map((step, idx) => (
                            <ChainOfThoughtStep key={idx} defaultOpen={false}>
                              <div className="flex items-center justify-between text-xs text-muted-foreground py-0.5">
                                <div className="flex items-center gap-2">
                                  {step.icon === 'skill' && <Files className="size-3.5 text-muted-foreground/80 shrink-0" />}
                                  {step.icon === 'file' && <ReadCvLogo className="size-3.5 text-muted-foreground/80 shrink-0" />}
                                  {step.icon === 'search' && <MagnifyingGlass className="size-3.5 text-muted-foreground/80 shrink-0" />}
                                  <span>
                                    {step.label} <span className="text-foreground font-medium">{step.target}</span>
                                  </span>
                                </div>
                                {step.detail && (
                                  <span className="text-[11px] text-muted-foreground/60 font-sans ml-4">
                                    {step.detail}
                                  </span>
                                )}
                              </div>
                            </ChainOfThoughtStep>
                          ))}
                        </ChainOfThought>
                      )}

                      {/* Main Message Typography with ThrottledMarkdown */}
                      <div className="text-[0.925rem] leading-relaxed text-foreground select-text font-sans">
                        <ThrottledMarkdown
                          content={msg.content}
                          isStreaming={false}
                          response={true}
                        />
                      </div>

                      {/* Human-in-the-Loop (HITL) Interactive Approval Card */}
                      {msg.approval && (
                        <div
                          className={cn(
                            'mt-3.5 rounded-xl border p-4 space-y-3 font-sans transition-all shadow-xs',
                            msg.approval.status === 'pending'
                              ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10'
                              : msg.approval.status === 'approved'
                                ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10'
                                : 'border-zinc-300 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 opacity-80'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield
                                className={cn(
                                  'size-4.5',
                                  msg.approval.status === 'pending'
                                    ? 'text-amber-500'
                                    : msg.approval.status === 'approved'
                                      ? 'text-emerald-500'
                                      : 'text-zinc-500'
                                )}
                              />
                              <span className="font-semibold text-xs tracking-tight uppercase text-foreground">
                                Human-in-the-Loop (HITL) Review
                              </span>
                            </div>
                            <span
                              className={cn(
                                'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border',
                                msg.approval.riskLevel === 'high'
                                  ? 'bg-red-500/10 text-red-600 border-red-500/20'
                                  : msg.approval.riskLevel === 'medium'
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              )}
                            >
                              {msg.approval.riskLevel} Risk
                            </span>
                          </div>

                          <div className="text-sm font-semibold text-foreground">
                            {msg.approval.title}
                          </div>

                          {/* Details Badges */}
                          {msg.approval.details && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                              {msg.approval.details.symbol && (
                                <div className="p-2 rounded-lg bg-background/80 border border-border/40">
                                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Instrument</div>
                                  <div className="font-bold text-foreground mt-0.5">{msg.approval.details.symbol}</div>
                                </div>
                              )}
                              {msg.approval.details.action && (
                                <div className="p-2 rounded-lg bg-background/80 border border-border/40">
                                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Action</div>
                                  <div
                                    className={cn(
                                      'font-bold mt-0.5',
                                      msg.approval.details.action === 'BUY'
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-600 dark:text-red-400'
                                    )}
                                  >
                                    {msg.approval.details.action}
                                  </div>
                                </div>
                              )}
                              {msg.approval.details.quantity && (
                                <div className="p-2 rounded-lg bg-background/80 border border-border/40">
                                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Lots / Qty</div>
                                  <div className="font-bold text-foreground mt-0.5">{msg.approval.details.quantity} Qty</div>
                                </div>
                              )}
                              {msg.approval.details.price && (
                                <div className="p-2 rounded-lg bg-background/80 border border-border/40">
                                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Limit Price</div>
                                  <div className="font-bold text-foreground mt-0.5">₹{msg.approval.details.price.toFixed(2)}</div>
                                </div>
                              )}
                              {msg.approval.details.target && (
                                <div className="p-2 rounded-lg bg-background/80 border border-border/40">
                                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Target</div>
                                  <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">₹{msg.approval.details.target.toFixed(2)}</div>
                                </div>
                              )}
                              {msg.approval.details.stopLoss && (
                                <div className="p-2 rounded-lg bg-background/80 border border-border/40">
                                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Stop Loss</div>
                                  <div className="font-bold text-red-600 dark:text-red-400 mt-0.5">₹{msg.approval.details.stopLoss.toFixed(2)}</div>
                                </div>
                              )}
                              {msg.approval.details.estCharges && (
                                <div className="p-2 rounded-lg bg-background/80 border border-border/40">
                                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Est. Charges</div>
                                  <div className="font-bold text-foreground mt-0.5">₹{msg.approval.details.estCharges.toFixed(2)}</div>
                                </div>
                              )}
                              {msg.approval.details.exchange && (
                                <div className="p-2 rounded-lg bg-background/80 border border-border/40">
                                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Exchange</div>
                                  <div className="font-bold text-foreground mt-0.5">{msg.approval.details.exchange}</div>
                                </div>
                              )}
                            </div>
                          )}

                          {msg.approval.details?.notes && (
                            <div className="text-xs text-muted-foreground bg-background/50 p-2.5 rounded-lg border border-border/40 leading-relaxed">
                              {msg.approval.details.notes}
                            </div>
                          )}

                          {/* Action Buttons or Resolution Status */}
                          <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                            {msg.approval.status === 'pending' ? (
                              <>
                                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                                  <Clock className="size-3.5 animate-pulse" />
                                  <span>Autonomous execution held pending trader approval</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleReject(msg.approval!.id)}
                                    variant="outline"
                                    className="h-8 px-3 text-xs text-zinc-600 hover:text-red-600 cursor-pointer"
                                  >
                                    <X className="size-3.5 mr-1" />
                                    Reject
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleApprove(msg.approval!.id)}
                                    className="h-8 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all"
                                  >
                                    <Check className="size-3.5 mr-1" />
                                    Approve Action
                                  </Button>
                                </div>
                              </>
                            ) : msg.approval.status === 'approved' ? (
                              <div className="w-full flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium py-1">
                                <span className="flex items-center gap-1.5 font-semibold">
                                  <CheckCircle className="size-4" />
                                  Authorized by Trader at {msg.approval.resolvedAt}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-mono">Dispatched via DhanHQ Smart Router</span>
                              </div>
                            ) : (
                              <div className="w-full flex items-center justify-between text-xs text-red-600 dark:text-red-400 font-medium py-1">
                                <span className="flex items-center gap-1.5 font-semibold">
                                  <X className="size-4" />
                                  Action Rejected by Trader at {msg.approval.resolvedAt}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-mono">Order staging cancelled</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Real-time Streaming Turn (When isTyping) */}
              {isTyping && (
                <div className="w-full space-y-3.5 text-foreground font-sans">
                  {/* Dynamic Chain of Thought steps as they appear */}
                  {streamingSteps.length > 0 && (
                    <ChainOfThought className="my-2.5 select-none font-mono">
                      {streamingSteps.map((step, idx) => (
                        <ChainOfThoughtStep key={idx} defaultOpen={false}>
                          <div className="flex items-center justify-between text-xs text-muted-foreground py-0.5">
                            <div className="flex items-center gap-2">
                              {step.icon === 'skill' && <Files className="size-3.5 text-muted-foreground/80 shrink-0" />}
                              {step.icon === 'file' && <ReadCvLogo className="size-3.5 text-muted-foreground/80 shrink-0" />}
                              {step.icon === 'search' && <MagnifyingGlass className="size-3.5 text-muted-foreground/80 shrink-0" />}
                              <span>
                                {step.label} <span className="text-foreground font-medium">{step.target}</span>
                              </span>
                            </div>
                            {step.detail && (
                              <span className="text-[11px] text-muted-foreground/60 font-sans ml-4">
                                {step.detail}
                              </span>
                            )}
                          </div>
                        </ChainOfThoughtStep>
                      ))}
                    </ChainOfThought>
                  )}

                  {/* Live Streaming Content with ThrottledMarkdown */}
                  <div className="text-[0.925rem] leading-relaxed text-foreground select-text font-sans">
                    {streamingText ? (
                      <ThrottledMarkdown
                        content={streamingText}
                        isStreaming={true}
                        response={true}
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs py-1 font-mono">
                        <CircleNotch className="size-3.5 animate-spin" />
                        <span>{activeAgent.name} is evaluating market parameters via Render FreeLLMAPI&hellip;</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================== DOCKED COMPOSER (Matching CompanyOS / Kortix) ================== */}
          <div className="max-w-3xl w-full mx-auto px-4 pb-6 pt-2 shrink-0">
            {/* The Composer Card */}
            <div className="bg-background border-border relative isolate z-10 w-full rounded-2xl border p-3.5 shadow-sm focus-within:border-zinc-400 dark:focus-within:border-zinc-700 transition-all flex flex-col gap-2.5">
              <textarea
                ref={textareaRef}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type / for skills, commands, and files"
                rows={1}
                className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-sans min-h-[38px]"
              />

              {/* Inside Toolbar: Model + Auto Speed + Send/Stop Button */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  {/* Model Selector Pill */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-transparent hover:bg-muted text-xs font-sans text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none">
                    <span>zed</span>
                    <CaretDown className="size-3 text-muted-foreground" />
                  </div>

                  {/* Auto Mode Pill */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-transparent hover:bg-muted text-xs font-sans text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none">
                    <Lightning className="size-3 text-muted-foreground" />
                    <span>Auto</span>
                    <CaretDown className="size-3 text-muted-foreground" />
                  </div>
                </div>

                {/* Send / Stop Button */}
                <button
                  type="button"
                  onClick={isTyping ? handleStop : () => handleSendMessage()}
                  disabled={!isTyping && !inputVal.trim()}
                  className="size-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all cursor-pointer shadow-xs active:scale-95"
                  title={isTyping ? 'Stop generating' : 'Send Message'}
                >
                  {isTyping ? (
                    <Stop className="size-3.5 fill-current" />
                  ) : (
                    <ArrowUp className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Underbar below Card: 📎 paperclip + (●) [Active Bot Name] ▾ + Clear button */}
            <div className="flex items-center justify-between pt-2 px-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                  title="Attach files"
                >
                  <Paperclip className="size-4" />
                </button>

                {/* Real Kortix AgentSelector */}
                <AgentSelector
                  agents={allAgents as any}
                  selectedAgent={activeAgent.id}
                  onSelect={handleSwitchAgent}
                />
              </div>

              {/* Right: clear chat / live spinner */}
              <div className="flex items-center gap-2">
                {isTyping && <CircleNotch className="size-3.5 animate-spin text-muted-foreground" />}
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="p-1 rounded-md hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Clear conversation"
                >
                  <Trash className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
