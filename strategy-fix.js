
// ══ STYLES ════════════════════════════════════════════════════════
(function(){
const s=document.createElement('style');
s.textContent=`
.strategy-item .bot-stat{display:none!important}
.strategy-item div[style*="repeat(4"]{display:none!important}
.strategy-item .logic-row:has([min="0.35"]){display:none!important}
.btn-run-strategy{display:none!important}
.stop-cond-box{display:none!important}
.global-run-bar{
  position:fixed;bottom:48px;left:0;right:0;z-index:91;
  padding:10px 16px;background:var(--bg2);
  border-top:1px solid var(--border2);display:none;
}
.global-run-bar.visible{display:block}
.run-bar-row{display:flex;align-items:center;gap:10px}
.btn-stop-square{
  display:none;align-items:center;justify-content:center;
  gap:6px;padding:11px 18px;border-radius:var(--rs);
  background:#ff3e6c;color:#fff;font-size:.88rem;font-weight:800;
  border:none;cursor:pointer;flex-shrink:0;
}
.btn-stop-square .stop-icon{
  width:14px;height:14px;background:#fff;border-radius:2px;flex-shrink:0;
}
.btn-global-run{
  flex:1;padding:13px;border-radius:var(--rs);
  font-size:.95rem;font-weight:800;letter-spacing:.04em;
  background:linear-gradient(135deg,var(--accent),#00b8ff);
  color:#0b0d12;border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:8px;
}
.btn-global-run:hover{filter:brightness(1.1)}
.contract-status-wrap{flex:1;display:none;flex-direction:column;gap:5px}
.contract-status-label{
  font-size:.78rem;font-weight:700;
  color:var(--text2);font-family:'DM Mono',monospace;
}
.contract-progress-track{
  height:5px;background:var(--bg3);
  border-radius:3px;overflow:hidden;
}
.contract-progress-fill{
  height:100%;border-radius:3px;
  background:linear-gradient(90deg,var(--accent),#00b8ff);
  width:0%;transition:width 0.3s ease;
}
.global-run-bar.is-running .btn-global-run{display:none}
.global-run-bar.is-running .btn-stop-square{display:flex}
.global-run-bar.is-running .contract-status-wrap{display:flex}
.stop-cond-outer{
  background:var(--bg);border:1.5px solid var(--border2);
  border-radius:var(--r);padding:16px;
  margin-top:10px;margin-bottom:14px;
}
.stop-cond-outer-title{
  font-size:.78rem;font-weight:800;
  text-transform:uppercase;letter-spacing:.1em;
  color:var(--text2);margin-bottom:12px;
  display:flex;align-items:center;gap:8px;
}
.stop-outer-grid{
  display:grid;grid-template-columns:1fr 1fr;gap:10px;
}
.stop-outer-item{display:flex;flex-direction:column;gap:5px}
.stop-outer-label{
  font-size:.65rem;color:var(--text3);
  text-transform:uppercase;letter-spacing:.08em;
}
.stop-outer-input{
  background:var(--bg3);border:1.5px solid var(--border2);
  border-radius:var(--rs);color:var(--text);
  padding:9px 12px;font-size:.88rem;
  font-family:'DM Mono',monospace;
  transition:border var(--tr);width:100%;
}
.stop-outer-input:focus{border-color:var(--accent)}
.sfilter-active{
  border-color:var(--accent)!important;
  color:var(--accent)!important;
}
`;
document.head.appendChild(s);
})();

// ══ STAKE MANAGER ════════════════════════════════════════════════
function getStakeState(id){
  if(!window._stakeState[id]){
    const base=parseFloat(document.getElementById('sc-stake-'+id)?.value)||1;
    const mult=parseFloat(document.getElementById('sc-mult-'+id)?.value)||2;
    window._stakeState[id]={
      base,current:base,multiplier:mult,
      consecLoss:0,totalPL:0,wins:0,losses:0,rounds:0
    };
  }
  return window._stakeState[id];
}

function resetStakeState(id){delete window._stakeState[id];}

function getNextStake(id,win){
  const ss=getStakeState(id);
  const base=parseFloat(document.getElementById('sc-stake-'+id)?.value)||ss.base;
  const mult=parseFloat(document.getElementById('sc-mult-'+id)?.value)||ss.multiplier;
  ss.base=base;ss.multiplier=mult;
  const max=50;
  const sel=document.querySelectorAll('#sitem-'+id+' .logic-select');
  const algo=sel[1]?sel[1].value:'martingale';
  if(win){
    ss.consecLoss=0;
    if(algo==='martingale') ss.current=base;
    else if(algo==='antimartingale') ss.current=Math.min(ss.current*mult,max);
    else if(algo==='dalembert') ss.current=Math.max(base,ss.current-base);
    else if(algo==='fibonacci'){
      if(!ss._fib) ss._fib={seq:[1,1],idx:0};
      ss._fib.idx=Math.max(0,ss._fib.idx-2);
      ss.current=Math.min(ss._fib.seq[ss._fib.idx]*base,max);
    } else ss.current=base;
  } else {
    ss.consecLoss++;
    if(algo==='martingale') ss.current=Math.min(ss.current*mult,max);
    else if(algo==='antimartingale') ss.current=base;
    else if(algo==='dalembert') ss.current=Math.min(ss.current+base,max);
    else if(algo==='fibonacci'){
      if(!ss._fib) ss._fib={seq:[1,1],idx:0};
      ss._fib.idx++;
      while(ss._fib.seq.length<=ss._fib.idx){
        const l=ss._fib.seq.length;
        ss._fib.seq.push(ss._fib.seq[l-1]+ss._fib.seq[l-2]);
      }
      ss.current=Math.min(ss._fib.seq[ss._fib.idx]*base,max);
    } else ss.current=base;
  }
  ss.current=parseFloat(ss.current.toFixed(2));
  return ss.current;
}

// ══ STOP CONDITIONS ═══════════════════════════════════════════════
function updateStopCond(id,field,val){
  if(!window._stratStopConds[id])
    window._stratStopConds[id]={
      stopTrades:0,stopWins:1,stopLosses:0,
      stopLoss:10,takeProfit:20,recovery:8,
      baseStake:1,multiplier:2,
    };
  window._stratStopConds[id][field]=
    ['stopLoss','takeProfit','baseStake','multiplier'].includes(field)
      ?parseFloat(val)||0:parseInt(val)||0;
}

function checkStratStopConds(id){
  const c=window._stratStopConds[id];
  if(!c) return true;
  const ss=window._stakeState[id]||{};
  const pl=ss.totalPL||0;
  const rn=ss.rounds||0;
  const w=ss.wins||0;
  const l=ss.losses||0;
  if(c.stopTrades>0&&rn>=c.stopTrades){stopStratUI(id,'🔢 Trade limit');return false;}
  if(c.stopWins>0&&w>=c.stopWins){stopStratUI(id,'🎯 Win target reached');return false;}
  if(c.stopLosses>0&&l>=c.stopLosses){stopStratUI(id,'🛑 Loss limit');return false;}
  if(pl>=c.takeProfit){stopStratUI(id,'💰 Take Profit hit');return false;}
  if(pl<=-c.stopLoss){stopStratUI(id,'🛑 Stop Loss hit');return false;}
  return true;
}

function stopStratUI(id,reason){
  const rb=document.getElementById('rbtn-'+id);
  if(rb){rb.textContent='▶ Run Strategy';rb.classList.remove('running');}
  const sg=document.getElementById('sig-'+id);
  if(sg){sg.className='sig-banner sig-block';sg.textContent=reason;}
}

function toggleStratRun(id){
  const rb=document.getElementById('rbtn-'+id);
  if(!rb) return;
  if(rb.classList.contains('running')){
    rb.classList.remove('running');
    rb.textContent='▶ Run Strategy';
    const sg=document.getElementById('sig-'+id);
    if(sg){sg.className='sig-banner sig-neutral';sg.textContent='⏸ Paused';}
  } else {
    rb.classList.add('running');
    rb.textContent='⏸ Pause Strategy';
    resetStakeState(id);
  }
}

function injectStopConditions(id){
  document.querySelectorAll('#stopcond-'+id).forEach((el,i)=>{if(i>0)el.remove();});
  if(document.getElementById('stopcond-'+id)) return;
  const sitem=document.getElementById('sitem-'+id);
  if(!sitem) return;
  const outer=document.createElement('div');
  outer.className='stop-cond-outer';
  outer.id='stopcond-'+id;
  outer.innerHTML=`
    <div class="stop-cond-outer-title"><span>⛔</span>Stop Conditions — Strategy #${id}</div>
    <div class="stop-outer-grid">
      <div class="stop-outer-item">
        <span class="stop-outer-label">💰 Base Stake ($)</span>
        <input class="stop-outer-input" type="number" id="sc-stake-${id}"
          value="1.00" min="0.35" step="0.01" style="border-color:#00e5a040"
          onchange="updateStopCond(${id},'baseStake',this.value)"/>
      </div>
      <div class="stop-outer-item">
        <span class="stop-outer-label">📈 Multiplier</span>
        <input class="stop-outer-input" type="number" id="sc-mult-${id}"
          value="2.0" min="1.1" step="0.1" style="border-color:#00b8ff40"
          onchange="updateStopCond(${id},'multiplier',this.value)"/>
      </div>
      <div style="grid-column:1/-1;height:1px;background:var(--border);margin:4px 0"></div>
      <div class="stop-outer-item">
        <span class="stop-outer-label">Stop after trades</span>
        <input class="stop-outer-input" type="number" value="0" min="0"
          placeholder="0=unlimited" onchange="updateStopCond(${id},'stopTrades',this.value)"/>
      </div>
      <div class="stop-outer-item">
        <span class="stop-outer-label">Stop after wins</span>
        <input class="stop-outer-input" type="number" value="1" min="0"
          onchange="updateStopCond(${id},'stopWins',this.value)"/>
      </div>
      <div class="stop-outer-item">
        <span class="stop-outer-label">Stop after losses</span>
        <input class="stop-outer-input" type="number" value="0" min="0"
          onchange="updateStopCond(${id},'stopLosses',this.value)"/>
      </div>
      <div class="stop-outer-item">
        <span class="stop-outer-label">Stop loss ($)</span>
        <input class="stop-outer-input" type="number" value="10" min="0"
          step="0.01" style="border-color:#ff3e6c40"
          onchange="updateStopCond(${id},'stopLoss',this.value)"/>
      </div>
      <div class="stop-outer-item">
        <span class="stop-outer-label">Take profit ($)</span>
        <input class="stop-outer-input" type="number" value="20" min="0"
          step="0.01" style="border-color:#00e5a040"
          onchange="updateStopCond(${id},'takeProfit',this.value)"/>
      </div>
      <div class="stop-outer-item">
        <span class="stop-outer-label">Recovery limit</span>
        <input class="stop-outer-input" type="number" value="8" min="1"
          onchange="updateStopCond(${id},'recovery',this.value)"/>
      </div>
    </div>`;
  sitem.insertAdjacentElement('afterend',outer);
}

// ══ SIGNAL LOGIC ══════════════════════════════════════════════════
function getStratSignal(id){
  const hist=window._stratTickHistories[id]||[];
  const sel=document.querySelectorAll('#sitem-'+id+' .logic-select');
  const ifLastEl=document.querySelector('#sitem-'+id+' .logic-num');
  const ifLast=ifLastEl?parseInt(ifLastEl.value)||3:3;
  const ifType=sel[2]?sel[2].value:'odd';
  const tradeOn=sel[3]?sel[3].value:'even';
  if(hist.length<ifLast+1) return {sig:'wait',ifLast,ifType,tradeOn};
  const recent=hist.slice(-(ifLast+1));
  const prevN=recent.slice(0,ifLast);
  const lastTick=recent[recent.length-1];
  const allPrev=prevN.every(d=>ifType==='even'?d%2===0:d%2!==0);
  const lastIsTarget=tradeOn==='even'?lastTick%2===0:lastTick%2!==0;
  return {sig:allPrev&&lastIsTarget?'enter':'wait',ifLast,ifType,tradeOn};
}

