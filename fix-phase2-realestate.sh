#!/bin/bash
set -e

FILE="html/reo-pro/re-strategist.html"
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".phase2-re-backups/$TS"
mkdir -p "$BACKUP_DIR"
cp "$FILE" "$BACKUP_DIR/re-strategist.html"
echo "Backed up to $BACKUP_DIR"

python3 << 'PYEOF'
path = "html/reo-pro/re-strategist.html"
with open(path) as f:
    content = f.read()

# 1. Add Mission Core script includes before tsm-mission-engine.js
anchor1 = '  <script src="/js/core/tsm-mission-engine.js"></script>'
assert content.count(anchor1) == 1, f"Expected 1 match of tsm-mission-engine.js include, found {content.count(anchor1)}"
new1 = ('  <script src="/html/shared/runtime/mission/mission-model.js"></script>\n'
        '  <script src="/html/shared/runtime/mission/mission-store.js"></script>\n'
        + anchor1)
content = content.replace(anchor1, new1)

# 2. Hook createMission into escalateToExec(), right after the three relay writes,
#    before the SENTINEL PUSH block. Reuses reSeverityForExposure's number once
#    computed — but that's computed INSIDE the sentinel try block below our anchor,
#    so we compute exposure/severity independently here using the same payload.kpis.dollarRisk
#    source, before the sentinel block, to avoid depending on sentinel-local vars.
anchor2 = """    localStorage.setItem('TSM_RE_WAR_RELAY', JSON.stringify(payload));
    sessionStorage.setItem('TSM_RE_WAR_RELAY', JSON.stringify(payload));
    localStorage.setItem('tsm_re_strat_payload', JSON.stringify(payload));

    // ── SENTINEL PUSH ────────────────────────────────────────────────"""
assert content.count(anchor2) == 1, f"Expected 1 match of relay write + sentinel header, found {content.count(anchor2)}"

new2 = """    localStorage.setItem('TSM_RE_WAR_RELAY', JSON.stringify(payload));
    sessionStorage.setItem('TSM_RE_WAR_RELAY', JSON.stringify(payload));
    localStorage.setItem('tsm_re_strat_payload', JSON.stringify(payload));

    // ── Phase 2: Mission Core creation ──
    try {
      if (window.TSMMissionModel && window.TSMMissionStore) {
        function reMissionParseExposure(str){
          if (!str) return 0;
          const nums = String(str).match(/[\\d,]+(?:\\.\\d+)?/g);
          if (!nums) return 0;
          const mult = /m\\b/i.test(str) ? 1000000 : (/k\\b/i.test(str) ? 1000 : 1);
          return Math.round(parseFloat(nums[0].replace(/,/g,'')) * mult);
        }
        const reMissionExposure = reMissionParseExposure(payload.kpis && payload.kpis.dollarRisk);
        const reMissionPriority = reMissionExposure >= 2000000 ? 'Critical'
          : reMissionExposure >= 500000 ? 'High'
          : reMissionExposure >= 100000 ? 'Medium'
          : 'normal';
        const mission = window.TSMMissionModel.createMission({
          vertical: 'realestate',
          tenantId: 'default',
          client: payload.reportTitle || payload.docName || null,
          classification: {
            summary: payload.fullBrief || payload.narrative || payload.summary || '',
            source: 'RE Strategist'
          },
          workflow: {
            assignedTo: null,
            queue: null,
            priority: reMissionPriority,
            sla: null
          },
          actor: 're-strategist'
        });
        window.TSMMissionStore.saveMission(mission);
      } else {
        console.warn('Mission Core not loaded — skipping mission creation, RE relay writes already succeeded.');
      }
    } catch (missionErr) {
      console.warn('Mission Core creation failed (non-fatal, RE relay already written):', missionErr);
    }

    // ── SENTINEL PUSH ────────────────────────────────────────────────"""
content = content.replace(anchor2, new2)

with open(path, "w") as f:
    f.write(content)
print("Added mission-model.js/mission-store.js includes and createMission() hook to escalateToExec()")
PYEOF

echo ""
echo "── Verifying script includes ──"
grep -n "mission-model.js\|mission-store.js" "$FILE"

echo ""
echo "── Verifying createMission hook ──"
grep -n "TSMMissionModel.createMission\|TSMMissionStore.saveMission" "$FILE"

echo ""
echo "Done. Backup at $BACKUP_DIR/re-strategist.html"
