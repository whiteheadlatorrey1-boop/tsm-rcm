#!/bin/bash
# ================================================
# TSM PUSH — saves your session to GitHub
# Railway auto-deploys on every push
# ================================================
# Usage:
#   bash tsm-push.sh                      → auto message
#   bash tsm-push.sh "what I changed"     → custom message
# ================================================

MSG=${1:-"chore: session save $(date '+%Y-%m-%d %H:%M')"}

echo ""
echo "⚜  TSM · Neural Core — Push to GitHub"
echo "──────────────────────────────────────"

# Check for changes
if git diff --quiet && git diff --staged --quiet; then
  echo "✅ Nothing to commit — repo is clean."
  echo ""
  exit 0
fi

# Show what's changing
echo "📦 Files changed:"
git diff --name-only
git diff --staged --name-only
echo ""

# Stage, commit, push
git add .
git commit -m "$MSG"
git push origin main

echo ""
echo "✅ Pushed: $MSG"
echo "🚀 Railway is deploying now..."
echo "   https://tsm-shell-production-57da.up.railway.app"
echo ""