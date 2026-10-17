#!/usr/bin/env bash
set -euo pipefail

BASE="/workspaces"
SHELL="$BASE/tsm-shell"
EXPORT="$BASE/tsm-fly-export"
PORTALS="$EXPORT/portals"

echo "═══════════════════════════════════════"
echo "TSM SYSTEM AUDIT"
echo "═══════════════════════════════════════"
echo

fail=0

check_file () {
  local name="$1"
  local path="$2"

  if [ ! -f "$path" ]; then
    echo "❌ MISSING: $name → $path"
    fail=1
  else
    echo "✅ FOUND:   $name"
  fi
}

echo "== 1. CORE PORTAL FILES =="
check_file "Sample GC Portal" "$PORTALS/tsm-samplegc-portal.html"
check_file "Honor Portal" "$PORTALS/tsm-honor-portal.html"
check_file "Sample Fulfillment Portal" "$PORTALS/sample-fulfillment-portal.html"

echo
echo "== 2. SHELL HTML FILES (DEPLOY SOURCES) =="

for f in "$SHELL"/*.tsmatter.html; do
  [ -f "$f" ] || continue
  echo "→ $(basename "$f")"
done

echo
echo "== 3. AI ENDPOINT CHECK =="

grep -R "ai.tsmatter.com" "$SHELL" | wc -l | xargs -I{} echo "❌ ai.tsmatter.com refs: {}"
grep -R "localhost:3200" "$SHELL" | wc -l | xargs -I{} echo "❌ localhost refs: {}"
grep -R "tsm-core.fly.dev" "$SHELL" | wc -l | xargs -I{} echo "✅ tsm-core refs: {}"

echo
echo "== 4. BROKEN SCRIPT DETECTION =="

grep -R "Unexpected token" "$SHELL" || true
grep -R "safeAnalyze" "$SHELL" | wc -l | xargs -I{} echo "⚠ safeAnalyze occurrences: {}"

echo
echo "== 5. CROSS-PORTAL CONTAMINATION CHECK =="

for f in "$SHELL"/*.html "$SHELL"/*.tsmatter.html; do
  [ -f "$f" ] || continue

  if grep -q "Sample Fulfillment Co." "$f" && [[ "$f" != *sample-fulfillment* ]]; then
    echo "❌ CONTAMINATION: $(basename "$f") contains Sample Fulfillment Co."
  fi

  if grep -q "SAMPLE HEALTH SYSTEM" "$f" && [[ "$f" != *honor* ]]; then
    echo "❌ CONTAMINATION: $(basename "$f") contains HONOR"
  fi

  if grep -q "SAMPLEGC" "$f" && [[ "$f" != *samplegc* ]]; then
    echo "❌ CONTAMINATION: $(basename "$f") contains SAMPLEGC"
  fi
done

echo
echo "== 6. MISSING ASSETS =="

grep -R "tsm-core/" "$SHELL" | head -20 || true

echo
echo "═══════════════════════════════════════"
if [ "$fail" -eq 0 ]; then
  echo "SYSTEM STATUS: PARTIAL OK (see warnings above)"
else
  echo "SYSTEM STATUS: BROKEN (missing critical files)"
fi
echo "═══════════════════════════════════════"
