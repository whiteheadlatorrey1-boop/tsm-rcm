#!/usr/bin/env bash
set -euo pipefail
# Run from repo root (feat/enterprise-lab-sprint1 branch checked out).
# Writes full file contents directly -- no patch/diff involved.
# Part 2: adds AD + Device panels to the command center UI.

cat > html/enterprise-command-center.html << 'CMD_CENTER_EOF'
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

<!--
  Topology Panels Snippet
-->

<section class="twin-panels">
  <div class="twin-panel" id="vmware-panel">
    <div class="twin-panel-header">
      <h3>VMware Digital Twin</h3>
      <div class="twin-panel-actions">
        <select id="vmware-fault-target"></select>
        <select id="vmware-fault-type">
          <option value="host-down">Host Down</option>
          <option value="datastore-full">Datastore Full</option>
          <option value="network-partition">Network Partition</option>
          <option value="clear">Clear / Reset</option>
        </select>
        <button id="vmware-fault-btn">Inject Fault</button>
      </div>
    </div>
    <div class="twin-entities" id="vmware-entities"></div>
    <div class="twin-events" id="vmware-events"></div>
  </div>

  <div class="twin-panel" id="network-panel">
    <div class="twin-panel-header">
      <h3>Network Digital Twin</h3>
      <div class="twin-panel-actions">
        <select id="network-fault-target"></select>
        <select id="network-fault-type">
          <option value="link-down">Link Down</option>
          <option value="latency-spike">Latency Spike</option>
          <option value="packet-loss">Packet Loss</option>
          <option value="bgp-flap">BGP Flap</option>
          <option value="clear">Clear / Reset</option>
        </select>
        <button id="network-fault-btn">Inject Fault</button>
      </div>
    </div>
    <div class="twin-entities" id="network-entities"></div>
    <div class="twin-events" id="network-events"></div>
  </div>

  <div class="twin-panel" id="ad-panel">
    <div class="twin-panel-header">
      <h3>Active Directory Digital Twin (Users)</h3>
      <div class="twin-panel-actions">
        <select id="ad-fault-target"></select>
        <select id="ad-fault-type">
          <option value="account-lockout">Account Lockout</option>
          <option value="password-expired">Password Expired</option>
          <option value="mfa-failure">MFA Failure</option>
          <option value="replication-failure">Replication Failure</option>
          <option value="gpo-corruption">GPO Corruption</option>
          <option value="clear">Clear / Reset</option>
        </select>
        <button id="ad-fault-btn">Inject Fault</button>
      </div>
    </div>
    <div class="twin-entities" id="ad-entities"></div>
    <div class="twin-events" id="ad-events"></div>
  </div>

  <div class="twin-panel" id="device-panel">
    <div class="twin-panel-header">
      <h3>Device Digital Twin</h3>
      <div class="twin-panel-actions">
        <select id="device-fault-target"></select>
        <select id="device-fault-type">
          <option value="disk-full">Disk Full</option>
          <option value="bsod-crash">BSOD Crash</option>
          <option value="battery-failure">Battery Failure</option>
          <option value="driver-crash">Driver Crash</option>
          <option value="patch-failure">Patch Failure</option>
          <option value="printer-jam">Printer Jam</option>
          <option value="printer-offline">Printer Offline</option>
          <option value="clear">Clear / Reset</option>
        </select>
        <button id="device-fault-btn">Inject Fault</button>
      </div>
    </div>
    <div class="twin-entities" id="device-entities"></div>
    <div class="twin-events" id="device-events"></div>
  </div>
</section>

