// ══ WS STATUS ════════════════════════════════════════════════════
function updateWSStatus(status){
  const dot = document.getElementById('wsDot');
  const txt = document.getElementById('wsStatusText');
  if(!dot||!txt) return;
  const map = {
    connected:   {cls:'running', txt:'Connected'},
    disconnected:{cls:'stopped', txt:'Disconnected'},
    error:       {cls:'stopped', txt:'Error'},
  };
  const s = map[status]||{cls:'',txt:status};
  dot.className='status-dot '+s.cls;
  txt.textContent=s.txt;
}

// ══ ACCOUNTS ═════════════════════════════════════════════════════
let derivAccounts=[];

function parseOAuthParams(){
  const p=new URLSearchParams(window.location.search);
  const accounts=[];
  let i=1;
  while(p.get('acct'+i)){
    accounts.push({
      account: p.get('acct'+i),
      token:   p.get('token'+i),
      currency:p.get('cur'+i)||'USD',
    });
    i++;
  }
  if(accounts.length){
    derivAccounts=accounts;
    localStorage.setItem('deriv_accounts',JSON.stringify(accounts));
    localStorage.setItem('deriv_token',accounts[0].token);
    localStorage.setItem('deriv_account',accounts[0].account);
    window.history.replaceState({},document.title,window.location.pathname);
  } else {
    const saved=localStorage.getItem('deriv_accounts');
    if(saved) derivAccounts=JSON.parse(saved);
  }
}

function buildAccountSwitcher(){
  const isHidden = localStorage.getItem("acct_hidden")==="1";
  const wrap=document.getElementById('accountSwitcher');
  const card=document.getElementById('accountSwitcherCard');
  if(!wrap) return;
  if(!derivAccounts.length){ if(card) card.style.display='none'; return; }
  if(card && derivAccounts.length>=1) card.style.display='block';

  const activeToken=localStorage.getItem('deriv_token');
  wrap.innerHTML=derivAccounts.map(a=>{
    const isDemo=a.account.startsWith('VR')||a.account.startsWith('VRW');
    const isActive=activeToken===a.token;
    return `
      <button onclick="switchAccount('${a.token}','${a.account}')"
        class="acct-btn ${isActive?'acct-active':''} ${isDemo?'acct-demo':'acct-real'}">
        <span class="acct-type">${isDemo?'🟡 DEMO':'🟢 REAL'}</span>
        <span class="acct-id">${a.account}</span>
        <span class="acct-cur">${a.currency.toUpperCase()}</span>
      </button>`;
  }).join('');
}

function switchAccount(token,account){
  localStorage.setItem('deriv_token',token);
  localStorage.setItem('deriv_account',account);
  if(window.derivWS&&window.derivWS.connected){
    window.derivWS.authorize(token);
  }
  buildAccountSwitcher();
  showToast(true,'SWITCH',0,0);
  document.getElementById('toastMsg').textContent='✓ Switched to '+account;
}

// ══ AUTH UI ═══════════════════════════════════════════════════════
function updateAuthUI(loggedIn,account){
  const loginBtn  =document.getElementById('loginBtn');
  const logoutBtn =document.getElementById('logoutBtn');
  const authInfo  =document.getElementById('authInfo');
  const demoTag   =document.getElementById('demoTag');
  if(!loginBtn) return;
  if(loggedIn){
    loginBtn.style.display='none';
    logoutBtn.style.display='inline-flex';
    if(authInfo&&account) authInfo.textContent=account.loginid||'';
    if(demoTag&&account){
      const isDemo=account.is_virtual||
        (account.loginid&&account.loginid.startsWith('VR'));
      demoTag.textContent=isDemo?'DEMO':'REAL';
      demoTag.style.background=isDemo?'#ffd16620':'#00e5a020';
      demoTag.style.color=isDemo?'var(--accent3)':'var(--accent)';
    }
  } else {
    loginBtn.style.display='inline-flex';
    logoutBtn.style.display='none';
    if(authInfo) authInfo.textContent='';
    if(demoTag)  demoTag.textContent='';
  }
}

// ══ WS CALLBACKS ══════════════════════════════════════════════════
function onAuthorized(data){
  if(!data) return;
  console.log('[Auth] OK:',data.loginid);
  updateAuthUI(true,data);
  buildAccountSwitcher();
  window.derivWS.subscribeBalance();
  const symbol=SYMBOL_MAP[state.market]||'R_100';
  window.derivWS.subscribeTicks(symbol);
  // Stop simulation, use real ticks
  if(window._simInterval){
    clearInterval(window._simInterval);
    window._simInterval=null;
  }
  showToast(true,'AUTH',0,0);
  document.getElementById('toastMsg').textContent=
    '✓ Connected as '+data.loginid;
}

function onTick(tick){
  if(!tick) return;
  state.prevPrice=state.price;
  state.price=tick.quote;
  state.lastDigit=Math.floor(tick.quote*10)%10;
  state.tickCount++;
  state.chartData.push(state.price);
  if(state.chartData.length>500) state.chartData.shift();
  updateDigitCounts(state.lastDigit);
  updatePriceUI();
  updateChart();
  updateLDP();
  updateTickLog();
  updateTagTick();
}

