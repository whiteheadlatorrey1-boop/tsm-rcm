#!/usr/bin/env python3
"""
Patch: construction-strategist.html
- Reads localStorage['tsm_expansion_v1'] written by expansion.html
- Listens on BroadcastChannel for live push updates
- Updates mgr-bar chips with live Expansion data (RFIs, COs, stock, safety, schedule)
- Injects a collapsible "Expansion Feed → BNCA" panel with Groq-powered analysis
- Adds a live status indicator: LIVE / STALE / NO DATA
"""
import pathlib, sys

FILE = pathlib.Path('html/construction-suite/construction-strategist.html')
if not FILE.exists():
    sys.exit(f"ERROR: {FILE} not found. Run from repo root.")

html = FILE.read_text()

# ── Guard ────────────────────────────────────────────────────────────
if 'TSM_EXPANSION_READER' in html:
    print("INFO: Expansion reader already present — already patched.")
    sys.exit(0)

# ── 1. Inject Expansion Feed Panel CSS before </style> ────────────────
FEED_CSS = """
/* ══════════════════════════════════════════════
   EXPANSION FEED PANEL — Strategist Reader
   ══════════════════════════════════════════════ */
#exp-feed-bar {
  background: #060f09;
  border-bottom: 1px solid rgba(0,255,136,.15);
  font-family: 'Barlow', ui-monospace, monospace;
  font-size: 12px;
}
.exp-feed-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 20px;
  border-bottom: 1px solid rgba(0,255,136,.08);
  cursor: pointer;
  user-select: none;
}
.exp-feed-label {
  font-size: 9px;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: #00ff88;
  display: flex;
  align-items: center;
  gap: 6px;
}
#exp-live-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #3a6a4a; flex-shrink: 0;
  transition: background .4s;
}
#exp-live-dot.live  { background: #00ff88; animation: mgrPulse 1.8s infinite; }
#exp-live-dot.stale { background: #ffcc00; }
#exp-live-dot.none  { background: #ff4444; }
#exp-live-txt { font-size: 10px; color: #7abf90; letter-spacing: .08em; }
.exp-feed-chips {
  display: flex; gap: 7px; align-items: center;
  overflow-x: auto; scrollbar-width: none; flex: 1;
}
.exp-feed-chips::-webkit-scrollbar { display: none; }
.exp-chip {
  font-size: 10px; font-weight: 700;
  padding: 3px 9px; border-radius: 3px; border: 1px solid;
  white-space: nowrap; flex-shrink: 0; cursor: default;
  font-family: 'Barlow Condensed', sans-serif; letter-spacing: .05em;
}
.exp-chip.red   { border-color: rgba(255,68,68,.5);  color: #ff6b6b; background: rgba(255,68,68,.06); }
.exp-chip.amber { border-color: rgba(255,204,0,.5);  color: #ffcc00; background: rgba(255,204,0,.06); }
.exp-chip.green { border-color: rgba(0,255,136,.4);  color: #00ff88; background: rgba(0,255,136,.05); }
.exp-chip.muted { border-color: rgba(255,255,255,.08); color: #3a6a4a; background: transparent; }
.exp-chip .cv   { font-size: 12px; font-weight: 900; margin-right: 4px; }
.exp-toggle-btn {
  font: 700 9px 'Barlow Condensed', sans-serif;
  letter-spacing: .1em; text-transform: uppercase;
  color: #3a6a4a; background: transparent; border: none;
  cursor: pointer; padding: 0; transition: color .2s; flex-shrink: 0;
}
.exp-toggle-btn:hover { color: #00ff88; }

/* Expanded BNCA Panel */
#exp-bnca-panel {
  display: none;
  border-top: 1px solid rgba(0,255,136,.08);
}
#exp-bnca-panel.open { display: block; }
.exp-bnca-inner {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: 420px;
  overflow: hidden;
}
.exp-digest-pane {
  background: #040c06;
  border-right: 1px solid rgba(0,255,136,.1);
  display: flex; flex-direction: column; overflow: hidden;
}
.exp-digest-header {
  padding: 8px 14px;
  border-bottom: 1px solid rgba(0,255,136,.08);
  font-size: 9px; letter-spacing: .14em; text-transform: uppercase;
  color: #3a6a4a;
  display: flex; align-items: center; justify-content: space-between;
}
#exp-digest-body {
  flex: 1; overflow-y: auto; padding: 10px 14px;
  font-size: 10px; line-height: 1.75; color: #7abf90;
  white-space: pre-wrap; font-family: 'JetBrains Mono', monospace;
  scrollbar-width: thin; scrollbar-color: rgba(0,255,136,.15) transparent;
}
.exp-engine-pane {
  background: #040c06;
  display: flex; flex-direction: column; overflow: hidden;
}
.exp-engine-header {
  padding: 8px 14px;
  border-bottom: 1px solid rgba(0,255,136,.08);
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
}
.exp-engine-title {
  font-size: 10px; font-weight: 700; color: #c8ffd8;
  letter-spacing: .04em; flex: 1;
}
.exp-engine-badge {
  font-size: 9px; letter-spacing: .1em; text-transform: uppercase;
  padding: 2px 8px; border-radius: 20px;
}
.exp-eb-idle     { background: rgba(255,255,255,.04); color: #3a6a4a; border: 1px solid rgba(255,255,255,.06); }
.exp-eb-running  { background: rgba(0,255,136,.08); color: #00ff88; border: 1px solid rgba(0,255,136,.25); animation: statusPulse 1s infinite; }
.exp-eb-complete { background: rgba(0,255,136,.1); color: #00ff88; border: 1px solid rgba(0,255,136,.3); }
.exp-engine-body {
  flex: 1; overflow-y: auto; padding: 12px 14px;
  font-size: 11.5px; line-height: 1.75; color: #c8ffd8;
  white-space: pre-wrap; font-family: 'Barlow', sans-serif;
  scrollbar-width: thin;
}
.exp-engine-footer {
  border-top: 1px solid rgba(0,255,136,.07);
  padding: 6px 14px;
  display: flex; align-items: center; gap: 8px;
  background: #060f09; flex-shrink: 0;
}
.exp-api-label { font-size: 9px; color: #3a6a4a; letter-spacing: .1em; text-transform: uppercase; }
.exp-api-input {
  flex: 1; background: #02060a;
  border: 1px solid rgba(0,255,136,.15); color: #c8ffd8;
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
  padding: 4px 8px; outline: none; border-radius: 2px; max-width: 260px;
  transition: border-color .2s;
}
.exp-api-input:focus { border-color: rgba(0,255,136,.4); }
.exp-fire-btn {
  background: #00ff88; color: #02060a;
  border: none; padding: 6px 16px;
  font: 700 10px 'Barlow Condensed', monospace;
  letter-spacing: .1em; text-transform: uppercase;
  cursor: pointer; border-radius: 2px; transition: background .15s;
  white-space: nowrap;
}
.exp-fire-btn:hover { background: #00cc66; }
.exp-fire-btn:disabled { opacity: .4; cursor: default; }
.exp-copy-btn {
  font: 700 9px 'Barlow Condensed', sans-serif;
  letter-spacing: .08em; text-transform: uppercase;
  color: #3a6a4a; background: transparent;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 3px; padding: 2px 8px; cursor: pointer; transition: all .15s;
}
.exp-copy-btn:hover { color: #00ff88; border-color: rgba(0,255,136,.3); }
.exp-spinner {
  width: 10px; height: 10px;
  border: 2px solid rgba(0,255,136,.15);
  border-top-color: #00ff88;
  border-radius: 50%; animation: spin .7s linear infinite;
  display: inline-block; flex-shrink: 0;
}
"""

