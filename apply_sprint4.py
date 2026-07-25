#!/usr/bin/env python3
"""
apply_sprint4.py
Applies in one shot:
  1. SLA/network-VMware classification fix (sla-engine.js + twins-router.js wiring)
  2. Sprint 4 rebuild: chaos-engine.js cumulative counters, ai-scoring.js,
     technician-performance-metrics.js, historical-analytics.js, all wired
     into twins-router.js with new routes.

Idempotent: safe to re-run. Each step checks whether it's already applied
and skips with a message instead of double-patching.

Run from repo root:
    python3 apply_sprint4.py
Then:
    node --check server/enterprise-lab/sla-engine.js
    node --check server/enterprise-lab/chaos-engine.js
    node --check server/enterprise-lab/ai-scoring.js
    node --check server/enterprise-lab/technician-performance-metrics.js
    node --check server/enterprise-lab/historical-analytics.js
    node --check server/enterprise-lab/twins-router.js
"""
import os
import sys

ROOT = os.path.join(os.getcwd(), "server", "enterprise-lab")


def assert_exists(path):
    full = os.path.join(ROOT, path)
    assert os.path.isfile(full), f"Expected file not found: {full}"
    return full


def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def patch(path, old, new, label):
    content = read(path)
    if new in content:
        print(f"  [skip] {label} — already applied")
        return
    assert old in content, f"[{label}] expected text not found in {path}; aborting to avoid corrupting the file"
    assert content.count(old) == 1, f"[{label}] expected text is not unique in {path}; aborting"
    content = content.replace(old, new)
    write(path, content)
    print(f"  [ok]   {label}")


def create_if_missing(path, content, label):
    if os.path.isfile(path):
        print(f"  [skip] {label} — file already exists")
        return
    write(path, content)
    print(f"  [ok]   {label} — created {path}")


# ---------------------------------------------------------------------------
# STEP 1: SLA / network+VMware classification fix
# ---------------------------------------------------------------------------
print("Step 1: SLA network/VMware classification fix")

sla_path = assert_exists("sla-engine.js")
patch(
    sla_path,
    old="  { match: /Service outage/i, category: 'm365:service-outage', hours: 1 },\n"
        "  { match: /Sync failure/i, category: 'm365:sync-failure', hours: 4 },\n"
        "];",
    new="  { match: /Service outage/i, category: 'm365:service-outage', hours: 1 },\n"
        "  { match: /Sync failure/i, category: 'm365:sync-failure', hours: 4 },\n"
        "  { match: /BGP session flapping/i, category: 'network:bgp-flap', hours: 1 },\n"
        "  { match: /is now unreachable/i, category: 'network:link-down', hours: 1 },\n"
        "  { match: /Link .* went down/i, category: 'network:link-down', hours: 1 },\n"
        "  { match: /Packet loss injected/i, category: 'network:packet-loss', hours: 2 },\n"
        "  { match: /Latency spike injected/i, category: 'network:latency-spike', hours: 4 },\n"
        "  { match: /HA failed: no surviving host/i, category: 'vmware:host-down-critical', hours: 0.5 },\n"
        "  { match: /^Host .* went down/i, category: 'vmware:host-down', hours: 1 },\n"
        "  { match: /HA restarted .*'s VMs on/i, category: 'vmware:host-down', hours: 1 },\n"
        "  { match: /network-partitioned from vCenter/i, category: 'vmware:network-partition', hours: 1 },\n"
        "  { match: /Datastore .* reached capacity/i, category: 'vmware:datastore-full', hours: 4 },\n"
        "];",
    label="SLA_RULES: add network + VMware fault patterns",
)

twins_router_path = assert_exists("twins-router.js")
patch(
    twins_router_path,
    old="const slaEngine = new SLAEngine({ ad: adTwin, m365: m365Twin }, vendorOpsTwin);",
    new=(
        "const slaEngine = new SLAEngine(\n"
        "  { ad: adTwin, m365: m365Twin, network: networkTwin, vmware: vmwareTwin },\n"
        "  vendorOpsTwin\n"
        ");"
    ),
    label="SLAEngine: wire in networkTwin + vmwareTwin",
)

