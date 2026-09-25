'use strict';

/**
 * L1 Copilot Handoff Store
 *
 * Durable internal handoff records for technician-confirmed
 * L1 -> Tier 2 / Cloud Ops escalation.
 *
 * This module:
 *   - has no ServiceNow dependency
 *   - has no AI dependency
 *   - has no Express dependency
 *   - does not establish authorization
 *   - persists only after an executed Action Gate action
 *
 * Production:
 *   /app/data/l1-copilot-handoffs.json
 *
 * Local development:
 *   ./data/l1-copilot-handoffs.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = fs.existsSync('/app/data')
  ? '/app/data'
  : path.join(__dirname, '..', '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const HANDOFF_FILE = path.join(
  DATA_DIR,
  'l1-copilot-handoffs.json'
);

const MAX_HANDOFFS = 1000;

function emptyStore() {
  return {
    handoffs: []
  };
}

function loadStore() {
  try {
    if (!fs.existsSync(HANDOFF_FILE)) {
      return emptyStore();
    }

    const parsed = JSON.parse(
      fs.readFileSync(HANDOFF_FILE, 'utf8')
    );

    return {
      handoffs: Array.isArray(parsed.handoffs)
        ? parsed.handoffs
        : []
    };
  } catch (err) {
    console.error(
      '[l1-handoff-store] load failed, starting empty:',
      err.message
    );

    return emptyStore();
  }
}

const STORE = loadStore();

function saveStore() {
  const snapshot = JSON.stringify(STORE, null, 2);
  const tempFile = `${HANDOFF_FILE}.tmp`;

  fs.writeFileSync(tempFile, snapshot, 'utf8');
  fs.renameSync(tempFile, HANDOFF_FILE);
}

function normalizeString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function createHandoff(input = {}) {
  const {
    action,
    references,
    destinationTeam,
    workPerformed,
    validation,
    blocker,
    requestedTier2Action,
    sourceIncident,
    technician
  } = input;

  /*
   * The store accepts only an already-executed Action Gate action.
   * It does NOT perform authorization itself.
   */
  if (!action || action.state !== 'EXECUTED') {
    const err = new Error(
      'createHandoff requires an executed Action Gate action.'
    );

    err.code = 'HANDOFF_REQUIRES_EXECUTED_ACTION';

    throw err;
  }

  if (!technician || !technician.id) {
    const err = new Error(
      'createHandoff requires technician identity.'
    );

    err.code = 'MISSING_TECHNICIAN';

    throw err;
  }

  const team = normalizeString(destinationTeam);

  if (!team) {
    const err = new Error(
      'createHandoff requires destinationTeam.'
    );

    err.code = 'MISSING_DESTINATION_TEAM';

    throw err;
  }

  const incident = normalizeString(sourceIncident);

  if (!incident) {
    const err = new Error(
      'createHandoff requires sourceIncident.'
    );

    err.code = 'MISSING_SOURCE_INCIDENT';

    throw err;
  }

  const handoff = {
    id:
      `L1H-${Date.now()}-` +
      Math.random().toString(36).slice(2, 8),

    type: 'L1_TIER2_HANDOFF',
    status: 'COMMITTED',

    sourceIncident: incident,
    destinationTeam: team,

    references: references || null,

    workPerformed:
      normalizeString(workPerformed),

    validation:
      normalizeString(validation),

    blocker:
      normalizeString(blocker),

    requestedTier2Action:
      normalizeString(requestedTier2Action),

    technician: {
      id: technician.id,
      label: technician.label || null
    },

    technicianConfirmed: true,

    action: {
      actionType: action.actionType,
      state: action.state,
      confirmedAt: action.confirmedAt || null,
      executedAt: action.executedAt || null
    },

    /*
     * Explicit governance markers.
     *
     * A handoff is NOT a ticket closure.
     * A handoff does NOT change ServiceNow state.
     */
    ticketClosureRequested: false,
    ticketStateChanged: false,

    createdAt: new Date().toISOString()
  };

  STORE.handoffs.push(handoff);

  if (STORE.handoffs.length > MAX_HANDOFFS) {
    STORE.handoffs.splice(
      0,
      STORE.handoffs.length - MAX_HANDOFFS
    );
  }

  saveStore();

  return handoff;
}

function getHandoff(id) {
  const normalizedId = normalizeString(id);

  if (!normalizedId) {
    return null;
  }

  return (
    STORE.handoffs.find(
      handoff => handoff.id === normalizedId
    ) || null
  );
}

function listHandoffs(options = {}) {
  const limitRaw = Number(options.limit);

  const limit = Number.isFinite(limitRaw)
    ? Math.max(
        1,
        Math.min(
          Math.floor(limitRaw),
          MAX_HANDOFFS
        )
      )
    : 100;

  const incident =
    normalizeString(options.incident);

  const destinationTeam =
    normalizeString(options.destinationTeam);

  let results = STORE.handoffs.slice();

  if (incident) {
    results = results.filter(
      handoff =>
        handoff.sourceIncident === incident
    );
  }

  if (destinationTeam) {
    results = results.filter(
      handoff =>
        handoff.destinationTeam === destinationTeam
    );
  }

  return results
    .sort((a, b) =>
      String(b.createdAt).localeCompare(
        String(a.createdAt)
      )
    )
    .slice(0, limit);
}

function countHandoffs() {
  return STORE.handoffs.length;
}

module.exports = {
  DATA_DIR,
  HANDOFF_FILE,
  MAX_HANDOFFS,
  createHandoff,
  getHandoff,
  listHandoffs,
  countHandoffs
};
