/**
 * TSM Enterprise Relay
 * ─────────────────────────────────────────────────────────────
 * Module 2 of the Enterprise Runtime (tsm-event-bus.js → tsm-relay.js →
 * tsm-rule-registry.js → tsm-enterprise-runtime.js).
 *
 * Goal per the runtime plan: "No page should touch localStorage,
 * sessionStorage, or CustomEvent directly ever again." Everything
 * becomes TSMRelay.write() / .read() / .merge() / .delete() / .watch().
 *
 * BACKWARD COMPATIBILITY — this matters more than anything else in this
 * file: relay.core.js is already deployed on every war room and exec
 * portal, using the storage key convention TSM_<DOMAIN>_RELAY (session
 * then localStorage) and dispatching a window CustomEvent named
 * TSM_RELAY_EVENT with { detail: { domain, payload } }. tsm-cross-mesh.js
 * and every existing war room already depend on that exact shape.
 * TSMRelay.write()/.read() reproduce that SAME storage key and SAME
 * event, byte for byte, so:
 *   - Pages already using TSM.relay.write/read (via relay.core.js) are
 *     completely unaffected and keep working, whether or not this file
 *     is also loaded on the page.
 *   - Any listener written against the old convention (like
 *     tsm-cross-mesh.js's `storage` event check, or its TSM_RELAY_EVENT
 *     listener) fires correctly no matter which of the two relay
 *     implementations performed the write.
 *   - This file will NOT overwrite window.TSM.relay if relay.core.js
 *     already installed one — it only fills the gap if TSM.relay is
 *     missing, so a page can adopt this without any coordination.
 *
 * Internal layering, per the runtime plan (memory → sessionStorage →
 * localStorage → event bus):
 *   - write() persists to an in-memory cache AND sessionStorage AND
 *     localStorage, in that order, so a same-page read never pays a
 *     JSON.parse cost and the data still survives a tab reload/reopen.
 *   - read() checks memory first, then sessionStorage, then
 *     localStorage, returning the first hit.
 *   - Every write/merge/delete also publishes to TSMEventBus (module 1)
 *     as a RELAY_UPDATED event, if TSMEventBus is loaded on the page —
 *     entirely optional, TSMRelay works standalone if it isn't.
 *
 * Exposed as window.TSMRelay.
 */
