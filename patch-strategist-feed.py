#!/usr/bin/env python3
"""
Patch: construction-strategist.html
- Reads tsm_expansion_v1 from localStorage (written by expansion)
- Listens on BroadcastChannel for live pushes
- Adds "EXPANSION FEED" panel in the strategist UI
- Fires a dedicated BNCA engine when new data arrives
- Updates mgr-bar chips with live expansion metrics
"""
import pathlib, sys

FILE = pathlib.Path('html/construction-suite/construction-strategist.html')
if not FILE.exists():
    sys.exit(f"ERROR: {FILE} not found. Run from repo root.")

html = FILE.read_text()

# ── 1. CSS for the expansion feed panel ──────────────────────────────
FEED_CSS = """
/* ═══════════════════════════════════════════════
   EXPANSION LIVE FEED PANEL
   ═══════════════════════════════════════════════ */
#expansion-feed {
  position: fixed;
  bottom: 0; right: 0;
  width: 460px;
  max-height: 70vh;
  background: #060e06;
  border: 1px solid var(--green, #00ff88);
  border-bottom: none;
  z-index: 500;
  display: flex;
  flex-direction: column;
  font-family: 'JetBrains Mono', 'Barlow', monospace;
  box-shadow: -4px 0 24px rgba(0,255,136,.12);
  transition: transform .3s ease;
}
#expansion-feed.collapsed { transform: translateY(calc(100% - 38px)); }
#expansion-feed-header {
  background: #0a1a0a;
  border-bottom: 1px solid rgba(0,255,136,.2);
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex-shrink: 0;
  user-select: none;
}
#expansion-feed-header .ef-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #00ff88;
  animation: efPulse 2s infinite;
  flex-shrink: 0;
}
#expansion-feed-header .ef-dot.stale { background: #ffcc00; animation: none; }
#expansion-feed-header .ef-dot.none  { background: #666; animation: none; }
@keyframes efPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
#expansion-feed-header .ef-title {
  font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
  color: #00ff88; flex: 1;
}
#expansion-feed-header .ef-ts { font-size: 9px; color: #3a6a4a; }
#expansion-feed-header .ef-toggle { font-size: 11px; color: #3a6a4a; }
#expansion-feed-body { flex: 1; overflow-y: auto; padding: 0; display: flex; flex-direction: column; }
.ef-chips {
  display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 14px 8px;
  border-bottom: 1px solid rgba(255,255,255,.04);
}
.ef-chip {
  font-size: 10px; border: 1px solid; border-radius: 3px;
  padding: 3px 9px; display: flex; align-items: center; gap: 5px;
  font-family: 'JetBrains Mono', monospace;
}
.ef-chip .ecv { font-weight: 700; font-size: 12px; }
.ef-chip.red   { border-color: rgba(255,68,68,.5);  color: #ff4444;  background: rgba(255,68,68,.06); }
.ef-chip.amber { border-color: rgba(255,204,0,.5);  color: #ffcc00;  background: rgba(255,204,0,.06); }
.ef-chip.green { border-color: rgba(0,255,136,.4);  color: #00ff88;  background: rgba(0,255,136,.05); }
.ef-chip.blue  { border-color: rgba(0,170,255,.4);  color: #00aaff;  background: rgba(0,170,255,.05); }
#expansion-bnca-output {
  flex: 1; overflow-y: auto; padding: 12px 14px;
  font-size: 11px; line-height: 1.7; color: #7abf90;
  white-space: pre-wrap; font-family: 'JetBrains Mono', monospace;
}
#expansion-bnca-output .ef-placeholder { color: #3a6a4a; font-style: italic; }
#expansion-bnca-output .ef-running { color: #ffcc00; display: flex; align-items: center; gap: 6px; }
.ef-spinner {
  width: 10px; height: 10px; border: 2px solid rgba(255,255,255,.1);
  border-top-color: #ffcc00; border-radius: 50%;
  animation: efSpin .7s linear infinite; flex-shrink: 0; display: inline-block;
}
@keyframes efSpin { to { transform: rotate(360deg); } }
#expansion-feed-footer {
  border-top: 1px solid rgba(255,255,255,.04);
  padding: 7px 14px;
  display: flex; gap: 6px; flex-shrink: 0;
  background: #0a1a0a;
}
.ef-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; letter-spacing: .1em; text-transform: uppercase;
  border: 1px solid rgba(0,255,136,.3); color: #00ff88;
  background: transparent; padding: 4px 10px; cursor: pointer;
  border-radius: 2px; transition: all .15s;
}
.ef-btn:hover { background: rgba(0,255,136,.08); }
.ef-btn.primary { background: rgba(0,255,136,.1); border-color: #00ff88; }
.ef-btn:disabled { opacity: .35; cursor: default; }
.ef-groq-row {
  display: flex; align-items: center; gap: 6px;
  border-top: 1px solid rgba(255,255,255,.04);
  padding: 6px 14px; background: #0a1a0a; flex-shrink: 0;
}
.ef-groq-label { font-size: 9px; color: #3a6a4a; letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
.ef-groq-input {
  flex: 1; background: #060e06; border: 1px solid rgba(255,255,255,.08);
  color: #c8ffd8; font-family: 'JetBrains Mono', monospace;
  font-size: 10px; padding: 4px 7px; outline: none; border-radius: 2px;
  transition: border-color .2s;
}
.ef-groq-input:focus { border-color: rgba(0,255,136,.4); }
"""

