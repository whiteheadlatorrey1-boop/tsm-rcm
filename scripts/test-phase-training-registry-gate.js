'use strict';
// Registry-write gate on POST /api/training-intelligence/quiz/:providerId/submit.
// servicenow-csa-questions.json is verified:false, so a score may be recorded to
// the Candidate Registry only when EVERY submitted question is a reviewed
// certification-bank question (source 'certification-bank'). The registry service
// and token check are stubbed; the route itself is the real one.

process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || 'test-session-secret';

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

// Stubs must be in require.cache before the route handler runs its lazy requires.
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
const certQs = adapter.extraQuestions(PROVIDER);
const legacyFile = path.join(__dirname, '..', 'data', 'training-intelligence', 'providers', 'servicenow-csa-questions.json');
const legacyBank = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
const legacyQ = (legacyBank.questions || []).find(q => !String(q.id).startsWith('cert-'));

assert(legacyBank.verified === false, 'precondition: servicenow-csa-questions.json is verified:false');
assert(certQs.length >= 2, 'precondition: at least two reviewed cert- questions available');
assert(!!legacyQ, 'precondition: a legacy (non-cert) question exists');

const rightAnswer = q => ({ questionId: q.id, choiceId: q.choices.find(c => c.correct).id });
const legacyAnswer = q => ({ questionId: q.id, choiceId: q.choices.find(c => c.correct).id });

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
    // 1. All reviewed cert- questions, valid token -> recorded
    calls.length = 0;
    let r = await post(port, { candidateId: 'cand-1', answers: [rightAnswer(certQs[0]), rightAnswer(certQs[1])] }, tok);
    assert(r.status === 200 && r.json.score === 100, 'grading unaffected: two right cert- answers score 100');
    assert(r.json.verified === false, 'response still reports the bank as verified:false (banner stays)');
    assert(r.json.registry.recorded === true, 'all-reviewed quiz is recorded to the registry');
    assert(calls.length === 1 && calls[0].candidateId === 'cand-1' && calls[0].event.type === 'quiz' && calls[0].event.score === 100,
      'registry received one quiz event with the graded score');
    assert(calls[0] && calls[0].event.meta && calls[0].event.meta.basis === 'reviewed-questions', 'event meta records basis: reviewed-questions');

    // 2. Mixed with a legacy question -> not recorded
    calls.length = 0;
    r = await post(port, { candidateId: 'cand-1', answers: [rightAnswer(certQs[0]), legacyAnswer(legacyQ)] }, tok);
    assert(r.status === 200 && r.json.registry.recorded === false && /review record/.test(r.json.registry.reason),
      'quiz including a legacy question is not recorded');
    assert(calls.length === 0, 'registry not called for a mixed quiz');

    // 3. Legacy only -> not recorded
    calls.length = 0;
    r = await post(port, { candidateId: 'cand-1', answers: [legacyAnswer(legacyQ)] }, tok);
    assert(r.json.registry.recorded === false && calls.length === 0, 'legacy-only quiz is not recorded');

    // 4. Unknown id alongside a reviewed one -> not recorded
    calls.length = 0;
    r = await post(port, { candidateId: 'cand-1', answers: [rightAnswer(certQs[0]), { questionId: 'cert-nope', choiceId: 'a' }] }, tok);
    assert(r.json.registry.recorded === false && calls.length === 0, 'quiz with an unknown question id is not recorded');

    // 5. No candidateId -> untouched behavior
    calls.length = 0;
    r = await post(port, { answers: [rightAnswer(certQs[0])] }, tok);
    assert(r.json.registry.recorded === false && r.json.registry.reason === 'no candidateId supplied' && calls.length === 0,
      'no candidateId: nothing recorded, original reason kept');

    // 6. Bad token -> not authorized, even with all-reviewed questions
    calls.length = 0;
    r = await post(port, { candidateId: 'cand-1', answers: [rightAnswer(certQs[0])] }, { 'x-candidate-token': 'bad' });
    assert(r.json.registry.recorded === false && /not authorized/.test(r.json.registry.reason) && calls.length === 0,
      'invalid token is refused even for an all-reviewed quiz');

    // 7. No token header at all
    calls.length = 0;
    r = await post(port, { candidateId: 'cand-1', answers: [rightAnswer(certQs[0])] });
    assert(r.json.registry.recorded === false && calls.length === 0, 'missing token is refused');
  } finally {
    server.close();
  }
}

run().then(() => {
  console.log(failures ? `\nTEST FAILED (${failures})` : '\nTEST PASSED');
  process.exit(failures ? 1 : 0);
}).catch(err => { console.error('FAIL: unexpected error', err); process.exit(1); });
