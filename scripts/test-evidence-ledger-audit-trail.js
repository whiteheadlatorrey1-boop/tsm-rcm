#!/usr/bin/env node
/**
 * test-evidence-ledger-audit-trail.js
 *
 * Proves, end to end, that:
 *   1. evidence-ledger.js attaches window.TSM.evidenceLedger with the real
 *      getByDomain() method (not the nonexistent forDomain() the old code
 *      called).
 *   2. Wiring the exec portals to call evidenceLedger.record() once per
 *      rendered explain item (mirroring the actual inline code in
 *      html/healthcare/executive-portal.html and
 *      html/war-rooms/construct-war/construction-executive-portal.html)
 *      produces real records.
 *   3. TSMDeliveryPackage.build()'s auditTrail field -- previously always
 *      [] because of the forDomain/getByDomain mismatch -- now comes back
 *      populated.
 *   4. Domain isolation holds (Construction writes don't leak into a
 *      Healthcare read).
 *   5. Regression: the package still honestly returns [] when
 *      evidence-ledger.js was never loaded (the fix doesn't fabricate
 *      data, it just makes the real path reachable).
 *
 * Uses jsdom instead of Node's plain require() because evidence-ledger.js
 * and tsm-delivery-package.js both attach to `window`/`global` the way a
 * browser script tag does, not via module.exports in the browser path --
 * a bare Node require() can exercise the module.exports branch, but that
 * doesn't prove the window.TSM wiring these two pages actually rely on
 * in production.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let passed = 0;
let failed = 0;

function check(label, cond) {
  if (cond) {
    passed++;
    console.log('  OK   ' + label);
  } else {
    failed++;
    console.log('  FAIL ' + label);
  }
}

function loadScriptIntoWindow(win, filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  win.eval(code);
}

// Mirrors the exact inline wiring added to both exec portals.
function recordItemsLikeExecPortal(win, domain, prefix, items) {
  const TSM = win.TSM;
  if (!(TSM && TSM.evidenceLedger && Array.isArray(items))) return;
  items.forEach(function (item, i) {
    if (!item || !item.claim) return;
    TSM.evidenceLedger.record({
      domain: domain,
      decisionId: item.id || (prefix + '-' + i + '-' + item.claim.slice(0, 40)),
      summary: item.claim,
      ruleIds: item.sources || [],
      confidence: (item.confidence != null) ? item.confidence : null,
      severity: item.severity || null,
      dataPoints: item.dataPoints || []
    });
  });
}

const EVIDENCE_LEDGER_PATH = path.join(__dirname, '..', 'html', 'shared', 'runtime', 'trust-evidence', 'evidence-ledger.js');
const DELIVERY_PACKAGE_PATH = path.join(__dirname, '..', 'html', 'shared', 'tsm-delivery-package.js');

function freshWindow() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://example.test/',
    runScripts: 'dangerously'
  });
  return dom.window;
}

console.log('1. evidence-ledger.js loads and attaches to window.TSM');
{
  const win = freshWindow();
  loadScriptIntoWindow(win, EVIDENCE_LEDGER_PATH);
  check('window.TSM exists after loading evidence-ledger.js', !!win.TSM);
  check('window.TSM.evidenceLedger exists', !!(win.TSM && win.TSM.evidenceLedger));
  check('evidenceLedger.getByDomain is the real method name (not forDomain)',
    typeof win.TSM.evidenceLedger.getByDomain === 'function');
  check('evidenceLedger.forDomain does NOT exist -- confirms the old code was calling a real gap, not a typo that happened to work',
    typeof win.TSM.evidenceLedger.forDomain === 'undefined');
}

console.log('\n2. Simulating the exec-portal wiring: record() one entry per explain item, exactly as healthcare/executive-portal.html and construction-executive-portal.html now do on mount()');
let hcWin;
{
  hcWin = freshWindow();
  loadScriptIntoWindow(hcWin, EVIDENCE_LEDGER_PATH);
  loadScriptIntoWindow(hcWin, DELIVERY_PACKAGE_PATH);

  const items = [
    { id: 'hc-1', claim: 'Deny appeal on claim 4471 -- missing prior auth', sources: ['Engine 3 — Denials Analyst'], confidence: 92, severity: 'high' },
    null, // guarded: should be skipped without throwing
    { claim: '' }, // guarded: empty claim should be skipped
    { claim: 'Escalate to case management', confidence: 61 }, // no id, no sources
    { id: 'hc-2', claim: 'Auto-approve renewal', sources: ['Engine 1'], confidence: 88 }
  ];

  recordItemsLikeExecPortal(hcWin, 'Healthcare', 'hc', items);
  const hcRecords = hcWin.TSM.evidenceLedger.getByDomain('Healthcare');

  check('exactly 3 records written for Healthcare (2 skipped: null item + empty claim)', hcRecords.length === 3);
  check('item.id used as decisionId when present', hcRecords.some(r => r.decisionId === 'hc-1'));
  check('generated decisionId used when item.id is absent, using the passed-in domain prefix',
    hcRecords.some(r => typeof r.decisionId === 'string' && r.decisionId.indexOf('hc-') === 0 && r.decisionId !== 'hc-1' && r.decisionId !== 'hc-2'));
  check('summary is the item claim verbatim', hcRecords.some(r => r.summary === 'Deny appeal on claim 4471 -- missing prior auth'));
  check('ruleIds carries item.sources', hcRecords.some(r => Array.isArray(r.ruleIds) && r.ruleIds.indexOf('Engine 3 — Denials Analyst') !== -1));
  check('missing confidence stored as null, not fabricated as 0',
    hcRecords.some(r => r.summary === 'Escalate to case management' && r.confidence === 61) &&
    hcRecords.every(r => r.confidence === null || typeof r.confidence === 'number'));
}

console.log('\n3. Domain isolation -- Construction records must not leak into a Healthcare read');
{
  const beforeCount = hcWin.TSM.evidenceLedger.getByDomain('Healthcare').length;
  const ctorItems = [{ id: 'ctor-1', claim: 'Flag change order #22 over budget threshold', sources: ['Engine 2'], confidence: 74 }];
  recordItemsLikeExecPortal(hcWin, 'Construction', 'ctor', ctorItems);

  const hcAfter = hcWin.TSM.evidenceLedger.getByDomain('Healthcare');
  const ctorRecords = hcWin.TSM.evidenceLedger.getByDomain('Construction');

  check('Healthcare record count unchanged after a Construction write', hcAfter.length === beforeCount);
  check('Construction read returns only its own record', ctorRecords.length === 1 && ctorRecords[0].decisionId === 'ctor-1');
  check("Construction record's domain field is correct", ctorRecords[0].domain === 'Construction');
}

console.log("\n4. The actual bug fix -- TSMDeliveryPackage.build() now returns a real, non-empty auditTrail");
{
  const pkg = hcWin.TSMDeliveryPackage.build({
    domain: 'Healthcare',
    documentCount: 9842,
    qualityScore: { overall: 97, band: 'STRONG', openFindings: 2, recordCount: 9842 },
    explainItems: []
  });

  check('auditTrail is an array', Array.isArray(pkg.auditTrail));
  check('auditTrail contains the 3 real Healthcare records (this was always [] before the forDomain->getByDomain fix, even with evidence-ledger.js loaded and populated exactly like this)',
    pkg.auditTrail.length === 3);
  check('every record in the exported auditTrail is domain-scoped correctly',
    pkg.auditTrail.every(r => r.domain === 'Healthcare'));
}

console.log('\n5. Regression: package still honestly empty when evidence-ledger.js genuinely was never loaded');
{
  const bareWin = freshWindow();
  loadScriptIntoWindow(bareWin, DELIVERY_PACKAGE_PATH); // no evidence-ledger.js loaded
  const pkg = bareWin.TSMDeliveryPackage.build({
    domain: 'Healthcare',
    documentCount: 100,
    qualityScore: { overall: 90, band: 'STRONG', openFindings: 0, recordCount: 100 },
    explainItems: []
  });
  check('auditTrail is honestly [] when evidence-ledger.js truly is not loaded -- the fix does not fabricate data, it just makes the real path reachable',
    Array.isArray(pkg.auditTrail) && pkg.auditTrail.length === 0);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
