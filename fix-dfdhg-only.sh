#!/usr/bin/env bash
# Rewords just the remaining "dfdhg" commit on main and force-pushes.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "== Verifying starting state =="
git fetch origin main
git log --oneline -5

DFDHG_HASH=$(git log --format='%H %s' -20 | grep ' dfdhg$' | awk '{print $1}' | head -1)

if [[ -z "$DFDHG_HASH" ]]; then
  echo "Could not find the dfdhg commit. It may already be fixed. Current log:"
  git log --oneline -5
  exit 1
fi

echo "Found dfdhg: $DFDHG_HASH"

MSG_DFDHG="feat(pm-copilot): add risk register, lifecycle funnel, anomaly registration to exec portal"
PARENT=$(git rev-parse "${DFDHG_HASH}^")

export GIT_SEQUENCE_EDITOR="sed -i -E 's/^pick (${DFDHG_HASH:0:7}[a-f0-9]*)/reword \1/'"

cat > /tmp/reword-editor-single.sh <<EOF
#!/usr/bin/env bash
echo "$MSG_DFDHG" > "\$1"
EOF
chmod +x /tmp/reword-editor-single.sh
export GIT_EDITOR="/tmp/reword-editor-single.sh"

echo "== Running rebase =="
git rebase -i "$PARENT"

echo "== Result =="
git log --oneline -5

echo "== Force-pushing with lease =="
git push --force-with-lease origin main

echo "Done. Verify on GitHub that the commit message looks right."
