# bops to Kortix architecture map

This file records how the bops desk maps onto Kortix, what is native, what is a
gap, and which UI surfaces survive. It is the reference for the single roster.

## The model

One roster:

- `portfolio_manager` is the Chief of Staff. It is the only `mode: primary`
  agent, the `default_agent`, and the only agent with a session and a computer.
- The other eleven agents are `mode: subagent`. The Chief calls them with
  `session: "same"`. They have `tools: none`, `skills: none`, `connectors:
  none`, `apps: none`, `secrets: none` and no `sandbox`.
- `builtin_agents.my_kortix` is `false`. There is no second assistant in the
  picker.
- `kortix.yaml` is the runtime source of truth for identity, prompt, mode,
  grants and space. The browser owns pins. The database owns runtime records
  scoped by `project_id` and `account_id`.

The specialists do not get individual computers, skills or surfaces. Their only
surface is the Chief's session, where their JSON answer appears in the
transcript.

## Feature matrix

| bops feature | Kortix primitive | Status | Where it lives here |
| --- | --- | --- | --- |
| Main bot | Declared primary agent | Native | `agents.portfolio_manager` |
| Specialist bot | Declared `mode: subagent` agent, called with `session: "same"` | Native | The eleven `agents.*` blocks |
| Bot group / team | No direct equivalent. Spaces group agents, but `project_channels` is off by default. | Gap | Use the agents page's primary and subagent sections; do not add a second group model |
| Workspace | Kortix project + repository checkout | Native | `project`, `workspace: { project_repository: true }` |
| Thread / chat | Kortix session + `SessionThread` | Native | `/projects/[id]/sessions/[sessionId]` |
| Shared computer | Session sandbox + `SessionDesktop` (Xvfb + XFCE + PulseAudio + voxl on 6901) | Native | The Chief's session only |
| Watch / take over | `SessionDesktop` control shield + Take over / Return control | Native | The Chief's session only |
| Cloud computer (Orgo) | Kortix sandbox provider (Platinum reference) | Replaced | One sandbox per session; the desk uses one session |
| Memory | Project `memory/` + session context | Native | `memory/MEMORY.md` |
| Honcho memory | Kortix project memory | Replaced | `memory/` |
| Vault | Kortix secrets + per-agent `secrets` grant | Native | `secrets: none` until a project tool needs one |
| Composio apps | Kortix connectors + `kortix connectors` CLI + per-agent `connectors` grant | Native | The Chief owns `connectors: all`; specialists get none |
| Tools | Kortix tools, project tools (`tools:`) and runtime tools | Native | `tools: all` on the Chief; `tools: none` on specialists |
| Skills | Project skills (`skills:` registry) + per-agent `skills` grant | Native | `skills/trading-desk`; the Chief gets `all`, specialists `none` |
| Approvals | `permission`, connector `policies`, `approvals.ttl` | Native for connector calls; the human gate is protocol | `approvals.ttl: 4h`; the Chief asks before any order |
| Routines | Triggers (`cron`, `every`, `webhook`, `event`) | Native | `premarket-brief`, `weekly-desk-review` |
| Slack, Teams, email, Telegram | Channel connectors (`kortix_slack`, `kortix_teams`, `kortix_email`, `kortix_telegram`) | Native | Connect in the dashboard; no manifest roster |
| Discord | No Kortix channel descriptor | Gap | Do not claim Discord support |
| Phone / voice | No Kortix channel descriptor | Gap | Do not claim phone support |
| Your Apps | Kortix Apps (`apps:` map, `kortix apps deploy`) | Native | The Chief owns `apps: all` |
| Mac-local tasks | No Kortix equivalent | Gap | Run in the session sandbox or an App; do not promise host-local execution |
| Bot pins / favourites | Browser pins | Native | Keep pins in the browser store; do not copy them into the manifest |
| Bot status / "typing" | Session status + live transcript | Replaced | `SessionThread` status, not a custom roster status |
| Bot profile page | `AgentsPage` cover card + agent detail | Replaced | `/projects/[id]/customize/agents` |
| Fake desktop shell | `SessionDesktop` | Replaced | Delete `BotComputerPanel` usage; never build a second desktop |

## What is not unified

- **Channels.** Kortix supports Slack, Teams, email and Telegram. bops also has
  Discord and phone/voice. Do not advertise the missing two.
- **Spaces.** Spaces are work in progress behind `project_channels`, off by
  default. Do not build the desk on spaces until the flag is on.
