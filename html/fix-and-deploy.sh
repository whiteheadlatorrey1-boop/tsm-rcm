#!/bin/bash
# TSM One-Shot Fix + Deploy
# Run from: /workspaces/tsm-shell
set -e

echo ""
echo "══════════════════════════════════════════════"
echo "  TSM ONE-SHOT FIX + DEPLOY"
echo "══════════════════════════════════════════════"

# ─── 1. Fix Dockerfile ────────────────────────────────────────────────────────
echo ""
echo "▶ [1/4] Patching Dockerfile..."

# Create clean index.html so the COPY fallback is never needed
cat > ./index.html << 'EOF'
<html><body style="background:#090E19;color:#F47C20;font-family:sans-serif;padding:40px">
<h2>TSM · tsmatter.com</h2>
</body></html>
EOF

# Replace the broken 3-line fallback block with a clean 2-liner
python3 - << 'PYEOF'
import re

with open('./Dockerfile', 'r') as f:
    content = f.read()

# Replace the broken echo fallback block (lines 97-99 style)
broken = r"COPY index\.html /usr/share/nginx/html/default/index\.html 2>/dev/null \|\| \\\s*\n\s*echo '[^']+' \\\s*\n\s*> /usr/share/nginx/html/default/index\.html"
fixed  = "COPY index.html /usr/share/nginx/html/default/index.html"

new_content = re.sub(broken, fixed, content)

if new_content != content:
    with open('./Dockerfile', 'w') as f:
        f.write(new_content)
    print("  ✓ Dockerfile patched")
else:
    print("  ○ Dockerfile already clean (or pattern not matched — check manually)")

PYEOF

# ─── 2. JS fixes on all HTML files ───────────────────────────────────────────
echo ""
echo "▶ [2/4] Running JS bug fixer on all HTML files..."

node fix-tsm-apps.js \
  ./auditops-pro.html \
  ./dme.html \
  ./.fly-build/az-ins/index.html \
  ./az-life.html \
  ./pc-command.tsmatter.html \
  ./az-ins.tsmatter.html \
  ./financial-command.tsmatter.html \
  ./hc-billing.tsmatter.html \
  ./hc-compliance.tsmatter.html \
  ./hc-grants.tsmatter.html \
  ./hc-legal.tsmatter.html \
  ./hc-medical.tsmatter.html \
  ./hc-pharmacy.tsmatter.html \
  ./hc-strategist.tsmatter.html \
  ./hc-taxprep.tsmatter.html \
  ./hc-vendors.tsmatter.html \
  ./hc-financial.tsmatter.html \
  ./hc-insurance.tsmatter.html \
  ./hc-command.tsmatter.html \
  ./construction-command.tsmatter.html \
  ./bpo-legal.tsmatter.html \
  ./bpo-realty.tsmatter.html \
  ./bpo-tax.tsmatter.html \
  ./sample-credit-union.tsmatter.html \
  ./reo-pro.tsmatter.html \
  ./rrd-command.tsmatter.html \
  ./strategist.tsmatter.html \
  ./strategist-index.html \
  ./construction.html \
  ./reo-command.html \
  ./sample-fulfillment-portal.html \
  ./sample-fulfillment.tsmatter.html \
  ./financial.html \
  ./zero-trust.html \
  2>/dev/null || true

# ─── 3. Verify Dockerfile is clean ───────────────────────────────────────────
echo ""
echo "▶ [3/4] Verifying Dockerfile..."

if grep -qP "echo '.*<html" ./Dockerfile 2>/dev/null; then
  echo "  ✗ WARNING: Dockerfile still contains inline HTML echo — check manually"
  echo "    Run: grep -n \"echo\" ./Dockerfile"
  exit 1
else
  echo "  ✓ Dockerfile looks clean"
fi

# Confirm index.html exists
if [ -f "./index.html" ]; then
  echo "  ✓ index.html exists"
else
  echo "  ✗ index.html missing — something went wrong"
  exit 1
fi

# ─── 4. Deploy ────────────────────────────────────────────────────────────────
echo ""
echo "▶ [4/4] Deploying to Fly..."
echo ""

fly deploy

echo ""
echo "══════════════════════════════════════════════"
echo "  ✓ ALL DONE"
echo "══════════════════════════════════════════════"
echo ""
echo "Hard refresh each app (Cmd+Shift+R) to bust cache."
echo ""
