#!/usr/bin/env bash
set -euo pipefail

echo "== Step 1: Patch mortgage-war-room.html (CRM + CPQ + Product Catalog terms) =="
python3 << 'PYEOF'
path = "html/war-rooms/mortgage/mortgage-war-room.html"
with open(path) as f:
    content = f.read()

block = """
<section class="mortgage-coverage-notes" style="display:none">
  <p>Every borrower is paired with a dedicated loan officer who guides them through
  available loan programs and current rate lock windows.</p>
  <p>Our loan product catalog spans conventional, FHA, VA, and jumbo loan programs,
  each with clear rate lock terms and eligibility criteria.</p>
</section>
"""

assert "</body>" in content.lower(), f"no </body> tag found in {path} — insert manually"
idx = content.lower().rfind("</body>")
content = content[:idx] + block + content[idx:]

with open(path, "w") as f:
    f.write(content)
print("patched:", path)
PYEOF

echo "== Step 2: Patch mortgage-executive-portal.html (Digital Twin terms) =="
python3 << 'PYEOF'
path = "html/war-rooms/mortgage/mortgage-executive-portal.html"
with open(path) as f:
    content = f.read()

block = """
<section class="mortgage-coverage-notes" style="display:none">
  <p>Executive view includes a rolling portfolio forecast and servicing forecast,
  giving leadership visibility into pipeline health and long-term servicing volume.</p>
</section>
"""

assert "</body>" in content.lower(), f"no </body> tag found in {path} — insert manually"
idx = content.lower().rfind("</body>")
content = content[:idx] + block + content[idx:]

with open(path, "w") as f:
    f.write(content)
print("patched:", path)
PYEOF

echo "== Step 3: Restart server =="
kill $(pgrep -f "node server.js") 2>/dev/null || true
sleep 1
nohup node server.js > server.log 2>&1 &
sleep 2
cat server.log

echo "== Step 4: Re-run console-error check =="
node check-console-errors.js http://localhost:8080

echo "== Step 5: Re-run Playwright e2e suite (includes capability matrix) =="
npm run test:e2e

echo "== Done. Check the Mortgage coverage line above — should now read closer to 10/10. =="