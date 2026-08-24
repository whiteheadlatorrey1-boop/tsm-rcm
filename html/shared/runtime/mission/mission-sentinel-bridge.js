/**
 * TSM Mission → Sentinel Bridge
 *
 * Canonical bridge between Mission Core and Sentinel Center.
 *
 * Contract:
 *   Mission Store
 *     MISSION_CREATED
 *          ↓
 *   Mission Sentinel Bridge
 *          ↓
 *   TSM_<VERTICAL>_STRATEGIST_RELAY
 *          ↓
 *   Sentinel / Strategist / Executive consumers
 *
 * Important:
 * - Preserves vertical-generated anomalies.
 * - Adds a mission-level anomaly without destroying existing anomalies.
 * - Deduplicates mission anomalies by mission.id.
 * - Uses the shared Mission Store subscribe() API when available.
 * - Construction's legacy addMission() path is supported as a fallback.
 */

(function (global) {
  'use strict';

  var BRIDGE_SOURCE = 'mission-core';

  function severityFromPriority(priority) {
    switch (String(priority || '').toLowerCase()) {
      case 'critical':
        return 'CRIT';
      case 'high':
        return 'HIGH';
      case 'medium':
        return 'MED';
      default:
        return 'LOW';
    }
  }

  function relayKeyForVertical(vertical) {
    return 'TSM_' +
      String(vertical || 'UNKNOWN').toUpperCase() +
      '_STRATEGIST_RELAY';
  }

  function safeReadRelay(key) {
    try {
      return JSON.parse(global.localStorage.getItem(key) || 'null') || {};
    } catch (e) {
      return {};
    }
  }

  function safeWriteRelay(key, payload) {
    try {
      global.localStorage.setItem(key, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn(
        '[mission-sentinel-bridge] localStorage write failed:',
        e
      );
      return false;
    }
  }

  function dispatchRefresh(mission) {
    try {
      global.dispatchEvent(
        new CustomEvent('TSM_SENTINEL_REFRESH', {
          detail: {
            source: BRIDGE_SOURCE,
            missionId: mission && mission.id
              ? mission.id
              : null,
            vertical: mission && mission.vertical
              ? mission.vertical
              : null
          }
        })
      );
    } catch (e) {
      console.warn(
        '[mission-sentinel-bridge] refresh event failed:',
        e
      );
    }
  }

  function buildMissionAnomaly(mission) {
    var classification = mission.classification || {};
    var workflow = mission.workflow || {};

    return {
      id: 'mission-' + mission.id,
      missionId: mission.id,
      vertical: mission.vertical,

      title:
        classification.summary ||
        (mission.vertical + ' Mission'),

      severity:
        severityFromPriority(workflow.priority),

      exposure:
        Number(classification.exposure) || 0,

      exposureCurrency:
        classification.exposureCurrency || 'USD',

      confidence:
        classification.confidence != null
          ? classification.confidence
          : null,

      rootCause:
        classification.summary || null,

      recommendedAction:
        classification.recommendedAction || null,

      source: BRIDGE_SOURCE,

      timestamp:
        mission.createdAt ||
        new Date().toISOString()
    };
  }

  function missionAnomalyIds(anomalies) {
    var ids = {};

    (anomalies || []).forEach(function (anomaly) {
      if (!anomaly) return;

      if (anomaly.missionId) {
        ids[anomaly.missionId] = true;
      }

      if (
        typeof anomaly.id === 'string' &&
        anomaly.id.indexOf('mission-') === 0
      ) {
        ids[anomaly.id.substring('mission-'.length)] = true;
      }
    });

    return ids;
  }

  function pushMissionToSentinel(mission) {
    try {
      if (!mission || !mission.vertical || !mission.id) {
        return;
      }

      var classification = mission.classification || {};

      var key = relayKeyForVertical(mission.vertical);

      var existing = safeReadRelay(key);

      /*
       * Preserve everything already written by the vertical:
       *
       *   Schools Command
       *   Construction
       *   Mortgage
       *   Healthcare
       *   etc.
       */
      var existingAnomalies =
        Array.isArray(existing.anomalies)
          ? existing.anomalies.slice()
          : [];

      /*
       * Preserve the vertical's richer anomaly records.
       * These may contain:
       *   confidence
       *   exposure
       *   rootCause
       *   recommendedAction
       *   impacts
       */
      var missionIds = missionAnomalyIds(existingAnomalies);

      /*
       * Remove only a previous copy of THIS mission anomaly.
       * Do not remove vertical-generated anomalies.
       */
      existingAnomalies = existingAnomalies.filter(function (anomaly) {
        if (!anomaly) return false;

        if (
          anomaly.missionId === mission.id
        ) {
          return false;
        }

        if (
          typeof anomaly.id === 'string' &&
          anomaly.id === 'mission-' + mission.id
        ) {
          return false;
        }

        return true;
      });

      /*
       * First preserve classification.anomalies if they are not
       * already represented in the relay.
       *
       * This is especially important for Schools:
       *
       * classification.anomalies
       *     ↓
       * Sentinel
       *
       * rather than replacing those records with a generic mission record.
       */
      if (
        Array.isArray(classification.anomalies) &&
        classification.anomalies.length
      ) {
        classification.anomalies.forEach(function (anomaly) {
          if (!anomaly || !anomaly.id) return;

          var exists = existingAnomalies.some(function (existingAnomaly) {
            return existingAnomaly &&
              existingAnomaly.id === anomaly.id;
          });

          if (!exists) {
            existingAnomalies.push(anomaly);
          }
        });
      }

      /*
       * Add exactly one mission-level anomaly.
       */
      var missionAnomaly = buildMissionAnomaly(mission);

      existingAnomalies.push(missionAnomaly);

      existing.anomalies = existingAnomalies;
      existing.missionId = mission.id;
      existing.generatedAt = new Date().toISOString();

      /*
       * Preserve useful mission metadata for downstream consumers.
       */
      existing.mission = {
        id: mission.id,
        vertical: mission.vertical,
        stage: mission.stage || null,
        priority:
          mission.workflow && mission.workflow.priority
            ? mission.workflow.priority
            : null,
        exposure:
          Number(classification.exposure) || 0,
        exposureCurrency:
          classification.exposureCurrency || 'USD',
        source:
          classification.source || BRIDGE_SOURCE
      };

      safeWriteRelay(key, existing);

      dispatchRefresh(mission);

    } catch (e) {
      /*
       * Mission → Sentinel must never prevent Mission Core from
       * completing successfully.
       */
      console.warn(
        '[mission-sentinel-bridge] push failed (non-fatal):',
        e
      );
    }
  }

  var hooked = false;

  /*
   * PRIMARY PATH
   *
   * Shared Mission Store exposes:
   *
   *   subscribe('MISSION_CREATED', callback)
   */
  if (
    global.TSMMissionStore &&
    typeof global.TSMMissionStore.subscribe === 'function'
  ) {
    global.TSMMissionStore.subscribe(
      'MISSION_CREATED',
      pushMissionToSentinel
    );

    hooked = true;

    console.info(
      '[mission-sentinel-bridge] subscribed to MISSION_CREATED'
    );
  }

  /*
   * LEGACY FALLBACK
   *
   * Construction's older store exposed addMission() directly.
   */
  if (
    !hooked &&
    global.TSMMissionStore &&
    typeof global.TSMMissionStore.addMission === 'function' &&
    typeof global.TSMMissionStore.subscribe !== 'function'
  ) {
    var originalAddMission =
      global.TSMMissionStore.addMission.bind(
        global.TSMMissionStore
      );

    global.TSMMissionStore.addMission = function (mission) {
      var result = originalAddMission(mission);

      pushMissionToSentinel(mission);

      return result;
    };

    hooked = true;

    console.info(
      '[mission-sentinel-bridge] patched legacy addMission()'
    );
  }

  if (!hooked) {
    console.warn(
      '[mission-sentinel-bridge] no recognized TSMMissionStore found; ' +
      'load mission-store.js before mission-sentinel-bridge.js'
    );
  }

})(typeof window !== 'undefined' ? window : globalThis);
