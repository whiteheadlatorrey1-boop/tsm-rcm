#!/usr/bin/env bash
set -euo pipefail

# Run from /workspaces/tsm-rcm in Codespaces, with pm-copilot-assets.tar.gz
# uploaded into the same directory as this script:
#   bash add_pm_copilot.sh
#
# Adds PM Copilot as a 15th card to html/demo/presentation-hub.html,
# using the REAL screenshots already captured in html/demo-screenshots/pm-copilot
# (from an earlier Playwright run of demo/pm-copilot-demo.json), resized to
# match the site's 1334x750 preview-slides convention, plus a generated
# downloadable PM-Copilot-Demo.pptx built from those same 6 images.
#
# This card was actually added once before (commit c4331430, Aug 15) but
# to a different/older version of presentation-hub.html (a JS DECKS-array
# structure) that got fully replaced when the file-404 fix promoted the
# root copy in. This re-adds it to the CURRENT card-DOM structure.

TARBALL="pm-copilot-assets.tar.gz"
FILE="html/demo/presentation-hub.html"

if [ ! -f "$TARBALL" ]; then
  echo "ERROR: $TARBALL not found in $(pwd)."
  echo "Upload it into the repo root first, then re-run this script."
  exit 1
fi

echo "=== Syncing apply-hub-updates with latest main first ==="
git fetch origin
git checkout apply-hub-updates
git merge origin/main --no-edit

if grep -q 'data-slug="pm-copilot"' "$FILE"; then
  echo "PM Copilot card already present -- nothing to add."
  exit 0
fi

echo "=== Extracting assets ==="
tar -xzf "$TARBALL"
mkdir -p html/demo/preview-slides/pm-copilot
cp preview-slides/pm-copilot/*.png html/demo/preview-slides/pm-copilot/
cp PM-Copilot-Demo.pptx .
rm -rf preview-slides PM-Copilot-Demo.pptx.bak 2>/dev/null || true
rm -rf preview-slides

echo "=== Inserting PM Copilot card into $FILE ==="
python3 << 'PYEOF'
path = "html/demo/presentation-hub.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

if 'data-slug="pm-copilot"' in content:
    print("Card already present, skipping insert.")
else:
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
        raise SystemExit("ERROR: expected end-of-grid marker not found -- file structure may have changed. Aborting without writing.")
    content = content.replace(marker, new_block, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Card inserted.")
PYEOF

git add html/demo/presentation-hub.html html/demo/preview-slides/pm-copilot PM-Copilot-Demo.pptx
git commit -m "Add PM Copilot as deck #15 to presentation-hub.html

Uses the real screenshots already captured in
html/demo-screenshots/pm-copilot (from a prior Playwright run of
demo/pm-copilot-demo.json), resized to the site's 1334x750
preview-slides convention, plus a generated downloadable
PM-Copilot-Demo.pptx built from the same 6 images.

PM Copilot was added once before (c4331430) but to an older
JS-DECKS-array version of this file that no longer exists after the
404 fix promoted a different structure in. This re-adds it to the
current card-DOM structure that every other deck uses."
git push origin apply-hub-updates

echo ""
echo "Pushed directly to apply-hub-updates. If you want it on main via PR"
echo "instead of a direct branch push, open:"
echo "  https://github.com/whiteheadlatorrey1-boop/tsm-rcm/compare/apply-hub-updates?expand=1"
