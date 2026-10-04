import urllib.request
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple

BINANCE_SYMBOLS = {
    'BTC/USDT': 'BTCUSDT',
    'ETH/USDT': 'ETHUSDT',
    'SOL/USDT': 'SOLUSDT',
    'DOGE/USDT': 'DOGEUSDT',
    'BNB/USDT': 'BNBUSDT'
}

def fetch_binance_klines(symbol: str = "BTC/USDT", interval: str = "15m", limit: int = 150) -> pd.DataFrame:
    """Fetches real-time market candlestick data from Binance public API."""
    binance_symbol = BINANCE_SYMBOLS.get(symbol, symbol.replace('/', ''))
    url = f"https://api.binance.com/api/v3/klines?symbol={binance_symbol}&interval={interval}&limit={limit}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    
    with urllib.request.urlopen(req, timeout=8) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    
    records = []
    for item in data:
        # Binance kline format:
        # [0: open_time, 1: open, 2: high, 3: low, 4: close, 5: volume, 6: close_time, 7: quote_asset_volume, ...]
        records.append({
            'timestamps': pd.to_datetime(item[0], unit='ms'),
            'open': float(item[1]),
            'high': float(item[2]),
            'low': float(item[3]),
            'close': float(item[4]),
            'volume': float(item[5]),
            'amount': float(item[7])
        })
    
    return pd.DataFrame(records)

def generate_market_scenario(scenario: str = "bullish_breakout", periods: int = 140, base_price: float = 65000.0) -> pd.DataFrame:
    """Generates high-fidelity market pattern scenarios for testing and demonstration."""
    np.random.seed(42 if scenario == "bullish_breakout" else 99)
    end_time = datetime.now()
    dates = [end_time - timedelta(minutes=15 * (periods - i)) for i in range(periods)]
    
    prices = [base_price]
    volumes = []
    
    if scenario == "bullish_breakout":
        # First 100 periods: consolidation squeeze, last 40: strong breakout
        for i in range(1, periods):
            if i < periods - 35:
                # Tight range
                drift = 0.0001
                noise = np.random.normal(0, 0.002)
                vol = np.random.uniform(20, 60)
            else:
                # Breakout surge
                drift = 0.003
                noise = np.random.normal(0, 0.003)
                vol = np.random.uniform(80, 240)
            p = prices[-1] * (1.0 + drift + noise)
            prices.append(p)
            volumes.append(vol)
        volumes.insert(0, 30.0)
        
    elif scenario == "bearish_breakdown":
        for i in range(1, periods):
            if i < periods - 30:
                drift = -0.0001
                noise = np.random.normal(0, 0.002)
                vol = np.random.uniform(30, 70)
            else:
                drift = -0.0035
                noise = np.random.normal(0, 0.003)
                vol = np.random.uniform(90, 260)
            p = prices[-1] * (1.0 + drift + noise)
            prices.append(p)
            volumes.append(vol)
        volumes.insert(0, 40.0)

    elif scenario == "double_bottom":
        # W pattern
        mid = periods // 2
        for i in range(1, periods):
            phase = i / periods
            cycle = -np.sin(phase * 4 * np.pi) * 0.02
            noise = np.random.normal(0, 0.0015)
            p = base_price * (1.0 + cycle + noise + (0.015 if i > periods - 25 else 0))
            prices.append(p)
            vol = np.random.uniform(40, 120) * (1.5 if i > periods - 20 else 1.0)
            volumes.append(vol)
        volumes.insert(0, 40.0)

    else: # consolidation / squeeze
        for i in range(1, periods):
            decay = max(0.2, 1.0 - (i / periods) * 0.7)
            noise = np.random.normal(0, 0.002 * decay)
            p = prices[-1] * (1.0 + noise)
            prices.append(p)
            volumes.append(np.random.uniform(20, 50) * decay)
        volumes.insert(0, 35.0)

    # Formulate OHLCV from price sequence
    records = []
    for i, (ts, p, v) in enumerate(zip(dates, prices, volumes)):
        jitter = p * 0.0015
        o = p + np.random.uniform(-jitter, jitter)
        c = p + np.random.uniform(-jitter, jitter)
        h = max(o, c) + abs(np.random.uniform(0, jitter * 1.5))
        l = min(o, c) - abs(np.random.uniform(0, jitter * 1.5))
        records.append({
            'timestamps': ts,
            'open': o,
            'high': h,
            'low': l,
            'close': c,
            'volume': v,
            'amount': c * v
        })
    return pd.DataFrame(records)

def parse_uploaded_csv(file_bytes: bytes) -> Tuple[pd.DataFrame, str]:
    """Parses and validates user-uploaded CSV files containing OHLCV candlesticks."""
    import io
    df = pd.read_csv(io.BytesIO(file_bytes))
    
    # Normalize column names to lowercase
    col_map = {col: col.strip().lower() for col in df.columns}
    df = df.rename(columns=col_map)

    # Map possible timestamp names
    ts_candidates = ['timestamps', 'timestamp', 'date', 'datetime', 'time']
    ts_col = None
    for cand in ts_candidates:
        if cand in df.columns:
            ts_col = cand
            break
            
    if ts_col:
        df['timestamps'] = pd.to_datetime(df[ts_col])
    else:
        df['timestamps'] = pd.date_range(end=datetime.now(), periods=len(df), freq='15min')

    # Validate essential price columns
    for required in ['open', 'high', 'low', 'close']:
        if required not in df.columns:
            # Fallback check
            matching = [c for c in df.columns if required in c]
            if matching:
                df[required] = df[matching[0]].astype(float)
            else:
                return df, f"Missing required price column: {required}"

    if 'volume' not in df.columns:
        df['volume'] = 100.0
    if 'amount' not in df.columns:
        df['amount'] = df['close'] * df['volume']

    df = df.sort_values('timestamps').reset_index(drop=True)
    return df, "success"
