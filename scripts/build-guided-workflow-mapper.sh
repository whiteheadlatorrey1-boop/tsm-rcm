#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

MANIFEST="$ROOT/docs/how-to-audit/guided-rollout/guided-rollout-manifest.json"
OUT="$ROOT/docs/how-to-audit/guided-rollout"

REGISTRY="$ROOT/server/how-to/page-workflow-registry.js"
TEST="$ROOT/tests/how-to/page-workflow-mapper.test.js"

mkdir -p "$OUT" "$(dirname "$REGISTRY")" "$(dirname "$TEST")"

python3 - "$ROOT" "$MANIFEST" "$REGISTRY" "$OUT" <<'PY'
import sys
import json
import re
from pathlib import Path

root = Path(sys.argv[1])
manifest_path = Path(sys.argv[2])
registry_path = Path(sys.argv[3])
out = Path(sys.argv[4])

manifest = json.loads(manifest_path.read_text())

VERTICAL_RULES = {
    "healthcare": {
        "problems": [
            "denial leakage",
            "revenue-cycle backlog",
            "documentation gaps",
            "operational exceptions",
        ],
        "reports": [
            "Denial Recovery Report",
            "Revenue Leakage Report",
            "Appeal Priority Queue",
            "Executive Revenue-Cycle Brief",
        ],
    },
    "construction": {
        "problems": [
            "project cost leakage",
            "permit delays",
            "change-order exposure",
            "WIP and billing backlog",
        ],
        "reports": [
            "Project Risk Report",
            "WIP & Billing Report",
            "Permit/Proposal Exception Report",
            "Executive Project Brief",
        ],
    },
    "mortgage": {
        "problems": [
            "pipeline bottlenecks",
            "documentation exceptions",
            "underwriting risk",
            "closing delays",
        ],
        "reports": [
            "Loan Pipeline Risk Report",
            "Underwriting Exception Report",
            "Closing Readiness Report",
            "Executive Mortgage Brief",
        ],
    },
    "real_estate": {
        "problems": [
            "property operational leakage",
            "maintenance backlog",
            "vendor performance",
            "turnover delays",
        ],
        "reports": [
            "Property Operations Report",
            "Maintenance Exception Report",
            "Vendor Performance Report",
            "Portfolio Executive Brief",
        ],
    },
    "insurance": {
        "problems": [
            "claims leakage",
            "compliance exposure",
            "underwriting risk",
            "appeal backlog",
        ],
        "reports": [
            "Claims Risk Report",
            "Compliance Exception Report",
            "Underwriting Risk Report",
            "Executive Insurance Brief",
        ],
    },
    "legal": {
        "problems": [
            "matter backlog",
            "deadline risk",
            "document review burden",
            "compliance exposure",
        ],
        "reports": [
            "Matter Risk Report",
            "Deadline/Exception Report",
            "Document Intelligence Brief",
            "Executive Legal Brief",
        ],
    },
    "finops": {
        "problems": [
            "financial leakage",
            "invoice exceptions",
            "close-cycle delays",
            "spend visibility",
        ],
        "reports": [
            "Financial Exception Report",
            "Spend/Leakage Report",
            "Close Readiness Report",
            "Executive Finance Brief",
        ],
    },
    "itops": {
        "problems": [
            "ticket backlog",
            "incident response delays",
            "SLA risk",
            "endpoint/network issues",
        ],
        "reports": [
            "Incident Summary Report",
            "Ticket/SLA Report",
            "Root-Cause Report",
            "Executive IT Operations Brief",
        ],
    },
    "bpo": {
        "problems": [
            "processing backlog",
            "SLA misses",
            "quality variance",
            "manual processing",
        ],
        "reports": [
            "SLA Performance Report",
            "Processing Exception Report",
            "Quality/Throughput Report",
            "Client Executive Brief",
        ],
    },
    "hotel": {
        "problems": [
            "maintenance response",
            "guest-service coordination",
            "revenue leakage",
            "vendor coordination",
        ],
        "reports": [
            "Hotel Operations Report",
            "Maintenance Exception Report",
            "Guest-Service Report",
            "Executive Hotel Brief",
        ],
    },
    "schools": {
        "problems": [
            "grant compliance",
            "documentation gaps",
            "administrative backlog",
            "operational exceptions",
        ],
        "reports": [
            "Compliance Exception Report",
            "Grant/Documentation Risk Report",
            "Operational Exception Report",
            "Executive Schools Brief",
        ],
    },
}

