#!/usr/bin/env bash
set -euo pipefail
# Run from repo root (feat/enterprise-lab-sprint1 branch checked out).
# Writes full file contents directly -- no patch/diff involved.

cat > server/enterprise-lab/device-twin.js << 'DEVICE_TWIN_EOF'
/**
 * Device Digital Twin
 * In-memory simulation of a small endpoint fleet: laptops, desktops, and
 * printers assigned across the same users/OUs as the AD twin. Supports
 * fault injection for demoing hardware/endpoint incidents (disk full,
 * BSOD, battery failure, driver crash, failed patch, printer faults).
 */

'use strict';

const FAULT_TYPES = [
  'disk-full',
  'bsod-crash',
  'battery-failure',
  'driver-crash',
  'patch-failure',
  'printer-jam',
  'printer-offline',
  'clear',
];

function buildInitialState() {
  return {
    updatedAt: new Date().toISOString(),
    endpoints: [
      { id: 'lap-jdoe', name: 'DELL-LAP-JDOE', type: 'laptop', assignedTo: 'jdoe', status: 'healthy', diskFreePct: 62, batteryHealthPct: 91, patchStatus: 'current' },
      { id: 'lap-bsmith', name: 'DELL-LAP-BSMITH', type: 'laptop', assignedTo: 'bsmith', status: 'healthy', diskFreePct: 48, batteryHealthPct: 87, patchStatus: 'current' },
      { id: 'dsk-kchen', name: 'DELL-DSK-KCHEN', type: 'desktop', assignedTo: 'kchen', status: 'healthy', diskFreePct: 71, batteryHealthPct: null, patchStatus: 'current' },
      { id: 'dsk-finance-01', name: 'DELL-DSK-FIN01', type: 'desktop', assignedTo: null, status: 'healthy', diskFreePct: 55, batteryHealthPct: null, patchStatus: 'current' },
      { id: 'prn-3f', name: 'HP-PRN-3F', type: 'printer', assignedTo: null, status: 'healthy', tonerPct: 78, patchStatus: 'current' },
      { id: 'prn-hq-lobby', name: 'HP-PRN-LOBBY', type: 'printer', assignedTo: null, status: 'healthy', tonerPct: 34, patchStatus: 'current' },
    ],
    events: [],
  };
}

const CATEGORY_BY_TYPE = { laptop: 'Dell Laptop', desktop: 'Desktop', printer: 'Printer' };

class DeviceTwin {
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

  _findEndpoint(id) {
    return this.state.endpoints.find((e) => e.id === id) || null;
  }

  _logEvent(message) {
    this.state.events.unshift({ ts: new Date().toISOString(), message });
    this.state.events = this.state.events.slice(0, 25);
  }

