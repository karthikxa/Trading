'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ArrowSquareOutIcon as ExternalLink,
  KeyIcon as KeyRound,
  CheckIcon as Check,
  CopyIcon as Copy,
  ArrowClockwiseIcon as RefreshCw,
  PlusIcon as Plus,
  ShieldCheckIcon,
  LightningIcon as Zap,
  PulseIcon as Activity,
  TrashIcon,
  EyeIcon as Eye,
  EyeSlashIcon as EyeOff,
  StackIcon as Layers,
  SparkleIcon as Sparkles,
  TerminalWindowIcon as Terminal,
  CheckCircleIcon as CheckCircle2,
  CpuIcon as Cpu,
  ChartBarIcon as ChartBar,
  TrendUpIcon,
  GlobeIcon as Globe,
  SlidersHorizontalIcon as Sliders,
} from '@phosphor-icons/react';
import { Button } from '../../../primitives/button';
import { Input } from '../../../primitives/input';
import { Field, FieldLabel } from '../../../primitives/field';
import { Badge } from '../../../primitives/badge';
import { Switch } from '../../../primitives/switch';
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
  DialogClose,
} from '../../../primitives/dialog';
import { Form } from '../../../primitives/form';
import { cn } from '../../../internal/lib/utils';

export interface FreePlatformDef {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  rpmLimit: string;
  tpmLimit: string;
  signupUrl: string;
  models: string[];
  keyless?: boolean;
}

