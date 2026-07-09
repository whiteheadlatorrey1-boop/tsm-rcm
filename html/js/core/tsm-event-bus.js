/**
 * TSM Event Bus v1.1
 * Platform-wide pub/sub backbone for all 7 TSM Shell verticals.
 * Must load BEFORE tsm-state.js and tsm-mission-engine.js.
 *
 * Exports: window.TSMBus (primary) + window.TSMEventBus (alias)
 *
 * Usage:
 *   TSMBus.on('MISSION_CREATED', handler)
 *   TSMBus.once('WARROOM_FINDINGS_READY', handler)
 *   TSMBus.emit('DOCUMENT_IMPORTED', { vertical, relay })
 *   TSMBus.off('MISSION_CREATED', handler)
 *   TSMBus.debug()   // show all listeners
 *
 * Platform event contract:
 *   DOCUMENT_IMPORTED        → { vertical, relay }
 *   WAR_ROOM_READY           → { vertical, relay }
 *   AI_ANALYSIS_COMPLETE     → { vertical, relay }
 *   WARROOM_COMPLETE         → { sector, missionId, docText, docType?, engineOutputs }
 *   WARROOM_FINDINGS_READY   → { id, analysis, mission }
 *   STRATEGIST_READY         → { id, mission }
 *   EXECUTIVE_APPROVED       → { id, vertical, decision }
 *   EXECUTIVE_REJECTED       → { id, vertical, reason }
 *   MISSION_CREATED          → { mission }
 *   MISSION_UPDATED          → { id, updates, mission }
 *   MISSION_ESCALATED        → { id, reason, mission }
 *   MISSION_COMPLETE         → { id, result, mission }
 *   STATE_CHANGED            → { slice, prev, next }
 *   STATE_RESET              → { ts }
 *   PIPELINE_PHASE_CHANGED   → { phase, vertical }
 *   PIPELINE_LOG             → { msg, level, ts }
 *   AUDIT_ENTRY              → { missionId, action, data, ts }
 *   BNCA_SIGNAL_RECEIVED     → { vertical, signal }
 *   EXECUTION_PROGRESS       → { id, progress, workerLog }
 */

