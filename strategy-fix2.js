  .history-sticky-wrap{
    height:52px !important;
    transition:height 0.3s ease;
  }
  .history-sticky-wrap.expanded{
    height:420px !important;
  }
  .history-toggle-bar{
    display:flex;align-items:center;
    justify-content:space-between;
    padding:0 16px;height:52px;
    cursor:pointer;
    background:var(--bg2);
    border-top:2px solid var(--border2);
    user-select:none;
    flex-shrink:0;
  }
  .htx-list{
    height:calc(100% - 52px);
    overflow-y:auto;display:none;
    background:var(--bg2);
  }
  .history-sticky-wrap.expanded .htx-list{
    display:block;
  }

  /* ── Filter bar ───────────────────────────────────────────── */
  .htx-filter-bar{
    display:flex;gap:6px;
    padding:8px 16px;
    position:sticky;top:0;
    background:var(--bg2);
    border-bottom:1px solid var(--border);
    overflow-x:auto;scrollbar-width:none;
    z-index:2;
  }
  .htx-filter-bar::-webkit-scrollbar{display:none}

  /* ── Summary row ──────────────────────────────────────────── */
  .htx-summary{
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:1px;
    background:var(--border);
    border-bottom:1px solid var(--border);
  }
  .htx-sum-item{
    background:var(--bg2);
    padding:10px 12px;
    display:flex;flex-direction:column;gap:2px;
  }
  .htx-sum-label{
    font-size:.62rem;color:var(--text3);
    text-transform:uppercase;letter-spacing:.06em;
  }
  .htx-sum-val{
    font-size:.88rem;font-weight:800;
    font-family:'DM Mono',monospace;
  }

  /* ── Table header ─────────────────────────────────────────── */
  .htx-thead{
    display:grid;
    grid-template-columns:52px 1fr 1fr;
    padding:8px 16px;
    border-bottom:1px solid var(--border);
    position:sticky;top:0;
    background:var(--bg2);z-index:1;
  }
  .htx-thead span{
    font-size:.65rem;font-weight:700;
    text-transform:uppercase;letter-spacing:.08em;
    color:var(--text3);
  }
  .htx-thead span:last-child{text-align:right}

  /* ── Trade row ────────────────────────────────────────────── */
  .htx-row{
    display:grid;
    grid-template-columns:52px 1fr 1fr;
    align-items:center;
    padding:10px 16px;
    border-bottom:1px solid var(--border);
    transition:background 0.15s;
    gap:4px;
  }
  .htx-row:hover{background:var(--bg3)}

  /* Icon cell */
  .htx-icon-cell{
    display:flex;align-items:center;justify-content:center;
  }
  .htx-icon{
    width:38px;height:38px;
    border-radius:10px;
    display:flex;align-items:center;
    justify-content:center;
    font-size:.75rem;font-weight:800;
    flex-shrink:0;
    position:relative;
  }
  .htx-icon-win{
    background:#00e5a015;
    border:1px solid #00e5a030;
  }
  .htx-icon-loss{
    background:#ff3e6c15;
    border:1px solid #ff3e6c30;
  }
  .htx-icon svg{width:20px;height:20px}

  /* Entry/Exit cell */
  .htx-spots-cell{
    display:flex;flex-direction:column;gap:5px;
  }
  .htx-spot-line{
    display:flex;align-items:center;gap:6px;
    font-family:'DM Mono',monospace;
    font-size:.78rem;
  }
  .htx-spot-dot{
    width:8px;height:8px;
    border-radius:50%;flex-shrink:0;
  }
  .htx-spot-dot-entry{background:#ff4444}
  .htx-spot-dot-exit{background:#888;opacity:0.5}
  .htx-spot-val{color:var(--text)}
  .htx-spot-val.exit{color:var(--text2)}
  .htx-contract-name{
    font-size:.68rem;color:var(--text3);
    margin-top:1px;
  }

  /* Price/PL cell */
  .htx-price-cell{
    display:flex;flex-direction:column;
    align-items:flex-end;gap:4px;
  }
  .htx-buy-price{
    font-size:.82rem;color:var(--text);
    font-family:'DM Mono',monospace;
  }
  .htx-pl-val{
    font-size:.82rem;font-weight:800;
    font-family:'DM Mono',monospace;
  }
  .htx-pl-win{color:var(--accent)}
  .htx-pl-loss{color:var(--accent2)}
  `;
  document.head.appendChild(s);
})();

// ── Market icon SVG ───────────────────────────────────────────────
function getMarketSVG(isWin){
  const col = isWin ? '#00e5a0' : '#ff3e6c';
  return `<svg viewBox="0 0 24 24" fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="3" height="12" rx="1"
      fill="${col}" opacity="0.9"/>
    <rect x="7" y="3" width="3" height="15" rx="1"
      fill="${col}" opacity="0.7"/>
    <rect x="12" y="8" width="3" height="10" rx="1"
      fill="${col}" opacity="0.9"/>
    <rect x="17" y="4" width="3" height="14" rx="1"
      fill="${col}" opacity="0.7"/>
    <path d="M3.5 12 L8.5 7 L13.5 11 L18.5 5"
      stroke="${col}" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ── Full history renderer ─────────────────────────────────────────
window.renderStickyHistory = function(){
  const wrap   = document.getElementById('stickyHistory');
  if(!wrap) return;

  // Header stats
  const all    = state.allHistory||[];
  const wins   = all.filter(t=>t.result==='win').length;
  const losses = all.filter(t=>t.result==='loss').length;
  const netPL  = all.reduce((a,t)=>a+t.pl,0);
  const totalS = all.reduce((a,t)=>a+t.stake,0);
  const totalP = all.reduce((a,t)=>a+(t.payout||0),0);

  // Update toggle bar stats
  const countEl = document.getElementById('stickyHistoryCount');
  const winsEl  = document.getElementById('stickyWins');
  const lossEl  = document.getElementById('stickyLosses');
  const plEl    = document.getElementById('stickyPL');
  if(countEl) countEl.textContent = all.length+' trades';
  if(winsEl)  winsEl.textContent  = 'W:'+wins;
  if(lossEl)  lossEl.textContent  = 'L:'+losses;
  if(plEl){
    plEl.textContent=(netPL>=0?'+':'')+netPL.toFixed(2);
    plEl.style.color=netPL>=0?'var(--accent)':'var(--accent2)';
  }

  // Filter
  let data = all;
  const f = window.currentStickyFilter||'all';
  if(f==='win')   data=all.filter(t=>t.result==='win');
  if(f==='loss')  data=all.filter(t=>t.result==='loss');
  if(f==='strat') data=all.filter(t=>t.type&&t.type.startsWith('strat'));
  if(f==='bot')   data=all.filter(t=>t.type==='bot'||t.type==='ldp-bot');
  if(f==='manual')data=all.filter(t=>
    t.type!=='bot'&&t.type!=='ldp-bot'&&
    !(t.type&&t.type.startsWith('strat')));

  // Find or rebuild htx-list
  let list = document.getElementById('htxList');
  if(!list){
    const oldBody = document.querySelector('.history-sticky-body');
    if(oldBody){
      oldBody.className = 'htx-list';
      oldBody.id = 'htxList';
      list = oldBody;
    }
  }
  if(!list) return;

  // Build content
  list.innerHTML = `
    <!-- Filter bar -->
    <div class="htx-filter-bar">
      <button class="stake-preset ${f==='all'?'sfilter-active':''}"
        onclick="setStickyFilter('all',this)">All</button>
      <button class="stake-preset ${f==='win'?'sfilter-active':''}"
        onclick="setStickyFilter('win',this)">Wins</button>
      <button class="stake-preset ${f==='loss'?'sfilter-active':''}"
        onclick="setStickyFilter('loss',this)">Losses</button>
      <button class="stake-preset ${f==='strat'?'sfilter-active':''}"
        onclick="setStickyFilter('strat',this)">Strategy</button>
      <button class="stake-preset ${f==='bot'?'sfilter-active':''}"
        onclick="setStickyFilter('bot',this)">Bot</button>
      <button class="stake-preset" style="margin-left:auto;
        color:var(--accent2)" onclick="clearHistory()">Clear</button>
    </div>

    <!-- Summary -->
    <div class="htx-summary">
      <div class="htx-sum-item">
        <span class="htx-sum-label">Total stake</span>
        <span class="htx-sum-val">${totalS.toFixed(2)} USD</span>
        <span class="htx-sum-label" style="margin-top:6px">
          Contracts lost
        </span>
        <span class="htx-sum-val"
          style="color:var(--accent2)">${losses}</span>
      </div>
      <div class="htx-sum-item">
        <span class="htx-sum-label">Total payout</span>
        <span class="htx-sum-val">${totalP.toFixed(2)} USD</span>
        <span class="htx-sum-label" style="margin-top:6px">
          Contracts won
        </span>
        <span class="htx-sum-val"
          style="color:var(--accent)">${wins}</span>
      </div>
      <div class="htx-sum-item">
        <span class="htx-sum-label">No. of runs</span>
        <span class="htx-sum-val">${all.length}</span>
        <span class="htx-sum-label" style="margin-top:6px">
          Total profit/loss
        </span>
        <span class="htx-sum-val ${netPL>=0?'htx-pl-win':'htx-pl-loss'}">
          ${(netPL>=0?'+':'')+netPL.toFixed(2)} USD
        </span>
      </div>
    </div>

    <!-- Table header -->
    <div class="htx-thead">
      <span>Type</span>
      <span>Entry/Exit spot</span>
      <span style="text-align:right">Buy price and P/L</span>
    </div>

    <!-- Rows -->
    ${!data.length
      ? `<div style="text-align:center;padding:30px;
           color:var(--text3);font-size:.8rem">
           No trades yet
         </div>`
      : data.slice(0,100).map(t => {
          const isWin = t.result==='win';
          const entry = t.entrySpot
            ? t.entrySpot.toFixed(2)
            : state.price.toFixed(2);
          const exit  = t.exitSpot
            ? t.exitSpot.toFixed(2)
            : entry;
          const plTxt = (t.pl>=0?'+':'')+t.pl.toFixed(2)+' USD';
          return `
            <div class="htx-row">
              <!-- Icon -->
              <div class="htx-icon-cell">
                <div class="htx-icon htx-icon-${t.result}">
                  ${getMarketSVG(isWin)}
                </div>
              </div>
              <!-- Entry/Exit -->
              <div class="htx-spots-cell">
                <div class="htx-spot-line">
                  <span class="htx-spot-dot htx-spot-dot-entry"></span>
                  <span class="htx-spot-val">${entry}</span>
                </div>
                <div class="htx-spot-line">
                  <span class="htx-spot-dot htx-spot-dot-exit"></span>
                  <span class="htx-spot-val exit">${exit}</span>
                </div>
                <div class="htx-contract-name">
                  ${t.contract.toUpperCase()} · ${t.market}
                  · ${t.time}
                </div>
              </div>
              <!-- Price + PL -->
              <div class="htx-price-cell">
                <span class="htx-buy-price">
                  ${t.stake.toFixed(2)} USD
                </span>
                <span class="htx-pl-val
                  ${isWin?'htx-pl-win':'htx-pl-loss'}">
                  ${plTxt}
                </span>
              </div>
            </div>`;
        }).join('')
    }`;
};

window.setStickyFilter = function(type, btn){
  window.currentStickyFilter = type;
  window.renderStickyHistory();
};

// ══ FORCE OVERRIDE HISTORY DISPLAY ═══════════════════════════════
window.addEventListener('load', function(){
  setTimeout(function(){

    // ── Force rebuild sticky history bar HTML ─────────────────
    const wrap = document.getElementById('stickyHistory');
    if(!wrap) return;

    // Save current toggle bar
    const toggleBar = wrap.querySelector('.history-toggle-bar');

    // Rebuild entire wrap
    wrap.innerHTML = `
      <div class="history-toggle-bar"
        onclick="toggleStickyHistory()">
        <div class="history-toggle-title">
          <span class="live-dot"></span>
          Trade History
          <span style="background:#00e5a020;color:var(--accent);
            font-size:.65rem;padding:2px 8px;border-radius:20px;
            font-weight:700;font-family:'DM Mono',monospace"
            id="stickyHistoryCount">0 trades</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="display:flex;gap:8px;font-size:.72rem">
            <span style="color:var(--accent)"
              id="stickyWins">W:0</span>
            <span style="color:var(--accent2)"
              id="stickyLosses">L:0</span>
            <span id="stickyPL"
              style="font-family:'DM Mono',monospace;
              font-weight:700;color:var(--accent)">+0.00</span>
          </div>
          <span class="history-toggle-arrow"
            style="font-size:1rem;color:var(--text2)">▲</span>
        </div>
      </div>
      <div class="htx-list" id="htxList"></div>`;

    console.log('[History] Bar rebuilt ✅');
    window.renderStickyHistory();

  }, 1200);
});

// ══ FINAL HISTORY + STATS FIX ════════════════════════════════════
window.addEventListener('load', function(){
  setTimeout(function(){

    // ── Force rebuild sticky history ──────────────────────────
    const wrap = document.getElementById('stickyHistory');
    if(!wrap) return;

    wrap.innerHTML = `
      <div class="history-toggle-bar"
        onclick="toggleStickyHistory()">
        <div class="history-toggle-title">
          <span class="live-dot"></span>
          Trade History
          <span id="stickyHistoryCount"
            style="background:#00e5a020;color:var(--accent);
            font-size:.65rem;padding:2px 8px;border-radius:20px;
            font-weight:700;font-family:'DM Mono',monospace">
            0 trades
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="color:var(--accent);font-size:.72rem"
            id="stickyWins">W:0</span>
          <span style="color:var(--accent2);font-size:.72rem"
            id="stickyLosses">L:0</span>
          <span id="stickyPL"
            style="font-family:'DM Mono',monospace;
            font-weight:700;color:var(--accent);font-size:.72rem">
            +0.00
          </span>
          <span class="history-toggle-arrow"
            style="font-size:1rem;color:var(--text2)">▲</span>
        </div>
      </div>
      <div class="htx-list" id="htxList"></div>`;

    // ── Override renderStickyHistory ──────────────────────────
    window.renderStickyHistory = function(){
      const all   = state.allHistory||[];
      const wins  = all.filter(t=>t.result==='win').length;
      const losses= all.filter(t=>t.result==='loss').length;
      const netPL = all.reduce((a,t)=>a+t.pl,0);
      const totalS= all.reduce((a,t)=>a+t.stake,0);
      const totalP= all.reduce((a,t)=>a+(t.payout||0),0);

      // Update header
      const ce=document.getElementById('stickyHistoryCount');
      const we=document.getElementById('stickyWins');
      const le=document.getElementById('stickyLosses');
      const pe=document.getElementById('stickyPL');
      if(ce) ce.textContent=all.length+' trades';
      if(we) we.textContent='W:'+wins;
      if(le) le.textContent='L:'+losses;
      if(pe){
        pe.textContent=(netPL>=0?'+':'')+netPL.toFixed(2);
        pe.style.color=netPL>=0?'var(--accent)':'var(--accent2)';
      }

      const list=document.getElementById('htxList');
      if(!list) return;

      // Filter
      const f=window.currentStickyFilter||'all';
      let data=all;
      if(f==='win')   data=all.filter(t=>t.result==='win');
      if(f==='loss')  data=all.filter(t=>t.result==='loss');
      if(f==='strat') data=all.filter(t=>t.type&&t.type.startsWith('strat'));
      if(f==='bot')   data=all.filter(t=>t.type==='bot'||t.type==='ldp-bot');
      if(f==='manual')data=all.filter(t=>
        t.type!=='bot'&&t.type!=='ldp-bot'&&
        !(t.type&&t.type.startsWith('strat')));

      list.innerHTML = `
        <!-- Filter bar -->
        <div class="htx-filter-bar">
          <button class="stake-preset ${f==='all'?'sfilter-active':''}"
            onclick="setStickyFilter('all',this)">All</button>
          <button class="stake-preset ${f==='win'?'sfilter-active':''}"
            onclick="setStickyFilter('win',this)">Wins</button>
          <button class="stake-preset ${f==='loss'?'sfilter-active':''}"
            onclick="setStickyFilter('loss',this)">Losses</button>
          <button class="stake-preset ${f==='strat'?'sfilter-active':''}"
            onclick="setStickyFilter('strat',this)">Strategy</button>
          <button class="stake-preset ${f==='bot'?'sfilter-active':''}"
            onclick="setStickyFilter('bot',this)">Bot</button>
          <button class="stake-preset"
            style="margin-left:auto;color:var(--accent2)"
            onclick="clearHistory()">Clear</button>
        </div>

        <!-- Summary stats -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;
          gap:1px;background:var(--border);
          border-bottom:1px solid var(--border)">
          <div style="background:var(--bg2);padding:10px 12px">
            <div style="font-size:.6rem;color:var(--text3);
              text-transform:uppercase;letter-spacing:.06em">
              Total stake
            </div>
            <div style="font-size:.88rem;font-weight:800;
              font-family:'DM Mono',monospace;margin-top:2px">
              ${totalS.toFixed(2)} USD
            </div>
            <div style="font-size:.6rem;color:var(--text3);
              text-transform:uppercase;margin-top:8px">
              Contracts lost
            </div>
            <div style="font-size:.88rem;font-weight:800;
              color:var(--accent2);font-family:'DM Mono',monospace">
              ${losses}
            </div>
          </div>
          <div style="background:var(--bg2);padding:10px 12px">
            <div style="font-size:.6rem;color:var(--text3);
              text-transform:uppercase;letter-spacing:.06em">
              Total payout
            </div>
            <div style="font-size:.88rem;font-weight:800;
              font-family:'DM Mono',monospace;margin-top:2px">
              ${totalP.toFixed(2)} USD
            </div>
            <div style="font-size:.6rem;color:var(--text3);
              text-transform:uppercase;margin-top:8px">
              Contracts won
            </div>
            <div style="font-size:.88rem;font-weight:800;
              color:var(--accent);font-family:'DM Mono',monospace">
              ${wins}
            </div>
          </div>
          <div style="background:var(--bg2);padding:10px 12px">
            <div style="font-size:.6rem;color:var(--text3);
              text-transform:uppercase;letter-spacing:.06em">
              No. of runs
            </div>
            <div style="font-size:.88rem;font-weight:800;
              font-family:'DM Mono',monospace;margin-top:2px">
              ${all.length}
            </div>
            <div style="font-size:.6rem;color:var(--text3);
              text-transform:uppercase;margin-top:8px">
              Total profit/loss
            </div>
            <div style="font-size:.88rem;font-weight:800;
              font-family:'DM Mono',monospace;
              color:${netPL>=0?'var(--accent)':'var(--accent2)'}">
              ${(netPL>=0?'+':'')+netPL.toFixed(2)} USD
            </div>
          </div>
        </div>

        <!-- Balance row -->
        <div style="display:flex;justify-content:space-between;
          align-items:center;padding:8px 16px;
          border-bottom:1px solid var(--border);
          background:var(--bg3)">
          <span style="font-size:.72rem;color:var(--text2)">
            Account Balance
          </span>
          <span style="font-family:'DM Mono',monospace;
            font-weight:800;font-size:.88rem;color:var(--accent)">
            ${state.balance.toFixed(2)} USD
          </span>
        </div>

        <!-- Table header -->
        <div style="display:grid;
          grid-template-columns:48px 1fr 1fr;
          padding:8px 16px;
          border-bottom:1px solid var(--border);
          background:var(--bg2)">
          <span style="font-size:.62rem;font-weight:700;
            text-transform:uppercase;color:var(--text3)">
            Type
          </span>
          <span style="font-size:.62rem;font-weight:700;
            text-transform:uppercase;color:var(--text3)">
            Entry/Exit spot
          </span>
          <span style="font-size:.62rem;font-weight:700;
            text-transform:uppercase;color:var(--text3);
            text-align:right">
            Buy price and P/L
          </span>
        </div>

        <!-- Trade rows -->
        ${!data.length
          ? `<div style="text-align:center;padding:24px;
               color:var(--text3);font-size:.8rem">
               No trades yet
             </div>`
          : data.slice(0,100).map(t=>{
              const isWin = t.result==='win';
              const entry = (t.entrySpot||state.price).toFixed(2);
              const exit  = (t.exitSpot||t.entrySpot||state.price).toFixed(2);
              const col   = isWin?'#00e5a0':'#ff3e6c';
              return `
                <div style="display:grid;
                  grid-template-columns:48px 1fr 1fr;
                  align-items:center;padding:10px 16px;
                  border-bottom:1px solid var(--border);
                  gap:4px;transition:background 0.15s"
                  onmouseover="this.style.background='var(--bg3)'"
                  onmouseout="this.style.background=''">

                  <!-- Icon -->
                  <div style="display:flex;align-items:center;
                    justify-content:center">
                    <div style="width:36px;height:36px;
                      border-radius:8px;
                      background:${col}15;
                      border:1px solid ${col}30;
                      display:flex;align-items:center;
                      justify-content:center">
                      <svg viewBox="0 0 24 24" width="18" height="18"
                        fill="none">
                        <rect x="2" y="8" width="3" height="10"
                          rx="1" fill="${col}" opacity=".8"/>
                        <rect x="7" y="4" width="3" height="14"
                          rx="1" fill="${col}" opacity=".6"/>
                        <rect x="12" y="9" width="3" height="9"
                          rx="1" fill="${col}" opacity=".8"/>
                        <rect x="17" y="5" width="3" height="13"
                          rx="1" fill="${col}" opacity=".6"/>
                        <path d="M3.5 13 L8.5 8 L13.5 12 L18.5 6"
                          stroke="${col}" stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </div>

                  <!-- Entry/Exit -->
                  <div style="display:flex;flex-direction:column;gap:4px">
                    <div style="display:flex;align-items:center;
                      gap:5px;font-family:'DM Mono',monospace;
                      font-size:.78rem">
                      <span style="width:8px;height:8px;
                        border-radius:50%;background:#ff4444;
                        flex-shrink:0;display:inline-block"></span>
                      <span style="color:var(--text)">${entry}</span>
                    </div>
                    <div style="display:flex;align-items:center;
                      gap:5px;font-family:'DM Mono',monospace;
                      font-size:.78rem">
                      <span style="width:8px;height:8px;
                        border-radius:50%;background:#666;
                        flex-shrink:0;display:inline-block;
                        opacity:0.5"></span>
                      <span style="color:var(--text2)">${exit}</span>
                    </div>
                    <div style="font-size:.65rem;color:var(--text3);
                      margin-top:1px">
                      ${t.contract.toUpperCase()}
                      · ${t.market} · ${t.time}
                    </div>
                  </div>

                  <!-- Price + PL -->
                  <div style="display:flex;flex-direction:column;
                    align-items:flex-end;gap:4px">
                    <span style="font-size:.82rem;
                      color:var(--text);
                      font-family:'DM Mono',monospace">
                      ${t.stake.toFixed(2)} USD
                    </span>
                    <span style="font-size:.82rem;font-weight:800;
                      font-family:'DM Mono',monospace;color:${col}">
                      ${(t.pl>=0?'+':'')+t.pl.toFixed(2)} USD
                    </span>
                  </div>
                </div>`;
            }).join('')
        }`;
    };

    // Initial render
    window.renderStickyHistory();
    console.log('[History] Final override installed ✅');

  }, 1500);
});

// ══ MOVE STAKE+MULTIPLIER TO STOP CONDITIONS ══════════════════════
window.addEventListener('load', function(){
  setTimeout(function(){

    // ── Hide stake+multiplier inside strategy cards ────────────
    const s = document.createElement('style');
    s.textContent = `
      /* Hide stake row inside strategy body */
      .strategy-item .logic-row:has(.logic-num[min="0.35"]),
      .strategy-item .logic-row:has([onchange*="baseStake"]),
      .strategy-item .logic-row:has([onchange*="multiplier"]) {
        display:none !important;
      }
    `;
    document.head.appendChild(s);

    // ── Patch injectStopConditions to include stake+mult ───────
    window.injectStopConditions = function(id){
      // Remove duplicates
      document.querySelectorAll('#stopcond-'+id)
        .forEach((el,i)=>{ if(i>0) el.remove(); });
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

          <!-- Stake + Multiplier at top -->
          <div class="stop-outer-item">
            <span class="stop-outer-label">💰 Base Stake ($)</span>
            <input class="stop-outer-input" type="number"
              id="sc-stake-${id}"
              value="1.00" min="0.35" step="0.01"
              style="border-color:#00e5a040"
              onchange="updateStopCond(${id},'baseStake',this.value);
                syncStakeToStrategy(${id},this.value)"/>
          </div>
          <div class="stop-outer-item">
            <span class="stop-outer-label">📈 Multiplier</span>
            <input class="stop-outer-input" type="number"
              id="sc-mult-${id}"
              value="2.0" min="1.1" step="0.1"
              style="border-color:#00b8ff40"
              onchange="updateStopCond(${id},'multiplier',this.value);
                syncMultToStrategy(${id},this.value)"/>
          </div>

          <!-- Divider -->
          <div style="grid-column:1/-1;height:1px;
            background:var(--border);margin:4px 0"></div>

          <!-- Stop conditions -->
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

    // ── Sync stake value to strategy hidden inputs ─────────────
    window.syncStakeToStrategy = function(id, val){
      const inputs = document.querySelectorAll(
        '#sitem-'+id+' .logic-num');
      inputs.forEach(inp=>{
        if(parseFloat(inp.min)===0.35||
           inp.placeholder==='stake'){
          inp.value = val;
        }
      });
      // Update current stake display
      const skEl = document.getElementById('ssk-'+id);
      if(skEl) skEl.textContent='$'+parseFloat(val).toFixed(2);
    };

    window.syncMultToStrategy = function(id, val){
      const inputs = document.querySelectorAll(
        '#sitem-'+id+' .logic-num');
      inputs.forEach(inp=>{
        if(parseFloat(inp.min)===1.1){
          inp.value = val;
        }
      });
    };

    // ── Re-inject for existing strategies ─────────────────────
    document.querySelectorAll('.strategy-item').forEach(el=>{
      const id=parseInt(el.id.replace('sitem-',''));
      if(!id) return;
      // Remove old stop cond
      const old = document.getElementById('stopcond-'+id);
      if(old) old.remove();
      // Re-inject with stake+mult
      injectStopConditions(id);
    });

    // ── Patch add to inject updated version ───────────────────
    const _origAdd2 = StratManager.add.bind(StratManager);
    StratManager.add = function(){
      _origAdd2();
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

  }, 1600);
});

// ══ HIDE STAT BOXES INSIDE STRATEGY CARDS ════════════════════════
(function(){
  const s = document.createElement('style');
  s.textContent = `
    /* Hide P/L, Rounds, W/L, Stake grid inside strategy body */
    .strategy-item .bot-stat { display:none !important }
    .strategy-item [style*="grid-template-columns:repeat(4"] {
      display:none !important
    }
    /* Also hide the 4-col stats grid */
    .strategy-item > .strategy-item-body >
      div[style*="grid-template-columns"] {
      display:none !important
    }
  `;
  document.head.appendChild(s);
})();

// ══ SYNC BALANCE EVERYWHERE ═══════════════════════════════════════
window.addEventListener('load', function(){
  setTimeout(function(){

    // ── Single source of truth for balance ────────────────────
    // Override updateBalanceUI to also update history balance row
    const _origUpdateBalance = window.updateBalanceUI;
    window.updateBalanceUI = function(){
      // Call original
      _origUpdateBalance && _origUpdateBalance();

      // Sync history balance row
      const balRow = document.getElementById('htxBalanceRow');
      if(balRow){
        balRow.textContent = state.balance.toFixed(2) + ' USD';
      }

      // Sync navbar balance
      const navBal = document.getElementById('navBalance');
      if(navBal){
        navBal.textContent = state.balance.toFixed(2) + ' USD';
      }

      // Sync main balance display
      const mainBal = document.getElementById('balanceMain');
      if(mainBal){
        mainBal.innerHTML = state.balance.toFixed(2) +
          ' <small style="font-size:.9rem">USD</small>';
      }
    };

    // ── Override onBalance from WS to sync state ──────────────
    const _origOnBalance = window.onBalance;
    window.onBalance = function(data){
      if(!data) return;
      // Update state.balance from real WS data
      state.balance = parseFloat(data.balance);
      _origOnBalance && _origOnBalance(data);
      // Force sync everywhere
      window.updateBalanceUI();
      window.renderStickyHistory();
    };

    // ── Patch renderStickyHistory balance row ─────────────────
    // Add id to balance row so we can update it live
    const _origRender = window.renderStickyHistory;
    window.renderStickyHistory = function(){
      _origRender && _origRender();
      // Find and update balance row after render
      setTimeout(()=>{
        const rows = document.querySelectorAll(
          '#htxList [style*="Account Balance"]'
        );
        rows.forEach(row => {
          const valEl = row.querySelector('span:last-child');
          if(valEl){
            valEl.id = 'htxBalanceRow';
            valEl.textContent = state.balance.toFixed(2)+' USD';
          }
        });

        // Also find by text content
        document.querySelectorAll('#htxList span').forEach(el => {
          if(el.textContent.includes('Account Balance')){
            const next = el.parentElement
              ?.querySelector('span:last-child');
            if(next){
              next.id = 'htxBalanceRow';
              next.textContent = state.balance.toFixed(2)+' USD';
            }
          }
        });
      }, 50);
    };

    // ── Initial sync ──────────────────────────────────────────
    window.updateBalanceUI();

  }, 1700);
});

// ══ CLEAN STAKE MANAGER PER STRATEGY ═════════════════════════════
window._stakeState = {};

function getStakeState(id){
  if(!window._stakeState[id]){
    const baseStake = parseFloat(
      document.getElementById('sc-stake-'+id)?.value
    )||1;
    const mult = parseFloat(
      document.getElementById('sc-mult-'+id)?.value
    )||2;
    window._stakeState[id] = {
      base:       baseStake,
      current:    baseStake,
      multiplier: mult,
      consecLoss: 0,
      totalPL:    0,
      wins:       0,
      losses:     0,
      rounds:     0,
    };
  }
  return window._stakeState[id];
}

function resetStakeState(id){
  delete window._stakeState[id];
}

function getNextStakeForStrategy(id, win){
  const ss   = getStakeState(id);
  const algo = document.querySelectorAll(
    '#sitem-'+id+' .logic-select'
  )[1]?.value || 'martingale';
  const max  = 50;

  if(win){
    ss.consecLoss = 0;
    switch(algo){
      case 'martingale':
        ss.current = ss.base; // reset on win
        break;
      case 'antimartingale':
        ss.current = Math.min(ss.current * ss.multiplier, max);
        break;
      case 'dalembert':
        ss.current = Math.max(ss.base, ss.current - ss.base);
        break;
      case 'fibonacci':
        if(!ss._fib) ss._fib={seq:[1,1],idx:0};
        ss._fib.idx = Math.max(0, ss._fib.idx - 2);
        ss.current  = Math.min(
          ss._fib.seq[ss._fib.idx] * ss.base, max);
        break;
      default:
        ss.current = ss.base;
    }
  } else {
    ss.consecLoss++;
    switch(algo){
      case 'martingale':
        ss.current = Math.min(ss.current * ss.multiplier, max);
        break;
      case 'antimartingale':
        ss.current = ss.base; // reset on loss
        break;
      case 'dalembert':
        ss.current = Math.min(ss.current + ss.base, max);
        break;
      case 'fibonacci':
        if(!ss._fib) ss._fib={seq:[1,1],idx:0};
        ss._fib.idx++;
        while(ss._fib.seq.length <= ss._fib.idx){
          const l = ss._fib.seq.length;
          ss._fib.seq.push(
            ss._fib.seq[l-1] + ss._fib.seq[l-2]);
        }
        ss.current = Math.min(
          ss._fib.seq[ss._fib.idx] * ss.base, max);
        break;
      default:
        ss.current = ss.base;
    }
  }

  // Round to 2 decimal places
  ss.current = parseFloat(ss.current.toFixed(2));
  return ss.current;
}

// ══ REWRITE executeStratTrade WITH CLEAN STAKE LOGIC ═════════════
window.executeStratTrade = function(id){
  if(!checkStratStopConds(id)) return;

  const ss = getStakeState(id);

  // Read base stake from stop conditions in case user changed it
  const baseInput = document.getElementById('sc-stake-'+id);
  const multInput = document.getElementById('sc-mult-'+id);
  if(baseInput) ss.base = parseFloat(baseInput.value)||1;
  if(multInput) ss.multiplier = parseFloat(multInput.value)||2;

  const stake  = ss.current;
  const selects= document.querySelectorAll(
    '#sitem-'+id+' .logic-select');
  const tradeOn= selects[3]?selects[3].value:'odd';
  const symbol = SYMBOL_MAP[state.market]||'R_100';
  const ctype  = tradeOn==='even'?'DIGITEVEN':'DIGITODD';

  // Real trade via WS
  if(window.derivWS && window.derivWS.token){
    window.derivWS.buyContract({
      stake, symbol, contract_type:ctype,
      duration:1, duration_unit:'t',
    });
  }

  // Simulate result
  const win    = Math.random() > 0.45;
  const payout = win ? parseFloat((stake*1.85).toFixed(2)) : 0;
  const pl     = win
    ? parseFloat((payout-stake).toFixed(2))
    : -stake;

  // Update stake state
  ss.rounds++;
  ss.totalPL = parseFloat((ss.totalPL+pl).toFixed(2));
  state.balance = parseFloat((state.balance+pl).toFixed(2));
  if(win){ ss.wins++; }
  else   { ss.losses++; }

  // Get NEXT stake AFTER this result
  const nextStake = getNextStakeForStrategy(id, win);

  // Log for debugging
  console.log(
    `[Strat#${id}] ${win?'WIN':'LOSS'} `+
    `stake:${stake} → next:${nextStake} `+
    `consecLoss:${ss.consecLoss} `+
    `PL:${ss.totalPL}`
  );

  // Record trade
  const entrySpot = state.price;
  const exitSpot  = state.price + (Math.random()-0.5)*0.1;
  const trade = {
    id:       (state.allHistory.length+1),
    time:     new Date().toLocaleTimeString(),
    market:   state.market,
    type:     'strat#'+id,
    contract: ctype.toLowerCase(),
    stake, payout, pl,
    result:   win?'win':'loss',
    entrySpot: parseFloat(entrySpot.toFixed(2)),
    exitSpot:  parseFloat(exitSpot.toFixed(2)),
  };
  state.allHistory.unshift(trade);
  state.tradeHistory.unshift(trade);

  // Update balance everywhere
  window.updateBalanceUI();
  window.renderStickyHistory();

  // Show toast
  showToast(win,'STRAT#'+id, pl, stake);

  // Update contract progress
  updateContractStatus(
    win
      ? '✅ WIN +$'+Math.abs(pl).toFixed(2)
      : '❌ LOSS -$'+Math.abs(pl).toFixed(2),
    100
  );
  setTimeout(()=>{
    if(window._allRunning)
      updateContractStatus('⏳ Waiting for signal...',0);
  },1000);
};

// ── Reset stake state when strategy is deleted ────────────────────
const _origRemove = StratManager.remove.bind(StratManager);
StratManager.remove = function(id){
  resetStakeState(id);
  _origRemove(id);
};
