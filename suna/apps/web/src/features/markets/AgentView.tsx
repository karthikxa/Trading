'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Mic,
  Plus,
  ChevronDown,
  Paperclip,
  CloudSun,
  CodeXml,
  Pencil,
  BarChart3,
  Lightbulb,
  Share2,
  PanelLeft,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  LineChart,
  User,
  ArrowUp,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@kortix/ui';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
}

interface Thread {
  id: string;
  title: string;
  timeGroup: 'Today' | 'Yesterday' | 'Previous 7 Days';
  messages: Message[];
}

const INITIAL_THREADS: Thread[] = [
  {
    id: 'thread-1',
    title: 'Market Overview & Tech Forecast',
    timeGroup: 'Today',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'Give me a brief technical and macroeconomic outlook on Apple (AAPL) and NVDA for this week.',
        timestamp: '10:14 AM',
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          '**Apple (AAPL)** is consolidating near **$235.40**, testing support around the 20-day EMA. RSI is neutral at 54.2.\n\n**NVIDIA (NVDA)** continues upward momentum around **$142.80** driven by strong enterprise data center hardware demand. A clean break above $145 could trigger a continuation toward new highs.\n\nKey watch: Upcoming Federal Reserve rate commentary and mega-cap semiconductor earnings guidance.',
        timestamp: '10:14 AM',
        model: 'DeepSeek V4.1 Flash',
      },
    ],
  },
  {
    id: 'thread-2',
    title: 'Friendly Greeting',
    timeGroup: 'Today',
    messages: [],
  },
  {
    id: 'thread-3',
    title: 'Greeting',
    timeGroup: 'Today',
    messages: [],
  },
];

