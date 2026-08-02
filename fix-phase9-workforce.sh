#!/bin/bash
set -e

MODEL="html/shared/runtime/mission/mission-model.js"
STORE="html/shared/runtime/mission/mission-store.js"
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".phase9-backups/$TS"
mkdir -p "$BACKUP_DIR"
cp "$MODEL" "$BACKUP_DIR/mission-model.js"
cp "$STORE" "$BACKUP_DIR/mission-store.js"
echo "Backed up to $BACKUP_DIR"

python3 << 'PYEOF'
import re

# ---------- mission-model.js ----------
path = "html/shared/runtime/mission/mission-model.js"
with open(path) as f:
    content = f.read()

anchor1 = """      workflow: opts.workflow || {
        assignedTo: null,
        queue: null,
        priority: 'normal',
        sla: null
      },"""
assert content.count(anchor1) == 1, f"Expected 1 match of createMission workflow default, found {content.count(anchor1)}"

new1 = """      workflow: opts.workflow || {
        assignedTo: null,
        queue: null,
        priority: 'normal',
        sla: null,
        dueDate: opts.dueDate || null,
        completedAt: null,
        reviewOutcome: null
      },"""
content = content.replace(anchor1, new1)

anchor2 = """      workflow: {
        assignedTo: workItem.assignedTo || null,
        queue: workItem.queue || null,
        priority: workItem.priority || 'normal',"""
assert content.count(anchor2) == 1, f"Expected 1 match of buildMissionFromWorkItem workflow, found {content.count(anchor2)}"

new2 = """      workflow: {
        assignedTo: workItem.assignedTo || null,
        queue: workItem.queue || null,
        priority: workItem.priority || 'normal',
        dueDate: workItem.dueDate || null,
        completedAt: null,
        reviewOutcome: null,"""
content = content.replace(anchor2, new2)

with open(path, "w") as f:
    f.write(content)
print("mission-model.js: added dueDate/completedAt/reviewOutcome to both workflow constructors")

# ---------- mission-store.js ----------
path = "html/shared/runtime/mission/mission-store.js"
with open(path) as f:
    content = f.read()

# 1. Extend assignMission to accept optional dueDate
old_assign = """  function assignMission(id, operatorId, actor) {
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
  }"""
assert content.count(old_assign) == 1, f"Expected 1 match of assignMission, found {content.count(old_assign)}"

new_assign = """  function assignMission(id, operatorId, actor, dueDate) {
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
  }"""
content = content.replace(old_assign, new_assign)

# 2. Extend closeMission to record completedAt/reviewOutcome
old_close = """  function closeMission(id, actor) {
    var mission = getMission(id);
    if (!mission) throw new Error('closeMission: mission not found — ' + id);
    if (Model) {
      Model.transitionStage(mission, Model.STAGES.CLOSED, actor);
      Model.addAuditEvent(mission, Model.EVENT_TYPES.MISSION_CLOSED, actor);
    }
    saveMission(mission);
    _publish('MISSION_CLOSED', mission);
    return mission;
  }"""
assert content.count(old_close) == 1, f"Expected 1 match of closeMission, found {content.count(old_close)}"

new_close = """  function closeMission(id, actor, reviewOutcome) {
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

  function computeOperatorStats(operatorId) {
    var all = listMissions().filter(function (m) {
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
      var stats = computeOperatorStats(op.id);
      return { operator: op, stats: stats };
    });
    scored.sort(function (a, b) {
      if (a.stats.workload !== b.stats.workload) return a.stats.workload - b.stats.workload;
      var aSla = a.stats.slaPercent === null ? -1 : a.stats.slaPercent;
      var bSla = b.stats.slaPercent === null ? -1 : b.stats.slaPercent;
      return bSla - aSla;
    });
    return scored[0];
  }"""
content = content.replace(old_close, new_close)

# 3. Register new exports
old_export = """    upsertOperator: upsertOperator,
    listOperators: listOperators,
    getAnalytics: getAnalytics,"""
assert content.count(old_export) == 1, f"Expected 1 match of export block, found {content.count(old_export)}"

new_export = """    upsertOperator: upsertOperator,
    listOperators: listOperators,
    computeOperatorStats: computeOperatorStats,
    recommendAssignment: recommendAssignment,
    getAnalytics: getAnalytics,"""
content = content.replace(old_export, new_export)

with open(path, "w") as f:
    f.write(content)
print("mission-store.js: extended assignMission/closeMission, added computeOperatorStats/recommendAssignment, updated exports")
PYEOF

echo ""
echo "── node --check both files ──"
node --check "$MODEL" && echo "✅ mission-model.js OK"
node --check "$STORE" && echo "✅ mission-store.js OK"

echo ""
echo "Done. Backups at $BACKUP_DIR"
echo "Note: operator objects passed to upsertOperator need { id, specialties: [...] } at minimum for recommendAssignment's vertical filter to work — nothing yet validates/enforces that shape."
