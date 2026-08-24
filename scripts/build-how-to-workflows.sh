#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
AUDIT="${ROOT}/docs/how-to-audit/how-to-workflow-audit-v2.json"
OUT="${ROOT}/docs/how-to-audit"

echo "============================================================"
echo " TSM HOW-TO WORKFLOW BUILDER"
echo "============================================================"

if [[ ! -f "$AUDIT" ]]; then
  echo "ERROR: Missing audit inventory:"
  echo "  $AUDIT"
  echo
  echo "Run first:"
  echo "  ./scripts/audit-how-to-v2.sh"
  exit 1
fi

mkdir -p "$OUT"

python3 - "$ROOT" "$AUDIT" "$OUT" <<'PY'
import sys
import json
import re
from pathlib import Path
from datetime import datetime, timezone

root = Path(sys.argv[1]).resolve()
audit_path = Path(sys.argv[2]).resolve()
out = Path(sys.argv[3]).resolve()

data = json.loads(audit_path.read_text())

# ------------------------------------------------------------
# Normalize audit records
# ------------------------------------------------------------

if isinstance(data, dict):
    pages = (
        data.get("pages")
        or data.get("results")
        or data.get("inventory")
        or data.get("candidates")
        or []
    )
else:
    pages = data

if not isinstance(pages, list):
    raise SystemExit("ERROR: Could not find page inventory in audit JSON")

# ------------------------------------------------------------
# Classification helpers
# ------------------------------------------------------------

VERTICALS = {
    "healthcare": ["health", "medical", "denial", "claim", "revenue", "pharmacy"],
    "construction": ["construction", "construct", "permit", "proposal", "field", "wip"],
    "mortgage": ["mortgage", "reo", "origination", "underwriting", "closing"],
    "real_estate": ["real-estate", "real_estate", "property", "realty", "reo"],
    "insurance": ["insurance", "ins-", "claim", "underwriting", "agent", "ahip"],
    "legal": ["legal", "matter", "case", "compliance"],
    "finops": ["finops", "financial", "finance", "accounting", "auditops"],
    "bpo": ["bpo", "staffing", "vendor", "supplier"],
    "hotel": ["hotel", "hotelops", "concierge"],
    "itops": ["l1", "noc", "servicenow", "vmware", "cyber", "incident"],
    "schools": ["schools", "school", "education"],
}

PAINPOINTS = {
    "healthcare": [
        "denial leakage",
        "revenue-cycle backlog",
        "appeal prioritization",
        "documentation gaps",
        "operational exceptions",
    ],
    "construction": [
        "project cost leakage",
        "permit delays",
        "change-order exposure",
        "billing/WIP backlog",
        "field-office disconnect",
    ],
    "mortgage": [
        "pipeline bottlenecks",
        "documentation exceptions",
        "underwriting risk",
        "closing delays",
        "loan fallout",
    ],
    "real_estate": [
        "property operational leakage",
        "maintenance backlog",
        "vendor performance",
        "turnover delays",
        "portfolio visibility",
    ],
    "insurance": [
        "claims leakage",
        "compliance exposure",
        "agent productivity",
        "underwriting risk",
        "appeal/claim backlog",
    ],
    "legal": [
        "matter backlog",
        "deadline risk",
        "document review burden",
        "compliance exposure",
        "case prioritization",
    ],
    "finops": [
        "financial leakage",
        "invoice exceptions",
        "close-cycle delays",
        "spend visibility",
        "audit exposure",
    ],
    "bpo": [
        "processing backlog",
        "SLA misses",
        "quality variance",
        "manual processing",
        "client reporting burden",
    ],
    "hotel": [
        "maintenance response",
        "guest-service coordination",
        "occupancy/revenue leakage",
        "vendor coordination",
        "operational visibility",
    ],
    "itops": [
        "ticket backlog",
        "incident response delays",
        "SLA risk",
        "endpoint/network troubleshooting",
        "knowledge gaps",
    ],
    "schools": [
        "grant compliance",
        "documentation gaps",
        "administrative backlog",
        "vendor risk",
        "operational exceptions",
    ],
    "general": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "reporting burden",
        "limited executive visibility",
    ],
}

