import numpy as np
import pandas as pd
import time
from kronos_model import Kronos, KronosTokenizer, KronosPredictor
from laya import Router

print("Initializing Kronos models...")
t0 = time.time()
tokenizer = KronosTokenizer.from_pretrained('NeoQuasar/Kronos-Tokenizer-base')
model = Kronos.from_pretrained('NeoQuasar/Kronos-base')
predictor = KronosPredictor(model, tokenizer, device='cpu', max_context=512)
print(f"Kronos loaded in {time.time()-t0:.2f}s")

print("Initializing Laya Router...")
t1 = time.time()
router = Router()
print(f"Laya ready in {time.time()-t1:.2f}s")

# Generate synthetic historical series (Bullish continuation)
N = 100
dates = pd.date_range('2026-03-01 00:00:00', periods=N+20, freq='15min')
trend = np.linspace(62000, 67000, N+20) + np.random.normal(0, 150, N+20)
df = pd.DataFrame({
    'timestamps': dates,
    'open': trend * 0.999,
    'high': trend * 1.003,
    'low': trend * 0.997,
    'close': trend,
    'volume': np.random.uniform(50, 200, N+20),
    'amount': trend * np.random.uniform(50, 200, N+20)
})

x_df = df.iloc[:N][['open', 'high', 'low', 'close', 'volume', 'amount']]
x_timestamp = df.iloc[:N]['timestamps']
y_timestamp = df.iloc[N:N+20]['timestamps']

print("Predicting 20 candles with Kronos-base...")
t_kronos = time.time()
pred_df = predictor.predict(
    df=x_df,
    x_timestamp=x_timestamp,
    y_timestamp=y_timestamp,
    pred_len=20,
    T=0.8,
    top_p=0.9
)
kronos_elapsed = time.time() - t_kronos
print(f"Kronos prediction completed in {kronos_elapsed:.2f}s")

last_close = float(x_df['close'].iloc[-1])
pred_close = float(pred_df['close'].iloc[-1])
pred_high = float(pred_df['high'].max())
pred_low = float(pred_df['low'].min())
pct_change = ((pred_close - last_close) / last_close) * 100

state = {
    'asset': 'BTC/USDT',
    'timeframe': '15m',
    'current_price': f"${last_close:,.2f}",
    'kronos_predicted_target': f"${pred_close:,.2f}",
    'kronos_predicted_return': f"{pct_change:+.2f}%",
    'predicted_range': f"${pred_low:,.2f} - ${pred_high:,.2f}",
    'trend_context': f"Strong upward momentum with consecutive higher lows. Kronos 102.3M base model forecasts price advancing {pct_change:+.2f}% over the next 20 periods."
}

questions = {
    'action': {
        'type': 'choice',
        'instructions': 'What trading position should be executed?',
        'criteria': {
            'buy': 'bullish projection, positive expected return, upward continuation',
            'sell': 'bearish projection, negative return, breakdown',
            'hold': 'flat expectation, chop, consolidation'
        }
    },
    'risk': {
        'type': 'score',
        'instructions': 'Rate the execution risk level for entering a position now',
        'criteria': ['low', 'moderate', 'high', 'extreme']
    },
    'breakout': {
        'type': 'noul',
        'instructions': 'Will the price break past the recent high or low boundary?'
    }
}

print("Running Laya decision router...")
t_laya = time.time()
laya_res = router.predict(state, questions)
laya_elapsed = time.time() - t_laya
print(f"Laya decision made in {laya_elapsed:.2f}s")

print("\n--- RESULTS ---")
print("Asset:", state['asset'])
print("Current:", state['current_price'], "-> Forecast:", state['kronos_predicted_target'], f"({pct_change:+.2f}%)")
print("Action Decision:", laya_res['answers']['action']['choice'], f"(Conf: {laya_res['answers']['action']['confidence']:.2f})")
print("Probabilities:", laya_res['answers']['action']['probabilities'])
print("Risk Level:", laya_res['answers']['risk']['score'], "Rubric:", laya_res['answers']['risk']['probabilities'])
print("Breakout Probability:", f"{laya_res['answers']['breakout']['noul']*100:.1f}%")
