#!/usr/bin/env bash
set -euo pipefail

# Run from /workspaces/tsm-rcm in Codespaces:
#   bash add_modal_home_button.sh
#
# Adds a "Home" button to the shared slide-preview modal in
# html/demo/presentation-hub.html, next to the existing X close button.
# One shared modal serves all 14 deck cards, so this applies everywhere
# with a single edit -- no per-card changes needed.

FILE="html/demo/presentation-hub.html"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. Run this from the repo root."
  exit 1
fi

if grep -q 'id="modal-home"' "$FILE"; then
  echo "Home button already present in $FILE -- nothing to do."
  exit 0
fi

echo "Making sure you're up to date with main first..."
git checkout main
git pull origin main
git checkout -b add-modal-home-button

python3 << 'PYEOF'
import re

path = "html/demo/presentation-hub.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Insert the Home button markup before the close button
old_markup = '''      <div class="right">
        <span class="modal-counter" id="modal-counter">1 / 11</span>
        <button class="modal-close" id="modal-close" aria-label="Close preview">'''
new_markup = '''      <div class="right">
        <span class="modal-counter" id="modal-counter">1 / 11</span>
        <a class="modal-home" id="modal-home" href="./presentation-hub.html" aria-label="Back to home">
          <svg viewBox="0 0 24 24" fill="none"><path d="M3 11l9-8 9 8M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>Home</span>
        </a>
        <button class="modal-close" id="modal-close" aria-label="Close preview">'''

if old_markup not in content:
    raise SystemExit("ERROR: expected modal-head markup not found -- file may have changed. Aborting without writing.")
content = content.replace(old_markup, new_markup, 1)

# 2. Insert matching CSS after .modal-close svg rule
old_css = '''  .modal-close:hover{color:var(--text);border-color:var(--faint);}
  .modal-close svg{width:16px;height:16px;}'''
new_css = old_css + '''
  .modal-home{
    height:32px;padding:0 12px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);
    color:var(--muted);display:flex;align-items:center;gap:6px;cursor:pointer;text-decoration:none;
    transition:all .15s;flex-shrink:0;font-family:'Barlow',sans-serif;font-size:12px;font-weight:600;
    letter-spacing:.3px;
  }
  .modal-home:hover{color:var(--text);border-color:var(--faint);}
  .modal-home svg{width:15px;height:15px;flex-shrink:0;}'''

if old_css not in content:
    raise SystemExit("ERROR: expected .modal-close CSS not found -- file may have changed. Aborting without writing.")
content = content.replace(old_css, new_css, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched successfully.")
PYEOF

git add "$FILE"
git commit -m "Add 'Home' button to the slide-preview modal, next to the close button

One shared modal serves all 14 deck cards, so this single change applies
everywhere -- no per-card edits needed. Links to ./presentation-hub.html
(itself), giving users an explicit way back to the grid distinct from
the X close button."
git push origin add-modal-home-button

echo ""
echo "Pushed to 'add-modal-home-button'. Open/merge:"
echo "  https://github.com/whiteheadlatorrey1-boop/tsm-rcm/compare/add-modal-home-button?expand=1"
