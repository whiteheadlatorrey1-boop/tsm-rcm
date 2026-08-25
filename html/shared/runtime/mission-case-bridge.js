/**
 * TSM Mission → Case Bridge
 *
 * Problem: BPO Internal1 (and any other intake surface wired to
 * TSMMissionStore) writes to the Mission Store. HC Denial war room and
 * BPO-war's exec portal write to the Case Engine (TSMCaseManager), which is
 * the system that's actually server-synced to MongoDB (bpo_cases) and
 * powers /api/bpo/reports/case-summary + executive-rollup. Two disconnected
 * record systems meant a BPO Internal1 intake never showed up anywhere a
 * case-engine consumer (SLA reports, executive rollups, Enterprise Portal)
 * was looking.
 *
 * Fix: single-direction event bridge. Mission Store stays the system of
 * record for intake UI state (unchanged — no dual-write inside intake
 * forms). This module just subscribes to Mission Store's existing pubsub
 * and mirrors each mission into a Case Engine record, keyed by
 * mission.caseLink so a mission is only ever mirrored into one case.
 *
 * Load order: after tsm-case-manager.js and mission-store.js, before any
 * page that calls TSMMissionStore.saveMission()/closeMission(). Safe to
 * include on pages that only have one of the two systems loaded — init()
 * no-ops if either is missing.
 */
(function (global) {
  'use strict';

  function ready() {
    return !!(global.TSMMissionStore && global.TSMCaseManager);
  }

  // Mission Store's workflow.priority is freeform ('normal' by default,
  // some verticals write 'urgent'/'high'/'low'). Case Engine's tierRank
  // only understands P1/P2/P3, so map explicitly rather than let an
  // unrecognized string fall through to case-manager's default P3.
  function mapPriority(mission) {
    var p = ((mission.workflow && mission.workflow.priority) || 'normal').toLowerCase();
    if (p === 'urgent' || p === 'critical' || p === 'high') return 'P1';
    if (p === 'low') return 'P3';
    return 'P2';
  }

  function titleFor(mission) {
    var docType = mission.classification && (mission.classification.docType || mission.classification.type);
    return (docType ? docType + ' — ' : '') + (mission.missionNo || mission.id);
  }

  function caseDataFromMission(mission) {
    return {
      caseId: 'CASE-FROM-' + mission.id,
      sector: mission.vertical,
      vertical: mission.vertical,
      tenantId: mission.tenantId,
      client: mission.client || '',
      process: 'intake',
      source: 'mission_store_bridge',
      title: titleFor(mission),
      description: 'Auto-created from Mission Store intake ' + mission.id,
      priority: mapPriority(mission),
      status: mission.stage === 'closed' ? 'CLOSED' : 'OPEN',
      owner: (mission.workflow && mission.workflow.assignedTo) || '',
      deadline: (mission.workflow && mission.workflow.dueDate) || null
    };
  }

  function onMissionCreated(mission) {
    if (!ready() || !mission || mission.caseLink) return;
    try {
      var rec = global.TSMCaseManager.create(caseDataFromMission(mission));
      mission.caseLink = rec.caseId;
      // Re-save so the link persists on the mission record. This publishes
      // MISSION_UPDATED, which onMissionUpdated below handles as a no-op
      // create (mission.caseLink is already set) and a harmless idempotent
      // case update — no infinite loop.
      global.TSMMissionStore.saveMission(mission);
    } catch (e) {
      console.error('mission-case-bridge: create failed for ' + (mission && mission.id), e);
    }
  }

  function onMissionUpdated(mission) {
    if (!ready() || !mission || !mission.caseLink) return;
    try {
      global.TSMCaseManager.update(mission.caseLink, {
        status: mission.stage === 'closed' ? 'CLOSED' : 'OPEN',
        priority: mapPriority(mission),
        owner: (mission.workflow && mission.workflow.assignedTo) || ''
      });
    } catch (e) {
      console.error('mission-case-bridge: update failed for ' + mission.caseLink, e);
    }
  }

  function onMissionClosed(mission) {
    if (!ready() || !mission || !mission.caseLink) return;
    try {
      var outcome = (mission.workflow && mission.workflow.reviewOutcome) || 'completed';
      global.TSMCaseManager.markExecuted(mission.caseLink, 'Mission closed: ' + outcome);
    } catch (e) {
      console.error('mission-case-bridge: markExecuted failed for ' + mission.caseLink, e);
    }
  }

  function init() {
    if (!global.TSMMissionStore) return; // page doesn't use Mission Store — nothing to bridge
    global.TSMMissionStore.subscribe('MISSION_CREATED', onMissionCreated);
    global.TSMMissionStore.subscribe('MISSION_UPDATED', onMissionUpdated);
    global.TSMMissionStore.subscribe('MISSION_CLOSED', onMissionClosed);
  }

  if (global.document && global.document.readyState !== 'loading') {
    init();
  } else if (global.document) {
    global.document.addEventListener('DOMContentLoaded', init);
  }

  // Exposed for tests / manual re-init if scripts load out of order.
  global.TSMMissionCaseBridge = { init: init, mapPriority: mapPriority };

})(typeof window !== 'undefined' ? window : this);
