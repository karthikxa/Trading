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
import { useSearchParams, useRouter } from 'next/navigation';

export interface TradingAgentDef {
  id: string;
  name: string;
  role: string;
  group: 'Analysts' | 'Researchers' | 'Management' | 'Risk Management' | 'Execution';
  shape: BotShape;
  color: string;
  expression: BotExpression;
  lastAction: string;
  time: string;
  description: string;
  isAdmin?: boolean;
  isPinned?: boolean;
  unread?: boolean;
}

export const INITIAL_TAURIC_AGENTS: TradingAgentDef[] = [
  // 1. Chief of Staff (Default Admin Lead)
  {
    id: 'portfolio_manager',
    name: 'Chief of Staff',
    role: 'Capital Allocation & Swarm Lead',
    group: 'Execution',
    shape: 'circle',
    color: '#8B5CF6',
    expression: 'attentive',
    lastAction: 'Got it! Product updates shared with team.',
    time: '7:34 PM',
    description: 'Lead Portfolio Manager and Workspace Administrator. Synthesizes swarm intelligence and directs execution.',
    isAdmin: true,
  },
  // 2. EA
  {
    id: 'ea_agent',
    name: 'EA',
    role: 'Executive & Workflow Automation',
    group: 'Management',
    shape: 'droplet',
    color: '#3B82F6',
    expression: 'attentive',
    lastAction: 'Responded in 3 threads, with updates.',
    time: '11:18 AM',
    description: 'Coordinates automated actions, execution threads, and workflow scheduling across workspaces.',
  },
  // 3. Inbox Manager
  {
    id: 'fundamentals_analyst',
    name: 'Inbox Manager',
    role: 'Financials & Intrinsic Value',
    group: 'Analysts',
    shape: 'cloud',
    color: '#10B981',
    expression: 'attentive',
    lastAction: 'Inbox at zero. 2 replies ready.',
    time: '7:34 PM',
    description: 'Evaluates balance sheets, cash flows, P/E ratios, and SEC EDGAR filings to assess intrinsic company valuation.',
  },
  // 4. Sales Outbound
  {
    id: 'market_analyst',
    name: 'Sales Outbound',
    role: 'Technicals & Price Momentum',
    group: 'Analysts',
    shape: 'pebble',
    color: '#06B6D4',
    expression: 'attentive',
    lastAction: 'Outreach drafts queued for approval.',
    time: '11:18 AM',
    description: 'Monitors multi-timeframe moving averages, trend structure, RSI, and breakout volume.',
  },
  // 5. Talent Scout (with blue unread dot indicator)
  {
    id: 'news_analyst',
    name: 'Talent Scout',
    role: 'Global Wire & Headlines',
    group: 'Analysts',
    shape: 'pebble',
    color: '#795548',
    expression: 'attentive',
    lastAction: 'Shortlist of 6 candidates reviewed.',
    time: '10:05 AM',
    unread: true,
    description: 'Continuously digests financial media, earnings call transcripts, and breaking global macro events.',
  },
  // 6. Growth Marketer
  {
    id: 'bull_researcher',
    name: 'Growth Marketer',
    role: 'Growth Catalyst Identification',
    group: 'Researchers',
    shape: 'droplet',
    color: '#F97316',
    expression: 'attentive',
    lastAction: 'A/B copy variants ready to review.',
    time: '9:04 AM',
    description: 'Builds aggressive upside thesis, revenue acceleration projections, and competitive advantage cases.',
  },
  // 7. Customer Support
  {
    id: 'sentiment_analyst',
    name: 'Customer Support',
    role: 'Social & Institutional Flow',
    group: 'Analysts',
    shape: 'capsule',
    color: '#EF4444',
    expression: 'attentive',
    lastAction: '12 tickets resolved, 2 escalated.',
    time: '2:20 PM',
    description: 'Measures options order flow, retail sentiment, and institutional positioning ratios.',
  },
  // 8. Expense Manager
  {
    id: 'conservative_risk',
    name: 'Expense Manager',
    role: 'Capital Preservation & Tail Hedge',
    group: 'Risk Management',
    shape: 'triangle',
    color: '#EC4899',
    expression: 'attentive',
    lastAction: 'Receipts coded – one needs approval.',
    time: 'Tuesday',
    description: 'Enforces drawdown constraints, tail-risk hedging, and protective stop-loss thresholds.',
  },
  // 9. Invoice Collector
  {
    id: 'trader_agent',
    name: 'Invoice Collector',
    role: 'Execution & Slippage Optimization',
    group: 'Execution',
    shape: 'squircle',
    color: '#6366F1',
    expression: 'attentive',
    lastAction: 'Pulled 9 invoices from vendors.',
    time: 'Yesterday',
    description: 'Translates portfolio decisions into TWAP/VWAP order routing to minimize market impact.',
  },
  // 10. Bear Researcher
  {
    id: 'bear_researcher',
    name: 'Bear Researcher',
    role: 'Downside Risk & Short Bias',
    group: 'Researchers',
    shape: 'triangle',
    color: '#DC2626',
    expression: 'angry',
    lastAction: 'China revenue slowdown & valuation risks flagged.',
    time: 'Yesterday',
    description: 'Stress-tests optimistic assumptions, highlights debt covenants, competition, and regulatory headwinds.',
  },
  // 11. Research Manager
  {
    id: 'research_manager',
    name: 'Research Manager',
    role: 'Bull/Bear Synthesis Lead',
    group: 'Management',
    shape: 'capsule',
    color: '#A855F7',
    expression: 'proud',
    lastAction: 'Synthesized debate: 65% Bull / 35% Bear consensus.',
    time: 'Monday',
    description: 'Facilitates rigorous debates between bull and bear researchers, weighting evidence to reach consensus.',
  },
  // 12. Aggressive Risk Debator
  {
    id: 'aggressive_risk',
    name: 'Aggressive Risk Debator',
    role: 'Alpha Maximization',
    group: 'Risk Management',
    shape: 'hexagon',
    color: '#EF4444',
    expression: 'excited',
    lastAction: 'Advocated unhedged 35% position on tech earnings.',
    time: 'Monday',
    description: 'Argues for maximum risk-adjusted upside and higher position sizing when catalysts align.',
  },
];

