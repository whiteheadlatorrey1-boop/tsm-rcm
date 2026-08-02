/**
 * runtime-state.js
 * The ONLY supported API for shared cross-page state going forward.
 *
 * Internally still backed by localStorage today (that's fine — the point
 * of this layer is the seam, not a rewrite of the storage engine). Pages
 * should stop calling localStorage.setItem/getItem directly and go through
 * RuntimeState.set/get instead, so we have one place to change later.
 *
 * Namespacing: keys are dot-paths, e.g. "mission.current", "finops.queue".
 * Internally stored under a single prefixed localStorage key per namespace
 * root, to avoid re-creating hundreds of raw TSM_* keys.
 */
(function (global) {
  const STORAGE_PREFIX = 'RTSTATE::';

  function rootOf(key) {
    return key.split('.')[0];
  }

  function readRoot(root) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + root);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[RuntimeState] failed to read root', root, e);
      return {};
    }
  }

  function writeRoot(root, obj) {
    try {
      localStorage.setItem(STORAGE_PREFIX + root, JSON.stringify(obj));
    } catch (e) {
      console.warn('[RuntimeState] failed to write root', root, e);
    }
  }

  function set(key, value) {
    const root = rootOf(key);
    const data = readRoot(root);
    const rest = key.split('.').slice(1);
    if (rest.length === 0) {
      writeRoot(root, value);
    } else {
      let cursor = data;
      for (let i = 0; i < rest.length - 1; i++) {
        cursor[rest[i]] = cursor[rest[i]] || {};
        cursor = cursor[rest[i]];
      }
      cursor[rest[rest.length - 1]] = value;
      writeRoot(root, data);
    }
    if (global.RuntimeEvents) {
      global.RuntimeEvents.publish('STATE_CHANGED', { key, value });
    }
  }

  function get(key, fallback) {
    const root = rootOf(key);
    const data = readRoot(root);
    const rest = key.split('.').slice(1);
    let cursor = data;
    for (const segment of rest) {
      if (cursor == null) return fallback;
      cursor = cursor[segment];
    }
    return cursor === undefined ? fallback : cursor;
  }

  function remove(key) {
    const root = rootOf(key);
    const rest = key.split('.').slice(1);
    if (rest.length === 0) {
      localStorage.removeItem(STORAGE_PREFIX + root);
      return;
    }
    const data = readRoot(root);
    let cursor = data;
    for (let i = 0; i < rest.length - 1; i++) {
      if (cursor[rest[i]] === undefined) return;
      cursor = cursor[rest[i]];
    }
    delete cursor[rest[rest.length - 1]];
    writeRoot(root, data);
  }

  global.RuntimeState = { set, get, remove };
})(typeof window !== 'undefined' ? window : globalThis);
