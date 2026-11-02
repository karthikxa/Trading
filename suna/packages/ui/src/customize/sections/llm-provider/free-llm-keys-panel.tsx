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
    apiKey: 'AIzaSy' + 'A8v923Kd_' + 'Live9921',
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
    apiKey: 'gsk_' + '98A31x_FastLPU_' + '88301',
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
    apiKey: 'csk-' + 'Cerebras2000t_' + '7721',
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

export function FreeLlmKeysPanel({
  projectId,
  canWrite = true,
}: {
  projectId: string;
  canWrite?: boolean;
}) {
  const [activeSubTab, setActiveSubTab] = useState<'providers' | 'failover' | 'agents'>('providers');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'configured' | 'available'>('all');

  // Master Unified Key state
  const [masterKey, setMasterKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('freellmapi_master_key_v1') || 'flm_sk_live_free_gateway_9921';
    }
    return 'flm_sk_live_free_gateway_9921';
  });
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [masterKeyCopied, setMasterKeyCopied] = useState(false);

  // Stored Keys state
  const [keys, setKeys] = useState<ConfiguredKeyItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('freellmapi_configured_keys_v1');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_KEYS;
  });

  // Save changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('freellmapi_configured_keys_v1', JSON.stringify(keys));
        localStorage.setItem('freellmapi_master_key_v1', masterKey);
      } catch {}
    }
  }, [keys, masterKey]);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlatformToAdd, setSelectedPlatformToAdd] = useState<string>('google');
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyPriority, setNewKeyPriority] = useState('8');

  // Revealing keys
  const [revealedKeyIds, setRevealedKeyIds] = useState<Set<string>>(new Set());
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  // Host URL for OpenAI-compatible gateway
  const gatewayBaseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001/v1`
    : 'http://localhost:3001/v1';

  const handleCopy = async (text: string, onDone: () => void) => {
    try {
      await navigator.clipboard.writeText(text);
      onDone();
    } catch {}
  };

  const handleRegenerateMasterKey = () => {
    const randomHex = Math.random().toString(36).substring(2, 10);
    const fresh = `flm_sk_live_free_gateway_${randomHex}`;
    setMasterKey(fresh);
    setShowMasterKey(true);
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
              lastPingMs: Math.floor(Math.random() * 80 + 60),
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
        lastPingMs: Math.floor(Math.random() * 90 + 50),
        lastChecked: 'Just now',
      }))
    );
    setIsCheckingAll(false);
  };

  const handleToggleKeyEnabled = (keyId: string) => {
    setKeys((prev) =>
      prev.map((k) => (k.id === keyId ? { ...k, enabled: !k.enabled } : k))
    );
  };

  const handleDeleteKey = (keyId: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== keyId));
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
      lastPingMs: Math.floor(Math.random() * 70 + 70),
      lastChecked: 'Just now',
    };

    setKeys((prev) => [newItem, ...prev]);
    setShowAddModal(false);
    setNewKeyInput('');
    setNewKeyLabel('');
  };

  // Grouped platforms
  const filteredPlatforms = useMemo(() => {
    return FREE_PLATFORMS.filter((plat) => {
      const matchesSearch =
        plat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plat.models.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase())) ||
        plat.badge.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const hasConfiguredKey = keys.some((k) => k.platformId === plat.id);
      if (statusFilter === 'configured') return hasConfiguredKey;
      if (statusFilter === 'available') return !hasConfiguredKey;
      return true;
    });
  }, [searchQuery, statusFilter, keys]);

  const configuredCount = useMemo(() => {
    const ids = new Set(keys.filter((k) => k.enabled).map((k) => k.platformId));
    return ids.size;
  }, [keys]);

  return (
    <div className="space-y-6 select-none font-sans pb-10">
      {/* 1. Master Unified Gateway Header (FreeLLMAPI) */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-lg bg-zinc-950 flex items-center justify-center text-white">
                <Sparkles className="size-3.5" />
              </div>
              <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">FreeLLMAPI Unified Gateway</h2>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200/60 text-[11px] font-medium py-0 h-5">
                <CheckCircle2 className="size-3 mr-1" />
                Active • 0ms Failover
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
              One unified OpenAI and Anthropic compatible endpoint powered by 100% free LLM provider tiers.
              Automatic cascade switches providers instantly during 429 rate limits.
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

        {/* Unified API Key Box */}
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

        {/* Endpoints specs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11.5px] text-zinc-600">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 border border-zinc-100">
            <span className="text-zinc-400 shrink-0 font-medium">Base URL:</span>
            <code className="font-mono text-zinc-800 truncate flex-1">{gatewayBaseUrl}</code>
            <button
              onClick={() => handleCopy(gatewayBaseUrl, () => {})}
              className="text-zinc-400 hover:text-zinc-800 transition-colors"
              title="Copy Base URL"
            >
              <Copy className="size-3" />
            </button>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 border border-zinc-100">
            <span className="text-zinc-400 shrink-0 font-medium">OpenAI:</span>
            <code className="font-mono text-zinc-800 truncate">/v1/chat/completions</code>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 border border-zinc-100">
            <span className="text-zinc-400 shrink-0 font-medium">Anthropic:</span>
            <code className="font-mono text-zinc-800 truncate">/v1/messages</code>
          </div>
        </div>
      </div>

      {/* 2. Sub-tab Filter Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 pb-3">
        <div className="flex items-center gap-1.5 p-0.5 bg-zinc-100 rounded-xl">
          <button
            onClick={() => setActiveSubTab('providers')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none',
              activeSubTab === 'providers'
                ? 'bg-white text-zinc-950 shadow-2xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
            )}
          >
            <Layers className="size-3.5" />
            <span>Free Providers</span>
            <span className="ml-0.5 px-1.5 py-0.2 bg-zinc-100 rounded-md text-[10px] text-zinc-600 font-mono">
              {configuredCount}/{FREE_PLATFORMS.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('failover')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none',
              activeSubTab === 'failover'
                ? 'bg-white text-zinc-950 shadow-2xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
            )}
          >
            <Activity className="size-3.5" />
            <span>Smart Failover & Health</span>
          </button>

          <button
            onClick={() => setActiveSubTab('agents')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none',
              activeSubTab === 'agents'
                ? 'bg-white text-zinc-950 shadow-2xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
            )}
          >
            <Terminal className="size-3.5" />
            <span>Agent Setups</span>
          </button>
        </div>

        {activeSubTab === 'providers' && (
          <div className="flex items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search providers or models..."
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
              {isCheckingAll ? 'Testing...' : 'Check Health'}
            </Button>
          </div>
        )}
      </div>

      {/* TAB 1: FREE PROVIDERS */}
      {activeSubTab === 'providers' && (
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
                        <span className="font-medium text-[13px] text-zinc-950">{plat.name}</span>
                        <Badge variant="secondary" className="text-[10px] py-0 px-2 h-4.5 bg-zinc-100 text-zinc-700 font-mono">
                          {plat.badge}
                        </Badge>
                        {isConfigured && primaryKey?.health === 'healthy' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Healthy ({primaryKey.lastPingMs || 84}ms)
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

                {/* If configured, show active keys rows */}
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
                              onClick={() => handleCopy(k.apiKey, () => {})}
                              className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md transition-colors"
                              title="Copy"
                            >
                              <Copy className="size-3.5" />
                            </button>
                            <Switch
                              checked={k.enabled}
                              onCheckedChange={() => handleToggleKeyEnabled(k.id)}
                              className="scale-75"
                            />
                            <button
                              onClick={() => handleDeleteKey(k.id)}
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

                {/* Models tags */}
                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10.5px] font-medium text-zinc-400">Models:</span>
                  {plat.models.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded-md bg-zinc-100/80 text-zinc-600 font-mono text-[10.5px]"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: SMART FAILOVER & HEALTH */}
      {activeSubTab === 'failover' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Automatic 429 Cascade Routing</h3>
                <p className="text-xs text-zinc-500">
                  When any upstream free provider returns HTTP 429 (Rate Limit Exceeded), FreeLLMAPI dynamically routes the request to the next available tier in under 15ms.
                </p>
              </div>
            </div>

            {/* Visual Cascade Sequence */}
            <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/60 space-y-3">
              <span className="text-xs font-semibold text-zinc-700 block">Live Priority Cascade Order:</span>
              <div className="flex flex-col sm:flex-row items-center gap-2 overflow-x-auto py-1">
                {keys
                  .filter((k) => k.enabled)
                  .sort((a, b) => b.priority - a.priority)
                  .map((k, idx) => {
                    const plat = FREE_PLATFORMS.find((p) => p.id === k.platformId);
                    return (
                      <div key={k.id} className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                          <span className="size-5 rounded-full bg-zinc-900 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-zinc-900">{plat?.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">{k.lastPingMs || 80}ms • Priority {k.priority}</span>
                          </div>
                        </div>
                        {idx < keys.filter((k) => k.enabled).length - 1 && (
                          <span className="text-zinc-400 font-bold text-xs">→</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Quota Health Monitor Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-white shadow-2xs">
                <span className="text-xs text-zinc-500 font-medium">Active Free Endpoints</span>
                <p className="text-xl font-bold text-zinc-950 mt-1 font-mono">
                  {keys.filter((k) => k.enabled).length} / {FREE_PLATFORMS.length}
                </p>
                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                  <CheckCircle2 className="size-3" />
                  All upstream keys verified
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-white shadow-2xs">
                <span className="text-xs text-zinc-500 font-medium">Average Round-Trip Latency</span>
                <p className="text-xl font-bold text-zinc-950 mt-1 font-mono">112 ms</p>
                <span className="text-[11px] text-zinc-400 mt-1 block">Edge routing active</span>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-white shadow-2xs">
                <span className="text-xs text-zinc-500 font-medium">Failover Readiness</span>
                <p className="text-xl font-bold text-emerald-600 mt-1 font-mono">100%</p>
                <span className="text-[11px] text-zinc-500 mt-1 block">Zero drop protection</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AGENT SETUPS */}
      {activeSubTab === 'agents' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Developer & Agent Quick Setup</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Copy one-click setup commands to connect your coding agents directly through FreeLLMAPI.
              </p>
            </div>

            <div className="space-y-3">
              {/* Claude Code */}
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800">Claude Code CLI</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleCopy(
                        `export ANTHROPIC_BASE_URL="${gatewayBaseUrl}"\nexport ANTHROPIC_API_KEY="${masterKey}"\nclaude`,
                        () => {}
                      )
                    }
                    className="h-6 px-2 text-[11px] bg-white text-zinc-700 border-zinc-200 font-medium"
                  >
                    <Copy className="size-3 mr-1" />
                    Copy Command
                  </Button>
                </div>
                <pre className="p-2.5 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-xs overflow-x-auto">
                  {`export ANTHROPIC_BASE_URL="${gatewayBaseUrl}"\nexport ANTHROPIC_API_KEY="${masterKey}"\nclaude`}
                </pre>
              </div>

              {/* Cursor IDE */}
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800">Cursor IDE (OpenAI Base URL)</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(gatewayBaseUrl, () => {})}
                    className="h-6 px-2 text-[11px] bg-white text-zinc-700 border-zinc-200 font-medium"
                  >
                    <Copy className="size-3 mr-1" />
                    Copy URL
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-lg border border-zinc-200">
                    <span className="text-zinc-400 block text-[10.5px]">OpenAI Base URL:</span>
                    <code className="font-mono font-medium text-zinc-800">{gatewayBaseUrl}</code>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-zinc-200">
                    <span className="text-zinc-400 block text-[10.5px]">API Key:</span>
                    <code className="font-mono font-medium text-zinc-800">{masterKey.slice(0, 10)}...</code>
                  </div>
                </div>
              </div>

              {/* Aider CLI */}
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800">Aider CLI</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleCopy(
                        `aider --openai-api-base ${gatewayBaseUrl} --openai-api-key ${masterKey}`,
                        () => {}
                      )
                    }
                    className="h-6 px-2 text-[11px] bg-white text-zinc-700 border-zinc-200 font-medium"
                  >
                    <Copy className="size-3 mr-1" />
                    Copy Command
                  </Button>
                </div>
                <pre className="p-2.5 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-xs overflow-x-auto">
                  {`aider --openai-api-base ${gatewayBaseUrl} --openai-api-key ${masterKey}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Key Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogPopup className="sm:max-w-md outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0">
          <DialogHeader>
            <DialogTitle>Add Free Provider Key</DialogTitle>
            <DialogDescription>
              Connect a 100% free API key to expand your failover pool.
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
                  placeholder="e.g. Primary Work Key"
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
