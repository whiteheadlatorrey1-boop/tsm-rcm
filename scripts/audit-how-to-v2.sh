#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
OUT="${ROOT}/docs/how-to-audit"

mkdir -p "$OUT"

python3 - "$ROOT" "$OUT" <<'PY'
import sys
import re
import json
from pathlib import Path
from collections import Counter, defaultdict

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2]).resolve()
HTML = ROOT / "html"

SKIP = {
    "node_modules",
    ".git",
    "dist",
    "build",
    "test-results",
    "playwright-report"
}

# ------------------------------------------------------------
# Strong signals
# ------------------------------------------------------------

START_SIGNALS = [
    "start here",
    "getting started",
    "quick start",
    "begin",
    "launch",
    "open",
    "choose",
    "select",
    "upload",
    "import",
    "intake",
]

ANALYSIS_SIGNALS = [
    "analyze",
    "analysis",
    "scan",
    "review",
    "assess",
    "detect",
    "identify",
    "classify",
    "extract",
    "findings",
    "anomal",
    "risk",
]

DECISION_SIGNALS = [
    "recommend",
    "recommendation",
    "decision",
    "prioritize",
    "priority",
    "strategist",
    "approve",
    "approval",
    "escalate",
    "triage",
]

EXECUTION_SIGNALS = [
    "assign",
    "execute",
    "resolve",
    "submit",
    "send",
    "create case",
    "create task",
    "appeal",
    "recover",
    "close",
    "remediate",
]

OUTPUT_SIGNALS = [
    "export",
    "download",
    "generate report",
    "generate",
    "report",
    "summary",
    "brief",
    "snapshot",
    "proposal",
    "package",
    "presentation",
    "pdf",
    "csv",
    "xlsx",
]

VALUE_SIGNALS = [
    "revenue",
    "recovery",
    "savings",
    "cost",
    "exposure",
    "risk",
    "compliance",
    "sla",
    "backlog",
    "leakage",
    "denial",
    "exception",
    "loss",
    "opportunity",
    "waste",
    "audit",
    "performance",
]

REAL_ACTION_PATTERNS = [
    r'<button\b',
    r'<input\b',
    r'<select\b',
    r'<textarea\b',
    r'onclick\s*=',
    r'addEventListener\s*\(',
    r'fetch\s*\(',
    r'location\.',
    r'window\.open',
    r'form\b',
]

REPORT_ACTION_PATTERNS = [
    r'export',
    r'download',
    r'print',
    r'generate.*report',
    r'create.*report',
    r'pdf',
    r'csv',
    r'xlsx',
    r'window\.print',
]

VERTICALS = [
    "healthcare",
    "construction",
    "bpo",
    "mortgage",
    "real estate",
    "insurance",
    "legal",
    "schools",
    "hotel",
    "hotelops",
    "logistics",
    "finops",
    "finance",
    "tax",
    "itops",
    "noc",
    "property",
    "supplier",
    "vendor",
    "crm",
    "catalog",
    "cpq",
    "approval",
]


def clean(s):
    return re.sub(r'\s+', ' ', s or '').strip()


def text_only(html):
    html = re.sub(r'<script\b[^>]*>.*?</script>', ' ', html,
                  flags=re.I | re.S)
    html = re.sub(r'<style\b[^>]*>.*?</style>', ' ', html,
                  flags=re.I | re.S)
    html = re.sub(r'<[^>]+>', ' ', html)
    return clean(html)


def hits(text, terms):
    low = text.lower()
    return sorted(set(t for t in terms if t in low))


def pattern_hits(raw, patterns):
    low = raw.lower()
    return sum(bool(re.search(p, low)) for p in patterns)


def title(raw):
    m = re.search(
        r'<title[^>]*>(.*?)</title>',
        raw,
        flags=re.I | re.S
    )
    return clean(m.group(1)) if m else ""


def headings(raw):
    found = []
    for m in re.finditer(
        r'<h[1-4][^>]*>(.*?)</h[1-4]>',
        raw,
        flags=re.I | re.S
    ):
        value = clean(text_only(m.group(1)))
        if value:
            found.append(value)
    return found[:20]


def verticals(path, text):
    combined = (str(path) + " " + text).lower()
    return [
        v for v in VERTICALS
        if v in combined
    ]


def score(d):
    # Strong evidence only.
    s = 0

    if d["real_actions"] >= 3:
        s += 15
    elif d["real_actions"] >= 1:
        s += 8

    if d["start"]:
        s += 8

    if d["analysis"]:
        s += 12

    if d["decision"]:
        s += 12

    if d["execution"]:
        s += 12

    if d["output_action"]:
        s += 18

    if d["value"]:
        s += 15

    if d["has_war_room"]:
        s += 10

    if d["has_strategist"]:
        s += 10

    if d["has_executive"]:
        s += 10

    if d["has_ai"]:
        s += 8

    # Penalize pages that are mostly static/presentation content.
    if d["real_actions"] == 0:
        s -= 20

    return max(0, min(100, s))


