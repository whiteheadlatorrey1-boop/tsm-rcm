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
