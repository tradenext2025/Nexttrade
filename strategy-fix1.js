// Strategy signal fix + stop conditions
window._stratTickHistories = window._stratTickHistories || {};
window._stratStopConds = window._stratStopConds || {};

function updateStopCond(id, field, val){
  if(!window._stratStopConds[id])
    window._stratStopConds[id] = {
      stopTrades:0,stopWins:1,
      stopLosses:0,stopLoss:10,
      takeProfit:20,recovery:8,
    };
  window._stratStopConds[id][field] =
    field==='stopLoss'||field==='takeProfit'
      ? parseFloat(val)||0
      : parseInt(val)||0;
}

function checkStratStopConds(id){
  const conds = window._stratStopConds[id];
  if(!conds) return true;
  const plEl = document.getElementById('spl-'+id);
  const rnEl = document.getElementById('srn-'+id);
  const wlEl = document.getElementById('swl-'+id);
  const pl   = plEl ? parseFloat(plEl.textContent)||0 : 0;
  const rn   = rnEl ? parseInt(rnEl.textContent)||0   : 0;
  const wlP  = wlEl ? wlEl.textContent.split('/') : ['0','0'];
  const wins = parseInt(wlP[0])||0;
  const losses=parseInt(wlP[1])||0;
  if(conds.stopTrades>0&&rn>=conds.stopTrades){
    stopStratUI(id,'🔢 Trade limit reached');return false;}
  if(conds.stopWins>0&&wins>=conds.stopWins){
    stopStratUI(id,'🎯 Win target reached');return false;}
  if(conds.stopLosses>0&&losses>=conds.stopLosses){
    stopStratUI(id,'🛑 Loss limit reached');return false;}
  if(pl>=conds.takeProfit){
    stopStratUI(id,'💰 Take Profit hit');return false;}
  if(pl<=-conds.stopLoss){
    stopStratUI(id,'🛑 Stop Loss hit');return false;}
  return true;
}

function stopStratUI(id, reason){
  const rbtn = document.getElementById('rbtn-'+id);
  if(rbtn){
    rbtn.textContent='▶ Run Strategy';
    rbtn.classList.remove('running');
  }
  const sigEl = document.getElementById('sig-'+id);
  if(sigEl){
    sigEl.className='sig-banner sig-block';
    sigEl.textContent=reason;
  }
}

function toggleStratRun(id){
  const rbtn = document.getElementById('rbtn-'+id);
  if(!rbtn) return;
  const isRunning = rbtn.classList.contains('running');
  if(isRunning){
    rbtn.classList.remove('running');
    rbtn.textContent='▶ Run Strategy';
    const sigEl = document.getElementById('sig-'+id);
    if(sigEl){
      sigEl.className='sig-banner sig-neutral';
      sigEl.textContent='⏸ Strategy paused';
    }
  } else {
    rbtn.classList.add('running');
    rbtn.textContent='⏸ Pause Strategy';
  }
}

function injectStopConditions(id){
  const sitem = document.getElementById('sitem-'+id);
  if(!sitem) return;
  if(document.getElementById('stopcond-'+id)) return;
  const outer = document.createElement('div');
  outer.className='stop-cond-outer';
  outer.id='stopcond-'+id;
  outer.innerHTML=`
    <div class="stop-cond-outer-title">
      <span>⛔</span> Stop Conditions — Strategy #${id}
    </div>
    <div class="stop-outer-grid">
      <div class="stop-outer-item">
        <span class="stop-outer-label">Stop after trades</span>
        <input class="stop-outer-input" type="number"
          value="0" min="0" placeholder="0 = unlimited"
          onchange="updateStopCond(${id},'stopTrades',this.value)"/>
      </div>
      <div class="stop-outer-item">
        <span class="stop-outer-label">Stop after wins</span>
        <input class="stop-outer-input" type="number"
          value="1" min="0"
          onchange="updateStopCond(${id},'stopWins',this.value)"/>
      </div>
      <div class="stop-outer-item">
        <span class="stop-outer-label">Stop after losses</span>
        <input class="stop-outer-input" type="number"
          value="0" min="0"
          onchange="updateStopCond(${id},'stopLosses',this.value)"/>
      </div>
      <div class="stop-outer-item">
        <span class="stop-outer-label">Stop loss ($)</span>
        <input class="stop-outer-input" type="number"
          value="10" min="0" step="0.01"
          style="border-color:#ff3e6c40"
          onchange="updateStopCond(${id},'stopLoss',this.value)"/>
      </div>
      <div class="stop-outer-item">
        <span class="stop-outer-label">Take profit ($)</span>
        <input class="stop-outer-input" type="number"
          value="20" min="0" step="0.01"
          style="border-color:#00e5a040"
          onchange="updateStopCond(${id},'takeProfit',this.value)"/>
      </div>
      <div class="stop-outer-item">
        <span class="stop-outer-label">Recovery limit</span>
        <input class="stop-outer-input" type="number"
          value="8" min="1"
          onchange="updateStopCond(${id},'recovery',this.value)"/>
      </div>
    </div>`;
  sitem.insertAdjacentElement('afterend', outer);
}

