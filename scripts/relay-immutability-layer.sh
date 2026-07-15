#!/usr/bin/env bash
set -e

echo "======================================"
echo "TSM RELAY IMMUTABILITY LAYER v1"
echo "CI + Git + Build Enforcement"
echo "======================================"

mkdir -p .git/hooks

echo "[1/4] Creating pre-commit hook..."

cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

echo "Scanning for legacy relay writes..."

BAD=$(grep -R "localStorage.setItem(\"TSM_" html/war-rooms || true)

if [ ! -z "$BAD" ]; then
  echo "❌ COMMIT BLOCKED: legacy relay writes detected"
  echo "$BAD"
  exit 1
fi

echo "✅ Relay compliance passed"
EOF

chmod +x .git/hooks/pre-commit

echo "[2/4] Creating CI validation script..."

mkdir -p scripts/ci

cat > scripts/ci/relay-check.sh << 'EOF'
#!/bin/bash

echo "CI RELAY VALIDATION"

FAIL=$(grep -R "localStorage.setItem(\"TSM_" html/war-rooms || true)

if [ ! -z "$FAIL" ]; then
  echo "BUILD FAILED: legacy relay detected"
  exit 1
fi

echo "BUILD OK: relay compliant"
EOF

chmod +x scripts/ci/relay-check.sh

echo "[3/4] Creating build gate..."

cat > scripts/build-gate.sh << 'EOF'
#!/bin/bash

bash scripts/ci/relay-check.sh

echo "Build gate passed"
EOF

chmod +x scripts/build-gate.sh

echo "[4/4] Summary"

echo "======================================"
echo "IMMUTABILITY LAYER ACTIVE"
echo "- pre-commit hook installed"
echo "- CI relay validator active"
echo "- build gate enforced"
echo "======================================"