#!/usr/bin/env python3
"""
TSM Construction Suite + FinOps — Self-contained patch script
Run from repo root: python3 patch-all.py
Patches:
  1. document-showcase.html  → 4-engine BNCA + Morning/Midday/EOD workflow tabs
  2. tax.html                → Sales Tax Filing panel
  3. finops-accounting.html  → Intercompany matrix + Fixed Assets roster
"""
import pathlib, sys

# ══════════════════════════════════════════════════════════════════════
# 1. DOCUMENT SHOWCASE — 4-engine BNCA + workflow tabs
# ══════════════════════════════════════════════════════════════════════
showcase = pathlib.Path('html/construction-suite/document-showcase.html')
html = showcase.read_text()

if 'engine-bnca-wrap' in html:
    print('INFO: document-showcase.html already has 4-engine BNCA — skipping')
else:
    # ── CSS ───────────────────────────────────────────────────────────
    BNCA_CSS = """
<style id="bnca-4engine-css">
/* ── 4-ENGINE BNCA ── */
#bnca-content-wrap{display:none;flex-direction:column;height:calc(100vh - 84px)}
#bnca-content-wrap.active{display:flex}
.bnca-top-bar{background:var(--surface,#10150e);border-bottom:1px solid var(--border,#243019);padding:10px 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.bnca-pipeline{display:flex;align-items:center;gap:0}
.pipe-node{display:flex;flex-direction:column;align-items:center;gap:4px}
.pipe-circle{width:34px;height:34px;border-radius:50%;border:2px solid var(--border,#243019);background:var(--s2,#161c13);display:flex;align-items:center;justify-content:center;font-size:.9rem;transition:all .4s}
.pipe-circle.active{border-color:var(--gold,#f5a623);background:rgba(245,166,35,.12);animation:np .8s ease-in-out infinite}
@keyframes np{0%,100%{box-shadow:0 0 6px rgba(245,166,35,.3)}50%{box-shadow:0 0 16px rgba(245,166,35,.6)}}
.pipe-circle.done{border-color:var(--green,#5dba3b);background:rgba(93,186,59,.12)}
.pipe-label{font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#4d6040)}
.pipe-arrow{font-size:.7rem;color:var(--border,#243019);margin:0 4px 14px;transition:color .4s}
.pipe-arrow.done{color:var(--green,#5dba3b)}
.pipe-count{font-size:10px;color:var(--muted,#4d6040);letter-spacing:.08em}
.pipe-count span{color:var(--green,#5dba3b);font-weight:700}
.engines-grid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;flex:1;overflow:hidden;gap:1px;background:var(--border,#243019)}
.engine-pane{background:var(--bg,#0a0e09);display:flex;flex-direction:column;overflow:hidden;min-height:0}
.engine-hdr{background:var(--surface,#10150e);border-bottom:1px solid var(--border,#243019);padding:7px 12px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.engine-num{font-size:9px;color:var(--muted,#4d6040);margin-right:6px}
.engine-name{font-size:11px;font-weight:600;color:var(--white,#e4edcc);letter-spacing:.03em}
.engine-status{font-size:9px;letter-spacing:.09em;text-transform:uppercase;padding:2px 8px;border-radius:20px}
.es-idle{background:rgba(77,96,64,.15);color:var(--muted,#4d6040);border:1px solid var(--border,#243019)}
.es-run{background:rgba(245,166,35,.12);color:var(--gold,#f5a623);border:1px solid rgba(245,166,35,.3);animation:sp .9s infinite}
@keyframes sp{0%,100%{opacity:1}50%{opacity:.55}}
.es-done{background:rgba(93,186,59,.12);color:#7de053;border:1px solid rgba(93,186,59,.3)}
.es-err{background:rgba(224,92,74,.1);color:#f08070;border:1px solid rgba(224,92,74,.25)}
.engine-body{flex:1;overflow-y:auto;padding:10px 13px;font-size:11px;line-height:1.7;color:var(--text,#c4d0aa);white-space:pre-wrap;word-break:break-word;font-family:var(--mono,'IBM Plex Mono',monospace)}
.engine-placeholder{color:var(--muted,#4d6040);font-style:italic;font-size:10px}
.engine-footer{border-top:1px solid var(--border,#243019);padding:5px 12px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:var(--surface,#10150e)}
.copy-btn{font-family:var(--mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#4d6040);background:transparent;border:1px solid var(--border,#243019);border-radius:3px;padding:2px 8px;cursor:pointer}
.copy-btn:hover{color:var(--gold,#f5a623);border-color:rgba(245,166,35,.3)}
.tok-count{font-size:9px;color:var(--muted,#4d6040)}
/* ── sidebar ── */
.bnca-sidebar{background:var(--surface,#10150e);border-right:1px solid var(--border,#243019);width:240px;display:flex;flex-direction:column;overflow:hidden;flex-shrink:0}
.bnca-main{display:flex;flex:1;overflow:hidden}
.sb-sec{padding:10px;border-bottom:1px solid var(--border,#243019)}
.sb-label{font-size:9px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted,#4d6040);display:block;margin-bottom:7px}
.doc-item{padding:8px 9px;border-radius:5px;border:1px solid transparent;cursor:pointer;margin-bottom:4px;transition:all .15s}
.doc-item:hover{border-color:var(--border,#243019);background:var(--s2,#161c13)}
.doc-item.sel{border-color:rgba(245,166,35,.4);background:rgba(245,166,35,.08)}
.doc-item-name{font-size:11px;font-weight:600;color:var(--gold,#f5a623);margin-bottom:2px}
.doc-item-meta{font-size:9px;color:var(--muted,#4d6040);line-height:1.45}
.sb-cat{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted,#4d6040);display:block;padding:8px 10px 4px}
.sb-status{border-top:1px solid var(--border,#243019);padding:8px 10px;font-size:9px;color:var(--muted,#4d6040)}
.groq-bar{padding:8px 10px;border-bottom:1px solid var(--border,#243019);background:var(--s2,#161c13)}
.groq-lbl{font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#4d6040);display:block;margin-bottom:4px}
.groq-inp{width:100%;background:var(--bg,#0a0e09);border:1px solid var(--border,#243019);color:var(--text,#c4d0aa);font-family:var(--mono);font-size:9px;padding:4px 7px;outline:none;border-radius:3px}
.groq-inp:focus{border-color:rgba(245,166,35,.4)}
.fire-btn{margin:8px 10px;width:calc(100% - 20px);padding:9px;background:var(--gold,#f5a623);color:#0a0e09;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border:none;border-radius:5px;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:6px}
.fire-btn:hover{background:#ffc043}
.fire-btn:disabled{opacity:.45;cursor:default}

/* ── WORKFLOW TABS ── */
#workflow-content-wrap{display:none;flex-direction:column;height:calc(100vh - 84px)}
#workflow-content-wrap.active{display:flex}
.wf-col-header-bar{background:var(--surface,#10150e);border-bottom:1px solid var(--border,#243019);padding:10px 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.wf-title{font-size:11px;font-weight:700;color:var(--gold,#f5a623);letter-spacing:.09em;text-transform:uppercase}
.wf-sub{font-size:9px;color:var(--muted,#4d6040);margin-top:2px}
.wf-time-badge{font-size:9px;color:var(--cyan,#00e8d8);letter-spacing:.06em}
.wf-cols{display:grid;grid-template-columns:1fr 1fr 1fr;flex:1;overflow:hidden;gap:1px;background:var(--border,#243019)}
.wf-col{background:var(--bg,#0a0e09);display:flex;flex-direction:column;overflow:hidden}
.wf-col-hdr{background:var(--s2,#161c13);border-bottom:1px solid var(--border,#243019);padding:8px 13px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.wf-col-title{font-size:10px;font-weight:700;color:var(--white,#e4edcc);letter-spacing:.09em;text-transform:uppercase}
.wf-col-meta{font-size:9px;color:var(--muted,#4d6040)}
.wf-col-body{flex:1;overflow-y:auto;padding:10px 13px}
.wf-task{padding:9px 10px;border:1px solid var(--border,#243019);border-radius:5px;margin-bottom:7px;cursor:pointer;transition:all .15s;position:relative}
.wf-task:hover{border-color:rgba(245,166,35,.3);background:rgba(245,166,35,.04)}
.wf-task.done{opacity:.5;border-color:var(--green,#5dba3b);background:rgba(93,186,59,.06)}
.wf-task.done .wf-task-name{text-decoration:line-through;color:var(--muted,#4d6040)}
.wf-badge{font-size:8px;letter-spacing:.08em;text-transform:uppercase;border:1px solid;padding:1px 5px;display:inline-block;border-radius:2px;margin-bottom:4px}
.wb-p1{border-color:rgba(224,92,74,.5);color:#f08070;background:rgba(224,92,74,.08)}
.wb-p2{border-color:rgba(245,166,35,.4);color:var(--amber,#f5a623)}
.wb-p3{border-color:rgba(0,232,216,.35);color:var(--cyan,#00e8d8)}
.wb-info{border-color:var(--border,#243019);color:var(--muted,#4d6040)}
.wf-task-name{font-size:11px;font-weight:600;color:var(--white,#e4edcc);margin-bottom:2px}
.wf-task-desc{font-size:9px;color:var(--muted,#4d6040);line-height:1.45}
.wf-check{position:absolute;top:9px;right:9px;width:16px;height:16px;border:1px solid var(--border,#243019);border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:10px;color:transparent;transition:all .15s}
.wf-task:hover .wf-check{border-color:var(--gold,#f5a623);color:rgba(245,166,35,.3)}
.wf-task.done .wf-check{background:var(--green,#5dba3b);border-color:var(--green,#5dba3b);color:#0a0e09}
.wf-col-footer{border-top:1px solid var(--border,#243019);padding:6px 13px;background:var(--s2,#161c13);font-size:9px;color:var(--muted,#4d6040);flex-shrink:0;display:flex;justify-content:space-between;align-items:center}
.prog-wrap{height:3px;background:var(--border,#243019);border-radius:2px;margin:3px 0;overflow:hidden}
.prog-bar{height:100%;background:var(--gold,#f5a623);border-radius:2px;transition:width .3s}
.groq-wf-bar{background:var(--s2,#161c13);border-bottom:1px solid var(--border,#243019);padding:8px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}
.gwf-lbl{font-size:9px;color:var(--muted,#4d6040);letter-spacing:.09em;text-transform:uppercase;white-space:nowrap}
.gwf-inp{flex:1;background:var(--bg,#0a0e09);border:1px solid var(--border,#243019);color:var(--text,#c4d0aa);font-family:var(--mono);font-size:9px;padding:4px 7px;outline:none;border-radius:3px;max-width:280px}
.gwf-inp:focus{border-color:rgba(245,166,35,.4)}
.gwf-run-btn{font-family:var(--mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--gold,#f5a623);background:rgba(245,166,35,.1);border:1px solid rgba(245,166,35,.3);padding:4px 12px;cursor:pointer;border-radius:3px;white-space:nowrap}
.gwf-run-btn:hover{background:rgba(245,166,35,.18)}
.gwf-status{font-size:9px;color:var(--muted,#4d6040)}
</style>"""

    # inject CSS before </head>
    html = html.replace('</head>', BNCA_CSS + '\n</head>', 1)

    # ── TAB buttons ──────────────────────────────────────────────────
    # Find the main tab bar — look for a Documents tab or similar
    # We'll inject after the last existing tab button block before </nav> or similar
    # Strategy: inject right before </body> as a floating tab injection via JS
    # Actually safer: inject the tab switcher UI + panels as new sections, wire via JS

    # ── BNCA HTML block ──────────────────────────────────────────────
    BNCA_HTML = """
<!-- ══════════════════════════════════════
     4-ENGINE BNCA DOCUMENT ANALYSIS
════════════════════════════════════════ -->
<div id="bnca-content-wrap">
  <div class="bnca-top-bar">
    <div class="bnca-pipeline">
      <div class="pipe-node"><div class="pipe-circle" id="pc-0">📥</div><div class="pipe-label">Ingest</div></div>
      <div class="pipe-arrow" id="pa-0">›</div>
      <div class="pipe-node"><div class="pipe-circle" id="pc-1">🔍</div><div class="pipe-label">Parse</div></div>
      <div class="pipe-arrow" id="pa-1">›</div>
      <div class="pipe-node"><div class="pipe-circle" id="pc-2">🧠</div><div class="pipe-label">AI Analysis</div></div>
      <div class="pipe-arrow" id="pa-2">›</div>
      <div class="pipe-node"><div class="pipe-circle" id="pc-3">⚡</div><div class="pipe-label">BNCA</div></div>
      <div class="pipe-arrow" id="pa-3">›</div>
      <div class="pipe-node"><div class="pipe-circle" id="pc-4">📋</div><div class="pipe-label">Report</div></div>
    </div>
    <div class="pipe-count"><span id="doneCount">0</span> / 4 engines complete</div>
  </div>
  <div class="bnca-main">
    <!-- sidebar -->
    <div class="bnca-sidebar">
      <div class="groq-bar">
        <span class="groq-lbl">Groq API Key</span>
        <input class="groq-inp" type="password" id="groqKeyBnca" placeholder="gsk_••••••••••••••••••••">
      </div>
      <div class="sb-sec" style="overflow-y:auto;flex:1">
        <span class="sb-cat">Reconciliation</span>
        <div class="doc-item" onclick="selectDoc(this,'bank-recon')"><div class="doc-item-name">Bank Reconciliation Q1</div><div class="doc-item-meta">$48K variance · 3 accounts flagged</div></div>
        <span class="sb-cat">Payables</span>
        <div class="doc-item sel" id="docsel-ap-aging" onclick="selectDoc(this,'ap-aging')"><div class="doc-item-name">AP Aging Report</div><div class="doc-item-meta">$312K outstanding · 22 vendors · 3 on hold</div></div>
        <span class="sb-cat">General Ledger</span>
        <div class="doc-item" onclick="selectDoc(this,'gl-extract')"><div class="doc-item-name">GL Extract Q1</div><div class="doc-item-meta">Revenue $2.4M vs $2.8M · -14.3% variance</div></div>
        <span class="sb-cat">Receivables</span>
        <div class="doc-item" onclick="selectDoc(this,'ar-aging')"><div class="doc-item-name">AR Aging Report</div><div class="doc-item-meta">$198K outstanding · 8 clients 60+ days</div></div>
        <span class="sb-cat">Close Checklist</span>
        <div class="doc-item" onclick="selectDoc(this,'month-end')"><div class="doc-item-name">Month-End Close Checklist</div><div class="doc-item-meta">April 2025 · 70% complete · Payroll pending</div></div>
        <span class="sb-cat">Expense</span>
        <div class="doc-item" onclick="selectDoc(this,'expense')"><div class="doc-item-name">Expense Report — Field Ops</div><div class="doc-item-meta">$8,420 · 3 missing receipts · Policy flag</div></div>
        <span class="sb-cat">Financial Statements</span>
        <div class="doc-item" onclick="selectDoc(this,'income-stmt')"><div class="doc-item-name">Income Statement Q1 2025</div><div class="doc-item-meta">Net income $142K · Gross margin 38%</div></div>
      </div>
      <div class="sb-status" id="sbStatus">✓ AP Aging Report — READY</div>
      <button class="fire-btn" id="fireBncaBtn" onclick="fireAllEngines()">⚡ FIRE ALL 4 ENGINES</button>
    </div>
    <!-- engines grid -->
    <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
      <div class="engines-grid">
        <div class="engine-pane">
          <div class="engine-hdr">
            <div><span class="engine-num">01</span><span class="engine-name">Document Triage &amp; Flag Analysis</span></div>
            <div class="engine-status es-idle" id="es-1">IDLE</div>
          </div>
          <div class="engine-body" id="eo-1"><span class="engine-placeholder">Select a document and fire engines to begin analysis…</span></div>
          <div class="engine-footer"><button class="copy-btn" onclick="copyEngine(1)">COPY</button><span class="tok-count" id="et-1">—</span></div>
        </div>
        <div class="engine-pane">
          <div class="engine-hdr">
            <div><span class="engine-num">02</span><span class="engine-name">Variance &amp; Risk Intelligence</span></div>
            <div class="engine-status es-idle" id="es-2">IDLE</div>
          </div>
          <div class="engine-body" id="eo-2"><span class="engine-placeholder">Waiting for Engine 01…</span></div>
          <div class="engine-footer"><button class="copy-btn" onclick="copyEngine(2)">COPY</button><span class="tok-count" id="et-2">—</span></div>
        </div>
        <div class="engine-pane">
          <div class="engine-hdr">
            <div><span class="engine-num">03</span><span class="engine-name">Controller Action Plan · BNCA</span></div>
            <div class="engine-status es-idle" id="es-3">IDLE</div>
          </div>
          <div class="engine-body" id="eo-3"><span class="engine-placeholder">Waiting for Engine 02…</span></div>
          <div class="engine-footer"><button class="copy-btn" onclick="copyEngine(3)">COPY</button><span class="tok-count" id="et-3">—</span></div>
        </div>
        <div class="engine-pane">
          <div class="engine-hdr">
            <div><span class="engine-num">04</span><span class="engine-name">Executive Summary &amp; Owner Brief</span></div>
            <div class="engine-status es-idle" id="es-4">IDLE</div>
          </div>
          <div class="engine-body" id="eo-4"><span class="engine-placeholder">Waiting for Engine 03…</span></div>
          <div class="engine-footer"><button class="copy-btn" onclick="copyEngine(4)">COPY</button><span class="tok-count" id="et-4">—</span></div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════
     WORKFLOW TABS — MORNING / MIDDAY / EOD
════════════════════════════════════════ -->
<div id="workflow-content-wrap">
  <div class="groq-wf-bar">
    <span class="gwf-lbl">Groq Key</span>
    <input class="gwf-inp" type="password" id="groqKeyWf" placeholder="gsk_••••••••••••••••••••">
    <button class="gwf-run-btn" onclick="runWfAI()">⚡ AI Briefing</button>
    <span class="gwf-status" id="wfAiStatus"></span>
  </div>
  <div class="wf-col-header-bar">
    <div>
      <div class="wf-title">Daily Construction Workflow</div>
      <div class="wf-sub">Click tasks to mark complete · AI briefing updates in real time</div>
    </div>
    <div class="wf-time-badge" id="wfClock"></div>
  </div>
  <div class="wf-cols">
    <!-- MORNING -->
    <div class="wf-col">
      <div class="wf-col-hdr">
        <div class="wf-col-title">🌅 Morning Standup</div>
        <div class="wf-col-meta">Start of day · 6–9 AM</div>
      </div>
      <div class="wf-col-body" id="wf-morning-body">
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p1">P1 · CRITICAL</div><div class="wf-task-name">Review Active Alerts &amp; BNCA</div><div class="wf-task-desc">Pull overnight strategist output. Confirm no critical blockers added since EOD.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p1">P1 · CRITICAL</div><div class="wf-task-name">MEP Inspection Escalation</div><div class="wf-task-desc">RFI-2024-019 is 3 days overdue. Contact J. Patterson &amp; MEP coordinator before 8AM.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p2">P2 · HIGH</div><div class="wf-task-name">Crew Check-In — FieldOps</div><div class="wf-task-desc">Confirm 24-person crew on site. Review 3 pending daily report sign-offs.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p2">P2 · HIGH</div><div class="wf-task-name">Steel Delivery Confirmation</div><div class="wf-task-desc">250 tons arriving today — Gate 2 staging confirmed. Coordinate with R. Kowalski.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p2">P2 · HIGH</div><div class="wf-task-name">Zero Trust: Revoke QB Admin Roles</div><div class="wf-task-desc">J. Martinez + T. Brooks QB Admin roles must be revoked. IT ticket #ZT-204 open.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p3">P3 · MEDIUM</div><div class="wf-task-name">W-9 Request Emails</div><div class="wf-task-desc">Send W-9 requests to BuildRight, Apex Concrete, Sierra Electrical. All exceed $600.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-info">INFO</div><div class="wf-task-name">Morning Doc Review</div><div class="wf-task-desc">Review any new PlanRoom uploads since yesterday. Check for RFI responses.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p3">P3 · MEDIUM</div><div class="wf-task-name">Procurement Status Check</div><div class="wf-task-desc">Check fastener alternative vendor quotes. 3 critical stock items need sourcing.</div><div class="wf-check">✓</div></div>
      </div>
      <div class="wf-col-footer">
        <span id="wf-m-count">0 / 8 complete</span>
        <div style="width:80px"><div class="prog-wrap"><div class="prog-bar" id="wf-m-prog" style="width:0%"></div></div></div>
      </div>
    </div>
    <!-- MIDDAY -->
    <div class="wf-col">
      <div class="wf-col-hdr">
        <div class="wf-col-title">☀️ Midday Check</div>
        <div class="wf-col-meta">Mid-session · 11 AM–2 PM</div>
      </div>
      <div class="wf-col-body" id="wf-midday-body">
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p1">P1 · CRITICAL</div><div class="wf-task-name">Change Order Approvals — $142K</div><div class="wf-task-desc">8 RFIs open, $142K in change orders pending owner signature. Review &amp; approve by 1PM.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p1">P1 · CRITICAL</div><div class="wf-task-name">MEP Contract Renewal</div><div class="wf-task-desc">Meridian MEP contract expired Apr 30 — $31.5K in draws blocked. Send renewal today.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p2">P2 · HIGH</div><div class="wf-task-name">Subcontractor Bid Review</div><div class="wf-task-desc">Roofing &amp; cladding bids due May 20. Pre-review submissions for completeness.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p2">P2 · HIGH</div><div class="wf-task-name">Lien Waiver Follow-Up</div><div class="wf-task-desc">5 waivers = $165.5K blocked. Chase Apex Build Co. (overdue) + Meridian MEP (blocked).</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p2">P2 · HIGH</div><div class="wf-task-name">Run 4-Engine Doc BNCA</div><div class="wf-task-desc">Fire all 4 engines on AP Aging or AR Aging report. Export summary for PM review.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p3">P3 · MEDIUM</div><div class="wf-task-name">PlanRoom RFI Response Check</div><div class="wf-task-desc">2 RFIs blocking Phase 2 framing. Follow up with GC for response ETA.</div><div class="wf-check">✓</div></div>
      </div>
      <div class="wf-col-footer">
        <span id="wf-d-count">0 / 6 complete</span>
        <div style="width:80px"><div class="prog-wrap"><div class="prog-bar" id="wf-d-prog" style="width:0%"></div></div></div>
      </div>
    </div>
    <!-- EOD -->
    <div class="wf-col">
      <div class="wf-col-hdr">
        <div class="wf-col-title">🌆 End of Day Close</div>
        <div class="wf-col-meta">Wrap-up · 4–6 PM</div>
      </div>
      <div class="wf-col-body" id="wf-eod-body">
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p1">P1 · CRITICAL</div><div class="wf-task-name">Builder's Risk Insurance Renewal</div><div class="wf-task-desc">Due May 31 — 19 days. Confirm renewal quote received from Westfield. Forward to owner.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p2">P2 · HIGH</div><div class="wf-task-name">FieldOps Daily Reports Signed</div><div class="wf-task-desc">All 3 supervisor daily reports must be signed off before crew departs site.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p2">P2 · HIGH</div><div class="wf-task-name">Gantt Update — Critical Path</div><div class="wf-task-desc">Log today's steel delivery progress. Update roofing slip (+6d) and MEP slip (+3d).</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p2">P2 · HIGH</div><div class="wf-task-name">Synthesize All → BNCA</div><div class="wf-task-desc">Push all expansion modules to strategist. Run Groq BNCA synthesis for tomorrow's brief.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p3">P3 · MEDIUM</div><div class="wf-task-name">Tax Prep — Deduction Log</div><div class="wf-task-desc">Log today's mileage + any equipment usage for Sec 179 / mileage deduction tracking.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-p3">P3 · MEDIUM</div><div class="wf-task-name">Export Briefing for Owner</div><div class="wf-task-desc">Export manager briefing from strategist. Send EOD summary to project owner by 5:30PM.</div><div class="wf-check">✓</div></div>
        <div class="wf-task" onclick="toggleTask(this)"><div class="wf-badge wb-info">INFO</div><div class="wf-task-name">Set Tomorrow's Priorities</div><div class="wf-task-desc">Review outstanding items. Flag any P1s for morning standup. Update Gantt for next day.</div><div class="wf-check">✓</div></div>
      </div>
      <div class="wf-col-footer">
        <span id="wf-e-count">0 / 7 complete</span>
        <div style="width:80px"><div class="prog-wrap"><div class="prog-bar" id="wf-e-prog" style="width:0%"></div></div></div>
      </div>
    </div>
  </div>
</div>"""

    # ── JAVASCRIPT ────────────────────────────────────────────────────
    BNCA_JS = """
<script id="bnca-4engine-js">
// ════════════════════════════════════════════
// DOCUMENT SHOWCASE — 4-Engine BNCA + Workflow
// Groq-powered, no Anthropic API
// ════════════════════════════════════════════
(function(){

// ── Tab switching ──────────────────────────
const TABS = {
  documents: null,   // original content — handled by existing code
  bnca: document.getElementById('bnca-content-wrap'),
  morning: document.getElementById('workflow-content-wrap'),
  midday:  document.getElementById('workflow-content-wrap'),
  eod:     document.getElementById('workflow-content-wrap'),
};

// Inject tab buttons into existing tabbar or create one
function ensureTabBar() {
  let bar = document.querySelector('.tabbar,.tab-bar,[class*="tabbar"]');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'tsm-tabbar';
    bar.style.cssText = 'background:var(--surface,#10150e);border-bottom:1px solid var(--border,#243019);height:36px;display:flex;align-items:stretch;padding:0 16px;position:sticky;top:0;z-index:90';
    // insert after topnav
    const nav = document.querySelector('.topnav,header,nav');
    if (nav && nav.nextSibling) nav.parentNode.insertBefore(bar, nav.nextSibling);
    else document.body.insertBefore(bar, document.body.firstChild);
  }

  if (document.getElementById('tab-bnca-btn')) return; // already injected

  const tabs = [
    {id:'tab-docs-btn',   label:'📄 DOCUMENTS',  key:'documents'},
    {id:'tab-bnca-btn',   label:'⚡ 4-ENGINE BNCA', key:'bnca'},
    {id:'tab-morning-btn',label:'🌅 MORNING',     key:'morning'},
    {id:'tab-midday-btn', label:'☀️ MIDDAY',      key:'midday'},
    {id:'tab-eod-btn',    label:'🌆 EOD',         key:'eod'},
  ];

  const style = `font-family:var(--mono,'IBM Plex Mono',monospace);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#4d6040);padding:0 14px;cursor:pointer;border:none;background:transparent;border-bottom:2px solid transparent;display:flex;align-items:center;gap:5px;transition:all .15s;white-space:nowrap`;

  tabs.forEach(t => {
    const btn = document.createElement('button');
    btn.id = t.id;
    btn.textContent = t.label;
    btn.setAttribute('style', style);
    btn.onclick = () => switchShowcaseTab(t.key);
    bar.appendChild(btn);
  });
  // add badge spans
  ['morning','midday','eod'].forEach((k,i) => {
    const counts = [8,6,7];
    const btn = document.getElementById('tab-'+k+'-btn');
    if(btn){const sp=document.createElement('span');sp.id='tab-badge-'+k;sp.textContent=counts[i]+' tasks';sp.style.cssText='font-size:8px;background:rgba(245,166,35,.1);color:var(--gold,#f5a623);border:1px solid rgba(245,166,35,.25);padding:1px 5px;border-radius:3px';btn.appendChild(sp);}
  });
}

let currentTab = 'documents';

function switchShowcaseTab(key) {
  currentTab = key;
  // hide BNCA
  const bncaWrap = document.getElementById('bnca-content-wrap');
  const wfWrap   = document.getElementById('workflow-content-wrap');
  if(bncaWrap) bncaWrap.classList.remove('active');
  if(wfWrap)   wfWrap.classList.remove('active');

  // hide/show original doc browse content
  const origContent = document.getElementById('bnca-content-browse') || document.querySelector('main,[class*="main"],[class*="content"],[class*="browse"]');

  if (key === 'documents') {
    if(origContent) origContent.style.display='';
  } else {
    if(origContent) origContent.style.display='none';
    if (key === 'bnca') {
      if(bncaWrap) bncaWrap.classList.add('active');
    } else {
      if(wfWrap) wfWrap.classList.add('active');
    }
  }

  // update tab button active states
  document.querySelectorAll('#tsm-tabbar button,[id$="-btn"][id^="tab-"]').forEach(b => {
    b.style.color='var(--muted,#4d6040)';
    b.style.borderBottomColor='transparent';
  });
  const activeBtn = document.getElementById('tab-'+key+'-btn');
  if(activeBtn){activeBtn.style.color='var(--gold,#f5a623)';activeBtn.style.borderBottomColor='var(--gold,#f5a623)';}
}

// ── Document selection ─────────────────────
const DOC_DATA = {
  'bank-recon': {name:'Bank Reconciliation Q1', context:'Bank reconciliation showing $48K total variance across 3 accounts. Outstanding checks: $31,200. Deposits in transit: $8,400. Unrecorded bank fees: $2,100. NSF check from vendor: $6,300. Accounts flagged: Main Operating, Payroll, Construction Draw.'},
  'ap-aging':   {name:'AP Aging Report', context:'AP Aging showing $312,000 total outstanding across 22 vendors. Current: $142,000. 30-60 days: $89,000. 60-90 days: $54,000. Over 90 days: $27,000. 3 vendors on credit hold. Top payables: PacSteel Inc $84K, Meridian MEP $61K, Apex Build Co $45K. 2 invoices disputed.'},
  'gl-extract': {name:'GL Extract Q1', context:'GL Extract showing Revenue $2.4M vs budget $2.8M (-14.3% variance). COGS $1.49M (62% of revenue vs 58% budgeted). Gross Profit $910K (38% margin). Operating expenses $768K. Net income $142K. Material costs over budget by $112K. Labor under budget by $34K.'},
  'ar-aging':   {name:'AR Aging Report', context:'AR Aging showing $198,000 outstanding across 11 clients. Current: $87,000. 30-60 days: $54,000. 60-90 days: $38,000. Over 90 days: $19,000. 8 clients past 60 days. Westside Holdings $18.4K at 97 days — recommend collections escalation. 2 clients have payment plans.'},
  'month-end':  {name:'Month-End Close Checklist', context:'April 2025 month-end close 70% complete. Completed: bank rec, AR reconciliation, fixed asset depreciation. Pending: payroll accruals ($34K), AP cutoff review, intercompany eliminations, management report. Target close date: May 10. Blockers: payroll data not yet received from ADP.'},
  'expense':    {name:'Expense Report — Field Ops', context:'Field Operations expense report total $8,420. 3 receipts missing (fuel $340, materials $890, equipment rental $1,200). 2 expenses flagged for policy violations: meal expense over $75 limit ($124), personal mileage claimed. Manager approval pending. Reimbursement hold on $2,430 until receipts provided.'},
  'income-stmt':{name:'Income Statement Q1 2025', context:'Income Statement Q1 2025: Revenue $2.4M. Cost of Revenue $1.49M. Gross Profit $910K (38% margin). SG&A $520K. Depreciation $48K. EBITDA $390K. Interest expense $28K. Net income before tax $214K. Tax provision $72K. Net income $142K. YoY revenue down 8.2%.'},
};

let selectedDoc = 'ap-aging';

window.selectDoc = function(el, key) {
  document.querySelectorAll('.doc-item').forEach(d => d.classList.remove('sel'));
  el.classList.add('sel');
  selectedDoc = key;
  const d = DOC_DATA[key];
  document.getElementById('sbStatus').textContent = '✓ ' + d.name + ' — READY';
  // reset engines
  resetEngines();
};

// ── Engine state ───────────────────────────
let enginesDone = 0;
let enginesRunning = false;

function resetEngines() {
  enginesDone = 0;
  document.getElementById('doneCount').textContent = '0';
  for (let i=1;i<=4;i++){
    const s=document.getElementById('es-'+i);
    const o=document.getElementById('eo-'+i);
    const t=document.getElementById('et-'+i);
    if(s){s.className='engine-status es-idle';s.textContent='IDLE';}
    if(o){o.innerHTML='<span class="engine-placeholder">'+(i===1?'Select a document and fire engines…':'Waiting for Engine 0'+(i-1)+'…')+'</span>';}
    if(t) t.textContent='—';
  }
  [0,1,2,3,4].forEach(i=>{
    const c=document.getElementById('pc-'+i); if(c) c.className='pipe-circle';
    const a=document.getElementById('pa-'+i); if(a) a.className='pipe-arrow';
  });
}

window.fireAllEngines = async function() {
  const key = document.getElementById('groqKeyBnca').value.trim();
  if (!key) { alert('Enter your Groq API key first'); return; }
  if (enginesRunning) return;
  enginesRunning = true;
  enginesDone = 0;
  const btn = document.getElementById('fireBncaBtn');
  btn.disabled = true;

  const doc = DOC_DATA[selectedDoc];
  const ctx = doc.context;

  const ENGINES = [
    {
      id:1, name:'Triage',
      system:'You are a construction finance document triage specialist. Identify all flags, anomalies, missing items, and risk indicators in the document. Be specific with numbers. Format with clear sections.',
      prompt:`Document: ${doc.name}\n\nData:\n${ctx}\n\nProvide a complete triage analysis: list every flag, anomaly, missing item, and risk indicator with specific amounts and descriptions.`
    },
    {
      id:2, name:'Variance',
      system:'You are a construction finance variance and risk analyst. Analyze variances, calculate risk exposure, and identify root causes. Be quantitative.',
      prompt:`Document: ${doc.name}\n\nData:\n${ctx}\n\nProvide variance analysis: calculate all variances ($ and %), assess risk exposure, identify root causes, and rank risks by severity.`
    },
    {
      id:3, name:'BNCA',
      system:'You are a construction controller creating a BNCA (Bottom-Line Construction Analysis). Provide specific, actionable steps with deadlines and owners. No fluff.',
      prompt:`Document: ${doc.name}\n\nData:\n${ctx}\n\nCreate a Controller Action Plan with 5-7 specific action items. Each item: what to do, who owns it, deadline, and financial impact.`
    },
    {
      id:4, name:'Executive',
      system:'You are a construction finance executive briefing writer. Write concise, direct executive summaries for project owners. 3-5 sentences max per section.',
      prompt:`Document: ${doc.name}\n\nData:\n${ctx}\n\nWrite an Executive Summary with: (1) Bottom Line, (2) Key Risks, (3) Required Decisions, (4) Next Steps. Keep each section to 2-3 sentences.`
    }
  ];

  pipeActivate(0);
  for (let i = 0; i < ENGINES.length; i++) {
    const eng = ENGINES[i];
    pipeActivate(i+1);
    setEngineStatus(eng.id, 'run', 'RUNNING');
    const ok = await streamEngine(eng, key);
    if (ok) {
      setEngineStatus(eng.id, 'done', 'DONE');
      pipeDone(i);
      enginesDone++;
      document.getElementById('doneCount').textContent = enginesDone;
    } else {
      setEngineStatus(eng.id, 'err', 'ERROR');
    }
  }
  pipeDone(4);
  btn.disabled = false;
  enginesRunning = false;
};

async function streamEngine(eng, key) {
  const el = document.getElementById('eo-'+eng.id);
  const tokEl = document.getElementById('et-'+eng.id);
  el.textContent = '';
  let full = '';
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body: JSON.stringify({
        model:'openai/gpt-oss-120b',
        max_tokens:800,
        temperature:0.35,
        stream:true,
        messages:[
          {role:'system', content:eng.system},
          {role:'user',   content:eng.prompt}
        ]
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({error:{message:res.statusText}}));
      el.textContent = '[Groq Error ' + res.status + '] ' + (err.error?.message || res.statusText);
      return false;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      const chunk = dec.decode(value);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content || '';
          full += delta;
          el.textContent = full + '▌';
        } catch {}
      }
    }
    el.textContent = full;
    const words = full.split(/\s+/).length;
    if(tokEl) tokEl.textContent = '~' + words + ' words';
    return true;
  } catch(e) {
    el.textContent = '[Network Error] ' + e.message;
    return false;
  }
}

function setEngineStatus(id, cls, label) {
  const el = document.getElementById('es-'+id);
  if (el) { el.className = 'engine-status es-'+cls; el.textContent = label; }
}

function pipeActivate(i) {
  const el = document.getElementById('pc-'+i);
  if (el) el.className = 'pipe-circle active';
}
function pipeDone(i) {
  const el = document.getElementById('pc-'+i);
  if (el) el.className = 'pipe-circle done';
  if (i > 0) { const a = document.getElementById('pa-'+(i-1)); if(a) a.className='pipe-arrow done'; }
}

window.copyEngine = function(id) {
  const text = document.getElementById('eo-'+id)?.textContent;
  if (text) navigator.clipboard.writeText(text).then(()=>{
    const btn = document.querySelector(`[onclick="copyEngine(${id})"]`);
    if(btn){btn.textContent='COPIED';setTimeout(()=>btn.textContent='COPY',1500);}
  });
};

// ── Workflow tasks ─────────────────────────
window.toggleTask = function(el) {
  el.classList.toggle('done');
  updateWfProgress();
};

function updateWfProgress() {
  const cols = [
    {bodyId:'wf-morning-body', countId:'wf-m-count', progId:'wf-m-prog', total:8,  tabKey:'morning'},
    {bodyId:'wf-midday-body',  countId:'wf-d-count', progId:'wf-d-prog', total:6,  tabKey:'midday'},
    {bodyId:'wf-eod-body',     countId:'wf-e-count', progId:'wf-e-prog', total:7,  tabKey:'eod'},
  ];
  cols.forEach(col => {
    const body = document.getElementById(col.bodyId);
    if (!body) return;
    const done = body.querySelectorAll('.wf-task.done').length;
    const total = body.querySelectorAll('.wf-task').length;
    const pct = total ? Math.round(done/total*100) : 0;
    const countEl = document.getElementById(col.countId);
    const progEl  = document.getElementById(col.progId);
    if(countEl) countEl.textContent = done + ' / ' + total + ' complete';
    if(progEl)  progEl.style.width  = pct + '%';
    // update badge
    const badge = document.getElementById('tab-badge-'+col.tabKey);
    if(badge) badge.textContent = (total-done) + ' tasks';
  });
}

// ── Workflow AI briefing ───────────────────
window.runWfAI = async function() {
  const key = document.getElementById('groqKeyWf').value.trim();
  const stat = document.getElementById('wfAiStatus');
  if (!key) { stat.textContent = '⚠ Enter Groq key'; return; }
  stat.textContent = '⟳ Generating…';
  const colIds = ['wf-morning-body','wf-midday-body','wf-eod-body'];
  const labels = ['Morning','Midday','EOD'];
  let summary = '';
  colIds.forEach((id,i) => {
    const body = document.getElementById(id);
    if(!body) return;
    const tasks = [...body.querySelectorAll('.wf-task')].map(t => {
      const name = t.querySelector('.wf-task-name')?.textContent || '';
      const done = t.classList.contains('done');
      return (done?'[DONE] ':'[OPEN] ') + name;
    }).join(', ');
    summary += labels[i] + ': ' + tasks + '\n';
  });

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({
        model:'openai/gpt-oss-120b', max_tokens:400, temperature:0.4,
        messages:[
          {role:'system', content:'You are a construction project AI assistant. Summarize the day\'s workflow status in 3 bullet points. Be direct and specific.'},
          {role:'user', content:'Current workflow status:\n' + summary + '\n\nGive a 3-bullet EOD briefing: (1) what got done, (2) what\'s still open and risky, (3) top priority for tomorrow.'}
        ]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || data.choices?.[0]?.message?.content || 'No response';
    stat.textContent = text.substring(0,80) + (text.length>80?'…':'');
  } catch(e) {
    stat.textContent = '[Error] ' + e.message;
  }
};

// ── Clock ──────────────────────────────────
function updateClock() {
  const el = document.getElementById('wfClock');
  if (el) el.textContent = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
setInterval(updateClock, 1000); updateClock();

// ── Init ───────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  ensureTabBar();
  // wrap existing browse content so we can hide/show it
  const main = document.querySelector('main') || document.querySelector('[class*="main"]');
  if (main && !main.id) main.id = 'bnca-content-browse';
  resetEngines();
  updateWfProgress();
});

// also run immediately in case DOM already loaded
if (document.readyState !== 'loading') {
  ensureTabBar();
  const main = document.querySelector('main');
  if (main && !main.id) main.id = 'bnca-content-browse';
  resetEngines();
  updateWfProgress();
}

})();
</script>"""

    # Inject BNCA HTML + JS before </body>
    html = html.replace('</body>', BNCA_HTML + '\n' + BNCA_JS + '\n</body>', 1)
    showcase.write_text(html)
    print('✅ document-showcase.html patched — 4-engine BNCA + Morning/Midday/EOD tabs injected')


