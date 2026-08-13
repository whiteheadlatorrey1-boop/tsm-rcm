#!/usr/bin/env bash
# Push the applied patch commit(s) to origin/main.
set -euo pipefail

cd /workspaces/tsm-rcm

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "Not on main (on '$branch') — aborting." >&2
  exit 1
fi

git fetch origin
ahead="$(git rev-list --count origin/main..HEAD)"
behind="$(git rev-list --count HEAD..origin/main)"

if [ "$ahead" -eq 0 ]; then
  echo "Nothing to push — HEAD already matches origin/main." >&2
  exit 1
fi
if [ "$behind" -ne 0 ]; then
  echo "origin/main has $behind commit(s) you don't have — pull/rebase first." >&2
  exit 1
fi

echo "Pushing $ahead commit(s) to origin/main:"
git log --oneline origin/main..HEAD

git push origin main

echo "Pushed. New origin/main:"
git log --oneline origin/main -1