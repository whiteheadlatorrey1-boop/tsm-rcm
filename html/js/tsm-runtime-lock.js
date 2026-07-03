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

  function scanObject(obj, path = "root") {
    if (!obj || typeof obj !== "object") return;

    Object.keys(obj).forEach(key => {
      const value = obj[key];

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

      if (typeof value === "object") {
        scanObject(value, path + "." + key);
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
