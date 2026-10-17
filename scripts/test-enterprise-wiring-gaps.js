'use strict';

/**
 * Platform wiring regression test.
 *
 * Each block covers one hand-off that the platform wiring map showed was not
 * connected. Boots the real server.js in-process against an in-memory Mongo
 * stub (same harness as test-bpo-os-routes.js) and loads the shipped pages in
 * jsdom from that server, so the pages, their scripts and the routes are all
 * the real ones.
 *
 *   A1  Executive decisions from the College and Concierge portals reach the
 *       server gate (were: 404 "Unknown vertical").
 *   A2  The Legal Chief Strategist loads the case the Legal War Room escalated
 *       (was: never read).
 *   A3  The Healthcare and Mortgage war rooms post node reports, so the
 *       executive Action Centers have a feed (was: nothing ever posted).
 *   A4  War room launch links point at pages that exist (were: 9 dead links).
 *   A5  The Honeywell Strategist reads the Cross-Domain Cascade room's record
 *       without double counting supplier + plant exposure (was: never read).
 *   A6  The Demo Console (20 demo videos) and the Presentation Hub are linked
 *       from the Suite Hub (were: reachable from two side pages / none).
 *   A7  The flagship story videos are published into the Demo Console (were:
 *       rendered into a git-ignored folder nobody could reach), and their
 *       captures show a real Executive Portal (was: an empty one).
 *
 * Run: node scripts/test-enterprise-wiring-gaps.js
 */

const Module = require('module');

const collections = new Map();
const clone = v => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function matchValue(actual, cond) {
  if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
    if ('$in' in cond) return cond.$in.includes(actual);
    return JSON.stringify(actual) === JSON.stringify(cond);
  }
  return actual === cond;
}
function matches(doc, query) {
  return Object.keys(query || {}).every(k => matchValue(doc[k], query[k]));
}
function cmp(a, b) { return String(a ?? '') < String(b ?? '') ? -1 : String(a ?? '') > String(b ?? '') ? 1 : 0; }

function getCollection(name) {
  if (!collections.has(name)) {
    const docs = [];
    collections.set(name, {
      async findOne(query) { return clone(docs.find(d => matches(d, query))) || null; },
      async updateOne(query, update, options = {}) {
        const i = docs.findIndex(d => matches(d, query));
        if (i === -1) {
          if (!options.upsert) return { matchedCount: 0, modifiedCount: 0 };
          docs.push(clone(Object.assign({}, update.$setOnInsert || {}, update.$set || {})));
          return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
        }
        docs[i] = Object.assign({}, docs[i], clone(update.$set || {}));
        return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
      },
      async insertOne(doc) { docs.push(clone(doc)); return { acknowledged: true }; },
      async deleteMany(query) { const before = docs.length; for (let i = docs.length - 1; i >= 0; i--) if (matches(docs[i], query)) docs.splice(i, 1); return { deletedCount: before - docs.length }; },
      async createIndex() { return 'ok'; },
      find(query) {
        let rows = docs.filter(d => matches(d, query));
        const chain = {
          sort(spec) { const [k, dir] = Object.entries(spec || {})[0] || []; if (k) rows = rows.slice().sort((a, b) => cmp(a[k], b[k]) * dir); return chain; },
          limit(n) { rows = rows.slice(0, n); return chain; },
          async toArray() { return clone(rows); },
        };
        return chain;
      },
      _docs: docs,
    });
  }
  return collections.get(name);
}

class FakeMongoClient {
  async connect() { return this; }
  db() { return { collection: name => getCollection(name) }; }
  async close() {}
}
const mongodbPath = require.resolve('mongodb');
const fakeMongo = new Module(mongodbPath, null);
fakeMongo.exports = { MongoClient: FakeMongoClient };
fakeMongo.loaded = true;
require.cache[mongodbPath] = fakeMongo;
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://fake-host/tsm-consultz-test';

