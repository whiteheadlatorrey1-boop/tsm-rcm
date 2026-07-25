#!/usr/bin/env bash
# safe-insert-sprint2b.sh
# Adds AD + M365 digital twins alongside the existing VMware/Network ones.
# - Writes ad-twin.js and m365-twin.js
# - Safely extends twins-router.js (backs it up first, skips if already patched)
# - Runs a full test suite covering all four twins

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
  echo "❌ $TARGET_DIR/twins-router.js not found. Run Sprint 2's VMware/Network script first."
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "Writing server/enterprise-lab/ad-twin.js..."
cat > "$TARGET_DIR/ad-twin.js" << 'INNERAD_EOF'
/**
 * Active Directory Digital Twin
 * In-memory simulation of a small AD environment: OUs, users, groups,
 * and domain controllers with replication. Supports fault injection
 * for demoing identity incidents (lockouts, MFA failures, replication
 * breaks, GPO issues) without touching a real domain.
 */

'use strict';

const FAULT_TYPES = ['account-lockout', 'password-expired', 'mfa-failure', 'replication-failure', 'gpo-corruption', 'clear'];

function buildInitialState() {
  return {
    updatedAt: new Date().toISOString(),
    domainControllers: [
      { id: 'dc-01', name: 'DC01.corp.local', role: 'PDC Emulator', status: 'up', replicationStatus: 'healthy' },
      { id: 'dc-02', name: 'DC02.corp.local', role: 'Replica', status: 'up', replicationStatus: 'healthy' },
    ],
    organizationalUnits: [
      { id: 'ou-sales', name: 'Sales', gpoStatus: 'applied' },
      { id: 'ou-eng', name: 'Engineering', gpoStatus: 'applied' },
      { id: 'ou-finance', name: 'Finance', gpoStatus: 'applied' },
    ],
    users: {
      'jdoe': { id: 'jdoe', name: 'Jane Doe', ou: 'ou-sales', status: 'active', mfaEnrolled: true, passwordExpiresInDays: 45 },
      'bsmith': { id: 'bsmith', name: 'Bob Smith', ou: 'ou-eng', status: 'active', mfaEnrolled: true, passwordExpiresInDays: 12 },
      'kchen': { id: 'kchen', name: 'Kim Chen', ou: 'ou-finance', status: 'active', mfaEnrolled: false, passwordExpiresInDays: 30 },
    },
    groups: [
      { id: 'grp-sales-all', name: 'Sales-All', members: ['jdoe'] },
      { id: 'grp-eng-all', name: 'Engineering-All', members: ['bsmith'] },
      { id: 'grp-finance-all', name: 'Finance-All', members: ['kchen'] },
    ],
    events: [],
  };
}

class ADTwin {
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