if 'expansion-feed' in html and '#expansion-feed {' in html:
    print("INFO: Expansion Feed CSS already present — skipping")
else:
    html = html.replace('</style>', FEED_CSS + '\n</style>', 1)
    print("✓  Expansion Feed CSS injected")

# ── 2. HTML panel — inject before </body> ─────────────────────────────
FEED_HTML = """
<!-- ═══════════════════════════════════════════════
     EXPANSION LIVE FEED — slides up from bottom-right
     ═══════════════════════════════════════════════ -->
<div id="expansion-feed" class="collapsed">
  <div id="expansion-feed-header" onclick="efToggle()">
    <div class="ef-dot none" id="ef-dot"></div>
    <div class="ef-title">⚡ Suite Expansion Live Feed</div>
    <div class="ef-ts" id="ef-ts">no data yet</div>
    <div class="ef-toggle" id="ef-toggle-icon">▲</div>
  </div>

  <div id="expansion-feed-body">
    <!-- Live metric chips -->
    <div class="ef-chips" id="ef-chips">
      <div class="ef-chip blue"><span class="ecv" id="efc-safety">—</span><span>safety %</span></div>
      <div class="ef-chip red"><span class="ecv" id="efc-stock">—</span><span>stock critical</span></div>
      <div class="ef-chip amber"><span class="ecv" id="efc-rfis">—</span><span>RFIs open</span></div>
      <div class="ef-chip amber"><span class="ecv" id="efc-co">—</span><span>CO exposure</span></div>
      <div class="ef-chip red"><span class="ecv" id="efc-docs">—</span><span>docs rejected</span></div>
      <div class="ef-chip amber"><span class="ecv" id="efc-schedule">—</span><span>tasks behind</span></div>
    </div>

    <!-- Groq key row -->
    <div class="ef-groq-row">
      <div class="ef-groq-label">Groq Key</div>
      <input id="ef-groq-key" type="password" class="ef-groq-input" placeholder="gsk_•••••••••••••••">
    </div>

    <!-- BNCA output -->
    <div id="expansion-bnca-output">
      <span class="ef-placeholder">Pull latest from Suite Expansion to begin BNCA analysis…</span>
    </div>
  </div>

  <div id="expansion-feed-footer">
    <button class="ef-btn primary" id="ef-fire-btn" onclick="efPullAndFire()">⚡ Pull & Run BNCA</button>
    <button class="ef-btn" onclick="efPull()">↓ Pull Data Only</button>
    <button class="ef-btn" onclick="efOpenExpansion()">↗ Open Expansion</button>
    <button class="ef-btn" onclick="efCopy()">⎘ Copy</button>
  </div>
</div>
"""

if 'expansion-feed-header' in html:
    print("INFO: Expansion Feed HTML already present — skipping")
else:
    html = html.replace('</body>', FEED_HTML + '\n</body>', 1)
    print("✓  Expansion Feed HTML injected")