  /**
   * Apply a fault to the twin.
   * @param {string} type - one of FAULT_TYPES
   * @param {string} [targetId] - endpoint id
   */
  applyFault(type, targetId) {
    if (!FAULT_TYPES.includes(type)) {
      throw new Error(`Unknown fault type: ${type}`);
    }

    switch (type) {
      case 'disk-full': {
        const ep = this._findEndpoint(targetId);
        if (!ep || !('diskFreePct' in ep)) throw new Error(`Endpoint not found or has no disk: ${targetId}`);
        ep.diskFreePct = 1;
        ep.status = 'disk-full';
        this._logEvent(`Disk full on ${ep.name} (${ep.id})`);
        break;
      }

      case 'bsod-crash': {
        const ep = this._findEndpoint(targetId);
        if (!ep || ep.type === 'printer') throw new Error(`Endpoint not found or not a PC: ${targetId}`);
        ep.status = 'bsod-crash';
        this._logEvent(`BSOD crash on ${ep.name} (${ep.id})`);
        break;
      }

      case 'battery-failure': {
        const ep = this._findEndpoint(targetId);
        if (!ep || ep.type !== 'laptop') throw new Error(`Endpoint not found or not a laptop: ${targetId}`);
        ep.batteryHealthPct = 0;
        ep.status = 'battery-failure';
        this._logEvent(`Battery failure on ${ep.name} (${ep.id})`);
        break;
      }

      case 'driver-crash': {
        const ep = this._findEndpoint(targetId);
        if (!ep || ep.type === 'printer') throw new Error(`Endpoint not found or not a PC: ${targetId}`);
        ep.status = 'driver-crash';
        this._logEvent(`Driver crash on ${ep.name} (${ep.id})`);
        break;
      }

      case 'patch-failure': {
        const ep = this._findEndpoint(targetId);
        if (!ep) throw new Error(`Endpoint not found: ${targetId}`);
        ep.patchStatus = 'failed';
        ep.status = 'patch-failure';
        this._logEvent(`Patch deployment failed on ${ep.name} (${ep.id})`);
        break;
      }

      case 'printer-jam': {
        const ep = this._findEndpoint(targetId);
        if (!ep || ep.type !== 'printer') throw new Error(`Endpoint not found or not a printer: ${targetId}`);
        ep.status = 'paper-jam';
        this._logEvent(`Paper jam on ${ep.name} (${ep.id})`);
        break;
      }

      case 'printer-offline': {
        const ep = this._findEndpoint(targetId);
        if (!ep || ep.type !== 'printer') throw new Error(`Endpoint not found or not a printer: ${targetId}`);
        ep.status = 'offline';
        this._logEvent(`${ep.name} (${ep.id}) went offline`);
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

module.exports = { DeviceTwin, FAULT_TYPES, CATEGORY_BY_TYPE };
DEVICE_TWIN_EOF

cat > server/enterprise-lab/twins-router.js << 'TWINS_ROUTER_EOF'
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
const { DeviceTwin, FAULT_TYPES: DEVICE_FAULTS, CATEGORY_BY_TYPE: DEVICE_CATEGORY_BY_TYPE } = require('./device-twin');
const { ADTwin, FAULT_TYPES: AD_FAULTS } = require('./ad-twin');
const { M365Twin, FAULT_TYPES: M365_FAULTS } = require('./m365-twin');
const { KnowledgeCopilot } = require('./knowledge-copilot');
const { VendorOpsTwin, FAULT_TYPES: VENDOR_FAULTS } = require('./vendor-ops-twin');
const { ChaosEngine } = require('./chaos-engine');
const { SLAEngine } = require('./sla-engine');
const { AIScoringEngine } = require('./ai-scoring');
const { TechnicianMetrics } = require('./technician-performance-metrics');
const { HistoricalAnalytics } = require('./historical-analytics');
const { engine: incidentEngine } = require('./incident-engine');

const router = express.Router();

// Singleton twin instances shared across all requests (in-memory demo state).
const vmwareTwin = new VMwareTwin();
const networkTwin = new NetworkTwin();
const deviceTwin = new DeviceTwin();
const adTwin = new ADTwin();
const m365Twin = new M365Twin();
const knowledgeCopilot = new KnowledgeCopilot();
const vendorOpsTwin = new VendorOpsTwin();
const chaosEngine = new ChaosEngine({
  ad: { twin: adTwin, faultTypes: AD_FAULTS },
  m365: { twin: m365Twin, faultTypes: M365_FAULTS },
  network: { twin: networkTwin, faultTypes: NETWORK_FAULTS },
  device: { twin: deviceTwin, faultTypes: DEVICE_FAULTS },
  vendor: { twin: vendorOpsTwin, faultTypes: VENDOR_FAULTS },
});
const slaEngine = new SLAEngine(
  { ad: adTwin, m365: m365Twin, network: networkTwin, device: deviceTwin, vmware: vmwareTwin },
  vendorOpsTwin
);
const aiScoringEngine = new AIScoringEngine(slaEngine);
const technicianMetrics = new TechnicianMetrics();
const historicalAnalytics = new HistoricalAnalytics({
  slaEngine,
  chaosEngine,
  vendorOpsTwin,
  aiScoring: aiScoringEngine,
});
historicalAnalytics.start();

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

// ---- Device twin ----

router.get('/device/state', (req, res) => {
  res.json(deviceTwin.getState());
});

router.get('/device/fault-types', (req, res) => {
  res.json({ faultTypes: DEVICE_FAULTS });
});

router.post('/device/fault', (req, res) => {
  const { type, targetId } = req.body || {};
  try {
    const state = deviceTwin.applyFault(type, targetId);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/device/reset', (req, res) => {
  res.json(deviceTwin.reset());
});

// ---- AD twin ----

router.get('/ad/state', (req, res) => {
  res.json(adTwin.getState());
});

router.get('/ad/fault-types', (req, res) => {
  res.json({ faultTypes: AD_FAULTS });
});

router.post('/ad/fault', (req, res) => {
  const { type, targetId } = req.body || {};
  try {
    const state = adTwin.applyFault(type, targetId);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/ad/reset', (req, res) => {
  res.json(adTwin.reset());
});

// ---- M365 twin ----

router.get('/m365/state', (req, res) => {
  res.json(m365Twin.getState());
});

router.get('/m365/fault-types', (req, res) => {
  res.json({ faultTypes: M365_FAULTS });
});

router.post('/m365/fault', (req, res) => {
  const { type, targetId } = req.body || {};
  try {
    const state = m365Twin.applyFault(type, targetId);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/m365/reset', (req, res) => {
  res.json(m365Twin.reset());
});

// ---- Knowledge Copilot ----

router.get('/knowledge/entries', (req, res) => {
  res.json(knowledgeCopilot.getState());
});

router.get('/knowledge/lookup/:twinType/:faultType', (req, res) => {
  const entry = knowledgeCopilot.lookup(req.params.twinType, req.params.faultType);
  if (!entry) return res.status(404).json({ error: 'No knowledge entry found' });
  res.json(entry);
});

router.post('/knowledge/entry', (req, res) => {
  const { twinType, faultType, entry } = req.body || {};
  try {
    const saved = knowledgeCopilot.upsertEntry(twinType, faultType, entry);
    res.json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/knowledge/reset', (req, res) => {
  res.json(knowledgeCopilot.reset());
});

// ---- Vendor Operations ----

router.get('/vendor/state', (req, res) => {
  res.json(vendorOpsTwin.getState());
});

router.get('/vendor/fault-types', (req, res) => {
  res.json({ faultTypes: VENDOR_FAULTS });
});

router.post('/vendor/ticket', (req, res) => {
  const { vendorId, subject, priority } = req.body || {};
  try {
    const ticket = vendorOpsTwin.openTicket(vendorId, subject, priority);
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/vendor/fault', (req, res) => {
  const { type, targetId } = req.body || {};
  try {
    const state = vendorOpsTwin.applyFault(type, targetId);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/vendor/reset', (req, res) => {
  res.json(vendorOpsTwin.reset());
});

// ---- Chaos Engine ----

router.get('/chaos/status', (req, res) => {
  res.json(chaosEngine.getStatus());
});

router.post('/chaos/start', (req, res) => {
  const { intervalMs } = req.body || {};
  res.json(chaosEngine.start(intervalMs));
});

router.post('/chaos/stop', (req, res) => {
  res.json(chaosEngine.stop());
});

// Maps a successful chaos-engine fault into a real Service Desk ticket
// (Mission Queue entry), so injected faults are visible in the same
// queue technicians and the L1 Copilot already work from — not just
// in /api/twins/*/state and /api/twins/sla/status.
const SERVICE_DESK_CATEGORY_BY_MODULE = {
  ad: 'Active Directory',
  network: 'Network',
  vmware: 'VMware',
  m365: 'Microsoft 365',
  // device resolved dynamically below (laptop/desktop/printer)
  // vendor intentionally excluded: vendorOpsTwin has its own ticket flow
};

function humanizeFaultType(type) {
  return (type || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function bridgeToServiceDesk(result) {
  if (!result.ok || result.module === 'vendor') return null;

  let category = SERVICE_DESK_CATEGORY_BY_MODULE[result.module];
  if (result.module === 'device') {
    const endpoint = deviceTwin.getState().endpoints.find((e) => e.id === result.targetId);
    category = endpoint ? DEVICE_CATEGORY_BY_TYPE[endpoint.type] : undefined;
  }
  if (!category) return null;

  return incidentEngine.createIncident({
    category,
    issue: `${humanizeFaultType(result.type)} (${result.targetId}) [Chaos Engine]`,
  });
}

router.post('/chaos/trigger', (req, res) => {
  const { module: moduleName } = req.body || {};
  try {
    const result = moduleName ? chaosEngine.triggerOnce(moduleName) : chaosEngine.triggerRandom();
    technicianMetrics.recordIncident(result);
    const mission = bridgeToServiceDesk(result);
    if (mission) result.missionId = mission.id;
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---- SLA Intelligence ----

router.get('/sla/status', (req, res) => {
  res.json(slaEngine.evaluate());
});

router.get('/sla/summary', (req, res) => {
  res.json(slaEngine.summary());
});

// ---- AI Scoring ----

router.get('/scoring/status', (req, res) => {
  res.json(aiScoringEngine.score());
});

router.get('/scoring/summary', (req, res) => {
  res.json(aiScoringEngine.summary());
});

// ---- Technician Performance Metrics ----

router.get('/technicians/roster', (req, res) => {
  res.json(technicianMetrics.roster);
});

router.get('/technicians/metrics', (req, res) => {
  res.json(technicianMetrics.metrics());
});

router.get('/technicians/assignments', (req, res) => {
  res.json(technicianMetrics.listAssignments(req.query.techId));
});

router.post('/technicians/assignments/:id/resolve', (req, res) => {
  const a = technicianMetrics.resolve(req.params.id);
  if (!a) return res.status(404).json({ error: 'Assignment not found' });
  res.json(a);
});

// ---- Historical Analytics ----

router.get('/analytics/snapshots', (req, res) => {
  res.json(historicalAnalytics.getSnapshots(req.query.limit));
});

router.get('/analytics/latest', (req, res) => {
  res.json(historicalAnalytics.latest());
});

router.post('/analytics/snapshot', (req, res) => {
  res.json(historicalAnalytics.snapshotNow());
});

router.post('/analytics/start', (req, res) => {
  const { intervalMs } = req.body || {};
  res.json(historicalAnalytics.start(intervalMs));
});

router.post('/analytics/stop', (req, res) => {
  res.json(historicalAnalytics.stop());
});

module.exports = router;
TWINS_ROUTER_EOF

cat > server/enterprise-lab/sla-engine.js << 'SLA_ENGINE_EOF'
'use strict';

const SLA_RULES = [
  { match: /Account locked out/i, category: 'ad:account-lockout', hours: 1 },
  { match: /Password expired/i, category: 'ad:password-expired', hours: 4 },
  { match: /MFA failure/i, category: 'ad:mfa-failure', hours: 1 },
  { match: /Replication failure/i, category: 'ad:replication-failure', hours: 2 },
  { match: /GPO corruption/i, category: 'ad:gpo-corruption', hours: 4 },
  { match: /Mailbox full/i, category: 'm365:mailbox-full', hours: 4 },
  { match: /License pool exhausted/i, category: 'm365:license-exhausted', hours: 24 },
  { match: /Service outage/i, category: 'm365:service-outage', hours: 1 },
  { match: /Sync failure/i, category: 'm365:sync-failure', hours: 4 },
  { match: /BGP session flapping/i, category: 'network:bgp-flap', hours: 1 },
  { match: /is now unreachable/i, category: 'network:link-down', hours: 1 },
  { match: /Link .* went down/i, category: 'network:link-down', hours: 1 },
  { match: /Packet loss injected/i, category: 'network:packet-loss', hours: 2 },
  { match: /Latency spike injected/i, category: 'network:latency-spike', hours: 4 },
  { match: /HA failed: no surviving host/i, category: 'vmware:host-down-critical', hours: 0.5 },
  { match: /^Host .* went down/i, category: 'vmware:host-down', hours: 1 },
  { match: /HA restarted .*'s VMs on/i, category: 'vmware:host-down', hours: 1 },
  { match: /network-partitioned from vCenter/i, category: 'vmware:network-partition', hours: 1 },
  { match: /Datastore .* reached capacity/i, category: 'vmware:datastore-full', hours: 4 },
  { match: /Disk full on/i, category: 'device:disk-full', hours: 4 },
  { match: /BSOD crash on/i, category: 'device:bsod-crash', hours: 1 },
  { match: /Battery failure on/i, category: 'device:battery-failure', hours: 8 },
  { match: /Driver crash on/i, category: 'device:driver-crash', hours: 2 },
  { match: /Patch deployment failed on/i, category: 'device:patch-failure', hours: 24 },
  { match: /Paper jam on/i, category: 'device:printer-jam', hours: 4 },
  { match: /went offline/i, category: 'device:printer-offline', hours: 4 },
];

const RESET_MATCH = /reset to healthy baseline/i;

function classify(message) {
  for (const rule of SLA_RULES) {
    if (rule.match.test(message)) return rule;
  }
  return null;
}

class SLAEngine {
  constructor(twins, vendorOps) {
    this.twins = twins || {};
    this.vendorOps = vendorOps || null;
  }

  _statusFor(hoursElapsed, slaHours) {
    const ratio = hoursElapsed / slaHours;
    if (ratio >= 1) return 'breached';
    if (ratio >= 0.8) return 'at-risk';
    return 'on-track';
  }

  evaluate() {
    const now = Date.now();
    const issues = [];

    for (const [name, twin] of Object.entries(this.twins)) {
      const state = twin.getState();
      const events = state.events || [];
      if (!events.length) continue;
      const latest = events[0];
      if (RESET_MATCH.test(latest.message)) continue;
      const rule = classify(latest.message);
      if (!rule) continue;
      const hoursElapsed = (now - new Date(latest.ts).getTime()) / 3600000;
      issues.push({
        module: name,
        message: latest.message,
        ts: latest.ts,
        hoursElapsed: Number(hoursElapsed.toFixed(2)),
        slaHours: rule.hours,
        status: this._statusFor(hoursElapsed, rule.hours),
      });
    }

    if (this.vendorOps) {
      const vState = this.vendorOps.getState();
      for (const ticket of vState.tickets || []) {
        if (ticket.status === 'closed') continue;
        const vendor = (vState.vendors || []).find((v) => v.id === ticket.vendorId);
        const slaHours = vendor ? vendor.slaTargetHours : 24;
        const hoursElapsed = (now - new Date(ticket.openedAt).getTime()) / 3600000;
        issues.push({
          module: 'vendor',
          message: `${ticket.subject} (${ticket.id})`,
          ts: ticket.openedAt,
          hoursElapsed: Number(hoursElapsed.toFixed(2)),
          slaHours,
          status: ticket.slaBreached ? 'breached' : this._statusFor(hoursElapsed, slaHours),
        });
      }
    }

    return issues;
  }

  summary() {
    const issues = this.evaluate();
    const summary = { onTrack: 0, atRisk: 0, breached: 0, total: issues.length };
    for (const issue of issues) {
      if (issue.status === 'on-track') summary.onTrack += 1;
      else if (issue.status === 'at-risk') summary.atRisk += 1;
      else if (issue.status === 'breached') summary.breached += 1;
    }
    return summary;
  }
}

module.exports = { SLAEngine };
SLA_ENGINE_EOF

cat > test-twins.js << 'TEST_TWINS_EOF'
/**
 * test-twins.js
 * Exercises every fault type on both digital twins directly
 * (no HTTP server required). Run with: node test-twins.js
 */

'use strict';

const { VMwareTwin } = require('./server/enterprise-lab/vmware-twin');
const { NetworkTwin } = require('./server/enterprise-lab/network-twin');
const { DeviceTwin } = require('./server/enterprise-lab/device-twin');

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

function testDeviceTwin() {
  console.log('\nDevice Twin');
  const twin = new DeviceTwin();

  twin.applyFault('disk-full', 'lap-jdoe');
  const lap = twin.state.endpoints.find((e) => e.id === 'lap-jdoe');
  assert(lap.status === 'disk-full' && lap.diskFreePct === 1, 'disk-full fills disk and sets status');

  twin.reset();
  twin.applyFault('battery-failure', 'lap-bsmith');
  const bsmith = twin.state.endpoints.find((e) => e.id === 'lap-bsmith');
  assert(bsmith.status === 'battery-failure' && bsmith.batteryHealthPct === 0, 'battery-failure zeroes battery health');

  let threw = false;
  try {
    twin.applyFault('battery-failure', 'dsk-kchen');
  } catch (e) {
    threw = true;
  }
  assert(threw, 'battery-failure rejects non-laptop endpoints');

  twin.reset();
  twin.applyFault('printer-jam', 'prn-3f');
  const prn = twin.state.endpoints.find((e) => e.id === 'prn-3f');
  assert(prn.status === 'paper-jam', 'printer-jam sets paper-jam status');

  threw = false;
  try {
    twin.applyFault('printer-jam', 'lap-jdoe');
  } catch (e) {
    threw = true;
  }
  assert(threw, 'printer-jam rejects non-printer endpoints');

  twin.reset();
  twin.applyFault('patch-failure', 'dsk-finance-01');
  const dsk = twin.state.endpoints.find((e) => e.id === 'dsk-finance-01');
  assert(dsk.patchStatus === 'failed' && dsk.status === 'patch-failure', 'patch-failure marks patch and status');

  twin.applyFault('clear');
  const freshLap = twin.state.endpoints.find((e) => e.id === 'lap-jdoe');
  assert(freshLap.status === 'healthy', 'clear resets twin to healthy baseline');

  threw = false;
  try {
    twin.applyFault('disk-full', 'not-a-real-endpoint');
  } catch (e) {
    threw = true;
  }
  assert(threw, 'invalid targetId throws instead of silently failing');
}

testVMwareTwin();
testNetworkTwin();
testDeviceTwin();

console.log(`\n${failures === 0 ? '✅ All checks passed' : `❌ ${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
TEST_TWINS_EOF

echo "Files written. Running test-twins.js..."
node test-twins.js