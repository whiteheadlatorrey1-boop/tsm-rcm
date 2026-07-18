#!/usr/bin/env bash
# apply-sprint2-standalone.sh
# Single-file version: contains all 4 JS files embedded inside it.
# No other files needed — just this one script.
# Copies the twin files into place and runs the test suite.
# Does NOT touch server.js or any HTML — those are manual steps.

set -euo pipefail

echo "Locating repo root..."
DIR="$(pwd)"
while [ "$DIR" != "/" ]; do
  if [ -d "$DIR/.git" ]; then
    REPO_ROOT="$DIR"
    break
  fi
  DIR="$(dirname "$DIR")"
done

if [ -z "${REPO_ROOT:-}" ]; then
  echo "❌ Could not find a .git directory above $(pwd). Run this from inside your repo."
  exit 1
fi

echo "Working in: $REPO_ROOT"
cd "$REPO_ROOT"

TARGET_DIR="$REPO_ROOT/server/enterprise-lab"
mkdir -p "$TARGET_DIR"

echo "Writing server/enterprise-lab/vmware-twin.js..."
cat > "$TARGET_DIR/vmware-twin.js" << 'VMWARE_EOF'
/**
 * VMware Digital Twin
 * In-memory simulation of a small vSphere environment:
 * 2 clusters -> hosts -> VMs, plus shared datastores.
 * Supports fault injection so the Command Center can demo
 * failure/recovery scenarios without touching real infra.
 */

'use strict';

const FAULT_TYPES = ['host-down', 'datastore-full', 'ha-failover', 'network-partition', 'clear'];

function buildInitialState() {
  return {
    updatedAt: new Date().toISOString(),
    clusters: [
      {
        id: 'cluster-a',
        name: 'Cluster A (Prod)',
        haEnabled: true,
        hosts: [
          { id: 'esxi-a1', name: 'esxi-a1.local', status: 'up', cpuPct: 34, memPct: 51, vms: ['vm-web-01', 'vm-web-02'] },
          { id: 'esxi-a2', name: 'esxi-a2.local', status: 'up', cpuPct: 41, memPct: 60, vms: ['vm-app-01', 'vm-db-01'] },
        ],
      },
      {
        id: 'cluster-b',
        name: 'Cluster B (DR)',
        haEnabled: true,
        hosts: [
          { id: 'esxi-b1', name: 'esxi-b1.local', status: 'up', cpuPct: 12, memPct: 22, vms: ['vm-dr-01'] },
        ],
      },
    ],
    vms: {
      'vm-web-01': { id: 'vm-web-01', name: 'web-01', host: 'esxi-a1', status: 'running' },
      'vm-web-02': { id: 'vm-web-02', name: 'web-02', host: 'esxi-a1', status: 'running' },
      'vm-app-01': { id: 'vm-app-01', name: 'app-01', host: 'esxi-a2', status: 'running' },
      'vm-db-01':  { id: 'vm-db-01',  name: 'db-01',  host: 'esxi-a2', status: 'running' },
      'vm-dr-01':  { id: 'vm-dr-01',  name: 'dr-01',  host: 'esxi-b1', status: 'running' },
    },
    datastores: [
      { id: 'ds-prod-01', name: 'datastore-prod-01', capacityGB: 2048, usedGB: 900, status: 'healthy' },
      { id: 'ds-dr-01', name: 'datastore-dr-01', capacityGB: 1024, usedGB: 300, status: 'healthy' },
    ],
    events: [],
  };
}

class VMwareTwin {
  constructor() {
    this.state = buildInitialState();
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = buildInitialState();
    return this.state;
  }

  _findHost(hostId) {
    for (const cluster of this.state.clusters) {
      const host = cluster.hosts.find((h) => h.id === hostId);
      if (host) return { cluster, host };
    }
    return null;
  }

  _logEvent(message) {
    this.state.events.unshift({ ts: new Date().toISOString(), message });
    this.state.events = this.state.events.slice(0, 25);
  }