# ── 3. JS — inject before </body> ─────────────────────────────────────
FEED_JS = r"""
<script>
/* ═══════════════════════════════════════════════════════════════
   EXPANSION → STRATEGIST BNCA ENGINE
   Reads tsm_expansion_v1 from localStorage (written by expansion)
   Also listens on BroadcastChannel for real-time push
   ═══════════════════════════════════════════════════════════════ */
const EF_KEY = 'tsm_expansion_v1';
const EF_CH  = new BroadcastChannel('tsm_strategist_feed');

let efCollapsed = true;
let efLastSnapshot = null;
let efBncaText = '';

/* ── Toggle panel ── */
function efToggle() {
  efCollapsed = !efCollapsed;
  document.getElementById('expansion-feed').classList.toggle('collapsed', efCollapsed);
  document.getElementById('ef-toggle-icon').textContent = efCollapsed ? '▲' : '▼';
  if (!efCollapsed && !efLastSnapshot) efPull();
}

/* ── Open expansion in new tab ── */
function efOpenExpansion() {
  window.open('https://tsm-shell.fly.dev/construction-suite/construction-suite-expansion.html', '_blank');
}

/* ── Pull data from localStorage ── */
function efPull() {
  try {
    const raw = localStorage.getItem(EF_KEY);
    if (!raw) {
      document.getElementById('expansion-bnca-output').innerHTML =
        '<span style="color:#ffcc00">⚠ No data in localStorage. Open Suite Expansion and click "↑ STRATEGIST SYNC"</span>';
      return null;
    }
    const snap = JSON.parse(raw);
    efLastSnapshot = snap;
    efUpdateChips(snap);
    efUpdateDot('live');
    efUpdateMgrBar(snap);
    const ts = new Date(snap.timestamp).toLocaleTimeString();
    document.getElementById('ef-ts').textContent = 'synced ' + ts;
    console.log('[Strategist] Expansion data loaded:', snap.timestamp);
    return snap;
  } catch(e) {
    document.getElementById('expansion-bnca-output').innerHTML =
      '<span style="color:#ff4444">[Error reading expansion data] ' + e.message + '</span>';
    return null;
  }
}

/* ── Update metric chips ── */
function efUpdateChips(snap) {
  const s = snap;
  const safety  = s.fieldops?.safetyScore;
  const stock   = s.procurement?.alerts?.critical ?? '—';
  const rfis    = s.rfis?.summary?.open ?? '—';
  const co      = s.changeOrders?.totalExposure ?? 0;
  const docs    = s.planroom?.summary?.rejected ?? '—';
  const sched   = s.schedule?.behindCount ?? '—';

  document.getElementById('efc-safety').textContent   = safety != null ? safety + '%' : '—';
  document.getElementById('efc-stock').textContent    = stock;
  document.getElementById('efc-rfis').textContent     = rfis;
  document.getElementById('efc-co').textContent       = co ? '$' + co.toLocaleString() : '—';
  document.getElementById('efc-docs').textContent     = docs;
  document.getElementById('efc-schedule').textContent = sched;

  /* Colour-code chips by severity */
  const safetyChip = document.getElementById('efc-safety').parentElement;
  if (safety != null) safetyChip.className = 'ef-chip ' + (safety >= 80 ? 'green' : safety >= 60 ? 'amber' : 'red');
  const stockChip  = document.getElementById('efc-stock').parentElement;
  if (stock > 0) stockChip.className = 'ef-chip red';
  const rfiChip    = document.getElementById('efc-rfis').parentElement;
  if (rfis > 3) rfiChip.className = 'ef-chip red';
}

/* ── Push key metrics into the mgr-bar chips ── */
function efUpdateMgrBar(snap) {
  /* We update the Manager Briefing Bar chips with live expansion values */
  const chips = document.querySelectorAll('.mgr-chip');
  if (!chips.length) return;

  /* Update brief text */
  const brief = document.getElementById('mgrBrief');
  if (brief && snap.digest) {
    const rfisOpen   = snap.rfis?.summary?.open ?? 0;
    const stockCrit  = snap.procurement?.alerts?.critical ?? 0;
    const coExp      = snap.changeOrders?.totalExposure ?? 0;
    const safety     = snap.fieldops?.safetyScore;
    const behindTasks = snap.schedule?.behindCount ?? 0;

    const alerts = [];
    if (stockCrit > 0)    alerts.push(`<span class="alert">${stockCrit} stock item${stockCrit>1?'s':''} CRITICAL in procurement</span>`);
    if (rfisOpen > 0)     alerts.push(`<strong>${rfisOpen} open RFI${rfisOpen>1?'s':''}</strong> require responses`);
    if (coExp > 0)        alerts.push(`<strong>$${coExp.toLocaleString()}</strong> in pending change orders`);
    if (behindTasks > 0)  alerts.push(`<strong>${behindTasks} task${behindTasks>1?'s':''} behind schedule</strong>`);
    if (safety != null && safety < 80)
                          alerts.push(`<span class="alert">Safety checklist at ${safety}%</span> — incomplete`);

    if (alerts.length) {
      brief.innerHTML = '<strong>Suite Expansion — live data ingested.</strong> ' + alerts.join('. ') + '.';
    }
  }
}

/* ── Dot state ── */
function efUpdateDot(state) {
  const dot = document.getElementById('ef-dot');
  dot.className = 'ef-dot ' + (state === 'live' ? '' : state === 'stale' ? 'stale' : 'none');
}

/* ── Pull + run BNCA ── */
async function efPullAndFire() {
  const apiKey = document.getElementById('ef-groq-key').value.trim() ||
                 document.getElementById('bncaGroqKey')?.value?.trim() ||
                 document.getElementById('groqKeyDocs')?.value?.trim() || '';

  if (!apiKey) {
    alert('Enter your Groq API key in the field above first.');
    return;
  }

  const snap = efPull();
  if (!snap) return;

  const btn = document.getElementById('ef-fire-btn');
  btn.disabled = true;

  const out = document.getElementById('expansion-bnca-output');
  out.innerHTML = '<div class="ef-running"><span class="ef-spinner"></span> Running 4-engine BNCA on expansion data…</div>';

  const digest = snap.digest || JSON.stringify(snap, null, 2);

  try {
    /* Engine 1: Triage */
    out.innerHTML = '<div class="ef-running"><span class="ef-spinner"></span> Engine 1 — Document & Module Triage…</div>';
    const e1 = await efGroq(apiKey,
      'You are a senior construction project controller analyzing live field data from a construction management platform. Flag all issues, risks, and items needing immediate attention. Use bullet points, be specific.',
      'TRIAGE this live construction suite data — identify all flags and issues:\n\n' + digest
    );

    /* Engine 2: Variance & Risk */
    out.innerHTML = '<div class="ef-running"><span class="ef-spinner"></span> Engine 2 — Variance & Risk Intelligence…</div>';
    const e2 = await efGroq(apiKey,
      'You are a construction risk analyst. Identify schedule, cost, procurement and compliance risks. Give specific dollar amounts and days where applicable.',
      'Analyze VARIANCE AND RISK from this live construction data:\n\n' + digest + '\n\nEngine 1 flags:\n' + e1
    );

    /* Engine 3: BNCA Action Plan */
    out.innerHTML = '<div class="ef-running"><span class="ef-spinner"></span> Engine 3 — BNCA Site Action Plan…</div>';
    const e3 = await efGroq(apiKey,
      'You are a construction superintendent. Create a prioritized BNCA action plan: BUILD/EXECUTE (do now), NOTE/TRACK (monitor), CHECK/VERIFY (confirm status), ACT/ESCALATE (needs decision). 3-4 items per section. Direct and actionable.',
      'Create BNCA action plan from this live construction data:\n\n' + digest + '\n\nRisks identified:\n' + e2
    );

    /* Engine 4: Executive Summary → Strategist Report */
    out.innerHTML = '<div class="ef-running"><span class="ef-spinner"></span> Engine 4 — Executive Summary for Strategist…</div>';
    const e4 = await efGroq(apiKey,
      'You are a construction executive. Write a tight 3-paragraph strategist report: (1) Current site status from live data — what is on track vs at risk, (2) Top 3 decisions needed from project leadership today, (3) Recommended actions with owners and deadlines. This feeds directly into the Construction Strategist dashboard.',
      'Write the STRATEGIST REPORT from this live expansion data:\n\nDigest:\n' + digest + '\n\nBNCA plan:\n' + e3
    );

    /* Render all 4 engines */
    efBncaText = [
      '═══ ENGINE 1 — TRIAGE & FLAGS ═══\n' + e1,
      '\n═══ ENGINE 2 — VARIANCE & RISK ═══\n' + e2,
      '\n═══ ENGINE 3 — BNCA ACTION PLAN ═══\n' + e3,
      '\n═══ ENGINE 4 — STRATEGIST REPORT ═══\n' + e4
    ].join('\n');

    out.textContent = efBncaText;
    efUpdateDot('live');

    /* Also push to mgr-bar brief with the exec summary */
    const brief = document.getElementById('mgrBrief');
    if (brief) {
      /* Pull first 2 sentences from e4 */
      const firstTwo = e4.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
      brief.innerHTML = '<strong>[LIVE — Suite Expansion]</strong> ' + firstTwo;
    }

    console.log('[Strategist] BNCA complete —', new Date().toLocaleTimeString());

  } catch(err) {
    out.textContent = '[BNCA Error] ' + err.message;
    console.error('[Strategist] BNCA error:', err);
  }

  btn.disabled = false;
}

/* ── Groq API call ── */
async function efGroq(apiKey, system, user) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_tokens: 700,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user }
      ]
    })
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error('Groq ' + r.status + ': ' + err.slice(0, 120));
  }
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '[no response]';
}

/* ── Copy BNCA output ── */
function efCopy() {
  if (efBncaText) navigator.clipboard?.writeText(efBncaText);
  const out = document.getElementById('expansion-bnca-output');
  if (!efBncaText) navigator.clipboard?.writeText(out.innerText);
}

/* ── BroadcastChannel — live push from expansion ── */
EF_CH.onmessage = (evt) => {
  if (evt.data?.type === 'expansion_update') {
    efLastSnapshot = evt.data.snapshot;
    efUpdateChips(efLastSnapshot);
    efUpdateDot('live');
    efUpdateMgrBar(efLastSnapshot);
    const ts = new Date(efLastSnapshot.timestamp).toLocaleTimeString();
    document.getElementById('ef-ts').textContent = 'live push ' + ts;

    /* Auto-expand the panel briefly to show the update */
    if (efCollapsed) {
      efCollapsed = false;
      document.getElementById('expansion-feed').classList.remove('collapsed');
      document.getElementById('ef-toggle-icon').textContent = '▼';
      setTimeout(() => {
        efCollapsed = true;
        document.getElementById('expansion-feed').classList.add('collapsed');
        document.getElementById('ef-toggle-icon').textContent = '▲';
      }, 4000);
    }
    console.log('[Strategist] Live push received from expansion:', ts);
  }
};

/* ── On load: pull if data already exists ── */
window.addEventListener('load', () => {
  setTimeout(() => {
    const raw = localStorage.getItem(EF_KEY);
    if (raw) {
      try {
        const snap = JSON.parse(raw);
        efLastSnapshot = snap;
        efUpdateChips(snap);
        efUpdateDot('live');
        efUpdateMgrBar(snap);
        document.getElementById('ef-ts').textContent =
          'cached ' + new Date(snap.timestamp).toLocaleTimeString();
        console.log('[Strategist] Loaded cached expansion data on start');
      } catch(e) { efUpdateDot('none'); }
    } else {
      efUpdateDot('none');
    }
  }, 600);
});

console.log('[Strategist] Expansion feed channel live — key:', EF_KEY);
</script>
"""

if 'EF_KEY = ' in html:
    print("INFO: Expansion Feed JS already present — skipping")
else:
    html = html.replace('</body>', FEED_JS + '\n</body>', 1)
    print("✓  Expansion → Strategist BNCA engine JS injected")

FILE.write_text(html)
print(f"\n✅  {FILE} patched — strategist now reads expansion data and runs 4-engine BNCA")
print("\nFlow summary:")
print("  expansion.html → writes  localStorage['tsm_expansion_v1']")
print("  expansion.html → pushes  BroadcastChannel('tsm_strategist_feed')")
print("  strategist.html → reads  localStorage on load (cached data)")
print("  strategist.html → listens BroadcastChannel (live push, auto-expands feed)")
print("  strategist.html → ⚡ Pull & Run BNCA → Groq 4-engine analysis → renders output")
print("  strategist.html → updates mgr-bar brief with live exec summary")
