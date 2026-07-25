/**
 * tsm-enterprise-runtime.js
 * Single bootstrap script. Include this ONE tag on a page to get the
 * whole Phase 11 runtime layer, in the correct load order.
 *
 * <script src="/html/shared/runtime/tsm-enterprise-runtime.js"></script>
 *
 * This file is just a documented load-order guide for a bundler/build step,
 * OR — if you have no bundler — replace this file's contents with the
 * concatenation of the five modules below in this exact order:
 *   1. runtime-events.js     (no deps)
 *   2. runtime-state.js      (uses RuntimeEvents if present)
 *   3. runtime-registry.js   (uses RuntimeEvents if present)
 *   4. runtime-health.js     (uses RuntimeRegistry)
 *   5. runtime-migration.js  (uses RuntimeState)
 *
 * Simplest zero-build option: keep the five <script> tags below.
 */
document.write(
  '<script src="/html/shared/runtime/runtime-events.js"></script>' +
  '<script src="/html/shared/runtime/runtime-state.js"></script>' +
  '<script src="/html/shared/runtime/runtime-registry.js"></script>' +
  '<script src="/html/shared/runtime/runtime-health.js"></script>' +
  '<script src="/html/shared/runtime/runtime-migration.js"></script>'
);
