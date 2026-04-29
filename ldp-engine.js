// ══════════════════════════════════════════════════════════════════
// LDP TRADING ENGINE — Decision logic + logging
// ══════════════════════════════════════════════════════════════════

const LDPEngine = (() => {

  // ── Internal state ────────────────────────────────────────────
  const log       = [];
  const MAX_LOG   = 200;
  let   running   = false;
  let   interval  = null;
  let   rounds    = 0;
  let   wins      = 0;
  let   losses    = 0;
  let   netPL     = 0;
  let   consecLoss= 0;
  let   currentStake = 1;

  // ── Config (reads from UI) ────────────────────────────────────
  function getConfig() {
    return {
      baseStake:  parseFloat(document.getElementById('botStake')?.value)    || 1,
      maxStake:   parseFloat(document.getElementById('botMaxStake')?.value)  || 50,
      maxLoss:    parseInt(document.getElementById('botMaxLoss')?.value)     || 5,
      takeProfit: parseFloat(document.getElementById('botTP')?.value)        || 10,
      stopLoss:   parseFloat(document.getElementById('botSL')?.value)        || 20,
      strategy:   state.strategy || 'martingale',
      multiplier: parseFloat(document.getElementById('botMultiplier')?.value)|| 2,
    };
  }

  // ── Logger ────────────────────────────────────────────────────
  function addLog(type, msg, data = null) {
    const entry = {
      time: new Date().toLocaleTimeString(),
      type,  // 'info' | 'trade' | 'skip' | 'warn' | 'block' | 'result'
      msg,
      data,
    };
    log.unshift(entry);
    if (log.length > MAX_LOG) log.pop();
    renderLog();
  }

  function renderLog() {
    const el = document.getElementById('ldpEngineLog');
    if (!el) return;
    const colors = {
      info:   'var(--text2)',
      trade:  'var(--accent)',
      skip:   'var(--accent3)',
      warn:   'var(--accent3)',
      block:  'var(--accent2)',
      result: '#00b8ff',
    };
    el.innerHTML = log.slice(0, 50).map(e => `
      <div style="
        display:flex;gap:8px;padding:3px 0;
        border-bottom:1px solid var(--border);
        font-size:.68rem;
      ">
        <span style="color:var(--text3);flex-shrink:0">${e.time}</span>
        <span style="color:${colors[e.type]||'var(--text2)'};flex:1">${e.msg}</span>
      </div>`).join('');
  }

  // ── Decision engine ───────────────────────────────────────────
  function analyze() {
    const dist    = LDPData.getDistribution();
    const sample  = LDPData.getSampleSize();
    const cfg     = getConfig();

    // ── Gate 1: Not enough data
    if (sample < 30) {
      addLog('skip', `⏳ Only ${sample} ticks — need 30+ to trade`);
      return null;
    }

    // ── Gate 2: Extreme market
    if (LDPData.isExtreme()) {
      const extremes = dist.filter(d => d.pct < 5 || d.pct > 15);
      addLog('block',
        `🚫 EXTREME blocked — digits: ${extremes.map(d=>d.digit+'('+d.pct+'%)').join(', ')}`
      );
      return null;
    }

    // ── Gate 3: Unstable market
    if (!LDPData.isStable()) {
      const unstable = dist.filter(d => d.pct < 7 || d.pct > 13);
      addLog('warn',
        `⚠️ UNSTABLE — digits out of range: ${unstable.map(d=>d.digit+'('+d.pct+'%)').join(', ')}`
      );
      return null;
    }

    // ── Gate 4: Flat market
    if (LDPData.isFlatMarket(state.chartData)) {
      addLog('skip', '📉 FLAT market — price not moving, skipping');
      return null;
    }

    // ── Gate 5: Consecutive loss limit
    if (consecLoss >= cfg.maxLoss) {
      addLog('block', `🛑 Max consecutive losses (${cfg.maxLoss}) reached — stopping`);
      stop('Max losses reached');
      return null;
    }

    // ── Gate 6: Take profit / Stop loss
    if (netPL >= cfg.takeProfit) {
      addLog('result', `🎯 Take Profit hit: +$${netPL.toFixed(2)}`);
      stop('Take Profit reached');
      return null;
    }
    if (netPL <= -cfg.stopLoss) {
      addLog('block', `🛑 Stop Loss hit: -$${Math.abs(netPL).toFixed(2)}`);
      stop('Stop Loss reached');
      return null;
    }

    // ── Find safe digits
    const best = LDPData.getBestOverUnder();
    if (!best || !best.safeDigits.length) {
      addLog('skip',
        '🔍 No safe digits in 9%–11% range — skipping trade'
      );
      return null;
    }

    // ── Log distribution snapshot
    const snapshot = dist.map(d =>
      `${d.digit}:${d.pct.toFixed(1)}%`
    ).join(' | ');
    addLog('info', `📊 Distribution: ${snapshot}`);
    addLog('trade',
      `✅ TRADE — Safe digits: [${best.safeDigits.join(',')}] ` +
      `Over→${best.overDigit} Under→${best.underDigit}`
    );

    return best;
  }

  // ── Next stake calculator ─────────────────────────────────────
  function nextStake(win) {
    const cfg = getConfig();
    switch (cfg.strategy) {
      case 'martingale':
        currentStake = win
          ? cfg.baseStake
          : Math.min(currentStake * cfg.multiplier, cfg.maxStake);
        break;
      case 'antimartingale':
        currentStake = win
          ? Math.min(currentStake * cfg.multiplier, cfg.maxStake)
          : cfg.baseStake;
        break;
      case 'dalembert':
        currentStake = win
          ? Math.max(cfg.baseStake, currentStake - cfg.baseStake)
          : Math.min(currentStake + cfg.baseStake, cfg.maxStake);
        break;
      case 'fibonacci':
        if (win) {
          state.fibIndex = Math.max(0, state.fibIndex - 2);
        } else {
          state.fibIndex++;
          while (state.fibSequence.length <= state.fibIndex) {
            const l = state.fibSequence.length;
            state.fibSequence.push(
              state.fibSequence[l-1] + state.fibSequence[l-2]
            );
          }
        }
        currentStake = Math.min(
          state.fibSequence[state.fibIndex] * cfg.baseStake,
          cfg.maxStake
        );
        break;
      case 'oscar':
        if (win) {
          state.oscarProfit += currentStake;
          if (state.oscarProfit < cfg.baseStake) {
            currentStake = Math.min(currentStake + cfg.baseStake, cfg.maxStake);
          } else {
            currentStake = cfg.baseStake;
            state.oscarProfit = 0;
          }
        }
        break;
      default:
        currentStake = cfg.baseStake;
    }
    return currentStake;
  }

  // ── Execute one bot tick ──────────────────────────────────────
  function tick() {
    const decision = analyze();
    if (!decision) return;

    const cfg      = getConfig();
    const contract = document.getElementById('botContract')?.value || 'even';
    const symbol   = SYMBOL_MAP[state.market] || 'R_100';

    // Place trade
    if (window.derivWS && window.derivWS.token) {
      // Real trade
      window.derivWS.buyContract({
        stake:         currentStake,
        symbol,
        contract_type: CONTRACT_MAP[contract],
        duration:      1,
        duration_unit: 't',
        ...(contract==='over'||contract==='under'
          ? { barrier: decision.overDigit }
          : {}),
      });
    } else {
      // Simulated result
      const win   = Math.random() > 0.45;
      const payout= win ? currentStake * 1.85 : 0;
      const pl    = win ? payout - currentStake : -currentStake;
      processResult(win, pl, currentStake, contract, decision);
    }

    rounds++;
    updateBotStatsUI();
  }

  // ── Process trade result ──────────────────────────────────────
  function processResult(win, pl, stake, contract, decision) {
    netPL     = parseFloat((netPL + pl).toFixed(2));
    state.balance = parseFloat((state.balance + pl).toFixed(2));

    if (win) {
      wins++;
      consecLoss = 0;
      addLog('result',
        `✅ WIN  +$${Math.abs(pl).toFixed(2)} | ` +
        `Stake:$${stake.toFixed(2)} | ${contract}`
      );
    } else {
      losses++;
      consecLoss++;
      addLog('result',
        `❌ LOSS -$${Math.abs(pl).toFixed(2)} | ` +
        `Stake:$${stake.toFixed(2)} | ${contract} | ` +
        `Consec:${consecLoss}`
      );
    }

    nextStake(win);

    // Add to trade history
    const trade = {
      id:       (state.allHistory.length + 1),
      time:     new Date().toLocaleTimeString(),
      market:   state.market,
      type:     'ldp-bot',
      contract,
      stake,
      payout:   win ? stake * 1.85 : 0,
      pl,
      result:   win ? 'win' : 'loss',
    };
    state.allHistory.unshift(trade);
    state.tradeHistory.unshift(trade);

    updateBalanceUI();
    renderHistory(state.tradeHistory.slice(0, 50));
    updateBotStatsUI();
    LDPUi.render(state.selectedDigit);
  }

  // ── Update bot stats UI ───────────────────────────────────────
  function updateBotStatsUI() {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('botCurrentStake', '$' + currentStake.toFixed(2));
    set('botRounds',       rounds);
    set('botConsecLoss',   consecLoss);

    const plEl = document.getElementById('botPL');
    if (plEl) {
      plEl.textContent = (netPL >= 0 ? '+' : '') + netPL.toFixed(2);
      plEl.className   = 'bot-stat-val ' + (netPL >= 0 ? 'up' : 'dn');
    }

    // Progress bar
    const cfg = getConfig();
    const total = cfg.takeProfit + cfg.stopLoss;
    const pos   = Math.min(Math.max((netPL + cfg.stopLoss) / total, 0), 1) * 100;
    const bar   = document.getElementById('botProgress');
    if (bar) bar.style.width = pos + '%';

    // Win rate
    const total2 = wins + losses;
    const wr     = total2 > 0 ? ((wins / total2) * 100).toFixed(1) + '%' : '0%';
    set('botWinRate', wr);
  }

  // ── Start ─────────────────────────────────────────────────────
  function start() {
    if (running) return;
    running    = true;
    currentStake = getConfig().baseStake;
    addLog('info', '▶ LDP Bot started');
    updateStatusUI(true);
    const speed = state.market.includes('1S') ? 900 : 1400;
    interval = setInterval(tick, speed);
  }

  // ── Stop ──────────────────────────────────────────────────────
  function stop(reason = 'Stopped') {
    running = false;
    clearInterval(interval);
    addLog('info', '⏹ Bot stopped — ' + reason);
    updateStatusUI(false, reason);
  }

  // ── Reset ─────────────────────────────────────────────────────
  function reset() {
    stop('Reset');
    rounds = wins = losses = consecLoss = 0;
    netPL  = 0;
    currentStake = getConfig().baseStake;
    state.fibIndex    = 0;
    state.fibSequence = [1, 1];
    state.oscarProfit = 0;
    log.length = 0;
    renderLog();
    updateBotStatsUI();
    addLog('info', '↺ Bot reset');
  }

  // ── Status UI ─────────────────────────────────────────────────
  function updateStatusUI(active, reason = '') {
    const dot  = document.getElementById('botStatusDot');
    const txt  = document.getElementById('botStatusText');
    const btn  = document.getElementById('botStartBtn');
    if (dot) dot.className = 'status-dot ' + (active ? 'running' : 'stopped');
    if (txt) txt.textContent = active ? '🤖 LDP Bot running...' : reason || 'Stopped';
    if (btn) btn.textContent = active ? '⏸ Pause Bot' : '▶ Start Bot';
  }

  // ── Toggle ────────────────────────────────────────────────────
  function toggle() {
    running ? stop('Paused by user') : start();
  }

  // ── Public API ────────────────────────────────────────────────
  return {
    tick, start, stop, reset, toggle,
    processResult, addLog,
    isRunning: () => running,
    getStats:  () => ({ rounds, wins, losses, netPL, consecLoss, currentStake }),
  };
})();
