'use strict';
// Guards the hub-page API calls that used to 404: auth, request/response shapes the pages
// depend on, and that server.js mounts the router.
const fs = require('fs'), path = require('path'), http = require('http');
process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || 'test-session-secret';
process.env.GROQ_API_KEY = 'test-key';
const express = require('express');
const { signSession } = require('../middleware/require-auth');
const router = require('../routes/hub-api-compat');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('FAIL', m)); };

const realFetch = global.fetch; let lastGroqBody = null;
global.fetch = async (url, opts) => {
  if (String(url).includes('api.groq.com')) { lastGroqBody = JSON.parse(opts.body); return { ok: true, json: async () => ({ choices: [{ message: { content: 'stub-answer' } }] }) }; }
  return realFetch(url, opts);
};

const app = express(); app.use(router);
const srv = app.listen(0, async () => {
  const port = srv.address().port;
  const cookie = 'tsm_session=' + signSession({ role: 'admin', exp: Date.now() + 3600e3 });
  const call = (method, p, body, auth = true) => new Promise((resolve, reject) => {
    const data = body === undefined || method === 'GET' ? null : JSON.stringify(body);
    const r = http.request({ port, path: p, method, headers: Object.assign({ 'Content-Type': 'application/json', Connection: 'close' }, auth ? { Cookie: cookie } : {}) }, res => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => { let j = null; try { j = JSON.parse(b); } catch (e) {} resolve({ status: res.statusCode, json: j }); });
    }); r.on('error', reject); if (data) r.write(data); r.end();
  });
  try {
    for (const [m, p] of [['POST', '/api/groq'], ['POST', '/api/finance/query'], ['POST', '/api/finops/workpaper-push'], ['GET', '/api/finops/workpapers'], ['POST', '/api/wip/finops/accrual-recon']])
      ok((await call(m, p, {}, false)).status === 401, `${m} ${p} requires a session`);

    let r = await call('POST', '/api/groq', { query: 'hello' });
    ok(r.status === 200 && r.json.output === 'stub-answer' && r.json.content === 'stub-answer', 'groq {query} -> output+content');
    ok(lastGroqBody.messages[0].content === 'hello', 'groq forwards query as user message');
    r = await call('POST', '/api/groq', { system: 's', messages: [{ role: 'user', content: 'u' }] });
    ok(r.status === 200 && lastGroqBody.messages[0].role === 'system', 'groq keeps {messages, system} shape');
    ok((await call('POST', '/api/groq', {})).status === 400, 'groq rejects empty body');

    r = await call('POST', '/api/finance/query', { payload: { sector: 'FINOPS', node: 'N1', context: 'ctx', executive: true } });
    ok(r.status === 200 && r.json.reply === 'stub-answer' && r.json.content === 'stub-answer', 'finance/query -> reply+content');
    ok(/sector: FINOPS/.test(lastGroqBody.messages[1].content) && /ctx/.test(lastGroqBody.messages[1].content), 'finance/query prompt carries payload fields');
    ok((await call('POST', '/api/finance/query', {})).status === 400, 'finance/query rejects missing payload');

    r = await call('POST', '/api/finops/workpaper-push', { workpaperId: 'W1', workpaperType: 'wc', preparedBy: 'a', reviewedBy: 'b', summary: 's', payload: { x: 1 }, ts: 1 });
    ok(r.status === 200 && r.json.ok === true && r.json.id, 'workpaper-push -> { ok:true, id }');
    ok((await call('POST', '/api/finops/workpaper-push', { workpaperId: 'W1' })).status === 400, 'workpaper-push rejects missing type');
    r = await call('GET', '/api/finops/workpapers');
    ok(r.status === 200 && r.json.workpapers[0].workpaperId === 'W1' && r.json.workpapers[0].payload.x === 1, 'workpapers lists the push');

    r = await call('POST', '/api/wip/finops/accrual-recon', { accrued: 200, invoiced: 150, flush_threshold: 100 });
    ok(r.status === 200 && r.json.metrics && r.json.metrics.variance === 50, 'accrual-recon returns metrics');

    const root = path.join(__dirname, '..');
    ok(/require\('\.\/routes\/hub-api-compat'\)/.test(fs.readFileSync(path.join(root, 'server.js'), 'utf8')), 'server.js mounts hub-api-compat');
    const la = fs.readFileSync(path.join(root, 'html/legal-pro/legal-account.html'), 'utf8');
    ok(!la.includes('/api/finops/ingest') && la.includes('/api/finops/upload-doc'), 'legal-account posts to upload-doc');
  } catch (e) { ok(false, 'exception: ' + e.message); }
  srv.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
});
