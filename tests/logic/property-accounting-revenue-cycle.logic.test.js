// Standalone jsdom logic check for html/construction-suite/property-accounting-revenue-cycle.html.
//
// Why this exists: this sandbox had no path to download Chromium for Playwright
// (same limitation flagged elsewhere in this repo's history), so the new
// journal-entry / AP-approval / budget-edit logic was verified this way instead
// of live-in-browser. Run tests/e2e/demo/property-accounting-revenue-cycle.spec.js
// for real once you're in the Codespace — that's the higher-fidelity check.
//
// jsdom is NOT a repo devDependency (this repo's root package.json has an
// unrelated blocked-domain dependency that breaks a plain `npm install` in some
// sandboxes) — install it standalone to run this file:
//   npm install --no-save jsdom
//   node tests/logic/property-accounting-revenue-cycle.logic.test.js

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(
  path.join(__dirname, '../../html/construction-suite/property-accounting-revenue-cycle.html'),
  'utf8'
).replace('<script src="/html/shared/tsm-exceptions.js"></script>', ''); // not needed for these checks

const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });

setTimeout(() => {
  const { window } = dom;
  const doc = window.document;
  let failures = 0;
  function check(label, cond) {
    if (cond) { console.log('PASS -', label); }
    else { console.log('FAIL -', label); failures++; }
  }

  check('AP queue renders 3 pending invoices', doc.querySelectorAll('#apQueueBody tr').length === 3);
  check('kpiApPending starts at 3', doc.getElementById('kpiApPending').textContent === '3');
  check('ledger starts empty', doc.getElementById('glBalanceStatus').textContent === '$0.00 / $0.00');
  check('resolve-recon button starts disabled', doc.getElementById('resolveReconBtn').disabled === true);

  doc.getElementById('jeAccount').value = 'Construction Expense';
  doc.getElementById('jeType').value = 'debit';
  doc.getElementById('jeAmount').value = '5000';
  doc.getElementById('jeDesc').value = 'Test debit entry';
  window.postJournalEntry();

  check('ledger has 1 row after posting', doc.querySelectorAll('#glLedgerBody tr').length === 1);
  check('Actual increased by 5000 (debit to expense)', doc.getElementById('kpiActual').textContent.includes('522,400'));
  check('reports out of balance after single debit', doc.getElementById('glBalanceSub').textContent.includes('out of balance'));
  check('resolve-recon still disabled (unbalanced)', doc.getElementById('resolveReconBtn').disabled === true);

  doc.getElementById('jeAccount').value = 'Cash';
  doc.getElementById('jeType').value = 'credit';
  doc.getElementById('jeAmount').value = '5000';
  doc.getElementById('jeDesc').value = 'Test credit entry';
  window.postJournalEntry();

  check('ledger has 2 rows after second post', doc.querySelectorAll('#glLedgerBody tr').length === 2);
  check('reports balanced after matching credit', doc.getElementById('glBalanceSub').textContent.includes('balanced'));
  check('resolve-recon enabled once balanced', doc.getElementById('resolveReconBtn').disabled === false);

  check('P1 reconciliation row present before resolve', !!doc.getElementById('exc-recon'));
  window.resolveReconciliation();
  check('P1 reconciliation row removed after resolve', !doc.getElementById('exc-recon'));

  window.approveInvoice('INV-4821');
  check('approving posts 2 new ledger lines', doc.querySelectorAll('#glLedgerBody tr').length === 4);
  check('Actual increased by invoice amount on approval', doc.getElementById('kpiActual').textContent.includes('540,800'));
  check('kpiApPending drops to 2', doc.getElementById('kpiApPending').textContent === '2');
  check('AP exception text updates', doc.getElementById('exc-ap-pending-text').textContent.startsWith('2 AP invoices'));

  window.rejectInvoice('INV-4822');
  check('rejecting does not post ledger lines', doc.querySelectorAll('#glLedgerBody tr').length === 4);
  check('kpiApPending drops to 1 after reject', doc.getElementById('kpiApPending').textContent === '1');

  window.approveInvoice('INV-4823');
  check('kpiApPending reaches 0', doc.getElementById('kpiApPending').textContent === '0');
  check('AP-pending exception row removed once empty', !doc.getElementById('exc-ap-pending'));

  doc.getElementById('budgetInput').value = '600000';
  window.updateBudget();
  check('kpiBudget updated', doc.getElementById('kpiBudget').textContent.includes('600,000'));
  check('variance now under budget', doc.getElementById('kpiVarianceSub').textContent === 'Under budget');

  const budgetTextBefore = doc.getElementById('kpiBudget').textContent;
  doc.getElementById('budgetInput').value = '-50';
  window.updateBudget();
  check('invalid budget rejected', doc.getElementById('kpiBudget').textContent === budgetTextBefore);
  check('invalid budget shows warning', doc.getElementById('budgetSaveMsg').textContent.includes('\u26a0'));

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
  process.exit(failures === 0 ? 0 : 1);
}, 100);
