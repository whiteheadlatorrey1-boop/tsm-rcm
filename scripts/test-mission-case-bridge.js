'use strict';

const assert = require('assert');
const bridge = require('../server/mission-case-bridge');

console.log('============================================================');
console.log(' TSM MISSION → CASE BRIDGE V1 TEST');
console.log('============================================================');

const mission = {
  id: 'BPO-TEST-001',
  vertical: 'bpo',
  tenantId: 'tenant-test',
  client: 'Test Client',
  title: 'BPO Intake Test',
  description: 'Bridge validation mission',
  workflow: {
    priority: 'high',
    assignedTo: 'tester',
    queue: 'bpo-review'
  },
  audit: [
    { event: 'MISSION_CREATED', actor: 'intake-form' }
  ]
};

console.log('\n=== 1. SCOPE CHECK ===');
assert.strictEqual(bridge.isBpoInternal1Mission(mission), true);
assert.strictEqual(bridge.isBpoInternal1Mission({ ...mission, vertical: 'healthcare' }), false);
assert.strictEqual(bridge.isBpoInternal1Mission({ ...mission, source: 'bpo-internal1' }), true);
console.log('PASS');

console.log('\n=== 2. NORMALIZATION ===');
const normalized = bridge.normalizeMissionToCase(mission);
assert.strictEqual(normalized.caseId, 'CASE-BPO-TEST-001');
assert.strictEqual(normalized.missionId, 'BPO-TEST-001');
assert.strictEqual(normalized.vertical, 'bpo');
assert.strictEqual(normalized.tenantId, 'tenant-test');
assert.strictEqual(normalized.client, 'Test Client');
assert.strictEqual(normalized.fields.missionId, 'BPO-TEST-001');
assert.strictEqual(normalized.bridge.version, 'v1');
console.log(JSON.stringify(normalized, null, 2));
console.log('PASS');

console.log('\n=== 3. EVENT → CASE ===');
const subscribers = {};
const missionStore = {
  subscribe(eventType, handler) {
    subscribers[eventType] = handler;
    return function unsubscribe() {
      delete subscribers[eventType];
    };
  }
};

const created = [];
const existing = new Map();

const caseAdapter = {
  async findByMissionId(missionId) {
    return existing.get(missionId) || null;
  },
  async createCase(data) {
    const record = {
      caseId: data.caseId,
      missionId: data.missionId,
      vertical: data.vertical,
      tenantId: data.tenantId
    };
    existing.set(data.missionId, record);
    created.push(record);
    return record;
  }
};

const installed = bridge.install(missionStore, caseAdapter);
assert.ok(installed);
assert.strictEqual(typeof subscribers.MISSION_CREATED, 'function');

(async () => {
  await subscribers.MISSION_CREATED(mission);
  assert.strictEqual(created.length, 1);

  await subscribers.MISSION_CREATED(mission);
  assert.strictEqual(created.length, 1);

  console.log('Created cases:', JSON.stringify(created, null, 2));
  console.log('PASS');

  console.log('\n=== 4. OUT-OF-SCOPE VERTICAL ===');
  await subscribers.MISSION_CREATED({
    ...mission,
    id: 'HEALTH-001',
    vertical: 'healthcare'
  });
  assert.strictEqual(created.length, 1);
  console.log('PASS');

  installed.unsubscribe();

  console.log('\n============================================================');
  console.log(' ALL BRIDGE TESTS PASSED');
  console.log('============================================================');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