export const TAURIC_TRADING_AGENTS = INITIAL_TAURIC_AGENTS;

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
  allAgents = INITIAL_TAURIC_AGENTS,
  size = 32,
}: {
  agentIds?: string[];
  allAgents?: TradingAgentDef[];
  size?: number;
}) {
  // Resolve agents from agentIds in selection order
  const resolved = agentIds
    .map((id) => allAgents.find((a) => a.id === id))
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
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => onOpenAgentsSidebar?.()}
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentAgentId = searchParams.get('agentId');
  const currentGroupId = searchParams.get('groupId');

  const [workspaces, setWorkspaces] = useState<WorkspaceTeam[]>([
    { id: 'team-trading', name: 'Trading', agentCount: 12 },
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('team-trading');
  const [agents, setAgents] = useState<TradingAgentDef[]>(INITIAL_TAURIC_AGENTS);
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
    setAgents((prev) =>
      prev.map((a) => ({
        ...a,
        isAdmin: a.id === targetAgentId,
      })),
    );
  };

  // Pin / Unpin agent
  const handleTogglePin = (targetAgentId: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === targetAgentId ? { ...a, isPinned: !a.isPinned } : a)),
    );
  };

  // Delete agent
  const handleDeleteAgent = (targetAgentId: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== targetAgentId));
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
      {/* Top Header: Menu > Agents & New Team Button (No Trading Swarm, with Coss Button) */}
      <div className="p-3 border-b border-sidebar-border bg-sidebar shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-[13px]">
          <button
            type="button"
            onClick={onBackToMainSidebar}
            className="text-zinc-500 hover:text-zinc-950 transition-colors cursor-pointer outline-none focus:outline-none"
            title="Return to Menu"
          >
            Menu
          </button>
          <CaretRight className="size-3 text-zinc-400 shrink-0" />
          <span className="text-zinc-950 font-semibold">Agents</span>
        </div>

        {/* New Team Button using Coss / Kortix Button component */}
        <Button
          size="sm"
          onClick={() => setShowAddWorkspaceModal(true)}
          className="h-7 px-3 text-xs font-semibold rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 font-sans outline-none focus:outline-none focus-visible:outline-none ring-0"
        >
          <Plus className="size-3.5" />
          <span>New Team</span>
        </Button>
      </div>

      {/* Workspace Subheader Info: Trading ⌵ toggle on Left, 3-dots on Right */}
      <div className="px-3 py-2 bg-sidebar/50 border-b border-sidebar-border/60 flex items-center justify-between text-xs">
        {/* Workspace Collapse/Expand Toggle: Trading ⌵ */}
        <button
          type="button"
          onClick={() => setIsWorkspaceCollapsed((prev) => !prev)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900 hover:text-zinc-950 px-1.5 py-1 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer outline-none focus:outline-none"
          title={isWorkspaceCollapsed ? 'Expand workspace' : 'Collapse workspace'}
        >
          <span>{activeWorkspace.name}</span>
          {isWorkspaceCollapsed ? (
            <CaretRight className="size-3 text-zinc-500 shrink-0 transition-transform duration-150" />
          ) : (
            <CaretDown className="size-3 text-zinc-500 shrink-0 transition-transform duration-150" />
          )}
        </button>

        {/* Workspace 3-Dots Action: Switch, Rename, Create Group, Delete */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer outline-none focus:outline-none"
              title="Workspace options"
            >
              <DotsThree weight="bold" className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 p-1.5 rounded-2xl bg-white text-zinc-900 border border-zinc-200/90 shadow-xl font-sans z-50 animate-in fade-in zoom-in-95 duration-100"
          >
            <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => setActiveWorkspaceId(ws.id)}
                className={cn(
                  'flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer hover:bg-zinc-100 transition-colors',
                  ws.id === activeWorkspaceId && 'bg-zinc-100 font-semibold text-zinc-950',
                )}
              >
                <span>{ws.name}</span>
                {ws.id === activeWorkspaceId && <CheckCircle className="size-3.5 text-zinc-950" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="my-1 bg-zinc-100" />
            <DropdownMenuItem
              onClick={() => {
                setRenameValue(activeWorkspace.name);
                setShowRenameModal(true);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium hover:bg-zinc-100 cursor-pointer text-zinc-700 transition-colors"
            >
              <PencilSimple className="size-3.5 text-zinc-500" />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setShowCreateGroupModal(true);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium hover:bg-zinc-100 cursor-pointer text-zinc-700 transition-colors"
            >
              <Users className="size-3.5 text-zinc-500" />
              <span>Create Group</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (workspaces.length > 1) {
                  setWorkspaces((prev) => prev.filter((w) => w.id !== activeWorkspaceId));
                  setActiveWorkspaceId(workspaces[0].id);
                }
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium hover:bg-red-50 text-red-600 cursor-pointer transition-colors"
            >
              <Trash className="size-3.5 text-red-500" />
              <span className="text-red-600">Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Workspace Body with Sub-Dropdowns: Groups & Agents */}
      {!isWorkspaceCollapsed ? (
        <div className="flex-1 p-2 space-y-2 overflow-y-auto [scrollbar-width:thin]">
          {/* Sub-dropdown 1: ⌄ Groups */}
          <div>
            <button
              type="button"
              onClick={() => setIsGroupsCollapsed((prev) => !prev)}
              className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors rounded-lg cursor-pointer outline-none focus:outline-none"
            >
              <div className="flex items-center gap-1.5">
                {isGroupsCollapsed ? (
                  <CaretRight className="size-3 text-zinc-400" />
                ) : (
                  <CaretDown className="size-3 text-zinc-400" />
                )}
                <span className="text-[12px] font-medium tracking-tight">Groups</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-normal">{groups.length}</span>
            </button>

            {!isGroupsCollapsed && (
              <div className="space-y-1 mt-1">
                {groups.map((group) => {
                  const isSelected = currentGroupId === group.id;
                  return (
                    <div
                      key={group.id}
                      onClick={() => handleOpenGroupChat(group)}
                      className={cn(
                        'group relative flex items-center gap-3 px-3 py-2 rounded-2xl text-xs cursor-pointer transition-all border select-none',
                        isSelected
                          ? 'bg-zinc-100/90 text-zinc-950 font-medium border-transparent shadow-2xs'
                          : 'hover:bg-zinc-100/60 text-zinc-800 border-transparent',
                      )}
                    >
                      {/* 3-Bot Overlapping Avatars Cluster (Offsite crew style) */}
                      <OverlappingAvatars agentIds={group.agentIds} allAgents={agents} size={32} />

                      <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-medium text-[13px] truncate text-zinc-800 leading-tight">
                            {group.name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {group.isArchived && (
                              <Archive className="size-3 text-zinc-400 shrink-0" />
                            )}
                            <span className="text-[11px] font-normal text-zinc-400 shrink-0">
                              {group.time}
                            </span>

                            {/* 3-Dot Action Menu for Groups (Visible on hover) */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 rounded-md text-zinc-800 hover:text-zinc-950 hover:bg-zinc-200/80 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer shrink-0 outline-none focus:outline-none"
                                  title="Group Options"
                                >
                                  <DotsThreeVertical weight="bold" className="size-4 text-zinc-900" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                side="right"
                                className="w-44 p-1.5 rounded-2xl bg-white text-zinc-900 border border-zinc-200/90 shadow-xl font-sans z-50 animate-in fade-in zoom-in-95 duration-100"
                              >
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedGroupToEdit(group);
                                    setRenameGroupValue(group.name);
                                    setShowRenameGroupModal(true);
                                  }}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-100 cursor-pointer text-zinc-700 transition-colors"
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
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-100 cursor-pointer text-zinc-700 transition-colors"
                                >
                                  <Users className="size-4 text-zinc-500 shrink-0" />
                                  <span>Modify</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleArchiveGroup(group.id);
                                  }}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-100 cursor-pointer text-zinc-700 transition-colors"
                                >
                                  <Archive className="size-4 text-zinc-500 shrink-0" />
                                  <span>{group.isArchived ? 'Unarchive' : 'Archive'}</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="my-1 bg-zinc-100" />

                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteGroup(group.id);
                                  }}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-red-50 text-red-600 cursor-pointer transition-colors"
                                >
                                  <Trash className="size-4 text-red-500 shrink-0" />
                                  <span className="text-red-600 font-medium">Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[11.5px] text-zinc-400 truncate leading-snug flex-1">
                            {group.description || group.lastAction}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sub-dropdown 2: ⌄ Agents */}
          <div>
            <button
              type="button"
              onClick={() => setIsAgentsCollapsed((prev) => !prev)}
              className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors rounded-lg cursor-pointer outline-none focus:outline-none"
            >
              <div className="flex items-center gap-1.5">
                {isAgentsCollapsed ? (
                  <CaretRight className="size-3 text-zinc-400" />
                ) : (
                  <CaretDown className="size-3 text-zinc-400" />
                )}
                <span className="text-[12px] font-medium tracking-tight">Agents</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-normal">{sortedAgents.length}</span>
            </button>

            {!isAgentsCollapsed && (
              <div className="space-y-1 mt-1">
                {sortedAgents.map((bot) => {
                  const isSelected = currentAgentId === bot.id;
                  return (
                    <div
                      key={bot.id}
                      onClick={() => handleOpenAgentChat(bot)}
                      className={cn(
                        'group relative flex items-center gap-3 px-3 py-2 rounded-2xl text-xs cursor-pointer transition-all border select-none',
                        isSelected
                          ? 'bg-zinc-100/90 text-zinc-950 font-medium border-transparent shadow-2xs'
                          : 'hover:bg-zinc-100/60 text-zinc-800 border-transparent',
                      )}
                    >
                      {/* Bot Living Avatar */}
                      <BotAvatar
                        shape={bot.shape}
                        color={bot.color}
                        expression={bot.expression}
                        size={32}
                        isAnimated={true}
                      />

                      <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                        {/* Top Row: Name on Left (Light font), Time + Pin + 3-dots on Right */}
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-normal text-[13px] truncate text-zinc-800 leading-tight">
                            {bot.name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {bot.isPinned && (
                              <PushPin className="size-3 text-zinc-400 fill-zinc-400 shrink-0" />
                            )}
                            <span className="text-[11px] font-normal text-zinc-400">
                              {bot.time}
                            </span>

                            {/* 3-Dot Action Menu (Only visible on hover over this bot) */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 rounded-md text-zinc-800 hover:text-zinc-950 hover:bg-zinc-200/80 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer shrink-0 outline-none focus:outline-none"
                                  title="Agent Options"
                                >
                                  <DotsThreeVertical weight="bold" className="size-4 text-zinc-900" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                side="right"
                                className="w-48 p-1.5 rounded-2xl bg-[#141416] text-zinc-100 border border-zinc-800/90 shadow-2xl font-sans z-50 animate-in fade-in zoom-in-95 duration-100"
                              >
                                {/* Option 1: Make Admin (Yellow Shield + Text - Exact Image 1) */}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetAdmin(bot.id);
                                  }}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-zinc-800/80 cursor-pointer text-amber-400 transition-colors"
                                >
                                  <ShieldCheck className="size-4 text-amber-400 shrink-0" weight="bold" />
                                  <span className="text-amber-400 font-medium">Make Admin</span>
                                </DropdownMenuItem>

                                {/* Option 2: Edit Identity (Pencil) */}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditDrawer(bot);
                                  }}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-normal hover:bg-zinc-800/80 cursor-pointer text-zinc-100 transition-colors"
                                >
                                  <PencilSimple className="size-4 text-zinc-300 shrink-0" />
                                  <span className="text-zinc-100">Edit Identity</span>
                                </DropdownMenuItem>

                                {/* Option 3: Pin */}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePin(bot.id);
                                  }}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-normal hover:bg-zinc-800/80 cursor-pointer text-zinc-100 transition-colors"
                                >
                                  <PushPin className="size-4 text-zinc-300 shrink-0" />
                                  <span className="text-zinc-100">{bot.isPinned ? 'Unpin' : 'Pin'}</span>
                                </DropdownMenuItem>

                                {/* Option 4: Archive */}
                                <DropdownMenuItem
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-normal hover:bg-zinc-800/80 cursor-pointer text-zinc-100 transition-colors"
                                >
                                  <Archive className="size-4 text-zinc-300 shrink-0" />
                                  <span className="text-zinc-100">Archive</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="my-1 bg-zinc-800/80" />

                                {/* Option 5: Delete (Red - Exact Image 1) */}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAgent(bot.id);
                                  }}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-red-950/40 text-red-400 cursor-pointer transition-colors"
                                >
                                  <Trash className="size-4 text-red-400 shrink-0" />
                                  <span className="text-red-400 font-medium">Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Bottom Row: Status / Last action + optional unread blue dot */}
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[11.5px] text-zinc-400 truncate leading-snug flex-1">
                            {bot.lastAction}
                          </span>
                          {bot.unread && (
                            <span className="size-2 rounded-full bg-blue-500 shrink-0 ml-1.5" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center text-zinc-400 text-xs">
          <p className="font-medium text-zinc-600">Agents collapsed</p>
          <p className="text-[11px] text-zinc-400 mt-1">Click {activeWorkspace.name} above to show workspace</p>
        </div>
      )}

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
