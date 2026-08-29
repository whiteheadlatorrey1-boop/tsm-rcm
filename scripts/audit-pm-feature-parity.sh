#!/usr/bin/env bash
set -euo pipefail

ROOT="/workspaces/tsm-rcm"
cd "$ROOT"

REPORT_MD="reports/pm-feature-parity-audit.md"
REPORT_JSON="reports/pm-feature-parity-audit.json"

mkdir -p reports

TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "============================================================"
echo " TSM PM FEATURE PARITY AUDIT"
echo "============================================================"
echo "Generated: $TS"
echo

VERTICALS=(
  construction
  healthcare
  mortgage
  real_estate
  legal
  bpo
  schools
  hotelops
  insurance
  finops
  rcm
)

FEATURES=(
  portfolio_intelligence
  digital_twin
  deterministic
  risk
  forecast
  executive_decisions
  predictive_control
  intelligence_v3
  actions
  approval
  lifecycle
  verification
  persistence
  audit
  telemetry
  explainability
  relationships
  writeback
)

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

echo "[" > "$TMP"
FIRST=true

feature_signal() {
  case "$1" in
    portfolio_intelligence)
      echo "portfolio-intelligence|portfolio intelligence|portfolio_intelligence"
      ;;
    digital_twin)
      echo "digital-twin|digital twin|digital_twin"
      ;;
    deterministic)
      echo "deterministic|deterministic"
      ;;
    risk)
      echo "risk-engine|calculateRisk|risk"
      ;;
    forecast)
      echo "forecast|forecastResult"
      ;;
    executive_decisions)
      echo "executive-decisions|executive decisions|decisions"
      ;;
    predictive_control)
      echo "predictive-control|predictive control|predictive_control"
      ;;
    intelligence_v3)
      echo "intelligence-v3|intelligence v3|intelligence-v3"
      ;;
    actions)
      echo "createAction|actions"
      ;;
    approval)
      echo "approval-gate|createApprovalGate|approval"
      ;;
    lifecycle)
      echo "lifecycle|transition"
      ;;
    verification)
      echo "verifyDecision|verifyAction|verification"
      ;;
    persistence)
      echo "persistence|saveDecision|saveEnvelope"
      ;;
    audit)
      echo "createAuditEvent|audit"
      ;;
    telemetry)
      echo "decisionTelemetry|telemetry"
      ;;
    explainability)
      echo "explainDecision|explainability"
      ;;
    relationships)
      echo "relationships|relationship"
      ;;
    writeback)
      echo "writeback|writebackBoundary|writeback-boundary"
      ;;
  esac
}

echo "=== PM REFERENCE ==="

PM_FEATURE_SCORE=0

for F in "${FEATURES[@]}"; do
  SIGNALS="$(feature_signal "$F")"

  FOUND=0

  IFS='|' read -ra TERMS <<< "$SIGNALS"

  for TERM in "${TERMS[@]}"; do
    if grep -Riq \
      --exclude-dir=node_modules \
      --exclude-dir=.git \
      "$TERM" \
      server/pm \
      server/vertical-control-plane \
      server.js \
      2>/dev/null; then
      FOUND=1
      break
    fi
  done

  if [ "$FOUND" -eq 1 ]; then
    PM_FEATURE_SCORE=$((PM_FEATURE_SCORE + 1))
    printf "  %-24s PASS\n" "$F"
  else
    printf "  %-24s GAP\n" "$F"
  fi
done

echo
echo "PM reference coverage: $PM_FEATURE_SCORE/${#FEATURES[@]}"
echo

echo "=== VERTICAL FEATURE AUDIT ==="

