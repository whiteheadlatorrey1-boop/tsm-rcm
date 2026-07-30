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

  function assignMission(id, operatorId, actor, dueDate) {
    var mission = getMission(id);
    if (!mission) throw new Error('assignMission: mission not found — ' + id);
    mission.workflow = mission.workflow || {};
    mission.workflow.assignedTo = operatorId;
    if (dueDate) mission.workflow.dueDate = dueDate;
    if (Model) {
      Model.transitionStage(mission, Model.STAGES.ASSIGNED, actor);
      Model.addAuditEvent(mission, Model.EVENT_TYPES.MISSION_ASSIGNED, actor, { operatorId: operatorId });
    }
    saveMission(mission);
    _publish('MISSION_ASSIGNED', mission);
    return mission;
  }

  function closeMission(id, actor, reviewOutcome) {
    var mission = getMission(id);
    if (!mission) throw new Error('closeMission: mission not found — ' + id);
    mission.workflow = mission.workflow || {};
    mission.workflow.completedAt = new Date().toISOString();
    if (reviewOutcome === 'accurate' || reviewOutcome === 'corrected') {
      mission.workflow.reviewOutcome = reviewOutcome;
    }
    if (Model) {
      Model.transitionStage(mission, Model.STAGES.CLOSED, actor);
      Model.addAuditEvent(mission, Model.EVENT_TYPES.MISSION_CLOSED, actor, { reviewOutcome: reviewOutcome || null });
    }
    saveMission(mission);
    _publish('MISSION_CLOSED', mission);
    return mission;
  }

  function computeOperatorStats(operatorId, vertical) {
    var filter = { assignedTo: operatorId };
    if (vertical) filter.vertical = vertical;
    var all = listMissions(filter).filter(function (m) {
      return m.workflow && m.workflow.assignedTo === operatorId;
    });
    var closedStage = Model ? Model.STAGES.CLOSED : 'CLOSED';
    var open = all.filter(function (m) { return m.stage !== closedStage; });
    var closed = all.filter(function (m) { return m.stage === closedStage; });

    var slaEligible = closed.filter(function (m) {
      return m.workflow.dueDate && m.workflow.completedAt;
    });
    var slaMet = slaEligible.filter(function (m) {
      return new Date(m.workflow.completedAt) <= new Date(m.workflow.dueDate);
    });

    var reviewed = closed.filter(function (m) {
      return m.workflow.reviewOutcome === 'accurate' || m.workflow.reviewOutcome === 'corrected';
    });
    var accurate = reviewed.filter(function (m) { return m.workflow.reviewOutcome === 'accurate'; });

    return {
      operatorId: operatorId,
      workload: open.length,
      closedCount: closed.length,
      slaPercent: slaEligible.length ? Math.round((slaMet.length / slaEligible.length) * 100) : null,
      accuracyPercent: reviewed.length ? Math.round((accurate.length / reviewed.length) * 100) : null
    };
  }

  function recommendAssignment(vertical) {
    var candidates = listOperators({ vertical: vertical });
    if (!candidates.length) return null;
    var scored = candidates.map(function (op) {
      var stats = computeOperatorStats(op.id, vertical);
      return { operator: op, stats: stats };
    });
    scored.sort(function (a, b) {
      if (a.stats.workload !== b.stats.workload) return a.stats.workload - b.stats.workload;
      var aSla = a.stats.slaPercent === null ? -1 : a.stats.slaPercent;
      var bSla = b.stats.slaPercent === null ? -1 : b.stats.slaPercent;
      return bSla - aSla;
    });
    return scored[0];
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
    var now = new Date();
    // "late" = currently overdue. Two ways a mission can qualify:
    //  1. Its vertical's own engine already determined it's over SLA and
    //     set workflow.sla.breached explicitly (e.g. hotelops's maintenance/
    //     incident/compliance breach detection, which has richer per-type
    //     SLA math than a single dueDate can express).
    //  2. It has a workflow.dueDate in the past and isn't closed yet --
    //     computed live here rather than requiring some separate "SLA
    //     monitor" process to have run and stamped the flag first, since
    //     no such process exists anywhere in the codebase (confirmed: grep
    //     for anything that sets workflow.sla.breached found only vertical-
    //     specific bridges that explicitly pass it in, never a monitor).
    // A closed mission is never "late" here -- computeOperatorStats already
    // covers "was this operator's completed work on time" via dueDate vs
    // completedAt; this is strictly the live "still open and overdue" signal.
    var late = missions.filter(function (m) {
      if (m.stage === 'closed') return false;
      var explicit = m.workflow && m.workflow.sla && m.workflow.sla.breached === true;
      if (explicit) return true;
      var due = m.workflow && m.workflow.dueDate;
      return !!due && new Date(due) < now;
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

  // -----------------------------------------------------------------
  // Rate card / labor cost -- lives in store.settings because this is
  // cross-tenant config (per-vertical pricing), not a single tenant's
  // record. Callers (e.g. bpo-supervisor.html Executive tab) read this
  // to compute real revenue/labor-cost/margin instead of sample data.
  // Everything here is opt-in: until a vertical has a rate entered,
  // getFinancials() reports it as excluded rather than assuming $0 or
  // inventing a number.
  // -----------------------------------------------------------------

  function getRateCard() {
    var store = _read();
    return Object.assign({}, store.settings.rateCard || {});
  }

  function setRate(vertical, amountPerMission) {
    if (!vertical) throw new Error('setRate: vertical is required');
    if (typeof amountPerMission !== 'number' || amountPerMission < 0) {
      throw new Error('setRate: amountPerMission must be a non-negative number');
    }
    var store = _read();
    store.settings.rateCard = store.settings.rateCard || {};
    store.settings.rateCard[vertical] = amountPerMission;
    _write(store);
    _publish('settings-updated', { rateCard: store.settings.rateCard });
    return store.settings.rateCard;
  }

  function getLaborCostPerHour() {
    var store = _read();
    return typeof store.settings.laborCostPerHour === 'number' ? store.settings.laborCostPerHour : null;
  }

  function setLaborCostPerHour(amount) {
    if (typeof amount !== 'number' || amount < 0) {
      throw new Error('setLaborCostPerHour: amount must be a non-negative number');
    }
    var store = _read();
    store.settings.laborCostPerHour = amount;
    _write(store);
    _publish('settings-updated', { laborCostPerHour: amount });
    return amount;
  }

  // Real revenue/labor-cost/margin, computed only from missions whose
  // vertical has a configured rate and (for labor cost) only from
  // closed missions with both createdAt and completedAt timestamps.
  // Anything that can't be computed honestly is reported as "excluded"
  // rather than silently treated as zero, so the caller can show its
  // work (e.g. "3 of 20 missions excluded -- no rate set for legal").
  function getFinancials(filter) {
    var store = _read();
    var rateCard = store.settings.rateCard || {};
    var laborCostPerHour = typeof store.settings.laborCostPerHour === 'number' ? store.settings.laborCostPerHour : null;
    var missions = listMissions(filter);

    var revenue = 0;
    var includedForRevenue = 0;
    var excludedVerticals = {};

    missions.forEach(function (m) {
      var rate = rateCard[m.vertical];
      if (typeof rate === 'number') {
        revenue += rate;
        includedForRevenue += 1;
      } else {
        excludedVerticals[m.vertical] = (excludedVerticals[m.vertical] || 0) + 1;
      }
    });

    var laborHours = 0;
    var hoursComputable = laborCostPerHour !== null;
    var missionsWithHours = 0;
    if (hoursComputable) {
      missions.forEach(function (m) {
        if (m.stage === 'closed' && m.workflow && m.workflow.completedAt && m.createdAt) {
          var ms = new Date(m.workflow.completedAt) - new Date(m.createdAt);
          if (ms > 0) {
            laborHours += ms / (1000 * 60 * 60);
            missionsWithHours += 1;
          }
        }
      });
    }
    var laborCost = hoursComputable ? laborHours * laborCostPerHour : null;
    var margin = (hoursComputable && laborCost !== null) ? revenue - laborCost : null;

    return {
      hasRateCard: Object.keys(rateCard).length > 0,
      hasLaborCost: laborCostPerHour !== null,
      revenue: revenue,
      missionCount: missions.length,
      includedForRevenue: includedForRevenue,
      excludedVerticals: excludedVerticals, // { vertical: countExcluded }
      laborHours: hoursComputable ? Math.round(laborHours * 10) / 10 : null,
      missionsWithHours: missionsWithHours,
      laborCost: laborCost,
      margin: margin,
      marginPct: (margin !== null && revenue > 0) ? Math.round((margin / revenue) * 100) : null
    };
  }

  // Forecast: least-squares linear trend fit to daily mission counts over
  // the last `trendDays`, projected forward `projectDays`, multiplied by
  // the rate-card-weighted average $/mission actually seen in that
  // window. Nothing here is a guess: the slope/intercept come from real
  // createdAt timestamps, and only missions in verticals with a set rate
  // count toward the $/mission average (same exclusion pattern as
  // getFinancials). Returns hasEnoughData:false rather than fabricating
  // a trend from fewer than 3 distinct days of activity.
  function getForecast(opts) {
    opts = opts || {};
    var trendDays = opts.trendDays || 14;
    var projectDays = opts.projectDays || 30;
    var store = _read();
    var rateCard = store.settings.rateCard || {};
    var hasRateCard = Object.keys(rateCard).length > 0;
    var missions = listMissions();

    var msPerDay = 24 * 60 * 60 * 1000;
    var windowStart = new Date(Date.now() - trendDays * msPerDay);
    windowStart.setHours(0, 0, 0, 0);

    var counts = new Array(trendDays).fill(0);
    var verticalCounts = {};
    var daysWithData = {};

    missions.forEach(function (m) {
      var created = new Date(m.createdAt);
      var dayIdx = Math.floor((created - windowStart) / msPerDay);
      if (dayIdx < 0 || dayIdx >= trendDays) return;
      counts[dayIdx] += 1;
      daysWithData[dayIdx] = true;
      verticalCounts[m.vertical] = (verticalCounts[m.vertical] || 0) + 1;
    });

    if (Object.keys(daysWithData).length < 3) {
      return { hasEnoughData: false, hasRateCard: hasRateCard, trendDays: trendDays, projectDays: projectDays };
    }

    // Least-squares fit: count(day) = a + b * dayIndex
    var n = trendDays, sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (var x = 0; x < n; x++) {
      var y = counts[x];
      sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
    }
    var denom = (n * sumXX - sumX * sumX) || 1;
    var b = (n * sumXY - sumX * sumY) / denom;
    var a = (sumY - b * sumX) / n;

    var projectedMissions = 0;
    for (var fx = n; fx < n + projectDays; fx++) {
      projectedMissions += Math.max(0, a + b * fx);
    }
    projectedMissions = Math.round(projectedMissions);

    var totalInWindow = sumY;
    var revenueWeighted = 0, includedCount = 0;
    Object.keys(verticalCounts).forEach(function (v) {
      if (typeof rateCard[v] === 'number') {
        revenueWeighted += verticalCounts[v] * rateCard[v];
        includedCount += verticalCounts[v];
      }
    });
    var avgRate = includedCount > 0 ? revenueWeighted / includedCount : null;
    var forecastRevenue = avgRate !== null ? Math.round(projectedMissions * avgRate) : null;

    return {
      hasEnoughData: true,
      hasRateCard: hasRateCard,
      trendDays: trendDays,
      projectDays: projectDays,
      dailyAvg: Math.round((sumY / n) * 10) / 10,
      trendSlope: Math.round(b * 100) / 100,
      totalInWindow: totalInWindow,
      includedForRevenue: includedCount,
      projectedMissions: projectedMissions,
      avgRatePerMission: avgRate !== null ? Math.round(avgRate * 100) / 100 : null,
      forecastRevenue: forecastRevenue
    };
  }

  function getManualBaselineMinutes() {
    var store = _read();
    return typeof store.settings.manualBaselineMinutes === 'number' ? store.settings.manualBaselineMinutes : null;
  }

  function setManualBaselineMinutes(minutes) {
    if (typeof minutes !== 'number' || minutes < 0) {
      throw new Error('setManualBaselineMinutes: minutes must be a non-negative number');
    }
    var store = _read();
    store.settings.manualBaselineMinutes = minutes;
    _write(store);
    _publish('settings-updated', { manualBaselineMinutes: minutes });
    return minutes;
  }

  // "Hours saved" is inherently a projection against an assumed manual
  // baseline that was never actually measured -- it can never be fully
  // "real" the way revenue or ops-health are. What IS real: the count of
  // actually-closed missions and their actual elapsed createdAt->completedAt
  // time. The baseline minutes/mission is a number the caller must supply
  // explicitly (via setManualBaselineMinutes) so it's visible and editable,
  // never a silently baked-in constant. hoursSaved can come back negative
  // if actual time exceeded the assumed baseline -- that's reported as-is,
  // not clamped, since hiding it would be worse than an unflattering number.
  function getHoursSaved(filter) {
    var store = _read();
    var baselineMinutes = typeof store.settings.manualBaselineMinutes === 'number' ? store.settings.manualBaselineMinutes : null;
    var missions = listMissions(filter);
    var closedWithTimes = missions.filter(function (m) {
      return m.stage === 'closed' && m.workflow && m.workflow.completedAt && m.createdAt;
    });

    var actualHours = 0;
    closedWithTimes.forEach(function (m) {
      var ms = new Date(m.workflow.completedAt) - new Date(m.createdAt);
      if (ms > 0) actualHours += ms / (1000 * 60 * 60);
    });
    actualHours = Math.round(actualHours * 10) / 10;

    if (baselineMinutes === null || closedWithTimes.length === 0) {
      return {
        hasBaseline: baselineMinutes !== null,
        missionsIncluded: closedWithTimes.length,
        actualHours: actualHours,
        baselineMinutes: baselineMinutes,
        baselineHours: null,
        hoursSaved: null
      };
    }

    var baselineHours = Math.round((closedWithTimes.length * baselineMinutes / 60) * 10) / 10;
    var hoursSaved = Math.round((baselineHours - actualHours) * 10) / 10;

    return {
      hasBaseline: true,
      missionsIncluded: closedWithTimes.length,
      actualHours: actualHours,
      baselineMinutes: baselineMinutes,
      baselineHours: baselineHours,
      hoursSaved: hoursSaved
    };
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
    computeOperatorStats: computeOperatorStats,
    recommendAssignment: recommendAssignment,
    getAnalytics: getAnalytics,
    getRateCard: getRateCard,
    setRate: setRate,
    getLaborCostPerHour: getLaborCostPerHour,
    setLaborCostPerHour: setLaborCostPerHour,
    getFinancials: getFinancials,
    getForecast: getForecast,
    getManualBaselineMinutes: getManualBaselineMinutes,
    setManualBaselineMinutes: setManualBaselineMinutes,
    getHoursSaved: getHoursSaved,
    subscribe: subscribe,
    _resetStore: _resetStore
  };

})(typeof window !== 'undefined' ? window : globalThis);