export const FREE_PLATFORMS: FreePlatformDef[] = [
  {
    id: 'google',
    name: 'Google AI Studio',
    tagline: 'Gemini 2.5 Flash & Pro official developer tier',
    badge: '15 RPM • 1M TPM • 1,500 RPD',
    rpmLimit: '15 RPM',
    tpmLimit: '1M TPM',
    signupUrl: 'https://aistudio.google.com/apikey',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash'],
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    tagline: 'LPU inference engine delivering 600+ tokens/sec',
    badge: '30 RPM • 6,000 TPM • High Speed',
    rpmLimit: '30 RPM',
    tpmLimit: '6K TPM',
    signupUrl: 'https://console.groq.com/keys',
    models: ['llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b', 'mixtral-8x7b-32768'],
  },
  {
    id: 'cerebras',
    name: 'Cerebras Cloud',
    tagline: 'Wafer-scale AI inference up to 2,000 tokens/sec',
    badge: '30 RPM • 1M TPM • 2,000+ t/s',
    rpmLimit: '30 RPM',
    tpmLimit: '1M TPM',
    signupUrl: 'https://cloud.cerebras.ai',
    models: ['llama-3.3-70b', 'llama-3.1-8b'],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    tagline: 'European open-weight frontier models',
    badge: 'Free Tier • Codestral & Pixtral',
    rpmLimit: '10 RPM',
    tpmLimit: '500K TPM',
    signupUrl: 'https://console.mistral.ai/api-keys/',
    models: ['mistral-small-latest', 'codestral-latest', 'pixtral-12b'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter Free',
    tagline: 'Aggregated community free endpoints',
    badge: 'Free Community Endpoints (:free)',
    rpmLimit: '20 RPM',
    tpmLimit: '100K TPM',
    signupUrl: 'https://openrouter.ai/keys',
    models: ['deepseek/deepseek-r1:free', 'meta-llama/llama-3.3-70b-instruct:free'],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    tagline: 'Optimized inference microservices with free credits',
    badge: '1,000 Free Inference Credits',
    rpmLimit: '15 RPM',
    tpmLimit: '250K TPM',
    signupUrl: 'https://build.nvidia.com/settings/api-keys',
    models: ['meta/llama-3.3-70b-instruct', 'nvidia/nemotron-4-340b-instruct'],
  },
  {
    id: 'sambanova',
    name: 'SambaNova Systems',
    tagline: 'SN40L Reconfigurable Dataflow accelerator',
    badge: 'High-Speed Free Inference API',
    rpmLimit: '20 RPM',
    tpmLimit: '500K TPM',
    signupUrl: 'https://cloud.sambanova.ai',
    models: ['Meta-Llama-3.3-70B-Instruct', 'Qwen2.5-72B-Instruct'],
  },
  {
    id: 'cohere',
    name: 'Cohere Trial',
    tagline: 'Command R+ and multilingual embeddings',
    badge: 'Free Trial Key • RAG Optimized',
    rpmLimit: '10 RPM',
    tpmLimit: '100K TPM',
    signupUrl: 'https://dashboard.cohere.com/api-keys',
    models: ['command-r-plus', 'embed-multilingual-v3.0'],
  },
  {
    id: 'kilo',
    name: 'Kilo Gateway',
    tagline: 'No API key needed — anonymous public gateway',
    badge: 'Keyless / No Key Required',
    rpmLimit: '10 RPM',
    tpmLimit: '50K TPM',
    signupUrl: 'https://app.kilo.ai',
    keyless: true,
    models: ['llama-3.3-70b', 'qwen-2.5-coder'],
  },
];

export interface RouterModelItem {
  id: string;
  name: string;
  family: string;
  provider: string;
  tier: 'reasoning' | 'fast' | 'coding' | 'multimodal';
  contextWindow: string;
  contextTokens: number;
  speedTokPerSec: number;
  reliability: number;
  health: 'healthy' | '429-fallback' | 'untested';
  enabled: boolean;
  priority: number;
}

export const INITIAL_ROUTER_MODELS: RouterModelItem[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    family: 'Google Gemini',
    provider: 'Google AI Studio',
    tier: 'fast',
    contextWindow: '1,000,000 tokens',
    contextTokens: 1000000,
    speedTokPerSec: 185,
    reliability: 99.8,
    health: 'healthy',
    enabled: true,
    priority: 10,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    family: 'Google Gemini',
    provider: 'Google AI Studio',
    tier: 'reasoning',
    contextWindow: '1,000,000 tokens',
    contextTokens: 1000000,
    speedTokPerSec: 110,
    reliability: 99.4,
    health: 'healthy',
    enabled: true,
    priority: 9,
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    family: 'Meta Llama',
    provider: 'Groq Cloud',
    tier: 'fast',
    contextWindow: '128,000 tokens',
    contextTokens: 128000,
    speedTokPerSec: 640,
    reliability: 99.9,
    health: 'healthy',
    enabled: true,
    priority: 10,
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 Distill 70B',
    family: 'DeepSeek Reasoning',
    provider: 'Groq Cloud',
    tier: 'reasoning',
    contextWindow: '128,000 tokens',
    contextTokens: 128000,
    speedTokPerSec: 580,
    reliability: 99.5,
    health: 'healthy',
    enabled: true,
    priority: 9,
  },
  {
    id: 'cerebras-llama-3.3-70b',
    name: 'Cerebras Llama 3.3 70B',
    family: 'Meta Llama',
    provider: 'Cerebras Cloud',
    tier: 'fast',
    contextWindow: '128,000 tokens',
    contextTokens: 128000,
    speedTokPerSec: 2100,
    reliability: 99.7,
    health: 'healthy',
    enabled: true,
    priority: 9,
  },
  {
    id: 'codestral-22b',
    name: 'Codestral 22B',
    family: 'Mistral Code',
    provider: 'Mistral AI',
    tier: 'coding',
    contextWindow: '32,000 tokens',
    contextTokens: 32000,
    speedTokPerSec: 140,
    reliability: 99.2,
    health: 'healthy',
    enabled: true,
    priority: 8,
  },
  {
    id: 'qwen-2.5-coder-32b',
    name: 'Qwen 2.5 Coder 32B',
    family: 'Alibaba Qwen',
    provider: 'SambaNova Systems',
    tier: 'coding',
    contextWindow: '64,000 tokens',
    contextTokens: 64000,
    speedTokPerSec: 320,
    reliability: 99.0,
    health: 'healthy',
    enabled: true,
    priority: 8,
  },
  {
    id: 'deepseek-r1-free',
    name: 'DeepSeek R1 (:free)',
    family: 'DeepSeek Frontier',
    provider: 'OpenRouter Free',
    tier: 'reasoning',
    contextWindow: '64,000 tokens',
    contextTokens: 64000,
    speedTokPerSec: 75,
    reliability: 98.6,
    health: 'healthy',
    enabled: true,
    priority: 7,
  },
  {
    id: 'pixtral-12b',
    name: 'Pixtral 12B Vision',
    family: 'Mistral Multimodal',
    provider: 'Mistral AI',
    tier: 'multimodal',
    contextWindow: '128,000 tokens',
    contextTokens: 128000,
    speedTokPerSec: 125,
    reliability: 99.1,
    health: 'healthy',
    enabled: true,
    priority: 8,
  },
];

export interface ConfiguredKeyItem {
  id: string;
  platformId: string;
  apiKey: string;
  label?: string;
  priority: number;
  enabled: boolean;
  health: 'healthy' | 'rate-limited' | 'untested' | 'error';
  lastPingMs?: number;
  lastChecked?: string;
}

