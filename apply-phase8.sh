#!/bin/bash
set -e

FILE="server.js"
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".phase8-backups/$TS"
mkdir -p "$BACKUP_DIR"
cp "$FILE" "$BACKUP_DIR/server.js"
echo "Backed up $FILE to $BACKUP_DIR/server.js"

# Sanity checks: make sure the anchors we depend on actually exist,
# and that we haven't already applied this patch (avoid double-insert).
if grep -q "function suggestTeam" "$FILE"; then
  echo "⚠️  suggestTeam already present in $FILE — skipping, nothing changed."
  exit 0
fi

if ! grep -q "// crude in-memory rate limit: 20 requests / 5 min / IP" "$FILE"; then
  echo "❌ Anchor 1 (rate limit comment) not found — file may have changed. Aborting, no edits made."
  exit 1
fi

if ! grep -q "parsed.confidence = scoreConfidence(parsed, validation);" "$FILE"; then
  echo "❌ Anchor 2 (scoreConfidence assignment) not found — file may have changed. Aborting, no edits made."
  exit 1
fi

python3 << 'PYEOF'
import re

with open("server.js", "r") as f:
    content = f.read()

# --- Insert the two new functions before the rate-limit block ---
functions_block = '''// -- Phase 8: derived routing recommendations (still deterministic) --
// Solo-owner phase: every vertical routes to Latorrey until a client/team
// subscribes to that vertical specifically. Update TEAM_BY_VERTICAL entries
// as ownership gets assigned out — this map is meant to grow, not stay flat.
const TEAM_BY_VERTICAL = {}; // empty = fall through to default owner below
const DEFAULT_OWNER = 'Latorrey';

function suggestTeam(parsed) {
  if (!parsed.primaryVertical) return DEFAULT_OWNER;
  return TEAM_BY_VERTICAL[parsed.primaryVertical] || DEFAULT_OWNER;
}

function scorePriority(parsed, validation, confidence) {
  const amountNum = Number(parsed.amount) || 0;
  const hasDefects = Array.isArray(parsed.defectFlags) && parsed.defectFlags.length > 0;

  if (!validation.valid) return 'Needs Review';
  if (confidence < 0.5) return 'Needs Review';
  if (hasDefects || amountNum > 25000) return 'High';
  if (amountNum > 5000) return 'Medium';
  return 'Low';
}

// crude in-memory rate limit: 20 requests / 5 min / IP'''

anchor1 = "// crude in-memory rate limit: 20 requests / 5 min / IP"
assert content.count(anchor1) == 1, "anchor1 not unique"
content = content.replace(anchor1, functions_block, 1)

# --- Insert the two new field assignments after the confidence line ---
anchor2 = "parsed.confidence = scoreConfidence(parsed, validation);"
assert content.count(anchor2) == 1, "anchor2 not unique"
replacement2 = anchor2 + "\n    parsed.suggestedTeam = suggestTeam(parsed);\n    parsed.priority = scorePriority(parsed, validation, parsed.confidence);"
content = content.replace(anchor2, replacement2, 1)

with open("server.js", "w") as f:
    f.write(content)

print("Patched server.js successfully.")
PYEOF

echo ""
echo "── Verifying insertion ──"
grep -n "suggestTeam\|scorePriority\|suggestedTeam\|parsed.priority" "$FILE"

echo ""
echo "── Checking server boots clean ──"
# Kill anything already on 8080 first so we get a clean read
EXISTING_PID=$(lsof -t -i:8080 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
  echo "Killing existing process on port 8080 (PID $EXISTING_PID)"
  kill -9 $EXISTING_PID 2>/dev/null || true
  sleep 1
fi

timeout 5 node "$FILE" > /tmp/phase8-boot-check.log 2>&1 &
BOOT_PID=$!
sleep 3
if grep -q "listening on port" /tmp/phase8-boot-check.log; then
  echo "✅ Server booted clean:"
  cat /tmp/phase8-boot-check.log
  kill -9 $BOOT_PID 2>/dev/null || true
else
  echo "❌ Server did NOT boot cleanly. Log output:"
  cat /tmp/phase8-boot-check.log
  echo ""
  echo "Restoring backup..."
  cp "$BACKUP_DIR/server.js" "$FILE"
  echo "Restored original server.js from backup. No changes applied."
  exit 1
fi

echo ""
echo "Done. Backup of pre-patch server.js is at $BACKUP_DIR/server.js"
echo "If this looks good, commit with:"
echo "  git add -A && git commit -m \"Phase 8: add suggestedTeam/priority to doc-router/classify response\""