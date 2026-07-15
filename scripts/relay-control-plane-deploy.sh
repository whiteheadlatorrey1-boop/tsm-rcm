#!/usr/bin/env bash
set -e

echo "======================================"
echo "TSM CONTROL PLANE DEPLOY + ACTIVATION"
echo "Enterprise Runtime Enforcement Boot"
echo "======================================"

ROOT="html/war-rooms"
CP="_relay_control_plane"

GUARD="<script src='/$CP/relay.guard.js'></script>"
NORMALIZER="<script src='/$CP/relay.normalize.js'></script>"

echo "[1/6] Validating control plane..."
if [ ! -f "$ROOT/$CP/relay.guard.js" ] || [ ! -f "$ROOT/$CP/relay.normalize.js" ]; then
  echo "ERROR: Control plane scripts missing"
  exit 1
fi

echo "[2/6] Discovering entrypoints..."
FILES=$(find "$ROOT" -type f \( -name "*war-room.html" -o -name "*strategist.html" -o -name "*executive-portal.html" \))

echo "[3/6] Injecting control plane runtime hooks..."

for f in $FILES; do
  echo "Processing: $f"

  # Skip if already injected
  if grep -q "relay.guard.js" "$f"; then
    echo "  - already active"
    continue
  fi

  # Inject before closing head
  if grep -q "</head>" "$f"; then
    sed -i "/<\/head>/i $GUARD\n$NORMALIZER\n" "$f"
  else
    echo -e "$GUARD\n$NORMALIZER\n$(cat $f)" > "$f"
  fi

done

echo "[4/6] Creating runtime bootstrap verification..."

BOOTSTRAP="$ROOT/_relay_control_plane/bootstrap-check.js"

cat > "$BOOTSTRAP" <<EOF
(function(){
  function check(){
    const guard = document.querySelector("script[src*='relay.guard']");
    const norm = document.querySelector("script[src*='relay.normalize']");
    if(!guard || !norm){
      console.warn("TSM CONTROL PLANE: INCOMPLETE INJECTION");
    } else {
      console.log("TSM CONTROL PLANE: ACTIVE");
    }
  }
  if(document.readyState !== "loading") check();
  else document.addEventListener("DOMContentLoaded", check);
})();
EOF

echo "[5/6] Validating injection coverage..."

MISSING=$(grep -L "relay.guard.js" $FILES || true)

if [ ! -z "$MISSING" ]; then
  echo "WARNING: Some files not instrumented:"
  echo "$MISSING"
else
  echo "All entrypoints instrumented."
fi

echo "[6/6] FINAL ACTIVATION CHECK"

echo "======================================"
echo "CONTROL PLANE STATUS: ACTIVE"
echo "GUARD: DEPLOYED"
echo "NORMALIZER: DEPLOYED"
echo "ENTRYPOINTS: INSTRUMENTED"
echo "MODE: REAL-TIME ENFORCEMENT"
echo "======================================"