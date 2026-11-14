---
name: trading-desk
description: "Run the Tauric Trading Desk: one Chief of Staff with the only session and computer, eleven specialists called with session: same, one decision schema, one risk policy. Use when configuring, auditing or operating the desk roster, the specialist protocol, the risk gate, the triggers, or the migration from the legacy trading.agents roster."
---

# Trading desk

This skill is the operating contract for the Trading project's agent roster. The
manifest is the runtime source of truth; this skill explains how the roster
works and how to change it safely.

## Hard rules

1. **One roster.** `kortix.yaml` declares twelve agents. `portfolio_manager` is
   the only `mode: primary`; the other eleven are `mode: subagent`.
2. **One computer.** Only the Chief has a session and a desktop. A specialist
   never gets its own session, sandbox, desktop, skill or surface.
3. **`session: "same"` on every specialist call.** It is an argument to the
   `agent` tool, not a manifest grant. Never use `session: "separate"` and never
   run `kortix sessions new` for a specialist.
4. **Specialists have no tools.** `tools: none`, `skills: none`, `connectors:
   none`, `apps: none`, `secrets: none`. The Chief passes the full brief in the
   prompt.
5. **The risk gate is mandatory.** No actionable BUY or SELL without
   `risk_manager`. A veto means HOLD. A missing gate means HOLD.
6. **No execution without explicit human approval.** A trigger may prepare a
   decision; it never places an order.
7. **Do not extend the legacy roster.** `trading.agents`, `trading.agent_groups`,
   `use-trading-agents` and `trading-agents-nav` are frozen. Do not add reads or
   writes.
8. **Never bypass `isLaunchableAgentName`.** Only a declared, enabled,
   non-subagent agent is launchable. That rule exists because of
   `INC-2026-09-15`.
9. **No secrets or PII in the manifest, prompts, memory or commits.** Store
   values with Kortix secrets. Use the class, not the customer.

## Roster

| Agent | Mode | Role |
| --- | --- | --- |
| `portfolio_manager` | primary | Chief of Staff; the only session and computer |
| `technical_analyst` | subagent | Price, trend, momentum, volume, volatility |
| `fundamentals_analyst` | subagent | Valuation, earnings, business quality |
| `news_analyst` | subagent | Headlines and events |
| `sentiment_analyst` | subagent | Positioning and crowd behaviour |
| `growth_analyst` | subagent | Growth catalysts |
| `macro_analyst` | subagent | Rates and volatility regime |
| `bull_researcher` | subagent | Strongest honest long case |
| `bear_researcher` | subagent | Strongest honest short and risk case |
| `risk_manager` | subagent | Risk gate and veto |
| `trader_agent` | subagent | Execution plan, no order |
| `ea` | subagent | Desk note and summary |

## Protocol at a glance

1. Intake the instrument, question, horizon, constraints and `as_of`.
2. Gather the brief with sources and timestamps.
3. Call the default analysts, one at a time, with `session: "same"`.
4. Call `bull_researcher`, then `bear_researcher`.
5. Decide. Name the deciding fact and the strongest opposing fact.
6. Call `risk_manager`. A veto or a missing gate means HOLD.
7. Call `trader_agent` only after the gate passes and the user asks for
   execution guidance.
8. Report the decision JSON and the short desk note. Call `ea` for a summary.

The full protocol, prompt templates and failure handling are in
`references/desk-protocol.md`.

## References

| File | Use it for |
| --- | --- |
| `references/desk-protocol.md` | Intake, the brief, specialist calls, debate, risk gate, execution, failures |
| `references/decision-schema.md` | Every JSON schema, confidence and risk bands, risk policy, a worked example |
| `references/architecture.md` | bops-to-Kortix matrix, the one-computer model, the UI target, the legacy freeze, migration and verification |
| `references/operations.md` | Add or remove a specialist, add a connector, change the model or risk policy, validate, roll back |

## Triggers

- `premarket-brief`: 13:00 UTC, Monday to Friday, `session: reuse`.
- `weekly-desk-review`: 21:00 UTC, Friday, `session: reuse`.

A reused session keeps the Chief's computer. Do not switch a trigger to
`session: fresh` without a reason: a fresh session boots a new sandbox.

## Validate

Before you ship a manifest change:

```bash
kortix validate
kortix agents ls
```

`kortix validate` must report no errors. `kortix agents ls` must show one
primary and eleven subagents. Then run one real decision and confirm every
specialist call carries `session: "same"` and no second session appears.