REPORTS = {
    "healthcare": [
        "Denial Recovery Report",
        "Revenue Leakage Report",
        "Appeal Priority Queue",
        "Executive Revenue-Cycle Brief",
    ],
    "construction": [
        "Project Risk Report",
        "WIP & Billing Report",
        "Permit/Proposal Exception Report",
        "Executive Project Brief",
    ],
    "mortgage": [
        "Loan Pipeline Risk Report",
        "Underwriting Exception Report",
        "Closing Readiness Report",
        "Executive Mortgage Brief",
    ],
    "real_estate": [
        "Property Operations Report",
        "Maintenance Exception Report",
        "Vendor Performance Report",
        "Portfolio Executive Brief",
    ],
    "insurance": [
        "Claims Risk Report",
        "Compliance Exception Report",
        "Underwriting Risk Report",
        "Executive Insurance Brief",
    ],
    "legal": [
        "Matter Risk Report",
        "Deadline/Exception Report",
        "Document Intelligence Brief",
        "Executive Legal Brief",
    ],
    "finops": [
        "Financial Exception Report",
        "Spend/Leakage Report",
        "Close Readiness Report",
        "Executive Finance Brief",
    ],
    "bpo": [
        "SLA Performance Report",
        "Processing Exception Report",
        "Quality/Throughput Report",
        "Client Executive Brief",
    ],
    "hotel": [
        "Hotel Operations Report",
        "Maintenance Exception Report",
        "Guest-Service Report",
        "Executive Hotel Brief",
    ],
    "itops": [
        "Incident Summary Report",
        "Ticket/SLA Report",
        "Root-Cause Report",
        "Executive IT Operations Brief",
    ],
    "schools": [
        "Compliance Exception Report",
        "Grant/Documentation Risk Report",
        "Operational Exception Report",
        "Executive Schools Brief",
    ],
    "general": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report",
    ],
}

# ------------------------------------------------------------
# Determine vertical
# ------------------------------------------------------------

def infer_vertical(record):
    text = " ".join([
        str(record.get("path", "")),
        str(record.get("file", "")),
        str(record.get("title", "")),
        str(record.get("vertical", "")),
        str(record.get("verticals", "")),
    ]).lower()

    for vertical, terms in VERTICALS.items():
        if any(term in text for term in terms):
            return vertical

    return "general"

# ------------------------------------------------------------
# Determine signals
# ------------------------------------------------------------

def get_actions(r):
    for k in ("actions", "action_count", "real_actions"):
        if isinstance(r.get(k), int):
            return r[k]
    return 0

def get_reports(r):
    for k in ("report-actions", "report_actions", "report_actions_count"):
        if isinstance(r.get(k), int):
            return r[k]
    return 0

def get_score(r):
    for k in ("score", "priority_score"):
        if isinstance(r.get(k), (int, float)):
            return r[k]
    return 0

# ------------------------------------------------------------
# Build workflow records
# ------------------------------------------------------------

workflows = []

for r in pages:
    if not isinstance(r, dict):
        continue

    path = r.get("path") or r.get("file") or r.get("relative_path")

    if not path:
        continue

    vertical = infer_vertical(r)
    actions = get_actions(r)
    reports = get_reports(r)
    score = get_score(r)

    title = r.get("title") or Path(path).stem

    gaps = r.get("guidance_gaps") or r.get("likely_guidance_gaps") or []

    if isinstance(gaps, str):
        gaps = [x.strip() for x in gaps.split(",") if x.strip()]

    workflow_priority = "P0" if score >= 80 or actions >= 5 else "P1"

    workflows.append({
        "path": path,
        "title": title,
        "vertical": vertical,
        "priority": workflow_priority,
        "score": score,
        "actions": actions,
        "report_actions": reports,
        "existing_how_to": "HOW-TO" not in gaps,
        "guidance_gaps": gaps,
        "pain_points": PAINPOINTS[vertical],
        "recommended_reports": REPORTS[vertical],
        "workflow": [
            "PROBLEM",
            "START",
            "INPUT",
            "ANALYZE",
            "REVIEW",
            "DECIDE",
            "EXECUTE",
            "REPORT",
            "MEASURE",
        ],
    })

workflows.sort(
    key=lambda x: (
        0 if x["priority"] == "P0" else 1,
        -x["score"],
        -x["actions"],
        x["path"],
    )
)

# ------------------------------------------------------------
# Vertical catalogs
# ------------------------------------------------------------

vertical_catalog = {}

for vertical in sorted(set(x["vertical"] for x in workflows)):
    rows = [x for x in workflows if x["vertical"] == vertical]

    vertical_catalog[vertical] = {
        "pages": len(rows),
        "workflow_pages": sum(1 for x in rows if x["actions"] > 0),
        "report_capable_pages": sum(1 for x in rows if x["report_actions"] > 0),
        "pain_points": PAINPOINTS[vertical],
        "recommended_reports": REPORTS[vertical],
        "top_pages": [x["path"] for x in rows[:10]],
    }

# ------------------------------------------------------------
# Write JSON
# ------------------------------------------------------------

