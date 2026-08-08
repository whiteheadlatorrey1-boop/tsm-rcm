#!/usr/bin/env python3
"""
Wires html/finops-suite/tsm-rcm-os.html to read cross-module exceptions
from TSMMemory (populated by supplier-vendor-situation-room.html,
logistics-situation-room.html, and now compliance.html) and surface them
in the existing Executive tab as a new "Cross-Module Exceptions" block.
CRITICAL-severity items get a mission created via TSMMissionModel /
TSMMissionStore (vertical: 'finops'), matching the pattern already used
in finops-main-strategist.html. Mission ids are derived from the anomaly
id, so re-running renderExecExceptions() is idempotent (saveMission
overwrites by id, no duplicate missions).

Depends on:
  - apply_memory_sector_fix.py having been applied (routes supplier-vendor
    and logistics paths into the 'finops' TSMMemory sector)
  - apply_compliance_memory_wiring.py having been applied (compliance.html
    now also writes into TSMMemory)

Run from repo root:
    python3 apply_rcm_os_exceptions_wiring.py
"""
import pathlib
import sys

TARGET = pathlib.Path("html/finops-suite/tsm-rcm-os.html")

# ── Anchor 1: add script includes ───────────────────────────────────────
OLD_1 = """<script src="js/rcm-relay-client.js"></script>
<script src="js/rcm-assistant.js"></script>
"""
NEW_1 = OLD_1 + """<script src="/shared/tsm-memory-engine.js?v=phase3"></script>
<script src="/html/shared/runtime/mission/mission-model.js"></script>
<script src="/html/shared/runtime/mission/mission-store.js"></script>
"""

# ── Anchor 2: add the exec-block markup, right after the CFO block ─────
OLD_2 = """      <div class="exec-block">
        <div class="exec-block-title">CFO Executive Intelligence</div>
        <div id="execCfo"></div>
      </div>

      <button class="exec-export-btn" id="execExportBtn">↓ Export Executive Report</button>"""

NEW_2 = """      <div class="exec-block">
        <div class="exec-block-title">CFO Executive Intelligence</div>
        <div id="execCfo"></div>
      </div>

      <div class="exec-block">
        <div class="exec-block-title">Cross-Module Exceptions <span style="color:var(--muted-dim); font-weight:400; text-transform:none; letter-spacing:0; font-size:11.5px;">(live from Compliance, Vendor, and Logistics situation rooms)</span></div>
        <div id="execExceptions"></div>
      </div>

      <button class="exec-export-btn" id="execExportBtn">↓ Export Executive Report</button>"""

# ── Anchor 3: add the render function + call it from renderExecutive() ─
OLD_3 = """  const ap = document.getElementById('execActionPlan');
  const cfo = document.getElementById('execCfo');
  if(relayData){
    ap.innerHTML = `<div class="exec-block-body">${escapeHtml(relayData.engines.actionPlan || '(not generated)')}</div>`;
    cfo.innerHTML = `<div class="exec-block-body">${escapeHtml(relayData.engines.executive || '(not generated)')}</div>`;
  } else {
    ap.innerHTML = `<div class="exec-empty">No document has been relayed from FinOps Doc Showcase yet — fire the engines there and send it over to see the Controller action plan here.</div>`;
    cfo.innerHTML = `<div class="exec-empty">No CFO briefing available yet.</div>`;
  }
}"""

NEW_3 = """  const ap = document.getElementById('execActionPlan');
  const cfo = document.getElementById('execCfo');
  if(relayData){
    ap.innerHTML = `<div class="exec-block-body">${escapeHtml(relayData.engines.actionPlan || '(not generated)')}</div>`;
    cfo.innerHTML = `<div class="exec-block-body">${escapeHtml(relayData.engines.executive || '(not generated)')}</div>`;
  } else {
    ap.innerHTML = `<div class="exec-empty">No document has been relayed from FinOps Doc Showcase yet — fire the engines there and send it over to see the Controller action plan here.</div>`;
    cfo.innerHTML = `<div class="exec-empty">No CFO briefing available yet.</div>`;
  }

  renderExecExceptions();
}

// ─────────────────────────────────────────────────────────────────────────
// CROSS-MODULE EXCEPTIONS — reads TSMMemory anomalies registered by
// Compliance, Vendor Situation Room, and Logistics Situation Room; ranks
// by severity; opens a mission for anything CRITICAL.
// ─────────────────────────────────────────────────────────────────────────
const EXC_SEV_RANK = { CRITICAL:4, HIGH:3, MEDIUM:2, LOW:1 };

function renderExecExceptions(){
  const el = document.getElementById('execExceptions');
  if(!el) return;

  if(!window.TSMMemory){
    el.innerHTML = `<div class="exec-empty">Memory layer not loaded — no cross-module exceptions available.</div>`;
    return;
  }

  const mem = window.TSMMemory.get();
  const open = (mem?.anomalies || [])
    .filter(a => a.status === 'open')
    .sort((a,b) => (EXC_SEV_RANK[b.severity]||0) - (EXC_SEV_RANK[a.severity]||0));

  if(!open.length){
    el.innerHTML = `<div class="exec-empty">No open exceptions from Compliance, Vendor, or Logistics right now.</div>`;
    return;
  }

  el.innerHTML = `<div class="exec-block-body" style="max-height:300px;">${open.map(a => `
    <div class="req-field" style="border-top:1px solid var(--line); padding:8px 0;">
      <div class="req-field-top">
        <span class="req-field-name">${escapeHtml(a.title || a.anomalyCode)}</span>
        <span class="req-badge" title="${escapeHtml(a.source||'')}">${escapeHtml(a.severity)} · ${escapeHtml(a.entityType||'')}</span>
      </div>
    </div>`).join('')}</div>`;

  if(!(window.TSMMissionModel && window.TSMMissionStore)){
    console.warn('Mission Core not loaded — skipping mission creation for critical exceptions.');
    return;
  }

  open.filter(a => a.severity === 'CRITICAL').forEach(a => {
    try {
      const mission = window.TSMMissionModel.createMission({
        id: 'RCM-EXC-' + a.id,
        vertical: 'finops',
        tenantId: 'default',
        client: a.entityId || null,
        classification: {
          summary: a.title || a.anomalyCode,
          source: a.source || 'RCM-OS Cross-Module Exceptions'
        },
        workflow: { assignedTo: null, queue: null, priority: 'Critical', sla: null },
        actor: 'rcm-os-executive-tab'
      });
      window.TSMMissionStore.saveMission(mission);
    } catch(missionErr){
      console.warn('Mission creation failed for exception', a.id, missionErr);
    }
  });
}"""

def main():
    if not TARGET.exists():
        print(f"ERROR: {TARGET} not found. Run this from the repo root.")
        sys.exit(1)

    text = TARGET.read_text()

    assert text.count(OLD_1) == 1, "Anchor 1 (script includes) not found or not unique"
    assert text.count(OLD_2) == 1, "Anchor 2 (exec-block markup) not found or not unique"
    assert text.count(OLD_3) == 1, "Anchor 3 (renderExecutive tail) not found or not unique"

    text = text.replace(OLD_1, NEW_1)
    text = text.replace(OLD_2, NEW_2)
    text = text.replace(OLD_3, NEW_3)

    TARGET.write_text(text)
    print(f"Patched {TARGET} (3 insertions)")

if __name__ == "__main__":
    main()
