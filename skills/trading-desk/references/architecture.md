# Unified architecture: Kortix + bops + MausBot

This file records how the bops desk and OpenMausBot (MausBot) map onto Kortix,
what is native, what is a gap, and which surfaces survive. It is the reference
for the single roster.

The mapping ports concepts, not code. bops is FSL-1.1-ALv2; OpenMausBot is
Apache-2.0. No bops or OpenMausBot source is copied into this repository.

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

### Source of truth

| Concern | Owner |
| --- | --- |
| Agent identity, prompt, mode, grants, space | `kortix.yaml` |
| Launchability | `isLaunchableAgentName` in the API |
| Pins and favourites | Browser store |
| Runtime records | Database, scoped by `project_id` and `account_id` |
| Secrets | Kortix secrets |
| Durable desk memory | `memory/` |
| Product views | Markets, watchlist and journal routes |

Never bypass `isLaunchableAgentName`. It exists because of `INC-2026-09-15`.

## Three-way feature matrix

| Capability | bops | MausBot / OpenMausBot | Kortix primitive | Status | Where it lives here |
| --- | --- | --- | --- | --- | --- |
| Team context | Workspace | Channel, department or room | Kortix project; spaces behind `project_channels` | Native / WIP | One project: the Trading Desk |
| Agent | Bot | Bot, with its own model and instructions | Declared agent in `kortix.yaml` | Native | `agents.*` |
| Lead agent | Main bot | Chief of Staff | `mode: primary` + `default_agent` | Native | `portfolio_manager` |
| Specialist | Specialist bot | Teammate bot | `mode: subagent` + parent `subagents` list | Native | The eleven specialists |
| Group or room | Bot group | Group chat, room, department | Spaces group agents, but the flag is off; the Chief session is the group | Gap / Replaced | Chief session + `AgentsPage` subagent section |
| Chat or thread | Thread | Conversation or room transcript | Session + `SessionThread` | Native | `/projects/[id]/sessions/[sessionId]` |
| Shared computer | Shared computer | Cloud computer (Boat), Local VM, or own Mac | Session sandbox + `SessionDesktop` (Xvfb + XFCE + PulseAudio + voxl on 6901) | Native for the cloud desktop; local host is a gap | The Chief's session only |
| Watch or take over | Watch | Live preview, open desktop, take over | `SessionDesktop` control shield + Take over / Return control | Native | The Chief's session only |
| Cloud computer provider | Orgo | Boat | Kortix sandbox provider (Platinum reference) | Replaced | One sandbox per session; the desk uses one session |
| Local machine control | Mac-local tasks | Own Mac via Cua, Local VM | No Kortix primitive | Gap | Run in the session sandbox or an App; do not promise host-local execution |
| Model choice | Per-bot model | Per-bot model picker, switch mid-conversation | Model selector + manifest model | Native | Session model; the Chief owns the choice |
| Tools | Tools | Local CLI tools | Kortix tools, project tools and runtime tools | Native | `tools: all` on the Chief; `tools: none` on specialists |
| Skills or playbooks | Skills | Skills and playbooks | Project skills registry + per-agent `skills` grant | Native | `skills/trading-desk`; the Chief gets `all`, specialists `none` |
| Connected apps | Composio | Composio Sessions | Kortix connectors + `kortix connectors` CLI + per-agent `connectors` grant | Native | The Chief owns `connectors: all`; specialists get none |
| Credentials | Vault | Write-only app settings; keys stay on the harness | Kortix secrets + per-agent `secrets` grant | Native | `secrets: none` until a project tool needs one |
| Approvals | Approvals | Permission broker and inline approval cards | `permission`, connector `policies`, `approvals.ttl` | Native for connector calls; the human gate is protocol | `approvals.ttl: 4h`; the Chief asks before any order |
| Routines | Routines | Routines and automations | Triggers (`cron`, `every`, `webhook`, `event`) | Native | `premarket-brief`, `weekly-desk-review` |
| Slack, Teams, email, Telegram | Native channels | Slack through Composio; no native workspace channels | Channel connectors (`kortix_slack`, `kortix_teams`, `kortix_email`, `kortix_telegram`) | Native | Connect in the dashboard; no manifest roster |
| Discord | Native channel | No Discord channel | None | Gap | Do not claim Discord support |
| Voice and calls | Phone | TTS, spoken replies, calls, dictation | No Kortix primitive | Gap | Do not claim voice or phone support |
| Durable memory | Honcho | Memory topics and journal | Project `memory/` + session context | Native | `memory/MEMORY.md` |
| Journal | Desk journal | Bot journal | Journal product view; read-only for the desk | Partial | Keep the journal audit separate; do not edit rows |
| Apps | Your Apps | Connected apps marketplace | Kortix Apps (`apps:` map, `kortix apps deploy`) | Native | The Chief owns `apps: all` |
| Pins and unread | Pins | Pin, unread, hide, duplicate | Browser pins + session list | Native | Keep pins in the browser store; do not copy them into the manifest |
| Agent status | Bot status | Typing and activity chips | Session status + live transcript | Replaced | `SessionThread` status, not a custom roster status |
| Agent profile | Bot profile | Edit profile, preset bot | `AgentsPage` cover card + agent detail | Replaced | `/projects/[id]/customize/agents` |
| Team package | Team template | Markdown team import/export, org library | Project template + `kortix.yaml` | Partial | Import UI is a gap; declare the roster in the manifest |
| Fleet | Fleet | Fleet of desktops | Multi-project Kortix | Gap | Not part of this cut |
| MCP | MCP | Stdio MCP control plane | MCP connection surface; runtime capability gated | Partial | pi does not serve MCP servers; gate on `runtimeSupports` |
| Headless control | API | `openmausbot` CLI | `kortix` CLI + REST API | Native | `kortix validate`, `kortix agents ls` |
| Desktop shell | Web | Electron for macOS, Windows, Ubuntu | Web app + Electron shell | Native | The Kortix web app, and the Electron shell where installed |
| Agent access | Workspace roles | Bot access and Ask mode | IAM resource grants + per-agent grants | Native | Grants in `kortix.yaml` and IAM |
| Auto routing | Group lead | Room `Auto` + Jev decision model | Chief dispatch by protocol | Replaced | No LLM router; the Chief calls named specialists |
| Fake desktop shell | Custom panel | Computer panel | `SessionDesktop` | Replaced | `BotComputerPanel` is deleted; never build a second desktop |

