#!/usr/bin/env python3
"""
Adds Mortgage as an 8th column/vertical to the capability-matrix spec.

IMPORTANT — run this AFTER merging fix/hipaa-iso-soc2-governance-gaps
into main (or on any branch that has BOTH the relocated spec at
tests/e2e/enterprise-capability-coverage.spec.js AND the mortgage
vertical at html/war-rooms/mortgage/). Right now those two things live
on different branches. If run against a branch missing the mortgage
pages, the new test will just report all pages UNREACHABLE.

Terms are NOT from a reference email (none exists yet for Mortgage) —
they're grounded in a manual content audit of the actual rendered
pages (false positives like "los" inside "closing" and "title" as a
CSS class name were checked for and excluded). 6/10 capabilities are
already covered by real content; Integration Hub and Digital Twin are
currently empty (no matched terms at all) — flagged, not hidden.

Run from repo root:
    python3 add-mortgage-to-matrix.py
Idempotent — safe to re-run.
"""
import sys

SPEC_PATH = "tests/e2e/enterprise-capability-coverage.spec.js"

# (capability key in MATRIX, exact line to anchor after, new Mortgage entry)
MATRIX_INSERTS = [
    ("Order-to-Cash",          "    'BPO Services': ['client delivery', 'invoicing'],",
                                "    Mortgage: ['closing', 'funding'],"),
    ("CRM",                    "    'BPO Services': ['client', 'workforce'],",
                                "    Mortgage: ['borrower', 'loan officer'],"),
    ("CPQ",                    "    'BPO Services': ['outsourcing proposal'],",
                                "    Mortgage: ['loan program', 'rate lock'],"),
    ("Product Catalog",        "    'BPO Services': ['service catalog'],",
                                "    Mortgage: ['loan product', 'program'],"),
    ("Approval Center",        "    'BPO Services': ['qa approval'],",
                                "    Mortgage: ['condition', 'underwriting approval'],"),
    ("Master Data Management", "    'BPO Services': ['client', 'employee'],",
                                "    Mortgage: ['borrower', 'loan file'],"),
    ("Integration Hub",        "    'BPO Services': ['ocr', 'rpa', 'erp'],",
                                "    Mortgage: ['aus', 'credit report', 'flood cert'],"),
    ("Governance",             "    'BPO Services': ['iso', 'soc2', 'sla'],",
                                "    Mortgage: ['compliance', 'exception'],"),
    ("WIP Command Center",     "    'BPO Services': ['work queue', 'queue'],",
                                "    Mortgage: ['pipeline', 'stage'],"),
    ("Digital Twin",           "    'BPO Services': ['workforce planning'],",
                                "    Mortgage: ['portfolio forecast', 'servicing forecast'],"),
]

VERTICALS_OLD = """  { column: 'BPO Services', key: 'BPO', pages: [
    '/html/bpo/bpo-situation-room.html',
    '/html/bpo/bpo-strategist-v2.html',
    '/html/bpo/bpo-executive-portal.html',
  ]},
];"""

VERTICALS_NEW = """  { column: 'BPO Services', key: 'BPO', pages: [
    '/html/bpo/bpo-situation-room.html',
    '/html/bpo/bpo-strategist-v2.html',
    '/html/bpo/bpo-executive-portal.html',
  ]},
  { column: 'Mortgage', key: 'Mortgage', pages: [
    '/html/war-rooms/mortgage/mortgage-war-room.html',
    '/html/war-rooms/mortgage/mortgage-strategist.html',
    '/html/war-rooms/mortgage/mortgage-executive-portal.html',
  ]},
];"""

def main():
    with open(SPEC_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    changed = False

    for label, anchor, new_line in MATRIX_INSERTS:
        if new_line.strip() in content:
            print(f"[SKIP] {label}: Mortgage column already present")
            continue
        if anchor not in content:
            print(f"[FAIL] {label}: anchor line not found — spec file may have changed")
            sys.exit(1)
        content = content.replace(anchor, anchor + "\n" + new_line, 1)
        print(f"[OK]   {label}: added Mortgage column")
        changed = True

    if VERTICALS_NEW in content:
        print("[SKIP] VERTICALS: Mortgage entry already present")
    elif VERTICALS_OLD in content:
        content = content.replace(VERTICALS_OLD, VERTICALS_NEW, 1)
        print("[OK]   VERTICALS: added Mortgage entry")
        changed = True
    else:
        print("[FAIL] VERTICALS: anchor block not found — spec file may have changed")
        sys.exit(1)

    if changed:
        with open(SPEC_PATH, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\nWritten to {SPEC_PATH}")
    print("\nNext:")
    print("  npx playwright test enterprise-capability-coverage.spec.js --reporter=list")
    print("  cat reports/logs/capability-matrix-coverage.json")

if __name__ == '__main__':
    main()