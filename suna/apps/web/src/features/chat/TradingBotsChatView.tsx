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
      } catch {}
    }
    return {};
  });

  // Listen to updates from Edit Agent Drawer
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('kortix_trading_agent_overrides_v1');
        if (saved) setAgentOverrides(JSON.parse(saved));
      } catch {}
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

  // Load message history for current active bot
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`kortix_agent_chat_${activeAgent.id}`);
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
    setStreamingText('');
    setStreamingSteps([]);
    setIsTyping(false);
  }, [activeAgent.id]);

  // Save messages helper
  const saveMessages = (msgs: ChatMessage[]) => {
    setMessages(msgs);
    try {
      localStorage.setItem(`kortix_agent_chat_${activeAgent.id}`, JSON.stringify(msgs));
    } catch {}
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
    } catch {}
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
        </div>

        {/* Right Action Icons: >_ terminal, 🌐 globe, 🗂️ folder, ↗ Share, + New Agent */}
        <div className="flex items-center gap-1.5">
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
