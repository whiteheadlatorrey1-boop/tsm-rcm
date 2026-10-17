'use strict';
const http = require('http');
const express = require('express');
const mount = require('../routes/construction-recovery.js');

let failed = 0;
function check(name, ok) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failed++; }

let groqImpl = async () => 'unused';
const memRecords = [];
const memStore = {
  recordAudit: i => { const r = Object.assign({ id: 'M' + memRecords.length, timestamp: new Date().toISOString() }, i); memRecords.push(r); return r; },
  listAudit: () => memRecords.slice().reverse(),
  countAudit: () => memRecords.length
};
const requireAnyAuth = (req, res, next) =>
  req.headers['x-test-auth'] === '1' ? (req.tsmSession = { role: 'admin' }, next()) : res.status(401).json({ ok: false, error: 'unauthorized' });

function call(port, method, path, body, authed = true) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'content-type': 'application/json' };
    if (authed) headers['x-test-auth'] = '1';
    if (payload) headers['content-length'] = Buffer.byteLength(payload);
    const r = http.request({ host: '127.0.0.1', port, method, path, headers }, res => {
      let s = '';
      res.on('data', d => { s += d; });
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(s || '{}') }));
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

(async () => {
  const savedKey = process.env.GROQ_API_KEY;
  const app = express();
  app.use(express.json());
  const router = express.Router();
  mount({ router, requireAnyAuth, groqChat: (...a) => groqImpl(...a), getActor: () => 'test-admin', auditStore: memStore });
  app.use(router);
  const server = await new Promise(r => { const s = app.listen(0, () => r(s)); });
  const port = server.address().port;

  try {
    // auth
    check('unauthenticated recovery is 401', (await call(port, 'GET', '/api/construction/recovery', null, false)).status === 401);
    check('unauthenticated decisions is 401', (await call(port, 'POST', '/api/construction/decisions', { coId: 'CO-03' }, false)).status === 401);
    check('unauthenticated draft is 401', (await call(port, 'POST', '/api/construction/draft', { type: 'rfi', id: 'RFI-101' }, false)).status === 401);

    // recovery numbers
    const rec = await call(port, 'GET', '/api/construction/recovery');
    check('recovery returns 200 with locked demo numbers',
      rec.status === 200 && rec.json.schedule.weeksBehind === 9 &&
      rec.json.forecast.before.overrun === 3100000 && rec.json.forecast.after.overrun === 1400000 &&
      rec.json.forecast.after.weeksBehindAfter === 4);
    check('recovery lists 41 exposures, top 10 returned', rec.json.exposureCount === 41 && rec.json.topExposures.length === 10);

    // gate
    check('invalid decision is 400', (await call(port, 'POST', '/api/construction/decisions', { coId: 'CO-03', decision: 'maybe', confirm: true })).status === 400);
    check('unknown change order is 404', (await call(port, 'POST', '/api/construction/decisions', { coId: 'CO-99', decision: 'approve', confirm: true })).status === 404);
    const noConfirm = await call(port, 'POST', '/api/construction/decisions', { coId: 'CO-03', decision: 'approve' });
    check('decision without confirm is blocked (409)', noConfirm.status === 409 && noConfirm.json.error === 'confirmation_required');
    check('nothing audited yet', (await call(port, 'GET', '/api/construction/audit')).json.count === 0);

    const ok1 = await call(port, 'POST', '/api/construction/decisions', { coId: 'CO-03', decision: 'approve', confirm: true });
    check('confirmed decision matching the recommendation is recorded', ok1.status === 200 && ok1.json.decision.override === false && ok1.json.decision.actor === 'test-admin');
    check('duplicate decision is 409', (await call(port, 'POST', '/api/construction/decisions', { coId: 'CO-03', decision: 'approve', confirm: true })).status === 409);

    const noNote = await call(port, 'POST', '/api/construction/decisions', { coId: 'CO-07', decision: 'approve', confirm: true });
    check('override without a note is blocked', noNote.status === 409 && noNote.json.override === true);
    const withNote = await call(port, 'POST', '/api/construction/decisions', { coId: 'CO-07', decision: 'approve', confirm: true, note: 'Owner agreed to absorb the cost' });
    check('override with a note is recorded and flagged', withNote.status === 200 && withNote.json.decision.override === true);

    const audit = await call(port, 'GET', '/api/construction/audit');
    check('audit holds exactly the 2 recorded decisions', audit.json.count === 2 && audit.json.entries.every(e => e.eventType === 'CHANGE_ORDER_DECISION'));

    // drafts
    delete process.env.GROQ_API_KEY;
    const d1 = await call(port, 'POST', '/api/construction/draft', { type: 'change_order', id: 'CO-03' });
    check('no key: template fallback, grounded:false', d1.status === 200 && d1.json.draft.grounded === false && d1.json.draft.text.includes('$82,000'));

    process.env.GROQ_API_KEY = 'fake-test-key';
    groqImpl = async () => 'Groq drafted text for CO-03';
    const d2 = await call(port, 'POST', '/api/construction/draft', { type: 'change_order', id: 'CO-03' });
    check('key + Groq success: grounded:true with Groq text', d2.json.draft.grounded === true && d2.json.draft.text === 'Groq drafted text for CO-03');

    groqImpl = async () => { throw new Error('groq down'); };
    const d3 = await call(port, 'POST', '/api/construction/draft', { type: 'rfi', id: 'RFI-101' });
    check('Groq failure falls back to template, not a crash', d3.status === 200 && d3.json.draft.grounded === false && d3.json.draft.text.includes('RFI-101'));
    check('unknown draft item is 404', (await call(port, 'POST', '/api/construction/draft', { type: 'rfi', id: 'RFI-999' })).status === 404);
  } finally {
    if (savedKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = savedKey;
    server.close();
  }
  if (failed) { console.error(failed + ' check(s) failed'); process.exit(1); }
  console.log('All construction recovery route checks passed');
})();
