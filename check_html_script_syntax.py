#!/usr/bin/env python3
"""
check_html_script_syntax.py
Extracts <script>...</script> block contents (inline JS only, skips
src= script tags) from an HTML file and runs `node --check` on each,
since `node -c` can't parse a full HTML document directly.

Usage:
    python3 check_html_script_syntax.py file.html
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 check_html_script_syntax.py file.html")
        sys.exit(1)

    path = Path(sys.argv[1])
    text = path.read_text(encoding="utf-8")

    scripts = re.findall(r"<script(?:\s+[^>]*)?>(.*?)</script>", text, re.DOTALL | re.IGNORECASE)
    # Filter out script tags that only had a src attribute (empty body, external)
    inline_scripts = [s for s in scripts if s.strip()]

    if not inline_scripts:
        print(f"{path}: no inline <script> blocks found")
        return

    ok = True
    for i, script in enumerate(inline_scripts):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False) as f:
            f.write(script)
            tmp_path = f.name
        result = subprocess.run(["node", "--check", tmp_path], capture_output=True, text=True)
        if result.returncode != 0:
            ok = False
            print(f"{path} [script block {i+1}/{len(inline_scripts)}]: SYNTAX ERROR")
            print(result.stderr)
        else:
            print(f"{path} [script block {i+1}/{len(inline_scripts)}]: OK")

    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    main()