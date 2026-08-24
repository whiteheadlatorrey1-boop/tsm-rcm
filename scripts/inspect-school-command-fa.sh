#!/usr/bin/env bash
set -euo pipefail

FILE="${1:-html/school-command.html}"
OUT="${2:-/tmp/school-command-fa-inspection.txt}"

if [[ ! -f "$FILE" ]]; then
  echo "ERROR: File not found: $FILE"
  echo
  echo "Try:"
  echo "  find . -name 'school-command.html' -print"
  exit 1
fi

python3 - "$FILE" "$OUT" <<'PY'
import re
import sys
from pathlib import Path
from collections import Counter

file = Path(sys.argv[1])
out = Path(sys.argv[2])

text = file.read_text(errors="ignore")
lines = text.splitlines()

def section(title):
    print("\n" + "=" * 90)
    print(title)
    print("=" * 90)

def unique(items):
    seen = set()
    result = []
    for x in items:
        x = x.strip()
        if x and x not in seen:
            seen.add(x)
            result.append(x)
    return result

def show(title, items, limit=100):
    section(title)
    items = unique(items)
    if not items:
        print("(none found)")
        return
    for item in items[:limit]:
        print(item)
    if len(items) > limit:
        print(f"... {len(items)-limit} more")

print("TSM SCHOOL COMMAND — FINANCIAL AID DIRECTOR RECONNAISSANCE")
print("=" * 90)
print(f"File: {file}")
print(f"Size: {file.stat().st_size:,} bytes")
print(f"Lines: {len(lines):,}")
print()

# -------------------------------------------------------------------
# 1. BASIC STRUCTURE
# -------------------------------------------------------------------

section("1. DOCUMENT STRUCTURE")

tags = Counter(
    m.group(1).lower()
    for m in re.finditer(r"<\s*([a-zA-Z][\w:-]*)\b", text)
)

for tag, count in tags.most_common():
    print(f"{tag:25} {count}")

# -------------------------------------------------------------------
# 2. TITLES / HEADINGS
# -------------------------------------------------------------------

show(
    "2. HEADINGS / PAGE LABELS",
    re.findall(
        r"<(?:h1|h2|h3|h4|h5|h6)[^>]*>(.*?)</(?:h1|h2|h3|h4|h5|h6)>",
        text,
        re.I | re.S
    )
)

# -------------------------------------------------------------------
# 3. NAVIGATION
# -------------------------------------------------------------------

nav_matches = re.findall(
    r"<(?:a|button|li|div)[^>]*(?:nav|tab|menu|sidebar)[^>]*>(.*?)</(?:a|button|li|div)>",
    text,
    re.I | re.S
)

show("3. NAVIGATION / TABS / MENU LABELS", nav_matches, 150)

# -------------------------------------------------------------------
# 4. IDs / CLASSES
# -------------------------------------------------------------------

ids = re.findall(r'\bid=["\']([^"\']+)["\']', text, re.I)
classes = re.findall(r'\bclass=["\']([^"\']+)["\']', text, re.I)

show("4. IMPORTANT IDS", ids, 200)

class_tokens = []
for c in classes:
    class_tokens.extend(c.split())

show("5. IMPORTANT CSS CLASS TOKENS", class_tokens, 200)

# -------------------------------------------------------------------
# 5. BUTTONS
# -------------------------------------------------------------------

buttons = re.findall(
    r"<button\b[^>]*>(.*?)</button>",
    text,
    re.I | re.S
)

show("6. BUTTONS / USER ACTIONS", buttons, 200)

# -------------------------------------------------------------------
# 6. INPUTS / FILTERS / SEARCH
# -------------------------------------------------------------------

inputs = re.findall(
    r"<input\b[^>]*>",
    text,
    re.I
)

selects = re.findall(
    r"<select\b[^>]*>(.*?)</select>",
    text,
    re.I | re.S
)

show("7. INPUT ELEMENTS", inputs, 150)
show("8. SELECT / FILTER ELEMENTS", selects, 100)

# -------------------------------------------------------------------
# 7. TABLES / DATA
# -------------------------------------------------------------------

