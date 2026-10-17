'use strict';

/**
 * Construction BPO: job-data import from a GC's accounting export.
 *
 * Takes a parsed spreadsheet (array of header strings + array of row
 * arrays -- see parseWorkbookBuffer for how a real .csv/.xlsx file gets
 * there) and normalizes it into the job shape server/construction-bpo/wip.js
 * expects: { jobId, jobName, costsToDate, totalEstimatedCost, contractValue,
 * billedToDate, originalBudget?, physicalPercentComplete? }.
 *
 * Column names vary by source accounting system and, within a system, by
 * client (a GC's own export template often renames a column). Resolution
 * order per canonical field: the client's own column-map override (if it
 * names a header present in this file) first, then the source system's
 * built-in aliases, in listed order. A header match is case/whitespace
 * insensitive but otherwise exact -- no fuzzy matching, so a renamed
 * column that isn't in the override or alias list is reported missing
 * rather than silently guessed at.
 *
 * Never guesses a missing or unparseable number: a cell that doesn't parse
 * becomes null on the row (with a validation error naming the field), the
 * same "incomplete, not fabricated" rule wip.js itself follows downstream.
 */

const XLSX = require('xlsx');

// Canonical fields, in the order wip.js documents them. jobId is the only
// one required for a row to be imported at all; every other field is
// optional per-row (missing ones just leave wip.js's own INCOMPLETE_DATA
// path to flag them) -- this module validates presence/parseability, it
// does not enforce business-required fields.
const CANONICAL_FIELDS = [
  'jobId', 'jobName', 'costsToDate', 'totalEstimatedCost', 'contractValue',
  'billedToDate', 'originalBudget', 'physicalPercentComplete',
];
const NUMERIC_FIELDS = new Set([
  'costsToDate', 'totalEstimatedCost', 'contractValue', 'billedToDate',
  'originalBudget', 'physicalPercentComplete',
]);

// Built-in header aliases for the accounting systems this service has
// client exports from today. Each maps a canonical field to the header
// text(s) seen in real exports from that system, most-common first.
const SOURCE_ALIASES = {
  sage: {
    jobId: ['Job Number', 'Job'],
    jobName: ['Job Description', 'Job Name'],
    costsToDate: ['Costs to Date', 'Total Cost'],
    totalEstimatedCost: ['Est Cost at Completion', 'Estimated Cost at Completion', 'Estimated Cost'],
    contractValue: ['Contract Amount', 'Revised Contract'],
    billedToDate: ['Billed to Date', 'Total Billed'],
    originalBudget: ['Original Budget'],
    physicalPercentComplete: ['% Complete', 'Percent Complete'],
  },
  foundation: {
    jobId: ['Job #', 'Job Number'],
    jobName: ['Job Name'],
    costsToDate: ['Actual Cost', 'Cost to Date'],
    totalEstimatedCost: ['Estimated Final Cost', 'Est Final Cost'],
    contractValue: ['Contract Value', 'Contract Amount'],
    billedToDate: ['Amount Billed', 'Total Billed to Date'],
    originalBudget: ['Original Contract'],
    physicalPercentComplete: ['Pct Complete', 'Percent Complete'],
  },
  procore: {
    jobId: ['Project Number', 'Project #'],
    jobName: ['Project Name'],
    costsToDate: ['Costs To Date', 'Actual Costs'],
    totalEstimatedCost: ['Projected Cost', 'Estimated At Completion', 'Estimate at Completion'],
    contractValue: ['Contract Sum', 'Revised Contract Sum'],
    billedToDate: ['Amount Invoiced', 'Total Invoiced'],
    originalBudget: ['Original Contract Sum'],
    physicalPercentComplete: ['% Complete', 'Percent Complete'],
  },
  // QuickBooks' "Job Estimates vs. Actuals" report is the usual source --
  // Est Cost/Est Revenue (the estimate) vs Act Cost/Act Revenue (actuals),
  // not purpose-built billing or WIP fields. physicalPercentComplete has
  // no QuickBooks alias on purpose: that's a PM/field-reported concept
  // QuickBooks itself has no column for, so it stays "not provided" unless
  // the client's own column map supplies one.
  quickbooks: {
    jobId: ['Job', 'Customer:Job'],
    jobName: ['Description'],
    costsToDate: ['Act. Cost', 'Act Cost', 'Actual Cost'],
    totalEstimatedCost: ['Est. Cost', 'Est Cost', 'Estimated Cost'],
    contractValue: ['Est. Revenue', 'Est Revenue', 'Estimated Revenue'],
    billedToDate: ['Act. Revenue', 'Act Revenue', 'Actual Revenue'],
    originalBudget: ['Original Estimate'],
  },
  // No source given, or a source this module doesn't special-case: only
  // the client's column map (and exact canonical field names themselves,
  // as a last resort) resolve headers.
  generic: {},
};

