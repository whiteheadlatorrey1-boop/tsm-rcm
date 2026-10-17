#!/usr/bin/env node
'use strict';
// L1 pilot readiness check -- runs the existing ServiceNow live acceptance
// (scripts/test-l1-servicenow-live.js) against whatever SERVICENOW_* env is
// already set, i.e. a real CUSTOMER instance during a pilot, not the dev
// PDI. Read-only by default (only the READ section -- pulls pre-existing
// demo/real data, creates and modifies nothing): a pilot customer's
// instance should never be written to without an explicit, deliberate
// opt-in.
//
// --allow-write additionally runs the GATE section ("the gated work-note
// test"): it creates ONE real incident, proves the HTTP route refuses an
// unauthenticated and an unconfirmed work-note write against it, confirms
// neither refused attempt actually wrote anything, then deletes the
// incident. This is the one section that touches the instance even in
// write-allowed mode -- the broader WRITE section (createTicket plus real
// work-note/comment/status writes) in test-l1-servicenow-live.js is never
// run here; that stays reserved for the dev PDI via `npm test`.
//
// Always writes a pass/fail report to reports/l1-pilot-check.md, including
// a clean "skipped" report when SERVICENOW_* isn't configured, so the file
// always reflects the most recent check run.
//
// USAGE:
//   . ~/.tsm-servicenow.env && node scripts/l1-pilot-check.js
//   . ~/.tsm-servicenow.env && node scripts/l1-pilot-check.js --allow-write
//   npm run l1:pilot-check              (read-only)
//   npm run l1:pilot-check -- --allow-write

const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, '..', 'reports', 'l1-pilot-check.md');
const ALLOW_WRITE = process.argv.includes('--allow-write');

function writeReport(sections) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, sections.join('\n'));
  console.log('\nReport written to', path.relative(process.cwd(), REPORT_PATH));
}

function header(status, instanceUrl, mode) {
  return [
    '# L1 Pilot Check',
    '',
    '- **Run at:** ' + new Date().toISOString(),
    '- **Status:** ' + status,
    '- **Target instance:** ' + (instanceUrl || '(not configured)'),
    '- **Mode:** ' + mode,
    '',
  ].join('\n');
}

if (process.env.SERVICENOW_INTEGRATION_ENABLED !== 'true') {
  const msg = 'SKIPPED: SERVICENOW_INTEGRATION_ENABLED is not "true" -- no live ServiceNow credentials configured.';
  console.log(msg);
  writeReport([
    header('SKIPPED', null, ALLOW_WRITE ? 'read-only + gated-write (not reached)' : 'read-only'),
    msg,
    '',
    'Set SERVICENOW_INTEGRATION_ENABLED=true plus SERVICENOW_INSTANCE_URL/USERNAME/PASSWORD (e.g. `. ~/.tsm-servicenow.env`) and re-run.',
    '',
  ]);
  process.exit(0);
}

const adapter = require('../server/l1-copilot/servicenow-adapter');
const cfg = adapter.loadConfigFromEnv();
if (!cfg) {
  const msg = 'ERROR: SERVICENOW_INTEGRATION_ENABLED=true but loadConfigFromEnv() returned null -- check SERVICENOW_INSTANCE_URL is set.';
  console.error(msg);
  writeReport([header('ERROR', null, 'n/a'), msg, '']);
  process.exit(1);
}

console.log('Target PDI:', cfg.instanceUrl);
console.log('Mode:', ALLOW_WRITE ? 'read-only + gated-write test' : 'read-only (pass --allow-write to also run the gated work-note test)');

const live = require('./test-l1-servicenow-live');

(async () => {
  let status = 'PASS';
  const lines = [];
  try {
    await live.readSection();
    if (ALLOW_WRITE) {
      await live.gateSection();
    }
  } catch (e) {
    console.error('\nUNEXPECTED ERROR:', e.message);
    lines.push('Unexpected error: ' + e.message);
  } finally {
    await live.cleanupCreatedIncidents();
  }

  const { pass, fail, failures } = live.getResults();
  status = fail || lines.length ? 'FAIL' : 'PASS';

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  if (fail) { console.log('Failures:'); failures.forEach((m) => console.log('  -', m)); }

  const reportLines = [
    header(status, cfg.instanceUrl, ALLOW_WRITE ? 'read-only + gated-write test' : 'read-only'),
    '## Results',
    '',
    '- Passed: ' + pass,
    '- Failed: ' + fail,
    '',
  ];
  if (fail || lines.length) {
    reportLines.push('## Failures', '');
    for (const m of failures) reportLines.push('- ' + m);
    for (const m of lines) reportLines.push('- ' + m);
    reportLines.push('');
  }
  reportLines.push(
    '## Sections run',
    '',
    '- READ (incident / cmdb_ci_hardware / sc_req_item + sc_tasks) -- always run',
    '- GATE (gated work-note test: one ticket created, write-refusal proven, ticket deleted) -- ' +
      (ALLOW_WRITE ? 'run (--allow-write)' : 'NOT run (pass --allow-write to include it)'),
    ''
  );
  writeReport(reportLines);

  // The GATE section (when run) boots a real HTTP server that keeps the
  // event loop alive -- always exit explicitly, same as
  // test-l1-servicenow-live.js's own standalone CLI path.
  process.exit((fail || lines.length) ? 1 : 0);
})();
