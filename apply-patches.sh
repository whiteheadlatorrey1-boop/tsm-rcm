#!/usr/bin/env bash
set -euo pipefail

# Run this from the root of your tsm-rcm checkout in the Codespace,
# with both patch files placed alongside it (or pass paths as args).

RCM_OS_PATCH="${1:-0001-rcm-os-sentinel-wiring.patch}"
LEGAL_TAX_PATCH="${2:-0001-fix-legal-tax-html-corruption.patch}"

apply_one () {
  local patch="$1"
  local file="$2"
  local msg="$3"

  if [ ! -f "$patch" ]; then
    echo "Skipping: $patch not found here."
    return
  fi

  echo "== Applying $patch =="
  if git apply --check "$patch" 2>/dev/null; then
    git apply "$patch"
    git add "$file"
    git commit --no-gpg-sign -m "$msg"
    echo "Committed."
  else
    echo "Patch didn't apply cleanly (already applied, or main has moved on)."
    echo "Check with: git apply --check --verbose $patch"
  fi
  echo
}

apply_one "$RCM_OS_PATCH" \
  "html/finops-suite/tsm-rcm-os.html" \
  "RCM-OS: wire Cross-Module Exceptions to Sentinel relay on CRITICAL"

apply_one "$LEGAL_TAX_PATCH" \
  "html/legal-pro/legal-tax.html" \
  "Fix legal-tax.html: resolve issue #160 corruption (3x </html>, full doc duplication)"

echo "Done. Run 'git log --oneline -5' to confirm, then push/deploy as usual."
