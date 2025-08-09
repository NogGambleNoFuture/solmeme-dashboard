// app.js - full dashboard with Strategy tab, alerts, trade log
const cfg = window.SOLMEME_CONFIG || {};
const DEX_URL = cfg.DEX_URL;
const REFRESH_MS = cfg.REFRESH_MS || 10000;
const TOP_N = cfg.TOP_N || 30;
const JUP = cfg.JUPITER_PREFIX;
const PLAYBOOK = cfg.PLAYBOOK_PDF || './assets/playbook.pdf';
const tokenTwitter = cfg.TOKEN_TWITTER || {};

const root = document.getElementById('root');
root.innerHTML = `
  <div style="display:flex;gap:12px;flex-wrap:wrap">
    <section style="flex:1;min-width:320px">
      <div class="card">
        <h2>Top ${TOP_N} Meme Coin Movers — Solana</h2>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
          <label style="color:var(--muted)">Refresh:</label>
          <select id="refreshSel"><option value="5000">5s</option><option value="10000" selected>10s</option><option value="30000">30s</option></select>
          <button id="viewPlaybook" style="margin-left:8px;padding:6px;border-radius:6px;border:none;background:#123;padding-left:10px;padding-right:10px;color:#fff;cursor:pointer">View Full Playbook</button>
        </div>
        <div class="table-wrap card" style="margin-top:12px">
          <table id="moversTable"><thead><tr><th>#</th><th>Name</th><th>Sym</th><th>Price</th><th>1h%</th><th>24h%</th><th>Trade</th></tr></thead><tbody id="tokenTable"><tr><td colspan="7">Loading…</td></tr></tbody></table>
        </div>
      </div>
      <div style="margin-top:12px" class="card">
        <h3>Trade Log</h3>
        <div class="trade-log" id="tradeLog"></div>
        <div style="margin-top:8px"><button id="exportCSV" style="padding:6px;border-radius:6px;border:none;cursor:pointer">Export CSV</button></div>
      </div>
    </section>

    <aside style="width:340px;min-width:280px">
      <div class="card">
        <div class="side-tabs">
          <div class="tab active" data-tab="twitter">Twitter</div>
          <div class="tab" data-tab="strategy">Strategy</div>
          <div class="tab" data-tab="alerts">Alerts</div>
        </div>
        <div id="sideContent">
          <div id="twitterPanel"><h4>Twitter Feed</h4><div id="tokenFeedPlaceholder" class="muted">Click a token to load its Twitter feed.</div></div>
          <div id="strategyPanel" style="display:none"><h4>Trading Rules (Quick)</h4>
            <ol>
              <li>1h change between +20% and +50%</li>
              <li>24h change &lt; +100%</li>
              <li>Liquidity &gt; $100k</li>
              <li>Confirm rising volume on chart</li>
              <li>Check Twitter hype & community posts</li>
              <li>Entry: 2–5% stack, Add +2–5% on confirmation</li>
              <li>Cut losses at -10%, sell 50% at +30–50%</li>
            </ol>
            <div style="margin-top:8px"><a id="playbookLink" href="${PLAYBOOK}" target="_blank">Open full playbook (PDF)</a></div>
          </div>
          <div id="alertsPanel" style="display:none"><h4>Recent Alerts</h4><div id="alertsList" class="muted">No alerts yet</div></div>
        </div>
      </div>
    </aside>
  </div>
`;

// tabs
document.querySelectorAll('.tab').forEach(t=> t.addEventListener('click', (e)=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  e.target.classList.add('active');
  const sel = e.target.dataset.tab;
  document.getElementById('twitterPanel').style.display = sel==='twitter' ? 'block':'none';
  document.getElementById('strategyPanel').style.display = sel==='strategy' ? 'block':'none';
  document.getElementById('alertsPanel').style.display = sel==='alerts' ? 'block':'none';
}));

// trade log management
const tradeLog = [];
function addTradeLog(entry){
  tradeLog.unshift(entry);
  const div = document.getElementById('tradeLog');
  div.innerHTML = tradeLog.slice(0,100).map(e=>`<div style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.03)">${e.ts} — <strong>${e.symbol}</strong> @ $${e.price.toFixed(6)} — 1h:${e.h1}% 24h:${e.h24}%</div>`).join('');
  document.getElementById('alertsList').innerHTML = tradeLog.slice(0,6).map(e=>`<div>${e.ts} — ${e.symbol} matched strategy</div>`).join('') || 'No alerts yet';
}
document.getElementById('exportCSV').addEventListener('click', ()=>{
  if (!tradeLog.length) return alert('No entries');
  const rows = [['time','symbol','price','1h','24h']].concat(tradeLog.map(e=>[e.ts,e.symbol,e.price,e.h1,e.h24]));
  const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='trade_log.csv'; a.click();
});

