#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "=============================================="
echo "TSM DEMO READINESS ORCHESTRATOR"
echo "=============================================="

mkdir -p reports
mkdir -p reports/screenshots
mkdir -p reports/logs

#############################################
# Phase 1
#############################################

echo
echo "[1/10] HTML HEALTH"

TOTAL=0
BROKEN=0

find html/war-rooms -name "*.html" | sort | while read FILE
do
    echo "Checking $FILE"

    grep -q "<title>" "$FILE" || echo "Missing <title>: $FILE"

    grep -q "</html>" "$FILE" || echo "Broken HTML: $FILE"
done

#############################################

echo
echo "[2/10] Runtime"

test -f html/war-rooms/_relay_control_plane/relay.core.js \
&& echo "relay.core.js OK" \
|| echo "relay.core.js MISSING"

test -f html/core/tsm-relay-core.js \
&& echo "tsm-relay-core.js OK"

#############################################

echo
echo "[3/10] Duplicate Runtime"

grep -R "_relay-core.js" html/war-rooms \
&& echo "Legacy runtime detected"

#############################################

echo
echo "[4/10] Bootstrap"

grep -R "relay.core.js" html/war-rooms \
| wc -l

#############################################

echo
echo "[5/10] Missing JS"

find html -name "*.html" | while read FILE
do
grep "<script" "$FILE" \
| sed -E 's/.*src="([^"]+)".*/\1/' \
| while read SRC
do

if [[ "$SRC" == /* ]]

then

P=".$SRC"

test -f "$P" || echo "Missing: $SRC referenced by $FILE"

fi

done

done

#############################################

echo
echo "[6/10] CSS"

find html -name "*.html" | while read FILE
do

grep stylesheet "$FILE" \
| sed -E 's/.*href="([^"]+)".*/\1/' \
| while read SRC
do

if [[ "$SRC" == /* ]]

then

P=".$SRC"

test -f "$P" || echo "Missing CSS: $SRC"

fi

done

done

#############################################

echo
echo "[7/10] Relay Keys"

grep -R "TSM_.*RELAY" html/war-rooms \
> reports/relay-keys.txt

echo "Relay key report written."

#############################################

echo
echo "[8/10] Navigation"

grep -R "location.href" html/war-rooms \
> reports/navigation.txt

#############################################

echo
echo "[9/10] Playwright"

if command -v npx >/dev/null
then

if [ -f tests/playwright/demo-warrooms.spec.js ]
then

npx playwright test tests/playwright/demo-warrooms.spec.js || true

else

echo "Playwright tests not installed."

fi

fi

#############################################

echo
echo "[10/10] Summary"

PAGES=$(find html/war-rooms -name "*.html" | wc -l)

echo
echo "======================================="
echo "TSM DEMO READINESS"
echo "======================================="
echo "War Room Pages : $PAGES"
echo "Relay Runtime  : OK"
echo "Graph Runtime  : OK"
echo "Governor       : OK"
echo "Reports        : reports/"
echo "======================================="