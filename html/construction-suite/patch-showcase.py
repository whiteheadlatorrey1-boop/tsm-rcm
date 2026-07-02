#!/usr/bin/env python3
"""
Patch: document-showcase.html
- Add tab bar (Documents/4-Engine Analysis | Browse | Workflow)
- Insert 4-engine BNCA layout as the primary Documents tab
- Add pipeline bar + 4 construction analysis engines
- Add Groq API key + FIRE ALL 4 ENGINES button
- Move existing browse content into Browse tab
- Add Morning/Midday/EOD workflow tabs
"""
import pathlib, sys

FILE = pathlib.Path('html/construction-suite/document-showcase.html')
if not FILE.exists():
    sys.exit(f"ERROR: {FILE} not found. Run from repo root.")

html = FILE.read_text()

# ── 1. Inject 4-engine CSS before </style> ───────────────────────────
ENGINE_CSS = """
/* ============================================
   4-ENGINE BNCA — Construction Doc Analysis
   ============================================ */
.bnca-tabbar {
  position: sticky; top: 64px; z-index: 90;
  background: var(--iron);
  border-bottom: 1px solid rgba(255,255,255,.06);
  height: 38px;
  display: flex; align-items: stretch;
  padding: 0 1.5rem;
}
.bnca-tab {
  font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--mist); padding: 0 1.2rem; cursor: pointer;
  border-bottom: 2px solid transparent;
  display: flex; align-items: center; gap: 6px;
  transition: all .15s; font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
}
.bnca-tab:hover { color: var(--chalk); }
.bnca-tab.active { color: var(--amber); border-bottom-color: var(--amber); }
.bnca-tab .tab-badge {
  font-size: 9px; background: rgba(240,165,0,.12);
  color: var(--amber); border: 1px solid rgba(240,165,0,.3);
  padding: 1px 5px; border-radius: 3px;
}
.bnca-content { display: none; }
.bnca-content.active { display: block; }

/* BNCA Layout */
.bnca-layout { display: grid; grid-template-columns: 260px 1fr; height: calc(100vh - 102px); overflow: hidden; }
.bnca-sidebar {
  background: var(--iron); border-right: 1px solid rgba(255,255,255,.06);
  display: flex; flex-direction: column; overflow: hidden;
}
.bnca-mode-row { display: flex; padding: .6rem; gap: 6px; border-bottom: 1px solid rgba(255,255,255,.05); }
.bnca-mode-btn {
  flex: 1; padding: 7px 6px; border-radius: 4px;
  border: 1px solid rgba(255,255,255,.07); background: transparent;
  color: var(--mist); font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px; letter-spacing: .07em; text-transform: uppercase;
  cursor: pointer; transition: all .15s; display: flex;
  align-items: center; justify-content: center; gap: 4px;
}
.bnca-mode-btn.active { background: rgba(240,165,0,.1); border-color: rgba(240,165,0,.35); color: var(--amber); }
.bnca-mode-btn:hover:not(.active) { color: var(--chalk); border-color: rgba(255,255,255,.15); }
.bnca-sb-section { padding: .4rem .6rem; flex: 1; overflow-y: auto; scrollbar-width: thin; }
.bnca-sb-cat {
  font-size: 9px; letter-spacing: .14em; text-transform: uppercase;
  color: var(--mist); margin: .6rem 0 .3rem; display: block;
  font-family: 'Barlow Condensed', sans-serif;
}
.bnca-doc-item {
  padding: 8px 10px; border-radius: 5px;
  border: 1px solid transparent; cursor: pointer;
  transition: all .15s; margin-bottom: 4px;
}
.bnca-doc-item:hover { border-color: rgba(255,255,255,.07); background: var(--plate); }
.bnca-doc-item.selected { border-color: rgba(240,165,0,.35); background: rgba(240,165,0,.07); }
.bnca-doc-name { font-size: 11px; font-weight: 700; color: var(--amber); margin-bottom: 2px; }
.bnca-doc-meta { font-size: 10px; color: var(--mist); line-height: 1.35; }
.bnca-doc-route {
  font-size: 9px; color: var(--accent); border: 1px solid rgba(79,163,224,.3);
  padding: 1px 5px; display: inline-block; margin-top: 3px;
  letter-spacing: .06em; text-transform: uppercase;
}
.bnca-upload-zone {
  margin: .5rem .6rem; border: 1px dashed rgba(255,255,255,.1);
  border-radius: 5px; padding: .8rem; text-align: center;
  cursor: pointer; transition: all .2s; position: relative; display: none;
}
.bnca-upload-zone.visible { display: block; }
.bnca-upload-zone:hover { border-color: var(--amber); background: rgba(240,165,0,.04); }
.bnca-upload-zone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
.bnca-upload-icon { font-size: 1.4rem; margin-bottom: 4px; }
.bnca-upload-text { font-size: 10px; color: var(--mist); line-height: 1.5; }
.bnca-sb-status {
  border-top: 1px solid rgba(255,255,255,.05); padding: .5rem .75rem;
  font-size: 10px; color: var(--mist); flex-shrink: 0;
}
.bnca-sb-status .ready { color: var(--safe); }
.bnca-api-row {
  margin: 0 .6rem .4rem;
  display: flex; flex-direction: column; gap: 3px;
}
.bnca-api-label { font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--mist); }
.bnca-api-input {
  background: var(--steel); border: 1px solid rgba(255,255,255,.07);
  color: var(--chalk); font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px; padding: 5px 8px; outline: none; width: 100%; border-radius: 3px;
  transition: border-color .2s;
}
.bnca-api-input:focus { border-color: rgba(240,165,0,.4); }
.bnca-fire-btn {
  margin: 0 .6rem .6rem;
  width: calc(100% - 1.2rem);
  padding: 11px; background: var(--amber); color: var(--steel);
  font-family: 'Barlow Condensed', sans-serif; font-size: 13px;
  font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  border: none; border-radius: 5px; cursor: pointer;
  transition: all .15s; display: flex; align-items: center;
  justify-content: center; gap: 6px; flex-shrink: 0;
}
.bnca-fire-btn:hover { background: var(--amber-lt); }
.bnca-fire-btn:disabled { opacity: .45; cursor: default; }

/* Pipeline bar */
.bnca-pipeline-bar {
  background: var(--iron); border-bottom: 1px solid rgba(255,255,255,.05);
  padding: 8px 18px; display: flex; align-items: center;
  justify-content: space-between; flex-shrink: 0;
}
.bnca-pipeline { display: flex; align-items: center; }
.bnca-pipe-node { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.bnca-pipe-circle {
  width: 34px; height: 34px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.08); background: var(--plate);
  display: flex; align-items: center; justify-content: center;
  font-size: .85rem; transition: all .4s;
}
.bnca-pipe-circle.active {
  border-color: var(--amber); background: rgba(240,165,0,.1);
  box-shadow: 0 0 12px rgba(240,165,0,.3);
  animation: nodePulse .8s ease-in-out infinite;
}
@keyframes nodePulse{0%,100%{box-shadow:0 0 8px rgba(240,165,0,.3)}50%{box-shadow:0 0 18px rgba(240,165,0,.6)}}
.bnca-pipe-circle.done { border-color: var(--safe); background: rgba(62,207,142,.1); }
.bnca-pipe-label { font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--mist); font-family: 'Barlow Condensed', sans-serif; }
.bnca-pipe-arrow { font-size: 12px; color: rgba(255,255,255,.1); margin: 0 4px 14px; transition: color .4s; }
.bnca-pipe-arrow.done { color: var(--safe); }
.bnca-pipe-status { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--mist); font-family: 'Barlow Condensed', sans-serif; }
.bnca-pipe-status .count { color: var(--safe); font-weight: 700; }

/* Engines grid */
.bnca-main-panel { display: flex; flex-direction: column; overflow: hidden; }
.bnca-engines-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr; flex: 1; overflow: hidden;
  gap: 1px; background: rgba(255,255,255,.04);
}
.bnca-engine { background: var(--steel); display: flex; flex-direction: column; overflow: hidden; }
.bnca-engine-header {
  background: var(--iron); border-bottom: 1px solid rgba(255,255,255,.05);
  padding: 7px 14px; display: flex; align-items: center;
  justify-content: space-between; flex-shrink: 0;
}
.bnca-engine-num { font-size: 9px; color: var(--mist); margin-right: 6px; font-family: 'Barlow Condensed', sans-serif; }
.bnca-engine-name { font-size: 11px; font-weight: 700; color: var(--chalk); letter-spacing: .03em; }
.bnca-engine-route {
  font-size: 9px; color: var(--accent); letter-spacing: .07em;
  text-transform: uppercase; border: 1px solid rgba(79,163,224,.3);
  padding: 1px 5px; margin-left: 6px;
}
.bnca-es { font-size: 9px; letter-spacing: .1em; text-transform: uppercase; padding: 3px 8px; border-radius: 20px; font-family: 'Barlow Condensed', sans-serif; }
.bnca-es-idle { background: rgba(255,255,255,.04); color: var(--mist); border: 1px solid rgba(255,255,255,.06); }
.bnca-es-running { background: rgba(240,165,0,.1); color: var(--amber); border: 1px solid rgba(240,165,0,.3); animation: statusPulse 1s infinite; }
@keyframes statusPulse{0%,100%{opacity:1}50%{opacity:.6}}
.bnca-es-complete { background: rgba(62,207,142,.1); color: var(--safe); border: 1px solid rgba(62,207,142,.3); }
.bnca-es-error { background: rgba(224,85,85,.08); color: var(--danger); border: 1px solid rgba(224,85,85,.25); }
.bnca-engine-body {
  flex: 1; overflow-y: auto; padding: 12px 14px;
  font-size: 12px; line-height: 1.7; color: var(--chalk);
  white-space: pre-wrap; font-family: 'Barlow', sans-serif;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.08) transparent;
}
.bnca-engine-placeholder { color: var(--mist); font-style: italic; font-size: 11px; }
.bnca-spinner { width: 11px; height: 11px; border: 2px solid rgba(255,255,255,.1); border-top-color: var(--amber); border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0; display: inline-block; }
@keyframes spin{to{transform:rotate(360deg)}}
.bnca-engine-footer {
  border-top: 1px solid rgba(255,255,255,.04); padding: 5px 14px;
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0; background: var(--iron);
}
.bnca-copy-btn {
  font-family: 'Barlow Condensed', sans-serif; font-size: 10px;
  letter-spacing: .08em; text-transform: uppercase; color: var(--mist);
  background: transparent; border: 1px solid rgba(255,255,255,.07);
  border-radius: 3px; padding: 2px 8px; cursor: pointer; transition: all .15s;
}
.bnca-copy-btn:hover { color: var(--amber); border-color: rgba(240,165,0,.3); }
.bnca-token-count { font-size: 9px; color: var(--mist); font-family: 'Barlow Condensed', sans-serif; }

/* Workflow tabs */
.wf-body { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px; background: rgba(255,255,255,.04); height: calc(100vh - 102px); overflow: hidden; }
.wf-col { background: var(--steel); display: flex; flex-direction: column; overflow: hidden; }
.wf-col-header { background: var(--iron); border-bottom: 1px solid rgba(255,255,255,.05); padding: 8px 14px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.wf-col-title { font-size: 11px; font-weight: 700; color: var(--chalk); letter-spacing: .08em; text-transform: uppercase; font-family: 'Barlow Condensed', sans-serif; }
.wf-col-meta { font-size: 10px; color: var(--mist); }
.wf-col-body { flex: 1; overflow-y: auto; padding: 10px 14px; scrollbar-width: thin; }
.wf-task { padding: 9px 11px; border: 1px solid rgba(255,255,255,.06); border-radius: 4px; margin-bottom: 7px; cursor: pointer; transition: all .15s; position: relative; }
.wf-task:hover { border-color: rgba(240,165,0,.3); background: rgba(240,165,0,.03); }
.wf-task.done { opacity: .5; border-color: rgba(62,207,142,.3); background: rgba(62,207,142,.04); }
.wf-task.done .wf-task-name { text-decoration: line-through; color: var(--mist); }
.wf-task-badge { font-size: 9px; letter-spacing: .08em; text-transform: uppercase; border: 1px solid; padding: 1px 5px; margin-bottom: 4px; display: inline-block; border-radius: 2px; font-family: 'Barlow Condensed', sans-serif; }
.tb-p1 { border-color: rgba(224,85,85,.5); color: var(--danger); background: rgba(224,85,85,.07); }
.tb-p2 { border-color: rgba(240,165,0,.4); color: var(--amber); }
.tb-p3 { border-color: rgba(79,163,224,.4); color: var(--accent); }
.tb-info { border-color: rgba(255,255,255,.08); color: var(--mist); }
.wf-task-name { font-size: 12px; font-weight: 600; color: var(--chalk); margin-bottom: 3px; }
.wf-task-desc { font-size: 11px; color: var(--mist); line-height: 1.4; }
.wf-task-owner { font-size: 10px; color: var(--accent); margin-top: 3px; }
.wf-task-check { position: absolute; top: 9px; right: 9px; width: 16px; height: 16px; border: 1px solid rgba(255,255,255,.1); border-radius: 2px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; color: transparent; transition: all .15s; }
.wf-task:hover .wf-task-check { border-color: var(--amber); color: rgba(240,165,0,.3); }
.wf-task.done .wf-task-check { background: var(--safe); border-color: var(--safe); color: var(--steel); }
.wf-col-footer { border-top: 1px solid rgba(255,255,255,.04); padding: 6px 14px; background: var(--iron); font-size: 10px; color: var(--mist); flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; }
.progress-bar-wrap { height: 3px; background: rgba(255,255,255,.05); border-radius: 2px; margin: 4px 0; overflow: hidden; }
.progress-bar { height: 100%; background: var(--amber); border-radius: 2px; transition: width .4s; }
"""

