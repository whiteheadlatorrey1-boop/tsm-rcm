#!/usr/bin/env bash
set -euo pipefail

# Run from /workspaces/tsm-rcm in Codespaces:
#   bash insert_pm_copilot_card.sh
#
# The PM Copilot images and PM-Copilot-Demo.pptx are already committed
# and pushed (commit d82ece48). This just inserts the missing card
# markup into html/demo/presentation-hub.html that references them.

FILE="html/demo/presentation-hub.html"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. Run this from the repo root."
  exit 1
fi

if grep -q 'data-slug="pm-copilot"' "$FILE"; then
  echo "Card already present -- nothing to do."
  exit 0
fi

if [ ! -f "html/demo/preview-slides/pm-copilot/slide-01.png" ]; then
  echo "ERROR: html/demo/preview-slides/pm-copilot/ images not found."
  echo "Make sure you've pulled the latest apply-hub-updates first:"
  echo "  git pull origin apply-hub-updates"
  exit 1
fi

python3 << 'PYEOF'
path = "html/demo/presentation-hub.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

marker = '''  </div>

</main>

<footer>
  TSM INTELLIGENCE &nbsp;/&nbsp; ARCHIVE INDEX v1 &nbsp;/&nbsp; 14 FILES INDEXED
</footer>'''

new_block = '''  </div>

  <!-- PM Copilot -->
  <div class="card" style="--accent:var(--purple)" data-sector="core"
       data-slug="pm-copilot" data-slides="6" data-title="PM Copilot: Portfolio War Room"
       data-file="PM-Copilot-Demo.pptx" data-href="./PM-Copilot-Demo.pptx">
    <div class="card-top">
      <div class="icon-wrap">
        <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="14" rx="2" stroke="var(--purple)" stroke-width="1.6"/><path d="M3 9h18M8 4v14" stroke="var(--purple)" stroke-width="1.6"/></svg>
      </div>
      <div class="case-no">DECK&nbsp;15</div>
    </div>
    <div class="sector">Core</div>
    <h3>PM Copilot: Portfolio War Room</h3>
    <p>Leases, work orders, vendors, and IoT sensor alerts in one exposure-ranked view &mdash; portfolio load to strategist brief.</p>
    <div class="preview-hint">
      <svg viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>
      Click to preview &middot; 6 slides
    </div>
    <div class="card-foot">
      <span class="filesize">PPTX &middot; 1.4 MB</span>
      <a class="dl" href="./PM-Copilot-Demo.pptx" download onclick="event.stopPropagation()">
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Get
      </a>
    </div>
  </div>

</main>

<footer>
  TSM INTELLIGENCE &nbsp;/&nbsp; ARCHIVE INDEX v1 &nbsp;/&nbsp; 15 FILES INDEXED
</footer>'''

if marker not in content:
    raise SystemExit("ERROR: expected end-of-grid marker not found -- file structure changed since this script was written. Aborting without writing.")

content = content.replace(marker, new_block, 1)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Card inserted.")
PYEOF

git add "$FILE"
git commit -m "Insert PM Copilot card markup (assets were already added in d82ece48)"
git push origin apply-hub-updates

echo ""
echo "Pushed. Verify:"
echo "  git show origin/apply-hub-updates:html/demo/presentation-hub.html | grep -c pm-copilot"
echo "should print 1."