tables = re.findall(
    r"<table\b.*?</table>",
    text,
    re.I | re.S
)

show(
    "9. TABLE COUNT / DATA GRID SIGNALS",
    [
        f"Tables detected: {len(tables)}",
        f"TR elements: {len(re.findall(r'<tr\\b', text, re.I))}",
        f"TH elements: {len(re.findall(r'<th\\b', text, re.I))}",
        f"TD elements: {len(re.findall(r'<td\\b', text, re.I))}",
    ]
)

# -------------------------------------------------------------------
# 8. FINANCIAL AID DOMAIN SIGNALS
# -------------------------------------------------------------------

fa_terms = [
    "financial aid",
    "fafsa",
    "fsa",
    "student aid",
    "pell",
    "grant",
    "loan",
    "direct loan",
    "subsidized",
    "unsubsidized",
    "plus loan",
    "parent plus",
    "work study",
    "scholarship",
    "award",
    "disbursement",
    "refund",
    "eligibility",
    "verification",
    "satisfactory academic progress",
    "sap",
    "cost of attendance",
    "coa",
    "efc",
    "student aid index",
    "sai",
    "professional judgment",
    "pj",
    "special circumstances",
    "dependency override",
    "enrollment",
    "withdrawal",
    "return of title iv",
    "r2t4",
    "title iv",
    "federal",
    "state aid",
    "institutional aid",
    "packaging",
    "overaward",
    "overpayment",
    "reconciliation",
    "cash management",
    "compliance",
    "audit",
    "appeal",
    "appeals",
    "document",
    "missing document",
    "hold",
    "exception",
    "deadline",
    "task",
    "case",
    "queue",
    "escalation",
]

found_fa = []
lower = text.lower()

for term in fa_terms:
    count = lower.count(term)
    if count:
        found_fa.append(f"{term:35} {count}")

show("10. FINANCIAL AID DOMAIN SIGNALS", found_fa, 150)

# -------------------------------------------------------------------
# 9. OPERATIONS / CASE MANAGEMENT
# -------------------------------------------------------------------

ops_terms = [
    "case",
    "ticket",
    "task",
    "queue",
    "workflow",
    "work queue",
    "assignment",
    "owner",
    "assignee",
    "priority",
    "severity",
    "status",
    "escalation",
    "sla",
    "deadline",
    "due date",
    "aging",
    "exception",
    "resolution",
    "notes",
    "comment",
    "activity",
    "timeline",
    "audit",
    "history",
]

ops_found = []

for term in ops_terms:
    count = lower.count(term)
    if count:
        ops_found.append(f"{term:35} {count}")

show("11. OPERATIONS / CASE MANAGEMENT SIGNALS", ops_found)

# -------------------------------------------------------------------
# 10. DOCUMENT OPERATIONS
# -------------------------------------------------------------------

doc_terms = [
    "document",
    "documents",
    "upload",
    "uploaded",
    "attachment",
    "verification",
    "transcript",
    "identity",
    "tax",
    "w-2",
    "1098",
    "1099",
    "proof",
    "review",
    "ocr",
    "extract",
    "classification",
    "classify",
]

doc_found = []

for term in doc_terms:
    count = lower.count(term)
    if count:
        doc_found.append(f"{term:35} {count}")

show("12. DOCUMENT / VERIFICATION SIGNALS", doc_found)

# -------------------------------------------------------------------
# 11. AI / COPILOT
# -------------------------------------------------------------------

ai_terms = [
    "ai",
    "copilot",
    "assistant",
    "recommendation",
    "recommendations",
    "insight",
    "insights",
    "prediction",
    "predict",
    "neural",
    "llm",
    "openai",
    "gemini",
    "groq",
    "model",
    "explain",
    "reason",
    "reasoning",
    "decision",
]

ai_found = []

for term in ai_terms:
    count = lower.count(term)
    if count:
        ai_found.append(f"{term:35} {count}")

show("13. AI / DECISION SUPPORT SIGNALS", ai_found)

# -------------------------------------------------------------------
# 12. COMPLIANCE / AUDIT
# -------------------------------------------------------------------

