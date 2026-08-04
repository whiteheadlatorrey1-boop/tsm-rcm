#!/usr/bin/env python3
"""
Fixes two bugs found in the fresh realestate-demo.mp4 review:

1. "Permanent killswitch for AI Chat Assistant" CSS rule was injected
   raw into <head> WITHOUT <style> wrapper tags on all 3 RE pages.
   Browsers hoist that orphaned text into <body>, so it rendered as a
   literal yellow text banner at the very top of every page.

2. re-exec-portal.html only: an orphaned, broken duplicate tour-guide
   block (no wrapper <div>, missing exec-step-1, missing the
   exec-guide-step-counter element it references) rendered unstyled
   directly into the page flow, overlapping the "EXEC ACTIONS" sidebar
   list. Its completeStep() function was dead code (never called), and
   its click listener called markComplete() which isn't even in scope
   there (defined inside a different, later IIFE) — so it silently
   errored on every click. The real, working guide widget
   (#tsm-floating-guide, "COMPACT COLLAPSIBLE GUIDE WIDGET") is fully
   self-contained further down and already covers this UX, so the
   broken block is deleted rather than repaired.

Run from repo root:
    python3 apply-re-css-guide-fix.py

Safe to re-run: no-ops per-file if already applied.
"""
import sys
from pathlib import Path