## What is unified

The two products collapse into the same primitives:

- **bops workspace + MausBot channel/department -> one Kortix project.** Spaces
  stay behind `project_channels`; do not build a second grouping model.
- **bops bot + MausBot bot -> one declared agent.** The manifest owns identity,
  prompt, mode, grants and space.
- **bops main bot + MausBot Chief of Staff -> `portfolio_manager`.** One primary,
  one default, one picker entry.
- **bops bot group + MausBot group chat/room -> the Chief's session.** There is
  no separate group roster. The specialists are the subagent section of
  `AgentsPage`, and their answers appear in the Chief's transcript.
- **bops shared computer + MausBot cloud computer -> one session sandbox + one
  `SessionDesktop`.** Only the Chief gets it.
- **bops Vault + MausBot app settings -> Kortix secrets.** Write-only, scoped by
  grant, never in the manifest.
- **bops Composio + MausBot connected apps -> Kortix connectors.** The Chief
  holds the connector grant; specialists receive data in the prompt.
- **bops approvals + MausBot permission broker -> Kortix permission, policies
  and `approvals.ttl`, plus the desk's human gate.** No order, payment or
  external write runs on an inferred approval.
- **bops routines + MausBot routines -> Kortix triggers.** Both triggers reuse
  the Chief's session, so the schedule wakes the same computer.
- **Honcho + MausBot memory topics/journal -> project memory.** Durable facts go
  in `memory/`; the journal stays a product view.
- **bops Your Apps + MausBot apps -> Kortix Apps.** The Chief owns `apps: all`.
- **bops channels + MausBot chat contexts -> connectors and sessions.** Slack,
  Teams, email and Telegram are native. Discord and voice are not.
- **bops teams + MausBot team packages -> project template + manifest.** The
  one-click import UI is not built; declare the roster directly.

## What is not unified

- **Spaces.** Spaces are work in progress behind `project_channels`, off by
  default. Do not build the desk on spaces until the flag is on.
- **Local machine control.** bops has Mac-local tasks; MausBot can drive the
  user's own Mac or a Local VM. Kortix runs in a cloud sandbox. A task that must
  touch the host has no Kortix primitive.
- **Voice and phone.** MausBot has TTS, spoken replies, calls and dictation;
  bops has phone. Kortix has no voice or telephony primitive.
- **Discord.** Kortix has no Discord channel descriptor.
- **Team package import.** MausBot imports a Markdown team file and shares a
  department. Kortix has projects and manifests, not that import flow.
- **Fleet and org library.** MausBot has a fleet and organization templates.
  Kortix multi-project control exists, but there is no desk-level fleet surface.
- **MCP in a session.** The MCP connection surface exists. The pi harness does
  not list MCP servers, so gate any MCP control on `runtimeSupports` and do not
  promise MCP tools in a session.
- **Journal audit.** The journal is not production-ready. The Chief may read the
  journal view and keep durable notes in `memory/`; it must not edit journal
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
   never appear in the composer's agent picker, the mention menu's roster, or a
   second picker.
3. `AgentsPage` reads `config.agents` from the project detail query. Do not add
   a second roster query.
4. `SessionDesktop` is the only desktop surface. `BotComputerPanel` was a fake
   shell; the file and its usages are deleted.
5. Do not add a second agent picker, a second roster, a second group model, or a
   second computer panel. One roster, one session, one desktop.
6. `useVisibleAgents` is the roster hook. `use-trading-agents` and
   `trading.agents` are legacy; do not add reads or writes. Existing avatar
   metadata reads stay frozen.
7. The composer selector uses `composerSelectableAgents`, which applies the
   SDK's `isSelectableAgent` rule: no subagents, no hidden agents, no disabled
   agents. Do not bypass it with a custom list.

## Legacy freeze

These are frozen. Do not extend them:

- `trading.agents` and `trading.agent_groups` tables.
- `suna/packages/ui/src/workspace/sidebar/trading-agents-nav.tsx`.
- `suna/packages/ui/src/workspace/sidebar/use-trading-agents.ts`.

The six custom market components (`AgentProfileHub`, `AgentView`,
`BotComputerPanel`, `SwarmPanel`, `BotEditDrawer`, `BotAvatar`) are deleted. Do
not restore them.

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
6. Remove the `AgentProfileHub`, `AgentView`, `BotComputerPanel`,
   `SwarmPanel`, `BotEditDrawer` and `BotAvatar` usages and files. Do not delete
   Antigravity's uncommitted work; land the removal on the canonical branch after
   the replacement is verified.
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
10. The mention menu lists only primary agents; `@all` and group broadcasts are
    absent.
