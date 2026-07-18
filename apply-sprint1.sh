#!/usr/bin/env bash
set -e
echo "Locating repo root..."
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo /workspaces/TSM-Consultz-)"
echo "Working in: $(pwd)"
git checkout -B feat/enterprise-lab-sprint1
mkdir -p server/enterprise-lab

cat > server/enterprise-lab/incident-engine.js << 'ENDOFFILE1'
'use strict';

/**
 * TSM Enterprise Lab — Incident Engine
 *
 * Self-contained, in-memory simulator that generates realistic IT support
 * incidents and tracks them through a mission queue. This is intentionally
 * separate from tsm-mission-engine.js (which models business-vertical
 * missions for construction/healthcare/etc): this engine models IT
 * operations — devices, categories, SLAs — for the L1/NOC/VMware copilots.
 *
 * Sprint 1 scope:
 *   - Incident generation (random + on-demand "inject")
 *   - Mission queue with priority + SLA countdown
 *   - Simple lifecycle: created -> assigned -> working -> resolved
 *   - Daily benchmark stats (Phase 10 style)
 *
 * Everything here is in-memory and resets on server restart. This is a
 * simulation/demo engine, not a system of record.
 */

const CATEGORIES = [
  { type: 'Dell Laptop', issues: ['No Power', 'BSOD', 'Battery Not Charging', 'Screen Flicker'], dept: 'any' },
  { type: 'Desktop', issues: ['No Power', 'Blue Screen', 'Slow Performance'], dept: 'any' },
  { type: 'Printer', issues: ['Offline', 'Paper Jam', 'Toner Low', 'Driver Error'], dept: 'any' },
  { type: 'VPN', issues: ['Authentication Failure', 'Connection Drops', 'Slow Throughput'], dept: 'any' },
  { type: 'Network', issues: ['DNS Failure', 'DHCP Exhaustion', 'VLAN Misconfiguration', 'Switch Port Down'], dept: 'any' },
  { type: 'VMware', issues: ['Host Failure', 'Datastore Full', 'Snapshot Error', 'HA Event'], dept: 'Data Center' },
  { type: 'Active Directory', issues: ['Account Locked', 'Password Reset', 'Group Policy Error'], dept: 'any' },
  { type: 'Microsoft 365', issues: ['Mailbox Full', 'Outlook Sync Error', 'Teams Not Loading'], dept: 'any' },
  { type: 'SCADA', issues: ['Sensor Offline', 'PLC Comm Failure'], dept: 'Manufacturing' },
];

const SITES = [
  { name: 'Phoenix HQ', dept: ['Finance', 'Sales', 'Engineering', 'HR', 'Legal', 'IT'] },
  { name: 'Denver Branch', dept: ['Sales', 'Support'] },
  { name: 'Plant 1 (Manufacturing)', dept: ['Manufacturing', 'Operations'] },
  { name: 'Remote/Home Office', dept: ['Any'] },
];

const PRIORITY_WEIGHTS = [
  { priority: 'P1', weight: 5, slaMinutes: 15 },
  { priority: 'P2', weight: 15, slaMinutes: 60 },
  { priority: 'P3', weight: 40, slaMinutes: 240 },
  { priority: 'P4', weight: 40, slaMinutes: 480 },
];

const STATUSES = ['new', 'assigned', 'working', 'waiting_user', 'resolved', 'escalated'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function pickWeighted(weighted) {
  const total = weighted.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of weighted) {
    if (r < w.weight) return w;
    r -= w.weight;
  }
  return weighted[weighted.length - 1];
}

function uid(prefix) {
  return `${prefix}${Math.floor(1000000 + Math.random() * 8999999)}`;
}

class IncidentEngine {
  constructor() {
    this.missions = new Map();
    this.stats = {
      created: 0,
      resolved: 0,
      escalated: 0,
      falseEscalations: 0,
      aiDiagnosisHits: 0,
      knowledgeUsed: 0,
      resolutionTimesMs: [],
    };
    this._timer = null;
  }

