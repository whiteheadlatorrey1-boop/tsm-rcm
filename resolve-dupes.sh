#!/usr/bin/env bash
# resolve-dupes.sh
#
# Finds duplicate/near-duplicate .js files across the repo, then determines
# whether each copy is actually reachable from server.js by walking the real
# require() graph (not just grepping server.js's own text) — so transitive
# dependencies (e.g. server.js -> routes/finops.js -> tsm-decision-service/*)
# are correctly detected as mounted, not just direct requires.
#
# Default is DRY RUN. Nothing is deleted unless you pass --apply.
#
# Usage:
#   ./resolve-dupes.sh                # just report
#   ./resolve-dupes.sh --apply        # back up + delete confirmed-dead dupes
#   ./resolve-dupes.sh --apply --yes  # skip the confirmation prompt

set -euo pipefail

APPLY=false
SKIP_CONFIRM=false
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    --yes) SKIP_CONFIRM=true ;;
  esac
done

REPO_ROOT="$(pwd)"
BACKUP_DIR="$REPO_ROOT/.dupe-backups/$(date +%Y%m%d_%H%M%S)"
SCAN_DIRS=(routes server tsm-decision-service)
ENTRY_FILE="server.js"

if [ ! -f "$ENTRY_FILE" ]; then
  echo "Can't find $ENTRY_FILE in $(pwd) — run this from the repo root."
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

cat > "$WORKDIR/walk.js" << 'NODEEOF'
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const entryFile = path.resolve(repoRoot, process.argv[2]);
const scanDirs = process.argv.slice(3);

// ── Walk the real require() graph from server.js ───────────────────────────
function resolveRequire(fromFile, reqPath) {
  if (!reqPath.startsWith('.')) return null; // skip node_modules/bare imports
  const base = path.resolve(path.dirname(fromFile), reqPath);
  const candidates = [base, base + '.js', path.join(base, 'index.js')];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

const REQUIRE_RE = /require\(\s*(['"])(\.[^'"]+)\1\s*\)/g;

const reachable = new Set();
const queue = [entryFile];

while (queue.length) {
  const file = queue.pop();
  if (reachable.has(file)) continue;
  if (!fs.existsSync(file)) continue;
  reachable.add(file);

  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }

  let m;
  REQUIRE_RE.lastIndex = 0;
  while ((m = REQUIRE_RE.exec(content))) {
    const resolved = resolveRequire(file, m[2]);
    if (resolved && !reachable.has(resolved)) queue.push(resolved);
  }
}

// ── Hash every .js file under the scan dirs, group by content ──────────────
const crypto = require('crypto');
function hashFile(f) {
  return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
}

function walkDir(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walkDir(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
}

const allFiles = [];
for (const d of scanDirs) walkDir(path.resolve(repoRoot, d), allFiles);

const groups = {};
for (const f of allFiles) {
  const abs = path.resolve(f);
  const h = hashFile(abs);
  groups[h] = groups[h] || [];
  groups[h].push(abs);
}

// ── Emit machine-readable report ────────────────────────────────────────────
const dupeGroups = Object.values(groups).filter(g => g.length > 1);

for (const group of dupeGroups) {
  console.log('GROUP');
  for (const f of group) {
    const rel = path.relative(repoRoot, f);
    const mounted = reachable.has(f);
    console.log(`${mounted ? 'MOUNTED' : 'ORPHAN'}\t${rel}`);
  }
}
NODEEOF

REPORT="$WORKDIR/report.txt"
node "$WORKDIR/walk.js" "$ENTRY_FILE" "${SCAN_DIRS[@]}" > "$REPORT"

echo "── Scanning for duplicate .js files (${SCAN_DIRS[*]}), mount status via real require-graph from $ENTRY_FILE ──"
echo

if [ ! -s "$REPORT" ]; then
  echo "No byte-identical duplicates found under: ${SCAN_DIRS[*]}"
  exit 0
fi

# Pretty-print the report
awk '
  /^GROUP/ { if (n++) print ""; next }
  { printf "  [%s] %s\n", $1, $2 }
' "$REPORT"
echo
echo "──────────────────────────────────────────────────────────────────"
echo "MOUNTED = reachable from $ENTRY_FILE by following require() calls,"
echo "including transitively (e.g. server.js -> routes/finops.js ->"
echo "tsm-decision-service/*). ORPHAN = not reachable at all."
echo "If a group has zero or more than one MOUNTED file, it's left for"
echo "you to resolve by hand — this script won't guess."
echo

if [ "$APPLY" = false ]; then
  echo "Dry run only — no files changed. Re-run with --apply to back up"
  echo "and remove orphaned duplicates (only ones with exactly one"
  echo "MOUNTED sibling)."
  exit 0
fi

echo "── APPLY MODE ──"
mkdir -p "$BACKUP_DIR"

# Re-parse the report to drive deletion
awk '/^GROUP/{if(NR>1)print "---"; next} {print}' "$REPORT" > "$WORKDIR/groups.txt"
echo "---" >> "$WORKDIR/groups.txt"

mounted=""
orphans=()
while IFS=$'\t' read -r status relpath; do
  if [ "$status" = "---" ]; then
    if [ -n "$mounted" ] && [ "${#orphans[@]}" -gt 0 ]; then
      for orphan in "${orphans[@]}"; do
        echo "Backing up and removing orphan: $orphan"
        mkdir -p "$BACKUP_DIR/$(dirname "$orphan")"
        cp "$orphan" "$BACKUP_DIR/$orphan"
        if [ "$SKIP_CONFIRM" = false ]; then
          read -r -p "  Delete $orphan ? [y/N] " reply
          [[ "$reply" =~ ^[Yy]$ ]] || { echo "  skipped"; mounted=""; orphans=(); continue; }
        fi
        rm "$orphan"
        echo "  removed (backup at $BACKUP_DIR/$orphan)"
      done
    elif [ -n "$mounted" ] || [ "${#orphans[@]}" -gt 0 ]; then
      echo "Skipping ambiguous group (need exactly 1 MOUNTED) — resolve by hand:"
      [ -n "$mounted" ] && echo "  [MOUNTED] $mounted"
      for o in "${orphans[@]}"; do echo "  [ORPHAN]  $o"; done
    fi
    mounted=""
    orphans=()
    continue
  fi
  if [ "$status" = "MOUNTED" ]; then
    mounted="$relpath"
  elif [ "$status" = "ORPHAN" ]; then
    orphans+=("$relpath")
  fi
done < "$WORKDIR/groups.txt"

echo
echo "Done. Backups saved under $BACKUP_DIR"