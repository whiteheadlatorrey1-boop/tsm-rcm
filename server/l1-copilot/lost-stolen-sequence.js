'use strict';

/**
 * TSM L1 - LOST/STOLEN SEQUENCE (pure)
 *
 * Reads the incident's existing work-note text and decides which lost/stolen
 * stages were already recorded for a given asset, so a later stage cannot be
 * written (or claimed at closure) before the earlier ones.
 *
 *   REPORT -> ESCALATION -> SECURITY_ACTION -> RECONCILED
 *
 * Mirrors disposition-sequence.js. Fail-closed: no readable notes means no
 * stages are considered recorded. No network, no writes.
 */

const STAGE_ORDER = Object.freeze([
  'LOST_STOLEN_REPORT',
  'LOST_STOLEN_ESCALATION',
  'LOST_STOLEN_SECURITY_ACTION',
  'LOST_STOLEN_RECONCILED'
]);

// Matches the tag the execute route writes: "[ASSET LIFECYCLE — <ACTION>]"
const TAG_RE = /\[ASSET LIFECYCLE\s+[\u2014-]\s+(LOST_STOLEN_[A-Z_]+)\]/g;

function isLostStolenAction(actionType) {
  return STAGE_ORDER.includes(actionType);
}

function normTag(v) {
  return String(v || '').trim().toUpperCase();
}

/** -> Set of stage ids recorded for assetTag in the given notes text. */
function recordedStages(assetTag, notesText) {
  const found = new Set();
  const tag = normTag(assetTag);
  const text = typeof notesText === 'string' ? notesText : '';
  if (!tag || !text) return found;

  const marks = [];
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(text)) !== null) marks.push({ stage: m[1], start: m.index, end: TAG_RE.lastIndex });

  marks.forEach((mark, i) => {
    const block = text.slice(mark.end, i + 1 < marks.length ? marks[i + 1].start : text.length);
    const line = block.match(/^\s*Asset Tag:\s*(.+?)\s*$/im);
    if (line && normTag(line[1]) === tag) found.add(mark.stage);
  });
  return found;
}

/** Stages that must already exist before `actionType` may be recorded. */
function requiredPriorStages(actionType) {
  const idx = STAGE_ORDER.indexOf(actionType);
  return idx <= 0 ? [] : STAGE_ORDER.slice(0, idx);
}

function checkPrerequisites(actionType, assetTag, notesText) {
  if (!isLostStolenAction(actionType)) return { allowed: true, missing: [] };
  const have = recordedStages(assetTag, notesText);
  const missing = requiredPriorStages(actionType).filter(s => !have.has(s));
  return { allowed: missing.length === 0, missing };
}

/** Evidence flags provable from recorded notes (never from the client). */
function deriveLostStolenEvidence(assetTag, notesText) {
  const have = recordedStages(assetTag, notesText);
  return {
    securityEscalation: have.has('LOST_STOLEN_ESCALATION'),
    securityActionVerified: have.has('LOST_STOLEN_SECURITY_ACTION'),
    assetReconciled: have.has('LOST_STOLEN_RECONCILED')
  };
}

/** Pull the work-notes text out of a normalized getTicket() result. */
function extractNotesText(ticket) {
  const raw = ticket && ticket.raw && ticket.raw.work_notes;
  if (raw == null) return '';
  if (typeof raw === 'object') return String(raw.display_value ?? raw.value ?? '');
  return String(raw);
}

module.exports = {
  STAGE_ORDER,
  isLostStolenAction,
  recordedStages,
  requiredPriorStages,
  checkPrerequisites,
  deriveLostStolenEvidence,
  extractNotesText
};