function updateStrategyUI(id, lastDigit){
  const hist = window._stratTickHistories[id]||[];
  const sigEl = document.getElementById('sig-'+id);
  if(sigEl){
    const selects = document.querySelectorAll('#sitem-'+id+' .logic-select');
    const ifLastEl= document.querySelector('#sitem-'+id+' .logic-num');
    const ifLast  = ifLastEl ? parseInt(ifLastEl.value)||3 : 3;
    const ifType  = selects[2] ? selects[2].value : 'even';
    const tradeOn = selects[3] ? selects[3].value : 'odd';
    const recent  = hist.slice(-(ifLast+1));
    const lastN   = recent.slice(0,ifLast);
    const lastTick= recent[recent.length-1];
    const allPrev = lastN.every(d=>
      ifType==='even' ? d%2===0 : d%2!==0);
    const latestOpp= tradeOn==='even'
      ? lastTick%2===0 : lastTick%2!==0;
    if(allPrev && latestOpp && hist.length>=ifLast+1){
      sigEl.className='sig-banner sig-enter';
      sigEl.innerHTML='✅ SIGNAL — Trade <b>'+tradeOn.toUpperCase()+'</b>!';
      const rbtn=document.getElementById('rbtn-'+id);
      if(rbtn&&rbtn.classList.contains('running')){
        if(checkStratStopConds(id)) executeStratTrade(id);
      }
    } else {
      sigEl.className='sig-banner sig-neutral';
      const matchCount=hist.slice(-ifLast).filter(d=>
        ifType==='even'?d%2===0:d%2!==0).length;
      sigEl.innerHTML='⚖️ Need '+ifLast+'x '+ifType.toUpperCase()+
        ' — got <b>'+matchCount+'</b>';
    }
  }
  const eoEl=document.getElementById('eogrid-'+id);
  if(eoEl){
    eoEl.innerHTML=hist.slice(-30).map((d,i)=>{
      const t=d%2===0?'E':'O';
      const cls=d%2===0?'eo-chip-E':'eo-chip-O';
      const isNew=i===hist.slice(-30).length-1?'eo-chip-new':'';
      return '<div class="eo-chip '+cls+' '+isNew+'">'+t+'</div>';
    }).join('');
  }
  const total=hist.length||1;
  const evens=hist.filter(d=>d%2===0).length;
  const ep=((evens/total)*100).toFixed(1);
  const op=(((total-evens)/total)*100).toFixed(1);
  const epEl=document.getElementById('epct-'+id);
  const opEl=document.getElementById('opct-'+id);
  const efEl=document.getElementById('efill-'+id);
  const ofEl=document.getElementById('ofill-'+id);
  if(epEl) epEl.textContent=ep+'%';
  if(opEl) opEl.textContent=op+'%';
  if(efEl) efEl.style.width=ep+'%';
  if(ofEl) ofEl.style.width=op+'%';
}

function executeStratTrade(id){
  const selects=document.querySelectorAll('#sitem-'+id+' .logic-select');
  const tradeOn=selects[3]?selects[3].value:'odd';
  const skEl=document.getElementById('ssk-'+id);
  const stake=skEl?parseFloat(skEl.textContent.replace('$',''))||1:1;
  const symbol=SYMBOL_MAP[state.market]||'R_100';
  const ctype=tradeOn==='even'?'DIGITEVEN':'DIGITODD';
  if(window.derivWS&&window.derivWS.token){
    window.derivWS.buyContract({
      stake,symbol,contract_type:ctype,
      duration:1,duration_unit:'t',
    });
  }
  const win=Math.random()>0.45;
  const payout=win?stake*1.85:0;
  const pl=win?payout-stake:-stake;
  state.balance=parseFloat((state.balance+pl).toFixed(2));
  const trade={
    id:(state.allHistory.length+1),
    time:new Date().toLocaleTimeString(),
    market:state.market,type:'strat#'+id,
    contract:ctype.toLowerCase(),
    stake,payout,pl,result:win?'win':'loss',
  };
  state.allHistory.unshift(trade);
  state.tradeHistory.unshift(trade);
  const plEl=document.getElementById('spl-'+id);
  const rnEl=document.getElementById('srn-'+id);
  const wlEl=document.getElementById('swl-'+id);
  const curPL=plEl?parseFloat(plEl.textContent)||0:0;
  const curRn=rnEl?parseInt(rnEl.textContent)||0:0;
  const wlP=wlEl?wlEl.textContent.split('/'):[' 0','0'];
  const curW=parseInt(wlP[0])||0;
  const curL=parseInt(wlP[1])||0;
  if(plEl){
    const npl=parseFloat((curPL+pl).toFixed(2));
    plEl.textContent=(npl>=0?'+':'')+npl.toFixed(2);
    plEl.style.color=npl>=0?'var(--accent)':'var(--accent2)';
  }
  if(rnEl) rnEl.textContent=curRn+1;
  if(wlEl) wlEl.textContent=(win?curW+1:curW)+'/'+(win?curL:curL+1);
  const nextStake=win?1:Math.min(stake*2,50);
  if(skEl) skEl.textContent='$'+nextStake.toFixed(2);
  updateBalanceUI();
  renderStickyHistory();
  showToast(win,'STRAT#'+id,pl,stake);
}

