'use strict';
// Draft lifecycle events must reach the platform audit (via the sink) in a shape
// recordAudit() accepts, without ever carrying the draft text.
const os = require('os'), fs = require('fs'), path = require('path');
process.env.L1_DRAFT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'l1sn-audit-'));
delete process.env.L1_ALLOW_SELF_APPROVE;
const svc = require('../l1-servicenow/service');
const { buildDraftAuditEvent } = require('../server/l1-copilot/draft-audit');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('FAIL', m)); };
const nonEmpty = v => typeof v === 'string' && v.trim().length > 0;
const SYS = 'a'.repeat(32);

(async () => {
  // ---- builder ----
  const base = { id: 'd1', actor: 'TECH-1', draft: { incident: { number: 'INC0012345' }, field: 'comments', visibility: 'comments', body_length: 42 } };
  const states = { created: ['GENERATED', false], edited: ['GENERATED', false], rejected: ['GENERATED', false],
    approved: ['CONFIRMED', true], send_started: ['CONFIRMED', true], send_failed: ['CONFIRMED', true],
    sent: ['EXECUTED', true], sent_recovered: ['EXECUTED', true] };
  for (const [ev, [state, confirmed]] of Object.entries(states)) {
    const e = buildDraftAuditEvent({ ...base, event: ev });
    ok(e.eventType === 'SN_DRAFT_' + ev.toUpperCase(), ev + ' event type');
    ok(e.action.state === state && e.action.confirmed === confirmed, ev + ' state/confirmed');
  }
  const c = buildDraftAuditEvent({ ...base, event: 'sent' });
  ok(c.action.actionType === 'SN_DRAFT_CUSTOMER_COMMENT' && c.action.sourceIncident === 'INC0012345', 'comment draft action type and incident');
  ok(c.executionResult.success === true && c.executionResult.customerVisibleComment === true && c.executionResult.serviceNowStateWrite === false && c.executionResult.ticketClosureRequested === false, 'sent result: success, customer-visible, no state change');
  const w = buildDraftAuditEvent({ ...base, event: 'sent', draft: { ...base.draft, field: 'work_notes', visibility: 'internal' } });
  ok(w.action.actionType === 'SN_DRAFT_WORK_NOTE' && w.executionResult.appendOnlyWorkNote === true, 'work-note draft action type');
  const r = buildDraftAuditEvent({ ...base, event: 'sent_recovered' });
  ok(r.executionResult.recovered === true && r.metadata.recovered === true, 'recovered send is flagged');
  const f = buildDraftAuditEvent({ ...base, event: 'send_failed', error: 'ECONNRESET', http: 502 });
  ok(f.executionResult.success === false && f.metadata.error === 'ECONNRESET' && f.metadata.http === 502, 'failed send records error, not success');
  const rej = buildDraftAuditEvent({ ...base, event: 'rejected', reason: 'x'.repeat(500) });
  ok(rej.metadata.reason.length === 200, 'rejection reason truncated');
  const leak = JSON.stringify(buildDraftAuditEvent({ ...base, event: 'sent', body: 'SECRET-BODY', vars: { x: 'SECRET-BODY' } }));
  ok(!leak.includes('SECRET-BODY') && base.draft.body_length === 42, 'draft text never copied; only its length');
  const empty = buildDraftAuditEvent({});
  ok(nonEmpty(empty.eventType) && nonEmpty(empty.action.actionType) && nonEmpty(empty.action.sourceIncident) && nonEmpty(empty.action.technician.id), 'even an empty event satisfies recordAudit required fields');

  // ---- sink on the real service ----
  const seen = [];
  svc.setAuditSink(e => seen.push(e));
  const inc = { number: 'INC0012345', sys_id: SYS }, caller = { first_name: 'Jane', last_name: 'Smith', eid: 'E123456' };
  const d = svc.createDraft({ template_id: 'ack', incident: inc, caller, vars: { update_by: 'EOD' } }, 'l1');
  ok(seen.length === 1 && seen[0].event === 'created' && seen[0].draft.incident.number === 'INC0012345', 'create emits one event with the incident');
  ok(seen[0].draft.body_length === d.body.length && !('body' in seen[0].draft), 'sink gets body length, not body');
  svc.approveDraft(d.id, 'tech');
  process.env.SN_WRITEBACK_ENABLED = 'true';
  const calls = [];
  const adapter = { isConfigured: () => true, writeComment: async (t, b) => { calls.push(b); return { success: true }; }, writeWorkNote: async () => ({ success: true }) };
  await svc.sendDraft(d.id, 'tech', { adapter });
  ok(seen.map(e => e.event).join(',') === 'created,approved,send_started,sent', 'lifecycle order reaches the sink');
  ok(seen.every(e => e.id === d.id && nonEmpty(e.actor)), 'every event carries draft id and actor');
  const local = fs.readFileSync(path.join(process.env.L1_DRAFT_DIR, 'audit.jsonl'), 'utf8').trim().split('\n');
  ok(local.length === 4, 'local audit.jsonl still written');

  svc.setAuditSink(() => { throw new Error('sink down'); });
  let broke = false;
  try { svc.createDraft({ template_id: 'ack', incident: inc, caller, vars: { update_by: 'EOD' } }, 'l1'); } catch (e) { broke = true; }
  ok(!broke, 'a failing sink never breaks a draft operation');
  svc.setAuditSink(null);
  const before = seen.length;
  svc.createDraft({ template_id: 'ack', incident: inc, caller, vars: { update_by: 'EOD' } }, 'l1');
  ok(seen.length === before, 'sink can be cleared');

  // ---- server.js wiring ----
  const srv = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const reg = srv.indexOf('setAuditSink(');
  const mount = srv.indexOf("app.use('/api/l1/servicenow'");
  ok(reg > -1 && mount > -1 && reg < mount, 'server.js registers the sink before mounting the draft routes');
  ok(srv.includes("require('./server/l1-copilot/draft-audit')") && /setAuditSink\([^)]*recordL1AuditEvent/.test(srv), 'sink forwards to recordL1AuditEvent');

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
