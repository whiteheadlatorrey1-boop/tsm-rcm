#!/usr/bin/env bash
set -euo pipefail

ROOT="/workspaces/tsm-rcm"
cd "$ROOT"

REPORT_DIR="reports"
REPORT_MD="$REPORT_DIR/pm-vertical-rollout-audit.md"
REPORT_JSON="$REPORT_DIR/pm-vertical-rollout-audit.json"

mkdir -p "$REPORT_DIR"

TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

VERTICALS=(
  "pm"
  "construction"
  "healthcare"
  "mortgage"
  "real_estate"
  "legal"
  "bpo"
  "schools"
  "hotelops"
  "insurance"
  "finops"
  "rcm"
)

echo "============================================================"
echo " TSM PM VERTICAL ROLLOUT AUDIT"
echo "============================================================"
echo "Timestamp: $TIMESTAMP"
echo "Root:      $ROOT"
echo

echo "=== 1. GIT STATE ==="
echo "Branch: $(git branch --show-current)"
echo "HEAD:   $(git rev-parse --short HEAD)"
echo "Origin: $(git rev-parse --short origin/main 2>/dev/null || echo unavailable)"
echo

git status --short || true

echo
echo "=== 2. RECENT COMMITS ==="
git log --oneline -8

echo
echo "=== 3. PM ROUTE INVENTORY ==="

grep -nE \
  "/api/pm/(portfolio-intelligence|risk|forecast|executive-decisions|predictive-control|intelligence-v3)" \
  server.js || true

echo
echo "=== 4. VERTICAL CONTROL-PLANE MODULES ==="

if [ -d server/vertical-control-plane ]; then
  find server/vertical-control-plane \
    -maxdepth 1 \
    -type f \
    -printf '%f\n' \
    | sort
else
  echo "MISSING: server/vertical-control-plane"
fi

echo
echo "=== 5. VERTICAL AUDIT ==="

# Temporary JSON array construction.
TMP_JSON="$(mktemp)"
trap 'rm -f "$TMP_JSON"' EXIT

echo "[" > "$TMP_JSON"

FIRST=true

