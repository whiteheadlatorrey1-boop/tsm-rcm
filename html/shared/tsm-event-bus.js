/**
 * TSM Enterprise Event Bus
 * ─────────────────────────────────────────────────────────────
 * Module 1 of the Enterprise Runtime (tsm-event-bus.js → tsm-relay.js →
 * tsm-rule-registry.js → tsm-enterprise-runtime.js).
 *
 * A pub/sub layer with bounded history and replay, so any war room,
 * strategist, exec portal, or cross-domain engine (like tsm-cross-mesh.js)
 * can publish/subscribe to platform events without knowing who else is
 * listening. This does NOT replace TSM.relay — relay is for *state*
 * (the current MDM payload, the current BPO extraction). The event bus
 * is for *things that happened* (a mission got approved, a rule fired,
 * a quality score changed) that other parts of the platform may want
 * to react to as they occur, or catch up on via replay() after the fact.
 *
 * Usage:
 *   TSMEventBus.publish('QUALITY_UPDATED', { score: 82 }, { warRoom: 'BPO' });
 *   const unsub = TSMEventBus.subscribe('QUALITY_UPDATED', evt => { ... });
 *   TSMEventBus.once('MISSION_APPROVED', evt => { ... });
 *   TSMEventBus.replay('RULE_TRIGGERED', evt => { ... }, { warRoom: 'MDM' });
 *   TSMEventBus.history({ type: 'RISK_DETECTED', limit: 20 });
 *   TSMEventBus.stats();
 *
 * Exposed as window.TSMEventBus.
 */
