'use strict';

/**
 * Generic column-alias CSV/XLSX import engine, generalized from
 * server/construction-bpo/import.js's resolveColumnMap/parseRows/
 * parseWorkbookBuffer: same resolution order (client columnMap override,
 * then the source's built-in aliases, then the canonical field name
 * itself verbatim) and the same "never guess" rule for a missing/
 * unparseable cell -- but parameterized by a per-file-type `spec` object
 * instead of a single hardcoded set of module-level constants, so every
 * plug-in's fileTypes entries can each define their own canonical
 * fields/aliases/required field.
 *
 * spec: {
 *   canonicalFields: [...],           // in header order, output-row order
 *   numericFields?: [...],            // subset of canonicalFields parsed as numbers
 *   stringFields?: [...],             // subset parsed as trimmed strings (null if blank)
 *   requiredField: 'jobId',           // the one field a row must have to be imported at all
 *   sourceAliases?: { [source]: { [canonicalField]: [headerAlias,...] } },
 *   allowDuplicateIds?: boolean,      // default false (construction-bpo's one row per jobId); set true for a
 *                                     // file type where requiredField legitimately repeats across rows, e.g. a
 *                                     // mortgage-title doc checklist export with one row per (fileId, docType)
 * }
 *
 * construction-bpo's own import.js is untouched and keeps serving
 * /api/construction-bpo/import exactly as before --
 * scripts/test-bpo-service-import-engine-equivalence.js proves this
 * generic engine, given construction-bpo's own field/alias spec,
 * produces byte-identical output to the original for the same input.
 */

const XLSX = require('xlsx');

function normalizeHeader(h) {
  return String(h == null ? '' : h).trim().toLowerCase().replace(/\s+/g, ' ');
}

/** resolveColumnMap(headers, source, clientColumnMap, spec) -> { map, unmatchedFields } */
function resolveColumnMap(headers, source, clientColumnMap, spec) {
  const bySource = (spec.sourceAliases && spec.sourceAliases[source]) || {};
  const normalizedHeaders = new Map(headers.map((h) => [normalizeHeader(h), h]));
  const map = {};
  const unmatchedFields = [];

  for (const field of spec.canonicalFields) {
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
    if (!matched) unmatchedFields.push(field);
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
 * parseRows(headers, rows, opts, spec) -> { items: [...], report: {...} }
 * opts: { source?, columnMap? }. `row` in errors/warnings is 1-based,
 * data rows only (header excluded).
 */
function parseRows(headers, rows, opts, spec) {
  const source = (spec.sourceAliases && spec.sourceAliases[opts.source]) ? opts.source : 'generic';
  const { map, unmatchedFields } = resolveColumnMap(headers, source, opts.columnMap, spec);
  const colIndex = {};
  for (const field of spec.canonicalFields) {
    colIndex[field] = map[field] == null ? -1 : headers.indexOf(map[field]);
  }

  const requiredField = spec.requiredField;
  const errors = [];
  const warnings = [];
  const items = [];
  const seenIds = new Set();

  if (colIndex[requiredField] === -1) {
    errors.push({ row: 0, field: requiredField, message: 'no ' + requiredField + ' column found in this file (checked client column map, ' + source + ' aliases, and the literal header "' + requiredField + '")' });
    return {
      items: [],
      report: { totalRows: rows.length, importedRows: 0, skippedRows: rows.length, columnMap: map, unmatchedFields, errors, warnings },
    };
  }

  const numericFields = new Set(spec.numericFields || []);
  const stringFields = new Set(spec.stringFields || []);

  rows.forEach((cells, i) => {
    const rowNum = i + 1;
    const rawId = cells[colIndex[requiredField]];
    const id = rawId == null ? '' : String(rawId).trim();
    if (!id) {
      errors.push({ row: rowNum, field: requiredField, message: 'missing ' + requiredField + ', row skipped' });
      return;
    }
    if (!spec.allowDuplicateIds && seenIds.has(id)) {
      errors.push({ row: rowNum, field: requiredField, message: 'duplicate ' + requiredField + ' "' + id + '" (first occurrence kept), row skipped' });
      return;
    }
    seenIds.add(id);

    const item = { [requiredField]: id };
    for (const field of spec.canonicalFields) {
      if (field === requiredField) continue;
      const idx = colIndex[field];
      const raw = idx === -1 ? undefined : cells[idx];
      if (stringFields.has(field)) {
        item[field] = raw == null || raw === '' ? null : String(raw).trim();
        continue;
      }
      if (!numericFields.has(field)) continue;
      const { value, error } = parseNumericCell(raw);
      item[field] = value;
      if (error) errors.push({ row: rowNum, field, message: 'could not parse "' + raw + '" as a number' });
    }
    items.push(item);
  });

  return {
    items,
    report: { totalRows: rows.length, importedRows: items.length, skippedRows: rows.length - items.length, columnMap: map, unmatchedFields, errors, warnings },
  };
}

/** parseWorkbookBuffer(buffer, opts, spec) -> same shape as parseRows. Reads the first sheet (or opts.sheetName) of a .csv or .xlsx buffer via SheetJS. */
function parseWorkbookBuffer(buffer, opts, spec) {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: true });
  const sheetName = opts.sheetName && workbook.SheetNames.includes(opts.sheetName)
    ? opts.sheetName
    : workbook.SheetNames[0];
  if (!sheetName) {
    return { items: [], report: { totalRows: 0, importedRows: 0, skippedRows: 0, columnMap: {}, unmatchedFields: spec.canonicalFields.slice(), errors: [{ row: 0, field: null, message: 'workbook has no sheets' }], warnings: [] } };
  }
  const sheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: false });
  const headers = (grid[0] || []).map((h) => (h == null ? '' : String(h).trim()));
  const rows = grid.slice(1);
  return parseRows(headers, rows, opts, spec);
}

module.exports = { resolveColumnMap, parseRows, parseWorkbookBuffer };
