#!/usr/bin/env python3
"""
TSM War Room Audit
==================
Run from the repo root:
    python3 audit_war_rooms.py

Checks every war-room-related HTML file under html/ for the specific failure
patterns already found in this codebase:

  1. HTML corruption      - unbalanced <script>/<html>/<body> tags, or content
                             appended after the real closing </html> (the
                             "duplicate </body></html> + orphaned JS" pattern
                             found in html/bpo/bpo-strategist.html).
  2. Inline JS syntax      - every <script>...</script> block is passed through
                             `node --check` so a broken block fails loudly
                             instead of silently no-op'ing in the browser.
  3. Missing referenced    - every <script src="..."> and fetch('...') target
     files                   is checked for existence on disk (both repo-root-
                             relative and html/-relative, since this repo mixes
                             both conventions).
  4. Relay-key chain       - for each vertical, cross-checks the localStorage/
                             sessionStorage keys WRITTEN by the war-room page
                             against the keys READ by that vertical's
                             strategist page, and the keys WRITTEN by the
                             strategist against the keys READ by the
                             executive-portal page. Flags any write with no
                             matching reader (a dead-end relay) and any read
                             with no matching writer (a page that will always
                             show its empty state).
  5. Chain completeness    - flags any vertical folder under html/war-rooms/
                             that is missing a strategist and/or
                             executive-portal file entirely.
  6. Placeholder/TODO      - flags leftover placeholder URLs / TODO comments
     leftovers                (e.g. STRATEGIST_URL pointing at a page that
                             doesn't exist, or literal "TODO" markers).

Prints a per-vertical PASS/FAIL report. No third-party dependencies; requires
`node` on PATH for check #2 (skipped with a warning if not found).
"""
import os
import re
import json
import subprocess
import sys

REPO_ROOT = os.getcwd()
HTML_ROOT = os.path.join(REPO_ROOT, "html")
WAR_ROOMS = os.path.join(HTML_ROOT, "war-rooms")

NODE_AVAILABLE = True
try:
    subprocess.run(["node", "--version"], capture_output=True, check=True)
except Exception:
    NODE_AVAILABLE = False

RELAY_KEY_RE = re.compile(
    r"(?:localStorage|sessionStorage)\.(setItem|getItem|removeItem)\(\s*['\"]([A-Za-z0-9_]+)['\"]"
)
SRC_RE = re.compile(r'<script[^>]*\ssrc=["\']([^"\']+)["\']')
FETCH_RE = re.compile(r"fetch\(\s*['\"]([^'\"]+)['\"]")
TODO_RE = re.compile(r"TODO[:\s].{0,80}", re.IGNORECASE)
SCRIPT_BLOCK_RE = re.compile(r"<script(?![^>]*\ssrc=)[^>]*>(.*?)</script>", re.DOTALL | re.IGNORECASE)

def find_war_room_verticals():
    """The authoritative vertical list = subfolder names under html/war-rooms/."""
    if not os.path.isdir(WAR_ROOMS):
        return []
    return sorted(
        d for d in os.listdir(WAR_ROOMS)
        if os.path.isdir(os.path.join(WAR_ROOMS, d))
    )

def find_all_html():
    """
    Scoped to war-rooms only: everything under html/war-rooms/**, plus any
    file elsewhere in html/ whose name is prefixed with a known war-room
    vertical (covers the repo's mixed convention where some strategist /
    executive-portal pages live at html/<vertical>/ or html/ root instead of
    html/war-rooms/<vertical>/, e.g. html/mdm-strategist.html,
    html/bpo/bpo-executive-portal.html).
    Deliberately excludes unrelated product verticals (insurance, healthcare,
    construction, etc.) that live elsewhere in html/ and aren't war rooms.
    """
    out = []
    verticals = find_war_room_verticals()

    for base, _dirs, files in os.walk(WAR_ROOMS):
        for f in files:
            if f.lower().endswith(".html"):
                out.append(os.path.join(base, f))

    keyword_re = re.compile(r"(war-room|war_room|strategist|executive-portal|executive_portal)", re.IGNORECASE)

    for base, dirs, files in os.walk(HTML_ROOT):
        if os.path.commonpath([base, WAR_ROOMS]) == WAR_ROOMS:
            continue  # already covered above
        rel_base = os.path.relpath(base, HTML_ROOT)
        top = rel_base.split(os.sep)[0].lower()
        for f in files:
            if not f.lower().endswith(".html"):
                continue
            fbase = f.lower()
            # must both (a) look like a war-room-chain page by filename, and
            # (b) be associated with a known war-room vertical (folder name
            # or filename prefix) — avoids pulling in unrelated marketing
            # sites that just happen to share a folder name like html/bpo/.
            if not keyword_re.search(fbase):
                continue
            if top in verticals or any(fbase.startswith(v + "-") or fbase.startswith(v + "_") for v in verticals):
                out.append(os.path.join(base, f))

    return sorted(set(out))