compliance_terms = [
    "compliance",
    "regulatory",
    "regulation",
    "policy",
    "policies",
    "audit",
    "auditable",
    "audit trail",
    "history",
    "change log",
    "access log",
    "ferpa",
    "privacy",
    "security",
    "title iv",
    "federal",
    "department of education",
]

compliance_found = []

for term in compliance_terms:
    count = lower.count(term)
    if count:
        compliance_found.append(f"{term:35} {count}")

show("14. COMPLIANCE / AUDIT SIGNALS", compliance_found)

# -------------------------------------------------------------------
# 13. API / BACKEND
# -------------------------------------------------------------------

api_patterns = [
    r'fetch\(["\']([^"\']+)',
    r'axios\.(?:get|post|put|patch|delete)\(["\']([^"\']+)',
    r'["\'](/api/[^"\']+)',
    r'["\'](https?://[^"\']+)',
]

api_hits = []

for pattern in api_patterns:
    api_hits.extend(re.findall(pattern, text, re.I))

show("15. API / BACKEND ENDPOINTS", api_hits, 250)

# -------------------------------------------------------------------
# 14. JAVASCRIPT FUNCTIONS
# -------------------------------------------------------------------

functions = re.findall(
    r'(?:function\s+([A-Za-z_$][\w$]*)|(?:window\.)?([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function)',
    text
)

function_names = []

for a, b in functions:
    function_names.append(a or b)

show("16. JAVASCRIPT FUNCTIONS", function_names, 300)

# -------------------------------------------------------------------
# 15. EVENT HANDLERS
# -------------------------------------------------------------------

events = re.findall(
    r'\bon([A-Za-z]+)\s*=\s*["\']([^"\']+)["\']',
    text,
    re.I
)

show(
    "17. INLINE EVENT HANDLERS",
    [f"{event}: {handler}" for event, handler in events],
    200
)

# -------------------------------------------------------------------
# 16. MODALS / DRAWERS / DIALOGS
# -------------------------------------------------------------------

modal_signals = []

for pattern in [
    r'\bmodal\b',
    r'\bdrawer\b',
    r'\bdialog\b',
    r'\boverlay\b',
    r'\bsidepanel\b',
    r'\bside-panel\b',
]:
    modal_signals.extend(re.findall(r'.{0,80}' + pattern + r'.{0,120}', text, re.I))

show("18. MODAL / DRAWER / DIALOG SIGNALS", modal_signals, 100)

# -------------------------------------------------------------------
# 17. EXPORT / REPORTING
# -------------------------------------------------------------------

report_terms = [
    "export",
    "download",
    "csv",
    "excel",
    "pdf",
    "report",
    "reports",
    "print",
    "analytics",
    "dashboard",
    "trend",
    "forecast",
]

report_found = []

for term in report_terms:
    count = lower.count(term)
    if count:
        report_found.append(f"{term:35} {count}")

show("19. REPORTING / EXPORT / ANALYTICS SIGNALS", report_found)

# -------------------------------------------------------------------
# 18. SAMPLE / MOCK DATA
# -------------------------------------------------------------------

sample_terms = [
    "mock",
    "sample",
    "demo",
    "fixture",
    "fake",
    "placeholder",
    "seed",
    "dummy",
    "test data",
]

sample_found = []

for term in sample_terms:
    count = lower.count(term)
    if count:
        sample_found.append(f"{term:35} {count}")

show("20. SAMPLE / MOCK / DEMO DATA SIGNALS", sample_found)

# -------------------------------------------------------------------
# 19. POTENTIALLY IMPORTANT TEXT SNIPPETS
# -------------------------------------------------------------------

keywords = [
    "financial aid",
    "fafsa",
    "verification",
    "award",
    "disbursement",
    "compliance",
    "exception",
    "escalation",
    "document",
    "student",
    "case",
    "queue",
    "deadline",
    "audit",
    "appeal",
    "ai",
    "copilot",
]

snippets = []

for keyword in keywords:
    for m in re.finditer(keyword, text, re.I):
        start = max(0, m.start() - 180)
        end = min(len(text), m.end() + 280)

        snippet = re.sub(r"\s+", " ", text[start:end]).strip()

        # Avoid dumping enormous repeated sections.
        if snippet not in snippets:
            snippets.append(f"[{keyword.upper()}] {snippet}")

