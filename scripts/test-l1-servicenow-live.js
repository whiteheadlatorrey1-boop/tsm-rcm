'use strict';
// L1 Copilot <-> ServiceNow connected acceptance test, run against a real
// ServiceNow PDI (not a mock). Proves the Table API plumbing
// (server/l1-copilot/servicenow-adapter.js) and the governed-write HTTP
// routes (server.js) against an actual instance.
//
// SECURITY: never prints, logs, or persists SERVICENOW_PASSWORD. Only
// instance URL, ticket numbers/sys_ids, and HTTP status codes are logged.
//
// Runs only when SERVICENOW_INTEGRATION_ENABLED=true; otherwise prints a
// clean skip message and exits 0 (so `npm test` stays green with no
// ServiceNow credentials present).
//
// Usage (env already set from ~/.tsm-servicenow.env in this environment):
//   SERVICENOW_INTEGRATION_ENABLED=true \
//   SERVICENOW_INSTANCE_URL=https://devXXXXX.service-now.com \
//   SERVICENOW_USERNAME=admin \
//   SERVICENOW_PASSWORD=<pdi password> \
//   node scripts/test-l1-servicenow-live.js
//
// Sections:
//   READ  - one real incident, one real cmdb_ci_hardware asset, one real
//           sc_req_item + its sc_tasks, pulled from whatever demo data
//           already exists on the instance (never created by this script),
//           asserting the adapter's normalized shapes.
//   WRITE - createTicket, writeWorkNote (+independent read-back),
//           writeComment (+independent read-back), updateTicketStatus,
//           all on ONE ticket this script creates itself, deleted in a
//           finally block. Never touches a pre-existing record.
//   GATE  - the real HTTP routes (server.js, booted in-process), proving
//           a work-note write is refused both with no session (401) and
//           with a session but no technician confirmation (403), and that
//           neither attempt actually wrote anything.

if (process.env.SERVICENOW_INTEGRATION_ENABLED !== 'true') {
  console.log('SKIPPED: SERVICENOW_INTEGRATION_ENABLED is not "true" -- no live ServiceNow credentials configured.');
  console.log('Set SERVICENOW_INTEGRATION_ENABLED=true plus SERVICENOW_INSTANCE_URL/USERNAME/PASSWORD to run this against a real PDI.');
  process.exit(0);
}

process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || 'l1-sn-live-accept-secret-' + Date.now();

const http = require('http');
const adapter = require('../server/l1-copilot/servicenow-adapter');

