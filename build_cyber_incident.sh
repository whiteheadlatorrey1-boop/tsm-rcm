#!/usr/bin/env bash
set -euo pipefail

TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup_cyber_incident_${TS}"
mkdir -p "$BACKUP_DIR"

for f in html/plant-incident.html html/supplier-shutdown.html; do
  if [ ! -f "$f" ]; then
    echo "ERROR: $f not found, aborting"
    exit 1
  fi
  cp "$f" "$BACKUP_DIR/$(basename "$f").bak"
done

if [ -f html/cyber-incident.html ]; then
  echo "ERROR: html/cyber-incident.html already exists — refusing to overwrite. Delete it first if you want a rebuild."
  exit 1
fi

# ── 1. Create cyber-incident.html ─────────────────────────────────────────────
cat > html/cyber-incident.html << 'PAGEEOF'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TSM · Cyber/OT Incident Command Center</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#050a0f;--bg2:#0a1020;--bg3:#0d1528;
  --cyan:#00d4d4;--amber:#f5a623;--green:#22c55e;
  --red:#ef4444;--purple:#a855f7;--blue:#3b82f6;
  --orange:#f97316;--text:#e2e8f0;--muted:#64748b;--border:#1e293b;
  --accent:#a855f7;
}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--bg);color:var(--text);font-family:'Rajdhani',sans-serif;min-height:100vh;}

.topbar{height:42px;background:#020810;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 20px;}
.tb-brand{font-family:'Orbitron',sans-serif;font-size:.7rem;color:var(--accent);letter-spacing:.15em;}
.tb-stat{font-family:'JetBrains Mono',monospace;font-size:.65rem;color:var(--muted);}
.tb-stat span{color:var(--green);}
.tb-stat.crit span{color:var(--red);}
.tb-time{font-family:'Orbitron',sans-serif;font-size:.75rem;color:var(--accent);}

.alert-bar{height:32px;background:rgba(239,68,68,.08);border-bottom:1px solid rgba(239,68,68,.3);display:flex;align-items:center;padding:0 20px;gap:12px;font-family:'JetBrains Mono',monospace;font-size:.65rem;color:var(--red);animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}}
.alert-dot{width:8px;height:8px;border-radius:50%;background:var(--red);animation:blink 1s infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

.nav-tabs{display:flex;align-items:center;background:var(--bg2);border-bottom:1px solid var(--border);padding:0 20px;gap:2px;}
.nav-tab{padding:10px 18px;font-family:'Orbitron',sans-serif;font-size:.58rem;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;letter-spacing:.08em;transition:.2s;}
.nav-tab:hover{color:var(--text);}
.nav-tab.active{color:var(--accent);border-bottom-color:var(--accent);}

.main{display:grid;grid-template-columns:300px 1fr;min-height:calc(100vh - 110px);}

.sidebar{background:var(--bg2);border-right:1px solid var(--border);padding:16px;display:flex;flex-direction:column;gap:16px;}
.sb-section{font-family:'Orbitron',sans-serif;font-size:.55rem;color:var(--muted);letter-spacing:.15em;margin-bottom:8px;}
.doc-input{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:.65rem;padding:10px;resize:vertical;min-height:120px;outline:none;line-height:1.5;}
.doc-input:focus{border-color:var(--accent);}
.doc-type-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}
.doc-tag{font-size:.6rem;padding:3px 8px;border-radius:3px;border:1px solid var(--border);color:var(--muted);cursor:pointer;font-family:'JetBrains Mono',monospace;transition:.2s;}
.doc-tag.active{border-color:var(--accent);color:var(--accent);background:rgba(168,85,247,.08);}
.fire-btn{width:100%;background:var(--accent);color:#fff;border:none;border-radius:4px;padding:12px;font-family:'Orbitron',sans-serif;font-size:.65rem;letter-spacing:.1em;cursor:pointer;transition:.2s;margin-top:8px;}
.fire-btn:hover{opacity:.85;}
.fire-btn:disabled{opacity:.4;cursor:not-allowed;}

.kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.kpi{background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:10px;text-align:center;}
.kpi-val{font-family:'Orbitron',sans-serif;font-size:1.1rem;font-weight:700;color:var(--accent);}
.kpi-val.red{color:var(--red);}
.kpi-val.green{color:var(--green);}
.kpi-lbl{font-size:.58rem;color:var(--muted);margin-top:3px;font-family:'JetBrains Mono',monospace;}

.engine-status{display:flex;flex-direction:column;gap:6px;}
.eng-row{display:flex;align-items:center;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:.62rem;}
.eng-name{color:var(--muted);}
.eng-badge{padding:2px 8px;border-radius:2px;font-size:.55rem;font-weight:700;}
.eng-badge.idle{background:rgba(100,116,139,.15);color:var(--muted);}
.eng-badge.running{background:rgba(168,85,247,.15);color:var(--accent);}
.eng-badge.done{background:rgba(34,197,94,.15);color:var(--green);}

.content{padding:20px;display:flex;flex-direction:column;gap:20px;}

.incident-header{background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:6px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;}
.inc-title{font-family:'Orbitron',sans-serif;font-size:.9rem;color:var(--red);letter-spacing:.05em;}
.inc-meta{font-family:'JetBrains Mono',monospace;font-size:.62rem;color:var(--muted);}
.inc-badge{padding:4px 12px;background:rgba(239,68,68,.15);border:1px solid var(--red);border-radius:3px;font-family:'Orbitron',sans-serif;font-size:.6rem;color:var(--red);letter-spacing:.1em;}

.engines-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.engine-card{background:var(--bg2);border:1px solid var(--border);border-radius:6px;overflow:hidden;}
.eng-card-header{padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);}
.eng-card-num{font-family:'Orbitron',sans-serif;font-size:.6rem;color:var(--accent);}
.eng-card-title{font-family:'Orbitron',sans-serif;font-size:.62rem;color:var(--text);letter-spacing:.05em;}
.eng-card-status{font-size:.55rem;padding:2px 8px;border-radius:2px;font-family:'JetBrains Mono',monospace;}
.status-idle{background:rgba(100,116,139,.1);color:var(--muted);}
.status-run{background:rgba(168,85,247,.15);color:var(--accent);}
.status-done{background:rgba(34,197,94,.15);color:var(--green);}
.eng-card-body{padding:14px;font-family:'JetBrains Mono',monospace;font-size:.65rem;color:var(--muted);line-height:1.7;min-height:100px;white-space:pre-wrap;}
.eng-card-body.active{color:var(--text);}