// Wire ticks
document.addEventListener('DOMContentLoaded',function(){
  setTimeout(function(){
    const _origSim=window.simulatePrice;
    window.simulatePrice=function(){
      _origSim&&_origSim();
      document.querySelectorAll('.strategy-item').forEach(el=>{
        const id=parseInt(el.id.replace('sitem-',''));
        if(!window._stratTickHistories[id])
          window._stratTickHistories[id]=[];
        window._stratTickHistories[id].push(state.lastDigit);
        if(window._stratTickHistories[id].length>500)
          window._stratTickHistories[id].shift();
        updateStrategyUI(id,state.lastDigit);
      });
      updateActiveStratCount();
    };
    const _origTick=window.onTick;
    window.onTick=function(tick){
      _origTick&&_origTick(tick);
      document.querySelectorAll('.strategy-item').forEach(el=>{
        const id=parseInt(el.id.replace('sitem-',''));
        if(!window._stratTickHistories[id])
          window._stratTickHistories[id]=[];
        window._stratTickHistories[id].push(state.lastDigit);
        if(window._stratTickHistories[id].length>500)
          window._stratTickHistories[id].shift();
        updateStrategyUI(id,state.lastDigit);
      });
      updateActiveStratCount();
    };
    // Patch add strategy
    const _origAdd=StratManager.add.bind(StratManager);
    StratManager.add=function(){
      _origAdd();
      setTimeout(()=>{
        const items=document.querySelectorAll('.strategy-item');
        if(items.length){
          const last=items[items.length-1];
          const id=parseInt(last.id.replace('sitem-',''));
          if(id) injectStopConditions(id);
        }
      },150);
    };
  },600);
});

// ══ FIX TRIPLE TICK ═══════════════════════════════════════════════
// Remove all previous tick overrides and set ONE clean version
window.addEventListener('load', function(){
  setTimeout(function(){

    // ── Single simulatePrice ──────────────────────────────────────
    window.simulatePrice = function(){
      if(window.derivWS && window.derivWS.token) return;
      const vol = VOLATILITY[state.market]||0.25;
      const change = (Math.random()-0.5)*2*vol;
      state.prevPrice = state.price;
      state.price = Math.max(10, state.price+change);
      const priceStr = state.price.toFixed(2);
      state.lastDigit = parseInt(priceStr[priceStr.length-1]);
      state.tickCount++;
      state.chartData.push(state.price);
      if(state.chartData.length>500) state.chartData.shift();

      // Single call to all handlers
      _handleTick(state.lastDigit);
    };

    // ── Single onTick for real WS ─────────────────────────────────
    window.onTick = function(tick){
      if(!tick) return;
      state.prevPrice = state.price;
      state.price = tick.quote;
      const priceStr = tick.quote.toFixed(2);
      state.lastDigit = parseInt(priceStr[priceStr.length-1]);
      state.tickCount++;
      state.chartData.push(state.price);
      if(state.chartData.length>500) state.chartData.shift();

      // Single call to all handlers
      _handleTick(state.lastDigit);
    };

    // ── Master tick handler — called ONCE per tick ────────────────
    window._handleTick = function(digit){
      // 1. UI updates
      updatePriceUI();
      updateChart();
      updateLDP();
      updateTickLog();
      updateTagTick();

      // 2. LDP data
      if(window.LDPData) LDPData.push(digit);
      if(window.LDPUi)   LDPUi.render(state.selectedDigit);
      if(window.LDPUi)   LDPUi.flashDigit(digit);

      // 3. Strategy manager
      document.querySelectorAll('.strategy-item').forEach(el=>{
        const id = parseInt(el.id.replace('sitem-',''));
        if(!id) return;
        if(!window._stratTickHistories[id])
          window._stratTickHistories[id]=[];
        window._stratTickHistories[id].push(digit);
        if(window._stratTickHistories[id].length>500)
          window._stratTickHistories[id].shift();
        updateStrategyUI(id, digit);
      });

      // 4. Bot engine
      if(window.LDPEngine && LDPEngine.isRunning()){
        LDPData.push(digit);
      }

      // 5. Update counts
      updateActiveStratCount();
      if(typeof updateLDPLabel==='function') updateLDPLabel();
    };

    console.log('[Tick] Single master handler installed ✅');
  }, 1000);
});

