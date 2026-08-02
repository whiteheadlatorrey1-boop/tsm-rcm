/* ============================================================
   TSM HOTELOPS -> SHARED MISSION STORE BRIDGE
   html/concierge/missions/hotelops-mission-bridge.js

   Depends on (load order): TSMMissionModel, TSMMissionStore,
   TSMHotelOpsEngine (instantiated + loaded with data by the page).

   Purpose: hotelops-engine.js computes real breaches/risks
   (getMaintenanceBreaches, getOpenIncidents, getComplianceRisk,
   getReservationRisks, getFrontDeskBreaches, getVipReadiness,
   getHousekeepingBreaches, getStaffingGaps, getIotAlerts,
   getAirbnbRisks) but none of that ever became a mission in
   TSMMissionStore -- the shared runtime was loaded on every
   hotelops page but never actually fed. This module is the
   real wiring: it turns each actionable item the engine already
   flagged into a mission, with workflow.sla.breached set from
   the engine's own "over SLA" determination (never invented
   here) so TSMMissionStore.getAnalytics().late reflects hotelops
   reality instead of silently staying 0.

   This does NOT create a mission for every record -- only for
   items the engine already decided are actionable (a breach, an
   open incident, a risk). Non-actionable records (a ticket still
   within SLA, a confirmed reservation) are not missions; that
   mirrors how the engine itself is already scoped.

   Sync is idempotent: mission ids are derived deterministically
   from the source record id, so re-running updates the same
   mission rather than duplicating it.
   ============================================================ */

(function (global) {
  'use strict';

  var VERTICAL = 'hotelops';
  var DEFAULT_TENANT_ID = 'hotelops-default-property';

  function ensureTenant(tenantId, propertyName) {
    if (!global.TSMMissionStore) return;
    if (global.TSMMissionStore.getTenant(tenantId)) return;
    global.TSMMissionStore.upsertTenant({
      id: tenantId,
      name: propertyName || 'HotelOps Property',
      vertical: VERTICAL
    });
  }

  function priorityFromSeverity(sev) {
    if (sev === 'urgent') return 'urgent';
    if (sev === 'high') return 'high';
    if (sev === 'medium' || sev === 'MED') return 'normal';
    return 'low';
  }

  // Builds (or updates) one mission from a source item. `breached`
  // and `dueDate` come from the caller, derived from the engine's
  // own numbers -- this function never decides SLA status itself.
  function syncMission(store, model, tenantId, opts) {
    var missionId = 'MSN-HTL-' + opts.sourceType + '-' + String(opts.sourceId);
    var existing = store.getMission(missionId);
    var priority = priorityFromSeverity(opts.severity);

    var workflow = {
      assignedTo: existing ? existing.workflow.assignedTo : null,
      queue: opts.sourceType,
      priority: priority,
      sla: { breached: !!opts.breached, detail: opts.slaDetail || null },
      dueDate: opts.dueDate || null,
      completedAt: existing ? existing.workflow.completedAt : null,
      reviewOutcome: existing ? existing.workflow.reviewOutcome : null
    };

    var mission = model.createMission({
      id: missionId,
      tenantId: tenantId,
      vertical: VERTICAL,
      client: opts.client || null,
      entities: opts.entities || {},
      workflow: workflow,
      analytics: { source: opts.sourceType, severity: opts.severity || null }
    });

    // createMission always sets stage=CREATED; if this mission already
    // existed and had progressed (assigned/in_progress/etc.), preserve
    // that instead of resetting it back to "created" on every sync.
    if (existing) mission.stage = existing.stage;

    store.saveMission(mission);
    return mission;
  }

  function syncToMissionStore(engine, opts) {
    if (!global.TSMMissionStore || !global.TSMMissionModel) {
      console.warn('hotelops-mission-bridge: TSMMissionStore/TSMMissionModel not loaded, skipping sync');
      return { synced: 0 };
    }
    var store = global.TSMMissionStore;
    var model = global.TSMMissionModel;
    var tenantId = (opts && opts.tenantId) || DEFAULT_TENANT_ID;
    var propertyName = (opts && opts.propertyName) ||
      (engine.property && engine.property.name) || null;

    ensureTenant(tenantId, propertyName);

    var count = 0;

    (engine.getMaintenanceBreaches() || []).forEach(function (m) {
      syncMission(store, model, tenantId, {
        sourceType: 'MAINT', sourceId: m.id, severity: m.severity,
        breached: true, slaDetail: m.hours_over + 'h over SLA',
        client: m.room, entities: { room: m.room, title: m.title }
      });
      count++;
    });

    (engine.getOpenIncidents() || []).filter(function (i) { return i.escalated; }).forEach(function (i) {
      syncMission(store, model, tenantId, {
        sourceType: 'INCIDENT', sourceId: i.id, severity: i.severity,
        breached: true, slaDetail: i.hours_over + 'h over response SLA',
        client: i.area, entities: { type: i.type, area: i.area }
      });
      count++;
    });

    (engine.getComplianceRisk() || []).filter(function (c) { return c.severity !== 'LOW'; }).forEach(function (c) {
      syncMission(store, model, tenantId, {
        sourceType: 'COMPLIANCE', sourceId: c.id, severity: c.severity,
        breached: c.due_in_days != null && c.due_in_days <= 0,
        slaDetail: c.due_in_days != null ? c.due_in_days + ' days until due' : null,
        client: c.type, entities: { type: c.type, detail: c.detail }
      });
      count++;
    });

    (engine.getReservationRisks() || []).filter(function (r) { return r.type === 'payment_failed'; }).forEach(function (r) {
      syncMission(store, model, tenantId, {
        sourceType: 'RESERVATION', sourceId: r.id, severity: r.severity,
        breached: true, slaDetail: 'payment failed',
        client: r.guest, entities: { guest: r.guest }
      });
      count++;
    });

    (engine.getFrontDeskBreaches() || []).forEach(function (t) {
      syncMission(store, model, tenantId, {
        sourceType: 'FRONTDESK', sourceId: t.id, severity: t.minutes_over > 30 ? 'high' : 'medium',
        breached: true, slaDetail: t.minutes_over + 'min over SLA',
        client: t.guest, entities: { room: t.room, type: t.type }
      });
      count++;
    });

    (engine.getHousekeepingBreaches() || []).forEach(function (t) {
      syncMission(store, model, tenantId, {
        sourceType: 'HOUSEKEEPING', sourceId: t.id, severity: t.hours_over > 2 ? 'high' : 'medium',
        breached: true, slaDetail: t.hours_over + 'h over SLA',
        client: t.room, entities: { room: t.room, type: t.type }
      });
      count++;
    });

    return { synced: count, tenantId: tenantId };
  }

  global.TSMHotelOpsMissionBridge = { syncToMissionStore: syncToMissionStore };
})(typeof window !== 'undefined' ? window : this);