  /**
   * Apply a fault to the twin.
   * @param {string} type - one of FAULT_TYPES
   * @param {string} [targetId] - host id, datastore id, or cluster id depending on type
   */
  applyFault(type, targetId) {
    if (!FAULT_TYPES.includes(type)) {
      throw new Error(`Unknown fault type: ${type}`);
    }

    switch (type) {
      case 'host-down': {
        const found = this._findHost(targetId);
        if (!found) throw new Error(`Host not found: ${targetId}`);
        found.host.status = 'down';
        found.host.cpuPct = 0;
        found.host.memPct = 0;
        this._logEvent(`Host ${found.host.name} went down`);

        if (found.cluster.haEnabled) {
          const survivor = found.cluster.hosts.find((h) => h.id !== found.host.id && h.status === 'up');
          if (survivor) {
            for (const vmId of found.host.vms) {
              const vm = this.state.vms[vmId];
              if (vm) {
                vm.host = survivor.id;
                vm.status = 'running';
                survivor.vms.push(vmId);
              }
            }
            found.host.vms = [];
            this._logEvent(`HA restarted ${found.host.name}'s VMs on ${survivor.name}`);
          } else {
            for (const vmId of found.host.vms) {
              const vm = this.state.vms[vmId];
              if (vm) vm.status = 'orphaned';
            }
            this._logEvent(`HA failed: no surviving host in ${found.cluster.name}`);
          }
        }
        break;
      }

      case 'ha-failover': {
        const cluster = this.state.clusters.find((c) => c.id === targetId);
        if (!cluster) throw new Error(`Cluster not found: ${targetId}`);
        const downHost = cluster.hosts.find((h) => h.status === 'down' && h.vms.length === 0);
        this._logEvent(`Manual HA failover triggered on ${cluster.name}`);
        if (!downHost) this._logEvent(`No pending failover work for ${cluster.name}`);
        break;
      }

      case 'datastore-full': {
        const ds = this.state.datastores.find((d) => d.id === targetId);
        if (!ds) throw new Error(`Datastore not found: ${targetId}`);
        ds.usedGB = ds.capacityGB;
        ds.status = 'full';
        this._logEvent(`Datastore ${ds.name} reached capacity`);
        break;
      }

      case 'network-partition': {
        const found = this._findHost(targetId);
        if (!found) throw new Error(`Host not found: ${targetId}`);
        found.host.status = 'isolated';
        this._logEvent(`Host ${found.host.name} network-partitioned from vCenter`);
        break;
      }

      case 'clear': {
        this.reset();
        this._logEvent('Twin state reset to healthy baseline');
        break;
      }

      default:
        break;
    }

    this.state.updatedAt = new Date().toISOString();
    return this.state;
  }
}

module.exports = { VMwareTwin, FAULT_TYPES };
VMWARE_EOF

echo "Writing server/enterprise-lab/network-twin.js..."
cat > "$TARGET_DIR/network-twin.js" << 'NETWORK_EOF'
/**
 * Network Digital Twin
 * In-memory simulation of a small enterprise network:
 * core/dist/access switches, a router pair, and the links between them.
 * Supports fault injection for demoing outages/degradation scenarios.
 */

'use strict';

const FAULT_TYPES = ['link-down', 'latency-spike', 'packet-loss', 'bgp-flap', 'clear'];

function buildInitialState() {
  return {
    updatedAt: new Date().toISOString(),
    nodes: [
      { id: 'rtr-core-1', name: 'Core Router 1', type: 'router', status: 'up', role: 'primary' },
      { id: 'rtr-core-2', name: 'Core Router 2', type: 'router', status: 'up', role: 'standby' },
      { id: 'sw-dist-1', name: 'Dist Switch 1', type: 'switch', status: 'up', role: 'distribution' },
      { id: 'sw-dist-2', name: 'Dist Switch 2', type: 'switch', status: 'up', role: 'distribution' },
      { id: 'sw-acc-1', name: 'Access Switch 1', type: 'switch', status: 'up', role: 'access' },
      { id: 'sw-acc-2', name: 'Access Switch 2', type: 'switch', status: 'up', role: 'access' },
    ],
    links: [
      { id: 'link-core1-core2', from: 'rtr-core-1', to: 'rtr-core-2', status: 'up', latencyMs: 1, lossPct: 0, bandwidthMbps: 10000, bgpSession: 'established' },
      { id: 'link-core1-dist1', from: 'rtr-core-1', to: 'sw-dist-1', status: 'up', latencyMs: 2, lossPct: 0, bandwidthMbps: 10000 },
      { id: 'link-core2-dist2', from: 'rtr-core-2', to: 'sw-dist-2', status: 'up', latencyMs: 2, lossPct: 0, bandwidthMbps: 10000 },
      { id: 'link-dist1-acc1', from: 'sw-dist-1', to: 'sw-acc-1', status: 'up', latencyMs: 3, lossPct: 0, bandwidthMbps: 1000 },
      { id: 'link-dist2-acc2', from: 'sw-dist-2', to: 'sw-acc-2', status: 'up', latencyMs: 3, lossPct: 0, bandwidthMbps: 1000 },
    ],
    events: [],
  };
}