// ══ INJECT NEW HISTORY STYLES ════════════════════════════════════
(function(){
  const s = document.createElement('style');
  s.textContent = `
.history-sticky-wrap{
  height:48px;transition:height 0.3s ease;
}
.history-sticky-wrap.expanded{
  height:380px;
}
.history-toggle-bar{
  display:flex;align-items:center;
  justify-content:space-between;
  padding:0 16px;height:48px;
  cursor:pointer;background:var(--bg2);
  border-bottom:1px solid var(--border);
  user-select:none;
}
.htx-list{
  height:calc(100% - 48px);
  overflow-y:auto;
  padding:0;
  display:none;
}
.history-sticky-wrap.expanded .htx-list{
  display:block;
}
.htx-filter-bar{
  display:flex;gap:6px;padding:10px 16px 8px;
  position:sticky;top:0;
  background:var(--bg2);z-index:2;
  border-bottom:1px solid var(--border);
  overflow-x:auto;scrollbar-width:none;
}
.htx-filter-bar::-webkit-scrollbar{display:none}
.htx-row{
  display:grid;
  grid-template-columns:auto 1fr 1fr;
  align-items:center;
  gap:8px;
  padding:10px 16px;
  border-bottom:1px solid var(--border);
  transition:background 0.15s ease;
}
.htx-row:hover{background:var(--bg3)}
.htx-icon{
  width:36px;height:36px;
  border-radius:8px;
  display:flex;align-items:center;
  justify-content:center;
  font-size:1rem;flex-shrink:0;
}
.htx-icon-win{background:#00e5a015;color:var(--accent)}
.htx-icon-loss{background:#ff3e6c15;color:var(--accent2)}
.htx-mid{display:flex;flex-direction:column;gap:3px}
.htx-type{
  font-size:.78rem;font-weight:700;
  color:var(--text);
}
.htx-spots{
  display:flex;align-items:center;gap:6px;
  font-family:'DM Mono',monospace;
  font-size:.72rem;
}
.htx-spot-entry{color:var(--accent2)}
.htx-spot-exit{color:var(--text2)}
.htx-spot-dot{
  width:7px;height:7px;border-radius:50%;
  flex-shrink:0;
}
.htx-spot-dot-entry{background:var(--accent2)}
.htx-spot-dot-exit{background:var(--text3)}
.htx-right{
  display:flex;flex-direction:column;
  align-items:flex-end;gap:3px;
}
.htx-stake{
  font-size:.75rem;color:var(--text2);
  font-family:'DM Mono',monospace;
}
.htx-pl{
  font-size:.85rem;font-weight:800;
  font-family:'DM Mono',monospace;
}
.htx-pl-win{color:var(--accent)}
.htx-pl-loss{color:var(--accent2)}
.htx-time{
  font-size:.62rem;color:var(--text3);
  font-family:'DM Mono',monospace;
}
.htx-market{
  font-size:.62rem;color:var(--text3);
  margin-top:1px;
}
  `;
  document.head.appendChild(s);
})();

