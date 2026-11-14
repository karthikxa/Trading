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
import { cn } from '../../lib/utils';
import { useUiRouter, useUiSearchParams } from '../../providers/ui-provider';

import {
  type TradingAgentDef,
  useTradingAgents,
} from './use-trading-agents';

export type { TradingAgentDef };
export { useTradingAgents };

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
    lastAction: "that leaves the pipeline. i'd spin up ...",
    time: '8:26 AM',
  },
];

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
          <BotAvatar shape={b1.shape} color={b1.color} expression={b1.expression} size={avatarSize} isAnimated={true} />
        </div>
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 rounded-full ring-1.5 ring-white shadow-2xs overflow-hidden">
          <BotAvatar shape={b2.shape} color={b2.color} expression={b2.expression} size={avatarSize} isAnimated={true} />
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
          isAnimated={true}
        />
      </div>
      {/* Bottom left avatar */}
      <div className="absolute bottom-0 left-0.5 z-10 rounded-full ring-1.5 ring-white shadow-2xs overflow-hidden">
        <BotAvatar
          shape={leftBot.shape}
          color={leftBot.color}
          expression={leftBot.expression}
          size={avatarSize}
          isAnimated={true}
        />
      </div>
      {/* Bottom right avatar */}
      <div className="absolute bottom-0 right-0.5 z-10 rounded-full ring-1.5 ring-white shadow-2xs overflow-hidden">
        <BotAvatar
          shape={rightBot.shape}
          color={rightBot.color}
          expression={rightBot.expression}
          size={avatarSize}
          isAnimated={true}
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
  const searchParams = useUiSearchParams();
  const currentTab = searchParams.get('tab');
  const isActive = currentTab === 'chat' || currentTab === 'agent';

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => {
          onOpenAgentsSidebar?.();
        }}
        isActive={isActive}
        className="group/menu-button text-sidebar-foreground relative cursor-pointer font-sans"
      >
        <span className="shrink-0 flex items-center justify-center">
          <BotAvatar shape="circle" color="#8B5CF6" size={16} expression="attentive" isAnimated={true} />
        </span>
        <span className="font-sans text-sm font-medium">Agents</span>
        <CaretRight className="size-3.5 text-muted-foreground group-hover/menu-button:text-sidebar-foreground transition-transform duration-150 ml-auto" />
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
  onBackToMainSidebar: () => void;
}) {
  const router = useUiRouter();
  const searchParams = useUiSearchParams();
  const currentAgentId = searchParams.get('agentId');
  const currentGroupId = searchParams.get('groupId');

  const {
    data: serverAgents = [],
    isLoading: isAgentsLoading,
    isError: isAgentsError,
    error: agentsError,
    refetch: refetchAgents,
  } = useTradingAgents();

  const [agentOverrides, setAgentOverrides] = useState<Record<string, Partial<TradingAgentDef>>>({});

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

  // Set single admin for workspace
  const handleSetAdmin = (targetAgentId: string) => {
    setAgentOverrides((prev) => {
      const next: Record<string, Partial<TradingAgentDef>> = { ...prev };
      for (const a of serverAgents) {
        next[a.id] = { ...(next[a.id] || {}), isAdmin: a.id === targetAgentId };
      }
      return next;
    });
  };

  // Pin / Unpin agent
  const handleTogglePin = (targetAgentId: string) => {
    setAgentOverrides((prev) => {
      const current = agents.find((a) => a.id === targetAgentId);
      return {
        ...prev,
        [targetAgentId]: { ...(prev[targetAgentId] || {}), isPinned: !current?.isPinned },
      };
    });
  };

  // Delete agent
  const handleDeleteAgent = (targetAgentId: string) => {
    setAgentOverrides((prev) => ({
      ...prev,
      [targetAgentId]: { ...(prev[targetAgentId] || {}), isArchived: true },
    }));
  };

  // Toggle archive group
  const handleToggleArchiveGroup = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, isArchived: !g.isArchived } : g)),
    );
  };

  // Delete group
  const handleDeleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
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
    // Immediately dispatch selection so composer updates instantaneously
    window.dispatchEvent(new CustomEvent('selected-swarm-agent', { detail: bot }));
    router.push(`/projects/${projectId}?tab=chat&agentId=${bot.id}`);
  };

  const handleOpenGroupChat = (group: AgentGroupDef) => {
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
    router.push(`/projects/${projectId}?tab=chat&groupId=${group.id}`);
  };

  const handleOpenEditDrawer = (agent: TradingAgentDef) => {
    // Dispatch global custom event so the page can open the BotEditDrawer
    window.dispatchEvent(new CustomEvent('open-bot-edit-drawer', { detail: agent }));
  };

  const handleOpenCreateAgent = () => {
    const newAgent: TradingAgentDef = {
      id: `agent-custom-${Date.now()}`,
      name: 'Custom Agent',
      role: 'Trading Specialist',
      group: 'Analysts',
      shape: 'circle',
      color: '#10B981',
      expression: 'attentive',
      status: 'idle',
      description: 'Custom AI trading agent identity',
      timeText: 'Just now',
      chatPreview: 'Ready for market analysis',
      lastAction: 'Ready for market analysis',
      time: 'Just now',
    };
    window.dispatchEvent(new CustomEvent('open-bot-edit-drawer', { detail: newAgent }));
  };

  // Sort pinned agents first
  const sortedAgents = [...agents].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (a.isAdmin && !b.isAdmin) return -1;
    if (!a.isAdmin && b.isAdmin) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col h-full w-full bg-sidebar text-sidebar-foreground font-sans select-none overflow-hidden">
      {/* Clean Header: Breadcrumb (Menu > Agents) on Left, Coss ButtonGroup (+ New Agent and 3-dots Menu) on Right */}
      <div className="px-3 py-2.5 border-b border-sidebar-border bg-sidebar shrink-0 flex items-center justify-between text-xs">
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="gap-1 text-xs">
            <BreadcrumbItem>
              <button
                type="button"
                onClick={() => {
                  onBackToMainSidebar();
                  router.push(`/projects/${projectId}`);
                }}
                className="hover:text-zinc-950 dark:hover:text-white text-zinc-500 font-medium transition-colors cursor-pointer"
                title="Back to main menu"
              >
                Menu
              </button>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-zinc-400">
              <CaretRight className="size-3 text-zinc-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-zinc-950 dark:text-white text-sm tracking-tight">
                Agents
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Right side: Coss UI Group with black box button with white font: + New Agent and 3-dots Menu */}
        <ButtonGroup className="border border-zinc-900 rounded-lg overflow-hidden bg-zinc-950 text-white shadow-xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleOpenCreateAgent}
            className="h-7 px-2.5 text-xs font-semibold gap-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-none cursor-pointer border-0 transition-colors"
            title="Create New Agent"
          >
            <Plus className="size-3 text-white" weight="bold" />
            <span className="text-white font-medium">New Agent</span>
          </Button>

          <ButtonGroupSeparator className="bg-zinc-800" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 p-0 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-none cursor-pointer border-0 transition-colors"
                title="More Actions"
              >
                <DotsThreeVertical weight="bold" className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 p-1.5 rounded-2xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-800 shadow-xl font-sans z-50 animate-in fade-in zoom-in-95 duration-100"
            >
              <DropdownMenuItem
                onClick={() => setShowCreateGroupModal(true)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                <Users className="size-4 text-zinc-500" />
                <span>Create Group</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleOpenCreateAgent}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                <Plus className="size-4 text-zinc-500" />
                <span>Create Agent</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      </div>

      {/* Main Workspace Body: Unified Grok bot style list (No AGENTS or GROUPS headers!) */}
      <div className="flex-1 p-2 space-y-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
            {sortedAgents.map((bot) => {
              const isSelected = currentAgentId === bot.id;
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
                        {bot.name}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        {bot.isPinned && (
                          <PushPin className="size-3 text-zinc-400 fill-zinc-400 shrink-0" />
                        )}
                        <span className="text-xs font-normal shrink-0 text-zinc-400">
                          {bot.timeText || bot.time || '10:15 AM'}
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
                              onClick={(e) => {
                                e.stopPropagation();
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
                      {bot.status === 'typing' ? (
                        <p className="shimmer text-xs text-muted-foreground truncate font-medium">
                          Typing&hellip;
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
                          {bot.chatPreview || bot.lastAction || 'synced workspace pipeline and updated watchlist...'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Groups (e.g. Offsite crew) rendered directly in the same list */}
            {groups.map((group) => {
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
                          {group.time || '11:20 AM'}
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

                    {/* Bottom Row: Chat text preview */}
                    <div className="flex items-center justify-between gap-1.5 leading-snug">
                      <p className={cn(
                        'text-xs truncate font-normal leading-snug',
                        isSelected ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-400',
                      )}>
                        {group.lastAction || group.description || "that leaves the pipeline. i'd spin up..."}
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
                setGroups((prev) =>
                  prev.map((g) =>
                    g.id === selectedGroupToEdit.id
                      ? {
                          ...g,
                          name: modifyGroupName.trim(),
                          description: modifyGroupDesc.trim() || undefined,
                          agentIds: [...modifyGroupAgentIds],
                        }
                      : g
                  )
                );
                setShowModifyGroupModal(false);
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
    </div>
  );
}
