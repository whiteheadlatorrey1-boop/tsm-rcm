'use strict';

/**
 * TSM L1 COPILOT -- SERVICENOW STATE MAPPING
 *
 * ServiceNow reports the same lifecycle position three different ways
 * depending on which table and which query options produced the record:
 *
 *   incident   sysparm_display_value omitted -> raw code   "2"
 *   sc_task    sysparm_display_value=all     -> label      "Work in Progress"
 *   sc_req_item                              -> label      "Open"
 *
 * The workflow engine and closure gate reason over ONE canonical vocabulary.
 * This module is the only place that translates into it.
 *
 * Numeric codes are table-specific ("3" is On Hold on an incident but
 * Closed Complete on an SC Task), so callers pass `table`. It defaults to
 * 'incident' because that is what every current caller evaluates. Even a
 * wrong-table guess fails safe: the ONLY canonical state that can lead to
 * closure readiness is IN PROGRESS, and code 2 means In Progress on every
 * table.
 *
 * Safety properties (covered by scripts/test-l1-state-map.js):
 *   - exact matching only, never substring ("NOT IN PROGRESS" != IN PROGRESS)
 *   - anything unrecognized is returned as cleaned text, never guessed
 *   - this module has no side effects and never touches ServiceNow
 *
 * Code tables are ServiceNow's out-of-box defaults. Customer instances can
 * customize state choices; per-customer overrides belong in config
 * (see `overrides` below), not in code.
 */

const INCIDENT_CODES = Object.freeze({
  '1': 'NEW',
  '2': 'IN PROGRESS',
  '3': 'ON HOLD',
  '6': 'RESOLVED',
  '7': 'CLOSED',
  '8': 'CANCELED'
});

// sc_task and sc_req_item share the same out-of-box choice list.
const CATALOG_CODES = Object.freeze({
  '-5': 'PENDING',
  '1': 'OPEN',
  '2': 'IN PROGRESS',
  '3': 'CLOSED', // Closed Complete
  '4': 'CLOSED', // Closed Incomplete
  '7': 'CLOSED'  // Closed Skipped
});

const CODES_BY_TABLE = Object.freeze({
  incident: INCIDENT_CODES,
  sc_task: CATALOG_CODES,
  sc_req_item: CATALOG_CODES
});

// Display labels (after cleaning) -> canonical state.
const LABELS = Object.freeze({
  'NEW': 'NEW',
  'OPEN': 'OPEN',
  'IN PROGRESS': 'IN PROGRESS',
  'WORK IN PROGRESS': 'IN PROGRESS',
  'PENDING': 'PENDING',
  'ON HOLD': 'ON HOLD',
  'RESOLVED': 'RESOLVED',
  'CLOSED': 'CLOSED',
  'CLOSED COMPLETE': 'CLOSED',
  'CLOSED INCOMPLETE': 'CLOSED',
  'CLOSED SKIPPED': 'CLOSED',
  'CANCELED': 'CANCELED',
  'CANCELLED': 'CANCELED'
});

function cleanText(value) {
  return String(value == null ? '' : value)
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * resolveState(raw, { table?, overrides? }) ->
 *   { state, recognized, source, raw }
 *
 * source: 'code' | 'label' | 'unknown'
 * `overrides` is an optional { [code]: canonicalState } map for instances
 * that customized their state choices.
 */
function resolveState(raw, options = {}) {
  const table = options.table && CODES_BY_TABLE[options.table]
    ? options.table
    : 'incident';
  const text = cleanText(raw);

  // Numeric code. Checked on the trimmed original so "-5" survives cleanText's
  // hyphen normalization.
  const trimmed = String(raw == null ? '' : raw).trim();
  if (/^-?\d+$/.test(trimmed)) {
    const overridden = options.overrides && options.overrides[trimmed];
    const mapped = overridden || CODES_BY_TABLE[table][trimmed];
    if (mapped) {
      return { state: mapped, recognized: true, source: 'code', raw };
    }
    return { state: trimmed, recognized: false, source: 'unknown', raw };
  }

  if (Object.prototype.hasOwnProperty.call(LABELS, text)) {
    return { state: LABELS[text], recognized: true, source: 'label', raw };
  }

  return { state: text, recognized: false, source: 'unknown', raw };
}

function normalizeState(raw, options) {
  return resolveState(raw, options).state;
}

module.exports = {
  INCIDENT_CODES,
  CATALOG_CODES,
  resolveState,
  normalizeState
};
