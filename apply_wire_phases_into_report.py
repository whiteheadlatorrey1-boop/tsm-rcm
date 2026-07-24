#!/usr/bin/env python3
"""
CONFIRMED FINDING: the "Phase 1-4" cards on construction-strategist.html
(.phase-card blocks: Foundation/Structure/Envelope/Systems, % complete,
due dates, blockers) are 100% static hardcoded markup. They are never
read by any JS on the page -- not by runConstructionBNCAFromRelay()'s
Groq prompt, not by storeStrategistRelay(), not by pushToSentinel().
The only data that reaches the BNCA report / Sentinel Center is the
war room's 6-engine relay (docType, snapshot.risk/exposure, engines
e1/e3/e4/e5/e6). Real project-phase status has zero path into the
report or the anomaly pushed to Sentinel.

CORRECTED (2026-07-23): the original version of this script assumed
pushToSentinel()'s `impacts` field was still a static `{}`. Since this
script was written, a separate fix landed that populates it with
`impacts: impact ? { financial: impact } : {}` (financial-impact data).
This version merges phase data into that instead of overwriting it, and
fixes a cosmetic indentation mismatch in the ctx-template anchor.

This patch:
  1. Adds getPhaseSnapshot() -- reads the 4 .phase-card DOM blocks into
     a structured array (phase, name, pct, due, desc).
  2. Adds phaseSnapshotToText() -- flattens that into readable lines.
  3. Injects "PROJECT PHASE STATUS" into the ctx sent to Groq, so the
     BNCA brief and recommended actions can actually reference real
     phase-level risk (e.g. "Phase 4 Systems at 5%, due Jan 20 -- MEP
     inspection blocker compounds schedule risk").
  4. Merges getPhaseSnapshot() into pushToSentinel()'s `impacts` field
     alongside the existing financial-impact data, so Sentinel Center
     receives phase-level detail with the anomaly instead of losing
     the financial impact that's already there.
  5. Adds `payload.phases` to storeStrategistRelay(), so the Executive
     Portal (which reads this same relay key) gets it too.

Run from the repo root (contains html/construction-suite/construction-strategist.html):
    python3 apply_wire_phases_into_report.py
"""
import pathlib

TARGET = pathlib.Path("html/construction-suite/construction-strategist.html")

# 1. Insert getPhaseSnapshot()/phaseSnapshotToText() right before the
#    Sentinel relay helpers block, which is where pushToSentinel() lives.
OLD_ANCHOR = "// ═══════════════════════════════════════════════════\n// SENTINEL RELAY HELPERS"
NEW_ANCHOR = """// ═══════════════════════════════════════════════════
// PROJECT PHASE SNAPSHOT
// ═══════════════════════════════════════════════════
// Reads the .phase-card blocks rendered in the Strategist view (currently
// static markup) into a structured object, so the BNCA report and the
// Sentinel/Executive relay payloads can carry real phase-level status
// instead of only the war room's 6-engine risk/exposure summary.
function getPhaseSnapshot() {
  return Array.from(document.querySelectorAll('.phase-card')).map(card => {
    const meta = card.querySelectorAll('.ph-meta span');
    return {
      phase: card.querySelector('.ph-tag')?.textContent?.trim() || '',
      name: card.querySelector('.ph-name')?.textContent?.trim() || '',
      pct: meta[0]?.textContent?.trim() || '',
      due: meta[1]?.textContent?.trim() || '',
      desc: card.querySelector('.ph-desc')?.textContent?.trim() || ''
    };
  });
}
function phaseSnapshotToText(phases) {
  return phases.map(p => `${p.phase} -- ${p.name}: ${p.pct}, ${p.due}. ${p.desc}`).join('\\n');
}

// ═══════════════════════════════════════════════════
// SENTINEL RELAY HELPERS"""

# 2. Inject phase status into the Groq ctx template.
#    (Fixed: real file has a 2-space indent before the closing `.trim();`)
OLD_CTX = "ENGINE 06 — BNCA EXEC: ${engines.e6||''}\n  `.trim();"
NEW_CTX = ("ENGINE 06 — BNCA EXEC: ${engines.e6||''}\n"
           "PROJECT PHASE STATUS:\n${phaseSnapshotToText(getPhaseSnapshot())}\n"
           "  `.trim();")

# 3. Merge phase data into pushToSentinel()'s impacts field, alongside the
#    financial-impact data a later fix already put there (was previously
#    static `{}` when this script was first written -- no longer true).
OLD_IMPACTS = ("    recommendedAction: topAction ? `${topAction.text}${topAction.owner ? ' (Owner: ' + topAction.owner + ')' : ''}` : 'See strategist brief.',\n"
               "    impacts: impact ? { financial: impact } : {}\n  };")
NEW_IMPACTS = ("    recommendedAction: topAction ? `${topAction.text}${topAction.owner ? ' (Owner: ' + topAction.owner + ')' : ''}` : 'See strategist brief.',\n"
               "    impacts: { ...(impact ? { financial: impact } : {}), phases: getPhaseSnapshot() }\n  };")

# 4. Add payload.phases to storeStrategistRelay()'s relay object.
OLD_PAYLOAD = "    timestamp: new Date().toISOString(),\n    chainStep: 'strategist'\n  };"
NEW_PAYLOAD = "    timestamp: new Date().toISOString(),\n    chainStep: 'strategist',\n    phases: getPhaseSnapshot()\n  };"

def main():
    assert TARGET.exists(), f"Not found: {TARGET} (run this from the repo root)"
    text = TARGET.read_text()

    checks = [
        ("phase snapshot anchor", OLD_ANCHOR),
        ("groq ctx template", OLD_CTX),
        ("pushToSentinel impacts", OLD_IMPACTS),
        ("storeStrategistRelay payload", OLD_PAYLOAD),
    ]
    for label, old in checks:
        count = text.count(old)
        assert count == 1, f"Expected exactly 1 match for {label}, found {count} -- aborting, file may have changed"

    text = text.replace(OLD_ANCHOR, NEW_ANCHOR)
    text = text.replace(OLD_CTX, NEW_CTX)
    text = text.replace(OLD_IMPACTS, NEW_IMPACTS)
    text = text.replace(OLD_PAYLOAD, NEW_PAYLOAD)

    TARGET.write_text(text)

    final = TARGET.read_text()
    assert "function getPhaseSnapshot()" in final
    assert "PROJECT PHASE STATUS" in final
    assert "impacts: { ...(impact ? { financial: impact } : {}), phases: getPhaseSnapshot() }" in final
    assert "phases: getPhaseSnapshot()" in final and final.count("getPhaseSnapshot()") >= 4

    print(f"OK: patched {TARGET}")
    print("  Added getPhaseSnapshot()/phaseSnapshotToText()")
    print("  Groq ctx now includes PROJECT PHASE STATUS")
    print("  pushToSentinel() impacts now merges phase data with existing financial impact")
    print("  storeStrategistRelay() payload now includes phases (reaches Executive Portal too)")

if __name__ == "__main__":
    main()