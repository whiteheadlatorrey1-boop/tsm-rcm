#!/usr/bin/env bash
# safe-insert-sprint3.sh
# Adds Knowledge Copilot, Vendor Operations, Chaos Engine, and SLA
# Intelligence to the existing twins-router.js.
# - Writes knowledge-copilot.js, vendor-ops-twin.js, chaos-engine.js, sla-engine.js
# - Safely extends twins-router.js (backs it up first, skips if already patched)
# - Runs a standalone test suite covering all four modules

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

TARGET_DIR="$REPO_ROOT/server/enterprise-lab"
if [ ! -f "$TARGET_DIR/twins-router.js" ]; then
  echo "❌ $TARGET_DIR/twins-router.js not found. Run Sprint 2/2b first."
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "Writing server/enterprise-lab/knowledge-copilot.js..."
cat > "$TARGET_DIR/knowledge-copilot.js" << 'INNERKC_EOF'
'use strict';

function buildInitialKB() {
  return {
    'ad:account-lockout': {
      title: 'AD Account Lockout',
      steps: [
        'Confirm the lockout in Event Viewer (4740) on the PDC emulator',
        'Unlock the account via ADUC or Unlock-ADAccount',
        'Check for a stale credential on a mobile device or mapped drive causing repeated bad password attempts',
      ],
    },
    'ad:password-expired': {
      title: 'AD Password Expired',
      steps: [
        'Have the user reset via self-service portal or Ctrl+Alt+Del > Change Password',
        'If remote, walk them through resetting over VPN before the session locks',
        'Check password policy if this is happening unusually often',
      ],
    },
    'ad:mfa-failure': {
      title: 'AD MFA Failure',
      steps: [
        'Verify the MFA provider service status',
        "Confirm the user's enrolled device/method is still valid",
        'Re-enroll MFA if the method was lost or replaced',
      ],
    },
    'ad:replication-failure': {
      title: 'AD Replication Failure',
      steps: [
        'Run repadmin /replsummary on affected DCs',
        'Check network connectivity and DNS between DCs',
        'Force replication with repadmin /syncall once the root cause is fixed',
      ],
    },
    'ad:gpo-corruption': {
      title: 'GPO Corruption',
      steps: [
        'Check SYSVOL replication health',
        'Restore the GPO from backup or recreate it',
        'Re-link and force gpupdate on affected OU',
      ],
    },
    'm365:mailbox-full': {
      title: 'Mailbox Full',
      steps: [
        'Check mailbox size against quota in the M365 admin center',
        'Archive or delete old mail, or increase the quota/license tier',
        'Enable an archive mailbox if this is recurring',
      ],
    },
    'm365:license-exhausted': {
      title: 'License Pool Exhausted',
      steps: [
        'Check assigned vs total seats for the license SKU',
        'Reclaim licenses from disabled/departed users',
        'Purchase additional seats if usage is genuinely growing',
      ],
    },
    'm365:service-outage': {
      title: 'M365 Service Outage',
      steps: [
        'Check the Microsoft 365 Service Health Dashboard',
        'Post a status update to affected users',
        'Escalate to Microsoft support if outage exceeds SLA',
      ],
    },
    'm365:sync-failure': {
      title: 'Mailbox Sync Failure',
      steps: [
        'Check Outlook connectivity status (top right of Outlook)',
        'Rebuild the OST file or recreate the profile',
        'Verify no conditional access policy is blocking the client',
      ],
    },
  };
}

class KnowledgeCopilot {
  constructor() {
    this.kb = buildInitialKB();
    this.updatedAt = new Date().toISOString();
  }

  lookup(twinType, faultType) {
    const key = `${twinType}:${faultType}`;
    return this.kb[key] || null;
  }

  listEntries() {
    return Object.keys(this.kb).map((key) => {
      const [twinType, faultType] = key.split(':');
      return { twinType, faultType, title: this.kb[key].title };
    });
  }

