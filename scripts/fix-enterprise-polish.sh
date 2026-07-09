#!/bin/bash
set -e

echo "🔧 Fixing Enterprise Intelligence text polish..."

# Governance spacing
grep -rl "evaluated compliance,risk" server/enterprise 2>/dev/null | xargs -r sed -i 's/evaluated compliance,risk/evaluated compliance, risk/g'

# BNCA / explainability grammar fixes
grep -rl "capabilitiesrequire" server/enterprise 2>/dev/null | xargs -r sed -i 's/capabilitiesrequire/capabilities require/g'

# Replace generic review wording
grep -rl "enterprise capabilities require review" server/enterprise 2>/dev/null | while read -r file; do
  sed -i 's/enterprise capabilities require review/enterprise capabilities require executive review/g' "$file"
done

grep -rl "enterprise capability requires review" server/enterprise 2>/dev/null | while read -r file; do
  sed -i 's/enterprise capability requires review/enterprise capability requires executive review/g' "$file"
done

# Catch BNCA templates using string concatenation
grep -rl "require review" server/enterprise 2>/dev/null | while read -r file; do
  echo "Reviewing: $file"
done

echo "✅ Text cleanup complete"

echo "🔄 Restarting Node server..."

pkill -f "node server.js" || true

sleep 2

nohup node server.js >/tmp/tsm-enterprise.log 2>&1 &

sleep 3

echo "🚀 Server restarted"

echo "🧪 Running enterprise validation..."

node scripts/test-enterprise-orchestrator.js

