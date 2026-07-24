#!/usr/bin/env bash
# Run this INSIDE your Codespace, from anywhere in the repo.
# Applies the 6 pending apply_*.py scripts one at a time, verifies each with
# node --check, and commits each individually (not one giant commit).
# Aborts immediately on any failure — nothing partial gets committed.
#
# Does NOT push. Review `git log --oneline -6` after it finishes, then push
# yourself when satisfied.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

EXPECTED_BRANCH="fix/honeywell-relay-domain-split"
CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]]; then
  echo "ERROR: on branch '$CURRENT_BRANCH', expected '$EXPECTED_BRANCH'. Aborting." >&2
  exit 1
fi

SELF_NAME="$(basename "$0")"
DIRTY="$(git status --porcelain -- . ":(exclude)${SELF_NAME}")"
if [[ -n "$DIRTY" ]]; then
  echo "ERROR: working tree not clean before starting. Commit/stash first. Aborting." >&2
  echo "$DIRTY" >&2
  exit 1
fi

SCRIPTS=(
  "apply_add_mortgage_schools_suite_hub.py"
  "apply_fix_execportal_actionbar_overlap.py"
  "apply_fix_execportal_bottom_overlap.py"
  "apply_fix_hub_command.py"
  "apply_fix_suite_hub_command_link.py"
  "apply_wire_phases_into_report.py"
)

for script in "${SCRIPTS[@]}"; do
  echo "=== Running $script ==="

  if [[ ! -f "$script" ]]; then
    echo "ERROR: $script not found in repo root ($REPO_ROOT). Aborting." >&2
    exit 1
  fi

  python3 "$script"

  # Collect changed files (modified + new), NUL-delimited to survive spaces.
  mapfile -d '' -t CHANGED < <(git status --porcelain -z)
  if [[ ${#CHANGED[@]} -eq 0 ]]; then
    echo "ERROR: $script ran but produced no file changes. Aborting — check the script's assert guards." >&2
    exit 1
  fi

  # Extract just the paths (strip the 2-char status prefix + space)
  FILES=()
  for entry in "${CHANGED[@]}"; do
    FILES+=("${entry:3}")
  done

  # node --check every touched .js file before committing anything
  for f in "${FILES[@]}"; do
    if [[ "$f" == *.js ]]; then
      echo "  node --check $f"
      node --check "$f"
    fi
  done

  git add -- "${FILES[@]}"
  git commit -m "fix: $(basename "$script" .py) — applied via assert-guarded script" --no-gpg-sign

  echo "  committed: $(git log -1 --oneline)"
  echo
done

echo "=== All 6 scripts applied, verified, and committed individually ==="
git log --oneline -6
echo
echo "Nothing pushed. When ready:  git push origin $EXPECTED_BRANCH"