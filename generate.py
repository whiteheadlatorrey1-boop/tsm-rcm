import os, json

OUT = "/home/claude/gen/out"
os.makedirs(OUT, exist_ok=True)

# ─────────────────────────────────────────────────────────────────
# Shared CSS skeleton (accent color is the only per-vertical variable)
# ─────────────────────────────────────────────────────────────────
CSS = """
:root{
  --bg:#050a0f;--bg2:#0a1020;--bg3:#0d1528;
  --cyan:#00d4d4;--amber:#f5a623;--green:#22c55e;
  --red:#ef4444;--purple:#a855f7;--blue:#3b82f6;--orange:#f97316;
  --text:#e2e8f0;--muted:#64748b;--border:#1e293b;
  --accent:__ACCENT__;
}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--bg);color:var(--text);font-family:'Rajdhani',sans-serif;min-height:100vh;}

.topbar{height:42px;background:#020810;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 20px;position:sticky;top:0;z-index:50;}
.tb-brand{font-family:'Orbitron',sans-serif;font-size:.7rem;color:var(--accent);letter-spacing:.15em;display:flex;align-items:center;gap:8px;}
.tb-dot{width:7px;height:7px;border-radius:50%;background:var(--accent);animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.tb-time{font-family:'Orbitron',sans-serif;font-size:.75rem;color:var(--accent);}

.chain-nav{height:36px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:2px;}
.chain-node{font-family:'Orbitron',sans-serif;font-size:.56rem;padding:6px 14px;letter-spacing:.07em;color:var(--muted);text-decoration:none;border-bottom:2px solid transparent;white-space:nowrap;}
.chain-node.active{color:var(--accent);border-bottom-color:var(--accent);}
.chain-node.done{color:var(--green);}
.chain-arrow{font-family:'JetBrains Mono',monospace;font-size:.62rem;color:var(--border);padding:0 2px;}

.main{max-width:1180px;margin:0 auto;padding:22px 20px 60px;display:flex;flex-direction:column;gap:18px;}

.empty-state{background:var(--bg2);border:1px dashed var(--border);border-radius:8px;padding:56px 40px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;}
.empty-icon{font-size:2.2rem;opacity:.5;}
.empty-title{font-family:'Orbitron',sans-serif;font-size:.8rem;color:var(--text);letter-spacing:.05em;}
.empty-copy{font-family:'JetBrains Mono',monospace;font-size:.68rem;color:var(--muted);max-width:480px;line-height:1.7;}
.empty-copy a{color:var(--accent);}

.header{border-radius:8px;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;border:1px solid rgba(255,255,255,.06);background:var(--bg2);}
.h-left{display:flex;align-items:center;gap:14px;}
.h-icon{font-size:1.5rem;}
.h-title{font-family:'Orbitron',sans-serif;font-size:.92rem;letter-spacing:.04em;color:var(--accent);}
.h-sub{font-family:'JetBrains Mono',monospace;font-size:.62rem;color:var(--muted);margin-top:4px;}
.h-badge{font-family:'Orbitron',sans-serif;font-size:.58rem;letter-spacing:.1em;padding:5px 12px;border-radius:3px;white-space:nowrap;border:1px solid var(--accent);color:var(--accent);background:rgba(255,255,255,.03);}

.kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;}
.kpi-card{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:13px 15px;}
.kpi-card .kv{font-family:'Orbitron',sans-serif;font-size:1.15rem;font-weight:700;}
.kpi-card .kl{font-family:'JetBrains Mono',monospace;font-size:.55rem;color:var(--muted);margin-top:4px;letter-spacing:.03em;}
.kv.ok{color:var(--green);}.kv.warn{color:var(--amber);}.kv.crit{color:var(--red);}.kv.neutral{color:var(--accent);}

.panel{background:var(--bg2);border:1px solid var(--border);border-radius:8px;overflow:hidden;}
.panel-head{padding:11px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}
.panel-title{font-family:'Orbitron',sans-serif;font-size:.65rem;letter-spacing:.08em;color:var(--text);}
.panel-body{padding:16px 18px;}

.attn-list{display:flex;flex-direction:column;gap:6px;}
.attn-item{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:9px 12px;font-size:.78rem;}
.attn-title{color:var(--text);}
.attn-sub{font-family:'JetBrains Mono',monospace;font-size:.6rem;color:var(--muted);}
.attn-tag{font-family:'Orbitron',sans-serif;font-size:.5rem;letter-spacing:.06em;padding:3px 8px;border-radius:2px;flex-shrink:0;}
.tag-ok{background:rgba(34,197,94,.15);color:var(--green);}
.tag-warn{background:rgba(245,166,35,.15);color:var(--amber);}
.tag-crit{background:rgba(239,68,68,.15);color:var(--red);}
.attn-empty{padding:14px;text-align:center;color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.68rem;}

.brief-actions{display:flex;gap:8px;padding:12px 18px;border-bottom:1px solid var(--border);flex-wrap:wrap;}
.brief-btn{padding:8px 16px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:'Orbitron',sans-serif;font-size:.6rem;cursor:pointer;letter-spacing:.06em;transition:.2s;}
.brief-btn:hover{border-color:var(--accent);color:var(--accent);}
.brief-btn.fire{border-color:var(--accent);background:var(--accent);color:#000;}
.brief-btn.fire:hover{opacity:.85;color:#000;}
.brief-btn:disabled{opacity:.35;cursor:not-allowed;}
.brief-body{padding:16px 18px;font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#bbb;line-height:1.7;white-space:pre-wrap;min-height:120px;max-height:420px;overflow-y:auto;}
.brief-idle{color:var(--muted);text-align:center;padding:20px;font-family:'Orbitron',sans-serif;font-size:.6rem;letter-spacing:.08em;}

.action-list{display:flex;flex-direction:column;gap:10px;}
.action-item{display:flex;align-items:flex-start;gap:12px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:12px 14px;}
.action-item.done{opacity:.55;}
.action-rank{font-family:'Orbitron',sans-serif;font-size:.8rem;color:var(--accent);width:20px;text-align:center;flex-shrink:0;}
.action-text{font-size:.85rem;line-height:1.5;}
.action-meta{display:flex;gap:14px;margin-top:6px;flex-wrap:wrap;}
.action-owner,.action-deadline{font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--muted);}
.action-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;}
.action-badge{font-family:'Orbitron',sans-serif;font-size:.5rem;letter-spacing:.05em;padding:3px 8px;border-radius:2px;}
.badge-authorize{background:rgba(34,197,94,.15);color:var(--green);}
.badge-escalate{background:rgba(239,68,68,.15);color:var(--red);}
.badge-review{background:rgba(245,166,35,.15);color:var(--amber);}
.ack-btn{font-family:'Orbitron',sans-serif;font-size:.52rem;letter-spacing:.05em;padding:4px 9px;border-radius:3px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;}
.ack-btn:hover{border-color:var(--green);color:var(--green);}
.ack-btn.acked{border-color:var(--green);color:var(--green);}

.raw-toggle{cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:.6rem;color:var(--accent);user-select:none;}
.raw-body{font-family:'JetBrains Mono',monospace;font-size:.62rem;color:var(--muted);line-height:1.6;white-space:pre-wrap;margin-top:10px;display:none;max-height:260px;overflow-y:auto;}
.raw-body.open{display:block;}

.btn-row{display:flex;gap:10px;flex-wrap:wrap;}
.btn{font-family:'Orbitron',sans-serif;font-size:.6rem;letter-spacing:.07em;padding:10px 18px;border-radius:4px;border:1px solid var(--border);background:var(--bg3);color:var(--text);cursor:pointer;transition:.2s;}
.btn:hover{border-color:var(--accent);color:var(--accent);}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#000;}
.btn.primary:hover{opacity:.85;color:#000;}
.btn.danger:hover{border-color:var(--red);color:var(--red);}
.btn:disabled{opacity:.4;cursor:not-allowed;}

.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--bg3);border:1px solid var(--accent);border-radius:6px;padding:10px 20px;font-family:'JetBrains Mono',monospace;font-size:.66rem;opacity:0;pointer-events:none;transition:.25s;z-index:80;}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
.toast.err{border-color:var(--red);color:var(--red);}
""".strip()

