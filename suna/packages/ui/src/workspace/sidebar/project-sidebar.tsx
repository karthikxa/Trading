'use client';

import { uiRoutes } from '../../lib/routes';
import { Button } from '../../primitives/button';
import Hint from '../../primitives/hint';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '../../primitives/sidebar';
import { NotificationBell } from '../../internal/notifications/notification-bell';
import { ComputerConnectModal } from '../../internal/tunnel/computer-connect';
import { ConnectMcpModal } from '../../internal/layout/connect-mcp-modal';
import { ProjectMcpNavItem } from './footer/project-mcp-nav';
import { ProjectComputerNavItem } from './footer/project-computer-nav';
import { ProjectManifestIssuesAlert } from './footer/project-manifest-issues-alert';
import { ProjectSandboxAlert } from './footer/project-sandbox-alert';
import { ProjectRepositoryDisconnectedAlert } from '../repository-disconnected';
import { CustomizeSidebarModal } from './customize-sidebar-modal';
import { NewAgentModalProvider } from '../../internal/layout/project-capability-nav';
import { ProjectMemoryNavItem } from './footer/project-memory-nav';
import { ProjectNavItems } from './project-nav-items';
import { ProjectSessionList } from './project-session-list';
import { ProjectSpacesNav } from './project-spaces-nav';
import { TradingAgentsSidebarNav, AgentsSidebarView } from './trading-agents-nav';
import { useIsCreatingProjectSession } from '../../internal/hooks/projects/new-session-guard';
import { useNewProjectSession } from '../../internal/hooks/projects/use-new-project-session';
import { useIsMobile } from '../../internal/hooks';
import { useTranslations } from '../../i18n';
import { cn } from '../../internal/lib/utils';
import { useBillingAccountId } from '../../internal/stores/billing-account-context';
import { useFeatureFlag } from '@kortix/sdk/react';
import { AppsModal } from '../../internal/apps-and-extensions/apps-modal';
import { useAppsModalStore } from '../../internal/stores/apps-modal-store';
import { ProjectChromeNavItem } from './footer/project-chrome-nav';
import {
  MagnifyingGlassIcon,
  NavigationArrowIcon,
  ChartLineUp,
  PushPin,
  ChatCircleDots,
  Sliders,
  HardDrives,
  AppWindow,
  PlugsConnectedIcon,
} from '@phosphor-icons/react';
import { UiLink as Link } from '../../providers/ui-provider';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { SidebarBalanceWarning } from './footer/project-balance-warning';
import { SidebarUpgradeButton } from './footer/project-upgrade-button';
import { SidebarGlyph as PanelLeft } from '../../icons/sidebar-toggle';
import { Close } from '../../icons/close';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const modSymbol = isMac ? '⌘' : 'Ctrl';