html = html.replace('</style>', FEED_CSS + '\n</style>', 1)
print("✓  Expansion Feed CSS injected")

# ── 2. Inject Expansion Feed HTML after mgr-bar (or after <body>) ─────
FEED_HTML = """
<!-- ══════════════════════════════════════════════
     EXPANSION FEED BAR — Live data from Suite Expansion
     ══════════════════════════════════════════════ -->
<div id="exp-feed-bar">
  <div class="exp-feed-header" onclick="expTogglePanel()">
    <div class="exp-feed-label">
      <span id="exp-live-dot" class="none"></span>
      <span>Suite Expansion Feed</span>
      <span id="exp-live-txt">NO DATA — open expansion &amp; sync</span>
    </div>
    <div class="exp-feed-chips" id="expChips">
      <span class="exp-chip muted"><span class="cv">—</span>RFIs open</span>
      <span class="exp-chip muted"><span class="cv">—</span>CO exposure</span>
      <span class="exp-chip muted"><span class="cv">—</span>stock critical</span>
      <span class="exp-chip muted"><span class="cv">—</span>safety</span>
      <span class="exp-chip muted"><span class="cv">—</span>behind sched.</span>
    </div>
    <button class="exp-toggle-btn" id="expToggleBtn">▼ Analyse</button>
  </div>

  <!-- Collapsible BNCA Panel -->
  <div id="exp-bnca-panel">
    <div class="exp-bnca-inner">
      <!-- Left: raw digest -->
      <div class="exp-digest-pane">
        <div class="exp-digest-header">
          <span>Live Expansion Digest</span>
          <button class="exp-copy-btn" onclick="navigator.clipboard?.writeText(document.getElementById('exp-digest-body').textContent)">COPY</button>
        </div>
        <div id="exp-digest-body" style="color:#3a6a4a;font-style:italic;">No data yet — sync from Expansion app first.</div>
      </div>
      <!-- Right: BNCA engine output -->
      <div class="exp-engine-pane">
        <div class="exp-engine-header">
          <div class="exp-engine-title">⚡ BNCA Engine — Expansion Intelligence</div>
          <div class="exp-engine-badge exp-eb-idle" id="expEngineBadge">IDLE</div>
        </div>
        <div class="exp-engine-body" id="expEngineOutput"
          style="color:#3a6a4a;font-style:italic;font-size:11px;">
          Fire the engine to run BNCA analysis on live Expansion data.
          Identifies critical flags, schedule risks, procurement gaps,
          safety deficiencies, and CO exposure — reported in Build/Note/Check/Act format.
        </div>
        <div class="exp-engine-footer">
          <span class="exp-api-label">Groq Key</span>
          <input id="expGroqKey" class="exp-api-input" type="password" placeholder="gsk_•••••••••••••••••••"
            onfocus="this.style.borderColor='rgba(0,255,136,.4)'" onblur="this.style.borderColor=''">
          <button class="exp-fire-btn" id="expFireBtn" onclick="expFireBNCA()">⚡ RUN BNCA</button>
          <button class="exp-copy-btn" onclick="navigator.clipboard?.writeText(document.getElementById('expEngineOutput').textContent)">COPY</button>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- /EXPANSION FEED BAR -->
"""