for V in "${VERTICALS[@]}"; do

  echo
  echo "------------------------------------------------------------"
  echo "VERTICAL: $V"
  echo "------------------------------------------------------------"

  case "$V" in
    pm)
      DIR="server"
      ;;
    real_estate)
      DIR="server/real-estate"
      ;;
    construction)
      DIR="server/construction"
      ;;
    healthcare)
      DIR="server/healthcare"
      ;;
    mortgage)
      DIR="server/mortgage"
      ;;
    legal)
      DIR="server/legal"
      ;;
    bpo)
      DIR="server/bpo"
      ;;
    schools)
      DIR="server/schools"
      ;;
    hotelops)
      DIR="server/hotelops"
      ;;
    insurance)
      DIR="server/insurance"
      ;;
    finops)
      DIR="server/finops"
      ;;
    rcm)
      DIR="server/rcm"
      ;;
    *)
      DIR="server/$V"
      ;;
  esac

  if [ "$V" = "pm" ]; then
    FILES_FOUND=1
    FILE_LIST="server.js"
  else
    if [ -d "$DIR" ]; then
      FILES_FOUND="$(find "$DIR" -type f 2>/dev/null | wc -l)"
      FILE_LIST="$(find "$DIR" -maxdepth 2 -type f 2>/dev/null | sort | head -40)"
    else
      FILES_FOUND=0
      FILE_LIST=""
    fi
  fi

  echo "Directory: $DIR"
  echo "Files:     $FILES_FOUND"

  if [ "$V" != "pm" ]; then
    if [ -d "$DIR" ]; then
      echo "$FILE_LIST"
    else
      echo "MISSING DIRECTORY"
    fi
  fi

  echo
  echo "PM/control-plane signals:"

  SEARCH_PATH="$DIR"

  if [ "$V" = "pm" ]; then
    SEARCH_PATH="server.js server/vertical-control-plane"
  fi

  SIGNALS=(
    "control-plane"
    "runProductionControlPlane"
    "portfolio"
    "risk"
    "forecast"
    "decision"
    "governance"
    "approval"
    "persistence"
    "audit"
    "verification"
    "predictive"
    "telemetry"
    "writeback"
    "relationships"
  )

  for SIGNAL in "${SIGNALS[@]}"; do
    COUNT="$(
      grep -Ril \
        --exclude='*.bak' \
        --exclude='*.map' \
        "$SIGNAL" \
        $SEARCH_PATH 2>/dev/null \
        | wc -l
    )"

    if [ "$COUNT" -gt 0 ]; then
      printf "  %-18s PASS (%s files)\n" "$SIGNAL" "$COUNT"
    else
      printf "  %-18s GAP\n" "$SIGNAL"
    fi
  done

  echo
  echo "Adapter candidates:"

  find "$DIR" -type f \
    \( -iname "*control*plane*.js" \
       -o -iname "*engine*.js" \
       -o -iname "*adapter*.js" \
       -o -iname "*domain*config*.js" \) \
    2>/dev/null \
    | sort \
    | head -30 || true

  echo
  echo "Runtime references:"

  grep -RinE \
    "runProductionControlPlane|vertical-control-plane|predictive-control|intelligence-v3|executive-decisions" \
    "$DIR" \
    2>/dev/null \
    | head -20 || true

  echo
  echo "Tests:"

  TEST_MATCHES="$(
    find scripts test server \
      -type f \
      \( -iname "*${V}*test*.js" \
         -o -iname "*test*${V}*.js" \
         -o -iname "*${V}*control*.js" \) \
      2>/dev/null \
      | sort \
      | head -20
  )"

  if [ -n "$TEST_MATCHES" ]; then
    echo "$TEST_MATCHES"
  else
    echo "  NO DEDICATED TEST FOUND"
  fi

  echo
  echo "Canonical vertical references:"

  grep -RinE \
    "vertical[[:space:]]*[:=][[:space:]]*['\"]${V}['\"]|['\"]${V}['\"]" \
    server/enterprise \
    server/vertical-control-plane \
    scripts \
    2>/dev/null \
    | head -15 || true

  # ----------------------------------------------------------
  # JSON status calculation
  # ----------------------------------------------------------

  if [ "$V" = "pm" ]; then
    HAS_DIR=true
    HAS_ADAPTER=true
    HAS_RUNTIME=true
    HAS_TEST=true
  else
    if [ -d "$DIR" ]; then
      HAS_DIR=true
    else
      HAS_DIR=false
    fi

    if find "$DIR" -type f \
      \( -iname "*control*plane*.js" -o -iname "*adapter*.js" \) \
      2>/dev/null | grep -q .; then
      HAS_ADAPTER=true
    else
      HAS_ADAPTER=false
    fi

    if grep -RiqE \
      "runProductionControlPlane|vertical-control-plane" \
      "$DIR" 2>/dev/null; then
      HAS_RUNTIME=true
    else
      HAS_RUNTIME=false
    fi

    if find scripts test server \
      -type f \
      \( -iname "*${V}*test*.js" -o -iname "*test*${V}*.js" \) \
      2>/dev/null | grep -q .; then
      HAS_TEST=true
    else
      HAS_TEST=false
    fi
  fi

  SCORE=0

  [ "$HAS_DIR" = true ] && SCORE=$((SCORE + 25))
  [ "$HAS_ADAPTER" = true ] && SCORE=$((SCORE + 25))
  [ "$HAS_RUNTIME" = true ] && SCORE=$((SCORE + 25))
  [ "$HAS_TEST" = true ] && SCORE=$((SCORE + 25))

  if [ "$SCORE" -eq 100 ]; then
    STATUS="READY"
  elif [ "$SCORE" -ge 75 ]; then
    STATUS="NEAR_READY"
  elif [ "$SCORE" -ge 50 ]; then
    STATUS="IN_PROGRESS"
  else
    STATUS="GAP"
  fi

  echo
  echo "ROLLout status: $STATUS ($SCORE/100)"

  if [ "$FIRST" = false ]; then
    echo "," >> "$TMP_JSON"
  fi
  FIRST=false

  cat >> "$TMP_JSON" <<JSON
{
  "vertical": "$V",
  "directory": "$DIR",
  "score": $SCORE,
  "status": "$STATUS",
  "hasDirectory": $HAS_DIR,
  "hasAdapter": $HAS_ADAPTER,
  "hasRuntime": $HAS_RUNTIME,
  "hasTest": $HAS_TEST
}
JSON

done

echo "]" >> "$TMP_JSON"

echo
echo "=== 6. RUNTIME CERTIFICATION ==="

if [ -f scripts/test-vertical-control-plane-runtime.js ]; then
  node scripts/test-vertical-control-plane-runtime.js || true
else
  echo "Runtime certification script not found."
fi

echo
echo "=== 7. INTELLIGENCE-RICHNESS CERTIFICATION ==="

if [ -f scripts/test-vertical-intelligence-richness.js ]; then
  node scripts/test-vertical-intelligence-richness.js || true
else
  echo "Intelligence richness test not found."
fi

echo
echo "=== 8. REAL ESTATE CERTIFICATION ==="

if [ -f scripts/test-real-estate-control-plane.js ]; then
  node scripts/test-real-estate-control-plane.js || true
else
  echo "Real Estate control-plane test not found."
fi

echo
echo "=== 9. SERVER SYNTAX ==="
node --check server.js
echo "server.js syntax: PASS"