# ══════════════════════════════════════════════════════════════════════
# 2. TAX.HTML — Sales Tax Filing panel
# ══════════════════════════════════════════════════════════════════════
tax = pathlib.Path('html/finops-suite/tax.html')
html2 = tax.read_text()

if 'panel-salestax' in html2:
    print('INFO: tax.html already has Sales Tax Filing — skipping')
else:
    OLD_TAB = '<div class="nav-tab" onclick="showTab(\'how\',this)"><span class="nav-tab-icon">📖</span>HOW TO USE</div>'
    NEW_TAB = OLD_TAB + '\n  <div class="nav-tab" onclick="showTab(\'salestax\',this)"><span class="nav-tab-icon">🏛️</span>SALES TAX FILING</div>'
    html2 = html2.replace(OLD_TAB, NEW_TAB, 1)

    SALES_TAX_PANEL = """
<div class="panel" id="panel-salestax">
<div style="display:grid;grid-template-columns:240px 1fr 220px;min-height:calc(100vh - 84px)">

<!-- LEFT: Jurisdiction Manager -->
<div style="background:var(--surface);border-right:1px solid var(--border);padding:16px;overflow-y:auto">
  <div style="color:var(--amber);font-size:10px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:12px;font-family:var(--mono)">JURISDICTION MANAGER</div>
  <div style="margin-bottom:10px"><div style="font-size:9px;color:var(--text2);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;font-family:var(--mono)">State</div>
  <select style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:11px;padding:6px 8px;outline:none"><option>Arizona</option><option>California</option><option>Texas</option><option>Nevada</option></select></div>
  <div style="margin-bottom:10px"><div style="font-size:9px;color:var(--text2);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;font-family:var(--mono)">County / City</div>
  <select style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:11px;padding:6px 8px;outline:none"><option>Maricopa County</option><option>City of Phoenix</option><option>Scottsdale</option><option>Tempe</option></select></div>
  <div style="margin-bottom:10px"><div style="font-size:9px;color:var(--text2);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;font-family:var(--mono)">Filing Frequency</div>
  <select style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:11px;padding:6px 8px;outline:none"><option>Monthly</option><option>Quarterly</option><option>Annual</option></select></div>
  <div style="margin-bottom:14px"><div style="font-size:9px;color:var(--text2);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;font-family:var(--mono)">Portal / Account ID</div>
  <input type="text" placeholder="AZ TPT acct #" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:11px;padding:6px 8px;outline:none;box-sizing:border-box"></div>
  <button onclick="alert('Jurisdiction added')" style="width:100%;background:var(--amber);border:none;color:#000;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:9px;cursor:pointer;margin-bottom:14px">+ ADD JURISDICTION</button>
  <div style="border-top:1px solid var(--border);padding-top:12px">
    <div style="font-size:9px;color:var(--text2);letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px;font-family:var(--mono)">ACTIVE JURISDICTIONS</div>
    <div style="padding:7px 0;border-bottom:1px solid var(--border);font-size:11px;display:flex;justify-content:space-between;align-items:center"><div><div style="color:var(--text)">Arizona State</div><div style="color:var(--text2);font-size:9px">Monthly · AZ TPT</div></div><span style="background:rgba(245,166,35,.1);border:1px solid rgba(245,166,35,.3);color:var(--amber);font-size:9px;padding:2px 6px">DUE 20th</span></div>
    <div style="padding:7px 0;border-bottom:1px solid var(--border);font-size:11px;display:flex;justify-content:space-between;align-items:center"><div><div style="color:var(--text)">Maricopa County</div><div style="color:var(--text2);font-size:9px">Monthly · County TPT</div></div><span style="background:rgba(245,166,35,.1);border:1px solid rgba(245,166,35,.3);color:var(--amber);font-size:9px;padding:2px 6px">DUE 20th</span></div>
    <div style="padding:7px 0;font-size:11px;display:flex;justify-content:space-between;align-items:center"><div><div style="color:var(--text)">City of Phoenix</div><div style="color:var(--text2);font-size:9px">Monthly</div></div><span style="background:rgba(0,200,100,.08);border:1px solid rgba(0,200,100,.25);color:#00c864;font-size:9px;padding:2px 6px">FILED</span></div>
  </div>
</div>

<!-- CENTER: Filing Dashboard -->
<div style="padding:20px;overflow-y:auto">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div><div style="color:var(--amber);font-size:15px;font-weight:700;font-family:var(--mono)">SALES TAX FILING DASHBOARD</div>
    <div style="color:var(--text2);font-size:11px;margin-top:2px">Period: May 2026 · Due: June 20, 2026</div></div>
    <div style="display:flex;gap:8px">
      <button onclick="alert('Auto-calc complete — $98,270 due')" style="background:var(--amber);border:none;color:#000;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:7px 14px;cursor:pointer">⚡ AUTO-CALC</button>
      <button onclick="alert('Report exported')" style="background:transparent;border:1px solid var(--border);color:var(--text2);font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;padding:7px 12px;cursor:pointer">↓ EXPORT</button>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
    <div style="background:var(--surface);border:1px solid var(--border);padding:12px"><div style="color:var(--text2);font-size:9px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;font-family:var(--mono)">TOTAL SALES</div><div style="color:var(--amber);font-size:20px;font-weight:700;font-family:var(--mono)">$1,241,880</div></div>
    <div style="background:var(--surface);border:1px solid var(--border);padding:12px"><div style="color:var(--text2);font-size:9px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;font-family:var(--mono)">TAXABLE SALES</div><div style="color:var(--amber);font-size:20px;font-weight:700;font-family:var(--mono)">$1,198,420</div></div>
    <div style="background:var(--surface);border:1px solid var(--border);padding:12px"><div style="color:var(--text2);font-size:9px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;font-family:var(--mono)">TAX COLLECTED</div><div style="color:var(--amber);font-size:20px;font-weight:700;font-family:var(--mono)">$98,270</div></div>
    <div style="background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.4);padding:12px"><div style="color:var(--amber);font-size:9px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;font-family:var(--mono)">AMOUNT DUE</div><div style="color:var(--amber);font-size:20px;font-weight:700;font-family:var(--mono)">$98,270</div><div style="color:var(--amber);font-size:9px;margin-top:3px">Due Jun 20, 2026</div></div>
  </div>
  <div style="margin-bottom:14px"><div style="color:var(--text2);font-size:10px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px;font-family:var(--mono)">STORE-BY-STORE BREAKDOWN</div>
  <table style="width:100%;border-collapse:collapse;font-size:11px;font-family:var(--mono)">
    <thead><tr style="background:var(--surface);color:var(--text2);font-size:9px;text-transform:uppercase;letter-spacing:.08em"><th style="text-align:left;padding:7px 10px;border-bottom:1px solid var(--border)">STORE</th><th style="text-align:right;padding:7px 10px;border-bottom:1px solid var(--border)">TOTAL SALES</th><th style="text-align:right;padding:7px 10px;border-bottom:1px solid var(--border)">TAXABLE</th><th style="text-align:right;padding:7px 10px;border-bottom:1px solid var(--border)">RATE</th><th style="text-align:right;padding:7px 10px;border-bottom:1px solid var(--border)">TAX DUE</th><th style="text-align:center;padding:7px 10px;border-bottom:1px solid var(--border)">STATUS</th></tr></thead>
    <tbody>
      <tr style="border-bottom:1px solid rgba(255,255,255,.04)"><td style="padding:8px 10px;color:var(--text)">BK #1042 — Downtown</td><td style="padding:8px 10px;text-align:right">$342,100</td><td style="padding:8px 10px;text-align:right">$330,200</td><td style="padding:8px 10px;text-align:right;color:var(--text2)">8.3%</td><td style="padding:8px 10px;text-align:right;color:var(--amber)">$27,407</td><td style="padding:8px 10px;text-align:center"><span style="background:rgba(245,166,35,.1);border:1px solid rgba(245,166,35,.3);color:var(--amber);font-size:9px;padding:2px 7px">PENDING</span></td></tr>
      <tr style="border-bottom:1px solid rgba(255,255,255,.04)"><td style="padding:8px 10px;color:var(--text)">BK #1087 — Westside</td><td style="padding:8px 10px;text-align:right">$318,440</td><td style="padding:8px 10px;text-align:right">$307,900</td><td style="padding:8px 10px;text-align:right;color:var(--text2)">8.1%</td><td style="padding:8px 10px;text-align:right;color:var(--amber)">$24,940</td><td style="padding:8px 10px;text-align:center"><span style="background:rgba(245,166,35,.1);border:1px solid rgba(245,166,35,.3);color:var(--amber);font-size:9px;padding:2px 7px">PENDING</span></td></tr>
      <tr style="border-bottom:1px solid rgba(255,255,255,.04)"><td style="padding:8px 10px;color:var(--text)">BK #1103 — Airport</td><td style="padding:8px 10px;text-align:right">$298,640</td><td style="padding:8px 10px;text-align:right">$288,200</td><td style="padding:8px 10px;text-align:right;color:var(--text2)">8.5%</td><td style="padding:8px 10px;text-align:right;color:var(--amber)">$24,497</td><td style="padding:8px 10px;text-align:center"><span style="background:rgba(0,200,100,.08);border:1px solid rgba(0,200,100,.25);color:#00c864;font-size:9px;padding:2px 7px">FILED</span></td></tr>
      <tr><td style="padding:8px 10px;color:var(--text)">BK #1221 — Eastgate</td><td style="padding:8px 10px;text-align:right">$282,700</td><td style="padding:8px 10px;text-align:right">$272,120</td><td style="padding:8px 10px;text-align:right;color:var(--text2)">7.8%</td><td style="padding:8px 10px;text-align:right;color:var(--amber)">$21,225</td><td style="padding:8px 10px;text-align:center"><span style="background:rgba(245,166,35,.1);border:1px solid rgba(245,166,35,.3);color:var(--amber);font-size:9px;padding:2px 7px">PENDING</span></td></tr>
    </tbody>
  </table></div>
  <div style="background:var(--surface);border:1px solid var(--border);padding:14px">
    <div style="color:var(--text2);font-size:10px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;font-family:var(--mono)">FILING UPLOAD CENTER</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div><div style="font-size:9px;color:var(--text2);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;font-family:var(--mono)">Jurisdiction</div><select style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:11px;padding:6px 8px;outline:none"><option>Arizona State (AZ TPT)</option><option>Maricopa County</option><option>City of Phoenix</option></select></div>
      <div><div style="font-size:9px;color:var(--text2);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;font-family:var(--mono)">Period</div><input type="month" value="2026-05" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:11px;padding:5px 8px;outline:none;box-sizing:border-box"></div>
    </div>
    <div style="border:1px dashed rgba(245,166,35,.25);padding:14px;text-align:center;cursor:pointer;margin-bottom:10px" onclick="document.getElementById('st-file').click()">
      <input type="file" id="st-file" accept=".pdf,.csv,.xlsx" style="display:none" onchange="alert('Confirmation uploaded: '+this.files[0].name)">
      <div style="color:var(--amber);font-size:18px;margin-bottom:4px">↑</div>
      <div style="color:var(--text2);font-size:11px;font-family:var(--mono)">Upload filing confirmation · PDF / CSV / XLSX</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;font-family:var(--mono)">
      <thead><tr style="background:rgba(255,255,255,.03);color:var(--text2);font-size:9px;text-transform:uppercase;letter-spacing:.08em"><th style="text-align:left;padding:6px 8px">JURISDICTION</th><th style="text-align:left;padding:6px 8px">PERIOD</th><th style="text-align:right;padding:6px 8px">AMOUNT</th><th style="text-align:center;padding:6px 8px">FILED</th><th style="text-align:center;padding:6px 8px">CONFIRMATION</th></tr></thead>
      <tbody>
        <tr style="border-bottom:1px solid rgba(255,255,255,.04)"><td style="padding:7px 8px;color:var(--text)">City of Phoenix</td><td style="padding:7px 8px;color:var(--text2)">Apr 2026</td><td style="padding:7px 8px;text-align:right;color:var(--amber)">$8,240</td><td style="padding:7px 8px;text-align:center;color:#00c864">May 19</td><td style="padding:7px 8px;text-align:center"><span style="color:#00c864;font-size:10px">📎 PHX-2026-04</span></td></tr>
        <tr><td style="padding:7px 8px;color:var(--text)">Arizona State</td><td style="padding:7px 8px;color:var(--text2)">Apr 2026</td><td style="padding:7px 8px;text-align:right;color:var(--amber)">$71,890</td><td style="padding:7px 8px;text-align:center;color:var(--amber)">Pending</td><td style="padding:7px 8px;text-align:center;color:var(--text2);font-size:9px">—</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- RIGHT: Calendar -->
<div style="background:var(--surface);border-left:1px solid var(--border);padding:16px;overflow-y:auto">
  <div style="color:var(--amber);font-size:10px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:12px;font-family:var(--mono)">FILING CALENDAR</div>
  <div style="font-size:9px;color:var(--text2);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;font-family:var(--mono);border-bottom:1px solid var(--border);padding-bottom:4px">JUNE 2026</div>
  <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)"><div style="width:28px;height:28px;background:rgba(245,166,35,.15);border:1px solid rgba(245,166,35,.4);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--amber);flex-shrink:0">20</div><div style="font-size:10px"><div style="color:var(--text)">AZ TPT — May Period</div><div style="color:var(--text2);font-size:9px">$71,890 due</div></div></div>
  <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)"><div style="width:28px;height:28px;background:rgba(245,166,35,.15);border:1px solid rgba(245,166,35,.4);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--amber);flex-shrink:0">20</div><div style="font-size:10px"><div style="color:var(--text)">Maricopa County</div><div style="color:var(--text2);font-size:9px">County TPT — May</div></div></div>
  <div style="display:flex;align-items:center;gap:8px;padding:7px 0"><div style="width:28px;height:28px;background:rgba(255,92,92,.12);border:1px solid rgba(255,92,92,.4);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#ff5c5c;flex-shrink:0">30</div><div style="font-size:10px"><div style="color:var(--text)">NV State Sales Tax</div><div style="color:var(--text2);font-size:9px">Q2 filing deadline</div></div></div>
  <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">
    <div style="font-size:9px;color:var(--text2);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;font-family:var(--mono)">AUTO-REMINDERS</div>
    <div style="font-size:10px;color:var(--text2);line-height:2.2">
      <div style="display:flex;justify-content:space-between"><span>30-day warning</span><span style="color:#00c864">✓ ON</span></div>
      <div style="display:flex;justify-content:space-between"><span>14-day warning</span><span style="color:#00c864">✓ ON</span></div>
      <div style="display:flex;justify-content:space-between"><span>7-day warning</span><span style="color:#00c864">✓ ON</span></div>
      <div style="display:flex;justify-content:space-between"><span>Day-of alert</span><span style="color:#00c864">✓ ON</span></div>
    </div>
  </div>
</div>

</div>
</div>"""

    html2 = html2.replace('</body>', SALES_TAX_PANEL + '\n</body>', 1)
    tax.write_text(html2)
    print('✅ tax.html patched — Sales Tax Filing panel added')


