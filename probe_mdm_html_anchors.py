#!/usr/bin/env python3
"""
Read-only probe. Checks whether the anchor strings the Phase 5 HTML patch
needs are present in your current branch's copies of the 3 MDM pages.
Doesn't modify anything. Run from repo root: python3 probe_mdm_html_anchors.py
"""

ANCHORS = {
    'html/war-rooms/mdm/mdm-executive-portal.html': [
        '{"key": "total_records", "label": "TOTAL RECORDS", "fmt": "num", "cls": "cyan"}, {"key": "duplicate_count", "label": "DUPLICATES", "fmt": "num", "cls": "red"}, {"key": "quality_score", "label": "QUALITY SCORE"',
    ],
    'html/war-rooms/mdm/mdm-strategist.html': [
        ".history-row .src{color:var(--gold)}",
        '<div id="content"><div class="empty">Loading relay from War Room&hellip;</div></div>',
        "if(e.key === 'TSM_MDM_RELAY') loadRelay();\n  });\n})();",
    ],
    'html/war-rooms/mdm/mdm-war-room.html': [
        ".kpi-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:20px}",
        "{ id:'stewards_active',  label:'Active Stewards',  unit:'count' }\n  ];",
        "stewards_active:new Set(records.map(r=>r.steward)).size };",
    ],
}

all_ok = True
for path, anchors in ANCHORS.items():
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"MISSING FILE: {path}")
        all_ok = False
        continue
    for a in anchors:
        n = content.count(a)
        status = "OK" if n == 1 else f"MISMATCH (found {n}x)"
        if n != 1:
            all_ok = False
        print(f"[{status}] {path}\n    anchor: {a[:80]!r}")

print()
if all_ok:
    print("All anchors matched exactly once — safe to request the HTML apply-script.")
else:
    print("Some anchors did not match. Paste the MISMATCH lines' surrounding")
    print("current file content back and the script will be re-anchored to match.")