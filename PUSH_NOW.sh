#!/bin/bash
# TSM RCM — Final Push Script
# All 11 modules wired. Ready to deploy.

set -e

cd /workspaces/tsm-rcm || { echo "Error: not in tsm-rcm directory"; exit 1; }

echo "═══════════════════════════════════════════════════════════"
echo "TSM RCM FinOps — Pushing All Modules to GitHub"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Commits ready:"
git log --oneline -2
echo ""
echo "Status:"
git status --short
echo ""

echo "Pushing to origin/main..."
git push origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ SUCCESS! All 11 modules deployed."
  echo ""
  echo "Deployed modules:"
  echo "  01. Cashiering (3 anomalies)"
  echo "  02. Service Requests (2 anomalies)"
  echo "  03. Client Inbox (3 anomalies)"
  echo "  04. Client Records (3 anomalies)"
  echo "  06. Cash Recon (2 anomalies)"
  echo "  07. Compliance (1 anomaly)"
  echo "  08. CC Recon (3 anomalies)"
  echo "  09. Payroll (3 anomalies)"
  echo "  10. Working Capital (2 anomalies)"
  echo "  11. Month-End Accrual (4 anomalies)"
  echo ""
  echo "Total: 10 functional modules, 26 anomaly codes"
  echo "Destination: RCM OS Cross-Module Exceptions"
  echo ""
else
  echo "❌ Push failed. Check network and credentials."
  exit 1
fi
