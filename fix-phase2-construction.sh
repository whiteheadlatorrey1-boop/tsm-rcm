#!/bin/bash
set -e

FILE="html/construction-suite/construction-strategist.html"
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".phase2-con-backups/$TS"
mkdir -p "$BACKUP_DIR"
cp "$FILE" "$BACKUP_DIR/construction-strategist.html"
echo "Backed up to $BACKUP_DIR"

python3 << 'PYEOF'
path = "html/construction-suite/construction-strategist.html"
with open(path) as f:
    content = f.read()

anchor1 = '<script src="/js/tsm-mission-store.js"></script>'
assert content.count(anchor1) == 1, f"Expected 1 match of tsm-mission-store.js include, found {content.count(anchor1)}"
new1 = ('<script src="/html/shared/runtime/mission/mission-model.js"></script>\n'
        '  ' + anchor1)
content = content.replace(anchor1, new1)

anchor2 = """    sessionStorage.setItem('TSM_CONSTRUCTION_STRATEGIST_RELAY', JSON.stringify(payload));
    localStorage.setItem('tsm_construction_strategist_output', JSON.stringify(payload));
  } catch(e) { console.warn('Store error:', e); }

  // Also escalate to Sentinel Center in its own expected shape/storage.
  pushToSentinel(bncaText, conObj || lastConObj);"""
assert content.count(anchor2) == 1, f"Expected 1 match of relay write block, found {content.count(anchor2)}"

new2 = """    sessionStorage.setItem('TSM_CONSTRUCTION_STRATEGIST_RELAY', JSON.stringify(payload));
    localStorage.setItem('tsm_construction_strategist_output', JSON.stringify(payload));
  } catch(e) { console.warn('Store error:', e); }

  // ── Phase 2: Mission Core creation ──
  // NOTE: Construction already has its own TSMMissionStore (html/js/tsm-mission-store.js,
  // a class instance keyed to localStorage["TSM_MISSION_STORE"]) — a DIFFERENT system than
  // the runtime/ scaffold's TSMMissionStore used by Healthcare/Legal. We use
  // TSMMissionModel.createMission() for canonical schema, but push into the EXISTING store
  // via addMission(), not the scaffold's store, to avoid a global-name collision.
  try {
    if (window.TSMMissionModel && window.TSMMissionStore && typeof window.TSMMissionStore.addMission === 'function') {
      const mission = window.TSMMissionModel.createMission({
        vertical: 'construction',
        tenantId: 'default',
        client: payload.docType ? ('Construction ' + payload.docType) : null,
        classification: {
          summary: payload.summary || payload.bncaText || '',
          scenario: payload.scenario || null,
          source: 'Construction Strategist'
        },
        workflow: {
          assignedTo: null,
          queue: null,
          priority: 'normal', // no reliable risk/urgency signal available locally; see snapshot.risk (upstream, unverified)
          sla: null
        },
        actor: 'construction-strategist'
      });
      mission.status = mission.stage; // existing store's getByStatus() filters on .status, not .stage
      window.TSMMissionStore.addMission(mission);
    } else {
      console.warn('Mission Core (model) or existing TSMMissionStore not available — skipping mission creation, strategist relay write already succeeded.');
    }
  } catch (missionErr) {
    console.warn('Mission Core creation failed (non-fatal, strategist relay already written):', missionErr);
  }

  // Also escalate to Sentinel Center in its own expected shape/storage.
  pushToSentinel(bncaText, conObj || lastConObj);"""
content = content.replace(anchor2, new2)

with open(path, "w") as f:
    f.write(content)
print("Added mission-model.js include and Mission Core hook to storeStrategistRelay()")
PYEOF

echo ""
echo "── Verifying script include ──"
grep -n "mission-model.js" "$FILE"

echo ""
echo "── Verifying hook ──"
grep -n "TSMMissionModel.createMission\|TSMMissionStore.addMission" "$FILE"

echo ""
echo "Done. Backup at $BACKUP_DIR/construction-strategist.html"