.action-panel{background:var(--bg2);border:1px solid rgba(168,85,247,.3);border-radius:6px;padding:16px 20px;}
.action-title{font-family:'Orbitron',sans-serif;font-size:.7rem;color:var(--accent);margin-bottom:12px;letter-spacing:.08em;}
.action-list{display:flex;flex-direction:column;gap:8px;}
.action-item{display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg3);border-radius:4px;border:1px solid var(--border);}
.action-rank{font-family:'Orbitron',sans-serif;font-size:.7rem;font-weight:700;color:var(--accent);width:24px;text-align:center;flex-shrink:0;}
.action-text{flex:1;font-size:.75rem;color:var(--text);}
.action-owner{font-family:'JetBrains Mono',monospace;font-size:.6rem;color:var(--muted);}
.action-deadline{font-family:'JetBrains Mono',monospace;font-size:.6rem;color:var(--amber);}
.action-btn{padding:4px 12px;border-radius:3px;font-family:'Orbitron',sans-serif;font-size:.55rem;letter-spacing:.08em;cursor:pointer;border:none;}
.btn-authorize{background:var(--accent);color:#fff;}
.btn-escalate{background:transparent;border:1px solid var(--accent) !important;color:var(--accent);}
.btn-review{background:transparent;border:1px solid var(--amber) !important;color:var(--amber);}

.escalate-bar{display:flex;gap:12px;align-items:center;}
.esc-btn{flex:1;padding:12px;background:var(--accent);color:#fff;border:none;border-radius:4px;font-family:'Orbitron',sans-serif;font-size:.65rem;letter-spacing:.1em;cursor:pointer;transition:.2s;}
.esc-btn:hover{opacity:.85;}
.esc-btn.secondary{background:transparent;border:1px solid var(--accent);color:var(--accent);}

.statusbar{height:28px;background:#020810;border-top:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:20px;font-family:'JetBrains Mono',monospace;font-size:.6rem;color:var(--muted);position:fixed;bottom:0;left:0;right:0;}
.sb-item span{color:var(--green);}
.sb-item.warn span{color:var(--amber);}
.sb-item.crit span{color:var(--red);}
</style>
</head>
<body>

<div class="topbar">
  <div style="display:flex;align-items:center;gap:16px">
    <span class="tb-brand">🛡 TSM ENTERPRISE</span>
    <span class="tb-stat">VERTICAL <span>OT/ICS SECURITY</span></span>
    <span class="tb-stat crit">INCIDENT <span>ACTIVE</span></span>
    <span class="tb-stat">API <span>/api/war-room/stream</span></span>
  </div>
  <div style="display:flex;align-items:center;gap:16px">
    <span class="tb-time" id="clock">--:--:--</span>
  </div>
</div>

<div class="alert-bar">
  <div class="alert-dot"></div>
  CRITICAL INCIDENT ACTIVE — OT/ICS INTRUSION DETECTED — COMMAND CENTER ENGAGED — ALL ENGINES STANDBY
</div>

<div class="nav-tabs">
  <div class="nav-tab" onclick="window.location='/html/plant-incident.html'">⚡ PLANT</div>
  <div class="nav-tab" onclick="window.location='/html/supplier-shutdown.html'">📦 SUPPLIER</div>
  <div class="nav-tab active">🛡 CYBER</div>
  <div class="nav-tab">→ STRATEGIST</div>
  <div class="nav-tab">↑ EXECUTIVE</div>
</div>

<div class="main">

  <div class="sidebar">
    <div>
      <div class="sb-section">INCIDENT INTAKE</div>
      <textarea class="doc-input" id="docInput" placeholder="Paste SOC alert, IDS/IPS log, SIEM notification, or OT network anomaly report here...

Example:
Facility: Phoenix Manufacturing Plant
System: PLC network — Line 3 SCADA segment
Detection: Anomalous outbound traffic from HMI workstation 08:41 AM
Indicators: Unrecognized binary, lateral movement to engineering workstation
Status: Segment isolated, SCADA still operational on backup
Affected: 1 HMI, 1 engineering workstation, network segment B3"></textarea>
      <div class="doc-type-row">
        <div class="doc-tag active" onclick="setDocType(this,'ot_intrusion')">OT Intrusion</div>
        <div class="doc-tag" onclick="setDocType(this,'siem_alert')">SIEM Alert</div>
        <div class="doc-tag" onclick="setDocType(this,'ids_log')">IDS/IPS Log</div>
        <div class="doc-tag" onclick="setDocType(this,'soc_report')">SOC Report</div>
      </div>
      <button class="fire-btn" id="fireBtn" onclick="fireAllEngines()">🛡 FIRE ALL 6 ENGINES</button>
    </div>

    <div>
      <div class="sb-section">LIVE KPIs</div>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-val red" id="kpiRisk">—</div><div class="kpi-lbl">RISK SCORE</div></div>
        <div class="kpi"><div class="kpi-val red" id="kpiExposure">—</div><div class="kpi-lbl">$ EXPOSURE</div></div>
        <div class="kpi"><div class="kpi-val" id="kpiDowntime">—</div><div class="kpi-lbl">CONTAINMENT ETA</div></div>
        <div class="kpi"><div class="kpi-val" id="kpiEngines">0/6</div><div class="kpi-lbl">ENGINES</div></div>
      </div>
    </div>

    <div>
      <div class="sb-section">ENGINE STATUS</div>
      <div class="engine-status">
        <div class="eng-row"><span class="eng-name">01 · Incident Intel</span><span class="eng-badge idle" id="es0">IDLE</span></div>
        <div class="eng-row"><span class="eng-name">02 · Operational Impact</span><span class="eng-badge idle" id="es1">IDLE</span></div>
        <div class="eng-row"><span class="eng-name">03 · Attack Vector</span><span class="eng-badge idle" id="es2">IDLE</span></div>
        <div class="eng-row"><span class="eng-name">04 · Exposure Calc</span><span class="eng-badge idle" id="es3">IDLE</span></div>
        <div class="eng-row"><span class="eng-name">05 · Containment Plan</span><span class="eng-badge idle" id="es4">IDLE</span></div>
        <div class="eng-row"><span class="eng-name">06 · Exec Dispatch</span><span class="eng-badge idle" id="es5">IDLE</span></div>
      </div>
    </div>
  </div>

  <div class="content">

    <div class="incident-header">
      <div>
        <div class="inc-title" id="incTitle">⚠ AWAITING INCIDENT REPORT</div>
        <div class="inc-meta" id="incMeta">Paste incident data and fire engines to begin command center analysis</div>
      </div>
      <div class="inc-badge" id="incBadge">STANDBY</div>
    </div>

    <div class="engines-grid">
      <div class="engine-card">
        <div class="eng-card-header">
          <span class="eng-card-num">ENGINE 01</span>
          <span class="eng-card-title">INCIDENT INTELLIGENCE</span>
          <span class="eng-card-status status-idle" id="ec0">IDLE</span>
        </div>
        <div class="eng-card-body" id="eo0">Awaiting incident report — paste SOC alerts, IDS logs, or SCADA/PLC anomaly notes to begin.</div>
      </div>
      <div class="engine-card">
        <div class="eng-card-header">
          <span class="eng-card-num">ENGINE 02</span>
          <span class="eng-card-title">OPERATIONAL &amp; SAFETY IMPACT</span>
          <span class="eng-card-status status-idle" id="ec1">IDLE</span>
        </div>
        <div class="eng-card-body" id="eo1">Operational impact engine will assess affected systems, safety exposure, and production continuity risk.</div>
      </div>
      <div class="engine-card">
        <div class="eng-card-header">
          <span class="eng-card-num">ENGINE 03</span>
          <span class="eng-card-title">ATTACK VECTOR &amp; ROOT CAUSE</span>
          <span class="eng-card-status status-idle" id="ec2">IDLE</span>
        </div>
        <div class="eng-card-body" id="eo2">Attack vector engine will identify probable entry point, lateral movement path, and exploited vulnerability.</div>
      </div>
      <div class="engine-card">
        <div class="eng-card-header">
          <span class="eng-card-num">ENGINE 04</span>
          <span class="eng-card-title">FINANCIAL EXPOSURE</span>
          <span class="eng-card-status status-idle" id="ec3">IDLE</span>
        </div>
        <div class="eng-card-body" id="eo3">Financial exposure engine will calculate incident response cost, downtime cost, and regulatory/notification exposure.</div>
      </div>
      <div class="engine-card">
        <div class="eng-card-header">
          <span class="eng-card-num">ENGINE 05</span>
          <span class="eng-card-title">CONTAINMENT &amp; ACTION PLAN</span>
          <span class="eng-card-status status-idle" id="ec4">IDLE</span>
        </div>
        <div class="eng-card-body" id="eo4">Containment plan engine will generate ranked response steps with owners, timelines, and isolation actions.</div>
      </div>
      <div class="engine-card">
        <div class="eng-card-header">
          <span class="eng-card-num">ENGINE 06</span>
          <span class="eng-card-title">EXECUTIVE DISPATCH</span>
          <span class="eng-card-status status-idle" id="ec5">IDLE</span>
        </div>
        <div class="eng-card-body" id="eo5">Executive dispatch will package ranked decisions with owners and deadlines for C-suite authorization.</div>
      </div>
    </div>

    <div class="action-panel" id="actionPanel" style="display:none">
      <div class="action-title">🛡 RANKED EXECUTIVE DECISIONS — AUTHORIZATION REQUIRED</div>
      <div class="action-list" id="actionList"></div>
    </div>

    <div class="escalate-bar">
      <button class="esc-btn" id="escalateBtn" onclick="escalateToStrategist()" disabled>🛡 ESCALATE TO OPERATIONS STRATEGIST →</button>
      <button class="esc-btn secondary" onclick="exportReport()">↓ EXPORT INCIDENT REPORT</button>
    </div>

  </div>
</div>

<div class="statusbar">
  <span class="sb-item">TSM · Cyber/OT Incident Command Center</span>
  <span class="sb-item crit">INCIDENT <span>ACTIVE</span></span>
  <span class="sb-item">ENGINES <span id="sbEngines">0 / 6</span></span>
  <span class="sb-item">MODEL <span>openai/gpt-oss-120b</span></span>
  <span class="sb-item" style="margin-left:auto">TSM OS v4.1 · Fly.io</span>
</div>

<script>
function tick() { document.getElementById('clock').textContent = new Date().toLocaleTimeString(); }
setInterval(tick, 1000); tick();

let docType = 'ot_intrusion';
let enginesComplete = 0;
let sessionData = { outputs: [], docText: '', timestamp: null };

function setDocType(el, type) {
  document.querySelectorAll('.doc-tag').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  docType = type;
}

function getPrompts(doc) {
  const base = `You are an OT/ICS cybersecurity intelligence engine for TSM Command. Analyze this industrial control system security incident with precision. Focus on operational/safety impact, attack vector, financial exposure, and ranked executive actions. Be specific with numbers and timelines.\n\nINCIDENT REPORT:\n${doc}\n\n`;
  return [
    base + `ENGINE 01 — INCIDENT INTELLIGENCE\nExtract and structure:\n▸ INCIDENT TYPE — intrusion, malware, unauthorized access, anomalous traffic, etc.\n▸ AFFECTED SYSTEMS — specific OT/ICS assets, network segments, IT/OT boundary points impacted\n▸ DETECTION TIME — when was it caught, how (SIEM, IDS, manual)\n▸ CURRENT STATUS — isolated, contained, active, unknown scope\n▸ KEY PARTIES — SOC, OT engineering, IT security, plant operations involved\nBe specific. Extract all facts from the document.`,

    base + `ENGINE 02 — OPERATIONAL & SAFETY IMPACT ANALYSIS\nCalculate and structure:\n▸ SAFETY RISK — any risk to physical safety systems, interlocks, or personnel\n▸ PRODUCTION IMPACT — systems taken offline, capacity loss, manual fallback in use\n▸ SCOPE OF COMPROMISE — confirmed vs. suspected affected systems\n▸ CONTAINMENT STATUS — segments isolated, systems quarantined\n▸ BUSINESS CONTINUITY RISK — how close to full operational disruption\n▸ OPERATIONAL IMPACT SCORE — 1-10 severity\nQuantify everything with specific numbers where possible.`,

    base + `ENGINE 03 — ATTACK VECTOR & ROOT CAUSE ANALYSIS\nAnalyze and structure:\n▸ PROBABLE ENTRY POINT — phishing, remote access, supply chain, physical access, IT/OT boundary gap\n▸ LATERAL MOVEMENT PATH — how the threat moved between systems\n▸ EXPLOITED VULNERABILITY — unpatched system, weak segmentation, credential compromise, etc.\n▸ DETECTION GAPS — why was this not caught earlier\n▸ ATTRIBUTION CONFIDENCE — opportunistic vs. targeted, any indicators of actor sophistication\n▸ SIMILAR ASSETS AT RISK — other systems that may share the same vulnerability\nBe direct about probable causes even with limited data.`,

    base + `ENGINE 04 — FINANCIAL EXPOSURE CALCULATION\nCalculate and structure:\n▸ INCIDENT RESPONSE COST — forensics, remediation, external IR firm engagement\n▸ DOWNTIME COST — $/hour or $/day of lost production from isolation/containment\n▸ REGULATORY EXPOSURE — breach notification obligations, potential fines\n▸ CUSTOMER/CONTRACT IMPACT — SLA penalties, reputational cost, contract risk\n▸ CYBER INSURANCE APPLICABILITY — what losses may be recoverable\n▸ TOTAL FINANCIAL RISK — combined exposure range\nProvide dollar amounts. Estimate if exact figures not available.`,

    base + `ENGINE 05 — RANKED CONTAINMENT & ACTION PLAN\nGenerate ranked response with owners and deadlines:\n1. IMMEDIATE (0-2 hours) — isolation, containment, evidence preservation\n2. SHORT-TERM (2-24 hours) — forensic investigation, credential rotation, patch/mitigate\n3. MEDIUM-TERM (1-7 days) — full remediation, system restoration, validation\n4. PREVENTIVE — segmentation improvements, monitoring gaps to close\n\nFor each action include: OWNER · DEADLINE · ESTIMATED COST · EXPECTED OUTCOME\nRank by urgency and impact.`,

    base + `ENGINE 06 — EXECUTIVE DISPATCH\nGenerate executive decision package:\n▸ INCIDENT SUMMARY — 2 sentences for C-suite\n▸ FINANCIAL IMPACT — total exposure in dollars\n▸ DECISIONS REQUIRED — ranked list with AUTHORIZE/ESCALATE/REVIEW labels\n  1. [Decision] · Owner: [role] · Deadline: [timeframe] · Cost: $[amount]\n  2. [Decision] · Owner: [role] · Deadline: [timeframe]\n  3. [Decision] · Owner: [role] · Deadline: [timeframe]\n▸ BNCA — Best Next Course of Action in one clear sentence\n▸ ESCALATION TRIGGER — what would require CEO/Board/regulator notification\nThis goes directly to the executive team. Be decisive.`
  ];
}

async function fireAllEngines() {
  const doc = document.getElementById('docInput').value.trim();
  if (!doc) { alert('Paste an incident report first.'); return; }

  enginesComplete = 0;
  sessionData = { outputs: [], docText: doc, timestamp: new Date().toISOString(), docType };
  document.getElementById('fireBtn').disabled = true;
  document.getElementById('escalateBtn').disabled = true;
  document.getElementById('actionPanel').style.display = 'none';

  document.getElementById('incTitle').textContent = '🛡 INCIDENT ANALYSIS IN PROGRESS';
  document.getElementById('incMeta').textContent = `Doc type: ${docType} · ${doc.length} chars · ${new Date().toLocaleTimeString()}`;
  document.getElementById('incBadge').textContent = 'ANALYZING';

  const prompts = getPrompts(doc);

  for (let i = 0; i < prompts.length; i++) {
    setEngineStatus(i, 'running');
    try {
      const text = await callAPI(prompts[i]);
      document.getElementById(`eo${i}`).textContent = text;
      document.getElementById(`eo${i}`).classList.add('active');
      setEngineStatus(i, 'done');
      enginesComplete++;
      document.getElementById('kpiEngines').textContent = `${enginesComplete}/6`;
      document.getElementById('sbEngines').textContent = `${enginesComplete} / 6`;
      sessionData.outputs.push({ engine: i + 1, title: ['Incident Intel','Operational Impact','Attack Vector','Financial Exposure','Containment Plan','Exec Dispatch'][i], text });

      if (i === 3) extractFinancialKPI(text);
      if (i === 1) extractDowntimeKPI(text);
      if (i === 5) { buildActionPanel(text); buildRiskKPI(text); }
    } catch(e) {
      document.getElementById(`eo${i}`).textContent = `Engine ${i+1} error: ${e.message}`;
      setEngineStatus(i, 'idle');
    }
  }

  document.getElementById('incTitle').textContent = '✓ 6-ENGINE ANALYSIS COMPLETE — CYBER/OT INCIDENT';
  document.getElementById('incBadge').textContent = 'COMPLETE';
  document.getElementById('incBadge').style.borderColor = '#22c55e';
  document.getElementById('incBadge').style.color = '#22c55e';
  document.getElementById('fireBtn').disabled = false;
  document.getElementById('escalateBtn').disabled = false;

  const relay = JSON.stringify(sessionData);
  localStorage.setItem('TSM_HONEYWELL_RELAY', relay);
  sessionStorage.setItem('TSM_HONEYWELL_RELAY', relay);
}

function setEngineStatus(i, status) {
  const badge = document.getElementById(`es${i}`);
  const card  = document.getElementById(`ec${i}`);
  const cls   = status === 'running' ? 'running' : status === 'done' ? 'done' : 'idle';
  const lbl   = status === 'running' ? 'RUNNING' : status === 'done' ? 'COMPLETE ✓' : 'IDLE';
  badge.className = `eng-badge ${cls}`;
  badge.textContent = lbl;
  card.className = `eng-card-status status-${status === 'done' ? 'done' : status === 'running' ? 'run' : 'idle'}`;
  card.textContent = lbl;
}

function extractFinancialKPI(text) {
  const m = text.match(/\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?/);
  if (m) document.getElementById('kpiExposure').textContent = m[0].slice(0,16);
}

function extractDowntimeKPI(text) {
  const m = text.match(/(\d+[-–]\d+\s*hours?|\d+\s*hours?|\d+\s*days?)/i);
  if (m) document.getElementById('kpiDowntime').textContent = m[0];
}

function buildRiskKPI(text) {
  const m = text.match(/(\d{2,3})\/100|RISK[:\s]+(\d{2,3})/i);
  if (m) document.getElementById('kpiRisk').textContent = (m[1]||m[2]) + '/100';
  else document.getElementById('kpiRisk').textContent = 'HIGH';
}

function buildActionPanel(text) {
  const panel = document.getElementById('actionPanel');
  const list  = document.getElementById('actionList');
  panel.style.display = 'block';

  const actions = [
    { rank: 1, label: 'AUTHORIZE', text: 'Emergency network isolation — segment affected OT assets and engage incident response team immediately', owner: 'CISO / OT Security Lead', deadline: '0–2 hrs' },
    { rank: 2, label: 'ESCALATE', text: 'Engage external forensics/IR firm — preserve evidence and determine scope of compromise', owner: 'CISO', deadline: '2–6 hrs' },
    { rank: 3, label: 'REVIEW', text: 'Assess regulatory/customer notification obligations — legal and compliance review of breach disclosure requirements', owner: 'Legal / Compliance', deadline: '4–12 hrs' },
    { rank: 4, label: 'AUTHORIZE', text: 'Rotate credentials and patch exploited vulnerability across similar assets', owner: 'IT/OT Security', deadline: '2–8 hrs' },
  ];

  list.innerHTML = actions.map(a => `
    <div class="action-item">
      <div class="action-rank">${a.rank}</div>
      <div style="flex:1">
        <div class="action-text">${a.text}</div>
        <div style="display:flex;gap:16px;margin-top:4px">
          <span class="action-owner">OWNER: ${a.owner}</span>
          <span class="action-deadline">DEADLINE: ${a.deadline}</span>
        </div>
      </div>
      <button class="action-btn btn-${a.label.toLowerCase()}">${a.label}</button>
    </div>
  `).join('');
}

async function callAPI(prompt) {
  const res = await fetch('/api/war-room/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_tokens: 800,
      messages: [
        { role: 'system', content: 'You are an OT/ICS cybersecurity intelligence engine for TSM Command. Expert in industrial control system security, attack analysis, operational/safety impact, and executive decision support. Be specific with dollar amounts and timelines.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (res.headers.get('content-type')?.includes('text/event-stream')) {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let out = '';
    while(true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value).split('\n')) {
        if (line.startsWith('data: ')) {
          const d = line.slice(6);
          if (d === '[DONE]') continue;
          try { out += JSON.parse(d).choices?.[0]?.delta?.content || ''; } catch(e) {}
        }
      }
    }
    return out;
  }
  const data = await res.json();
  return data.output || data.answer || data.choices?.[0]?.message?.content || '';
}

function escalateToStrategist() {
  localStorage.setItem('TSM_HONEYWELL_RELAY', JSON.stringify(sessionData));
  sessionStorage.setItem('TSM_HONEYWELL_RELAY', JSON.stringify(sessionData));
  alert('Relay packaged — navigate to Operations Strategist to continue the chain.');
}

function exportReport() {
  if (!sessionData.outputs.length) { alert('Run analysis first.'); return; }
  const text = sessionData.outputs.map(o => `=== ENGINE ${o.engine}: ${o.title} ===\n\n${o.text}`).join('\n\n' + '─'.repeat(60) + '\n\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `TSM-Cyber-Incident-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
}
</script>
</body>
</html>
PAGEEOF

echo "Created html/cyber-incident.html"

# ── 2. Re-enable CYBER tab on plant-incident.html and supplier-shutdown.html ──
sed -i \
  's#<div class="nav-tab" style="opacity:0.4;cursor:not-allowed" title="Coming soon">🛡 CYBER</div>#<div class="nav-tab" onclick="window.location='"'"'/html/cyber-incident.html'"'"'">🛡 CYBER</div>#' \
  html/plant-incident.html html/supplier-shutdown.html

echo "--- Diff: plant-incident.html ---"
diff "$BACKUP_DIR/plant-incident.html.bak" html/plant-incident.html || true
echo "--- Diff: supplier-shutdown.html ---"
diff "$BACKUP_DIR/supplier-shutdown.html.bak" html/supplier-shutdown.html || true

echo ""
echo "Backups saved to $BACKUP_DIR."
echo "New file: html/cyber-incident.html"
echo "Review diffs above, then test locally before committing."