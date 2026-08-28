#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TEST="scripts/test-pm-predictive-control.js"
ACCEPT="scripts/accept-pm-intelligence-v4-live.sh"
SERVER="server.js"

echo "============================================================"
echo " TSM PM — V4 CONTRACT FIX"
echo " predictionSummary = canonical V4 contract"
echo "============================================================"

python3 - "$TEST" "$ACCEPT" <<'PY'
from pathlib import Path
import sys

test = Path(sys.argv[1])
accept = Path(sys.argv[2])

p = test.read_text()

# V4 module contract is predictionSummary, not summary.
p = p.replace(
    "result.summary.total",
    "result.predictionSummary.total"
)
p = p.replace(
    "result.summary.likely",
    "result.predictionSummary.likely"
)
p = p.replace(
    "result.summary.elevated",
    "result.predictionSummary.elevated"
)
p = p.replace(
    "result.summary.watch",
    "result.predictionSummary.watch"
)
p = p.replace(
    "result.summary.predictedExposure",
    "result.predictionSummary.predictedExposure"
)

test.write_text(p)

p = accept.read_text()

# Normalize acceptance references to the actual V4 response contract.
p = p.replace(
    'v4["summary"]',
    'v4["predictionSummary"]'
)
p = p.replace(
    'summary["predictedExposure"]',
    'predictionSummary["predictedExposure"]'
)

accept.write_text(p)
PY

echo "Patched:"
echo "  $TEST"
echo "  $ACCEPT"

echo
echo "=== 1. SYNTAX ==="
node --check server/pm/predictive-control.js
node --check "$TEST"
echo "PASS: syntax"

echo
echo "=== 2. V4 UNIT TEST ==="
node "$TEST"

echo
echo "============================================================"
echo " PM V4 CONTRACT FIX: PASS"
echo "============================================================"
