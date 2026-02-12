import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Play, Pause, Upload, BarChart3, AlertCircle } from 'lucide-react';

// QUANTEX TERMINAL - Phase 1 MVP
// Professional rule-based trading research platform

const TradingPlatform = () => {
  // Core State
  const [marketData, setMarketData] = useState([]);
  const [currentSymbol, setCurrentSymbol] = useState('BTC/USDT');
  const [timeframe, setTimeframe] = useState('15m');
  const [marketType, setMarketType] = useState('crypto');
  const [paperBalance, setPaperBalance] = useState(10000);
  const [trades, setTrades] = useState([]);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [isPaperTrading, setIsPaperTrading] = useState(false);
  const [backtestResults, setBacktestResults] = useState(null);
  const [riskPerTrade, setRiskPerTrade] = useState(1);

  // Generate Market Data
  useEffect(() => {
    generateMarketData();
  }, [currentSymbol, timeframe, marketType]);

  const generateMarketData = () => {
    const data = [];
    let price = marketType === 'crypto' ? 42000 : marketType === 'forex' ? 1.0850 : 150;
    const volatility = marketType === 'crypto' ? 500 : marketType === 'forex' ? 0.001 : 2;
    
    for (let i = 0; i < 200; i++) {
      const change = (Math.random() - 0.5) * volatility * 2;
      const trend = Math.sin(i / 20) * volatility;
      price = price + change + trend;
      
      const open = price;
      const high = price + Math.abs(Math.random() * volatility);
      const low = price - Math.abs(Math.random() * volatility);
      const close = low + Math.random() * (high - low);
      
      data.push({
        timestamp: new Date(Date.now() - (200 - i) * 900000).toISOString(),
        open: parseFloat(open.toFixed(marketType === 'forex' ? 5 : 2)),
        high: parseFloat(high.toFixed(marketType === 'forex' ? 5 : 2)),
        low: parseFloat(low.toFixed(marketType === 'forex' ? 5 : 2)),
        close: parseFloat(close.toFixed(marketType === 'forex' ? 5 : 2)),
        volume: Math.floor(Math.random() * 1000000)
      });
      price = close;
    }
    setMarketData(data);
  };

  // Candlestick Pattern Detection
  const detectCandlePattern = (candles, index) => {
    if (index < 2) return null;
    
    const current = candles[index];
    const prev = candles[index - 1];
    
    const body = Math.abs(current.close - current.open);
    const upperWick = current.high - Math.max(current.open, current.close);
    const lowerWick = Math.min(current.open, current.close) - current.low;
    
    // Hammer
    if (lowerWick > body * 2 && upperWick < body * 0.3 && current.close > current.open) {
      return { pattern: 'HAMMER', signal: 'bullish' };
    }
    
    // Shooting Star
    if (upperWick > body * 2 && lowerWick < body * 0.3 && current.close < current.open) {
      return { pattern: 'SHOOTING_STAR', signal: 'bearish' };
    }
    
    // Engulfing
    const prevBody = Math.abs(prev.close - prev.open);
    const currentBullish = current.close > current.open;
    const prevBearish = prev.close < prev.open;
    
    if (currentBullish && prevBearish && body > prevBody * 1.2) {
      return { pattern: 'BULLISH_ENGULFING', signal: 'bullish' };
    }
    
    if (!currentBullish && !prevBearish && body > prevBody * 1.2) {
      return { pattern: 'BEARISH_ENGULFING', signal: 'bearish' };
    }
    
    return null;
  };

  // Market Structure Detection
  const detectMarketStructure = (data) => {
    if (data.length < 20) return { trend: 'RANGING', bos: false };
    
    const recentData = data.slice(-20);
    const highs = recentData.map(d => d.high);
    const lows = recentData.map(d => d.low);
    
    const recentHigh = highs.slice(-5).reduce((a, b) => a + b) / 5;
    const earlierHigh = highs.slice(0, 5).reduce((a, b) => a + b) / 5;
    
    const recentLow = lows.slice(-5).reduce((a, b) => a + b) / 5;
    const earlierLow = lows.slice(0, 5).reduce((a, b) => a + b) / 5;
    
    let trend = 'RANGING';
    let bos = false;
    
    if (recentHigh > earlierHigh && recentLow > earlierLow) {
      trend = 'UPTREND';
      bos = true;
    } else if (recentHigh < earlierHigh && recentLow < earlierLow) {
      trend = 'DOWNTREND';
      bos = true;
    }
    
    return { trend, bos };
  };

  // Strategy Evaluation Engine
  const evaluateStrategy = (data, index) => {
    if (!data || data.length < 20 || index < 20) return null;
    
    const pattern = detectCandlePattern(data, index);
    const structure = detectMarketStructure(data.slice(0, index + 1));
    
    // Long strategy
    if (pattern?.signal === 'bullish' && structure.trend === 'UPTREND') {
      const entry = data[index].close;
      const stopLoss = data[index].low * 0.98;
      const takeProfit = entry + (entry - stopLoss) * 2;
      
      return {
        type: 'LONG',
        entry,
        stopLoss,
        takeProfit,
        pattern: pattern.pattern,
        timestamp: data[index].timestamp
      };
    }
    
    // Short strategy
    if (pattern?.signal === 'bearish' && structure.trend === 'DOWNTREND') {
      const entry = data[index].close;
      const stopLoss = data[index].high * 1.02;
      const takeProfit = entry - (stopLoss - entry) * 2;
      
      return {
        type: 'SHORT',
        entry,
        stopLoss,
        takeProfit,
        pattern: pattern.pattern,
        timestamp: data[index].timestamp
      };
    }
    
    return null;
  };

  // Backtesting Engine
  const runBacktest = () => {
    setIsBacktesting(true);
    
    setTimeout(() => {
      const testTrades = [];
      let balance = 10000;
      let wins = 0;
      let losses = 0;
      
      for (let i = 20; i < marketData.length - 10; i++) {
        const signal = evaluateStrategy(marketData, i);
        
        if (signal && testTrades.length < 50) {
          const riskAmount = balance * (riskPerTrade / 100);
          const positionSize = riskAmount / Math.abs(signal.entry - signal.stopLoss);
          
          let outcome = 'loss';
          let pnl = -riskAmount;
          
          for (let j = i + 1; j < Math.min(i + 10, marketData.length); j++) {
            if (signal.type === 'LONG') {
              if (marketData[j].high >= signal.takeProfit) {
                outcome = 'win';
                pnl = Math.abs(signal.takeProfit - signal.entry) * positionSize;
                wins++;
                break;
              } else if (marketData[j].low <= signal.stopLoss) {
                outcome = 'loss';
                losses++;
                break;
              }
            } else {
              if (marketData[j].low <= signal.takeProfit) {
                outcome = 'win';
                pnl = Math.abs(signal.entry - signal.takeProfit) * positionSize;
                wins++;
                break;
              } else if (marketData[j].high >= signal.stopLoss) {
                outcome = 'loss';
                losses++;
                break;
              }
            }
          }
          
          balance += pnl;
          
          testTrades.push({
            ...signal,
            outcome,
            pnl: parseFloat(pnl.toFixed(2)),
            balance: parseFloat(balance.toFixed(2)),
            id: testTrades.length + 1
          });
        }
      }
      
      const totalTrades = wins + losses;
      const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;
      const totalPnL = balance - 10000;
      const profitFactor = losses > 0 ? (wins / losses).toFixed(2) : 'N/A';
      
      setBacktestResults({
        totalTrades,
        wins,
        losses,
        winRate,
        totalPnL: parseFloat(totalPnL.toFixed(2)),
        profitFactor,
        finalBalance: parseFloat(balance.toFixed(2))
      });
      
      setTrades(testTrades);
      setIsBacktesting(false);
    }, 1000);
  };

  // Paper Trading Toggle
  const startPaperTrading = () => {
    setIsPaperTrading(!isPaperTrading);
    if (!isPaperTrading) {
      setPaperBalance(10000);
      setTrades([]);
    }
  };

  // Metrics
  const metrics = {
    totalPnL: trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
    winRate: trades.length > 0 
      ? ((trades.filter(t => t.outcome === 'win').length / trades.length) * 100).toFixed(1)
      : 0,
    totalTrades: trades.length
  };

  const currentPrice = marketData.length > 0 ? marketData[marketData.length - 1].close : 0;
  const structure = detectMarketStructure(marketData);

  return (
    <div className="trading-platform">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Bebas+Neue&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          overflow: hidden;
        }
        
        .trading-platform {
          background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
          min-height: 100vh;
          color: #e0e6ed;
          font-family: 'JetBrains Mono', monospace;
          overflow: hidden;
        }
        
        .platform-header {
          background: rgba(15, 20, 30, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(66, 153, 225, 0.2);
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        
        .platform-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2rem;
          letter-spacing: 3px;
          background: linear-gradient(135deg, #4299e1 0%, #667eea 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 30px rgba(66, 153, 225, 0.3);
        }
        
        .header-stats {
          display: flex;
          gap: 2rem;
          align-items: center;
        }
        
        .stat-item {
          text-align: right;
        }
        
        .stat-label {
          font-size: 0.7rem;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .stat-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: #e0e6ed;
        }
        
        .stat-value.positive {
          color: #48bb78;
        }
        
        .stat-value.negative {
          color: #f56565;
        }
        
        .platform-grid {
          display: grid;
          grid-template-columns: 250px 1fr 300px;
          grid-template-rows: 1fr auto;
          gap: 1rem;
          padding: 1rem;
          height: calc(100vh - 80px);
        }
        
        .panel {
          background: rgba(26, 32, 44, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(66, 153, 225, 0.15);
          border-radius: 8px;
          padding: 1.5rem;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        
        .panel::-webkit-scrollbar {
          width: 6px;
        }
        
        .panel::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        
        .panel::-webkit-scrollbar-thumb {
          background: rgba(66, 153, 225, 0.3);
          border-radius: 3px;
        }
        
        .panel-header {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #4299e1;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(66, 153, 225, 0.2);
          font-weight: 700;
        }
        
        .controls-panel {
          grid-column: 1;
          grid-row: 1;
        }
        
        .control-group {
          margin-bottom: 1.5rem;
        }
        
        .control-label {
          font-size: 0.75rem;
          color: #a0aec0;
          margin-bottom: 0.5rem;
          display: block;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .select-input {
          width: 100%;
          background: rgba(15, 20, 30, 0.8);
          border: 1px solid rgba(66, 153, 225, 0.3);
          color: #e0e6ed;
          padding: 0.6rem;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .select-input:hover {
          border-color: #4299e1;
          box-shadow: 0 0 15px rgba(66, 153, 225, 0.2);
        }
        
        .select-input:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 20px rgba(66, 153, 225, 0.3);
        }
        
        .number-input {
          width: 100%;
          background: rgba(15, 20, 30, 0.8);
          border: 1px solid rgba(66, 153, 225, 0.3);
          color: #e0e6ed;
          padding: 0.6rem;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
        }
        
        .number-input:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 20px rgba(66, 153, 225, 0.3);
        }
        
        .action-button {
          width: 100%;
          padding: 0.75rem;
          background: linear-gradient(135deg, #4299e1 0%, #667eea 100%);
          border: none;
          border-radius: 6px;
          color: white;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.3s;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          box-shadow: 0 4px 15px rgba(66, 153, 225, 0.3);
        }
        
        .action-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(66, 153, 225, 0.5);
        }
        
        .action-button:active {
          transform: translateY(0);
        }
        
        .action-button.secondary {
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        }
        
        .action-button.danger {
          background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
        }
        
        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .chart-panel {
          grid-column: 2;
          grid-row: 1;
          display: flex;
          flex-direction: column;
        }
        
        .chart-container {
          flex: 1;
          position: relative;
        }
        
        .price-display {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(15, 20, 30, 0.95);
          padding: 1rem 1.5rem;
          border-radius: 8px;
          border: 1px solid rgba(66, 153, 225, 0.3);
          z-index: 10;
        }
        
        .current-price {
          font-size: 1.8rem;
          font-weight: 700;
          color: #4299e1;
        }
        
        .price-label {
          font-size: 0.7rem;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .market-structure {
          position: absolute;
          top: 1rem;
          left: 1rem;
          background: rgba(15, 20, 30, 0.95);
          padding: 0.75rem 1rem;
          border-radius: 6px;
          border: 1px solid rgba(66, 153, 225, 0.3);
          font-size: 0.8rem;
        }
        
        .trend-indicator {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-weight: 700;
        }
        
        .trend-indicator.uptrend {
          background: rgba(72, 187, 120, 0.2);
          color: #48bb78;
        }
        
        .trend-indicator.downtrend {
          background: rgba(245, 101, 101, 0.2);
          color: #f56565;
        }
        
        .trend-indicator.ranging {
          background: rgba(160, 174, 192, 0.2);
          color: #a0aec0;
        }
        
        .performance-panel {
          grid-column: 3;
          grid-row: 1;
        }
        
        .metric-card {
          background: rgba(15, 20, 30, 0.6);
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          border: 1px solid rgba(66, 153, 225, 0.2);
        }
        
        .metric-label {
          font-size: 0.7rem;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0.5rem;
        }
        
        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        
        .metric-value.positive {
          color: #48bb78;
        }
        
        .metric-value.negative {
          color: #f56565;
        }
        
        .trades-panel {
          grid-column: 1 / -1;
          grid-row: 2;
          max-height: 250px;
        }
        
        .trade-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .trade-item {
          background: rgba(15, 20, 30, 0.6);
          padding: 0.75rem 1rem;
          border-radius: 4px;
          display: grid;
          grid-template-columns: 50px 80px 100px 100px 100px 100px 1fr;
          gap: 1rem;
          align-items: center;
          font-size: 0.8rem;
          border: 1px solid rgba(66, 153, 225, 0.15);
          transition: all 0.2s;
        }
        
        .trade-item:hover {
          border-color: rgba(66, 153, 225, 0.4);
          background: rgba(15, 20, 30, 0.8);
        }
        
        .trade-id {
          color: #718096;
          font-weight: 700;
        }
        
        .trade-type {
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-weight: 700;
          text-align: center;
        }
        
        .trade-type.long {
          background: rgba(72, 187, 120, 0.2);
          color: #48bb78;
        }
        
        .trade-type.short {
          background: rgba(245, 101, 101, 0.2);
          color: #f56565;
        }
        
        .trade-outcome {
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-weight: 700;
          text-align: center;
        }
        
        .trade-outcome.win {
          background: rgba(72, 187, 120, 0.2);
          color: #48bb78;
        }
        
        .trade-outcome.loss {
          background: rgba(245, 101, 101, 0.2);
          color: #f56565;
        }
        
        .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(66, 153, 225, 0.3);
          border-top-color: #4299e1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .upload-zone {
          border: 2px dashed rgba(66, 153, 225, 0.3);
          border-radius: 6px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 1rem;
        }
        
        .upload-zone:hover {
          border-color: #4299e1;
          background: rgba(66, 153, 225, 0.05);
        }
        
        .upload-text {
          font-size: 0.85rem;
          color: #a0aec0;
        }
        
        .backtest-results {
          background: rgba(66, 153, 225, 0.1);
          padding: 1.5rem;
          border-radius: 6px;
          margin-top: 1rem;
          border: 1px solid rgba(66, 153, 225, 0.3);
        }
        
        .result-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          font-size: 0.85rem;
        }
        
        .result-label {
          color: #a0aec0;
        }
        
        .result-value {
          font-weight: 700;
          color: #e0e6ed;
        }
      `}</style>

      <div className="platform-header">
        <div className="platform-title">QUANTEX TERMINAL</div>
        <div className="header-stats">
          <div className="stat-item">
            <div className="stat-label">Paper Balance</div>
            <div className={`stat-value ${paperBalance >= 10000 ? 'positive' : 'negative'}`}>
              ${paperBalance.toLocaleString()}
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Total P&L</div>
            <div className={`stat-value ${metrics.totalPnL >= 0 ? 'positive' : 'negative'}`}>
              {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toFixed(2)}
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Win Rate</div>
            <div className="stat-value">{metrics.winRate}%</div>
          </div>
        </div>
      </div>

      <div className="platform-grid">
        <div className="panel controls-panel">
          <div className="panel-header">Controls</div>
          
          <div className="control-group">
            <label className="control-label">Market Type</label>
            <select 
              className="select-input"
              value={marketType}
              onChange={(e) => setMarketType(e.target.value)}
            >
              <option value="crypto">Crypto</option>
              <option value="forex">Forex</option>
              <option value="stocks">Stocks</option>
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">Symbol</label>
            <select 
              className="select-input"
              value={currentSymbol}
              onChange={(e) => setCurrentSymbol(e.target.value)}
            >
              {marketType === 'crypto' && (
                <>
                  <option value="BTC/USDT">BTC/USDT</option>
                  <option value="ETH/USDT">ETH/USDT</option>
                  <option value="SOL/USDT">SOL/USDT</option>
                </>
              )}
              {marketType === 'forex' && (
                <>
                  <option value="EUR/USD">EUR/USD</option>
                  <option value="GBP/USD">GBP/USD</option>
                  <option value="USD/JPY">USD/JPY</option>
                </>
              )}
              {marketType === 'stocks' && (
                <>
                  <option value="AAPL">AAPL</option>
                  <option value="MSFT">MSFT</option>
                  <option value="GOOGL">GOOGL</option>
                </>
              )}
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">Timeframe</label>
            <select 
              className="select-input"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <option value="1m">1 Minute</option>
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
              <option value="1H">1 Hour</option>
              <option value="4H">4 Hours</option>
              <option value="1D">Daily</option>
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">Risk Per Trade (%)</label>
            <input 
              type="number"
              className="number-input"
              value={riskPerTrade}
              onChange={(e) => setRiskPerTrade(parseFloat(e.target.value))}
              min="0.1"
              max="5"
              step="0.1"
            />
          </div>

          <button 
            className="action-button"
            onClick={runBacktest}
            disabled={isBacktesting}
          >
            {isBacktesting ? (
              <>
                <span className="loading-spinner"></span>
                Running...
              </>
            ) : (
              <>
                <BarChart3 size={18} />
                Run Backtest
              </>
            )}
          </button>

          <button 
            className={`action-button ${isPaperTrading ? 'danger' : 'secondary'}`}
            onClick={startPaperTrading}
          >
            {isPaperTrading ? (
              <>
                <Pause size={18} />
                Stop Paper Trading
              </>
            ) : (
              <>
                <Play size={18} />
                Start Paper Trading
              </>
            )}
          </button>

          <div className="upload-zone">
            <Upload size={24} style={{ marginBottom: '0.5rem', color: '#4299e1' }} />
            <div className="upload-text">Upload Strategy PDF</div>
            <div className="upload-text" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
              (Manual rule configuration)
            </div>
          </div>
        </div>

        <div className="panel chart-panel">
          <div className="panel-header">Price Chart - {currentSymbol} ({timeframe})</div>
          
          <div className="chart-container">
            <div className="price-display">
              <div className="price-label">Current Price</div>
              <div className="current-price">${currentPrice.toLocaleString()}</div>
            </div>

            <div className="market-structure">
              <div className={`trend-indicator ${structure.trend.toLowerCase()}`}>
                {structure.trend === 'UPTREND' && <TrendingUp size={16} />}
                {structure.trend === 'DOWNTREND' && <TrendingDown size={16} />}
                {structure.trend}
              </div>
              {structure.bos && (
                <div style={{ fontSize: '0.7rem', marginTop: '0.5rem', color: '#a0aec0' }}>
                  Break of Structure Detected
                </div>
              )}
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marketData}>
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#4a5568"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis 
                  stroke="#4a5568"
                  tick={{ fontSize: 10 }}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{
                    background: 'rgba(15, 20, 30, 0.95)',
                    border: '1px solid rgba(66, 153, 225, 0.3)',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="close" 
                  stroke="#4299e1" 
                  strokeWidth={2}
                  dot={false}
                />
                {trades.map((trade, idx) => (
                  <ReferenceLine 
                    key={idx}
                    x={trade.timestamp}
                    stroke={trade.type === 'LONG' ? '#48bb78' : '#f56565'}
                    strokeDasharray="3 3"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel performance-panel">
          <div className="panel-header">Performance</div>
          
          <div className="metric-card">
            <div className="metric-label">Total Trades</div>
            <div className="metric-value">{metrics.totalTrades}</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Win Rate</div>
            <div className="metric-value">{metrics.winRate}%</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Total P&L</div>
            <div className={`metric-value ${metrics.totalPnL >= 0 ? 'positive' : 'negative'}`}>
              {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toFixed(2)}
            </div>
          </div>

          {backtestResults && (
            <div className="backtest-results">
              <div className="panel-header" style={{ marginBottom: '1rem' }}>Backtest Results</div>
              <div className="result-row">
                <span className="result-label">Total Trades:</span>
                <span className="result-value">{backtestResults.totalTrades}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Wins:</span>
                <span className="result-value" style={{ color: '#48bb78' }}>{backtestResults.wins}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Losses:</span>
                <span className="result-value" style={{ color: '#f56565' }}>{backtestResults.losses}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Win Rate:</span>
                <span className="result-value">{backtestResults.winRate}%</span>
              </div>
              <div className="result-row">
                <span className="result-label">Profit Factor:</span>
                <span className="result-value">{backtestResults.profitFactor}</span>
              </div>
              <div className="result-row">
                <span className="result-label">Final Balance:</span>
                <span className={`result-value ${backtestResults.finalBalance >= 10000 ? 'positive' : 'negative'}`}>
                  ${backtestResults.finalBalance.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(66, 153, 225, 0.1)', borderRadius: '6px', fontSize: '0.75rem', color: '#a0aec0' }}>
            <AlertCircle size={16} style={{ marginBottom: '0.5rem', color: '#4299e1' }} />
            <div style={{ lineHeight: '1.5' }}>
              Phase 1 MVP with simplified strategy rules. Upload PDFs for reference only - manual configuration required.
            </div>
          </div>
        </div>

        <div className="panel trades-panel">
          <div className="panel-header">Trade History ({trades.length} trades)</div>
          
          {trades.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
              No trades executed yet. Run a backtest or start paper trading.
            </div>
          ) : (
            <div className="trade-list">
              {trades.slice().reverse().map((trade) => (
                <div key={trade.id} className="trade-item">
                  <div className="trade-id">#{trade.id}</div>
                  <div className={`trade-type ${trade.type.toLowerCase()}`}>{trade.type}</div>
                  <div>Entry: ${trade.entry.toFixed(2)}</div>
                  <div>SL: ${trade.stopLoss.toFixed(2)}</div>
                  <div>TP: ${trade.takeProfit.toFixed(2)}</div>
                  <div className={`trade-outcome ${trade.outcome}`}>{trade.outcome.toUpperCase()}</div>
                  <div style={{ color: trade.pnl >= 0 ? '#48bb78' : '#f56565', fontWeight: 700 }}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradingPlatform;
