#!/usr/bin/env bash
set -euo pipefail

# Deletes only the untracked files/dirs confirmed to have ZERO references anywhere
# in the tracked codebase (checked via grep across .js/.json/.yml/.md/.sh, and against
# package.json's scripts block). Does NOT touch build.js or TSM_Prospect_Proof_Pack/ —
# those still need your input before anyone deletes them.

TARGETS=(
  "TSM_Platform_Gap_Audit_Report.md"
  "TSM_Platform_Runtime_Audit_Report.md"
  "TSM_VERTICAL_GROUNDING_INTEGRATION.md"
  "case-engine-usage.txt"
  "decision-engine-usage.txt"
  "delivery-package-usage.txt"
  "platform-audit-report.txt"
  "platform-audit-scan.sh"
  "platform-runtime-audit/"
  "scripts/cleanup-decision-chain-artifacts.sh"
  "scripts/finish-vertical-grounding.sh"
  "scripts/fix-decision-chain-language.sh"
  "scripts/install-platform-runtime-audit.sh"
  "scripts/lock-decision-chain.sh"
  "scripts/repair-decision-chain-language.sh"
  "scripts/repair-wire-vertical-grounding.sh"
  "scripts/trace-enterprise-enrich-client.sh"
  "scripts/verify-vertical-grounding-contract.sh"
  "scripts/wire-vertical-decision-grounding.sh"
)

echo "== Verifying every target is untracked (git has no history of it) =="
for t in "${TARGETS[@]}"; do
  clean="${t%/}"
  if git ls-files --error-unmatch "$clean" >/dev/null 2>&1; then
    echo "ABORT: $clean is tracked by git — this script only deletes untracked scratch files." >&2
    exit 1
  fi
  if [ ! -e "$clean" ]; then
    echo "SKIP: $clean not found (already gone?) — continuing."
  fi
done
echo "OK — all targets confirmed untracked."
echo ""

echo "The following will be permanently deleted (not staged, not committed — just rm'd):"
for t in "${TARGETS[@]}"; do
  [ -e "${t%/}" ] && echo "  $t"
done
echo ""
echo "NOT touched (still need your input):"
echo "  build.js"
echo "  TSM_Prospect_Proof_Pack/"
echo ""

read -p "Proceed with deletion? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted — nothing deleted."
  exit 0
fi

for t in "${TARGETS[@]}"; do
  clean="${t%/}"
  if [ -e "$clean" ]; then
    rm -rf -- "$clean"
    echo "Deleted: $clean"
  fi
done

echo ""
echo "Done. 'git status' should now show a much shorter untracked list —"
echo "just build.js and TSM_Prospect_Proof_Pack/ left to decide on."
