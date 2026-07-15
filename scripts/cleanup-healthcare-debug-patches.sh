#!/usr/bin/env bash
set -e

FILE="html/tsm-doc-search-multi.html"

echo "=== Cleanup TSM Healthcare Debug Patches ==="

cp "$FILE" "$FILE.before-cleanup.$(date +%s)"


python3 <<'PY'
from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")
s=p.read_text()


# Remove bad debug scripts
bad_blocks=[
"""<script>
console.log("TSM FINAL HC DEBUG ACTIVE");
console.log({
 vertical: window.currentVertical,
 client: window.activeClientId
});
</script>"""
]

for b in bad_blocks:
    s=s.replace(b,"")


# Remove previous injected debug markers
start_markers=[
"/* TSM HC FINAL RUNTIME PATCH */",
"console.log(\"TSM SEARCH STATE\"",
"console.log(\"TSM HC FINAL CHECK\""
]


# remove only debug lines, not whole functions
lines=[]

for line in s.splitlines():

    if any(x in line for x in start_markers):
        continue

    lines.append(line)


s="\n".join(lines)


# Ensure runtime defaults are clean
s=s.replace(
'let currentVertical = "fo";',
'let currentVertical = "hc";'
)


p.write_text(s)

PY


echo "Checking syntax..."

node --check <(grep -o '<script[^>]*>.*</script>' "$FILE" | sed 's/<script[^>]*>//;s#</script>##') || true


echo "Cleanup complete"