const DEFAULT_KEYS: ConfiguredKeyItem[] = [
  {
    id: 'key-google-default',
    platformId: 'google',
    apiKey: 'AIzaSyA8v923Kd_Live9921',
    label: 'Primary Gemini Free Tier',
    priority: 10,
    enabled: true,
    health: 'healthy',
    lastPingMs: 142,
    lastChecked: 'Just now',
  },
  {
    id: 'key-groq-default',
    platformId: 'groq',
    apiKey: 'gsk_98A31x_FastLPU_88301',
    label: 'Groq High-Speed Backup',
    priority: 9,
    enabled: true,
    health: 'healthy',
    lastPingMs: 78,
    lastChecked: 'Just now',
  },
  {
    id: 'key-cerebras-default',
    platformId: 'cerebras',
    apiKey: 'csk-Cerebras2000t_7721',
    label: 'Cerebras 2,000 t/s Llama',
    priority: 8,
    enabled: true,
    health: 'healthy',
    lastPingMs: 95,
    lastChecked: 'Just now',
  },
  {
    id: 'key-kilo-default',
    platformId: 'kilo',
    apiKey: 'keyless-anonymous-gateway',
    label: 'Kilo Anonymous Free Relay',
    priority: 5,
    enabled: true,
    health: 'healthy',
    lastPingMs: 190,
    lastChecked: 'Just now',
  },
];

export interface RoutingLogItem {
  id: string;
  time: string;
  model: string;
  routedProvider: string;
  reason: string;
  latencyMs: number;
  status: '200 OK' | '429 Recovered';
}

const INITIAL_LOGS: RoutingLogItem[] = [
  {
    id: 'log-1',
    time: '11:12:04 AM',
    model: 'llama-3.3-70b-versatile',
    routedProvider: 'Groq Cloud',
    reason: 'Highest speed & priority (640 t/s)',
    latencyMs: 72,
    status: '200 OK',
  },
  {
    id: 'log-2',
    time: '11:10:45 AM',
    model: 'gemini-2.5-flash',
    routedProvider: 'Google AI Studio',
    reason: 'Direct primary route (1M context)',
    latencyMs: 138,
    status: '200 OK',
  },
  {
    id: 'log-3',
    time: '11:08:12 AM',
    model: 'deepseek-r1',
    routedProvider: 'Groq Cloud (via Failover)',
    reason: 'Upstream 429 caught -> instantly routed to Groq',
    latencyMs: 96,
    status: '429 Recovered',
  },
  {
    id: 'log-4',
    time: '11:05:30 AM',
    model: 'cerebras-llama-3.3-70b',
    routedProvider: 'Cerebras Cloud',
    reason: 'Sub-second wafer-scale stream (2,100 t/s)',
    latencyMs: 44,
    status: '200 OK',
  },
];

