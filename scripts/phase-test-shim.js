'use strict';
// Preload shim (node -r) for test/phase0.5/*.test.js. Some of those files are
// describe/it style and some are plain assert scripts; this supports both.
// Failures set a non-zero exit code. Not a test file itself (no test- prefix).
let ran = 0;
let failed = 0;
const run = (name, fn) => {
  ran++;
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      r.catch((e) => { failed++; console.log('FAIL - ' + name + ': ' + (e && e.message)); process.exitCode = 1; });
    }
  } catch (e) {
    failed++;
    console.log('FAIL - ' + name + ': ' + (e && e.message));
    process.exitCode = 1;
  }
};
global.describe = (name, fn) => { fn(); };
global.it = run;
global.test = run;
process.on('unhandledRejection', (e) => { console.log('FAIL - unhandled rejection: ' + (e && e.message)); process.exitCode = 1; });
process.on('exit', () => {
  console.log('[shim] ' + ran + ' it/test cases, ' + failed + ' failed');
  if (failed) process.exitCode = 1;
});
