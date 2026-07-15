#!/bin/bash

echo "=============================================="
echo " TSM SECTOR REGISTRY CERTIFICATION"
echo "=============================================="

test -f html/shared/intake/sector-registry.js
echo "Registry ............. PASS"

test -f html/shared/intake/sectors/mortgage-sector.js
echo "Mortgage Module ...... PASS"

grep -q "sector-registry.js" html/tsm-doc-search-multi.html
echo "Intake Loader ........ PASS"

grep -q "mortgage-war-room" html/shared/intake/sectors/mortgage-sector.js
echo "Routing .............. PASS"

echo
echo "=============================================="
echo " SECTOR REGISTRY READY"
echo "=============================================="
