#!/usr/bin/env node
'use strict';
// L1 FOUNDATION REGRESSION (Phase 0)
// Runs every tests/unit/l1-copilot/*.test.js, grouped by capability.
// Any test file not mapped below lands in "Other" so nothing is skipped silently.
// Missing npm packages are reported as DEPS (run `npm install`), not as PASS.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'tests', 'unit', 'l1-copilot');
const GROUPS = [
  ['Workflow engine + contract', ['workflow-contract', 'workflow-engine-evidence-golden']],
  ['Asset lifecycle + disposition', ['asset-lifecycle', 'disposition-templates']],
  ['Closure gate / gate tracker', ['gate-tracker']],
  ['Action gate', ['action-gate', 'orchestrate-route-strips-action']],
  ['Governed orchestrator', ['governed-orchestrator', 'governed-orchestrator-gates']],
  ['ServiceNow adapter', ['servicenow-adapter', 'servicenow-adapter-state', 'servicenow-batch']],
  ['Reconciliation', ['servicenow-reconciliation']],
  ['Onboarding preflight', ['onboarding-preflight']],
  ['BPO intelligence', ['servicenow-bpo-intelligence']],
  ['Cloud / device adapters', ['cloud-ops-adapter', 'gcp-adapter', 'graph-intune-adapter']]
];

const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).map(f => f.replace(/\.test\.js$/, ''));
const mapped = new Set(GROUPS.flatMap(g => g[1]));
const other = files.filter(f => !mapped.has(f));
if (other.length) GROUPS.push(['Other', other]);

function run(name) {
  const file = path.join(dir, `${name}.test.js`);
  if (!fs.existsSync(file)) return { status: 'MISSING' };
  const r = spawnSync(process.execPath, [file], {
    env: Object.assign({ TSM_SESSION_SECRET: 'test-session-secret' }, process.env),
    encoding: 'utf8', timeout: 120000
  });
  if (r.status === 0) return { status: 'PASS' };
  const out = `${r.stdout}\n${r.stderr}`;
  if (/Cannot find module '[^./]/.test(out)) return { status: 'DEPS', detail: (out.match(/Cannot find module '([^']+)'/) || [])[1] };
  return { status: 'FAIL', detail: out.trim().split('\n').slice(-6).join('\n') };
}

let bad = 0;
console.log('\nL1 FOUNDATION REGRESSION\n');
for (const [label, names] of GROUPS) {
  const results = names.map(n => [n, run(n)]).filter(([, r]) => r.status !== 'MISSING');
  if (!results.length) continue;
  const worst = ['FAIL', 'DEPS', 'PASS'].find(s => results.some(([, r]) => r.status === s));
  if (worst !== 'PASS') bad++;
  console.log(`${label.padEnd(30)} ${worst}`);
  for (const [n, r] of results) {
    if (r.status !== 'PASS') console.log(`   - ${n}: ${r.status}${r.detail ? `\n${String(r.detail).replace(/^/gm, '       ')}` : ''}`);
  }
}
console.log(bad ? `\n${bad} group(s) not green. Fix before feature work.\n` : '\nAll L1 foundation groups PASS.\n');
process.exit(bad ? 1 : 0);
