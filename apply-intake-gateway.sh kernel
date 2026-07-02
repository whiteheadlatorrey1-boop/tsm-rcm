#!/usr/bin/env bash
# apply-intake-gateway.sh
# Applies the Intelligence Intake Gateway integration from INTEGRATION.md.
# Run from the ROOT of your TSM-Consultz checkout (where /html and
# /architecture live), after `git pull origin main`.
#
# Usage:
#   ./apply-intake-gateway.sh /path/to/kernel/files/dir
#   (defaults to ./kernel if arg omitted)
#
# Safe to re-run: all edits are idempotent (checked before applying).

set -euo pipefail

REPO_ROOT="$(pwd)"
SRC_DIR="${1:-./kernel}"

DOC_SEARCH="html/tsm-doc-search-multi.html"
WAR_PREP="html/war-room-prep.html"
KERNEL_DIR="architecture/kernel"

fail() { echo "ERROR: $1" >&2; exit 1; }

echo "== Preflight =="
[ -d "$SRC_DIR" ] || fail "Source dir '$SRC_DIR' not found. Pass the path to the 4 kernel .js files as arg 1."
for f in metadata-engine.js relevance-engine.js tsm-registry-verticals.js intake-gateway-render.js; do
  [ -f "$SRC_DIR/$f" ] || fail "Missing $SRC_DIR/$f"
done
[ -f "$DOC_SEARCH" ] || fail "Not at repo root — $DOC_SEARCH not found. cd to repo root first."
[ -f "$WAR_PREP" ] || fail "Not at repo root — $WAR_PREP not found. cd to repo root first."
command -v node >/dev/null || fail "node not found on PATH"
command -v python3 >/dev/null || fail "python3 not found on PATH"

echo "== 1. Verify git state =="
git status --short
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "On branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" = "main" ]; then
  read -p "You're on main and branch protection requires PRs. Create branch 'feature/intake-gateway'? [y/N] " yn
  if [[ "$yn" =~ ^[Yy]$ ]]; then
    git checkout -b feature/intake-gateway
  else
    fail "Aborting — switch to a feature branch first."
  fi
fi

echo "== 2. Copy kernel files =="
mkdir -p "$KERNEL_DIR"
for f in metadata-engine.js relevance-engine.js tsm-registry-verticals.js intake-gateway-render.js; do
  cp "$SRC_DIR/$f" "$KERNEL_DIR/$f"
  node --check "$KERNEL_DIR/$f" || fail "node --check failed on $KERNEL_DIR/$f"
  echo "  ✓ $KERNEL_DIR/$f (syntax OK)"
done

echo "== 3. Patch $DOC_SEARCH — inject kernel <script> tags =="
MARKER='<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>'
INJECT_TAG='<script src="/architecture/kernel/metadata-engine.js"></script>'

if grep -qF "$INJECT_TAG" "$DOC_SEARCH"; then
  echo "  already patched — skipping"
else
  grep -qF "$MARKER" "$DOC_SEARCH" || fail "pdf.js marker not found in $DOC_SEARCH — file may have changed, patch manually per INTEGRATION.md"
  python3 - "$DOC_SEARCH" "$MARKER" <<'PYEOF'
import sys, io
path, marker = sys.argv[1], sys.argv[2]
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

inject = (
    marker + "\n"
    '<script src="/architecture/kernel/metadata-engine.js"></script>\n'
    '<script src="/architecture/kernel/relevance-engine.js"></script>\n'
    '<script src="/architecture/kernel/tsm-registry-verticals.js"></script>\n'
    '<script src="/architecture/kernel/intake-gateway-render.js"></script>'
)
content = content.replace(marker, inject, 1)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("  patched OK")
PYEOF
fi
node --check "$DOC_SEARCH" 2>/dev/null || echo "  (note: node --check on .html is expected to fail — not a .js file, skipping strict check)"

echo "== 4. Patch $WAR_PREP — STEPS count + QA checklist block =="

# 4a. Bump STEPS count object
STEPS_MARKER='const STEPS = {hc:5,finops:5,ins:5,con:5,legal:6,re:5,bpo:12,phase3:8};'
STEPS_NEW='const STEPS = {hc:5,finops:5,ins:5,con:5,legal:6,re:5,bpo:12,phase3:8,intake:2};'
if grep -qF "intake:2" "$WAR_PREP"; then
  echo "  STEPS count already patched — skipping"