  upsertEntry(twinType, faultType, entry) {
    if (!twinType || !faultType || !entry || !entry.title || !Array.isArray(entry.steps)) {
      throw new Error('Entry requires twinType, faultType, entry.title, and entry.steps[]');
    }
    const key = `${twinType}:${faultType}`;
    this.kb[key] = { title: entry.title, steps: entry.steps };
    this.updatedAt = new Date().toISOString();
    return this.kb[key];
  }

  reset() {
    this.kb = buildInitialKB();
    this.updatedAt = new Date().toISOString();
    return this.listEntries();
  }

  getState() {
    return { updatedAt: this.updatedAt, entries: this.listEntries() };
  }
}

module.exports = { KnowledgeCopilot };
INNERKC_EOF

echo "Writing server/enterprise-lab/vendor-ops-twin.js..."
cat > "$TARGET_DIR/vendor-ops-twin.js" << 'INNERVO_EOF'
'use strict';

const FAULT_TYPES = ['vendor-outage', 'ticket-escalated', 'sla-breach', 'shipment-delay', 'clear'];

function buildInitialState() {
  return {
    updatedAt: new Date().toISOString(),
    vendors: [
      { id: 'vendor-isp', name: 'Regional ISP', category: 'connectivity', status: 'healthy', slaTargetHours: 4 },
      { id: 'vendor-hw', name: 'Hardware Supplier', category: 'hardware', status: 'healthy', slaTargetHours: 48 },
      { id: 'vendor-cloud', name: 'Cloud Provider', category: 'cloud', status: 'healthy', slaTargetHours: 2 },
    ],
    tickets: [],
    events: [],
    nextTicketId: 1,
  };
}

class VendorOpsTwin {
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

  _logEvent(message) {
    this.state.events.unshift({ ts: new Date().toISOString(), message });
    this.state.events = this.state.events.slice(0, 25);
  }

  openTicket(vendorId, subject, priority) {
    const vendor = this.state.vendors.find((v) => v.id === vendorId);
    if (!vendor) throw new Error(`Vendor not found: ${vendorId}`);
    const ticket = {
      id: `ticket-${this.state.nextTicketId}`,
      vendorId,
      subject: subject || 'Vendor issue',
      priority: priority || 'normal',
      status: 'open',
      openedAt: new Date().toISOString(),
      slaBreached: false,
    };
    this.state.nextTicketId += 1;
    this.state.tickets.unshift(ticket);
    this._logEvent(`Ticket opened for ${vendor.name}: ${ticket.subject} (${ticket.id})`);
    this.state.updatedAt = new Date().toISOString();
    return ticket;
  }