let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; console.log('PASS:', msg); }
  else { fail++; failures.push(msg); console.log('FAIL:', msg); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

const cfg = adapter.loadConfigFromEnv();
if (!cfg) {
  console.error('ERROR: SERVICENOW_INTEGRATION_ENABLED=true but loadConfigFromEnv() returned null -- check SERVICENOW_INSTANCE_URL is set.');
  process.exit(1);
}
// Never log cfg directly -- it carries cfg.password. Only ever log cfg.instanceUrl.
console.log('Target PDI:', cfg.instanceUrl);

const createdIncidents = []; // numbers this script creates; always cleaned up

// snRequest() unconditionally sets sysparm_display_value=all, so even a
// plain string field like "number" comes back as { value, display_value },
// not a bare string -- readField() unwraps it the same way the adapter's
// own normalized getters do.
async function findOneRealField(table, field) {
  const data = await adapter._internal.snRequest(cfg, 'GET', '/api/now/table/' + table, {
    query: { sysparm_limit: '1', sysparm_fields: field }
  });
  const record = (data.result && data.result[0]) || null;
  return record ? adapter._internal.readField(record, field) : null;
}

async function readSection() {
  section('READ (pre-existing PDI demo data -- nothing created or modified here)');

  // --- one real incident ---
  const incNumber = await findOneRealField('incident', 'number');
  if (!incNumber) { ok(false, 'READ: at least one pre-existing incident exists on this PDI to read'); return; }
  const ticket = await adapter.getTicket(incNumber);
  ok(!!ticket, 'READ: getTicket("' + incNumber + '") returned a record');
  if (ticket) {
    ok(ticket.number === incNumber, 'READ: ticket.number matches (' + ticket.number + ')');
    ok(typeof ticket.sysId === 'string' && /^[0-9a-f]{32}$/i.test(ticket.sysId), 'READ: ticket.sysId is a 32-char sys_id');
    ok('priority' in ticket && 'requester' in ticket && 'description' in ticket && 'assignmentGroup' in ticket && 'state' in ticket && 'asset' in ticket,
      'READ: ticket has the full normalized incident shape (priority/requester/description/assignmentGroup/state/asset)');
    ok(ticket.raw && typeof ticket.raw === 'object', 'READ: ticket.raw carries the unmodified source record');
  }

  // --- one real cmdb_ci_hardware asset ---
  const assetTag = await findOneRealField('cmdb_ci_hardware', 'asset_tag');
  if (!assetTag) { ok(false, 'READ: at least one pre-existing cmdb_ci_hardware asset with an asset_tag exists on this PDI'); }
  else {
    const asset = await adapter.getAsset(assetTag);
    ok(!!asset, 'READ: getAsset("' + assetTag + '") returned a record');
    if (asset) {
      ok(asset.assetTag === assetTag, 'READ: asset.assetTag matches (' + asset.assetTag + ')');
      ok('manufacturer' in asset && 'model' in asset && 'warrantyStatus' in asset && 'owner' in asset && 'department' in asset && 'status' in asset,
        'READ: asset has the full normalized CMDB shape (manufacturer/model/warrantyStatus/owner/department/status)');
    }
  }

  // --- one real sc_req_item + its sc_tasks ---
  const ritmNumber = await findOneRealField('sc_req_item', 'number');
  if (!ritmNumber) { ok(false, 'READ: at least one pre-existing sc_req_item exists on this PDI'); return; }
  const ritm = await adapter.getRequestItem(ritmNumber);
  ok(!!ritm, 'READ: getRequestItem("' + ritmNumber + '") returned a record');
  if (ritm) {
    ok(ritm.number === ritmNumber, 'READ: ritm.number matches (' + ritm.number + ')');
    ok(typeof ritm.sysId === 'string' && /^[0-9a-f]{32}$/i.test(ritm.sysId), 'READ: ritm.sysId is a 32-char sys_id');
    ok('shortDescription' in ritm && 'state' in ritm && 'assignmentGroup' in ritm && 'assignedTo' in ritm && 'catalogItem' in ritm,
      'READ: ritm has the full normalized RITM shape (shortDescription/state/assignmentGroup/assignedTo/catalogItem)');

    const scTasks = await adapter.getCatalogTasksByRequestItem(ritmNumber);
    ok(Array.isArray(scTasks), 'READ: getCatalogTasksByRequestItem("' + ritmNumber + '") returned an array (' + scTasks.length + ' task(s))');
    if (scTasks.length) {
      const t = scTasks[0];
      ok('number' in t && 'shortDescription' in t && 'state' in t && 'requestItem' in t,
        'READ: sc_task has the full normalized shape (number/shortDescription/state/requestItem)');
    } else {
      console.log('  (this RITM has no sc_tasks on this PDI -- shape of an empty result still asserted above)');
    }
  }
}

async function writeSection() {
  section('WRITE (on a ticket this script creates -- deleted in finally)');
  let number = null;
  try {
    const created = await adapter._pdi.createTicket({
      short_description: 'TSM L1 acceptance test',
      urgency: '3',
      impact: '3'
    }, cfg);
    ok(created.success === true && !!created.number, 'WRITE: createTicket succeeded (' + created.number + ')');
    number = created.number;
    createdIncidents.push(number);

    const note = 'TSM L1 acceptance test work note — ' + new Date().toISOString();
    const noteResult = await adapter.writeWorkNote(number, note, cfg);
    ok(noteResult.success === true, 'WRITE: writeWorkNote resolved success (adapter already verified read-back internally)');
    const afterNote = await adapter.getTicket(number, cfg);
    const notesText = afterNote && afterNote.raw && afterNote.raw.work_notes
      ? (typeof afterNote.raw.work_notes === 'object' ? (afterNote.raw.work_notes.display_value || '') : afterNote.raw.work_notes)
      : '';
    ok(String(notesText).includes(note), 'WRITE: independent re-read confirms the work note text is present on the ticket');

    const comment = 'TSM L1 acceptance test comment — ' + new Date().toISOString();
    const commentResult = await adapter.writeComment(number, comment, cfg);
    ok(commentResult.success === true, 'WRITE: writeComment resolved success (adapter already verified read-back internally)');
    const afterComment = await adapter.getTicket(number, cfg);
    const commentsText = afterComment && afterComment.raw && afterComment.raw.comments
      ? (typeof afterComment.raw.comments === 'object' ? (afterComment.raw.comments.display_value || '') : afterComment.raw.comments)
      : '';
    ok(String(commentsText).includes(comment), 'WRITE: independent re-read confirms the comment text is present on the ticket');

    const statusResult = await adapter._pdi.updateTicketStatus(number, '2', cfg); // 2 = In Progress
    ok(statusResult.success === true, 'WRITE: updateTicketStatus resolved success');
    const afterStatus = await adapter.getTicket(number, cfg);
    ok(afterStatus && afterStatus.state === 'IN PROGRESS', 'WRITE: independent re-read confirms state is now IN PROGRESS (got ' + (afterStatus && afterStatus.state) + ')');
  } finally {
    if (number) {
      try {
        await adapter._pdi.deleteTicket(number, cfg);
        const idx = createdIncidents.indexOf(number);
        if (idx > -1) createdIncidents.splice(idx, 1);
        const afterDelete = await adapter.getTicket(number, cfg);
        ok(afterDelete === null, 'WRITE: deleteTicket cleanup confirmed — ' + number + ' no longer exists on the PDI');
      } catch (e) {
        ok(false, 'WRITE: cleanup deleteTicket(' + number + ') failed: ' + e.message + ' -- MANUAL CLEANUP NEEDED ON THE PDI');
      }
    }
  }
}

function httpRequest(port, method, path, cookie, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request({
      host: '127.0.0.1', port, method, path,
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        payload ? { 'Content-Length': Buffer.byteLength(payload) } : {},
        cookie ? { Cookie: cookie } : {}
      )
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function gateSection() {
  section('GATE (real HTTP routes, server.js booted in-process -- proves the write is refused, not just that the adapter could do it)');

  process.env.PORT = '8098';
  const auth = require('../middleware/require-auth');
  require('../server'); // boots and starts listening, same convention as scripts/test-l1-escalation-execute-route.js
  const port = Number(process.env.PORT);
  // Give the listener a moment to be ready for the very first request.
  await new Promise((r) => setTimeout(r, 300));

  let number = null;
  try {
    const created = await adapter._pdi.createTicket({
      short_description: 'TSM L1 acceptance test (gate)',
      urgency: '3',
      impact: '3'
    }, cfg);
    number = created.number;
    createdIncidents.push(number);

    const attemptedNote = 'GATE TEST — this must never be written: ' + Date.now();

    // (a) No session at all.
    let r = await httpRequest(port, 'POST', '/api/l1-copilot/servicenow/work-note', null, { incident: number, note: attemptedNote });
    ok(r.status === 401, 'GATE: unauthenticated work-note POST is refused (401, got ' + r.status + ')');

    // (b) Authenticated as staff, but technicianConfirmed omitted.
    const cookie = 'tsm_session=' + encodeURIComponent(auth.signSession({
      role: 'admin', staffId: 'TECH-GATE-TEST', label: 'Gate Test', exp: Date.now() + 3600000
    }));
    r = await httpRequest(port, 'POST', '/api/l1-copilot/servicenow/work-note', cookie, { incident: number, note: attemptedNote });
    ok(r.status === 403 && /[Tt]echnician confirmation/.test((r.body && r.body.error) || ''),
      'GATE: authenticated-but-unconfirmed work-note POST is refused (403 + technician-confirmation message, got ' + r.status + ' ' + JSON.stringify(r.body) + ')');

    // Confirm neither refused attempt actually wrote anything.
    const afterGate = await adapter.getTicket(number, cfg);
    const gateNotesText = afterGate && afterGate.raw && afterGate.raw.work_notes
      ? (typeof afterGate.raw.work_notes === 'object' ? (afterGate.raw.work_notes.display_value || '') : afterGate.raw.work_notes)
      : '';
    ok(!String(gateNotesText).includes(attemptedNote), 'GATE: neither refused attempt actually wrote the note to the PDI');
  } finally {
    if (number) {
      try {
        await adapter._pdi.deleteTicket(number, cfg);
        const idx = createdIncidents.indexOf(number);
        if (idx > -1) createdIncidents.splice(idx, 1);
      } catch (e) {
        ok(false, 'GATE: cleanup deleteTicket(' + number + ') failed: ' + e.message + ' -- MANUAL CLEANUP NEEDED ON THE PDI');
      }
    }
    process.exit(fail ? 1 : 0); // the booted server keeps the process alive otherwise
  }
}

(async () => {
  try {
    await readSection();
    await writeSection();
    await gateSection(); // calls process.exit itself once done, since it boots a live-forever server
  } catch (e) {
    console.error('\nUNEXPECTED ERROR:', e.message);
    fail++;
    failures.push('unexpected error: ' + e.message);
  } finally {
    // Safety net in case gateSection threw before reaching its own exit, or
    // was never reached -- make sure nothing created above is left behind.
    for (const number of createdIncidents.slice()) {
      try {
        await adapter._pdi.deleteTicket(number, cfg);
        console.log('(safety-net cleanup) deleted', number);
      } catch (e) {
        console.error('(safety-net cleanup) COULD NOT DELETE', number, '-- remove it manually from the PDI:', e.message);
      }
    }
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    if (fail) { console.log('Failures:'); failures.forEach((m) => console.log('  -', m)); }
    process.exit(fail ? 1 : 0);
  }
})();
