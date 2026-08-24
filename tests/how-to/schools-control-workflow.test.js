'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = process.cwd();

const pagePath = path.join(
  root,
  'html/war-rooms/schools-command/schools-command.html'
);

const artifactPath = path.join(
  root,
  'docs/how-to-audit/guided-rollout/schools-control-workflow.json'
);

assert(fs.existsSync(pagePath), 'Schools Command page must exist');
assert(fs.existsSync(artifactPath), 'Schools control workflow artifact must exist');

const html = fs.readFileSync(pagePath, 'utf8');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

assert.equal(artifact.vertical, 'schools');
assert.equal(artifact.priority, 'P0');

const phases = [
  'start',
  'input',
  'analyze',
  'review',
  'decide',
  'execute',
  'reports',
  'measure',
  'repeat',
];

for (const phase of phases) {
  assert(
    artifact.mappingQuality[phase === 'reports' ? 'report' : phase],
    `Schools ${phase} mapping must be complete`
  );
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function controlExists(control) {
  if (control.id) {
    return new RegExp(
      `<(?:button|input|select|textarea)[^>]*\\bid=["']${escapeRegex(control.id)}["']`,
      'i'
    ).test(html);
  }

  if (control.selector && control.selector.startsWith('button[data-tsm-how-to-label=')) {
    const value = control.selector.match(/"([^"]+)"/)?.[1];
    return value && html.includes(`data-tsm-how-to-label="${value}"`);
  }

  return false;
}

let checked = 0;

for (const phase of phases) {
  const controls =
    phase === 'reports'
      ? artifact.workflow.report_controls
      : (artifact.workflow[phase]?.controls || []);

  for (const control of controls) {
    assert(
      controlExists(control),
      `Schools ${phase} control is not present: ${control.label}`
    );
    checked++;
  }
}

assert(artifact.workflow.reports.length === 4);
assert(checked > 0);

console.log('TSM SCHOOLS CONTROL WORKFLOW TEST PASSED');
console.log(`Inventory: ${artifact.controlInventory.buttons} buttons / ${artifact.controlInventory.inputs} inputs`);
console.log(`Mapped controls: ${checked}`);
console.log('Phases: 9');
console.log('Report definitions: 4');
