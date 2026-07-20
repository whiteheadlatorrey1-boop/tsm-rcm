#!/usr/bin/env bash
# Sweeps every .html page in construction-suite for getElementById() calls
# whose target ID doesn't exist anywhere in the file as id="...".
# Handles both literal calls -> getElementById('foo')
# and concatenated/dynamic calls -> getElementById('foo'+i) or ('smp-'+k)
# by matching the file's id="..." attributes as prefixes too.

DIR="html/construction-suite"

for FILE in "$DIR"/*.html; do
  echo "════════════════════════════════════════"
  echo "FILE: $FILE"
  echo "════════════════════════════════════════"

  # All literal getElementById('...') targets, static or concatenation prefix
  IDS=$(grep -oP "getElementById\(\s*['\"]\K[^'\"]+" "$FILE" | sort -u)

  # All id="..." values actually present in the file
  DEFINED=$(grep -oP 'id=["\047]\K[^"\047]+' "$FILE" | sort -u)

  FOUND_ISSUE=0
  while read -r id; do
    [ -z "$id" ] && continue
    # Exact match?
    if echo "$DEFINED" | grep -qxF "$id"; then continue; fi
    # Prefix match (covers dynamic ids like 'smp-'+k matching smp-demo, smp-co, etc.)
    if echo "$DEFINED" | grep -qF "$id"; then continue; fi
    # Created dynamically via createElement + this id later in JS? still flag but note it
    echo "  MISSING: $id"
    FOUND_ISSUE=1
  done <<< "$IDS"

  if [ "$FOUND_ISSUE" -eq 0 ]; then
    echo "  ✅ No orphaned getElementById targets found."
  fi
  echo
done