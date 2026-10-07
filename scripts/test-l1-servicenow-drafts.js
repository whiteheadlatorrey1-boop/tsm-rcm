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
  process.env.SN_INSTANCE_URL = 'https://example.service-now.com';
  process.env.SN_USER = 'u'; process.env.SN_PASSWORD = 'p';
  let calls = [];
  const stub = async (url, o) => { calls.push({ url, o }); return { ok: true, status: 200, json: async () => ({ result: { sys_id: SYS, number: 'INC0012345' } }) }; };

  let r = await svc.sendDraft(d.id, 'tech', { fetchImpl: stub });
  ok(r.draft.status === 'sent' && calls.length === 1, 'sent once');
  ok(calls[0].o.method === 'PATCH' && calls[0].url.endsWith('/api/now/table/incident/' + SYS), 'PATCH to incident');
  ok(JSON.parse(calls[0].o.body).comments === d.body, 'payload uses comments field');
  r = await svc.sendDraft(d.id, 'tech', { fetchImpl: stub });
  ok(r.already_sent === true && calls.length === 1, 'second send is a no-op');

  let w = svc.createDraft({ template_id: 'resolved', incident: inc, caller, vars: { resolution: 'x', reopen_days: 3 } }, 'l1');
  svc.approveDraft(w.id, 'tech');
  const bad = async () => ({ ok: false, status: 500, json: async () => ({}) });
  await rejects(svc.sendDraft(w.id, 'tech', { fetchImpl: bad }), 'servicenow_rejected', 'non-2xx surfaces');
  ok(svc.getDraft(w.id).status === 'send_failed', 'marked send_failed (retryable)');

  let t = svc.createDraft({ template_id: 'ack', incident: inc, caller, vars: { update_by: 'EOD' } }, 'l1');
  svc.approveDraft(t.id, 'tech');
  const f = path.join(process.env.L1_DRAFT_DIR, t.id + '.json');
  const raw = JSON.parse(fs.readFileSync(f, 'utf8')); raw.body = 'tampered'; fs.writeFileSync(f, JSON.stringify(raw));
  await rejects(svc.sendDraft(t.id, 'tech', { fetchImpl: stub }), 'body_changed_after_approval', 'tamper detected');

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