# ══════════════════════════════════════════════════════════════════════
# 3. FINOPS-ACCOUNTING.HTML — Intercompany + Fixed Assets
# ══════════════════════════════════════════════════════════════════════
acct = pathlib.Path('html/finops-suite/finops-accounting.html')
html3 = acct.read_text()

if 'interco' in html3:
    print('INFO: finops-accounting.html already has Intercompany — skipping')
else:
    OLD_BTN = "<button class=\"doc-tab\" onclick=\"setDoc('close',this)\">Month-End Close</button>"
    NEW_BTN = OLD_BTN + "\n      <button class=\"doc-tab\" onclick=\"setDoc('interco',this)\">Intercompany</button>\n      <button class=\"doc-tab\" onclick=\"setDoc('fixedassets',this)\">Fixed Assets</button>"
    html3 = html3.replace(OLD_BTN, NEW_BTN, 1)

    ACCT_JS = """
<script id="acct-extra-tabs">
(function(){
  const _orig = window.setDoc;
  const EXTRA = {
    interco: `<div style="padding:12px">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
  <div style="color:var(--amber);font-size:11px;font-weight:700;letter-spacing:.06em;font-family:var(--mono)">INTERCOMPANY MATRIX — DUE TO / DUE FROM</div>
  <div style="display:flex;gap:6px">
    <button onclick="alert('Auto-match: 8/9 pairs matched')" style="background:var(--amber);border:none;color:#000;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.1em;padding:5px 12px;cursor:pointer">⚡ AUTO-MATCH</button>
    <button onclick="alert('AJE generated')" style="background:transparent;border:1px solid var(--amber);color:var(--amber);font-family:var(--mono);font-size:9px;padding:5px 12px;cursor:pointer">+ GEN AJE</button>
  </div>
</div>
<div style="overflow-x:auto;margin-bottom:14px">
<table style="width:100%;border-collapse:collapse;font-size:10px;font-family:var(--mono)">
  <thead><tr style="background:var(--surface2)">
    <th style="text-align:left;padding:7px 10px;border:1px solid var(--border);color:var(--text-mute);font-size:9px">FROM / TO</th>
    <th style="padding:7px 10px;border:1px solid var(--border);color:var(--amber);font-size:9px;text-align:center">BK #1042</th>
    <th style="padding:7px 10px;border:1px solid var(--border);color:var(--amber);font-size:9px;text-align:center">BK #1087</th>
    <th style="padding:7px 10px;border:1px solid var(--border);color:var(--amber);font-size:9px;text-align:center">BK #1103</th>
    <th style="padding:7px 10px;border:1px solid var(--border);color:var(--amber);font-size:9px;text-align:center">HoldCo</th>
    <th style="padding:7px 10px;border:1px solid var(--border);color:var(--text-mute);font-size:9px;text-align:center">NET</th>
  </tr></thead>
  <tbody>
    <tr><td style="padding:7px 10px;border:1px solid var(--border);color:var(--amber);font-weight:700">BK #1042</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center;color:var(--text-mute)">—</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center">(12,400)</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center">8,200</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center">(45,000)</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center;color:#ff5c5c;font-weight:700">(49,200)</td></tr>
    <tr style="background:rgba(255,255,255,.02)"><td style="padding:7px 10px;border:1px solid var(--border);color:var(--amber);font-weight:700">BK #1087</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center">12,400</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center;color:var(--text-mute)">—</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center;color:var(--text-mute)">—</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center">(45,000)</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center;color:#ff5c5c;font-weight:700">(32,600)</td></tr>
    <tr><td style="padding:7px 10px;border:1px solid var(--border);color:var(--amber);font-weight:700">HoldCo</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center">45,000</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center">45,000</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center">45,000</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center;color:var(--text-mute)">—</td><td style="padding:7px 10px;border:1px solid var(--border);text-align:center;color:#00c864;font-weight:700">135,000</td></tr>
  </tbody>
</table></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
  <div style="background:rgba(255,92,92,.06);border:1px solid rgba(255,92,92,.25);border-left:3px solid #ff5c5c;padding:10px"><div style="color:#ff5c5c;font-size:9px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px;font-family:var(--mono)">OUT OF BALANCE</div><div style="color:#ff5c5c;font-size:18px;font-weight:700;font-family:var(--mono)">$3,200</div><div style="color:var(--text-mute);font-size:9px;margin-top:2px">BK #1042 vs BK #1103 timing diff</div></div>
  <div style="background:rgba(0,200,100,.05);border:1px solid rgba(0,200,100,.2);border-left:3px solid #00c864;padding:10px"><div style="color:#00c864;font-size:9px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px;font-family:var(--mono)">MATCHED PAIRS</div><div style="color:#00c864;font-size:18px;font-weight:700;font-family:var(--mono)">8 / 9</div><div style="color:var(--text-mute);font-size:9px;margin-top:2px">1 pair needs adjusting entry</div></div>
</div>
<div style="background:var(--surface2);border:1px solid var(--border);padding:12px">
  <div style="color:var(--amber);font-size:9px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px;font-family:var(--mono)">ADJUSTING JOURNAL ENTRY</div>
  <table style="width:100%;border-collapse:collapse;font-size:10px;font-family:var(--mono)">
    <thead><tr style="color:var(--text-mute);font-size:9px;text-transform:uppercase;letter-spacing:.08em"><th style="text-align:left;padding:5px 8px">ACCOUNT</th><th style="text-align:left;padding:5px 8px">ENTITY</th><th style="text-align:right;padding:5px 8px">DEBIT</th><th style="text-align:right;padding:5px 8px">CREDIT</th></tr></thead>
    <tbody>
      <tr style="border-bottom:1px solid rgba(255,255,255,.04)"><td style="padding:6px 8px">Due From — BK #1042</td><td style="padding:6px 8px;color:var(--text-mute)">BK #1103</td><td style="padding:6px 8px;text-align:right">3,200</td><td style="padding:6px 8px;text-align:right;color:var(--text-mute)">—</td></tr>
      <tr><td style="padding:6px 8px">Due To — BK #1103</td><td style="padding:6px 8px;color:var(--text-mute)">BK #1042</td><td style="padding:6px 8px;text-align:right;color:var(--text-mute)">—</td><td style="padding:6px 8px;text-align:right">3,200</td></tr>
    </tbody>
  </table>
  <button onclick="alert('AJE posted to GL')" style="margin-top:8px;background:var(--amber);border:none;color:#000;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.1em;padding:7px 18px;cursor:pointer">POST ADJUSTING ENTRY</button>
</div></div>`,

    fixedassets: `<div style="padding:12px">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
  <div style="color:var(--amber);font-size:11px;font-weight:700;letter-spacing:.06em;font-family:var(--mono)">FIXED ASSET ROSTER</div>
  <div style="display:flex;gap:6px">
    <button onclick="alert('Add asset — coming soon')" style="background:var(--amber);border:none;color:#000;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.1em;padding:5px 12px;cursor:pointer">+ ADD ASSET</button>
    <button onclick="alert('Depreciation this month: $15,610')" style="background:transparent;border:1px solid var(--amber);color:var(--amber);font-family:var(--mono);font-size:9px;padding:5px 12px;cursor:pointer">⚡ RUN DEPRECIATION</button>
    <button onclick="alert('Roster exported')" style="background:transparent;border:1px solid var(--border);color:var(--text-mute);font-family:var(--mono);font-size:9px;padding:5px 12px;cursor:pointer">↓ EXPORT</button>
  </div>
</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">
  <div style="background:var(--surface2);border:1px solid var(--border);padding:10px"><div style="color:var(--text-mute);font-size:9px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;font-family:var(--mono)">TOTAL COST BASIS</div><div style="color:var(--amber);font-size:17px;font-weight:700;font-family:var(--mono)">$2,847,400</div></div>
  <div style="background:var(--surface2);border:1px solid var(--border);padding:10px"><div style="color:var(--text-mute);font-size:9px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;font-family:var(--mono)">ACCUM. DEPRECIATION</div><div style="color:var(--amber);font-size:17px;font-weight:700;font-family:var(--mono)">(1,124,800)</div></div>
  <div style="background:var(--surface2);border:1px solid var(--border);padding:10px"><div style="color:var(--text-mute);font-size:9px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;font-family:var(--mono)">NET BOOK VALUE</div><div style="color:var(--amber);font-size:17px;font-weight:700;font-family:var(--mono)">$1,722,600</div></div>
  <div style="background:var(--surface2);border:1px solid var(--border);padding:10px"><div style="color:var(--text-mute);font-size:9px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;font-family:var(--mono)">YR DEPRECIATION</div><div style="color:var(--amber);font-size:17px;font-weight:700;font-family:var(--mono)">$187,320</div></div>
</div>
<table style="width:100%;border-collapse:collapse;font-size:10px;font-family:var(--mono);margin-bottom:14px">
  <thead><tr style="background:var(--surface2);color:var(--text-mute);font-size:9px;text-transform:uppercase;letter-spacing:.08em">
    <th style="text-align:left;padding:7px 8px;border-bottom:1px solid var(--border)">ASSET</th><th style="text-align:left;padding:7px 8px;border-bottom:1px solid var(--border)">ENTITY</th><th style="text-align:left;padding:7px 8px;border-bottom:1px solid var(--border)">TYPE</th><th style="text-align:left;padding:7px 8px;border-bottom:1px solid var(--border)">METHOD</th><th style="text-align:left;padding:7px 8px;border-bottom:1px solid var(--border)">LIFE</th><th style="text-align:right;padding:7px 8px;border-bottom:1px solid var(--border)">COST</th><th style="text-align:right;padding:7px 8px;border-bottom:1px solid var(--border)">ACCUM DEPR</th><th style="text-align:right;padding:7px 8px;border-bottom:1px solid var(--border)">NET BV</th><th style="text-align:right;padding:7px 8px;border-bottom:1px solid var(--border)">YR DEPR</th>
  </tr></thead>
  <tbody>
    <tr style="border-bottom:1px solid rgba(255,255,255,.04)"><td style="padding:7px 8px">BK #1042 — Build-Out</td><td style="padding:7px 8px;color:var(--text-mute)">BK #1042</td><td style="padding:7px 8px;color:var(--text-mute)">Leasehold Impr.</td><td style="padding:7px 8px;color:var(--text-mute)">SL</td><td style="padding:7px 8px;color:var(--text-mute)">15yr</td><td style="padding:7px 8px;text-align:right">$480,000</td><td style="padding:7px 8px;text-align:right">(172,800)</td><td style="padding:7px 8px;text-align:right;color:var(--amber)">$307,200</td><td style="padding:7px 8px;text-align:right">$32,000</td></tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015)"><td style="padding:7px 8px">Kitchen Equipment Pkg</td><td style="padding:7px 8px;color:var(--text-mute)">BK #1087</td><td style="padding:7px 8px;color:var(--text-mute)">Equipment</td><td style="padding:7px 8px;color:var(--text-mute)">DDB</td><td style="padding:7px 8px;color:var(--text-mute)">7yr</td><td style="padding:7px 8px;text-align:right">$240,000</td><td style="padding:7px 8px;text-align:right">(137,143)</td><td style="padding:7px 8px;text-align:right;color:var(--amber)">$102,857</td><td style="padding:7px 8px;text-align:right">$48,000</td></tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,.04)"><td style="padding:7px 8px">POS System — All Stores</td><td style="padding:7px 8px;color:var(--text-mute)">HoldCo</td><td style="padding:7px 8px;color:var(--text-mute)">Software</td><td style="padding:7px 8px;color:var(--text-mute)">SL</td><td style="padding:7px 8px;color:var(--text-mute)">3yr</td><td style="padding:7px 8px;text-align:right">$84,000</td><td style="padding:7px 8px;text-align:right">(46,667)</td><td style="padding:7px 8px;text-align:right;color:var(--amber)">$37,333</td><td style="padding:7px 8px;text-align:right">$28,000</td></tr>
    <tr><td style="padding:7px 8px">Drive-Through Equipment</td><td style="padding:7px 8px;color:var(--text-mute)">BK #1103</td><td style="padding:7px 8px;color:var(--text-mute)">Equipment</td><td style="padding:7px 8px;color:var(--text-mute)">SL</td><td style="padding:7px 8px;color:var(--text-mute)">5yr</td><td style="padding:7px 8px;text-align:right">$62,000</td><td style="padding:7px 8px;text-align:right">(22,320)</td><td style="padding:7px 8px;text-align:right;color:var(--amber)">$39,680</td><td style="padding:7px 8px;text-align:right">$12,400</td></tr>
  </tbody>
</table>
<div style="background:var(--surface2);border:1px solid var(--border);padding:12px">
  <div style="color:var(--amber);font-size:9px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px;font-family:var(--mono)">MONTHLY DEPRECIATION ENTRY</div>
  <table style="width:100%;border-collapse:collapse;font-size:10px;font-family:var(--mono)">
    <thead><tr style="color:var(--text-mute);font-size:9px;text-transform:uppercase;letter-spacing:.08em"><th style="text-align:left;padding:5px 8px">ACCOUNT</th><th style="text-align:right;padding:5px 8px">DEBIT</th><th style="text-align:right;padding:5px 8px">CREDIT</th></tr></thead>
    <tbody>
      <tr style="border-bottom:1px solid rgba(255,255,255,.04)"><td style="padding:6px 8px">Depreciation Expense</td><td style="padding:6px 8px;text-align:right">15,610</td><td style="padding:6px 8px;text-align:right;color:var(--text-mute)">—</td></tr>
      <tr><td style="padding:6px 8px">Accumulated Depreciation</td><td style="padding:6px 8px;text-align:right;color:var(--text-mute)">—</td><td style="padding:6px 8px;text-align:right">15,610</td></tr>
    </tbody>
  </table>
  <button onclick="alert('Depreciation posted to GL')" style="margin-top:8px;background:var(--amber);border:none;color:#000;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.1em;padding:7px 18px;cursor:pointer">POST DEPRECIATION ENTRY</button>
</div></div>`
  };

  window.setDoc = function(key, el) {
    if (EXTRA[key]) {
      document.querySelectorAll('.doc-tab').forEach(b => b.classList.remove('active'));
      if (el) el.classList.add('active');
      const panel = document.querySelector('.output-panel') || document.getElementById('outputPanel');
      if (panel) panel.innerHTML = '<div style="padding:0;overflow-y:auto;height:100%">' + EXTRA[key] + '</div>';
      return;
    }
    if (typeof _orig === 'function') _orig(key, el);
  };
})();
</script>"""

    html3 = html3.replace('</body>', ACCT_JS + '\n</body>', 1)
    acct.write_text(html3)
    print('✅ finops-accounting.html patched — Intercompany matrix + Fixed Assets roster added')

print('\nAll patches complete. Run: git add -A && git commit -m "feat: document-showcase 4-engine BNCA + workflow tabs; sales tax filing; intercompany + fixed assets" && git push && fly deploy --app tsm-shell --no-cache')
