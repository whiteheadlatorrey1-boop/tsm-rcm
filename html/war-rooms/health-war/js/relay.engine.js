// ═══════════════════════════════════════════════════════════════════════════
// TSM RELAY ENGINE 2.0
// Unified relay layer for: HC Nodes → HC War Room → HC Strategist → Exec Portal
// Also handles War Room → App Node dispatch (replaces broken TSMCureConductor)
//
// Storage key map (canonical, do not change):
//   TSM_WAR_ROOM_BRIEF   → war room engines → hc-main-strategist
//   TSM_EXEC_RELAY       → hc-main-strategist → executive-portal
//   TSM_EXEC_FEEDBACK    → executive-portal → hc-main-strategist (bidirectional)
//   tsm-hc-mission-relay → hc-* nodes → hc-main-strategist (node chain)
//   TSM_HC_APP_DISPATCH  → war room app card → hc-* node page (cheat sheet fill)
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  if (window.__TSM_RELAY_ENGINE__) return;
  window.__TSM_RELAY_ENGINE__ = true;

  // ── SCHEMA VERSION ──────────────────────────────────────────────────────
  const SCHEMA_VERSION = '2.0';

  // ── STORAGE KEYS ────────────────────────────────────────────────────────
  const KEYS = {
    WAR_ROOM_BRIEF:  'TSM_WAR_ROOM_BRIEF',
    EXEC_RELAY:      'TSM_EXEC_RELAY',
    EXEC_FEEDBACK:   'TSM_EXEC_FEEDBACK',
    MISSION_RELAY:   'tsm-hc-mission-relay',
    APP_DISPATCH:    'TSM_HC_APP_DISPATCH',
  };

  // ── TTL (ms) ─────────────────────────────────────────────────────────────
  const TTL = {
    WAR_ROOM_BRIEF: 7_200_000,   // 2 hr
    EXEC_RELAY:     7_200_000,   // 2 hr
    EXEC_FEEDBACK:  86_400_000,  // 24 hr
    MISSION_RELAY:  3_600_000,   // 1 hr
    APP_DISPATCH:   1_800_000,   // 30 min
  };

  // ── DUAL-WRITE HELPER ────────────────────────────────────────────────────
  function write(key, data) {
    const payload = JSON.stringify({ ...data, _v: SCHEMA_VERSION, _ts: Date.now() });
    try { sessionStorage.setItem(key, payload); } catch (_) {}
    try { localStorage.setItem(key, payload); } catch (_) {}
  }

  function read(key, ttlMs) {
    let raw = null;
    try { raw = sessionStorage.getItem(key); } catch (_) {}
    if (!raw) { try { raw = localStorage.getItem(key); } catch (_) {} }
    if (!raw) return null;
    try {
      const d = JSON.parse(raw);
      if (ttlMs && d._ts && (Date.now() - d._ts) > ttlMs) return null;
      return d;
    } catch (_) { return null; }
  }

  function clear(key) {
    try { sessionStorage.removeItem(key); } catch (_) {}
    try { localStorage.removeItem(key); } catch (_) {}
  }

  // ── PAYLOAD BUILDERS ─────────────────────────────────────────────────────

  /**
   * Build a War Room Brief payload (HC Denial War Room → HC Main Strategist).
   * Reads engine output elements out1–out5 automatically.
   * @param {Object} overrides – any extra fields to merge
   */
  function buildWarRoomBrief(overrides = {}) {
    const engineOutputs = {};
    ['out1','out2','out3','out4','out5'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.textContent.trim()) engineOutputs[id] = el.textContent.trim();
    });
    const docText = document.getElementById('doc-text')?.value?.trim() || '';
    return {
      source: 'hc-denial-war-room',
      vertical: 'Healthcare',
      sessionId: sessionStorage.getItem('tsm_session_id') || ('hc_' + Date.now()),
      engineOutputs,
      docText: docText.substring(0, 2000),
      ...overrides,
    };
  }

  /**
   * Build an Exec Relay payload (HC Main Strategist → Executive Portal).
   * @param {Object} overrides
   */
  function buildExecRelay(overrides = {}) {
    const brief = read(KEYS.WAR_ROOM_BRIEF, TTL.WAR_ROOM_BRIEF) || {};
    return {
      source: 'hc-main-strategist',
      vertical: 'Healthcare',
      warRoomBrief: brief,
      strategistFindings: '',
      recommendations: [],
      ...overrides,
    };
  }

  /**
   * Build an App Dispatch payload (war room E6 card → HC node cheat sheet).
   * @param {Object} app  – E6_APP_REGISTRY entry
   * @param {string} docText
   * @param {string[]} engineSummaries
   */
  function buildAppDispatch(app, docText = '', engineSummaries = []) {
    return {
      source: 'hc-denial-war-room',
      vertical: 'Healthcare',
      appName: app.appName,
      appUrl: app.url,
      howTo: app.howTo || '',
      matchedTerms: app.matchedTerms || [],
      docText: docText.substring(0, 3000),
      engineSummaries,
      dispatchedAt: new Date().toISOString(),
    };
  }

  // ── PUBLIC RELAY ACTIONS ──────────────────────────────────────────────────

  /**
   * Write War Room Brief and navigate to HC Main Strategist.
   * Replaces the inline dispatchSessionPayload + escalateToStrategist pattern.
   * @param {Object} payloadOverrides
   * @param {string} targetUrl  – defaults to /html/healthcare/hc-main-strategist.html
   */
  function relayToStrategist(payloadOverrides = {}, targetUrl = '/html/healthcare/hc-main-strategist.html') {
    const payload = buildWarRoomBrief(payloadOverrides);
    write(KEYS.WAR_ROOM_BRIEF, payload);
    return targetUrl;
  }

  /**
   * Write Exec Relay and navigate to Executive Portal.
   * @param {Object} payloadOverrides
   * @param {string} targetUrl
   */
  function relayToExecPortal(payloadOverrides = {}, targetUrl = '/html/healthcare/executive-portal.html') {
    const payload = buildExecRelay(payloadOverrides);
    write(KEYS.EXEC_RELAY, payload);
    return targetUrl;
  }

  /**
   * Write App Dispatch and navigate to the target node (opens new tab).
   * Replaces the broken TSMCureConductor.launch() pattern.
   * @param {Object} app  – E6_APP_REGISTRY entry with .url
   * @param {string} docText
   * @param {string[]} engineSummaries
   */
  function dispatchToApp(app, docText = '', engineSummaries = []) {
    const payload = buildAppDispatch(app, docText, engineSummaries);
    write(KEYS.APP_DISPATCH, payload);
    window.open(app.url, '_blank');
  }

  /**
   * Read App Dispatch on the receiving node page and return the payload.
   * Returns null if stale or missing.
   */
  function receiveAppDispatch() {
    return read(KEYS.APP_DISPATCH, TTL.APP_DISPATCH);
  }

  /**
   * Write Exec Feedback from Executive Portal back to Strategist.
   * @param {Object} feedbackItem  – { text, priority, owner, respondBy }
   */
  function pushExecFeedback(feedbackItem) {
    const existing = read(KEYS.EXEC_FEEDBACK, TTL.EXEC_FEEDBACK);
    const arr = Array.isArray(existing?.items) ? existing.items : [];
    arr.push({ ...feedbackItem, id: Date.now(), ts: new Date().toISOString() });
    write(KEYS.EXEC_FEEDBACK, { items: arr });
  }

  // ── READ HELPERS ──────────────────────────────────────────────────────────
  const reads = {
    warRoomBrief:   () => read(KEYS.WAR_ROOM_BRIEF,  TTL.WAR_ROOM_BRIEF),
    execRelay:      () => read(KEYS.EXEC_RELAY,       TTL.EXEC_RELAY),
    execFeedback:   () => read(KEYS.EXEC_FEEDBACK,    TTL.EXEC_FEEDBACK),
    missionRelay:   () => read(KEYS.MISSION_RELAY,    TTL.MISSION_RELAY),
    appDispatch:    () => receiveAppDispatch(),
  };

  // ── URL-PARAM FALLBACK (cross-origin / private tab resilience) ────────────
  function injectUrlFallback(url, payload) {
    try {
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload).slice(0, 3500))));
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}tsm_brief=${b64}`;
    } catch (_) { return url; }
  }

  function readUrlFallback() {
    try {
      const b64 = new URLSearchParams(location.search).get('tsm_brief');
      if (b64) return JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch (_) {}
    return null;
  }

  // ── EXPOSE ────────────────────────────────────────────────────────────────
  window.TSMRelay = {
    KEYS,
    write, read, clear,
    buildWarRoomBrief, buildExecRelay, buildAppDispatch,
    relayToStrategist, relayToExecPortal, dispatchToApp,
    receiveAppDispatch, pushExecFeedback,
    reads,
    injectUrlFallback, readUrlFallback,
  };

  console.debug('[TSMRelay 2.0] loaded');
})();