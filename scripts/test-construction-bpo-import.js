'use strict';
// Hand-checked unit tests for server/construction-bpo/import.js: source
// aliasing (Sage/Foundation/Procore/QuickBooks), client column-map
// overrides, numeric parsing, and the validation report's error/warning
// shape. Every expected value below was worked out by hand against the
// fixed input, not copied from the implementation.

const assert = require('assert');
const { parseRows, parseWorkbookBuffer, resolveColumnMap } = require('../server/construction-bpo/import');
const XLSX = require('xlsx');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('PASS: ' + name); }
  catch (e) { fail++; console.log('FAIL: ' + name + ': ' + e.message); }
}

// ---- source aliasing --------------------------------------------------

t('sage: canonical headers resolved via sage aliases', () => {
  const headers = ['Job Number', 'Job Description', 'Costs to Date', 'Est Cost at Completion', 'Contract Amount', 'Billed to Date', 'Original Budget', '% Complete'];
  const rows = [['J1', 'Tower A', '920000', '1000000', '1200000', '900000', '950000', '70']];
  const { jobs, report } = parseRows(headers, rows, { source: 'sage' });
  assert.strictEqual(report.importedRows, 1);
  assert.deepStrictEqual(report.unmatchedFields, []);
  assert.deepStrictEqual(jobs[0], {
    jobId: 'J1', jobName: 'Tower A', costsToDate: 920000, totalEstimatedCost: 1000000,
    contractValue: 1200000, billedToDate: 900000, originalBudget: 950000, physicalPercentComplete: 70,
  });
});

t('foundation: canonical headers resolved via foundation aliases', () => {
  const headers = ['Job #', 'Job Name', 'Actual Cost', 'Estimated Final Cost', 'Contract Value', 'Amount Billed'];
  const rows = [['F1', 'Riverside', '500000', '600000', '750000', '480000']];
  const { jobs, report } = parseRows(headers, rows, { source: 'foundation' });
  assert.strictEqual(report.importedRows, 1);
  assert.strictEqual(jobs[0].jobId, 'F1');
  assert.strictEqual(jobs[0].costsToDate, 500000);
  assert.strictEqual(jobs[0].totalEstimatedCost, 600000);
  assert.strictEqual(jobs[0].contractValue, 750000);
  assert.strictEqual(jobs[0].billedToDate, 480000);
});

t('procore: canonical headers resolved via procore aliases', () => {
  const headers = ['Project Number', 'Project Name', 'Costs To Date', 'Estimated At Completion', 'Contract Sum', 'Amount Invoiced'];
  const rows = [['P1', 'Harborview', '300000', '400000', '500000', '280000']];
  const { jobs } = parseRows(headers, rows, { source: 'procore' });
  assert.strictEqual(jobs[0].jobId, 'P1');
  assert.strictEqual(jobs[0].totalEstimatedCost, 400000);
  assert.strictEqual(jobs[0].contractValue, 500000);
});

t('quickbooks: Job Estimates vs. Actuals headers resolved via quickbooks aliases; no QB alias for physicalPercentComplete', () => {
  const headers = ['Job', 'Description', 'Act. Cost', 'Est. Cost', 'Est. Revenue', 'Act. Revenue'];
  const rows = [['Q1', 'Deck Rebuild', '100000', '150000', '200000', '90000']];
  const { jobs, report } = parseRows(headers, rows, { source: 'quickbooks' });
  assert.strictEqual(jobs[0].jobId, 'Q1');
  assert.strictEqual(jobs[0].costsToDate, 100000);
  assert.strictEqual(jobs[0].totalEstimatedCost, 150000);
  assert.strictEqual(jobs[0].contractValue, 200000);
  assert.strictEqual(jobs[0].billedToDate, 90000);
  assert.strictEqual(jobs[0].physicalPercentComplete, null);
  assert.ok(report.unmatchedFields.includes('physicalPercentComplete'), 'physicalPercentComplete reported unmatched for QuickBooks');
});

// ---- client column-map override ---------------------------------------

t('client column map overrides the source alias when both could match', () => {
  // This client's Sage export renames "Job Number" to "JobNo" -- the
  // built-in Sage alias ("Job Number") isn't even present in the header
  // row, so without the override this would fail to resolve jobId at all.
  const headers = ['JobNo', 'Costs to Date', 'Est Cost at Completion', 'Contract Amount', 'Billed to Date'];
  const rows = [['J9', '10', '20', '30', '5']];
  const { jobs, report } = parseRows(headers, rows, { source: 'sage', columnMap: { jobId: 'JobNo' } });
  assert.strictEqual(report.importedRows, 1);
  assert.strictEqual(jobs[0].jobId, 'J9');
});

// ---- numeric parsing ----------------------------------------------------

t('numeric cells strip $, commas, and % before parsing', () => {
  const headers = ['jobId', 'costsToDate', 'contractValue', 'physicalPercentComplete'];
  const rows = [['J1', '$1,234,567.00', '$2,000,000', '72%']];
  const { jobs, report } = parseRows(headers, rows, {});
  assert.strictEqual(jobs[0].costsToDate, 1234567);
  assert.strictEqual(jobs[0].contractValue, 2000000);
  assert.strictEqual(jobs[0].physicalPercentComplete, 72);
  assert.strictEqual(report.errors.length, 0);
});