FILES = {
    "html/war-rooms/re-war/re-exec-portal.html": [
        (
            '/* Permanent killswitch for AI Chat Assistant overlay */\n'
            '.assistant-launcher, .chat-widget-container { display: none !important; visibility: hidden !important; pointer-events: none !important; }\n'
            '\n'
            '<style id="fix-header-overlay">',
            '<style>\n'
            '/* Permanent killswitch for AI Chat Assistant overlay */\n'
            '.assistant-launcher, .chat-widget-container { display: none !important; visibility: hidden !important; pointer-events: none !important; }\n'
            '</style>\n'
            '\n'
            '<style id="fix-header-overlay">',
        ),
        (
            '<!-- DYNAMIC INTERACTIVE GUIDE FOR EU: RE-EXEC-PORTAL -->\n'
            '\n'
            '    <div id="exec-step-2" style="margin-bottom: 8px; color: #64748b; opacity: 0.6; display: flex; align-items: flex-start; gap: 8px;">\n'
            '      <span class="step-icon" style="font-weight: bold;">\u25cb</span>\n'
            '      <div>\n'
            '        <strong>2. Generate Executive Brief</strong>\n'
            '        <div style="font-size: 10px; color: #94a3b8;">Click <span style="color: #10b981;">"\u26a1 GENERATE BRIEF"</span> or review active FinCEN/TRID Compliance Flags.</div>\n'
            '      </div>\n'
            '    </div>\n'
            '    <div id="exec-step-3" style="margin-bottom: 4px; color: #64748b; opacity: 0.6; display: flex; align-items: flex-start; gap: 8px;">\n'
            '      <span class="step-icon" style="font-weight: bold;">\u25cb</span>\n'
            '      <div>\n'
            '        <strong>3. Execute Sign-off or Deal Rescue</strong>\n'
            '        <div style="font-size: 10px; color: #94a3b8;">Trigger <span style="color: #f43f5e;">"\u25cf DEAL RESCUE"</span> to deploy mitigation overrides.</div>\n'
            '      </div>\n'
            '    </div>\n'
            '  </div>\n'
            '  <div style="background: #030712; padding: 8px 12px; border-top: 1px solid #1e293b; font-size: 10px; color: #f59e0b;" id="exec-guide-hint">\n'
            '    <strong>Next:</strong> Select a Deal Snapshot or Quick Analysis option from sidebar.\n'
            '  </div>\n'
            '</div>\n'
            '\n'
            '<script>\n'
            '(function() {\n'
            '  let currentStep = 1;\n'
            '\n'
            '  function completeStep(stepNum, nextHint) {\n'
            '    if (stepNum < currentStep) return;\n'
            '    \n'
            '    const stepEl = document.getElementById("exec-step-" + stepNum);\n'
            '    if (stepEl) {\n'
            '      stepEl.style.color = "#10b981";\n'
            '      stepEl.style.opacity = "1";\n'
            '      stepEl.querySelector(".step-icon").innerHTML = "\u2713";\n'
            '    }\n'
            '\n'
            '    currentStep = stepNum + 1;\n'
            '    const nextEl = document.getElementById("exec-step-" + currentStep);\n'
            '    if (nextEl) {\n'
            '      nextEl.style.color = "#f59e0b";\n'
            '      nextEl.style.opacity = "1";\n'
            '      nextEl.querySelector(".step-icon").innerHTML = "\u25cf";\n'
            '      document.getElementById("exec-guide-step-counter").innerText = "STEP " + currentStep + " OF 3";\n'
            '    }\n'
            '\n'
            '    if (nextHint) {\n'
            '      document.getElementById("exec-guide-hint").innerHTML = "<strong>Next:</strong> " + nextHint;\n'
            '    }\n'
            '  }\n'
            '\n'
            '  // Hook event listeners for step progress\n'
            '  document.addEventListener("click", function(e) {\n'
            '      const el = e.target.closest("*");\n'
            '      if (!el) return;\n'
            '      const txt = (el.innerText || "").toUpperCase();\n'
            '\n'
            '      // Step 1: Select deal/case item\n'
            '      if (txt.includes("DEAL") || txt.includes("COMPLIANCE") || txt.includes("REO") || txt.includes("PORTFOLIO") || txt.includes("SNAPSHOT") || txt.includes("FINCEN") || txt.includes("TRID")) {\n'
            '        markComplete(1, "Click <strong>\u26a1 GENERATE BRIEF</strong> to compile executive metrics.");\n'
            '      }\n'
            '      \n'
            '      // Step 2: Generate brief\n'
            '      if (txt.includes("GENERATE BRIEF") || txt.includes("EXECUTIVE BRIEF") || txt.includes("BRIEF")) {\n'
            '        markComplete(1);\n'
            '        markComplete(2, "Click <strong>\u25cf DEAL RESCUE</strong> to execute sign-off or override.");\n'
            '      }\n'
            '      \n'
            '      // Step 3: Deal Rescue / Sign-off\n'
            '      if (txt.includes("DEAL RESCUE") || txt.includes("RESCUE PLAN") || txt.includes("SIGN-OFF")) {\n'
            '        markComplete(1);\n'
            '        markComplete(2);\n'
            '        markComplete(3, "Executive Sign-off complete. Strategic posture saved.");\n'
            '      }\n'
            '    }, true);\n'
            '})();\n'
            '</script>\n'
            '\n'
            '\n'
            '\n'
            '<!-- COMPACT COLLAPSIBLE GUIDE WIDGET -->',
            '<!-- COMPACT COLLAPSIBLE GUIDE WIDGET -->',
        ),
    ],
    "html/war-rooms/re-war/re-strategist.html": [
        (
            '/* Permanent killswitch for AI Chat Assistant overlay */\n'
            '.assistant-launcher, .chat-widget-container { display: none !important; visibility: hidden !important; pointer-events: none !important; }\n'
            '</head>',
            '<style>\n'
            '/* Permanent killswitch for AI Chat Assistant overlay */\n'
            '.assistant-launcher, .chat-widget-container { display: none !important; visibility: hidden !important; pointer-events: none !important; }\n'
            '</style>\n'
            '</head>',
        ),
    ],
    "html/war-rooms/re-war/re-war-room.html": [
        (
            '/* Permanent killswitch for AI Chat Assistant overlay */\n'
            '#tsm-mission-guide-panel, .assistant-launcher, .chat-widget-container { display: none !important; visibility: hidden !important; pointer-events: none !important; }\n'
            '</head>',
            '<style>\n'
            '/* Permanent killswitch for AI Chat Assistant overlay */\n'
            '#tsm-mission-guide-panel, .assistant-launcher, .chat-widget-container { display: none !important; visibility: hidden !important; pointer-events: none !important; }\n'
            '</style>\n'
            '</head>',
        ),
    ],
}

any_applied = False
for relpath, edits in FILES.items():
    p = Path(relpath)
    if not p.exists():
        print(f"SKIP: {relpath} not found (not run from repo root?)")
        continue
    src = p.read_text()
    changed = False
    for old, new in edits:
        # Presence of the OLD (unfixed) anchor is the only reliable signal —
        # checking for the NEW text is unsafe here because for the deletion
        # edit, "new" is just a trailing comment line that's trivially
        # present in the file either way (before or after the fix).
        if old in src:
            src = src.replace(old, new, 1)
            changed = True
        elif new in src:
            pass  # already applied, nothing to do
        else:
            print(f"WARNING: anchor not found in {relpath} for one edit — file may have diverged. Skipping that edit.")
    if changed:
        p.write_text(src)
        print(f"Applied fix(es) to {relpath}")
        any_applied = True
    else:
        print(f"Already up to date: {relpath}")

if not any_applied:
    print("\nNothing to do — all fixes already applied.")
