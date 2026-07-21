#!/bin/bash
set -e
echo "=========================================="
echo "Demo Readiness — real state, right now"
echo "=========================================="

echo "--- Pending changes breakdown ---"
git status --porcelain | awk '{print $1}' | sort | uniq -c

echo ""
echo "--- Category 2: the 6 modified files, real diff stat (not truncated) ---"
for f in html/finops-main-strategist.html html/healthcare/demo-executive-portal.html \
         html/healthcare/hc-denial-war-room.html html/healthcare/hc-financial/index.html \
         html/healthcare/hc-main-strategist.html tests/e2e/tsm-platform.spec.js; do
  echo "## $f"
  git diff --stat "$f"
done

echo ""
echo "--- Is demo-certify.sh available? Run it if so ---"
if [ -f scripts/demo/demo-certify.sh ]; then
  chmod +x scripts/demo/demo-certify.sh
  ./scripts/demo/demo-certify.sh 2>&1 | tail -40
else
  echo "demo-certify.sh not found at scripts/demo/ — checking elsewhere"
  find . -iname "demo-certify*" -not -path "./.git/*" 2>/dev/null
fi

echo ""
echo "--- Is server currently running and Groq key still good? ---"
curl -s -o /dev/null -w "server / :8080 status: %{http_code}\n" http://localhost:8080/ || echo "server not responding"
curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY" -o /dev/null -w "Groq key status: %{http_code}\n"

echo ""
echo "--- What branch/commit does Fly.io actually deploy? ---"
cat fly-deploy.yml 2>/dev/null || find . -iname "fly-deploy*" -not -path "./.git/*" 2>/dev/null
cat fly.toml 2>/dev/null | head -20

echo "=========================================="
