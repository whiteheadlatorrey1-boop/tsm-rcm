/**
 * TSM Runtime Lock Layer
 * Prevents architectural corruption patterns at runtime.
 */

(function () {
  "use strict";

  const bannedPatterns = [
    ".window.TSMEventBus",
    "window.TSMMissionStore.window",
    "this.window.TSMEventBus",
    ".emit(\"SIGNAL\" ) {",   // malformed method injection pattern
  ];

  const MAX_DEPTH = 12; // safety cap in addition to cycle detection

  function scanObject(obj, path = "root", visited = new WeakSet(), depth = 0) {
    if (!obj || typeof obj !== "object") return;
    if (depth > MAX_DEPTH) return;

    // Cycle guard: window, DOM nodes, and many host objects reference
    // themselves or their ancestors (window.window, node.parentNode, etc).
    // Without this, recursion never terminates.
    if (visited.has(obj)) return;
    visited.add(obj);

    let keys;
    try {
      keys = Object.keys(obj);
    } catch (e) {
      return; // some host objects throw on property access
    }

    keys.forEach(key => {
      let value;
      try {
        value = obj[key];
      } catch (e) {
        return; // some getters throw (e.g. cross-origin frame access)
      }

      if (typeof value === "function") {
        const fnStr = value.toString();

        bannedPatterns.forEach(p => {
          if (fnStr.includes(p)) {
            console.error("🚨 TSM RUNTIME LOCK VIOLATION:", {
              pattern: p,
              path,
              key
            });
          }
        });
      }

      if (value && typeof value === "object") {
        scanObject(value, path + "." + key, visited, depth + 1);
      }
    });
  }

  function freezeGlobals() {
    // Prevent accidental reassignment of core bus
    if (window.TSMEventBus) {
      Object.freeze(window.TSMEventBus);
    }

    if (window.TSMMissionEngine) {
      Object.freeze(window.TSMMissionEngine);
    }

    if (window.TSMMissionStore) {
      Object.freeze(window.TSMMissionStore);
    }
  }

  function enforce() {
    freezeGlobals();
    scanObject(window);
  }

  // Run on load + interval safety sweep
  window.addEventListener("load", enforce);

  setInterval(enforce, 5000);

  window.TSM_RUNTIME_LOCK = {
    enforce
  };
})();

window.__TSM_RUNTIME_LOCK_ACTIVE__ = true;