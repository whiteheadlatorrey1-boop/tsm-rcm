/**
 * TSM RUNTIME v1 (Phase 1 — additive, non-destructive)
 * ------------------------------------------------------------
 * WHAT THIS IS:
 *   A thin unifying layer that sits ON TOP of the pieces you already
 *   have working (tsm-event-bus.js, tsm-state.js, tsm-mission-engine.js,
 *   tsm-relay-core.js, tsm-auto-pipeline.js). It does NOT replace them,
 *   does NOT remove any existing <script> tags, and does NOT change
 *   any existing behavior.
 *
 * WHAT IT DOES:
 *   - Waits for DOM ready, then checks which of the existing core
 *     pieces are present on THIS page (each page already loads its
 *     own subset via existing script tags — that is untouched).
 *   - Exposes a single window.TSM object as a friendly facade over
 *     whatever is already there (safe no-ops if a piece is missing).
 *   - Gives every domain a common registration point (TSM.registerDomain)
 *     that is purely additive — nothing currently on any page calls
 *     this yet, so adding this script changes nothing until you opt in.
 *   - Emits one 'TSM_RUNTIME_READY' event on the existing bus (if present)
 *     summarizing what's wired up on this page. This is what you show
 *     live in devtools/console during the demo.
 *
 * HOW TO ADD (Phase 1 — safe):
 *   Add this as the LAST script tag on a page, changing nothing else:
 *     <script src="/html/core/tsm-runtime.js"></script>
 *
 * HOW TO ADOPT (Phase 2 — later, opt-in per page, after Monday):
 *   Once verified stable, a page can call TSM.boot({ domain: 'crm', page: 'strategist' })
 *   and eventually drop its old script stack. Not required for Monday.
 *
 * FIX LOG:
 *   2026-07-04 — initial version. Deliberately does not auto-load or
 *   auto-init any domain logic. Read-only/observational on first pass
 *   so it can be added to all war-room/strategist/executive-portal
 *   pages without behavioral risk.
 */

(function (global) {
  'use strict';

  if (global.TSM && global.TSM.__tsmRuntimeVersion) {
    // Already booted on this page (e.g. script included twice) — no-op.
    return;
  }

  const domains = {};
  const startedAt = Date.now();

  function getBus() {
    return global.TSMBus || global.TSMEventBus || null;
  }

  function safeEmit(event, payload) {
    const bus = getBus();
    if (bus && typeof bus.emit === 'function') {
      try { bus.emit(event, payload); } catch (e) { /* never throw from runtime */ }
    }
  }

  function detectPieces() {
    return {
      eventBus: !!getBus(),
      state: !!global.TSMState,
      mission: !!global.TSMMission,
      relayWrite: typeof global.writeRelay === 'function',
      autoPipeline: !!global.TSMAutoPipeline,
    };
  }

  /**
   * Purely additive registry. Nothing calls this today, so registering
   * (or never registering) has zero effect on existing page behavior.
   * This exists so Phase 2 migrations have one common place to hook into.
   */
  function registerDomain(config) {
    if (!config || !config.id) {
      console.warn('[TSM-RUNTIME] registerDomain() called without an id — ignored');
      return;
    }
    domains[config.id] = config;
    safeEmit('TSM_DOMAIN_REGISTERED', { id: config.id, ts: Date.now() });
    if (typeof config.init === 'function') {
      try { config.init(); } catch (e) {
        console.error('[TSM-RUNTIME] domain "' + config.id + '" init() threw:', e);
      }
    }
  }

  /**
   * Phase 2 helper — safe to call even if nothing is registered yet.
   * Currently just logs + emits; does not fetch scripts or redirect.
   */
  function boot(opts) {
    opts = opts || {};
    safeEmit('TSM_BOOT_REQUESTED', { opts, ts: Date.now() });
    const domain = opts.domain && domains[opts.domain];
    if (domain && typeof domain.onBoot === 'function') {
      try { domain.onBoot(opts); } catch (e) {
        console.error('[TSM-RUNTIME] domain "' + opts.domain + '" onBoot() threw:', e);
      }
    }
    return getStatus();
  }

  function getStatus() {
    return {
      version: '1.0.0-phase1',
      uptimeMs: Date.now() - startedAt,
      pieces: detectPieces(),
      registeredDomains: Object.keys(domains),
      page: global.location ? global.location.pathname : null,
    };
  }

  function health() {
    const pieces = detectPieces();
    const missing = Object.keys(pieces).filter((k) => !pieces[k]);
    return { ok: missing.length === 0, missing, pieces };
  }

  // IMPORTANT: do not overwrite window.TSM — other scripts that load
  // earlier (e.g. relay.core.js) attach things like TSM.relay onto it.
  // Since this runtime is deliberately loaded LAST on every page, a
  // plain assignment here would silently clobber that. Merge instead.
  global.TSM = global.TSM || {};
  Object.assign(global.TSM, {
    __tsmRuntimeVersion: '1.0.0-phase1',
    registerDomain,
    boot,
    getStatus,
    health,
    getBus,
  });

  function announce() {
    const status = getStatus();
    safeEmit('TSM_RUNTIME_READY', status);
    console.log('[TSM-RUNTIME] ready on this page:', status);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', announce);
  } else {
    announce();
  }

})(window);