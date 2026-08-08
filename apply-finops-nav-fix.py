#!/usr/bin/env python3
"""
Apply-script: fixes the FinOps STRATEGIST/WAR ROOM/EXEC PORTAL nav 404s and
updates the four stale "Known gaps" notes in bpo-service-delivery-system.html
to reflect verified current state.

Run from the repo root:
    python3 apply-finops-nav-fix.py
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent

def patch(path, old, new, expect=1):
    p = ROOT / path
    text = p.read_text()
    count = text.count(old)
    assert count == expect, f"{path}: expected {expect} match(es) for old_str, found {count}"
    p.write_text(text.replace(old, new))
    print(f"OK  {path}")

# ── 1. finops-war-room.html: nav() function ─────────────────────────────
patch(
    "html/finops-suite/finops-war/finops-war-room.html",
    "function nav(page) { window.location.href = '/html/finops-suite/' + page; }",
    """function nav(page) {
  // finops-main-strategist.html, finops-war-room.html, and finops-executive-portal.html
  // live under finops-suite/finops-war/, not finops-suite/ directly -- everything else
  // (doc-analysis-tab, finops-accounting, finops-operations) is a level up. Prefixing
  // all pages with finops-suite/ alone 404'd the STRATEGIST/EXECUTIVE nav buttons.
  var warRoomFiles = ['finops-main-strategist.html', 'finops-war-room.html', 'finops-executive-portal.html'];
  var base = warRoomFiles.indexOf(page) !== -1 ? '/html/finops-suite/finops-war/' : '/html/finops-suite/';
  window.location.href = base + page;
}""",
)

# ── 2. finops-war-room.html: keyword-routing URLs ───────────────────────
patch(
    "html/finops-suite/finops-war/finops-war-room.html",
    "url:'/html/finops-suite/finops-war-room.html', reason:'Cost anomaly requires war room analysis'",
    "url:'/html/finops-suite/finops-war/finops-war-room.html', reason:'Cost anomaly requires war room analysis'",
)
patch(
    "html/finops-suite/finops-war/finops-war-room.html",
    "url:'/html/finops-suite/finops-main-strategist.html', reason:'Cost optimization opportunity detected'",
    "url:'/html/finops-suite/finops-war/finops-main-strategist.html', reason:'Cost optimization opportunity detected'",
)
patch(
    "html/finops-suite/finops-war/finops-war-room.html",
    "url:'/html/finops-suite/finops-executive-portal.html', reason:'Executive-level issue requires portal escalation'",
    "url:'/html/finops-suite/finops-war/finops-executive-portal.html', reason:'Executive-level issue requires portal escalation'",
)

# ── 3. finops-executive-portal.html: nav() function ─────────────────────
patch(
    "html/finops-suite/finops-war/finops-executive-portal.html",
    "function nav(page) { window.location.href = '/html/finops-suite/' + page; }",
    """function nav(page) {
  // finops-main-strategist.html, finops-war-room.html, and finops-executive-portal.html
  // live under finops-suite/finops-war/, not finops-suite/ directly -- everything else
  // (doc-analysis-tab, finops-accounting, finops-operations) is a level up. Prefixing
  // all pages with finops-suite/ alone 404'd the WAR ROOM/STRATEGIST nav buttons.
  var warRoomFiles = ['finops-main-strategist.html', 'finops-war-room.html', 'finops-executive-portal.html'];
  var base = warRoomFiles.indexOf(page) !== -1 ? '/html/finops-suite/finops-war/' : '/html/finops-suite/';
  window.location.href = base + page;
}""",
)

# ── 4. finops-executive-portal.html: chain-bar hrefs ────────────────────
patch(
    "html/finops-suite/finops-war/finops-executive-portal.html",
    '<a href="/html/finops-suite/finops-war-room.html" style="color:#94a3b8;border:1px solid #1a3a50;padding:3px 10px;border-radius:3px;text-decoration:none;margin-right:6px;font-size:9px;">&#9675; WAR ROOM</a><span style="color:#1a3a50;margin-right:6px;">--&gt;</span><a href="/html/finops-suite/finops-main-strategist.html" style="color:#94a3b8;border:1px solid #1a3a50;padding:3px 10px;border-radius:3px;text-decoration:none;margin-right:6px;font-size:9px;">&#9675; STRATEGIST</a>',
    '<a href="/html/finops-suite/finops-war/finops-war-room.html" style="color:#94a3b8;border:1px solid #1a3a50;padding:3px 10px;border-radius:3px;text-decoration:none;margin-right:6px;font-size:9px;">&#9675; WAR ROOM</a><span style="color:#1a3a50;margin-right:6px;">--&gt;</span><a href="/html/finops-suite/finops-war/finops-main-strategist.html" style="color:#94a3b8;border:1px solid #1a3a50;padding:3px 10px;border-radius:3px;text-decoration:none;margin-right:6px;font-size:9px;">&#9675; STRATEGIST</a>',
)

# ── 5. bpo-service-delivery-system.html: four "Known gaps" notes ────────
patch(
    "bpo-service-delivery-system.html",
    '<div class="blk"><div class="k">Known gaps</div><div class="v">Doc-search relay dead; Sentinel exec-portal link 404s</div></div>',
    '<div class="blk"><div class="k">Known gaps</div><div class="v">None currently open — prior doc-search relay and Sentinel link issues confirmed fixed</div></div>',
)
patch(
    "bpo-service-delivery-system.html",
    '<div class="blk"><div class="k">Known gaps</div><div class="v">Two competing strategist files — live one has no Sentinel relay logic</div></div>',
    '<div class="blk"><div class="k">Known gaps</div><div class="v">None currently open — war room/exec portal STRATEGIST nav buttons 404\'d on a wrong subdirectory path, fixed</div></div>',
)
patch(
    "bpo-service-delivery-system.html",
    '<div class="blk"><div class="k">Known gaps</div><div class="v">Issue #160 — legal-tax.html has 3 stray &lt;/html&gt; closers, unfixed</div></div>',
    '<div class="blk"><div class="k">Known gaps</div><div class="v">None currently open — issue #160 confirmed already fixed on main</div></div>',
)
patch(
    "bpo-service-delivery-system.html",
    '<div class="blk"><div class="k">Known gaps</div><div class="v">Chain status indicator non-functional — write functions defined but never called</div></div>',
    '<div class="blk"><div class="k">Known gaps</div><div class="v">None currently open — chain status bar confirmed fully wired (fireEngines → relay write → status polling)</div></div>',
)

print("\nAll patches applied.")
