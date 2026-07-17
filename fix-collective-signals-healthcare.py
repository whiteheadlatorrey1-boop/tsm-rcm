#!/usr/bin/env python3
"""
Batch 3 (final): wires Healthcare into the Collective BNCA cross-vertical queue.

Healthcare has no CFG-driven engine.buildRelayPayload() pattern like the other
verticals -- the war room (hc-denial-war-room.html) has a dead, never-called
tsmWriteRelay() stub. The REAL signal origination point is hc-main-strategist.html,
which builds `kpi` (totalAtRisk, denialRate), `bnca` (revenuePosition, denialIntel,
strategistSummary), `decisions` (urgency/action/value/deadline), and `urgent`
(string array) before writing TSM_EXEC_RELAY. This patch hooks in right after
that relay write, using only those already-computed fields.

Idempotent: skips if the collective/signal push is already present.
"""
import shutil

REPO = "."
path = f"{REPO}/html/healthcare/hc-main-strategist.html"

OLD = """    sessionStorage.setItem('TSM_EXEC_RELAY', JSON.stringify(payload));
    localStorage.setItem('TSM_EXEC_RELAY', JSON.stringify(payload));
    fireCapabilitySweep_HEALTHCARE(payload);"""

NEW = """    sessionStorage.setItem('TSM_EXEC_RELAY', JSON.stringify(payload));
    localStorage.setItem('TSM_EXEC_RELAY', JSON.stringify(payload));
    try {
      const hasEscalation = decisions.some(d => d.urgency === 'ESCALATE' || d.urgency === 'SIGN NOW');
      const riskLevel = urgent.length > 0 ? 'HIGH' : (hasEscalation ? 'WATCH' : 'READY');
      fetch('/api/collective/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: 'healthcare', warRoom: 'HC Main Strategist',
          bnca: bnca.strategistSummary || bnca.revenuePosition || 'Healthcare revenue-cycle analysis complete.',
          riskLevel, confidence: 75,
          topIssue: urgent[0] || (decisions[0] && decisions[0].action) || 'Revenue cycle nominal',
          ownerLanes: ['HC Billing', 'HC Compliance'],
          hitlRequired: riskLevel !== 'READY',
          actions: decisions.slice(0, 3).map(d => d.action),
          kpi: { 'Revenue at Risk': kpi.totalAtRisk || '—', 'Denial Rate': kpi.denialRate || '—' },
          source: 'hc-main-strategist'
        })
      }).catch(() => {});
    } catch (e) { console.warn('Collective signal push failed', e); }
    fireCapabilitySweep_HEALTHCARE(payload);"""

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

if "/api/collective/signal" in content:
    print("SKIP: healthcare -- already wired")
else:
    count = content.count(OLD)
    assert count == 1, f"FAIL: healthcare -- expected 1 match for anchor, found {count}"
    shutil.copy(path, path + ".bak")
    content = content.replace(OLD, NEW, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK: healthcare -- collective signal push added, backup at {path}.bak")

print("=== Done: batch 3 (Healthcare) wired ===")