#!/usr/bin/env bash
# find-model-refs.sh
# Scans the repo for every reference to the deprecated Groq model,
# in code, config, and docs. Read-only — makes zero changes.
#
# Usage: ./find-model-refs.sh [old-model-string]
#   default old-model-string: llama-3.3-70b-versatile

set -euo pipefail

OLD_MODEL="${1:-llama-3.3-70b-versatile}"

echo "Scanning for: $OLD_MODEL"
echo "Repo root: $(pwd)"
echo ""

EXCLUDES=(--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build
          --exclude=find-model-refs.sh --exclude=replace-model.sh --exclude=apply-intake-gateway.sh)

echo "== Matches by file =="
MATCHES=$(grep -rn "${EXCLUDES[@]}" -F "$OLD_MODEL" . 2>/dev/null || true)

if [ -z "$MATCHES" ]; then
  echo "No references found."
  exit 0
fi

echo "$MATCHES"
echo ""

echo "== Summary =="
FILE_COUNT=$(echo "$MATCHES" | cut -d: -f1 | sort -u | wc -l | tr -d ' ')
LINE_COUNT=$(echo "$MATCHES" | wc -l | tr -d ' ')
echo "Files affected: $FILE_COUNT"
echo "Total references: $LINE_COUNT"
echo ""

echo "== By file type =="
echo "$MATCHES" | cut -d: -f1 | sed 's/.*\.//' | sort | uniq -c | sort -rn

echo ""
echo "== Files list (for replace-model.sh input, if you want to scope it) =="
echo "$MATCHES" | cut -d: -f1 | sort -u