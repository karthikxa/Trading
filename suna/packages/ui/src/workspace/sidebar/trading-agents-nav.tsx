'use client';

import React, { useState, useEffect } from 'react';
import { BotAvatar, type BotShape, type BotExpression } from './bot-avatar';
import {
  CaretRight,
  CaretLeft,
  CaretDown,
  Sparkle,
  Play,
  Users,
  CheckCircle,
  ShieldCheck,
  PencilSimple,
  PushPin,
  Archive,
  Trash,
  DotsThree,
  DotsThreeVertical,
  Plus,
  Crown,
  MagnifyingGlass,
  UserPlus,
  UsersThree,
  X,
} from '@phosphor-icons/react';
import { UiLink as Link } from '../../providers/ui-provider';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '../../primitives/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../primitives/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../primitives/breadcrumb';
import { Button } from '../../primitives/button';
import { ButtonGroup, ButtonGroupSeparator } from '../../primitives/button-group';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '../../primitives/dialog';
import { Field, FieldLabel } from '../../primitives/field';
import { Form } from '../../primitives/form';
import { Input } from '../../primitives/input';
import { Textarea } from '../../primitives/textarea';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../../primitives/sheet';
import { cn } from '../../lib/utils';
import { useUiRouter, useUiSearchParams } from '../../providers/ui-provider';

import {
  type TradingAgentDef,
  useTradingAgents,
} from './use-trading-agents';

export type { TradingAgentDef };
export { useTradingAgents };

export const BOT_SHAPES: { id: BotShape; label: string }[] = [
  { id: 'circle', label: 'Circle' },
  { id: 'pebble', label: 'Pebble' },
  { id: 'squircle', label: 'Squircle' },
  { id: 'square', label: 'Square' },
  { id: 'capsule', label: 'Capsule' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'hexagon', label: 'Hexagon' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'droplet', label: 'Droplet' },
];