manifest = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "standard": [
        "PROBLEM",
        "START",
        "INPUT",
        "ANALYZE",
        "REVIEW",
        "DECIDE",
        "EXECUTE",
        "REPORT",
        "MEASURE",
    ],
    "page_count": len(workflows),
    "workflows": workflows,
}

(out / "workflow-manifest.json").write_text(
    json.dumps(manifest, indent=2)
)

(out / "business-painpoint-catalog.json").write_text(
    json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "verticals": vertical_catalog,
    }, indent=2)
)

# ------------------------------------------------------------
# Report catalog
# ------------------------------------------------------------

report_catalog = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "reports_by_vertical": {
        v: REPORTS[v] for v in sorted(REPORTS)
    },
    "reporting_standard": [
        "What happened?",
        "Why does it matter?",
        "What is the exposure?",
        "What should happen next?",
        "Who owns the action?",
        "What changed after execution?",
    ],
}

(out / "report-catalog.json").write_text(
    json.dumps(report_catalog, indent=2)
)

# ------------------------------------------------------------
# Coverage Markdown
# ------------------------------------------------------------

md = []

md.append("# TSM How-To Workflow Coverage\n")
md.append(
    "Generated from the V2 workflow audit. "
    "This document identifies where user guidance should be added "
    "and what business outcome each workflow should communicate.\n"
)

md.append("## Operating Standard\n")
md.append(
    "**PROBLEM → START → INPUT → ANALYZE → REVIEW → DECIDE → "
    "EXECUTE → REPORT → MEASURE**\n"
)

md.append("## Coverage Summary\n")
md.append(f"- Pages inventoried: **{len(workflows)}**")
md.append(f"- P0 workflow candidates: **{sum(x['priority']=='P0' for x in workflows)}**")
md.append(f"- P1 workflow candidates: **{sum(x['priority']=='P1' for x in workflows)}**")
md.append(f"- Pages with actions: **{sum(x['actions']>0 for x in workflows)}**")
md.append(f"- Pages with report actions: **{sum(x['report_actions']>0 for x in workflows)}**\n")

md.append("## Vertical Workflow Map\n")

for v, info in vertical_catalog.items():
    md.append(f"### {v.title()}")
    md.append(f"- Pages: {info['pages']}")
    md.append(f"- Workflow pages: {info['workflow_pages']}")
    md.append(f"- Report-capable pages: {info['report_capable_pages']}")
    md.append("- Primary pain points:")
    for p in info["pain_points"]:
        md.append(f"  - {p}")
    md.append("- Priority reports:")
    for report in info["recommended_reports"]:
        md.append(f"  - {report}")
    md.append("")

md.append("## Top 100 Pages Requiring Workflow Guidance\n")

for i, x in enumerate(workflows[:100], 1):
    md.append(f"### {i}. `{x['path']}`")
    md.append(f"- **Title:** {x['title']}")
    md.append(f"- **Priority:** {x['priority']}")
    md.append(f"- **Vertical:** {x['vertical']}")
    md.append(f"- **Actions:** {x['actions']}")
    md.append(f"- **Report actions:** {x['report_actions']}")
    md.append("- **Pain points:** " + ", ".join(x["pain_points"]))
    md.append("- **Recommended reports:** " + ", ".join(x["recommended_reports"]))
    md.append("")

(out / "workflow-coverage.md").write_text("\n".join(md))

# ------------------------------------------------------------
# CSV
# ------------------------------------------------------------

import csv

with (out / "workflow-manifest.csv").open("w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow([
        "priority",
        "score",
        "vertical",
        "path",
        "title",
        "actions",
        "report_actions",
        "pain_points",
        "recommended_reports",
    ])

    for x in workflows:
        writer.writerow([
            x["priority"],
            x["score"],
            x["vertical"],
            x["path"],
            x["title"],
            x["actions"],
            x["report_actions"],
            "; ".join(x["pain_points"]),
            "; ".join(x["recommended_reports"]),
        ])

print("Generated:")
print(f"  {out / 'workflow-manifest.json'}")
print(f"  {out / 'workflow-manifest.csv'}")
print(f"  {out / 'report-catalog.json'}")
print(f"  {out / 'business-painpoint-catalog.json'}")
print(f"  {out / 'workflow-coverage.md'}")
print()
print(f"Pages processed: {len(workflows)}")
print(f"P0: {sum(x['priority']=='P0' for x in workflows)}")
print(f"P1: {sum(x['priority']=='P1' for x in workflows)}")
PY

echo
echo "============================================================"
echo " BUILD COMPLETE"
echo "============================================================"
