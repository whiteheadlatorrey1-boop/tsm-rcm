#!/usr/bin/env bash
# Rewords the two junk commits ("dfdhg" and "dgdrhtdx") on main and force-pushes.
# Run this from inside your tsm-rcm checkout in Codespaces.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "== Verifying starting state =="
git fetch origin main
git log --oneline -5

# Find the two commit hashes by their junk subject lines, oldest first.
DFDHG_HASH=$(git log --format='%H %s' -20 | grep ' dfdhg$' | awk '{print $1}' | head -1)
DGDRHTDX_HASH=$(git log --format='%H %s' -20 | grep ' dgdrhtdx$' | awk '{print $1}' | head -1)

if [[ -z "$DFDHG_HASH" || -z "$DGDRHTDX_HASH" ]]; then
  echo "Could not find both junk commits by subject line. Aborting — check 'git log' manually."
  echo "dfdhg hash:    ${DFDHG_HASH:-NOT FOUND}"
  echo "dgdrhtdx hash: ${DGDRHTDX_HASH:-NOT FOUND}"
  exit 1
fi

echo "Found dfdhg:    $DFDHG_HASH"
echo "Found dgdrhtdx: $DGDRHTDX_HASH"

# New commit messages
MSG_DFDHG="feat(pm-copilot): add risk register, lifecycle funnel, anomaly registration to exec portal"
MSG_DGDRHTDX="feat(pm-copilot): wire strategist to BNCA exposure engine + AI synthesis"

# Rebase from the parent of the older (dfdhg) commit, marking both for reword.
PARENT=$(git rev-parse "${DFDHG_HASH}^")

# Auto-mark both commits as 'reword' in the rebase todo list.
export GIT_SEQUENCE_EDITOR="sed -i -E 's/^pick (${DFDHG_HASH:0:7}[a-f0-9]*)/reword \1/; s/^pick (${DGDRHTDX_HASH:0:7}[a-f0-9]*)/reword \1/'"

# Feed the right message for whichever commit is currently being reworded.
cat > /tmp/reword-editor.sh <<EOF
#!/usr/bin/env bash
target="\$1"
first_line=\$(head -1 "\$target")
if echo "\$first_line" | grep -q "dfdhg"; then
  echo "$MSG_DFDHG" > "\$target"
elif echo "\$first_line" | grep -q "dgdrhtdx"; then
  echo "$MSG_DGDRHTDX" > "\$target"
fi
EOF
chmod +x /tmp/reword-editor.sh
export GIT_EDITOR="/tmp/reword-editor.sh"

echo "== Running rebase =="
git rebase -i "$PARENT"

echo "== Result =="
git log --oneline -5

echo "== Force-pushing with lease =="
git push --force-with-lease origin main

echo "Done. Verify on GitHub that both commit messages look right."
