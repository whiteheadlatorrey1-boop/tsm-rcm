'use strict';

/**
 * Mortgage/Title BPO-service plug-in: wraps
 * server/bpo-mortgage-title/file-exceptions.js (the engine) the same way
 * plugins/construction-bpo.js wraps the construction engines.
 *
 * Input shape (see weekly-reports POST body): { clientId, weekEnding,
 * asOf?, files, checklist, exceptions }. `files` names which fileIds to
 * track and (optionally) their closingDate -- a fileId mentioned only in
 * `checklist` or `exceptions` is still tracked (joined by fileId), it
 * just starts with no closingDate (INCOMPLETE_DATA) unless `files`
 * supplies one.
 *
 * One importable file type ("checklist") -- the doc-checklist export,
 * which has one row per (fileId, docType) and so needs
 * allowDuplicateIds: true (a fileId legitimately repeats across rows).
 * Title-commitment exceptions and the closing-date list are manual-entry
 * only in the workbench, same precedent as construction-bpo's change
 * orders/retainage/lien-waivers (only the GC's accounting export gets
 * real CSV import there too).
 */

const { computeFileSchedule, REQUIRED_DOC_TYPES } = require('../../bpo-mortgage-title/file-exceptions');

function computeFlags(input, thresholds = {}) {
  const asOf = input.asOf || new Date().toISOString();

  const closingDateByFileId = new Map();
  for (const row of input.files || []) {
    if (row && row.fileId) closingDateByFileId.set(row.fileId, row.closingDate || null);
  }

  const checklistByFileId = new Map();
  for (const row of input.checklist || []) {
    if (!row || !row.fileId) continue;
    if (!checklistByFileId.has(row.fileId)) checklistByFileId.set(row.fileId, []);
    checklistByFileId.get(row.fileId).push(row);
  }

  const exceptionsByFileId = new Map();
  for (const row of input.exceptions || []) {
    if (!row || !row.fileId) continue;
    if (!exceptionsByFileId.has(row.fileId)) exceptionsByFileId.set(row.fileId, []);
    exceptionsByFileId.get(row.fileId).push(row);
  }

  // A file is tracked if it's named ANYWHERE (files list, checklist, or exceptions) -- joined by fileId.
  const allFileIds = new Set([...closingDateByFileId.keys(), ...checklistByFileId.keys(), ...exceptionsByFileId.keys()]);

  const files = computeFileSchedule(
    [...allFileIds].map((fileId) => ({
      fileId,
      closingDate: closingDateByFileId.has(fileId) ? closingDateByFileId.get(fileId) : null,
      checklist: checklistByFileId.get(fileId) || [],
      exceptions: exceptionsByFileId.get(fileId) || [],
    })),
    thresholds,
    { asOf }
  );

  const flags = files.flatMap((f) => f.flags);

  const summary = [
    { key: 'fileCount', label: 'Files', value: files.length },
    { key: 'filesWithFlags', label: 'Files w/ Flags', value: new Set(flags.map((f) => f.fileId).filter(Boolean)).size },
    { key: 'missingDocs', label: 'Missing Docs', value: flags.filter((f) => f.type === 'MISSING_DOC').length },
    { key: 'expiredDocs', label: 'Expired Docs', value: flags.filter((f) => f.type === 'EXPIRED_DOC').length },
    { key: 'unclearedExceptions', label: 'Uncleared Exceptions', value: flags.filter((f) => f.type === 'UNCLEARED_EXCEPTION').length },
    { key: 'closingsAtRisk', label: 'Closings At Risk', value: flags.filter((f) => f.type === 'CLOSING_AT_RISK').length },
  ];

  return { sections: { files }, flags, summary };
}

const FILE_TYPES = [
  {
    key: 'checklist',
    canonicalFields: ['fileId', 'docType', 'receivedDate', 'status', 'expirationDate'],
    stringFields: ['docType', 'receivedDate', 'status', 'expirationDate'],
    requiredField: 'fileId',
    allowDuplicateIds: true, // one row per (fileId, docType) -- fileId legitimately repeats
    sourceAliases: {
      generic: {
        fileId: ['Loan Number', 'Loan #', 'Order Number', 'Order #', 'File Number'],
        docType: ['Document Type', 'Doc Type'],
        receivedDate: ['Received Date', 'Date Received'],
        status: ['Status', 'Doc Status'],
        expirationDate: ['Expiration Date', 'Expires', 'Valid Through'],
      },
    },
  },
];

module.exports = {
  id: 'mortgage-title',
  fileTypes: FILE_TYPES,
  reportSections: ['files'],
  computeFlags,
  REQUIRED_DOC_TYPES, // not part of the plug-in interface, but handy for the workbench/fixtures to reference without reaching into server/bpo-mortgage-title directly
};
