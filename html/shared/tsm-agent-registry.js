/**
 * TSM Agent Registry v1.0
 * --------------------------------------------------------------------------
 * BPO Enterprise Roadmap #6 — "Every war room gets a named roster of AI
 * agents (Claims Agent, Coding Agent, etc.), not just a generic queue."
 *
 * War rooms already exist per vertical, but there's no concept of a named
 * agent with a role/capability set that work gets assigned to and tracked
 * against. This is that layer -- a roster per domain plus an assignment/
 * workload tracker, following the same createX() factory pattern as
 * tsm-hitl-gate.js's createGate() (independent in-memory instance per
 * call; a caller that wants one process-wide registry creates it once at
 * module load and reuses it, same as MDM_RECOMMENDATION_DECISIONS).
 *
 * DEFAULT_ROSTERS below are starting points per the roadmap doc's examples
 * -- add/rename agents per domain freely, nothing else in this file assumes
 * a fixed roster shape beyond { id, name, role, capabilities }.
 *
 * Works in both the browser and Node (same dual-environment pattern as the
 * rest of html/shared).
 * ========================================================================== */

(function (global) {
  'use strict';

  var DEFAULT_ROSTERS = {
    HEALTHCARE: [
      { id: 'claims-agent', name: 'Claims Agent', role: 'Reviews and appeals denied claims', capabilities: ['denial-analysis', 'appeal-drafting'] },
      { id: 'coding-agent', name: 'Coding Agent', role: 'Validates ICD/CPT coding accuracy', capabilities: ['code-validation', 'compliance-check'] },
      { id: 'eligibility-agent', name: 'Eligibility Agent', role: 'Verifies patient/payer eligibility', capabilities: ['eligibility-check'] }
    ],
    CONSTRUCTION: [
      { id: 'change-order-agent', name: 'Change Order Agent', role: 'Triages and routes change order requests', capabilities: ['co-triage', 'approval-routing'] },
      { id: 'submittal-agent', name: 'Submittal Agent', role: 'Tracks submittal/RFI status against schedule', capabilities: ['submittal-tracking'] },
      { id: 'draw-agent', name: 'Draw Request Agent', role: 'Reviews draw requests against lien waivers', capabilities: ['draw-review', 'lien-check'] }
    ],
    MDM: [
      { id: 'dedupe-agent', name: 'Dedupe Agent', role: 'Identifies and scores duplicate-record candidates', capabilities: ['dedupe-scoring'] },
      { id: 'golden-record-agent', name: 'Golden Record Agent', role: 'Proposes merge/survivorship decisions', capabilities: ['merge-proposal'] }
    ],
    GOVERNANCE: [
      { id: 'risk-agent', name: 'Risk Agent', role: 'Flags and prioritizes policy exceptions', capabilities: ['risk-flagging'] },
      { id: 'audit-agent', name: 'Audit Agent', role: 'Prepares audit-trail packets for review', capabilities: ['audit-prep'] }
    ],
    APPROVAL: [
      { id: 'intake-agent', name: 'Intake Agent', role: 'Pre-screens approval requests for completeness', capabilities: ['pre-screen'] }
    ]
  };

  function assignmentId() {
    return 'ASG-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  }

  /** getRoster(domain) -- read-only lookup, empty array if domain has no defined roster. */
  function getRoster(domain) {
    return (DEFAULT_ROSTERS[domain] || []).slice();
  }

  /** findAgent(domain, agentId) */
  function findAgent(domain, agentId) {
    return getRoster(domain).filter(function (a) { return a.id === agentId; })[0] || null;
  }

  /**
   * createRegistry()
   * Returns an independent registry instance holding assignments + an
   * activity log, distinct from the static DEFAULT_ROSTERS (which is just
   * reference data, same relationship as REFERENCE_BENCHMARKS to
   * aggregate() in tsm-benchmark-intelligence.js).
   */
  function createRegistry() {
    var assignments = []; // { id, domain, agentId, entityId, entityType, status, assignedAt, completedAt }
    var activityLog = [];

    function logEvent(type, payload) {
      activityLog.push(Object.assign({ type: type, ts: new Date().toISOString() }, payload));
    }

    /**
     * assign({ domain, agentId, entityId, entityType })
     * Assigns a piece of work (a claim, a case, a record) to a named agent.
     * Throws if the agent isn't in that domain's roster -- catches typos
     * early rather than silently tracking work against a nonexistent agent.
     */
    function assign(opts) {
      opts = opts || {};
      if (!opts.domain || !opts.agentId) throw new Error('assign requires domain and agentId');
      var agent = findAgent(opts.domain, opts.agentId);
      if (!agent) throw new Error('Unknown agent "' + opts.agentId + '" for domain ' + opts.domain);

      var entry = {
        id: assignmentId(),
        domain: opts.domain,
        agentId: opts.agentId,
        agentName: agent.name,
        entityId: opts.entityId || null,
        entityType: opts.entityType || null,
        status: 'IN_PROGRESS',
        assignedAt: new Date().toISOString(),
        completedAt: null
      };
      assignments.push(entry);
      logEvent('ASSIGNED', { assignmentId: entry.id, domain: entry.domain, agentId: entry.agentId });
      return entry;
    }

    /** complete(assignmentId, outcome) -- outcome: 'RESOLVED' | 'ESCALATED' (default 'RESOLVED'). */
    function complete(assignmentId, outcome) {
      var entry = assignments.filter(function (a) { return a.id === assignmentId; })[0];
      if (!entry) return null;
      entry.status = outcome || 'RESOLVED';
      entry.completedAt = new Date().toISOString();
      logEvent('COMPLETED', { assignmentId: entry.id, status: entry.status });
      return entry;
    }

    /** getWorkload(domain) -- open (IN_PROGRESS) assignment count per agent, zero-filled for the full roster. */
    function getWorkload(domain) {
      var roster = getRoster(domain);
      return roster.map(function (agent) {
        var open = assignments.filter(function (a) {
          return a.domain === domain && a.agentId === agent.id && a.status === 'IN_PROGRESS';
        }).length;
        var completed = assignments.filter(function (a) {
          return a.domain === domain && a.agentId === agent.id && a.status !== 'IN_PROGRESS';
        }).length;
        return { agentId: agent.id, agentName: agent.name, role: agent.role, openAssignments: open, completedAssignments: completed };
      });
    }

    /** getAssignments(filter) -- filter: { domain, agentId, status } (all optional). */
    function getAssignments(filter) {
      filter = filter || {};
      return assignments.filter(function (a) {
        if (filter.domain && a.domain !== filter.domain) return false;
        if (filter.agentId && a.agentId !== filter.agentId) return false;
        if (filter.status && a.status !== filter.status) return false;
        return true;
      });
    }

    function getActivityLog(limit) {
      return activityLog.slice(-1 * (limit || 200)).reverse();
    }

    return {
      assign: assign,
      complete: complete,
      getWorkload: getWorkload,
      getAssignments: getAssignments,
      getActivityLog: getActivityLog,
      assignments: assignments
    };
  }

  var TSMAgentRegistry = {
    DEFAULT_ROSTERS: DEFAULT_ROSTERS,
    getRoster: getRoster,
    findAgent: findAgent,
    createRegistry: createRegistry
  };

  global.TSMAgentRegistry = TSMAgentRegistry;
  if (typeof module !== 'undefined' && module.exports) module.exports = TSMAgentRegistry;

})(typeof window !== 'undefined' ? window : this);

// ── Self-test (run directly with `node tsm-agent-registry.js`) ────────────
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var Registry = module.exports;

  console.log('[HEALTHCARE roster]', JSON.stringify(Registry.getRoster('HEALTHCARE'), null, 2));

  var reg = Registry.createRegistry();
  var a1 = reg.assign({ domain: 'HEALTHCARE', agentId: 'claims-agent', entityId: 'CASE-104', entityType: 'claim' });
  var a2 = reg.assign({ domain: 'HEALTHCARE', agentId: 'claims-agent', entityId: 'CASE-105', entityType: 'claim' });
  reg.assign({ domain: 'HEALTHCARE', agentId: 'coding-agent', entityId: 'CASE-106', entityType: 'claim' });
  reg.complete(a1.id, 'RESOLVED');

  console.log('[workload]', JSON.stringify(reg.getWorkload('HEALTHCARE'), null, 2));
  console.log('[open assignments]', JSON.stringify(reg.getAssignments({ status: 'IN_PROGRESS' }), null, 2));
  console.log('[activity log]', JSON.stringify(reg.getActivityLog(10), null, 2));

  try {
    reg.assign({ domain: 'HEALTHCARE', agentId: 'nonexistent-agent', entityId: 'X' });
    console.log('[ERROR] unknown agent should have thrown');
  } catch (e) {
    console.log('[validation ok]', e.message);
  }
}