DEFAULT = {
    "problems": [
        "manual work",
        "workflow fragmentation",
        "decision delays",
        "limited executive visibility",
    ],
    "reports": [
        "Exception Report",
        "Workflow Performance Report",
        "Decision Brief",
        "Executive Operations Report",
    ],
}

def normalize_vertical(v):
    v = str(v or "general").lower().strip()

    aliases = {
        "realestate": "real_estate",
        "real-estate": "real_estate",
        "real estate": "real_estate",
        "fin-ops": "finops",
        "it-ops": "itops",
    }

    return aliases.get(v, v)

def read_page(path):
    p = root / path

    if not p.exists():
        return ""

    return p.read_text(
        encoding="utf-8",
        errors="replace"
    )

def detect_controls(text):
    controls = []

    # Buttons
    for m in re.finditer(
        r'<button([^>]*)>(.*?)</button>',
        text,
        re.I | re.S
    ):
        attrs = m.group(1)
        label = re.sub(r"<[^>]+>", " ", m.group(2))
        label = re.sub(r"\s+", " ", label).strip()

        if label:
            controls.append({
                "type": "button",
                "label": label[:140],
                "id": re.search(r'id=["\']([^"\']+)', attrs, re.I).group(1)
                    if re.search(r'id=["\']([^"\']+)', attrs, re.I)
                    else None,
            })

    # Inputs
    for m in re.finditer(
        r'<input([^>]*)>',
        text,
        re.I
    ):
        attrs = m.group(1)

        ident = re.search(
            r'(?:id|name)=["\']([^"\']+)',
            attrs,
            re.I
        )

        if ident:
            controls.append({
                "type": "input",
                "label": ident.group(1),
                "id": ident.group(1),
            })

    return controls[:40]

def find_action_controls(controls, keywords):
    matches = []

    for control in controls:
        hay = (
            str(control.get("label", "")) + " " +
            str(control.get("id", ""))
        ).lower()

        if any(k in hay for k in keywords):
            matches.append(control)

    return matches[:8]

records = []

for item in manifest.get("pages", []):
    path = item["path"]
    vertical = normalize_vertical(item.get("vertical"))

    rules = VERTICAL_RULES.get(vertical, DEFAULT)
    text = read_page(path)
    controls = detect_controls(text)

    analyze = find_action_controls(
        controls,
        ["analy", "run", "scan", "process", "search", "detect"]
    )

    review = find_action_controls(
        controls,
        ["review", "find", "detail", "inspect", "exception", "queue"]
    )

    decide = find_action_controls(
        controls,
        ["decide", "approve", "prioritize", "recommend", "resolve"]
    )

    execute = find_action_controls(
        controls,
        ["execute", "assign", "submit", "send", "create", "save"]
    )

    report = find_action_controls(
        controls,
        ["report", "export", "download", "brief", "pdf", "generate"]
    )

    records.append({
        "path": path,
        "vertical": vertical,
        "priority": item.get("priority", "P1"),
        "workflow": {
            "problem": rules["problems"][0],
            "problems": rules["problems"],
            "start": "Start with the operational mission or problem.",
            "input": "Load the relevant documents, records, or evidence.",
            "analyze": {
                "instruction": "Run the intelligence analysis.",
                "controls": analyze,
            },
            "review": {
                "instruction": "Review findings, severity, exposure, and exceptions.",
                "controls": review,
            },
            "decide": {
                "instruction": "Prioritize the action that matters most.",
                "controls": decide,
            },
            "execute": {
                "instruction": "Assign or execute the corrective work.",
                "controls": execute,
            },
            "reports": rules["reports"],
            "report_controls": report,
            "measure": "Compare the resulting metrics against the original problem.",
            "repeat": "Repeat the workflow as new work arrives.",
        },
        "controlInventory": {
            "count": len(controls),
            "controls": controls,
        },
        "mappingQuality": {
            "analyze": bool(analyze),
            "review": bool(review),
            "decide": bool(decide),
            "execute": bool(execute),
            "report": bool(report),
        },
    })

