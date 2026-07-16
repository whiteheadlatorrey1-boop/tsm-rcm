/**
 * TSM Agent Registry v1.0
 * --------------------------------------------------------------------------
 * BPO Enterprise Roadmap #6 — "AI Agents Per War Room."
 *
 * Every vertical already produces a flat list of findings via
 * getExplainItems() (see tsm-exec-framework.js), which then feeds
 * TSMQualityScoreEngine (#2), TSMProcessMining (#5), etc. What's missing is
 * attribution: right now a finding is just "a finding" — there's no sense
 * of which specialized concern surfaced it (a claims issue vs. a coding
 * issue vs. a denial pattern), which is what the roadmap's "Claims Agent /
 * Coding Agent / Denial Agent" language is really asking for.
 *
 * This does NOT introduce separate AI models or processes per agent — that
 * would duplicate infrastructure this platform already has (one
 * getExplainItems() call per war room). Instead, an "agent" here is a named,
 * scoped classifier function: given the same findings a war room already
 * produces, each agent's run() picks out and owns the subset that matches
 * its concern, tags them with { agentId, agentLabel }, and the registry
 * rolls the tagged findings back into one array — a drop-in replacement
 * for a bare getExplainItems() array anywhere downstream (Quality Score,
 * Process Mining, the Executive Outcome View in tsm-executive-outcome.js,
 * unchanged).
 *
 * Usage:
 *   TSMAgentRegistry.registerRoster('healthcare-war-room', [
 *     { id: 'claims', label: 'Claims Agent', match: it => /claim/i.test(it.claim) },
 *     ...
 *   ]);
 *   const tagged = TSMAgentRegistry.run('healthcare-war-room', explainItems);
 *   // tagged -> same items, each with .agentId / .agentLabel added,
 *   // ready for TSMQualityScoreEngine.fromExplainItems(tagged)
 *
 * Default rosters below are seeded for the three verticals named in the
 * BPO Enterprise Roadmap doc (Healthcare, Construction, Mortgage). Only
 * Healthcare's `match` functions are real (pattern-matched against actual
 * finding text) — Construction and Mortgage rosters are registered with
 * honest no-op matchers (documented below) until those verticals' finding
 * vocabularies are confirmed against real getExplainItems() output, same
 * as this codebase's existing pattern of leaving fields honestly empty
 * rather than guessing (see decision-provenance.js's ruleIds comment).
 * ========================================================================== */

