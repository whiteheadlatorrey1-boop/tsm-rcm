#!/usr/bin/env python3
"""
Apply-script: adds a hand-verified finops-operations APP_CONFIGS entry to
js/tsm-guide-engine.js (fixes the mismatched generic finops.warroom fallback
that was showing on that page). Run from repo root:

    python3 apply_finops_operations_guide.py

Asserts guard every step — if anything doesn't match exactly, it aborts
with no changes written, rather than silently mis-patching.
"""
import pathlib
import sys

TARGET = pathlib.Path("js/tsm-guide-engine.js")

ANCHOR_1_OLD = (
    'if (path.includes("finops-accounting")) app = "finops-accounting";\n'
    '    else if (path.includes("hc-denial-war-room")) app = "hc-denial-war-room";'
)
ANCHOR_1_NEW = (
    'if (path.includes("finops-accounting")) app = "finops-accounting";\n'
    '    else if (path.includes("finops-operations")) app = "finops-operations";\n'
    '    else if (path.includes("hc-denial-war-room")) app = "hc-denial-war-room";'
)

ANCHOR_2_OLD = (
    '"hc-denial-war-room": {\n'
    '      title: "GUIDE \u00b7 HC DENIAL WAR ROOM",\n'
    '      steps: [\n'
    '        { id: "s1", label: "Paste or drop a denial letter, EOB, or clinical record on the left" },\n'
    '        { id: "s2", label: "Click FIRE ALL 5 ENGINES" },\n'
    '        { id: "s3", label: "Review the recommended app(s) to fix the issue" },\n'
    '        { id: "s4", label: "Escalate to HC Main Strategist" }\n'
    '      ]\n'
    '    }\n'
    '  };'
)
ANCHOR_2_NEW = (
    '"hc-denial-war-room": {\n'
    '      title: "GUIDE \u00b7 HC DENIAL WAR ROOM",\n'
    '      steps: [\n'
    '        { id: "s1", label: "Paste or drop a denial letter, EOB, or clinical record on the left" },\n'
    '        { id: "s2", label: "Click FIRE ALL 5 ENGINES" },\n'
    '        { id: "s3", label: "Review the recommended app(s) to fix the issue" },\n'
    '        { id: "s4", label: "Escalate to HC Main Strategist" }\n'
    '      ]\n'
    '    },\n'
    '    // Verified against html/finops-suite/finops-operations.html. This page is\n'
    '    // an 11-tab wealth-management back office (Cashiering, Service Requests,\n'
    '    // Compliance, etc.), not the "ledger ingestion -> margin audit -> relay\n'
    '    // to strategist" shape the generic finops.warroom fallback assumes \u2014 that\n'
    '    // generic config\'s trigger words (LEDGER/MARGIN/STRATEGIST/RELAY) don\'t\n'
    '    // match anything real on this page, so its step tracker never advanced.\n'
    '    // These 4 steps use real button label text pulled from the page\'s own\n'
    '    // Cashiering/Service Requests/Compliance tabs. Note: like most of this\n'
    '    // page\'s demo actions, the underlying buttons are toast-only (no\n'
    '    // persisted DOM/storage flag written on click) \u2014 so this uses the\n'
    '    // click-text heuristic tracker (no APP_STATE_CHECKERS entry), same\n'
    '    // honesty convention as the generic GUIDE_CONFIGS fallbacks elsewhere in\n'
    '    // this file. Treat step-completion here as a rough hint, not a\n'
    '    // guarantee, same as any other unverified page.\n'
    '    "finops-operations": {\n'
    '      title: "GUIDE \u00b7 FINOPS OPERATIONS BACK OFFICE",\n'
    '      steps: [\n'
    '        { id: "s1", label: "Post or reconcile a transaction (Cashiering tab)", triggerText: ["POST TXN", "RECONCILE DAY"] },\n'
    '        { id: "s2", label: "Run an AI Exception, Compliance, or Audit review", triggerText: ["AI EXCEPTION ANALYSIS", "AI COMPLIANCE REVIEW", "AI AUDIT ANALYSIS"] },\n'
    '        { id: "s3", label: "Triage service requests or resolve a compliance flag", triggerText: ["ANALYZE", "PRIORITIZE", "MARK IN PROGRESS", "RESOLVE"] },\n'
    '        { id: "s4", label: "Generate & export a report", triggerText: ["GENERATE REPORT", "EXPORT"] }\n'
    '      ]\n'
    '    }\n'
    '  };'
)


def main():
    if not TARGET.exists():
        sys.exit(f"ERROR: {TARGET} not found — run this from the repo root.")

    text = TARGET.read_text(encoding="utf-8")

    assert text.count(ANCHOR_1_OLD) == 1, (
        "ERROR: detection-line anchor not found exactly once — file has "
        "diverged from what this script expects. No changes made."
    )
    assert text.count(ANCHOR_2_OLD) == 1, (
        "ERROR: APP_CONFIGS anchor not found exactly once — file has "
        "diverged from what this script expects. No changes made."
    )
    assert "finops-operations" not in text, (
        "ERROR: 'finops-operations' already present in this file — "
        "looks like the fix is already applied. No changes made."
    )

    text = text.replace(ANCHOR_1_OLD, ANCHOR_1_NEW, 1)
    text = text.replace(ANCHOR_2_OLD, ANCHOR_2_NEW, 1)

    TARGET.write_text(text, encoding="utf-8")
    print(f"OK: patched {TARGET}")
    print("Run: node --check js/tsm-guide-engine.js")


if __name__ == "__main__":
    main()