pages = []

for path in sorted(HTML.rglob("*.html")):

    if any(part in SKIP for part in path.parts):
        continue

    try:
        raw = path.read_text(errors="ignore")
    except Exception:
        continue

    text = text_only(raw)

    d = {
        "path": str(path.relative_to(ROOT)),
        "title": title(raw),
        "headings": headings(raw),
        "verticals": verticals(path, text),

        "start": hits(text, START_SIGNALS),
        "analysis": hits(text, ANALYSIS_SIGNALS),
        "decision": hits(text, DECISION_SIGNALS),
        "execution": hits(text, EXECUTION_SIGNALS),
        "output": hits(text, OUTPUT_SIGNALS),
        "value": hits(text, VALUE_SIGNALS),

        "real_actions": pattern_hits(raw, REAL_ACTION_PATTERNS),
        "output_action": pattern_hits(raw, REPORT_ACTION_PATTERNS),

        "has_war_room": bool(re.search(
            r'war[- ]room|situation[- ]room|command[- ]center',
            str(path) + " " + text,
            re.I
        )),

        "has_strategist": bool(re.search(
            r'strategist',
            str(path) + " " + text,
            re.I
        )),

        "has_executive": bool(re.search(
            r'executive|portal|dashboard',
            str(path) + " " + text,
            re.I
        )),

        "has_ai": bool(re.search(
            r'copilot|assistant|ai analysis|artificial intelligence|neural',
            str(path) + " " + text,
            re.I
        )),

        "has_howto": bool(re.search(
            r'how\s+to|how-to|getting\s+started|quick\s+start|user\s+guide',
            text,
            re.I
        )),
    }

    d["score"] = score(d)

    if d["score"] >= 70:
        d["priority"] = "P0"
    elif d["score"] >= 50:
        d["priority"] = "P1"
    elif d["score"] >= 30:
        d["priority"] = "P2"
    else:
        d["priority"] = "P3"

    # Determine where the How-To guidance is probably missing.
    gaps = []

    if not d["has_howto"]:
        gaps.append("HOW-TO")

    if d["real_actions"] > 0 and not d["start"]:
        gaps.append("START")

    if d["analysis"] and not d["decision"]:
        gaps.append("DECISION")

    if d["decision"] and not d["execution"]:
        gaps.append("EXECUTION")

    if d["output_action"] and not d["output"]:
        gaps.append("OUTPUT")

    if d["value"] and not d["output_action"]:
        gaps.append("BUSINESS-VALUE")

    d["gaps"] = gaps

    pages.append(d)


pages.sort(key=lambda x: (-x["score"], x["path"]))


# ------------------------------------------------------------
# Identify workflow families
# ------------------------------------------------------------

families = defaultdict(list)

for p in pages:

    path = p["path"].lower()

    family = None

    if "war-rooms/" in path:
        parts = path.split("/")
        try:
            idx = parts.index("war-rooms")
            family = parts[idx + 1]
        except Exception:
            pass

    if not family:
        if p["verticals"]:
            family = p["verticals"][0]

    if family:
        families[family].append(p)


# ------------------------------------------------------------
# Report
# ------------------------------------------------------------

md = []

md.append("# TSM How-To Workflow Audit V2")
md.append("")
md.append(
    "This version focuses on **real interaction and workflow signals**, "
    "rather than merely finding words such as `report` or `workflow`."
)
md.append("")

md.append("## Executive Summary")
md.append("")
md.append(f"- HTML pages scanned: **{len(pages)}**")
md.append(
    f"- P0 candidates: **{sum(p['priority']=='P0' for p in pages)}**"
)
md.append(
    f"- P1 candidates: **{sum(p['priority']=='P1' for p in pages)}**"
)
md.append(
    f"- Pages with real UI actions: "
    f"**{sum(p['real_actions'] > 0 for p in pages)}**"
)
md.append(
    f"- Pages with actual report/export code signals: "
    f"**{sum(p['output_action'] > 0 for p in pages)}**"
)
md.append(
    f"- Pages already containing obvious How-To language: "
    f"**{sum(p['has_howto'] for p in pages)}**"
)
md.append("")

md.append("## The TSM How-To Standard")
md.append("")
md.append("""
Every important application should eventually communicate this sequence:

**PROBLEM → START → INPUT → ANALYZE → REVIEW → DECIDE → EXECUTE → REPORT → MEASURE**

A user should never have to wonder what to do next.
""")

md.append("## P0 — Start Here")
md.append("")

for p in pages:
    if p["priority"] != "P0":
        continue

    md.append(
        f"### {p['path']}"
    )
    md.append(
        f"**Score:** {p['score']}  "
        f"**Title:** {p['title'] or 'Untitled'}"
    )

    if p["verticals"]:
        md.append(
            f"**Vertical:** {', '.join(p['verticals'])}"
        )

    md.append(
        f"**Signals:** "
        f"actions={p['real_actions']}, "
        f"report-actions={p['output_action']}"
    )

    if p["gaps"]:
        md.append(
            f"**Likely guidance gaps:** "
            f"{', '.join(p['gaps'])}"
        )

    if p["headings"]:
        md.append(
            "**Headings:** " +
            " | ".join(p["headings"][:8])
        )

    md.append("")

