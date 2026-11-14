# Decision schema and risk policy

The Chief of Staff (`portfolio_manager`) is the only agent that returns a
committee decision. Every specialist returns one JSON object. This file is the
contract for both.

## Specialist outputs

| Agent | Schema |
| --- | --- |
| `technical_analyst` | `{"signal":"BUY"\|"SELL"\|"HOLD","confidence":0-100,"note":"<= 40 words"}` |
| `fundamentals_analyst` | `{"signal":"BUY"\|"SELL"\|"HOLD","confidence":0-100,"note":"<= 40 words"}` |
| `news_analyst` | `{"signal":"BUY"\|"SELL"\|"HOLD","confidence":0-100,"note":"<= 40 words"}` |
| `sentiment_analyst` | `{"signal":"BUY"\|"SELL"\|"HOLD","confidence":0-100,"note":"<= 40 words"}` |
| `growth_analyst` | `{"signal":"BUY"\|"SELL"\|"HOLD","confidence":0-100,"note":"<= 40 words"}` |
| `macro_analyst` | `{"signal":"BUY"\|"SELL"\|"HOLD","confidence":0-100,"note":"<= 40 words"}` |
| `bull_researcher` | `{"argument":"<= 70 words","confidence":0-100}` |
| `bear_researcher` | `{"argument":"<= 70 words","confidence":0-100}` |
| `risk_manager` | `{"risk_score":0-100,"critique":"<= 40 words","veto":true\|false}` |
| `trader_agent` | `{"plan":"<= 50 words"}` |
| `ea` | `{"summary":"<= 50 words"}` |

Rules:

- `confidence`, `risk_score` and `veto` are required. A missing required field
  makes the answer unusable.
- `confidence` is an integer from 0 to 100. Clamp a float to the nearest integer.
- A specialist that cannot answer returns `HOLD` with confidence `0` and names
  the missing input. It never invents a number.
- The Chief ignores prose around the JSON. If there is no JSON object, the call
  failed; record it and continue with the evidence that exists.

## Chief output

```json
{
  "decision": "BUY" | "SELL" | "HOLD",
  "confidence": 0,
  "reasoning": "<= 60 words",
  "risk_score": 0,
  "execution_note": "sizing and skew in <= 25 words",
  "veto": false,
  "specialists": [
    { "agent": "technical_analyst", "signal": "BUY", "confidence": 0 }
  ]
}
```

- `risk_score` and `veto` come from `risk_manager`. If the gate did not run, set
  `risk_score` to `null` and `veto` to `true`. An ungated BUY or SELL is HOLD.
- `decision` is `HOLD` when `veto` is `true`, when `confidence` is below 50, or
  when the brief is stale.
- `specialists` lists every call in order. Use `signal` for analysts, `argument`
  for researchers, `risk_score` and `veto` for the risk manager, `plan` for the
  trader and `summary` for EA.
- `execution_note` is guidance, not an order. It never claims a fill.

## Confidence bands

| Confidence | Meaning | Desk action |
| --- | --- | --- |
| 0–49 | Not defensible | `HOLD` |
| 50–69 | Weak edge | `HOLD`, or a paper trade with explicit approval |
| 70–84 | Normal edge | Actionable after the risk gate and approval |
| 85–100 | Strong edge | Actionable after the risk gate and approval |

Confidence never overrides a veto, stale data, or a missing invalidation.

## Risk score bands

| Risk score | Meaning | Desk action |
| --- | --- | --- |
| 0–29 | Low | Normal size within the risk budget |
| 30–59 | Moderate | Half size, or wait for a better entry |
| 60–79 | High | `HOLD` unless a person explicitly overrides in writing |
| 80–100 | Extreme | `HOLD`; veto when a concrete tail risk exists |

`veto: true` always means `HOLD`.

## Risk policy defaults

These are conservative defaults for the desk. Change them here and in
`agents/portfolio-manager.md` together. A change is a product decision, not an
agent decision.