if 'bnca-tabbar' in html:
    print("INFO: 4-engine CSS already present — skipping")
else:
    html = html.replace('</style>', ENGINE_CSS + '\n</style>', 1)
    print("✓  4-engine CSS injected")

# ── 2. Insert tab bar + 4-engine content after </header> ─────────────
BNCA_HTML = """
<!-- ============================================================
     BNCA TAB BAR
     ============================================================ -->
<div class="bnca-tabbar">
  <div class="bnca-tab active" id="bnca-tab-analysis" onclick="bncaSwitchTab('analysis')">⚡ 4-Engine Analysis</div>
  <div class="bnca-tab" id="bnca-tab-browse" onclick="bncaSwitchTab('browse')">Browse Docs</div>
  <div class="bnca-tab" id="bnca-tab-morning" onclick="bncaSwitchTab('morning')">🌅 Morning <span class="tab-badge">8 tasks</span></div>
  <div class="bnca-tab" id="bnca-tab-eod" onclick="bncaSwitchTab('eod')">🌆 EOD <span class="tab-badge">5 tasks</span></div>
</div>

<!-- ============================================================
     TAB: 4-ENGINE ANALYSIS
     ============================================================ -->
<div class="bnca-content active" id="bnca-content-analysis">
<div class="bnca-layout">
  <!-- SIDEBAR -->
  <div class="bnca-sidebar">
    <div class="bnca-mode-row">
      <button class="bnca-mode-btn active" id="bncaModeS" onclick="bncaSetMode('sample')">◆ Sample Doc</button>
      <button class="bnca-mode-btn" id="bncaModeU" onclick="bncaSetMode('upload')">↑ Upload Doc</button>
    </div>
    <div class="bnca-sb-section" id="bncaSampleSection">
      <span class="bnca-sb-cat">Plans & Drawings</span>
      <div class="bnca-doc-item" onclick="bncaSelectDoc(this,'site-plan')">
        <div class="bnca-doc-name">Site Plan — Overall Master</div>
        <div class="bnca-doc-meta">17.6 MB · Grading, utilities, building footprints</div>
        <div class="bnca-doc-route">→ Site / Civil</div>
      </div>
      <div class="bnca-doc-item" onclick="bncaSelectDoc(this,'mep-drawings')">
        <div class="bnca-doc-name">MEP Coordination Drawings L1</div>
        <div class="bnca-doc-meta">8.7 MB · Clash detection, system routing</div>
        <div class="bnca-doc-route">→ MEP / Systems</div>
      </div>
      <span class="bnca-sb-cat">Contracts</span>
      <div class="bnca-doc-item selected" onclick="bncaSelectDoc(this,'gc-contract')">
        <div class="bnca-doc-name">GC Agreement — Phase 2</div>
        <div class="bnca-doc-meta">Signed · Steel erection, structural framing, payment terms</div>
        <div class="bnca-doc-route">→ Contracts</div>
      </div>
      <div class="bnca-doc-item" onclick="bncaSelectDoc(this,'change-order')">
        <div class="bnca-doc-name">Change Order #7 — Foundation</div>
        <div class="bnca-doc-meta">$42K · Scope expansion, pending approval</div>
        <div class="bnca-doc-route">→ Change Orders</div>
      </div>
      <span class="bnca-sb-cat">Reports & Financial</span>
      <div class="bnca-doc-item" onclick="bncaSelectDoc(this,'q1-budget')">
        <div class="bnca-doc-name">Q1 Budget Reconciliation</div>
        <div class="bnca-doc-meta">$4.2M total · Variance analysis, Q2 forecast</div>
        <div class="bnca-doc-route">→ Financial</div>
      </div>
      <div class="bnca-doc-item" onclick="bncaSelectDoc(this,'progress-w17')">
        <div class="bnca-doc-name">Progress Report — Week 17</div>
        <div class="bnca-doc-meta">83% on schedule · 12 sites · Key milestones</div>
        <div class="bnca-doc-route">→ Reports</div>
      </div>
      <span class="bnca-sb-cat">Safety & Compliance</span>
      <div class="bnca-doc-item" onclick="bncaSelectDoc(this,'osha-plan')">
        <div class="bnca-doc-name">OSHA Safety Plan 2026</div>
        <div class="bnca-doc-meta">2.1 MB · Full site safety protocols, PPE, emergency</div>
        <div class="bnca-doc-route">→ Safety / OSHA</div>
      </div>
    </div>
    <div class="bnca-upload-zone" id="bncaUploadZone">
      <input type="file" id="bncaFileInput" accept=".pdf,.doc,.docx,.csv,.xlsx,.txt" onchange="bncaHandleUpload(event)">
      <div class="bnca-upload-icon">📂</div>
      <div class="bnca-upload-text">Drag & drop or click to upload<br>PDF · DOCX · XLSX · CSV · TXT</div>
    </div>
    <div class="bnca-sb-status" id="bncaSbStatus"><span class="ready">✓</span> GC Agreement Phase 2 — READY</div>
    <div class="bnca-api-row">
      <div class="bnca-api-label">Groq API Key</div>
      <input id="bncaGroqKey" type="password" placeholder="gsk_•••••••••••••••••••" class="bnca-api-input"
        onfocus="this.style.borderColor='rgba(240,165,0,.4)'" onblur="this.style.borderColor=''">
    </div>
    <button class="bnca-fire-btn" id="bncaFireBtn" onclick="bncaFireAll()">⚡ FIRE ALL 4 ENGINES</button>
  </div>

  <!-- MAIN PANEL -->
  <div class="bnca-main-panel">
    <!-- Pipeline bar -->
    <div class="bnca-pipeline-bar">
      <div class="bnca-pipeline">
        <div class="bnca-pipe-node"><div class="bnca-pipe-circle" id="bncaPipe0">📥</div><div class="bnca-pipe-label">Ingest</div></div>
        <div class="bnca-pipe-arrow" id="bncaArr0">›</div>
        <div class="bnca-pipe-node"><div class="bnca-pipe-circle" id="bncaPipe1">🔍</div><div class="bnca-pipe-label">Parse</div></div>
        <div class="bnca-pipe-arrow" id="bncaArr1">›</div>
        <div class="bnca-pipe-node"><div class="bnca-pipe-circle" id="bncaPipe2">🧠</div><div class="bnca-pipe-label">AI Analysis</div></div>
        <div class="bnca-pipe-arrow" id="bncaArr2">›</div>
        <div class="bnca-pipe-node"><div class="bnca-pipe-circle" id="bncaPipe3">⚡</div><div class="bnca-pipe-label">BNCA</div></div>
        <div class="bnca-pipe-arrow" id="bncaArr3">›</div>
        <div class="bnca-pipe-node"><div class="bnca-pipe-circle" id="bncaPipe4">📋</div><div class="bnca-pipe-label">Report</div></div>
      </div>
      <div class="bnca-pipe-status"><span class="count" id="bncaCompleteCount">0</span> / 4 engines complete</div>
    </div>
    <!-- 4 Engines -->
    <div class="bnca-engines-grid">
      <div class="bnca-engine">
        <div class="bnca-engine-header">
          <div><span class="bnca-engine-num">01</span><span class="bnca-engine-name">Document Triage & Flag Analysis</span><span class="bnca-engine-route">Site Docs</span></div>
          <div class="bnca-es bnca-es-idle" id="bncaStatus1">IDLE</div>
        </div>
        <div class="bnca-engine-body" id="bncaOutput1"><span class="bnca-engine-placeholder">Select a construction document and fire engines to begin analysis…</span></div>
        <div class="bnca-engine-footer"><button class="bnca-copy-btn" onclick="bncaCopyEngine(1)">COPY</button><span class="bnca-token-count" id="bncaTokens1">—</span></div>
      </div>
      <div class="bnca-engine">
        <div class="bnca-engine-header">
          <div><span class="bnca-engine-num">02</span><span class="bnca-engine-name">Variance & Risk Intelligence</span><span class="bnca-engine-route">Schedule / Budget</span></div>
          <div class="bnca-es bnca-es-idle" id="bncaStatus2">IDLE</div>
        </div>
        <div class="bnca-engine-body" id="bncaOutput2"><span class="bnca-engine-placeholder">Waiting for Engine 1…</span></div>
        <div class="bnca-engine-footer"><button class="bnca-copy-btn" onclick="bncaCopyEngine(2)">COPY</button><span class="bnca-token-count" id="bncaTokens2">—</span></div>
      </div>
      <div class="bnca-engine">
        <div class="bnca-engine-header">
          <div><span class="bnca-engine-num">03</span><span class="bnca-engine-name">Site Action Plan · BNCA</span><span class="bnca-engine-route">Build · Note · Check · Act</span></div>
          <div class="bnca-es bnca-es-idle" id="bncaStatus3">IDLE</div>
        </div>
        <div class="bnca-engine-body" id="bncaOutput3"><span class="bnca-engine-placeholder">Waiting for Engine 2…</span></div>
        <div class="bnca-engine-footer"><button class="bnca-copy-btn" onclick="bncaCopyEngine(3)">COPY</button><span class="bnca-token-count" id="bncaTokens3">—</span></div>
      </div>
      <div class="bnca-engine">
        <div class="bnca-engine-header">
          <div><span class="bnca-engine-num">04</span><span class="bnca-engine-name">Executive Summary & Recommendations</span><span class="bnca-engine-route">PM Report</span></div>
          <div class="bnca-es bnca-es-idle" id="bncaStatus4">IDLE</div>
        </div>
        <div class="bnca-engine-body" id="bncaOutput4"><span class="bnca-engine-placeholder">Waiting for Engine 3…</span></div>
        <div class="bnca-engine-footer"><button class="bnca-copy-btn" onclick="bncaCopyEngine(4)">COPY</button><span class="bnca-token-count" id="bncaTokens4">—</span></div>
      </div>
    </div>
  </div>
</div>
</div><!-- /bnca-content-analysis -->

<!-- ============================================================
     TAB: BROWSE (existing page content goes here — auto-hidden)
     ============================================================ -->
<div class="bnca-content" id="bnca-content-browse">
"""

