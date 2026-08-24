#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
OUT_DIR="${2:-docs/how-to-audit}"

mkdir -p "$ROOT/$OUT_DIR"

REPORT="$ROOT/$OUT_DIR/how-to-workflow-audit.md"
JSON="$ROOT/$OUT_DIR/how-to-workflow-audit.json"
CSV="$ROOT/$OUT_DIR/how-to-workflow-pages.csv"

echo "============================================================"
echo " TSM HOW-TO / WORKFLOW / BUSINESS VALUE AUDIT"
echo "============================================================"
echo "Root: $ROOT"
echo "Output: $ROOT/$OUT_DIR"
echo

python3 - "$ROOT" "$REPORT" "$JSON" "$CSV" <<'PY'
import sys
import os
import re
import json
import csv
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(sys.argv[1]).resolve()
REPORT = Path(sys.argv[2]).resolve()
JSON_OUT = Path(sys.argv[3]).resolve()
CSV_OUT = Path(sys.argv[4]).resolve()

SKIP_DIRS = {
    "node_modules",
    ".git",
    "test-results",
    "playwright-report",
    ".next",
    "dist",
    "build"
}

HTML_ROOT = ROOT / "html"

HOWTO_TERMS = [
    "how to",
    "how-to",
    "getting started",
    "start here",
    "workflow",
    "user guide",
    "guide",
    "instructions",
    "quick start",
    "quickstart",
    "what to do",
    "next step",
    "steps",
]

ACTION_TERMS = [
    "upload",
    "import",
    "analyze",
    "analysis",
    "run",
    "execute",
    "submit",
    "review",
    "approve",
    "reject",
    "assign",
    "escalate",
    "resolve",
    "generate",
    "export",
    "download",
    "report",
    "presentation",
    "send",
    "save",
    "create",
    "open",
    "launch",
    "continue",
    "start",
]

REPORT_TERMS = [
    "report",
    "export",
    "download",
    "pdf",
    "csv",
    "xlsx",
    "excel",
    "presentation",
    "deck",
    "summary",
    "executive",
    "snapshot",
    "brief",
    "proposal",
    "letter",
    "package",
]

PAIN_TERMS = [
    "risk",
    "leak",
    "loss",
    "exposure",
    "exception",
    "denial",
    "compliance",
    "overdue",
    "backlog",
    "bottleneck",
    "delay",
    "cost",
    "revenue",
    "waste",
    "error",
    "anomaly",
    "failure",
    "sla",
    "audit",
    "missing",
    "unresolved",
    "recovery",
    "opportunity",
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
    "finance",
    "finops",
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


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.links = []
        self.buttons = []
        self.inputs = []
        self.headings = []
        self.scripts = []
        self.current_heading = None

    def handle_data(self, data):
        value = re.sub(r"\s+", " ", data).strip()
        if value:
            self.text.append(value)
            if self.current_heading:
                self.current_heading += " " + value

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)

        if tag in ("h1", "h2", "h3", "h4"):
            self.current_heading = ""

        if tag == "a":
            self.links.append({
                "text": "",
                "href": attrs.get("href", ""),
            })

        if tag == "button":
            self.buttons.append({
                "text": "",
                "id": attrs.get("id", ""),
                "class": attrs.get("class", ""),
                "onclick": attrs.get("onclick", ""),
            })

        if tag == "input":
            self.inputs.append({
                "type": attrs.get("type", ""),
                "name": attrs.get("name", ""),
                "id": attrs.get("id", ""),
                "placeholder": attrs.get("placeholder", ""),
            })

        if tag == "script":
            src = attrs.get("src")
            if src:
                self.scripts.append(src)

    def handle_endtag(self, tag):
        if tag in ("h1", "h2", "h3", "h4") and self.current_heading is not None:
            heading = self.current_heading.strip()
            if heading:
                self.headings.append(heading)
            self.current_heading = None

    def handle_startendtag(self, tag, attrs):
        attrs = dict(attrs)

        if tag == "input":
            self.inputs.append({
                "type": attrs.get("type", ""),
                "name": attrs.get("name", ""),
                "id": attrs.get("id", ""),
                "placeholder": attrs.get("placeholder", ""),
            })


def clean_text(text):
    return re.sub(r"\s+", " ", text or "").strip()


