/**
 * tsm-mission-core.js  (v2 — rebuilt to match bpo-internal1.html's contract)
 *
 * bpo-internal1.html (see its "MISSION STORE WIRING (Phase 5)" comment block)
 * already expects TWO separate globals with a specific method contract:
 *
 *   window.TSMMissionModel.createMission({ vertical, tenantId, client, workflow, actor })
 *   window.TSMMissionModel.addTask(mission, { title })              // mutates in place
 *   window.TSMMissionModel.updateTaskStatus(mission, taskId, status, actor) // mutates in place
 *
 *   window.TSMMissionStore.getMission(id)
 *   window.TSMMissionStore.saveMission(mission)
 *   window.TSMMissionStore.listMissions(filterObj)   // e.g. { vertical: 'construction' }
 *   window.TSMMissionStore.getAnalytics(filterObj)   // -> { open, total, late }
 *   window.TSMMissionStore.subscribe(eventName, cb)  // '*' = all events
 *
 * This file implements exactly that contract. It supersedes the earlier
 * draft (window.TSM.mission.*), which used an incompatible shape.
 */

(function (global) {
  'use strict';

  const STORE_KEY = 'TSM_MISSION_STORE_V1';

  // ---------------------------------------------------------------------
  // Internal store persistence
  // ---------------------------------------------------------------------
  function emptyStore() {
    return {
      missions: {},
      tenants: {},
      operators: {},
      audit: [],      // global cross-mission ledger (separate from each mission's own .audit)
      analytics: {},
      settings: {}
    };
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return emptyStore();
      return Object.assign(emptyStore(), JSON.parse(raw));
    } catch (e) {
      console.warn('[MissionStore] Failed to load store, starting fresh:', e);
      return emptyStore();
    }
  }

  function persistStore(store) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
      return true;
    } catch (e) {
      console.error('[MissionStore] Failed to persist store:', e);
      return false;
    }
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ---------------------------------------------------------------------
  // Simple in-page pub/sub (same-tab live refresh, matches subscribe('*', cb))
  // ---------------------------------------------------------------------
  const subscribers = []; // { eventName, callback }

  function subscribe(eventName, callback) {
    const entry = { eventName, callback };
    subscribers.push(entry);
    // return an unsubscribe function for convenience
    return function unsubscribe() {
      const i = subscribers.indexOf(entry);
      if (i !== -1) subscribers.splice(i, 1);
    };
  }

  function publish(eventName, payload) {
    subscribers.forEach(s => {
      if (s.eventName === '*' || s.eventName === eventName) {
        try { s.callback(payload); }
        catch (e) { console.error('[MissionStore] subscriber threw:', e); }
      }
    });
  }

  // ---------------------------------------------------------------------
  // TSMMissionModel — schema + domain operations (mutates mission objects
  // in place; caller is responsible for calling TSMMissionStore.saveMission
  // afterward to persist, matching the pattern already used in
  // bpo-internal1.html)
  // ---------------------------------------------------------------------

  function generateMissionId(vertical) {
    const prefix = (vertical || 'GEN').toUpperCase().slice(0, 4);
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${stamp}-${rand}`;
  }

  function generateTaskId() {
    return 'T-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  }

  /**
   * Creates a new canonical Mission object. Does NOT save it — the caller
   * must pass it to TSMMissionStore.saveMission(), matching the existing
   * usage in bpo-internal1.html's createMissionFromIntake().
   */
  function createMission(input = {}) {
    const now = new Date().toISOString();
    const id = generateMissionId(input.vertical);

    const mission = {
      id,
      missionNo: input.missionNo || id,
      client: input.client || null,
      tenantId: input.tenantId || null,
      vertical: input.vertical || null,
      stage: 'created', // top-level lifecycle field: created -> assigned -> active -> qa -> delivered -> closed
      createdAt: now,
      updatedAt: now,

      documents: input.documents || [],
      extraction: input.extraction || {},
      classification: input.classification || {},
      confidence: input.confidence || {},
      validation: input.validation || {},
      entities: input.entities || {},
      workflow: Object.assign({ assignedTo: null, queue: null, priority: 'normal', sla: null }, input.workflow || {}),
      tasks: input.tasks || [],
      qa: input.qa || {},
      delivery: input.delivery || {},
      billing: input.billing || {},
      analytics: input.analytics || {},
      audit: [{
        event: 'MISSION_CREATED',
        at: now,
        actor: input.actor || null,
        detail: { client: input.client || null, vertical: input.vertical || null }
      }]
    };

    return mission;
  }

  /** Advance/set a mission's lifecycle stage. Mutates in place. */
  function setStage(mission, newStage, actor = null) {
    const now = new Date().toISOString();
    const prevStage = mission.stage;
    mission.stage = newStage;
    mission.updatedAt = now;
    mission.audit.push({ event: 'MISSION_STAGE_CHANGED', at: now, actor, detail: { from: prevStage, to: newStage } });
    return mission;
  }

  // Default turnaround windows by priority. Adjust to match real SLA policy —
  // these are placeholder business rules until real SLA config exists.
  const DEFAULT_SLA_HOURS_BY_PRIORITY = {
    rush: 4,
    high: 12,
    normal: 24,
    low: 72
  };

  /**
   * Assign a mission to an operator/queue and set a real SLA deadline
   * (workflow.sla), computed from priority unless an explicit sla is given.
   * Mutates the mission in place; caller still calls saveMission() after.
   */
  function assignMission(mission, { assignedTo = null, queue = null, priority, sla } = {}, actor = null) {
    const now = new Date().toISOString();
    const effectivePriority = priority || mission.workflow.priority || 'normal';
    const hours = DEFAULT_SLA_HOURS_BY_PRIORITY[effectivePriority] ?? DEFAULT_SLA_HOURS_BY_PRIORITY.normal;
    const slaDeadline = sla || new Date(Date.now() + hours * 3600 * 1000).toISOString();

    mission.workflow = Object.assign({}, mission.workflow, {
      assignedTo,
      queue,
      priority: effectivePriority,
      sla: slaDeadline
    });
    mission.stage = 'assigned';
    mission.updatedAt = now;
    mission.audit.push({
      event: 'MISSION_ASSIGNED',
      at: now,
      actor,
      detail: { assignedTo, queue, priority: effectivePriority, sla: slaDeadline }
    });
    return mission;
  }

  /** Add a task to a mission. Mutates the mission object in place. */
  function addTask(mission, taskInput = {}, actor = null) {
    const now = new Date().toISOString();
    const task = Object.assign(
      { id: generateTaskId(), title: 'Untitled Task', status: 'open', createdAt: now, updatedAt: now },
      taskInput
    );
    mission.tasks = mission.tasks || [];
    mission.tasks.push(task);
    mission.updatedAt = now;
    mission.audit.push({ event: 'MISSION_TASK_ADDED', at: now, actor, detail: { taskId: task.id, title: task.title } });
    return mission;
  }

  /** Update a task's status on a mission. Mutates the mission object in place. */
  function updateTaskStatus(mission, taskId, status, actor = null) {
    const now = new Date().toISOString();
    const task = (mission.tasks || []).find(t => t.id === taskId);
    if (!task) {
      console.warn(`[MissionModel] updateTaskStatus: no task ${taskId} on mission ${mission.id}`);
      return mission;
    }
    const prevStatus = task.status;
    task.status = status;
    task.updatedAt = now;
    mission.updatedAt = now;
    mission.audit.push({
      event: 'MISSION_TASK_STATUS_CHANGED',
      at: now,
      actor,
      detail: { taskId, from: prevStatus, to: status }
    });
    return mission;
  }

  // ---------------------------------------------------------------------
  // TSMMissionStore — persistence, querying, analytics, pub/sub
  // ---------------------------------------------------------------------

  /** Fetch a single mission by id. Returns a deep clone (mutate freely, then saveMission to persist). */
  function getMission(missionId) {
    const store = loadStore();
    const m = store.missions[missionId];
    return m ? clone(m) : null;
  }

  /**
   * List missions, optionally filtered by an object of exact-match fields,
   * e.g. listMissions({ vertical: 'construction' }) or listMissions({ stage: 'qa' }).
   * No argument (or {}) returns all missions.
   */
  function listMissions(filter) {
    const store = loadStore();
    const all = Object.values(store.missions);
    if (!filter || Object.keys(filter).length === 0) return clone(all);
    return clone(all.filter(m => Object.keys(filter).every(key => m[key] === filter[key])));
  }

  function isLate(mission) {
    if (mission.stage === 'closed') return false;
    const sla = mission.workflow && mission.workflow.sla;
    if (!sla) return false;
    return new Date(sla).getTime() < Date.now();
  }

  /**
   * Aggregate analytics over missions matching an optional filter object.
   * Returns { open, total, late }.
   */
  function getAnalytics(filter) {
    const missions = listMissions(filter);
    const total = missions.length;
    const open = missions.filter(m => m.stage !== 'closed').length;
    const late = missions.filter(isLate).length;
    return { open, total, late };
  }

  /**
   * Upsert a mission into the store, persist, and publish a
   * MISSION_CREATED or MISSION_UPDATED event to subscribers.
   */
  function saveMission(mission) {
    if (!mission || !mission.id) {
      console.error('[MissionStore] saveMission: mission must have an id');
      return null;
    }
    const store = loadStore();
    const isNew = !store.missions[mission.id];
    const now = new Date().toISOString();
    const toSave = clone(mission);
    toSave.updatedAt = now;

    store.missions[mission.id] = toSave;
    store.audit.push({
      event: isNew ? 'MISSION_CREATED' : 'MISSION_UPDATED',
      missionId: mission.id,
      at: now
    });
    persistStore(store);

    publish(isNew ? 'MISSION_CREATED' : 'MISSION_UPDATED', { mission: clone(toSave) });
    return clone(toSave);
  }

  /** Remove a mission entirely. Returns true if it existed. */
  function deleteMission(missionId, actor = null) {
    const store = loadStore();
    if (!store.missions[missionId]) return false;
    delete store.missions[missionId];
    store.audit.push({ event: 'MISSION_DELETED', missionId, at: new Date().toISOString(), actor });
    persistStore(store);
    publish('MISSION_DELETED', { missionId });
    return true;
  }

  // ---------------------------------------------------------------------
  // Expose globals — matching bpo-internal1.html's expected contract exactly
  // ---------------------------------------------------------------------
  global.TSMMissionModel = {
    createMission,
    setStage,
    assignMission,
    addTask,
    updateTaskStatus
  };

  global.TSMMissionStore = {
    getMission,
    saveMission,
    listMissions,
    getAnalytics,
    subscribe,
    deleteMission,
    _STORE_KEY: STORE_KEY // exposed for debugging only
  };

})(typeof window !== 'undefined' ? window : globalThis);