# ─────────────────────────────────────────────────────────────────
# Shared JS helpers reused by every strategist + executive-portal page
# ─────────────────────────────────────────────────────────────────
JS_HELPERS = """
function tick(){ var c=document.getElementById('clock'); if(c) c.textContent = new Date().toLocaleTimeString(); }
setInterval(tick,1000); tick();

function showToast(msg, isErr){
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(showToast._h);
  showToast._h = setTimeout(function(){ t.className = 'toast'; }, 3000);
}

function escapeHtml(str){
  return String(str==null?'':str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function timeAgo(iso){
  if (!iso) return 'unknown time';
  var t = typeof iso === 'number' ? iso : new Date(iso).getTime();
  var ms = Date.now() - t;
  var mins = Math.round(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + ' min ago';
  var hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + ' hr' + (hrs===1?'':'s') + ' ago';
  return Math.round(hrs/24) + ' day(s) ago';
}

function readFirst(keys){
  for (var i=0;i<keys.length;i++){
    var k = keys[i];
    try {
      var v = sessionStorage.getItem(k) || localStorage.getItem(k);
      if (v) return JSON.parse(v);
    } catch(e) {}
  }
  return null;
}

function fmtVal(unit, val){
  if (val == null || val === '') return 'N/A';
  if (unit === 'usd') return '$' + Number(val).toLocaleString();
  if (unit === 'pct') return val + '%';
  if (unit === 'ms') return val + 'ms';
  if (unit === 'days') return val + (val===1?' day':' days');
  return (typeof val === 'number') ? val.toLocaleString() : val;
}

function kpiCards(defs, kpis){
  kpis = kpis || {};
  return defs.map(function(d){
    var val = kpis[d.id];
    var cls = 'neutral';
    if (d.warnAbove != null && typeof val === 'number' && val > d.warnAbove) cls = 'warn';
    if (d.warnBelow != null && typeof val === 'number' && val < d.warnBelow) cls = 'warn';
    if (d.critAbove != null && typeof val === 'number' && val > d.critAbove) cls = 'crit';
    if (d.critBelow != null && typeof val === 'number' && val < d.critBelow) cls = 'crit';
    return '<div class="kpi-card"><div class="kv ' + cls + '">' + fmtVal(d.unit, val) + '</div><div class="kl">' + d.label + '</div></div>';
  }).join('');
}
""".strip()

