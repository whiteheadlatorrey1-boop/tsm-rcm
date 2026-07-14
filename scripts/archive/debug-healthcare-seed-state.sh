#!/usr/bin/env bash
set -e

echo "=== Healthcare Seed State Debug ==="

grep -n "function seedDemoData" html/tsm-doc-search-multi.html

echo
echo "=== currentVertical references ==="

grep -n "currentVertical" html/tsm-doc-search-multi.html | head -30

echo
echo "=== Healthcare storage keys ==="

grep -n "storageKey" html/tsm-doc-search-multi.html | grep -A3 -B3 hc

echo
echo "=== Render path ==="

sed -n '1480,1635p' html/tsm-doc-search-multi.html