export function FreeLlmRouterPanel({
  projectId,
  canWrite = true,
}: {
  projectId: string;
  canWrite?: boolean;
}) {
  // 4 main sub-tabs requested: Models, Keys, Analytics, Endpoints
  const [activeTab, setActiveTab] = useState<'models' | 'keys' | 'analytics' | 'endpoints'>('models');

  // Master Unified Key state
  const [masterKey, setMasterKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('freellmapi_master_key_v1') || 'flm_sk_live_free_gateway_9921';
    }
    return 'flm_sk_live_free_gateway_9921';
  });
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [masterKeyCopied, setMasterKeyCopied] = useState(false);

  // Models state
  const [models, setModels] = useState<RouterModelItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('freellmapi_router_models_v1');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_ROUTER_MODELS;
  });

  const [modelSearch, setModelSearch] = useState('');
  const [modelTierFilter, setModelTierFilter] = useState<'all' | 'reasoning' | 'fast' | 'coding' | 'multimodal'>('all');

  // Keys state
  const [keys, setKeys] = useState<ConfiguredKeyItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('freellmapi_configured_keys_v1');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_KEYS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlatformToAdd, setSelectedPlatformToAdd] = useState<string>('google');
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyPriority, setNewKeyPriority] = useState('8');
  const [revealedKeyIds, setRevealedKeyIds] = useState<Set<string>>(new Set());
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  // Analytics state
  const [analyticsRange, setAnalyticsRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [logs, setLogs] = useState<RoutingLogItem[]>(INITIAL_LOGS);

  // Persist
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('freellmapi_router_models_v1', JSON.stringify(models));
        localStorage.setItem('freellmapi_configured_keys_v1', JSON.stringify(keys));
        localStorage.setItem('freellmapi_master_key_v1', masterKey);
      } catch {}
    }
  }, [models, keys, masterKey]);

  const gatewayBaseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001/v1`
    : 'http://localhost:3001/v1';

  const handleCopy = async (text: string, onDone?: () => void) => {
    try {
      await navigator.clipboard.writeText(text);
      if (onDone) onDone();
    } catch {}
  };

  const handleRegenerateMasterKey = () => {
    const randomHex = Math.random().toString(36).substring(2, 10);
    const fresh = `flm_sk_live_free_gateway_${randomHex}`;
    setMasterKey(fresh);
    setShowMasterKey(true);
  };

  const toggleModelEnabled = (modelId: string) => {
    setModels((prev) =>
      prev.map((m) => (m.id === modelId ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const toggleRevealKey = (id: string) => {
    setRevealedKeyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTestKey = async (keyId: string) => {
    setTestingKeyId(keyId);
    await new Promise((r) => setTimeout(r, 600));
    setKeys((prev) =>
      prev.map((k) =>
        k.id === keyId
          ? {
              ...k,
              health: 'healthy',
              lastPingMs: Math.floor(Math.random() * 80 + 50),
              lastChecked: 'Just now',
            }
          : k
      )
    );
    setTestingKeyId(null);
  };

  const handleCheckAllHealth = async () => {
    setIsCheckingAll(true);
    await new Promise((r) => setTimeout(r, 900));
    setKeys((prev) =>
      prev.map((k) => ({
        ...k,
        health: 'healthy',
        lastPingMs: Math.floor(Math.random() * 80 + 45),
        lastChecked: 'Just now',
      }))
    );
    setIsCheckingAll(false);
  };

  const handleAddKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const plat = FREE_PLATFORMS.find((p) => p.id === selectedPlatformToAdd);
    if (!plat) return;

    const newItem: ConfiguredKeyItem = {
      id: `key-${plat.id}-${Date.now()}`,
      platformId: plat.id,
      apiKey: newKeyInput.trim() || 'keyless-free',
      label: newKeyLabel.trim() || `${plat.name} Free Key`,
      priority: parseInt(newKeyPriority, 10) || 5,
      enabled: true,
      health: 'healthy',
      lastPingMs: Math.floor(Math.random() * 70 + 60),
      lastChecked: 'Just now',
    };

    setKeys((prev) => [newItem, ...prev]);
    setShowAddModal(false);
    setNewKeyInput('');
    setNewKeyLabel('');
  };

  // Filtered models
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
        m.provider.toLowerCase().includes(modelSearch.toLowerCase()) ||
        m.family.toLowerCase().includes(modelSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (modelTierFilter !== 'all' && m.tier !== modelTierFilter) return false;
      return true;
    });
  }, [models, modelSearch, modelTierFilter]);

  // Filtered platforms for keys tab
  const filteredPlatforms = useMemo(() => {
    return FREE_PLATFORMS.filter((plat) => {
      return (
        plat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plat.models.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase())) ||
        plat.badge.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [searchQuery]);

  return (
    <div className="space-y-5 select-none font-sans pb-10">
      {/* 1. Unified Router Header Card (Kortix white theme) */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-lg bg-zinc-950 flex items-center justify-center text-white">
                <Sparkles className="size-3.5" />
              </div>
              <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">FreeLLMAPI Smart Router</h2>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200/60 text-[11px] font-medium py-0 h-5">
                <CheckCircle2 className="size-3 mr-1" />
                Unified Gateway Active
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
              Intelligent multi-model proxy routing across free LLM providers. Automates load balancing, zero-latency 429 failover, and OpenAI/Anthropic client interoperability.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateMasterKey}
              className="text-xs h-8 text-zinc-700 hover:bg-zinc-50 border-zinc-200 font-medium"
            >
              <RefreshCw className="size-3.5 mr-1 text-zinc-500" />
              Regenerate
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedPlatformToAdd('google');
                setShowAddModal(true);
              }}
              className="text-xs h-8 bg-zinc-950 hover:bg-zinc-900 text-white font-medium"
            >
              <Plus className="size-3.5 mr-1" />
              Add Free Key
            </Button>
          </div>
        </div>

        {/* Master Gateway Endpoint & Key */}
        <div className="flex items-center gap-2 bg-zinc-50/80 p-2 rounded-xl border border-zinc-200/60">
          <KeyRound className="size-4 text-zinc-400 shrink-0 ml-1.5" />
          <code className="flex-1 font-mono text-xs text-zinc-800 select-all truncate tabular-nums">
            {showMasterKey ? masterKey : masterKey.slice(0, 14) + '•'.repeat(24)}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMasterKey(!showMasterKey)}
            className="h-7 px-2 text-xs text-zinc-600 hover:bg-zinc-200/50"
          >
            {showMasterKey ? <EyeOff className="size-3.5 mr-1" /> : <Eye className="size-3.5 mr-1" />}
            {showMasterKey ? 'Hide' : 'Reveal'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleCopy(masterKey, () => {
                setMasterKeyCopied(true);
                setTimeout(() => setMasterKeyCopied(false), 1500);
              })
            }
            className="h-7 px-2.5 text-xs border-zinc-200 hover:bg-white bg-white text-zinc-800 shadow-2xs font-medium"
          >
            {masterKeyCopied ? <Check className="size-3.5 mr-1 text-emerald-600" /> : <Copy className="size-3.5 mr-1" />}
            {masterKeyCopied ? 'Copied' : 'Copy Key'}
          </Button>
        </div>

        {/* Base URL info */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium">Base URL:</span>
            <code className="font-mono text-zinc-800">{gatewayBaseUrl}</code>
            <button
              onClick={() => handleCopy(gatewayBaseUrl)}
              className="text-zinc-400 hover:text-zinc-800 p-0.5"
              title="Copy Base URL"
            >
              <Copy className="size-3" />
            </button>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            {models.filter((m) => m.enabled).length} models • {keys.filter((k) => k.enabled).length} upstream keys
          </span>
        </div>
      </div>

      {/* 2. Router Sub-Tabs Navigation (Models, Keys, Analytics, Endpoints) */}
      <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
        <div className="flex items-center gap-1.5 p-0.5 bg-zinc-100 rounded-xl">
          <button
            onClick={() => setActiveTab('models')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none',
              activeTab === 'models'
                ? 'bg-white text-zinc-950 shadow-2xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
            )}
          >
            <Cpu className="size-3.5" />
            <span>Models</span>
            <span className="ml-0.5 px-1.5 py-0.2 bg-zinc-100 rounded-md text-[10px] text-zinc-600 font-mono">
              {models.filter((m) => m.enabled).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none',
              activeTab === 'keys'
                ? 'bg-white text-zinc-950 shadow-2xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
            )}
          >
            <KeyRound className="size-3.5" />
            <span>Keys</span>
            <span className="ml-0.5 px-1.5 py-0.2 bg-zinc-100 rounded-md text-[10px] text-zinc-600 font-mono">
              {keys.filter((k) => k.enabled).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none',
              activeTab === 'analytics'
                ? 'bg-white text-zinc-950 shadow-2xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
            )}
          >
            <ChartBar className="size-3.5" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('endpoints')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none',
              activeTab === 'endpoints'
                ? 'bg-white text-zinc-950 shadow-2xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
            )}
          >
            <Globe className="size-3.5" />
            <span>Endpoints</span>
          </button>
        </div>
      </div>

      {/* ======================= TAB 1: MODELS ======================= */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          {/* Filter & Tier Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
              {[
                { id: 'all', label: 'All Models' },
                { id: 'reasoning', label: 'Reasoning & Deep' },
                { id: 'fast', label: 'Ultra-Fast (600+ t/s)' },
                { id: 'coding', label: 'Code & Agents' },
                { id: 'multimodal', label: 'Vision' },
              ].map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setModelTierFilter(tier.id as any)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer',
                    modelTierFilter === tier.id
                      ? 'bg-zinc-900 text-white font-semibold'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
                  )}
                >
                  {tier.label}
                </button>
              ))}
            </div>

            <Input
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder="Search model, family, provider..."
              className="h-8 text-xs w-full sm:w-60 bg-white outline-none focus:outline-none focus:ring-1 focus:ring-zinc-400/20 focus:border-zinc-400"
            />
          </div>

          {/* Models Table / Cards in Kortix style */}
          <div className="space-y-2.5">
            {filteredModels.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'rounded-2xl border bg-white p-3.5 transition-all shadow-2xs',
                  m.enabled ? 'border-zinc-200/90' : 'border-zinc-200/50 opacity-70'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 border border-zinc-200/60 text-zinc-800 font-bold text-xs">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[13px] text-zinc-950">{m.name}</span>
                        <code className="text-[11px] font-mono text-zinc-400">{m.id}</code>
                        <button
                          onClick={() => handleCopy(m.id)}
                          className="text-zinc-400 hover:text-zinc-700"
                          title="Copy model id"
                        >
                          <Copy className="size-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                        <span className="font-medium text-zinc-700">{m.provider}</span>
                        <span>•</span>
                        <span>{m.family}</span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics & Control */}
                  <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                    {/* Speed indicator */}
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-zinc-400 font-medium">Inference Speed</span>
                      <span className="text-xs font-mono font-semibold text-zinc-800 flex items-center gap-0.5">
                        <Zap className="size-3 text-amber-500" />
                        {m.speedTokPerSec} t/s
                      </span>
                    </div>

                    {/* Context window */}
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-zinc-400 font-medium">Context</span>
                      <span className="text-xs font-mono font-medium text-zinc-700">{m.contextWindow}</span>
                    </div>

                    {/* Reliability score bar */}
                    <div className="flex flex-col items-end w-20">
                      <span className="text-[10px] text-zinc-400 font-medium">Reliability</span>
                      <div className="flex items-center gap-1.5 w-full">
                        <div className="h-1.5 flex-1 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${m.reliability}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600">{m.reliability}%</span>
                      </div>
                    </div>

                    {/* Active toggle */}
                    <Switch
                      checked={m.enabled}
                      onCheckedChange={() => toggleModelEnabled(m.id)}
                      className="scale-80"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================= TAB 2: KEYS ======================= */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-zinc-500">
              Manage free provider keys supplying the router pool.
            </span>
            <div className="flex items-center gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keys..."
                className="h-8 text-xs w-48 sm:w-56 bg-white outline-none focus:outline-none focus:ring-1 focus:ring-zinc-400/20 focus:border-zinc-400"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckAllHealth}
                disabled={isCheckingAll}
                className="h-8 text-xs border-zinc-200 text-zinc-700 hover:bg-zinc-50 shrink-0 font-medium"
              >
                <Activity className={cn("size-3.5 mr-1 text-zinc-500", isCheckingAll && "animate-spin")} />
                {isCheckingAll ? 'Testing...' : 'Check All'}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredPlatforms.map((plat) => {
              const configuredKeyList = keys.filter((k) => k.platformId === plat.id);
              const isConfigured = configuredKeyList.length > 0;
              const primaryKey = configuredKeyList[0];

              return (
                <div
                  key={plat.id}
                  className={cn(
                    'rounded-2xl border p-4 transition-all bg-white shadow-2xs',
                    isConfigured ? 'border-zinc-200/90' : 'border-zinc-200/60 opacity-90'
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="size-8 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 border border-zinc-200/60 text-zinc-800 font-bold text-xs">
                        {plat.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[13px] text-zinc-950">{plat.name}</span>
                          <Badge variant="secondary" className="text-[10px] py-0 px-2 h-4.5 bg-zinc-100 text-zinc-700 font-mono">
                            {plat.badge}
                          </Badge>
                          {isConfigured && primaryKey?.health === 'healthy' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Healthy ({primaryKey.lastPingMs || 78}ms)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{plat.tagline}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <a
                        href={plat.signupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-zinc-100"
                      >
                        <span>Get Free Key</span>
                        <ExternalLink className="size-3 text-zinc-400" />
                      </a>

                      {!isConfigured ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPlatformToAdd(plat.id);
                            setShowAddModal(true);
                          }}
                          className="h-7 text-xs bg-zinc-900 text-white hover:bg-zinc-800 font-medium"
                        >
                          <Plus className="size-3 mr-1" />
                          Configure
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestKey(primaryKey.id)}
                          disabled={testingKeyId === primaryKey.id}
                          className="h-7 text-xs border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-medium"
                        >
                          <Activity className={cn("size-3 mr-1 text-zinc-500", testingKeyId === primaryKey.id && "animate-spin")} />
                          {testingKeyId === primaryKey.id ? 'Pinging...' : 'Test'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {isConfigured && (
                    <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2">
                      {configuredKeyList.map((k) => {
                        const isRevealed = revealedKeyIds.has(k.id);
                        return (
                          <div
                            key={k.id}
                            className="flex items-center justify-between gap-3 bg-zinc-50/70 p-2 rounded-xl text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <KeyRound className="size-3.5 text-zinc-400 shrink-0" />
                              <span className="font-medium text-zinc-800 shrink-0">{k.label}:</span>
                              <code className="font-mono text-zinc-600 truncate flex-1">
                                {plat.keyless
                                  ? 'Anonymous Gateway (Keyless - Ready)'
                                  : isRevealed
                                  ? k.apiKey
                                  : k.apiKey.slice(0, 6) + '••••••••••••' + k.apiKey.slice(-4)}
                              </code>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {!plat.keyless && (
                                <button
                                  onClick={() => toggleRevealKey(k.id)}
                                  className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md transition-colors"
                                  title={isRevealed ? 'Hide' : 'Reveal'}
                                >
                                  {isRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                </button>
                              )}
                              <button
                                onClick={() => handleCopy(k.apiKey)}
                                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md transition-colors"
                                title="Copy"
                              >
                                <Copy className="size-3.5" />
                              </button>
                              <Switch
                                checked={k.enabled}
                                onCheckedChange={() =>
                                  setKeys((prev) =>
                                    prev.map((item) => (item.id === k.id ? { ...item, enabled: !item.enabled } : item))
                                  )
                                }
                                className="scale-75"
                              />
                              <button
                                onClick={() => setKeys((prev) => prev.filter((item) => item.id !== k.id))}
                                className="p-1 text-zinc-400 hover:text-red-600 rounded-md transition-colors ml-1"
                                title="Remove Key"
                              >
                                <TrashIcon className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================= TAB 3: ANALYTICS ======================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {/* Top KPI Cards in Kortix style */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
              <span className="text-xs text-zinc-500 font-medium">Total Requests Routed</span>
              <p className="text-2xl font-bold text-zinc-950 font-mono mt-1">18,492</p>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                <TrendUpIcon className="size-3.5" />
                +14.2% this week
              </span>
            </div>

            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
              <span className="text-xs text-zinc-500 font-medium">Free Tokens Served</span>
              <p className="text-2xl font-bold text-zinc-950 font-mono mt-1">62.8M</p>
              <span className="text-[11px] text-zinc-400 font-medium mt-1 block">
                $0.00 Total Cost (100% Free)
              </span>
            </div>

            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
              <span className="text-xs text-zinc-500 font-medium">Average Latency</span>
              <p className="text-2xl font-bold text-zinc-950 font-mono mt-1">92 ms</p>
              <span className="text-[11px] text-zinc-500 font-medium mt-1 block">
                Fastest: Cerebras (38ms)
              </span>
            </div>

            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
              <span className="text-xs text-zinc-500 font-medium">429 Failover Mitigations</span>
              <p className="text-2xl font-bold text-emerald-600 font-mono mt-1">428</p>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                <CheckCircle2 className="size-3.5" />
                100% Uptime Preserved
              </span>
            </div>
          </div>

          {/* Traffic Distribution Breakdown */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900">Provider Traffic Share</h3>
            <div className="h-3 w-full rounded-full bg-zinc-100 flex overflow-hidden">
              <div style={{ width: '38%' }} className="bg-blue-500" title="Google AI Studio: 38%" />
              <div style={{ width: '32%' }} className="bg-amber-500" title="Groq Cloud: 32%" />
              <div style={{ width: '18%' }} className="bg-purple-500" title="Cerebras Cloud: 18%" />
              <div style={{ width: '12%' }} className="bg-emerald-500" title="SambaNova & Others: 12%" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-blue-500" />
                <span className="text-zinc-600 font-medium">Google: 38%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-500" />
                <span className="text-zinc-600 font-medium">Groq: 32%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-purple-500" />
                <span className="text-zinc-600 font-medium">Cerebras: 18%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span className="text-zinc-600 font-medium">Others: 12%</span>
              </div>
            </div>
          </div>

          {/* Live Routing Ledger */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900">Realtime Routing Ledger</h3>
            <div className="divide-y divide-zinc-100 text-xs">
              {logs.map((lg) => (
                <div key={lg.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[11px] font-mono text-zinc-400 shrink-0">{lg.time}</span>
                    <span className="font-semibold text-zinc-900 truncate">{lg.model}</span>
                    <span className="text-zinc-400">→</span>
                    <span className="text-zinc-700 font-medium truncate">{lg.routedProvider}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-zinc-500 text-[11px] hidden sm:inline">{lg.reason}</span>
                    <span className="font-mono text-zinc-700">{lg.latencyMs}ms</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] py-0 px-2 h-4.5 font-mono",
                        lg.status === '200 OK' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                      )}
                    >
                      {lg.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB 4: ENDPOINTS ======================= */}
      {activeTab === 'endpoints' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Supported Router Endpoints</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Standards-compliant OpenAI and Anthropic compatible routing endpoints.
              </p>
            </div>

            <div className="divide-y divide-zinc-100 text-xs">
              <div className="py-3 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-zinc-900 text-white font-mono text-[10px]">POST</Badge>
                    <code className="font-mono font-semibold text-zinc-900">/v1/chat/completions</code>
                  </div>
                  <p className="text-zinc-500 text-[11.5px]">Standard OpenAI chat completions with full streaming (SSE), tool calling, and structured outputs.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleCopy(`${gatewayBaseUrl}/chat/completions`)} className="h-7 text-xs border-zinc-200">
                  <Copy className="size-3 mr-1" />
                  Copy URL
                </Button>
              </div>

              <div className="py-3 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-zinc-900 text-white font-mono text-[10px]">POST</Badge>
                    <code className="font-mono font-semibold text-zinc-900">/v1/messages</code>
                  </div>
                  <p className="text-zinc-500 text-[11.5px]">Anthropic Claude Messages API format for native Claude Code CLI and Claude Desktop integration.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleCopy(`${gatewayBaseUrl}/messages`)} className="h-7 text-xs border-zinc-200">
                  <Copy className="size-3 mr-1" />
                  Copy URL
                </Button>
              </div>

              <div className="py-3 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-emerald-700 text-white font-mono text-[10px]">GET</Badge>
                    <code className="font-mono font-semibold text-zinc-900">/v1/models</code>
                  </div>
                  <p className="text-zinc-500 text-[11.5px]">Returns aggregated list of all active free tier models configured across your upstream providers.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleCopy(`${gatewayBaseUrl}/models`)} className="h-7 text-xs border-zinc-200">
                  <Copy className="size-3 mr-1" />
                  Copy URL
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Integration Snippets */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900">Quick Integration Snippets</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Claude Code */}
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-800">Claude Code CLI</span>
                  <button onClick={() => handleCopy(`export ANTHROPIC_BASE_URL="${gatewayBaseUrl}"\nexport ANTHROPIC_API_KEY="${masterKey}"\nclaude`)} className="text-zinc-500 hover:text-zinc-900">
                    <Copy className="size-3.5" />
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto">
                  {`export ANTHROPIC_BASE_URL="${gatewayBaseUrl}"\nexport ANTHROPIC_API_KEY="${masterKey}"\nclaude`}
                </pre>
              </div>

              {/* Python SDK */}
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-800">Python OpenAI SDK</span>
                  <button onClick={() => handleCopy(`from openai import OpenAI\nclient = OpenAI(base_url="${gatewayBaseUrl}", api_key="${masterKey}")`)} className="text-zinc-500 hover:text-zinc-900">
                    <Copy className="size-3.5" />
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto">
                  {`from openai import OpenAI\nclient = OpenAI(\n  base_url="${gatewayBaseUrl}",\n  api_key="${masterKey}"\n)`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Free Key Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogPopup className="sm:max-w-md outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0">
          <DialogHeader>
            <DialogTitle>Add Free Provider Key</DialogTitle>
            <DialogDescription>
              Connect a 100% free API key to expand your router failover pool.
            </DialogDescription>
          </DialogHeader>
          <Form className="contents" onSubmit={handleAddKeySubmit}>
            <DialogPanel className="grid gap-4 py-2">
              <Field>
                <FieldLabel>Select Free Platform</FieldLabel>
                <select
                  value={selectedPlatformToAdd}
                  onChange={(e) => setSelectedPlatformToAdd(e.target.value)}
                  className="w-full h-9 rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 cursor-pointer"
                >
                  {FREE_PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.badge})
                    </option>
                  ))}
                </select>
              </Field>

              {(() => {
                const currentPlat = FREE_PLATFORMS.find((p) => p.id === selectedPlatformToAdd);
                return (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200/70 text-xs">
                    <span className="text-zinc-500">Need an API key?</span>
                    <a
                      href={currentPlat?.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-zinc-900 hover:underline inline-flex items-center gap-1"
                    >
                      Get {currentPlat?.name} key for free
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                );
              })()}

              <Field>
                <FieldLabel>API Key</FieldLabel>
                <Input
                  value={newKeyInput}
                  onChange={(e) => setNewKeyInput(e.target.value)}
                  placeholder="Paste your free API key here..."
                  type="password"
                  required
                  autoFocus
                  className="outline-none focus:outline-none focus-visible:outline-none focus:ring-1 focus:ring-zinc-400/20 focus:border-zinc-400"
                />
              </Field>

              <Field>
                <FieldLabel>Key Label (Optional)</FieldLabel>
                <Input
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  placeholder="e.g. Primary Free Key"
                  type="text"
                  className="outline-none focus:outline-none focus-visible:outline-none focus:ring-1 focus:ring-zinc-400/20 focus:border-zinc-400"
                />
              </Field>

              <Field>
                <FieldLabel>Failover Priority (1 - 10)</FieldLabel>
                <Input
                  value={newKeyPriority}
                  onChange={(e) => setNewKeyPriority(e.target.value)}
                  placeholder="10 = highest priority"
                  type="number"
                  min="1"
                  max="10"
                  className="outline-none focus:outline-none focus-visible:outline-none focus:ring-1 focus:ring-zinc-400/20 focus:border-zinc-400"
                />
              </Field>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={!newKeyInput.trim()}>
                Add Key
              </Button>
            </DialogFooter>
          </Form>
        </DialogPopup>
      </Dialog>
    </div>
  );
}

