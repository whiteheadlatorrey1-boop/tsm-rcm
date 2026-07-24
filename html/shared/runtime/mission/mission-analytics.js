/**
 * TSM Mission Analytics — Phase 10
 * html/shared/runtime/mission/mission-analytics.js
 *
 * Browser IIFE module. Exposes window.TSMMissionAnalytics.
 * Depends on: window.TSMMissionModel, window.TSMMissionStore (load both first).
 *
 * Every page currently computes its own open/closed/SLA counts inline
 * (mission-store.js's getAnalytics() is the closest thing that exists, but
 * it's mission-count-only — no operator/SLA/accuracy rollups). This module
 * is the single place that answers "what's the state of the business right
 * now" so an executive dashboard (or any page) can call one function
 * instead of re-deriving it.
 *
 * IMPORTANT — two real mission stores exist right now, not one:
 *   1. window.TSMMissionStore (this runtime scaffold, TSM_MISSION_STORE_V1)
 *      — used by BPO, Healthcare, Legal, Insurance, RE, Schools, Mortgage,
 *      Honeywell, FinOps, doc-search-multi.
 *   2. Construction's own store (html/js/tsm-mission-store.js,
 *      TSM_MISSION_STORE key, different shape — status not stage, no
 *      workflow.dueDate/reviewOutcome fields).
 * getDashboard() merges both so Construction isn't invisible in analytics,
 * normalizing Construction's shape at read time rather than touching its
 * storage format.
 */
(function (global) {
  'use strict';

  function _runtimeMissions() {
    return global.TSMMissionStore && typeof global.TSMMissionStore.listMissions === 'function'
      ? global.TSMMissionStore.listMissions()
      : [];
  }

  // Construction's store lives on the SAME global name (window.TSMMissionStore)
  // but as a class instance with .getAll()/.state.missions instead of
  // .listMissions() — the two never coexist on one page today (verified: no
  // page loads both mission-store.js scripts), so we can't reliably detect
  // "is this the Construction instance" from inside a page that only has
  // the runtime store loaded. Construction missions are read directly from
  // localStorage here instead, independent of which store object is live
  // on the current page — this is what makes cross-vertical analytics work
  // from ANY page, not just construction-strategist.html.
  function _constructionMissions() {
    try {
      var raw = global.localStorage.getItem('TSM_MISSION_STORE');
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      var list = (parsed && parsed.missions) || [];
      return list.map(function (m) {
        return {
          id: m.id,
          vertical: m.vertical || 'construction',
          stage: m.status === 'closed' || m.status === 'complete' ? 'closed' : (m.stage || m.status || 'in_progress'),
          workflow: {
            assignedTo: m.assignedTo || (m.workflow && m.workflow.assignedTo) || null,
            dueDate: m.dueDate || (m.workflow && m.workflow.dueDate) || null,
            completedAt: m.completedAt || (m.workflow && m.workflow.completedAt) || null,
            reviewOutcome: m.reviewOutcome || (m.workflow && m.workflow.reviewOutcome) || null,
            sla: m.sla || (m.workflow && m.workflow.sla) || null
          },
          _source: 'construction-store'
        };
      });
    } catch (e) {
      return [];
    }
  }

  function _allMissions() {
    return _runtimeMissions().concat(_constructionMissions());
  }

  function _isClosed(m) {
    var closedStage = (global.TSMMissionModel && global.TSMMissionModel.STAGES && global.TSMMissionModel.STAGES.CLOSED) || 'closed';
    return m.stage === closedStage;
  }

  function _slaStats(missions) {
    var closed = missions.filter(_isClosed);
    var eligible = closed.filter(function (m) { return m.workflow && m.workflow.dueDate && m.workflow.completedAt; });
    var met = eligible.filter(function (m) { return new Date(m.workflow.completedAt) <= new Date(m.workflow.dueDate); });
    var reviewed = closed.filter(function (m) {
      return m.workflow && (m.workflow.reviewOutcome === 'accurate' || m.workflow.reviewOutcome === 'corrected');
    });
    var accurate = reviewed.filter(function (m) { return m.workflow.reviewOutcome === 'accurate'; });
    return {
      slaEligible: eligible.length,
      slaMet: met.length,
      slaPercent: eligible.length ? Math.round((met.length / eligible.length) * 100) : null,
      reviewedCount: reviewed.length,
      accuracyPercent: reviewed.length ? Math.round((accurate.length / reviewed.length) * 100) : null
    };
  }

  // Top-level dashboard snapshot — the single call an executive page needs.
  function getDashboard(filter) {
    var missions = _allMissions();
    if (filter && filter.vertical) missions = missions.filter(function (m) { return m.vertical === filter.vertical; });

    var open = missions.filter(function (m) { return !_isClosed(m); });
    var closed = missions.filter(_isClosed);
    var sla = _slaStats(missions);

    var byVertical = {};
    missions.forEach(function (m) {
      var v = m.vertical || 'unknown';
      if (!byVertical[v]) byVertical[v] = { total: 0, open: 0, closed: 0 };
      byVertical[v].total++;
      if (_isClosed(m)) byVertical[v].closed++; else byVertical[v].open++;
    });
    Object.keys(byVertical).forEach(function (v) {
      var verticalMissions = missions.filter(function (m) { return (m.vertical || 'unknown') === v; });
      var vSla = _slaStats(verticalMissions);
      byVertical[v].slaPercent = vSla.slaPercent;
      byVertical[v].accuracyPercent = vSla.accuracyPercent;
    });

    var workloadByOperator = {};
    open.forEach(function (m) {
      var op = (m.workflow && m.workflow.assignedTo) || 'unassigned';
      workloadByOperator[op] = (workloadByOperator[op] || 0) + 1;
    });

    return {
      generatedAt: new Date().toISOString(),
      total: missions.length,
      open: open.length,
      closed: closed.length,
      slaPercent: sla.slaPercent,
      slaEligible: sla.slaEligible,
      slaMet: sla.slaMet,
      accuracyPercent: sla.accuracyPercent,
      reviewedCount: sla.reviewedCount,
      byVertical: byVertical,
      workloadByOperator: workloadByOperator
    };
  }

  global.TSMMissionAnalytics = {
    getDashboard: getDashboard,
    _allMissions: _allMissions // exposed for mission-intelligence.js / mission-graph.js reuse
  };

})(typeof window !== 'undefined' ? window : globalThis);