- **Mac-local tasks.** Kortix runs in a cloud sandbox. A task that must touch
  the user's Mac has no Kortix primitive.
- **Journal audit.** The journal is not production-ready. The Chief may read
  the journal view and keep durable notes in `memory/`; it must not edit journal
  rows. This is separate work.

## UI target

One project surface, built from `@kortix/ui`:

| Screen | Component | Rule |
| --- | --- | --- |
| Project home | `ProjectHome` | The only composer. It starts `portfolio_manager` by default; My Kortix is off. |
| Session | `SessionChat` + `SessionDesktop` | The only chat and the only computer. `SessionChat` mounts the real desktop panel. |
| Agents | `AgentsPage` | The only roster. The Chief is the primary cover card; the eleven specialists are the subagent section. |
| Sidebar | `ProjectSidebar` | Sessions, Customize, connectors, computer. No `TradingAgentsNav`. |
| Markets, watchlist, journal | Existing product pages | Keep them as product pages, not agent surfaces. They do not get computers or agent profiles. |

Rules:

1. Use `@kortix/ui` primitives and screens first. Use a coss component only when
   no Kortix primitive covers the control. Wrap it in Kortix tokens; never fork a
   Kortix component.
2. `ProjectHome` already filters to primary agents. The eleven subagents must
   never appear in the composer's agent picker.
3. `AgentsPage` reads `config.agents` from the project detail query. Do not add
   a second roster query.
4. `SessionDesktop` is the only desktop surface. `BotComputerPanel` is a fake
   shell; remove it from the project page.
5. Do not add a second agent picker, a second roster, or a second computer
   panel. One roster, one session, one desktop.
6. `useVisibleAgents` is the roster hook. `use-trading-agents` and
   `trading.agents` are legacy; do not add reads or writes.

## Legacy freeze

These are frozen. Do not extend them:

- `trading.agents` and `trading.agent_groups` tables.
- `suna/packages/ui/src/workspace/sidebar/trading-agents-nav.tsx`.
- `suna/packages/ui/src/workspace/sidebar/use-trading-agents.ts`.
- `suna/apps/web/src/features/markets/AgentProfileHub.tsx`.
- `suna/apps/web/src/features/markets/AgentView.tsx`.
- `suna/apps/web/src/features/markets/BotComputerPanel.tsx`.
- `suna/apps/web/src/features/markets/SwarmPanel.tsx`.

Reads and writes move to the manifest and the Kortix session surfaces. Keep the
tables for one release, then drop them in a separate migration. Do not delete a
row in the disputed journal set as part of this work.

`swarm.ts` remains the existing backend pipeline. Do not reimplement it as bops
code and do not route the new UI through it. The Chief's subagent protocol
replaces the orchestration surface; the persisted swarm decision table stays
until a separate migration retires it.

## Migration order

1. Land `kortix.yaml`, `agents/*.md`, `skills/trading-desk/` and `memory/`.
2. Validate the manifest. The 12 agents must load, one primary and eleven
   subagents.
3. Confirm `isLaunchableAgentName` returns true only for `portfolio_manager`.
4. Point the project page at `ProjectHome` + the Kortix session route. Move
   markets, watchlist and journal to their own product routes or tabs.
5. Remove `TradingAgentsNav` from the sidebar and remove the
   `use-trading-agents` queries from the project page.
6. Remove the `AgentProfileHub`, `AgentView`, `BotComputerPanel` and
   `SwarmPanel` usages. Do not delete Antigravity's uncommitted work; land the
   removal on the canonical branch after the replacement is verified.
7. After one release with no reads, drop `trading.agents` and
   `trading.agent_groups` in a separate migration.

## Verification

Run these against the real surface, not just a typecheck:

1. `kortix validate` accepts `kortix.yaml`.
2. `kortix agents ls` shows 12 agents: 1 primary (`portfolio_manager`) and 11
   subagents.
3. The project home composer lists only the Chief.
4. The agents page shows the Chief first, then the eleven subagents.
5. A real session on `portfolio_manager` runs one decision. Each specialist call
   has `session: "same"`, and no new session or desktop appears.
6. `SessionDesktop` shows the Chief's screen. No specialist has a screen.
7. A trigger fires into the reused Chief session and does not boot a second
   computer.
8. A direct session create with `technical_analyst` is rejected by
   `isLaunchableAgentName`.
9. The old `trading.agents` roster is not queried by the project page.
