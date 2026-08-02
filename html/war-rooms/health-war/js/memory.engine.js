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

  // ── EXPOSE ────────────────────────────────────────────────────────────────
  window.TSMMemory = {
    EVENT_TYPES,
    push,
    getEvents,
    latest,
    toPromptContext,
    clearAll,
    autoRecord,
  };

  // Auto-run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoRecord);
  } else {
    autoRecord();
  }

  console.debug('[TSMMemory] loaded');
})();