function updateStrategyUI(id){
  const hist=window._stratTickHistories[id]||[];
  const {sig,ifLast,ifType,tradeOn}=getStratSignal(id);
  const sigEl=document.getElementById('sig-'+id);
  if(sigEl){
    if(sig==='enter'){
      sigEl.className='sig-banner sig-enter';
      sigEl.innerHTML='✅ SIGNAL — Trade <b>'+tradeOn.toUpperCase()+'</b>!';
      const rb=document.getElementById('rbtn-'+id);
      if(rb&&rb.classList.contains('running')){
        if(checkStratStopConds(id)) executeStratTrade(id);
      }
    } else {
      sigEl.className='sig-banner sig-neutral';
      const cnt=hist.slice(-ifLast).filter(d=>
        ifType==='even'?d%2===0:d%2!==0).length;
      sigEl.innerHTML='⚖️ Need '+ifLast+'x '+ifType.toUpperCase()+
        ' — got <b>'+cnt+'</b>';
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

// ══ EXECUTE TRADE ═════════════════════════════════════════════════
function executeStratTrade(id){
  if(!checkStratStopConds(id)) return;
  const ss=getStakeState(id);
  const stake=ss.current;
  const sel=document.querySelectorAll('#sitem-'+id+' .logic-select');
  const tradeOn=sel[3]?sel[3].value:'odd';
  const symbol=SYMBOL_MAP[state.market]||'R_100';
  const ctype=tradeOn==='even'?'DIGITEVEN':'DIGITODD';
  if(window.derivWS&&window.derivWS.token){
    window.derivWS.buyContract({
      stake,symbol,contract_type:ctype,duration:1,duration_unit:'t',
    });
  }
  const win=Math.random()>0.45;
  const payout=win?parseFloat((stake*1.85).toFixed(2)):0;
  const pl=win?parseFloat((payout-stake).toFixed(2)):-stake;
  ss.rounds++;
  ss.totalPL=parseFloat((ss.totalPL+pl).toFixed(2));
  state.balance=parseFloat((state.balance+pl).toFixed(2));
  if(win) ss.wins++; else ss.losses++;
  getNextStake(id,win);
  const entry=state.price;
  const exit=parseFloat((entry+(Math.random()-0.5)*0.1).toFixed(2));
  const trade={
    id:(state.allHistory.length+1),
    time:new Date().toLocaleTimeString(),
    market:state.market,type:'strat#'+id,
    contract:ctype.toLowerCase(),stake,payout,pl,
    result:win?'win':'loss',
    entrySpot:parseFloat(entry.toFixed(2)),exitSpot:exit,
  };
  state.allHistory.unshift(trade);
  state.tradeHistory.unshift(trade);
  window.updateBalanceUI&&window.updateBalanceUI();
  window.renderStickyHistory&&window.renderStickyHistory();
  showToast(win,'STRAT#'+id,pl,stake);
  updateContractStatus(
    win?'✅ WIN +$'+Math.abs(pl).toFixed(2):
        '❌ LOSS -$'+Math.abs(pl).toFixed(2),100);
  setTimeout(()=>{
    if(window._allRunning) updateContractStatus('⏳ Waiting...',0);
  },1000);
}

// ══ TICK HANDLER ══════════════════════════════════════════════════
function _handleTick(digit){
  updatePriceUI();updateChart();updateLDP();
  updateTickLog();updateTagTick();
  if(window.LDPData) LDPData.push(digit);
  if(window.LDPUi){LDPUi.render(state.selectedDigit);LDPUi.flashDigit(digit);}
  document.querySelectorAll('.strategy-item').forEach(el=>{
    const id=parseInt(el.id.replace('sitem-',''));
    if(!id) return;
    if(!window._stratTickHistories[id]) window._stratTickHistories[id]=[];
    window._stratTickHistories[id].push(digit);
    if(window._stratTickHistories[id].length>500) window._stratTickHistories[id].shift();
    updateStrategyUI(id);
  });
  updateActiveStratCount();
}

// ══ RUN ALL ═══════════════════════════════════════════════════════
function toggleAllStrategies(){
  const bar=document.getElementById('globalRunBar');
  if(!bar) return;
  window._allRunning=!window._allRunning;
  if(window._allRunning){
    bar.classList.add('is-running');
    document.querySelectorAll('.strategy-item').forEach(el=>{
      const id=parseInt(el.id.replace('sitem-',''));
      if(!id) return;
      resetStakeState(id);
      const rb=document.getElementById('rbtn-'+id);
      if(rb) rb.classList.add('running');
    });
    updateContractStatus('⏳ Waiting for signal...',0);
  } else {
    bar.classList.remove('is-running');
    document.querySelectorAll('.strategy-item').forEach(el=>{
      const id=parseInt(el.id.replace('sitem-',''));
      if(!id) return;
      const rb=document.getElementById('rbtn-'+id);
      if(rb) rb.classList.remove('running');
      const sg=document.getElementById('sig-'+id);
      if(sg){sg.className='sig-banner sig-neutral';sg.textContent='⏸ Paused';}
    });
    updateContractStatus('Stopped',0);
  }
}

function updateContractStatus(label,pct){
  const l=document.getElementById('contractStatusLabel');
  const f=document.getElementById('contractProgressFill');
  if(l) l.textContent=label;
  if(f) f.style.width=Math.min(pct,100)+'%';
}

function updateActiveStratCount(){
  const el=document.getElementById('activeStratCount');
  if(el) el.textContent=document.querySelectorAll('.strategy-item.sitem-active').length;
}

// ══ HISTORY ═══════════════════════════════════════════════════════
function renderStickyHistory(){
  const all=state.allHistory||[];
  const wins=all.filter(t=>t.result==='win').length;
  const losses=all.filter(t=>t.result==='loss').length;
  const netPL=all.reduce((a,t)=>a+t.pl,0);
  const totalS=all.reduce((a,t)=>a+t.stake,0);
  const totalP=all.reduce((a,t)=>a+(t.payout||0),0);
  const ce=document.getElementById('stickyHistoryCount');
  const we=document.getElementById('stickyWins');
  const le=document.getElementById('stickyLosses');
  const pe=document.getElementById('stickyPL');
  if(ce) ce.textContent=all.length+' trades';
  if(we) we.textContent='W:'+wins;
  if(le) le.textContent='L:'+losses;
  if(pe){pe.textContent=(netPL>=0?'+':'')+netPL.toFixed(2);pe.style.color=netPL>=0?'var(--accent)':'var(--accent2)';}
  const list=document.getElementById('htxList');
  if(!list) return;
  const f=window.currentStickyFilter||'all';
  let data=all;
  if(f==='win') data=all.filter(t=>t.result==='win');
  if(f==='loss') data=all.filter(t=>t.result==='loss');
  if(f==='strat') data=all.filter(t=>t.type&&t.type.startsWith('strat'));
  if(f==='bot') data=all.filter(t=>t.type==='bot'||t.type==='ldp-bot');
  if(f==='manual') data=all.filter(t=>t.type!=='bot'&&t.type!=='ldp-bot'&&!(t.type&&t.type.startsWith('strat')));
  list.innerHTML=`
    <div class="htx-filter-bar">
      <button class="stake-preset ${f==='all'?'sfilter-active':''}" onclick="setStickyFilter('all',this)">All</button>
      <button class="stake-preset ${f==='win'?'sfilter-active':''}" onclick="setStickyFilter('win',this)">Wins</button>
      <button class="stake-preset ${f==='loss'?'sfilter-active':''}" onclick="setStickyFilter('loss',this)">Losses</button>
      <button class="stake-preset ${f==='strat'?'sfilter-active':''}" onclick="setStickyFilter('strat',this)">Strategy</button>
      <button class="stake-preset ${f==='bot'?'sfilter-active':''}" onclick="setStickyFilter('bot',this)">Bot</button>
      <button class="stake-preset" style="margin-left:auto;color:var(--accent2)" onclick="clearHistory()">Clear</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--border);border-bottom:1px solid var(--border)">
      <div style="background:var(--bg2);padding:10px 12px">
        <div style="font-size:.6rem;color:var(--text3);text-transform:uppercase">Total stake</div>
        <div style="font-size:.85rem;font-weight:800;font-family:'DM Mono',monospace;margin-top:2px">${totalS.toFixed(2)} USD</div>
        <div style="font-size:.6rem;color:var(--text3);text-transform:uppercase;margin-top:8px">Contracts lost</div>
        <div style="font-size:.85rem;font-weight:800;color:var(--accent2);font-family:'DM Mono',monospace">${losses}</div>
      </div>
      <div style="background:var(--bg2);padding:10px 12px">
        <div style="font-size:.6rem;color:var(--text3);text-transform:uppercase">Total payout</div>
        <div style="font-size:.85rem;font-weight:800;font-family:'DM Mono',monospace;margin-top:2px">${totalP.toFixed(2)} USD</div>
        <div style="font-size:.6rem;color:var(--text3);text-transform:uppercase;margin-top:8px">Contracts won</div>
        <div style="font-size:.85rem;font-weight:800;color:var(--accent);font-family:'DM Mono',monospace">${wins}</div>
      </div>
      <div style="background:var(--bg2);padding:10px 12px">
        <div style="font-size:.6rem;color:var(--text3);text-transform:uppercase">No. of runs</div>
        <div style="font-size:.85rem;font-weight:800;font-family:'DM Mono',monospace;margin-top:2px">${all.length}</div>
        <div style="font-size:.6rem;color:var(--text3);text-transform:uppercase;margin-top:8px">Total P/L</div>
        <div style="font-size:.85rem;font-weight:800;font-family:'DM Mono',monospace;color:${netPL>=0?'var(--accent)':'var(--accent2)'}">${(netPL>=0?'+':'')+netPL.toFixed(2)} USD</div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 16px;border-bottom:1px solid var(--border);background:var(--bg3)">
      <span style="font-size:.72rem;color:var(--text2)">Account Balance</span>
      <span style="font-family:'DM Mono',monospace;font-weight:800;font-size:.88rem;color:var(--accent)" id="htxBalanceRow">${state.balance.toFixed(2)} USD</span>
    </div>
    <div style="display:grid;grid-template-columns:48px 1fr 1fr;padding:8px 16px;border-bottom:1px solid var(--border)">
      <span style="font-size:.62rem;font-weight:700;text-transform:uppercase;color:var(--text3)">Type</span>
      <span style="font-size:.62rem;font-weight:700;text-transform:uppercase;color:var(--text3)">Entry/Exit spot</span>
      <span style="font-size:.62rem;font-weight:700;text-transform:uppercase;color:var(--text3);text-align:right">Buy price and P/L</span>
    </div>
    ${!data.length?'<div style="text-align:center;padding:24px;color:var(--text3);font-size:.8rem">No trades yet</div>':
    data.slice(0,100).map(t=>{
      const isWin=t.result==='win';
      const col=isWin?'#00e5a0':'#ff3e6c';
      const entry=(t.entrySpot||state.price).toFixed(2);
      const exit=(t.exitSpot||t.entrySpot||state.price).toFixed(2);
      return `<div style="display:grid;grid-template-columns:48px 1fr 1fr;align-items:center;padding:10px 16px;border-bottom:1px solid var(--border);gap:4px" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
        <div style="display:flex;align-items:center;justify-content:center">
          <div style="width:36px;height:36px;border-radius:8px;background:${col}15;border:1px solid ${col}30;display:flex;align-items:center;justify-content:center">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <rect x="2" y="8" width="3" height="10" rx="1" fill="${col}" opacity=".8"/>
              <rect x="7" y="4" width="3" height="14" rx="1" fill="${col}" opacity=".6"/>
              <rect x="12" y="9" width="3" height="9" rx="1" fill="${col}" opacity=".8"/>
              <rect x="17" y="5" width="3" height="13" rx="1" fill="${col}" opacity=".6"/>
              <path d="M3.5 13 L8.5 8 L13.5 12 L18.5 6" stroke="${col}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <div style="display:flex;align-items:center;gap:5px;font-family:'DM Mono',monospace;font-size:.78rem">
            <span style="width:8px;height:8px;border-radius:50%;background:#ff4444;flex-shrink:0;display:inline-block"></span>
            <span>${entry}</span>
          </div>
          <div style="display:flex;align-items:center;gap:5px;font-family:'DM Mono',monospace;font-size:.78rem">
            <span style="width:8px;height:8px;border-radius:50%;background:#666;flex-shrink:0;display:inline-block;opacity:0.5"></span>
            <span style="color:var(--text2)">${exit}</span>
          </div>
          <div style="font-size:.65rem;color:var(--text3)">${t.contract.toUpperCase()}·${t.market}·${t.time}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <span style="font-size:.82rem;font-family:'DM Mono',monospace">${t.stake.toFixed(2)} USD</span>
          <span style="font-size:.82rem;font-weight:800;font-family:'DM Mono',monospace;color:${col}">${(t.pl>=0?'+':'')+t.pl.toFixed(2)} USD</span>
        </div>
      </div>`;
    }).join('')}`;
}

function setStickyFilter(type,btn){
  window.currentStickyFilter=type;
  renderStickyHistory();
}

function toggleStickyHistory(){
  const wrap=document.getElementById('stickyHistory');
  if(!wrap) return;
  wrap.classList.toggle('expanded');
  const arrow=wrap.querySelector('.history-toggle-arrow');
  if(arrow) arrow.textContent=wrap.classList.contains('expanded')?'▼':'▲';
  const page=document.querySelector('.page');
  if(page) page.style.paddingBottom=wrap.classList.contains('expanded')?'390px':'60px';
  renderStickyHistory();
}

// ══ INIT ══════════════════════════════════════════════════════════
window.addEventListener('load',function(){
  setTimeout(function(){

    // Single simulatePrice
    window.simulatePrice=function(){
      if(window.derivWS&&window.derivWS.token) return;
      const vol=VOLATILITY[state.market]||0.25;
      state.prevPrice=state.price;
      state.price=Math.max(10,state.price+(Math.random()-0.5)*2*vol);
      const ps=state.price.toFixed(2);
      state.lastDigit=parseInt(ps[ps.length-1]);
      state.tickCount++;
      state.chartData.push(state.price);
      if(state.chartData.length>500) state.chartData.shift();
      _handleTick(state.lastDigit);
    };

    // Single onTick
    window.onTick=function(tick){
      if(!tick) return;
      state.prevPrice=state.price;
      state.price=tick.quote;
      const ps=tick.quote.toFixed(2);
      state.lastDigit=parseInt(ps[ps.length-1]);
      state.tickCount++;
      state.chartData.push(state.price);
      if(state.chartData.length>500) state.chartData.shift();
      _handleTick(state.lastDigit);
    };

    // Rebuild history bar
    const wrap=document.getElementById('stickyHistory');
    if(wrap){
      wrap.innerHTML=`
        <div class="history-toggle-bar" onclick="toggleStickyHistory()">
          <div class="history-toggle-title">
            <span class="live-dot"></span>Trade History
            <span id="stickyHistoryCount" style="background:#00e5a020;color:var(--accent);font-size:.65rem;padding:2px 8px;border-radius:20px;font-weight:700;font-family:'DM Mono',monospace">0 trades</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="color:var(--accent);font-size:.72rem" id="stickyWins">W:0</span>
            <span style="color:var(--accent2);font-size:.72rem" id="stickyLosses">L:0</span>
            <span id="stickyPL" style="font-family:'DM Mono',monospace;font-weight:700;color:var(--accent);font-size:.72rem">+0.00</span>
            <span class="history-toggle-arrow" style="font-size:1rem;color:var(--text2)">▲</span>
          </div>
        </div>
        <div class="htx-list" id="htxList"></div>`;
    }

    // Build global run bar
    let gbar=document.getElementById('globalRunBar');
    if(!gbar){gbar=document.createElement('div');gbar.id='globalRunBar';gbar.className='global-run-bar';document.body.appendChild(gbar);}
    gbar.innerHTML=`
      <div class="run-bar-row">
        <button class="btn-stop-square" id="globalStopBtn" onclick="toggleAllStrategies()">
          <div class="stop-icon"></div>Stop
        </button>
        <button class="btn-global-run" id="globalRunBtn" onclick="toggleAllStrategies()">
          ▶ Run All Strategies
        </button>
        <div class="contract-status-wrap" id="contractStatusWrap">
          <div class="contract-status-label" id="contractStatusLabel">Waiting for signal...</div>
          <div class="contract-progress-track">
            <div class="contract-progress-fill" id="contractProgressFill"></div>
          </div>
        </div>
      </div>`;

    // Show on strategies tab
    const _sw=window.switchTab;
    window.switchTab=function(id,btn){
      _sw&&_sw(id,btn);
      const gb=document.getElementById('globalRunBar');
      if(gb) gb.classList.toggle('visible',id==='strategies');
    };

    // Patch StratManager.add
    const _origAdd=StratManager.add.bind(StratManager);
    StratManager.add=function(){
      _origAdd();
      setTimeout(()=>{
        const items=document.querySelectorAll('.strategy-item');
        if(!items.length) return;
        const last=items[items.length-1];
        const id=parseInt(last.id.replace('sitem-',''));
        if(!id) return;
        const old=document.getElementById('stopcond-'+id);
        if(old) old.remove();
        injectStopConditions(id);
      },150);
    };

    // Inject for existing strategies
    document.querySelectorAll('.strategy-item').forEach(el=>{
      const id=parseInt(el.id.replace('sitem-',''));
      if(!id) return;
      const old=document.getElementById('stopcond-'+id);
      if(old) old.remove();
      injectStopConditions(id);
    });

    // Sync balance
    const _origBal=window.updateBalanceUI;
    window.updateBalanceUI=function(){
      _origBal&&_origBal();
      const hb=document.getElementById('htxBalanceRow');
      if(hb) hb.textContent=state.balance.toFixed(2)+' USD';
      const nb=document.getElementById('navBalance');
      if(nb) nb.textContent=state.balance.toFixed(2)+' USD';
    };

    const _origOnBal=window.onBalance;
    window.onBalance=function(data){
      if(!data) return;
      state.balance=parseFloat(data.balance);
      _origOnBal&&_origOnBal(data);
      window.updateBalanceUI();
      renderStickyHistory();
    };

    renderStickyHistory();
    updateActiveStratCount();
    console.log('[NextTrade v3] ✅ Loaded');
  },800);
});

// ══ FIX LDP ═══════════════════════════════════════════════════════
window.addEventListener('load', function(){
  setTimeout(function(){

    // ── 1. Start LDP counting immediately on page load ────────
    // Don't wait for login — simulate ticks from start
    if(!window._ldpGlobalHistory) window._ldpGlobalHistory = [];

    // Override _handleTick to always record
    const _origHandle = window._handleTick;
    window._handleTick = function(digit){
      // Always push to global LDP history
      window._ldpGlobalHistory.push(digit);
      if(window._ldpGlobalHistory.length > 1000)
        window._ldpGlobalHistory.shift();

      // Push to all strategy histories too
      document.querySelectorAll('.strategy-item').forEach(el=>{
        const id=parseInt(el.id.replace('sitem-',''));
        if(!id) return;
        if(!window._stratTickHistories[id])
          window._stratTickHistories[id]=[];
        window._stratTickHistories[id].push(digit);
        if(window._stratTickHistories[id].length>500)
          window._stratTickHistories[id].shift();
        updateStrategyUI(id);
      });

      // Call original for UI updates
      updatePriceUI();
      updateChart();
      updateTagTick();
      if(window.LDPData) LDPData.push(digit);
      if(window.LDPUi){
        LDPUi.render(state.selectedDigit);
        LDPUi.flashDigit(digit);
      }
      updateActiveLDP();
      updateActiveStratCount();
    };

    // ── 2. Fix EO grid direction — newest on RIGHT ────────────
    // Override updateStrategyUI eo grid to show oldest→newest
    const _origUpdateUI = window.updateStrategyUI;
    window.updateStrategyUI = function(id){
      const hist = window._stratTickHistories[id]||[];
      const {sig,ifLast,ifType,tradeOn} = getStratSignal(id);

      // Signal banner
      const sigEl = document.getElementById('sig-'+id);
      if(sigEl){
        if(sig==='enter'){
          sigEl.className='sig-banner sig-enter';
          sigEl.innerHTML='✅ SIGNAL — Trade <b>'+tradeOn.toUpperCase()+'</b>!';
          const rb=document.getElementById('rbtn-'+id);
          if(rb&&rb.classList.contains('running')){
            if(checkStratStopConds(id)) executeStratTrade(id);
          }
        } else {
          sigEl.className='sig-banner sig-neutral';
          const cnt=hist.slice(-ifLast).filter(d=>
            ifType==='even'?d%2===0:d%2!==0).length;
          sigEl.innerHTML='⚖️ Need '+ifLast+'x '+
            ifType.toUpperCase()+' — got <b>'+cnt+'</b>';
        }
      }

      // EO grid — LEFT=oldest RIGHT=newest (natural reading order)
      const eoEl=document.getElementById('eogrid-'+id);
      if(eoEl){
        const last30=hist.slice(-30); // already oldest→newest
        eoEl.innerHTML=last30.map((d,i)=>{
          const t=d%2===0?'E':'O';
          const cls=d%2===0?'eo-chip-E':'eo-chip-O';
          // Highlight last N digits
          const isRecent=i>=last30.length-ifLast;
          const isNewest=i===last30.length-1;
          return '<div class="eo-chip '+cls+
            (isNewest?' eo-chip-new':'')+
            (isRecent?' eo-chip-recent':'')+'">'+t+'</div>';
        }).join('');
      }

      // Distribution bars
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
    };

    // ── 3. LDP per market — update on market change ───────────
    window.updateActiveLDP = function(){
      // Update LDP section sample size
      const el=document.getElementById('ldpSampleSize');
      if(el) el.textContent=
        'Last '+(window._ldpGlobalHistory.length)+' / 1000 ticks';

      // Update tick log
      updateTickLog();
    };

    // Override onMarketChange to reset LDP history per market
    const _origMarket = window.onMarketChange;
    window.onMarketChange = function(){
      if(_origMarket) _origMarket();
      // Reset strategy tick histories for new market
      document.querySelectorAll('.strategy-item').forEach(el=>{
        const id=parseInt(el.id.replace('sitem-',''));
        if(id) window._stratTickHistories[id]=[];
      });
      // Subscribe to new market ticks
      if(window.derivWS&&window.derivWS.connected){
        const symbol=SYMBOL_MAP[state.market]||'R_100';
        window.derivWS.subscribeTicks(symbol);
      }
    };

    // ── Add recent highlight style ────────────────────────────
    const s=document.createElement('style');
    s.textContent=`
      .eo-chip-recent{
        opacity:1;
        box-shadow:0 0 6px rgba(255,255,255,0.15);
      }
      .eo-chip-E.eo-chip-recent{
        border:1.5px solid #00e5a060;
      }
      .eo-chip-O.eo-chip-recent{
        border:1.5px solid #ff3e6c60;
      }
    `;
    document.head.appendChild(s);

    console.log('[LDP] Fixed ✅');
  }, 1200);
});

// ══ FIX LDP DIRECTION + ALWAYS COUNT ════════════════════════════
window.addEventListener('load',function(){
  setTimeout(function(){

    // 1. Always count from page load
    const _origSim = window.simulatePrice;
    window.simulatePrice = function(){
      if(window.derivWS&&window.derivWS.token) return;
      const vol=VOLATILITY[state.market]||0.25;
      state.prevPrice=state.price;
      state.price=Math.max(10,state.price+(Math.random()-0.5)*2*vol);
      const ps=state.price.toFixed(2);
      state.lastDigit=parseInt(ps[ps.length-1]);
      state.tickCount++;
      state.chartData.push(state.price);
      if(state.chartData.length>500) state.chartData.shift();
      // Feed all strategies immediately
      document.querySelectorAll('.strategy-item').forEach(el=>{
        const id=parseInt(el.id.replace('sitem-',''));
        if(!id) return;
        if(!window._stratTickHistories[id]) window._stratTickHistories[id]=[];
        window._stratTickHistories[id].push(state.lastDigit);
        if(window._stratTickHistories[id].length>500) window._stratTickHistories[id].shift();
        updateStrategyUI(id);
      });
      updatePriceUI();updateChart();updateLDP();
      updateTickLog();updateTagTick();
      if(window.LDPData) LDPData.push(state.lastDigit);
      if(window.LDPUi){LDPUi.render(state.selectedDigit);LDPUi.flashDigit(state.lastDigit);}
      updateActiveStratCount();
    };

    // 2. Fix EO grid LEFT=oldest RIGHT=newest
    const _origUI=window.updateStrategyUI;
    window.updateStrategyUI=function(id){
      const hist=window._stratTickHistories[id]||[];
      const {sig,ifLast,ifType,tradeOn}=getStratSignal(id);
      const sigEl=document.getElementById('sig-'+id);
      if(sigEl){
        if(sig==='enter'){
          sigEl.className='sig-banner sig-enter';
          sigEl.innerHTML='✅ SIGNAL — Trade <b>'+tradeOn.toUpperCase()+'</b>!';
          const rb=document.getElementById('rbtn-'+id);
          if(rb&&rb.classList.contains('running')){
            if(checkStratStopConds(id)) executeStratTrade(id);
          }
        } else {
          sigEl.className='sig-banner sig-neutral';
          const cnt=hist.slice(-ifLast).filter(d=>
            ifType==='even'?d%2===0:d%2!==0).length;
          sigEl.innerHTML='⚖️ Need '+ifLast+'x '+ifType.toUpperCase()+' — got <b>'+cnt+'</b>';
        }
      }
      // LEFT=oldest RIGHT=newest
      const eoEl=document.getElementById('eogrid-'+id);
      if(eoEl){
        const last30=hist.slice(-30);
        eoEl.innerHTML=last30.map((d,i)=>{
          const t=d%2===0?'E':'O';
          const cls=d%2===0?'eo-chip-E':'eo-chip-O';
          const isNew=i===last30.length-1?'eo-chip-new':'';
          const isRecent=i>=last30.length-ifLast?'style="box-shadow:0 0 6px rgba(255,255,255,0.2)"':'';
          return '<div class="eo-chip '+cls+' '+isNew+'" '+isRecent+'>'+t+'</div>';
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
    };

  },1500);
});

// ══ VOLATILITY SWITCHER PER STRATEGY ════════════════════════════
window.addEventListener('load',function(){
  setTimeout(function(){

    // Patch StratManager.render to add volatility selector
    const _origRender = StratManager.render.bind(StratManager);
    StratManager.render = function(){
      _origRender();
      // Add volatility selector to each strategy
      document.querySelectorAll('.strategy-item').forEach(el=>{
        const id=parseInt(el.id.replace('sitem-',''));
        if(!id) return;
        if(document.getElementById('strat-vol-'+id)) return;
        const body=el.querySelector('.strategy-item-body');
        if(!body) return;
        const volWrap=document.createElement('div');
        volWrap.className='logic-row';
        volWrap.style.marginBottom='12px';
        volWrap.innerHTML=`
          <span class="strat-label">Market</span>
          <div class="select-wrap" style="flex:1">
            <select class="logic-select" id="strat-vol-${id}"
              style="width:100%"
              onchange="switchStratMarket(${id},this.value)">
              <optgroup label="Volatility Index">
                <option value="V10">Volatility 10</option>
                <option value="V25">Volatility 25</option>
                <option value="V50">Volatility 50</option>
                <option value="V75">Volatility 75</option>
                <option value="V100" selected>Volatility 100</option>
              </optgroup>
              <optgroup label="Volatility 1s">
                <option value="V10_1S">Volatility 10(1s)</option>
                <option value="V25_1S">Volatility 25(1s)</option>
                <option value="V50_1S">Volatility 50(1s)</option>
                <option value="V75_1S">Volatility 75(1s)</option>
                <option value="V100_1S">Volatility 100(1s)</option>
              </optgroup>
            </select>
          </div>`;
        // Insert at top of body
        body.insertBefore(volWrap, body.firstChild);
      });
    };

    // Per-strategy market map
    window._stratMarkets = {};

    window.switchStratMarket = function(id, market){
      window._stratMarkets[id] = market;
      // Reset tick history for this strategy
      window._stratTickHistories[id] = [];
      resetStakeState(id);
      // Update signal
      const sigEl=document.getElementById('sig-'+id);
      if(sigEl){
        sigEl.className='sig-banner sig-neutral';
        sigEl.textContent='⚖️ Switched to '+market+' — collecting ticks...';
      }
      // If WS connected subscribe to this market
      if(window.derivWS&&window.derivWS.connected&&window.derivWS.token){
        const symbol=SYMBOL_MAP[market]||'R_100';
        // Subscribe per strategy (note: WS only supports one tick sub at a time)
        // We track which market each strategy wants
        console.log('[Strat#'+id+'] Market set to '+market);
      }
    };

    // Override _handleTick to route ticks per strategy market
    const _origHandle2 = window._handleTick;
    window._handleTick = function(digit){
      // Route tick to strategies watching current market
      document.querySelectorAll('.strategy-item').forEach(el=>{
        const id=parseInt(el.id.replace('sitem-',''));
        if(!id) return;
        const stratMarket = window._stratMarkets[id]||state.market;
        // Only feed tick if strategy market matches current market
        if(stratMarket===state.market){
          if(!window._stratTickHistories[id])
            window._stratTickHistories[id]=[];
          window._stratTickHistories[id].push(digit);
          if(window._stratTickHistories[id].length>500)
            window._stratTickHistories[id].shift();
          updateStrategyUI(id);
        }
      });
      updatePriceUI();updateChart();updateLDP();
      updateTickLog();updateTagTick();
      if(window.LDPData) LDPData.push(digit);
      if(window.LDPUi){
        LDPUi.render(state.selectedDigit);
        LDPUi.flashDigit(digit);
      }
      updateActiveStratCount();
    };

    // Re-render to add volatility selectors
    StratManager.render();

    // Patch add to include vol selector
    const _origAdd2=StratManager.add.bind(StratManager);
    StratManager.add=function(){
      _origAdd2();
      setTimeout(()=>{
        StratManager.render();
        const items=document.querySelectorAll('.strategy-item');
        if(!items.length) return;
        const last=items[items.length-1];
        const id=parseInt(last.id.replace('sitem-',''));
        if(!id) return;
        const old=document.getElementById('stopcond-'+id);
        if(old) old.remove();
        injectStopConditions(id);
      },200);
    };

  },1800);
});

// ══ VOLATILITY + RISK MANAGER ════════════════════════════════════
(function(){
const s=document.createElement('style');
s.textContent=`
.vol-tabs{
  display:flex;gap:6px;flex-wrap:wrap;
  margin-bottom:12px;
}
.vol-tab{
  padding:5px 12px;border-radius:20px;
  font-size:.72rem;font-weight:700;
  background:var(--bg3);border:1.5px solid var(--border2);
  color:var(--text2);cursor:pointer;
  transition:all var(--tr);white-space:nowrap;
}
.vol-tab.active{
  background:var(--accent);color:#0b0d12;
  border-color:var(--accent);
}
.vol-tab:hover:not(.active){
  border-color:var(--accent);color:var(--accent);
}
.risk-manager{
  background:var(--bg);border:1.5px solid var(--border2);
  border-radius:var(--r);padding:14px;
  margin-bottom:14px;
}
.risk-manager-title{
  font-size:.75rem;font-weight:800;
  text-transform:uppercase;letter-spacing:.1em;
  color:var(--text2);margin-bottom:12px;
  display:flex;align-items:center;gap:6px;
}
.risk-level-row{
  display:flex;gap:6px;margin-bottom:12px;
}
.risk-level-btn{
  flex:1;padding:8px;border-radius:var(--rs);
  font-size:.72rem;font-weight:800;
  border:1.5px solid var(--border2);
  background:var(--bg3);cursor:pointer;
  transition:all var(--tr);text-align:center;
}
.risk-level-btn.active-low{
  background:#00e5a020;border-color:var(--accent);
  color:var(--accent);
}
.risk-level-btn.active-med{
  background:#ffd16620;border-color:var(--accent3);
  color:var(--accent3);
}
.risk-level-btn.active-high{
  background:#ff3e6c20;border-color:var(--accent2);
  color:var(--accent2);
}
.risk-meter-bar{
  height:8px;border-radius:4px;
  background:var(--bg3);overflow:hidden;
  margin-bottom:8px;
}
.risk-meter-fill{
  height:100%;border-radius:4px;
  transition:width 0.5s ease,background 0.3s ease;
}
.risk-stats{
  display:grid;grid-template-columns:1fr 1fr 1fr;
  gap:8px;margin-top:10px;
}
.risk-stat{
  background:var(--bg3);border-radius:var(--rs);
  padding:8px;text-align:center;
  border:1px solid var(--border);
}
.risk-stat-label{
  font-size:.58rem;color:var(--text3);
  text-transform:uppercase;letter-spacing:.06em;
}
.risk-stat-val{
  font-size:.85rem;font-weight:800;
  font-family:'DM Mono',monospace;
  margin-top:2px;
}
`;
document.head.appendChild(s);
})();

// ══ VOLATILITY + RISK MANAGER LOGIC ══════════════════════════════
window._stratMarkets={};
window._riskLevel='low';

const RISK_PRESETS={
  low:{
    baseStake:0.35,multiplier:1.5,
    stopLoss:5,takeProfit:10,
    stopWins:3,stopLosses:3,
    color:'var(--accent)',label:'Low Risk',pct:15,
  },
  medium:{
    baseStake:1,multiplier:2,
    stopLoss:10,takeProfit:20,
    stopWins:5,stopLosses:5,
    color:'var(--accent3)',label:'Medium Risk',pct:50,
  },
  high:{
    baseStake:2,multiplier:3,
    stopLoss:20,takeProfit:50,
    stopWins:10,stopLosses:8,
    color:'var(--accent2)',label:'High Risk',pct:85,
  },
};

function applyRiskToStrategy(id,level){
  const p=RISK_PRESETS[level];
  if(!p) return;
  // Update stop conditions
  const sk=document.getElementById('sc-stake-'+id);
  const mt=document.getElementById('sc-mult-'+id);
  const sl=document.querySelector('#stopcond-'+id+' input[onchange*="stopLoss"]');
  const tp=document.querySelector('#stopcond-'+id+' input[onchange*="takeProfit"]');
  const sw=document.querySelector('#stopcond-'+id+' input[onchange*="stopWins"]');
  const sl2=document.querySelector('#stopcond-'+id+' input[onchange*="stopLosses"]');
  if(sk) sk.value=p.baseStake.toFixed(2);
  if(mt) mt.value=p.multiplier.toFixed(1);
  if(sl) sl.value=p.stopLoss;
  if(tp) tp.value=p.takeProfit;
  if(sw) sw.value=p.stopWins;
  if(sl2) sl2.value=p.stopLosses;
  // Update internal state
  updateStopCond(id,'baseStake',p.baseStake);
  updateStopCond(id,'multiplier',p.multiplier);
  updateStopCond(id,'stopLoss',p.stopLoss);
  updateStopCond(id,'takeProfit',p.takeProfit);
  updateStopCond(id,'stopWins',p.stopWins);
  updateStopCond(id,'stopLosses',p.stopLosses);
  resetStakeState(id);
  // Update risk meter
  updateRiskMeterUI(id,level);
  showToast(true,'RISK',0,0);
  document.getElementById('toastMsg').textContent=
    '✓ '+p.label+' applied to Strategy #'+id;
}

function updateRiskMeterUI(id,level){
  const p=RISK_PRESETS[level]||RISK_PRESETS.low;
  const fill=document.getElementById('risk-fill-'+id);
  const label=document.getElementById('risk-label-'+id);
  if(fill){
    fill.style.width=p.pct+'%';
    fill.style.background=p.color;
  }
  if(label) label.textContent=p.label;
  // Update buttons
  ['low','medium','high'].forEach(l=>{
    const btn=document.getElementById('risk-btn-'+l+'-'+id);
    if(btn){
      btn.className='risk-level-btn'+(l===level?' active-'+
        (l==='low'?'low':l==='medium'?'med':'high'):'');
    }
  });
}

function switchStratMarket(id,market){
  window._stratMarkets[id]=market;
  window._stratTickHistories[id]=[];
  resetStakeState(id);
  const sigEl=document.getElementById('sig-'+id);
  if(sigEl){
    sigEl.className='sig-banner sig-neutral';
    sigEl.textContent='⚖️ Switched to '+market+' — collecting...';
  }
  // Clear EO grid
  const eoEl=document.getElementById('eogrid-'+id);
  if(eoEl) eoEl.innerHTML='';
  const epEl=document.getElementById('epct-'+id);
  const opEl=document.getElementById('opct-'+id);
  const efEl=document.getElementById('efill-'+id);
  const ofEl=document.getElementById('ofill-'+id);
  if(epEl) epEl.textContent='0%';
  if(opEl) opEl.textContent='0%';
  if(efEl) efEl.style.width='0%';
  if(ofEl) ofEl.style.width='0%';
}

// ══ INJECT VOL + RISK UI INTO STRATEGIES ══════════════════════════
function injectVolAndRisk(id){
  const body=document.querySelector('#sitem-'+id+' .strategy-item-body');
  if(!body) return;
  if(document.getElementById('vol-wrap-'+id)) return;

  // ── Volatility selector ──────────────────────────────────────
  const volWrap=document.createElement('div');
  volWrap.id='vol-wrap-'+id;
  volWrap.innerHTML=`
    <div class="card-title" style="margin-bottom:8px">
      <span class="dot"></span>Market
    </div>
    <div class="vol-tabs" id="vol-tabs-${id}">
      <button class="vol-tab" onclick="switchStratMarket(${id},'V10')">V10</button>
      <button class="vol-tab" onclick="switchStratMarket(${id},'V25')">V25</button>
      <button class="vol-tab" onclick="switchStratMarket(${id},'V50')">V50</button>
      <button class="vol-tab" onclick="switchStratMarket(${id},'V75')">V75</button>
      <button class="vol-tab active" onclick="switchStratMarket(${id},'V100')">V100</button>
      <button class="vol-tab" onclick="switchStratMarket(${id},'V10_1S')">V10(1s)</button>
      <button class="vol-tab" onclick="switchStratMarket(${id},'V25_1S')">V25(1s)</button>
      <button class="vol-tab" onclick="switchStratMarket(${id},'V50_1S')">V50(1s)</button>
      <button class="vol-tab" onclick="switchStratMarket(${id},'V75_1S')">V75(1s)</button>
      <button class="vol-tab" onclick="switchStratMarket(${id},'V100_1S')">V100(1s)</button>
    </div>`;
  body.insertBefore(volWrap,body.firstChild);

  // ── Risk manager ──────────────────────────────────────────────
  const riskWrap=document.createElement('div');
  riskWrap.className='risk-manager';
  riskWrap.id='risk-wrap-'+id;
  riskWrap.innerHTML=`
    <div class="risk-manager-title">
      <span>⚠️</span> Risk Manager
    </div>
    <div class="risk-level-row">
      <button class="risk-level-btn active-low"
        id="risk-btn-low-${id}"
        onclick="applyRiskToStrategy(${id},'low')">
        🟢 Low
      </button>
      <button class="risk-level-btn"
        id="risk-btn-medium-${id}"
        onclick="applyRiskToStrategy(${id},'medium')">
        🟡 Medium
      </button>
      <button class="risk-level-btn"
        id="risk-btn-high-${id}"
        onclick="applyRiskToStrategy(${id},'high')">
        🔴 High
      </button>
    </div>
    <div class="risk-meter-bar">
      <div class="risk-meter-fill" id="risk-fill-${id}"
        style="width:15%;background:var(--accent)">
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;
      font-size:.65rem;color:var(--text3);margin-bottom:8px">
      <span>Conservative</span>
      <span id="risk-label-${id}"
        style="color:var(--accent);font-weight:700">
        Low Risk
      </span>
      <span>Aggressive</span>
    </div>
    <div class="risk-stats">
      <div class="risk-stat">
        <div class="risk-stat-label">Max Loss</div>
        <div class="risk-stat-val" id="risk-sl-${id}"
          style="color:var(--accent2)">$5</div>
      </div>
      <div class="risk-stat">
        <div class="risk-stat-label">Take Profit</div>
        <div class="risk-stat-val" id="risk-tp-${id}"
          style="color:var(--accent)">$10</div>
      </div>
      <div class="risk-stat">
        <div class="risk-stat-label">Multiplier</div>
        <div class="risk-stat-val" id="risk-mult-${id}"
          style="color:var(--accent3)">1.5x</div>
      </div>
    </div>`;

  // Insert before stop conditions
  const stopCond=document.getElementById('stopcond-'+id);
  if(stopCond) stopCond.insertAdjacentElement('beforebegin',riskWrap);
  else body.appendChild(riskWrap);
}

// ── Override switchStratMarket to update vol tab UI ───────────────
const _origSwitch=window.switchStratMarket;
window.switchStratMarket=function(id,market){
  _origSwitch&&_origSwitch(id,market);
  // Update tab buttons
  const tabs=document.querySelectorAll('#vol-tabs-'+id+' .vol-tab');
  tabs.forEach(t=>{
    t.classList.toggle('active',
      t.textContent.trim().replace('(1s)','_1S')===market||
      t.onclick.toString().includes("'"+market+"'"));
  });
};

// ── Override applyRiskToStrategy to update stats UI ───────────────
const _origApplyRisk=window.applyRiskToStrategy;
window.applyRiskToStrategy=function(id,level){
  _origApplyRisk&&_origApplyRisk(id,level);
  const p=RISK_PRESETS[level];
  if(!p) return;
  const slEl=document.getElementById('risk-sl-'+id);
  const tpEl=document.getElementById('risk-tp-'+id);
  const mEl=document.getElementById('risk-mult-'+id);
  if(slEl) slEl.textContent='$'+p.stopLoss;
  if(tpEl) tpEl.textContent='$'+p.takeProfit;
  if(mEl)  mEl.textContent=p.multiplier+'x';
};

// ── Wire to StratManager ──────────────────────────────────────────
window.addEventListener('load',function(){
  setTimeout(function(){

    // Inject for existing strategies
    document.querySelectorAll('.strategy-item').forEach(el=>{
      const id=parseInt(el.id.replace('sitem-',''));
      if(id) injectVolAndRisk(id);
    });

    // Patch add
    const _origAdd3=StratManager.add.bind(StratManager);
    StratManager.add=function(){
      _origAdd3();
      setTimeout(()=>{
        const items=document.querySelectorAll('.strategy-item');
        if(!items.length) return;
        const last=items[items.length-1];
        const id=parseInt(last.id.replace('sitem-',''));
        if(!id) return;
        const old=document.getElementById('stopcond-'+id);
        if(old) old.remove();
        injectStopConditions(id);
        injectVolAndRisk(id);
      },200);
    };

    // Route ticks per strategy market
    const _origSim2=window.simulatePrice;
    window.simulatePrice=function(){
      if(window.derivWS&&window.derivWS.token) return;
      const vol=VOLATILITY[state.market]||0.25;
      state.prevPrice=state.price;
      state.price=Math.max(10,state.price+(Math.random()-0.5)*2*vol);
      const ps=state.price.toFixed(2);
      state.lastDigit=parseInt(ps[ps.length-1]);
      state.tickCount++;
      state.chartData.push(state.price);
      if(state.chartData.length>500) state.chartData.shift();
      // Feed strategies matching current market
      document.querySelectorAll('.strategy-item').forEach(el=>{
        const id=parseInt(el.id.replace('sitem-',''));
        if(!id) return;
        const sm=window._stratMarkets[id]||'V100';
        if(sm===state.market){
          if(!window._stratTickHistories[id])
            window._stratTickHistories[id]=[];
          window._stratTickHistories[id].push(state.lastDigit);
          if(window._stratTickHistories[id].length>500)
            window._stratTickHistories[id].shift();
          updateStrategyUI(id);
        }
      });
      updatePriceUI();updateChart();updateLDP();
      updateTickLog();updateTagTick();
      if(window.LDPData) LDPData.push(state.lastDigit);
      if(window.LDPUi){
        LDPUi.render(state.selectedDigit);
        LDPUi.flashDigit(state.lastDigit);
      }
      updateActiveStratCount();
    };

    console.log('[Vol+Risk] Injected ✅');
  },2000);
});

// ══ FIX VOLATILITY SWITCHING + SIGNAL TEXT ════════════════════════
window.addEventListener('load',function(){
  setTimeout(function(){

    // ── Fix vol tab click ─────────────────────────────────────
    window.switchStratMarket=function(id,market){
      window._stratMarkets[id]=market;
      window._stratTickHistories[id]=[];
      resetStakeState(id);

      // Update active tab
      document.querySelectorAll('#vol-tabs-'+id+' .vol-tab')
        .forEach(t=>{
          const tm=t.getAttribute('data-market');
          t.classList.toggle('active',tm===market);
        });

      // Update main market selector to match
      const mainSel=document.getElementById('marketSelect');
      if(mainSel&&mainSel.value!==market){
        mainSel.value=market;
        state.market=market;
        // Reset chart
        state.chartData=[];
        state.price=100+Math.random()*1500;
      }

      // Clear EO grid
      const eoEl=document.getElementById('eogrid-'+id);
      if(eoEl) eoEl.innerHTML='';
      const efEl=document.getElementById('efill-'+id);
      const ofEl=document.getElementById('ofill-'+id);
      const epEl=document.getElementById('epct-'+id);
      const opEl=document.getElementById('opct-'+id);
      if(efEl) efEl.style.width='0%';
      if(ofEl) ofEl.style.width='0%';
      if(epEl) epEl.textContent='0%';
      if(opEl) opEl.textContent='0%';

      // Reset signal
      const sigEl=document.getElementById('sig-'+id);
      if(sigEl){
        sigEl.className='sig-banner sig-neutral';
        sigEl.textContent='⚖️ Switched to '+market+' — collecting ticks...';
      }

      // Subscribe WS to new market
      if(window.derivWS&&window.derivWS.connected){
        window.derivWS.subscribeTicks(SYMBOL_MAP[market]||'R_100');
      }
    };

    // ── Fix vol tabs to use data-market attribute ─────────────
    document.querySelectorAll('.strategy-item').forEach(el=>{
      const id=parseInt(el.id.replace('sitem-',''));
      if(!id) return;
      const tabs=document.querySelectorAll('#vol-tabs-'+id+' .vol-tab');
      tabs.forEach(t=>{
        // Extract market from onclick
        const match=t.getAttribute('onclick')
          ?.match(/'([^']+)'\)/);
        if(match) t.setAttribute('data-market',match[1]);
      });
    });

    // ── Fix signal text showing wrong values ──────────────────
    const _origGetSignal=window.getStratSignal;
    window.getStratSignal=function(id){
      const hist=window._stratTickHistories[id]||[];
      const sel=document.querySelectorAll(
        '#sitem-'+id+' .logic-select');
      const ifLastEl=document.querySelector(
        '#sitem-'+id+' .logic-num');
      const ifLast=ifLastEl?parseInt(ifLastEl.value)||3:3;
      const ifType=sel[2]?sel[2].value:'odd';
      const tradeOn=sel[3]?sel[3].value:'even';
      if(hist.length<ifLast+1)
        return{sig:'wait',ifLast,ifType,tradeOn};
      const recent=hist.slice(-(ifLast+1));
      const prevN=recent.slice(0,ifLast);
      const lastTick=recent[recent.length-1];
      const allPrev=prevN.every(d=>
        ifType==='even'?d%2===0:d%2!==0);
      const lastIsTarget=tradeOn==='even'
        ?lastTick%2===0:lastTick%2!==0;
      return{
        sig:allPrev&&lastIsTarget?'enter':'wait',
        ifLast,ifType,tradeOn
      };
    };

    // ── Hide old market dropdown inside strategy ──────────────
    const s=document.createElement('style');
    s.textContent=`
      .strategy-item .select-wrap:has(#marketSelect){
        display:none!important;
      }
      /* Hide old market row inside strategy body */
      .strategy-item .logic-row:has(select[id^="strat-vol"]){
        display:none!important;
      }
    `;
    document.head.appendChild(s);

    console.log('[Vol Fix] ✅');
  },2200);
});

// ══ REMOVE OLD DROPDOWN + FIX SWITCHING ══════════════════════════
window.addEventListener('load',function(){
  setTimeout(function(){

    // ── Hide old MARKET dropdown row inside strategy ───────────
    const s=document.createElement('style');
    s.textContent=`
      .strategy-item .logic-row:has(select[id^="strat-vol"]),
      .strategy-item .select-wrap+.logic-row,
      .strategy-item .logic-row:first-child:has(select){
        display:none!important;
      }
      /* Hide any label+select row showing "MARKET Volatility..." */
      .strategy-item-body > .logic-row:nth-child(2){
        display:none!important;
      }
    `;
    document.head.appendChild(s);

    // ── Remove old market rows from DOM completely ─────────────
    document.querySelectorAll('.strategy-item').forEach(el=>{
      const id=parseInt(el.id.replace('sitem-',''));
      if(!id) return;
      // Find and remove old market select rows
      el.querySelectorAll('.logic-row').forEach(row=>{
        const sel=row.querySelector('select');
        if(sel&&(sel.id.includes('strat-vol')||
           sel.textContent.includes('Volatility'))){
          row.remove();
        }
      });
    });

    // ── Fix vol tab switching ─────────────────────────────────
    window.switchStratMarket=function(id,market){
      window._stratMarkets[id]=market;
      window._stratTickHistories[id]=[];
      resetStakeState(id);

      // Update active tab UI
      document.querySelectorAll('#vol-tabs-'+id+' .vol-tab')
        .forEach(t=>{
          const onclick=t.getAttribute('onclick')||'';
          const isActive=onclick.includes("'"+market+"'");
          t.classList.toggle('active',isActive);
        });

      // Update global market state
      state.market=market;
      const mainSel=document.getElementById('marketSelect');
      if(mainSel) mainSel.value=market;

      // Reset price + chart for new market
      const prices={
        V10:500,V25:600,V50:700,
        V75:800,V100:1400,
        V10_1S:500,V25_1S:600,V50_1S:700,
        V75_1S:800,V100_1S:1400,
      };
      state.price=prices[market]||1000;
      state.chartData=[];
      state.digitCounts=new Array(10).fill(0);
      state.tickCount=0;

      // Update market tag
      const tagEl=document.getElementById('tagMarket');
      if(tagEl) tagEl.textContent=market;

      // Subscribe WS if connected
      if(window.derivWS&&window.derivWS.connected){
        window.derivWS.subscribeTicks(
          SYMBOL_MAP[market]||'R_100');
      }

      // Clear EO grid + reset signal
      const eoEl=document.getElementById('eogrid-'+id);
      if(eoEl) eoEl.innerHTML='';
      ['epct','opct','efill','ofill'].forEach(p=>{
        const el=document.getElementById(p+'-'+id);
        if(el){
          if(p.includes('fill')) el.style.width='0%';
          else el.textContent='0%';
        }
      });
      const sigEl=document.getElementById('sig-'+id);
      if(sigEl){
        sigEl.className='sig-banner sig-neutral';
        sigEl.textContent='⚖️ '+market+' — collecting ticks...';
      }

      showToast(true,'MARKET',0,0);
      document.getElementById('toastMsg').textContent=
        '✓ Strategy #'+id+' → '+market;
    };

    console.log('[Market Fix] ✅');
  },2500);
});

// ══ FIX VOLATILITY SWITCHING + SIGNAL TEXT ════════════════════════
window.addEventListener('load',function(){
  setTimeout(function(){

    // ── Fix vol tab click ─────────────────────────────────────
    window.switchStratMarket=function(id,market){
      window._stratMarkets[id]=market;
      window._stratTickHistories[id]=[];
      resetStakeState(id);

      // Update active tab
      document.querySelectorAll('#vol-tabs-'+id+' .vol-tab')
        .forEach(t=>{
          const tm=t.getAttribute('data-market');
          t.classList.toggle('active',tm===market);
        });

      // Update main market selector to match
      const mainSel=document.getElementById('marketSelect');
      if(mainSel&&mainSel.value!==market){
        mainSel.value=market;
        state.market=market;
        // Reset chart
        state.chartData=[];
        state.price=100+Math.random()*1500;
      }

      // Clear EO grid
      const eoEl=document.getElementById('eogrid-'+id);
      if(eoEl) eoEl.innerHTML='';
      const efEl=document.getElementById('efill-'+id);
      const ofEl=document.getElementById('ofill-'+id);
      const epEl=document.getElementById('epct-'+id);
      const opEl=document.getElementById('opct-'+id);
      if(efEl) efEl.style.width='0%';
      if(ofEl) ofEl.style.width='0%';
      if(epEl) epEl.textContent='0%';
      if(opEl) opEl.textContent='0%';

      // Reset signal
      const sigEl=document.getElementById('sig-'+id);
      if(sigEl){
        sigEl.className='sig-banner sig-neutral';
        sigEl.textContent='⚖️ Switched to '+market+' — collecting ticks...';
      }

      // Subscribe WS to new market
      if(window.derivWS&&window.derivWS.connected){
        window.derivWS.subscribeTicks(SYMBOL_MAP[market]||'R_100');
      }
    };

    // ── Fix vol tabs to use data-market attribute ─────────────
    document.querySelectorAll('.strategy-item').forEach(el=>{
      const id=parseInt(el.id.replace('sitem-',''));
      if(!id) return;
      const tabs=document.querySelectorAll('#vol-tabs-'+id+' .vol-tab');
      tabs.forEach(t=>{
        // Extract market from onclick
        const match=t.getAttribute('onclick')
          ?.match(/'([^']+)'\)/);
        if(match) t.setAttribute('data-market',match[1]);
      });
    });

    // ── Fix signal text showing wrong values ──────────────────
    const _origGetSignal=window.getStratSignal;
    window.getStratSignal=function(id){
      const hist=window._stratTickHistories[id]||[];
      const sel=document.querySelectorAll(
        '#sitem-'+id+' .logic-select');
      const ifLastEl=document.querySelector(
        '#sitem-'+id+' .logic-num');
      const ifLast=ifLastEl?parseInt(ifLastEl.value)||3:3;
      const ifType=sel[2]?sel[2].value:'odd';
      const tradeOn=sel[3]?sel[3].value:'even';
      if(hist.length<ifLast+1)
        return{sig:'wait',ifLast,ifType,tradeOn};
      const recent=hist.slice(-(ifLast+1));
      const prevN=recent.slice(0,ifLast);
      const lastTick=recent[recent.length-1];
      const allPrev=prevN.every(d=>
        ifType==='even'?d%2===0:d%2!==0);
      const lastIsTarget=tradeOn==='even'
        ?lastTick%2===0:lastTick%2!==0;
      return{
        sig:allPrev&&lastIsTarget?'enter':'wait',
        ifLast,ifType,tradeOn
      };
    };

    // ── Hide old market dropdown inside strategy ──────────────
    const s=document.createElement('style');
    s.textContent=`
      .strategy-item .select-wrap:has(#marketSelect){
        display:none!important;
      }
      /* Hide old market row inside strategy body */
      .strategy-item .logic-row:has(select[id^="strat-vol"]){
        display:none!important;
      }
    `;
    document.head.appendChild(s);

    console.log('[Vol Fix] ✅');
  },2200);
});

// ══ GLOBAL VOLATILITY BAR ════════════════════════════════════════
window.addEventListener('load',function(){
  setTimeout(function(){

    // ── Remove volatility from inside strategy cards ───────────
    const s=document.createElement('style');
    s.textContent=`
      [id^="vol-wrap-"]{display:none!important}
      [id^="risk-wrap-"]{display:none!important}
    `;
    document.head.appendChild(s);

    // ── Build global vol bar ───────────────────────────────────
    const volBar=document.createElement('div');
    volBar.id='globalVolBar';
    volBar.innerHTML=`
      <style>
        .global-vol-bar{
          background:var(--bg2);
          border-bottom:1px solid var(--border);
          padding:10px 16px;
          position:sticky;top:96px;z-index:98;
        }
        .global-vol-title{
          font-size:.62rem;font-weight:700;
          text-transform:uppercase;letter-spacing:.1em;
          color:var(--text3);margin-bottom:8px;
        }
        .global-vol-scroll{
          display:flex;gap:6px;
          overflow-x:auto;scrollbar-width:none;
          white-space:nowrap;
          -webkit-overflow-scrolling:touch;
        }
        .global-vol-scroll::-webkit-scrollbar{display:none}
        .gvol-btn{
          padding:7px 14px;border-radius:20px;
          font-size:.78rem;font-weight:700;
          background:var(--bg3);
          border:1.5px solid var(--border2);
          color:var(--text2);cursor:pointer;
          transition:all var(--tr);flex-shrink:0;
          white-space:nowrap;
        }
        .gvol-btn.active{
          background:var(--accent);
          border-color:var(--accent);
          color:#0b0d12;
          box-shadow:0 0 12px #00e5a030;
        }
        .gvol-btn:hover:not(.active){
          border-color:var(--accent);
          color:var(--accent);
        }
        .gvol-divider{
          width:1px;background:var(--border2);
          margin:0 4px;flex-shrink:0;
        }
      </style>
      <div class="global-vol-bar">
        <div class="global-vol-title">Market</div>
        <div class="global-vol-scroll" id="gvolScroll">
          <button class="gvol-btn" data-v="V10"
            onclick="switchGlobalMarket('V10')">V10</button>
          <button class="gvol-btn" data-v="V25"
            onclick="switchGlobalMarket('V25')">V25</button>
          <button class="gvol-btn" data-v="V50"
            onclick="switchGlobalMarket('V50')">V50</button>
          <button class="gvol-btn" data-v="V75"
            onclick="switchGlobalMarket('V75')">V75</button>
          <button class="gvol-btn active" data-v="V100"
            onclick="switchGlobalMarket('V100')">V100</button>
          <div class="gvol-divider"></div>
          <button class="gvol-btn" data-v="V10_1S"
            onclick="switchGlobalMarket('V10_1S')">V10(1s)</button>
          <button class="gvol-btn" data-v="V25_1S"
            onclick="switchGlobalMarket('V25_1S')">V25(1s)</button>
          <button class="gvol-btn" data-v="V50_1S"
            onclick="switchGlobalMarket('V50_1S')">V50(1s)</button>
          <button class="gvol-btn" data-v="V75_1S"
            onclick="switchGlobalMarket('V75_1S')">V75(1s)</button>
          <button class="gvol-btn" data-v="V100_1S"
            onclick="switchGlobalMarket('V100_1S')">V100(1s)</button>
        </div>
      </div>`;

    // Insert after scroll tabs bar
    const scrollTabsWrap=document.getElementById('scrollTabsWrap');
    if(scrollTabsWrap){
      scrollTabsWrap.insertAdjacentElement('afterend',volBar);
    } else {
      const navbar=document.querySelector('.navbar');
      if(navbar) navbar.insertAdjacentElement('afterend',volBar);
    }

    // ── Global market switch function ──────────────────────────
    window.switchGlobalMarket=function(market){
      // Update button UI
      document.querySelectorAll('.gvol-btn').forEach(b=>{
        b.classList.toggle('active',b.getAttribute('data-v')===market);
      });

      // Update global state
      state.market=market;
      const mainSel=document.getElementById('marketSelect');
      if(mainSel) mainSel.value=market;

      // Reset price + chart
      const prices={
        V10:500,V25:600,V50:700,V75:800,V100:1400,
        V10_1S:500,V25_1S:600,V50_1S:700,
        V75_1S:800,V100_1S:1400,
      };
      state.price=prices[market]||1000;
      state.chartData=[];
      state.digitCounts=new Array(10).fill(0);
      state.tickCount=0;

      // Update market tag
      const tagEl=document.getElementById('tagMarket');
      if(tagEl) tagEl.textContent=market;

      // Reset ALL strategy tick histories
      document.querySelectorAll('.strategy-item').forEach(el=>{
        const id=parseInt(el.id.replace('sitem-',''));
        if(!id) return;
        window._stratMarkets[id]=market;
        window._stratTickHistories[id]=[];
        resetStakeState(id);
        const eoEl=document.getElementById('eogrid-'+id);
        if(eoEl) eoEl.innerHTML='';
        ['epct','opct'].forEach(p=>{
          const e=document.getElementById(p+'-'+id);
          if(e) e.textContent='0%';
        });
        ['efill','ofill'].forEach(p=>{
          const e=document.getElementById(p+'-'+id);
          if(e) e.style.width='0%';
        });
        const sigEl=document.getElementById('sig-'+id);
        if(sigEl){
          sigEl.className='sig-banner sig-neutral';
          sigEl.textContent='⚖️ '+market+' — collecting...';
        }
      });

      // Subscribe WS
      if(window.derivWS&&window.derivWS.connected){
        window.derivWS.subscribeTicks(
          SYMBOL_MAP[market]||'R_100');
      }

      // Update LDP
      if(window.LDPData) LDPData.reset&&LDPData.reset();
      state.digitCounts=new Array(10).fill(0);

      showToast(true,'MARKET',0,0);
      document.getElementById('toastMsg').textContent=
        '✓ Market → '+market;
    };

    // Set initial active market
    switchGlobalMarket(state.market||'V100');

    console.log('[Global Vol Bar] ✅');
  },1000);
});

// ══ AI STRATEGY TAB ═══════════════════════════════════════════════
(function(){
const s=document.createElement('style');
s.textContent=`
.ai-header{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:16px;
}
.ai-title{font-size:1.2rem;font-weight:800;color:var(--text)}
.ai-subtitle{font-size:.75rem;color:var(--text2);margin-top:2px}
.ai-signal-card{
  border-radius:var(--r);padding:16px;
  margin-bottom:14px;position:relative;overflow:hidden;
  border:1.5px solid transparent;
  transition:all 0.3s ease;
}
.ai-signal-card.buy{
  background:linear-gradient(135deg,#00e5a015,#00e5a005);
  border-color:#00e5a040;
}
.ai-signal-card.sell{
  background:linear-gradient(135deg,#ff3e6c15,#ff3e6c05);
  border-color:#ff3e6c40;
}
.ai-signal-card.neutral{
  background:var(--bg2);border-color:var(--border2);
}
.ai-signal-row{
  display:flex;align-items:center;gap:12px;
}
.ai-signal-icon{
  width:52px;height:52px;border-radius:12px;
  background:var(--bg3);flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  font-size:1.5rem;
}
.ai-signal-label{
  font-size:.68rem;font-weight:700;
  text-transform:uppercase;letter-spacing:.1em;
  margin-bottom:4px;
}
.ai-signal-label.buy{color:var(--accent)}
.ai-signal-label.sell{color:var(--accent2)}
.ai-signal-label.neutral{color:var(--accent3)}
.ai-signal-desc{
  font-size:.78rem;color:var(--text2);
  line-height:1.4;margin-bottom:6px;
}
.ai-signal-meta{
  font-size:.65rem;color:var(--text3);
}
.btn-execute{
  padding:12px 20px;border-radius:var(--rs);
  font-size:.85rem;font-weight:800;
  background:var(--accent);color:#0b0d12;
  border:none;cursor:pointer;
  transition:all var(--tr);white-space:nowrap;
  flex-shrink:0;
}
.btn-execute:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-execute.sell{background:var(--accent2);color:#fff}
.ai-indicators{
  display:grid;grid-template-columns:1fr 1fr 1fr;
  gap:10px;margin-bottom:14px;
}
.ai-ind-card{
  background:var(--bg2);border-radius:var(--rs);
  padding:12px;border:1px solid var(--border);
}
.ai-ind-label{
  font-size:.62rem;color:var(--text3);
  text-transform:uppercase;letter-spacing:.06em;
  margin-bottom:4px;
}
.ai-ind-val{
  font-size:1rem;font-weight:800;
  font-family:'DM Mono',monospace;
  margin-bottom:2px;
}
.ai-ind-status{
  font-size:.65rem;font-weight:700;
}
.ai-ind-status.bull{color:var(--accent)}
.ai-ind-status.bear{color:var(--accent2)}
.ai-ind-status.neu{color:var(--accent3)}
.ai-chat-box{
  background:var(--bg2);border-radius:var(--r);
  padding:16px;margin-bottom:14px;
  border:1px solid var(--border);
}
.ai-chat-title{
  font-size:.82rem;font-weight:800;
  color:var(--text);margin-bottom:12px;
  display:flex;align-items:center;gap:6px;
}
.ai-chat-messages{
  min-height:80px;max-height:200px;
  overflow-y:auto;margin-bottom:12px;
  display:flex;flex-direction:column;gap:8px;
}
.ai-msg-ai{
  background:var(--bg3);border-radius:12px 12px 12px 4px;
  padding:10px 14px;font-size:.78rem;
  color:var(--text);line-height:1.5;
  border:1px solid var(--border);
  max-width:90%;
}
.ai-msg-ai span{
  color:var(--accent);font-weight:800;margin-right:4px;
}
.ai-msg-user{
  background:linear-gradient(135deg,var(--accent),#00b8ff);
  border-radius:12px 12px 4px 12px;
  padding:10px 14px;font-size:.78rem;
  color:#0b0d12;line-height:1.5;
  max-width:90%;align-self:flex-end;font-weight:600;
}
.ai-chat-input-row{
  display:flex;gap:8px;align-items:center;
}
.ai-chat-input{
  flex:1;background:var(--bg3);
  border:1.5px solid var(--border2);
  border-radius:var(--rs);color:var(--text);
  padding:10px 14px;font-size:.82rem;
  font-family:'Syne',sans-serif;
  transition:border var(--tr);
}
.ai-chat-input:focus{border-color:var(--accent);outline:none}
.btn-ai-send{
  padding:10px 18px;border-radius:var(--rs);
  font-size:.82rem;font-weight:800;
  background:linear-gradient(135deg,var(--accent),#00b8ff);
  color:#0b0d12;border:none;cursor:pointer;
  transition:all var(--tr);flex-shrink:0;
}
.btn-ai-send:hover{filter:brightness(1.1)}
.btn-ai-send:disabled{opacity:0.5;cursor:not-allowed}
.ai-history-table{
  width:100%;border-collapse:collapse;
  font-size:.75rem;
}
.ai-history-table th{
  text-align:left;padding:8px 10px;
  font-size:.62rem;text-transform:uppercase;
  letter-spacing:.08em;color:var(--text2);
  border-bottom:1px solid var(--border2);
}
.ai-history-table td{
  padding:10px 10px;
  border-bottom:1px solid var(--border);
  font-family:'DM Mono',monospace;
}
.conf-badge{
  padding:3px 8px;border-radius:20px;
  font-size:.65rem;font-weight:700;
}
.conf-high{background:#00e5a020;color:var(--accent)}
.conf-med{background:#ffd16620;color:var(--accent3)}
.conf-low{background:#ff3e6c20;color:var(--accent2)}
.ai-ticker{
  background:var(--bg2);border-bottom:1px solid var(--border);
  padding:6px 0;overflow:hidden;white-space:nowrap;
  margin-bottom:0;
}
.ai-ticker-inner{
  display:inline-flex;gap:24px;
  animation:tickerScroll 20s linear infinite;
}
@keyframes tickerScroll{
  0%{transform:translateX(0)}
  100%{transform:translateX(-50%)}
}
.ai-ticker-item{
  display:inline-flex;align-items:center;gap:6px;
  font-size:.72rem;font-family:'DM Mono',monospace;
}
.ai-ticker-dot{
  width:6px;height:6px;border-radius:50%;
}
`;
document.head.appendChild(s);
})();

// ══ AI STRATEGY SECTION ═══════════════════════════════════════════
window.addEventListener('load',function(){
  setTimeout(function(){

    // Find AI section
    let aiSection=document.getElementById('section-ai');
    if(!aiSection){
      aiSection=document.createElement('div');
      aiSection.className='tab-section';
      aiSection.id='section-ai';
      document.querySelector('.page')?.appendChild(aiSection);
    }

    aiSection.innerHTML=`
    <div style="padding:16px 0">

      <!-- Header -->
      <div class="ai-header">
        <div>
          <div class="ai-title">🧠 AI Strategy Analyst</div>
          <div class="ai-subtitle" id="aiSubtitle">
            Real-time market intelligence
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:.62rem;color:var(--text3)">TICK</div>
          <div style="font-size:.88rem;font-weight:800;
            font-family:'DM Mono',monospace;color:var(--accent)"
            id="aiTickCount">0/100</div>
        </div>
      </div>

      <!-- Ticker -->
      <div class="ai-ticker">
        <div class="ai-ticker-inner" id="aiTicker">
          <span class="ai-ticker-item">
            <span class="ai-ticker-dot" style="background:#00e5a0"></span>
            V100 — <span id="aiTickerPrice">0.00</span>
          </span>
          <span class="ai-ticker-item">
            <span class="ai-ticker-dot" style="background:#ffd166"></span>
            Signal: <span id="aiTickerSignal">Analyzing...</span>
          </span>
          <span class="ai-ticker-item">
            <span class="ai-ticker-dot" style="background:#00b8ff"></span>
            LDP Even: <span id="aiTickerEven">0%</span>
          </span>
          <span class="ai-ticker-item">
            <span class="ai-ticker-dot" style="background:#ff3e6c"></span>
            LDP Odd: <span id="aiTickerOdd">0%</span>
          </span>
          <!-- Duplicate for seamless scroll -->
          <span class="ai-ticker-item">
            <span class="ai-ticker-dot" style="background:#00e5a0"></span>
            V100 — <span id="aiTickerPrice2">0.00</span>
          </span>
          <span class="ai-ticker-item">
            <span class="ai-ticker-dot" style="background:#ffd166"></span>
            Signal: <span id="aiTickerSignal2">Analyzing...</span>
          </span>
        </div>
      </div>

      <!-- Signal Card -->
      <div class="ai-signal-card neutral" id="aiSignalCard"
        style="margin-top:14px">
        <div class="ai-signal-row">
          <div class="ai-signal-icon" id="aiSignalIcon">🤔</div>
          <div style="flex:1">
            <div class="ai-signal-label neutral"
              id="aiSignalLabel">ANALYZING MARKET</div>
            <div class="ai-signal-desc" id="aiSignalDesc">
              Collecting tick data and computing indicators...
            </div>
            <div class="ai-signal-meta" id="aiSignalMeta">
              Confidence: — • Duration: — • Updated just now
            </div>
          </div>
          <button class="btn-execute" id="aiExecuteBtn"
            style="display:none"
            onclick="aiExecuteTrade()">
            Execute Trade
          </button>
        </div>
      </div>

      <!-- Indicators Grid -->
      <div class="ai-indicators">
        <div class="ai-ind-card">
          <div class="ai-ind-label">RSI (14)</div>
          <div class="ai-ind-val" id="aiRSI">—</div>
          <div class="ai-ind-status neu" id="aiRSIStatus">Neutral</div>
        </div>
        <div class="ai-ind-card">
          <div class="ai-ind-label">MACD</div>
          <div class="ai-ind-val" id="aiMACD">—</div>
          <div class="ai-ind-status neu" id="aiMACDStatus">Neutral</div>
        </div>
        <div class="ai-ind-card">
          <div class="ai-ind-label">Bollinger</div>
          <div class="ai-ind-val" id="aiBB">—</div>
          <div class="ai-ind-status neu" id="aiBBStatus">Middle</div>
        </div>
        <div class="ai-ind-card">
          <div class="ai-ind-label">Volume</div>
          <div class="ai-ind-val" id="aiVol">—</div>
          <div class="ai-ind-status neu" id="aiVolStatus">Normal</div>
        </div>
        <div class="ai-ind-card">
          <div class="ai-ind-label">ATR</div>
          <div class="ai-ind-val" id="aiATR">—</div>
          <div class="ai-ind-status neu" id="aiATRStatus">Moderate</div>
        </div>
        <div class="ai-ind-card">
          <div class="ai-ind-label">Trend</div>
          <div class="ai-ind-val" id="aiTrend">—</div>
          <div class="ai-ind-status neu" id="aiTrendStatus">Sideways</div>
        </div>
      </div>

      <!-- Trade Setup -->
      <div style="background:var(--bg2);border-radius:var(--r);
        padding:16px;margin-bottom:14px;
        border:1px solid var(--border)">
        <div class="card-title">
          <span class="dot"></span>Trade Setup
        </div>

        <!-- Market -->
        <div style="margin-bottom:10px">
          <div class="form-label">Volatility</div>
          <div class="vol-tabs" style="margin-top:6px">
            <button class="vol-tab" onclick="aiSetMarket('V10')">V10</button>
            <button class="vol-tab" onclick="aiSetMarket('V25')">V25</button>
            <button class="vol-tab" onclick="aiSetMarket('V50')">V50</button>
            <button class="vol-tab" onclick="aiSetMarket('V75')">V75</button>
            <button class="vol-tab active" onclick="aiSetMarket('V100')">V100</button>
            <button class="vol-tab" onclick="aiSetMarket('V10_1S')">V10(1s)</button>
            <button class="vol-tab" onclick="aiSetMarket('V25_1S')">V25(1s)</button>
            <button class="vol-tab" onclick="aiSetMarket('V50_1S')">V50(1s)</button>
            <button class="vol-tab" onclick="aiSetMarket('V75_1S')">V75(1s)</button>
            <button class="vol-tab" onclick="aiSetMarket('V100_1S')">V100(1s)</button>
          </div>
        </div>

        <!-- Duration -->
        <div style="display:grid;grid-template-columns:1fr 1fr;
          gap:10px;margin-bottom:10px">
          <div>
            <div class="form-label">Duration</div>
            <input class="form-input" type="number"
              id="aiDuration" value="5" min="1" max="60"
              style="margin-top:4px"/>
          </div>
          <div>
            <div class="form-label">Unit</div>
            <select class="form-input market-select"
              id="aiDurUnit" style="margin-top:4px">
              <option value="t">Ticks</option>
              <option value="s">Seconds</option>
              <option value="m">Minutes</option>
            </select>
          </div>
        </div>

        <!-- Stake -->
        <div style="margin-bottom:12px">
          <div class="form-label">Stake</div>
          <div class="stake-row" style="margin-top:4px">
            <input class="stake-input" type="number"
              id="aiStake" value="1.00" min="0.35" step="0.01"/>
            <button class="stake-preset" onclick="document.getElementById('aiStake').value='1'">$1</button>
            <button class="stake-preset" onclick="document.getElementById('aiStake').value='5'">$5</button>
            <button class="stake-preset" onclick="document.getElementById('aiStake').value='10'">$10</button>
            <button class="stake-preset" onclick="document.getElementById('aiStake').value='50'">$50</button>
          </div>
        </div>

        <!-- Rise/Fall buttons -->
        <div style="display:grid;grid-template-columns:1fr 1fr;
          gap:10px">
          <button class="btn-rise" style="width:100%;padding:13px"
            onclick="aiPlaceTrade('rise')">
            ▲ Rise
          </button>
          <button class="btn-fall" style="width:100%;padding:13px"
            onclick="aiPlaceTrade('fall')">
            ▼ Fall
          </button>
        </div>
      </div>

      <!-- AI Chat -->
      <div class="ai-chat-box">
        <div class="ai-chat-title">
          🤖 Ask AI Analyst
          <span style="margin-left:auto;font-size:.65rem;
            color:var(--text3)">Powered by Claude</span>
        </div>
        <div class="ai-chat-messages" id="aiChatMessages">
          <div class="ai-msg-ai">
            <span>AI:</span>
            Hello! I am your AI trading analyst powered by Claude.
            I can analyze market conditions, explain indicators,
            suggest trade directions, and help you understand
            volatility patterns. Ask me anything about the market!
          </div>
        </div>
        <div class="ai-chat-input-row">
          <input class="ai-chat-input" type="text"
            id="aiChatInput"
            placeholder="Ask about market conditions..."
            onkeydown="if(event.key==='Enter') sendAIMessage()"/>
          <button class="btn-ai-send" id="aiSendBtn"
            onclick="sendAIMessage()">Send</button>
        </div>
      </div>

      <!-- AI Trade History -->
      <div style="background:var(--bg2);border-radius:var(--r);
        padding:16px;border:1px solid var(--border)">
        <div class="card-title">
          <span class="dot"></span>AI Trade History
        </div>
        <table class="ai-history-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Direction</th>
              <th>Confidence</th>
              <th>Result</th>
              <th>P&L</th>
            </tr>
          </thead>
          <tbody id="aiHistoryBody">
            <tr>
              <td colspan="5" class="empty-row">
                No AI trades yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>`;

    // ── AI State ──────────────────────────────────────────────
    window._aiState={
      market:'V100',
      signal:'neutral',
      confidence:0,
      direction:'',
      indicators:{},
      chatHistory:[],
      tradeHistory:[],
    };

    // ── Market selector ───────────────────────────────────────
    window.aiSetMarket=function(market){
      window._aiState.market=market;
      document.querySelectorAll('#section-ai .vol-tab')
        .forEach(t=>{
          const onclick=t.getAttribute('onclick')||'';
          t.classList.toggle('active',
            onclick.includes("'"+market+"'"));
        });
      // Update subtitle
      const sub=document.getElementById('aiSubtitle');
      if(sub) sub.textContent=
        'Real-time intelligence • '+
        (SYMBOL_MAP[market]||market);
      analyzeMarket();
    };

    // ── Market analysis ───────────────────────────────────────
    window.analyzeMarket=function(){
      const prices=state.chartData;
      if(prices.length<14) return;

      // RSI calculation
      const changes=prices.slice(-15).map((p,i,a)=>
        i===0?0:p-a[i-1]);
      const gains=changes.filter(c=>c>0);
      const losses=changes.filter(c=>c<0).map(Math.abs);
      const avgGain=gains.reduce((a,b)=>a+b,0)/(gains.length||1);
      const avgLoss=losses.reduce((a,b)=>a+b,0)/(losses.length||1);
      const rs=avgGain/(avgLoss||0.001);
      const rsi=parseFloat((100-(100/(1+rs))).toFixed(1));

      // MACD (simple)
      const ema12=prices.slice(-12).reduce((a,b)=>a+b,0)/12;
      const ema26=prices.slice(-26).reduce((a,b)=>a+b,0)/
        Math.min(26,prices.length);
      const macd=parseFloat((ema12-ema26).toFixed(3));

      // Bollinger
      const last20=prices.slice(-20);
      const mean=last20.reduce((a,b)=>a+b,0)/last20.length;
      const std=Math.sqrt(last20.reduce((a,b)=>
        a+(b-mean)**2,0)/last20.length);
      const curP=prices[prices.length-1];
      const bbPos=curP>mean+std?'Upper':
        curP<mean-std?'Lower':'Middle';

      // ATR
      const atr=parseFloat((std*2).toFixed(2));

      // Volume (tick speed proxy)
      const vol=state.tickCount>50?'High':
        state.tickCount>20?'Normal':'Low';

      // Trend
      const slope=prices.length>5?
        prices[prices.length-1]-prices[prices.length-6]:0;
      const trend=slope>0.1?'Up':slope<-0.1?'Down':'Sideways';

      // LDP stats
      const total=state.digitCounts.reduce((a,b)=>a+b,0)||1;
      const evens=[0,2,4,6,8].reduce((a,d)=>
        a+state.digitCounts[d],0);
      const evenPct=((evens/total)*100).toFixed(1);
      const oddPct=(100-parseFloat(evenPct)).toFixed(1);

      // Store indicators
      window._aiState.indicators={
        rsi,macd,bbPos,atr,vol,trend,evenPct,oddPct
      };

      // Update indicator UI
      const setInd=(id,val,status,cls)=>{
        const el=document.getElementById(id);
        const st=document.getElementById(id+'Status');
        if(el) el.textContent=val;
        if(st){st.textContent=status;st.className='ai-ind-status '+cls;}
      };

      setInd('aiRSI',rsi,
        rsi<30?'Oversold':rsi>70?'Overbought':'Neutral',
        rsi<30?'bull':rsi>70?'bear':'neu');
      setInd('aiMACD',(macd>0?'+':'')+macd,
        macd>0?'Bullish':'Bearish',macd>0?'bull':'bear');
      setInd('aiBB',bbPos,
        bbPos==='Lower'?'Bounce':bbPos==='Upper'?'Resistance':'Middle',
        bbPos==='Lower'?'bull':bbPos==='Upper'?'bear':'neu');
      setInd('aiVol',vol,vol,
        vol==='High'?'bull':vol==='Low'?'bear':'neu');
      setInd('aiATR',atr,'Moderate','neu');
      setInd('aiTrend',trend,
        trend==='Up'?'Strong':trend==='Down'?'Weak':'Sideways',
        trend==='Up'?'bull':trend==='Down'?'bear':'neu');

      // Update ticker
      const tp=document.getElementById('aiTickerPrice');
      const tp2=document.getElementById('aiTickerPrice2');
      if(tp) tp.textContent=state.price.toFixed(2);
      if(tp2) tp2.textContent=state.price.toFixed(2);
      const te=document.getElementById('aiTickerEven');
      const to=document.getElementById('aiTickerOdd');
      if(te) te.textContent=evenPct+'%';
      if(to) to.textContent=oddPct+'%';

      // Tick count
      const tc=document.getElementById('aiTickCount');
      if(tc) tc.textContent=Math.min(state.tickCount,100)+'/100';

      // Generate signal
      generateSignal(rsi,macd,bbPos,trend,evenPct);
    };

    // ── Signal generator ──────────────────────────────────────
    window.generateSignal=function(rsi,macd,bbPos,trend,evenPct){
      let buyScore=0,sellScore=0;
      if(rsi<30) buyScore+=2;
      if(rsi>70) sellScore+=2;
      if(macd>0) buyScore++;
      if(macd<0) sellScore++;
      if(bbPos==='Lower') buyScore++;
      if(bbPos==='Upper') sellScore++;
      if(trend==='Up') buyScore++;
      if(trend==='Down') sellScore++;

      const card=document.getElementById('aiSignalCard');
      const icon=document.getElementById('aiSignalIcon');
      const label=document.getElementById('aiSignalLabel');
      const desc=document.getElementById('aiSignalDesc');
      const meta=document.getElementById('aiSignalMeta');
      const execBtn=document.getElementById('aiExecuteBtn');
      const tickerSig=document.getElementById('aiTickerSignal');
      const tickerSig2=document.getElementById('aiTickerSignal2');

      let signal,conf,iconTxt,dir,descTxt;

      if(buyScore>=3){
        signal='buy';conf=Math.min(60+buyScore*8,95);
        iconTxt='📈';dir='rise';
        descTxt='AI detected bullish momentum. RSI '+
          (rsi<30?'oversold':'neutral')+
          ', MACD '+(macd>0?'positive':'negative')+
          ', trend '+trend+'. Consider RISE trade.';
      } else if(sellScore>=3){
        signal='sell';conf=Math.min(60+sellScore*8,95);
        iconTxt='📉';dir='fall';
        descTxt='AI detected bearish momentum. RSI '+
          (rsi>70?'overbought':'neutral')+
          ', MACD '+(macd<0?'negative':'mixed')+
          ', trend '+trend+'. Consider FALL trade.';
      } else {
        signal='neutral';conf=40;
        iconTxt='🤔';dir='';
        descTxt='Market conditions are mixed. Wait for '+
          'clearer signals before trading.';
      }

      window._aiState.signal=signal;
      window._aiState.confidence=conf;
      window._aiState.direction=dir;

      if(card) card.className='ai-signal-card '+signal;
      if(icon) icon.textContent=iconTxt;
      if(label){
        label.className='ai-signal-label '+signal;
        label.textContent=signal==='buy'?'STRONG BUY SIGNAL':
          signal==='sell'?'STRONG SELL SIGNAL':'NEUTRAL — WAIT';
      }
      if(desc) desc.textContent=descTxt;
      if(meta) meta.textContent=
        'Confidence: '+conf+'% • '+
        'Duration: '+document.getElementById('aiDuration')?.value+
        ' '+document.getElementById('aiDurUnit')?.value+
        ' • Updated just now';
      if(execBtn){
        execBtn.style.display=signal!=='neutral'?'block':'none';
        execBtn.textContent=signal==='buy'?
          '▲ Execute Rise':'▼ Execute Fall';
        execBtn.className='btn-execute '+(signal==='sell'?'sell':'');
      }
      if(tickerSig) tickerSig.textContent=
        signal==='buy'?'STRONG BUY':
        signal==='sell'?'STRONG SELL':'NEUTRAL';
      if(tickerSig2) tickerSig2.textContent=
        tickerSig?.textContent;
    };

    // ── Execute trade ─────────────────────────────────────────
    window.aiExecuteTrade=function(){
      const dir=window._aiState.direction;
      if(dir) aiPlaceTrade(dir);
    };

    window.aiPlaceTrade=function(direction){
      const stake=parseFloat(
        document.getElementById('aiStake')?.value)||1;
      const duration=parseInt(
        document.getElementById('aiDuration')?.value)||5;
      const durUnit=document.getElementById('aiDurUnit')?.value||'t';
      const symbol=SYMBOL_MAP[window._aiState.market||state.market]
        ||'R_100';
      const ctype=direction==='rise'?'CALL':'PUT';
      const conf=window._aiState.confidence||50;

      // Real trade via WS
      if(window.derivWS&&window.derivWS.token){
        window.derivWS.buyContract({
          stake,symbol,contract_type:ctype,
          duration,duration_unit:durUnit,
        });
      }

      // Simulate result
      const win=Math.random()>0.45;
      const payout=win?parseFloat((stake*1.85).toFixed(2)):0;
      const pl=win?parseFloat((payout-stake).toFixed(2)):-stake;

      state.balance=parseFloat((state.balance+pl).toFixed(2));

      // Add to AI history
      const tbody=document.getElementById('aiHistoryBody');
      const now=new Date().toLocaleTimeString();
      const confCls=conf>=75?'conf-high':conf>=55?'conf-med':'conf-low';
      const row=document.createElement('tr');
      row.innerHTML=`
        <td>${now}</td>
        <td>${direction==='rise'?'▲ Rise':'▼ Fall'}</td>
        <td><span class="conf-badge ${confCls}">${conf}%</span></td>
        <td><span class="badge badge-${win?'win':'loss'}">
          ${win?'Won':'Lost'}</span></td>
        <td style="color:${win?'var(--accent)':'var(--accent2)'};
          font-weight:700">
          ${(pl>=0?'+':'')+pl.toFixed(2)}
        </td>`;

      // Remove empty row
      const empty=tbody?.querySelector('.empty-row');
      if(empty) empty.parentElement.remove();
      tbody?.insertBefore(row,tbody.firstChild);

      // Add to main history
      const trade={
        id:(state.allHistory.length+1),
        time:now,market:state.market,
        type:'ai-trade',
        contract:ctype.toLowerCase(),
        stake,payout,pl,
        result:win?'win':'loss',
        entrySpot:parseFloat(state.price.toFixed(2)),
        exitSpot:parseFloat((state.price+(Math.random()-0.5)*0.1).toFixed(2)),
      };
      state.allHistory.unshift(trade);
      state.tradeHistory.unshift(trade);
      window.updateBalanceUI&&window.updateBalanceUI();
      window.renderStickyHistory&&window.renderStickyHistory();
      showToast(win,'AI',pl,stake);
    };

    // ── Claude AI Chat ─────────────────────────────────────────
    window.sendAIMessage=async function(){
      const input=document.getElementById('aiChatInput');
      const btn=document.getElementById('aiSendBtn');
      const messages=document.getElementById('aiChatMessages');
      const text=input?.value?.trim();
      if(!text) return;

      // Show user message
      const userMsg=document.createElement('div');
      userMsg.className='ai-msg-user';
      userMsg.textContent=text;
      messages?.appendChild(userMsg);
      messages?.scrollTo(0,messages.scrollHeight);

      input.value='';
      btn.disabled=true;
      btn.textContent='...';

      // Add to chat history
      window._aiState.chatHistory.push({
        role:'user',content:text
      });

      // Build context
      const ind=window._aiState.indicators||{};
      const systemPrompt=`You are an expert Deriv trading analyst AI inside the NextTrade app. 
You analyze volatility indices and give concise, actionable trading advice.

Current market data:
- Market: ${window._aiState.market||state.market}
- Price: ${state.price.toFixed(2)}
- RSI: ${ind.rsi||'N/A'} ${ind.rsi<30?'(Oversold)':ind.rsi>70?'(Overbought)':'(Neutral)'}
- MACD: ${ind.macd||'N/A'} ${ind.macd>0?'(Bullish)':'(Bearish)'}
- Bollinger: ${ind.bbPos||'N/A'}
- Trend: ${ind.trend||'N/A'}
- ATR: ${ind.atr||'N/A'}
- LDP Even: ${ind.evenPct||'0'}% / Odd: ${ind.oddPct||'0'}%
- Signal: ${window._aiState.signal} (${window._aiState.confidence}% confidence)
- Tick count: ${state.tickCount}

Be concise (2-4 sentences max). Give specific actionable advice. 
If user asks about duration/stake suggest optimal values based on current volatility.
Always mention confidence level and direction (Rise/Fall/Even/Odd) when recommending.`;

      try{
        const response=await fetch(
          'https://api.anthropic.com/v1/messages',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            model:'claude-sonnet-4-20250514',
            max_tokens:1000,
            system:systemPrompt,
            messages:window._aiState.chatHistory,
          })
        });
        const data=await response.json();
        const reply=data.content?.[0]?.text||
          'Unable to get AI response. Please try again.';

        // Show AI response
        const aiMsg=document.createElement('div');
        aiMsg.className='ai-msg-ai';
        aiMsg.innerHTML='<span>AI:</span>'+reply;
        messages?.appendChild(aiMsg);
        messages?.scrollTo(0,messages.scrollHeight);

        // Add to history
        window._aiState.chatHistory.push({
          role:'assistant',content:reply
        });

        // Keep history short
        if(window._aiState.chatHistory.length>20){
          window._aiState.chatHistory=
            window._aiState.chatHistory.slice(-20);
        }

      } catch(err){
        const errMsg=document.createElement('div');
        errMsg.className='ai-msg-ai';
        errMsg.innerHTML='<span>AI:</span>Error connecting to AI. '+
          'Check your connection and try again.';
        messages?.appendChild(errMsg);
      }

      btn.disabled=false;
      btn.textContent='Send';
      messages?.scrollTo(0,messages.scrollHeight);
    };

    // ── Update AI on each tick ────────────────────────────────
    const _origHandle3=window._handleTick;
    window._handleTick=function(digit){
      _origHandle3&&_origHandle3(digit);
      // Update AI every 5 ticks
      if(state.tickCount%5===0) analyzeMarket();
    };

    // Initial analysis
    setTimeout(analyzeMarket,500);
    console.log('[AI Strategy] ✅ Loaded');

  },1500);
});