{ // never let a developer's real .env override the test credentials
  const dotenvPath = require.resolve('dotenv');
  const fake = new Module(dotenvPath, null);
  fake.exports = { config: () => ({ parsed: {} }), parse: () => ({}) };
  fake.loaded = true;
  require.cache[dotenvPath] = fake;
}
process.env.TSM_SESSION_SECRET = 'test-session-secret-for-wiring-gaps';
process.env.TSM_ADMIN_PASSWORD = 'wiring-gaps-test-admin-pw';
delete process.env.TSM_STRICT_INGEST;

const auth = require('../middleware/require-auth');

let passed = 0;
let failed = 0;
function ok(cond, msg) {
  if (cond) { passed += 1; console.log('OK: ' + msg); }
  else { failed += 1; console.error('FAIL: ' + msg); }
}

let BASE = '';
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = require('net').createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
  });
}
async function waitForServer() {
  let last;
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(BASE + '/api/auth/status'); if (r.ok) return; } catch (e) { last = e; }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('server did not start: ' + (last && last.message));
}

const exp = () => Date.now() + 60 * 60 * 1000;
const cookie = payload => ({ Cookie: 'tsm_session=' + encodeURIComponent(auth.signSession(Object.assign({ exp: exp() }, payload))) });
const H = {
  admin: cookie({ role: 'admin' }),
  manager: cookie({ role: 'manager', label: 'Maria' }),
  analyst: cookie({ role: 'analyst', label: 'Ann' }),
  client: cookie({ role: 'client', clientId: 'c1' }),
};
const JSONH = who => Object.assign({ 'Content-Type': 'application/json' }, H[who]);
const get = (path, who) => fetch(BASE + path, { headers: who ? H[who] : {} });
const post = (path, who, body, headers) => fetch(BASE + path, { method: 'POST', headers: headers || JSONH(who), body: JSON.stringify(body) });
const audits = () => getCollection('bpo_audit_logs')._docs;


const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM, VirtualConsole } = require('jsdom');
const HTML = path.join(__dirname, '..', 'html');
const read = rel => fs.readFileSync(path.join(HTML, rel), 'utf8');
const hitl = () => getCollection('hitl_decisions')._docs;

// Pulls one top-level function's source out of a shipped page so the test
// runs the page's own code, not a copy of it.
function extractFunction(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('function not found: ' + name);
  let depth = 0, i = src.indexOf('{', start);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(start, i + 1);
}

// Loads a shipped page in jsdom. External scripts are not fetched; inline
// scripts run. fetch calls are recorded and answered by `respond`.
function loadPage(rel, { storage, respond } = {}) {
  const calls = [];
  const dom = new JSDOM(read(rel), {
    url: BASE + '/html/' + rel,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      Object.entries(storage || {}).forEach(([k, v]) => window.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)));
      window.fetch = (url, opts) => {
        calls.push({ url: String(url), opts: opts || {} });
        const body = respond ? respond(String(url), opts || {}) : { ok: true };
        return Promise.resolve({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
      };
    },
  });
  return { dom, win: dom.window, doc: dom.window.document, calls };
}
const tick = (ms = 60) => new Promise(r => setTimeout(r, ms));