class NetworkTwin {
  constructor() {
    this.state = buildInitialState();
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = buildInitialState();
    return this.state;
  }

  _findLink(linkId) {
    return this.state.links.find((l) => l.id === linkId) || null;
  }

  _findNode(nodeId) {
    return this.state.nodes.find((n) => n.id === nodeId) || null;
  }

  _logEvent(message) {
    this.state.events.unshift({ ts: new Date().toISOString(), message });
    this.state.events = this.state.events.slice(0, 25);
  }

  /**
   * Apply a fault to the twin.
   * @param {string} type - one of FAULT_TYPES
   * @param {string} [targetId] - link id (or node id for bgp-flap)
   */
  applyFault(type, targetId) {
    if (!FAULT_TYPES.includes(type)) {
      throw new Error(`Unknown fault type: ${type}`);
    }

    switch (type) {
      case 'link-down': {
        const link = this._findLink(targetId);
        if (!link) throw new Error(`Link not found: ${targetId}`);
        link.status = 'down';
        link.latencyMs = null;
        this._logEvent(`Link ${link.id} (${link.from} <-> ${link.to}) went down`);

        // Mark downstream node as unreachable if this was its only up link.
        const downstream = this._findNode(link.to);
        const stillReachable = this.state.links.some(
          (l) => l.id !== link.id && l.status === 'up' && (l.from === link.to || l.to === link.to)
        );
        if (downstream && !stillReachable) {
          downstream.status = 'unreachable';
          this._logEvent(`${downstream.name} is now unreachable`);
        }
        break;
      }

      case 'latency-spike': {
        const link = this._findLink(targetId);
        if (!link) throw new Error(`Link not found: ${targetId}`);
        link.latencyMs = (link.latencyMs || 1) + 150;
        this._logEvent(`Latency spike injected on ${link.id} (+150ms)`);
        break;
      }

      case 'packet-loss': {
        const link = this._findLink(targetId);
        if (!link) throw new Error(`Link not found: ${targetId}`);
        link.lossPct = 15;
        this._logEvent(`Packet loss injected on ${link.id} (15%)`);
        break;
      }

      case 'bgp-flap': {
        const link = this._findLink(targetId);
        if (!link || !('bgpSession' in link)) {
          throw new Error(`No BGP session on link: ${targetId}`);
        }
        link.bgpSession = 'flapping';
        this._logEvent(`BGP session flapping on ${link.id}`);
        break;
      }

      case 'clear': {
        this.reset();
        this._logEvent('Twin state reset to healthy baseline');
        break;
      }

      default:
        break;
    }

    this.state.updatedAt = new Date().toISOString();
    return this.state;
  }
}

module.exports = { NetworkTwin, FAULT_TYPES };
NETWORK_EOF

echo "Writing server/enterprise-lab/twins-router.js..."
cat > "$TARGET_DIR/twins-router.js" << 'ROUTER_EOF'
/**
 * Twins Router
 * Mounts VMware and Network digital-twin endpoints under /api/twins.
 *
 * Usage in server.js:
 *   const twinsRouter = require('./server/enterprise-lab/twins-router');
 *   app.use('/api/twins', twinsRouter);
 */

'use strict';

const express = require('express');
const { VMwareTwin, FAULT_TYPES: VMWARE_FAULTS } = require('./vmware-twin');
const { NetworkTwin, FAULT_TYPES: NETWORK_FAULTS } = require('./network-twin');

const router = express.Router();

// Singleton twin instances shared across all requests (in-memory demo state).
const vmwareTwin = new VMwareTwin();
const networkTwin = new NetworkTwin();

// ---- VMware twin ----

router.get('/vmware/state', (req, res) => {
  res.json(vmwareTwin.getState());
});

router.get('/vmware/fault-types', (req, res) => {
  res.json({ faultTypes: VMWARE_FAULTS });
});

