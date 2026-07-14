#!/bin/bash
set -e

FILE="html/tsm-doc-search-multi.html"

echo "=========================================="
echo " TSM HEALTHCARE SEED — TRUE FIX"
echo "=========================================="

test -f "$FILE"
cp "$FILE" "$FILE.truefix.bak.$(date +%s)"

echo "[1/5] Strip any prior broken injections (appended outside <script>)"

python3 <<'PY'
from pathlib import Path

p = Path("html/tsm-doc-search-multi.html")
s = p.read_text()

for marker in ("\n\n/* TSM HC BOOTSTRAP */", "\n\n/* TSM FORCE HC SEED */", "\n\n/* TSM FORCE HC SEED V2 */"):
    idx = s.find(marker)
    if idx != -1:
        print(f"Stripping broken injection at marker: {marker.strip()}")
        s = s[:idx]

assert s.rstrip().endswith("</html>"), "File does not end with </html> after stripping — aborting, inspect manually"
p.write_text(s)
print("Clean file restored, ends with </html>")
PY

echo "[2/5] Inject properly-wrapped, idempotent seed script before </body>"

python3 <<'PY'
from pathlib import Path

p = Path("html/tsm-doc-search-multi.html")
html = p.read_text()

marker = "/* TSM FORCE HC SEED V2 */"
if marker in html:
    print("Already installed")
    raise SystemExit

patch = r"""<script>
/* TSM FORCE HC SEED V2 */
window.addEventListener("load", () => {
  console.log("TSM FORCE HC SEED START");

  setTimeout(() => {
    try {
      currentVertical = "hc";
      activeClientId = ALL_CLIENTS_ID;

      console.log("BEFORE SEED", {
        vertical: currentVertical,
        demoCount: typeof DEMO_DOCS !== "undefined" ? DEMO_DOCS.length : "missing"
      });

      if (typeof seedAllVerticals === "function") {
        seedAllVerticals();
      } else if (typeof seedDemoData === "function") {
        seedDemoData();
      } else {
        console.error("NO SEED FUNCTION FOUND");
      }

      const keys = Object.keys(localStorage).filter(k => k.includes("tsm_doc_index"));
      console.log("AFTER SEED STORAGE", keys.map(k => ({ key: k, size: localStorage.getItem(k).length })));

      if (typeof refreshWorkspaceSelector === "function") refreshWorkspaceSelector();
      if (typeof runSearch === "function") runSearch();
      if (typeof refreshTotalCount === "function") refreshTotalCount();
    } catch (e) {
      console.error("FORCE SEED ERROR", e);
    }
  }, 1000);
});
</script>
"""

assert "</body>" in html, "No </body> tag found — aborting"
html = html.replace("</body>", patch + "</body>", 1)
p.write_text(html)
print("Injected wrapped <script> block before </body>")
PY

echo "[3/5] Validate syntax"

python3 - <<'PY'
from pathlib import Path
import re

html = Path("html/tsm-doc-search-multi.html").read_text()
blocks = re.findall(r"<script[^>]*>(.*?)</script>", html, re.S)
Path("/tmp/hc-truefix-check.js").write_text("\n".join(blocks))
print("Extracted", len(blocks), "script blocks")
PY

node --check /tmp/hc-truefix-check.js
echo "Syntax OK"

echo "[4/5] Restart server"

pkill -f "node server" || true
sleep 2
nohup node server.js >/tmp/tsm-server.log 2>&1 &
sleep 5

echo "[5/5] Run debug"

./scripts/debug-healthcare-dom-state.sh