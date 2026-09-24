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

STRAT = "html/war-rooms/bpo-war/bpo-strategist.html"
EXEC  = "html/war-rooms/bpo-war/bpo-executive-portal.html"

# Executive: remove the premature hide attempt from hydratePage (elements
# don't exist yet — memory-engine builds them on DOMContentLoaded, which
# fires after this synchronous inline script runs), replace with a
# deferred hide that runs after the widget's own DOMContentLoaded handler.
patch(EXEC,
"""function hydratePage(d) {
  const rec = d.recommendation || {};
  const isServiceNow = d?.serviceNow?.source === 'servicenow';
  document.getElementById('incSevBadge').textContent = isServiceNow ? '■ IN PROGRESS' : '■ RESOLVED';
  if (isServiceNow) {
    const memTab = document.getElementById('tsm-memory-tab');
    if (memTab) memTab.style.display = 'none';
    const memLayer = document.getElementById('tsmMemoryLayer');
    if (memLayer) memLayer.style.display = 'none';
  }""",
"""function hydratePage(d) {
  const rec = d.recommendation || {};
  const isServiceNow = d?.serviceNow?.source === 'servicenow';
  document.getElementById('incSevBadge').textContent = isServiceNow ? '■ IN PROGRESS' : '■ RESOLVED';
  if (isServiceNow) {
    window.tsmSnHideMemoryPanel = true;
    document.addEventListener('DOMContentLoaded', function() {
      const memTab = document.getElementById('tsm-memory-tab');
      if (memTab) memTab.remove();
      const memLayer = document.getElementById('tsmMemoryLayer');
      if (memLayer) memLayer.remove();
    });
  }""")

# Strategist: memory-engine is also mounted here (line 230 script tag) with
# no ServiceNow guard at all. Add the same deferred-hide, keyed off
# warData.serviceNow — mirroring the pattern above.
patch(STRAT,
"""  <script src="/html/shared/tsm-memory-engine.js"></script>""",
"""  <script src="/html/shared/tsm-memory-engine.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      if (typeof warData !== 'undefined' && warData?.serviceNow?.source === 'servicenow') {
        const memTab = document.getElementById('tsm-memory-tab');
        if (memTab) memTab.remove();
        const memLayer = document.getElementById('tsmMemoryLayer');
        if (memLayer) memLayer.remove();
      }
    });
  </script>""")

print("ALL PATCHES APPLIED")
