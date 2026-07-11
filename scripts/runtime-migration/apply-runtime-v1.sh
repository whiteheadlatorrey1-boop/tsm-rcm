#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo
echo "============================================================"
echo "      TSM ENTERPRISE RUNTIME V1 MIGRATION"
echo "============================================================"
echo

SCRIPTS=(
"00-preflight.js"
"01-create-bootstrap-loader.js"
"02-wire-runtime-scripts.js"
"03-migrate-relay.js"
"04-migrate-events.js"
"05-register-rules.js"
"06-validate-runtime.js"
"07-runtime-bootstrap-upgrade.js"
"08-runtime-dependency-check.js"
"09-register-vertical-adapters.js"
"10-complete-enterprise-adapters.js"
"11-add-bpo-adapter.js"
"12-runtime-intelligence-layer.js"
"13-consolidate-intelligence-engines.js"
"14-runtime-execution-layer.js"
"15-runtime-governance-layer.js"
"16-runtime-digital-twin-layer.js"
"17-runtime-command-center-layer.js"
"18-runtime-integration-hub-layer.js"
"19-runtime-neural-memory-layer.js"
"18-runtime-integration-fabric.js"
)

for script in "${SCRIPTS[@]}"; do

FILE="scripts/runtime-migration/$script"

if [ -f "$FILE" ]; then

echo
echo "------------------------------------------------------------"
echo "Running $script"
echo "------------------------------------------------------------"

node "$FILE"

else

echo
echo "Skipping $script (not found)"

fi

done

echo
echo "============================================================"
echo "Migration Complete"
echo "============================================================"
echo

git status --short