registry = """\
'use strict';

/**
 * Generated TSM page-level Guided How-To registry.
 *
 * This registry maps application pages to:
 *   PROBLEM → START → INPUT → ANALYZE → REVIEW → DECIDE
 *   → EXECUTE → REPORT → MEASURE → REPEAT
 *
 * Generated automatically from the workflow audit.
 */

const PAGE_WORKFLOW_REGISTRY = %s;

function getPageWorkflow(path) {
  return PAGE_WORKFLOW_REGISTRY.find(
    entry => entry.path === path
  ) || null;
}

module.exports = {
  PAGE_WORKFLOW_REGISTRY,
  getPageWorkflow,
};
""" % json.dumps(records, indent=2)

registry_path.write_text(registry)

summary = {
    "pages": len(records),
    "fullyMapped": sum(
        all(x["mappingQuality"].values())
        for x in records
    ),
    "needsControlMapping": sum(
        not all(x["mappingQuality"].values())
        for x in records
    ),
    "verticals": sorted(set(x["vertical"] for x in records)),
}

(out / "page-workflow-mapping-summary.json").write_text(
    json.dumps(summary, indent=2)
)

(out / "page-workflow-registry.json").write_text(
    json.dumps(records, indent=2)
)

print("============================================================")
print(" TSM PAGE WORKFLOW MAPPER")
print("============================================================")
print(f"Pages mapped:           {summary['pages']}")
print(f"Fully mapped:           {summary['fullyMapped']}")
print(f"Need control mapping:   {summary['needsControlMapping']}")
print(f"Verticals:              {len(summary['verticals'])}")
print()
print("Registry:")
print(f"  {registry_path}")
print()
print("Mapping inventory:")
print(f"  {out}/page-workflow-registry.json")
print(f"  {out}/page-workflow-mapping-summary.json")
PY

cat > "$TEST" <<'PY'
'use strict';

const assert = require('assert');

const {
  PAGE_WORKFLOW_REGISTRY,
  getPageWorkflow,
} = require('../../server/how-to/page-workflow-registry');

assert(PAGE_WORKFLOW_REGISTRY.length > 0);

const schools = getPageWorkflow(
  'html/war-rooms/schools-command/schools-command.html'
);

assert(schools, 'Schools workflow must be registered');

assert.equal(
  schools.vertical,
  'schools'
);

assert.equal(
  schools.workflow.problems[0],
  'grant compliance'
);

assert.equal(
  schools.workflow.reports.length,
  4
);

const phases = [
  'problem',
  'start',
  'input',
  'analyze',
  'review',
  'decide',
  'execute',
  'reports',
  'measure',
  'repeat',
];

for (const phase of phases) {
  assert(
    schools.workflow[phase],
    `Missing Schools workflow phase: ${phase}`
  );
}

console.log('TSM PAGE WORKFLOW MAPPER TEST PASSED');
console.log(`Pages: ${PAGE_WORKFLOW_REGISTRY.length}`);
console.log(`Schools reports: ${schools.workflow.reports.length}`);
console.log(
  `Schools analyze controls: ${schools.workflow.analyze.controls.length}`
);
PY

node "$TEST"

echo
echo "============================================================"
echo " PAGE WORKFLOW MAPPING COMPLETE"
echo "============================================================"

echo
echo "Next:"
echo "  cat $OUT/page-workflow-mapping-summary.json"
echo
echo "  node tests/how-to/page-workflow-mapper.test.js"
echo