show("21. HIGH-VALUE SOURCE SNIPPETS", snippets, 120)

# -------------------------------------------------------------------
# 20. SCRIPT / MODULE INVENTORY
# -------------------------------------------------------------------

scripts = re.findall(
    r'<script\b[^>]*?(?:src=["\']([^"\']+)["\'])?[^>]*>',
    text,
    re.I
)

show("22. SCRIPT SOURCES", scripts, 100)

# -------------------------------------------------------------------
# 21. FEATURE MATURITY HEURISTICS
# -------------------------------------------------------------------

section("23. INITIAL FEATURE SIGNAL SCORECARD")

def score(name, patterns):
    hits = sum(lower.count(p.lower()) for p in patterns)
    status = "STRONG" if hits >= 8 else "PRESENT" if hits >= 3 else "WEAK" if hits else "NOT FOUND"
    print(f"{name:35} {status:12} ({hits} text signals)")

score("Financial Aid Domain", [
    "financial aid", "fafsa", "pell", "loan", "grant",
    "verification", "award", "disbursement", "title iv"
])

score("Student Case Management", [
    "student", "case", "task", "queue", "assignment",
    "owner", "status", "priority", "deadline"
])

score("Document / Verification Ops", [
    "document", "upload", "verification", "attachment",
    "review", "missing document", "transcript"
])

score("Compliance / Audit", [
    "compliance", "audit", "policy", "title iv",
    "federal", "history", "audit trail"
])

score("Exception Management", [
    "exception", "hold", "escalation", "priority",
    "severity", "deadline", "aging"
])

score("Decision Intelligence / AI", [
    "ai", "copilot", "recommendation", "insight",
    "decision", "explain", "prediction"
])

score("Reporting / Executive Visibility", [
    "dashboard", "analytics", "report", "export",
    "trend", "forecast", "kpi"
])

score("Workflow / Execution", [
    "workflow", "task", "assignment", "queue",
    "status", "action", "complete", "escalation"
])

# -------------------------------------------------------------------
# 22. RAW SOURCE LANDMARKS
# -------------------------------------------------------------------

section("24. SOURCE LANDMARKS")

for keyword in [
    "<main",
    "<header",
    "<nav",
    "<aside",
    "<section",
    "<table",
    "fetch(",
    "addEventListener",
    "localStorage",
    "sessionStorage",
]:
    positions = [i + 1 for i, line in enumerate(lines) if keyword.lower() in line.lower()]
    if positions:
        print(f"{keyword:25} lines: {positions[:30]}")

# -------------------------------------------------------------------
# 23. RECOMMENDATION FOR NEXT INSPECTION
# -------------------------------------------------------------------

section("25. WHAT I NEED TO EVALUATE GCU FINANCIAL AID READINESS")

print("""
The most useful next step is for the reviewer to inspect:

1. The main dashboard / command-center markup.
2. Every Financial Aid-related panel.
3. Student/case detail views.
4. Verification/document workflows.
5. Exception/hold/escalation workflows.
6. Task/queue/assignment mechanics.
7. Compliance/audit functionality.
8. AI/copilot/recommendation logic.
9. API endpoints used by the page.
10. Sample data structures representing students, awards, cases,
    documents, deadlines, and financial-aid decisions.

This inspection intentionally avoids dumping the entire HTML file.
It extracts enough structural and behavioral evidence to determine
whether the existing School Command can realistically become a
Financial Aid Director's operational command center.
""")

# Write the same output to a file by re-running stdout capture is
# unnecessarily complex here, so generate a companion metadata file.
meta = out.with_suffix(".meta.txt")
meta.write_text(
    f"Source: {file}\n"
    f"Size: {file.stat().st_size:,} bytes\n"
    f"Lines: {len(lines):,}\n"
    f"Inspection generated successfully.\n"
)

print()
print("=" * 90)
print("INSPECTION COMPLETE")
print("=" * 90)
print(f"Source: {file}")
print(f"Metadata: {meta}")
print()
print("Paste this output back into ChatGPT.")
PY