def contains_any(text, terms):
    text = text.lower()
    return [term for term in terms if term in text]


def score_page(data):
    score = 0

    score += min(len(data["howto_matches"]) * 5, 25)
    score += min(len(data["action_matches"]) * 2, 30)
    score += min(len(data["report_matches"]) * 3, 25)
    score += min(len(data["pain_matches"]) * 2, 20)

    if data["links"]:
        score += 5

    if data["buttons"]:
        score += 5

    if data["inputs"]:
        score += 5

    return min(score, 100)


def infer_vertical(path_text, text):
    combined = (path_text + " " + text).lower()

    matches = []
    for vertical in VERTICALS:
        if vertical in combined:
            matches.append(vertical)

    return matches[:8]


def infer_workflow_role(path, text, links, buttons):
    combined = (
        str(path) + " " +
        text + " " +
        " ".join(x.get("text", "") for x in links) + " " +
        " ".join(x.get("text", "") for x in buttons)
    ).lower()

    roles = []

    if any(x in combined for x in ["war room", "situation room", "command center"]):
        roles.append("INTAKE / ANALYSIS")

    if "strategist" in combined:
        roles.append("DECISION / STRATEGY")

    if any(x in combined for x in ["executive", "portal", "dashboard"]):
        roles.append("EXECUTIVE / OUTCOME")

    if any(x in combined for x in ["report", "export", "download", "presentation"]):
        roles.append("REPORT / DELIVERY")

    if any(x in combined for x in ["copilot", "assistant", "ai analysis"]):
        roles.append("AI / COPILOT")

    if any(x in combined for x in ["form", "intake", "submit"]):
        roles.append("INTAKE / DATA ENTRY")

    return roles


def relative(path):
    try:
        return str(path.relative_to(ROOT))
    except Exception:
        return str(path)


pages = []

if not HTML_ROOT.exists():
    raise SystemExit(f"Missing HTML directory: {HTML_ROOT}")

for path in sorted(HTML_ROOT.rglob("*.html")):
    if any(part in SKIP_DIRS for part in path.parts):
        continue

    try:
        raw = path.read_text(errors="ignore")
    except Exception:
        continue

    parser = PageParser()

    try:
        parser.feed(raw)
    except Exception:
        pass

    text = clean_text(" ".join(parser.text))

    for link in parser.links:
        # Extract visible link text approximately from nearby raw markup.
        href = link.get("href", "")
        if href:
            link["text"] = href

    for button in parser.buttons:
        button["text"] = clean_text(
            button.get("text", "") +
            " " +
            button.get("onclick", "")
        )

    rel = relative(path)

    data = {
        "path": rel,
        "filename": path.name,
        "title": "",
        "headings": parser.headings[:30],
        "howto_matches": contains_any(text, HOWTO_TERMS),
        "action_matches": contains_any(text, ACTION_TERMS),
        "report_matches": contains_any(text, REPORT_TERMS),
        "pain_matches": contains_any(text, PAIN_TERMS),
        "verticals": infer_vertical(rel, text),
        "workflow_roles": [],
        "links": parser.links[:100],
        "buttons": parser.buttons[:100],
        "inputs": parser.inputs[:100],
        "scripts": parser.scripts[:100],
        "text_length": len(text),
        "has_howto": False,
        "has_report_capability": False,
        "has_actions": False,
        "score": 0,
        "recommended_priority": "LOW",
    }

    title_match = re.search(
        r"<title[^>]*>(.*?)</title>",
        raw,
        flags=re.I | re.S
    )

    if title_match:
        data["title"] = clean_text(title_match.group(1))

    data["has_howto"] = bool(data["howto_matches"])
    data["has_report_capability"] = bool(data["report_matches"])
    data["has_actions"] = bool(data["action_matches"])

    data["workflow_roles"] = infer_workflow_role(
        path,
        text,
        parser.links,
        parser.buttons
    )

    data["score"] = score_page(data)

    if data["score"] >= 60:
        data["recommended_priority"] = "CRITICAL"
    elif data["score"] >= 40:
        data["recommended_priority"] = "HIGH"
    elif data["score"] >= 20:
        data["recommended_priority"] = "MEDIUM"

    pages.append(data)


# ------------------------------------------------------------
# JSON
# ------------------------------------------------------------

