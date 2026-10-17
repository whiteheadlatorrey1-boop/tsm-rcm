'use strict';

/**
 * BPO Mortgage/Title: per-file document-checklist and title-exception
 * tracking for an escrow/title file approaching closing.
 *
 * A "file" (one loan/order) is evaluated against three inputs, joined by
 * fileId:
 *   - checklist: rows of { fileId, docType, receivedDate?, status:
 *     'received'|'pending'|'waived', expirationDate? } -- one row per
 *     required doc type per file. A docType with no row at all for a
 *     file counts the same as a 'pending' row: not received.
 *   - exceptions: rows of { fileId, exceptionNumber?, description?,
 *     status: 'open'|'cleared' } -- title commitment exceptions.
 *   - closingDates: rows of { fileId, closingDate } -- the one place a
 *     file's closing date comes from. A file with no entry here gets
 *     INCOMPLETE_DATA and every closing-proximity check below simply
 *     cannot run for it (never guessed).
 *
 * Flags:
 *   MISSING_DOC   -- a required doc type isn't 'received' (or 'waived')
 *                    for this file, AND closing is within
 *                    thresholds.missingDocDays (calendar days, default
 *                    10) -- including already past closing (still
 *                    missing is still a problem, arguably a bigger one).
 *   EXPIRED_DOC   -- a 'received' doc carries an expirationDate that has
 *                    already passed as of `asOf`. Fires regardless of
 *                    how far away closing is -- an expired payoff/
 *                    insurance/ID is a real problem the moment it
 *                    expires, not only once closing is near.
 *   UNCLEARED_EXCEPTION -- an 'open' title exception, AND closing is
 *                    within thresholds.uncleaedExceptionDays (calendar
 *                    days, default 10).
 *   CLOSING_AT_RISK -- any of the three above is present on this file
 *                    AND closing is within
 *                    thresholds.closingAtRiskBusinessDays BUSINESS days
 *                    (Mon-Fri, default 5) and has not yet passed. A file
 *                    whose closing has already passed does not get this
 *                    flag (it's too late for "at risk" to mean
 *                    anything) even though it may still carry the
 *                    underlying MISSING_DOC/EXPIRED_DOC/
 *                    UNCLEARED_EXCEPTION flag.
 *   INCOMPLETE_DATA -- no closingDate on file for this fileId.
 *
 * Never guesses: a file with no closingDate gets every closing-
 * proximity check skipped, not a fabricated "assume urgent" default.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const REQUIRED_DOC_TYPES = ['Purchase Agreement', 'Payoff Statement', 'Hazard Insurance Binder', 'Government ID', 'Survey'];

const DEFAULT_THRESHOLDS = {
  missingDocDays: 10,
  uncleaedExceptionDays: 10,
  closingAtRiskBusinessDays: 5,
};

function parseDate(v) {
  if (v === undefined || v === null || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** calendarDaysUntil(fromISODate, toISODate) -> integer (can be negative if `to` is before `from`). Pure date-only math, no time-of-day. */
function calendarDaysUntil(fromISODate, toISODate) {
  const from = parseDate(fromISODate);
  const to = parseDate(toISODate);
  if (!from || !to) return null;
  const fromUTC = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toUTC = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((toUTC - fromUTC) / MS_PER_DAY);
}

/**
 * businessDaysUntil(fromISODate, toISODate) -> integer, counting only
 * Mon-Fri days strictly after `from` through `to` inclusive (0 if
 * `to`===`from`); negative if `to` is before `from` (counting backward
 * the same way).
 */
