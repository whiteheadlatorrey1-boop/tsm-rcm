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
"""  function buildKPIs(relay, vertical) {
    const kpis = {""",
"""  function buildKPIs(relay, vertical) {
    if (relay?.serviceNow?.source === 'servicenow') {
      return [
        { label: 'SLA Breach Risk', value: 'NOT STATED IN SOURCE DATA', trend: [], color: 'var(--tsm-muted)', unit: '' },
        { label: 'Volume Backlog',  value: 'NOT STATED IN SOURCE DATA', trend: [], color: 'var(--tsm-muted)', unit: '' },
      ];
    }
    const kpis = {""")

print("ALL PATCHES APPLIED")
