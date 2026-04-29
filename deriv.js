const DERIV_CONFIG={app_id:101506};

function derivLogin(){
  window.location.href=
    'https://oauth.deriv.com/oauth2/authorize?app_id=101506&l=EN';
}

function derivLogout(){
  localStorage.removeItem('deriv_token');
  localStorage.removeItem('deriv_account');
  localStorage.removeItem('deriv_accounts');
  derivAccounts=[];
  if(window.derivWS) window.derivWS.token=null;
  updateAuthUI(false);
  const card=document.getElementById('accountSwitcherCard');
  if(card) card.style.display='none';
  // Restart simulation
  window._simInterval=setInterval(simulatePrice,1000);
  window.location.href=window.location.pathname;
}

function checkOAuthCallback(){
  parseOAuthParams();
  return localStorage.getItem('deriv_token');
}

class DerivWS{
  constructor(){
    this.ws=null;this.token=null;this.account=null;
    this.queue=[];this.connected=false;this.pingTimer=null;
  }
  connect(){
    this.ws=new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=101506');
    this.ws.onopen=()=>{
      this.connected=true;
      updateWSStatus('connected');
      this.flushQueue();
      this.pingTimer=setInterval(()=>this.send({ping:1}),30000);
      const t=localStorage.getItem('deriv_token');
      if(t) this.authorize(t);
    };
    this.ws.onmessage=(e)=>this.handleMessage(JSON.parse(e.data));
    this.ws.onclose=()=>{
      this.connected=false;
      updateWSStatus('disconnected');
      clearInterval(this.pingTimer);
      setTimeout(()=>this.connect(),3000);
    };
    this.ws.onerror=()=>updateWSStatus('error');
  }
  send(req){
    if(this.connected&&this.ws.readyState===1)
      this.ws.send(JSON.stringify(req));
    else this.queue.push(req);
  }
  flushQueue(){ while(this.queue.length) this.send(this.queue.shift()); }
  authorize(token){
    this.token=token;
    this.send({authorize:token});
  }
  subscribeTicks(symbol){
    this.send({forget_all:'ticks'});
    this.send({ticks:symbol,subscribe:1});
  }
  subscribeBalance(){ this.send({balance:1,subscribe:1}); }
  buyContract(p){
    this.send({
      buy:1,price:p.stake,
      parameters:{
        amount:p.stake,basis:'stake',
        contract_type:p.contract_type,
        currency:'USD',duration:p.duration,
        duration_unit:p.duration_unit,
        symbol:p.symbol,
        ...(p.barrier!==undefined&&{barrier:p.barrier}),
      }
    });
  }
  handleMessage(msg){
    if(msg.msg_type==='authorize')   onAuthorized(msg.authorize);
    if(msg.msg_type==='tick')        onTick(msg.tick);
    if(msg.msg_type==='balance')     onBalance(msg.balance);
    if(msg.msg_type==='buy')         onBuy(msg.buy,msg.error);
    if(msg.msg_type==='proposal')    onProposal(msg.proposal);
    if(msg.msg_type==='transaction') onTransaction(msg.transaction);
    if(msg.error)                    onError(msg.error);
  }
}

const SYMBOL_MAP={
  V10:'R_10',V25:'R_25',V50:'R_50',V75:'R_75',V100:'R_100',
  V10_1S:'1HZ10V',V25_1S:'1HZ25V',V50_1S:'1HZ50V',
  V75_1S:'1HZ75V',V100_1S:'1HZ100V',
};
const CONTRACT_MAP={
  over:'DIGITOVER',under:'DIGITUNDER',
  even:'DIGITEVEN',odd:'DIGITODD',
  matches:'DIGITMATCH',differs:'DIGITDIFF',
  rise:'CALL',fall:'PUT',
  touch:'ONETOUCH',notouch:'NOTOUCH',
};
