/**
 * STRICT EVENT CONTRACT (SAFE WRAP)
 */

(function () {
  if (!window.TSMEventBus) {
    window.TSMEventBus = {
      _listeners: {},

      on(event, cb) {
        (this._listeners[event] ||= []).push(cb);
      },

      emit(event, payload) {
        (this._listeners[event] || []).forEach(cb => cb(payload));
      }
    };
  }

  // attach safety wrapper only (DO NOT overwrite core object)
  const originalEmit = window.TSMEventBus.emit;

  window.TSMEventBus.emit = function (event, payload) {
    if (window.__TSM_RUNTIME_LOCK_ACTIVE__ && event === "SIGNAL_SOURCE") {
      console.error("🚨 BLOCKED EMIT:", event);
      return;
    }
    return originalEmit.call(this, event, payload);
  };
})();
