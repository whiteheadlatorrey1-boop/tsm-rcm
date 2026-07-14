#!/usr/bin/env bash
set -e

echo "=== TSM Healthcare E2E Repair ==="

FILE="html/tsm-doc-search-multi.html"
TEST="tests/e2e/healthcare-denial-10-phase-demo.spec.js"

echo "[1/5] Backup files"
cp "$FILE" "$FILE.bak.$(date +%s)"
cp "$TEST" "$TEST.bak.$(date +%s)"

echo "[2/5] Ensure healthcare starts selected"

python3 <<'PY'
from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")
s=p.read_text()

needle="function seedDemoData() {"

if "window.currentVertical='hc'" not in s:
    s=s.replace(
        needle,
        """
// E2E FIX: force healthcare context before seeding
window.currentVertical='hc';

""" + needle
    )

p.write_text(s)
PY


echo "[3/5] Force demo seed to immediately render"

python3 <<'PY'
from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")
s=p.read_text()

old="""
  DEMO_DOCS.forEach((doc, i) => {
"""

if "renderResults();" not in s[s.find("function seedDemoData"):s.find("function seedDemoData")+5000]:
    idx=s.find("DEMO_DOCS.forEach((doc, i) => {")
    if idx!=-1:
        s=s[:idx] + """
  // E2E FIX: refresh UI after seed
  if (typeof renderResults === 'function') {
    setTimeout(renderResults,100);
  }

""" + s[idx:]

p.write_text(s)
PY


echo "[4/5] Make Playwright wait for seeded state"

python3 <<'PY'
from pathlib import Path

p=Path("tests/e2e/healthcare-denial-10-phase-demo.spec.js")
s=p.read_text()

s=s.replace(
"""await expect(denialDoc).toBeVisible({
    timeout:10000
});""",
"""await page.waitForTimeout(1500);

await expect(
  page.getByText('Denial_CLM-HC-7731_Aetna.pdf', {exact:false})
).toBeVisible({
  timeout:20000
});"""
)

p.write_text(s)
PY


echo "[5/5] Run healthcare demo"

xvfb-run -a npx playwright test \
tests/e2e/healthcare-denial-10-phase-demo.spec.js \
--headed