function businessDaysUntil(fromISODate, toISODate) {
  const from = parseDate(fromISODate);
  const to = parseDate(toISODate);
  if (!from || !to) return null;
  const fromUTC = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toUTC = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  if (toUTC === fromUTC) return 0;
  const sign = toUTC > fromUTC ? 1 : -1;
  let count = 0;
  let cur = fromUTC;
  while (cur !== toUTC) {
    cur += sign * MS_PER_DAY;
    const dow = new Date(cur).getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count * sign;
}

/**
 * computeFileStatus(file, thresholds?, opts?) -> {
 *   fileId, closingDate, daysToClosing, businessDaysToClosing,
 *   checklist, exceptions, flags: [...]
 * }
 *
 * file: { fileId, closingDate (string|null), checklist: [...rows for
 *         this fileId...], exceptions: [...rows for this fileId...] }
 * opts: { asOf?: Date|string (default: now) }
 */
function computeFileStatus(file, thresholds, opts = {}) {
  if (!file || typeof file !== 'object') throw new Error('file must be an object');
  if (typeof file.fileId !== 'string' || !file.fileId.trim()) throw new Error('file.fileId is required');

  const t = { ...DEFAULT_THRESHOLDS, ...(thresholds || {}) };
  const asOf = parseDate(opts.asOf) || new Date();
  const asOfISO = asOf.toISOString().slice(0, 10);
  const flags = [];

  const closingDate = typeof file.closingDate === 'string' && file.closingDate.trim() ? file.closingDate : null;
  if (!closingDate) {
    flags.push({ type: 'INCOMPLETE_DATA', fileId: file.fileId, missingFields: ['closingDate'] });
  }

  const daysToClosing = closingDate ? calendarDaysUntil(asOfISO, closingDate) : null;
  const businessDaysToClosing = closingDate ? businessDaysUntil(asOfISO, closingDate) : null;

  const checklist = file.checklist || [];
  const exceptions = file.exceptions || [];

  // MISSING_DOC: a required doc type with no 'received'/'waived' row, once within the closing window.
  if (daysToClosing !== null && daysToClosing <= t.missingDocDays) {
    const satisfiedTypes = new Set(checklist.filter((c) => c.status === 'received' || c.status === 'waived').map((c) => c.docType));
    for (const docType of REQUIRED_DOC_TYPES) {
      if (!satisfiedTypes.has(docType)) {
        flags.push({ type: 'MISSING_DOC', fileId: file.fileId, docType, daysToClosing });
      }
    }
  }

  // EXPIRED_DOC: a received doc whose expirationDate has already passed -- no closing-proximity gate.
  for (const row of checklist) {
    if (row.status === 'received' && row.expirationDate) {
      const exp = parseDate(row.expirationDate);
      if (exp && exp.getTime() < asOf.getTime()) {
        flags.push({
          type: 'EXPIRED_DOC', fileId: file.fileId, docType: row.docType, expirationDate: row.expirationDate,
          daysExpired: Math.ceil((asOf.getTime() - exp.getTime()) / MS_PER_DAY),
        });
      }
    }
  }

  // UNCLEARED_EXCEPTION: an open exception, once within the closing window.
  if (daysToClosing !== null && daysToClosing <= t.uncleaedExceptionDays) {
    for (const exc of exceptions) {
      if (exc.status === 'open') {
        flags.push({ type: 'UNCLEARED_EXCEPTION', fileId: file.fileId, exceptionNumber: exc.exceptionNumber, description: exc.description, daysToClosing });
      }
    }
  }

  // CLOSING_AT_RISK: any of the above, AND closing is near (business days) and hasn't already passed.
  const hasUnderlyingRisk = flags.some((f) => f.type === 'MISSING_DOC' || f.type === 'EXPIRED_DOC' || f.type === 'UNCLEARED_EXCEPTION');
  if (hasUnderlyingRisk && businessDaysToClosing !== null && businessDaysToClosing >= 0 && businessDaysToClosing <= t.closingAtRiskBusinessDays) {
    flags.push({ type: 'CLOSING_AT_RISK', fileId: file.fileId, closingDate, businessDaysToClosing });
  }

  return { fileId: file.fileId, closingDate, daysToClosing, businessDaysToClosing, checklist, exceptions, flags };
}

/** computeFileSchedule(files, thresholds?, opts?) -> array of computeFileStatus results, one per file. */
function computeFileSchedule(files, thresholds, opts) {
  if (!Array.isArray(files)) throw new Error('files must be an array');
  return files.map((file) => computeFileStatus(file, thresholds, opts));
}

module.exports = { REQUIRED_DOC_TYPES, DEFAULT_THRESHOLDS, calendarDaysUntil, businessDaysUntil, computeFileStatus, computeFileSchedule };