JSON_OUT.parent.mkdir(parents=True, exist_ok=True)

JSON_OUT.write_text(
    json.dumps(
        {
            "generatedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            "root": str(ROOT),
            "pageCount": len(pages),
            "pages": pages,
        },
        indent=2
    )
)


# ------------------------------------------------------------
# CSV
# ------------------------------------------------------------

with CSV_OUT.open("w", newline="") as f:
    writer = csv.writer(f)

    writer.writerow([
        "priority",
        "score",
        "path",
        "title",
        "verticals",
        "workflow_roles",
        "has_howto",
        "has_actions",
        "has_report_capability",
        "howto_matches",
        "action_matches",
        "report_matches",
        "pain_matches",
        "button_count",
        "link_count",
        "input_count",
    ])

    for p in sorted(
        pages,
        key=lambda x: (-x["score"], x["path"])
    ):
        writer.writerow([
            p["recommended_priority"],
            p["score"],
            p["path"],
            p["title"],
            ", ".join(p["verticals"]),
            ", ".join(p["workflow_roles"]),
            p["has_howto"],
            p["has_actions"],
            p["has_report_capability"],
            ", ".join(p["howto_matches"]),
            ", ".join(p["action_matches"]),
            ", ".join(p["report_matches"]),
            ", ".join(p["pain_matches"]),
            len(p["buttons"]),
            len(p["links"]),
            len(p["inputs"]),
        ])


# ------------------------------------------------------------
# MARKDOWN REPORT
# ------------------------------------------------------------

pages_sorted = sorted(
    pages,
    key=lambda x: (-x["score"], x["path"])
)

missing_howto = [
    p for p in pages
    if not p["has_howto"] and p["has_actions"]
]

report_pages = [
    p for p in pages
    if p["has_report_capability"]
]

workflow_pages = [
    p for p in pages
    if p["workflow_roles"]
]

vertical_counts = {}

for p in pages:
    for v in p["verticals"]:
        vertical_counts[v] = vertical_counts.get(v, 0) + 1


md = []

md.append("# TSM How-To / Workflow Enhancement Audit")
md.append("")
md.append(f"Generated from `{ROOT}`")
md.append("")
md.append(f"**HTML pages scanned:** {len(pages)}")
md.append("")
md.append(
    "This audit is intended to identify where TSM users need clearer "
    "navigation, workflow guidance, business-value explanation, and "
    "report-generation instructions."
)
md.append("")

md.append("## 1. Recommended Product Instruction Model")
md.append("")
md.append("""
Every major TSM workflow should eventually answer these questions:

1. **What business problem does this solve?**
2. **Who should use it?**
3. **What should I put into the system?**
4. **Where do I start?**
5. **What button/action do I take first?**
6. **What happens next?**
7. **What does the AI/engine determine?**
8. **What decision should I make?**
9. **What report/output should I generate?**
10. **Who receives the output?**
11. **What business pain does the output address?**
""")

md.append("## 2. Highest-Priority Pages")
md.append("")

for p in pages_sorted[:75]:
    md.append(
        f"- **{p['recommended_priority']} ({p['score']}/100)** "
        f"`{p['path']}` — {p['title'] or 'Untitled'}"
    )
    if p["workflow_roles"]:
        md.append(
            f"  - Workflow role: {', '.join(p['workflow_roles'])}"
        )
    if p["verticals"]:
        md.append(
            f"  - Vertical: {', '.join(p['verticals'])}"
        )

md.append("")
md.append("## 3. Pages With Actions But No Obvious How-To")
md.append("")

for p in sorted(
    missing_howto,
    key=lambda x: (-x["score"], x["path"])
)[:100]:
    md.append(
        f"- **{p['recommended_priority']} ({p['score']}/100)** "
        f"`{p['path']}`"
    )
    md.append(
        f"  - Actions detected: "
        f"{', '.join(p['action_matches'][:15])}"
    )
    if p["workflow_roles"]:
        md.append(
            f"  - Workflow role: {', '.join(p['workflow_roles'])}"
        )

md.append("")
md.append("## 4. Report / Output Opportunities")
md.append("")

for p in sorted(
    report_pages,
    key=lambda x: (-x["score"], x["path"])
)[:100]:
    md.append(
        f"- `{p['path']}` — "
        f"{', '.join(p['report_matches'][:15])}"
    )