# ---------------------------------------------------------------------------
# STEP 2: chaos-engine.js cumulative counters
# ---------------------------------------------------------------------------
print("Step 2: chaos-engine.js cumulative trigger/success/failure counters")

chaos_path = assert_exists("chaos-engine.js")
patch(
    chaos_path,
    old="    this.running = false;\n    this.history = [];\n  }",
    new=(
        "    this.running = false;\n"
        "    this.history = [];\n"
        "    this.counters = { triggered: 0, succeeded: 0, failed: 0 };\n"
        "  }"
    ),
    label="constructor: add counters",
)
patch(
    chaos_path,
    old=(
        "    this.history.unshift(result);\n"
        "    this.history = this.history.slice(0, 50);\n"
        "    return result;\n"
        "  }"
    ),
    new=(
        "    this.history.unshift(result);\n"
        "    this.history = this.history.slice(0, 50);\n"
        "    this.counters.triggered += 1;\n"
        "    if (result.ok) this.counters.succeeded += 1;\n"
        "    else this.counters.failed += 1;\n"
        "    return result;\n"
        "  }"
    ),
    label="triggerOnce(): increment cumulative counters",
)
patch(
    chaos_path,
    old=(
        "    return {\n"
        "      running: this.running,\n"
        "      intervalMs: this.intervalMs,\n"
        "      modules: Object.keys(this.twins),\n"
        "      history: this.history.slice(0, 10),\n"
        "    };"
    ),
    new=(
        "    return {\n"
        "      running: this.running,\n"
        "      intervalMs: this.intervalMs,\n"
        "      modules: Object.keys(this.twins),\n"
        "      history: this.history.slice(0, 10),\n"
        "      counters: { ...this.counters },\n"
        "    };"
    ),
    label="getStatus(): expose counters",
)

# ---------------------------------------------------------------------------
# STEP 3: new Sprint 4 modules
# ---------------------------------------------------------------------------
print("Step 3: create Sprint 4 modules")

ai_scoring_js = """'use strict';

/**
 * AI Scoring Engine
 * NOTE: this is a deterministic weighted-heuristic risk model based on
 * SLA proximity and breach status — not a literal trained ML model. Same
 * class of scoring you'd see in real ITSM tools (priority matrices), just
 * transparent about what's under the hood.
 */

const MODULE_WEIGHT = {
  ad: 1.2,
  m365: 1.0,
  network: 1.3,
  vmware: 1.3,
  vendor: 0.8,
};

const STATUS_BASE = {
  'on-track': 20,
  'at-risk': 60,
  'breached': 90,
};

class AIScoringEngine {
  constructor(slaEngine) {
    this.slaEngine = slaEngine;
  }

  _scoreIssue(issue) {
    const base = STATUS_BASE[issue.status] || 20;
    const proximity = Math.min(issue.hoursElapsed / issue.slaHours, 1.5);
    const proximityPoints = proximity * 15;
    const weight = MODULE_WEIGHT[issue.module] || 1.0;
    const raw = (base + proximityPoints) * weight;
    const riskScore = Math.max(0, Math.min(100, Math.round(raw)));
    const riskTier = riskScore >= 80 ? 'critical' : riskScore >= 50 ? 'elevated' : 'normal';
    return { ...issue, riskScore, riskTier };
  }

  score() {
    return this.slaEngine.evaluate().map((issue) => this._scoreIssue(issue));
  }

  summary() {
    const scored = this.score();
    const summary = { critical: 0, elevated: 0, normal: 0, avgScore: 0, total: scored.length };
    if (!scored.length) return summary;
    let total = 0;
    for (const s of scored) {
      total += s.riskScore;
      summary[s.riskTier] += 1;
    }
    summary.avgScore = Number((total / scored.length).toFixed(1));
    return summary;
  }
}

module.exports = { AIScoringEngine };
"""

