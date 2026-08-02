#!/usr/bin/env python3
"""
apply_groq_retry.py

Wires groq-retry.js's callGroqWithRetry() into tsmGroqComplete() in server.js.

Safety model:
  - Dry-run by default (prints the diff, writes nothing). Pass --apply to write.
  - Asserts tsmGroqComplete exists and contains exactly ONE call site touching
    api.groq.com. If it finds zero or more than one, it stops and prints what
    it found instead of guessing which call to wrap.
  - Idempotent: if callGroqWithRetry is already present in the target function,
    it exits cleanly with no changes.
  - Takes a .bak backup of server.js before writing.
  - Runs `node --check` on the patched file before keeping the change; on
    failure it restores the .bak and exits non-zero.

Usage:
  python3 apply_groq_retry.py [--file server.js] [--apply]

If this fails to find the call site (most likely outcome if the source
doesn't match a plain `fetch(...)` shape — e.g. axios, a wrapped http
client, or a helper function), paste the actual tsmGroqComplete source
and this gets built from the real code instead of a guess.
"""

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path


def find_function_block(source: str, fn_name: str):
    """Find `function fn_name(...) { ... }` or `async function fn_name(...) { ... }`
    (also matches `const fn_name = async (...) => {`), return (start, end) char
    offsets of the block including braces, or None if not found / not balanced.
    """
    pattern = re.compile(
        rf'(async\s+function\s+{fn_name}\s*\([^)]*\)\s*\{{'
        rf'|function\s+{fn_name}\s*\([^)]*\)\s*\{{'
        rf'|const\s+{fn_name}\s*=\s*async\s*\([^)]*\)\s*=>\s*\{{'
        rf'|const\s+{fn_name}\s*=\s*\([^)]*\)\s*=>\s*\{{)'
    )
    m = pattern.search(source)
    if not m:
        return None

    brace_start = source.index('{', m.start())
    depth = 0
    i = brace_start
    while i < len(source):
        if source[i] == '{':
            depth += 1
        elif source[i] == '}':
            depth -= 1
            if depth == 0:
                return (m.start(), i + 1)
        i += 1
    return None  # unbalanced braces — bail out, don't guess


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--file', default='server.js', help='Path to the server file (default: server.js)')
    ap.add_argument('--apply', action='store_true', help='Write changes (default is dry-run)')
    ap.add_argument('--fn', default='tsmGroqComplete', help='Function name to patch (default: tsmGroqComplete)')
    args = ap.parse_args()

    target = Path(args.file)
    assert target.exists(), f"ABORT: {target} not found. Run this from the repo root, or pass --file <path>."

    source = target.read_text()

    # --- Idempotency check ---
    if 'callGroqWithRetry' in source:
        print(f"NO-OP: 'callGroqWithRetry' already present in {target} — nothing to do.")
        sys.exit(0)

    # --- Locate the target function ---
    block = find_function_block(source, args.fn)
    assert block is not None, (
        f"ABORT: could not find a balanced `{args.fn}` function block in {target}. "
        f"Paste the actual source instead — this needs to match real code, not a guessed shape."
    )
    start, end = block
    fn_body = source[start:end]

    # --- Locate exactly one Groq call site inside the function ---
    # Look for the line(s) referencing api.groq.com, then walk outward to find
    # the enclosing `fetch(...)` or `axios...(...)` call expression.
    groq_refs = [m.start() for m in re.finditer(r'api\.groq\.com', fn_body)]
    assert len(groq_refs) == 1, (
        f"ABORT: expected exactly 1 reference to api.groq.com inside {args.fn}(), "
        f"found {len(groq_refs)}. Found context(s):\n" +
        "\n---\n".join(fn_body[max(0, r-120):r+120] for r in groq_refs) +
        "\n\nThis script won't guess which one to wrap — paste the real source instead."
    )

    call_pattern = re.compile(r'(await\s+)?(fetch|axios(?:\.\w+)?)\s*\(')
    call_matches = list(call_pattern.finditer(fn_body))
    assert len(call_matches) >= 1, (
        f"ABORT: found api.groq.com in {args.fn}() but no recognizable fetch(...)/axios(...) "
        f"call near it. This likely means a different HTTP client shape — paste the real "
        f"source and this gets written against it directly."
    )
    # Prefer the call match closest to (and before) the groq_refs offset — i.e. the
    # call expression whose body actually contains the api.groq.com URL.
    groq_offset = groq_refs[0]
    candidates = [m for m in call_matches if m.start() < groq_offset]
    assert len(candidates) == 1, (
        f"ABORT: could not unambiguously identify the single call expression wrapping "
        f"api.groq.com (found {len(candidates)} candidate call sites before it). "
        f"Paste the real source instead of relying on this heuristic."
    )
    call_match = candidates[0]

    # Find the matching closing paren for this call, by depth-counting from call_match.end()-1
    depth = 0
    i = call_match.end() - 1  # position of the opening '('
    while i < len(fn_body):
        if fn_body[i] == '(':
            depth += 1
        elif fn_body[i] == ')':
            depth -= 1
            if depth == 0:
                call_end = i + 1
                break
        i += 1
    else:
        raise AssertionError("ABORT: unbalanced parens locating the fetch/axios call — paste real source.")

    call_start = call_match.start(2)  # start of `fetch` / `axios...` (skip any leading `await `)
    original_call = fn_body[call_start:call_end]
    had_await = call_match.group(1) is not None

    wrapped_call = f"callGroqWithRetry(() => {original_call})"
    new_fn_body = fn_body[:call_start] + wrapped_call + fn_body[call_end:]
    if not had_await:
        # callGroqWithRetry is async — the call site must await it even if the
        # original call wasn't awaited (unlikely, but don't silently change behavior
        # without flagging it).
        print("NOTE: original call site had no `await` — callGroqWithRetry is async, "
              "review the patched output carefully before applying.", file=sys.stderr)

    new_source = source[:start] + new_fn_body + source[end:]

    # --- Add the require, right after the last existing top-of-file require/import ---
    require_line = "const { callGroqWithRetry } = require('./groq-retry');\n"
    require_block_matches = list(re.finditer(r"^(?:const|let|var)\s+.*require\([^)]*\)\s*;?\s*$", new_source, re.MULTILINE))
    if require_block_matches:
        insert_at = require_block_matches[-1].end()
        new_source = new_source[:insert_at] + "\n" + require_line.rstrip('\n') + new_source[insert_at:]
    else:
        new_source = require_line + new_source

    diff_preview_old = fn_body
    diff_preview_new = new_fn_body
    print("=" * 70)
    print(f"PATCHING {args.fn}() in {target}")
    print("=" * 70)
    print("--- before (call site) ---")
    print(fn_body[max(0, call_start-80):call_start] + ">>>" + original_call + "<<<" + fn_body[call_end:call_end+80])
    print("--- after (call site) ---")
    print(new_fn_body[max(0, call_start-80):call_start] + ">>>" + wrapped_call + "<<<" + new_fn_body[call_start+len(wrapped_call):call_start+len(wrapped_call)+80])
    print("=" * 70)

    if not args.apply:
        print("DRY RUN — no files written. Re-run with --apply to write changes.")
        sys.exit(0)

    # --- Backup, write, validate ---
    backup = target.with_suffix(target.suffix + '.bak')
    shutil.copy2(target, backup)
    print(f"Backed up {target} -> {backup}")

    target.write_text(new_source)
    print(f"Wrote {target}")

    check = subprocess.run(['node', '--check', str(target)], capture_output=True, text=True)
    if check.returncode != 0:
        print("node --check FAILED — restoring backup.", file=sys.stderr)
        print(check.stderr, file=sys.stderr)
        shutil.copy2(backup, target)
        sys.exit(1)

    print("node --check passed. Also confirm groq-retry.js is in the same directory as", target)
    print("Done.")


if __name__ == '__main__':
    main()