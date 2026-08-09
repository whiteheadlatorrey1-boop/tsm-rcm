// ═══════════════════════════════════════════════════════════════════════════
// TSM MEMORY ENGINE
// Operational continuity timeline — persists session events so any page in
// the HC chain can see a chronological trail of what happened before it.
//
// Storage key: TSM_HC_MEMORY  (localStorage only — survives tab close)
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  if (window.__TSM_MEMORY_ENGINE__) return;
  window.__TSM_MEMORY_ENGINE__ = true;

  const STORAGE_KEY = 'TSM_HC_MEMORY';
  const MAX_EVENTS  = 120;   // rolling cap — trim oldest when exceeded
  const TTL_MS      = 48 * 60 * 60 * 1000;  // 48 hr auto-expire

  // ── EVENT TYPES ───────────────────────────────────────────────────────────
  const EVENT_TYPES = {
    WAR_ROOM_ENGINE_RUN:    'war_room_engine_run',
    WAR_ROOM_RELAY:         'war_room_relay',
    APP_DISPATCH:           'app_dispatch',
    NODE_RELAY:             'node_relay',
    STRATEGIST_RELAY:       'strategist_relay',
    EXEC_PORTAL_OPEN:       'exec_portal_open',
    EXEC_FEEDBACK:          'exec_feedback',
    MISSION_COMPLETE:       'mission_complete',
    ANOMALY_DETECTED:       'anomaly_detected',
    USER_NOTE:              'user_note',
  };

  // ── READ / WRITE ──────────────────────────────────────────────────────────
  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      // expire whole store if too old
      if (data._storedAt && (Date.now() - data._storedAt) > TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return [];
      }
      return Array.isArray(data.events) ? data.events : [];
    } catch (_) { return []; }
  }

  function _save(events) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ _storedAt: Date.now(), events }));
    } catch (_) {}
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────────

  /**
   * Append an event to the timeline.
   * @param {string} type   – one of EVENT_TYPES values
   * @param {string} label  – short human label, e.g. "Engine 3 completed"
   * @param {Object} meta   – arbitrary extra data
   * @param {'info'|'success'|'warn'|'error'} severity
   */
  function push(type, label, meta = {}, severity = 'info') {
    const events = _load();
    events.push({
      id:       Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      type,
      label,
      severity,
      page:     location.pathname,
      ts:       Date.now(),
      isoTime:  new Date().toISOString(),
      ...meta,
    });
    // trim to MAX_EVENTS
    _save(events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events);
  }

  /**
   * Return all events, newest-first.
   * @param {Object} opts  – { type, limit, sinceMs }
   */
  function getEvents({ type = null, limit = 50, sinceMs = null } = {}) {
    let events = _load();
    if (type)    events = events.filter(e => e.type === type);
    if (sinceMs) events = events.filter(e => e.ts >= sinceMs);
    return events.slice().reverse().slice(0, limit);
  }

  /**
   * Return the most recent event matching an optional type filter.
   */
  function latest(type = null) {
    return getEvents({ type, limit: 1 })[0] || null;
  }

  /**
   * Build a compact text summary for injection into AI prompts.
   * @param {number} limit  – max events to include
   */
  function toPromptContext(limit = 10) {
    const events = getEvents({ limit });
    if (!events.length) return '';
    const lines = events.reverse().map(e => {
      const time = new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `[${time}] ${e.label}`;
    });
    return '=== OPERATIONAL TIMELINE ===\n' + lines.join('\n') + '\n===========================\n';
  }

  /**
   * Clear the entire memory store.
   */
  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Auto-record common page-entry events based on current URL + relay state.
   * Call this once on DOMContentLoaded in pages that load this engine.
   */
  function autoRecord() {
    const path = location.pathname.toLowerCase();
    if (path.includes('hc-denial-war-room')) {
      push(EVENT_TYPES.WAR_ROOM_ENGINE_RUN, 'HC Denial War Room opened', { page: path }, 'info');
    } else if (path.includes('hc-main-strategist')) {
      push(EVENT_TYPES.STRATEGIST_RELAY, 'HC Main Strategist loaded', { page: path }, 'info');
    } else if (path.includes('executive-portal')) {
      push(EVENT_TYPES.EXEC_PORTAL_OPEN, 'HC Executive Portal opened', { page: path }, 'info');
    } else if (path.match(/hc-(billing|compliance|insurance|medical|pharmacy|financial|legal|vendors|grants|taxprep|operations)/)) {
      const node = path.match(/hc-([a-z]+)/)?.[1] || 'unknown';
      push(EVENT_TYPES.NODE_RELAY, `HC ${node} node opened`, { node, page: path }, 'info');
    }
  }

  /**
   * Register an anomaly into the SHARED cross-module store (RCM OS reads
   * this, not TSM_HC_MEMORY). This is a deliberate interop write: HC's own
   * event timeline above stays untouched and keeps using TSM_HC_MEMORY —
   * this writes into the same TSM_OPERATIONAL_MEMORY_V3 schema that
   * tsm-memory-engine.js (compliance.html, vendor/logistics rooms, etc.)
   * already uses, under sector 'healthcare', so RCM OS's Executive tab
   * picks it up via TSMMemory.getCrossModuleAnomalies() with zero
   * RCM-OS-side changes. Self-dedupes by anomalyCode among open records
   * so calling this on every page load doesn't create duplicates.
   */
  const SHARED_STORAGE_KEY = 'TSM_OPERATIONAL_MEMORY_V3';
  const SHARED_SECTOR = 'healthcare';

  function _loadShared() {
    try { return JSON.parse(localStorage.getItem(SHARED_STORAGE_KEY) || '{}'); }
    catch (_) { return {}; }
  }

  function _saveShared(all) {
    try { localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify(all)); }
    catch (_) {}
  }

  function registerAnomaly({
    entityType = 'case',
    entityId = 'UNKNOWN',
    anomalyCode,
    title,
    severity = 'MEDIUM',
    source = 'hc-main-strategist',
    meta = {}
  } = {}) {
    if (!anomalyCode) return null;

    const all = _loadShared();
    if (!all[SHARED_SECTOR]) all[SHARED_SECTOR] = { anomalies: [] };
    if (!Array.isArray(all[SHARED_SECTOR].anomalies)) all[SHARED_SECTOR].anomalies = [];
    const bucket = all[SHARED_SECTOR];

    const alreadyOpen = bucket.anomalies.some(a => a.anomalyCode === anomalyCode && a.status === 'open');
    if (alreadyOpen) return null;

    const record = {
      id: `an_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      anomalyCode,
      title: title || anomalyCode,
      severity,
      status: 'open',
      source,
      detectedFrom: null,
      entityType,
      entityId,
      missingFields: [],
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      relayTargets: [],
      recommendedApps: [],
      meta
    };

    bucket.anomalies.unshift(record);
    bucket.anomalies = bucket.anomalies.slice(0, 250);
    _saveShared(all);

    return record;
  }

  // ── EXPOSE ────────────────────────────────────────────────────────────────
  window.TSMMemory = {
    EVENT_TYPES,
    push,
    getEvents,
    latest,
    toPromptContext,
    clearAll,
    autoRecord,
    registerAnomaly,
  };

  // Auto-run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoRecord);
  } else {
    autoRecord();
  }

  console.debug('[TSMMemory] loaded');
})();