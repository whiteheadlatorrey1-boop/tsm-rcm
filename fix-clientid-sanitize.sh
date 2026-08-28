#!/usr/bin/env bash
# fix-clientid-sanitize.sh
#
# Run this from the root of your tsm-rcm checkout (where routes/_shared.js
# lives). It:
#   1. Adds sanitizeClientId() to routes/_shared.js and wires it into
#      resolveHcClientId() to prevent path traversal via ?clientId=.
#   2. Removes the stray empty `default` file from the repo root.
#   3. Verifies the JS is still syntactically valid.
#   4. Commits both changes (two commits, so either can be reverted alone).
#   5. Pushes to main.
#
# Safe to re-run: if the sanitizer is already present, step 1 is skipped
# instead of double-patching the file.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  echo "ERROR: not inside a git repo. cd into your tsm-rcm checkout first." >&2
  exit 1
fi
cd "$REPO_ROOT"

SHARED_FILE="routes/_shared.js"
if [ ! -f "$SHARED_FILE" ]; then
  echo "ERROR: $SHARED_FILE not found in $REPO_ROOT" >&2
  exit 1
fi

echo "==> Working in $REPO_ROOT"

# ---------------------------------------------------------------------------
# 1. Patch routes/_shared.js
# ---------------------------------------------------------------------------
if grep -q "function sanitizeClientId" "$SHARED_FILE"; then
  echo "==> sanitizeClientId already present in $SHARED_FILE, skipping patch"
else
  echo "==> Patching $SHARED_FILE"

  OLD_FN='function resolveHcClientId(req) {
  const session = req.tsmSession || {};
  if (session.role === '"'"'client'"'"') return session.clientId || '"'"'default'"'"';
  const requested = (req.query && req.query.clientId) || (req.body && req.body.clientId);
  return (requested && String(requested).trim()) || '"'"'default'"'"';
}'

  NEW_FN='// Only [a-zA-Z0-9_-], 1-64 chars -- this string is interpolated directly
// into a filesystem path (hc-node-state.${clientId}.json), so it must
// never contain '"'"'/'"'"', '"'"'..'"'"', null bytes, or anything path-traversal-shaped.
// Rejects anything else and falls back to null rather than throwing, since
// resolveHcClientId is called from GET routes too and should not 500 on a
// malformed query param.
function sanitizeClientId(id) {
  const s = String(id || '"'"''"'"').trim();
  return /^[a-zA-Z0-9_-]{1,64}$/.test(s) ? s : null;
}

function resolveHcClientId(req) {
  const session = req.tsmSession || {};
  if (session.role === '"'"'client'"'"') return session.clientId || '"'"'default'"'"';
  const requested = (req.query && req.query.clientId) || (req.body && req.body.clientId);
  return sanitizeClientId(requested) || '"'"'default'"'"';
}'

  if ! grep -qF "$OLD_FN" "$SHARED_FILE"; then
    echo "ERROR: could not find the exact resolveHcClientId() block to replace." >&2
    echo "The file may already differ from what this script expects." >&2
    echo "Open $SHARED_FILE and apply the patch by hand (see chat for the diff)." >&2
    exit 1
  fi

  python3 - "$SHARED_FILE" <<'PYEOF'
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_fn = """function resolveHcClientId(req) {
  const session = req.tsmSession || {};
  if (session.role === 'client') return session.clientId || 'default';
  const requested = (req.query && req.query.clientId) || (req.body && req.body.clientId);
  return (requested && String(requested).trim()) || 'default';
}"""

new_fn = """// Only [a-zA-Z0-9_-], 1-64 chars -- this string is interpolated directly
// into a filesystem path (hc-node-state.${clientId}.json), so it must
// never contain '/', '..', null bytes, or anything path-traversal-shaped.
// Rejects anything else and falls back to null rather than throwing, since
// resolveHcClientId is called from GET routes too and should not 500 on a
// malformed query param.
function sanitizeClientId(id) {
  const s = String(id || '').trim();
  return /^[a-zA-Z0-9_-]{1,64}$/.test(s) ? s : null;
}

function resolveHcClientId(req) {
  const session = req.tsmSession || {};
  if (session.role === 'client') return session.clientId || 'default';
  const requested = (req.query && req.query.clientId) || (req.body && req.body.clientId);
  return sanitizeClientId(requested) || 'default';
}"""

if old_fn not in content:
    print("ERROR: exact resolveHcClientId block not found (python check).", file=sys.stderr)
    sys.exit(1)

content = content.replace(old_fn, new_fn, 1)

# Add sanitizeClientId to module.exports, right after resolveHcClientId,
if "sanitizeClientId,\n" not in content:
    content = content.replace(
        "  resolveHcClientId,\n",
        "  resolveHcClientId,\n  sanitizeClientId,\n",
        1,
    )

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched successfully.")
PYEOF

  echo "==> Verifying $SHARED_FILE is still valid JS"
  if command -v node >/dev/null 2>&1; then
    node -c "$SHARED_FILE"
    echo "    OK: syntax check passed"
  else
    echo "    WARNING: node not found on PATH, skipping syntax check" >&2
  fi

  git add "$SHARED_FILE"
  git commit -m "Sanitize clientId in resolveHcClientId to prevent path traversal"
fi

# ---------------------------------------------------------------------------
# 2. Remove the stray empty 'default' file
# ---------------------------------------------------------------------------
if [ -f "default" ]; then
  echo "==> Removing stray 'default' file"
  git rm --quiet default
  git commit -m "Remove stray empty 'default' file"
else
  echo "==> No 'default' file present at repo root, skipping"
fi

# ---------------------------------------------------------------------------
# 3. Push
# ---------------------------------------------------------------------------
echo "==> Pushing to origin"
git push

echo "==> Done."
echo ""
echo "Sanity check once deployed:"
echo '  curl -s "https://tsm-consultz.fly.dev/api/hc/nodes?clientId=../../../etc/passwd" \'
echo '    -H "Cookie: tsm_session=<a real admin session cookie>"'
echo "Expect it to behave exactly as if clientId were omitted (reads the 'default' bucket)."