export const BOT_EXPRESSIONS: { id: BotExpression; label: string }[] = [
  { id: 'attentive', label: 'Attentive' },
  { id: 'neutral', label: 'Neutral' },
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

export const BOT_COLORS = [
  '#09090B', // Black
  '#795548', // Brown
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Gold
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#7C5CFF', // WebGL Purple
  '#EC4899', // Pink
  '#64748B', // Slate / Grey
  '#F5F5F4', // Light
];

export const DownloadIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export interface AgentGroupDef {
  id: string;
  name: string;
  description?: string;
  agentIds: string[];
  lastAction: string;
  time: string;
  isArchived?: boolean;
}

export const INITIAL_TAURIC_GROUPS: AgentGroupDef[] = [
  {
    id: 'offsite_crew',
    name: 'Offsite crew',
    description: 'Lead, Fundamentals, and Execution joint desk',
    agentIds: ['fundamentals_analyst', 'trader_agent', 'portfolio_manager'],
    lastAction: '',
    time: '',
  },
];

export function formatCleanAgentName(name: string): string {
  if (!name) return 'Agent';
  const lower = name.toLowerCase().trim();
  if (lower === 'ea') return 'EA';
  if (lower === 'portfolio_manager' || lower === 'chief of staff') return 'Portfolio Manager';
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * OverlappingAvatars: Renders a cluster of maximum 3 bot avatars with intelligent admin-first sorting.
 * If > 3 bots are in the group, shows +N badge (e.g. +2, +11).
 */
export function OverlappingAvatars({
  agentIds = ['fundamentals_analyst', 'trader_agent', 'portfolio_manager'],
  allAgents,
  size = 32,
}: {
  agentIds?: string[];
  allAgents?: TradingAgentDef[];
  size?: number;
}) {
  const { data: serverAgents = [] } = useTradingAgents();
  const availableAgents = allAgents ?? serverAgents;
  // Resolve agents from agentIds in selection order
  const resolved = agentIds
    .map((id) => availableAgents.find((a) => a.id === id))
    .filter((a): a is TradingAgentDef => Boolean(a));

  // If admin is selected, admin bot MUST come first (top avatar slot)!
  const adminBot = resolved.find((a) => a.isAdmin) ?? resolved.find((a) => a.id === 'portfolio_manager');
  const nonAdminBots = resolved.filter((a) => a.id !== adminBot?.id);
  const orderedBots = adminBot ? [adminBot, ...nonAdminBots] : resolved;

  // Maximum 3 displayed bots
  const top3 = orderedBots.slice(0, 3);
  const remainingCount = Math.max(0, agentIds.length - 3);

  const isSmall = size < 24;
  const avatarSize = isSmall ? Math.max(9, Math.round(size * 0.52)) : Math.max(12, Math.round(size * 0.53));

  if (top3.length === 1) {
    const single = top3[0];
    return (
      <div
        className="relative shrink-0 flex items-center justify-center select-none"
        style={{ width: size, height: size }}
      >
        <BotAvatar
          shape={single.shape}
          color={single.color}
          expression={single.expression}
          size={Math.round(size * 0.85)}
          isAnimated={true}
        />
        {remainingCount > 0 && (
          <span
            className={cn(
              "absolute -bottom-1 -right-1 z-30 flex items-center justify-center font-mono font-bold bg-zinc-950 text-white rounded-full ring-1.5 ring-white shadow-xs leading-none select-none",
              isSmall ? "min-w-[12px] h-3 px-0.5 text-[7px]" : "min-w-[16px] h-3.5 px-1 text-[8.5px]"
            )}
            title={`${remainingCount} more agent${remainingCount > 1 ? 's' : ''}`}
          >
            +{remainingCount}
          </span>
        )}
      </div>
    );
  }

  if (top3.length === 2) {
    const b1 = top3[0];
    const b2 = top3[1];
    return (
      <div
        className="relative shrink-0 flex items-center justify-center select-none"
        style={{ width: size, height: size }}
      >
        <div className="absolute left-0.5 top-1/2 -translate-y-1/2 z-20 rounded-full ring-1.5 ring-white shadow-2xs overflow-hidden">
          <BotAvatar shape={b1.shape} color={b1.color} expression={b1.expression} size={avatarSize} isAnimated={false} />
        </div>
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 rounded-full ring-1.5 ring-white shadow-2xs overflow-hidden">
          <BotAvatar shape={b2.shape} color={b2.color} expression={b2.expression} size={avatarSize} isAnimated={false} />
        </div>
        {remainingCount > 0 && (
          <span
            className={cn(
              "absolute -bottom-1 -right-1 z-30 flex items-center justify-center font-mono font-bold bg-zinc-950 text-white rounded-full ring-1.5 ring-white shadow-xs leading-none select-none",
              isSmall ? "min-w-[12px] h-3 px-0.5 text-[7px]" : "min-w-[16px] h-3.5 px-1 text-[8.5px]"
            )}
            title={`${remainingCount} more agent${remainingCount > 1 ? 's' : ''}`}
          >
            +{remainingCount}
          </span>
        )}
      </div>
    );
  }

  // 3 bots (or more) in triangle formation
  const topBot = top3[0] || { shape: 'circle' as const, color: '#10B981', expression: 'attentive' as const };
  const leftBot = top3[1] || { shape: 'circle' as const, color: '#6366F1', expression: 'attentive' as const };
  const rightBot = top3[2] || { shape: 'circle' as const, color: '#8B5CF6', expression: 'attentive' as const };

  return (
    <div
      className="relative shrink-0 flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* Top avatar (Admin if selected, otherwise first selected) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 rounded-full ring-1.5 ring-white shadow-2xs overflow-hidden">
        <BotAvatar
          shape={topBot.shape}
          color={topBot.color}
          expression={topBot.expression}
          size={avatarSize}
          isAnimated={false}
        />
      </div>
      {/* Bottom left avatar */}
      <div className="absolute bottom-0 left-0.5 z-10 rounded-full ring-1.5 ring-white shadow-2xs overflow-hidden">
        <BotAvatar
          shape={leftBot.shape}
          color={leftBot.color}
          expression={leftBot.expression}
          size={avatarSize}
          isAnimated={false}
        />
      </div>
      {/* Bottom right avatar */}
      <div className="absolute bottom-0 right-0.5 z-10 rounded-full ring-1.5 ring-white shadow-2xs overflow-hidden">
        <BotAvatar
          shape={rightBot.shape}
          color={rightBot.color}
          expression={rightBot.expression}
          size={avatarSize}
          isAnimated={false}
        />
      </div>

      {/* +N badge if more than 3 agents (e.g. +2, +11) */}
      {remainingCount > 0 && (
        <span
          className={cn(
            "absolute -bottom-1 -right-1 z-30 flex items-center justify-center font-mono font-bold bg-zinc-950 text-white rounded-full ring-1.5 ring-white shadow-xs leading-none select-none",
            isSmall ? "min-w-[12px] h-3 px-0.5 text-[7px]" : "min-w-[16px] h-3.5 px-1 text-[8.5px]"
          )}
          title={`${remainingCount} more agent${remainingCount > 1 ? 's' : ''}`}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

export interface WorkspaceTeam {
  id: string;
  name: string;
  agentCount: number;
}

/**
 * 1. Button in Main Sidebar: Clicking switches sidebar view to 'agents'
 * Uses the exact same font style, padding, and layout as all other menu items.
 */
export function TradingAgentsSidebarNav({
  projectId,
  onOpenAgentsSidebar,
}: {
  projectId: string;
  onOpenAgentsSidebar?: () => void;
}) {
  const router = useUiRouter();
  const searchParams = useUiSearchParams();
  const currentTab = searchParams.get('tab');
  const isActive = currentTab === 'chat' || currentTab === 'agent';

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => {
          onOpenAgentsSidebar?.();
          router.push(`/projects/${projectId}?tab=chat`);
        }}
        isActive={isActive}
        className="group/menu-button text-sidebar-foreground relative cursor-pointer font-sans"
      >
        <span className="shrink-0 flex items-center justify-center text-purple-400">
          <BotAvatar shape="circle" color="#8B5CF6" size={16} expression="attentive" isAnimated={false} />
        </span>
        <span className="font-sans text-sm font-medium">Agents</span>
        <span className="ml-auto flex items-center">
          <CaretRight className="size-3 text-muted-foreground group-hover/menu-button:text-sidebar-foreground transition-transform duration-150" />
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * 2. Dedicated Agents Sidebar View: Replaces the main sidebar when Agents is clicked!
 */
export function AgentsSidebarView({
  projectId,
  onBackToMainSidebar,
}: {
  projectId: string;
  onBackToMainSidebar?: () => void;
}) {
  const router = useUiRouter();
  const searchParams = useUiSearchParams();
  const currentTab = searchParams.get('tab');
  const currentAgentId = searchParams.get('agentId');
  const currentGroupId = searchParams.get('groupId');

  const [selectedAgentId, setSelectedAgentId] = useState<string>(() => {
    return (
      currentAgentId ||
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('agentId') || 'portfolio_manager'
        : 'portfolio_manager')
    );
  });

  useEffect(() => {
    const handleSwarmSelect = (e: any) => {
      const custom = e as CustomEvent;
      if (custom.detail?.id && !custom.detail?.isGroup) {
        setSelectedAgentId(custom.detail.id);
      }
    };
    window.addEventListener('selected-swarm-agent', handleSwarmSelect);
    return () => window.removeEventListener('selected-swarm-agent', handleSwarmSelect);
  }, []);

  const {
    data: serverAgents = [],
    isLoading: isAgentsLoading,
    isError: isAgentsError,
    error: agentsError,
    refetch: refetchAgents,
  } = useTradingAgents();

  // Server-driven agent state: API is sole source of truth
  const [agentOverrides, setAgentOverrides] = useState<Record<string, Partial<TradingAgentDef>>>({});
  const [editingAgent, setEditingAgent] = useState<TradingAgentDef | null>(null);

  // Transient session activity tracking driven by server last-message timestamps
  const [agentActivity, setAgentActivity] = useState<Record<string, { lastMessage?: string; lastMessageAt?: number; time?: string }>>({});

  const [typingAgents, setTypingAgents] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleTyping = (e: any) => {
      const detail = e.detail;
      if (detail?.agentId) {
        setTypingAgents((prev) => ({
          ...prev,
          [detail.agentId]: Boolean(detail.isTyping),
        }));
      }
    };
    window.addEventListener('bot-typing-status', handleTyping);
    return () => window.removeEventListener('bot-typing-status', handleTyping);
  }, []);

  useEffect(() => {
    const handleActivity = (e: any) => {
      const detail = e.detail;
      if (detail?.agentId) {
        setAgentActivity((prev) => {
          const next = {
            ...prev,
            [detail.agentId]: {
              lastMessage: detail.lastMessage,
              lastMessageAt: detail.lastMessageAt || Date.now(),
              time: detail.time || 'Just now',
            },
          };
          try {
            localStorage.setItem('kortix_agent_activity_v1', JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    };
    window.addEventListener('bot-message-activity', handleActivity);
    return () => window.removeEventListener('bot-message-activity', handleActivity);
  }, []);

  useEffect(() => {
    const handleOpenCreate = () => {
      handleOpenCreateAgent();
    };
    window.addEventListener('open-create-agent-drawer', handleOpenCreate);
    return () => window.removeEventListener('open-create-agent-drawer', handleOpenCreate);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail) setEditingAgent({ ...e.detail });
    };
    window.addEventListener('open-bot-edit-drawer' as any, handler);
    return () => window.removeEventListener('open-bot-edit-drawer' as any, handler);
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('edit-agent-drawer-toggle', {
        detail: { open: Boolean(editingAgent) },
      }),
    );
  }, [editingAgent]);

  const handleSaveAgentIdentity = async (updated: TradingAgentDef) => {
    try {
      const res = await fetch(`/v1/trading/agents/${updated.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updated.name,
          role: updated.role,
          shape: updated.shape,
          color: updated.color,
          expression: updated.expression,
          description: updated.directives || updated.description,
          system_prompt: updated.directives || updated.system_prompt || null,
        }),
      });
      if (!res.ok && res.status === 503) {
        const errJson = await res.json().catch(() => null);
        console.error('[KortixSaveError] Migration required for save:', errJson?.missing);
      }
    } catch (err) {
      console.error('[KortixSaveError]', err);
    }
    refetchAgents();
    setAgentOverrides((prev) => ({
      ...prev,
      [updated.id]: {
        name: updated.name,
        role: updated.role,
        shape: updated.shape,
        color: updated.color,
        expression: updated.expression,
        description: updated.directives || updated.description,
        directives: updated.directives || updated.description,
      },
    }));
    setEditingAgent(null);
    handleOpenAgentChat(updated);
  };

  const agents = serverAgents
    .filter((a) => !agentOverrides[a.id]?.isArchived)
    .map((a) => ({
      ...a,
      ...(agentOverrides[a.id] || {}),
    }));

  const [workspaces, setWorkspaces] = useState<WorkspaceTeam[]>([
    { id: 'team-trading', name: 'Trading', agentCount: 12 },
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('team-trading');
  const [groups, setGroups] = useState<AgentGroupDef[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tauric_trading_groups_v1');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_TAURIC_GROUPS;
  });

  // Sync groups with server on mount
  useEffect(() => {
    fetch('/v1/trading/groups')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.groups) && data.groups.length > 0) {
          setGroups(data.groups);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tauric_trading_groups_v1', JSON.stringify(groups));
        window.dispatchEvent(new CustomEvent('tauric-groups-updated', { detail: groups }));
      } catch {}
    }
  }, [groups]);

  // Accordion sub-dropdown states
  const [isWorkspaceCollapsed, setIsWorkspaceCollapsed] = useState(false);
  const [isGroupsCollapsed, setIsGroupsCollapsed] = useState(false);
  const [isAgentsCollapsed, setIsAgentsCollapsed] = useState(false);

  // Modals state
  const [showAddWorkspaceModal, setShowAddWorkspaceModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showRenameGroupModal, setShowRenameGroupModal] = useState(false);
  const [showModifyGroupModal, setShowModifyGroupModal] = useState(false);
  const [selectedGroupToEdit, setSelectedGroupToEdit] = useState<AgentGroupDef | null>(null);

  // Search state for sessions
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [renameValue, setRenameValue] = useState('Trading');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCount, setNewTeamCount] = useState('5');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedGroupAgentIds, setSelectedGroupAgentIds] = useState<string[]>([
    'fundamentals_analyst',
    'trader_agent',
    'portfolio_manager',
  ]);
  const [renameGroupValue, setRenameGroupValue] = useState('');
  const [modifyGroupName, setModifyGroupName] = useState('');
  const [modifyGroupDesc, setModifyGroupDesc] = useState('');
  const [modifyGroupAgentIds, setModifyGroupAgentIds] = useState<string[]>([]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  // Set single admin for workspace (Real server API call)
  const handleSetAdmin = async (targetAgentId: string) => {
    setAgentOverrides((prev) => {
      const next: Record<string, Partial<TradingAgentDef>> = { ...prev };
      for (const a of serverAgents) {
        next[a.id] = { ...(next[a.id] || {}), isAdmin: a.id === targetAgentId };
      }
      return next;
    });
    try {
      await fetch(`/v1/trading/agents/${targetAgentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: true }),
      });
      refetchAgents();
    } catch {}
  };

  // Pin / Unpin agent (Real server API call)
  const handleTogglePin = async (targetAgentId: string) => {
    const current = agents.find((a) => a.id === targetAgentId);
    const nextPinned = !current?.isPinned;
    setAgentOverrides((prev) => ({
      ...prev,
      [targetAgentId]: { ...(prev[targetAgentId] || {}), isPinned: nextPinned },
    }));
    try {
      await fetch(`/v1/trading/agents/${targetAgentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: nextPinned }),
      });
      refetchAgents();
    } catch {}
  };

  // Delete / Archive agent (Real server API call)
  const handleDeleteAgent = async (targetAgentId: string) => {
    setAgentOverrides((prev) => ({
      ...prev,
      [targetAgentId]: { ...(prev[targetAgentId] || {}), isArchived: true },
    }));
    try {
      await fetch(`/v1/trading/agents/${targetAgentId}`, {
        method: 'DELETE',
      });
      refetchAgents();
    } catch {}
  };

  // Toggle archive group (Real server API call)
  const handleToggleArchiveGroup = async (groupId: string) => {
    const target = groups.find((g) => g.id === groupId);
    const nextArchived = !target?.isArchived;
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, isArchived: nextArchived } : g)),
    );
    try {
      await fetch(`/v1/trading/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: nextArchived }),
      });
    } catch {}
  };

  // Delete group (Real server API call)
  const handleDeleteGroup = async (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    try {
      await fetch(`/v1/trading/groups/${groupId}`, {
        method: 'DELETE',
      });
    } catch {}
  };

  // Add custom workspace team
  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const count = parseInt(newTeamCount, 10) || 5;
    const newWs: WorkspaceTeam = {
      id: `team-${Date.now()}`,
      name: newTeamName.trim(),
      agentCount: count,
    };
    setWorkspaces((prev) => [...prev, newWs]);
    setActiveWorkspaceId(newWs.id);
    setShowAddWorkspaceModal(false);
    setNewTeamName('');
  };

  const handleOpenAgentChat = (bot: TradingAgentDef) => {
    setSelectedAgentId(bot.id);
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      sp.set('tab', 'chat');
      sp.set('agentId', bot.id);
      sp.delete('groupId');
      window.history.pushState(null, '', `?${sp.toString()}`);
    }
    // Immediately dispatch selection so composer and chat update instantaneously
    window.dispatchEvent(new CustomEvent('selected-swarm-agent', { detail: bot }));
    window.dispatchEvent(new CustomEvent('trading-tab-change', { detail: 'chat' }));

    // Each bot gets its own isolated, dedicated session tracking
    const targetSessionId = `session-${bot.id}`;
    if (typeof window !== 'undefined') {
      try {
        const existing = JSON.parse(localStorage.getItem('tauric_agent_sessions_v1') || '{}');
        existing[bot.id] = targetSessionId;
        localStorage.setItem('tauric_agent_sessions_v1', JSON.stringify(existing));
      } catch {}
    }

    if (typeof window !== 'undefined' && window.location.pathname.startsWith(`/projects/${projectId}`)) {
      return;
    }
    router.push(`/projects/${projectId}?tab=chat&agentId=${bot.id}`);
  };

  const handleOpenGroupChat = (group: AgentGroupDef) => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      sp.set('tab', 'chat');
      sp.set('groupId', group.id);
      sp.delete('agentId');
      window.history.pushState(null, '', `?${sp.toString()}`);
    }
    window.dispatchEvent(
      new CustomEvent('selected-swarm-agent', {
        detail: {
          id: group.id,
          name: group.name,
          role: `${group.agentIds.length} agents in group`,
          isGroup: true,
          agentIds: group.agentIds,
          shape: 'circle' as const,
          color: '#10B981',
          expression: 'attentive' as const,
        },
      }),
    );
    window.dispatchEvent(new CustomEvent('trading-tab-change', { detail: 'chat' }));

    const targetSessionId = `session-group-${group.id}`;
    if (typeof window !== 'undefined') {
      try {
        const existing = JSON.parse(localStorage.getItem('tauric_agent_sessions_v1') || '{}');
        existing[group.id] = targetSessionId;
        localStorage.setItem('tauric_agent_sessions_v1', JSON.stringify(existing));
      } catch {}
    }

    if (typeof window !== 'undefined' && window.location.pathname.startsWith(`/projects/${projectId}`)) {
      return;
    }
    router.push(`/projects/${projectId}?tab=chat&groupId=${group.id}`);
  };

  const handleOpenEditDrawer = (agent: TradingAgentDef) => {
    setTimeout(() => {
      setEditingAgent({ ...agent });
    }, 80);
  };

  const handleOpenCreateAgent = async () => {
    try {
      const res = await fetch('/v1/trading/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Custom Agent',
          role: 'Trading Specialist',
          group: 'Analysts',
          shape: 'orb',
          color: '#7C5CFF',
          expression: 'attentive',
          description: 'Custom AI trading agent identity',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const created = data.agent;
        if (created) {
          const newAgent: TradingAgentDef = {
            id: created.id,
            name: created.name,
            role: created.role,
            group: (created.group_category as any) || 'Analysts',
            shape: (created.shape as any) || 'circle',
            color: created.color || '#7C5CFF',
            expression: (created.expression as any) || 'attentive',
            status: 'idle',
            description: created.description || '',
            timeText: '',
            chatPreview: '',
            lastAction: '',
            time: '',
          };
          refetchAgents();
          setEditingAgent(newAgent);
          return;
        }
      }
    } catch (e) {
      console.error('[CreateAgent]', e);
    }
    const fallbackAgent: TradingAgentDef = {
      id: `agent_${Date.now()}`,
      name: 'Custom Agent',
      role: 'Trading Specialist',
      group: 'Analysts',
      shape: 'orb',
      color: '#7C5CFF',
      expression: 'attentive',
      status: 'idle',
      description: 'Custom AI trading agent identity',
      timeText: '',
      chatPreview: '',
      lastAction: '',
      time: '',
    };
    setEditingAgent(fallbackAgent);
  };

  // Sort typing agents first, then pinned agents, then by most recent session activity (descending), then admin
  const sortedAgents = [...agents].sort((a, b) => {
    const isTypingA = Boolean(typingAgents[a.id]);
    const isTypingB = Boolean(typingAgents[b.id]);
    if (isTypingA && !isTypingB) return -1;
    if (!isTypingA && isTypingB) return 1;

    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const timeA = agentActivity[a.id]?.lastMessageAt || 0;
    const timeB = agentActivity[b.id]?.lastMessageAt || 0;
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    if (a.isAdmin && !b.isAdmin) return -1;
    if (!a.isAdmin && b.isAdmin) return 1;
    return 0;
  });

  // Filtered lists when searching
  const filteredAgents = sortedAgents.filter((agent) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(q) ||
      agent.role.toLowerCase().includes(q) ||
      agent.description?.toLowerCase().includes(q)
    );
  });

  const filteredGroups = groups.filter((group) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(q) ||
      group.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full w-full bg-sidebar text-sidebar-foreground font-sans select-none overflow-hidden">
      {/* Sessions Header with Search and Plus (+) Dropdown matching Kortix style */}
      <div className="px-3 py-2 shrink-0 flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-500 dark:text-zinc-400 text-xs tracking-tight">
          Sessions
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen((prev) => !prev);
              if (isSearchOpen) setSearchQuery('');
            }}
            className={cn(
              'size-6.5 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 active:bg-zinc-800 transition-all cursor-pointer !outline-none !ring-0 !border-0 focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0',
              isSearchOpen && 'bg-zinc-800 text-zinc-100'
            )}
            style={{ outline: 'none', boxShadow: 'none' }}
            title="Search sessions"
            aria-label="Search sessions"
          >
            <MagnifyingGlass weight="bold" className="size-3.5" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="size-6.5 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 active:bg-zinc-800 transition-all cursor-pointer !outline-none !ring-0 !border-0 focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0 data-[state=open]:!outline-none data-[state=open]:!ring-0 data-[state=open]:!border-0 data-[state=open]:bg-zinc-800 data-[state=open]:text-zinc-100"
                style={{ outline: 'none', boxShadow: 'none' }}
                title="Create agent or group"
                aria-label="Create agent or group"
              >
                <Plus weight="bold" className="size-3.5 stroke-[2]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 p-1 rounded-xl shadow-lg border border-border bg-popover text-popover-foreground">
              <DropdownMenuItem
                onClick={handleOpenCreateAgent}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <UserPlus weight="bold" className="size-3.5 text-muted-foreground" />
                <span>New Agent</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowCreateGroupModal(true)}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <UsersThree weight="bold" className="size-3.5 text-muted-foreground" />
                <span>New Group</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Inline Search Bar when search is active (Kortix style) */}
      {isSearchOpen && (
        <div className="px-2.5 pb-2 shrink-0">
          <div className="relative flex items-center">
            <MagnifyingGlass weight="bold" className="size-3.5 absolute left-3 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions..."
              autoFocus
              className="w-full h-8 pl-8.5 pr-8 text-xs bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-900 border border-zinc-700/60 focus:border-zinc-500 rounded-full outline-none text-zinc-100 placeholder:text-zinc-500 transition-all !ring-0 focus:!ring-0 focus:!outline-none"
              style={{ outline: 'none', boxShadow: 'none' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 size-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer outline-none focus:outline-none"
              >
                <X weight="bold" className="size-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Workspace Body: Unified Grok bot style list with Kortix top & bottom fade blending */}
      <div className="flex-1 p-2 space-y-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent_0px,black_18px,black_calc(100%-18px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0px,black_18px,black_calc(100%-18px),transparent_100%)]">
        {isAgentsLoading ? (
          <div className="p-1 space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl animate-pulse bg-zinc-100/50 dark:bg-zinc-800/40">
                <div className="size-9 rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded w-24" />
                  <div className="h-2.5 bg-zinc-150 dark:bg-zinc-700/60 rounded w-36" />
                </div>
              </div>
            ))}
          </div>
        ) : isAgentsError ? (
          <div className="p-4 text-center space-y-2 border border-rose-200/60 rounded-xl bg-rose-50/40 m-1">
            <p className="text-xs text-rose-600 font-medium">Failed to load trading agents</p>
            <p className="text-[11px] text-zinc-400">{String(agentsError || 'Network or server error')}</p>
            <button
              type="button"
              onClick={() => refetchAgents()}
              className="px-3 py-1 text-xs font-semibold bg-zinc-950 text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Bots rendered in Grok style: Name & Time on top, Shimmering Status or Chat text below */}
            {filteredAgents.map((bot) => {
              const isSelected = (selectedAgentId || currentAgentId || 'portfolio_manager') === bot.id;
              return (
                <div
                  key={bot.id}
                  data-agent-id={bot.id}
                  onClick={() => handleOpenAgentChat(bot)}
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all select-none',
                    isSelected
                      ? 'bg-zinc-100/90 dark:bg-zinc-800 text-zinc-950 dark:text-white font-medium border border-zinc-200/90 dark:border-zinc-700 shadow-2xs'
                      : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200 border border-transparent',
                  )}
                >
                  {/* Living Animated Bot Avatar */}
                  <BotAvatar
                    shape={bot.shape}
                    color={bot.color}
                    expression={bot.expression}
                    size={34}
                    isAnimated={true}
                  />

                  <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                    {/* Top Row: Name on Left, Time text on Right */}
                    <div className="flex items-center justify-between gap-1.5 leading-tight">
                      <span className={cn(
                        'font-medium text-sm truncate font-sans tracking-tight',
                        isSelected ? 'text-zinc-950 dark:text-white font-semibold' : 'text-zinc-900 dark:text-zinc-100',
                      )}>
                        {formatCleanAgentName(bot.name)}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        {bot.isPinned && (
                          <PushPin className="size-3 text-zinc-400 fill-zinc-400 shrink-0" />
                        )}
                        <span className="text-xs font-normal shrink-0 text-zinc-400">
                          {agentActivity[bot.id]?.time || bot.time || ''}
                        </span>

                        {/* 3-Dot Action Menu (Only visible on hover) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                'p-0.5 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer shrink-0 outline-none focus:outline-none',
                                isSelected ? 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/80' : 'text-zinc-400 hover:text-zinc-950 hover:bg-zinc-200/80',
                              )}
                              title="Agent Options"
                            >
                              <DotsThreeVertical weight="bold" className="size-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            side="right"
                            className="w-48 p-1.5 rounded-2xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-800 shadow-xl font-sans z-50 animate-in fade-in zoom-in-95 duration-100"
                          >
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetAdmin(bot.id);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer text-amber-600 transition-colors"
                            >
                              <ShieldCheck className="size-4 text-amber-500 shrink-0" weight="bold" />
                              <span className="text-amber-600 font-medium">Make Admin</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                handleOpenEditDrawer(bot);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-700 dark:text-zinc-300 transition-colors"
                            >
                              <PencilSimple className="size-4 text-zinc-500 shrink-0" />
                              <span>Edit Identity</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePin(bot.id);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-700 dark:text-zinc-300 transition-colors"
                            >
                              <PushPin className="size-4 text-zinc-500 shrink-0" />
                              <span>{bot.isPinned ? 'Unpin' : 'Pin'}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-zinc-800" />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAgent(bot.id);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 cursor-pointer transition-colors"
                            >
                              <Trash className="size-4 text-red-500 shrink-0" />
                              <span className="text-red-600 font-medium">Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Bottom Row: NO dot! Shimmering status for typing/waiting for approval, or Chat text */}
                    <div className="flex items-center justify-between gap-1.5 leading-snug">
                      {typingAgents[bot.id] || bot.status === 'typing' ? (
                        <p className="inline-block bg-[linear-gradient(90deg,rgba(255,255,255,0.45)_0%,#ffffff_50%,rgba(255,255,255,0.45)_100%)] dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.45)_0%,#ffffff_50%,rgba(255,255,255,0.45)_100%)] bg-[length:200%_auto] bg-clip-text text-transparent animate-[text-shimmer_1.8s_linear_infinite] font-medium text-xs tracking-wide">
                          typing...
                        </p>
                      ) : bot.status === 'waiting for approval' ? (
                        <p className="shimmer text-xs text-muted-foreground truncate font-medium">
                          Waiting for approval&hellip;
                        </p>
                      ) : (
                        <p className={cn(
                          'text-xs truncate font-normal leading-snug',
                          isSelected ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-400',
                        )}>
                          {(() => {
                            const rawMsg = agentActivity[bot.id]?.lastMessage;
                            const isSynthetic = rawMsg && (rawMsg.includes('Portfolio Manager Online') || rawMsg.includes('Online - ✅'));
                            return !isSynthetic && rawMsg ? rawMsg : bot.role;
                          })()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Groups (e.g. Offsite crew) rendered directly in the same list */}
            {filteredGroups.map((group) => {
              const isSelected = currentGroupId === group.id;
              return (
                <div
                  key={group.id}
                  onClick={() => handleOpenGroupChat(group)}
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all select-none',
                    isSelected
                      ? 'bg-zinc-100/90 dark:bg-zinc-800 text-zinc-950 dark:text-white font-medium border border-zinc-200/90 dark:border-zinc-700 shadow-2xs'
                      : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200 border border-transparent',
                  )}
                >
                  {/* 3-Bot Overlapping Avatars Cluster (Offsite crew style) */}
                  <OverlappingAvatars agentIds={group.agentIds} allAgents={agents} size={34} />

                  <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                    {/* Top Row: Group Name on Left, Time text on Right */}
                    <div className="flex items-center justify-between gap-1.5 leading-tight">
                      <span className={cn(
                        'font-medium text-sm truncate font-sans tracking-tight',
                        isSelected ? 'text-zinc-950 dark:text-white font-semibold' : 'text-zinc-900 dark:text-zinc-100',
                      )}>
                        {group.name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        <span className="text-xs font-normal shrink-0 text-zinc-400">
                          {group.time || ''}
                        </span>

                        {/* 3-Dot Action Menu for Groups (Visible on hover) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                'p-0.5 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer shrink-0 outline-none focus:outline-none',
                                isSelected ? 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/80' : 'text-zinc-400 hover:text-zinc-950 hover:bg-zinc-200/80',
                              )}
                              title="Group Options"
                            >
                              <DotsThreeVertical weight="bold" className="size-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            side="right"
                            className="w-48 p-1.5 rounded-2xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-800 shadow-xl font-sans z-50 animate-in fade-in zoom-in-95 duration-100"
                          >
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGroupToEdit(group);
                                setRenameGroupValue(group.name);
                                setShowRenameGroupModal(true);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-700 dark:text-zinc-300 transition-colors"
                            >
                              <PencilSimple className="size-4 text-zinc-500 shrink-0" />
                              <span>Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGroupToEdit(group);
                                setModifyGroupName(group.name);
                                setModifyGroupDesc(group.description || '');
                                setModifyGroupAgentIds([...group.agentIds]);
                                setShowModifyGroupModal(true);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-700 dark:text-zinc-300 transition-colors"
                            >
                              <Users className="size-4 text-zinc-500 shrink-0" />
                              <span>Modify Group</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-zinc-800" />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGroup(group.id);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 cursor-pointer transition-colors"
                            >
                              <Trash className="size-4 text-red-500 shrink-0" />
                              <span className="text-red-600 font-medium">Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Bottom Row: Group text preview */}
                    <div className="flex items-center justify-between gap-1.5 leading-snug">
                      <p className={cn(
                        'text-xs truncate font-normal leading-snug',
                        isSelected ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-400',
                      )}>
                        {group.description || `${group.agentIds.length} agents collaborative session`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Create Group Modal (Multi-agent Selection with Coss UI Dialog) */}
      <Dialog open={showCreateGroupModal} onOpenChange={setShowCreateGroupModal}>
        <DialogPopup className="sm:max-w-md outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>
              Select multiple agents to form a collaborative group for joint discussion.
            </DialogDescription>
          </DialogHeader>
          <Form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              if (!newGroupName.trim() || selectedGroupAgentIds.length === 0) return;
              const newGrp: AgentGroupDef = {
                id: `group-${Date.now()}`,
                name: newGroupName.trim(),
                description: newGroupDesc.trim() || undefined,
                agentIds: [...selectedGroupAgentIds],
                lastAction: 'Group created. Ready for discussion.',
                time: 'Just now',
              };
              setGroups((prev) => [...prev, newGrp]);
              setShowCreateGroupModal(false);
              setNewGroupName('');
              setNewGroupDesc('');
              void fetch('/v1/trading/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: newGrp.id,
                  name: newGrp.name,
                  description: newGrp.description,
                  agent_ids: newGrp.agentIds,
                }),
              }).catch(() => {});
            }}
          >
            <DialogPanel className="grid gap-4 py-2">
              <Field>
                <FieldLabel>Group Name</FieldLabel>
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Offsite crew, Execution Desk, Risk Council"
                  type="text"
                  required
                  autoFocus
                  className="outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-zinc-400"
                />
              </Field>

              <Field>
                <FieldLabel>Description</FieldLabel>
                <Input
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="e.g. Lead, Fundamentals, and Execution joint desk"
                  type="text"
                  className="outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-zinc-400"
                />
              </Field>

              <Field>
                <FieldLabel>Select Agents ({selectedGroupAgentIds.length} selected)</FieldLabel>
                <div className="max-h-56 overflow-y-auto space-y-1 p-1.5 border border-zinc-200/80 rounded-xl bg-zinc-50/50 [scrollbar-width:thin]">
                  {agents.map((agent) => {
                    const isChecked = selectedGroupAgentIds.includes(agent.id);
                    return (
                      <label
                        key={agent.id}
                        className={cn(
                          'flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors hover:bg-zinc-100 select-none',
                          isChecked && 'bg-white shadow-2xs font-medium text-zinc-950',
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <BotAvatar
                            shape={agent.shape}
                            color={agent.color}
                            expression={agent.expression}
                            size={22}
                            isAnimated={true}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-xs font-medium text-zinc-800">{agent.name}</span>
                            <span className="truncate text-[10.5px] text-zinc-400">{agent.role}</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroupAgentIds((prev) => [...prev, agent.id]);
                            } else {
                              setSelectedGroupAgentIds((prev) => prev.filter((id) => id !== agent.id));
                            }
                          }}
                          className="rounded border-zinc-300 text-zinc-900 focus:ring-0 focus:outline-none cursor-pointer size-4"
                        />
                      </label>
                    );
                  })}
                </div>
              </Field>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={!newGroupName.trim() || selectedGroupAgentIds.length === 0}>
                Create Group
              </Button>
            </DialogFooter>
          </Form>
        </DialogPopup>
      </Dialog>

      {/* Rename Group Dialog (Coss UI Particle) */}
      <Dialog open={showRenameGroupModal} onOpenChange={setShowRenameGroupModal}>
        <DialogPopup className="sm:max-w-sm outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0">
          <DialogHeader>
            <DialogTitle>Rename Group</DialogTitle>
            <DialogDescription>
              Enter a new name for this agent group.
            </DialogDescription>
          </DialogHeader>
          <Form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              if (selectedGroupToEdit && renameGroupValue.trim()) {
                setGroups((prev) =>
                  prev.map((g) =>
                    g.id === selectedGroupToEdit.id ? { ...g, name: renameGroupValue.trim() } : g
                  )
                );
                setShowRenameGroupModal(false);
              }
            }}
          >
            <DialogPanel className="grid gap-4 py-2">
              <Field>
                <FieldLabel>Group Name</FieldLabel>
                <Input
                  value={renameGroupValue}
                  onChange={(e) => setRenameGroupValue(e.target.value)}
                  placeholder="Group Name"
                  type="text"
                  required
                  autoFocus
                  className="outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-zinc-400"
                />
              </Field>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={!renameGroupValue.trim()}>
                Save Changes
              </Button>
            </DialogFooter>
          </Form>
        </DialogPopup>
      </Dialog>

      {/* Modify Group Dialog (Coss UI Particle - Name, Description, Agents) */}
      <Dialog open={showModifyGroupModal} onOpenChange={setShowModifyGroupModal}>
        <DialogPopup className="sm:max-w-md outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0">
          <DialogHeader>
            <DialogTitle>Modify Group</DialogTitle>
            <DialogDescription>
              Update group details, purpose, and member agents.
            </DialogDescription>
          </DialogHeader>
          <Form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              if (selectedGroupToEdit && modifyGroupName.trim() && modifyGroupAgentIds.length > 0) {
                const updatedName = modifyGroupName.trim();
                const updatedDesc = modifyGroupDesc.trim() || undefined;
                const updatedIds = [...modifyGroupAgentIds];
                setGroups((prev) =>
                  prev.map((g) =>
                    g.id === selectedGroupToEdit.id
                      ? {
                          ...g,
                          name: updatedName,
                          description: updatedDesc,
                          agentIds: updatedIds,
                        }
                      : g
                  )
                );
                setShowModifyGroupModal(false);
                void fetch(`/v1/trading/groups/${selectedGroupToEdit.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: updatedName,
                    description: updatedDesc,
                    agent_ids: updatedIds,
                  }),
                }).catch(() => {});
              }
            }}
          >
            <DialogPanel className="grid gap-4 py-2">
              <Field>
                <FieldLabel>Group Name</FieldLabel>
                <Input
                  value={modifyGroupName}
                  onChange={(e) => setModifyGroupName(e.target.value)}
                  placeholder="Group Name"
                  type="text"
                  required
                  autoFocus
                  className="outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-zinc-400"
                />
              </Field>

              <Field>
                <FieldLabel>Description</FieldLabel>
                <Input
                  value={modifyGroupDesc}
                  onChange={(e) => setModifyGroupDesc(e.target.value)}
                  placeholder="e.g. Lead, Fundamentals, and Execution joint desk"
                  type="text"
                  className="outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-zinc-400"
                />
              </Field>

              <Field>
                <FieldLabel>Member Agents ({modifyGroupAgentIds.length} selected)</FieldLabel>
                <div className="max-h-56 overflow-y-auto space-y-1 p-1.5 border border-zinc-200/80 rounded-xl bg-zinc-50/50 [scrollbar-width:thin]">
                  {agents.map((agent) => {
                    const isChecked = modifyGroupAgentIds.includes(agent.id);
                    return (
                      <label
                        key={agent.id}
                        className={cn(
                          'flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors hover:bg-zinc-100 select-none',
                          isChecked && 'bg-white shadow-2xs font-medium text-zinc-950',
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <BotAvatar
                            shape={agent.shape}
                            color={agent.color}
                            expression={agent.expression}
                            size={22}
                            isAnimated={true}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-xs font-medium text-zinc-800">{agent.name}</span>
                            <span className="truncate text-[10.5px] text-zinc-400">{agent.role}</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setModifyGroupAgentIds((prev) => [...prev, agent.id]);
                            } else {
                              setModifyGroupAgentIds((prev) => prev.filter((id) => id !== agent.id));
                            }
                          }}
                          className="rounded border-zinc-300 text-zinc-900 focus:ring-0 focus:outline-none cursor-pointer size-4"
                        />
                      </label>
                    );
                  })}
                </div>
              </Field>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={!modifyGroupName.trim() || modifyGroupAgentIds.length === 0}>
                Save Changes
              </Button>
            </DialogFooter>
          </Form>
        </DialogPopup>
      </Dialog>

      {/* Create Workspace / Team Dialog (Coss UI Particle - No Number of Agents, No Blue Border) */}
      <Dialog open={showAddWorkspaceModal} onOpenChange={setShowAddWorkspaceModal}>
        <DialogPopup className="sm:max-w-sm outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace or team to organize your trading agents.
            </DialogDescription>
          </DialogHeader>
          <Form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateWorkspace(event);
            }}
          >
            <DialogPanel className="grid gap-4 py-2">
              <Field>
                <FieldLabel>Workspace Name</FieldLabel>
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Crypto Momentum, Risk Hedgers"
                  type="text"
                  required
                  autoFocus
                  className="outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-zinc-400"
                />
              </Field>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={!newTeamName.trim()}>
                Create Workspace
              </Button>
            </DialogFooter>
          </Form>
        </DialogPopup>
      </Dialog>

      {/* Rename Workspace Dialog (Coss UI Particle) */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogPopup className="sm:max-w-sm outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0">
          <DialogHeader>
            <DialogTitle>Rename Workspace</DialogTitle>
            <DialogDescription>
              Enter a new name for this workspace.
            </DialogDescription>
          </DialogHeader>
          <Form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              if (renameValue.trim()) {
                setWorkspaces((prev) =>
                  prev.map((w) =>
                    w.id === activeWorkspaceId ? { ...w, name: renameValue.trim() } : w
                  )
                );
                setShowRenameModal(false);
              }
            }}
          >
            <DialogPanel className="grid gap-4 py-2">
              <Field>
                <FieldLabel>Workspace Name</FieldLabel>
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Workspace Name"
                  type="text"
                  required
                  autoFocus
                  className="outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-zinc-400"
                />
              </Field>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={!renameValue.trim()}>
                Save Changes
              </Button>
            </DialogFooter>
          </Form>
        </DialogPopup>
      </Dialog>

      {/* Edit Agent Identity Drawer (Slide-Over Sheet from Right) */}
      <Sheet open={!!editingAgent} modal={false} onOpenChange={(open) => !open && setEditingAgent(null)}>
        <SheetContent
          side="right"
          hideOverlay
          overlayClassName="hidden pointer-events-none opacity-0"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onFocusOutside={(e) => e.preventDefault()}
          className="top-0 right-0 bottom-0 h-screen md:h-screen w-[420px] max-w-[420px] !m-0 md:!m-0 !rounded-none md:!rounded-none border-y-0 border-r-0 border-l border-sidebar-border bg-sidebar shadow-2xl p-0 flex flex-col font-sans overflow-hidden outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ring-0 [&:focus]:outline-none [&:focus-visible]:outline-none [&:focus]:ring-0 z-40"
          style={{ outline: 'none' }}
        >
          <SheetHeader className="p-5 pb-3 border-b border-sidebar-border flex flex-col gap-1 text-left shrink-0">
            <SheetTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <PencilSimple className="size-4 text-foreground" />
              <span>Edit Agent Identity</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Customize avatar silhouette, colors, expression, and behavior for {editingAgent?.name}.
            </SheetDescription>
          </SheetHeader>

          {editingAgent && (
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveAgentIdentity(editingAgent);
              }}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs [scrollbar-width:thin]">
                {/* Hero Preview Card */}
                <div className="relative flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-b from-muted/50 to-muted/20 border border-sidebar-border gap-3 w-full">
                  <div className="relative group/hero flex items-center justify-center p-2 min-h-[148px]">
                    <BotAvatar
                      shape={editingAgent.shape}
                      color={editingAgent.color || '#2563EB'}
                      expression={editingAgent.expression}
                      size={140}
                      isAnimated={true}
                    />
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-sm text-foreground block">{editingAgent.name || 'Agent'}</span>
                    <span className="text-[11px] text-muted-foreground block">{editingAgent.role || 'Trading Specialist'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const canvas = document.createElement('canvas');
                      canvas.width = 400;
                      canvas.height = 400;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;
                      ctx.fillStyle = '#18181B';
                      ctx.beginPath();
                      ctx.arc(200, 200, 160, 0, Math.PI * 2);
                      ctx.fill();
                      ctx.fillStyle = editingAgent.color || '#7C5CFF';
                      ctx.beginPath();
                      ctx.arc(200, 200, 150, 0, Math.PI * 2);
                      ctx.fill();
                      ctx.fillStyle = '#ffffff';
                      ctx.beginPath();
                      ctx.roundRect(145, 140, 26, 60, 13);
                      ctx.roundRect(229, 140, 26, 60, 13);
                      ctx.fill();
                      const link = document.createElement('a');
                      link.download = `${(editingAgent.name || 'agent').toLowerCase().replace(/\s+/g, '_')}_avatar.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sidebar-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer shadow-2xs outline-none focus:outline-none"
                  >
                    <DownloadIcon className="size-3.5" />
                    <span>Export as PNG</span>
                  </button>
                </div>

                {/* Name */}
                <Field>
                  <FieldLabel>Bot Name</FieldLabel>
                  <Input
                    value={editingAgent.name}
                    onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                    placeholder="e.g. Portfolio Manager"
                    type="text"
                    required
                    className="outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </Field>

                {/* Role / Headline */}
                <Field>
                  <FieldLabel>Specialized Role</FieldLabel>
                  <Input
                    value={editingAgent.role}
                    onChange={(e) => setEditingAgent({ ...editingAgent, role: e.target.value })}
                    placeholder="e.g. Quantitative Risk Specialist"
                    type="text"
                    required
                    className="outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </Field>

                {/* Directives & System Instructions */}
                <Field>
                  <FieldLabel>Directives & System Instructions</FieldLabel>
                  <Textarea
                    value={editingAgent.directives || editingAgent.description || ''}
                    onChange={(e) =>
                      setEditingAgent({
                        ...editingAgent,
                        directives: e.target.value,
                        description: e.target.value,
                      })
                    }
                    placeholder="Type your trading directives and strategy rules here..."
                    minHeight={72}
                    maxHeight={160}
                    rows={3}
                    className="outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </Field>

                {/* Avatar Silhouette / Shape */}
                <Field>
                  <FieldLabel>Shape</FieldLabel>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {BOT_SHAPES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setEditingAgent({ ...editingAgent, shape: s.id })}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-2 rounded-xl border text-[11px] font-medium transition-all cursor-pointer outline-none',
                          editingAgent.shape === s.id
                            ? 'border-zinc-900 bg-zinc-100 text-zinc-950 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-50 font-semibold shadow-2xs ring-1 ring-zinc-900/10 dark:ring-white/20'
                            : 'border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 text-muted-foreground'
                        )}
                      >
                        <BotAvatar
                          shape={s.id}
                          color={editingAgent.color || '#F97316'}
                          expression={editingAgent.expression}
                          size={28}
                          isAnimated={false}
                        />
                        <span className="truncate">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Expression */}
                <Field>
                  <FieldLabel>Expression</FieldLabel>
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {BOT_EXPRESSIONS.map((expr) => (
                      <button
                        key={expr.id}
                        type="button"
                        onClick={() => setEditingAgent({ ...editingAgent, expression: expr.id })}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-2 rounded-xl border text-[10px] font-medium transition-all cursor-pointer outline-none',
                          editingAgent.expression === expr.id
                            ? 'border-zinc-900 bg-zinc-100 text-zinc-950 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-50 font-semibold shadow-2xs ring-1 ring-zinc-900/10 dark:ring-white/20'
                            : 'border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 text-muted-foreground'
                        )}
                      >
                        <BotAvatar
                          shape={editingAgent.shape}
                          color={editingAgent.color || '#F97316'}
                          expression={expr.id}
                          size={24}
                          isAnimated={false}
                        />
                        <span className="truncate">{expr.label}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Colour Palette */}
                <Field>
                  <FieldLabel>Colour</FieldLabel>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {BOT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingAgent({ ...editingAgent, color: c })}
                        className={cn(
                          'size-7 rounded-full border-2 transition-transform cursor-pointer outline-none',
                          editingAgent.color === c
                            ? 'scale-110 ring-2 ring-purple-500 ring-offset-2 border-white'
                            : 'border-transparent hover:scale-105'
                        )}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                    {/* Custom Color Input */}
                    <div className="relative size-7 rounded-full overflow-hidden border border-sidebar-border hover:scale-105 transition-transform cursor-pointer">
                      <input
                        type="color"
                        value={editingAgent.color || '#7C5CFF'}
                        onChange={(e) => setEditingAgent({ ...editingAgent, color: e.target.value })}
                        className="absolute -inset-2 size-12 cursor-pointer opacity-0"
                        title="Custom Color"
                      />
                      <div
                        className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white shadow-inner"
                        style={{ backgroundColor: editingAgent.color || '#7C5CFF' }}
                      >
                        +
                      </div>
                    </div>
                  </div>
                </Field>
              </div>

              <SheetFooter className="p-4 border-t border-sidebar-border bg-sidebar shrink-0 flex items-center justify-end gap-2">
                <SheetClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </SheetClose>
                <Button type="submit" disabled={!editingAgent.name.trim()}>
                  Save Identity
                </Button>
              </SheetFooter>
            </Form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export const TradingAgentsSessionsList = AgentsSidebarView;
