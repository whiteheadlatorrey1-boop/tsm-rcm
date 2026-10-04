'use strict';
// Runs every test/phase0.5/*.test.js in its own process (with the describe/it
// preload shim) so `npm test` covers phases 8-15 and the registry/match tests.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'test', 'phase0.5');
const shim = path.join(__dirname, 'phase-test-shim.js');
const files = fs.readdirSync(dir).filter((f) => /\.test\.js$/.test(f)).sort();

let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['-r', shim, path.join(dir, f)], { encoding: 'utf8', timeout: 60000 });
  if (r.status !== 0) {
    failed++;
    console.log('FAIL ' + f + ' (exit ' + r.status + (r.error ? ', ' + r.error.message : '') + ')');
    console.log(((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-8).map((l) => '      ' + l).join('\n'));
  }
}
console.log('PHASE SUITES: ' + (files.length - failed) + '/' + files.length + ' files passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
