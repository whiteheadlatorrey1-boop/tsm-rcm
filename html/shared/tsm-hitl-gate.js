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
   * createGate(idPrefix)
   * idPrefix: short domain tag used in generated decision ids, e.g. 'GOV',
   * 'IHUB'. Purely cosmetic/traceability -- does not affect behavior.
   *
   * Returns an independent gate instance with its own in-memory decision
   * log. Each call to createGate() is a fresh log; callers that need a
   * singleton (e.g. one governance-wide log for the life of the server
   * process) should create the gate once at module load and reuse it,
   * the same way MDM_RECOMMENDATION_DECISIONS is a single array in server.js.
   */
  function createGate(idPrefix) {
    var prefix = idPrefix || 'HITL';
    var decisionLog = [];

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
      return entry;
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
}
