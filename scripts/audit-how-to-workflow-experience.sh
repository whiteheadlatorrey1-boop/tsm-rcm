#!/usr/bin/env bash
set -euo pipefail

ROOT="/workspaces/tsm-rcm"
cd "$ROOT"

OUT="reports/how-to-workflow-audit-$(date +%Y%m%d-%H%M%S).txt"
mkdir -p reports

{
  echo "============================================================"
  echo " TSM HOW-TO / WORKFLOW EXPERIENCE AUDIT"
  echo "============================================================"
  echo "Timestamp: $(date)"
  echo "Root: $ROOT"
  echo

  echo "============================================================"
  echo "1. HOW-TO FILES / SECTIONS"
  echo "============================================================"

  find html server scripts tests -type f \
    \( -name '*.html' -o -name '*.js' -o -name '*.json' -o -name '*.md' \) \
    -not -path '*/node_modules/*' \
    -not -path '*/screenshots/*' \
    -print0 2>/dev/null |
  xargs -0 grep -liE \
    'how[[:space:]-]*to|how-to|getting started|user guide|workflow guide|walkthrough|guide' \
    2>/dev/null |
  sort -u

  echo
  echo "============================================================"
  echo "2. HOW-TO HEADINGS"
  echo "============================================================"

  grep -RniE \
    '<h[1-6][^>]*>.*(how|guide|workflow|get started|report)' \
    html \
    --include='*.html' \
    --exclude-dir=node_modules \
    2>/dev/null |
    head -300 || true

  echo
  echo "============================================================"
  echo "3. NAVIGATION / WORKFLOW CONTROLS"
  echo "============================================================"

  grep -RniE \
    'how-to|howto|workflow|walkthrough|next step|start here|run analysis|generate report|export|download|view report|command center|war room|strategist|executive' \
    html \
    --include='*.html' \
    --include='*.js' \
    --exclude-dir=node_modules \
    2>/dev/null |
    head -500 || true

  echo
  echo "============================================================"
  echo "4. REPORT GENERATION SURFACES"
  echo "============================================================"

  grep -RniE \
    'generate.*report|report.*generate|export.*report|download.*report|pdf|csv|xlsx|executive summary|decision brief|findings report|compliance report|risk report|audit report|management report' \
    html server \
    --include='*.html' \
    --include='*.js' \
    --exclude-dir=node_modules \
    2>/dev/null |
    head -500 || true

  echo
  echo "============================================================"
  echo "5. MAJOR TSM WORKFLOW SURFACES"
  echo "============================================================"

  find html -type f \
    \( -name '*.html' -o -name '*.js' \) \
    -not -path '*/node_modules/*' \
    -print |
    grep -Ei \
      'command|war-room|strategist|executive|portal|copilot|dashboard|report|mission|case' |
    sort -u |
    head -400

  echo
  echo "============================================================"
  echo "6. KNOWN VERTICALS"
  echo "============================================================"

  grep -RniE \
    "verticals|VERTICALS|schools|healthcare|construction|mortgage|real.?estate|insurance|legal|finops|bpo|concierge" \
    html/js server \
    --include='*.js' \
    --include='*.html' \
    --exclude-dir=node_modules \
    2>/dev/null |
    head -400 || true

  echo
  echo "============================================================"
  echo "7. VALUE / PAIN-POINT LANGUAGE"
  echo "============================================================"

  grep -RniE \
    'pain point|business pain|save time|reduce cost|reduce risk|revenue|exposure|compliance|exception|bottleneck|manual|automation|ROI|decision|recommendation|action plan|root cause|SLA|deadline|recovery' \
    html \
    --include='*.html' \
    --exclude-dir=node_modules \
    2>/dev/null |
    head -500 || true

  echo
  echo "============================================================"
  echo "8. EXISTING DEMO / E2E FLOWS"
  echo "============================================================"

  find tests scripts/demo -type f \
    \( -name '*.js' -o -name '*.json' -o -name '*.conf' \) \
    -not -path '*/node_modules/*' \
    -print |
    sort |
    head -400

  echo
  echo "============================================================"
  echo "9. REPORT / EXPORT API SURFACES"
  echo "============================================================"

  grep -RniE \
    '/api/.*(report|export|document|proposal|brief)|report.*endpoint|export.*endpoint|generate.*pdf|generate.*report' \
    server html \
    --include='*.js' \
    --include='*.html' \
    --exclude-dir=node_modules \
    2>/dev/null |
    head -500 || true

  echo
  echo "============================================================"
  echo "10. POTENTIAL HOW-TO GAPS"
  echo "============================================================"

  echo "Pages containing workflow controls but no obvious How-To reference:"
  for f in $(find html -type f -name '*.html' -not -path '*/node_modules/*' | sort); do
    if grep -qiE \
      'war room|command center|strategist|executive portal|copilot|generate.*report|export' \
      "$f" 2>/dev/null; then

      if ! grep -qiE \
        'how-to|how to|getting started|walkthrough|user guide' \
        "$f" 2>/dev/null; then
        echo "$f"
      fi
    fi
  done | head -250

  echo
  echo "============================================================"
  echo "11. FILE COUNTS"
  echo "============================================================"

  printf "HTML files: "
  find html -type f -name '*.html' | wc -l

  printf "JS files:   "
  find html server -type f -name '*.js' | wc -l

  printf "Test files: "
  find tests -type f 2>/dev/null | wc -l

  echo
  echo "============================================================"
  echo " AUDIT COMPLETE"
  echo "============================================================"
  echo "Report: $OUT"

} | tee "$OUT"

echo
echo "Audit saved to:"
echo "$OUT"
