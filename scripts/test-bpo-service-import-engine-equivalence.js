'use strict';
// Proves server/bpo-service/import-engine.js, given construction-bpo's
// own canonical fields/aliases (the exact spec
// server/bpo-service/plugins/construction-bpo.js uses), produces
// BYTE-IDENTICAL output to the original server/construction-bpo/
// import.js for the same inputs -- this is the "zero behavior change"
// proof for the one piece of the extraction that isn't literally shared
// code (import-engine.js is a parallel, parameterized implementation,
// not a passthrough to the original).

const assert = require('assert');
const originalImporter = require('../server/construction-bpo/import');
const genericEngine = require('../server/bpo-service/import-engine');
const constructionPlugin = require('../server/bpo-service/plugins/construction-bpo');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('PASS: ' + name); }
  catch (e) { fail++; console.log('FAIL: ' + name + ': ' + e.message); }
}

const spec = constructionPlugin.fileTypes.find((ft) => ft.key === 'jobs');

const HEADERS_SAGE = ['Job Number', 'Job Description', 'Costs to Date', 'Est Cost at Completion', 'Contract Amount', 'Billed to Date', 'Original Budget', '% Complete'];
const ROWS_SAGE = [
  ['J1', 'Foundation', 500000, 1000000, 1200000, 480000, 1100000, 55],
  ['J2', 'Roofing', 200000, '', 300000, 150000, '', ''],
  ['', 'skip me', 1, 2, 3, 4, 5, 6], // missing jobId
  ['J1', 'duplicate', 9, 9, 9, 9, 9, 9], // duplicate jobId
];

const HEADERS_GENERIC_WITH_COLUMNMAP = ['My Custom Job Col', 'costsToDate', 'totalEstimatedCost', 'contractValue', 'billedToDate'];
const ROWS_GENERIC = [['G1', '100', 'not-a-number', '300', '400']];
const CLIENT_COLUMN_MAP = { jobId: 'My Custom Job Col' };

function deepEqualIgnoringOrder(a, b) {
  assert.deepStrictEqual(a, b);
}

t('parseRows: identical jobs output for a Sage export, including skipped/duplicate rows', () => {
  const original = originalImporter.parseRows(HEADERS_SAGE, ROWS_SAGE, { source: 'sage' });
  const generic = genericEngine.parseRows(HEADERS_SAGE, ROWS_SAGE, { source: 'sage' }, spec);
  deepEqualIgnoringOrder(generic.items, original.jobs);
  deepEqualIgnoringOrder(generic.report, original.report);
});

t('parseRows: identical behavior for an unparseable numeric cell', () => {
  const badRow = [['J1', 'x', 'NOT_A_NUMBER', 1200000, 480000, '', '']];
  const original = originalImporter.parseRows(HEADERS_SAGE, badRow, { source: 'sage' });
  const generic = genericEngine.parseRows(HEADERS_SAGE, badRow, { source: 'sage' }, spec);
  deepEqualIgnoringOrder(generic.items, original.jobs);
  deepEqualIgnoringOrder(generic.report.errors, original.report.errors);
});

t('parseRows: identical behavior with a client columnMap override and no recognized source', () => {
  const original = originalImporter.parseRows(HEADERS_GENERIC_WITH_COLUMNMAP, ROWS_GENERIC, { columnMap: CLIENT_COLUMN_MAP });
  const generic = genericEngine.parseRows(HEADERS_GENERIC_WITH_COLUMNMAP, ROWS_GENERIC, { columnMap: CLIENT_COLUMN_MAP }, spec);
  deepEqualIgnoringOrder(generic.items, original.jobs);
  deepEqualIgnoringOrder(generic.report, original.report);
});

t('parseRows: identical "no jobId column found" failure when the required field can\'t be resolved at all', () => {
  const headers = ['Not A Job Column', 'costsToDate'];
  const rows = [['x', 100]];
  const original = originalImporter.parseRows(headers, rows, {});
  const generic = genericEngine.parseRows(headers, rows, {}, spec);
  deepEqualIgnoringOrder(generic.items, original.jobs);
  deepEqualIgnoringOrder(generic.report, original.report);
});

t('parseWorkbookBuffer: identical output for a real CSV buffer', () => {
  const csv = 'Job,costsToDate,totalEstimatedCost,contractValue,billedToDate\nJ1,500000,1000000,1200000,480000\n';
  const buf = Buffer.from(csv, 'utf8');
  const original = originalImporter.parseWorkbookBuffer(buf, {});
  const generic = genericEngine.parseWorkbookBuffer(buf, {}, spec);
  deepEqualIgnoringOrder(generic.items, original.jobs);
  deepEqualIgnoringOrder(generic.report, original.report);
});

t('resolveColumnMap: identical column resolution across all 4 known sources plus generic', () => {
  for (const source of ['sage', 'foundation', 'procore', 'quickbooks', 'generic', 'unknown-source']) {
    const original = originalImporter.resolveColumnMap(HEADERS_SAGE, source, undefined);
    const generic = genericEngine.resolveColumnMap(HEADERS_SAGE, source, undefined, spec);
    deepEqualIgnoringOrder(generic, original);
  }
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
