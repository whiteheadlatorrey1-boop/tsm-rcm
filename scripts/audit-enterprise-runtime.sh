#!/bin/bash

ROOT="${1:-.}"

echo ""
echo "==============================================="
echo "TSM ENTERPRISE RUNTIME DISCOVERY"
echo "==============================================="
echo ""

echo "Searching for enterprise runtime files..."
echo ""

find "$ROOT" \
-type f \
\( \
-name "*runtime*" \
-o -name "*mission*" \
-o -name "*phase*" \
-o -name "*sap*" \
-o -name "*causality*" \
-o -name "*relay*" \
-o -name "*executive*" \
-o -name "*sentinel*" \
-o -name "*posture*" \
-o -name "*workflow*" \
-o -name "*registry*" \
-o -name "*digital*" \
-o -name "*event*" \
\) \
| sort

echo ""
echo "Done."