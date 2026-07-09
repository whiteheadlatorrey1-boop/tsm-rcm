#!/usr/bin/env bash

set -euo pipefail

echo "======================================"
echo " TSM BPO Relay Migration Fix"
echo " Remove legacy localStorage relays"
echo "======================================"

BACKUP="backup-bpo-relay-$(date +%Y%m%d-%H%M%S)"

echo "[1/5] Creating backup..."
mkdir -p "$BACKUP"

cp html/war-rooms/bpo/bpo-strategist.html "$BACKUP/"
cp html/war-rooms/bpo/bpo-executive-portal.html "$BACKUP/"

echo "Backup created: $BACKUP"

echo "[2/5] Updating BPO strategist relay..."

python3 - <<'PY'
from pathlib import Path

p = Path("html/war-rooms/bpo/bpo-strategist.html")
s = p.read_text()

old = '''function tsmWriteScopedStrat(vertical, missionId){
  localStorage.setItem("TSM_STRAT_CONFIRMED_bpo_" + vertical, JSON.stringify({
    vertical,
    missionId,
    timestamp: Date.now()
  }));
}'''

new = '''function tsmWriteScopedStrat(vertical, missionId){
  tsmWriteRelay({
    type:"STRATEGY_CONFIRMED",
    source:"bpo-strategist",
    vertical,
    missionId,
    timestamp:Date.now()
  });
}'''

if old not in s:
    raise SystemExit("Strategist legacy block not found")

p.write_text(s.replace(old,new))
PY


echo "[3/5] Updating BPO executive portal relay..."

python3 - <<'PY'
from pathlib import Path

p = Path("html/war-rooms/bpo/bpo-executive-portal.html")
s = p.read_text()

old = '''function tsmWriteScopedExec(vertical, missionId){
  localStorage.setItem("TSM_EXEC_CONFIRMED_bpo_" + vertical, JSON.stringify({
    vertical,
    missionId,
    timestamp: Date.now()
  }));
}'''

new = '''function tsmWriteScopedExec(vertical, missionId){
  tsmWriteRelay({
    type:"EXECUTIVE_CONFIRMATION",
    source:"bpo-executive-portal",
    vertical,
    missionId,
    timestamp:Date.now()
  });
}'''

if old not in s:
    raise SystemExit("Executive legacy block not found")

p.write_text(s.replace(old,new))
PY


echo "[4/5] Verifying legacy relay removal..."

if grep -R "TSM_STRAT_CONFIRMED\|TSM_EXEC_CONFIRMED" \
html/war-rooms/bpo/bpo-strategist.html \
html/war-rooms/bpo/bpo-executive-portal.html
then
    echo "❌ Legacy relay writes still detected"
    exit 1
else
    echo "✅ Legacy relay writes removed"
fi


echo "[5/5] Staging changes..."

git add \
html/war-rooms/bpo/bpo-strategist.html \
html/war-rooms/bpo/bpo-executive-portal.html

echo ""
echo "======================================"
echo " BPO Relay Migration Complete"
echo "======================================"
echo ""
echo "Next:"
echo "git commit -m \"feat: add TSM MDM intelligence node with live data and AI governance\""