  applyFault(type, targetId) {
    if (!FAULT_TYPES.includes(type)) {
      throw new Error(`Unknown fault type: ${type}`);
    }

    switch (type) {
      case 'vendor-outage': {
        const vendor = this.state.vendors.find((v) => v.id === targetId);
        if (!vendor) throw new Error(`Vendor not found: ${targetId}`);
        vendor.status = 'outage';
        this.openTicket(targetId, `${vendor.name} service outage`, 'high');
        this._logEvent(`Vendor outage: ${vendor.name}`);
        break;
      }

      case 'ticket-escalated': {
        const ticket = this.state.tickets.find((t) => t.id === targetId);
        if (!ticket) throw new Error(`Ticket not found: ${targetId}`);
        ticket.priority = 'high';
        this._logEvent(`Ticket escalated: ${ticket.id}`);
        break;
      }

      case 'sla-breach': {
        const ticket = this.state.tickets.find((t) => t.id === targetId);
        if (!ticket) throw new Error(`Ticket not found: ${targetId}`);
        ticket.slaBreached = true;
        this._logEvent(`SLA breached on ticket: ${ticket.id}`);
        break;
      }

      case 'shipment-delay': {
        const vendor = this.state.vendors.find((v) => v.id === targetId);
        if (!vendor) throw new Error(`Vendor not found: ${targetId}`);
        vendor.status = 'delayed';
        this._logEvent(`Shipment delayed: ${vendor.name}`);
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

module.exports = { VendorOpsTwin, FAULT_TYPES };
INNERVO_EOF

echo "Writing server/enterprise-lab/chaos-engine.js..."
cat > "$TARGET_DIR/chaos-engine.js" << 'INNERCE_EOF'
'use strict';

class ChaosEngine {
  constructor(twins) {
    this.twins = twins || {};
    this.intervalMs = 60000;
    this.timer = null;
    this.running = false;
    this.history = [];
  }

  _pickTargetId(state) {
    const pools = [];
    for (const key of Object.keys(state)) {
      const val = state[key];
      if (Array.isArray(val)) {
        val.forEach((item) => {
          if (item && item.id) pools.push(item.id);
        });
      } else if (val && typeof val === 'object') {
        Object.keys(val).forEach((k) => pools.push(k));
      }
    }
    if (!pools.length) return undefined;
    return pools[Math.floor(Math.random() * pools.length)];
  }

  _pickFaultType(faultTypes) {
    const candidates = (faultTypes || []).filter((t) => t !== 'clear');
    if (!candidates.length) return undefined;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  triggerOnce(moduleName) {
    const entry = this.twins[moduleName];
    if (!entry) throw new Error(`Unknown chaos module: ${moduleName}`);
    const { twin, faultTypes } = entry;
    const type = this._pickFaultType(faultTypes);
    const targetId = this._pickTargetId(twin.getState());
    const result = { ts: new Date().toISOString(), module: moduleName, type, targetId };
    try {
      twin.applyFault(type, targetId);
      result.ok = true;
    } catch (err) {
      result.ok = false;
      result.error = err.message;
    }
    this.history.unshift(result);
    this.history = this.history.slice(0, 50);
    return result;
  }

  triggerRandom() {
    const names = Object.keys(this.twins);
    if (!names.length) throw new Error('No twins registered with chaos engine');
    const moduleName = names[Math.floor(Math.random() * names.length)];
    return this.triggerOnce(moduleName);
  }

  start(intervalMs) {
    if (intervalMs) this.intervalMs = intervalMs;
    if (this.running) return this.getStatus();
    this.running = true;
    this.timer = setInterval(() => {
      try {
        this.triggerRandom();
      } catch (err) {
        // no twins registered, or all failed — safe to ignore on a tick
      }
    }, this.intervalMs);
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
    return {
      running: this.running,
      intervalMs: this.intervalMs,
      modules: Object.keys(this.twins),
      history: this.history.slice(0, 10),
    };
  }
}

module.exports = { ChaosEngine };
INNERCE_EOF

echo "Writing server/enterprise-lab/sla-engine.js..."
cat > "$TARGET_DIR/sla-engine.js" << 'INNERSLA_EOF'
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
INNERSLA_EOF

cat > "$WORKDIR/patch-router.js" << 'INNERPATCHER_EOF'
const fs = require('fs');

const ROUTER_PATH = process.argv[2];
const MARKER = 'knowledge-copilot';

if (!fs.existsSync(ROUTER_PATH)) {
  console.error(`❌ Not found: ${ROUTER_PATH}`);
  process.exit(1);
}

let content = fs.readFileSync(ROUTER_PATH, 'utf8');

if (content.includes(MARKER)) {
  console.log('twins-router.js already extended with Sprint 3 modules, skipping');
  process.exit(0);
}

const anchors = [
  {
    find: `const { M365Twin, FAULT_TYPES: M365_FAULTS } = require('./m365-twin');`,
    insertAfter: `\nconst { KnowledgeCopilot } = require('./knowledge-copilot');\nconst { VendorOpsTwin, FAULT_TYPES: VENDOR_FAULTS } = require('./vendor-ops-twin');\nconst { ChaosEngine } = require('./chaos-engine');\nconst { SLAEngine } = require('./sla-engine');`,
  },
  {
    find: `const m365Twin = new M365Twin();`,
    insertAfter: `\nconst knowledgeCopilot = new KnowledgeCopilot();\nconst vendorOpsTwin = new VendorOpsTwin();\nconst chaosEngine = new ChaosEngine({\n  ad: { twin: adTwin, faultTypes: AD_FAULTS },\n  m365: { twin: m365Twin, faultTypes: M365_FAULTS },\n  network: { twin: networkTwin, faultTypes: NETWORK_FAULTS },\n  vendor: { twin: vendorOpsTwin, faultTypes: VENDOR_FAULTS },\n});\nconst slaEngine = new SLAEngine({ ad: adTwin, m365: m365Twin }, vendorOpsTwin);`,
  },
  {
    find: `module.exports = router;`,
    insertBefore: `// ---- Knowledge Copilot ----

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

router.post('/chaos/trigger', (req, res) => {
  const { module: moduleName } = req.body || {};
  try {
    const result = moduleName ? chaosEngine.triggerOnce(moduleName) : chaosEngine.triggerRandom();
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

`,
  },
];

for (const anchor of anchors) {
  if (!content.includes(anchor.find)) {
    console.error(`❌ Expected anchor not found in ${ROUTER_PATH}:\n   "${anchor.find}"`);
    console.error(`   This file may have been hand-edited since Sprint 2b. Refusing to guess — patch manually.`);
    process.exit(1);
  }
}

const backupPath = `${ROUTER_PATH}.backup-${Date.now()}`;
fs.copyFileSync(ROUTER_PATH, backupPath);

for (const anchor of anchors) {
  if (anchor.insertAfter) {
    content = content.replace(anchor.find, anchor.find + anchor.insertAfter);
  } else if (anchor.insertBefore) {
    content = content.replace(anchor.find, anchor.insertBefore + anchor.find);
  }
}

fs.writeFileSync(ROUTER_PATH, content);

console.log(`✅ Patched ${ROUTER_PATH}`);
console.log(`   Added Knowledge Copilot routes: /knowledge/entries, /knowledge/lookup/:twinType/:faultType, /knowledge/entry, /knowledge/reset`);
console.log(`   Added Vendor Ops routes: /vendor/state, /vendor/fault-types, /vendor/ticket, /vendor/fault, /vendor/reset`);
console.log(`   Added Chaos Engine routes: /chaos/status, /chaos/start, /chaos/stop, /chaos/trigger`);
console.log(`   Added SLA Intelligence routes: /sla/status, /sla/summary`);
console.log(`   Backup saved to: ${backupPath}`);
INNERPATCHER_EOF

echo ""
echo "Patching twins-router.js..."
node "$WORKDIR/patch-router.js" "$TARGET_DIR/twins-router.js"

echo ""
echo "Checking twins-router.js syntax..."
node -c "$TARGET_DIR/twins-router.js" && echo "valid JS"

echo "Writing test-sprint3.js..."
cat > "$REPO_ROOT/test-sprint3.js" << 'INNERTEST_EOF'
'use strict';

const { KnowledgeCopilot } = require('./server/enterprise-lab/knowledge-copilot');
const { VendorOpsTwin } = require('./server/enterprise-lab/vendor-ops-twin');
const { ChaosEngine } = require('./server/enterprise-lab/chaos-engine');
const { SLAEngine } = require('./server/enterprise-lab/sla-engine');
const { ADTwin, FAULT_TYPES: AD_FAULTS } = require('./server/enterprise-lab/ad-twin');
const { M365Twin, FAULT_TYPES: M365_FAULTS } = require('./server/enterprise-lab/m365-twin');
const { NetworkTwin, FAULT_TYPES: NETWORK_FAULTS } = require('./server/enterprise-lab/network-twin');

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`  ✗ ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

function testKnowledgeCopilot() {
  console.log('\nKnowledge Copilot');
  const kc = new KnowledgeCopilot();

  const entry = kc.lookup('ad', 'account-lockout');
  assert(entry && entry.title === 'AD Account Lockout', 'lookup returns known AD entry');
  assert(kc.lookup('bogus', 'bogus') === null, 'lookup returns null for unknown entry');

  const before = kc.listEntries().length;
  kc.upsertEntry('vendor', 'vendor-outage', { title: 'Vendor Outage', steps: ['Call vendor support', 'Open a P1 ticket'] });
  assert(kc.listEntries().length === before + 1, 'upsertEntry adds a new entry');
  assert(kc.lookup('vendor', 'vendor-outage').title === 'Vendor Outage', 'new entry retrievable via lookup');

  let threw = false;
  try {
    kc.upsertEntry('x', 'y', { title: 'no steps' });
  } catch (e) {
    threw = true;
  }
  assert(threw, 'upsertEntry rejects malformed entries');

  kc.reset();
  assert(kc.listEntries().length === before, 'reset restores original entry count');
}

function testVendorOps() {
  console.log('\nVendor Operations');
  const vo = new VendorOpsTwin();

  const ticket = vo.openTicket('vendor-isp', 'Intermittent packet loss', 'normal');
  assert(ticket.status === 'open', 'openTicket creates an open ticket');

  vo.applyFault('vendor-outage', 'vendor-cloud');
  const cloud = vo.state.vendors.find((v) => v.id === 'vendor-cloud');
  assert(cloud.status === 'outage', 'vendor-outage marks vendor down');
  assert(vo.state.tickets.some((t) => t.vendorId === 'vendor-cloud'), 'vendor-outage auto-opens a ticket');

  vo.applyFault('ticket-escalated', ticket.id);
  assert(vo.state.tickets.find((t) => t.id === ticket.id).priority === 'high', 'ticket-escalated raises priority');

  vo.applyFault('sla-breach', ticket.id);
  assert(vo.state.tickets.find((t) => t.id === ticket.id).slaBreached === true, 'sla-breach flags the ticket');

  vo.applyFault('shipment-delay', 'vendor-hw');
  assert(vo.state.vendors.find((v) => v.id === 'vendor-hw').status === 'delayed', 'shipment-delay marks vendor delayed');

  vo.applyFault('clear');
  assert(vo.state.vendors.every((v) => v.status === 'healthy') && vo.state.tickets.length === 0, 'clear resets to healthy baseline');

  let threw = false;
  try {
    vo.applyFault('vendor-outage', 'not-a-vendor');
  } catch (e) {
    threw = true;
  }
  assert(threw, 'invalid targetId throws instead of silently failing');
}

function testChaosEngine() {
  console.log('\nChaos Engine');
  const ad = new ADTwin();
  const m365 = new M365Twin();
  const network = new NetworkTwin();

  const chaos = new ChaosEngine({
    ad: { twin: ad, faultTypes: AD_FAULTS },
    m365: { twin: m365, faultTypes: M365_FAULTS },
    network: { twin: network, faultTypes: NETWORK_FAULTS },
  });

  const result = chaos.triggerOnce('ad');
  assert(result.module === 'ad' && typeof result.type === 'string', 'triggerOnce picks a fault type for the named module');
  assert(ad.state.events.length > 0 || result.ok === false, 'triggerOnce actually calls applyFault on the real twin');

  let sawEachModule = new Set();
  for (let i = 0; i < 30; i += 1) {
    const r = chaos.triggerRandom();
    sawEachModule.add(r.module);
  }
  assert(sawEachModule.size >= 2, 'triggerRandom distributes across registered modules over many calls');

  let threw = false;
  try {
    chaos.triggerOnce('not-a-module');
  } catch (e) {
    threw = true;
  }
  assert(threw, 'triggerOnce rejects an unknown module name');

  return new Promise((resolve) => {
    chaos.start(20);
    assert(chaos.getStatus().running === true, 'start() flips running to true');
    setTimeout(() => {
      chaos.stop();
      assert(chaos.getStatus().running === false, 'stop() flips running back to false');
      assert(chaos.history.length > 0, 'interval ticks recorded history entries');
      resolve();
    }, 90);
  });
}

function testSLAEngine() {
  console.log('\nSLA Engine');

  const oldTs = new Date(Date.now() - 5 * 3600000).toISOString();
  const freshTs = new Date(Date.now() - 5 * 60000).toISOString();

  const fakeAd = { getState: () => ({ events: [{ ts: oldTs, message: 'Account locked out: Jane Doe (jdoe)' }] }) };
  const fakeM365 = { getState: () => ({ events: [{ ts: freshTs, message: 'Mailbox full: Bob Smith (bsmith@corp.local)' }] }) };
  const fakeCleared = { getState: () => ({ events: [{ ts: oldTs, message: 'Twin state reset to healthy baseline' }] }) };

  const fakeVendorOps = {
    getState: () => ({
      vendors: [{ id: 'vendor-isp', slaTargetHours: 4 }],
      tickets: [
        { id: 'ticket-1', vendorId: 'vendor-isp', subject: 'Outage', status: 'open', openedAt: oldTs, slaBreached: false },
      ],
    }),
  };

  const sla = new SLAEngine({ ad: fakeAd, m365: fakeM365, cleared: fakeCleared }, fakeVendorOps);
  const issues = sla.evaluate();

  const adIssue = issues.find((i) => i.module === 'ad');
  assert(adIssue && adIssue.status === 'breached', 'a 5h-old 1h-SLA AD lockout is classified as breached');

  const m365Issue = issues.find((i) => i.module === 'm365');
  assert(m365Issue && m365Issue.status === 'on-track', 'a 5m-old 4h-SLA mailbox issue is classified as on-track');

  assert(!issues.some((i) => i.module === 'cleared'), 'a twin whose latest event is a reset is excluded');

  const vendorIssue = issues.find((i) => i.module === 'vendor');
  assert(vendorIssue && vendorIssue.status === 'breached', 'an open vendor ticket past its SLA is classified as breached');

  const summary = sla.summary();
  assert(summary.total === issues.length, 'summary total matches evaluate() issue count');
  assert(summary.breached >= 2, 'summary counts breaches correctly');
}

async function main() {
  testKnowledgeCopilot();
  testVendorOps();
  await testChaosEngine();
  testSLAEngine();

  console.log(`\n${failures === 0 ? '✅ All checks passed' : `❌ ${failures} check(s) failed`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
INNERTEST_EOF

echo ""
echo "Running Sprint 3 test suite..."
node "$REPO_ROOT/test-sprint3.js"

echo ""
echo "✅ Sprint 3 modules added and tests passed."
echo ""
echo "New endpoints (no server.js changes needed — already mounted at /api/twins):"
echo "  GET  /api/twins/knowledge/entries              GET  /api/twins/knowledge/lookup/:twinType/:faultType"
echo "  POST /api/twins/knowledge/entry                POST /api/twins/knowledge/reset"
echo "  GET  /api/twins/vendor/state                   GET  /api/twins/vendor/fault-types"
echo "  POST /api/twins/vendor/ticket                  POST /api/twins/vendor/fault      POST /api/twins/vendor/reset"
echo "  GET  /api/twins/chaos/status"
echo "  POST /api/twins/chaos/start                    POST /api/twins/chaos/stop         POST /api/twins/chaos/trigger"
echo "  GET  /api/twins/sla/status                      GET  /api/twins/sla/summary"
echo ""
echo "Note: VMware is not yet wired into Chaos Engine or SLA Intelligence —"
echo "tell Claude your vmware twin's variable name in twins-router.js and it's a quick follow-up patch."
echo ""
echo "Restart your server, then try:"
echo "  curl http://localhost:8080/api/twins/knowledge/lookup/ad/account-lockout"
echo "  curl -X POST http://localhost:8080/api/twins/chaos/trigger"
echo "  curl http://localhost:8080/api/twins/sla/status"