md.append("")
md.append("## 5. Workflow Pages")
md.append("")

for p in sorted(
    workflow_pages,
    key=lambda x: (-x["score"], x["path"])
)[:100]:
    md.append(
        f"- `{p['path']}` — "
        f"{', '.join(p['workflow_roles'])}"
    )

md.append("")
md.append("## 6. Vertical Coverage")
md.append("")

for vertical, count in sorted(
    vertical_counts.items(),
    key=lambda x: (-x[1], x[0])
):
    md.append(f"- **{vertical}** — {count} page(s)")

md.append("")
md.append("## 7. Suggested How-To Architecture")
md.append("")

md.append("""
### A. START HERE

Explain:

- What this workspace does
- Who it is for
- What business problem it addresses
- What data the user needs
- Expected time to first useful result

### B. LOAD YOUR WORK

Explain:

- Upload/import
- Search/retrieve
- Intake forms
- Existing records
- Demo/sample data

### C. ANALYZE

Explain:

- What the analysis engine does
- What findings mean
- Severity/priority
- Exposure/dollar impact
- Exceptions
- Risks
- Opportunities

### D. DECIDE

Explain:

- What the Strategist does
- Recommended actions
- Escalations
- Approvals
- Assignment
- SLA/priority

### E. EXECUTE

Explain:

- Create case
- Assign owner
- Resolve exception
- Generate response
- Create task
- Send/export

### F. GENERATE THE BUSINESS OUTPUT

Every major workflow should identify its most valuable outputs.

Examples:

- Executive summary
- Exception report
- Revenue leakage report
- Denial recovery plan
- Compliance report
- Risk report
- Operations report
- Client-ready proposal
- BPO delivery package
- Management briefing
- Audit package

### G. MEASURE THE VALUE

Show:

- Dollars exposed
- Dollars recovered
- Risk reduced
- Exceptions resolved
- SLA improvement
- Backlog reduced
- Processing time saved
- Revenue opportunities identified
""")

md.append("")
md.append("## 8. What We Should Fix First")
md.append("")

md.append("""
The next enhancement pass should prioritize:

1. High-value pages with no How-To guidance.
2. Pages with many actions but unclear sequencing.
3. War Room pages that do not clearly explain what happens after analysis.
4. Strategist pages that do not explain how recommendations become actions.
5. Executive portals that do not clearly explain which reports matter.
6. Pages that generate valuable outputs but do not tell users why those outputs matter.
7. Duplicate workflows that use different terminology.
8. Orphaned tools that appear powerful but lack a clear entry point.
""")

md.append("")
md.append("## 9. Proposed Standard")
md.append("")

md.append("""
TSM should ultimately use a consistent **How-To Command Pattern**:

> **Problem → Start → Input → Analyze → Review → Decide → Execute → Report → Measure**

Each major application should expose this flow visibly.

The goal is not merely to teach users where buttons are.

The goal is to make the application continuously answer:

> **"What should I do next, and why does it matter to my business?"**
""")

REPORT.write_text("\n".join(md))

print(f"Scanned {len(pages)} HTML pages")
print(f"Markdown report: {REPORT}")
print(f"JSON inventory:   {JSON_OUT}")
print(f"CSV inventory:    {CSV_OUT}")

print()
print("TOP 20 HOW-TO ENHANCEMENT CANDIDATES")
print("------------------------------------------------------------")

for p in pages_sorted[:20]:
    print(
        f"{p['recommended_priority']:<8} "
        f"{p['score']:>3} "
        f"{p['path']}"
    )

print()
print(
    f"Pages with actions but no obvious How-To: "
    f"{len(missing_howto)}"
)

print(
    f"Pages with report/output indicators: "
    f"{len(report_pages)}"
)

print(
    f"Workflow-role pages: "
    f"{len(workflow_pages)}"
)

PY

echo
echo "============================================================"
echo " AUDIT COMPLETE"
echo "============================================================"
echo
echo "Review:"
echo "  $OUT_DIR/how-to-workflow-audit.md"
echo "  $OUT_DIR/how-to-workflow-audit.json"
echo "  $OUT_DIR/how-to-workflow-pages.csv"
echo
echo "============================================================"