def esc_js(s):
    return s.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')

# ─────────────────────────────────────────────────────────────────
# Strategist page template
# ─────────────────────────────────────────────────────────────────
STRATEGIST_TMPL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TSM · __LABEL__ Strategist</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
__CSS__
</style>
</head>
<body>

<div class="topbar">
  <span class="tb-brand"><span class="tb-dot"></span>TSM · __ICON__ __LABEL_UPPER__ STRATEGIST</span>
  <span class="tb-time" id="clock"></span>
</div>
<div class="chain-nav">
  <a class="chain-node done" href="__WAR_ROOM_URL__">__ICON__ WAR ROOM</a>
  <span class="chain-arrow">→</span>
  <span class="chain-node active">◉ STRATEGIST</span>
  <span class="chain-arrow">→</span>
  <a class="chain-node" href="__EXEC_URL__">○ EXECUTIVE PORTAL</a>
</div>

<div class="main" id="mainRoot"></div>
<div class="toast" id="toast"></div>

<script>
__JS_HELPERS__

var WAR_KEYS = __WAR_KEYS_JSON__;
var STRAT_KEY = __STRAT_KEY_JSON__;
var WAR_ROOM_URL = __WAR_ROOM_URL_JSON__;
var EXEC_URL = __EXEC_URL_JSON__;
var KPI_DEFS = __KPI_DEFS_JSON__;
var ACTIONS = __ACTIONS_JSON__;

var relay = null;
var briefText = '';

function deriveAttentionItems(r){
__DERIVE_JS__
}

function renderEmpty(){
  document.getElementById('mainRoot').innerHTML =
    '<div class="empty-state">' +
      '<div class="empty-icon">__ICON__</div>' +
      '<div class="empty-title">NO ACTIVE RELAY</div>' +
      '<div class="empty-copy">Nothing has been escalated from the __LABEL__ War Room yet. ' +
      'Run an analysis there and click "RELAY TO STRATEGIST" to populate this view.</div>' +
      '<div class="btn-row"><a class="btn" href="__WAR_ROOM_URL__">← Open __LABEL__ War Room</a></div>' +
    '</div>';
}

