import sys

def patch(path, old, new, expect=1):
    with open(path, 'r') as f:
        content = f.read()
    count = content.count(old)
    if count != expect:
        print(f"ABORT: {path} — expected {expect} match(es), found {count}", file=sys.stderr)
        print("----- anchor text -----", file=sys.stderr)
        print(old, file=sys.stderr)
        sys.exit(1)
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print(f"OK: {path} — patched ({count} match)")

F = "html/shared/tsm-exec-portal-upgrade.js"

patch(F,
"""  function buildDecisionItems(relay, vertical) {
    const defaults = {""",
"""  function buildDecisionItems(relay, vertical) {
    if (relay?.serviceNow?.source === 'servicenow') return [];
    const defaults = {""")

print("ALL PATCHES APPLIED")
