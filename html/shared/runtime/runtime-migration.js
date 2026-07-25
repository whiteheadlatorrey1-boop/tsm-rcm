/**
 * runtime-migration.js
 * Thin compatibility shim: lets a page read an old relay key AND write
 * through RuntimeState at the same time, so migration can happen without
 * a flag day. Remove a page's use of this once its readers are migrated.
 */
(function (global) {
  function bridgeLegacyKey(legacyKey, stateKey) {
    // One-time: if RuntimeState has nothing yet but the legacy key does,
    // seed it so new readers see the same value immediately.
    try {
      const existing = global.RuntimeState.get(stateKey, undefined);
      if (existing === undefined) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw !== null) {
          let parsed;
          try { parsed = JSON.parse(legacyRaw); } catch (e) { parsed = legacyRaw; }
          global.RuntimeState.set(stateKey, parsed);
        }
      }
    } catch (e) {
      console.warn('[RuntimeMigration] bridge failed for', legacyKey, e);
    }
  }

  function dualWrite(legacyKey, stateKey, value) {
    try { localStorage.setItem(legacyKey, typeof value === 'string' ? value : JSON.stringify(value)); } catch (e) {}
    global.RuntimeState.set(stateKey, value);
  }

  global.RuntimeMigration = { bridgeLegacyKey, dualWrite };
})(typeof window !== 'undefined' ? window : globalThis);