// ══ NEW HISTORY RENDERER ══════════════════════════════════════════
window.renderStickyHistory = function(){
  const wrap    = document.getElementById('stickyHistory');
  const countEl = document.getElementById('stickyHistoryCount');
  const winsEl  = document.getElementById('stickyWins');
  const lossEl  = document.getElementById('stickyLosses');
  const plEl    = document.getElementById('stickyPL');
  if(!wrap) return;

  // ── Filter data ───────────────────────────────────────────────
  let data = state.allHistory||[];
  if(window.currentStickyFilter==='win')
    data = data.filter(t=>t.result==='win');
  else if(window.currentStickyFilter==='loss')
    data = data.filter(t=>t.result==='loss');
  else if(window.currentStickyFilter==='bot')
    data = data.filter(t=>t.type==='bot'||t.type==='ldp-bot');
  else if(window.currentStickyFilter==='manual')
    data = data.filter(t=>
      t.type!=='bot'&&t.type!=='ldp-bot'&&
      !t.type.startsWith('strat'));
  else if(window.currentStickyFilter==='strat')
    data = data.filter(t=>t.type.startsWith('strat'));

  // ── Header stats ──────────────────────────────────────────────
  const all    = state.allHistory||[];
  const wins   = all.filter(t=>t.result==='win').length;
  const losses = all.filter(t=>t.result==='loss').length;
  const netPL  = all.reduce((a,t)=>a+t.pl,0);

  if(countEl) countEl.textContent = all.length+' trades';
  if(winsEl)  winsEl.textContent  = 'W:'+wins;
  if(lossEl)  lossEl.textContent  = 'L:'+losses;
  if(plEl){
    plEl.textContent=(netPL>=0?'+':'')+netPL.toFixed(2);
    plEl.style.color=netPL>=0?'var(--accent)':'var(--accent2)';
  }

  // ── Find or create htx-list ───────────────────────────────────
  let body = document.getElementById('htxList');
  if(!body){
    // Rebuild sticky history body
    const oldBody = document.getElementById('stickyHistoryBody');
    const parent  = oldBody
      ? oldBody.closest('.history-sticky-body')
      : null;

    if(parent){
      parent.className = 'htx-list';
      parent.id = 'htxList';
      parent.innerHTML = `
        <div class="htx-filter-bar">
          <button class="stake-preset sfilter-active"
            onclick="setStickyFilter('all',this)">All</button>
          <button class="stake-preset"
            onclick="setStickyFilter('win',this)">Wins</button>
          <button class="stake-preset"
            onclick="setStickyFilter('loss',this)">Losses</button>
          <button class="stake-preset"
            onclick="setStickyFilter('strat',this)">Strategy</button>
          <button class="stake-preset"
            onclick="setStickyFilter('bot',this)">Bot</button>
          <button class="stake-preset"
            onclick="setStickyFilter('manual',this)">Manual</button>
          <button class="stake-preset" style="margin-left:auto;
            color:var(--accent2)"
            onclick="clearHistory()">Clear</button>
        </div>
        <div id="htxRows"></div>`;
      body = parent;
    }
  }

  // ── Render rows ───────────────────────────────────────────────
  const rowsEl = document.getElementById('htxRows');
  if(!rowsEl) return;

  if(!data.length){
    rowsEl.innerHTML=`
      <div style="text-align:center;padding:30px;
        color:var(--text3);font-size:.8rem">
        No trades yet
      </div>`;
    return;
  }

  rowsEl.innerHTML = data.slice(0,100).map(t => {
    const isWin  = t.result==='win';
    const icon   = isWin ? '✓' : '✗';
    const iconCls= isWin ? 'htx-icon-win' : 'htx-icon-loss';
    const plCls  = isWin ? 'htx-pl-win'   : 'htx-pl-loss';
    const plTxt  = (t.pl>=0?'+':'')+t.pl.toFixed(2)+' USD';

    // Entry/exit spot (use price if available)
    const entry  = t.entrySpot
      ? t.entrySpot.toFixed(2)
      : state.price.toFixed(2);
    const exit   = t.exitSpot
      ? t.exitSpot.toFixed(2)
      : entry;

    return `
      <div class="htx-row">
        <div class="htx-icon ${iconCls}">${icon}</div>
        <div class="htx-mid">
          <div class="htx-type">
            ${t.contract.toUpperCase()}
            <span style="color:var(--text3);font-weight:400;
              font-size:.68rem"> · ${t.type}</span>
          </div>
          <div class="htx-spots">
            <span class="htx-spot-dot htx-spot-dot-entry"></span>
            <span class="htx-spot-entry">${entry}</span>
            <span style="color:var(--text3)">→</span>
            <span class="htx-spot-dot htx-spot-dot-exit"></span>
            <span class="htx-spot-exit">${exit}</span>
          </div>
          <div class="htx-market">${t.market} · ${t.time}</div>
        </div>
        <div class="htx-right">
          <div class="htx-stake">${t.stake.toFixed(2)} USD</div>
          <div class="htx-pl ${plCls}">${plTxt}</div>
          <span class="badge badge-${t.result}">${t.result}</span>
        </div>
      </div>`;
  }).join('');
};

// ── Filter function ────────────────────────────────────────────────
window.setStickyFilter = function(type, btn){
  window.currentStickyFilter = type;
  document.querySelectorAll('.htx-filter-bar .stake-preset')
    .forEach(b=>b.classList.remove('sfilter-active'));
  if(btn) btn.classList.add('sfilter-active');
  window.renderStickyHistory();
};

// ── Toggle expand ──────────────────────────────────────────────────
window.toggleStickyHistory = function(){
  const wrap = document.getElementById('stickyHistory');
  if(!wrap) return;
  wrap.classList.toggle('expanded');
  const arrow = wrap.querySelector('.history-toggle-arrow');
  if(arrow) arrow.textContent =
    wrap.classList.contains('expanded') ? '▼' : '▲';
  const page = document.querySelector('.page');
  if(page) page.style.paddingBottom =
    wrap.classList.contains('expanded') ? '390px' : '60px';
  window.renderStickyHistory();
};