function render(){
  var root = document.getElementById('mainRoot');
  var items = deriveAttentionItems(relay);
  var itemsHtml = items.length ? items.map(function(it){
    return '<div class="attn-item"><div><div class="attn-title">' + escapeHtml(it.title) + '</div>' +
      (it.sub ? '<div class="attn-sub">' + escapeHtml(it.sub) + '</div>' : '') + '</div>' +
      '<span class="attn-tag tag-' + (it.tag||'warn') + '">' + (it.tag||'warn').toUpperCase() + '</span></div>';
  }).join('') : '<div class="attn-empty">Nothing flagged for attention right now.</div>';

  root.innerHTML =
    '<div class="header">' +
      '<div class="h-left"><div class="h-icon">__ICON__</div><div>' +
        '<div class="h-title">__LABEL_UPPER__ — STRATEGIST BRIEF</div>' +
        '<div class="h-sub">Relayed ' + timeAgo(relay.timestamp || relay.relayed_at || relay.ts) + ' from War Room</div>' +
      '</div></div>' +
      '<div class="h-badge">RELAYED</div>' +
    '</div>' +
    '<div class="kpi-row">' + kpiCards(KPI_DEFS, relay.kpis) + '</div>' +
    '<div class="panel"><div class="panel-head"><span class="panel-title">FLAGGED FOR ATTENTION</span></div>' +
      '<div class="panel-body"><div class="attn-list">' + itemsHtml + '</div></div></div>' +
    '<div class="panel">' +
      '<div class="panel-head"><span class="panel-title">AI STRATEGY BRIEF</span></div>' +
      '<div class="brief-actions">' +
        '<button class="brief-btn fire" id="genBtn" onclick="generateBrief()">⚡ GENERATE STRATEGY BRIEF</button>' +
        '<button class="brief-btn" onclick="toggleRaw()">◈ RAW RELAY DATA</button>' +
      '</div>' +
      '<div class="brief-body" id="briefBody"><div class="brief-idle">Click GENERATE STRATEGY BRIEF to synthesize ranked recommendations from the relayed data.</div></div>' +
      '<div class="panel-body" style="padding-top:0">' +
        '<div class="raw-body" id="rawBody">' + escapeHtml(JSON.stringify(relay, null, 2)) + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="panel"><div class="panel-head"><span class="panel-title">RANKED EXECUTIVE DECISIONS</span></div>' +
      '<div class="panel-body"><div class="action-list">' +
        ACTIONS.map(function(a){
          return '<div class="action-item"><div class="action-rank">' + a.rank + '</div>' +
            '<div style="flex:1"><div class="action-text">' + escapeHtml(a.text) + '</div>' +
            '<div class="action-meta"><span class="action-owner">OWNER: ' + escapeHtml(a.owner) + '</span>' +
            '<span class="action-deadline">DEADLINE: ' + escapeHtml(a.deadline) + '</span></div></div>' +
            '<span class="action-badge badge-' + a.badge + '">' + a.label + '</span></div>';
        }).join('') +
      '</div></div>' +
    '</div>' +
    '<div class="btn-row">' +
      '<a class="btn" href="' + WAR_ROOM_URL + '">← Back to War Room</a>' +
      '<button class="btn primary" id="escalateBtn" onclick="escalateToExec()" disabled>ESCALATE TO EXECUTIVE PORTAL →</button>' +
      '<button class="btn danger" onclick="clearRelay()">✕ CLEAR RELAY</button>' +
    '</div>';
}

function toggleRaw(){
  var el = document.getElementById('rawBody');
  el.classList.toggle('open');
}

async function generateBrief(){
  var btn = document.getElementById('genBtn');
  var body = document.getElementById('briefBody');
  btn.disabled = true;
  btn.textContent = '⏳ GENERATING...';
  body.innerHTML = '';
  var prompt = __PROMPT_JSON__ + '\\n\\nRELAYED DATA (JSON):\\n' + JSON.stringify(relay).slice(0, 6000);
  try {
    var res = await fetch('/api/war-room/stream', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ model: 'openai/gpt-oss-120b', max_tokens: 900, messages: [{ role:'user', content: prompt }] })
    });
    if (!res.ok) throw new Error('API returned ' + res.status);
    if (res.headers.get('content-type') && res.headers.get('content-type').indexOf('text/event-stream') > -1) {
      var reader = res.body.getReader();
      var dec = new TextDecoder();
      briefText = '';
      while(true){
        var chunk = await reader.read();
        if (chunk.done) break;
        var lines = dec.decode(chunk.value).split('\\n');
        for (var i=0;i<lines.length;i++){
          var line = lines[i];
          if (line.indexOf('data: ') === 0){
            var d = line.slice(6);
            if (d === '[DONE]') continue;
            try { briefText += (JSON.parse(d).choices[0].delta.content || ''); } catch(e){}
          }
        }
        body.textContent = briefText;
      }
    } else {
      var data = await res.json();
      briefText = data.output || data.answer || (data.choices && data.choices[0] && data.choices[0].message.content) || '';
      body.textContent = briefText;
    }
    if (!briefText) throw new Error('Empty response from API');
    btn.textContent = '✓ BRIEF COMPLETE';
    document.getElementById('escalateBtn').disabled = false;
  } catch(e) {
    body.innerHTML = '<div style="color:var(--red)">Brief generation failed: ' + escapeHtml(e.message) + '</div>';
    btn.disabled = false;
    btn.textContent = '⚡ GENERATE STRATEGY BRIEF';
  }
}

