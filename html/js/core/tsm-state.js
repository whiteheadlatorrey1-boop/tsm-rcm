/**
 * TSM State v1.0
 * Single source of truth for all TSM Shell verticals.
 * Replaces localStorage sprawl -- every slice lives here, mirrored to
 * localStorage for cross-tab/relay continuity only.
 *
 * Must load AFTER tsm-event-bus.js, BEFORE tsm-mission-engine.js and
 * tsm-auto-pipeline.js.
 *
 * Contract (already relied on by tsm-event-bus.js / tsm-mission-engine.js):
 *   TSMState.set(slice, value)            -- replace a top-level slice
 *   TSMState.update(slice, patch)         -- shallow-merge into a slice (object) or replace (primitive)
 *   TSMState.push(collection, entry)      -- append to an array slice (creates it if missing)
 *   TSMState.get(slice)                   -- read a slice
 *   TSMState.getAll()                     -- read entire store
 *   TSMState.reset()                      -- clear everything, emits STATE_RESET
 *
 * Every mutation emits STATE_CHANGED { slice, prev, next } on TSMBus (if present).
 */

(function (global) {
  'use strict';

  // Same duplicate-<script>-tag problem as tsm-event-bus.js: several pages
  // load this 2-3 times. Re-running would rebuild _store from localStorage
  // (mostly harmless) but is still wasted work and re-registers nothing
  // useful, so skip cleanly on repeat load.
  if (global.TSMState && global.TSMState.__tsmStateReady) {
    console.info('[TSMState] Already initialized — skipping duplicate load.');
    return;
  }

  const STORAGE_KEY = 'tsm_state_v1';

  function _bus() {
    return global.TSMBus || global.TSMEventBus || null;
  }

  function _clone(obj) {
    try { return JSON.parse(JSON.stringify(obj)); } catch { return obj; }
  }

  function _load() {
    try {
      const raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[TSMState] Failed to load persisted state:', e.message);
      return {};
    }
  }

  function _persist() {
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, JSON.stringify(_store));
    } catch (e) {
      // Quota exceeded or private mode -- state still works in-memory, just not persisted.
      console.warn('[TSMState] Failed to persist state:', e.message);
    }
  }

  let _store = _load();

  function _emitChange(slice, prev, next) {
    const bus = _bus();
    if (bus && typeof bus.emit === 'function') {
      bus.emit('STATE_CHANGED', { slice, prev: _clone(prev), next: _clone(next) });
    }
  }

  // ── Core API ──────────────────────────────────────────────────────────────

  function set(slice, value) {
    const prev = _store[slice];
    _store[slice] = value;
    _persist();
    _emitChange(slice, prev, value);
    return _clone(value);
  }

  function update(slice, patch) {
    const prev = _store[slice];
    let next;
    if (patch !== null && typeof patch === 'object' && !Array.isArray(patch) &&
        prev !== null && typeof prev === 'object' && !Array.isArray(prev)) {
      next = Object.assign({}, prev, patch);
    } else {
      next = patch;
    }
    _store[slice] = next;
    _persist();
    _emitChange(slice, prev, next);
    return _clone(next);
  }

  function push(collection, entry) {
    if (!Array.isArray(_store[collection])) _store[collection] = [];
    const prev = _store[collection].slice();
    _store[collection].push(entry);
    _persist();
    _emitChange(collection, prev, _store[collection]);
    return _clone(entry);
  }

  function get(slice) {
    return _clone(_store[slice]);
  }

  function getAll() {
    return _clone(_store);
  }

  function has(slice) {
    return Object.prototype.hasOwnProperty.call(_store, slice);
  }

  function remove(slice) {
    if (!has(slice)) return false;
    const prev = _store[slice];
    delete _store[slice];
    _persist();
    _emitChange(slice, prev, undefined);
    return true;
  }

  function reset() {
    _store = {};
    _persist();
    const bus = _bus();
    if (bus && typeof bus.emit === 'function') bus.emit('STATE_RESET', { ts: Date.now() });
  }

  // ── Debug ─────────────────────────────────────────────────────────────────
  function debug() {
    console.group('[TSMState] Current store');
    Object.keys(_store).forEach(k => {
      const v = _store[k];
      const summary = Array.isArray(v) ? `array(${v.length})` : typeof v;
      console.log(`  ${k}: ${summary}`);
    });
    console.groupEnd();
  }

  // ── Expose ────────────────────────────────────────────────────────────────
  global.TSMState = { set, update, push, get, getAll, has, remove, reset, debug, __tsmStateReady: true };

  console.info('[TSMState] State v1.0 initialized.', Object.keys(_store).length ? `(restored ${Object.keys(_store).length} slice(s))` : '(fresh)');

})(window);