// core logic
let prevData = {};
let alerted = {}; // per-session dedupe

async function fetchDex(){
  try {
    const res = await fetch(DEX_URL);
    const j = await res.json();
    return j.pairs || [];
  } catch(e){ console.error('dex err', e); return []; }
}

function meetsStrategy(item){
  const price = Number(item.priceUsd || item.price) || 0;
  const h1 = Number(item.priceChange?.h1 || item.change?.h1 || 0);
  const h24 = Number(item.priceChange?.h24 || item.change?.h24 || 0);
  const liquidity = Number(item.liquidityUsd || item.liquidity || 0);
  if (h1 >= 20 && h1 <= 500 && h24 < 100 && liquidity > 100000) return true;
  return false;
}

function makeRow(item, idx){
  const id = item.pairAddress || item.pair || (item.baseToken && item.baseToken.address) || item.id || item.name;
  const price = Number(item.priceUsd || item.price) || 0;
  const h1 = Number(item.priceChange?.h1 || item.change?.h1 || 0).toFixed(2);
  const h24 = Number(item.priceChange?.h24 || item.change?.h24 || 0).toFixed(2);
  const name = item.baseToken?.name || item.name || '';
  const sym = (item.baseToken?.symbol || item.symbol || '').toUpperCase();
  const tr = document.createElement('tr');
  tr.dataset.id = id;
  tr.innerHTML = `
    <td>${idx+1}</td>
    <td>${escapeHtml(name)}</td>
    <td>${escapeHtml(sym)}</td>
    <td>$${price.toFixed(6)}</td>
    <td style="color:${h1>=0? 'var(--gain)': 'var(--loss)'}">${h1}%</td>
    <td style="color:${h24>=0? 'var(--gain)': 'var(--loss)'}">${h24}%</td>
    <td><button class="trade-btn" data-addr="${item.baseToken?.address||''}" onclick="onTradeClick(event)">Trade</button></td>
  `;
  // strategy highlight
  if (meetsStrategy(item)) {
    tr.style.boxShadow = '0 0 12px rgba(0,255,150,0.08)';
    tr.classList.add('flash-green');
    setTimeout(()=>tr.classList.remove('flash-green'),2000);
    // alert once per session per token
    if (!alerted[id]){
      alerted[id]=true;
      const now = new Date().toLocaleTimeString();
      addTradeLog({ts:now, symbol:sym, price, h1, h24});
      // show notification
      if (Notification.permission === 'granted') {
        const n = new Notification('SolMeme Alert', { body: `${sym} matches strategy — click to open` });
        n.onclick = ()=> { openChart(item); window.focus(); };
      } else {
        // request permission once
        Notification.requestPermission();
      }
    }
  }
  tr.addEventListener('click', (e)=>{
    if (e.target && e.target.classList && e.target.classList.contains('trade-btn')) return;
    loadTokenTwitter(item);
    openChart(item);
  });
  return tr;
}

function openChart(item){
  // simple chart modal using price history stored in localStorage (placeholder)
  const sym = (item.baseToken?.symbol || item.symbol || '').toUpperCase();
  alert(`Open chart for ${sym} (use DexScreener for full chart)`);
}

function loadTokenTwitter(item){
  const placeholder = document.getElementById('tokenFeedPlaceholder');
  const sym = (item.baseToken?.symbol || item.symbol || '').toUpperCase();
  const handle = tokenTwitter[sym] || tokenTwitter[sym.replace('$','')] || null;
  if (!handle) {
    placeholder.innerHTML = '<div class="muted">No Twitter handle found for this token.</div>';
    return;
  }
  placeholder.innerHTML = `<a class="twitter-timeline" data-height="400" href="https://twitter.com/${handle}">Tweets by ${handle}</a>`;
  if (window.twttr && window.twttr.widgets) window.twttr.widgets.load();
}

function escapeHtml(s){ return (s||'').toString().replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

async function refreshOnce(){
  const pairs = await fetchDex();
  const top = pairs.slice(0, TOP_N);
  const tbody = document.getElementById('tokenTable');
  tbody.innerHTML = '';
  top.forEach((p,i)=> tbody.appendChild(makeRow(p,i)));
}

document.getElementById('viewPlaybook').addEventListener('click', ()=> window.open(PLAYBOOK,'_blank'));

document.getElementById('refreshSel').addEventListener('change',(e)=>{
  const v = Number(e.target.value); clearInterval(window._smInterval); window._smInterval = setInterval(refreshOnce, v); refreshOnce();
});

refreshOnce();
window._smInterval = setInterval(refreshOnce, REFRESH_MS);

// load twitter widgets script
const t = document.createElement('script'); t.src='https://platform.twitter.com/widgets.js'; t.async=true; document.body.appendChild(t);

