/**
 * TSM Mission Store — Phase 1 persistence layer
 * html/shared/runtime/mission/mission-store.js
 *
 * Browser IIFE module. Exposes window.TSMMissionStore
 * Depends on: window.TSMMissionModel (load first), window.TSM.relay (optional bridge)
 * localStorage key: TSM_MISSION_STORE_V1
 */
(function (global) {
  'use strict';

  global.TSM = global.TSM || {};

  var STORE_KEY = 'TSM_MISSION_STORE_V1';

  var Model = global.TSMMissionModel;
  if (!Model) {
    console.error('TSMMissionStore: TSMMissionModel not found — load mission-model.js first');
  }

  function _emptyStore() {
    return {
      missions: {},
      tenants: {},
      operators: {},
      audit: [],
      analytics: {},
      settings: {}
    };
  }

  function _read() {
    try {
      var raw = global.localStorage.getItem(STORE_KEY);
      if (!raw) return _emptyStore();
      var parsed = JSON.parse(raw);
      return Object.assign(_emptyStore(), parsed);
    } catch (e) {
      console.error('TSMMissionStore: read failed, resetting store', e);
      return _emptyStore();
    }
  }

  function _write(store) {
    try {
      global.localStorage.setItem(STORE_KEY, JSON.stringify(store));
      return true;
    } catch (e) {
      console.error('TSMMissionStore: write failed', e);
      return false;
    }
  }

  var _listeners = {};

  function subscribe(eventType, fn) {
    if (!_listeners[eventType]) _listeners[eventType] = [];
    _listeners[eventType].push(fn);
    return function unsubscribe() {
      _listeners[eventType] = _listeners[eventType].filter(function (f) { return f !== fn; });
    };
  }

  function _publish(eventType, payload) {
    (_listeners[eventType] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error('TSMMissionStore listener error', e); }
    });
    (_listeners['*'] || []).forEach(function (fn) {
      try { fn({ type: eventType, payload: payload }); } catch (e) { console.error('TSMMissionStore listener error', e); }
    });

    // Bridge into relay.core's shared TSM_EVENT_LOG + cross-tab relay.
    // Same log as CRM/BPO/NOC/etc — enables Phase 11 cross-mission intelligence.
    if (global.TSM && global.TSM.relay) {
      try {
        global.TSM.relay.write('MISSION', payload, {
          caseId: payload.id,
          stage: eventType
        });
      } catch (e) {
        console.error('TSMMissionStore: relay bridge failed', e);
      }
    }
  }

  function saveMission(mission) {
    if (Model) {
      var result = Model.validateMission(mission);
      if (!result.valid) {
        throw new Error('saveMission: invalid mission — ' + result.errors.join(', '));
      }
    }
    var store = _read();
    var isNew = !store.missions[mission.id];
    store.missions[mission.id] = mission;
    _write(store);
    _publish(isNew ? 'MISSION_CREATED' : 'MISSION_UPDATED', mission);
    return mission;
  }

  function getMission(id) {
    var store = _read();
    return store.missions[id] || null;
  }

  function deleteMission(id) {
    var store = _read();
    if (!store.missions[id]) return false;
    delete store.missions[id];
    _write(store);
    _publish('MISSION_DELETED', { id: id });
    return true;
  }

  function listMissions(filter) {
    var store = _read();
    var all = Object.keys(store.missions).map(function (k) { return store.missions[k]; });
    if (!filter) return all;

    return all.filter(function (m) {
      if (filter.vertical && m.vertical !== filter.vertical) return false;
      if (filter.tenantId && m.tenantId !== filter.tenantId) return false;
      if (filter.stage && m.stage !== filter.stage) return false;
      if (filter.assignedTo && (!m.workflow || m.workflow.assignedTo !== filter.assignedTo)) return false;
      if (filter.client && m.client !== filter.client) return false;
      return true;
    });
  }

  function searchMissions(query) {
    if (!query) return listMissions();
    var q = String(query).toLowerCase();
    return listMissions().filter(function (m) {
      return (m.id && m.id.toLowerCase().indexOf(q) !== -1) ||
             (m.missionNo && m.missionNo.toLowerCase().indexOf(q) !== -1) ||
             (m.client && m.client.toLowerCase().indexOf(q) !== -1);
    });
  }

  function assignMission(id, operatorId, actor) {
    var mission = getMission(id);
    if (!mission) throw new Error('assignMission: mission not found — ' + id);
    mission.workflow = mission.workflow || {};
    mission.workflow.assignedTo = operatorId;
    if (Model) {
      Model.transitionStage(mission, Model.STAGES.ASSIGNED, actor);
      Model.addAuditEvent(mission, Model.EVENT_TYPES.MISSION_ASSIGNED, actor, { operatorId: operatorId });
    }
    saveMission(mission);
    _publish('MISSION_ASSIGNED', mission);
    return mission;
  }

  function closeMission(id, actor) {
    var mission = getMission(id);
    if (!mission) throw new Error('closeMission: mission not found — ' + id);
    if (Model) {
      Model.transitionStage(mission, Model.STAGES.CLOSED, actor);
      Model.addAuditEvent(mission, Model.EVENT_TYPES.MISSION_CLOSED, actor);
    }
    saveMission(mission);
    _publish('MISSION_CLOSED', mission);
    return mission;
  }

  function upsertTenant(tenant) {
    var store = _read();
    store.tenants[tenant.id] = tenant;
    _write(store);
    return tenant;
  }

  function getTenant(id) {
    var store = _read();
    return store.tenants[id] || null;
  }

  function upsertOperator(operator) {
    var store = _read();
    store.operators[operator.id] = operator;
    _write(store);
    return operator;
  }

  function listOperators(filter) {
    var store = _read();
    var all = Object.keys(store.operators).map(function (k) { return store.operators[k]; });
    if (!filter || !filter.vertical) return all;
    return all.filter(function (o) {
      return Array.isArray(o.specialties) && o.specialties.indexOf(filter.vertical) !== -1;
    });
  }

  function getAnalytics(filter) {
    var missions = listMissions(filter);
    var open = missions.filter(function (m) { return m.stage !== 'closed'; }).length;
    var closed = missions.filter(function (m) { return m.stage === 'closed'; }).length;
    var late = missions.filter(function (m) {
      return m.workflow && m.workflow.sla && m.workflow.sla.breached === true;
    }).length;

    return {
      total: missions.length,
      open: open,
      closed: closed,
      late: late,
      byVertical: missions.reduce(function (acc, m) {
        acc[m.vertical] = (acc[m.vertical] || 0) + 1;
        return acc;
      }, {})
    };
  }

  function _resetStore() {
    _write(_emptyStore());
  }

  global.TSMMissionStore = {
    STORE_KEY: STORE_KEY,
    saveMission: saveMission,
    getMission: getMission,
    deleteMission: deleteMission,
    listMissions: listMissions,
    searchMissions: searchMissions,
    assignMission: assignMission,
    closeMission: closeMission,
    upsertTenant: upsertTenant,
    getTenant: getTenant,
    upsertOperator: upsertOperator,
    listOperators: listOperators,
    getAnalytics: getAnalytics,
    subscribe: subscribe,
    _resetStore: _resetStore
  };

})(typeof window !== 'undefined' ? window : globalThis);
