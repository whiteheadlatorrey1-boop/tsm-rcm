/**
 * Verifies the pilot-readiness Case tenant-isolation fix:
 *   - TSMCaseManager.getAll({vertical, tenantId}) scopes correctly
 *   - TSMCaseManager.getAll('vertical') (legacy string form) still works unchanged
 *   - TSMCaseWidget.mount() with tenantId only renders that tenant's cases
 *   - TSMCaseWidget.mount() without tenantId still renders everything (no regression
 *     for the other ~13 verticals that call this widget without tenantId today)
 *
 * Run: node scripts/verify-case-tenant-isolation.js
 */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const dom = new JSDOM('<!DOCTYPE html><div id="tsm-case-queue"></div>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;

function load(relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  dom.window.eval(code);
}

load('html/shared/tsm-case-manager.js');
load('html/js/widgets/tsm-case-widget.js');

const Cases = dom.window.TSMCaseManager;
const Widget = dom.window.TSMCaseWidget;

let failures = 0;
function check(label, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' — ' + label);
  if (!cond) failures++;
}

// -- Seed two clients' cases in the same vertical, same shape real code produces --
Cases.create({ vertical: 'healthcare', sector: 'healthcare', tenantId: 'CLIENT_A', title: 'Client A denial CLM-1001', priority: 'P1' });
Cases.create({ vertical: 'healthcare', sector: 'healthcare', tenantId: 'CLIENT_B', title: 'Client B denial CLM-2002', priority: 'P1' });
Cases.create({ vertical: 'healthcare', sector: 'healthcare', tenantId: 'CLIENT_A', title: 'Client A remittance CLM-1002', priority: 'P2' });
// A pre-fix-era case with no tenantId at all -- must remain visible to everyone
// (see the "safest default" comment in getAll()), not silently dropped.
Cases.create({ vertical: 'healthcare', sector: 'healthcare', title: 'Legacy case, no tenantId', priority: 'P3' });

// -- 1. Legacy plain-string call: unchanged behavior, all 4 cases visible --
const legacyCall = Cases.getAll('healthcare');
check('legacy getAll(string) still returns all cases for the vertical', legacyCall.length === 4);

// -- 2. New object-form call, scoped to CLIENT_A --
const scopedA = Cases.getAll({ vertical: 'healthcare', tenantId: 'CLIENT_A' });
check('getAll({tenantId: CLIENT_A}) returns exactly Client A\'s 2 cases', scopedA.length === 2);
check('...and none of them belong to Client B', scopedA.every(c => c.tenantId !== 'CLIENT_B'));

// -- 3. Legacy no-tenantId record must still surface for an unscoped caller --
const unscoped = Cases.getAll({ vertical: 'healthcare' });
check('getAll({vertical only}) still returns all 4 (no accidental over-filtering)', unscoped.length === 4);

// -- 4. Widget-level check: mount with tenantId only renders that tenant's rows --
const unsubA = Widget.mount('tsm-case-queue', { sector: 'healthcare', tenantId: 'CLIENT_A' });
const rowsA = document.querySelectorAll('.tsm-caseq-row').length;
check('Widget mounted with tenantId=CLIENT_A renders exactly 2 rows', rowsA === 2);
if (unsubA) unsubA();

// -- 5. Widget-level check: mount WITHOUT tenantId (every other vertical's call
//       site today) behaves exactly as before the fix -- all cases render --
const unsubNone = Widget.mount('tsm-case-queue', { sector: 'healthcare' });
const rowsNone = document.querySelectorAll('.tsm-caseq-row').length;
check('Widget mounted with no tenantId (unchanged call sites) still renders all 4 rows', rowsNone === 4);
if (unsubNone) unsubNone();

// -- 6. Cross-tenant leak check on Client B --
Widget.mount('tsm-case-queue', { sector: 'healthcare', tenantId: 'CLIENT_B' });
const rowsB = Array.from(document.querySelectorAll('.tsm-caseq-title')).map(el => el.textContent);
check('Client B\'s queue never shows Client A\'s case titles', !rowsB.some(t => t.includes('Client A')));
check('Client B\'s queue does show its own case', rowsB.some(t => t.includes('Client B')));

console.log('');
console.log(failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
