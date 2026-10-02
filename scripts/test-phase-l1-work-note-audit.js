'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildWorkNoteAuditEvent } = require('../server/l1-copilot/work-note-audit');

let passed = 0, failed = 0;
const check = (label, fn) => { try { fn(); passed++; } catch (e) { failed++; console.log('  FAIL: ' + label + ' -> ' + e.message); } };
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const base = { incidentId: 'INC0010002', noteLength: 38, result: { success: true } };

check('staffId wins and is labelled as a staff identity', () => {
  const e = buildWorkNoteAuditEvent({ ...base, session: { staffId: 'TECH-1', role: 'analyst', label: 'Tech One' } });
  assert.strictEqual(e.action.technician.id, 'TECH-1');
  assert.strictEqual(e.action.technician.identitySource, 'staffId');
});
check('admin session without staffId falls back to role and says so', () => {
  const e = buildWorkNoteAuditEvent({ ...base, session: { role: 'admin' } });
  assert.strictEqual(e.action.technician.id, 'admin');
  assert.strictEqual(e.action.technician.identitySource, 'role');
});
check('no session at all -> unknown / none, still a valid event', () => {
  const e = buildWorkNoteAuditEvent({ ...base });
  assert.strictEqual(e.action.technician.id, 'unknown');
  assert.strictEqual(e.action.technician.identitySource, 'none');
});
check('meets every field recordAudit() requires (else the event is silently dropped)', () => {
  const e = buildWorkNoteAuditEvent({ ...base, session: { role: 'admin' } });
  assert.ok(nonEmpty(e.eventType) && nonEmpty(e.action.actionType) && nonEmpty(e.action.sourceIncident));
  assert.ok(nonEmpty(e.action.technician.id));
});
check('event says executed, confirmed, append-only, no ServiceNow state change', () => {
  const e = buildWorkNoteAuditEvent({ ...base, session: { role: 'admin' } });
  assert.strictEqual(e.action.state, 'EXECUTED');
  assert.strictEqual(e.action.confirmed, true);
  assert.strictEqual(e.executionResult.appendOnlyWorkNote, true);
  assert.strictEqual(e.executionResult.serviceNowStateWrite, false);
  assert.strictEqual(e.executionResult.ticketClosureRequested, false);
});
check('only the note length is recorded, never the note text', () => {
  const secret = 'SECRET-NOTE-BODY';
  const e = buildWorkNoteAuditEvent({ ...base, noteLength: secret.length, session: { staffId: 'T' } });
  assert.ok(!JSON.stringify(e).includes(secret));
  assert.strictEqual(e.metadata.noteLength, secret.length);
});

// Route wiring (source-level): gate -> write -> audit -> response, one audit call, failure-safe
const src = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'latin1');
const start = src.indexOf("app.post('/api/l1-copilot/servicenow/work-note'");
const end = src.indexOf('\napp.', start + 10);
const h = src.slice(start, end);
check('work-note route found', () => assert.ok(start >= 0 && end > start));
check('order is confirmation gate, ServiceNow write, audit, response', () => {
  const gate = h.indexOf('technicianConfirmed !== true');
  const write = h.indexOf('snAdapter.writeWorkNote(');
  const audit = h.indexOf('buildWorkNoteAuditEvent(');
  const resp = h.indexOf('res.json({');
  assert.ok(gate >= 0 && write > gate && audit > write && resp > audit, [gate, write, audit, resp].join(','));
});
check('exactly one audit call, and an audit failure cannot break the response', () => {
  assert.strictEqual(h.split('buildWorkNoteAuditEvent(').length - 1, 1);
  assert.ok(h.includes('L1 WORK NOTE AUDIT ERROR'));
});

console.log('L1 WORK NOTE AUDIT: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
