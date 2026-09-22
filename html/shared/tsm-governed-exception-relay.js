'use strict';

/*
 * TSM Governed Exception Relay v1.0
 * --------------------------------------------------------------------------
 * Shared gating helper for "relay this exception/incident to BPO" call
 * sites across vertical portals and war rooms.
 *
 * Extracted from the pattern already shipped and tested in
 * html/finops-suite/tsm-rcm-os.html's relayCriticalExceptionsToBPO()
 * (see scripts/test-rcm-os-exception-relay.js): never guess a tenant.
 *
 *   no active member  -> no BPO write, no invented tenant. Whatever
 *                        rendered the exception/incident on screen already
 *                        happened; this only gates the BPO side-effect.
 *   active member     -> a real BPO work item is created/updated via
 *                        TSMBpoRelay.relayToBPO, PENDING (stage:
 *                        ready-for-review) until a human approves it,
 *                        exactly like every other governed work item.
 *                        This function never executes anything itself.
 *
 * clientId resolution matches the established, already-shipped pattern:
 * the active member id is passed straight through as the BPO clientId
 * (same as RCM-OS's relayCriticalExceptionsToBPO). There is no browser-
 * facing tenantId->clientId lookup endpoint anywhere in this codebase to
 * call instead -- the one real precedent (tsmLedger.bpoGetClientByTenantId)
 * is server-side-only, inside POST /api/exec-portal/:vertical/decide, and
 * is not exposed as a route a page like this could call.
 *
 * Each caller supplies its own idempotency cache key (localStorage-backed)
 * since callers differ in what "already relayed" means for them (RCM-OS:
 * per-anomaly id; Honeywell strategist: per-domain, one active incident).
 *
 * Exposes:
 *   TSMGovernedExceptionRelay.relayGovernedException(pkg, options) -> void
 *     pkg     : the delivery package to relay (same shape TSMBpoRelay.
 *               relayToBPO expects -- must have a `domain`).
 *     options.vertical      : string, defaults to pkg.domain.
 *     options.caseId        : string, required -- the stable case id this
 *                              exception/incident relays as.
 *     options.sourceSystem  : string, recorded on the relayed package.
 *     options.cacheKey      : string, required -- localStorage key this
 *                              caller's dedup cache lives under.
 *     options.stage/status  : forwarded to relayToBPO, default
 *                              'ready-for-review' / 'open'.
 *
 * Fire-and-forget, same calling convention as relayCriticalExceptionsToBPO:
 * callers do not await this: a relay failure is logged (console.warn) and
 * never surfaces as an unhandled rejection or blocks the caller's own UI.
 * ========================================================================== */

(function (global) {
  'use strict';

  function readCache(cacheKey) {
    try {
      return JSON.parse(global.localStorage.getItem(cacheKey) || '{}');
    } catch (e) {
      return {};
    }
  }

  function writeCache(cacheKey, cache) {
    try {
      global.localStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (e) {
      /* best-effort, same as sibling shared engines */
    }
  }

  function relayGovernedException(pkg, options) {
    options = options || {};

    if (!(global.TSMActiveMember && global.TSMBpoRelay)) {
      console.warn('Active Member layer or BPO relay not loaded — skipping governed exception relay.');
      return;
    }

    if (!options.caseId) {
      console.warn('TSMGovernedExceptionRelay.relayGovernedException requires options.caseId — skipping.');
      return;
    }

    if (!options.cacheKey) {
      console.warn('TSMGovernedExceptionRelay.relayGovernedException requires options.cacheKey — skipping.');
      return;
    }

    const memberId = global.TSMActiveMember.getId();
    if (!memberId) return; // no active member selected -- never guess the tenant

    const cache = readCache(options.cacheKey);
    if (cache[options.caseId] === memberId) return; // already relayed to this member

    const vertical = options.vertical || pkg.domain || 'unknown';

    global.TSMBpoRelay.relayToBPO(pkg, memberId, {
      vertical: vertical,
      caseId: options.caseId,
      sourceSystem: options.sourceSystem || 'tsm-governed-exception-relay',
      stage: options.stage || 'ready-for-review',
      status: options.status || 'open'
    }).then(function () {
      cache[options.caseId] = memberId;
      writeCache(options.cacheKey, cache);
    }).catch(function (relayErr) {
      console.warn('Governed exception relay failed for', options.caseId, relayErr);
    });
  }

  const api = { relayGovernedException: relayGovernedException };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.TSMGovernedExceptionRelay = api;
  }
})(typeof window !== 'undefined' ? window : global);
