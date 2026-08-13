/**
 * TSM HITL Approval Gate v1.0
 * --------------------------------------------------------------------------
 * BPO Enterprise Roadmap #4 — Human-in-the-Loop standardization.
 *
 * Generalizes the two-step approve/reject + audit-trail pattern already
 * proven in html/mdm-suite (server.js's /api/mdm/recommendations/:id/approve
 * and /reject routes) into a shared factory any vertical can adopt, instead
 * of every domain hand-rolling its own decision-log shape.
 *
 * What this replaces: a one-step "resolve" (like the pre-existing
 * /api/governance/risk/:id/resolve) collapses AI-flagged findings straight
 * to a terminal state with no record of who decided, or whether it was
 * approved vs. rejected. A real HITL gate needs both an actor and an
 * explicit decision, recorded before the underlying state changes.
 *
 * Usage (Node/server.js):
 *   const { createGate } = require('./html/shared/tsm-hitl-gate.js');
 *   const governanceGate = createGate('GOV');
 *   governanceGate.recordDecision({ entityId: risk.id, entityType: 'risk',
 *     decision: 'APPROVED', actor: 'Compliance Lead', meta: { severity: risk.severity } });
 *   governanceGate.getLog(50); // most-recent-first audit trail
 *
 * Works in both the browser and Node (same dual-environment pattern as
 * tsm-quality-score-engine.js / tsm-war-room-registry.js), so a vertical's
 * war-room UI can also import this directly for client-side decision
 * formatting without duplicating the shape.
 * ========================================================================== */

