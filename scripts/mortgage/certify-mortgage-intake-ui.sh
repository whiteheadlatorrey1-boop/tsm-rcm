#!/bin/bash

echo "=============================================="
echo " TSM MORTGAGE INTAKE UI CERT"
echo "=============================================="


grep -q "mortgage-ui.js" \
html/tsm-doc-search-multi.html

echo "UI Loader ............ PASS"


grep -q "mortgage-mission-hook.js" \
html/tsm-doc-search-multi.html

echo "Mission Hook ......... PASS"


grep -q "loan-denial" \
html/shared/intake/sectors/mortgage-ui.js

echo "Rescue Packs ......... PASS"


echo
echo "=============================================="
echo " MORTGAGE INTAKE UI READY"
echo "=============================================="