t('unparseable numeric cell: field becomes null, an error is reported, row still imported', () => {
  const headers = ['jobId', 'costsToDate', 'contractValue'];
  const rows = [['J1', 'not-a-number', '100000']];
  const { jobs, report } = parseRows(headers, rows, {});
  assert.strictEqual(jobs.length, 1, 'row is still imported');
  assert.strictEqual(jobs[0].costsToDate, null);
  assert.strictEqual(jobs[0].contractValue, 100000);
  assert.strictEqual(report.errors.length, 1);
  assert.deepStrictEqual(report.errors[0], { row: 1, field: 'costsToDate', message: 'could not parse "not-a-number" as a number' });
});

t('empty numeric cell is treated as missing (null), not an error', () => {
  const headers = ['jobId', 'costsToDate'];
  const rows = [['J1', '']];
  const { jobs, report } = parseRows(headers, rows, {});
  assert.strictEqual(jobs[0].costsToDate, null);
  assert.strictEqual(report.errors.length, 0);
});

// ---- row-level validation: missing/duplicate jobId ----------------------

t('a row with no jobId is skipped and reported as an error, 1-based row number', () => {
  const headers = ['jobId', 'costsToDate'];
  const rows = [['J1', '1'], ['', '2'], ['J3', '3']];
  const { jobs, report } = parseRows(headers, rows, {});
  assert.strictEqual(jobs.length, 2);
  assert.deepStrictEqual(jobs.map((j) => j.jobId), ['J1', 'J3']);
  assert.strictEqual(report.totalRows, 3);
  assert.strictEqual(report.importedRows, 2);
  assert.strictEqual(report.skippedRows, 1);
  assert.deepStrictEqual(report.errors, [{ row: 2, field: 'jobId', message: 'missing jobId, row skipped' }]);
});

t('a duplicate jobId keeps the first occurrence and reports an error for the second', () => {
  const headers = ['jobId', 'costsToDate'];
  const rows = [['J1', '1'], ['J1', '2']];
  const { jobs, report } = parseRows(headers, rows, {});
  assert.strictEqual(jobs.length, 1);
  assert.strictEqual(jobs[0].costsToDate, 1, 'first occurrence wins');
  assert.strictEqual(report.errors.length, 1);
  assert.strictEqual(report.errors[0].field, 'jobId');
  assert.ok(/duplicate/.test(report.errors[0].message));
});

t('no jobId column found at all: zero jobs imported, a single row:0 error', () => {
  const headers = ['SomeOtherColumn'];
  const rows = [['x']];
  const { jobs, report } = parseRows(headers, rows, { source: 'generic' });
  assert.strictEqual(jobs.length, 0);
  assert.strictEqual(report.importedRows, 0);
  assert.strictEqual(report.skippedRows, 1);
  assert.strictEqual(report.errors.length, 1);
  assert.strictEqual(report.errors[0].row, 0);
  assert.strictEqual(report.errors[0].field, 'jobId');
});

// ---- header matching is case/whitespace insensitive, not fuzzy ---------

t('header matching ignores case and collapses whitespace, but is otherwise exact', () => {
  const headers = ['  job number  ', 'COSTS TO DATE'];
  const rows = [['J1', '500']];
  const { jobs, report } = parseRows(headers, rows, { source: 'sage' });
  assert.strictEqual(jobs[0].jobId, 'J1');
  assert.strictEqual(jobs[0].costsToDate, 500);
  assert.strictEqual(report.unmatchedFields.includes('contractValue'), true, 'a field with no matching header at all stays unmatched, not fuzzy-guessed');
});

// ---- parseWorkbookBuffer: real CSV/XLSX bytes ---------------------------

t('parseWorkbookBuffer parses a real CSV buffer end to end', () => {
  const csv = 'jobId,costsToDate,totalEstimatedCost,contractValue,billedToDate\nJ1,100000,200000,300000,90000\n';
  const { jobs, report } = parseWorkbookBuffer(Buffer.from(csv, 'utf8'), {});
  assert.strictEqual(report.importedRows, 1);
  assert.strictEqual(jobs[0].jobId, 'J1');
  assert.strictEqual(jobs[0].totalEstimatedCost, 200000);
});

t('parseWorkbookBuffer parses a real XLSX buffer end to end, source-aliased headers', () => {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Job Number', 'Costs to Date', 'Est Cost at Completion', 'Contract Amount', 'Billed to Date'],
    ['J1', 900000, 1000000, 1200000, 880000],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Jobs');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const { jobs, report } = parseWorkbookBuffer(buf, { source: 'sage' });
  assert.strictEqual(report.importedRows, 1);
  assert.strictEqual(jobs[0].jobId, 'J1');
  assert.strictEqual(jobs[0].contractValue, 1200000);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
