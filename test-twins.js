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
