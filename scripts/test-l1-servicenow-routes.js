'use strict';
// End-to-end through the real auth middleware + router. No ServiceNow, temp draft dir.
process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || 'route-test-secret-not-for-prod';
const os = require('os'), fs = require('fs'), path = require('path');
process.env.L1_DRAFT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'l1sn-routes-'));
delete process.env.SN_WRITEBACK_ENABLED;
delete process.env.L1_ALLOW_SELF_APPROVE;
const express = require('express');
const { signSession } = require('../middleware/require-auth');
const router = require('../routes/l1-servicenow-drafts');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('FAIL', m)); };
const sess = (role, staffId, clientId) =>
  signSession({ role, staffId: staffId || undefined, clientId: clientId || undefined, exp: Date.now() + 600000 });

async function call(base, method, p, token, body) {
  const headers = {};
  if (token) headers.Cookie = 'tsm_session=' + encodeURIComponent(token);
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(base + '/api/l1/servicenow' + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch (e) {}
  return { status: r.status, j };
}

(async () => {
  const app = express();
  app.use('/api/l1/servicenow', router);
  const server = await new Promise(res => { const s = app.listen(0, '127.0.0.1', () => res(s)); });
  const base = 'http://127.0.0.1:' + server.address().port;

  const m1 = sess('manager', 's1'), m2 = sess('manager', 's2'), cl = sess('client', null, 'c1');
  const draftBody = { template_id: 'ack', incident: { number: 'INC0012345', sys_id: 'a'.repeat(32) },
                      caller: { first_name: 'Jane', last_name: 'Smith', eid: 'E123456' }, vars: { update_by: 'EOD' } };

  let r = await call(base, 'POST', '/drafts', null, draftBody);
  ok(r.status === 401, 'unauthenticated create is 401 (got ' + r.status + ')');

  r = await call(base, 'GET', '/templates', m1);
  ok(r.status === 200 && Array.isArray(r.j) && r.j.length === 6, 'templates listed for staff');

  r = await call(base, 'POST', '/drafts', m1, draftBody);
  ok(r.status === 200 && r.j.status === 'draft' && r.j.created_by === 's1', 'manager s1 creates draft, actor is staffId');
  const id = r.j.id;
  ok(r.j.body.startsWith('Hi J. Smith,') && !r.j.body.includes('E123456'), 'customer text has no EID');

  r = await call(base, 'POST', '/drafts/' + id + '/approve', cl);
  ok(r.status === 401 || r.status === 403, 'client cannot approve (got ' + r.status + ')');

  r = await call(base, 'POST', '/drafts/' + id + '/approve', m1);
  ok(r.status === 403 && r.j.error === 'self_approval_blocked', 'creator cannot approve own draft (got ' + r.status + ' ' + r.j.error + ')');

  r = await call(base, 'POST', '/drafts/' + id + '/send', m2);
  ok(r.status === 409 && r.j.error === 'not_approved', 'cannot send unapproved draft (got ' + r.status + ' ' + r.j.error + ')');

  r = await call(base, 'POST', '/drafts/' + id + '/approve', m2);
  ok(r.status === 200 && r.j.status === 'approved' && r.j.approval.by === 's2', 'second reviewer approves');

  r = await call(base, 'PATCH', '/drafts/' + id, m2, { body: 'edited after approval' });
  ok(r.status === 409 && r.j.error === 'not_editable', 'edit after approval refused');

  r = await call(base, 'POST', '/drafts/' + id + '/send', m2);
  ok(r.status === 403 && r.j.error === 'writeback_disabled', 'send blocked by default (got ' + r.status + ' ' + r.j.error + ')');

  r = await call(base, 'GET', '/drafts/not-a-real-id', m1);
  ok(r.status === 400 && r.j.error === 'bad_id', 'bad id rejected');

  r = await call(base, 'POST', '/drafts', m1, Object.assign({}, draftBody, { template_id: 'nope' }));
  ok(r.status === 400 && r.j.error === 'unknown_template', 'unknown template rejected');

  r = await call(base, 'POST', '/drafts', m1, Object.assign({}, draftBody, { visibility: 'work_notes', field: 'work_notes' }));
  ok(r.status === 200 && r.j.field === 'comments' && r.j.visibility === 'comments', 'request cannot override visibility');

  const audit = fs.readFileSync(path.join(process.env.L1_DRAFT_DIR, 'audit.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  ok(audit.some(e => e.event === 'approved' && e.actor === 's2'), 'audit log records approval by s2');
  ok(!audit.some(e => e.event === 'sent'), 'nothing was ever sent');

  r = await call(base, 'POST', '/drafts', cl, draftBody);
  ok(r.status === 401 || r.status === 403, 'client cannot create drafts (got ' + r.status + ')');
  r = await call(base, 'GET', '/drafts/' + id, cl);
  ok(r.status === 401 || r.status === 403, 'client cannot read drafts (got ' + r.status + ')');

  server.close();
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERROR', e.message); process.exit(1); });
