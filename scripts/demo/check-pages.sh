#!/usr/bin/env bash
# scripts/demo/check-pages.sh
#
# 1. Every page in demo-pages.conf exists on disk.
# 2. Every page is non-empty and has both an opening and closing <html> tag
#    (catches truncated writes / merge accidents like the PR #39 incident).
# 3. WARN (don't fail) about *.html files under html/war-rooms and
#    html/music-command that exist but are NOT in the registry, so new
#    pages get noticed and added deliberately instead of silently
#    skipped by every future run.
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

section "check-pages: registry coverage"

declare -A REGISTERED
while IFS='|' read -r label relpath; do
  [ -z "${relpath:-}" ] && continue
  REGISTERED["$relpath"]=1
  full="$HTML_ROOT/$relpath"

  if [ ! -f "$full" ]; then
    fail "$label -> $relpath (missing)"
    continue
  fi

  size=$(wc -c < "$full")
  if [ "$size" -eq 0 ]; then
    fail "$label -> $relpath (0 bytes)"
    continue
  fi

  if ! grep -qi '<html' "$full"; then
    fail "$label -> $relpath (no <html> tag — likely truncated or not a page)"
    continue
  fi
  if ! grep -qi '</html>' "$full"; then
    fail "$label -> $relpath (no closing </html> — likely truncated)"
    continue
  fi

  pass "$label -> $relpath ($size bytes)"
done < <(load_page_registry)

section "check-pages: unregistered pages on disk"

while IFS= read -r -d '' f; do
  rel="${f#"$HTML_ROOT"/}"
  case "$rel" in *.bak) continue ;; esac
  if [ -z "${REGISTERED[$rel]:-}" ]; then
    warn "found but not in demo-pages.conf: $rel"
  fi
done < <(find "$HTML_ROOT/war-rooms" "$HTML_ROOT/music-command" -maxdepth 2 -name "*.html" -print0 2>/dev/null)

finish_check "check-pages"
