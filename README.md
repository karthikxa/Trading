# Zed — AI Multi-Agent Trading Platform

<div align="center">

### Enterprise Multi-Agent Financial Intelligence Platform
**Bops Living Avatars · Kortix Session Engine · MausBot Specialist Trading Personas · FreeLLMAPI Auto-Routing**

[![Next.js](https://img.shields.io/badge/Next.js-16.4.2_Turbopack-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Model: Zed](https://img.shields.io/badge/Model-Zed_(Render_FreeLLMAPI)-purple)](https://server-llm-1.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

</div>

---

## 🚀 Overview

**Zed** is an autonomous multi-agent financial intelligence and execution platform. It unifies:
1. **Bops Living Visual Swarm**: Dynamic animated geometric avatars (`BotAvatar`), expressions, and cluster views (`OverlappingAvatars`).
2. **Kortix Unified SDK & Session Engine**: Durable session logs (`kortix.session/2`), reactive turn resolution, Zustand `useSyncStore`, and optimistic streaming.
3. **MausBot Specialist Personas**: 12 dedicated trading agents, each with unique analytical lenses (technical, fundamental, macro, sentiment, bull/bear research, risk management, execution).
4. **FreeLLMAPI Autonomous Multi-Model Gateway**: Zero-cost, high-reliability LLM routing aliased as model **`zed`** routing through `https://server-llm-1.onrender.com` (model: `auto`), with proxy endpoints in `/api/llm`.

---

## 🏛️ System Architecture

```
Trading/
├── suna/                                 # Kortix Multi-Agent Monorepo
│   ├── apps/
│   │   ├── web/                          # Next.js 16 Web Application (Port 3000)
│   │   │   ├── src/app/api/llm/route.ts  # Next.js LLM Proxy to server-llm-1.onrender.com
│   │   │   ├── src/features/journal/     # Trade Journal & Execution Logging
│   │   │   └── src/features/markets/     # Real-time Charting & Market Terminal
│   │   └── api/                          # Backend Trading Engine
│   │       └── src/trading/personas.ts   # System Prompts & Lens Templates
│   └── packages/
│       ├── sdk/                          # Unified Kortix SDK
│       │   └── src/core/http/transport.ts# Client transport, FreeLLM router & persona bridge
│       └── ui/                           # Coss Design System & Workspace Components
│           ├── src/session/composer/     # Rich Composer with BotAvatar & Agent Selector
│           └── src/workspace/sidebar/    # Grok-Style Agents Sidebar & Two-Way Sync
├── agents/                               # Markdown System Prompts for Specialists
│   ├── portfolio_manager.md              # Chief of Staff & Swarm Lead
│   ├── ea.md                             # Executive & Workflow Automation
│   ├── technical_analyst.md              # Technical Momentum & Structure
│   ├── fundamentals_analyst.md           # Valuation & Financials
│   └── ...                               # Additional analyst definitions
├── AGENT.md                              # Deep Antigravity Technical Guide & Context
└── README.md                             # This overview documentation
```

---

## 🤖 The 12 Specialist Desk Agents

Each agent has a tailored system instruction, visual identity, and dedicated role:

| Agent ID | Display Name | Visual Avatar | Role & Expertise |
|---|---|---|---|
| `portfolio_manager` | **Portfolio Manager** | Purple Circle `#8B5CF6` (Attentive) | **Chief of Staff & Swarm Lead**: Synthesizes committee debate into capital allocation guidance. |
| `ea` | **EA** | Blue Droplet `#3B82F6` (Playful) | **Executive & Workflow Automation**: Briefings, desk scheduling, and workflow orchestration. |
| `technical_analyst` | **Technical Analyst** | Amber Square `#F59E0B` (Analytical) | **Technicals & Momentum**: Support/resistance, RSI, MACD, moving averages (SMA/EMA). |
| `fundamentals_analyst` | **Fundamentals Analyst** | Emerald Square `#10B981` (Focused) | **Valuation & Balance Sheets**: Multiples (P/E, EV/EBITDA), earnings, and DCF intrinsic value. |
| `news_analyst` | **News Analyst** | Pink Pebble `#EC4899` (Attentive) | **Global Wire & Events**: Breaking geopolitical developments, regulatory shifts, and earnings releases. |
| `sentiment_analyst` | **Sentiment Analyst** | Lime Circle `#84CC16` (Curious) | **Order Flow & Crowd Positioning**: Put/call ratios, options flow, retail sentiment, and extremes. |
| `growth_analyst` | **Growth Analyst** | Cyan Squircle `#06B6D4` (Friendly) | **Catalysts & TAM**: Hyper-growth trends, TAM expansion, and product cycle momentum. |
| `macro_analyst` | **Macro Analyst** | Violet Circle `#8B5CF6` (Attentive) | **Macro Regime**: Treasury yield curve dynamics, Fed policy, CPI/PCE prints, and DXY. |
| `bull_researcher` | **Bull Researcher** | Green Triangle `#10B981` (Friendly) | **Long Thesis**: Builds evidence-backed upside scenarios and multi-year structural tailwinds. |
| `bear_researcher` | **Bear Researcher** | Red Triangle `#EF4444` (Skeptical) | **Short Thesis**: Stress-tests assumptions, targets multiple compression and downside risks. |
| `risk_manager` | **Risk Manager** | Crimson Cloud `#DC2626` (Vigilant) | **Drawdown Guard**: Value-at-Risk (VaR), portfolio correlation checks, and stop-loss enforcement. |
| `trader_agent` | **Trader Agent** | Teal Capsule `#14B8A6` (Focused) | **Execution Desk**: Order routing (limit/bracket/TWAP/VWAP) and slippage control. |

---

## ⚡ Grok-Style Agent Sidebar & Two-Way Sync

- **Context-Aware Sidebar**: When in Chat view or starting a New Session (`?tab=chat`), the left sidebar automatically presents the **Grok-style Agents View** (`AgentsSidebarView`), complete with living avatars, real-time typing indicators, and group cards (`Offsite crew`).
- **Two-Way Real-Time Synchronization**:
  1. Selecting any agent in the composer dropdown immediately selects and highlights that agent in the sidebar.
  2. Clicking an agent in the sidebar immediately sets the active bot in the composer and updates the URL parameter (`?tab=chat&agentId=<id>`).
- **Autonomous Voice & Speaking Persona**: When sending a message to a selected agent, the request is dispatched with that agent's persona prompt, and the assistant reply is stamped with `agent: <id>`, rendering the correct author badge and avatar in the transcript.

---

## 🛠️ Environment Variables & Setup

### 1. Requirements
- Node.js 20+
- pnpm / npm
- Git

### 2. Environment Variables (`suna/apps/web/.env.local`)

```env
# FreeLLMAPI Live Router (Render server-llm-1)
NEXT_PUBLIC_RENDER_LLM_URL=https://server-llm-1.onrender.com/v1/chat/completions
NEXT_PUBLIC_DEFAULT_MODEL=zed

# Next.js Configuration
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000
```

### 3. Running Locally

```bash
# Clone the repository
git clone https://github.com/karthikxa/Trading.git
cd Trading

# Start Next.js frontend with Turbopack & dotenvx
cd suna/apps/web
npx dotenvx run --ignore=MISSING_ENV_FILE -f .env.local -f .env -- next dev --port 3000
```

Visit `http://localhost:3000` to open the terminal.

---

## 🔄 FreeLLMAPI Server Keep-Alive Cron

The upstream LLM server is deployed at `https://server-llm-1.onrender.com`. On Render's free tier, web services spin down after 15 minutes of inactivity.

- **Keep-Alive Ping Endpoint**:
  ```http
  GET https://server-llm-1.onrender.com/health
  ```
- **Recommended Cron Schedule**: Ping every **10 to 14 minutes** via [cron-job.org](https://cron-job.org) or UptimeRobot to keep the model router always warm.

---

## 📝 License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.