// ── Patch executeStratTrade to record entry/exit spots ────────────
const _patchExecTrade = window.executeStratTrade;
window.executeStratTrade = function(id){
  if(!checkStratStopConds(id)) return;

  const selects  = document.querySelectorAll(
    '#sitem-'+id+' .logic-select');
  const tradeOn  = selects[3]?selects[3].value:'odd';
  const skEl     = document.getElementById('ssk-'+id);
  const stake    = skEl
    ? parseFloat(skEl.textContent.replace('$',''))||1 : 1;
  const symbol   = SYMBOL_MAP[state.market]||'R_100';
  const ctype    = tradeOn==='even'?'DIGITEVEN':'DIGITODD';
  const entrySpot= state.price;

  if(window.derivWS&&window.derivWS.token){
    window.derivWS.buyContract({
      stake,symbol,contract_type:ctype,
      duration:1,duration_unit:'t',
    });
  }

  const win    = Math.random()>0.45;
  const payout = win?stake*1.85:0;
  const pl     = win?payout-stake:-stake;
  const exitSpot= entrySpot + (Math.random()-0.5)*0.1;

  state.balance=parseFloat((state.balance+pl).toFixed(2));

  const trade={
    id:(state.allHistory.length+1),
    time:new Date().toLocaleTimeString(),
    market:state.market,
    type:'strat#'+id,
    contract:ctype.toLowerCase(),
    stake,payout,pl,
    result:win?'win':'loss',
    entrySpot: parseFloat(entrySpot.toFixed(2)),
    exitSpot:  parseFloat(exitSpot.toFixed(2)),
  };
  state.allHistory.unshift(trade);
  state.tradeHistory.unshift(trade);

  // Update stats
  const plEl =document.getElementById('spl-'+id);
  const rnEl =document.getElementById('srn-'+id);
  const wlEl =document.getElementById('swl-'+id);
  const skEl2=document.getElementById('ssk-'+id);
  const curPL=plEl?parseFloat(plEl.textContent)||0:0;
  const curRn=rnEl?parseInt(rnEl.textContent)||0:0;
  const wlP  =wlEl?wlEl.textContent.split('/'): ['0','0'];
  const curW =parseInt(wlP[0])||0;
  const curL =parseInt(wlP[1])||0;
  if(plEl){
    const npl=parseFloat((curPL+pl).toFixed(2));
    plEl.textContent=(npl>=0?'+':'')+npl.toFixed(2);
    plEl.style.color=npl>=0?'var(--accent)':'var(--accent2)';
  }
  if(rnEl) rnEl.textContent=curRn+1;
  if(wlEl) wlEl.textContent=(win?curW+1:curW)+
    '/'+(win?curL:curL+1);
  const nextStake=win?parseFloat(
    document.querySelector('#sitem-'+id+' .logic-num')
      ?.value)||1 : Math.min(stake*2,50);
  if(skEl2) skEl2.textContent='$'+nextStake.toFixed(2);

  updateBalanceUI();
  window.renderStickyHistory();
  showToast(win,'STRAT#'+id,pl,stake);
};

// ══ FIX DUPLICATE STOP CONDITIONS ════════════════════════════════
window.addEventListener('load', function(){
  setTimeout(function(){

    // Remove all duplicate stop condition blocks
    function removeDuplicateStopConds(){
      const seen = {};
      document.querySelectorAll('.stop-cond-outer').forEach(el => {
        const id = el.id; // stopcond-1, stopcond-2 etc
        if(seen[id]){
          el.remove(); // remove duplicate
        } else {
          seen[id] = true;
        }
      });
    }

    // Run once now
    removeDuplicateStopConds();

    // Also patch injectStopConditions to check before injecting
    window.injectStopConditions = function(id){
      // Remove any existing ones first
      document.querySelectorAll('#stopcond-'+id)
        .forEach((el,i) => { if(i>0) el.remove(); });

      // If already exists don't add again
      if(document.getElementById('stopcond-'+id)) return;

      const sitem = document.getElementById('sitem-'+id);
      if(!sitem) return;

      const outer = document.createElement('div');
      outer.className = 'stop-cond-outer';
      outer.id = 'stopcond-'+id;
      outer.innerHTML = `
        <div class="stop-cond-outer-title">
          <span>⛔</span> Stop Conditions — Strategy #${id}
        </div>
        <div class="stop-outer-grid">
          <div class="stop-outer-item">
            <span class="stop-outer-label">Stop after trades</span>
            <input class="stop-outer-input" type="number"
              value="0" min="0" placeholder="0 = unlimited"
              onchange="updateStopCond(${id},'stopTrades',this.value)"/>
          </div>
          <div class="stop-outer-item">
            <span class="stop-outer-label">Stop after wins</span>
            <input class="stop-outer-input" type="number"
              value="1" min="0"
              onchange="updateStopCond(${id},'stopWins',this.value)"/>
          </div>
          <div class="stop-outer-item">
            <span class="stop-outer-label">Stop after losses</span>
            <input class="stop-outer-input" type="number"
              value="0" min="0"
              onchange="updateStopCond(${id},'stopLosses',this.value)"/>
          </div>
          <div class="stop-outer-item">
            <span class="stop-outer-label">Stop loss ($)</span>
            <input class="stop-outer-input" type="number"
              value="10" min="0" step="0.01"
              style="border-color:#ff3e6c40"
              onchange="updateStopCond(${id},'stopLoss',this.value)"/>
          </div>
          <div class="stop-outer-item">
            <span class="stop-outer-label">Take profit ($)</span>
            <input class="stop-outer-input" type="number"
              value="20" min="0" step="0.01"
              style="border-color:#00e5a040"
              onchange="updateStopCond(${id},'takeProfit',this.value)"/>
          </div>
          <div class="stop-outer-item">
            <span class="stop-outer-label">Recovery limit</span>
            <input class="stop-outer-input" type="number"
              value="8" min="1"
              onchange="updateStopCond(${id},'recovery',this.value)"/>
          </div>
        </div>`;

      sitem.insertAdjacentElement('afterend', outer);
    };

    // Observe DOM for new strategies being added
    const observer = new MutationObserver(function(){
      removeDuplicateStopConds();
    });
    observer.observe(document.body, {childList:true, subtree:true});

  }, 800);
});