(function (global) {
  'use strict';

  // ── Internal registry ─────────────────────────────────────────────────────
  // Map<eventName, Set<{fn, once}>>
  const _listeners = new Map();

  // Event history for late subscribers (last 50 events per channel)
  const _history   = new Map();
  const HISTORY_MAX = 50;

  // ── Core API ──────────────────────────────────────────────────────────────

  /**
   * Subscribe to an event.
   * @param {string}   event
   * @param {Function} fn
   * @returns {Function} unsubscribe function
   */
  function on(event, fn) {
    if (typeof fn !== 'function') { console.warn('[TSMBus] on() requires a function'); return () => {}; }
    if (!_listeners.has(event)) _listeners.set(event, new Set());
    const entry = { fn, once: false };
    _listeners.get(event).add(entry);

    // Replay last event on this channel if subscriber joins late
    const hist = _history.get(event);
    if (hist && hist.length > 0) {
      const last = hist[hist.length - 1];
      try { fn(last.payload); } catch (e) { console.error(`[TSMBus] Late-replay error on "${event}":`, e); }
    }

    return () => off(event, fn);
  }

  /**
   * Subscribe once — auto-unsubscribes after first fire.
   * @param {string}   event
   * @param {Function} fn
   * @returns {Function} unsubscribe function
   */
  function once(event, fn) {
    if (typeof fn !== 'function') { console.warn('[TSMBus] once() requires a function'); return () => {}; }
    if (!_listeners.has(event)) _listeners.set(event, new Set());
    const entry = { fn, once: true };
    _listeners.get(event).add(entry);
    return () => _listeners.get(event)?.delete(entry);
  }

  /**
   * Unsubscribe a specific handler.
   * @param {string}   event
   * @param {Function} fn
   */
  function off(event, fn) {
    const set = _listeners.get(event);
    if (!set) return;
    for (const entry of set) {
      if (entry.fn === fn) { set.delete(entry); break; }
    }
  }

  /**
   * Emit an event to all subscribers.
   * @param {string} event
   * @param {*}      payload
   */
  function emit(event, payload = {}) {
    // Record in history
    if (!_history.has(event)) _history.set(event, []);
    const hist = _history.get(event);
    hist.push({ payload, ts: Date.now() });
    if (hist.length > HISTORY_MAX) hist.shift();

    // Dispatch
    const set = _listeners.get(event);
    if (!set || set.size === 0) return;

    const toDelete = [];
    for (const entry of set) {
      try {
        entry.fn(payload);
      } catch (e) {
        console.error(`[TSMBus] Handler error on "${event}":`, e);
      }
      if (entry.once) toDelete.push(entry);
    }
    toDelete.forEach(e => set.delete(e));
  }

  /**
   * Remove all listeners for an event (or all events).
   * @param {string} [event]
   */
  function clear(event) {
    if (event) { _listeners.delete(event); }
    else       { _listeners.clear(); }
  }

  /**
   * Get event history.
   * @param {string} event
   * @param {number} [n] last n entries (default: all)
   */
  function history(event, n) {
    const hist = _history.get(event) || [];
    return n ? hist.slice(-n) : [...hist];
  }

  /**
   * Wait for an event (Promise-based, with optional timeout).
   * @param {string} event
   * @param {number} [timeoutMs]  default 10000
   * @returns {Promise<*>}
   */
  function waitFor(event, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[TSMBus] waitFor("${event}") timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      once(event, (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });
  }

  // ── Platform-level subscriptions ──────────────────────────────────────────
  // These are the canonical cross-vertical event handlers.
  // Each vertical's war room/strategist/exec portal plugs into these.

  function _wireCorePlatform() {
    // When a document is imported, update State
    on('DOCUMENT_IMPORTED', ({ vertical, relay }) => {
      if (!global.TSMState) return;
      global.TSMState.update('document', {
        sector:     vertical,
        uploadedAt: Date.now(),
      });
      global.TSMState.update('warroom', { sector: vertical, status: 'idle' });
      console.info(`[TSMBus] DOCUMENT_IMPORTED → ${vertical}`);
    });

    // When war room is ready, update mission status
    on('WAR_ROOM_READY', ({ vertical }) => {
      if (!global.TSMState) return;
      global.TSMState.update('warroom', { status: 'running', startedAt: Date.now() });
      console.info(`[TSMBus] WAR_ROOM_READY → ${vertical}`);
    });

    // When analysis is complete, update state
    on('AI_ANALYSIS_COMPLETE', ({ vertical }) => {
      if (!global.TSMState) return;
      global.TSMState.update('warroom', { status: 'complete', completedAt: Date.now() });
      console.info(`[TSMBus] AI_ANALYSIS_COMPLETE → ${vertical}`);
    });

    // When strategist is ready, update state
    on('STRATEGIST_READY', ({ id, mission }) => {
      if (!global.TSMState) return;
      if (mission) global.TSMState.update('strategist', { sector: mission.sector, readyAt: Date.now() });
      console.info(`[TSMBus] STRATEGIST_READY → mission:${id}`);
    });

    // When executive approves, write audit + update state
    on('EXECUTIVE_APPROVED', ({ id, vertical, decision }) => {
      if (global.TSMState) {
        global.TSMState.update('executive', { approved: true, reviewedAt: Date.now() });
        global.TSMState.push('audit', { event: 'EXECUTIVE_APPROVED', id, vertical, decision, ts: Date.now() });
      }
      console.info(`[TSMBus] EXECUTIVE_APPROVED → ${vertical}`);
    });

    // Audit passthrough — all audit entries get persisted via State
    on('AUDIT_ENTRY', (entry) => {
      // State auto-persists — nothing extra needed
    });

    console.info('[TSMBus] Core platform wiring complete.');
  }

  // ── Debug ─────────────────────────────────────────────────────────────────
  function debug() {
    console.group('[TSMBus] Event Bus State');
    console.log('Active channels:');
    for (const [event, set] of _listeners) {
      console.log(`  "${event}" — ${set.size} listener(s)`);
    }
    console.log('History channels:', [..._history.keys()]);
    console.groupEnd();
  }

  // ── Expose ────────────────────────────────────────────────────────────────
  const TSMBus = { on, once, off, emit, clear, history, waitFor, debug };

  global.TSMBus      = TSMBus;
  global.TSMEventBus = TSMBus; // alias for files using either name

  // Wire core platform handlers after a tick (allows state/mission to load first)
  setTimeout(_wireCorePlatform, 0);

  console.info('[TSMBus] Event Bus v1.1 initialized.');

})(window);