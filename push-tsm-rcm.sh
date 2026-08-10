#!/bin/bash
# TSM RCM — Push finops module wiring to GitHub
# 
# Usage:
#   ./push-tsm-rcm.sh
#   (or paste the git commands below directly)

set -e

cd "$(dirname "$0")/tsm-rcm" || {
  echo "Error: tsm-rcm directory not found. Run from parent of repo."
  exit 1
}

echo "📡 TSM RCM — Pushing finops cross-module anomaly wiring..."
echo ""

# Verify we're on main and have staged commits
if ! git log --oneline -1 | grep -q "Wire 7 finops modules"; then
  echo "⚠️  Last commit doesn't match expected. Verify you're on the right branch:"
  git log --oneline -3
  echo ""
fi

echo "Pushing to origin/main..."
git push origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Push successful!"
  echo ""
  echo "Deployed changes:"
  echo "  • TSMMemory engine loaded in finops-operations.html"
  echo "  • 7 modules now feed anomalies to RCM OS Cross-Module Exceptions:"
  echo "    1. Cashiering (holds, reviews, duplicates)"
  echo "    2. Service Requests (overdue, high-priority)"
  echo "    3. Client Inbox (SLA breach, warnings, backlog)"
  echo "    7. Compliance (incomplete checklist)"
  echo "    8. CC Recon (uncategorized, missing receipts, fraud flags)"
  echo "    9. Payroll (OT spikes, missing punches, rate changes)"
  echo ""
  echo "Next: Wire remaining 5 modules (Clients, Portfolio, Cash Recon, WC, Accrual)"
else
  echo ""
  echo "❌ Push failed. Check your GitHub credentials and network access."
  echo ""
  echo "Try one of these:"
  echo "  • Add SSH key: ssh-keygen -t ed25519 && ssh-add ~/.ssh/id_ed25519"
  echo "  • Use PAT: git config --global credential.helper store"
  echo "  • Manual: cd $(pwd) && git push origin main"
fi
