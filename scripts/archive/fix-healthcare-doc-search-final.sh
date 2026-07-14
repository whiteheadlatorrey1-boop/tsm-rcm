#!/usr/bin/env bash
set -u

FILE="html/tsm-doc-search-multi.html"

echo "================================================"
echo " TSM HEALTHCARE DOC SEARCH FINAL REPAIR v2"
echo "================================================"

if [ ! -f "$FILE" ]; then
  echo "Missing $FILE"
  exit 1
fi


echo "[1/7] Backup"

cp "$FILE" "$FILE.backup.$(date +%s)"


echo "[2/7] Force healthcare defaults"

python3 <<'PY'
from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")
s=p.read_text()

s=s.replace(
'let currentVertical = "fo";',
'let currentVertical = "hc";'
)

p.write_text(s)
PY


echo "[3/7] Inject healthcare runtime refresh"

python3 <<'PY'
from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")
s=p.read_text()

patch="""

/* TSM HC FINAL RUNTIME PATCH */
window.currentVertical="hc";
window.activeClientId="multi-patient";

setTimeout(()=>{

console.log("TSM HC FINAL CHECK",{
 vertical:window.currentVertical,
 client:window.activeClientId,
 docs:loadIndex().map(d=>d.fileName)
});

refreshTotalCount();
runSearch();

},1000);

"""


if "TSM HC FINAL RUNTIME PATCH" not in s:

    # put before closing body
    s=s.replace(
        "</body>",
        patch+"\n</body>"
    )


p.write_text(s)

PY


echo "[4/7] Inject search debug"

python3 <<'PY'
from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")
s=p.read_text()


debug="""

console.log("TSM SEARCH STATE",{
 vertical:currentVertical,
 client:activeClientId,
 total:loadIndex().length,
 docs:loadIndex().map(d=>d.fileName)
});

"""


if "TSM SEARCH STATE" not in s:

    s=s.replace(
        "container.innerHTML = results.map(doc => renderCard(doc, filters.query)).join(\"\");",
        debug+"\ncontainer.innerHTML = results.map(doc => renderCard(doc, filters.query)).join(\"\");"
    )


p.write_text(s)

PY


echo "[5/7] Verify (non-blocking)"

grep -n 'let currentVertical' "$FILE" || true
grep -n 'TSM HC FINAL' "$FILE" || true
grep -n 'TSM SEARCH STATE' "$FILE" || true


echo "[6/7] Run healthcare E2E headless"

npx playwright test \
tests/e2e/healthcare-denial-10-phase-demo.spec.js \
--reporter=list


echo "[7/7] DONE"

