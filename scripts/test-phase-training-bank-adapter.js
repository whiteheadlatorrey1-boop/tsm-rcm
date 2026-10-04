'use strict';
// Verifies the certification-bank adapter through the REAL router
// (routes/training-intelligence.js), not a hand-mirrored copy:
//   1. The adapter only emits reviewed, single-answer questions with cert- ids.
//   2. GET /quiz/servicenow-csa/:domainId never leaks correct/explanation/
//      knowledge for any cert- question, and choices carry only id + text.
//   3. POST /quiz/servicenow-csa/submit grades a cert- question correctly and
//      reveals the answer only after submission.
//   4. Unknown ids fail gracefully.
// Named test-phase-*.js so scripts/run-tests.js picks it up.

process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || 'test-session-secret';

const fs = require('fs');
const http = require('http');
const express = require('express');

const adapter = require('../server/training-intelligence-bank-adapter');
const router = require('../routes/training-intelligence');

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log('OK:', msg);
  else { failures++; console.error('FAIL:', msg); }
}

const PROVIDER = 'servicenow-csa';
const extra = adapter.extraQuestions(PROVIDER);

// 1. Adapter output
assert(extra.length > 0, `adapter returns questions for ${PROVIDER} - got ${extra.length}`);
assert(extra.every(q => q.id.startsWith('cert-')), 'every adapted question id starts with cert-');
assert(extra.every(q => q.choices.filter(c => c.correct === true).length === 1),
  'every adapted question has exactly one correct choice');

const rawBank = JSON.parse(fs.readFileSync(adapter.BANKS[PROVIDER].file, 'utf8'));
const rawById = {};
(rawBank.questions || []).forEach(q => { rawById['cert-' + q.id] = q; });
assert(extra.every(q => rawById[q.id] && rawById[q.id].reviewed === true && rawById[q.id].type === 'single'),
  'every adapted question is reviewed:true and type single in the source bank');

const unreviewed = (rawBank.questions || []).filter(q => q.reviewed !== true);
const multi = (rawBank.questions || []).filter(q => q.type !== 'single');
const adaptedIds = new Set(extra.map(q => q.id));
assert(unreviewed.every(q => !adaptedIds.has('cert-' + q.id)),
  `no unreviewed question leaks into the adapter (${unreviewed.length} unreviewed in source)`);
assert(multi.every(q => !adaptedIds.has('cert-' + q.id)),
  `no multi-answer question leaks into the adapter (${multi.length} multi in source)`);

// 2 & 3. Real router over HTTP
const app = express();
app.use(express.json());
app.use(router);

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1', port, path: urlPath, method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}
    }, res => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(buf); } catch (_) { /* leave null */ }
        resolve({ status: res.statusCode, json, raw: buf });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const port = server.address().port;
  try {
    const domains = [...new Set(extra.map(q => q.domainId))];
    let leaked = 0, extraKeys = 0, certSeen = 0;
    for (const domainId of domains) {
      const r = await request(port, 'GET', `/api/training-intelligence/quiz/${PROVIDER}/${domainId}`);
      assert(r.status === 200 && r.json && r.json.ok, `GET quiz 200 for domain ${domainId}`);
      if (!r.json || !r.json.questions) continue;
      const certQs = r.json.questions.filter(q => q.id.startsWith('cert-'));
      certSeen += certQs.length;
      for (const q of certQs) {
        for (const c of q.choices) {
          if ('correct' in c || 'explanation' in c || 'knowledge' in c) leaked++;
          if (Object.keys(c).sort().join(',') !== 'id,text') extraKeys++;
        }
      }
      // The raw response must not carry the answer fields as JSON keys.
      // Key-only match so an answer whose text is the word "knowledge"
      // (cert-db-9) is not mistaken for a leaked field.
      if (/"(correct|explanation|knowledge)"\s*:/.test(r.raw)) leaked++;
    }
    assert(certSeen === extra.length, `GET serves every adapted question across domains (${certSeen}/${extra.length})`);
    assert(leaked === 0, 'GET never exposes correct/explanation/knowledge for any cert- question');
    assert(extraKeys === 0, 'GET choices for cert- questions contain ONLY id and text');

    const q = extra[0];
    const rightId = q.choices.find(c => c.correct).id;
    const wrongId = q.choices.find(c => !c.correct).id;

    const right = await request(port, 'POST', `/api/training-intelligence/quiz/${PROVIDER}/submit`,
      { answers: [{ questionId: q.id, choiceId: rightId }] });
    assert(right.status === 200 && right.json.results[0].correct === true, 'POST grades the right cert- answer correct');
    assert(right.json.results[0].correctChoiceId === rightId, 'POST reveals the correct choice after submission');

    const wrong = await request(port, 'POST', `/api/training-intelligence/quiz/${PROVIDER}/submit`,
      { answers: [{ questionId: q.id, choiceId: wrongId }] });
    assert(wrong.status === 200 && wrong.json.results[0].correct === false, 'POST grades the wrong cert- answer incorrect');
    assert(wrong.json.results[0].correctChoiceId === rightId, 'POST still reveals the real correct choice for a wrong answer');

    const unknown = await request(port, 'POST', `/api/training-intelligence/quiz/${PROVIDER}/submit`,
      { answers: [{ questionId: 'cert-does-not-exist', choiceId: 'a' }] });
    assert(unknown.status === 200 && unknown.json.results[0].error === 'unknown question',
      'POST handles an unknown cert- id gracefully');
  } finally {
    server.close();
  }
}

run().then(() => {
  console.log(failures ? `\nTEST FAILED (${failures})` : '\nTEST PASSED');
  process.exit(failures ? 1 : 0);
}).catch(err => {
  console.error('FAIL: unexpected error', err);
  process.exit(1);
});
