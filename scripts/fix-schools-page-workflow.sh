#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

REGISTRY="$ROOT/server/how-to/page-workflow-registry.js"
TEST="$ROOT/tests/how-to/page-workflow-mapper.test.js"

SCHOOLS="html/war-rooms/schools-command/schools-command.html"

echo "============================================================"
echo " TSM SCHOOLS PAGE WORKFLOW REGISTRATION FIX"
echo "============================================================"

[[ -f "$REGISTRY" ]] || {
  echo "ERROR: Missing:"
  echo "  $REGISTRY"
  exit 1
}

[[ -f "$ROOT/$SCHOOLS" ]] || {
  echo "ERROR: Missing Schools Command:"
  echo "  $ROOT/$SCHOOLS"
  exit 1
}

python3 - "$REGISTRY" "$SCHOOLS" <<'PY'
import json
import sys
from pathlib import Path

registry_path = Path(sys.argv[1])
schools_path = sys.argv[2]

text = registry_path.read_text()

# ------------------------------------------------------------
# Do not duplicate Schools if it already exists.
# ------------------------------------------------------------
needle = f'"path": "{schools_path}"'

if needle in text:
    print("✓ Schools page already exists in registry.")
    raise SystemExit(0)

# ------------------------------------------------------------
# Schools workflow definition.
# ------------------------------------------------------------
record = {
    "path": schools_path,
    "vertical": "schools",
    "priority": "P0",

    "workflow": {
        "problem": "grant compliance",

        "problems": [
            "grant compliance",
            "missing documentation",
            "administrative backlog",
            "vendor risk",
            "operational exceptions"
        ],

        "start": "Start with the operational mission or school problem.",

        "input": "Load the relevant documents, records, grant evidence, or mission information.",

        "analyze": {
            "instruction": "Run the intelligence analysis.",
            "controls": []
        },

        "review": {
            "instruction": "Review findings, anomalies, severity, exposure, and supporting evidence.",
            "controls": []
        },

        "decide": {
            "instruction": "Prioritize the school issues requiring intervention, escalation, approval, or documentation.",
            "controls": []
        },

        "execute": {
            "instruction": "Assign ownership, update the mission, document the response, and execute corrective work.",
            "controls": []
        },

        "reports": [
            "Compliance Exception Report",
            "Grant/Documentation Risk Report",
            "Operational Exception Report",
            "Executive Schools Brief"
        ],

        "report_controls": [],

        "measure": "Track compliance exposure, unresolved exceptions, backlog, and operational improvement.",

        "repeat": "Repeat the workflow as new school missions and exceptions arrive."
    },

    "controlInventory": {
        "count": 0,
        "controls": []
    },

    "mappingQuality": {
        "analyze": False,
        "review": False,
        "decide": False,
        "execute": False,
        "report": False
    }
}

serialized = json.dumps(record, indent=2)

marker = "const PAGE_WORKFLOW_REGISTRY = ["

if marker not in text:
    raise SystemExit(
        "ERROR: PAGE_WORKFLOW_REGISTRY declaration not found."
    )

# Insert Schools as the first registry entry.
replacement = marker + "\n" + serialized + ","

text = text.replace(marker, replacement, 1)

registry_path.write_text(text)

print("✓ Registered Schools Command page workflow.")
print("  Path:", schools_path)
print("  Vertical: schools")
print("  Priority: P0")
print("  Reports: 4")
PY

echo
echo "============================================================"
echo " VERIFYING REGISTRY"
echo "============================================================"

node - <<'NODE'
const {
  PAGE_WORKFLOW_REGISTRY,
  getPageWorkflow
} = require('./server/how-to/page-workflow-registry');

const schoolsPath =
  'html/war-rooms/schools-command/schools-command.html';

const schools = getPageWorkflow(schoolsPath);

if (!schools) {
  console.error('✗ Schools workflow is NOT registered');
  process.exit(1);
}

console.log('✓ Schools workflow registered');
console.log('  vertical:', schools.vertical);
console.log('  priority:', schools.priority);
console.log('  problem:', schools.workflow.problem);
console.log('  reports:', schools.workflow.reports.length);
console.log('  registry pages:', PAGE_WORKFLOW_REGISTRY.length);
NODE

echo
echo "============================================================"
echo " RUNNING PAGE WORKFLOW MAPPER TEST"
echo "============================================================"

node "$TEST"

echo
echo "============================================================"
echo " SCHOOLS PAGE WORKFLOW REGISTRATION COMPLETE"
echo "============================================================"
