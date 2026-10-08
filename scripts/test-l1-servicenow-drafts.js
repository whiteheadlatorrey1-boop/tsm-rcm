'use strict';
const os = require('os'), fs = require('fs'), path = require('path');
process.env.L1_DRAFT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'l1sn-'));
delete process.env.SN_WRITEBACK_ENABLED;
delete process.env.L1_ALLOW_SELF_APPROVE;
const svc = require('../l1-servicenow/service');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('FAIL', m)); };
const rejects = async (p, code, m) => { try { await p; ok(false, m + ' (no error)'); } catch (e) { ok(e.code === code, m + ' (got ' + e.code + ')'); } };
const throws = (f, code, m) => { try { f(); ok(false, m + ' (no error)'); } catch (e) { ok(e.code === code, m + ' (got ' + e.code + ')'); } };
const SYS = 'a'.repeat(32);

(async () => {
  ok(svc.displayName('jane', 'Smith') === 'J. Smith', 'display name');
  ok(svc.displayName('', 'Smith') === 'Smith', 'blank first');
  ok(svc.displayName('Jane', '') === '', 'blank last gives empty, not undefined');
  ok(svc.displayName('Ana', 'Lopez-Ruiz') === 'A. Lopez-Ruiz', 'hyphenated');

  const inc = { number: 'INC0012345', sys_id: SYS }, caller = { first_name: 'Jane', last_name: 'Smith', eid: 'E123456' };
  let d = svc.createDraft({ template_id: 'ack', incident: inc, caller, vars: { update_by: 'EOD' } }, 'l1');
  ok(d.visibility === 'comments' && d.field === 'comments', 'ack goes to comments');
  ok(d.body.startsWith('Hi J. Smith,') && !d.body.includes('E123456'), 'user text uses display name, not EID');

  let n = svc.createDraft({ template_id: 'internal-l1', incident: inc, caller, vars: {} }, 'l1');
  ok(n.field === 'work_notes' && n.body.includes('E123456'), 'internal uses EID, work_notes');
  ok(n.unresolved.length > 0, 'unfilled vars detected');
  throws(() => svc.approveDraft(n.id, 'tech'), 'unresolved_variables', 'approval blocked on unfilled vars');

  throws(() => svc.createDraft({ template_id: 'ack', incident: { number: 'X', sys_id: 'zz' }, caller }, 'l1'), 'bad_sys_id', 'bad sys_id');
  throws(() => svc.getDraft('../etc/passwd'), 'bad_id', 'path traversal blocked');

  throws(() => svc.approveDraft(d.id, 'l1'), 'self_approval_blocked', 'creator cannot approve own draft');
  d = svc.approveDraft(d.id, 'tech');
  ok(d.status === 'approved' && d.approval.body_sha256, 'approved with hash');
  throws(() => svc.editDraft(d.id, 'changed', 'tech'), 'not_editable', 'no edit after approval');

  await rejects(svc.sendDraft(d.id, 'tech'), 'writeback_disabled', 'send blocked by default');

  process.env.SN_WRITEBACK_ENABLED = 'true';
  let calls = [];
  const mkAdapter = (fail) => ({ isConfigured: () => true,
    writeComment: async (t, b) => { calls.push({ fn: 'comments', t, b }); if (fail) throw fail; return { success: true }; },
    writeWorkNote: async (t, b) => { calls.push({ fn: 'work_notes', t, b }); if (fail) throw fail; return { success: true }; } });
  const stub = mkAdapter();

  let r = await svc.sendDraft(d.id, 'tech', { adapter: stub });
  ok(r.draft.status === 'sent' && calls.length === 1, 'sent once');
  ok(calls[0].fn === 'comments' && calls[0].t === SYS && calls[0].b === d.body, 'comments written via adapter to the incident sys_id');
  r = await svc.sendDraft(d.id, 'tech', { adapter: stub });
  ok(r.already_sent === true && calls.length === 1, 'second send is a no-op');

  let w = svc.createDraft({ template_id: 'resolved', incident: inc, caller, vars: { resolution: 'x', reopen_days: 3 } }, 'l1');
  svc.approveDraft(w.id, 'tech');
  const bad = mkAdapter(Object.assign(new Error('boom'), { status: 500 }));
  await rejects(svc.sendDraft(w.id, 'tech', { adapter: bad }), 'servicenow_rejected', 'non-2xx surfaces');
  ok(svc.getDraft(w.id).status === 'send_failed', 'marked send_failed (retryable)');

  let t = svc.createDraft({ template_id: 'ack', incident: inc, caller, vars: { update_by: 'EOD' } }, 'l1');
  svc.approveDraft(t.id, 'tech');
  const f = path.join(process.env.L1_DRAFT_DIR, t.id + '.json');
  const raw = JSON.parse(fs.readFileSync(f, 'utf8')); raw.body = 'tampered'; fs.writeFileSync(f, JSON.stringify(raw));
  await rejects(svc.sendDraft(t.id, 'tech', { adapter: stub }), 'body_changed_after_approval', 'tamper detected');

  // --- adapter delegation ---
  const approved = (tpl, incident, vars) => { const x = svc.createDraft({ template_id: tpl, incident, caller, vars: vars || {} }, 'l1'); svc.approveDraft(x.id, 'tech'); return x; };
  const ackVars = { update_by: 'EOD' };
  let n2 = approved('internal-l1', inc, { reported: 'r', troubleshooting: 't', findings: 'f', next_step: 'n', escalated_to: 'none' });
  calls.length = 0;
  await svc.sendDraft(n2.id, 'tech', { adapter: stub });
  ok(calls.length === 1 && calls[0].fn === 'work_notes', 'internal draft goes through writeWorkNote');
  let p = approved('ack', { number: 'INC0099999' }, ackVars);
  calls.length = 0;
  await svc.sendDraft(p.id, 'tech', { adapter: stub });
  ok(calls.length === 1 && calls[0].t === 'INC0099999', 'draft without sys_id sends by incident number');
  let u = approved('ack', inc, ackVars);
  await rejects(svc.sendDraft(u.id, 'tech', { adapter: mkAdapter(Object.assign(new Error('not present'), { code: 'COMMENT_WRITE_UNVERIFIED' })) }), 'servicenow_unverified', 'unverified write surfaces');
  ok(svc.getDraft(u.id).status === 'send_failed', 'unverified marked send_failed');
  let nf = approved('ack', inc, ackVars);
  await rejects(svc.sendDraft(nf.id, 'tech', { adapter: mkAdapter(new Error('No incident found for "INC1" — cannot write comment.')) }), 'incident_not_found', 'missing incident surfaces');
  let nc = approved('ack', inc, ackVars);
  await rejects(svc.sendDraft(nc.id, 'tech', { adapter: Object.assign(mkAdapter(), { isConfigured: () => false }) }), 'servicenow_not_configured', 'unconfigured adapter refused');
  ok(svc.getDraft(nc.id).status === 'approved', 'unconfigured send leaves draft approved');
  let net = approved('ack', inc, ackVars);
  await rejects(svc.sendDraft(net.id, 'tech', { adapter: mkAdapter(new Error('ECONNRESET')) }), 'servicenow_unreachable', 'network failure surfaces');

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
