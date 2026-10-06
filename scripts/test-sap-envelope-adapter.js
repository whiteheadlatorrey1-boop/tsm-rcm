'use strict';

const assert = require('assert');
const { fromRelay } =
  require('../server/vertical-control-plane/adapters/sap-adapter');
const {
  validateEnvelope,
  CONTROL_PLANE_VERSION
} = require('../server/vertical-control-plane/contract');

console.log('=== SAP -> CANONICAL ENVELOPE ADAPTER TEST ===');

const payloads = {
  CRM: { kpis: { pipeline_value: 10000 } },
  CPQ: { kpis: { quote_value: 5000 } },
  O2C: { kpis: { order_value: 20000, credit_holds: 0 } }
};

const before = JSON.stringify(payloads);
const env = fromRelay(payloads);

let valid = true;
try {
  validateEnvelope(env);
} catch (e) {
  valid = false;
  console.log(e.message);
}

assert.strictEqual(valid, true, 'envelope must pass validateEnvelope()');
assert.strictEqual(env.schemaVersion, CONTROL_PLANE_VERSION);
assert.strictEqual(env.vertical, 'sap');

assert.strictEqual(env.entities.length, 3);
assert.strictEqual(env.events.length, 3);
assert.strictEqual(env.exposures.length, 3);

assert.strictEqual(
  env.exposures.reduce((sum, item) => sum + item.amount, 0),
  35000
);

assert.strictEqual(env.decisions.length, 1);
assert.strictEqual(env.decisions[0].severity, 'MODERATE');
assert.strictEqual(env.decisions[0].recommendation, 'MONITOR');

assert.strictEqual(env.governance.approvalRequired, true);
assert.strictEqual(env.governance.approved, false);

assert.strictEqual(env.actions.length, 0);
assert.strictEqual(env.writeback.allowed, false);
assert.strictEqual(env.writeback.executed, false);

assert.strictEqual(
  JSON.stringify(payloads),
  before,
  'adapter must not mutate relay payloads'
);

console.log('PASS SAP envelope adapter');
