#!/usr/bin/env bash
set -e

FILE="html/tsm-doc-search-multi.html"

cp "$FILE" "$FILE.bak.$(date +%s)"

python3 <<'PY'
from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")
s=p.read_text()

old="""
// E2E FIX: force healthcare context before seeding
window.currentVertical='hc';

"""

new="""
// E2E FIX: force internal vertical state before seeding
currentVertical='hc';
if (typeof switchVertical === 'function') {
  switchVertical('hc');
}

"""

if old in s:
    s=s.replace(old,new)

elif "currentVertical='hc';" not in s:
    s=s.replace(
        "function seedDemoData() {",
        """
function seedDemoData() {

  // E2E FIX: force healthcare context before seed
  currentVertical='hc';
  if (typeof switchVertical === 'function') {
    switchVertical('hc');
  }

"""
    )

p.write_text(s)

PY

echo "Fixed healthcare seed context"

xvfb-run -a npx playwright test \
tests/e2e/healthcare-denial-10-phase-demo.spec.js \
--headed

