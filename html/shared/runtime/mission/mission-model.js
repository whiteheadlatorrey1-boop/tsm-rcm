/**
 * TSM Mission Model — Phase 1 canonical schema
 * html/shared/runtime/mission/mission-model.js
 *
 * Browser IIFE module. Exposes window.TSMMissionModel
 * Depends on: none (pure functions + constants)
 */
(function (global) {
  'use strict';

  global.TSM = global.TSM || {};

  var VERTICALS = Object.freeze([
    'healthcare',
    'finops',
    'insurance',
    'construction',
    'legal',
    'realestate',
    'bpo',
    'mortgage',
    'schools',
    'hotelops',
    'honeywell',
    'crm',
    'approval',
    'catalog',
    'cpq',
    'o2c',
    'noc']);

  var STAGES = Object.freeze({
    UPLOADED: 'uploaded',
    OCR: 'ocr',
    CLASSIFIED: 'classified',
    EXTRACTED: 'extracted',
    VALIDATED: 'validated',
    CREATED: 'created',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    QA: 'qa',
    DELIVERED: 'delivered',
    BILLED: 'billed',
    CLOSED: 'closed'
  });

  var EVENT_TYPES = Object.freeze({
    MISSION_CREATED: 'MISSION_CREATED',
    MISSION_UPDATED: 'MISSION_UPDATED',
    MISSION_ASSIGNED: 'MISSION_ASSIGNED',
    MISSION_STARTED: 'MISSION_STARTED',
    MISSION_QA: 'MISSION_QA',
    MISSION_DELIVERED: 'MISSION_DELIVERED',
    MISSION_CLOSED: 'MISSION_CLOSED'
  });

  var STAGE_ORDER = [
    STAGES.UPLOADED, STAGES.OCR, STAGES.CLASSIFIED, STAGES.EXTRACTED,
    STAGES.VALIDATED, STAGES.CREATED, STAGES.ASSIGNED, STAGES.IN_PROGRESS,
    STAGES.QA, STAGES.DELIVERED, STAGES.BILLED, STAGES.CLOSED
  ];

  function isValidVertical(v) {
    return VERTICALS.indexOf(v) !== -1;
  }

  function isValidStage(s) {
    return STAGE_ORDER.indexOf(s) !== -1;
  }

  var VERT_CODES = {
    healthcare: 'HC', finops: 'FO', insurance: 'INS', construction: 'CON',
    legal: 'LGL', realestate: 'RE', bpo: 'BPO', mortgage: 'MTG', schools: 'SCH',
    honeywell: 'HWL', hotelops: 'HTL', crm: 'CRM', approval: 'APR', catalog: 'CAT', cpq: 'CPQ', o2c: 'O2C', noc: 'NOC'
  };

  var _seqCounters = {};

  function _todayStamp() {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }

  function generateMissionId(vertical) {
    var code = VERT_CODES[vertical] || 'GEN';
    var stamp = _todayStamp();
    var key = code + stamp;
    _seqCounters[key] = (_seqCounters[key] || 0) + 1;
    var seq = String(_seqCounters[key]).padStart(4, '0');
    return 'MSN-' + code + '-' + stamp + '-' + seq;
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function createMission(opts) {
    opts = opts || {};
    if (!opts.vertical || !isValidVertical(opts.vertical)) {
      throw new Error('createMission: invalid or missing vertical "' + opts.vertical + '"');
    }
    if (!opts.tenantId) {
      throw new Error('createMission: tenantId is required');
    }

    var missionId = opts.id || generateMissionId(opts.vertical);
    var ts = nowISO();

    return {
      id: missionId,
      missionNo: opts.missionNo || missionId,
      client: opts.client || null,
      tenantId: opts.tenantId,
      vertical: opts.vertical,
      stage: STAGES.CREATED,
      createdAt: ts,
      updatedAt: ts,

      documents: opts.documents || [],
      extraction: opts.extraction || {},
      classification: opts.classification || {},
      confidence: opts.confidence || {},
      validation: opts.validation || {},
      entities: opts.entities || {},

      workflow: opts.workflow || {
        assignedTo: null,
        queue: null,
        priority: 'normal',
        sla: null,
        dueDate: opts.dueDate || null,
        completedAt: null,
        reviewOutcome: null
      },

      tasks: opts.tasks || [],
      qa: opts.qa || {},
      delivery: opts.delivery || {},
      billing: opts.billing || {},
      analytics: opts.analytics || {},

      audit: opts.audit || [
        { event: EVENT_TYPES.MISSION_CREATED, at: ts, actor: opts.actor || 'system' }
      ]
    };
  }

  function addAuditEvent(mission, eventType, actor, meta) {
    if (!mission || !Array.isArray(mission.audit)) {
      throw new Error('addAuditEvent: mission.audit must be an array');
    }
    mission.audit.push({
      event: eventType,
      at: nowISO(),
      actor: actor || 'system',
      meta: meta || {}
    });
    mission.updatedAt = nowISO();
    return mission;
  }

  function transitionStage(mission, newStage, actor) {
    if (!isValidStage(newStage)) {
      throw new Error('transitionStage: invalid stage "' + newStage + '"');
    }
    mission.stage = newStage;
    mission.updatedAt = nowISO();
    addAuditEvent(mission, EVENT_TYPES.MISSION_UPDATED, actor, { stage: newStage });
    return mission;
  }

  function addTask(mission, task) {
    var t = {
      id: task.id || (mission.id + '-T' + (mission.tasks.length + 1)),
      title: task.title || 'Untitled Task',
      status: task.status || 'open',
      assignedTo: task.assignedTo || null,
      createdAt: nowISO(),
      completedAt: null
    };
    mission.tasks.push(t);
    mission.updatedAt = nowISO();
    return t;
  }

  function updateTaskStatus(mission, taskId, status, actor) {
    if (!mission || !Array.isArray(mission.tasks)) {
      throw new Error('updateTaskStatus: mission.tasks must be an array');
    }
    var t = mission.tasks.find(function (x) { return x.id === taskId; });
    if (!t) {
      throw new Error('updateTaskStatus: no task with id ' + taskId);
    }
    t.status = status;
    t.completedAt = status === 'complete' ? nowISO() : null;
    mission.updatedAt = nowISO();
    addAuditEvent(mission, EVENT_TYPES.MISSION_UPDATED, actor || 'system', { taskId: taskId, taskStatus: status });
    return t;
  }

  function completionPercent(mission) {
    if (!mission.tasks || mission.tasks.length === 0) return 0;
    var done = mission.tasks.filter(function (t) { return t.status === 'complete'; }).length;
    return Math.round((done / mission.tasks.length) * 100);
  }

  function validateMission(mission) {
    var errors = [];
    if (!mission) {
      return { valid: false, errors: ['mission is null/undefined'] };
    }
    if (!mission.id) errors.push('missing id');
    if (!mission.tenantId) errors.push('missing tenantId');
    if (!isValidVertical(mission.vertical)) errors.push('invalid vertical: ' + mission.vertical);
    if (!isValidStage(mission.stage)) errors.push('invalid stage: ' + mission.stage);
    if (!Array.isArray(mission.documents)) errors.push('documents must be an array');
    if (!Array.isArray(mission.tasks)) errors.push('tasks must be an array');
    if (!Array.isArray(mission.audit)) errors.push('audit must be an array');
    if (!mission.createdAt) errors.push('missing createdAt');

    return { valid: errors.length === 0, errors: errors };
  }

  function normalizeLegacyWorkItem(workItem, opts) {
    opts = opts || {};
    var vertical = opts.vertical || workItem.vertical || workItem.sector || 'bpo';
    if (!isValidVertical(vertical)) vertical = 'bpo';

    return createMission({
      id: workItem.id || workItem.workItemId,
      client: workItem.client || workItem.clientName || null,
      tenantId: opts.tenantId || workItem.tenantId || 'default',
      vertical: vertical,
      documents: workItem.documents || [],
      extraction: workItem.extraction || {},
      classification: workItem.classification || {},
      workflow: {
        assignedTo: workItem.assignedTo || null,
        queue: workItem.queue || null,
        priority: workItem.priority || 'normal',
        dueDate: workItem.dueDate || null,
        completedAt: null,
        reviewOutcome: null,
        sla: workItem.sla || null
      },
      actor: 'migration'
    });
  }

  global.TSMMissionModel = {
    VERTICALS: VERTICALS,
    STAGES: STAGES,
    STAGE_ORDER: STAGE_ORDER,
    EVENT_TYPES: EVENT_TYPES,
    isValidVertical: isValidVertical,
    isValidStage: isValidStage,
    generateMissionId: generateMissionId,
    createMission: createMission,
    addAuditEvent: addAuditEvent,
    transitionStage: transitionStage,
    addTask: addTask,
    updateTaskStatus: updateTaskStatus,
    completionPercent: completionPercent,
    validateMission: validateMission,
    normalizeLegacyWorkItem: normalizeLegacyWorkItem
  };

})(typeof window !== 'undefined' ? window : globalThis);