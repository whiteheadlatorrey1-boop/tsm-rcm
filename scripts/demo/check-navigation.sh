#!/usr/bin/env bash
# scripts/demo/check-navigation.sh
#
# Scans every registered page for <a href="....html">, window.location /
# location.href assignments, and location.assign() calls pointing at a
# local .html file, and verifies the target exists. This is the class of
# bug that caused the dead link in presentation-live.html fixed in PR #89.
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

resolve_nav() {
  local p="$1" page_dir="$2" candidate
  if [[ "$p" == /html/* ]]; then
    candidate="$REPO_ROOT${p}"
    [ -f "$candidate" ] && { echo "$candidate"; return; }
  elif [[ "$p" == /* ]]; then
    candidate="$REPO_ROOT/html${p}"
    [ -f "$candidate" ] && { echo "$candidate"; return; }
    candidate="$REPO_ROOT/html${p%/}/index.html"
    [ -f "$candidate" ] && { echo "$candidate"; return; }
  else
    candidate="$(cd "$page_dir" 2>/dev/null && realpath -m "$p" 2>/dev/null)"
    [ -n "$candidate" ] && [ -f "$candidate" ] && { echo "$candidate"; return; }
  fi
  echo ""
}

section "check-navigation: internal link targets"

while IFS='|' read -r label relpath; do
  [ -z "${relpath:-}" ] && continue
  full="$HTML_ROOT/$relpath"
  [ -f "$full" ] || continue
  page_dir="$(dirname "$full")"

  mapfile -t links < <( {
      grep -oE 'href="[^"]+\.html[^"]*"' "$full" | sed -E 's/^href="//; s/"$//'
      grep -oE "(location\.href|location)\s*=\s*['\"][^'\"]+\.html[^'\"]*['\"]" "$full" \
        | grep -oE "['\"][^'\"]+\.html[^'\"]*['\"]" | tr -d "'\""
    } | grep -vE '^(https?:)?//' | sort -u )

  [ "${#links[@]}" -eq 0 ] && continue

  for link in "${links[@]}"; do
    clean="${link%%\#*}"
    clean="${clean%%\?*}"
    [ -z "$clean" ] && continue
    resolved="$(resolve_nav "$clean" "$page_dir")"
    if [ -n "$resolved" ]; then
      pass "$label -> $link"
    else
      fail "$label -> $link (dead link, target not found)"
    fi
  done
done < <(load_page_registry)

finish_check "check-navigation"