echo
echo "=== 10. CONTROL-PLANE SYNTAX ==="

if [ -d server/vertical-control-plane ]; then
  while IFS= read -r FILE; do
    node --check "$FILE"
  done < <(find server/vertical-control-plane -type f -name "*.js" | sort)

  echo "vertical-control-plane syntax: PASS"
fi

echo
echo "=== 11. GENERATE JSON REPORT ==="

python3 - "$TMP_JSON" "$REPORT_JSON" "$TIMESTAMP" <<'PY'
import json
import sys
from pathlib import Path

src = Path(sys.argv[1])
out = Path(sys.argv[2])
timestamp = sys.argv[3]

with src.open() as f:
    verticals = json.load(f)

summary = {
    "ready": sum(v["status"] == "READY" for v in verticals),
    "nearReady": sum(v["status"] == "NEAR_READY" for v in verticals),
    "inProgress": sum(v["status"] == "IN_PROGRESS" for v in verticals),
    "gaps": sum(v["status"] == "GAP" for v in verticals),
    "total": len(verticals)
}

payload = {
    "audit": "pm-vertical-rollout",
    "generatedAt": timestamp,
    "referenceImplementation": "pm",
    "verticals": verticals,
    "summary": summary
}

out.write_text(json.dumps(payload, indent=2) + "\n")
PY

echo "Created: $REPORT_JSON"

echo
echo "=== 12. GENERATE MARKDOWN REPORT ==="

python3 - "$REPORT_JSON" "$REPORT_MD" <<'PY'
import json
import sys
from pathlib import Path

data = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])

lines = []

lines.append("# TSM PM Vertical Rollout Audit")
lines.append("")
lines.append(f"Generated: {data['generatedAt']}")
lines.append("")
lines.append("## Summary")
lines.append("")
lines.append("| Vertical | Score | Status | Directory | Adapter | Runtime | Test |")
lines.append("|---|---:|---|---|---|---|---|")

for v in data["verticals"]:
    lines.append(
        f"| {v['vertical']} | "
        f"{v['score']}/100 | "
        f"{v['status']} | "
        f"{'PASS' if v['hasDirectory'] else 'GAP'} | "
        f"{'PASS' if v['hasAdapter'] else 'GAP'} | "
        f"{'PASS' if v['hasRuntime'] else 'GAP'} | "
        f"{'PASS' if v['hasTest'] else 'GAP'} |"
    )

lines.append("")
lines.append("## Rollout Interpretation")
lines.append("")
lines.append("- **READY** — directory, adapter, runtime wiring, and test coverage detected.")
lines.append("- **NEAR_READY** — most PM/control-plane components detected; targeted completion needed.")
lines.append("- **IN_PROGRESS** — substantial implementation exists but important PM integration remains.")
lines.append("- **GAP** — vertical lacks enough implementation evidence for PM rollout.")
lines.append("")
lines.append("## Summary Counts")
lines.append("")
for k, v in data["summary"].items():
    lines.append(f"- {k}: {v}")

lines.append("")
lines.append("## Reference Architecture")
lines.append("")
lines.append(
    "PM is treated as the reference implementation. "
    "Verticals should converge on the canonical control-plane contract:"
)
lines.append("")
lines.append("```text")
lines.append("Facts / Evidence")
lines.append("      ↓")
lines.append("Normalization")
lines.append("      ↓")
lines.append("Deterministic Findings")
lines.append("      ↓")
lines.append("Risk + Forecast")
lines.append("      ↓")
lines.append("Canonical Decision")
lines.append("      ↓")
lines.append("Governance / Approval")
lines.append("      ↓")
lines.append("Proposed Action")
lines.append("      ↓")
lines.append("Verification")
lines.append("      ↓")
lines.append("Persistence / Audit / Telemetry")
lines.append("      ↓")
lines.append("Writeback Boundary")
lines.append("```")
lines.append("")

out.write_text("\n".join(lines) + "\n")
PY

echo "Created: $REPORT_MD"

echo
echo "============================================================"
echo " PM VERTICAL ROLLOUT AUDIT COMPLETE"
echo "============================================================"

echo
echo "=== FINAL SUMMARY ==="
python3 - "$REPORT_JSON" <<'PY'
import json
import sys

data = json.load(open(sys.argv[1]))

for v in data["verticals"]:
    print(f"{v['vertical']:<15} {v['score']:>3}/100  {v['status']}")

print()
print(
    "READY:",
    data["summary"]["ready"],
    "| NEAR_READY:",
    data["summary"]["nearReady"],
    "| IN_PROGRESS:",
    data["summary"]["inProgress"],
    "| GAP:",
    data["summary"]["gaps"],
)

PY

echo
echo "Reports:"
echo "  $REPORT_JSON"
echo "  $REPORT_MD"
