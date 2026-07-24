#!/usr/bin/env python3
"""
Adds Mortgage and Schools sections to suite-hub.html, matching the
existing card/section-label pattern. Real files confirmed via repo
find (backups/ excluded):

  Mortgage: html/war-rooms/mortgage/{mortgage-war-room,mortgage-strategist,
            mortgage-executive-portal}.html, html/mortgage-command.html
  Schools:  html/schools-command/{schools-command,schools-strategist,
            schools-executive-portal}.html

URL aliasing assumption: mirrors the existing "/bpo/..." pattern already
in this file for html/war-rooms/bpo/* -> so html/war-rooms/mortgage/*
becomes "/mortgage/...". Schools isn't under war-rooms/, so it's aliased
off its own top-level folder name, same as "/healthcare/..." does for
html/healthcare/* -> "/schools-command/...". If either alias doesn't
resolve once clicked live, it's a one-line href swap, not a rebuild.

Run from the repo root (contains html/war-rooms/bpo/suite-hub.html):
    python3 apply_add_mortgage_schools_suite_hub.py
"""
import pathlib

TARGET = pathlib.Path("html/war-rooms/bpo/suite-hub.html")

# 1. New color variables (after --music, before --gray)
OLD_VARS = "  --music: #f472b6;\n  --gray: #94a3b8;"
NEW_VARS = "  --music: #f472b6;\n  --mortgage: #60a5fa;\n  --schools: #34d399;\n  --gray: #94a3b8;"

# 2. New icon classes (after ic-music)
OLD_IC = ".ic-music  { background: rgba(244,114,182,0.12); color: var(--music); }"
NEW_IC = (".ic-music  { background: rgba(244,114,182,0.12); color: var(--music); }\n"
          ".ic-mortgage { background: rgba(96,165,250,0.12); color: var(--mortgage); }\n"
          ".ic-schools  { background: rgba(52,211,153,0.12); color: var(--schools); }")

# 3. New dot classes (after dot-music)
OLD_DOT = ".dot-music  { background: var(--music); }"
NEW_DOT = (".dot-music  { background: var(--music); }\n"
           ".dot-mortgage { background: var(--mortgage); }\n"
           ".dot-schools  { background: var(--schools); }")

# 4. New sections, inserted right before the "Music & Demos" section comment
OLD_SECTION_MARKER = "  <!-- Music & Demos -->"
NEW_SECTIONS = """  <!-- Mortgage -->
  <div class="section-label">
    <span class="section-dot dot-mortgage"></span>
    Mortgage
  </div>
  <div class="suite-grid">
    <div class="card">
      <div class="card-header">
        <div class="card-icon ic-mortgage">MG</div>
        <div class="card-title">Mortgage Suite</div>
      </div>
      <div class="link-list">
        <a class="suite-link" href="/mortgage-command.html">Mortgage Command</a>
        <a class="suite-link" href="/mortgage/mortgage-war-room.html">War Room</a>
        <a class="suite-link" href="/mortgage/mortgage-strategist.html">Strategist</a>
        <a class="suite-link" href="/mortgage/mortgage-executive-portal.html">Executive Portal</a>
      </div>
    </div>
  </div>

  <!-- Schools -->
  <div class="section-label">
    <span class="section-dot dot-schools"></span>
    Schools
  </div>
  <div class="suite-grid">
    <div class="card">
      <div class="card-header">
        <div class="card-icon ic-schools">SC</div>
        <div class="card-title">Schools Suite</div>
      </div>
      <div class="link-list">
        <a class="suite-link" href="/schools-command/schools-command.html">Schools Command</a>
        <a class="suite-link" href="/schools-command/schools-strategist.html">Strategist</a>
        <a class="suite-link" href="/schools-command/schools-executive-portal.html">Executive Portal</a>
      </div>
    </div>
  </div>

  <!-- Music & Demos -->"""

def main():
    assert TARGET.exists(), f"Not found: {TARGET} (run this from the repo root)"
    text = TARGET.read_text()

    for label, old in [("vars", OLD_VARS), ("icon classes", OLD_IC), ("dot classes", OLD_DOT), ("section marker", OLD_SECTION_MARKER)]:
        count = text.count(old)
        assert count == 1, f"Expected exactly 1 match for {label}, found {count} -- aborting, file may have changed"

    text = text.replace(OLD_VARS, NEW_VARS)
    text = text.replace(OLD_IC, NEW_IC)
    text = text.replace(OLD_DOT, NEW_DOT)
    text = text.replace(OLD_SECTION_MARKER, NEW_SECTIONS)

    TARGET.write_text(text)

    final = TARGET.read_text()
    assert "dot-mortgage" in final and "dot-schools" in final
    assert "Mortgage Suite" in final and "Schools Suite" in final
    assert final.count("<!-- Music & Demos -->") == 1

    print(f"OK: patched {TARGET}")
    print("  Added Mortgage section (4 links) and Schools section (3 links)")

if __name__ == "__main__":
    main()