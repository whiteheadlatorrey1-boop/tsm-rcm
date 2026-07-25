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