technician_metrics_js = """'use strict';

/**
 * Technician Performance Metrics
 * NOTE: this is a simulated round-robin assignment layer on top of Chaos
 * Engine incidents — there's no real ticketing/dispatch system underneath.
 * It exists to demo how a technician-performance view would consume the
 * digital-twin incident stream, not to model real staffing.
 */

const ROSTER = [
  { id: 'tech-1', name: 'J. Alvarez' },
  { id: 'tech-2', name: 'M. Chen' },
  { id: 'tech-3', name: 'R. Patel' },
  { id: 'tech-4', name: 'S. Okafor' },
];

class TechnicianMetrics {
  constructor(roster) {
    this.roster = roster || ROSTER;
    this.assignments = [];
    this._nextIndex = 0;
    this._nextId = 1;
  }

  _nextTech() {
    const tech = this.roster[this._nextIndex % this.roster.length];
    this._nextIndex += 1;
    return tech;
  }

  // Call with the result of chaosEngine.triggerOnce()/triggerRandom().
  recordIncident(chaosResult) {
    if (!chaosResult || chaosResult.ok !== true) return null;
    const tech = this._nextTech();
    const assignment = {
      id: `assign-${this._nextId++}`,
      techId: tech.id,
      techName: tech.name,
      module: chaosResult.module,
      type: chaosResult.type,
      targetId: chaosResult.targetId,
      assignedAt: chaosResult.ts,
      resolved: false,
      resolvedAt: null,
      resolutionMinutes: null,
    };
    this.assignments.unshift(assignment);
    this.assignments = this.assignments.slice(0, 200);
    return assignment;
  }

  resolve(assignmentId) {
    const a = this.assignments.find((x) => x.id === assignmentId);
    if (!a) return null;
    if (a.resolved) return a;
    a.resolved = true;
    a.resolvedAt = new Date().toISOString();
    a.resolutionMinutes = Number(
      ((new Date(a.resolvedAt).getTime() - new Date(a.assignedAt).getTime()) / 60000).toFixed(2)
    );
    return a;
  }

  listAssignments(techId) {
    return techId ? this.assignments.filter((a) => a.techId === techId) : this.assignments;
  }

  metrics() {
    const byTech = {};
    for (const tech of this.roster) {
      byTech[tech.id] = {
        techId: tech.id,
        techName: tech.name,
        assigned: 0,
        resolved: 0,
        open: 0,
        totalResolutionMinutes: 0,
        avgResolutionMinutes: null,
      };
    }
    for (const a of this.assignments) {
      const bucket = byTech[a.techId];
      if (!bucket) continue;
      bucket.assigned += 1;
      if (a.resolved) {
        bucket.resolved += 1;
        bucket.totalResolutionMinutes += a.resolutionMinutes || 0;
      } else {
        bucket.open += 1;
      }
    }
    return Object.values(byTech).map((b) => ({
      ...b,
      avgResolutionMinutes: b.resolved ? Number((b.totalResolutionMinutes / b.resolved).toFixed(2)) : null,
    }));
  }
}

module.exports = { TechnicianMetrics, ROSTER };
"""