function onBalance(data){
  if(!data) return;
  state.balance=parseFloat(data.balance);
  const cur=data.currency||'USD';
  document.getElementById('balanceMain').innerHTML=
    state.balance.toFixed(2)+
    ' <small style="font-size:.9rem">'+cur+'</small>';
  document.getElementById('navBalance').textContent=
    state.balance.toFixed(2)+' '+cur;
}

function onBuy(data,error){
  if(error){ onError(error); return; }
  if(!data) return;
  showToast(true,'BUY',0,0);
  document.getElementById('toastMsg').textContent=
    '✓ Contract #'+data.contract_id+' bought';
}

function onProposal(data){
  if(!data) return;
  if(data.payout){
    const stake=parseFloat(data.ask_price)||1;
    const payout=parseFloat(data.payout)||0;
    document.getElementById('ouOverPayout').textContent=payout.toFixed(2);
    document.getElementById('ouOverWin').textContent=(payout-stake).toFixed(2);
  }
}

function onTransaction(data){
  if(!data) return;
  console.log('[Transaction]',data);
}

function onError(err){
  if(!err) return;
  console.error('[Error]',err);
  const toast=document.getElementById('toast');
  toast.className='toast loss';
  document.getElementById('toastMsg').textContent=
    '✗ '+(err.message||JSON.stringify(err));
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'),4000);
}

// ══ REAL TRADE ════════════════════════════════════════════════════
function placeRealTrade(contract){
  if(!window.derivWS||!window.derivWS.token){
    document.getElementById('toastMsg').textContent='✗ Connect Deriv first';
    document.getElementById('toast').className='toast loss show';
    setTimeout(()=>document.getElementById('toast').classList.remove('show'),3000);
    return false;
  }
  const stakeMap={
    over:'ouStake',under:'ouStake',
    even:'eoStake',odd:'eoStake',
    matches:'mdStake',differs:'mdStake',
    rise:'rfStake',fall:'rfStake',
    touch:'tStake',notouch:'tStake',
  };
  const stake=parseFloat(document.getElementById(stakeMap[contract]||'ouStake').value)||1;
  const symbol=SYMBOL_MAP[state.market]||'R_100';
  const ctype=CONTRACT_MAP[contract];
  const duration=parseInt(document.getElementById('ouDuration').value)||5;
  const params={
    stake,symbol,contract_type:ctype,
    duration,duration_unit:'t',
  };
  if(contract==='over'||contract==='under') params.barrier=state.selectedDigit;
  if(contract==='matches'||contract==='differs') params.barrier=state.selectedMatchDigit;
  window.derivWS.buyContract(params);
  return true;
}

// ══ ACCOUNT SWITCHER WITH TOGGLE ═════════════════════════════════
function buildAccountSwitcher(){
  const wrap = document.getElementById('accountSwitcher');
  const card = document.getElementById('accountSwitcherCard');
  if(!wrap) return;
  if(!derivAccounts.length){ if(card) card.style.display='none'; return; }
  if(card) card.style.display='block';

  const isHidden = localStorage.getItem('acct_hidden')==='1';
  const activeToken = localStorage.getItem('deriv_token');

  wrap.innerHTML = derivAccounts.map(a=>{
    const isDemo = a.account.startsWith('VR')||a.account.startsWith('VRW');
    const isActive = activeToken===a.token;
    const displayId = isHidden
      ? a.account.slice(0,2)+'••••••'
      : a.account;
    return `
      <button onclick="switchAccount('${a.token}','${a.account}')"
        class="acct-btn ${isActive?'acct-active':''} ${isDemo?'acct-demo':'acct-real'}">
        <span class="acct-type">${isDemo?'🟡 DEMO':'🟢 REAL'}</span>
        <span class="acct-id">${displayId}</span>
        <span class="acct-cur">${a.currency.toUpperCase()}</span>
      </button>`;
  }).join('');

  // Update toggle button icon
  const toggleBtn = document.getElementById('acctToggleBtn');
  if(toggleBtn) toggleBtn.textContent = isHidden ? '›' : '⌄';
}

function toggleAccountVisibility(){
  const current = localStorage.getItem('acct_hidden')==='1';
  localStorage.setItem('acct_hidden', current?'0':'1');
  buildAccountSwitcher();
}

// ══ FIX LDP ACCURACY ════════════════════════════════════════════
// Keep last 1000 ticks for accurate stats like real Deriv
const TICK_HISTORY = [];
const MAX_TICKS = 1000;

function recordTick(digit){
  TICK_HISTORY.push(digit);
  if(TICK_HISTORY.length > MAX_TICKS){
    TICK_HISTORY.shift();
  }
  // Recalculate from full history
  state.digitCounts = new Array(10).fill(0);
  TICK_HISTORY.forEach(d => state.digitCounts[d]++);
}

// Override updateDigitCounts to use history-based counting
const _updateDigitCounts = updateDigitCounts;
function updateDigitCounts(d){
  recordTick(d);
  // streak tracking
  if(state.streakDigit===d){
    state.streakCount++;
  } else {
    state.streakDigit=d;
    state.streakCount=1;
  }
}

// Update LDP sample size label
function updateLDPLabel(){
  const el = document.getElementById('ldpSampleSize');
  if(el) el.textContent = 'Last '+TICK_HISTORY.length+' ticks';
}