(function (global) {
  'use strict';

  const KEY_PREFIX = 'TSM_';
  const KEY_SUFFIX = '_RELAY';
  const MAX_DOMAIN_HISTORY = 20;

  const memoryCache = new Map();     // domain -> payload
  const knownDomains = new Set();    // every domain ever written, for export()
  const domainHistory = new Map();   // domain -> Array<{action, payload, timestamp}>
  const watchers = new Map();        // domain -> Array<{id, fn}>
  let watcherIdSeq = 0;

  function storageKey(domain) {
    return KEY_PREFIX + domain + KEY_SUFFIX;
  }

  function safeSessionGet(key) {
    try { return global.sessionStorage ? global.sessionStorage.getItem(key) : null; }
    catch (e) { return null; }
  }
  function safeLocalGet(key) {
    try { return global.localStorage ? global.localStorage.getItem(key) : null; }
    catch (e) { return null; }
  }
  function safeSessionSet(key, val) {
    try { if (global.sessionStorage) global.sessionStorage.setItem(key, val); } catch (e) {}
  }
  function safeLocalSet(key, val) {
    try { if (global.localStorage) global.localStorage.setItem(key, val); } catch (e) {}
  }
  function safeSessionRemove(key) {
    try { if (global.sessionStorage) global.sessionStorage.removeItem(key); } catch (e) {}
  }
  function safeLocalRemove(key) {
    try { if (global.localStorage) global.localStorage.removeItem(key); } catch (e) {}
  }

  function recordHistory(domain, action, payload) {
    if (!domainHistory.has(domain)) domainHistory.set(domain, []);
    const log = domainHistory.get(domain);
    log.push({ action, payload, timestamp: new Date().toISOString() });
    if (log.length > MAX_DOMAIN_HISTORY) log.shift();
  }

  function dispatchLegacyEvent(domain, payload) {
    try {
      global.dispatchEvent(new CustomEvent('TSM_RELAY_EVENT', { detail: { domain, payload } }));
    } catch (e) {}
  }

  function publishToEventBus(domain, payload, action) {
    try {
      if (global.TSMEventBus && global.TSMEventBus.publish) {
        global.TSMEventBus.publish(global.TSMEventBus.EVENTS.RELAY_UPDATED, { domain, payload, action }, {
          origin: 'tsm-relay',
          warRoom: domain
        });
      }
    } catch (e) {}
  }

  function notifyWatchers(domain, payload) {
    const subs = watchers.get(domain);
    if (!subs || !subs.length) return;
    const snapshot = subs.slice();
    for (const sub of snapshot) {
      try { sub.fn(payload, domain); }
      catch (e) { console.error(`[TSMRelay] watcher for "${domain}" threw:`, e); }
    }
  }

  /**
   * Write a domain's current payload. Persists to memory + session +
   * local storage, dispatches the legacy TSM_RELAY_EVENT, publishes
   * RELAY_UPDATED on the event bus if present, and notifies watchers.
   */
  function write(domain, payload) {
    if (!domain || typeof domain !== 'string') {
      console.error('[TSMRelay] write() requires a string domain, got:', domain);
      return null;
    }
    memoryCache.set(domain, payload);
    knownDomains.add(domain);

    const serialized = JSON.stringify(payload);
    const key = storageKey(domain);
    safeSessionSet(key, serialized);
    safeLocalSet(key, serialized);

    recordHistory(domain, 'write', payload);
    dispatchLegacyEvent(domain, payload);
    publishToEventBus(domain, payload, 'write');
    notifyWatchers(domain, payload);

    return payload;
  }

  /**
   * Read a domain's current payload. Checks memory, then sessionStorage,
   * then localStorage. Returns null if nothing has ever been written
   * (or everything was deleted).
   */
  function read(domain) {
    if (memoryCache.has(domain)) return memoryCache.get(domain);

    const key = storageKey(domain);
    const fromSession = safeSessionGet(key);
    if (fromSession !== null) {
      try {
        const parsed = JSON.parse(fromSession);
        memoryCache.set(domain, parsed); // warm the cache for next read
        knownDomains.add(domain);
        return parsed;
      } catch (e) { /* fall through to localStorage */ }
    }

    const fromLocal = safeLocalGet(key);
    if (fromLocal !== null) {
      try {
        const parsed = JSON.parse(fromLocal);
        memoryCache.set(domain, parsed);
        knownDomains.add(domain);
        return parsed;
      } catch (e) { return null; }
    }

    return null;
  }

  /**
   * Shallow-merge partialPayload into the domain's current payload (or
   * {} if nothing exists yet), then write() the merged result. Returns
   * the merged payload. This is a shallow merge by design — a deep
   * merge would silently do surprising things to nested arrays/objects
   * that a caller expected to fully replace.
   */
  function merge(domain, partialPayload) {
    const current = read(domain) || {};
    const merged = Object.assign({}, current, partialPayload);
    memoryCache.set(domain, merged);
    knownDomains.add(domain);

    const serialized = JSON.stringify(merged);
    const key = storageKey(domain);
    safeSessionSet(key, serialized);
    safeLocalSet(key, serialized);

    recordHistory(domain, 'merge', merged);
    dispatchLegacyEvent(domain, merged);
    publishToEventBus(domain, merged, 'merge');
    notifyWatchers(domain, merged);

    return merged;
  }

  /** Remove a domain entirely from memory + session + local storage. */
  function del(domain) {
    const existed = memoryCache.has(domain) || safeSessionGet(storageKey(domain)) !== null || safeLocalGet(storageKey(domain)) !== null;
    memoryCache.delete(domain);
    const key = storageKey(domain);
    safeSessionRemove(key);
    safeLocalRemove(key);

    if (existed) {
      recordHistory(domain, 'delete', null);
      dispatchLegacyEvent(domain, null);
      publishToEventBus(domain, null, 'delete');
      notifyWatchers(domain, null);
    }
    return existed;
  }

  /**
   * Watch a specific domain for writes/merges/deletes — fires on same-page
   * relay activity AND on cross-tab localStorage changes to that domain's
   * key (via the native `storage` event, which only fires in OTHER tabs/
   * windows sharing the same origin, by browser design). Returns an
   * unwatch function.
   */
  function watch(domain, handler) {
    if (typeof handler !== 'function') {
      console.error('[TSMRelay] watch() requires a function handler');
      return function noop() {};
    }
    if (!watchers.has(domain)) watchers.set(domain, []);
    watcherIdSeq++;
    const id = watcherIdSeq;
    watchers.get(domain).push({ id, fn: handler });
    return function unwatch() {
      unwatchById(domain, id);
    };
  }

  function unwatchById(domain, id) {
    const subs = watchers.get(domain);
    if (!subs) return;
    const idx = subs.findIndex(s => s.id === id);
    if (idx !== -1) subs.splice(idx, 1);
  }

  /** Explicitly remove a handler registered via watch(). */
  function unwatch(domain, handler) {
    const subs = watchers.get(domain);
    if (!subs) return;
    const idx = subs.findIndex(s => s.fn === handler);
    if (idx !== -1) subs.splice(idx, 1);
  }

  // Cross-tab sync: the native `storage` event fires in every OTHER tab
  // sharing this origin when localStorage changes here, letting watchers
  // react to writes made in a different tab/window, not just this page.
  try {
    global.addEventListener('storage', function (e) {
      if (!e || !e.key || !e.key.startsWith(KEY_PREFIX) || !e.key.endsWith(KEY_SUFFIX)) return;
      const domain = e.key.slice(KEY_PREFIX.length, -KEY_SUFFIX.length);
      if (!watchers.has(domain)) return;
      let payload = null;
      if (e.newValue !== null) {
        try { payload = JSON.parse(e.newValue); } catch (err) { return; }
      }
      memoryCache.set(domain, payload);
      notifyWatchers(domain, payload);
    });
  } catch (e) {}

  /**
   * Export a snapshot of relay state. Pass a domain to export just that
   * domain; omit it to export every domain ever written on this page.
   */
  function exportState(domain) {
    if (domain) {
      return { domain, payload: read(domain), exportedAt: new Date().toISOString() };
    }
    const snapshot = {};
    knownDomains.forEach(d => { snapshot[d] = read(d); });
    return { domains: snapshot, exportedAt: new Date().toISOString() };
  }

  /**
   * Import a snapshot produced by export(). Accepts either the
   * single-domain shape ({domain, payload}) or the multi-domain shape
   * ({domains: {...}}). Writes each domain via write(), so watchers/
   * event bus subscribers fire normally unless opts.silent is set.
   */
  function importState(data, opts) {
    opts = opts || {};
    if (!data) return;
    if (data.domain && data.payload !== undefined) {
      if (opts.silent) { memoryCache.set(data.domain, data.payload); knownDomains.add(data.domain); safeSessionSet(storageKey(data.domain), JSON.stringify(data.payload)); safeLocalSet(storageKey(data.domain), JSON.stringify(data.payload)); }
      else write(data.domain, data.payload);
      return;
    }
    if (data.domains) {
      Object.keys(data.domains).forEach(domain => {
        const payload = data.domains[domain];
        if (opts.silent) { memoryCache.set(domain, payload); knownDomains.add(domain); safeSessionSet(storageKey(domain), JSON.stringify(payload)); safeLocalSet(storageKey(domain), JSON.stringify(payload)); }
        else write(domain, payload);
      });
    }
  }

  /**
   * Per-domain write/merge/delete log (bounded to the most recent 20
   * per domain). Omit domain to get the full map of every domain's log.
   */
  function getHistory(domain) {
    if (domain) return (domainHistory.get(domain) || []).map(e => Object.assign({}, e));
    const all = {};
    domainHistory.forEach((log, d) => { all[d] = log.map(e => Object.assign({}, e)); });
    return all;
  }

  /**
   * Clear a single domain (same as delete(domain)) or, if called with
   * no arguments, wipe every known domain. The no-argument form is
   * destructive and rarely what you want — logs a warning.
   */
  function clear(domain) {
    if (domain) { del(domain); return; }
    console.warn('[TSMRelay] clear() called with no domain — wiping ALL relay state.');
    Array.from(knownDomains).forEach(d => del(d));
  }

  /** List every domain that has been written to on this page. */
  function domains() {
    return Array.from(knownDomains);
  }

  const TSMRelay = {
    write,
    read,
    merge,
    delete: del,
    watch,
    unwatch,
    export: exportState,
    import: importState,
    history: getHistory,
    clear,
    domains
  };

  global.TSMRelay = TSMRelay;

  // Backward-compat shim: only install window.TSM.relay if nothing has
  // already claimed it (i.e. relay.core.js isn't loaded on this page).
  // Never overwrite an existing implementation.
  global.TSM = global.TSM || {};
  if (!global.TSM.relay) {
    global.TSM.relay = { write, read };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TSMRelay;
  }
})(typeof window !== 'undefined' ? window : globalThis);