router.post('/vmware/fault', (req, res) => {
  const { type, targetId } = req.body || {};
  try {
    const state = vmwareTwin.applyFault(type, targetId);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/vmware/reset', (req, res) => {
  res.json(vmwareTwin.reset());
});

// ---- Network twin ----

router.get('/network/state', (req, res) => {
  res.json(networkTwin.getState());
});

router.get('/network/fault-types', (req, res) => {
  res.json({ faultTypes: NETWORK_FAULTS });
});

router.post('/network/fault', (req, res) => {
  const { type, targetId } = req.body || {};
  try {
    const state = networkTwin.applyFault(type, targetId);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/network/reset', (req, res) => {
  res.json(networkTwin.reset());
});

module.exports = router;
ROUTER_EOF

echo "Writing test-twins.js..."
cat > "$REPO_ROOT/test-twins.js" << 'TEST_EOF'
/**
 * test-twins.js
 * Exercises every fault type on both digital twins directly
 * (no HTTP server required). Run with: node test-twins.js
 */

'use strict';

const { VMwareTwin } = require('./server/enterprise-lab/vmware-twin');
const { NetworkTwin } = require('./server/enterprise-lab/network-twin');

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`  ✗ ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

function testVMwareTwin() {
  console.log('\nVMware Twin');
  const twin = new VMwareTwin();

  twin.applyFault('host-down', 'esxi-a1');
  const a1 = twin.state.clusters[0].hosts.find((h) => h.id === 'esxi-a1');
  const a2 = twin.state.clusters[0].hosts.find((h) => h.id === 'esxi-a2');
  assert(a1.status === 'down', 'host-down marks host as down');
  assert(a1.vms.length === 0, 'host-down evacuates VM list on failed host');
  assert(a2.vms.includes('vm-web-01'), 'HA migrates VM to surviving host');
  assert(twin.state.vms['vm-web-01'].host === 'esxi-a2', 'VM record host pointer updated');

  twin.reset();
  twin.applyFault('datastore-full', 'ds-prod-01');
  const ds = twin.state.datastores.find((d) => d.id === 'ds-prod-01');
  assert(ds.status === 'full' && ds.usedGB === ds.capacityGB, 'datastore-full fills datastore');

  twin.reset();
  twin.applyFault('network-partition', 'esxi-b1');
  const b1 = twin.state.clusters[1].hosts.find((h) => h.id === 'esxi-b1');
  assert(b1.status === 'isolated', 'network-partition isolates host');

  twin.applyFault('clear');
  const freshA1 = twin.state.clusters[0].hosts.find((h) => h.id === 'esxi-a1');
  assert(freshA1.status === 'up', 'clear resets twin to healthy baseline');

  let threw = false;
  try {
    twin.applyFault('host-down', 'not-a-real-host');
  } catch (e) {
    threw = true;
  }
  assert(threw, 'invalid targetId throws instead of silently failing');
}

function testNetworkTwin() {
  console.log('\nNetwork Twin');
  const twin = new NetworkTwin();

  twin.applyFault('link-down', 'link-dist1-acc1');
  const link = twin.state.links.find((l) => l.id === 'link-dist1-acc1');
  const acc1 = twin.state.nodes.find((n) => n.id === 'sw-acc-1');
  assert(link.status === 'down', 'link-down marks link as down');
  assert(acc1.status === 'unreachable', 'downstream node marked unreachable when last link drops');

  twin.reset();
  twin.applyFault('latency-spike', 'link-core1-dist1');
  const latencyLink = twin.state.links.find((l) => l.id === 'link-core1-dist1');
  assert(latencyLink.latencyMs >= 150, 'latency-spike increases link latency');

  twin.reset();
  twin.applyFault('packet-loss', 'link-core1-dist1');
  const lossLink = twin.state.links.find((l) => l.id === 'link-core1-dist1');
  assert(lossLink.lossPct === 15, 'packet-loss sets loss percentage');

  twin.reset();
  twin.applyFault('bgp-flap', 'link-core1-core2');
  const bgpLink = twin.state.links.find((l) => l.id === 'link-core1-core2');
  assert(bgpLink.bgpSession === 'flapping', 'bgp-flap sets session to flapping');

  twin.applyFault('clear');
  const freshLink = twin.state.links.find((l) => l.id === 'link-dist1-acc1');
  assert(freshLink.status === 'up', 'clear resets twin to healthy baseline');

  let threw = false;
  try {
    twin.applyFault('link-down', 'not-a-real-link');
  } catch (e) {
    threw = true;
  }
  assert(threw, 'invalid targetId throws instead of silently failing');
}

testVMwareTwin();
testNetworkTwin();

console.log(`\n${failures === 0 ? '✅ All checks passed' : `❌ ${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
TEST_EOF

echo ""
echo "Running twin test suite..."
node "$REPO_ROOT/test-twins.js"

echo ""
echo "✅ JS files written and tests passed."
echo ""
echo "Still manual (not touched by this script):"
echo "  1. Mount the router in server.js:"
echo "       const twinsRouter = require('./server/enterprise-lab/twins-router');"
echo "       app.use('/api/twins', twinsRouter);"
echo "  2. Paste the topology panel HTML/CSS/JS into enterprise-command-center.html"
echo "     (ask me to resend that snippet if you don't have it)."