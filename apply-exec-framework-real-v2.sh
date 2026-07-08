#!/usr/bin/env bash
# apply-exec-framework-real-v2.sh
# Idempotent apply script for TSM-exec-framework-real-v2.zip
#   - warns if any target file has uncommitted local changes (editor buffer /
#     unsaved edits won't show here, but a modified working tree will) so you
#     don't silently clobber something you were mid-edit on
#   - backs up whatever's currently on disk to _archive/ before overwriting
#   - unzips the payload
#   - node --check's every JS file it touched
#   - kills anything already on :8080 and restarts server.js
#
# Usage:
#   ./apply-exec-framework-real-v2.sh /path/to/TSM-exec-framework-real-v2.zip

set -euo pipefail

ZIP="${1:-TSM-exec-framework-real-v2.zip}"
STAMP="$(date +%Y%m%d_%H%M%S)"
ARCHIVE_DIR="_archive/exec-framework-real-v2_${STAMP}"

if [ ! -f "$ZIP" ]; then
  echo "Zip not found: $ZIP"
  echo "Usage: ./apply-exec-framework-real-v2.sh /path/to/TSM-exec-framework-real-v2.zip"
  exit 1
fi

TARGETS=(
  "html/shared/tsm-exec-framework.js"
  "html/shared/tsm-exec-framework.css"
  "html/services/approval-engine.js"
  "html/war-rooms/approval/approval-strategist.html"
  "html/war-rooms/approval/approval-executive-portal.html"
  "html/war-rooms/crm/services/crm-engine.js"
  "html/war-rooms/crm/crm-strategist.html"
  "html/war-rooms/crm/crm-executive-portal.html"
)

echo "── Checking git working tree for local edits on target files ──"
DIRTY=0
for f in "${TARGETS[@]}"; do
  if [ -f "$f" ] && ! git diff --quiet -- "$f" 2>/dev/null; then
    echo "  MODIFIED (uncommitted): $f"
    DIRTY=1
  fi
done
if [ "$DIRTY" -eq 1 ]; then
  echo ""
  echo "One or more target files have uncommitted changes in your working tree."
  echo "If you also have an unsaved buffer open for any of these in your editor,"
  echo "close it WITHOUT saving first — otherwise saving after this script runs"
  echo "will silently overwrite what this script just applied."
  read -r -p "Continue and back these up + overwrite anyway? [y/N] " ans
  if [[ ! "$ans" =~ ^[Yy]$ ]]; then
    echo "Aborted. No files changed."
    exit 1
  fi
fi

echo ""
echo "── Backing up existing files to $ARCHIVE_DIR ──"
mkdir -p "$ARCHIVE_DIR"
for f in "${TARGETS[@]}"; do
  if [ -f "$f" ]; then
    mkdir -p "$ARCHIVE_DIR/$(dirname "$f")"
    cp "$f" "$ARCHIVE_DIR/$f"
    echo "  backed up: $f"
  fi
done

echo ""
echo "── Applying $ZIP ──"
unzip -o "$ZIP"

echo ""
echo "── Parse-checking JS files ──"
FAIL=0
for f in "${TARGETS[@]}"; do
  if [[ "$f" == *.js ]]; then
    if node --check "$f" 2>/tmp/parsecheck_err; then
      echo "  OK: $f"
    else
      echo "  PARSE FAIL: $f"
      cat /tmp/parsecheck_err
      FAIL=1
    fi
  fi
done

if [ "$FAIL" -eq 1 ]; then
  echo ""
  echo "Parse check failed. Restoring from backup: $ARCHIVE_DIR"
  for f in "${TARGETS[@]}"; do
    if [ -f "$ARCHIVE_DIR/$f" ]; then
      cp "$ARCHIVE_DIR/$f" "$f"
    fi
  done
  echo "Rolled back. Nothing left broken on disk."
  exit 1
fi

echo ""
echo "── Restarting server ──"
if lsof -ti:8080 >/dev/null 2>&1; then
  echo "  killing existing process on :8080"
  lsof -ti:8080 | xargs kill -9
elif pgrep -f "node server.js" >/dev/null 2>&1; then
  echo "  killing existing 'node server.js' process"
  pkill -f "node server.js"
fi

sleep 1
echo "  starting node server.js (backgrounded, logging to /tmp/tsm-server.log)"
nohup node server.js > /tmp/tsm-server.log 2>&1 &
sleep 2
echo ""
echo "── Server log (last 15 lines) ──"
tail -n 15 /tmp/tsm-server.log

echo ""
echo "Done. Backup of prior files: $ARCHIVE_DIR"
echo "Now hard-refresh: approval-war-room.html / approval-strategist.html / approval-executive-portal.html"
echo "               and crm-war-room.html / crm-strategist.html / crm-executive-portal.html"