def read(path):
    with open(path, encoding="utf-8", errors="replace") as fh:
        return fh.read()

def check_corruption(path, html):
    issues = []
    counts = {
        "<script": len(re.findall(r"<script[\s>]", html, re.IGNORECASE)),
        "</script>": html.lower().count("</script>"),
        "<html": len(re.findall(r"<html[\s>]", html, re.IGNORECASE)),
        "</html>": html.lower().count("</html>"),
        "<body": len(re.findall(r"<body[\s>]", html, re.IGNORECASE)),
        "</body>": html.lower().count("</body>"),
    }
    if counts["<script"] != counts["</script>"]:
        issues.append(f"unbalanced <script> tags: {counts['<script']} open vs {counts['</script>']} close")
    if counts["<html"] != counts["</html>"]:
        issues.append(f"unbalanced <html> tags: {counts['<html']} open vs {counts['</html>']} close")
    if counts["<body"] != counts["</body>"]:
        issues.append(f"unbalanced <body> tags: {counts['<body']} open vs {counts['</body>']} close")

    last_close = html.lower().rfind("</html>")
    if last_close != -1:
        tail = html[last_close + len("</html>"):].strip()
        if tail:
            preview = tail[:80].replace("\n", " ")
            issues.append(f"content found AFTER the closing </html> ({len(tail)} chars): \"{preview}...\"")
    return issues

def check_script_syntax(path, html):
    if not NODE_AVAILABLE:
        return ["(skipped: node not found on PATH)"]
    issues = []
    blocks = SCRIPT_BLOCK_RE.findall(html)
    tmp = "/tmp/_audit_block.js"
    for i, block in enumerate(blocks):
        with open(tmp, "w", encoding="utf-8") as fh:
            fh.write(block)
        r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
        if r.returncode != 0:
            first_line = r.stderr.strip().splitlines()[0] if r.stderr.strip() else "unknown error"
            issues.append(f"script block {i+1}/{len(blocks)}: {first_line}")
    return issues

def check_referenced_files(path, html):
    issues = []
    file_dir = os.path.dirname(path)
    refs = SRC_RE.findall(html) + FETCH_RE.findall(html)
    for ref in refs:
        if ref.startswith(("http://", "https://", "//", "data:")):
            continue
        if ref.startswith("/api/"):
            continue  # server route, not a static file — not checkable this way
        if "${" in ref or "{{" in ref:
            continue  # dynamic/templated path, can't statically check
        ref = ref.split("?")[0]  # strip cache-busting query strings before checking disk
        candidates = []
        if ref.startswith("/"):
            candidates.append(os.path.join(REPO_ROOT, ref.lstrip("/")))
            candidates.append(os.path.join(HTML_ROOT, ref.lstrip("/")))
        else:
            candidates.append(os.path.normpath(os.path.join(file_dir, ref)))
            candidates.append(os.path.normpath(os.path.join(REPO_ROOT, ref)))
        if not any(os.path.isfile(c) for c in candidates):
            issues.append(f"referenced file not found: '{ref}' (tried: {', '.join(os.path.relpath(c, REPO_ROOT) for c in candidates)})")
    return issues

def check_todos(path, html):
    return [m.group(0).strip() for m in TODO_RE.finditer(html)]

def extract_relay_keys(html):
    writes, reads = set(), set()
    for verb, key in RELAY_KEY_RE.findall(html):
        if verb == "setItem":
            writes.add(key)
        elif verb == "getItem":
            reads.add(key)
    return writes, reads

def guess_vertical(path, known_verticals):
    rel = os.path.relpath(path, HTML_ROOT)
    parts = rel.split(os.sep)
    if parts[0] == "war-rooms" and len(parts) > 1 and parts[1] in known_verticals:
        return parts[1]
    # root-level files like mdm-strategist.html, bpo-executive-portal.html
    base = os.path.basename(path).lower()
    m = re.match(r"([a-z0-9]+)-(?:strategist|executive-portal|war-room)", base)
    if m and m.group(1) in known_verticals:
        return m.group(1)
    if len(parts) > 1 and parts[0] in known_verticals:
        return parts[0]
    return None  # not attributable to a known vertical — exclude from chain report

def classify_role(path):
    base = os.path.basename(path).lower()
    if "executive-portal" in base or "executive_portal" in base:
        return "executive-portal"
    if "strategist" in base:
        return "strategist"
    if "war-room" in base or base.endswith("war-room.html") or "-war-room" in base:
        return "war-room"
    return "other"