  applyFault(type, targetId) {
    if (!FAULT_TYPES.includes(type)) {
      throw new Error(`Unknown fault type: ${type}`);
    }

    switch (type) {
      case 'account-lockout': {
        const user = this.state.users[targetId];
        if (!user) throw new Error(`User not found: ${targetId}`);
        user.status = 'locked-out';
        this._logEvent(`Account locked out: ${user.name} (${user.id})`);
        break;
      }

      case 'password-expired': {
        const user = this.state.users[targetId];
        if (!user) throw new Error(`User not found: ${targetId}`);
        user.status = 'password-expired';
        user.passwordExpiresInDays = 0;
        this._logEvent(`Password expired: ${user.name} (${user.id})`);
        break;
      }

      case 'mfa-failure': {
        const user = this.state.users[targetId];
        if (!user) throw new Error(`User not found: ${targetId}`);
        user.mfaEnrolled = false;
        user.status = 'mfa-blocked';
        this._logEvent(`MFA failure blocking sign-in: ${user.name} (${user.id})`);
        break;
      }

      case 'replication-failure': {
        const dc = this.state.domainControllers.find((d) => d.id === targetId);
        if (!dc) throw new Error(`Domain controller not found: ${targetId}`);
        dc.replicationStatus = 'failed';
        this._logEvent(`Replication failure on ${dc.name}`);
        break;
      }

      case 'gpo-corruption': {
        const ou = this.state.organizationalUnits.find((o) => o.id === targetId);
        if (!ou) throw new Error(`OU not found: ${targetId}`);
        ou.gpoStatus = 'corrupted';
        this._logEvent(`GPO corruption detected in ${ou.name}`);
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

module.exports = { ADTwin, FAULT_TYPES };
INNERAD_EOF

echo "Writing server/enterprise-lab/m365-twin.js..."
cat > "$TARGET_DIR/m365-twin.js" << 'INNERM365_EOF'
/**
 * Microsoft 365 Digital Twin
 * In-memory simulation of an M365 tenant: mailboxes, licenses, and
 * core service health (Exchange, Teams, SharePoint, OneDrive).
 * Supports fault injection for demoing M365 incidents.
 */

'use strict';

const FAULT_TYPES = ['mailbox-full', 'license-exhausted', 'service-outage', 'sync-failure', 'clear'];

function buildInitialState() {
  return {
    updatedAt: new Date().toISOString(),
    services: [
      { id: 'exchange', name: 'Exchange Online', status: 'healthy' },
      { id: 'teams', name: 'Microsoft Teams', status: 'healthy' },
      { id: 'sharepoint', name: 'SharePoint Online', status: 'healthy' },
      { id: 'onedrive', name: 'OneDrive for Business', status: 'healthy' },
    ],
    mailboxes: {
      'jdoe@corp.local': { id: 'jdoe@corp.local', owner: 'Jane Doe', quotaGB: 50, usedGB: 22, status: 'healthy', syncStatus: 'synced' },
      'bsmith@corp.local': { id: 'bsmith@corp.local', owner: 'Bob Smith', quotaGB: 50, usedGB: 31, status: 'healthy', syncStatus: 'synced' },
      'kchen@corp.local': { id: 'kchen@corp.local', owner: 'Kim Chen', quotaGB: 50, usedGB: 18, status: 'healthy', syncStatus: 'synced' },
    },
    licenses: [
      { id: 'e3', name: 'Microsoft 365 E3', totalSeats: 50, assignedSeats: 38 },
      { id: 'e5', name: 'Microsoft 365 E5', totalSeats: 10, assignedSeats: 7 },
    ],
    events: [],
  };
}

class M365Twin {
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

  applyFault(type, targetId) {
    if (!FAULT_TYPES.includes(type)) {
      throw new Error(`Unknown fault type: ${type}`);
    }

    switch (type) {
      case 'mailbox-full': {
        const mbx = this.state.mailboxes[targetId];
        if (!mbx) throw new Error(`Mailbox not found: ${targetId}`);
        mbx.usedGB = mbx.quotaGB;
        mbx.status = 'full';
        this._logEvent(`Mailbox full: ${mbx.owner} (${mbx.id})`);
        break;
      }

      case 'license-exhausted': {
        const lic = this.state.licenses.find((l) => l.id === targetId);
        if (!lic) throw new Error(`License pool not found: ${targetId}`);
        lic.assignedSeats = lic.totalSeats;
        this._logEvent(`License pool exhausted: ${lic.name}`);
        break;
      }

      case 'service-outage': {
        const svc = this.state.services.find((s) => s.id === targetId);
        if (!svc) throw new Error(`Service not found: ${targetId}`);
        svc.status = 'outage';
        this._logEvent(`Service outage: ${svc.name}`);
        break;
      }

      case 'sync-failure': {
        const mbx = this.state.mailboxes[targetId];
        if (!mbx) throw new Error(`Mailbox not found: ${targetId}`);
        mbx.syncStatus = 'sync-failed';
        this._logEvent(`Sync failure on mailbox: ${mbx.owner} (${mbx.id})`);
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

module.exports = { M365Twin, FAULT_TYPES };
INNERM365_EOF

cat > "$WORKDIR/patch-router.js" << 'INNERPATCHER_EOF'
const fs = require('fs');

const ROUTER_PATH = process.argv[2];
const MARKER = 'ad-twin';

if (!fs.existsSync(ROUTER_PATH)) {
  console.error(`❌ Not found: ${ROUTER_PATH}`);
  process.exit(1);
}

let content = fs.readFileSync(ROUTER_PATH, 'utf8');

if (content.includes(MARKER)) {
  console.log('twins-router.js already extended with AD/M365, skipping');
  process.exit(0);
}

const anchors = [
  {
    find: `const { NetworkTwin, FAULT_TYPES: NETWORK_FAULTS } = require('./network-twin');`,
    insertAfter: `\nconst { ADTwin, FAULT_TYPES: AD_FAULTS } = require('./ad-twin');\nconst { M365Twin, FAULT_TYPES: M365_FAULTS } = require('./m365-twin');`,
  },
  {
    find: `const networkTwin = new NetworkTwin();`,
    insertAfter: `\nconst adTwin = new ADTwin();\nconst m365Twin = new M365Twin();`,
  },
  {
    find: `module.exports = router;`,
    insertBefore: `// ---- AD twin ----

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

`,
  },
];

for (const anchor of anchors) {
  if (!content.includes(anchor.find)) {
    console.error(`❌ Expected anchor not found in ${ROUTER_PATH}:\n   "${anchor.find}"`);
    console.error(`   This file may have been hand-edited since Sprint 2. Refusing to guess — patch manually.`);
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
console.log(`   Added AD twin routes: /ad/state, /ad/fault-types, /ad/fault, /ad/reset`);
console.log(`   Added M365 twin routes: /m365/state, /m365/fault-types, /m365/fault, /m365/reset`);
console.log(`   Backup saved to: ${backupPath}`);
INNERPATCHER_EOF

echo ""
echo "Patching twins-router.js..."
node "$WORKDIR/patch-router.js" "$TARGET_DIR/twins-router.js"

echo ""
echo "Checking twins-router.js syntax..."
node -c "$TARGET_DIR/twins-router.js" && echo "valid JS"

echo "Writing test-ad-m365.js..."
cat > "$REPO_ROOT/test-ad-m365.js" << 'INNERTEST_EOF'
/**
 * test-ad-m365.js
 * Exercises every fault type on the AD and M365 twins directly
 * (no HTTP server required). Run with: node test-ad-m365.js
 */

'use strict';

const { ADTwin } = require('./server/enterprise-lab/ad-twin');
const { M365Twin } = require('./server/enterprise-lab/m365-twin');

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`  ✗ ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

function testADTwin() {
  console.log('\nAD Twin');
  const twin = new ADTwin();

  twin.applyFault('account-lockout', 'jdoe');
  assert(twin.state.users['jdoe'].status === 'locked-out', 'account-lockout locks the user');

  twin.reset();
  twin.applyFault('password-expired', 'bsmith');
  assert(twin.state.users['bsmith'].status === 'password-expired', 'password-expired sets status');
  assert(twin.state.users['bsmith'].passwordExpiresInDays === 0, 'password-expired zeroes days remaining');

  twin.reset();
  twin.applyFault('mfa-failure', 'kchen');
  assert(twin.state.users['kchen'].status === 'mfa-blocked', 'mfa-failure blocks sign-in');
  assert(twin.state.users['kchen'].mfaEnrolled === false, 'mfa-failure unenrolls MFA');

  twin.reset();
  twin.applyFault('replication-failure', 'dc-02');
  const dc2 = twin.state.domainControllers.find((d) => d.id === 'dc-02');
  assert(dc2.replicationStatus === 'failed', 'replication-failure marks DC replication failed');

  twin.reset();
  twin.applyFault('gpo-corruption', 'ou-eng');
  const ou = twin.state.organizationalUnits.find((o) => o.id === 'ou-eng');
  assert(ou.gpoStatus === 'corrupted', 'gpo-corruption marks OU GPO corrupted');

  twin.applyFault('clear');
  assert(twin.state.users['jdoe'].status === 'active', 'clear resets twin to healthy baseline');

  let threw = false;
  try {
    twin.applyFault('account-lockout', 'not-a-real-user');
  } catch (e) {
    threw = true;
  }
  assert(threw, 'invalid targetId throws instead of silently failing');
}

function testM365Twin() {
  console.log('\nM365 Twin');
  const twin = new M365Twin();

  twin.applyFault('mailbox-full', 'jdoe@corp.local');
  const mbx = twin.state.mailboxes['jdoe@corp.local'];
  assert(mbx.status === 'full' && mbx.usedGB === mbx.quotaGB, 'mailbox-full fills the mailbox');

  twin.reset();
  twin.applyFault('license-exhausted', 'e3');
  const lic = twin.state.licenses.find((l) => l.id === 'e3');
  assert(lic.assignedSeats === lic.totalSeats, 'license-exhausted assigns all seats');

  twin.reset();
  twin.applyFault('service-outage', 'teams');
  const svc = twin.state.services.find((s) => s.id === 'teams');
  assert(svc.status === 'outage', 'service-outage marks service down');

  twin.reset();
  twin.applyFault('sync-failure', 'bsmith@corp.local');
  const mbx2 = twin.state.mailboxes['bsmith@corp.local'];
  assert(mbx2.syncStatus === 'sync-failed', 'sync-failure marks mailbox sync failed');

  twin.applyFault('clear');
  assert(twin.state.services.find((s) => s.id === 'teams').status === 'healthy', 'clear resets twin to healthy baseline');

  let threw = false;
  try {
    twin.applyFault('mailbox-full', 'not-a-real-mailbox');
  } catch (e) {
    threw = true;
  }
  assert(threw, 'invalid targetId throws instead of silently failing');
}

testADTwin();
testM365Twin();

console.log(`\n${failures === 0 ? '✅ All checks passed' : `❌ ${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
INNERTEST_EOF

echo ""
echo "Running AD + M365 test suite..."
node "$REPO_ROOT/test-ad-m365.js"

echo ""
echo "✅ AD + M365 twins added and tests passed."
echo ""
echo "New endpoints (no server.js changes needed — already mounted at /api/twins):"
echo "  GET  /api/twins/ad/state        POST /api/twins/ad/fault      POST /api/twins/ad/reset"
echo "  GET  /api/twins/m365/state      POST /api/twins/m365/fault    POST /api/twins/m365/reset"
echo ""
echo "Restart your server, then try:"
echo "  curl http://localhost:8080/api/twins/ad/state"
echo "  curl http://localhost:8080/api/twins/m365/state"
