# Project Memory

The durable, shared memory of the Tauric Trading Desk. This file is the index.
Keep entries short, dated and verifiable.

## Desk facts

- The roster is 12 agents in `kortix.yaml`: `portfolio_manager` (Chief of Staff,
  the only primary) and 11 `mode: subagent` specialists.
- Only the Chief has a session and a computer. Specialists run inside the
  Chief's session with `session: "same"`, no tools, no skills and no connectors.
- The Chief's prompt is `agents/portfolio-manager.md`.
- The operating contract is `skills/trading-desk/SKILL.md`.
- The risk policy is `skills/trading-desk/references/decision-schema.md`.
- The bops-to-Kortix map and the UI target are
  `skills/trading-desk/references/architecture.md`.
- `trading.agents` and `trading.agent_groups` are frozen legacy tables. Do not
  add reads or writes.
- No order, payment or external write runs without an explicit human approval.
- The journal is read-only for the desk until the journal audit lands.

## Watchlist

Add one line per instrument the desk follows. Keep the venue and the reason.

<!--
- EXMPL (example venue) — example only; replace with a real watchlist entry.
-->

## Decisions

Add one line per material decision. Link the session, not a copied transcript.

<!--
- YYYY-MM-DD — EXMPL — BUY/HOLD/SELL — one-line reason — session <id>
-->

## Sources and conventions

- Price and headline data must carry a source and an `as_of` timestamp.
- A brief older than one trading day cannot support an actionable decision.
- Never write secrets, account numbers or personal data here.