historical_analytics_js = """'use strict';

/**
 * Historical Analytics
 * Periodic snapshotting of SLA summary + chaos-engine cumulative counters
 * (NOT capped event-history length, which resets/truncates and would
 * understate activity over time) + AI-scoring summary + open vendor
 * ticket count. Snapshots are capped in memory (demo-scale, not a real
 * time-series store).
 */

class HistoricalAnalytics {
  constructor({ slaEngine, chaosEngine, vendorOpsTwin, aiScoring }) {
    this.slaEngine = slaEngine;
    this.chaosEngine = chaosEngine;
    this.vendorOpsTwin = vendorOpsTwin;
    this.aiScoring = aiScoring || null;
    this.snapshots = [];
    this.maxSnapshots = 200;
    this.intervalMs = 30000;
    this.timer = null;
    this.running = false;
  }

  _takeSnapshot() {
    const slaSummary = this.slaEngine.summary();
    const chaosStatus = this.chaosEngine.getStatus();
    const scoring = this.aiScoring ? this.aiScoring.summary() : null;
    const vendorState = this.vendorOpsTwin ? this.vendorOpsTwin.getState() : null;
    const openVendorTickets = vendorState
      ? (vendorState.tickets || []).filter((t) => t.status !== 'closed').length
      : null;

    const snapshot = {
      ts: new Date().toISOString(),
      sla: slaSummary,
      chaos: {
        running: chaosStatus.running,
        triggeredCumulative: chaosStatus.counters ? chaosStatus.counters.triggered : null,
        succeededCumulative: chaosStatus.counters ? chaosStatus.counters.succeeded : null,
        failedCumulative: chaosStatus.counters ? chaosStatus.counters.failed : null,
      },
      scoring,
      openVendorTickets,
    };
    this.snapshots.unshift(snapshot);
    this.snapshots = this.snapshots.slice(0, this.maxSnapshots);
    return snapshot;
  }

  snapshotNow() {
    return this._takeSnapshot();
  }

  start(intervalMs) {
    if (intervalMs) this.intervalMs = intervalMs;
    if (this.running) return this.getStatus();
    this.running = true;
    this._takeSnapshot();
    this.timer = setInterval(() => this._takeSnapshot(), this.intervalMs);
    if (this.timer.unref) this.timer.unref();
    return this.getStatus();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    return this.getStatus();
  }

  getStatus() {
    return { running: this.running, intervalMs: this.intervalMs, snapshotCount: this.snapshots.length };
  }

  getSnapshots(limit) {
    const n = limit ? parseInt(limit, 10) : undefined;
    return n ? this.snapshots.slice(0, n) : this.snapshots;
  }

  latest() {
    return this.snapshots[0] || null;
  }
}

module.exports = { HistoricalAnalytics };
"""

create_if_missing(os.path.join(ROOT, "ai-scoring.js"), ai_scoring_js, "ai-scoring.js")
create_if_missing(
    os.path.join(ROOT, "technician-performance-metrics.js"),
    technician_metrics_js,
    "technician-performance-metrics.js",
)
create_if_missing(os.path.join(ROOT, "historical-analytics.js"), historical_analytics_js, "historical-analytics.js")

# ---------------------------------------------------------------------------
# STEP 4: wire the three new modules into twins-router.js
# ---------------------------------------------------------------------------
print("Step 4: wire Sprint 4 modules into twins-router.js")

patch(
    twins_router_path,
    old="const { SLAEngine } = require('./sla-engine');",
    new=(
        "const { SLAEngine } = require('./sla-engine');\n"
        "const { AIScoringEngine } = require('./ai-scoring');\n"
        "const { TechnicianMetrics } = require('./technician-performance-metrics');\n"
        "const { HistoricalAnalytics } = require('./historical-analytics');"
    ),
    label="require Sprint 4 modules",
)

patch(
    twins_router_path,
    old=(
        "const slaEngine = new SLAEngine(\n"
        "  { ad: adTwin, m365: m365Twin, network: networkTwin, vmware: vmwareTwin },\n"
        "  vendorOpsTwin\n"
        ");"
    ),
    new=(
        "const slaEngine = new SLAEngine(\n"
        "  { ad: adTwin, m365: m365Twin, network: networkTwin, vmware: vmwareTwin },\n"
        "  vendorOpsTwin\n"
        ");\n"
        "const aiScoringEngine = new AIScoringEngine(slaEngine);\n"
        "const technicianMetrics = new TechnicianMetrics();\n"
        "const historicalAnalytics = new HistoricalAnalytics({\n"
        "  slaEngine,\n"
        "  chaosEngine,\n"
        "  vendorOpsTwin,\n"
        "  aiScoring: aiScoringEngine,\n"
        "});\n"
        "historicalAnalytics.start();"
    ),
    label="instantiate Sprint 4 engines + start snapshotting",
)

