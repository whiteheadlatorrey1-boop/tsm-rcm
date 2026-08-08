#!/usr/bin/env bash
# Run from repo root, on feat/mission-preview-phase4, clean working tree.
set -e

echo "== 1. start the merge =="
git fetch origin main
git merge origin/main --no-commit --no-ff || true
# ^ expected to stop with conflicts — that's normal, continue below

echo "== 2. take main's side (23 files — main is a strict superset) =="
git checkout --theirs \
  "finops-suite/finops-launcher.html" \
  "html/bpo-files/bpo-internal1.html" \
  "html/finops-suite/compliance.html" \
  "html/finops-suite/finops-accounting.html" \
  "html/finops-suite/finops-operations.html" \
  "html/finops-suite/finops-scenarios.html" \
  "html/finops-suite/finops-showcase-v1.html" \
  "html/finops-suite/finops-war/finops-main-strategist.html" \
  "html/finops-suite/index-elevated.html" \
  "html/finops-suite/js/rcm-relay-client.js" \
  "html/finops-suite/suite-index.html" \
  "html/finops-suite/tax.html" \
  "html/finops-suite/tsm-rcm-os-howto.html" \
  "html/healthcare/hc-main-strategist.html" \
  "html/legal-pro/legal-tax.html" \
  "html/tsm-doc-search-multi.html" \
  "html/war-rooms/insure-war/insurance-strategist.html" \
  "html/war-rooms/re-war/re-exec-portal.html" \
  "html/war-rooms/re-war/re-strategist.html" \
  "html/war-rooms/war-room-prep.html" \
  "html/demo/tsm-demo-console.html" \
  "server.js" \
  "reports/demo-readiness.txt"
git add \
  "finops-suite/finops-launcher.html" \
  "html/bpo-files/bpo-internal1.html" \
  "html/finops-suite/compliance.html" \
  "html/finops-suite/finops-accounting.html" \
  "html/finops-suite/finops-operations.html" \
  "html/finops-suite/finops-scenarios.html" \
  "html/finops-suite/finops-showcase-v1.html" \
  "html/finops-suite/finops-war/finops-main-strategist.html" \
  "html/finops-suite/index-elevated.html" \
  "html/finops-suite/js/rcm-relay-client.js" \
  "html/finops-suite/suite-index.html" \
  "html/finops-suite/tax.html" \
  "html/finops-suite/tsm-rcm-os-howto.html" \
  "html/healthcare/hc-main-strategist.html" \
  "html/legal-pro/legal-tax.html" \
  "html/tsm-doc-search-multi.html" \
  "html/war-rooms/insure-war/insurance-strategist.html" \
  "html/war-rooms/re-war/re-exec-portal.html" \
  "html/war-rooms/re-war/re-strategist.html" \
  "html/war-rooms/war-room-prep.html" \
  "html/demo/tsm-demo-console.html" \
  "server.js" \
  "reports/demo-readiness.txt"

echo "== 3. take OUR side (1 file — branch is ahead here) =="
git checkout --ours "demo/demo-engine.js"
git add "demo/demo-engine.js"

echo "== 4. STOP — remaining unresolved conflicts need manual attention: =="
git diff --name-only --diff-filter=U
echo
echo "   package.json               -> small manual merge (see below)"
echo "   html/war-rooms/_relay_control_plane/relay.core.js -> small manual merge (see below)"
echo "   routes/rcm-requirements.js -> 1-line pick (see below)"
echo "   html/finops-suite/finance-index.html -> YOUR CALL: two different pages, pick one"
echo "   html/finops-suite/tsm-rcm-os.html    -> YOUR CALL: depends on Working Capital decision below"
echo
echo "Do NOT commit yet -- resolve the 5 files above first, then:"
echo "   git add <resolved files>"
echo "   git commit"