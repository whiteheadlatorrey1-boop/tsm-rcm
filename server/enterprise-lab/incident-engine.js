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

