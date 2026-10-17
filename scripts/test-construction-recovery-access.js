'use strict';
// Role gate and audit actor for the Construction recovery routes. Mirrors the
// real middleware: the session lands on req.tsmSession, and no actor is injected.
const http = require('http');
const express = require('express');
const mount = require('../routes/construction-recovery.js');

let failed = 0;
function check(name, ok) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failed++; }

const SESSIONS = {
  admin: { role: 'admin' },
  manager: { role: 'manager', staffId: 'staff-7', label: 'Pat Manager' },
  analyst: { role: 'analyst', staffId: 'staff-9' },
  client: { role: 'client', clientId: 'acme', label: 'Acme' }
};
const requireAnyAuth = (req, res, next) => {
  const s = SESSIONS[req.headers['x-test-session']];
  if (!s) return res.status(401).json({ ok: false, error: 'unauthorized' });
  req.tsmSession = Object.assign({ clientId: null, staffId: null, label: null }, s);
  next();
};

const records = [];
const memStore = {
  recordAudit: i => { const r = Object.assign({ id: 'M' + records.length }, i); records.push(r); return r; },
  listAudit: () => records.slice().reverse(),
  countAudit: () => records.length
};

const decisions = () => records.filter(r => r.eventType === 'CHANGE_ORDER_DECISION');

function call(port, who, method, p, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'content-type': 'application/json' };
    if (who) headers['x-test-session'] = who;
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

(async () => {
  const savedKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  const app = express();
  app.use(express.json());
  const router = express.Router();
  mount({ router, requireAnyAuth, groqChat: async () => 'x', auditStore: memStore }); // no getActor
  app.use(router);
  const server = await new Promise(r => { const s = app.listen(0, () => r(s)); });
  const port = server.address().port;
  const D = (co, extra) => Object.assign({ coId: co, decision: 'approve', confirm: true }, extra || {});

  try {
    check('no session: decisions 401', (await call(port, null, 'POST', '/api/construction/decisions', D('CO-03'))).status === 401);

    const c1 = await call(port, 'client', 'POST', '/api/construction/decisions', D('CO-03'));
    check('client role cannot record a decision (403 staff_only)', c1.status === 403 && c1.json.error === 'staff_only');
    check('client role cannot read the audit trail (403)', (await call(port, 'client', 'GET', '/api/construction/audit')).status === 403);
    check('a refused client attempt wrote nothing', records.length === 0);
    check('the change order is still undecided after a client attempt',
      (await call(port, 'admin', 'GET', '/api/construction/recovery')).json.changeOrders.find(c => c.id === 'CO-03').decision === null);

    check('client can still read the recovery view (200)', (await call(port, 'client', 'GET', '/api/construction/recovery')).status === 200);
    check('client can still request a draft (200)', (await call(port, 'client', 'POST', '/api/construction/draft', { type: 'rfi', id: 'RFI-101' })).status === 200);

    const a = await call(port, 'admin', 'POST', '/api/construction/decisions', D('CO-03'));
    check('admin decision recorded, actor is "admin" (not "session")', a.status === 200 && a.json.decision.actor === 'admin' && decisions()[0].actor === 'admin');
    const m = await call(port, 'manager', 'POST', '/api/construction/decisions', D('CO-04'));
    check('manager decision recorded, actor is the staff label', m.status === 200 && m.json.decision.actor === 'Pat Manager');
    const n = await call(port, 'analyst', 'POST', '/api/construction/decisions', D('CO-09'));
    check('analyst decision recorded, actor falls back to staffId', n.status === 200 && n.json.decision.actor === 'staff-9');
    check('decision audit entries carry those actors', decisions().map(r => r.actor).join(',') === 'admin,Pat Manager,staff-9');
    check('the client draft was audited under the client, not as a decision', records.some(r => r.eventType === 'DRAFT_GENERATED' && r.actor === 'Acme'));
    check('staff can read the audit trail', (await call(port, 'manager', 'GET', '/api/construction/audit')).json.entries.filter(e => e.eventType === 'CHANGE_ORDER_DECISION').length === 3);
  } finally {
    if (savedKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = savedKey;
    server.close();
  }
  if (failed) { console.error(failed + ' check(s) failed'); process.exit(1); }
  console.log('All construction recovery access checks passed');
})();