function normalizeHeader(h) {
  return String(h == null ? '' : h).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * resolveColumnMap(headers, source, clientColumnMap?) ->
 *   { map: { canonicalField: originalHeaderOrNull }, unmatchedFields: [...] }
 *
 * clientColumnMap: optional { canonicalField: headerNameInThisFile }
 * override, checked before the source's built-in aliases.
 */
function resolveColumnMap(headers, source, clientColumnMap) {
  const bySource = SOURCE_ALIASES[source] || {};
  const normalizedHeaders = new Map(headers.map((h) => [normalizeHeader(h), h]));
  const map = {};
  const unmatchedFields = [];

  for (const field of CANONICAL_FIELDS) {
    const candidates = [];
    if (clientColumnMap && clientColumnMap[field]) candidates.push(clientColumnMap[field]);
    candidates.push(...(bySource[field] || []));
    candidates.push(field); // last resort: the canonical name itself, verbatim

    let matched = null;
    for (const candidate of candidates) {
      const hit = normalizedHeaders.get(normalizeHeader(candidate));
      if (hit !== undefined) { matched = hit; break; }
    }
    map[field] = matched;
    if (!matched && field !== 'jobId') unmatchedFields.push(field);
    if (!matched && field === 'jobId') unmatchedFields.push(field);
  }
  return { map, unmatchedFields };
}

function parseNumericCell(raw) {
  if (raw === undefined || raw === null || raw === '') return { value: null, error: false };
  if (typeof raw === 'number') return Number.isFinite(raw) ? { value: raw, error: false } : { value: null, error: true };
  const cleaned = String(raw).trim().replace(/[$,%\s]/g, '');
  if (cleaned === '') return { value: null, error: false };
  const n = Number(cleaned);
  return Number.isFinite(n) ? { value: n, error: false } : { value: null, error: true };
}

/**
 * parseRows(headers, rows, opts) -> { jobs: [...], report: {...} }
 *
 * opts: { source?: 'sage'|'foundation'|'procore'|'quickbooks'|'generic',
 *         columnMap?: { canonicalField: headerName } }
 *
 * report: { totalRows, importedRows, skippedRows, columnMap, unmatchedFields,
 *           errors: [{ row, field, message }], warnings: [{ row, field, message }] }
 * `row` is 1-based and counts only data rows (header excluded), matching
 * what a reviewer sees as "row N" in the original spreadsheet.
 */
function parseRows(headers, rows, opts = {}) {
  const source = SOURCE_ALIASES[opts.source] ? opts.source : 'generic';
  const { map, unmatchedFields } = resolveColumnMap(headers, source, opts.columnMap);
  const colIndex = {};
  for (const field of CANONICAL_FIELDS) {
    colIndex[field] = map[field] == null ? -1 : headers.indexOf(map[field]);
  }

  const errors = [];
  const warnings = [];
  const jobs = [];
  const seenJobIds = new Set();

  if (colIndex.jobId === -1) {
    errors.push({ row: 0, field: 'jobId', message: 'no jobId column found in this file (checked client column map, ' + source + ' aliases, and the literal header "jobId")' });
    return {
      jobs: [],
      report: { totalRows: rows.length, importedRows: 0, skippedRows: rows.length, columnMap: map, unmatchedFields, errors, warnings },
    };
  }

  rows.forEach((cells, i) => {
    const rowNum = i + 1;
    const rawJobId = cells[colIndex.jobId];
    const jobId = rawJobId == null ? '' : String(rawJobId).trim();
    if (!jobId) {
      errors.push({ row: rowNum, field: 'jobId', message: 'missing jobId, row skipped' });
      return;
    }
    if (seenJobIds.has(jobId)) {
      errors.push({ row: rowNum, field: 'jobId', message: 'duplicate jobId "' + jobId + '" (first occurrence kept), row skipped' });
      return;
    }
    seenJobIds.add(jobId);

    const job = { jobId };
    for (const field of CANONICAL_FIELDS) {
      if (field === 'jobId') continue;
      const idx = colIndex[field];
      const raw = idx === -1 ? undefined : cells[idx];
      if (field === 'jobName') {
        job.jobName = raw == null || raw === '' ? null : String(raw).trim();
        continue;
      }
      if (!NUMERIC_FIELDS.has(field)) continue;
      const { value, error } = parseNumericCell(raw);
      job[field] = value;
      if (error) errors.push({ row: rowNum, field, message: 'could not parse "' + raw + '" as a number' });
    }
    jobs.push(job);
  });

  return {
    jobs,
    report: {
      totalRows: rows.length,
      importedRows: jobs.length,
      skippedRows: rows.length - jobs.length,
      columnMap: map,
      unmatchedFields,
      errors,
      warnings,
    },
  };
}

/**
 * parseWorkbookBuffer(buffer, opts) -> same shape as parseRows.
 * Reads the first sheet (or opts.sheetName) of a .csv or .xlsx buffer via
 * SheetJS, which auto-detects CSV vs. the zip-based XLSX format from the
 * buffer's own content -- the caller doesn't need to tell it which.
 */
function parseWorkbookBuffer(buffer, opts = {}) {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: true });
  const sheetName = opts.sheetName && workbook.SheetNames.includes(opts.sheetName)
    ? opts.sheetName
    : workbook.SheetNames[0];
  if (!sheetName) {
    return { jobs: [], report: { totalRows: 0, importedRows: 0, skippedRows: 0, columnMap: {}, unmatchedFields: CANONICAL_FIELDS.slice(), errors: [{ row: 0, field: null, message: 'workbook has no sheets' }], warnings: [] } };
  }
  const sheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: false });
  const headers = (grid[0] || []).map((h) => (h == null ? '' : String(h).trim()));
  const rows = grid.slice(1);
  return parseRows(headers, rows, opts);
}

module.exports = {
  CANONICAL_FIELDS,
  SOURCE_ALIASES,
  resolveColumnMap,
  parseRows,
  parseWorkbookBuffer,
};
