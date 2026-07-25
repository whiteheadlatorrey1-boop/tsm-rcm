/**
 * TSM Mission → Sentinel Bridge — Phase 3
 * html/shared/runtime/mission/mission-sentinel-bridge.js
 *
 * Pushes newly-created missions into Sentinel Center, using the same
 * localStorage + CustomEvent pattern every strategist page already uses
 * to feed Sentinel manually (see legal-pro/legal-main-strategist.html).
 *
 * Handles TWO different mission-store implementations transparently:
 *   1. Shared runtime store (html/shared/runtime/mission/mission-store.js)
 *      — has a public subscribe(eventType, fn) API. We hook that.
 *   2. Construction's standalone store (html/js/tsm-mission-store.js)
 *      — plain ES6 class, no pub/sub. We patch its prototype.addMission
 *        method so this file never has to be edited.
 *
 * Load this AFTER whichever mission-store.js the page already loads.
 * Safe to include on every strategist page — it no-ops harmlessly if
 * neither store is present.
 */
(function (global) {
  'use strict';

  function severityFromPriority(priority) {
    switch (String(priority || '').toLowerCase()) {
      case 'critical': return 'CRIT';
      case 'high':      return 'HIGH';
      case 'medium':    return 'MED';
      default:          return 'LOW';
    }
  }

  function relayKeyForVertical(vertical) {
    return 'TSM_' + String(vertical || 'UNKNOWN').toUpperCase() + '_STRATEGIST_RELAY';
  }

  function pushMissionToSentinel(mission) {
    try {
      if (!mission || !mission.vertical) return;

      var classification = mission.classification || {};
      var workflow = mission.workflow || {};

      var anomaly = {
        id: 'mission-' + mission.id,
        vertical: mission.vertical,
        title: classification.summary || (mission.vertical + ' Mission'),
        severity: severityFromPriority(workflow.priority),
        exposure: classification.exposure || null,
        confidence: null,
        rootCause: classification.summary || null,
        recommendedAction: null,
        source: 'mission-core',
        timestamp: mission.createdAt || new Date().toISOString()
      };

      var key = relayKeyForVertical(mission.vertical);
      var existing = {};
      try { existing = JSON.parse(global.localStorage.getItem(key) || 'null') || {}; } catch (e) {}
      existing.anomalies = existing.anomalies || [];
      existing.anomalies = existing.anomalies.filter(function (a) { return a.id !== anomaly.id; });
      existing.anomalies.push(anomaly);
      existing.generatedAt = new Date().toISOString();

      global.localStorage.setItem(key, JSON.stringify(existing));
      global.dispatchEvent(new CustomEvent('TSM_SENTINEL_REFRESH'));
    } catch (e) {
      console.warn('[mission-sentinel-bridge] push failed (non-fatal):', e);
    }
  }

  var hooked = false;

  // ── Path 1: shared runtime store (has subscribe()) ──
  if (global.TSMMissionStore && typeof global.TSMMissionStore.subscribe === 'function') {
    global.TSMMissionStore.subscribe('MISSION_CREATED', pushMissionToSentinel);
    hooked = true;
  }

  // ── Path 2: Construction's instance-based store (no subscribe(), patch the instance method) ──
  if (!hooked && global.TSMMissionStore &&
      typeof global.TSMMissionStore.addMission === 'function' &&
      typeof global.TSMMissionStore.subscribe !== 'function') {
    var _origAddMission = global.TSMMissionStore.addMission.bind(global.TSMMissionStore);
    global.TSMMissionStore.addMission = function (mission) {
      var result = _origAddMission(mission);
      pushMissionToSentinel(mission);
      return result;
    };
    hooked = true;
  }

  if (!hooked) {
    console.error('TSMMissionSentinelBridge: no recognized TSMMissionStore found — load a mission-store.js first');
  }

})(typeof window !== 'undefined' ? window : globalThis);