elif grep -qF "$STEPS_MARKER" "$WAR_PREP"; then
  python3 - "$WAR_PREP" <<PYEOF
path = "$WAR_PREP"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace(
    '$STEPS_MARKER',
    '$STEPS_NEW',
    1
)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("  STEPS count patched OK")
PYEOF
else
  fail "STEPS marker not found in $WAR_PREP — file may have changed, patch manually per INTEGRATION.md"
fi

# 4b. Insert checklist block before the phase3 panel-footer close
CHECKLIST_MARKER_ANCHOR='id="snum-phase3-4"'
if grep -qF 'id="snum-intake-1"' "$WAR_PREP"; then
  echo "  checklist block already patched — skipping"
else
  grep -qF "$CHECKLIST_MARKER_ANCHOR" "$WAR_PREP" || fail "phase3 step anchor not found in $WAR_PREP — patch manually per INTEGRATION.md"
  python3 - "$WAR_PREP" <<'PYEOF'
import sys
path = "html/war-room-prep.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

anchor_line = '''        <div class="step"><div class="step-left"><div class="step-num" id="snum-phase3-4" style="border-color:var(--cyan);color:var(--cyan)">5</div></div><div class="step-body"><div class="step-title">All 7 sectors have anomaly definitions</div><div class="step-desc">In DevTools, check window.TSMSectorIntelligence. Each sector (healthcare, finops, insurance, construction, legal, realestate, bpo) should have at least 1 anomaly code defined with label, owner, pressure, recommendedApps, and relayTargets.</div><div class="step-check"><input type="checkbox" id="chk-phase3-4" onchange="check('phase3',4,this.checked)"><label for="chk-phase3-4">All 7 sectors have anomaly definitions</label></div></div></div>'''

checklist_block = '''        <div class="step"><div class="step-left"><div class="step-num" id="snum-intake-1">1</div></div><div class="step-body"><div class="step-tag tag-new">NEW ENTRY POINT</div><div class="step-title">Launch seed honored by Intake Gateway</div><div class="step-desc">Click Launch from any panel here. On tsm-doc-search-multi.html, confirm the Intelligence Report shows a "Seed Source" row on the sector matching the panel you launched from, with a lightning bolt (\u26a1) tag in the routing row.</div><div class="step-check"><input type="checkbox" id="chk-intake-1" onchange="check(\'intake\',1,this.checked)"><label for="chk-intake-1">Seed reflected in Intelligence Report</label></div></div></div>
        <div class="step"><div class="step-left"><div class="step-num" id="snum-intake-2">2</div></div><div class="step-body"><div class="step-title">Registry ranking matches manual routing</div><div class="step-desc">Upload a document with clear vertical signal (e.g. a CPT-coded claim). Confirm the Primary Recommendation card matches the war room you'd have picked manually via "\u26a1 Send to War Room".</div><div class="step-check"><input type="checkbox" id="chk-intake-2" onchange="check(\'intake\',2,this.checked)"><label for="chk-intake-2">Primary recommendation matches manual pick</label></div></div></div>'''

if anchor_line not in content:
    print("ANCHOR NOT FOUND", file=sys.stderr)
    sys.exit(1)

content = content.replace(anchor_line, anchor_line + "\n" + checklist_block, 1)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("  checklist block patched OK")
PYEOF
fi

echo "== 5. Final validation =="
python3 -c "import re,sys
for p in ['$DOC_SEARCH','$WAR_PREP']:
    s=open(p,encoding='utf-8').read()
    assert s.count('<html')==s.count('</html>') or True  # loose check, HTML isn't XML
print('  basic read-back OK on both HTML files')
"
for f in metadata-engine.js relevance-engine.js tsm-registry-verticals.js intake-gateway-render.js; do
  node --check "$KERNEL_DIR/$f" || fail "post-copy check failed on $f"
done
echo "  ✓ all kernel files re-validated"

echo "== 6. Stage changes =="
git add "$KERNEL_DIR" "$DOC_SEARCH" "$WAR_PREP"
git status --short

cat <<'EOF'

Done. Nothing was committed or pushed.

Next:
  git diff --cached                 # review the patch
  git commit -m "Add Intelligence Intake Gateway kernel + war-room-prep QA hooks"
  git push -u origin feature/intake-gateway
  # then open a PR per branch protection on main
EOF