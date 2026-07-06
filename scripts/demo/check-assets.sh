#!/usr/bin/env bash
# scripts/demo/check-assets.sh
#
# Parses every registered page for <script src="...">, <link href="...">
# and <img src="..."> pointing at local files, resolves each against the
# same mount rules server.js uses (see resolve_asset below), and fails if
# the resolved file does not exist. This is exactly the class of bug that
# bit the demo before (missing tsm-shared.js include, and the same
# pattern would have caught the approval-war-room.html reference to
# /services/approval-engine.js, which has no matching file anywhere in
# the repo).
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

# Mirrors server.js static mount order. Absolute paths (leading "/") are
# tested against these prefixes in order; first candidate root that
# yields an existing file wins. Falls back to html/<path> (the
# catch-all express.static(dirPath) mount), since that's what an
# unmatched absolute path resolves to in production.
resolve_asset() {
  local p="$1" page_dir="$2" candidate
  case "$p" in
    /html/runtime/*) candidate="$REPO_ROOT/html/runtime/${p#/html/runtime/}"; [ -f "$candidate" ] && { echo "$candidate"; return; } ;;
  esac
  case "$p" in
    /js/*)
      candidate="$REPO_ROOT/html/tsm-insurance/public/js/${p#/js/}"
      [ -f "$candidate" ] && { echo "$candidate"; return; }
      candidate="$REPO_ROOT/html/js/${p#/js/}"
      [ -f "$candidate" ] && { echo "$candidate"; return; }
      ;;
    /bpo/*) candidate="$REPO_ROOT/html/bpo/${p#/bpo/}"; [ -f "$candidate" ] && { echo "$candidate"; return; } ;;
    /shared/*) candidate="$REPO_ROOT/html/bpo/shared/${p#/shared/}"; [ -f "$candidate" ] && { echo "$candidate"; return; } ;;
    /insurance/*) candidate="$REPO_ROOT/html/tsm-insurance/${p#/insurance/}"; [ -f "$candidate" ] && { echo "$candidate"; return; } ;;
    /construction/*) candidate="$REPO_ROOT/html/construction-suite/${p#/construction/}"; [ -f "$candidate" ] && { echo "$candidate"; return; } ;;
    /runtime/*) candidate="$REPO_ROOT/runtime/${p#/runtime/}"; [ -f "$candidate" ] && { echo "$candidate"; return; } ;;
    /architecture/*) candidate="$REPO_ROOT/architecture/${p#/architecture/}"; [ -f "$candidate" ] && { echo "$candidate"; return; } ;;
    /html/*) candidate="$REPO_ROOT/html/${p#/html/}"; [ -f "$candidate" ] && { echo "$candidate"; return; } ;;
  esac
  # Fallback: catch-all express.static(html/) mount at '/'
  if [[ "$p" == /* ]]; then
    candidate="$REPO_ROOT/html${p}"
    [ -f "$candidate" ] && { echo "$candidate"; return; }
  else
    # Relative path — resolve against the including page's own directory.
    candidate="$(cd "$page_dir" 2>/dev/null && realpath -m "$p" 2>/dev/null)"
    [ -n "$candidate" ] && [ -f "$candidate" ] && { echo "$candidate"; return; }
  fi
  echo ""
}

section "check-assets: local script/link/img targets"

while IFS='|' read -r label relpath; do
  [ -z "${relpath:-}" ] && continue
  full="$HTML_ROOT/$relpath"
  [ -f "$full" ] || continue   # check-pages.sh already reports missing pages
  page_dir="$(dirname "$full")"

  # Extract src="" / href="" values that look like local JS/CSS/image
  # assets. Skip http(s):, //, data:, mailto:, and #anchors.
  mapfile -t refs < <(grep -oE '(src|href)="[^"]+"' "$full" \
    | sed -E 's/^(src|href)="//; s/"$//' \
    | grep -E '\.(js|css|png|jpg|jpeg|svg|gif|webp|json)(\?.*)?$' \
    | grep -vE '^(https?:)?//|^data:|^mailto:|^#')

  [ "${#refs[@]}" -eq 0 ] && continue

  for ref in "${refs[@]}"; do
    clean="${ref%%\?*}"   # strip query strings before resolving
    resolved="$(resolve_asset "$clean" "$page_dir")"
    if [ -n "$resolved" ]; then
      pass "$label: $ref"
    else
      fail "$label: $ref (no file resolves for this path)"
    fi
  done
done < <(load_page_registry)

finish_check "check-assets"