(function (global) {
  'use strict';

  /**
   * createGate(idPrefix, persistence)
   * idPrefix: short domain tag used in generated decision ids, e.g. 'GOV',
   * 'IHUB'. Purely cosmetic/traceability for the id, but also the key a
   * persistence adapter (if supplied) partitions storage by, so it's not
   * purely cosmetic once persistence is wired up.
   *
   * persistence (optional): { write(entry): Promise, readAll(): Promise<entry[]> }.
   * Deliberately NOT baked into this file as a require('mongodb') or any
   * other Node-only dependency -- this file is loaded directly in the
   * browser too (client-side decision formatting), so the caller (e.g.
   * server.js) builds a small adapter around whatever store it wants and
   * passes it in. Omit it entirely to get the original in-memory-only
   * behavior unchanged.
   *
   * Returns an independent gate instance with its own in-memory decision
   * log, which remains the synchronous source of truth for getLog/
   * getStats/hasDecision -- recordDecision still returns immediately, it
   * does not wait on persistence. If a persistence adapter is supplied,
   * writes are additionally fired at it in the background (errors are
   * logged, not thrown, so a slow/down database never breaks a decision
   * request), and hydrate() can be called once at startup to load prior
   * history back into decisionLog before the process starts recording
   * new decisions.
   *
   * Each call to createGate() is a fresh log; callers that need a
   * singleton (e.g. one governance-wide log for the life of the server
   * process) should create the gate once at module load and reuse it,
   * the same way MDM_RECOMMENDATION_DECISIONS is a single array in server.js.
   */
  function createGate(idPrefix, persistence) {
    var prefix = idPrefix || 'HITL';
    var decisionLog = [];
    var persist = persistence || null;

    function decisionId() {
      return prefix + '-DEC-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    }

    /**
     * recordDecision({ entityId, entityType, decision, actor, meta })
     * entityId: id of the thing being decided on (risk id, recommendation
     *   id, exception id, etc.)
     * entityType: short label for what kind of thing it is, e.g. 'risk',
     *   'exception', 'merge'.
     * decision: 'APPROVED' | 'REJECTED'. Any other value is rejected here
     *   (not silently stored), so a caller typo doesn't corrupt the log.
     * actor: human/system identity making the decision. Defaults to
     *   'Unassigned' to match the MDM pattern, rather than throwing --
     *   a HITL gate that requires an actor to even function would block
     *   legitimate approvals from environments where actor isn't wired up
     *   yet, and 'Unassigned' is itself a visible audit signal.
     * meta: optional free-form object for domain-specific context
     *   (severity, amount, vertical, etc.) carried alongside the decision.
     */
    function recordDecision(opts) {
      opts = opts || {};
      if (opts.decision !== 'APPROVED' && opts.decision !== 'REJECTED') {
        throw new Error("recordDecision requires decision: 'APPROVED' or 'REJECTED', got: " + opts.decision);
      }
      if (!opts.entityId) {
        throw new Error('recordDecision requires entityId');
      }
      var entry = {
        id: decisionId(),
        entityId: opts.entityId,
        entityType: opts.entityType || null,
        decision: opts.decision,
        actor: opts.actor || 'Unassigned',
        ts: new Date().toISOString(),
        meta: opts.meta || null
      };
      decisionLog.push(entry);
      if (persist && typeof persist.write === 'function') {
        // Fire-and-forget: the in-memory log (and therefore the response
        // to the caller) is never blocked on the database. A write failure
        // here means this decision is durable-in-process but not yet on
        // disk -- logged so it's visible in server logs, not silently lost.
        Promise.resolve(persist.write(entry)).catch(function (e) {
          console.error('[TSMHitlGate:' + prefix + '] persist write failed for ' + entry.id + ':', e && e.message);
        });
      }
      return entry;
    }

    /**
     * hydrate(): loads previously-persisted decisions back into
     * decisionLog. Meant to be called once at process startup, before the
     * gate starts taking new decisions, so a server restart doesn't present
     * an empty audit trail for entities that were actually decided days
     * ago. No-op (resolves to 0) if no persistence adapter was supplied.
     * Safe to call more than once -- entries already present (matched by
     * id) are not duplicated.
     */
    function hydrate() {
      if (!persist || typeof persist.readAll !== 'function') return Promise.resolve(0);
      return Promise.resolve(persist.readAll()).then(function (entries) {
        var seen = {};
        decisionLog.forEach(function (d) { seen[d.id] = true; });
        var added = 0;
        (entries || []).forEach(function (e) {
          if (!seen[e.id]) { decisionLog.push(e); seen[e.id] = true; added++; }
        });
        // Persisted entries may interleave with anything recorded between
        // process start and hydrate() resolving; keep decisionLog in the
        // same oldest-first order getLog()/getStats() assume.
        decisionLog.sort(function (a, b) { return new Date(a.ts) - new Date(b.ts); });
        return added;
      }).catch(function (e) {
        console.error('[TSMHitlGate:' + prefix + '] hydrate failed:', e && e.message);
        return 0;
      });
    }

    /** getLog(limit): most-recent-first, capped at `limit` (default 200). */
    function getLog(limit) {
      return decisionLog.slice(-1 * (limit || 200)).reverse();
    }

    /** hasDecision(entityId): true once an entity has any recorded decision. */
    function hasDecision(entityId) {
      return decisionLog.some(function (d) { return d.entityId === entityId; });
    }

    function approvalRateOf(entries) {
      if (!entries.length) return null;
      var approved = entries.filter(function (d) { return d.decision === 'APPROVED'; }).length;
      return Math.round((approved / entries.length) * 1000) / 10;
    }

    /**
     * getStats(opts): executive-facing rollup of the decision log, built for
     * the exec-portal "improvement rate" tiles (approve vs. reject trend
     * over time, not just a point-in-time count).
     *
     * windowSize: how many of the most recent decisions count as the
     *   "recent" period, compared against the equal-size period immediately
     *   before it. Defaults to half the log (min 1) so it self-scales with
     *   however much history exists, rather than assuming a fixed lookback
     *   that might be empty on a fresh log.
     *
     * improvementRate is the percentage-point delta between the recent
     * period's approval rate and the prior period's (positive = approvals
     * trending up, negative = trending down). null when there isn't a full
     * prior period yet to compare against.
     */
    function getStats(opts) {
      opts = opts || {};
      var total = decisionLog.length;
      var approved = decisionLog.filter(function (d) { return d.decision === 'APPROVED'; }).length;
      var rejected = total - approved;
      var approvalRate = approvalRateOf(decisionLog);

      var windowSize = opts.windowSize || Math.max(1, Math.floor(total / 2));
      var recent = decisionLog.slice(-windowSize);
      var priorEnd = total - windowSize;
      var prior = decisionLog.slice(Math.max(0, priorEnd - windowSize), priorEnd);

      var recentRate = approvalRateOf(recent);
      var priorRate = approvalRateOf(prior);
      var improvementRate = (recentRate !== null && priorRate !== null)
        ? Math.round((recentRate - priorRate) * 10) / 10
        : null;

      return {
        total: total,
        approved: approved,
        rejected: rejected,
        approvalRate: approvalRate,
        recentRate: recentRate,
        priorRate: priorRate,
        improvementRate: improvementRate,
        windowSize: windowSize
      };
    }

    return {
      recordDecision: recordDecision,
      getLog: getLog,
      hasDecision: hasDecision,
      getStats: getStats,
      hydrate: hydrate,
      decisionLog: decisionLog
    };
  }

  var TSMHitlGate = { createGate: createGate };

  global.TSMHitlGate = TSMHitlGate;
  if (typeof module !== 'undefined' && module.exports) module.exports = TSMHitlGate;

})(typeof window !== 'undefined' ? window : this);

// ── Self-test (run directly with `node tsm-hitl-gate.js`) ─────────────────
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var Gate = module.exports;
  var g = Gate.createGate('TEST');

  console.log('[approve]', JSON.stringify(g.recordDecision({
    entityId: 'risk-1', entityType: 'risk', decision: 'APPROVED', actor: 'Compliance Lead', meta: { severity: 82 }
  }), null, 2));

  console.log('[reject]', JSON.stringify(g.recordDecision({
    entityId: 'risk-2', entityType: 'risk', decision: 'REJECTED', actor: 'Compliance Lead'
  }), null, 2));

  console.log('[hasDecision risk-1]', g.hasDecision('risk-1'));
  console.log('[hasDecision risk-99]', g.hasDecision('risk-99'));
  console.log('[log]', JSON.stringify(g.getLog(10), null, 2));
  console.log('[stats]', JSON.stringify(g.getStats(), null, 2));

  try {
    g.recordDecision({ entityId: 'risk-3', decision: 'MAYBE' });
    console.log('[ERROR] bad decision value should have thrown');
  } catch (e) {
    console.log('[validation ok]', e.message);
  }

  // ── Persistence adapter smoke test ──────────────────────────────────────
  // Fakes what server/tsm-ledger-service.js + server.js's adapter wiring do,
  // without needing a real MongoDB connection, to prove write-on-record and
  // hydrate-on-restart both work end to end.
  (async function () {
    var fakeStore = []; // stand-in for the hitl_decisions collection
    var writeCalls = 0;
    var adapter = {
      write: function (entry) {
        writeCalls++;
        fakeStore.push(entry);
        return Promise.resolve();
      },
      readAll: function () {
        return Promise.resolve(fakeStore.slice());
      }
    };

    var gateA = Gate.createGate('PTEST', adapter);
    gateA.recordDecision({ entityId: 'e-1', entityType: 'risk', decision: 'APPROVED', actor: 'Tester' });
    gateA.recordDecision({ entityId: 'e-2', entityType: 'risk', decision: 'REJECTED', actor: 'Tester' });

    // recordDecision's persist call is fire-and-forget; give the
    // microtask queue a tick so writeCalls reflects both writes before
    // asserting against it.
    await new Promise(function (r) { setTimeout(r, 0); });
    console.log('[persist write count]', writeCalls, writeCalls === 2 ? 'OK' : 'MISMATCH');
    console.log('[fake store size]', fakeStore.length, fakeStore.length === 2 ? 'OK' : 'MISMATCH');

    // Simulate a server restart: fresh gate, same underlying store, then
    // hydrate() should repopulate decisionLog from what was "persisted".
    var gateB = Gate.createGate('PTEST', adapter);
    console.log('[pre-hydrate log length]', gateB.getLog(10).length, gateB.getLog(10).length === 0 ? 'OK' : 'MISMATCH');
    var added = await gateB.hydrate();
    console.log('[hydrate added]', added, added === 2 ? 'OK' : 'MISMATCH');
    console.log('[post-hydrate log length]', gateB.getLog(10).length, gateB.getLog(10).length === 2 ? 'OK' : 'MISMATCH');

    // hydrate() called twice must not duplicate entries.
    var addedAgain = await gateB.hydrate();
    console.log('[re-hydrate added]', addedAgain, addedAgain === 0 ? 'OK' : 'MISMATCH');
    console.log('[log length after re-hydrate]', gateB.getLog(10).length, gateB.getLog(10).length === 2 ? 'OK' : 'MISMATCH');

    // A gate created with no adapter at all must behave exactly as before.
    var gateC = Gate.createGate('NOPERSIST');
    gateC.recordDecision({ entityId: 'e-3', decision: 'APPROVED', actor: 'Tester' });
    console.log('[no-adapter gate log length]', gateC.getLog(10).length, gateC.getLog(10).length === 1 ? 'OK' : 'MISMATCH');
  })();
}
