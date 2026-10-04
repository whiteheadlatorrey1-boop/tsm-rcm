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

# Fix 1: Strategist — carry serviceNow through the relay payload
patch(STRAT,
"""    recommendation: generatedRec,
    selectedScenario,
    caseId: warData?.caseId
  };""",
"""    recommendation: generatedRec,
    selectedScenario,
    caseId: warData?.caseId,
    serviceNow: warData?.serviceNow
  };""")

# Fix 2: Executive — incSevBadge reflects real state, not static RESOLVED
patch(EXEC,
"""function hydratePage(d) {
  const rec = d.recommendation || {};""",
"""function hydratePage(d) {
  const rec = d.recommendation || {};
  const isServiceNow = d?.serviceNow?.source === 'servicenow';
  document.getElementById('incSevBadge').textContent = isServiceNow ? '■ IN PROGRESS' : '■ RESOLVED';
  if (isServiceNow) {
    const memTab = document.getElementById('tsm-memory-tab');
    if (memTab) memTab.style.display = 'none';
    const memLayer = document.getElementById('tsmMemoryLayer');
    if (memLayer) memLayer.style.display = 'none';
  }""")

# Fix 3a: Executive — gate initial queue mount (page load)
patch(EXEC,
"""(function(){
  if (typeof TSMExceptionWidget !== 'undefined') {
    TSMExceptionWidget.mount('tsm-exception-queue', { sector: 'bpo' });
  }
  if (typeof TSMCaseWidget !== 'undefined') {
    // Unscoped (no sector filter) on purpose: this is BPO's internal
    // exec-portal ops view, and every vertical's exec portal already
    // syncs its exception-derived cases to the same server-side
    // bpo_cases collection (server/tsm-ledger-service.js) via
    // TSMCaseManager.createFromException() + syncToServer(). Filtering
    // to sector:'bpo' here silently hid every Construction/Healthcare/
    // Insurance/Legal/RE/Mortgage/Schools/FinOps case that had already
    // made it to the server — this is the single read point meant to
    // aggregate all of them for BPO ops.
    TSMCaseWidget.mount('tsm-case-queue', {});
  }""",
"""(function(){
  const tsmSnLiveCase = stratData?.serviceNow?.source === 'servicenow';
  if (tsmSnLiveCase) {
    const eqEl = document.getElementById('tsm-exception-queue');
    if (eqEl) eqEl.innerHTML = '<div style="color:var(--muted);font-family:\\'JetBrains Mono\\',monospace;font-size:.68rem">Hidden for live ServiceNow read-only case.</div>';
    const cqEl = document.getElementById('tsm-case-queue');
    if (cqEl) cqEl.innerHTML = '<div style="color:var(--muted);font-family:\\'JetBrains Mono\\',monospace;font-size:.68rem">Hidden for live ServiceNow read-only case.</div>';
  } else {
  if (typeof TSMExceptionWidget !== 'undefined') {
    TSMExceptionWidget.mount('tsm-exception-queue', { sector: 'bpo' });
  }
  if (typeof TSMCaseWidget !== 'undefined') {
    // Unscoped (no sector filter) on purpose: this is BPO's internal
    // exec-portal ops view, and every vertical's exec portal already
    // syncs its exception-derived cases to the same server-side
    // bpo_cases collection (server/tsm-ledger-service.js) via
    // TSMCaseManager.createFromException() + syncToServer(). Filtering
    // to sector:'bpo' here silently hid every Construction/Healthcare/
    // Insurance/Legal/RE/Mortgage/Schools/FinOps case that had already
    // made it to the server — this is the single read point meant to
    // aggregate all of them for BPO ops.
    TSMCaseWidget.mount('tsm-case-queue', {});
  }
  }""")

# Fix 3b: Executive — gate the re-mount after new case creation
patch(EXEC,
"""  if (typeof TSMExceptionWidget !== 'undefined') {
    TSMExceptionWidget.mount('tsm-exception-queue', { sector: 'bpo' });
  }
  if (typeof TSMCaseWidget !== 'undefined') {
    // Same unscoped re-mount as the initial mount above, so a freshly
    // fired BPO case re-renders alongside the other verticals' cases
    // instead of narrowing the view back down to sector:'bpo'.
    TSMCaseWidget.mount('tsm-case-queue', {});
  }
  return touchedCases;""",
"""  if (!(stratData?.serviceNow?.source === 'servicenow')) {
  if (typeof TSMExceptionWidget !== 'undefined') {
    TSMExceptionWidget.mount('tsm-exception-queue', { sector: 'bpo' });
  }
  if (typeof TSMCaseWidget !== 'undefined') {
    // Same unscoped re-mount as the initial mount above, so a freshly
    // fired BPO case re-renders alongside the other verticals' cases
    // instead of narrowing the view back down to sector:'bpo'.
    TSMCaseWidget.mount('tsm-case-queue', {});
  }
  }
  return touchedCases;""")

print("ALL PATCHES APPLIED")