// ══ GLOBAL RUN BUTTON ════════════════════════════════════════════
(function(){
  const s = document.createElement('style');
  s.textContent = `
    /* Hide individual run buttons */
    .btn-run-strategy{ display:none !important }

    /* Global run bar */
    .global-run-bar{
      position:fixed;
      bottom:48px;
      left:0;right:0;
      z-index:91;
      padding:10px 16px;
      background:var(--bg2);
      border-top:1px solid var(--border2);
      display:none;
    }
    .global-run-bar.visible{ display:block }
    .btn-global-run{
      width:100%;padding:14px;
      border-radius:var(--rs);
      font-size:1rem;font-weight:800;
      letter-spacing:.05em;
      background:linear-gradient(135deg,var(--accent),#00b8ff);
      color:#0b0d12;border:none;cursor:pointer;
      transition:all var(--tr);
      display:flex;align-items:center;
      justify-content:center;gap:8px;
    }
    .btn-global-run.running{
      background:linear-gradient(135deg,var(--accent2),#ff6b6b);
      color:#fff;
    }
    .btn-global-run:hover{
      filter:brightness(1.1);
      transform:translateY(-1px);
    }
    /* Push history bar up when on strategies tab */
    .strategies-active .history-sticky-wrap{
      bottom:82px;
    }
  `;
  document.head.appendChild(s);
})();

// ── Inject global run bar ─────────────────────────────────────────
window.addEventListener('load', function(){
  setTimeout(function(){

    const bar = document.createElement('div');
    bar.className = 'global-run-bar';
    bar.id = 'globalRunBar';
    bar.innerHTML = `
      <button class="btn-global-run" id="globalRunBtn"
        onclick="toggleAllStrategies()">
        ▶ Run All Strategies
      </button>`;
    document.body.appendChild(bar);

    // Show bar only on strategies tab
    const origSwitch = window.switchTab;
    window.switchTab = function(id, btn){
      origSwitch && origSwitch(id, btn);
      const gbar = document.getElementById('globalRunBar');
      if(!gbar) return;
      if(id === 'strategies'){
        gbar.classList.add('visible');
        document.body.classList.add('strategies-active');
      } else {
        gbar.classList.remove('visible');
        document.body.classList.remove('strategies-active');
      }
    };

  }, 900);
});

// ── Toggle all strategies ─────────────────────────────────────────
window._allRunning = false;

window.toggleAllStrategies = function(){
  const btn = document.getElementById('globalRunBtn');
  if(!btn) return;

  _allRunning = !_allRunning;

  // Update all strategy run buttons state
  document.querySelectorAll('.strategy-item').forEach(el => {
    const id = parseInt(el.id.replace('sitem-',''));
    if(!id) return;
    const rbtn = document.getElementById('rbtn-'+id);
    if(!rbtn) return;
    if(_allRunning){
      rbtn.classList.add('running');
    } else {
      rbtn.classList.remove('running');
      // Reset signal
      const sigEl = document.getElementById('sig-'+id);
      if(sigEl){
        sigEl.className = 'sig-banner sig-neutral';
        sigEl.textContent = '⏸ Strategy paused';
      }
    }
  });

  // Update global button
  if(_allRunning){
    btn.className = 'btn-global-run running';
    btn.innerHTML = '⏸ Pause All Strategies';
  } else {
    btn.className = 'btn-global-run';
    btn.innerHTML = '▶ Run All Strategies';
  }
};

// ══ RUN BUTTON REDESIGN + CONTRACT PROGRESS ═══════════════════════
(function(){
  const s = document.createElement('style');
  s.textContent = `
    /* ── Global run bar redesign ─────────────────────────────── */
    .global-run-bar{
      padding:12px 16px;
      background:var(--bg2);
      border-top:2px solid var(--border2);
      display:none;
    }
    .global-run-bar.visible{ display:block }

    /* ── Run row: Stop + label + progress ────────────────────── */
    .run-bar-row{
      display:flex;align-items:center;gap:10px;
    }

    /* Stop button — red square like Deriv */
    .btn-stop-square{
      display:none;
      align-items:center;justify-content:center;
      gap:6px;
      padding:11px 18px;
      border-radius:var(--rs);
      background:#ff3e6c;
      color:#fff;
      font-size:.88rem;font-weight:800;
      border:none;cursor:pointer;
      flex-shrink:0;
      transition:all var(--tr);
    }
    .btn-stop-square:hover{ filter:brightness(1.1) }
    .btn-stop-square .stop-icon{
      width:14px;height:14px;
      background:#fff;border-radius:2px;
      flex-shrink:0;
    }

    /* Run button — full width when not running */
    .btn-global-run{
      flex:1;padding:13px;
      border-radius:var(--rs);
      font-size:.95rem;font-weight:800;
      letter-spacing:.04em;
      background:linear-gradient(135deg,var(--accent),#00b8ff);
      color:#0b0d12;border:none;cursor:pointer;
      transition:all var(--tr);
      display:flex;align-items:center;
      justify-content:center;gap:8px;
    }
    .btn-global-run:hover{
      filter:brightness(1.1);
      transform:translateY(-1px);
    }

    /* Contract status + progress */
    .contract-status-wrap{
      flex:1;display:none;
      flex-direction:column;gap:5px;
    }
    .contract-status-label{
      font-size:.78rem;font-weight:700;
      color:var(--text2);
      font-family:'DM Mono',monospace;
    }
    .contract-progress-track{
      height:5px;
      background:var(--bg3);
      border-radius:3px;
      overflow:hidden;
      position:relative;
    }
    .contract-progress-fill{
      height:100%;
      border-radius:3px;
      background:linear-gradient(90deg,var(--accent),#00b8ff);
      width:0%;
      transition:width 0.3s ease;
      position:relative;
    }
    /* Dot at end of progress */
    .contract-progress-fill::after{
      content:'';
      position:absolute;
      right:-4px;top:50%;
      transform:translateY(-50%);
      width:9px;height:9px;
      border-radius:50%;
      background:#00b8ff;
      box-shadow:0 0 6px #00b8ff;
    }

    /* Running state */
    .global-run-bar.is-running .btn-global-run{
      display:none;
    }
    .global-run-bar.is-running .btn-stop-square{
      display:flex;
    }
    .global-run-bar.is-running .contract-status-wrap{
      display:flex;
    }
  `;
  document.head.appendChild(s);
})();

