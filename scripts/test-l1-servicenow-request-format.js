'use strict';
// Regression test for GET /api/l1-copilot/servicenow/request/:number's
// RITM/SC-Task number format gate (server.js).
//
// Found during live acceptance testing against a real ServiceNow PDI
// (dev316534, Australia release patch 7): the route only accepted
// "SCTASK<digits>", but that PDI's own demo sc_task records are numbered
// "TASK0000001" — a real instance, real demo data, rejected by a format
// check that assumed one universal prefix. Most production ServiceNow
// instances DO use the OOB "SCTASK" prefix, so this fix accepts BOTH
// rather than replacing one assumption with another.
//
// Runs fully offline — no SERVICENOW_* credentials needed. With
// SERVICENOW_INTEGRATION_ENABLED unset and demo mode forced off, a
// format-VALID number reaches the adapter and gets an honest 503 (not
// configured); a format-INVALID number is rejected at 400 before ever
// reaching the adapter. That split is what actually proves the regex,
// independent of whether a live instance is reachable.

process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || 'l1-sn-format-test-secret';
process.env.PORT = '8097';
process.env.L1_COPILOT_DEMO_MODE = 'false';
delete process.env.SERVICENOW_INTEGRATION_ENABLED;

const http = require('http');
const auth = require('../middleware/require-auth');
const demoData = require('../server/l1-copilot/demo-data');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('PASS:', msg); } else { fail++; console.log('FAIL:', msg); } };

function request(port, path, cookie) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path, headers: cookie ? { Cookie: cookie } : {} }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let body = null;
        try { body = data ? JSON.parse(data) : null; } catch (e) { body = data; }
        resolve({ status: res.statusCode, body });
      });
    }).on('error', reject);
  });
}

(async () => {
  const appModule = require('../server');
  const port = Number(process.env.PORT);

  const cookie = 'tsm_session=' + encodeURIComponent(auth.signSession({
    role: 'admin', staffId: 'TECH-FORMAT-TEST', label: 'Format Test', exp: Date.now() + 3600000
  }));

  // Format-valid numbers reach the adapter and get an honest 503 (ServiceNow
  // not configured in this offline run) -- NOT a 400 -- proving the regex
  // itself accepted the format.
  let r = await request(port, '/api/l1-copilot/servicenow/request/RITM0010001', cookie);
  ok(r.status === 503, 'RITM0010001 passes format check (503 not-configured, got ' + r.status + ')');

  r = await request(port, '/api/l1-copilot/servicenow/request/SCTASK0010001', cookie);
  ok(r.status === 503, 'SCTASK0010001 (standard OOB prefix) passes format check (503, got ' + r.status + ')');

  r = await request(port, '/api/l1-copilot/servicenow/request/TASK0010001', cookie);
  ok(r.status === 503, 'TASK0010001 (this PDI\'s real prefix) passes format check (503, got ' + r.status + ')');

  // A genuinely malformed number is still rejected before reaching the adapter.
  r = await request(port, '/api/l1-copilot/servicenow/request/NOTAVALIDNUMBER', cookie);
  ok(r.status === 400, 'malformed number still rejected at 400 (got ' + r.status + ')');

  // demo-data.js's demoRequestRecord classifies by the same prefix rule as the
  // route -- a "TASK..." identifier must come back as kind:'SCTASK', not
  // silently misclassified as a RITM because only "SCTASK" was recognized.
  const demoTask = demoData.demoRequestRecord('TASK0010001');
  ok(demoTask.kind === 'SCTASK', 'demoRequestRecord classifies TASK-prefixed number as SCTASK (got ' + demoTask.kind + ')');
  const demoScTask = demoData.demoRequestRecord('SCTASK0010001');
  ok(demoScTask.kind === 'SCTASK', 'demoRequestRecord still classifies SCTASK-prefixed number as SCTASK (got ' + demoScTask.kind + ')');
  const demoRitm = demoData.demoRequestRecord('RITM0010001');
  ok(demoRitm.kind === 'RITM', 'demoRequestRecord still classifies RITM-prefixed number as RITM (got ' + demoRitm.kind + ')');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