<style>
  .twin-panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 16px;
  }
  .twin-panel {
    background: #12161c;
    border: 1px solid #262b33;
    border-radius: 8px;
    padding: 14px 16px;
  }
  .twin-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }
  .twin-panel-header h3 {
    margin: 0;
    font-size: 14px;
    color: #e6e9ef;
  }
  .twin-panel-actions {
    display: flex;
    gap: 6px;
  }
  .twin-panel-actions select,
  .twin-panel-actions button {
    background: #1b2028;
    color: #cfd4dc;
    border: 1px solid #333a45;
    border-radius: 4px;
    font-size: 12px;
    padding: 4px 6px;
  }
  .twin-panel-actions button {
    cursor: pointer;
  }
  .twin-panel-actions button:hover {
    background: #262d38;
  }
  .twin-entities {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 220px;
    overflow-y: auto;
  }
  .twin-entity-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    border-radius: 4px;
    background: #171b22;
    font-size: 12px;
    color: #cfd4dc;
  }
  .twin-entity-status {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 8px;
  }
  .twin-entity-status.status-up { background: #3ecf8e; }
  .twin-entity-status.status-down { background: #e5484d; }
  .twin-entity-status.status-unreachable { background: #e5484d; }
  .twin-entity-status.status-isolated { background: #f5a623; }
  .twin-entity-status.status-full { background: #f5a623; }
  .twin-entity-status.status-flapping { background: #f5a623; }
  .twin-events {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid #262b33;
    font-size: 11px;
    color: #8b94a3;
    max-height: 90px;
    overflow-y: auto;
  }
  .twin-events div {
    padding: 2px 0;
  }
  @media (max-width: 900px) {
    .twin-panels { grid-template-columns: 1fr; }
  }
</style>

<script>
(function () {
  const POLL_MS = 5000;

  function statusDot(status) {
    return `<span class="twin-entity-status status-${status}"></span>`;
  }

  async function fetchVMwareState() {
    const res = await fetch('/api/twins/vmware/state');
    return res.json();
  }

  function renderVMware(state) {
    const container = document.getElementById('vmware-entities');
    const targetSelect = document.getElementById('vmware-fault-target');
    const rows = [];
    const targets = [];

    state.clusters.forEach((cluster) => {
      cluster.hosts.forEach((host) => {
        rows.push(`<div class="twin-entity-row">
          <span>${statusDot(host.status)}${host.name} — ${cluster.name}</span>
          <span>${host.status} · cpu ${host.cpuPct}% · mem ${host.memPct}%</span>
        </div>`);
        targets.push(host.id);
      });
    });
    state.datastores.forEach((ds) => {
      rows.push(`<div class="twin-entity-row">
        <span>${statusDot(ds.status === 'full' ? 'full' : 'up')}${ds.name}</span>
        <span>${ds.usedGB}/${ds.capacityGB} GB — ${ds.status}</span>
      </div>`);
      targets.push(ds.id);
    });

    container.innerHTML = rows.join('');

    const currentTarget = targetSelect.value;
    targetSelect.innerHTML = targets.map((id) => `<option value="${id}">${id}</option>`).join('');
    if (targets.includes(currentTarget)) targetSelect.value = currentTarget;

    const eventsEl = document.getElementById('vmware-events');
    eventsEl.innerHTML = state.events.slice(0, 5).map((e) => `<div>${e.ts.slice(11, 19)} — ${e.message}</div>`).join('');
  }

  async function pollVMware() {
    try {
      renderVMware(await fetchVMwareState());
    } catch (err) {
      console.error('VMware twin poll failed', err);
    }
  }

  document.getElementById('vmware-fault-btn').addEventListener('click', async () => {
    const type = document.getElementById('vmware-fault-type').value;
    const targetId = document.getElementById('vmware-fault-target').value;
    try {
      await fetch('/api/twins/vmware/fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, targetId }),
      });
      pollVMware();
    } catch (err) {
      console.error('Failed to inject VMware fault', err);
    }
  });

  async function fetchNetworkState() {
    const res = await fetch('/api/twins/network/state');
    return res.json();
  }

  function renderNetwork(state) {
    const container = document.getElementById('network-entities');
    const targetSelect = document.getElementById('network-fault-target');
    const rows = [];
    const targets = [];

    state.nodes.forEach((node) => {
      rows.push(`<div class="twin-entity-row">
        <span>${statusDot(node.status)}${node.name}</span>
        <span>${node.type} · ${node.status}</span>
      </div>`);
    });
    state.links.forEach((link) => {
      const status = link.status === 'down' ? 'down' : (link.bgpSession === 'flapping' ? 'flapping' : (link.lossPct > 0 ? 'isolated' : 'up'));
      rows.push(`<div class="twin-entity-row">
        <span>${statusDot(status)}${link.from} ↔ ${link.to}</span>
        <span>${link.status}${link.latencyMs != null ? ' · ' + link.latencyMs + 'ms' : ''}${link.lossPct ? ' · ' + link.lossPct + '% loss' : ''}</span>
      </div>`);
      targets.push(link.id);
    });

    container.innerHTML = rows.join('');

    const currentTarget = targetSelect.value;
    targetSelect.innerHTML = targets.map((id) => `<option value="${id}">${id}</option>`).join('');
    if (targets.includes(currentTarget)) targetSelect.value = currentTarget;

    const eventsEl = document.getElementById('network-events');
    eventsEl.innerHTML = state.events.slice(0, 5).map((e) => `<div>${e.ts.slice(11, 19)} — ${e.message}</div>`).join('');
  }

  async function pollNetwork() {
    try {
      renderNetwork(await fetchNetworkState());
    } catch (err) {
      console.error('Network twin poll failed', err);
    }
  }

  document.getElementById('network-fault-btn').addEventListener('click', async () => {
    const type = document.getElementById('network-fault-type').value;
    const targetId = document.getElementById('network-fault-target').value;
    try {
      await fetch('/api/twins/network/fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, targetId }),
      });
      pollNetwork();
    } catch (err) {
      console.error('Failed to inject network fault', err);
    }
  });

  // Buckets twin-specific status strings into the existing up/down dots
  // rather than growing a new CSS class per twin's status vocabulary.
  function statusBucket(status) {
    const healthy = ['active', 'up', 'healthy', 'applied', 'current'];
    return healthy.includes(status) ? 'up' : 'down';
  }

  async function fetchADState() {
    const res = await fetch('/api/twins/ad/state');
    return res.json();
  }

  function renderAD(state) {
    const container = document.getElementById('ad-entities');
    const targetSelect = document.getElementById('ad-fault-target');
    const rows = [];
    const targets = [];

    state.domainControllers.forEach((dc) => {
      rows.push(`<div class="twin-entity-row">
        <span>${statusDot(statusBucket(dc.replicationStatus))}${dc.name}</span>
        <span>${dc.role} · repl ${dc.replicationStatus}</span>
      </div>`);
      targets.push(dc.id);
    });
    state.organizationalUnits.forEach((ou) => {
      rows.push(`<div class="twin-entity-row">
        <span>${statusDot(statusBucket(ou.gpoStatus))}${ou.name} (OU)</span>
        <span>gpo ${ou.gpoStatus}</span>
      </div>`);
      targets.push(ou.id);
    });
    Object.values(state.users).forEach((user) => {
      rows.push(`<div class="twin-entity-row">
        <span>${statusDot(statusBucket(user.status))}${user.name} (${user.id})</span>
        <span>${user.status}${user.mfaEnrolled ? ' · mfa' : ''} · pwd ${user.passwordExpiresInDays}d</span>
      </div>`);
      targets.push(user.id);
    });

    container.innerHTML = rows.join('');

    const currentTarget = targetSelect.value;
    targetSelect.innerHTML = targets.map((id) => `<option value="${id}">${id}</option>`).join('');
    if (targets.includes(currentTarget)) targetSelect.value = currentTarget;

    const eventsEl = document.getElementById('ad-events');
    eventsEl.innerHTML = state.events.slice(0, 5).map((e) => `<div>${e.ts.slice(11, 19)} — ${e.message}</div>`).join('');
  }

  async function pollAD() {
    try {
      renderAD(await fetchADState());
    } catch (err) {
      console.error('AD twin poll failed', err);
    }
  }

  document.getElementById('ad-fault-btn').addEventListener('click', async () => {
    const type = document.getElementById('ad-fault-type').value;
    const targetId = document.getElementById('ad-fault-target').value;
    try {
      await fetch('/api/twins/ad/fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, targetId }),
      });
      pollAD();
    } catch (err) {
      console.error('Failed to inject AD fault', err);
    }
  });

  async function fetchDeviceState() {
    const res = await fetch('/api/twins/device/state');
    return res.json();
  }

  function renderDevice(state) {
    const container = document.getElementById('device-entities');
    const targetSelect = document.getElementById('device-fault-target');
    const rows = [];
    const targets = [];

    state.endpoints.forEach((ep) => {
      const metric = ep.type === 'printer'
        ? `toner ${ep.tonerPct}%`
        : ep.type === 'laptop'
          ? `disk ${ep.diskFreePct}% · batt ${ep.batteryHealthPct}%`
          : `disk ${ep.diskFreePct}%`;
      rows.push(`<div class="twin-entity-row">
        <span>${statusDot(statusBucket(ep.status))}${ep.name}${ep.assignedTo ? ' — ' + ep.assignedTo : ''}</span>
        <span>${ep.type} · ${ep.status} · ${metric}</span>
      </div>`);
      targets.push(ep.id);
    });

    container.innerHTML = rows.join('');

    const currentTarget = targetSelect.value;
    targetSelect.innerHTML = targets.map((id) => `<option value="${id}">${id}</option>`).join('');
    if (targets.includes(currentTarget)) targetSelect.value = currentTarget;

    const eventsEl = document.getElementById('device-events');
    eventsEl.innerHTML = state.events.slice(0, 5).map((e) => `<div>${e.ts.slice(11, 19)} — ${e.message}</div>`).join('');
  }

  async function pollDevice() {
    try {
      renderDevice(await fetchDeviceState());
    } catch (err) {
      console.error('Device twin poll failed', err);
    }
  }

  document.getElementById('device-fault-btn').addEventListener('click', async () => {
    const type = document.getElementById('device-fault-type').value;
    const targetId = document.getElementById('device-fault-target').value;
    try {
      await fetch('/api/twins/device/fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, targetId }),
      });
      pollDevice();
    } catch (err) {
      console.error('Failed to inject device fault', err);
    }
  });

  pollVMware();
  pollNetwork();
  pollAD();
  pollDevice();
  setInterval(pollVMware, POLL_MS);
  setInterval(pollNetwork, POLL_MS);
  setInterval(pollAD, POLL_MS);
  setInterval(pollDevice, POLL_MS);
})();
</script>

</body>
</html>

CMD_CENTER_EOF

echo "html/enterprise-command-center.html updated."
echo "Re-running test-twins.js as a sanity check:"
node test-twins.js