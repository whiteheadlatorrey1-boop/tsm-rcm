#!/bin/bash

ROOT="${1:-html/war-rooms}"

echo ""
echo "WAR ROOM INVENTORY"
echo "=================="
echo ""

find "$ROOT" \
-type f \
\( \
-name "*.html" \
-o -name "*.js" \
\) | sort