#!/usr/bin/env python3
"""
AI Widget Rollout - v2 (denylist-aware, dot/dash engine naming aware)

Key change from v1: v1 assumed every vertical has exactly one bespoke
'*-engine.js' file to anchor on. That assumption is FALSE for BPO,
Insurance, Legal, and Real Estate (they only include shared platform
engines) and PARTIALLY false for Healthcare (uses dot naming: relay.engine.js).

This version:
  1. Matches engine scripts with either '-engine.js' or '.engine.js' naming.
  2. Filters out known SHARED platform engines via a denylist (by basename,
     ignoring query strings like '?v=phase3').
  3. If exactly one non-shared engine remains -> treats it as the real
     vertical engine and proposes patching after its <script> tag.
  4. If zero remain, looks for a plausible vertical-specific fallback
     script (filename/path hints at the vertical, e.g. '/services/',
     a vertical keyword, or a non-generic suffix like '-analyzer.js') and
     reports it as a CANDIDATE ONLY -- it does NOT auto-patch on a fallback
     guess. A human confirms before that path is used.
  5. Never guess-writes. Every non-obvious case is reported, not patched.

Nothing is committed by this script. Review [PATCHED] files with
`node --check` (for JS) or manual diff before trusting them.
"""

import re
import os
import sys

# Known shared/platform engines that appear across many verticals and are
# NOT the per-vertical engine we want to anchor the widget on.
SHARED_ENGINE_DENYLIST = {
    "tsm-mission-engine.js",
    "tsm-autorun-engine.js",
    "tsm-memory-engine.js",
    "tsm-quality-score-engine.js",
    "tsm-decision-engine.js",
    "tsm-workflow-engine.js",
    "tsm-bnca-exposure-engine.js",
}

# Matches src="....something-engine.js" OR src="....something.engine.js",
# with or without a query string.
ENGINE_SRC_RE = re.compile(
    r'<script[^>]*\bsrc="([^"]*?([A-Za-z0-9_.-]+(?:-engine|\.engine)\.js))(?:\?[^"]*)?"[^>]*>\s*</script>'
)

SCRIPT_TAG_RE = re.compile(r'<script\b[^>]*>.*?</script>', re.DOTALL)

# Vertical-specific fallback hints: filename/path substrings that suggest
# a bespoke (non-shared) script even if it isn't named '*-engine.js'.
FALLBACK_HINTS = [
    "-analyzer.js", "-workflow.js", "-processor.js", "/services/",
]

VERTICALS = {
    "BPO":         "html/war-rooms/bpo-war/bpo-war-room.html",
    "Construction":"html/war-rooms/construct-war/construction-war-room.html",
    "Healthcare":  "html/war-rooms/health-war/hc-denial-war-room.html",
    "Insurance":   "html/war-rooms/insure-war/insurance-war-room.html",
    "Legal":       "html/war-rooms/legal-war/legal-war-room.html",
    "Real Estate": "html/war-rooms/re-war/re-war-room.html",
}

WIDGET_SNIPPET = '<script src="{widget_path}"></script>\n'


def find_engine_scripts(html):
    """Return list of (full_match_text, full_src, basename) for engine scripts."""
    results = []
    for m in ENGINE_SRC_RE.finditer(html):
        full_src, basename_with_ext = m.group(1), os.path.basename(m.group(2))
        results.append((m.group(0), full_src, basename_with_ext))
    return results


def find_fallback_candidate(html):
    """Look for a plausible vertical-specific non-engine script. Report only."""
    candidates = []
    for m in re.finditer(r'<script[^>]*\bsrc="([^"]+)"[^>]*>\s*</script>', html):
        src = m.group(1)
        base = os.path.basename(src.split("?")[0])
        if base in SHARED_ENGINE_DENYLIST:
            continue
        if any(hint in src for hint in FALLBACK_HINTS):
            candidates.append(src)
    return candidates


def process_file(vertical, path, widget_filename):
    if not os.path.exists(path):
        return ("SKIPPED", f"{path}: file not found")

    with open(path, "r", encoding="utf-8") as f:
        html = f.read()

    engine_matches = find_engine_scripts(html)
    non_shared = [em for em in engine_matches if em[2] not in SHARED_ENGINE_DENYLIST]

    if len(non_shared) == 1:
        full_tag, full_src, basename = non_shared[0]
        widget_dir = os.path.dirname(full_src)
        widget_path = f"{widget_dir}/{widget_filename}" if widget_dir else widget_filename
        insertion = full_tag + "\n" + WIDGET_SNIPPET.format(widget_path=widget_path)
        new_html = html.replace(full_tag, insertion, 1)

        out_path = path  # overwrite in place; caller can diff before trusting
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(new_html)

        return ("PATCHED", f"{path}: inserted widget after '{basename}'")

    if len(non_shared) > 1:
        names = ", ".join(em[2] for em in non_shared)
        return ("SKIPPED", f"{path}: found {len(non_shared)} non-shared engine "
                            f"candidates ({names}) -- ambiguous, needs a human pick")

    # zero non-shared engine matches -- look for a fallback candidate to report
    fallback = find_fallback_candidate(html)
    if fallback:
        names = ", ".join(fallback)
        return ("SKIPPED", f"{path}: no vertical-specific engine found, but "
                            f"possible fallback anchor(s): {names} -- "
                            f"confirm before patching, not auto-applied")

    shared_found = [em[2] for em in engine_matches]
    if shared_found:
        return ("SKIPPED", f"{path}: only shared platform engines found "
                            f"({', '.join(set(shared_found))}) -- no safe "
                            f"vertical-specific anchor, needs manual anchor choice")

    return ("SKIPPED", f"{path}: no engine-like script tags found at all -- "
                        f"needs manual inspection")


def main():
    widget_filename = "ai-widget.js"  # adjust to actual widget filename
    results = []
    for vertical, path in VERTICALS.items():
        status, detail = process_file(vertical, path, widget_filename)
        results.append((status, vertical, detail))

    print("=" * 70)
    print("AI WIDGET ROLLOUT RESULTS (v2)")
    print("=" * 70)
    patched = sum(1 for s, _, _ in results if s == "PATCHED")
    skipped = sum(1 for s, _, _ in results if s == "SKIPPED")
    for status, vertical, detail in results:
        print(f"[{status}] {vertical}: {detail}")
    print("=" * 70)
    print(f"{patched} patched, {skipped} skipped.")
    print("NOT committed. For each PATCHED file, run node --check / diff before trusting it.")
    print("SKIPPED verticals with a listed fallback candidate need a human decision,")
    print("not another automated guess.")


if __name__ == "__main__":
    main()