  // ── Incident creation ────────────────────────────────────────────────
  createIncident(overrides = {}) {
    const category = overrides.category
      ? CATEGORIES.find(c => c.type === overrides.category) || pick(CATEGORIES)
      : pick(CATEGORIES);
    const issue = overrides.issue || pick(category.issues);
    const site = pick(SITES);
    const dept = category.dept === 'any' ? pick(site.dept) : category.dept;
    const priorityInfo = overrides.priority
      ? PRIORITY_WEIGHTS.find(p => p.priority === overrides.priority) || pickWeighted(PRIORITY_WEIGHTS)
      : pickWeighted(PRIORITY_WEIGHTS);

    const now = Date.now();
    const mission = {
      id: uid('INC00'),
      device: category.type,
      issue,
      site: site.name,
      dept,
      priority: priorityInfo.priority,
      slaMinutes: priorityInfo.slaMinutes,
      slaDeadline: now + priorityInfo.slaMinutes * 60 * 1000,
      status: 'new',
      assignee: null,
      aiConfidence: null,
      aiSuggestion: null,
      businessImpact: priorityInfo.priority === 'P1' ? 'High' : priorityInfo.priority === 'P2' ? 'Medium' : 'Low',
      createdAt: now,
      updatedAt: now,
      history: [{ ts: now, event: 'created' }],
    };

    this.missions.set(mission.id, mission);
    this.stats.created += 1;
    return mission;
  }

  // ── Lifecycle transitions ────────────────────────────────────────────
  advance(id, status, patch = {}) {
    const m = this.missions.get(id);
    if (!m) return null;
    if (!STATUSES.includes(status)) return m;

    m.status = status;
    m.updatedAt = Date.now();
    Object.assign(m, patch);
    m.history.push({ ts: m.updatedAt, event: status });

    if (status === 'resolved') {
      this.stats.resolved += 1;
      this.stats.resolutionTimesMs.push(m.updatedAt - m.createdAt);
    }
    if (status === 'escalated') {
      this.stats.escalated += 1;
    }
    return m;
  }

  aiAnalyze(id) {
    const m = this.missions.get(id);
    if (!m) return null;
    // Simulated AI diagnosis: higher confidence for well-known categories.
    const confidence = Math.round(70 + Math.random() * 29);
    const suggestions = {
      'Dell Laptop': 'Run hardware diagnostics; check battery health and power adapter.',
      'Desktop': 'Check event logs for driver crash; reseat RAM if BSOD recurring.',
      'Printer': 'Restart print spooler; verify toner and paper tray sensors.',
      'VPN': 'Reset user MFA token; check VPN gateway session limits.',
      'Network': 'Check DHCP scope utilization and DNS forwarder health.',
      'VMware': 'Check host connectivity to vCenter and datastore capacity.',
      'Active Directory': 'Verify replication status and unlock via ADUC.',
      'Microsoft 365': 'Check mailbox quota and run Outlook profile repair.',
      'SCADA': 'Check PLC network segment and sensor power supply.',
    };
    m.aiConfidence = confidence;
    m.aiSuggestion = suggestions[m.device] || 'Gather logs and escalate to tier 2.';
    m.updatedAt = Date.now();
    m.history.push({ ts: m.updatedAt, event: 'ai_analysis', confidence });
    this.stats.aiDiagnosisHits += 1;
    if (Math.random() < 0.72) this.stats.knowledgeUsed += 1;
    return m;
  }

  // ── Queries ───────────────────────────────────────────────────────────
  list({ status, priority, limit } = {}) {
    let items = Array.from(this.missions.values());
    if (status) items = items.filter(m => m.status === status);
    if (priority) items = items.filter(m => m.priority === priority);
    items.sort((a, b) => a.slaDeadline - b.slaDeadline);
    if (limit) items = items.slice(0, limit);
    return items;
  }

  get(id) {
    return this.missions.get(id) || null;
  }

