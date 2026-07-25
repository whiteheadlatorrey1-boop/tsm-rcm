#!/bin/bash
set -e

FILE="html/healthcare/hc-main-strategist.html"
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".phase2-hc-backups/$TS"
mkdir -p "$BACKUP_DIR"
cp "$FILE" "$BACKUP_DIR/hc-main-strategist.html"
echo "Backed up to $BACKUP_DIR"

python3 << 'PYEOF'
path = "html/healthcare/hc-main-strategist.html"
with open(path) as f:
    content = f.read()

# 1. Add Mission Core script includes, right before the existing relay.engine.js include
anchor1 = '<script src="/html/healthcare/js/relay.engine.js"></script>'
assert content.count(anchor1) == 1, f"Expected 1 match of relay.engine.js include, found {content.count(anchor1)}"
new1 = ('<script src="/html/shared/runtime/mission/mission-model.js"></script>\n'
        '<script src="/html/shared/runtime/mission/mission-store.js"></script>\n'
        + anchor1)
content = content.replace(anchor1, new1)

# 2. Hook createMission into escalateToExecPortal(), right after the TSM_EXEC_RELAY writes
anchor2 = """    sessionStorage.setItem('TSM_EXEC_RELAY', JSON.stringify(payload));
    localStorage.setItem('TSM_EXEC_RELAY', JSON.stringify(payload));
    fireCapabilitySweep_HEALTHCARE(payload);"""
assert content.count(anchor2) == 1, f"Expected 1 match of TSM_EXEC_RELAY write block, found {content.count(anchor2)}"

new2 = anchor2 + """
    // ── Phase 2: Mission Core creation, mirrors BPO's createMissionFromIntake pattern ──
    try {
      if (window.TSMMissionModel && window.TSMMissionStore) {
        const hasUrgent = Array.isArray(payload.alerts?.urgent) && payload.alerts.urgent.length > 0;
        const mission = window.TSMMissionModel.createMission({
          missionNo: payload.claimId || undefined,
          vertical: 'healthcare',
          tenantId: 'default',
          client: payload.claimId ? ('Claim ' + payload.claimId) : null,
          classification: {
            summary: payload.dashSummary || payload.aiSummary || '',
            source: 'HC Main Strategist'
          },
          workflow: {
            assignedTo: null,
            queue: null,
            priority: hasUrgent ? 'High' : 'normal',
            sla: null
          },
          actor: 'hc-main-strategist'
        });
        window.TSMMissionStore.saveMission(mission);
      } else {
        console.warn('Mission Core not loaded — skipping mission creation, TSM_EXEC_RELAY write still succeeded.');
      }
    } catch (missionErr) {
      console.warn('Mission Core creation failed (non-fatal, exec relay already written):', missionErr);
    }"""
content = content.replace(anchor2, new2)

with open(path, "w") as f:
    f.write(content)
print("Added mission-model.js/mission-store.js includes and createMission() hook to escalateToExecPortal()")
PYEOF

echo ""
echo "── Verifying script includes ──"
grep -n "mission-model.js\|mission-store.js" "$FILE"

echo ""
echo "── Verifying createMission hook ──"
grep -n "TSMMissionModel.createMission\|TSMMissionStore.saveMission" "$FILE"

echo ""
echo "Done. Backup at $BACKUP_DIR/hc-main-strategist.html"
echo "This does NOT touch node --check (html files can't be checked that way)."
echo "To test: load hc-main-strategist.html, trigger escalateToExecPortal() (the"
echo "'ESCALATE / RELAY TO EXEC' button), then check console for either a successful"
echo "mission creation or the 'Mission Core not loaded' warning — and verify via:"
echo "  window.TSMMissionStore.listMissions().filter(m => m.vertical === 'healthcare')"