const AVAILABLE_MODELS = [
  { id: 'deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', provider: 'DeepSeek' },
  { id: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o (Omni)', provider: 'OpenAI' },
  { id: 'grok-3', name: 'Grok-3 Ultra', provider: 'xAI' },
];

export default function AgentView() {
  const [threads, setThreads] = useState<Thread[]>(INITIAL_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string>('thread-new');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Switch thread
  const selectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    if (threadId === 'thread-new') {
      setActiveMessages([]);
    } else {
      const thread = threads.find((t) => t.id === threadId);
      setActiveMessages(thread ? thread.messages : []);
    }
  };

  const startNewChat = () => {
    setActiveThreadId('thread-new');
    setActiveMessages([]);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...activeMessages, userMsg];
    setActiveMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    // If starting from a new thread, create an entry in the list
    if (activeThreadId === 'thread-new') {
      const newThreadId = `t-${Date.now()}`;
      const newThread: Thread = {
        id: newThreadId,
        title: text.slice(0, 32) + (text.length > 32 ? '...' : ''),
        timeGroup: 'Today',
        messages: newMessages,
      };
      setThreads((prev) => [newThread, ...prev]);
      setActiveThreadId(newThreadId);
    }

    // Simulate Agent response
    setTimeout(() => {
      let reply = `Here is the analysis for **${text}**:\n\n- **Market Structure**: Neutral-to-bullish breakout setup observed.\n- **Support/Resistance**: Primary support established at previous swing low with immediate resistance overhead.\n- **Volume Profile**: Accumulation evident during current consolidation range.`;
      
      if (text.toLowerCase().includes('weather')) {
        reply = 'Global Market Climate: Market sentiment is currently risk-on with low VIX volatility (14.2) and positive equity futures across NASDAQ and S&P 500.';
      } else if (text.toLowerCase().includes('code')) {
        reply = "```python\n# Automated VWAP Trading Strategy Signal\nimport pandas as pd\n\ndef calculate_vwap_crossover(df):\n    df['VWAP'] = (df['Volume'] * (df['High'] + df['Low'] + df['Close']) / 3).cumsum() / df['Volume'].cumsum()\n    df['Signal'] = df['Close'] > df['VWAP']\n    return df\n```\nStrategy logic evaluated and ready for backtesting.";
      }

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: selectedModel.name,
      };

      setActiveMessages([...newMessages, assistantMsg]);
      setIsTyping(false);
    }, 850);
  };

  const copyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isTyping]);

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const currentTitle = activeThread ? activeThread.title : 'New Chat';

  return (
    <div className="flex h-full w-full bg-white text-zinc-950 font-sans overflow-hidden select-text">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. LEFT THREADS SIDEBAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-col border-r border-zinc-200/90 bg-zinc-50/70 transition-all duration-200 shrink-0 select-none overflow-hidden',
          sidebarOpen ? 'w-64' : 'w-0 border-r-0',
        )}
      >
        {/* Brand / Header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-zinc-200/80">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 tracking-tight">
            <div className="size-6 rounded-lg bg-black text-white flex items-center justify-center">
              <Bot className="size-3.5" />
            </div>
            <span>AI Trading Agent</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors cursor-pointer"
            title="Collapse sidebar"
          >
            <PanelLeft className="size-4" />
          </button>
        </div>

        {/* New Thread Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={startNewChat}
            className="flex w-full items-center justify-start gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 shadow-2xs hover:bg-zinc-100 hover:border-zinc-300 transition-all cursor-pointer"
          >
            <Plus className="size-3.5 text-zinc-700" />
            <span>New Thread</span>
          </button>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4 [scrollbar-width:none]">
          <div>
            <p className="px-2 pb-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Today</p>
            <div className="space-y-0.5">
              {threads.map((thread) => {
                const isActive = activeThreadId === thread.id;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => selectThread(thread.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer',
                      isActive
                        ? 'bg-zinc-200/70 font-semibold text-zinc-950'
                        : 'text-zinc-600 hover:bg-zinc-200/40 hover:text-zinc-900',
                    )}
                  >
                    <MessageSquare className="size-3.5 shrink-0 opacity-60" />
                    <span className="truncate">{thread.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. CHAT WORKSPACE (WHITE THEME) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col h-full bg-white relative overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-12 items-center justify-between border-b border-zinc-200/80 px-4 bg-white/80 backdrop-blur-xs select-none z-10 shrink-0">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer mr-1"
                title="Open sidebar"
              >
                <PanelLeft className="size-4" />
              </button>
            )}
            <h2 className="text-sm font-semibold text-zinc-900 truncate max-w-sm">{currentTitle}</h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={startNewChat}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
              title="New Chat"
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Share chat"
            >
              <Share2 className="size-4" />
            </button>
          </div>
        </header>

        {/* Chat Message Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 lg:px-12">
          {activeMessages.length === 0 ? (
            /* Empty State: Center Greeting */
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-2xl mx-auto pt-8">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 mb-2">
                How can I help you today?
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-md mb-8">
                Ask about market trends, technical patterns, code strategies, or macro catalysts.
              </p>
            </div>
          ) : (
            /* Active Messages List */
            <div className="max-w-3xl mx-auto space-y-6 pb-4">
              {activeMessages.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    {msg.role === 'user' ? (
                      <div className="size-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[11px] font-bold">
                        U
                      </div>
                    ) : (
                      <div className="size-6 rounded-full bg-black text-white flex items-center justify-center text-[11px]">
                        <Bot className="size-3.5" />
                      </div>
                    )}
                    <span className="text-xs font-semibold text-zinc-900">
                      {msg.role === 'user' ? 'You' : msg.model || 'Agent'}
                    </span>
                    <span className="text-[11px] text-zinc-400">{msg.timestamp}</span>
                  </div>

                  <div
                    className={cn(
                      'ml-8 text-sm leading-relaxed whitespace-pre-wrap rounded-2xl p-4',
                      msg.role === 'user'
                        ? 'bg-zinc-100 text-zinc-950 font-medium'
                        : 'bg-white border border-zinc-200/90 text-zinc-800 shadow-2xs',
                    )}
                  >
                    {msg.content}

                    {msg.role === 'assistant' && (
                      <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center gap-2 text-xs text-zinc-400">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="flex items-center gap-1 hover:text-zinc-800 transition-colors cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="size-3 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 ml-8 text-xs text-zinc-500 py-2">
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input & Action Bar Box (White Theme) */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-white via-white to-transparent shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* Main Rounded Box */}
            <div className="relative rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-950/10 transition-all">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                placeholder="Send a message... (@ to mention, / for commands)"
                className="w-full resize-none bg-transparent text-sm text-zinc-950 placeholder:text-zinc-400 outline-none leading-relaxed"
              />

              {/* Bottom controls row */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100/90 mt-1">
                {/* Left: Model Selector & Attach */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                    title="Add attachment"
                  >
                    <Plus className="size-4" />
                  </button>

                  {/* Model Dropdown Pill */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-200/70 transition-colors cursor-pointer"
                    >
                      <Bot className="size-3.5 text-zinc-700" />
                      <span>{selectedModel.name}</span>
                      <ChevronDown className="size-3 text-zinc-500" />
                    </button>

                    {modelDropdownOpen && (
                      <div className="absolute bottom-full left-0 mb-1 w-56 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg z-30">
                        {AVAILABLE_MODELS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(m);
                              setModelDropdownOpen(false);
                            }}
                            className={cn(
                              'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer',
                              selectedModel.id === m.id
                                ? 'bg-zinc-100 font-bold text-zinc-950'
                                : 'text-zinc-700 hover:bg-zinc-50',
                            )}
                          >
                            <span>{m.name}</span>
                            <span className="text-[10px] text-zinc-400">{m.provider}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Mic & Send Button */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                    title="Voice input"
                  >
                    <Mic className="size-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim() || isTyping}
                    className={cn(
                      'size-7 rounded-full flex items-center justify-center transition-all cursor-pointer',
                      inputText.trim() && !isTyping
                        ? 'bg-black text-white hover:bg-zinc-800'
                        : 'bg-zinc-200 text-zinc-400 cursor-not-allowed',
                    )}
                    title="Send message"
                  >
                    <ArrowUp className="size-4" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action Chips under input */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 select-none">
              <button
                type="button"
                onClick={() => handleSendMessage('Weather & global market climate')}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer shadow-2xs"
              >
                <CloudSun className="size-3.5 text-amber-500" />
                <span>Weather</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage('Code Python algorithm for VWAP trading strategy')}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer shadow-2xs"
              >
                <CodeXml className="size-3.5 text-blue-500" />
                <span>Code</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage('Write a macro research summary on interest rates')}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer shadow-2xs"
              >
                <Pencil className="size-3.5 text-emerald-500" />
                <span>Write</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage('Analyze S&P 500 and NASDAQ technical structure')}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer shadow-2xs"
              >
                <BarChart3 className="size-3.5 text-indigo-500" />
                <span>Analyze</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage('Brainstorm high-probability swing trade ideas')}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer shadow-2xs"
              >
                <Lightbulb className="size-3.5 text-yellow-500" />
                <span>Brainstorm</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