# Inject after mgr-bar closing comment, or after <body>
if '<!-- /MANAGER BRIEFING BAR -->' in html:
    html = html.replace('<!-- /MANAGER BRIEFING BAR -->', '<!-- /MANAGER BRIEFING BAR -->\n' + FEED_HTML, 1)
    print("✓  Expansion Feed HTML injected after Manager Briefing Bar")
elif 'id="mgr-bar"' in html:
    # Find end of mgr-bar div and inject after
    # Look for the closing of the mgr decisions div
    html = html.replace('</div>\n<!-- /MANAGER BRIEFING BAR', '</div>\n<!-- /MANAGER BRIEFING BAR', 1)
    html = html.replace('<body>\n\n<!-- ====', '<body>\n\n' + FEED_HTML + '\n<!-- ====', 1)
    print("✓  Expansion Feed HTML injected (fallback position)")
else:
    html = html.replace('<body>', '<body>\n' + FEED_HTML, 1)
    print("✓  Expansion Feed HTML injected after <body>")

# ── 3. Inject Reader JS before </body> ────────────────────────────────
READER_JS = r"""
<script>
/* ══════════════════════════════════════════════════════════════════
   TSM_EXPANSION_READER — Strategist reads from Expansion localStorage
   ══════════════════════════════════════════════════════════════════ */
const TSM_SYNC_KEY = 'tsm_expansion_v1';
const TSM_SYNC_CH  = new BroadcastChannel('tsm_strategist_feed');

let expSnapshot = null;
let expPanelOpen = false;

/* ── Read + render chips ── */
function expLoadSnapshot() {
  try {
    const raw = localStorage.getItem(TSM_SYNC_KEY);
    if (!raw) { expSetStatus('none', 'NO DATA — open Expansion app & sync'); return; }
    const snap = JSON.parse(raw);
    expSnapshot = snap;

    // Age check
    const age = Date.now() - new Date(snap.timestamp).getTime();
    const ageMin = Math.round(age / 60000);
    const isStale = age > 10 * 60 * 1000; // >10 min = stale

    expSetStatus(
      isStale ? 'stale' : 'live',
      isStale
        ? `STALE · ${ageMin}min ago — re-sync Expansion`
        : `LIVE · updated ${ageMin < 1 ? 'just now' : ageMin + 'min ago'}`
    );
    expRenderChips(snap);
    expRenderDigest(snap);
    expUpdateMgrBar(snap);
  } catch(e) {
    expSetStatus('none', 'READ ERROR — ' + e.message);
  }
}

function expSetStatus(state, txt) {
  const dot = document.getElementById('exp-live-dot');
  const lbl = document.getElementById('exp-live-txt');
  if (dot) { dot.className = ''; dot.classList.add(state); }
  if (lbl) lbl.textContent = txt;
}

function expRenderChips(snap) {
  const rfisOpen    = snap.rfis?.summary?.open        ?? '—';
  const coExposure  = snap.changeOrders?.totalExposure ?? null;
  const stockCrit   = snap.procurement?.alerts?.critical ?? '—';
  const stockWarn   = snap.procurement?.alerts?.warning  ?? 0;
  const safetyScore = snap.fieldops?.safety?.safetyScore ?? snap.fieldops?.safetyScore ?? null;
  const behind      = snap.schedule?.behindCount       ?? '—';

  const coFmt = coExposure !== null
    ? '$' + (coExposure >= 1000 ? (coExposure/1000).toFixed(1) + 'K' : coExposure.toLocaleString())
    : '—';

  const chips = document.getElementById('expChips');
  if (!chips) return;
  chips.innerHTML = `
    <span class="exp-chip ${rfisOpen > 0 ? 'amber' : 'green'}">
      <span class="cv">${rfisOpen}</span>RFIs open
    </span>
    <span class="exp-chip ${coExposure > 0 ? 'amber' : 'green'}">
      <span class="cv">${coFmt}</span>CO exposure
    </span>
    <span class="exp-chip ${stockCrit > 0 ? 'red' : stockWarn > 0 ? 'amber' : 'green'}">
      <span class="cv">${stockCrit}</span>stock critical
    </span>
    <span class="exp-chip ${safetyScore !== null && safetyScore < 80 ? 'amber' : 'green'}">
      <span class="cv">${safetyScore !== null ? safetyScore + '%' : '—'}</span>safety
    </span>
    <span class="exp-chip ${behind > 2 ? 'red' : behind > 0 ? 'amber' : 'green'}">
      <span class="cv">${behind}</span>behind sched.
    </span>
  `;
}

function expRenderDigest(snap) {
  const body = document.getElementById('exp-digest-body');
  if (!body) return;
  body.textContent = snap.digest || JSON.stringify(snap, null, 2);
}

/* ── Update mgr-bar chips with live Expansion data ── */
function expUpdateMgrBar(snap) {
  const rfisOpen   = snap.rfis?.summary?.open ?? null;
  const behind     = snap.schedule?.behindCount ?? null;
  const stockCrit  = snap.procurement?.alerts?.critical ?? null;
  const coExposure = snap.changeOrders?.totalExposure ?? null;

  // Try to find & update existing mgr chips by their label text
  document.querySelectorAll('.mgr-chip').forEach(chip => {
    const lbl = chip.querySelector('.chip-label')?.textContent?.toLowerCase() || '';
    const val = chip.querySelector('.chip-val');
    if (!val) return;
    if (lbl.includes('active sites') && rfisOpen !== null) {
      // leave sites chip alone
    }
    if (lbl.includes('rfi') && rfisOpen !== null) {
      val.textContent = rfisOpen;
      chip.className = 'mgr-chip ' + (rfisOpen > 3 ? 'red' : rfisOpen > 0 ? 'amber' : 'green');
    }
    if (lbl.includes('behind') && behind !== null) {
      val.textContent = behind;
    }
    if ((lbl.includes('critical') || lbl.includes('stock')) && stockCrit !== null) {
      val.textContent = stockCrit;
      chip.className = 'mgr-chip ' + (stockCrit > 0 ? 'red' : 'green');
    }
    if (lbl.includes('co') && coExposure !== null) {
      val.textContent = '$' + (coExposure >= 1000
        ? (coExposure/1000).toFixed(0) + 'K'
        : coExposure.toLocaleString());
    }
  });

  // Update mgr brief text if expansion data is available
  const brief = document.getElementById('mgrBrief');
  if (brief && snap.rfis?.summary) {
    const rfis = snap.rfis.summary.open;
    const cos  = snap.changeOrders?.list?.length ?? 0;
    const sc   = snap.fieldops?.safety?.safetyScore ?? snap.fieldops?.safetyScore;
    const bt   = snap.schedule?.behindCount ?? 0;
    if (rfis !== undefined) {
      // Inject live data line below existing brief
      const liveTag = document.getElementById('mgr-brief-live');
      if (!liveTag) {
        const span = document.createElement('div');
        span.id = 'mgr-brief-live';
        span.style.cssText = 'margin-top:5px;font-size:11px;color:#00ff88;border-top:1px solid rgba(0,255,136,.15);padding-top:5px;';
        span.innerHTML = `<strong style="color:#00ff88">↑ LIVE EXPANSION DATA:</strong> `
          + `${rfis} RFIs open · ${cos} change order${cos !== 1 ? 's' : ''} · `
          + (sc !== undefined ? `${sc}% safety compliance · ` : '')
          + `${bt} task${bt !== 1 ? 's' : ''} behind schedule`;
        brief.appendChild(span);
      } else {
        liveTag.innerHTML = `<strong style="color:#00ff88">↑ LIVE EXPANSION DATA:</strong> `
          + `${rfis} RFIs open · ${cos} change order${cos !== 1 ? 's' : ''} · `
          + (sc !== undefined ? `${sc}% safety compliance · ` : '')
          + `${bt} task${bt !== 1 ? 's' : ''} behind schedule`;
      }
    }
  }
}

/* ── Toggle panel ── */
function expTogglePanel() {
  expPanelOpen = !expPanelOpen;
  const panel = document.getElementById('exp-bnca-panel');
  const btn   = document.getElementById('expToggleBtn');
  if (panel) panel.classList.toggle('open', expPanelOpen);
  if (btn)   btn.textContent = expPanelOpen ? '▲ Collapse' : '▼ Analyse';
  if (expPanelOpen && expSnapshot) expRenderDigest(expSnapshot);
}

/* ── BNCA Engine via Groq ── */
async function expFireBNCA() {
  const apiKey = document.getElementById('expGroqKey')?.value?.trim();
  if (!apiKey) { alert('Enter your Groq API key.'); return; }
  if (!expSnapshot?.digest) { alert('No Expansion data loaded. Sync from the Expansion app first.'); return; }

  const btn    = document.getElementById('expFireBtn');
  const badge  = document.getElementById('expEngineBadge');
  const output = document.getElementById('expEngineOutput');
  if (!btn || !badge || !output) return;

  btn.disabled = true;
  badge.className = 'exp-engine-badge exp-eb-running';
  badge.textContent = 'RUNNING';
  output.innerHTML = '<span style="display:flex;align-items:center;gap:7px;color:#00ff88">'
    + '<span class="exp-spinner"></span> Analysing Expansion live state via BNCA…</span>';

  const systemPrompt = `You are a senior construction project strategist embedded in a command centre.
You receive a live data digest from the Construction Suite Expansion app covering:
FieldOps safety, PlanRoom document status, Procurement stock levels & POs,
open RFIs, Change Orders, and Schedule progress.

Your job: produce a tight BNCA analysis in exactly this structure —

BUILD / EXECUTE (do it now — top 3 actions with owner and deadline)
NOTE / TRACK (items to monitor — top 3 with metric and threshold)
CHECK / VERIFY (confirmations required before proceeding — top 3)
ACT / ESCALATE (items requiring manager decision or escalation — top 3)

Then add:
MANAGER SUMMARY (2 sentences max — what does leadership need to decide today)
RISK SCORE (single word: LOW / MODERATE / HIGH / CRITICAL + one sentence why)

Be specific: use real numbers from the data. Name the actual items.
Do not pad. No preamble. Start with BUILD.`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_tokens: 900,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Live Expansion Digest:\n\n' + expSnapshot.digest }
        ]
      })
    });
    if (!r.ok) throw new Error('Groq ' + r.status + ' ' + r.statusText);
    const d = await r.json();
    const text = d.choices?.[0]?.message?.content || 'No response from model.';
    output.textContent = text;
    badge.className  = 'exp-engine-badge exp-eb-complete';
    badge.textContent = 'COMPLETE';

    // Also push the BNCA result into the mgr-bar brief decisions if open
    const decisionsEl = document.getElementById('mgr-decisions');
    if (decisionsEl) {
      const existing = document.getElementById('exp-bnca-decision-inject');
      const card = existing || document.createElement('div');
      card.id = 'exp-bnca-decision-inject';
      card.className = 'mgr-decision-card';
      card.style.gridColumn = '1 / -1';
      card.innerHTML = `
        <div class="dc-tag p1" style="color:#00ff88;font-size:9px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px;">
          EXPANSION BNCA · ${new Date().toLocaleTimeString()}
        </div>
        <div class="dc-text" style="font-size:11px;color:#c8ffd8;line-height:1.6;white-space:pre-wrap;max-height:200px;overflow:auto;">${text}</div>
      `;
      if (!existing) {
        const grid = decisionsEl.querySelector('.mgr-decision-grid');
        if (grid) grid.prepend(card);
        else decisionsEl.appendChild(card);
      }
    }
  } catch(e) {
    output.textContent = '[ERROR] ' + e.message;
    badge.className  = 'exp-engine-badge exp-eb-idle';
    badge.textContent = 'ERROR';
  }
  btn.disabled = false;
}

/* ── BroadcastChannel: live push from Expansion ── */
TSM_SYNC_CH.onmessage = (ev) => {
  if (ev.data?.type === 'expansion_update' && ev.data?.snapshot) {
    expSnapshot = ev.data.snapshot;
    expSetStatus('live', 'LIVE · just now (push)');
    expRenderChips(expSnapshot);
    expRenderDigest(expSnapshot);
    expUpdateMgrBar(expSnapshot);
    // Flash the feed bar border
    const bar = document.getElementById('exp-feed-bar');
    if (bar) {
      bar.style.borderBottomColor = '#00ff88';
      setTimeout(() => { bar.style.borderBottomColor = ''; }, 1200);
    }
  }
};

/* ── Poll localStorage every 30s for cross-tab updates ── */
setInterval(expLoadSnapshot, 30000);

/* ── Initial load ── */
window.addEventListener('DOMContentLoaded', expLoadSnapshot);
</script>
"""