  benchmark() {
    const avgMs = this.stats.resolutionTimesMs.length
      ? this.stats.resolutionTimesMs.reduce((a, b) => a + b, 0) / this.stats.resolutionTimesMs.length
      : 0;
    const total = this.stats.created || 1;
    return {
      tickets: this.stats.created,
      resolved: this.stats.resolved,
      aiDiagnosisPct: Math.round((this.stats.aiDiagnosisHits / total) * 100),
      avgResolutionMinutes: Math.round(avgMs / 60000),
      escalations: this.stats.escalated,
      falseEscalations: this.stats.falseEscalations,
      slaPct: Math.round(
        (1 - this.stats.escalated / total) * 100
      ),
      knowledgeUsedPct: Math.round((this.stats.knowledgeUsed / total) * 100),
      automationPct: Math.round((this.stats.resolved / total) * 38 + 10) > 100 ? 100 : Math.round((this.stats.resolved / total) * 38 + 10),
    };
  }

  // ── Auto-generation loop ─────────────────────────────────────────────
  start(intervalMs = 8000) {
    if (this._timer) return;
    this._timer = setInterval(() => {
      // keep the queue from growing unbounded in a long-running demo
      const open = this.list({}).filter(m => m.status !== 'resolved');
      if (open.length < 40) this.createIncident();
    }, intervalMs);
    if (this._timer.unref) this._timer.unref();
  }

  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  reset() {
    this.missions.clear();
    this.stats = {
      created: 0, resolved: 0, escalated: 0, falseEscalations: 0,
      aiDiagnosisHits: 0, knowledgeUsed: 0, resolutionTimesMs: [],
    };
  }
}

// Singleton — one simulated enterprise per server process.
const engine = new IncidentEngine();
// Seed a handful of incidents so the dashboard isn't empty on first load.
for (let i = 0; i < 8; i++) engine.createIncident();
engine.start();

module.exports = { engine, IncidentEngine, CATEGORIES, SITES };
ENDOFFILE1

cat > server/enterprise-lab/api.js << 'ENDOFFILE2'
'use strict';

const express = require('express');
const router = express.Router();
const { engine, CATEGORIES } = require('./incident-engine');

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'TSM Enterprise Lab' });
});

