#!/bin/bash

set -e

echo "=========================================="
echo "TSM HEALTHCARE EVENT BUS BOOTSTRAP FIX"
echo "=========================================="

FILE="html/healthcare/hc-main-strategist.html"

mkdir -p backups/platform-route-fix

cp "$FILE" \
"backups/platform-route-fix/hc-main-strategist.before-eventbus.$(date +%Y%m%d_%H%M%S).html"

python3 <<'PY'

from pathlib import Path

file = Path("html/healthcare/hc-main-strategist.html")

data = file.read_text()

bus = '<script src="/js/core/tsm-event-bus.js"></script>'

kernel = '<script src="/html/core/tsm-kernel.js"></script>'


# remove duplicates
data = data.replace(bus, "")
data = data.replace(kernel, "")


anchor = "<script src=\"/html/healthcare/js/relay.engine.js\"></script>"

if anchor in data:
    data = data.replace(
        anchor,
        bus + "\n" + kernel + "\n" + anchor
    )
else:
    raise Exception("relay anchor missing")


file.write_text(data)

print("PASS: EventBus moved before healthcare modules")

PY


echo
echo "Verifying..."

grep -n "<script" "$FILE" | tail -20


echo
echo "Running Healthcare E2E..."

npx playwright test tests/e2e/tsm-platform.spec.js --grep "Healthcare"


echo
echo "=========================================="
echo "EVENT BUS FIX COMPLETE"
echo "=========================================="
