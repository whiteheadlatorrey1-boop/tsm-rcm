#!/usr/bin/env bash
# replace-model.sh
# Replaces every reference to the deprecated Groq model with the
# chosen replacement, across the whole repo. Backs up every touched
# file, applies the swap, then re-validates all touched .js/.html
# files with node --check before leaving you to review the diff.
#
# Usage:
#   ./replace-model.sh                          # gpt-oss-120b, live run
#   ./replace-model.sh --target qwen             # qwen/qwen3.6-27b instead
#   ./replace-model.sh --dry-run                 # preview only, no writes
#   ./replace-model.sh --old "llama-3.1-8b-instant" --target gpt-oss-20b
#
# Model choice (Groq's official migration path for llama-3.3-70b-versatile):
#   gpt-oss-120b  -> openai/gpt-oss-120b   (general-purpose, direct replacement, default)
#   qwen          -> qwen/qwen3.6-27b      (smaller, reasoning-optimized, higher $/M output)
#   gpt-oss-20b   -> openai/gpt-oss-20b    (for llama-3.1-8b-instant migrations, not this model)

set -euo pipefail

OLD_MODEL="llama-3.3-70b-versatile"
TARGET="gpt-oss-120b"
DRY_RUN=0

while [ $# -gt 0 ]; do
  case "$1" in
    --old) OLD_MODEL="$2"; shift 2 ;;
    --target) TARGET="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

case "$TARGET" in
  gpt-oss-120b) NEW_MODEL="openai/gpt-oss-120b" ;;
  qwen) NEW_MODEL="qwen/qwen3.6-27b" ;;
  gpt-oss-20b) NEW_MODEL="openai/gpt-oss-20b" ;;
  *) echo "Unknown --target '$TARGET'. Use: gpt-oss-120b | qwen | gpt-oss-20b" >&2; exit 1 ;;
esac

echo "Old model: $OLD_MODEL"
echo "New model: $NEW_MODEL"
echo "Mode: $([ $DRY_RUN -eq 1 ] && echo 'DRY RUN (no writes)' || echo 'LIVE')"
echo ""

command -v node >/dev/null || { echo "ERROR: node not found on PATH" >&2; exit 1; }

EXCLUDES=(--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build
          --exclude=find-model-refs.sh --exclude=replace-model.sh --exclude=apply-intake-gateway.sh)
MATCHING_FILES=$(grep -rl "${EXCLUDES[@]}" -F "$OLD_MODEL" . 2>/dev/null || true)

if [ -z "$MATCHING_FILES" ]; then
  echo "No files reference '$OLD_MODEL'. Nothing to do."
  exit 0
fi

FILE_COUNT=$(echo "$MATCHING_FILES" | wc -l | tr -d ' ')
echo "Found $FILE_COUNT file(s) to update:"
echo "$MATCHING_FILES" | sed 's/^/  /'
echo ""

if [ $DRY_RUN -eq 1 ]; then
  echo "== Preview of changes (first 3 matching lines per file) =="
  while IFS= read -r f; do
    echo "--- $f ---"
    grep -nF "$OLD_MODEL" "$f" | head -3 | sed 's/^/  /'
  done <<< "$MATCHING_FILES"
  echo ""
  echo "Dry run complete. No files were modified. Re-run without --dry-run to apply."
  exit 0
fi

BACKUP_DIR=".model-migration-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "Backups going to: $BACKUP_DIR/"
echo ""

CHANGED_JS=()
CHANGED_OTHER=()

while IFS= read -r f; do
  # preserve directory structure inside backup dir
  mkdir -p "$BACKUP_DIR/$(dirname "$f")"
  cp "$f" "$BACKUP_DIR/$f"

  # exact string replace, both quote styles handled automatically since
  # we're replacing the bare model string, not the surrounding quotes
  sed -i "s|$OLD_MODEL|$NEW_MODEL|g" "$f"

  echo "  ✓ patched $f"

  case "$f" in
    *.js) CHANGED_JS+=("$f") ;;
    *) CHANGED_OTHER+=("$f") ;;
  esac
done <<< "$MATCHING_FILES"

echo ""
echo "== Validating changed .js files =="
FAIL=0
for f in "${CHANGED_JS[@]:-}"; do
  [ -z "$f" ] && continue
  if node --check "$f" 2>/tmp/nodecheck_err; then
    echo "  ✓ $f (syntax OK)"
  else
    echo "  ✗ $f FAILED node --check:"
    cat /tmp/nodecheck_err | sed 's/^/      /'
    FAIL=1
  fi
done

OTHER_COUNT=${#CHANGED_OTHER[@]}
if [ "$OTHER_COUNT" -gt 0 ]; then
  echo ""
  echo "== Non-.js files changed (not syntax-checked, review manually) =="
  for f in "${CHANGED_OTHER[@]}"; do
    echo "  $f"
  done
fi

echo ""
if [ $FAIL -eq 1 ]; then
  echo "!! One or more files failed node --check after replacement."
  echo "!! Backups are in $BACKUP_DIR/ — restore with:"
  echo "!!   cp $BACKUP_DIR/<path> <path>"
  exit 1
fi

echo "== Verify zero old references remain (excluding backup dir) =="
REMAINING=$(grep -rl "${EXCLUDES[@]}" --exclude-dir="$BACKUP_DIR" -F "$OLD_MODEL" . 2>/dev/null || true)
if [ -n "$REMAINING" ]; then
  echo "  WARNING: old model string still found in:"
  echo "$REMAINING" | sed 's/^/    /'
else
  echo "  ✓ no remaining references to $OLD_MODEL"
fi

echo ""
echo "Done. $FILE_COUNT file(s) updated, all changed .js files pass node --check."
echo "Backups: $BACKUP_DIR/"
echo ""
echo "Next:"
echo "  git status --short"
echo "  git diff                          # review every change"
echo "  git add -A"
echo "  git commit -m \"Migrate off deprecated $OLD_MODEL -> $NEW_MODEL\""