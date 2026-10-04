'use strict';
// POST /api/training-intelligence/quiz/:providerId/submit must accept at most one
// answer per question. Otherwise repeating a right answer inflates the score
// (score = correct / answers submitted) and the value recorded to the registry.
// The registry service and token check are stubbed; the route itself is real.

process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || 'test-session-secret';

const http = require('http');
const express = require('express');

const calls = [];
function stub(modPath, exports) {
  const id = require.resolve(modPath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
stub('../server/candidate-registry-service', {
  recordTrainingEvent: async (candidateId, event) => { calls.push({ candidateId, event }); }
});
stub('../middleware/candidate-token', {
  verifyCandidateToken: (id, token) => token === 'good-token'
});

const adapter = require('../server/training-intelligence-bank-adapter');
const router = require('../routes/training-intelligence');

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log('OK:', msg);
  else { failures++; console.error('FAIL:', msg); }
}

const PROVIDER = 'servicenow-csa';
const qs = adapter.extraQuestions(PROVIDER);
assert(qs.length >= 3, 'precondition: at least three reviewed cert- questions available');

const right = q => ({ questionId: q.id, choiceId: q.choices.find(c => c.correct).id });
const wrong = q => ({ questionId: q.id, choiceId: q.choices.find(c => !c.correct).id });

const app = express();
app.use(express.json());
app.use(router);

function post(port, body, headers) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      host: '127.0.0.1', port, method: 'POST',
      path: `/api/training-intelligence/quiz/${PROVIDER}/submit`,
      headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }, headers || {})
    }, res => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(buf) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const port = server.address().port;
  const tok = { 'x-candidate-token': 'good-token' };
  try {
    // 1. The inflation attack: one right answer repeated
    calls.length = 0;
    let r = await post(port, { candidateId: 'cand-1', answers: [right(qs[0]), right(qs[0]), right(qs[0])] }, tok);
    assert(r.status === 400 && r.json.ok === false && /duplicate questionId/.test(r.json.error) && r.json.error.includes(qs[0].id),
      'the same right answer repeated three times is rejected with 400 naming the question');
    assert(calls.length === 0, 'nothing is recorded to the registry for a rejected submission');

    // 2. Same question twice with different choices
    calls.length = 0;
    r = await post(port, { candidateId: 'cand-1', answers: [wrong(qs[1]), right(qs[1])] }, tok);
    assert(r.status === 400 && /duplicate questionId/.test(r.json.error), 'the same question answered twice with different choices is rejected');
    assert(calls.length === 0, 'registry not called for the two-choices case');

    // 3. Duplicate unknown ids are also rejected (consistent, no special case)
    r = await post(port, { answers: [{ questionId: 'cert-nope', choiceId: 'a' }, { questionId: 'cert-nope', choiceId: 'b' }] });
    assert(r.status === 400 && /duplicate questionId/.test(r.json.error), 'duplicate unknown ids are rejected too');

    // 4. Distinct questions still graded and recorded as before
    calls.length = 0;
    r = await post(port, { candidateId: 'cand-1', answers: [right(qs[0]), right(qs[1]), wrong(qs[2])] }, tok);
    assert(r.status === 200 && r.json.total === 3 && r.json.correctCount === 2 && r.json.score === 67,
      'three distinct questions (2 right, 1 wrong) grade to 2/3 = 67');
    assert(r.json.registry.recorded === true && calls.length === 1 && calls[0].event.score === 67,
      'distinct reviewed questions are still recorded once with the real score');

    // 5. Existing validation unchanged
    r = await post(port, { answers: [] });
    assert(r.status === 400 && /answers array is required/.test(r.json.error), 'empty answers still returns the original 400');
  } finally {
    server.close();
  }
}

run().then(() => {
  console.log(failures ? `\nTEST FAILED (${failures})` : '\nTEST PASSED');
  process.exit(failures ? 1 : 0);
}).catch(err => { console.error('FAIL: unexpected error', err); process.exit(1); });