if 'TSM_EXPANSION_READER' in html:
    print("INFO: Reader JS already present — skipping")
else:
    READER_JS_MARKED = READER_JS.replace(
        "/* ══════════════════════",
        "/* TSM_EXPANSION_READER\n   ══════════════════════"
    )
    html = html.replace('</body>', READER_JS_MARKED + '\n</body>', 1)
    print("✓  Expansion Reader JS injected (localStorage + BroadcastChannel)")

FILE.write_text(html)
print(f"""
✅  {FILE} patched — Strategist now reads Expansion data.

HOW IT WORKS:
  Expansion  → writes localStorage['tsm_expansion_v1'] + BroadcastChannel push
  Strategist → reads on load, polls every 30s, listens for live push
  ⚡ BNCA panel → Groq analyses the live digest in BUILD/NOTE/CHECK/ACT format
  Mgr-bar chips → updated with live RFI count, CO exposure, stock critical, schedule

RUN FLOW:
  1. Open Expansion app → click ↑ STRATEGIST SYNC (or wait for auto-sync)
  2. Open Strategist → feed bar shows LIVE status + chip values
  3. Click ▼ Analyse → enter Groq key → ⚡ RUN BNCA
  4. BNCA report appears in panel AND is pushed into mgr-bar decisions
""")
