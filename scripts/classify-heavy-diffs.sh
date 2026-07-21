#!/bin/bash
set -e
echo "=========================================="
echo "Classify heavy diffs: real feature work vs reformatting"
echo "=========================================="

check_pair() {
  OLD=$1
  NEW=$2
  echo ""
  echo "## $NEW"
  echo "Old lines: $(wc -l < "$OLD")  New lines: $(wc -l < "$NEW")"
  echo "Old size: $(wc -c < "$OLD") bytes  New size: $(wc -c < "$NEW") bytes"
  echo "Arrow/const functions added:"
  diff <(grep -oE "(const|let) [a-zA-Z_]+ ?=.*(=>|function)" "$OLD" | sort -u) \
       <(grep -oE "(const|let) [a-zA-Z_]+ ?=.*(=>|function)" "$NEW" | sort -u) | grep "^>" | wc -l
  echo "New <script src=...> tags:"
  diff <(grep -oE '<script src="[^"]*"' "$OLD" | sort -u) \
       <(grep -oE '<script src="[^"]*"' "$NEW" | sort -u) | grep "^>"
  echo "Whitespace-insensitive diff line count (real content changes only):"
  diff -bw "$OLD" "$NEW" | grep -c '^[<>]' || echo 0
}

check_pair html/legal-pro/legal-war-room.html html/war-rooms/legal/legal-war-room.html
check_pair html/tsm-insurance/insurance-war-room.html html/war-rooms/insurance/insurance-war-room.html
check_pair html/reo-pro/re-war-room.html html/war-rooms/real-estate/real-estate-war-room.html
check_pair html/schools-command/schools-command.html html/war-rooms/schools/schools-war-room.html

echo ""
echo "=========================================="
