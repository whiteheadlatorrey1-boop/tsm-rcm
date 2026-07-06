#!/usr/bin/env bash
# scripts/demo/check-runtime.sh
#
# For every page in demo-pages.conf, checks it against every rule in
# runtime-requirements.conf whose label-glob matches, and fails if a
# required script include is missing. This is the direct guard against
# the demo-conductor.html bug: 19 data-tsm-action buttons silently
# no-op'd because tsm-shared.js was never included on the page.
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

RULES_FILE="$DEMO_LIB_DIR/runtime-requirements.conf"

section "check-runtime: required script includes"

declare -A PAGE_PATH
while IFS='|' read -r label relpath; do
  [ -z "${relpath:-}" ] && continue
  PAGE_PATH["$label"]="$relpath"
done < <(load_page_registry)

while IFS='|' read -r glob required; do
  [ -z "${required:-}" ] && continue
  for label in "${!PAGE_PATH[@]}"; do
    # shellcheck disable=SC2053
    if [[ "$label" == $glob ]]; then
      relpath="${PAGE_PATH[$label]}"
      full="$HTML_ROOT/$relpath"
      [ -f "$full" ] || continue   # check-pages.sh already flags this

      if grep -qF "$required" "$full"; then
        pass "$label requires '$required' — present"
      else
        fail "$label requires '$required' — MISSING (matched rule: $glob)"
      fi
    fi
  done
done < <(grep -vE '^\s*(#|$)' "$RULES_FILE")

finish_check "check-runtime"