(function (global) {
  'use strict';

  // Known event types. publish() accepts any string — this is a reference
  // list for autocomplete/typo-safety, not a hard whitelist, since new
  // verticals will need their own event types over time.
  const EVENTS = {
    MISSION_CREATED: 'MISSION_CREATED',
    MISSION_UPDATED: 'MISSION_UPDATED',
    MISSION_APPROVED: 'MISSION_APPROVED',
    MISSION_REJECTED: 'MISSION_REJECTED',
    MISSION_ESCALATED: 'MISSION_ESCALATED',
    QUALITY_UPDATED: 'QUALITY_UPDATED',
    RULE_TRIGGERED: 'RULE_TRIGGERED',
    RISK_DETECTED: 'RISK_DETECTED',
    RISK_APPROVED: 'RISK_APPROVED',
    RISK_REJECTED: 'RISK_REJECTED',
    RELAY_UPDATED: 'RELAY_UPDATED',
    EXEC_SUMMARY_UPDATED: 'EXEC_SUMMARY_UPDATED',
    EXPLAINABILITY_UPDATED: 'EXPLAINABILITY_UPDATED',
    AI_COMPLETED: 'AI_COMPLETED',
    AI_FAILED: 'AI_FAILED',
    CROSS_MESH_UPDATED: 'CROSS_MESH_UPDATED',
    QUEUE_CHANGED: 'QUEUE_CHANGED',
    SYSTEM_HEALTH: 'SYSTEM_HEALTH',
    USER_ACTION: 'USER_ACTION'
  };

  const MAX_HISTORY = 500;
  const WILDCARD = '*';

  // type -> Array<{ id, fn, once }>
  const listeners = new Map();
  // bounded ring buffer of published events, oldest first
  let history = [];
  // per-type publish counters, survive clearHistory() (clearHistory only
  // clears the replay buffer, not the lifetime stats — see clearHistory doc below)
  const publishCounts = {};
  let totalPublished = 0;
  let listenerIdSeq = 0;
  let eventIdSeq = 0;

  function now() {
    return new Date().toISOString();
  }

  function genEventId() {
    eventIdSeq++;
    return 'evt-' + Date.now().toString(36) + '-' + eventIdSeq;
  }

  function genTraceId() {
    return 'trace-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function getListeners(type) {
    if (!listeners.has(type)) listeners.set(type, []);
    return listeners.get(type);
  }

  /**
   * Publish an event. Returns the full event record that was stored
   * and dispatched, including its generated id/timestamp/traceId.
   *
   * @param {string} type - event type, e.g. TSMEventBus.EVENTS.QUALITY_UPDATED
   * @param {*} payload - arbitrary event data
   * @param {object} [opts]
   * @param {string} [opts.origin] - which module/file published this (e.g. 'mdm-war-room')
   * @param {string} [opts.warRoom] - which vertical this concerns (e.g. 'MDM', 'BPO')
   * @param {string} [opts.priority] - 'low' | 'normal' | 'high' | 'critical'
   * @param {string} [opts.actor] - who/what triggered this (e.g. 'user', 'system', 'ai')
   * @param {string} [opts.traceId] - correlation id to link related events across the chain; auto-generated if omitted
   */
  function publish(type, payload, opts) {
    opts = opts || {};
    if (!type || typeof type !== 'string') {
      console.error('[TSMEventBus] publish() requires a string event type, got:', type);
      return null;
    }
    if (!EVENTS[type]) {
      console.warn(`[TSMEventBus] "${type}" is not a known event type (see TSMEventBus.EVENTS). Publishing anyway.`);
    }

    const event = {
      id: genEventId(),
      type,
      timestamp: now(),
      origin: opts.origin || null,
      warRoom: opts.warRoom || null,
      payload: payload !== undefined ? payload : null,
      priority: opts.priority || 'normal',
      actor: opts.actor || 'system',
      traceId: opts.traceId || genTraceId()
    };

    history.push(event);
    if (history.length > MAX_HISTORY) history.shift();

    publishCounts[type] = (publishCounts[type] || 0) + 1;
    totalPublished++;

    dispatch(type, event);
    dispatch(WILDCARD, event);

    return event;
  }

  function dispatch(type, event) {
    const subs = listeners.get(type);
    if (!subs || !subs.length) return;
    // snapshot before iterating — a handler may unsubscribe (e.g. once())
    // mid-dispatch, which would otherwise corrupt the live array during iteration
    const snapshot = subs.slice();
    for (const sub of snapshot) {
      try {
        sub.fn(event);
      } catch (e) {
        console.error(`[TSMEventBus] listener for "${type}" threw:`, e);
      }
      if (sub.once) removeListener(type, sub.id);
    }
  }

  function removeListener(type, id) {
    const subs = listeners.get(type);
    if (!subs) return;
    const idx = subs.findIndex(s => s.id === id);
    if (idx !== -1) subs.splice(idx, 1);
  }

  /**
   * Subscribe to an event type. Pass '*' (or TSMEventBus.WILDCARD) to
   * receive every event regardless of type — useful for debug panels
   * or a platform-wide activity feed.
   * Returns an unsubscribe function.
   */
  function subscribe(type, handler) {
    if (typeof handler !== 'function') {
      console.error('[TSMEventBus] subscribe() requires a function handler');
      return function noop() {};
    }
    listenerIdSeq++;
    const id = listenerIdSeq;
    getListeners(type).push({ id, fn: handler, once: false });
    return function unsubscribe() {
      removeListener(type, id);
    };
  }

  /** Subscribe for exactly one invocation, then auto-unsubscribe. */
  function once(type, handler) {
    if (typeof handler !== 'function') {
      console.error('[TSMEventBus] once() requires a function handler');
      return function noop() {};
    }
    listenerIdSeq++;
    const id = listenerIdSeq;
    getListeners(type).push({ id, fn: handler, once: true });
    return function unsubscribe() {
      removeListener(type, id);
    };
  }

  /** Explicitly remove a handler registered via subscribe()/once(). */
  function unsubscribe(type, handler) {
    const subs = listeners.get(type);
    if (!subs) return;
    const idx = subs.findIndex(s => s.fn === handler);
    if (idx !== -1) subs.splice(idx, 1);
  }

  /**
   * Replay historical events through a handler — for a component that
   * mounted late and needs to catch up, without re-publishing anything.
   * Does NOT re-add the handler as a live subscriber; call subscribe()
   * separately if you also want future events.
   *
   * @param {string} type - event type to replay, or '*' for all types
   * @param {function} handler
   * @param {object} [filter]
   * @param {string} [filter.warRoom]
   * @param {string} [filter.traceId]
   * @param {number} [filter.limit] - most recent N matching events only
   */
  function replay(type, handler, filter) {
    if (typeof handler !== 'function') {
      console.error('[TSMEventBus] replay() requires a function handler');
      return;
    }
    const matches = history.filter(e => matchesFilter(e, type, filter));
    matches.forEach(e => {
      try { handler(e); }
      catch (err) { console.error('[TSMEventBus] replay handler threw:', err); }
    });
  }

  function matchesFilter(event, type, filter) {
    if (type && type !== WILDCARD && event.type !== type) return false;
    if (filter) {
      if (filter.warRoom && event.warRoom !== filter.warRoom) return false;
      if (filter.traceId && event.traceId !== filter.traceId) return false;
    }
    return true;
  }

  /**
   * Query stored history without side effects. Returns a shallow copy
   * (oldest-first) so callers can't mutate the internal buffer.
   *
   * @param {object} [filter]
   * @param {string} [filter.type]
   * @param {string} [filter.warRoom]
   * @param {string} [filter.traceId]
   * @param {string} [filter.since] - ISO timestamp; only events after this
   * @param {number} [filter.limit] - most recent N matching events
   */
  function getHistory(filter) {
    filter = filter || {};
    let results = history.filter(e => {
      if (filter.type && e.type !== filter.type) return false;
      if (filter.warRoom && e.warRoom !== filter.warRoom) return false;
      if (filter.traceId && e.traceId !== filter.traceId) return false;
      if (filter.since && e.timestamp <= filter.since) return false;
      return true;
    });
    if (filter.limit) results = results.slice(-filter.limit);
    return results.map(e => Object.assign({}, e));
  }

  /**
   * Clears the replay buffer only. Lifetime counters (stats().totalPublished,
   * per-type counts) are intentionally preserved — clearing history shouldn't
   * erase the fact that those events happened, just free the memory used to
   * replay them.
   */
  function clearHistory() {
    history = [];
  }

  /** Snapshot of bus activity: per-type publish counts, listener counts, buffer size. */
  function stats() {
    const listenerCounts = {};
    listeners.forEach((subs, type) => {
      if (subs.length) listenerCounts[type] = subs.length;
    });
    return {
      totalPublished,
      publishCountsByType: Object.assign({}, publishCounts),
      listenerCountsByType: listenerCounts,
      historySize: history.length,
      maxHistory: MAX_HISTORY
    };
  }

  global.TSMEventBus = {
    EVENTS,
    WILDCARD,
    publish,
    subscribe,
    unsubscribe,
    once,
    replay,
    history: getHistory,
    clearHistory,
    stats
  };

  // Node/CommonJS export for testing, without affecting browser usage.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.TSMEventBus;
  }
})(typeof window !== 'undefined' ? window : globalThis);