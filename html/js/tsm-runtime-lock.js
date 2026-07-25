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

  const MAX_SCAN_DEPTH = 12; // defensive cap — this sweep walks all of window every 5s;
                              // as more TSM namespaces attach to window, an unbounded walk
                              // gets strictly more expensive. 12 is generously deep for any
                              // legitimate config/state object this lock is meant to police.

  function scanObject(obj, path = "root", seen = new WeakSet(), depth = 0) {
    if (!obj || typeof obj !== "object") return;
    if (depth > MAX_SCAN_DEPTH) return;

    // Cycle guard — window and DOM nodes are self-referential
    // (window.window, window.self, node.ownerDocument, etc.) — without
    // this, scanning window recurses forever and blows the call stack.
    if (seen.has(obj)) return;
    seen.add(obj);

    // Skip DOM nodes entirely — huge, cyclic, and not what this lock polices.
    if (typeof Node !== "undefined" && obj instanceof Node) return;

    Object.keys(obj).forEach(key => {
      let value;
      try {
        value = obj[key];
      } catch (e) {
        return; // some getters throw (e.g. cross-origin frames)
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
        scanObject(value, path + "." + key, seen, depth + 1);
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
    scanObject(window, "root", new WeakSet());
  }

  // Run on load + interval safety sweep
  window.addEventListener("load", enforce);

  setInterval(enforce, 5000);

  window.TSM_RUNTIME_LOCK = {
    enforce
  };
})();

window.__TSM_RUNTIME_LOCK_ACTIVE__ = true;