for V in "${VERTICALS[@]}"; do

  echo
  echo "------------------------------------------------------------"
  echo " $V"
  echo "------------------------------------------------------------"

  case "$V" in
    real_estate)
      DIR="server/real-estate"
      ;;
    *)
      DIR="server/$V"
      ;;
  esac

  if [ -d "$DIR" ]; then
    DIR_EXISTS=true
  else
    DIR_EXISTS=false
  fi

  SCORE=0
  FEATURE_JSON=""

  for F in "${FEATURES[@]}"; do

    SIGNALS="$(feature_signal "$F")"
    FOUND=0

    if [ "$V" = "real_estate" ]; then
      SEARCH_ROOT="$DIR server/vertical-control-plane"
    else
      SEARCH_ROOT="$DIR"
    fi

    IFS='|' read -ra TERMS <<< "$SIGNALS"

    for TERM in "${TERMS[@]}"; do
      if [ -n "$SEARCH_ROOT" ] && grep -Riq \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        "$TERM" \
        $SEARCH_ROOT \
        2>/dev/null; then
        FOUND=1
        break
      fi
    done

    if [ "$FOUND" -eq 1 ]; then
      SCORE=$((SCORE + 1))
      printf "  %-24s PASS\n" "$F"
      VALUE=true
    else
      printf "  %-24s GAP\n" "$F"
      VALUE=false
    fi

    if [ -n "$FEATURE_JSON" ]; then
      FEATURE_JSON="$FEATURE_JSON,"
    fi

    FEATURE_JSON="$FEATURE_JSON\"$F\":$VALUE"
  done

  PERCENT=$((SCORE * 100 / ${#FEATURES[@]}))

  if [ "$PERCENT" -ge 90 ]; then
    STATUS="FULL_PM_PARITY"
  elif [ "$PERCENT" -ge 75 ]; then
    STATUS="DOMAIN_ADAPTED"
  elif [ "$PERCENT" -ge 50 ]; then
    STATUS="PARTIAL"
  elif [ "$PERCENT" -ge 25 ]; then
    STATUS="INTELLIGENCE_ONLY"
  else
    STATUS="RUNTIME_ONLY_OR_GAP"
  fi

  echo
  echo "FEATURE COVERAGE: $SCORE/${#FEATURES[@]} ($PERCENT%)"
  echo "STATUS: $STATUS"

  if [ "$FIRST" = false ]; then
    echo "," >> "$TMP"
  fi
  FIRST=false

  cat >> "$TMP" <<JSON
{
  "vertical": "$V",
  "directory": "$DIR",
  "directoryExists": $DIR_EXISTS,
  "score": $SCORE,
  "totalFeatures": ${#FEATURES[@]},
  "coveragePercent": $PERCENT,
  "status": "$STATUS",
  "features": {$FEATURE_JSON}
}
JSON

done

echo "]" >> "$TMP"

echo
echo "=== GENERATE JSON REPORT ==="

python3 - "$TMP" "$REPORT_JSON" "$TS" <<'PY'
import json
import sys
from pathlib import Path

src = Path(sys.argv[1])
out = Path(sys.argv[2])
timestamp = sys.argv[3]

verticals = json.loads(src.read_text())

summary = {
    "fullPmParity": sum(v["status"] == "FULL_PM_PARITY" for v in verticals),
    "domainAdapted": sum(v["status"] == "DOMAIN_ADAPTED" for v in verticals),
    "partial": sum(v["status"] == "PARTIAL" for v in verticals),
    "intelligenceOnly": sum(v["status"] == "INTELLIGENCE_ONLY" for v in verticals),
    "runtimeOrGap": sum(v["status"] == "RUNTIME_ONLY_OR_GAP" for v in verticals),
}

payload = {
    "audit": "pm-feature-parity",
    "generatedAt": timestamp,
    "reference": "PM",
    "features": [
        "portfolio_intelligence",
        "digital_twin",
        "deterministic",
        "risk",
        "forecast",
        "executive_decisions",
        "predictive_control",
        "intelligence_v3",
        "actions",
        "approval",
        "lifecycle",
        "verification",
        "persistence",
        "audit",
        "telemetry",
        "explainability",
        "relationships",
        "writeback"
    ],
    "verticals": verticals,
    "summary": summary
}

out.write_text(json.dumps(payload, indent=2) + "\n")
PY

echo "Created $REPORT_JSON"

echo
echo "=== GENERATE MARKDOWN REPORT ==="

python3 - "$REPORT_JSON" "$REPORT_MD" <<'PY'
import json
import sys
from pathlib import Path

data = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])

lines = [
    "# TSM PM Feature Parity Audit",
    "",
    f"Generated: {data['generatedAt']}",
    "",
    "## Feature Contract",
    "",
    "| # | PM Capability |",
    "|---:|---|"
]

for i, feature in enumerate(data["features"], 1):
    lines.append(f"| {i} | {feature} |")

lines += [
    "",
    "## Vertical Coverage",
    "",
    "| Vertical | Score | Coverage | Status |",
    "|---|---:|---:|---|"
]

for v in data["verticals"]:
    lines.append(
        f"| {v['vertical']} | "
        f"{v['score']}/{v['totalFeatures']} | "
        f"{v['coveragePercent']}% | "
        f"{v['status']} |"
    )

lines += [
    "",
    "## Gap Matrix",
    "",
    "| Vertical | Missing PM Capabilities |",
    "|---|---|"
]

for v in data["verticals"]:
    missing = [
        feature
        for feature, value in v["features"].items()
        if not value
    ]

    lines.append(
        f"| {v['vertical']} | "
        f"{', '.join(missing) if missing else 'None'} |"
    )

lines += [
    "",
    "## Rollout Strategy",
    "",
    "PM is the reference implementation.",
    "",
    "Real Estate is the current domain-adapter reference.",
    "",
    "Each remaining vertical should be brought through the same sequence:",
    "",
    "```text",
    "Existing Domain Intelligence",
    "        ↓",
    "Domain Adapter",
    "        ↓",
    "Canonical Control Plane",
    "        ↓",
    "Risk + Forecast",
    "        ↓",
    "Executive Decision",
    "        ↓",
    "Approval Gate",
    "        ↓",
    "Proposed Action",
    "        ↓",
    "Verification",
    "        ↓",
    "Persistence + Audit + Telemetry",
    "        ↓",
    "Writeback Boundary",
    "```",
    "",
    "## Summary",
    ""
]

for k, v in data["summary"].items():
    lines.append(f"- {k}: {v}")

out.write_text("\n".join(lines) + "\n")
PY

echo "Created $REPORT_MD"

echo
echo "============================================================"
echo " PM FEATURE PARITY AUDIT COMPLETE"
echo "============================================================"

echo
echo "=== FINAL MATRIX ==="

python3 - "$REPORT_JSON" <<'PY'
import json
import sys

data = json.load(open(sys.argv[1]))

print(f"{'VERTICAL':<16} {'SCORE':<9} {'COVERAGE':<10} STATUS")
print("-" * 70)

for v in data["verticals"]:
    print(
        f"{v['vertical']:<16} "
        f"{v['score']}/{v['totalFeatures']:<7} "
        f"{v['coveragePercent']:>3}%       "
        f"{v['status']}"
    )

print()
print("Reports:")
print(" ", sys.argv[1])
print(" ", "reports/pm-feature-parity-audit.md")
PY
