#!/usr/bin/env bash
# Drop-in apply script — run from repo root (the folder containing server/
# and mortgage-war-rooms/, or wherever your TSM-Consultz checkout roots
# those two paths in your actual layout).
set -euo pipefail

SERVER_ENTERPRISE="server/enterprise"
MORTGAGE_SERVICES="mortgage-war-rooms/services"   # adjust if your mortgage
                                                    # war rooms live at a
                                                    # different path in the
                                                    # main repo

assert_exists() {
  [ -f "$1" ] || { echo "MISSING: $1 — check paths above before running"; exit 1; }
}

assert_exists "$SERVER_ENTERPRISE/domain-map.js"
assert_exists "$SERVER_ENTERPRISE/api/enterprise-router.js"
assert_exists "$MORTGAGE_SERVICES/mortgage-engine.js"

cp domain-map.js        "$SERVER_ENTERPRISE/domain-map.js"
cp demo-fixtures.js     "$SERVER_ENTERPRISE/demo-fixtures.js"
cp enterprise-router.js "$SERVER_ENTERPRISE/api/enterprise-router.js"
cp mortgage-engine.js   "$MORTGAGE_SERVICES/mortgage-engine.js"

node --check "$SERVER_ENTERPRISE/domain-map.js"
node --check "$SERVER_ENTERPRISE/demo-fixtures.js"
node --check "$SERVER_ENTERPRISE/api/enterprise-router.js"
node --check "$MORTGAGE_SERVICES/mortgage-engine.js"

echo "Applied and syntax-checked. Restart the server, then hit each demo"
echo "button and confirm the war room panel is no longer showing 0/10."