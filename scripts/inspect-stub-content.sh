#!/bin/bash
set -e
echo "=========================================="
echo "Full content of the stub file"
echo "=========================================="
echo ""
echo "--- html/war-rooms/legal/legal-war-room.html (full, 35 lines) ---"
cat html/war-rooms/legal/legal-war-room.html
echo ""
echo "--- Does enterprise-runtime.js dynamically inject the real UI, or is this just broken? ---"
find html/shared/runtime/enterprise -iname "*runtime*"
echo ""
echo "--- Same check: are the 3 IDENTICAL ones (construction/finops/healthcare) actually full pages, not stubs? ---"
wc -l html/war-rooms/construction/construction-war-room.html html/war-rooms/finops/finops-war-room.html html/war-rooms/healthcare/healthcare-war-room.html
echo "=========================================="
