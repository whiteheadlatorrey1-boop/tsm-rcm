#!/bin/bash
set -e
echo "=========================================="
echo "Final production readiness pass"
echo "=========================================="

echo "--- Groq key: current shell env vs curl ---"
echo "GROQ_API_KEY set: $([ -n "$GROQ_API_KEY" ] && echo yes || echo NO)"
curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY" -o /dev/null -w "status: %{http_code}\n"

echo ""
echo "--- Fly deploy trigger: which branch? ---"
cat .github/workflows/fly-deploy.yml | grep -A5 "^on:"

echo ""
echo "--- Full finops-main-strategist.html diff (the one real Category 2 change) ---"
git diff html/finops-main-strategist.html

echo ""
echo "--- Full tsm-platform.spec.js diff ---"
git diff tests/e2e/tsm-platform.spec.js

echo ""
echo "--- The 4 tiny 1-2 line healthcare diffs, all at once ---"
git diff html/healthcare/demo-executive-portal.html html/healthcare/hc-denial-war-room.html html/healthcare/hc-financial/index.html html/healthcare/hc-main-strategist.html

echo "=========================================="