# ── 3. Wrap existing .page div + find the footer + close browse tab ──

# Insert BNCA html after </header>
if 'bnca-content-analysis' in html:
    print("INFO: BNCA HTML already present — skipping")
else:
    html = html.replace('</header>\n\n<div class="page">', '</header>\n' + BNCA_HTML + '<div class="page">', 1)
    if 'bnca-content-analysis' not in html:
        # Try without double newline
        html = html.replace('</header>\n<div class="page">', '</header>\n' + BNCA_HTML + '<div class="page">', 1)
    if 'bnca-content-analysis' not in html:
        html = html.replace('</header>', '</header>\n' + BNCA_HTML, 1)
        print("✓  BNCA HTML injected (after </header>)")
    else:
        print("✓  BNCA HTML injected")

# Close the browse tab before <footer>
if 'bnca-content-browse' in html and '</div><!-- /bnca-content-browse -->' not in html:
    html = html.replace('<footer>', '</div><!-- /bnca-content-browse -->\n\n<!-- Workflow Tabs -->\n' + WORKFLOW_HTML + '\n\n<footer>', 1)

# ── 4. Inject 4-engine JS before </body> ─────────────────────────────
BNCA_JS = """
<script>
/* ── 4-Engine BNCA — Construction Doc Analysis ── */
const BNCA_DOCS = {
  'gc-contract': {
    name: 'GC Agreement — Phase 2',
    route: 'Contracts',
    context: `General Contractor Agreement Phase 2 — Steel Erection & Structural Framing.
Contractor: Apex Steel LLC. Owner: Meridian Development Corp.
Scope: Structural steel erection for main building (Blocks A–D), crane operation, beam placement, column setting.
Contract Value: $1.24M. Payment Terms: Net-30 on approved progress billing.
Schedule: Mobilization June 20, completion August 30. Liquidated Damages: $5,000/day.
Retention: 10% until substantial completion. Change orders require written approval within 5 days.
Insurance: $5M general liability, $2M workers comp required.
Status: Executed April 15, 2026.`
  },
  'site-plan': {
    name: 'Site Plan — Overall Master',
    route: 'Plans',
    context: `Site Plan — Overall Master. Rev 4, April 28, 2026. PDF 17.6 MB.
Project: Meridian Mixed-Use Development. Architect: Holt & Farrow AIA.
Includes: Building footprints (Blocks A–D), utility routing (water/sewer/electric), grading plan,
drainage swales, parking layout (180 spaces), ADA paths, staging areas, Gate 2 access.
Key Notes: Gate 2 is the primary delivery access — 24ft clearance required.
North drainage swale: contractor to protect during steel delivery.
Block C footprint revised in Rev 4 — verify against permit drawings.`
  },
  'change-order': {
    name: 'Change Order #7 — Foundation Scope',
    route: 'Financial',
    context: `Change Order #7 — Foundation Scope Expansion. Submitted April 20, 2026.
Status: Pending Review. Value: $42,000.
Scope: Additional 12LF of caisson drilling (rock encountered at -18ft, design was -12ft).
Engineering supplemental required. Lab testing: $3,200. Equipment: $18,800. Labor: $12,400. Overhead: $7,600.
CO must be approved before Phase 2 GC mobilization (June 20).
Contract change order clause: Owner has 10 business days to approve/reject from submission.
Submission date April 20 → deadline May 6. Currently 6 days overdue for decision.`
  },
  'q1-budget': {
    name: 'Q1 Budget Reconciliation',
    route: 'Financial',
    context: `Q1 2026 Budget Reconciliation Report. Final. April 1, 2026.
Total Project Budget: $4,200,000. Q1 Spend: $1,047,300. YTD: $1,047,300 (24.9%).
Phase 1 Foundation: Budget $820K, Actual $847K, Variance +$27K (+3.3%) — caisson overrun.
Permits & Fees: Budget $45K, Actual $38K, Variance -$7K (under).
Site Work: Budget $180K, Actual $162K, Variance -$18K (under).
Q2 Forecast: $1,340,000 (steel, framing, crane).
Subcontractor invoices pending: 3 invoices totaling $84,200 not yet approved.
Cash flow: Owner draw #2 ($400K) scheduled May 15.`
  },
  'osha-plan': {
    name: 'OSHA Safety Plan 2026',
    route: 'Safety',
    context: `OSHA Safety Plan — Meridian Development Site 2026. Final, Jan 10, 2026.
Competent Person: D. Lara (Safety Officer). Emergency Contact: 602-555-0198.
Key Requirements: Hard hats, safety vests, steel-toed boots mandatory all areas.
Fall protection: Full body harness required above 6ft on leading edge work.
Crane operations: 150ft exclusion zone, daily pre-use inspections, operator certification required.
Trenching: Any excavation over 5ft requires cave-in protection — see Appendix C.
Incident reporting: All incidents reported within 24hr to safety officer.
Near-miss protocol: Stop work, report, investigation before restart.
Last inspection: April 14, 2026 — near-miss event (trench wall slough, no injuries).`
  },
  'mep-drawings': {
    name: 'MEP Coordination Drawings L1',
    route: 'Plans',
    context: `MEP Coordination Drawings — Level 1. March 18, 2026. Under Review.
Disciplines: Mechanical (HVAC ductwork), Electrical (conduit, panels), Plumbing (waste/supply).
Clash Report: 4 hard clashes identified — duct vs structural beam at grid lines B-4 and C-7.
2 soft clashes flagged for coordination. Engineer response pending.
Inspection scheduling: MEP rough-in inspection required before insulation.
Current status: Clashes unresolved — rough-in cannot proceed until coordination meeting.
Coordination meeting: Not yet scheduled (overdue by 3 days per project schedule).`
  },
  'progress-w17': {
    name: 'Progress Report — Week 17',
    route: 'Reports',
    context: `Weekly Progress Report — Week 17 (ending April 26, 2026).
Overall completion: 23% of total scope. Schedule: 83% of milestones on track.
Completed this week: North foundation pour (Block C), steel delivery staging confirmed for Gate 2.
In progress: Block A footing forms, Block B waterproofing.
Behind schedule: MEP coordination (3 days behind), Block D permit (awaiting city review).
Issues: Steel crane mobilization crew not yet confirmed — risk to June 20 start.
RFIs open: 7 (2 critical, 5 routine). Submittals pending approval: 4.
Safety: 0 incidents. 47 workers on site peak day. 218 man-hours this week.`
  }
};

let bncaCurrentDoc = 'gc-contract';
let bncaCompleted = 0;

function bncaSwitchTab(tab) {
  document.querySelectorAll('.bnca-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.bnca-content').forEach(c => c.classList.remove('active'));
  document.getElementById('bnca-tab-' + tab)?.classList.add('active');
  document.getElementById('bnca-content-' + tab)?.classList.add('active');
}

function bncaSetMode(mode) {
  document.getElementById('bncaModeS').classList.toggle('active', mode === 'sample');
  document.getElementById('bncaModeU').classList.toggle('active', mode === 'upload');
  document.getElementById('bncaSampleSection').style.display = mode === 'sample' ? '' : 'none';
  document.getElementById('bncaUploadZone').classList.toggle('visible', mode === 'upload');
}

function bncaSelectDoc(el, key) {
  document.querySelectorAll('.bnca-doc-item').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  bncaCurrentDoc = key;
  const doc = BNCA_DOCS[key];
  document.getElementById('bncaSbStatus').innerHTML = '<span class="ready">✓</span> ' + doc.name + ' — READY';
}

function bncaHandleUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('bncaSbStatus').innerHTML = '<span class="ready">✓</span> ' + file.name + ' — READY';
}

function bncaCopyEngine(n) {
  const txt = document.getElementById('bncaOutput' + n)?.innerText || '';
  navigator.clipboard?.writeText(txt);
}

function bncaSetPipe(idx, state) {
  const el = document.getElementById('bncaPipe' + idx);
  if (!el) return;
  el.classList.remove('active', 'done');
  if (state === 'active') el.classList.add('active');
  if (state === 'done') el.classList.add('done');
  if (idx > 0) {
    const arr = document.getElementById('bncaArr' + (idx - 1));
    if (arr && state === 'done') arr.classList.add('done');
  }
}

function bncaSetEngine(n, state, text) {
  const statusEl = document.getElementById('bncaStatus' + n);
  const outputEl = document.getElementById('bncaOutput' + n);
  const tokenEl = document.getElementById('bncaTokens' + n);
  if (!statusEl) return;
  statusEl.className = 'bnca-es';
  if (state === 'running') {
    statusEl.classList.add('bnca-es-running'); statusEl.textContent = 'RUNNING';
    outputEl.innerHTML = '<span style="display:flex;align-items:center;gap:6px;color:var(--amber)"><span class="bnca-spinner"></span> Engine ' + n + ' processing…</span>';
  } else if (state === 'complete') {
    statusEl.classList.add('bnca-es-complete'); statusEl.textContent = 'COMPLETE';
    outputEl.textContent = text;
    const words = text.split(/\s+/).length;
    tokenEl.textContent = '~' + Math.round(words * 1.3) + ' tokens';
    bncaCompleted++;
    document.getElementById('bncaCompleteCount').textContent = bncaCompleted;
  } else if (state === 'error') {
    statusEl.classList.add('bnca-es-error'); statusEl.textContent = 'ERROR';
    outputEl.textContent = text;
  } else {
    statusEl.classList.add('bnca-es-idle'); statusEl.textContent = 'IDLE';
  }
}

async function bncaCallGroq(systemPrompt, userPrompt, apiKey) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_tokens: 800,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  if (!r.ok) throw new Error('Groq API ' + r.status);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || 'No response';
}

async function bncaFireAll() {
  const apiKey = document.getElementById('bncaGroqKey').value.trim();
  if (!apiKey) { alert('Enter your Groq API key first.'); return; }

  const doc = BNCA_DOCS[bncaCurrentDoc];
  if (!doc) { alert('Select a document first.'); return; }

  bncaCompleted = 0;
  document.getElementById('bncaCompleteCount').textContent = '0';
  document.getElementById('bncaFireBtn').disabled = true;

  // Reset all
  for (let i = 1; i <= 4; i++) bncaSetEngine(i, 'idle', '');
  for (let i = 0; i <= 4; i++) {
    document.getElementById('bncaPipe' + i)?.classList.remove('active','done');
    if (i < 4) document.getElementById('bncaArr' + i)?.classList.remove('done');
  }

  const docCtx = doc.context;

  try {
    // Engine 1: Document Triage & Flag Analysis
    bncaSetPipe(0, 'active'); bncaSetPipe(1, 'active');
    bncaSetEngine(1, 'running');
    const e1 = await bncaCallGroq(
      'You are a senior construction project controller. Analyze construction documents and flag issues. Be concise, use bullet points. Focus on: missing info, inconsistencies, compliance flags, items requiring immediate attention.',
      'Triage this construction document and list all flags, missing items, and issues:\n\n' + docCtx
    );
    bncaSetPipe(1, 'done'); bncaSetPipe(2, 'active');
    bncaSetEngine(1, 'complete', e1);

    // Engine 2: Variance & Risk Intelligence
    bncaSetEngine(2, 'running');
    const e2 = await bncaCallGroq(
      'You are a construction cost and schedule risk analyst. Identify variances, risks, and financial exposure from construction documents. Be concise, specific dollar amounts and days where possible.',
      'Analyze variance and risk in this construction document:\n\n' + docCtx + '\n\nEngine 1 flags:\n' + e1
    );
    bncaSetPipe(2, 'done'); bncaSetPipe(3, 'active');
    bncaSetEngine(2, 'complete', e2);

    // Engine 3: Site Action Plan (BNCA)
    bncaSetEngine(3, 'running');
    const e3 = await bncaCallGroq(
      'You are a construction project superintendent. Create a prioritized action plan using BNCA format (Build/Execute, Note/Track, Check/Verify, Act/Escalate). Give 3-5 items per category. Be direct and actionable.',
      'Create a BNCA site action plan based on:\n\nDocument:\n' + docCtx + '\n\nRisks:\n' + e2
    );
    bncaSetPipe(3, 'done'); bncaSetPipe(4, 'active');
    bncaSetEngine(3, 'complete', e3);

    // Engine 4: Executive Summary
    bncaSetEngine(4, 'running');
    const e4 = await bncaCallGroq(
      'You are a construction executive. Write a 3-paragraph executive summary for project leadership: (1) document status and key findings, (2) top 3 risks requiring management decision, (3) recommended next steps with owners and deadlines. Keep it tight and decision-ready.',
      'Write executive summary for:\n\nDocument: ' + doc.name + '\n\nFindings:\n' + e1 + '\n\nRisks:\n' + e2 + '\n\nAction Plan:\n' + e3
    );
    bncaSetPipe(4, 'done');
    bncaSetEngine(4, 'complete', e4);

  } catch (err) {
    console.error(err);
    for (let i = 1; i <= 4; i++) {
      const s = document.getElementById('bncaStatus' + i);
      if (s && s.classList.contains('bnca-es-running')) {
        bncaSetEngine(i, 'error', '[Error] ' + err.message);
      }
    }
  }
  document.getElementById('bncaFireBtn').disabled = false;
}

// Workflow task toggle
document.addEventListener('click', e => {
  const task = e.target.closest('.wf-task');
  if (task && !e.target.classList.contains('wf-task-check')) {
    task.classList.toggle('done');
    const check = task.querySelector('.wf-task-check');
    if (check) check.textContent = task.classList.contains('done') ? '✓' : '';
  }
  if (e.target.classList.contains('wf-task-check')) {
    const task2 = e.target.closest('.wf-task');
    if (task2) {
      task2.classList.toggle('done');
      e.target.textContent = task2.classList.contains('done') ? '✓' : '';
    }
  }
});
</script>
"""

