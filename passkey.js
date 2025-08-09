// passkey.js - simple client-side passkey with cookie save
(function(){
  const cfg = window.SOLMEME_CONFIG || {};
  const cookieName = cfg.COOKIE_NAME || 'solmeme_auth_v1';
  function setCookie(name, value, days=30) {
    const d = new Date(); d.setTime(d.getTime() + (days*24*60*60*1000));
    document.cookie = name + '=' + encodeURIComponent(value) + ';path=/;expires=' + d.toUTCString();
  }
  function getCookie(name) {
    const v = document.cookie.match('(^|;)\s*' + name + '\s*=\s*([^;]+)');
    return v ? decodeURIComponent(v.pop()) : null;
  }

  function showLock() {
    const overlay = document.createElement('div');
    overlay.id = 'passOverlay';
    Object.assign(overlay.style, {
      position:'fixed', left:0, top:0, right:0, bottom:0, background:'#071022', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999
    });
    overlay.innerHTML = `
      <div style="max-width:560px;width:94%;padding:20px;background:#0f1720;border-radius:8px;box-shadow:0 10px 30px rgba(2,6,23,0.6);text-align:center">
        <h2 style="margin:0 0 10px">Enter Passkey</h2>
        <input id="passInput" type="password" placeholder="Passkey" style="width:100%;padding:12px;border-radius:6px;border:1px solid #233244;background:#071827;color:#e6eef6;margin-bottom:10px;font-size:16px" />
        <div style="display:flex;gap:8px;justify-content:center">
          <button id="passBtn" style="padding:10px 14px;border-radius:6px;border:none;background:#00d1a1;color:#012;cursor:pointer;font-weight:700">Unlock</button>
        </div>
        <p style="color:#9aa4b2;font-size:13px;margin-top:12px">Site locked. Enter passkey to continue. Contact owner if you need access.</p>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('passBtn').onclick = tryPass;
    document.getElementById('passInput').onkeypress = function(e){ if(e.key==='Enter') tryPass(); };
    document.getElementById('passInput').focus();
  }

  function tryPass(){
    const v = document.getElementById('passInput').value.trim();
    if (!v) return alert('Enter passkey');
    const expected = (window.SOLMEME_CONFIG && window.SOLMEME_CONFIG.PASSKEY) || '';
    if (v === expected) {
      setCookie(cookieName, '1', 30);
      const o = document.getElementById('passOverlay'); if (o) o.remove();
      loadApp();
    } else {
      alert('Incorrect passkey');
    }
  }

  function loadApp(){
    // now dynamically load app.js
    const s = document.createElement('script'); s.src = './app.js'; s.type = 'module'; document.body.appendChild(s);
  }

  // entry
  document.addEventListener('DOMContentLoaded', ()=>{
    const ok = getCookie(cookieName);
    if (ok) { loadApp(); return; }
    showLock();
  });
})();