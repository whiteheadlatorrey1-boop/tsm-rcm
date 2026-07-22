/**
 * runtime-health.js
 * Client-side helper that pages can call to self-report their own
 * migration status into RuntimeRegistry, so runtime-health-report.js
 * (the Node script) has richer data if it's ever wired to a live export.
 * This file intentionally does very little — the real analysis happens
 * statically in scripts/runtime-health-report.js by scanning source files.
 */
(function (global) {
  function reportSelf(page, details) {
    if (global.RuntimeRegistry) {
      global.RuntimeRegistry.register(Object.assign({ page }, details));
    }
  }
  global.RuntimeHealth = { reportSelf };
})(typeof window !== 'undefined' ? window : globalThis);