(function (global) {
  'use strict';

  var rosters = Object.create(null); // warRoomId -> [{ id, label, match }]

  function registerRoster(warRoomId, agents) {
    if (!warRoomId || !Array.isArray(agents)) return null;
    rosters[warRoomId] = agents.map(function (a) {
      return {
        id: a.id,
        label: a.label || a.id,
        match: typeof a.match === 'function' ? a.match : function () { return false; }
      };
    });
    return rosters[warRoomId];
  }

  function listAgents(warRoomId) {
    return (rosters[warRoomId] || []).slice();
  }

  function listWarRooms() {
    return Object.keys(rosters);
  }

  /**
   * run(warRoomId, explainItems)
   * Tags each item with the first matching agent in roster order; items
   * matching no agent get { agentId: 'unassigned', agentLabel: 'Unassigned' }
   * rather than being dropped — every finding stays visible.
   */
  function run(warRoomId, explainItems) {
    var roster = rosters[warRoomId] || [];
    var items = Array.isArray(explainItems) ? explainItems : [];

    return items.map(function (it) {
      var owner = null;
      for (var i = 0; i < roster.length; i++) {
        try {
          if (roster[i].match(it)) { owner = roster[i]; break; }
        } catch (e) {
          // a bad match() fn shouldn't take down the whole batch
        }
      }
      return Object.assign({}, it, {
        agentId: owner ? owner.id : 'unassigned',
        agentLabel: owner ? owner.label : 'Unassigned'
      });
    });
  }

  /** Summarize tagged items by agent — counts + highest severity seen, for a roster-level dashboard tile. */
  function summarize(taggedItems) {
    var byAgent = Object.create(null);
    (taggedItems || []).forEach(function (it) {
      var key = it.agentId || 'unassigned';
      if (!byAgent[key]) byAgent[key] = { agentId: key, agentLabel: it.agentLabel || key, count: 0, highSeverity: 0 };
      byAgent[key].count++;
      if (it.severity === 'high') byAgent[key].highSeverity++;
    });
    return Object.keys(byAgent).map(function (k) { return byAgent[k]; });
  }

  var TSMAgentRegistry = {
    registerRoster: registerRoster,
    listAgents: listAgents,
    listWarRooms: listWarRooms,
    run: run,
    summarize: summarize
  };

  global.TSMAgentRegistry = TSMAgentRegistry;
  if (typeof module !== 'undefined' && module.exports) module.exports = TSMAgentRegistry;

  // ── Default rosters ──────────────────────────────────────────────────
  // Healthcare: real matchers, pattern-matched against finding text.
  registerRoster('healthcare-war-room', [
    { id: 'claims', label: 'Claims Agent', match: function (it) { return /\bclaim\b/i.test(it.claim || ''); } },
    { id: 'coding', label: 'Coding Agent', match: function (it) { return /\bcpt\b|coding|code\b/i.test(it.claim || ''); } },
    { id: 'denial', label: 'Denial Agent', match: function (it) { return /denial|denied/i.test(it.claim || ''); } },
    { id: 'compliance', label: 'Compliance Agent', match: function (it) { return /complian|hipaa|audit/i.test(it.claim || ''); } },
    { id: 'revenue-recovery', label: 'Revenue Recovery Agent', match: function (it) { return /recover|revenue|reimburs/i.test(it.claim || ''); } }
  ]);

  // Construction and Mortgage: roster registered, matchers honestly stubbed
  // (always false -> everything falls through to "Unassigned") until real
  // finding text from those verticals' getExplainItems() is available to
  // pattern-match against. Registering the roster now means the roster UI
  // and summarize() counts work immediately; only the classification is
  // pending.
  registerRoster('construction-war-room', [
    { id: 'contract', label: 'Contract Agent' },
    { id: 'cost', label: 'Cost Agent' },
    { id: 'schedule', label: 'Schedule Agent' },
    { id: 'risk', label: 'Risk Agent' },
    { id: 'vendor', label: 'Vendor Agent' }
  ]);

  registerRoster('mortgage-war-room', [
    { id: 'document', label: 'Document Agent' },
    { id: 'underwriting', label: 'Underwriting Agent' },
    { id: 'compliance', label: 'Compliance Agent' },
    { id: 'closing', label: 'Closing Agent' }
  ]);

  // BPO (bpo-strategist-v2.html): supply-chain/plant-ops/security have real
  // matchers -- toExplainItems() now stamps a deterministic `sector` field
  // (warData.selectedSector, always exactly 'Supply Chain', 'Plant
  // Operations', or 'OT/ICS Security') onto the item, so these three match
  // on that field rather than guessing at LLM-generated claim/rationale
  // text. client-impact and escalation stay honestly stubbed: this page
  // emits one blended recommendation per generation, not per-concern
  // findings, and nothing in the item distinguishes "this is a client-impact
  // finding" from the rest of the object -- that breakdown only exists in
  // the separate SLA/Client Impact/Escalations report tabs (pullEscalations()
  // etc.), which never flow through toExplainItems() at all.
  registerRoster('bpo-war-room', [
    { id: 'supply-chain', label: 'Supply Chain Agent', match: function (it) { return it.sector === 'Supply Chain'; } },
    { id: 'plant-ops', label: 'Plant Operations Agent', match: function (it) { return it.sector === 'Plant Operations'; } },
    { id: 'security', label: 'OT/ICS Security Agent', match: function (it) { return it.sector === 'OT/ICS Security'; } },
    { id: 'client-impact', label: 'Client Impact Agent' },
    { id: 'escalation', label: 'Escalation Agent' }
  ]);

})(typeof window !== 'undefined' ? window : this);

// ── Self-test (run directly with `node tsm-agent-registry.js`) ────────────
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  var Registry = module.exports;

  var sampleItems = [
    { id: 'f1', claim: 'CLM-1001 denied for medical necessity', severity: 'high', confidence: 94 },
    { id: 'f2', claim: 'CPT 99215 coding mismatch on CLM-1002', severity: 'med', confidence: 80 },
    { id: 'f3', claim: 'HIPAA audit flag on record access log', severity: 'high', confidence: 88 },
    { id: 'f4', claim: 'Revenue recovery opportunity: $1,250 on appeal', severity: 'low', confidence: 70 },
    { id: 'f5', claim: 'Unrelated formatting note', severity: 'low', confidence: 40 }
  ];

  var tagged = Registry.run('healthcare-war-room', sampleItems);
  console.log('[run]', JSON.stringify(tagged, null, 2));
  console.log('[summarize]', JSON.stringify(Registry.summarize(tagged), null, 2));
  console.log('[listWarRooms]', Registry.listWarRooms());
}