patch(
    twins_router_path,
    old=(
        "router.post('/chaos/trigger', (req, res) => {\n"
        "  const { module: moduleName } = req.body || {};\n"
        "  try {\n"
        "    const result = moduleName ? chaosEngine.triggerOnce(moduleName) : chaosEngine.triggerRandom();\n"
        "    res.json(result);\n"
        "  } catch (err) {\n"
        "    res.status(400).json({ error: err.message });\n"
        "  }\n"
        "});"
    ),
    new=(
        "router.post('/chaos/trigger', (req, res) => {\n"
        "  const { module: moduleName } = req.body || {};\n"
        "  try {\n"
        "    const result = moduleName ? chaosEngine.triggerOnce(moduleName) : chaosEngine.triggerRandom();\n"
        "    technicianMetrics.recordIncident(result);\n"
        "    res.json(result);\n"
        "  } catch (err) {\n"
        "    res.status(400).json({ error: err.message });\n"
        "  }\n"
        "});"
    ),
    label="hook chaos/trigger into technician assignment",
)

patch(
    twins_router_path,
    old="module.exports = router;",
    new=(
        "// ---- AI Scoring ----\n\n"
        "router.get('/scoring/status', (req, res) => {\n"
        "  res.json(aiScoringEngine.score());\n"
        "});\n\n"
        "router.get('/scoring/summary', (req, res) => {\n"
        "  res.json(aiScoringEngine.summary());\n"
        "});\n\n"
        "// ---- Technician Performance Metrics ----\n\n"
        "router.get('/technicians/roster', (req, res) => {\n"
        "  res.json(technicianMetrics.roster);\n"
        "});\n\n"
        "router.get('/technicians/metrics', (req, res) => {\n"
        "  res.json(technicianMetrics.metrics());\n"
        "});\n\n"
        "router.get('/technicians/assignments', (req, res) => {\n"
        "  res.json(technicianMetrics.listAssignments(req.query.techId));\n"
        "});\n\n"
        "router.post('/technicians/assignments/:id/resolve', (req, res) => {\n"
        "  const a = technicianMetrics.resolve(req.params.id);\n"
        "  if (!a) return res.status(404).json({ error: 'Assignment not found' });\n"
        "  res.json(a);\n"
        "});\n\n"
        "// ---- Historical Analytics ----\n\n"
        "router.get('/analytics/snapshots', (req, res) => {\n"
        "  res.json(historicalAnalytics.getSnapshots(req.query.limit));\n"
        "});\n\n"
        "router.get('/analytics/latest', (req, res) => {\n"
        "  res.json(historicalAnalytics.latest());\n"
        "});\n\n"
        "router.post('/analytics/snapshot', (req, res) => {\n"
        "  res.json(historicalAnalytics.snapshotNow());\n"
        "});\n\n"
        "router.post('/analytics/start', (req, res) => {\n"
        "  const { intervalMs } = req.body || {};\n"
        "  res.json(historicalAnalytics.start(intervalMs));\n"
        "});\n\n"
        "router.post('/analytics/stop', (req, res) => {\n"
        "  res.json(historicalAnalytics.stop());\n"
        "});\n\n"
        "module.exports = router;"
    ),
    label="add scoring/technicians/analytics routes",
)

print("\nDone. Now run:")
print("  node --check server/enterprise-lab/sla-engine.js")
print("  node --check server/enterprise-lab/chaos-engine.js")
print("  node --check server/enterprise-lab/ai-scoring.js")
print("  node --check server/enterprise-lab/technician-performance-metrics.js")
print("  node --check server/enterprise-lab/historical-analytics.js")
print("  node --check server/enterprise-lab/twins-router.js")