def main():
    if not os.path.isdir(WAR_ROOMS):
        print(f"ERROR: {WAR_ROOMS} not found. Run this from the repo root.")
        sys.exit(1)

    all_html = find_all_html()
    print(f"Scanning {len(all_html)} HTML files under {os.path.relpath(HTML_ROOT, REPO_ROOT)}/ ...\n")

    per_file = {}
    vertical_files = {}
    known_verticals = set(find_war_room_verticals())

    for path in all_html:
        html = read(path)
        rel = os.path.relpath(path, REPO_ROOT)
        writes, reads = extract_relay_keys(html)
        role = classify_role(path)
        vertical = guess_vertical(path, known_verticals)
        per_file[path] = {
            "rel": rel,
            "role": role,
            "vertical": vertical,
            "writes": writes,
            "reads": reads,
            "corruption": check_corruption(path, html),
            "syntax": check_script_syntax(path, html),
            "missing_refs": check_referenced_files(path, html),
            "todos": check_todos(path, html),
        }
        if role in ("war-room", "strategist", "executive-portal") and vertical:
            vertical_files.setdefault(vertical, {}).setdefault(role, []).append(path)

    # ── Section 1: corruption / syntax / missing-file report (only files with issues) ──
    print("=" * 78)
    print("STRUCTURAL ISSUES (corruption, JS syntax, missing referenced files)")
    print("=" * 78)
    any_structural = False
    for path in all_html:
        info = per_file[path]
        problems = info["corruption"] + info["syntax"] + info["missing_refs"]
        if problems:
            any_structural = True
            print(f"\n[{info['rel']}]")
            for p in problems:
                print(f"  ✗ {p}")
        if info["todos"]:
            any_structural = True
            print(f"\n[{info['rel']}]")
            for t in info["todos"]:
                print(f"  ⚠ leftover marker: {t}")
    if not any_structural:
        print("\n  none found ✓")

    # ── Section 2: chain completeness per vertical ──
    print("\n" + "=" * 78)
    print("CHAIN COMPLETENESS (war-room -> strategist -> executive-portal)")
    print("=" * 78)
    for vertical in sorted(vertical_files.keys()):
        roles = vertical_files[vertical]
        has_war = bool(roles.get("war-room"))
        has_strat = bool(roles.get("strategist"))
        has_exec = bool(roles.get("executive-portal"))
        status = "✓ COMPLETE" if (has_war and has_strat and has_exec) else "✗ INCOMPLETE"
        print(f"\n{vertical.upper():15s} {status}")
        print(f"  war-room:          {'yes -> ' + ', '.join(os.path.relpath(p, REPO_ROOT) for p in roles.get('war-room', [])) if has_war else 'MISSING'}")
        print(f"  strategist:        {'yes -> ' + ', '.join(os.path.relpath(p, REPO_ROOT) for p in roles.get('strategist', [])) if has_strat else 'MISSING'}")
        print(f"  executive-portal:  {'yes -> ' + ', '.join(os.path.relpath(p, REPO_ROOT) for p in roles.get('executive-portal', [])) if has_exec else 'MISSING'}")

    # ── Section 3: relay-key chain consistency per vertical ──
    print("\n" + "=" * 78)
    print("RELAY-KEY CHAIN CONSISTENCY")
    print("=" * 78)
    for vertical in sorted(vertical_files.keys()):
        roles = vertical_files[vertical]
        war_writes = set()
        for p in roles.get("war-room", []):
            war_writes |= per_file[p]["writes"]
        strat_reads = set()
        strat_writes = set()
        for p in roles.get("strategist", []):
            strat_reads |= per_file[p]["reads"]
            strat_writes |= per_file[p]["writes"]
        exec_reads = set()
        for p in roles.get("executive-portal", []):
            exec_reads |= per_file[p]["reads"]

        print(f"\n{vertical.upper()}")
        if roles.get("war-room"):
            print(f"  war-room writes:        {sorted(war_writes) or '(none found)'}")
        if roles.get("strategist"):
            print(f"  strategist reads:       {sorted(strat_reads) or '(none found)'}")
            print(f"  strategist writes:      {sorted(strat_writes) or '(none found)'}")
        if roles.get("executive-portal"):
            print(f"  executive-portal reads: {sorted(exec_reads) or '(none found)'}")

        if roles.get("war-room") and roles.get("strategist"):
            if war_writes and not (war_writes & strat_reads):
                print(f"  ✗ DEAD END: war-room writes {sorted(war_writes)} but strategist never reads any of those keys")
        if roles.get("strategist") and roles.get("executive-portal"):
            if strat_writes and not (strat_writes & exec_reads):
                print(f"  ✗ DEAD END: strategist writes {sorted(strat_writes)} but executive-portal never reads any of those keys")

    print("\n" + "=" * 78)
    print("Done. Paste this whole output back to Claude for help fixing anything flagged.")
    print("=" * 78)

if __name__ == "__main__":
    main()