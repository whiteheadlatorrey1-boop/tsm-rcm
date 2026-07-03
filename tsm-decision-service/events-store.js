// events-store.js
// Minimal JSON-file-backed event log so this module runs standalone.
// If TSM already has a real event table/collection, replace the four
// functions below with calls into that — nothing else in this service
// needs to change.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, '[]');
}

function loadAll() {
  ensureStore();
  return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
}

function saveAll(events) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

/**
 * Append a new event to the log. Returns the stored event (with id).
 */
function appendEvent(event) {
  const events = loadAll();
  const stored = {
    id: event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: event.type,
    domain: event.domain,
    entity_id: event.entity_id,
    timestamp: event.timestamp || new Date().toISOString(),
    payload: event.payload || {},
    source: event.source || 'system'
  };
  events.push(stored);
  saveAll(events);
  return stored;
}

/**
 * Query events by arbitrary filter fields. Always excludes the triggering
 * event itself if `excludeId` is passed, and always applies a lookback
 * window in days if `withinDays` is passed.
 */
function queryEvents({ type, domain, entity_id, payloadMatch, withinDays, referenceTimestamp, excludeId } = {}) {
  const events = loadAll();
  const refTime = referenceTimestamp ? new Date(referenceTimestamp) : new Date();

  return events.filter(e => {
    if (excludeId && e.id === excludeId) return false;
    if (type && e.type !== type) return false;
    if (domain && e.domain !== domain) return false;
    if (entity_id && e.entity_id !== entity_id) return false;

    if (withinDays) {
      const days = Math.abs(refTime - new Date(e.timestamp)) / (1000 * 60 * 60 * 24);
      if (days > withinDays) return false;
    }

    if (payloadMatch) {
      for (const [key, value] of Object.entries(payloadMatch)) {
        if (e.payload[key] !== value) return false;
      }
    }

    return true;
  });
}

function getEventsByIds(ids) {
  const events = loadAll();
  return events.filter(e => ids.includes(e.id));
}

module.exports = { appendEvent, queryEvents, getEventsByIds };