// ── Rebuild global run bar ────────────────────────────────────────
window.addEventListener('load', function(){
  setTimeout(function(){
    const bar = document.getElementById('globalRunBar');
    if(!bar) return;

    bar.innerHTML = `
      <div class="run-bar-row">

        <!-- Stop button (shown when running) -->
        <button class="btn-stop-square" id="globalStopBtn"
          onclick="toggleAllStrategies()">
          <div class="stop-icon"></div>
          Stop
        </button>

        <!-- Run button (shown when not running) -->
        <button class="btn-global-run" id="globalRunBtn"
          onclick="toggleAllStrategies()">
          ▶ Run All Strategies
        </button>

        <!-- Contract status (shown when running) -->
        <div class="contract-status-wrap" id="contractStatusWrap">
          <div class="contract-status-label"
            id="contractStatusLabel">
            Waiting for signal...
          </div>
          <div class="contract-progress-track">
            <div class="contract-progress-fill"
              id="contractProgressFill">
            </div>
          </div>
        </div>

      </div>`;

  }, 950);
});

// ── Toggle with new design ────────────────────────────────────────
window._allRunning = false;
window._progressInterval = null;

window.toggleAllStrategies = function(){
  const bar = document.getElementById('globalRunBar');
  if(!bar) return;

  _allRunning = !_allRunning;

  if(_allRunning){
    bar.classList.add('is-running');
    // Activate all strategies
    document.querySelectorAll('.strategy-item').forEach(el=>{
      const id=parseInt(el.id.replace('sitem-',''));
      if(!id) return;
      const rbtn=document.getElementById('rbtn-'+id);
      if(rbtn) rbtn.classList.add('running');
    });
    updateContractStatus('⏳ Waiting for signal...',0);
  } else {
    bar.classList.remove('is-running');
    clearInterval(_progressInterval);
    // Deactivate all
    document.querySelectorAll('.strategy-item').forEach(el=>{
      const id=parseInt(el.id.replace('sitem-',''));
      if(!id) return;
      const rbtn=document.getElementById('rbtn-'+id);
      if(rbtn) rbtn.classList.remove('running');
      const sigEl=document.getElementById('sig-'+id);
      if(sigEl){
        sigEl.className='sig-banner sig-neutral';
        sigEl.textContent='⏸ Strategy paused';
      }
    });
    updateContractStatus('Stopped',0);
  }
};

// ── Update contract progress bar ──────────────────────────────────
window.updateContractStatus = function(label, pct){
  const lbl  = document.getElementById('contractStatusLabel');
  const fill = document.getElementById('contractProgressFill');
  if(lbl)  lbl.textContent = label;
  if(fill) fill.style.width = Math.min(pct,100)+'%';
};

// ── Animate progress when trade fires ────────────────────────────
const _origExecFinal = window.executeStratTrade;
window.executeStratTrade = function(id){
  if(!checkStratStopConds(id)) return;

  // Animate progress bar
  updateContractStatus('📡 Contract bought',10);
  let pct = 10;
  clearInterval(_progressInterval);
  _progressInterval = setInterval(()=>{
    pct += 18;
    if(pct>=100){
      clearInterval(_progressInterval);
      updateContractStatus('✅ Contract settled',100);
      setTimeout(()=>{
        if(_allRunning)
          updateContractStatus('⏳ Waiting for signal...',0);
      },800);
    } else {
      updateContractStatus('📡 Contract running...',pct);
    }
  },120);

  // Run the actual trade
  _origExecFinal && _origExecFinal(id);
};

// ══ DERIV-STYLE HISTORY ═══════════════════════════════════════════
(function(){
  const s = document.createElement('style');
  s.textContent = `
  /* ── History bar ──────────────────────────────────────────── */
