#!/usr/bin/env bash
set -euo pipefail
EXPECTED_BRANCH="feat/mission-preview-phase4"
EXPECTED_SHA="da181dc29ccb947a022eddc7db49e044a52502de3dc5a7dda226b143aa186b62"
echo "== 1. Checking branch =="
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
  git fetch origin "$EXPECTED_BRANCH"
  git checkout "$EXPECTED_BRANCH"
  git pull origin "$EXPECTED_BRANCH"
fi
echo "== 2. Decoding patch =="
base64 -d /tmp/rcm-auth-gate.b64 > rcm-auth-gate.patch
echo "== 3. Verifying checksum =="
ACTUAL_SHA=$(sha256sum rcm-auth-gate.patch | awk '{print $1}')
if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
  echo "CHECKSUM MISMATCH — expected $EXPECTED_SHA, got $ACTUAL_SHA"
  exit 1
fi
echo "Checksum OK"
echo "== 4. Dry-run =="
git apply --check rcm-auth-gate.patch
echo "== 5. Applying =="
git apply rcm-auth-gate.patch
echo "== 6. Done =="
git diff --stat