function escalateToExec(){
  var payload = {
    vertical: __VERTICAL_JSON__,
    brief: briefText,
    kpis: relay.kpis,
    sourceRelay: relay,
    timestamp: new Date().toISOString(),
    chainStep: 'strategist'
  };
  try {
    var json = JSON.stringify(payload);
    sessionStorage.setItem(STRAT_KEY, json);
    localStorage.setItem(STRAT_KEY, json);
  } catch(e) {}
  showToast('Packaged for Executive Portal — opening…');
  setTimeout(function(){ window.location.href = EXEC_URL; }, 500);
}

function clearRelay(){
  WAR_KEYS.forEach(function(k){ try{ sessionStorage.removeItem(k); localStorage.removeItem(k); }catch(e){} });
  showToast('Relay cleared.');
  setTimeout(function(){ relay = null; renderEmpty(); }, 400);
}

(function init(){
  relay = readFirst(WAR_KEYS);
  if (!relay) { renderEmpty(); return; }
  render();
})();
</script>
</body>
</html>
"""

# ─────────────────────────────────────────────────────────────────
# Executive portal page template
# ─────────────────────────────────────────────────────────────────
EXEC_TMPL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TSM · __LABEL__ Executive Portal</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
__CSS__
</style>
</head>
<body>

<div class="topbar">
  <span class="tb-brand"><span class="tb-dot"></span>TSM · __ICON__ __LABEL_UPPER__ EXECUTIVE PORTAL</span>
  <span class="tb-time" id="clock"></span>
</div>
<div class="chain-nav">
  <a class="chain-node done" href="__WAR_ROOM_URL__">__ICON__ WAR ROOM</a>
  <span class="chain-arrow">→</span>
  <a class="chain-node done" href="__STRAT_URL__">◉ STRATEGIST</a>
  <span class="chain-arrow">→</span>
  <span class="chain-node active">● EXECUTIVE PORTAL</span>
</div>

<div class="main" id="mainRoot"></div>
<div class="toast" id="toast"></div>

<script>
__JS_HELPERS__

var STRAT_KEYS = __STRAT_KEYS_JSON__;
var WAR_ROOM_URL = __WAR_ROOM_URL_JSON__;
var STRAT_URL = __STRAT_URL_JSON__;
var KPI_DEFS = __KPI_DEFS_JSON__;

var relay = null;
var ackState = {};

function renderEmpty(){
  document.getElementById('mainRoot').innerHTML =
    '<div class="empty-state">' +
      '<div class="empty-icon">__ICON__</div>' +
      '<div class="empty-title">NOTHING AWAITING EXECUTIVE REVIEW</div>' +
      '<div class="empty-copy">No strategy brief has been escalated from the __LABEL__ Strategist yet.</div>' +
      '<div class="btn-row"><a class="btn" href="__STRAT_URL__">← Open __LABEL__ Strategist</a></div>' +
    '</div>';
}

function render(){
  var root = document.getElementById('mainRoot');
  var brief = relay.brief || '(no strategy brief text was relayed)';
  var actions = (relay.sourceRelay && relay.sourceRelay.recommended_actions) || null;

  root.innerHTML =
    '<div class="header">' +
      '<div class="h-left"><div class="h-icon">__ICON__</div><div>' +
        '<div class="h-title">__LABEL_UPPER__ — EXECUTIVE BRIEF</div>' +
        '<div class="h-sub">Escalated ' + timeAgo(relay.timestamp) + ' by Strategist</div>' +
      '</div></div>' +
      '<div class="h-badge">AWAITING SIGN-OFF</div>' +
    '</div>' +
    '<div class="kpi-row">' + kpiCards(KPI_DEFS, relay.kpis) + '</div>' +
    '<div class="panel"><div class="panel-head"><span class="panel-title">STRATEGY BRIEF</span></div>' +
      '<div class="brief-body">' + escapeHtml(brief) + '</div></div>' +
    '<div class="panel"><div class="panel-head"><span class="panel-title">EXECUTIVE SIGN-OFF</span></div>' +
      '<div class="panel-body">' +
        '<div class="action-list" id="signoffList"></div>' +
      '</div></div>' +
    '<div class="panel"><div class="panel-head"><span class="panel-title">SOURCE DATA</span>' +
      '<span class="raw-toggle" onclick="toggleRaw()" id="rawToggle">▸ VIEW</span></div>' +
      '<div class="panel-body" style="padding-top:0">' +
        '<div class="raw-body" id="rawBody">' + escapeHtml(JSON.stringify(relay.sourceRelay || relay, null, 2)) + '</div>' +
      '</div></div>' +
    '<div class="btn-row">' +
      '<a class="btn" href="__STRAT_URL__">← Back to Strategist</a>' +
      '<button class="btn primary" onclick="exportBrief()">↓ EXPORT EXECUTIVE BRIEF</button>' +
      '<button class="btn danger" onclick="clearRelay()">✕ CLEAR RELAY</button>' +
    '</div>';

  renderSignoff();
}

var SIGNOFF_ITEMS = __SIGNOFF_JSON__;

function renderSignoff(){
  var list = document.getElementById('signoffList');
  list.innerHTML = SIGNOFF_ITEMS.map(function(a, i){
    var acked = !!ackState[i];
    return '<div class="action-item ' + (acked?'done':'') + '"><div class="action-rank">' + a.rank + '</div>' +
      '<div style="flex:1"><div class="action-text">' + escapeHtml(a.text) + '</div>' +
      '<div class="action-meta"><span class="action-owner">OWNER: ' + escapeHtml(a.owner) + '</span>' +
      '<span class="action-deadline">DEADLINE: ' + escapeHtml(a.deadline) + '</span></div></div>' +
      '<div class="action-right"><span class="action-badge badge-' + a.badge + '">' + a.label + '</span>' +
      '<button class="ack-btn ' + (acked?'acked':'') + '" onclick="toggleAck(' + i + ')">' + (acked?'✓ SIGNED OFF':'SIGN OFF') + '</button></div>' +
      '</div>';
  }).join('');
}

function toggleAck(i){ ackState[i] = !ackState[i]; renderSignoff(); }

function toggleRaw(){
  var el = document.getElementById('rawBody');
  el.classList.toggle('open');
  document.getElementById('rawToggle').textContent = (el.classList.contains('open') ? '▾' : '▸') + ' VIEW';
}

function exportBrief(){
  var lines = [];
  lines.push('TSM __LABEL_UPPER__ EXECUTIVE BRIEF');
  lines.push('Escalated: ' + (relay.timestamp || 'unknown'));
  lines.push('='.repeat(60));
  lines.push('');
  lines.push('STRATEGY BRIEF:');
  lines.push(relay.brief || '(none)');
  lines.push('');
  lines.push('SIGN-OFF STATUS:');
  SIGNOFF_ITEMS.forEach(function(a,i){ lines.push((ackState[i]?'[x] ':'[ ] ') + a.text + ' — ' + a.owner); });
  var blob = new Blob([lines.join('\\n')], { type:'text/plain' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'TSM-__VERTICAL_UPPER__-Executive-Brief-' + new Date().toISOString().slice(0,10) + '.txt';
  a.click();
}

function clearRelay(){
  STRAT_KEYS.forEach(function(k){ try{ sessionStorage.removeItem(k); localStorage.removeItem(k); }catch(e){} });
  showToast('Relay cleared.');
  setTimeout(function(){ relay = null; renderEmpty(); }, 400);
}

(function init(){
  relay = readFirst(STRAT_KEYS);
  if (!relay) { renderEmpty(); return; }
  render();
})();
</script>
</body>
</html>
"""

def render(tmpl, mapping):
    out = tmpl
    for k, v in mapping.items():
        out = out.replace(k, v)
    return out

VERTICALS = []