'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const express = require('express');

let failed = 0;
function check(name, ok) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failed++; }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'con-audit-'));
process.env.CONSTRUCTION_AUDIT_DIR = tmp;
const storePath = require.resolve('../server/construction-recovery/audit-store.js');
const store = require(storePath);

function call(port, method, p, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'content-type': 'application/json' };
    if (payload) headers['content-length'] = Buffer.byteLength(payload);
    const r = http.request({ host: '127.0.0.1', port, method, path: p, headers }, res => {
      let s = ''; res.on('data', d => { s += d; });
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(s || '{}') }));
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function boot(auditStore) {
  const mount = require('../routes/construction-recovery.js');
  const app = express();
  app.use(express.json());
  const router = express.Router();
  mount({ router, requireAnyAuth: (q, s, n) => n(), groqChat: async () => 'x', getActor: () => 'audit-tester', auditStore });
  app.use(router);
  const server = await new Promise(r => { const s = app.listen(0, () => r(s)); });
  return { server, port: server.address().port };
}

(async () => {
  try {
    // --- store ---
    check('starts empty', store.countAudit() === 0);
    const r1 = store.recordAudit({ eventType: 'T', actor: 'a', entityId: 'CO-1', before: { x: 1 }, after: { x: 2 } });
    check('record has id, type, vertical, timestamp', /^CON-AUDIT-/.test(r1.id) && r1.type === 'CONSTRUCTION_RECOVERY_AUDIT' && r1.vertical === 'construction' && !!r1.timestamp);
    check('record is frozen (immutable)', Object.isFrozen(r1));
    const files = fs.readdirSync(tmp).filter(f => f.startsWith('construction-recovery-audit-'));
    check('written to one dated file on disk', files.length === 1 && /\d{4}-\d{2}-\d{2}\.json$/.test(files[0]));
    store.recordAudit({ eventType: 'T2', actor: 'a', entityId: 'CO-2' });
    check('append-only: count 2, newest first', store.countAudit() === 2 && store.listAudit()[0].entityId === 'CO-2');
    check('filter by entityId', store.listAudit({ entityId: 'CO-1' }).length === 1);
    let code = null;
    try { store.recordAudit({ eventType: 'T', actor: '', entityId: 'x' }); } catch (e) { code = e.code; }
    check('missing field is rejected', code === 'MISSING_AUDIT_FIELD' && store.countAudit() === 2);
    delete require.cache[storePath];
    check('persists across a fresh load', require(storePath).countAudit() === 2);

    // fail closed on corrupt file
    const fp = path.join(tmp, files[0]);
    const good = fs.readFileSync(fp, 'utf8');
    fs.writeFileSync(fp, '{not json');
    let corrupt = null;
    try { require(storePath).recordAudit({ eventType: 'T', actor: 'a', entityId: 'x' }); } catch (e) { corrupt = e.code; }
    check('corrupt file: write refused, file left untouched', corrupt === 'AUDIT_CORRUPT' && fs.readFileSync(fp, 'utf8') === '{not json');
    fs.writeFileSync(fp, good);

    // --- routes with the real store ---
    const realStore = require(storePath);
    let { server, port } = await boot(realStore);
    const before = realStore.countAudit();
    const dec = await call(port, 'POST', '/api/construction/decisions', { coId: 'CO-03', decision: 'approve', confirm: true });
    check('decision recorded', dec.status === 200);
    const entries = realStore.listAudit({ entityId: 'CO-03' });
    check('decision wrote a durable audit entry with before/after',
      realStore.countAudit() === before + 1 && entries[0].eventType === 'CHANGE_ORDER_DECISION' &&
      entries[0].actor === 'audit-tester' && entries[0].before.status === 'pending' && entries[0].after.status === 'approve');
    const viaApi = await call(port, 'GET', '/api/construction/audit');
    check('audit endpoint reads the durable store', viaApi.json.count === realStore.countAudit());
    server.close();

    // --- fail closed: audit down means no decision ---
    const brokenStore = { recordAudit() { const e = new Error('disk full'); e.code = 'ENOSPC'; throw e; }, listAudit: () => [], countAudit: () => 0 };
    ({ server, port } = await boot(brokenStore));
    const blocked = await call(port, 'POST', '/api/construction/decisions', { coId: 'CO-03', decision: 'approve', confirm: true });
    check('audit failure blocks the decision (503)', blocked.status === 503 && blocked.json.error === 'audit_unavailable');
    const state = await call(port, 'GET', '/api/construction/recovery');
    check('blocked decision was not recorded', state.json.changeOrders.find(c => c.id === 'CO-03').decision === null);
    const draft = await call(port, 'POST', '/api/construction/draft', { type: 'rfi', id: 'RFI-101' });
    check('drafts still work when audit is down', draft.status === 200 && draft.json.draft.grounded === false);
    server.close();
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  if (failed) { console.error(failed + ' check(s) failed'); process.exit(1); }
  console.log('All construction recovery audit checks passed');
})();