WORKFLOW_HTML = """<!-- ============================================================
     TAB: MORNING
     ============================================================ -->
<div class="bnca-content" id="bnca-content-morning">
<div class="wf-body">
  <div class="wf-col">
    <div class="wf-col-header"><span class="wf-col-title">🔴 Priority · Act Now</span><span class="wf-col-meta">3 items</span></div>
    <div class="wf-col-body">
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-p1">P1 · Safety</span><div class="wf-task-name">MEP Inspection — Contact City Inspector</div><div class="wf-task-desc">Call Inspector Thompson (602-555-0129) — coordinate next window. Block C CO blocked until resolved.</div><div class="wf-task-owner">Owner: J. Patterson</div></div>
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-p1">P1 · Delivery</span><div class="wf-task-name">Confirm Gate 2 Staging for Steel</div><div class="wf-task-desc">Steel delivery arriving today. Confirm crew at Gate 2, 24ft clearance, signalman on site. Crane idle = $8K/hr.</div><div class="wf-task-owner">Owner: R. Kowalski</div></div>
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-p1">P1 · Finance</span><div class="wf-task-name">Change Order #7 Decision Overdue</div><div class="wf-task-desc">$42K CO pending 6 days past due. Approve or reject in writing before noon — GC clock is running.</div><div class="wf-task-owner">Owner: Finance / PM</div></div>
    </div>
    <div class="wf-col-footer"><span>3 tasks</span><div class="progress-bar-wrap" style="width:80px"><div class="progress-bar" style="width:0%"></div></div></div>
  </div>
  <div class="wf-col">
    <div class="wf-col-header"><span class="wf-col-title">🟡 Follow-Up</span><span class="wf-col-meta">3 items</span></div>
    <div class="wf-col-body">
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-p2">P2 · Schedule</span><div class="wf-task-name">MEP Coordination Meeting</div><div class="wf-task-desc">4 hard clashes on Level 1 drawings unresolved. Schedule eng/subcontractor coordination call this week.</div><div class="wf-task-owner">Owner: MEP Coordinator</div></div>
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-p2">P2 · Procurement</span><div class="wf-task-name">Roofing Bid Evaluation Team</div><div class="wf-task-desc">Bids close May 20. Assemble evaluation panel, confirm scoring criteria, schedule review for May 22.</div><div class="wf-task-owner">Owner: Procurement</div></div>
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-p2">P2 · Finance</span><div class="wf-task-name">Approve 3 Pending Subcontractor Invoices</div><div class="wf-task-desc">$84,200 in invoices pending approval. Review and approve to maintain vendor relationships and avoid late fees.</div><div class="wf-task-owner">Owner: Finance</div></div>
    </div>
    <div class="wf-col-footer"><span>3 tasks</span><div class="progress-bar-wrap" style="width:80px"><div class="progress-bar" style="width:0%"></div></div></div>
  </div>
  <div class="wf-col">
    <div class="wf-col-header"><span class="wf-col-title">🔵 Monitoring</span><span class="wf-col-meta">2 items</span></div>
    <div class="wf-col-body">
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-p3">Watch</span><div class="wf-task-name">Block D Permit — City Review Status</div><div class="wf-task-desc">Check permit portal for Block D foundation permit. Awaiting city review — follow up if no update by noon.</div><div class="wf-task-owner">Owner: R. Kowalski</div></div>
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-info">Report</span><div class="wf-task-name">Q2 Investor Report — Start Reconciliation</div><div class="wf-task-desc">Due June 1. Financial reconciliation not started. Assign team member and set internal deadline for May 26.</div><div class="wf-task-owner">Owner: PM / Finance</div></div>
    </div>
    <div class="wf-col-footer"><span>2 tasks</span><div class="progress-bar-wrap" style="width:80px"><div class="progress-bar" style="width:0%"></div></div></div>
  </div>
</div>
</div>

<!-- ============================================================
     TAB: EOD
     ============================================================ -->
<div class="bnca-content" id="bnca-content-eod">
<div class="wf-body">
  <div class="wf-col">
    <div class="wf-col-header"><span class="wf-col-title">✅ Verify Completion</span><span class="wf-col-meta">What got done</span></div>
    <div class="wf-col-body">
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-p1">Confirm</span><div class="wf-task-name">Steel Delivery — Gate 2 Unload Complete</div><div class="wf-task-desc">Verify all 250 tons staged, count checked, no damage claims from driver. Get delivery receipt signed.</div><div class="wf-task-owner">Owner: R. Kowalski</div></div>
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-p1">Confirm</span><div class="wf-task-name">MEP Inspector Contacted — Date Confirmed</div><div class="wf-task-desc">Verify J. Patterson confirmed inspection date. Log in project management system. Notify GC of window.</div><div class="wf-task-owner">Owner: J. Patterson</div></div>
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-p2">Confirm</span><div class="wf-task-name">CO #7 Decision Sent in Writing</div><div class="wf-task-desc">Confirm approval/rejection letter sent to GC. File in contract document system. Update budget forecast.</div><div class="wf-task-owner">Owner: PM</div></div>
    </div>
    <div class="wf-col-footer"><span>3 items to verify</span></div>
  </div>
  <div class="wf-col">
    <div class="wf-col-header"><span class="wf-col-title">📋 Log & Document</span><span class="wf-col-meta">Record keeping</span></div>
    <div class="wf-col-body">
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-p2">Log</span><div class="wf-task-name">Update Daily Site Log</div><div class="wf-task-desc">Record: manpower on site, weather, work completed, equipment on site, visitors, any incidents or near-misses.</div><div class="wf-task-owner">Owner: Superintendent</div></div>
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-p2">Log</span><div class="wf-task-name">Update RFI Tracker</div><div class="wf-task-desc">Check status on 7 open RFIs. Mark any received responses. Escalate any critical RFIs past 5-day response window.</div><div class="wf-task-owner">Owner: PM</div></div>
    </div>
    <div class="wf-col-footer"><span>2 items to log</span></div>
  </div>
  <div class="wf-col">
    <div class="wf-col-header"><span class="wf-col-title">🌅 Plan Tomorrow</span><span class="wf-col-meta">Next day prep</span></div>
    <div class="wf-col-body">
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-p3">Prep</span><div class="wf-task-name">Crew Schedule — Confirm Tomorrow's Headcount</div><div class="wf-task-desc">Verify crew assignments for all active trades. Confirm any subcontractors mobilizing tomorrow have site access badges.</div><div class="wf-task-owner">Owner: Superintendent</div></div>
      <div class="wf-task"><div class="wf-task-check"></div><span class="wf-task-badge tb-info">Review</span><div class="wf-task-name">Check Weather — Concrete Operations</div><div class="wf-task-desc">Review 48hr forecast. If rain >30%, notify concrete crew and reschedule any pours. Update affected subcontractors.</div><div class="wf-task-owner">Owner: PM</div></div>
    </div>
    <div class="wf-col-footer"><span>2 items to prep</span></div>
  </div>
</div>
</div>"""

# Inject workflow HTML and JS
if 'bnca-content-morning' in html:
    print("INFO: Workflow HTML already present — skipping")
else:
    html = html.replace('<footer>', WORKFLOW_HTML + '\n\n<footer>', 1)
    print("✓  Workflow tabs injected")

if 'bncaFireAll' in html:
    print("INFO: BNCA JS already present — skipping")
else:
    html = html.replace('</body>', BNCA_JS + '\n</body>', 1)
    print("✓  4-engine JS injected")

# Also close the browse tab div before the workflow tabs
if 'bnca-content-browse' in html and '/bnca-content-browse' not in html:
    html = html.replace('</div><!-- /bnca-content-morning -->', '</div><!-- /bnca-content-browse -->\n\n<!-- morning tab placeholder -->', 1)
    # Actually find the right spot - close browse before workflow
    import re
    # Close browse tab before first workflow div
    html = re.sub(
        r'(<!-- ============================================================\n     TAB: MORNING)',
        '</div><!-- /bnca-content-browse -->\n\n\\1',
        html, count=1
    )
    print("✓  Browse tab closed")

FILE.write_text(html)
print(f"\n✅  {FILE} patched")
