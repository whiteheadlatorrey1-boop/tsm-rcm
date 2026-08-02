#!/bin/bash
set -e

FILE="server.js"
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".bnca-fix-backups/$TS"
mkdir -p "$BACKUP_DIR"
cp "$FILE" "$BACKUP_DIR/server.js"
echo "Backed up $FILE to $BACKUP_DIR/server.js"

if grep -q "cross-cutting node, valid in every vertical when bnca is flagged" "$FILE"; then
  echo "⚠️  Fix already present in $FILE — skipping, nothing changed."
  exit 0
fi

python3 << 'PYEOF'
with open("server.js", "r") as f:
    content = f.read()

anchor = """    const nodes = Array.isArray(r.nodes) ? r.nodes : [];
    nodes.forEach((n) => {
      if (!validNodes.includes(n)) {
        errors.push('routing.' + v + '.nodes contains invalid node id "' + n + '".');
      }
    });"""

replacement = """    const nodes = Array.isArray(r.nodes) ? r.nodes : [];
    nodes.forEach((n) => {
      if (n === 'bnca-engine') return; // cross-cutting node, valid in every vertical when bnca is flagged
      if (!validNodes.includes(n)) {
        errors.push('routing.' + v + '.nodes contains invalid node id "' + n + '".');
      }
    });"""

count = content.count(anchor)
if count == 0:
    print("❌ Anchor not found — file may have changed since last review. Aborting, no edits made.")
    exit(1)
if count > 1:
    print(f"❌ Anchor matched {count} times, expected exactly 1 — refusing to guess. Aborting, no edits made.")
    exit(1)

content = content.replace(anchor, replacement, 1)

with open("server.js", "w") as f:
    f.write(content)

print("Patched server.js successfully.")
PYEOF

if [ $? -ne 0 ]; then
  echo "Restoring backup due to patch failure..."
  cp "$BACKUP_DIR/server.js" "$FILE"
  exit 1
fi

echo ""
echo "── Verifying insertion ──"
grep -n "cross-cutting node, valid in every vertical" "$FILE"

echo ""
echo "── Checking server boots clean ──"
EXISTING_PID=$(lsof -t -i:8080 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
  echo "Killing existing process on port 8080 (PID $EXISTING_PID)"
  kill -9 $EXISTING_PID 2>/dev/null || true
  sleep 1
fi

timeout 5 node "$FILE" > /tmp/bnca-fix-boot-check.log 2>&1 &
BOOT_PID=$!
sleep 3
if grep -q "listening on port" /tmp/bnca-fix-boot-check.log; then
  echo "✅ Server booted clean:"
  cat /tmp/bnca-fix-boot-check.log
  kill -9 $BOOT_PID 2>/dev/null || true
else
  echo "❌ Server did NOT boot cleanly. Log output:"
  cat /tmp/bnca-fix-boot-check.log
  echo ""
  echo "Restoring backup..."
  cp "$BACKUP_DIR/server.js" "$FILE"
  echo "Restored original server.js from backup. No changes applied."
  exit 1
fi

echo ""
echo "── Re-testing the BNCA invoice case ──"
sleep 1
curl -s -X POST http://localhost:8080/api/doc-router/classify \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test-invoice.txt",
    "textContent": "INVOICE #4471\nVendor: Acme Construction Supply\nClient: TSM Consultz\nAmount: $32,500.00\nDescription: Emergency structural steel delivery, 48hr turnaround, contract violation flagged for late delivery penalty per Section 4.2."
  }' | python3 -m json.tool

echo ""
echo "Done. Backup of pre-patch server.js is at $BACKUP_DIR/server.js"
echo "Check above: validation.valid should now be true, and confidence/priority should reflect the actual document, not the bnca-engine bug."
echo "If this looks good, commit with:"
echo "  git add -A && git commit -m \"Fix: treat bnca-engine as cross-cutting valid node in doc-router validation\""