'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Sparkles } from 'lucide-react';
import { TradingPairIcon } from './TradingPairIcon';

export interface MarketSymbolOption {
  symbol: string;
  name: string;
  category: 'Forex' | 'Commodities' | 'Crypto' | 'Futures' | 'Equities & Options';
  exchange?: string;
}

export const ALL_MARKET_SYMBOLS: MarketSymbolOption[] = [
  // Forex
  { symbol: 'EURUSD', name: 'Euro / U.S. Dollar', category: 'Forex', exchange: 'FOREXCOM' },
  { symbol: 'GBPUSD', name: 'British Pound / U.S. Dollar', category: 'Forex', exchange: 'FOREXCOM' },
  { symbol: 'USDJPY', name: 'U.S. Dollar / Japanese Yen', category: 'Forex', exchange: 'FOREXCOM' },
  { symbol: 'AUDCHF', name: 'Australian Dollar / Swiss Franc', category: 'Forex', exchange: 'OANDA' },
  { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', category: 'Forex', exchange: 'SAXO' },
  { symbol: 'USDINR', name: 'U.S. Dollar / Indian Rupee', category: 'Forex', exchange: 'FX_IDC' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / U.S. Dollar', category: 'Forex', exchange: 'OANDA' },
  { symbol: 'USDCAD', name: 'U.S. Dollar / Canadian Dollar', category: 'Forex', exchange: 'FOREXCOM' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / U.S. Dollar', category: 'Forex', exchange: 'OANDA' },
  { symbol: 'EURGBP', name: 'Euro / British Pound', category: 'Forex', exchange: 'FOREXCOM' },

  // Commodities
  { symbol: 'XAUUSD', name: 'Gold / U.S. Dollar', category: 'Commodities', exchange: 'TVC' },
  { symbol: 'XAGUSD', name: 'Silver / U.S. Dollar', category: 'Commodities', exchange: 'TVC' },
  { symbol: 'USOIL', name: 'Crude Oil WTI', category: 'Commodities', exchange: 'NYMEX' },
  { symbol: 'UKOIL', name: 'Brent Crude Oil', category: 'Commodities', exchange: 'ICE' },
  { symbol: 'COPPER', name: 'High Grade Copper', category: 'Commodities', exchange: 'COMEX' },
  { symbol: 'NATGAS', name: 'Natural Gas', category: 'Commodities', exchange: 'NYMEX' },

  // Crypto
  { symbol: 'BTCUSD', name: 'Bitcoin / U.S. Dollar', category: 'Crypto', exchange: 'BINANCE' },
  { symbol: 'ETHUSD', name: 'Ethereum / U.S. Dollar', category: 'Crypto', exchange: 'BINANCE' },
  { symbol: 'SOLUSD', name: 'Solana / U.S. Dollar', category: 'Crypto', exchange: 'BINANCE' },
  { symbol: 'XRPUSD', name: 'Ripple / U.S. Dollar', category: 'Crypto', exchange: 'BITSTAMP' },
  { symbol: 'LTCUSD', name: 'Litecoin / U.S. Dollar', category: 'Crypto', exchange: 'COINBASE' },
  { symbol: 'DOGEUSD', name: 'Dogecoin / U.S. Dollar', category: 'Crypto', exchange: 'BINANCE' },

  // Futures & Indices
  { symbol: 'US30', name: 'Dow Jones Industrial 30', category: 'Futures', exchange: 'DJI' },
  { symbol: 'NDX100', name: 'Nasdaq 100 Index', category: 'Futures', exchange: 'NASDAQ' },
  { symbol: 'SPX500', name: 'S&P 500 Index', category: 'Futures', exchange: 'SP' },
  { symbol: 'US2000', name: 'Russell 2000 Index', category: 'Futures', exchange: 'RUSSELL' },
  { symbol: 'NIFTY50', name: 'Nifty 50 Index', category: 'Futures', exchange: 'NSE' },
  { symbol: 'DAX40', name: 'German DAX Index', category: 'Futures', exchange: 'XETR' },
  { symbol: 'FTSE100', name: 'UK FTSE 100 Index', category: 'Futures', exchange: 'LSE' },

  // Equities & Options
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'Equities & Options', exchange: 'NASDAQ' },
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'Equities & Options', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', category: 'Equities & Options', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'Equities & Options', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', category: 'Equities & Options', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', category: 'Equities & Options', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'Equities & Options', exchange: 'NASDAQ' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', category: 'Equities & Options', exchange: 'NASDAQ' },
  { symbol: 'INFY', name: 'Infosys Limited', category: 'Equities & Options', exchange: 'NSE' },
];

interface InstrumentPickerProps {
  value: string;
  onChange: (symbol: string) => void;
}

export function InstrumentPicker({ value, onChange }: InstrumentPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = ['All', 'Forex', 'Commodities', 'Crypto', 'Futures', 'Equities & Options'];

  const filteredSymbols = ALL_MARKET_SYMBOLS.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.symbol.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedItem = ALL_MARKET_SYMBOLS.find(
    (s) => s.symbol.toUpperCase() === value.toUpperCase()
  );

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger Button: Boxy, sleek, COSS UI style */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-zinc-200 rounded-lg hover:border-zinc-400 focus:outline-none focus:border-zinc-950 transition-colors shadow-2xs text-left"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <TradingPairIcon symbol={value || 'EURUSD'} size="sm" />
          <div className="flex items-baseline gap-1.5 truncate">
            <span className="font-bold text-xs text-zinc-950 font-mono">
              {value || 'Select symbol'}
            </span>
            {selectedItem && (
              <span className="text-[11px] text-zinc-400 truncate">
                · {selectedItem.name}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`size-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* COSS UI Command Palette / Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-zinc-200 rounded-xl shadow-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2.5 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-2">
            <Search className="size-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search forex, crypto, indices, commodities..."
              className="bg-transparent border-none outline-none text-xs text-zinc-900 placeholder:text-zinc-400 w-full"
              autoFocus
            />
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1 p-2 overflow-x-auto border-b border-zinc-100 bg-white scrollbar-none text-[11px]">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md shrink-0 font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-950'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Symbol Results List */}
          <div className="max-h-60 overflow-y-auto p-1.5 divide-y divide-zinc-50">
            {filteredSymbols.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-zinc-400 flex flex-col items-center gap-1.5">
                <span>No symbols found for &quot;{search}&quot;</span>
                {search.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(search.toUpperCase().trim());
                      setIsOpen(false);
                    }}
                    className="mt-1 text-xs font-semibold text-zinc-950 underline hover:text-zinc-600"
                  >
                    Use custom symbol &quot;{search.toUpperCase().trim()}&quot;
                  </button>
                )}
              </div>
            ) : (
              filteredSymbols.map((item) => {
                const isSelected = item.symbol.toUpperCase() === value.toUpperCase();
                return (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => {
                      onChange(item.symbol);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-zinc-100 text-zinc-950 font-semibold'
                        : 'hover:bg-zinc-50 text-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <TradingPairIcon symbol={item.symbol} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-zinc-950 font-mono">
                            {item.symbol}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-normal truncate">
                            {item.exchange}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 truncate">
                          {item.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-medium">
                        {item.category}
                      </span>
                      {isSelected && <Check className="size-3.5 text-zinc-950" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default InstrumentPicker;

