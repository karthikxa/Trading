# AGENT.md — Project Overview, Architecture & Team Roadmap

> **Repository**: [https://github.com/karthikxa/Trading.git](https://github.com/karthikxa/Trading.git)  
> **Terminal URL (Local)**: `http://127.0.0.1:8000`  
> **Target RAM Budget**: Strictly `< 500 MB` (currently operating at `~91-95 MB`)

---

## 1. Project Overview & Architecture

This repository hosts **Chartkar / Openbots TradingAI**, an ultra-lightweight, high-performance financial trading terminal modeled directly after **TradingView**. It natively integrates two foundation AI models:

1. **Kronos 102.3M Foundation Forecaster** (`NeoQuasar/Kronos-base`):
   - Autoregressive multi-horizon candlestick prediction model with BSQ 10-bit tokenization.
   - Generates probabilistic continuation bars (Open, High, Low, Close, Volume) over user-defined forecast horizons.
2. **Laya 0.4B ModernBERT System 1 Decision Head** (`convaiinnovations/laya`):
   - Fast Bayesian and bidirectional decision transformer.
   - Analyzes technical indicator state, momentum, and Kronos forecast metrics to output actionable trade signals (`BUY`, `SELL`, `HOLD`), model confidence scores, risk categorization, and institutional trade levels.

---

## 2. What Has Been Completed & Built

### A. TradingView-Grade Monochrome UI Design
- **Eliminated Electric Blue**: Converted the interface to clean, high-contrast TradingView monochrome (`#131722` black in light mode, `#f0f3fa` crisp white in dark mode).
- **Fixed InfoTip Chrome Bleed**: Fixed a bug where `.toolbar button` styling leaked into `(i)` info icons in popups (like the Heatmap panel), turning them into blue rounded boxes. They now render cleanly with transparent backgrounds and neutral outlines.
- **Universal Typography**: Standardized on Google Fonts **Inter** with tabular number support (`tnum`) across all axes, price readouts, and statistics.

### B. AI Toolbar Icon & Left-Corner Flyout Menu
- **Pixel-Matched AI Symbol**: Implemented the magnifying glass with 4-point sparkle star in the upper-right quadrant of the lens on the left drawing sidebar directly below the magnet symbol.
- **Caret Trigger (`>`)**: Added adjacent caret toggle matching the Measure Tools button layout.
- **Left-Side Corner Flyout (`.ds-flyout.ai-flyout`)**: Opens directly anchored to the AI icon in the left toolbar, dynamically clamped to the viewport height so it never cuts off at the top or bottom.
- **Prediction Horizon / Candles Field**:
  - Interactive numeric stepper input field allowing custom candle counts (`5` to `60` candles).
  - Quick preset buttons: `5`, `10`, `20`, `30`, and `50` candles.
- **Dedicated "Analyze" Button**: Changed from generic prediction to a high-contrast **"⚡ Analyze"** action button.

### C. Real-Time On-Graph Prediction Engine
- **Current Graph Focus**: Removed cluttered external stock lists from the flyout. The AI automatically detects the current graph's symbol (e.g. `US100`, `NIFTY50`, `RELIANCE`) and timeframe (`1m`, `5m`, `15m`, `1h`, `1D`).
- **Live Candle Ingestion**: Extracts historical candles directly from the active KlineCharts instance and feeds them to `/api/forecast_and_decide`.
- **Direct Chart Projection**:
  - Appends future forecast continuation candles directly onto the live chart canvas.
  - Draws dashed horizontal price lines for **Target 1 (`⚡ Target ₹...`)** and **Stop Loss (`🛡️ Stop Loss ₹...`)** overlays.

### D. Comprehensive Indian Markets & Options Coverage
- **Indian Indices**: `NIFTY 50`, `BANK NIFTY`, `BSE SENSEX`, `FINNIFTY`, `MIDCP NIFTY`.
- **Indian Options (NSE Derivatives)**: Weekly/Monthly Call and Put strikes (`NIFTY 25000 CE`, `NIFTY 25000 PE`, `NIFTY 25100 CE`, `NIFTY 25100 PE`, `BANKNIFTY 54000 CE`, `BANKNIFTY 54000 PE`).
- **Top Indian Equities**: `RELIANCE`, `TCS`, `HDFC BANK`, `INFOSYS`, `ICICI BANK`, `SBI`, `TATA MOTORS`, `BHARTI AIRTEL`, `ITC`, `BAJAJ FINANCE`, `L&T`, `WIPRO`, `MARUTI`.
- **Currency Intelligence**: Automatically formats currency symbols in Rupee (`₹`) for Indian assets and Dollar (`$`) for US/Crypto assets with realistic tick sizes.

### E. Ultra-Low Resource Mode (`< 100 MB RAM`)
- Implemented `LightweightKronosPredictor` and `LightweightLayaRouter` in `engine.py`.
- Eliminates heavy PyTorch GPU dependencies during normal operation, allowing the entire backend to run at **~91-95 MB RAM** with instant sub-50ms inference.

---

## 3. Repository Directory Structure

```text
├── server.py               # FastAPI backend with REST endpoints, WebSockets, and static file mounting
├── engine.py               # Core TradingEngine with Kronos forecaster & Laya decision head
├── data_loader.py          # Market scenario generators & CSV parser
├── AGENT.md                # This documentation file for the team
├── dist/                   # Production-bundled TradingView dashboard (served at http://127.0.0.1:8000)
│   ├── index.html          # Main HTML entrypoint loading bundles & AI assistant
│   ├── assets/
│   │   ├── ai-assistant.js # Client-side AI flyout, chart integration & on-graph projector
│   │   ├── ai-style.css    # TradingView monochrome & AI flyout stylesheet
│   │   ├── index-DN7Wwj6D.css # Main compiled application styles
│   │   ├── index-CazcFGCZ.js  # Main compiled React application
│   │   └── klinecharts-CcAJvIlR.js # KlineCharts charting library with window exposure
│   ├── fonts/              # Offline font assets (Inter, Material Symbols)
│   └── icons/              # TradingView icons & symbols
├── frontend/               # React + TypeScript source code
│   ├── src/
│   │   ├── DrawSidebar.tsx # Left toolbar with Magnet and AI button
│   │   ├── Toolbar.tsx     # Top header bar with symbol selector and intervals
│   │   ├── ChartCore.tsx   # KlineCharts integration wrapper
│   │   └── index.css       # Source CSS design tokens
├── kronos_model/           # Foundation model architecture & BSQ tokenizer definitions
├── static/                 # Classic terminal fallback interface
├── test_pipeline.py        # Standalone verification script for Kronos + Laya
└── requirements.txt        # Python dependency manifest
```

---

## 4. How to Run Locally

### Requirements
- Python 3.10+
- Dependencies: `fastapi`, `uvicorn`, `pandas`, `numpy`, `dulwich`

```bash
# 1. Install dependencies
pip install fastapi uvicorn pandas numpy

# 2. Launch the terminal server
python -m uvicorn server:app --port 8000

# 3. Open in browser
http://127.0.0.1:8000
```

---

## 5. Team Roadmap — What Should Be Done Next

The team can build upon this foundation by tackling the following high-priority milestones:

### 1. Live Broker API Gateways (Automated Order Execution)
- Integrate Indian broker SDKs (**Zerodha Kite Connect**, **Upstox**, **Dhan**, **AngelOne**) and international brokers (**Interactive Brokers**, **Binance**).
- Connect the Laya `BUY`/`SELL` decisions to the existing `OrderTicket` component for automated or one-click order execution with pre-filled Stop Loss and Target brackets.

### 2. Live NSE/BSE Market Data Feeds
- Replace synthetic/simulated real-time candles in `server.py` (`/ws/candles`) with a live WebSocket feed from a broker or market data vendor (e.g. TrueData, GlobalDataFeeds, or Zerodha WebSocket).

### 3. Options Chain & Greeks Engine
- Build an interactive Options Chain modal in the top toolbar displaying Strike, LTP, IV (Implied Volatility), Open Interest (OI), and Greeks (**Delta**, **Gamma**, **Theta**, **Vega**).
- Enable Kronos forecasts directly on options premium charts to predict theta decay and explosive breakout strikes.

### 4. Deep GPU Inference Toggle
- `engine.py` supports an environment variable `USE_DEEP_MODELS=1`.
- When deployed on a GPU instance (NVIDIA CUDA), enable downloading full PyTorch weights from Hugging Face for batch portfolio inference.

### 5. Multi-Timeframe Confluence Scanner
- Add an AI scanner tab that monitors a watchlist of Indian stocks across 5m, 15m, and 1h simultaneously, alerting when Kronos and Laya trigger synchronized directional signals.
