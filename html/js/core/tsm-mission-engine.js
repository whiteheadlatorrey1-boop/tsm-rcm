/**
 * TSM Mission Engine v1.1
 * Canonical mission data contract for all TSM Shell verticals.
 * BNCA owns missions. Pages only read and render them.
 *
 * Fixed in v1.1:
 *   - Replaced illegal `this.bus.emit` function declarations with `_bus()`
 *   - Bound `bus` reference correctly via closure (not `this`)
 *   - All internal callers updated to use `_bus()`
 *
 * Dependencies: tsm-event-bus.js, tsm-state.js (must load first)
 */

(function (global) {
  'use strict';

  // Most important place for this guard: _missions below is in-memory ONLY
  // (never persisted), so a duplicate <script> load — which happens 2-3x on
  // 9 different executive/war-room pages — previously wiped out every
  // mission created so far except whatever had last been mirrored into
  // TSMState. Skip cleanly on repeat load instead.
  if (global.TSMMission && global.TSMMission.__tsmMissionReady) {
    console.info('[TSMMission] Already initialized — skipping duplicate load.');
    return;
  }

  // ── Constants ─────────────────────────────────────────────────────────────
  const SECTORS    = Object.freeze(['construction','healthcare','insurance','legal','finops','mortgage','bpo','realestate']);
  const PRIORITY   = Object.freeze(['critical','high','medium','low']);
  const STATUS     = Object.freeze(['created','analyzing','ready','escalated','executing','complete','failed']);

  // ── In-memory registry ────────────────────────────────────────────────────
  const _missions = {};

  // ── Internal helpers ──────────────────────────────────────────────────────
  function _bus(event, payload) {
    // TSMBus is the Event Bus public name; TSMEventBus is the alternate export
    const bus = global.TSMBus || global.TSMEventBus;
    if (bus && typeof bus.emit === 'function') bus.emit(event, payload);
  }

  function _auditLog(missionId, action, data) {
    const entry = { missionId, action, data, ts: Date.now() };
    if (global.TSMState) global.TSMState.push('audit', entry);
    _bus('AUDIT_ENTRY', entry);
  }

  function _syncState() {
    if (global.TSMState) {
      const all = Object.values(_missions);
      const latest = all[all.length - 1];
      if (latest) global.TSMState.set('mission', latest);
    }
  }

  function _get(id) {
    if (!_missions[id]) { console.warn('[TSMMission] Mission not found:', id); return null; }
    return _missions[id];
  }

  function _clone(obj) {
    try { return JSON.parse(JSON.stringify(obj)); } catch { return obj; }
  }

  function _uid(prefix = 'ID') {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  }

  function _clamp(val, allowed, fallback) {
    return allowed.includes(val) ? val : fallback;
  }

  function _clampNum(val, min, max) {
    return Math.min(max, Math.max(min, Number(val) || 0));
  }

  // ── Mission Schema Factory ────────────────────────────────────────────────
  function create(opts = {}) {
    const id  = _uid('MSN');
    const now = Date.now();

    if (!opts.sector || !SECTORS.includes(opts.sector)) {
      console.warn(`[TSMMission] Unknown sector "${opts.sector}" — defaulting to "general".`);
    }

    const mission = {
      id,
      sector:     opts.sector     || 'general',
      owner:      opts.owner      || null,
      priority:   _clamp(opts.priority, PRIORITY, 'medium'),
      exposure:   opts.exposure   != null ? Number(opts.exposure) : null,
      confidence: opts.confidence != null ? _clampNum(opts.confidence, 0, 100) : null,
      status:     'created',
      source:     opts.source     || null,
      meta:       opts.meta       || {},
      tasks:      [],
      timeline:   [],
      evidence:   [],
      findings:   [],
      risks:      [],
      actions:    [],
      explainability: {
        confidence:        opts.confidence || null,
        recommendedAction: null,
        reasoning:         [],
        evidence:          [],
        governance: {
          approvalRequired: false,
          approvedBy:       null,
          approvedAt:       null,
          policy:           null,
        },
      },
      execution: {
        status:      null,
        progress:    0,
        workerLog:   [],
        startedAt:   null,
        completedAt: null,
        outcome:     null,
        metrics:     {},
      },
      createdAt:   now,
      updatedAt:   now,
      completedAt: null,
    };

    _missions[id] = mission;
    _syncState();
    _bus('MISSION_CREATED', { mission: _clone(mission) });
    _auditLog(id, 'created', { sector: mission.sector, priority: mission.priority });

    return _clone(mission);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function update(id, updates = {}) {
    const m = _get(id);
    if (!m) return null;

    if (updates.status && !STATUS.includes(updates.status)) {
      console.warn(`[TSMMission] Invalid status "${updates.status}" — ignored.`);
      delete updates.status;
    }
    if (updates.confidence != null) updates.confidence = _clampNum(updates.confidence, 0, 100);
    if (updates.priority   && !PRIORITY.includes(updates.priority)) delete updates.priority;

    Object.assign(m, updates, { updatedAt: Date.now() });
    _syncState();
    _bus('MISSION_UPDATED', { id, updates, mission: _clone(m) });
    _auditLog(id, 'updated', updates);

    return _clone(m);
  }

  function get(id)            { const m = _get(id); return m ? _clone(m) : null; }
  function getAll()           { return Object.values(_missions).map(_clone); }
  function getBySector(s)     { return Object.values(_missions).filter(m => m.sector === s).map(_clone); }
  function getByStatus(st)    { return Object.values(_missions).filter(m => m.status === st).map(_clone); }
  function remove(id)         { if (!_missions[id]) return false; delete _missions[id]; _syncState(); return true; }

  // ── Sub-collection helpers ────────────────────────────────────────────────
  function addTask(id, task = {}) {
    const m = _get(id);
    if (!m) return null;
    const t = {
      id:        _uid('TSK'),
      title:     task.title    || 'Untitled Task',
      priority:  _clamp(task.priority, PRIORITY, 'medium'),
      assignee:  task.assignee || null,
      dueDate:   task.dueDate  || null,
      status:    'pending',
      createdAt: Date.now(),
    };
    m.tasks.push(t);
    m.updatedAt = Date.now();
    _syncState();
    _bus('MISSION_UPDATED', { id, change: 'task_added', task: t });
    return t;
  }

  function addTimeline(id, entry = {}) {
    const m = _get(id);
    if (!m) return null;
    const e = { id: _uid('TML'), event: entry.event || 'unknown', actor: entry.actor || 'system', data: entry.data || null, ts: Date.now() };
    m.timeline.push(e);
    m.updatedAt = Date.now();
    _syncState();
    return e;
  }

  function addEvidence(id, ev = {}) {
    const m = _get(id);
    if (!m) return null;
    const e = { id: _uid('EV'), type: ev.type || 'document', ref: ev.ref || null, summary: ev.summary || null, ts: Date.now() };
    m.evidence.push(e);
    m.explainability.evidence.push(e);
    m.updatedAt = Date.now();
    _syncState();
    return e;
  }

  function addFinding(id, finding = {}) {
    const m = _get(id);
    if (!m) return null;
    const f = {
      id:       _uid('FND'),
      title:    finding.title    || 'Untitled Finding',
      severity: _clamp(finding.severity, PRIORITY, 'medium'),
      detail:   finding.detail   || null,
      exposure: finding.exposure != null ? Number(finding.exposure) : null,
      ts:       Date.now(),
    };
    m.findings.push(f);
    m.updatedAt = Date.now();
    _syncState();
    return f;
  }

  function setExplainability(id, xp = {}) {
    const m = _get(id);
    if (!m) return null;
    Object.assign(m.explainability, {
      confidence:        xp.confidence        ?? m.explainability.confidence,
      recommendedAction: xp.recommendedAction ?? m.explainability.recommendedAction,
      reasoning:         xp.reasoning         || m.explainability.reasoning,
      governance:        Object.assign({}, m.explainability.governance, xp.governance || {}),
    });
    m.updatedAt = Date.now();
    _syncState();
    _bus('MISSION_UPDATED', { id, change: 'explainability_set' });
    return _clone(m);
  }

  // ── Lifecycle transitions ─────────────────────────────────────────────────
  function escalate(id, reason = '') {
    const m = _get(id);
    if (!m) return null;
    m.status    = 'escalated';
    m.updatedAt = Date.now();
    addTimeline(id, { event: 'escalated', data: { reason } });
    _syncState();
    _bus('MISSION_ESCALATED', { id, reason, mission: _clone(m) });
    _auditLog(id, 'escalated', { reason });
    return _clone(m);
  }

  function complete(id, result = {}) {
    const m = _get(id);
    if (!m) return null;
    m.status               = 'complete';
    m.completedAt          = Date.now();
    m.updatedAt            = Date.now();
    m.execution.outcome    = result.outcome || 'resolved';
    m.execution.metrics    = result.metrics || {};
    m.execution.completedAt = Date.now();
    addTimeline(id, { event: 'completed', data: result });
    _syncState();
    _bus('MISSION_COMPLETE', { id, result, mission: _clone(m) });
    _auditLog(id, 'completed', result);
    return _clone(m);
  }

  function fail(id, reason = '') {
    const m = _get(id);
    if (!m) return null;
    m.status    = 'failed';
    m.updatedAt = Date.now();
    addTimeline(id, { event: 'failed', data: { reason } });
    _syncState();
    _bus('MISSION_UPDATED', { id, change: 'failed', reason });
    _auditLog(id, 'failed', { reason });
    return _clone(m);
  }

  // ── Sector plugin interface ───────────────────────────────────────────────
  function publishAnalysis(id, analysis = {}) {
    const m = _get(id);
    if (!m) return null;

    if (analysis.findings)   analysis.findings.forEach(f => addFinding(id, f));
    if (analysis.risks)      m.risks    = analysis.risks;
    if (analysis.actions)    m.actions  = analysis.actions;
    if (analysis.confidence) m.confidence = _clampNum(analysis.confidence, 0, 100);

    m.explainability.reasoning = analysis.findings
      ? analysis.findings.map(f => f.title).filter(Boolean)
      : m.explainability.reasoning;

    m.status    = 'ready';
    m.updatedAt = Date.now();

    _syncState();
    _bus('WARROOM_FINDINGS_READY', { id, analysis, mission: _clone(m) });
    _bus('STRATEGIST_READY',       { id, mission: _clone(m) });
    _auditLog(id, 'analysis_published', { findings: (analysis.findings || []).length });

    return _clone(m);
  }

  // ── Debug ─────────────────────────────────────────────────────────────────
  function debug() {
    console.group('[TSMMission] All Missions');
    Object.values(_missions).forEach(m =>
      console.log(`  [${m.id}] ${m.sector} | ${m.status} | confidence:${m.confidence} | tasks:${m.tasks.length}`)
    );
    console.groupEnd();
  }

  // ── Expose ────────────────────────────────────────────────────────────────
  global.TSMMission = {
    create, update, get, getAll, getBySector, getByStatus, remove,
    addTask, addTimeline, addEvidence, addFinding, setExplainability,
    escalate, complete, fail,
    publishAnalysis,
    debug,
    SECTORS, PRIORITY, STATUS,
    __tsmMissionReady: true,
  };

  console.info('[TSMMission] Mission Engine v1.1 initialized.');

})(window);