'use client';

import { Button } from '../../primitives/button';
import Hint from '../../primitives/hint';
import { useTranslations } from '../../i18n';
import { useUiHostConfig } from '../../providers/ui-provider';
import { cn } from '../../lib/utils';
import type { Agent } from '@kortix/sdk/react';
import { capitalizeWords, isMyKortixAgentName, MY_KORTIX_DISPLAY_NAME } from '@kortix/shared';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { composerSelectableAgents } from './composer-agent-access';
import { BotAvatar } from '../../workspace/sidebar/bot-avatar';
import {
  OverlappingAvatars,
  type TradingAgentDef,
  useTradingAgents,
} from '../../workspace/sidebar/trading-agents-nav';
import {
  Command as CossCommand,
  CommandDialog,
  CommandDialogPopup,
  CommandDialogTrigger,
  CommandEmpty,
  CommandFooter,
  CommandInput as CossCommandInput,
  CommandItem as CossCommandItem,
  CommandList as CossCommandList,
  CommandPanel,
} from '../../primitives/coss-command';

const ArrowUpIcon = () => (
  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
);
const ArrowDownIcon = () => (
  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="m19 12-7 7-7-7" />
    <path d="M12 5v14" />
  </svg>
);
const CornerDownLeftIcon = () => (
  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 10 4 15 9 20" />
    <path d="M20 4v7a4 4 0 0 1-4 4H4" />
  </svg>
);

export const FeaturedAgentsContext = createContext<{
  label: string;
  restLabel: string;
  names: readonly string[];
} | null>(null);

export function formatCleanAgentName(name: string): string {
  if (!name) return 'Agent';
  const lower = name.toLowerCase().trim();
  if (lower === 'ea') return 'EA';
  if (lower === 'portfolio_manager' || lower === 'chief of staff') return 'Portfolio Manager';
  const clean = name.replace(/_/g, ' ');
  return isMyKortixAgentName(clean) ? MY_KORTIX_DISPLAY_NAME : capitalizeWords(clean);
}

function resolveDisplayedAgentName(primaryAgents: Agent[], selectedAgent: string | null) {
  const current = primaryAgents.find((a) => a.name === selectedAgent);
  return current?.name ?? selectedAgent ?? primaryAgents[0]?.name;
}

/** The label `AgentSelector` shows for a selection (null = nothing picked). Other surfaces that name the agent reuse it. */
export function agentDisplayLabel(agents: Agent[], selectedAgent: string | null): string {
  const name = resolveDisplayedAgentName(composerSelectableAgents(agents), selectedAgent);
  if (!name) return 'Agent';
  return formatCleanAgentName(name);
}

