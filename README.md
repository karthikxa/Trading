# Zed — AI-Powered Trading Terminal

<div align="center">

### TradingView-grade charting with embedded Kronos + Laya AI prediction engine

**Ultra-lightweight · India-first stock coverage · Real-time AI forecasting**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![RAM](https://img.shields.io/badge/RAM-~91MB_runtime-green.svg)
![Status](https://img.shields.io/badge/status-active-brightgreen.svg)

</div>

---

## Overview

**Chartkar** is a high-performance trading terminal that brings professional-grade charting (inspired by TradingView) together with two embedded AI foundation models to predict price movements and generate actionable trade signals — all running locally with minimal resource usage.

### AI Models

| Model | Description |
|---|---|
| **Kronos** (`NeoQuasar/Kronos-base`) | 102.3M parameter autoregressive forecaster. Predicts future OHLCV candles using BSQ 10-bit tokenization. |
| **Laya** (`convaiinnovations/laya`) | 0.4B ModernBERT decision head. Analyzes Kronos forecasts + technical indicators to output BUY/SELL/HOLD signals with confidence and risk scores. |

---

## Features

- 📈 **TradingView-style UI** — Monochrome, high-contrast dark/light theme, professional charting with KlineCharts
- 🤖 **AI Prediction Panel** — Click the AI icon in the left toolbar for instant analysis of the current chart
- 🇮🇳 **India-first stock coverage** — NSE/BSE equities, F&O, indices (NIFTY, BANKNIFTY, SENSEX), and global markets
- ⚡ **Lightweight** — ~91 MB RAM at runtime, CPU-only inference, no GPU required
- 🕯️ **Custom Candle Forecast** — Choose 5–60 candles ahead; quick presets available
- 📊 **Real-time overlays** — Kronos forecasts rendered directly onto the active chart canvas

---

## Architecture

```
chartkar/
├── server.py          # FastAPI backend — serves UI + AI endpoints
├── engine.py          # Kronos + Laya inference pipeline
├── data_loader.py     # Market data fetching (Yahoo Finance / NSE)
├── dist/              # Built frontend assets
│   └── assets/
│       ├── ai-assistant.js   # AI flyout panel + chart overlay logic
│       └── ai-style.css      # AI panel styling
├── frontend/          # React/Vite source (KlineCharts-based)
├── kronos_model/      # Kronos model weights & tokenizer config
├── laya/              # Laya ModernBERT decision head package
├── static/            # Static assets
├── AGENT.md           # Team development guide & roadmap
└── requirements.txt   # Python dependencies
```

### Key API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/forecast_and_decide` | POST | Main AI endpoint — runs Kronos forecast then Laya decision |
| `/api/health` | GET | Health check |
| `/` | GET | Serves the trading terminal UI |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ (for frontend development only)

### Install & Run

```bash
# Clone
git clone https://github.com/karthikxa/Trading.git
cd Trading

# Install Python deps
pip install -r requirements.txt

# Start the server
python server.py
```

Open `http://127.0.0.1:8000` in your browser.

### AI Analysis

1. Open any chart (Indian stocks: `RELIANCE.NS`, `TCS.NS`, `NIFTY50`, etc.)
2. Click the **AI icon** (✦🔍) in the left toolbar
3. Set number of candles to predict (5–60)
4. Click **⚡ Analyze**
5. Watch the prediction overlay appear directly on your chart

---

## Markets Covered

### India (Primary)
- **NSE Equities**: RELIANCE, TCS, INFY, HDFC, ICICIBANK, WIPRO, BAJFINANCE, etc.
- **BSE Equities**: All major BSE-listed stocks
- **Indices**: NIFTY 50, BANKNIFTY, NIFTY IT, NIFTY PHARMA, SENSEX
- **F&O**: NIFTY Options, BANKNIFTY Options, Stock Futures & Options

### Global
- **US Markets**: S&P 500, NASDAQ, DOW, major US stocks
- **Crypto**: BTC, ETH, and major altcoins
- **Forex**: Major and minor currency pairs
- **Commodities**: Gold, Silver, Crude Oil

---

## Team Development

See [`AGENT.md`](./AGENT.md) for:
- Detailed architecture documentation
- What has been built
- Pending features & roadmap
- AI model integration details
- Development guidelines

---

## Performance

| Metric | Value |
|---|---|
| Startup RAM | ~91 MB |
| Peak inference RAM | < 200 MB |
| Forecast latency | < 2s (CPU) |
| GPU required | ❌ No |

---

## License

MIT License — see [LICENSE](./LICENSE)

---

<div align="center">
Built for Indian traders · Powered by Kronos + Laya AI
</div>
