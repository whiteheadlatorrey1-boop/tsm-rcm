'use strict';
// Runs the Phase 8E staffing pipeline model test (describe/it style) under a
// minimal shim, so scripts/run-tests.js can execute it like any other suite.
let n = 0, fail = 0;
global.describe = (name, f) => f();
const run = (name, f) => {
  n++;
  try { f(); } catch (e) { fail++; console.log('FAIL - ' + name + ': ' + e.message); }
};
global.it = run;
global.test = run;
require('../test/phase0.5/staffing-pipeline-model.test.js');
console.log('STAFFING PIPELINE MODEL: ' + (n - fail) + ' passed, ' + fail + ' failed');
process.exit(fail > 0 || n === 0 ? 1 : 0);
