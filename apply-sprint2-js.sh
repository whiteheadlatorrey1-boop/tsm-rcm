#!/usr/bin/env bash
# apply-sprint2-js.sh
# Copies the Sprint 2 digital-twin JS files into the repo and runs the test suite.
# Does NOT touch server.js or any HTML — those are manual steps (see README-sprint2.md).

set -euo pipefail

echo "Locating repo root..."
DIR="$(pwd)"
while [ "$DIR" != "/" ]; do
  if [ -d "$DIR/.git" ]; then
    REPO_ROOT="$DIR"
    break
  fi
  DIR="$(dirname "$DIR")"
done

if [ -z "${REPO_ROOT:-}" ]; then
  echo "❌ Could not find a .git directory above $(pwd). Run this from inside your repo."
  exit 1
fi

echo "Working in: $REPO_ROOT"
cd "$REPO_ROOT"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$REPO_ROOT/server/enterprise-lab"

mkdir -p "$TARGET_DIR"

for f in vmware-twin.js network-twin.js twins-router.js; do
  if [ ! -f "$SCRIPT_DIR/$f" ]; then
    echo "❌ Missing $f next to this script. Put all Sprint 2 files in the same folder as apply-sprint2-js.sh."
    exit 1
  fi
  cp "$SCRIPT_DIR/$f" "$TARGET_DIR/$f"
  echo "Copied $f -> server/enterprise-lab/$f"
done

cp "$SCRIPT_DIR/test-twins.js" "$REPO_ROOT/test-twins.js"
echo "Copied test-twins.js -> test-twins.js"

echo ""
echo "Running twin test suite..."
node "$REPO_ROOT/test-twins.js"

echo ""
echo "✅ JS files copied and tests passed."
echo ""
echo "Still manual (not touched by this script):"
echo "  1. Mount the router in server.js:"
echo "       const twinsRouter = require('./server/enterprise-lab/twins-router');"
echo "       app.use('/api/twins', twinsRouter);"
echo "  2. Paste html/snippets/topology-panels.html into enterprise-command-center.html"
echo "     (see README-sprint2.md for exact steps)."