// List missions in the queue, sorted by SLA urgency.
router.get('/missions', (req, res) => {
  const { status, priority, limit } = req.query;
  const items = engine.list({
    status,
    priority,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  res.json({ ok: true, count: items.length, missions: items });
});

router.get('/missions/:id', (req, res) => {
  const m = engine.get(req.params.id);
  if (!m) return res.status(404).json({ ok: false, error: 'Mission not found' });
  res.json({ ok: true, mission: m });
});

// Manually inject an incident (Chaos Engine button).
router.post('/incidents/generate', (req, res) => {
  const { category, priority, issue } = req.body || {};
  const mission = engine.createIncident({ category, priority, issue });
  res.json({ ok: true, mission });
});

router.get('/incidents/categories', (req, res) => {
  res.json({ ok: true, categories: CATEGORIES.map(c => c.type) });
});

// Advance a mission through its lifecycle.
router.post('/missions/:id/advance', (req, res) => {
  const { status, ...patch } = req.body || {};
  const m = engine.advance(req.params.id, status, patch);
  if (!m) return res.status(404).json({ ok: false, error: 'Mission not found or invalid status' });
  res.json({ ok: true, mission: m });
});

// Trigger simulated AI analysis on a mission.
router.post('/missions/:id/ai-analyze', (req, res) => {
  const m = engine.aiAnalyze(req.params.id);
  if (!m) return res.status(404).json({ ok: false, error: 'Mission not found' });
  res.json({ ok: true, mission: m });
});

// Sprint benchmark stats (Phase 10).
router.get('/benchmark', (req, res) => {
  res.json({ ok: true, benchmark: engine.benchmark() });
});

router.post('/reset', (req, res) => {
  engine.reset();
  for (let i = 0; i < 8; i++) engine.createIncident();
  res.json({ ok: true });
});

module.exports = router;
ENDOFFILE2

cat > html/enterprise-command-center.html << 'ENDOFFILE3'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TSM Enterprise Command Center</title>
<style>
:root {
  --bg:#0a0e12;--bg2:#0d1216;--bg3:#11161b;
  --border:rgba(0,229,255,.14);
  --cyan:#00e5ff;--cyan-dim:rgba(0,229,255,.6);
  --green:#00ff50;--gold:#ffd700;--red:#ff3b3b;--amber:#ff9500;--purple:#c084fc;
  --text:#c9d6dc;--text-dim:#5a7684;--card:#0d1418;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:'Courier New',monospace;font-size:12px;min-height:100vh}
a{color:var(--cyan)}

.nav{display:flex;align-items:center;gap:0;background:#080b0e;border-bottom:1px solid var(--border);height:38px;padding:0 16px}
.nav-brand{color:var(--cyan);font-weight:700;font-size:11px;letter-spacing:2px;margin-right:24px}
.nav-links{display:flex;gap:16px;font-size:10px;letter-spacing:1px}
.nav-links a{color:var(--text-dim);text-decoration:none}
.nav-links a:hover{color:var(--cyan)}
.nav-right{margin-left:auto;display:flex;align-items:center;gap:16px;color:var(--text-dim);font-size:10px}
.nav-clock{color:var(--cyan-dim)}

.stats-strip{display:grid;grid-template-columns:repeat(8,1fr);gap:0;background:var(--bg2);border-bottom:1px solid var(--border)}
.stat{padding:10px 14px;border-right:1px solid var(--border)}
.stat-label{font-size:8px;letter-spacing:1px;color:var(--text-dim);text-transform:uppercase}
.stat-val{font-size:16px;font-weight:700;color:var(--cyan);margin-top:3px}

.layout{display:grid;grid-template-columns:1fr 360px;gap:16px;padding:18px 22px}
.card{background:var(--card);border:1px solid var(--border)}
.card-head{padding:10px 14px;border-bottom:1px solid var(--border);font-size:10px;letter-spacing:1.5px;color:var(--text-dim);display:flex;justify-content:space-between;align-items:center}
.card-body{padding:14px}

.wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.ticket{border:1px solid var(--border);padding:10px;background:var(--bg3);cursor:pointer;transition:border-color .15s}
.ticket:hover{border-color:var(--cyan)}
.ticket-id{font-size:9px;color:var(--text-dim);letter-spacing:1px}
.ticket-title{font-size:12px;color:var(--text);margin:4px 0;font-weight:700}
.ticket-meta{font-size:9px;color:var(--text-dim)}
.badge{display:inline-block;font-size:8px;letter-spacing:1px;padding:2px 6px;border-radius:2px;font-weight:700;margin-right:4px}
.p-P1{background:rgba(255,59,59,.15);color:var(--red);border:1px solid var(--red)}
.p-P2{background:rgba(255,149,0,.15);color:var(--amber);border:1px solid var(--amber)}
.p-P3{background:rgba(0,229,255,.1);color:var(--cyan);border:1px solid var(--cyan-dim)}
.p-P4{background:rgba(90,118,132,.15);color:var(--text-dim);border:1px solid var(--text-dim)}
.sla{font-size:9px;margin-top:6px;font-weight:700}
.sla.ok{color:var(--green)}
.sla.warn{color:var(--amber)}
.sla.over{color:var(--red)}

.mission-item{border-bottom:1px solid var(--border);padding:10px 14px;font-size:10px}
.mission-item:last-child{border-bottom:none}
.mission-top{display:flex;justify-content:space-between;color:var(--text-dim)}
.mission-status{text-transform:uppercase;letter-spacing:1px;font-size:8px}

.chaos-btns{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.btn{border:1px solid;font-family:inherit;font-size:9px;letter-spacing:1.5px;cursor:pointer;padding:8px 10px;transition:all .2s;background:transparent}
.btn-cyan{background:var(--cyan);border-color:var(--cyan);color:#000;font-weight:700}
.btn-cyan:hover{background:#00c4d6}
.btn-outline{border-color:var(--cyan);color:var(--cyan)}
.btn-outline:hover{background:rgba(0,229,255,.08)}
.btn-ghost{border-color:var(--border);color:var(--text-dim)}
.btn-ghost:hover{border-color:var(--text-dim);color:var(--text)}

.footer-note{padding:10px 22px;color:var(--text-dim);font-size:9px;border-top:1px solid var(--border)}
</style>
</head>
<body>

<div class="nav">
  <div class="nav-brand">TSM ENTERPRISE COMMAND CENTER</div>
  <div class="nav-links">
    <a href="/l1-copilot/l1-ticket-copilot.html">L1 Ticket Copilot</a>
    <a href="/l1-copilot/vmware-copilot.html">VMware SME</a>
    <a href="/war-rooms/noc/noc-war-room.html">NOC Command</a>
  </div>
  <div class="nav-right">
    <span id="clock" class="nav-clock"></span>
    <span id="engineStatus">● SIMULATOR LIVE</span>
  </div>
</div>

<div class="stats-strip" id="statsStrip">
  <!-- populated by JS -->
</div>

<div class="layout">
  <div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-head">
        <span>SERVICE DESK WALL — OPEN TICKETS</span>
        <span id="wallCount" style="color:var(--cyan)"></span>
      </div>
      <div class="card-body">
        <div class="wall" id="wall"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span>AI CHAOS ENGINE — INJECT INCIDENT</span></div>
      <div class="card-body">
        <div class="chaos-btns" id="chaosBtns"></div>
      </div>
    </div>
  </div>

  <div>
    <div class="card">
      <div class="card-head">
        <span>LIVE MISSION QUEUE</span>
        <span style="color:var(--cyan-dim);font-size:8px">SLA-SORTED</span>
      </div>
      <div id="missionQueue"></div>
    </div>
  </div>
</div>

<div class="footer-note" id="footerNote">Simulated enterprise environment — no real infrastructure. Data resets on server restart.</div>

<script>
const API = '/api/enterprise-lab';
let categories = [];

function fmtClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}
setInterval(fmtClock, 1000); fmtClock();

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  return res.json();
}

function slaClass(deadline) {
  const remaining = deadline - Date.now();
  if (remaining < 0) return 'over';
  if (remaining < 5 * 60 * 1000) return 'warn';
  return 'ok';
}

function slaText(deadline) {
  const remaining = deadline - Date.now();
  const mins = Math.round(Math.abs(remaining) / 60000);
  return remaining < 0 ? `SLA BREACHED ${mins}m ago` : `${mins}m to SLA`;
}

async function renderStats() {
  const { benchmark } = await fetchJSON(`${API}/benchmark`);
  const items = [
    ['Tickets', benchmark.tickets],
    ['Resolved', benchmark.resolved],
    ['AI Diagnosis', benchmark.aiDiagnosisPct + '%'],
    ['Avg Resolution', benchmark.avgResolutionMinutes + 'm'],
    ['Escalations', benchmark.escalations],
    ['SLA', benchmark.slaPct + '%'],
    ['Knowledge Used', benchmark.knowledgeUsedPct + '%'],
    ['Automation', benchmark.automationPct + '%'],
  ];
  document.getElementById('statsStrip').innerHTML = items.map(([label, val]) => `
    <div class="stat">
      <div class="stat-label">${label}</div>
      <div class="stat-val">${val}</div>
    </div>
  `).join('');
}

async function renderWallAndQueue() {
  const { missions } = await fetchJSON(`${API}/missions?limit=60`);
  const open = missions.filter(m => m.status !== 'resolved');

  document.getElementById('wallCount').textContent = open.length + ' open';
  document.getElementById('wall').innerHTML = open.slice(0, 24).map(m => `
    <div class="ticket" onclick="openMission('${m.id}')">
      <div class="ticket-id">${m.id}</div>
      <div class="ticket-title">${m.device} — ${m.issue}</div>
      <div class="ticket-meta">${m.site} · ${m.dept}</div>
      <div style="margin-top:6px">
        <span class="badge p-${m.priority}">${m.priority}</span>
        <span class="badge" style="border-color:var(--border);color:var(--text-dim)">${m.status.toUpperCase()}</span>
      </div>
      <div class="sla ${slaClass(m.slaDeadline)}">${slaText(m.slaDeadline)}</div>
    </div>
  `).join('') || '<div style="color:var(--text-dim)">No open tickets — queue is clear.</div>';

  document.getElementById('missionQueue').innerHTML = open.slice(0, 12).map(m => `
    <div class="mission-item">
      <div class="mission-top">
        <span>${m.id}</span>
        <span class="mission-status" style="color:${m.priority === 'P1' ? 'var(--red)' : m.priority === 'P2' ? 'var(--amber)' : 'var(--cyan-dim)'}">${m.priority}</span>
      </div>
      <div style="color:var(--text);margin:4px 0">${m.device} — ${m.issue}</div>
      <div class="sla ${slaClass(m.slaDeadline)}">${slaText(m.slaDeadline)}</div>
    </div>
  `).join('') || '<div class="mission-item" style="color:var(--text-dim)">Queue empty.</div>';
}

async function openMission(id) {
  const { mission } = await fetchJSON(`${API}/missions/${id}`);
  if (!mission) return;
  // Run simulated AI analysis, then advance status, then refresh.
  await fetchJSON(`${API}/missions/${id}/ai-analyze`, { method: 'POST' });
  const next = mission.status === 'new' ? 'working'
    : mission.status === 'working' ? 'resolved'
    : mission.status;
  await fetchJSON(`${API}/missions/${id}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: next }),
  });
  renderWallAndQueue();
  renderStats();
}

async function injectIncident(category) {
  await fetchJSON(`${API}/incidents/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category }),
  });
  renderWallAndQueue();
  renderStats();
}

async function loadCategories() {
  const { categories: cats } = await fetchJSON(`${API}/incidents/categories`);
  categories = cats;
  document.getElementById('chaosBtns').innerHTML = cats.map(c => `
    <button class="btn btn-outline" onclick="injectIncident('${c}')">${c}</button>
  `).join('');
}

async function tick() {
  await Promise.all([renderStats(), renderWallAndQueue()]);
}

loadCategories();
tick();
setInterval(tick, 5000);
</script>

</body>
</html>
ENDOFFILE3

python3 << 'ENDOFPY'
with open('server.js') as f:
    content = f.read()

marker = "app.use(\n    '/api/enterprise',\n    enterpriseRouter\n);"
addition = marker + """

// ── ENTERPRISE LAB (Incident Generator / Live Mission Queue) ─────────────────
const enterpriseLabRouter =
    require('./server/enterprise-lab/api');

app.use(
    '/api/enterprise-lab',
    enterpriseLabRouter
);"""

if "enterprise-lab/api" in content:
    print("server.js already patched, skipping")
elif marker in content:
    content = content.replace(marker, addition, 1)
    with open('server.js', 'w') as f:
        f.write(content)
    print("server.js patched successfully")
else:
    print("WARNING: could not find mount point in server.js -- patch it manually")
    print("Add near your other app.use('/api/...') lines:")
    print("  const enterpriseLabRouter = require('./server/enterprise-lab/api');")
    print("  app.use('/api/enterprise-lab', enterpriseLabRouter);")
ENDOFPY

git add server.js server/enterprise-lab html/enterprise-command-center.html
git commit -m "feat(enterprise-lab): Sprint 1 - Incident Generator, Live Mission Queue, Command Center hub"
git push -u origin feat/enterprise-lab-sprint1
echo "Done. Branch feat/enterprise-lab-sprint1 pushed."