1. **Per-trade risk** at most 1% of account equity, measured from entry to the
   invalidation level.
2. **Total open risk** at most 6% of account equity across all positions.
3. **Single position** at most 20% of account equity.
4. **Gross exposure** at most 200% of account equity. Leverage above 2x is not
   allowed.
5. **Concentration flag** when a position would exceed 20% of equity or 30% of
   gross exposure.
6. **Invalidation required.** Every actionable plan names the price or event
   that proves the thesis wrong.
7. **Stale data is HOLD.** A brief older than one trading day cannot support an
   actionable decision.
8. **No averaging down** into a losing thesis. Add only when the thesis is
   intact and the risk budget still allows it.
9. **Tail risk is a veto.** A halt, delisting, fraud, going-concern doubt, or a
   binary event the position cannot survive is a veto, not a lower score.
10. **No execution without explicit human approval.** A trigger may prepare a
    decision; it never places an order.

## Worked example

Synthetic data. `EXMPL` is a fictional instrument; the numbers are illustrative.

Brief: `EXMPL` last 100.00, 20-day MA 98.40, 50-day MA 96.10, 200-day MA 91.80,
RSI 58, MACD positive, volume 1.2x the 20-day average, realised volatility 24%.
No material news. Fundamentals: 18x forward earnings, 12% earnings growth, net
cash. Macro: policy rate unchanged, volatility regime normal.

Calls, one at a time, each with `session: "same"`:

1. `technical_analyst` → `{"signal":"BUY","confidence":72,"note":"Uptrend intact; RSI 58 leaves room; volume confirms."}`
2. `fundamentals_analyst` → `{"signal":"BUY","confidence":66,"note":"18x for 12% growth with net cash is reasonable, not cheap."}`
3. `news_analyst` → `{"signal":"HOLD","confidence":55,"note":"No material news."}`
4. `sentiment_analyst` → `{"signal":"HOLD","confidence":52,"note":"No positioning extreme; tape is orderly."}`
5. `bull_researcher` → `{"argument":"Trend, volume and balance sheet align; a break above 102 opens the prior high.","confidence":68}`
6. `bear_researcher` → `{"argument":"Valuation is fair, not cheap; a loss of the 50-day MA at 96.10 breaks the trend.","confidence":60}`
7. `risk_manager` → `{"risk_score":38,"critique":"Moderate volatility; a 4% stop to 96.10 keeps per-trade risk inside 1%.","veto":false}`
8. `trader_agent` → `{"plan":"Stage two entries: 101.00 and 102.50. Invalidation 96.10. Cancel on a close below the 50-day MA."}`

Chief output:

```json
{
  "decision": "BUY",
  "confidence": 70,
  "reasoning": "Trend, volume and a net-cash balance sheet support the long case; valuation caps the size, not the direction.",
  "risk_score": 38,
  "execution_note": "Half size at 101.00, add at 102.50; invalidation 96.10.",
  "veto": false,
  "specialists": [
    { "agent": "technical_analyst", "signal": "BUY", "confidence": 72 },
    { "agent": "fundamentals_analyst", "signal": "BUY", "confidence": 66 },
    { "agent": "news_analyst", "signal": "HOLD", "confidence": 55 },
    { "agent": "sentiment_analyst", "signal": "HOLD", "confidence": 52 },
    { "agent": "bull_researcher", "argument": "Trend, volume and balance sheet align.", "confidence": 68 },
    { "agent": "bear_researcher", "argument": "Fair valuation; 96.10 is the trend break.", "confidence": 60 },
    { "agent": "risk_manager", "risk_score": 38, "veto": false },
    { "agent": "trader_agent", "plan": "Stage 101.00 and 102.50; invalidation 96.10." }
  ]
}
```

The Chief then asks the user for explicit approval before any order. The example
does not imply that an order was placed.