async function main() {
  const port = await freePort();
  process.env.PORT = String(port);
  BASE = 'http://127.0.0.1:' + port;
  require('../server.js');
  await waitForServer();
  let r, j;

  // ── A1. decision gates ────────────────────────────────────────────────
  for (const v of ['college', 'concierge']) {
    r = await post('/api/exec-portal/' + v + '/decide', 'admin', { index: 0, verdict: 'approved', text: 'Approve ' + v });
    j = await r.json();
    ok(r.status === 200 && j.ok && j.recorded === true, 'A1: the server records an approved ' + v + ' decision');
  }
  r = await post('/api/exec-portal/collegecommand/decide', 'admin', { index: 0, verdict: 'approved' });
  ok(r.status === 404, 'A1: "collegecommand" is still not a gate name (the page must not send it)');
  r = await post('/api/exec-portal/concierge/decide', null, { index: 1, verdict: 'approved' });
  ok(r.status === 401, 'A1: the concierge gate is closed to an unauthenticated caller');
  r = await get('/api/exec-portal/concierge/decisions', 'admin'); j = await r.json();
  ok(r.status === 200 && j.ok && j.stats, 'A1: the concierge decision log is readable');

  for (const [rel, want] of [
    ['war-rooms/college-command/college-executive-portal.html', 'college'],
    ['concierge/concierge-executive-portal.html', 'concierge'],
    ['war-rooms/insure-war/insurance-executive-portal.html', 'insurance'],
  ]) {
    const calls = [];
    const dom = new JSDOM('<!doctype html><body><main></main></body>', { url: BASE + '/html/' + rel, runScripts: 'outside-only', pretendToBeVisual: true });
    dom.window.fetch = (url, opts) => { calls.push({ url: String(url), opts: opts || {} }); return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, recorded: true, stats: {}, decision: {} }) }); };
    dom.window.eval(read('shared/tsm-exec-portal-upgrade.js'));
    await tick();
    dom.window.TSMExecPortal.decide(0, 'approved');
    await tick();
    const urls = calls.map(c => c.url);
    ok(urls.includes('/api/exec-portal/' + want + '/decisions'), 'A1: ' + want + ' portal reads its decision log from /api/exec-portal/' + want);
    ok(urls.includes('/api/exec-portal/' + want + '/decide'), 'A1: ' + want + ' portal posts its decision to /api/exec-portal/' + want + '/decide');
    ok(!urls.some(u => u.includes('collegecommand')), 'A1: ' + want + ' portal never posts under "collegecommand"');
    dom.window.close();
  }

  // ── A2. Legal war room -> Chief Strategist ────────────────────────────
  const legalCase = {
    doc: 'Complaint text', engOut: ['Engine one finding: statute risk', '', 'Engine three finding: discovery gap'],
    matter: 'Employment Dispute', docType: 'Employment Dispute',
    snapshot: { caseType: 'Wrongful termination', riskScore: '82/100', damages: '$450,000', deadline: '2026-11-07', stage: '—' },
    timestamp: '2026-10-11T12:00:00.000Z', chainStep: 'war-room',
  };
  let p = loadPage('war-rooms/legal-war/legal-main-strategist.html', { storage: { TSM_LEGAL_WAR_RELAY: legalCase } });
  await tick();
  ok(p.doc.getElementById('matter-name').value === 'Employment Dispute', 'A2: the war room matter lands in the Chief Strategist intake');
  const ctx = p.doc.getElementById('context-input').value;
  ok(/FROM LEGAL WAR ROOM/.test(ctx) && /Risk score: 82\/100/.test(ctx) && /Damages: \$450,000/.test(ctx), 'A2: the case snapshot is carried into the analysis context');
  ok(/Engine one finding: statute risk/.test(ctx) && /Engine three finding: discovery gap/.test(ctx) && !/ENGINE 2:/.test(ctx), 'A2: non-empty engine outputs are carried, empty ones skipped');
  ok(!/Stage:/.test(ctx), 'A2: a blank snapshot field ("—") is not passed on as if it were data');
  const banner = p.doc.getElementById('war-room-relay-banner');
  ok(banner && /WAR ROOM CASE RECEIVED · Employment Dispute · RISK 82\/100/.test(banner.textContent), 'A2: a banner says the case came from the war room');
  p.doc.getElementById('matter-name').value = 'Typed by the user';
  p.doc.getElementById('context-input').value = 'User notes';
  p.win.loadWarRoomRelay();
  ok(p.doc.getElementById('matter-name').value === 'Typed by the user' && p.doc.getElementById('context-input').value === 'User notes', "A2: reloading the relay never overwrites the user's own typing");
  p.win.close();
  p = loadPage('war-rooms/legal-war/legal-main-strategist.html');
  await tick();
  ok(!p.doc.getElementById('war-room-relay-banner') && p.doc.getElementById('matter-name').value === '' && p.doc.getElementById('context-input').value === '', 'A2: with no war room case the page is unchanged');
  p.win.close();
  p = loadPage('war-rooms/legal-war/legal-main-strategist.html', { storage: { TSM_LEGAL_WAR_RELAY: '{not json' } });
  await tick();
  ok(!p.doc.getElementById('war-room-relay-banner'), 'A2: a malformed relay is ignored');
  p.win.close();
  const legalWr = read('war-rooms/legal-war/legal-war-room.html');
  ok(/localStorage\.setItem\('TSM_LEGAL_WAR_RELAY'/.test(extractFunction(legalWr, 'storeSession')) && /storeSession\(\)/.test(extractFunction(legalWr, 'escalateToChief')), 'A2: the war room still writes that key when it escalates to the Chief Strategist');

  // ── A3a. Healthcare node report ───────────────────────────────────────
  const hcWr = read('healthcare/hc-denial-war-room.html');
  const runHc = sc => {
    const sent = [];
    const ctxHc = vm.createContext({ fetch: (url, opts) => { sent.push({ url, body: JSON.parse(opts.body) }); return Promise.resolve({}); }, console, Date });
    vm.runInContext(extractFunction(hcWr, 'reportHCDenialNode') + '; reportHCDenialNode(' + JSON.stringify(sc) + ');', ctxHc);
    return sent;
  };
  const sc = { claimId: 'AZ-BCBS-2026-88214', payer: 'Blue Cross', denialReasonCode: 'CO-50 / CO-4', denialCategory: 'medical_necessity', rootCauseHypothesis: 'Missing E&M documentation', appealable: true, appealDeadline: '2026-11-07', recoveryLikelihood: 'MODERATE', confidence: 65, financialExposure: 4850 };
  let sent = runHc(sc);
  ok(sent.length === 1 && sent[0].url === '/api/hc/node-report', 'A3: the Healthcare war room posts one node report per structured case');
  const hb = sent[0].body;
  ok(hb.nodeId === 'hc-denial:AZ-BCBS-2026-88214' && hb.claimIds[0] === 'AZ-BCBS-2026-88214' && hb.denialCodes.join() === 'CO-50,CO-4', 'A3: the report is keyed by claim and carries the claim ID and denial codes');
  ok(hb.kpi.exposure === 4850 && hb.severity === 'MEDIUM' && hb.kpi.appealDeadline === '2026-11-07', 'A3: exposure, severity and deadline come from the structured case');
  ok(runHc(Object.assign({}, sc, { appealable: false }))[0].body.severity === 'HIGH' && runHc(Object.assign({}, sc, { recoveryLikelihood: 'STRONG' }))[0].body.severity === 'LOW', 'A3: severity follows the same rule the case engine sync uses');
  ok(runHc({ claimId: null, financialExposure: null, payer: 'X' }).length === 0 && runHc(null).length === 0, 'A3: a case with no claim ID and no exposure is not posted');
  ok(/reportHCDenialNode\(lastStructuredCase\);/.test(hcWr), 'A3: the war room calls it right after building the structured case');
  r = await post('/api/hc/node-report', 'analyst', hb);
  ok(r.status === 200, 'A3: the server accepts that report');
  r = await get('/api/hc/node-reports', 'admin'); j = await r.json();
  const hcStored = (j.reports || []).find(x => x.nodeId === hb.nodeId);
  ok(!!hcStored, 'A3: the report comes back from GET /api/hc/node-reports');
  const hcFinding = vm.runInNewContext('(' + extractFunction(read('healthcare/executive-portal.html'), 'nodeReportToFinding') + ')')(hcStored);
  ok(hcFinding.id === 'AZ-BCBS-2026-88214' && hcFinding.exposure === 4850 && /CO-50, CO-4/.test(hcFinding.rationale), "A3: the Executive Portal's own mapping turns it into a finding with the claim, codes and exposure");

  // ── A3b. Mortgage node reports ────────────────────────────────────────
  const mtWr = read('war-rooms/mortgage/mortgage-war-room.html');
  const mtSent = [];
  const engine = {
    getSlaBreaches: k => (k === 'loan_files' ? [{ id: 'DK-022' }, { id: 'JUMBO-010' }] : []),
    data: { exceptions: [{ exception_id: 'E1', loan_id: 'DK-022', stage: 'open' }, { exception_id: 'E2', loan_id: 'DSCR-011', stage: 'open' }, { exception_id: 'E3', loan_id: 'VA-1', stage: 'remediated' }] },
  };
  const ctxMt = vm.createContext({ engine, fetch: (url, opts) => { mtSent.push({ url, body: JSON.parse(opts.body) }); return Promise.resolve({}); }, console, Date, Array, Set });
  const anomalies = [
    { id: 'mtg-closing-delay', title: 'Loan Closing Delay — SLA Breaches', severity: 'HIGH', exposure: 37000, confidence: 80, rootCause: '2 of 9 open loan files are past their SLA clock.', recommendedAction: 'Prioritize processing.' },
    { id: 'mtg-compliance', title: 'Open Compliance Exceptions', severity: 'MED', exposure: 11000, confidence: 70, rootCause: '2 open compliance exceptions.', recommendedAction: 'Clear flagged exceptions.' },
  ];
  vm.runInContext("const MTG_SEV_TO_NODE = { CRIT: 'CRITICAL', HIGH: 'HIGH', MED: 'MEDIUM', LOW: 'LOW' };\n" + extractFunction(mtWr, 'mtgReportNodes') + '; mtgReportNodes(' + JSON.stringify(anomalies) + ');', ctxMt);
  ok(mtSent.length === 2 && mtSent.every(s => s.url === '/api/mortgage/node-report'), 'A3: the Mortgage war room posts one node report per anomaly');
  ok(mtSent[0].body.loanIds.join() === 'DK-022,JUMBO-010' && mtSent[0].body.breachCount === 2 && mtSent[0].body.exposure === 37000 && mtSent[0].body.severity === 'HIGH', 'A3: closing-delay report carries the breached loan IDs, count, exposure and severity');
  ok(mtSent[1].body.loanIds.join() === 'DK-022,DSCR-011' && mtSent[1].body.breachCount === 2 && mtSent[1].body.severity === 'MEDIUM', 'A3: compliance report counts only open exceptions');
  ok(/MTG_SEV_TO_NODE = \{ CRIT: 'CRITICAL', HIGH: 'HIGH', MED: 'MEDIUM', LOW: 'LOW' \}/.test(mtWr) && /mtgReportNodes\(payload\.anomalies\);/.test(extractFunction(mtWr, 'relayToStrategist')), 'A3: the war room fires it from relayToStrategist()');
  for (const s of mtSent) { r = await post('/api/mortgage/node-report', 'analyst', s.body); ok(r.status === 200, 'A3: the server accepts the ' + s.body.nodeId + ' report'); }
  r = await get('/api/mortgage/node-reports', 'admin'); j = await r.json();
  const mtStored = (j.reports || []).find(x => x.nodeId === 'mtg-closing-delay');
  const mtFinding = mtStored && vm.runInNewContext('(' + extractFunction(read('war-rooms/mortgage/mortgage-executive-portal.html'), 'nodeReportToFinding') + ')')(mtStored);
  ok(mtFinding && mtFinding.id === 'DK-022' && mtFinding.exposure === 37000 && /2 breach\(es\) flagged/.test(mtFinding.rationale), "A3: the Executive Portal's own mapping turns it into a finding with the loan, exposure and breach count");

  // ── A4. launch links ──────────────────────────────────────────────────
  for (const rel of ['healthcare/hc-denial-war-room.html', 'war-rooms/re-war/re-war-room.html', 'war-rooms/legal-war/legal-war-room.html']) {
    const links = Array.from(new Set(read(rel).match(/['"]\/html\/[A-Za-z0-9_./-]+\.html/g) || [])).map(s => s.slice(1));
    const dead = links.filter(l => !fs.existsSync(path.join(HTML, l.replace(/^\/html\//, ''))));
    ok(links.length > 0 && dead.length === 0, 'A4: every /html/ link in ' + rel + ' points at a page that exists' + (dead.length ? ' — dead: ' + dead.join(', ') : ' (' + links.length + ' links)'));
  }
  for (const l of ['/html/bpo-files/suite-hub.html', '/html/war-rooms/tsm-wip-command-center.html', '/html/reo-pro/re-doc-search.html', '/html/bpo-legal.tsmatter.html']) {
    r = await fetch(BASE + l);
    ok(r.status === 200, 'A4: the server serves ' + l);
  }

  // ── A6. demo videos are reachable from the Suite Hub ──────────────────
  const hub = read('bpo-files/suite-hub.html');
  ok(/href="\/html\/demo\/tsm-demo-console\.html"/.test(hub) && /href="\/html\/demo\/presentation-hub\.html"/.test(hub), 'A6: the Suite Hub links the Demo Console and the Presentation Hub');
  for (const l of ['/html/demo/tsm-demo-console.html', '/html/demo/presentation-hub.html']) {
    r = await fetch(BASE + l);
    ok(r.status === 200, 'A6: the server serves ' + l);
  }
  const consoleVideos = Array.from(new Set(read('demo/tsm-demo-console.html').match(/\$\{BASE\}\/[a-z0-9-]+\.mp4/g) || [])).map(v => v.replace('${BASE}', '/demo'));
  const missingVideos = [];
  for (const v of consoleVideos) { r = await fetch(BASE + v, { method: 'HEAD' }); if (r.status !== 200) missingVideos.push(v + ' -> ' + r.status); }
  ok(consoleVideos.length === 20 && missingVideos.length === 0, 'A6: all ' + consoleVideos.length + ' demo videos listed by the console are served' + (missingVideos.length ? ' — missing: ' + missingVideos.join(', ') : ''));

  // ── A7. flagship story videos are published into the Demo Console ─────
  const consoleSrc = read('demo/tsm-demo-console.html');
  ok(/<script src="\/demo\/flagship\/flagship-data\.js"><\/script>/.test(consoleSrc) && /DATA\.unshift\(\.\.\.FLAGSHIPS\)/.test(consoleSrc), 'A7: the Demo Console loads the published flagship list and shows it first');
  const flagCtx = { window: {} };
  vm.runInNewContext(read('demo/flagship/flagship-data.js'), flagCtx);
  const flagships = flagCtx.window.TSM_FLAGSHIP_DATA || [];
  const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tests', 'e2e', 'demo', 'demo-readiness.json'), 'utf8')).experiences;
  ok(flagships.length === registry.length && registry.every(e => flagships.some(f => f.id === 'flagship-' + e.id)), 'A7: every experience in demo-readiness.json is published (' + flagships.length + ')');
  const flagProblems = [];
  for (const f of flagships) {
    for (const url of [f.video, f.poster, f.captions]) {
      r = await fetch(BASE + url, { method: 'HEAD' });
      if (r.status !== 200) flagProblems.push(url + ' -> ' + r.status);
    }
    const ts = f.steps.map(s => s.t);
    if (ts[0] !== 0 || ts.some((x, i) => i > 0 && x <= ts[i - 1])) flagProblems.push(f.id + ': step times not increasing from 0');
    if (f.steps.some(s => ![0, 1, 2].includes(s.chain) || !s.text)) flagProblems.push(f.id + ': step without a stage or text');
    if (f.steps[f.steps.length - 1].chain !== 2 || f.steps[0].chain !== 0) flagProblems.push(f.id + ': story does not run war room -> executive');
  }
  ok(flagships.length > 0 && flagProblems.length === 0, 'A7: each published flagship has its video, poster and captions served, and steps that run war room to executive' + (flagProblems.length ? ' — ' + flagProblems.slice(0, 4).join('; ') : ''));
  const flagshipSpecs = fs.readdirSync(path.join(__dirname, '..', 'tests', 'e2e')).filter(f => /-flagship\.spec\.js$/.test(f));
  ok(flagshipSpecs.length === 7 && flagshipSpecs.every(f => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'tests', 'e2e', f), 'utf8');
    return /ESCALATE TO EXECUTIVE/.test(src) && /NO ESCALATION RECEIVED/.test(src) && !/page\.goto\('\/html\/war-rooms\/sampleaerospace-executive-portal\.html'/.test(src);
  }), 'A7: all 7 flagship captures escalate through the strategist and check the Executive Portal is not empty');

  // ── A5. cascade room -> Honeywell Strategist ──────────────────────────
  const relay = (source, lo) => ({ source, outputs: [], docText: '', timestamp: new Date().toISOString(), kpis: { exposure: { totalExposureLow: lo, totalExposureHigh: lo } } });
  const seeded = { TSM_SAMPLE_AEROSPACE_PLANT_RELAY: relay('plant', 400000), TSM_SAMPLE_AEROSPACE_SUPPLIER_RELAY: relay('supplier', 250000), TSM_SAMPLE_AEROSPACE_CASCADE_RELAY: relay('cascade', 650000) };
  const loadStrategist = async storage => {
    const dom = await JSDOM.fromURL(BASE + '/html/war-rooms/sampleaerospace-strategist.html', {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
      virtualConsole: new VirtualConsole(), // page fonts are not reachable offline; keep the run quiet
      beforeParse(window) {
        Object.entries(storage).forEach(([k, v]) => window.localStorage.setItem(k, JSON.stringify(v)));
        window.fetch = () => Promise.resolve({ ok: false, status: 401, json: async () => ({ ok: false }) });
      },
    });
    for (let i = 0; i < 100 && !(dom.window.TSMBNCAExposureEngine && typeof dom.window.computeAggregateBNCA === 'function'); i++) await tick(50);
    return dom;
  };
  let hs = await loadStrategist(seeded);
  ok(typeof hs.window.computeAggregateBNCA === 'function' && !!hs.window.TSMBNCAExposureEngine, 'A5: the strategist page and its exposure engine load from the server');
  let entries = hs.window.loadAllRelays();
  ok(entries.length === 3 && entries.some(x => x.source === 'cascade'), "A5: the strategist now reads the cascade room's record alongside plant and supplier");
  let agg = hs.window.computeAggregateBNCA(entries);
  const plantOnly = hs.window.computeSampleAerospaceBNCA(seeded.TSM_SAMPLE_AEROSPACE_PLANT_RELAY).currentExposure;
  const supplierOnly = hs.window.computeSampleAerospaceBNCA(seeded.TSM_SAMPLE_AEROSPACE_SUPPLIER_RELAY).currentExposure;
  ok(agg.domainCount === 2 && agg.currentExposure === plantOnly + supplierOnly, 'A5: the aggregate still sums plant + supplier only, so the combined cascade figure is not counted twice');
  ok(/CROSS-DOMAIN CASCADE/.test(hs.window.document.body.textContent), 'A5: the cascade room appears on the strategist page');
  ok(/cascade:\s*\{ label: 'CROSS-DOMAIN CASCADE/.test(read('war-rooms/sampleaerospace-executive-portal.html')), 'A5: the Executive Portal names the cascade room too, instead of a generic label');
  hs.window.close();
  hs = await loadStrategist({ TSM_SAMPLE_AEROSPACE_CASCADE_RELAY: seeded.TSM_SAMPLE_AEROSPACE_CASCADE_RELAY });
  agg = hs.window.computeAggregateBNCA(hs.window.loadAllRelays());
  ok(agg.domainCount === 1 && agg.currentExposure > 0, 'A5: when the cascade record is the only one present it is counted');
  hs.window.close();
  hs = await loadStrategist({ TSM_SAMPLE_AEROSPACE_PLANT_RELAY: seeded.TSM_SAMPLE_AEROSPACE_PLANT_RELAY });
  agg = hs.window.computeAggregateBNCA(hs.window.loadAllRelays());
  ok(agg.domainCount === 1 && agg.currentExposure === plantOnly, 'A5: a plant-only strategist view is unchanged');
  hs.window.close();

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