md.append("## P1 — High-Value Enhancement Candidates")
md.append("")

for p in pages:
    if p["priority"] != "P1":
        continue

    md.append(
        f"- **{p['score']}** `{p['path']}` — "
        f"{p['title'] or 'Untitled'}"
    )

    if p["gaps"]:
        md.append(
            f"  - Gaps: {', '.join(p['gaps'])}"
        )

md.append("")
md.append("## Report-Producing Workflows")
md.append("")

report_pages = [
    p for p in pages
    if p["output_action"] > 0
]

for p in report_pages[:150]:
    md.append(
        f"- `{p['path']}` — "
        f"{', '.join(p['output'][:10])}"
    )

md.append("")
md.append("## Pages That Need Business-Value Guidance")
md.append("")

value_candidates = [
    p for p in pages
    if "BUSINESS-VALUE" in p["gaps"]
]

for p in value_candidates[:150]:
    md.append(
        f"- `{p['path']}` — "
        f"{', '.join(p['value'][:12])}"
    )

md.append("")
md.append("## Workflow Families")
md.append("")

for family, items in sorted(
    families.items(),
    key=lambda x: (-len(x[1]), x[0])
):

    best = sorted(
        items,
        key=lambda x: -x["score"]
    )[:5]

    md.append(f"### {family}")
    md.append("")

    for p in best:
        md.append(
            f"- `{p['path']}` — score {p['score']}"
        )

    md.append("")

md.append("## Recommended UX Pattern")
md.append("")
md.append("""
### HOW TO USE THIS WORKSPACE

**1. What problem are you solving?**

Choose the business problem.

**2. Start**

Load your data, documents, records, or scenario.

**3. Analyze**

Run the applicable analysis.

**4. Review**

Understand findings, severity, exposure, root cause, and confidence.

**5. Decide**

Review recommendations and determine the next action.

**6. Execute**

Assign, resolve, escalate, appeal, approve, recover, or otherwise act.

**7. Generate the Output**

Create the report/package/brief that matters to the next stakeholder.

**8. Measure the Result**

Show dollars recovered, risk reduced, backlog removed, compliance improved,
time saved, or another measurable business outcome.
""")

md.append("")
md.append("## Recommended Report Language")
md.append("")
md.append("""
Avoid:

> Generate Report

Prefer:

> **Generate Revenue Leakage Snapshot**  
> Shows where money is being lost, the amount exposed, the root causes,
> and which issues should be addressed first.

> **Generate Executive Brief**  
> Converts operational findings into a management-ready summary of risk,
> financial exposure, decisions, and recommended actions.

> **Generate Compliance Package**  
> Packages exceptions, evidence, ownership, severity, and remediation
> status for management or audit review.

> **Generate Recovery Package**  
> Converts identified financial or operational leakage into actionable
> recovery opportunities and next steps.
""")

md.append("")
md.append("## Implementation Recommendation")
md.append("")
md.append("""
Do **not** add a giant How-To page to every HTML file.

Instead build a reusable TSM How-To component with:

- Start Here
- Current workflow
- Step indicator
- Next action
- Why this matters
- Expected output
- Report recommendations
- Business value
- Back / Next navigation
- Context-aware links

Then configure that component per vertical/workspace.
""")

(OUT / "how-to-workflow-audit-v2.md").write_text(
    "\n".join(md)
)

(OUT / "how-to-workflow-audit-v2.json").write_text(
    json.dumps(
        {
            "pageCount": len(pages),
            "pages": pages,
            "workflowFamilies": {
                k: [p["path"] for p in v]
                for k, v in families.items()
            }
        },
        indent=2
    )
)

print("============================================================")
print(" TSM HOW-TO AUDIT V2 COMPLETE")
print("============================================================")
print()
print(f"Pages scanned: {len(pages)}")
print(
    "P0 candidates:",
    sum(p["priority"] == "P0" for p in pages)
)
print(
    "P1 candidates:",
    sum(p["priority"] == "P1" for p in pages)
)
print(
    "Real-action pages:",
    sum(p["real_actions"] > 0 for p in pages)
)
print(
    "Report-action pages:",
    sum(p["output_action"] > 0 for p in pages)
)
print(
    "Existing How-To pages:",
    sum(p["has_howto"] for p in pages)
)
print()
print("Top 30:")
print("------------------------------------------------------------")

for p in pages[:30]:
    print(
        f"{p['priority']:<3} "
        f"{p['score']:>3} "
        f"{p['path']}"
    )

print()
print(
    "Report:",
    OUT / "how-to-workflow-audit-v2.md"
)
print(
    "JSON:",
    OUT / "how-to-workflow-audit-v2.json"
)