export function AgentSelector({
  agents,
  selectedAgent,
  onSelect,
  disabled = false,
  triggerLabelClassName,
  unavailableHint,
  open: controlledOpen,
  onOpenChange,
  compact = false,
}: {
  compact?: boolean;
  agents: Agent[];
  selectedAgent: string | null;
  onSelect: (agentName: string | null) => void;
  disabled?: boolean;
  triggerLabelClassName?: string;
  unavailableHint?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  appearance?: 'chip' | 'field';
}) {
  const [openCommand, setOpenCommand] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<string>(() => {
    if (selectedAgent) return selectedAgent;
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get('agentId');
      if (q) return q;
    }
    return 'portfolio_manager';
  });

  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

  const { data: serverAgents = [] } = useTradingAgents();

  const [agentOverrides, setAgentOverrides] = useState<Record<string, Partial<TradingAgentDef>>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kortix_trading_agent_overrides_v1');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  useEffect(() => {
    const handleOverrides = () => {
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('kortix_trading_agent_overrides_v1');
          if (saved) setAgentOverrides(JSON.parse(saved));
        } catch {}
      }
    };
    window.addEventListener('trading-agents-updated', handleOverrides);
    return () => window.removeEventListener('trading-agents-updated', handleOverrides);
  }, []);

  const mergedAgents = useMemo(() => {
    return serverAgents.map((bot) => ({
      ...bot,
      ...(agentOverrides[bot.id] || {}),
    }));
  }, [serverAgents, agentOverrides]);

  const [dynamicGroups, setDynamicGroups] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tauric_trading_groups_v1');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: 'offsite_crew',
        name: 'Offsite crew',
        description: 'Lead, Fundamentals, and Execution joint desk',
        agentIds: ['fundamentals_analyst', 'trader_agent', 'portfolio_manager'],
      },
    ];
  });

  // Sync with selectedAgent prop when parent updates it
  useEffect(() => {
    if (selectedAgent && selectedAgent !== selectedBotId) {
      setSelectedBotId(selectedAgent);
      setSelectedGroup(null);
    }
  }, [selectedAgent]);

  // Sync with URL query parameter & custom event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sp = new URLSearchParams(window.location.search);
    const urlAgent = sp.get('agentId');
    const urlGroup = sp.get('groupId');
    if (urlGroup) {
      const grp = dynamicGroups.find((g) => g.id === urlGroup);
      if (grp) {
        setSelectedGroup(grp);
      }
    } else if (urlAgent) {
      setSelectedBotId(urlAgent);
      setSelectedGroup(null);
    }

    const handleSwarmSelect = (e: any) => {
      const custom = e as CustomEvent;
      if (custom.detail?.isGroup) {
        setSelectedGroup(custom.detail);
      } else if (custom.detail?.id) {
        setSelectedBotId(custom.detail.id);
        setSelectedGroup(null);
      }
    };

    const handleGroupsUpdate = (e: any) => {
      const custom = e as CustomEvent;
      if (Array.isArray(custom.detail)) {
        setDynamicGroups(custom.detail);
      }
    };

    window.addEventListener('selected-swarm-agent', handleSwarmSelect);
    window.addEventListener('tauric-groups-updated', handleGroupsUpdate);
    return () => {
      window.removeEventListener('selected-swarm-agent', handleSwarmSelect);
      window.removeEventListener('tauric-groups-updated', handleGroupsUpdate);
    };
  }, []);

  const DEFAULT_SWARM_LEAD: TradingAgentDef = {
    id: 'portfolio_manager',
    name: 'Portfolio Manager',
    role: 'Capital Allocation & Lead',
    group: 'Execution',
    shape: 'circle',
    color: '#F97316',
    expression: 'attentive',
    status: 'idle',
    description: 'Lead Portfolio Manager and Workspace Administrator.',
    isAdmin: true,
  };

  const activeSwarmBot = useMemo(() => {
    const found = mergedAgents.find((b) => b.id === selectedBotId);
    if (found) {
      return {
        ...found,
        name: formatCleanAgentName(found.name || found.id),
      };
    }
    return {
      ...DEFAULT_SWARM_LEAD,
      ...(agentOverrides['portfolio_manager'] || {}),
    };
  }, [mergedAgents, selectedBotId, agentOverrides]);

  const flatAgentItems = useMemo(() => {
    return [
      {
        id: 'all_swarm',
        value: 'all',
        label: '@all (All Agents)',
        role: 'Broadcast to all 12 agents in workspace',
        shape: 'circle' as const,
        color: '#6366F1',
        expression: 'excited' as const,
      },
      ...dynamicGroups.map((g) => ({
        id: g.id,
        value: g.id,
        name: g.name,
        label: g.name,
        role: g.description || `${g.agentIds?.length || 3} agents in group`,
        agentIds: g.agentIds || ['fundamentals_analyst', 'trader_agent', 'portfolio_manager'],
        shape: 'circle' as const,
        color: '#10B981',
        expression: 'attentive' as const,
        isGroup: true,
      })),
      ...mergedAgents.map((bot) => ({
        id: bot.id,
        value: bot.id,
        name: formatCleanAgentName(bot.name || bot.id),
        label: formatCleanAgentName(bot.name || bot.id),
        role: bot.role,
        shape: bot.shape,
        color: bot.color,
        expression: bot.expression,
      })),
    ];
  }, [dynamicGroups, mergedAgents]);

  const handleCommandItemClick = (item: any) => {
    if (item.isGroup) {
      setSelectedGroup(item);
      onSelect(item.id);
    } else {
      setSelectedBotId(item.id);
      setSelectedGroup(null);
      onSelect(item.id);
    }

    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (item.isGroup) {
        sp.delete('agentId');
        sp.set('groupId', item.id);
      } else {
        sp.delete('groupId');
        sp.set('agentId', item.id);
      }
      window.history.pushState(null, '', `?${sp.toString()}`);
      window.dispatchEvent(
        new CustomEvent('selected-swarm-agent', {
          detail: {
            ...item,
            name: item.name || item.label || 'Portfolio Manager',
            isGroup: Boolean(item.isGroup),
          },
        }),
      );
    }
    setOpenCommand(false);
  };

  const isAll = selectedBotId === 'all_swarm' || selectedBotId === 'all';
  const groupDisplayName = selectedGroup
    ? selectedGroup.name || selectedGroup.label || 'Offsite crew'
    : null;
  const currentDisplayName =
    groupDisplayName || (isAll ? '@all (All Agents)' : formatCleanAgentName(activeSwarmBot.name));

  if (disabled) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled
        className="text-muted-foreground rounded-lg hit-area-y-3"
      >
        <span className={cn('max-w-[120px] truncate font-medium', triggerLabelClassName)}>
          {currentDisplayName}
        </span>
      </Button>
    );
  }

  return (
    <CommandDialog onOpenChange={setOpenCommand} open={openCommand}>
      <CommandDialogTrigger
        render={
          <button
            type="button"
            aria-label={
              selectedGroup
                ? `Selected group: ${groupDisplayName}`
                : `Selected agent: ${activeSwarmBot?.name || 'Portfolio Manager'}`
            }
            style={{ outline: 'none', boxShadow: 'none' }}
            className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-zinc-100 transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 select-none shadow-2xs"
          />
        }
      >
        <span
          className={cn(
            'truncate text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-tight font-sans tracking-normal max-w-[160px]',
            triggerLabelClassName,
          )}
        >
          {currentDisplayName}
        </span>
        <CaretDownIcon className="size-3 text-zinc-400 ml-0.5" />
      </CommandDialogTrigger>
      <CommandDialogPopup
        aria-label="Agents"
        className="outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl rounded-2xl"
      >
        <CossCommand items={flatAgentItems}>
          <CossCommandInput placeholder="Search agents..." />
          <CommandPanel className="p-2 max-h-[380px] overflow-y-auto overscroll-contain outline-none focus:outline-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-200/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            <CommandEmpty>No agents found.</CommandEmpty>
            <CossCommandList>
              {(item: any) => {
                const isCurrent = selectedGroup
                  ? selectedGroup.id === item.id
                  : selectedBotId === item.id;
                return (
                  <CossCommandItem
                    key={item.value}
                    onClick={() => handleCommandItemClick(item)}
                    value={item.value}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors outline-none focus:outline-none select-none',
                      isCurrent && 'bg-zinc-100/90 dark:bg-zinc-800/80',
                    )}
                  >
                    {item.isGroup ? (
                      <OverlappingAvatars agentIds={item.agentIds} size={26} />
                    ) : (
                      <BotAvatar
                        shape={item.shape}
                        color={item.color}
                        expression={item.expression}
                        size={26}
                        isAnimated={true}
                      />
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-tight font-sans tracking-normal">
                        {formatCleanAgentName(item.label || item.name)}
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5 font-sans">
                        {item.role}
                      </span>
                    </div>
                    {isCurrent && (
                      <CheckIcon className="size-4 text-zinc-800 dark:text-zinc-200 shrink-0 ml-auto" />
                    )}
                  </CossCommandItem>
                );
              }}
            </CossCommandList>
          </CommandPanel>
          <CommandFooter className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800 font-sans">
            <div className="flex items-center gap-4 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-mono text-[11px] leading-none">
                  <ArrowUpIcon />
                  <ArrowDownIcon />
                </span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">Navigate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-mono text-[11px] leading-none">
                  <CornerDownLeftIcon />
                </span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">Select</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <span className="text-[11px] font-mono font-medium text-zinc-700 dark:text-zinc-300 px-1 py-0.5 bg-zinc-200/60 dark:bg-zinc-800 rounded border border-zinc-300/60 dark:border-zinc-700 leading-none">
                Esc
              </span>
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">Close</span>
            </div>
          </CommandFooter>
        </CossCommand>
      </CommandDialogPopup>
    </CommandDialog>
  );
}