export function ProjectSidebar({
  projectId,
  menu,
  onOpenSearch,
}: {
  projectId: string;
  /**
   * Opens the host's search (apps/web: its command palette). Without it, the
   * header has no Search button.
   */
  onOpenSearch?: () => void;
  /**
   * The header's first control: who is signed in, the workspace, account
   * actions (apps/web passes `WorkspaceSwitcher`). Without it, the header
   * shows only the sidebar's own buttons.
   */
  menu?: ReactNode;
}) {
  const tI18nComplete = useTranslations('hardcodedUi.i18nComplete');
  const t = useTranslations('sidebar');
  const tCommon = useTranslations('common');
  const { state, setOpenMobile, toggleSidebar, peek } = useSidebar();
  const isExpanded = state === 'expanded';
  const isMobile = useIsMobile();
  const sessionsGroupRef = useRef<HTMLDivElement>(null);
  // Mounted outside <Sidebar>: the mobile sheet unmounts its content on close.
  const [computerConnectOpen, setComputerConnectOpen] = useState(false);
  const [connectMcpOpen, setConnectMcpOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'main' | 'agents'>('main');
  const [isPinned, setIsPinned] = useState(true);

  const accountId = useBillingAccountId();
  // Channels replace New session and the session list (fail-closed: off until the project answers).
  const channels = useFeatureFlag(projectId, 'project_channels').enabled;
  const chrome = useFeatureFlag(projectId, 'chrome').enabled;

  // Open the project composer without creating a durable session.
  const newSession = useNewProjectSession(projectId);
  const creatingSession = useIsCreatingProjectSession(projectId);
  // Cmd+J only. The row itself is an anchor (below), so the keyboard path is
  // the one entry point left that has to ask the hook to navigate.
  const handleNewSession = useCallback(() => {
    newSession();
    if (isMobile) setOpenMobile(false);
  }, [newSession, isMobile, setOpenMobile]);
  // The anchor performs the navigation; this keeps the row's one side effect.
  const handleNewSessionClick = useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);
  // Shared by the row's anchor and its creating-session state, which stays a
  // real <button> so `disabled` still holds. The shortcut hint is desktop
  // only: a phone has no keyboard, and the tap's sticky hover revealed the
  // hint anyway (KRTX-2005).
  const newSessionRowBody = (
    <>
      <span className="shrink-0">
        <NavigationArrowIcon className="rotate-90" />
      </span>
      <span>{t('newSession')}</span>
    </>
  );

  // Mobile: the sidebar is a Sheet, so leaving it open would stack the palette
  // dialog on top of it. Dismiss it first — same order as opening a new
  // session from here.
  const handleOpenSearch = useCallback(() => {
    if (isMobile) setOpenMobile(false);
    onOpenSearch?.();
  }, [isMobile, setOpenMobile, onOpenSearch]);

  useEffect(() => {
    if (channels) return;
    const handler = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        (event.key === 'j' || event.key === 'J')
      ) {
        event.preventDefault();
        handleNewSession();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [channels, handleNewSession]);

  return (
    // The New agent modal mounts beside <Sidebar>, outside the mobile sheet.
    <NewAgentModalProvider projectId={projectId}>
      <Sidebar
        collapsible={isPinned ? 'none' : 'offcanvas'}
        variant="inset"
        // No background here. This className lands on the sidebar CONTAINER —
        // the square positioning box — while the visible card is the rounded
        // inner box, which already carries `bg-sidebar`. Painting it twice put a
        // square fill behind the flyout card and it showed at all four corners.
        className="[scrollbar-width:'none'] [-ms-overflow-style:'none'] [&::-webkit-scrollbar]:hidden"
      >
        {sidebarMode === 'agents' ? (
          <AgentsSidebarView
            projectId={projectId}
            onBackToMainSidebar={() => setSidebarMode('main')}
          />
        ) : (
          <>
            <SidebarHeader
              className="kx-project-sidebar-header space-y-2"
              data-peek={peek ? '' : undefined}
            >
              <div
                className={cn(
                  'flex w-full items-center gap-1',
                  !peek && 'kx-titlebar-row kx-titlebar-band-height kx-project-sidebar-titlebar',
                )}
              >
                {menu ? <div className="min-w-0">{menu}</div> : null}
                <div className="ml-auto flex shrink-0 items-center gap-0.5">
                  <NotificationBell
                    projectId={projectId}
                    surface="bg-sidebar"
                    onNavigate={() => {
                      if (isMobile) setOpenMobile(false);
                    }}
                  />
                  {isMobile && (
                    <Button
                      type="button"
                      aria-label={tCommon('close')}
                      variant="ghost"
                      size="icon"
                      onClick={() => setOpenMobile(false)}
                      className="shrink-0 hit-area-y-3"
                    >
                      <Close />
                    </Button>
                  )}
                  {/* Desktop fixed/collapsible pin toggle */}
                  {!isMobile && !peek && (
                    <Hint
                      side="bottom"
                      label={
                        <span className="flex items-center gap-1.5">
                          {isPinned ? 'Sidebar: Fixed (click to make collapsible)' : 'Sidebar: Collapsible (click to pin)'}
                        </span>
                      }
                    >
                      <Button
                        type="button"
                        aria-label={isPinned ? 'Fixed' : 'Collapsible'}
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsPinned((prev) => !prev)}
                        className={cn('shrink-0 cursor-pointer', isPinned ? 'text-zinc-950 font-bold' : 'text-zinc-400')}
                      >
                        <PanelLeft className="cn-rtl-flip" />
                      </Button>
                    </Hint>
                  )}
                </div>
              </div>
            </SidebarHeader>
            {/* One icon lane for every row (Jay, 2026-10-12). Session rows inset
          their status mark by `px-2`; the menu-button recipe insets by
          `px-3`, which put the nav and footer icons ~3.7px right of the
          session marks. `pl-2` here puts every icon at the same x, and its
          centre on the workspace avatar's centre in the header above
          (header `p-2` + switcher `px-1` + half of the `size-6` tile). Left
          side only: right padding still clears trailing badges. */}
            <SidebarContent className="relative min-h-0 flex-1 [scrollbar-width:'none'] overflow-hidden [-ms-overflow-style:'none'] [&::-webkit-scrollbar]:hidden [&_[data-sidebar=menu-button]]:pl-2">
              <div className="flex h-full min-h-0 flex-col space-y-2">
                <SidebarGroup className="py-0">
                  <SidebarMenu>
                    {/* Dedicated Search stocks menu item above New session */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={handleOpenSearch}
                        className="group/menu-button text-sidebar-foreground relative cursor-pointer"
                      >
                        <span className="shrink-0">
                          <MagnifyingGlassIcon className="size-4" />
                        </span>
                        <span>Search stocks</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {channels ? null : (
                      <SidebarMenuItem>
                        {creatingSession ? (
                          <SidebarMenuButton
                            disabled
                            aria-busy
                            className="group/menu-button text-sidebar-foreground relative"
                          >
                            {newSessionRowBody}
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton
                            asChild
                            className="group/menu-button text-sidebar-foreground relative"
                          >
                            <Link href={uiRoutes().project(projectId)} prefetch onClick={handleNewSessionClick}>
                              {newSessionRowBody}
                            </Link>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    )}

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className="group/menu-button text-sidebar-foreground relative"
                      >
                        <Link href={`/projects/${projectId}?tab=overview`}>
                          <span className="shrink-0">
                            <ChartLineUp className="size-4" />
                          </span>
                          <span>Overview</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className="group/menu-button text-sidebar-foreground relative"
                      >
                        <Link href={`/projects/${projectId}?tab=watchlist`}>
                          <span className="shrink-0">
                            <PushPin className="size-4" />
                          </span>
                          <span>Watchlist</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* TauricResearch / TradingAgents Multi-Agent Team */}
                    <TradingAgentsSidebarNav
                      projectId={projectId}
                      onOpenAgentsSidebar={() => setSidebarMode('agents')}
                    />

              {/* Connectors (Gmail, GitHub, Slack, Notion, Google Drive, Composio) */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="group/menu-button text-sidebar-foreground relative cursor-pointer"
                >
                  <Link href={`/projects/${projectId}/admin/connectors`}>
                    <span className="shrink-0">
                      <PlugsConnectedIcon className="size-4" />
                    </span>
                    <span>Connectors</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

                    {/* Customize */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className="group/menu-button text-sidebar-foreground relative"
                      >
                        <Link href={`/projects/${projectId}/customize/agents`}>
                          <span className="shrink-0">
                            <Sliders className="size-4" />
                          </span>
                          <span>Customize</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Drive */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className="group/menu-button text-sidebar-foreground relative"
                      >
                        <Link href={`/projects/${projectId}/drive`}>
                          <span className="shrink-0">
                            <HardDrives className="size-4" />
                          </span>
                          <span>Drive</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Apps */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className="group/menu-button text-sidebar-foreground relative"
                      >
                        <Link
                          href={`/projects/${projectId}/apps`}
                          onClick={() => {
                            useAppsModalStore.getState().openAppsModal();
                          }}
                        >
                          <span className="shrink-0">
                            <AppWindow className="size-4" />
                          </span>
                          <span>Apps</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Channels on: the Company memory, the first row under the new-thread slot. */}
                    {channels ? <ProjectMemoryNavItem projectId={projectId} /> : null}
                  </SidebarMenu>
                </SidebarGroup>

                <SidebarGroup className="min-h-0 flex-1 flex-col py-0" ref={sessionsGroupRef}>
                  {channels ? (
                    <ProjectSpacesNav projectId={projectId} />
                  ) : (
                    <ProjectSessionList projectId={projectId} />
                  )}
                </SidebarGroup>

                <SidebarGroup className="mt-auto">
                  <SidebarMenu className="gap-1">
                    {/* Status only, then the two connect rows (Jay, 2026-10-12).
                  Navigation lives in the top group. The ChatGPT connect row
                  left the sidebar: it stays in Settings → Connected. */}
                    <ProjectRepositoryDisconnectedAlert projectId={projectId} />
                    <ProjectSandboxAlert projectId={projectId} />
                    <ProjectManifestIssuesAlert projectId={projectId} />
                    <SidebarBalanceWarning accountId={accountId} />
                    {/* Connect MCP over Connect your computer: one block, 1px seam,
                  inner corners rounded-sm. Either row can be absent (dismissed,
                  or a paired computer), so the corners come from the siblings
                  that render and an empty block collapses. A plain <li>, not
                  SidebarMenuItem: its `group/menu-item` would make hovering one
                  row light up the other row's badge and dismiss. */}
                    <li className="not-has-[li]:hidden">
                      <SidebarMenu className="gap-px [&>li:not(:first-child)>[data-sidebar=menu-button]]:rounded-t-sm [&>li:not(:last-child)>[data-sidebar=menu-button]]:rounded-b-sm">
                        <ProjectMcpNavItem onOpenConnect={() => setConnectMcpOpen(true)} />
                        <ProjectComputerNavItem
                          projectId={projectId}
                          onOpenConnect={() => setComputerConnectOpen(true)}
                        />
                        {chrome ? (
                          <ProjectChromeNavItem onOpenConnect={() => useAppsModalStore.getState().setOpen(true)} />
                        ) : null}
                      </SidebarMenu>
                    </li>
                    {/* Last (Jay, 2026-09-03). It is the only paid call to action in
                  this group, and above the nav rows it put a sell between the
                  user and the links they actually use. */}
                    <SidebarUpgradeButton accountId={accountId} />
                  </SidebarMenu>
                </SidebarGroup>
              </div>
            </SidebarContent>

            <SidebarRail aria-label={t('resize')} title={t('resizeHelp')} />
          </>
        )}
      </Sidebar>
      <ComputerConnectModal
        projectId={projectId}
        open={computerConnectOpen}
        onOpenChange={setComputerConnectOpen}
      />
      <AppsModal
        chrome={chrome}
        onOpenComputer={() => setComputerConnectOpen(true)}
        onOpenMcp={() => setConnectMcpOpen(true)}
      />
      <ConnectMcpModal open={connectMcpOpen} onOpenChange={setConnectMcpOpen} />
      <CustomizeSidebarModal projectId={projectId} />
    </NewAgentModalProvider>
  );
}
