/**
 * TSM Cross-Mission Intelligence — Phase 11
 * html/shared/runtime/mission/mission-intelligence.js
 *
 * Browser IIFE module. Exposes window.TSMMissionIntelligence.
 * Depends on: window.TSMMissionModel, window.TSMMissionStore,
 * window.TSMMissionAnalytics, window.TSM.relay (relay.core.js).
 *
 * This is the layer the mission-store.js header comment referred to when it
 * said the relay bridge "enables Phase 11 cross-mission intelligence" — that
 * bridge was broken (MISSION domain unregistered) until this same round of
 * work, so this module is the first thing that's ever actually been able to
 * read real cross-vertical mission events.
 *
 * Two kinds of signal:
 *   1. STATE-based (findings()) — computed fresh from current mission state
 *      via TSMMissionAnalytics. Works even with a thin event log.
 *   2. EVENT-based (recentActivity()) — read from TSM.relay.eventLog(),
 *      filtered to domain === 'MISSION'. Gives real velocity/recency signal
 *      once enough mission events have accumulated.
 */
(function (global) {
  'use strict';

  var STALL_DAYS = 5; // no update in this many days on an open mission = stalled
  var OVERLOAD_THRESHOLD = 8; // open missions assigned to one operator = overloaded

  function _analytics() {
    return global.TSMMissionAnalytics;
  }

  function _missions() {
    return _analytics() ? _analytics()._allMissions() : [];
  }

  function _isClosed(m) {
    var closedStage = (global.TSMMissionModel && global.TSMMissionModel.STAGES && global.TSMMissionModel.STAGES.CLOSED) || 'closed';
    return m.stage === closedStage;
  }

  function _daysSince(iso) {
    if (!iso) return null;
    var ms = Date.now() - new Date(iso).getTime();
    return ms / (1000 * 60 * 60 * 24);
  }

  // Raw MISSION domain events from the shared cross-vertical log.
  function recentActivity(limit) {
    if (!global.TSM || !global.TSM.relay || typeof global.TSM.relay.eventLog !== 'function') return [];
    var log = global.TSM.relay.eventLog();
    var missionEvents = log.filter(function (e) { return e.domain === 'MISSION'; });
    return limit ? missionEvents.slice(-limit) : missionEvents;
  }

  // Real, explainable findings — each one traceable back to actual mission
  // data, not a black-box score. This is what a cross-mission "guidance"
  // panel (same shape as the RCM OS proactive guidance card) would render.
  function findings() {
    var missions = _missions();
    var out = [];

    // 1. Overloaded operators (workload concentration across ALL verticals —
    // the thing a single-vertical view can never see).
    var openByOperator = {};
    missions.filter(function (m) { return !_isClosed(m); }).forEach(function (m) {
      var op = (m.workflow && m.workflow.assignedTo) || null;
      if (!op) return;
      if (!openByOperator[op]) openByOperator[op] = [];
      openByOperator[op].push(m);
    });
    Object.keys(openByOperator).forEach(function (op) {
      var load = openByOperator[op];
      if (load.length >= OVERLOAD_THRESHOLD) {
        var verticals = Array.from(new Set(load.map(function (m) { return m.vertical; })));
        out.push({
          type: 'overloaded_operator',
          severity: load.length >= OVERLOAD_THRESHOLD * 1.5 ? 'critical' : 'high',
          title: 'Operator ' + op + ' has ' + load.length + ' open missions across ' + verticals.length + ' vertical(s)',
          detail: 'Verticals: ' + verticals.join(', '),
          nextAction: 'Rebalance load — consider TSMMissionStore.recommendAssignment() for new work in these verticals until this clears.',
          affected: load.map(function (m) { return m.id; })
        });
      }
    });

    // 2. Stalled missions — open, but no audit activity in STALL_DAYS+.
    missions.filter(function (m) { return !_isClosed(m); }).forEach(function (m) {
      var days = _daysSince(m.updatedAt);
      if (days !== null && days >= STALL_DAYS) {
        out.push({
          type: 'stalled_mission',
          severity: days >= STALL_DAYS * 2 ? 'critical' : 'high',
          title: m.id + ' (' + (m.vertical || 'unknown') + ') has had no activity in ' + Math.floor(days) + ' days',
          detail: 'Stage: ' + m.stage + (m.workflow && m.workflow.assignedTo ? ', assigned to ' + m.workflow.assignedTo : ', unassigned'),
          nextAction: m.workflow && m.workflow.assignedTo ? 'Check in with the assigned operator or reassign.' : 'Assign this mission — it has been unowned this whole time.',
          affected: [m.id]
        });
      }
    });

    // 3. Verticals trending late — SLA% below 80 with enough closed volume to be meaningful.
    if (_analytics()) {
      var dash = _analytics().getDashboard();
      Object.keys(dash.byVertical).forEach(function (v) {
        var stats = dash.byVertical[v];
        if (stats.slaPercent !== null && stats.slaPercent < 80 && stats.closed >= 3) {
          out.push({
            type: 'vertical_sla_risk',
            severity: stats.slaPercent < 60 ? 'critical' : 'medium',
            title: v + ' is meeting SLA on only ' + stats.slaPercent + '% of closed missions',
            detail: stats.closed + ' closed missions evaluated',
            nextAction: 'Review recent ' + v + ' assignments and due-date setting — this is a vertical-wide pattern, not one mission.',
            affected: []
          });
        }
      });
    }

    var sevRank = { critical: 0, high: 1, medium: 2, low: 3 };
    out.sort(function (a, b) { return (sevRank[a.severity] || 9) - (sevRank[b.severity] || 9); });
    return out;
  }

  global.TSMMissionIntelligence = {
    findings: findings,
    recentActivity: recentActivity
  };

})(typeof window !== 'undefined' ? window : globalThis);