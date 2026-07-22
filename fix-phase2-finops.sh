#!/bin/bash
set -e

FILE="html/finops-suite/finops-main-strategist.html"
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".phase2-finops-backups/$TS"
mkdir -p "$BACKUP_DIR"
cp "$FILE" "$BACKUP_DIR/finops-main-strategist.html"
echo "Backed up to $BACKUP_DIR"

python3 << 'PYEOF'
path = "html/finops-suite/finops-main-strategist.html"
with open(path) as f:
    content = f.read()

# 1. Add Mission Core script includes before tsm-mission-engine.js
anchor1 = '  <script src="/js/core/tsm-mission-engine.js"></script>'
assert content.count(anchor1) == 1, f"Expected 1 match of tsm-mission-engine.js include, found {content.count(anchor1)}"
new1 = ('  <script src="/html/shared/runtime/mission/mission-model.js"></script>\n'
        '  <script src="/html/shared/runtime/mission/mission-store.js"></script>\n'
        + anchor1)
content = content.replace(anchor1, new1)

# 2. Hook createMission into relayToExecutive(), after the localStorage write,
#    before the toast/navigation.
anchor2 = """  showRelayToast('Relaying to Executive Portal...');
  setTimeout(()=>{ window.location.href='finops-executive-portal.html';}, 1200);
}"""
assert content.count(anchor2) == 1, f"Expected 1 match of toast+navigate block, found {content.count(anchor2)}"

new2 = """  // ── Phase 2: Mission Core creation ──
  try {
    if (window.TSMMissionModel && window.TSMMissionStore) {
      function finopsMissionParseExposure(str){
        if (!str) return 0;
        const nums = String(str).match(/[\\d,]+(?:\\.\\d+)?/g);
        if (!nums) return 0;
        const mult = /m\\b/i.test(str) ? 1000000 : (/k\\b/i.test(str) ? 1000 : 1);
        // Range strings like "$91,800–$112,200" match multiple numbers; use the highest.
        const vals = nums.map(n => parseFloat(n.replace(/,/g,'')) * mult);
        return Math.round(Math.max.apply(null, vals));
      }
      const finopsExposureVal = finopsMissionParseExposure(_expM ? _expM[1] : (existing.exposure || null));
      const finopsRiskStr = _riskM ? _riskM[1] : (existing.riskScore || null);
      const finopsRiskNum = finopsRiskStr ? parseInt(finopsRiskStr) : null;
      const finopsPriority =
        finopsExposureVal >= 500000 || (finopsRiskNum !== null && finopsRiskNum >= 80) ? 'Critical'
        : finopsExposureVal >= 100000 || (finopsRiskNum !== null && finopsRiskNum >= 60) ? 'High'
        : finopsExposureVal >= 25000 || (finopsRiskNum !== null && finopsRiskNum >= 40) ? 'Medium'
        : 'normal';
      const mission = window.TSMMissionModel.createMission({
        vertical: 'finops',
        tenantId: 'default',
        client: relaySource || null,
        classification: {
          summary: output || '',
          exposure: _expM ? _expM[1] : (existing.exposure || null),
          riskScore: finopsRiskStr,
          source: 'FinOps Strategist'
        },
        workflow: {
          assignedTo: null,
          queue: null,
          priority: finopsPriority,
          sla: null
        },
        actor: 'finops-main-strategist'
      });
      window.TSMMissionStore.saveMission(mission);
    } else {
      console.warn('Mission Core not loaded — skipping mission creation, FinOps relay write already succeeded.');
    }
  } catch (missionErr) {
    console.warn('Mission Core creation failed (non-fatal, FinOps relay already written):', missionErr);
  }

  showRelayToast('Relaying to Executive Portal...');
  setTimeout(()=>{ window.location.href='finops-executive-portal.html';}, 1200);
}"""
content = content.replace(anchor2, new2)

with open(path, "w") as f:
    f.write(content)
print("Added mission-model.js/mission-store.js includes and createMission() hook to relayToExecutive()")
PYEOF

echo ""
echo "── Verifying script includes ──"
grep -n "mission-model.js\|mission-store.js" "$FILE"

echo ""
echo "── Verifying createMission hook ──"
grep -n "TSMMissionModel.createMission\|TSMMissionStore.saveMission" "$FILE"

echo ""
echo "Done. Backup at $BACKUP_DIR/finops-main-strategist.html"
