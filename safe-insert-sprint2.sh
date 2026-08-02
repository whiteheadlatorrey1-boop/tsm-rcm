#!/usr/bin/env bash
# safe-insert-sprint2.sh
# Safely patches server.js and enterprise-command-center.html for Sprint 2.
# - Backs up both files before touching them
# - Skips if already patched (safe to re-run)
# - Inserts the router mount BEFORE any wildcard catch-all route in server.js
#   so the new route isn't shadowed
# - Refuses to guess if it can't find a safe insertion point

set -euo pipefail

echo "Locating repo root..."
DIR="$(pwd)"
while [ "$DIR" != "/" ]; do
  if [ -d "$DIR/.git" ]; then REPO_ROOT="$DIR"; break; fi
  DIR="$(dirname "$DIR")"
done
if [ -z "${REPO_ROOT:-}" ]; then
  echo "❌ Could not find a .git directory above $(pwd)."
  exit 1
fi
echo "Working in: $REPO_ROOT"
cd "$REPO_ROOT"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

# ---- write the node patchers ----

cat > "$WORKDIR/patch-server.js" << 'NODE_EOF'
const fs = require('fs');
const path = require('path');

const SERVER_PATH = process.argv[2];
const MARKER = 'enterprise-lab/twins-router';

if (!fs.existsSync(SERVER_PATH)) {
  console.error(`❌ Not found: ${SERVER_PATH}`);
  process.exit(1);
}

let content = fs.readFileSync(SERVER_PATH, 'utf8');

if (content.includes(MARKER)) {
  console.log('server.js already patched, skipping');
  process.exit(0);
}

const insertBlock =
`const twinsRouter = require('./server/enterprise-lab/twins-router');
app.use('/api/twins', twinsRouter);
`;

// Look for anchors in priority order: wildcard catch-all routes first
// (so our route isn't shadowed), then app.listen as a fallback.
const anchorPatterns = [
  { re: /app\.(get|all|use)\(\s*['"`]\*['"`]/, label: 'wildcard catch-all route' },
  { re: /app\.listen\(/, label: 'app.listen(...)' },
];

let anchorIndex = -1;
let anchorLabel = null;

for (const { re, label } of anchorPatterns) {
  const match = content.match(re);
  if (match) {
    anchorIndex = match.index;
    anchorLabel = label;
    break;
  }
}

let patched;
if (anchorIndex === -1) {
  // No safe anchor found — append at end rather than guess wrong.
  patched = content.replace(/\s*$/, '\n\n' + insertBlock);
  anchorLabel = 'end of file (no catch-all or app.listen found)';
} else {
  // Walk back to the start of the line containing the anchor.
  let lineStart = content.lastIndexOf('\n', anchorIndex) + 1;
  patched = content.slice(0, lineStart) + insertBlock + '\n' + content.slice(lineStart);
}

const backupPath = `${SERVER_PATH}.backup-${Date.now()}`;
fs.copyFileSync(SERVER_PATH, backupPath);
fs.writeFileSync(SERVER_PATH, patched);

console.log(`✅ Patched ${SERVER_PATH}`);
console.log(`   Inserted before: ${anchorLabel}`);
console.log(`   Backup saved to: ${backupPath}`);
NODE_EOF

cat > "$WORKDIR/patch-html.js" << 'NODE_EOF'
const fs = require('fs');

const HTML_PATH = process.argv[2];
const MARKER = 'twin-panels';

if (!fs.existsSync(HTML_PATH)) {
  console.error(`❌ Not found: ${HTML_PATH}`);
  process.exit(1);
}

let content = fs.readFileSync(HTML_PATH, 'utf8');

if (content.includes(MARKER)) {
  console.log(`${HTML_PATH} already patched, skipping`);
  process.exit(0);
}

const bodyCloseMatch = content.match(/<\/body\s*>/i);
if (!bodyCloseMatch) {
  console.error(`❌ No </body> tag found in ${HTML_PATH} — refusing to guess where to insert. Paste the snippet in manually.`);
  process.exit(1);
}

const snippet = fs.readFileSync(require('path').join(__dirname, 'topology-panels-snippet.html'), 'utf8');

const insertIndex = bodyCloseMatch.index;
const patched = content.slice(0, insertIndex) + snippet + '\n' + content.slice(insertIndex);

const backupPath = `${HTML_PATH}.backup-${Date.now()}`;
fs.copyFileSync(HTML_PATH, backupPath);
fs.writeFileSync(HTML_PATH, patched);

console.log(`✅ Patched ${HTML_PATH}`);
console.log(`   Inserted before: </body>`);
console.log(`   Backup saved to: ${backupPath}`);
NODE_EOF

cat > "$WORKDIR/topology-panels-snippet.html" << 'SNIPPET_EOF'
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

  pollVMware();
  pollNetwork();
  setInterval(pollVMware, POLL_MS);
  setInterval(pollNetwork, POLL_MS);
})();
</script>
SNIPPET_EOF

# ---- run them ----

echo ""
echo "Patching server.js..."
node "$WORKDIR/patch-server.js" "$REPO_ROOT/server.js"

echo ""
echo "Patching enterprise-command-center.html..."
HTML_TARGET="$REPO_ROOT/html/enterprise-command-center.html"
if [ ! -f "$HTML_TARGET" ]; then
  FOUND="$(find "$REPO_ROOT" -maxdepth 4 -iname 'enterprise-command-center.html' | head -1)"
  if [ -n "$FOUND" ]; then
    HTML_TARGET="$FOUND"
  else
    echo "❌ Could not find enterprise-command-center.html."
    exit 1
  fi
fi
node "$WORKDIR/patch-html.js" "$HTML_TARGET"

echo ""
echo "Done. Review the diffs before committing:"
echo "  git diff server.js"
echo "  git diff \"$HTML_TARGET\""
