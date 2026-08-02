/**
 * runtime-events.js
 * Standardized event bus. No page should invent new event name strings —
 * add them to KNOWN_EVENTS below and reference the constant instead.
 */
(function (global) {
  const KNOWN_EVENTS = [
    'MISSION_CREATED',
    'MISSION_UPDATED',
    'MISSION_ASSIGNED',
    'MISSION_STAGE_CHANGED',
    'MISSION_COMPLETED',
    'PAGE_REGISTERED',
    'STATE_CHANGED'
  ];

  const listeners = new Map();

  function publish(eventName, payload) {
    if (!KNOWN_EVENTS.includes(eventName)) {
      console.warn(`[RuntimeEvents] "${eventName}" is not a known event. Add it to KNOWN_EVENTS in runtime-events.js before using it.`);
    }
    const set = listeners.get(eventName);
    if (set) {
      set.forEach(fn => {
        try { fn(payload); } catch (e) { console.error('[RuntimeEvents] listener error', eventName, e); }
      });
    }
    // Also broadcast cross-tab via a single storage key, replacing
    // page-specific relay keys.
    try {
      localStorage.setItem('RTEVENT::' + eventName, JSON.stringify({ payload, ts: Date.now() }));
    } catch (e) { /* ignore quota errors */ }
  }

  function subscribe(eventName, fn) {
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName).add(fn);
    return () => listeners.get(eventName).delete(fn);
  }

  // Cross-tab: listen for our namespaced relay keys instead of each page
  // inventing its own storage event listener.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (!e.key || !e.key.startsWith('RTEVENT::')) return;
      const eventName = e.key.slice('RTEVENT::'.length);
      const set = listeners.get(eventName);
      if (!set) return;
      try {
        const { payload } = JSON.parse(e.newValue);
        set.forEach(fn => fn(payload));
      } catch (err) { /* ignore malformed */ }
    });
  }

  global.RuntimeEvents = { publish, subscribe, KNOWN_EVENTS };
})(typeof window !== 'undefined' ? window : globalThis);
