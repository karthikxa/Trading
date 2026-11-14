# Desk protocol

The Chief of Staff is the only agent with a session. It runs the protocol below.
The specialists are functions inside that session, not teammates with their own
computers.

## One session, many lenses

| Layer | Runs where | Gets a computer? | Tools? |
| --- | --- | --- | --- |
| Chief of Staff (`portfolio_manager`) | Its own Kortix session | Yes, the session desktop | All |
| Eleven specialists | Inside the Chief's session, `session: "same"` | No | None |

`session: "same"` is an argument to the `agent` tool. It is a runtime decision
by the caller. No manifest field pins a subagent to the parent session. The
Chief's prompt must require it on every call, and this skill is the record of
that rule.

## Intake

Record these fields before gathering data:

- `instrument`: symbol and venue.
- `question`: the decision or analysis requested.
- `horizon`: intraday, swing, or position.
- `constraints`: account size, current exposure, risk budget, restrictions.
- `as_of`: the timestamp the answer must be true as of.

If `instrument` or `question` is missing, ask one short clarifying question. Do
not spend a run guessing.

## Gather

The Chief gathers and verifies the brief with its own tools. Every fact carries a
source and a timestamp. The brief has these sections:

```
INSTRUMENT
  symbol, venue, quote currency
AS OF
  ISO-8601 timestamp and timezone
PRICE
  last, prior close, day range, 52-week range, 1-year return
TREND
  20/50/200-day moving averages, RSI, MACD, volume trend, realised volatility
NEWS
  dated headlines with source and event
FUNDAMENTALS
  valuation, earnings, guidance, balance-sheet quality (when relevant)
MACRO
  policy rate, yields, volatility regime, next scheduled event (when relevant)
POSITION
  current exposure, average cost, available risk budget (when supplied)
GAPS
  every field that could not be verified
```

Never replace a missing field with a plausible number. Write `unknown`.

## Analyst calls

Use the four default analysts for a normal single-name decision. Add
`growth_analyst` or `macro_analyst` only when the question needs that lens.

Prompt template:

```
BRIEF
<the full brief>

QUESTION
<form one question: direction and horizon>

OUTPUT
Return only the JSON object in your output contract.
```

The call:

```json
{
  "description": "Technical read on EXMPL",
  "subagent_type": "technical_analyst",
  "session": "same",
  "prompt": "BRIEF\n...\n\nQUESTION\n...\n\nOUTPUT\n..."
}
```

Call one specialist at a time. The answer returns before the next call starts.
Do not batch calls and do not run them in parallel: `session: "same"` shares one
transcript, and out-of-order answers make the decision impossible to audit.

## Debate

Call `bull_researcher`, then `bear_researcher`, each with:

- the full brief;
- the analyst JSON objects;
- the draft direction, if one exists;
- the instruction to attack the weakest link, not to agree.

A researcher that returns a weak case is useful. Do not re-prompt it until it
agrees with the Chief.

## Decide

The Chief writes one decision. It is not an average of the signals. It must:

1. Name the fact that decides the direction.
2. Name the strongest opposing fact.
3. State what must be true for the decision to work.
4. Set confidence from the evidence, not from the number of BUY votes.
5. Set `HOLD` when the evidence is balanced, stale, or incomplete.

## Risk gate

Call `risk_manager` with:

- the draft decision;
- the proposed size or `size unknown`;
- the brief;
- the analyst and researcher JSON.

The gate returns `risk_score`, `critique` and `veto`.

- `veto: true` → the final decision is `HOLD`. The Chief may explain the veto;
  it may not override it.
- `risk_score` 60–79 → `HOLD` unless a person explicitly overrides in writing.
- `risk_score` 80–100 → `HOLD`; a concrete tail risk is a veto.
- A missing gate → `HOLD`. There is no ungated actionable decision.

## Execution plan

Only after the gate passes, and only when the user asks for execution guidance,
call `trader_agent` with the approved decision, the brief and the risk limits.
The trader returns a plan, never an order.

The plan must include:

- entry approach and staging;
- invalidation level;
- the condition that cancels the plan.

## Report

Return the decision JSON, then the short desk note. If the user asks for a
summary, call `ea` with the completed run. Report:

- the decision and the fact that decided it;
- the strongest opposing fact;
- the risk gate result;
- the invalidation;
- what would change the Chief's mind;
- what remains unknown.

## Approvals

- Before any order, payment, invoice, transfer or external write, ask the user
  in the session and wait for an explicit `yes`.
- A prior approval does not cover a new action.
- Silence, an emoji, or an inferred preference is not approval.
- A scheduled trigger may prepare a decision and ask. It never places an order.
- Connector-held calls wait up to `approvals.ttl` (four hours in this project).
  Approval runs the held call once; the Chief does not repeat it.

## Failure handling

| Failure | Action |
| --- | --- |
| Specialist returns prose, no JSON | Record the failure; continue without it. Do not invent its answer. |
| Specialist returns `HOLD` with `unknown` inputs | Treat it as evidence of missing data, not as a neutral vote. |
| Tool or connector unavailable | Say which one failed; continue with the evidence that exists. |
| Brief older than one trading day | `HOLD`. Name the stale field. |
| Contradictory data | Prefer the newer, higher-quality source and name the conflict. |
| Risk gate unavailable | `HOLD`. Do not ship an ungated decision. |
| User asks for an order | Ask for explicit approval, then use the execution surface. Never claim a fill without confirmation. |
| User asks for a summary only | Do not run the full protocol; summarize what exists. |

## Triggers

Two scheduled triggers reuse the Chief's long-lived session:

- `premarket-brief` at 13:00 UTC, Monday to Friday.
- `weekly-desk-review` at 21:00 UTC on Friday.

A reused session keeps the same computer, so the schedule wakes the desk the
person already talks to. A trigger that needs a fresh book starts with
`session: fresh`; that creates a new session and a new computer, and costs a new
sandbox. Do not switch a trigger to `fresh` without a reason.
