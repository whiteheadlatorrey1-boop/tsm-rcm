#!/bin/bash
set -e

FILE="html/tsm-doc-search-multi.html"

echo "=== PATCH HEALTHCARE ALL CLIENT INDEX ==="

cp "$FILE" "$FILE.bak.$(date +%s)"

python3 <<'PY'
from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")
s=p.read_text()

needle='''function loadIndex() {
'''

if "TSM HC ALL CLIENT INDEX" in s:
    print("Already patched")
    exit()

idx=s.find(needle)

if idx == -1:
    raise SystemExit("loadIndex not found")


start=idx
brace=0
end=None

for i in range(idx,len(s)):
    if s[i]=="{":
        brace+=1
    elif s[i]=="}":
        brace-=1
        if brace==0:
            end=i+1
            break


old=s[start:end]

new=r'''function loadIndex() {

  if (activeClientId === "__all__") {

    const docs =
      getClientRegistry()
      .flatMap(c =>
        loadIndexForClient(currentVertical,c.id)
      );

    console.log(
      "TSM HC ALL CLIENT INDEX",
      {
        vertical: currentVertical,
        total: docs.length,
        files: docs.map(d=>d.fileName)
      }
    );

    return docs;
  }


  return loadIndexForClient(
    currentVertical,
    activeClientId
  );

}'''

s=s.replace(old,new)

p.write_text(s)

print("loadIndex replaced")
PY


python3 - <<'PY'
from pathlib import Path
import re

x=Path("html/tsm-doc-search-multi.html").read_text()

scripts=re.findall(
r"<script[^>]*>(.*?)</script>",
x,
re.S
)

Path("/tmp/check-hc.js").write_text("\n".join(scripts))

print("blocks",len(scripts))
PY

node --check /tmp/check-hc.js

pkill -f "node server" || true
sleep 2
nohup node server.js >/tmp/tsm-server.log 2>&1 &

sleep 5

echo "=== RUN TEST ==="

npx playwright test \
tests/e2e/healthcare-denial-10-phase-demo.spec.js
