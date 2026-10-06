'use strict';

const assert = require('assert');
const { fromRelay } =
  require('../../server/vertical-control-plane/adapters/sap-adapter');

const env = fromRelay({
  CRM: { kpis: { pipeline_value: 10000 } },
  CPQ: { kpis: { quote_value: 5000 } },
  O2C: { kpis: { order_value: 20000, credit_holds: 0 } }
});

assert.strictEqual(env.vertical, 'sap');
assert.strictEqual(env.entities.length, 3);
assert.strictEqual(
  env.exposures.reduce((sum, item) => sum + item.amount, 0),
  35000
);
assert.strictEqual(env.decisions[0].severity, 'MODERATE');
assert.strictEqual(env.decisions[0].recommendation, 'MONITOR');
assert.strictEqual(env.governance.approvalRequired, true);
assert.strictEqual(env.governance.approved, false);
assert.strictEqual(env.actions.length, 0);

console.log('PASS sap-adapter.test.js');
