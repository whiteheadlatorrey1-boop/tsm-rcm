#!/usr/bin/env python3
import os

REPO = os.path.dirname(os.path.abspath(__file__))

def apply_legal():
    path = f"{REPO}/html/legal-main-strategist.html"
    with open(path) as f:
        content = f.read()
    anchor = "    sessionStorage.setItem('TSM_STRATEGIST_RELAY', JSON.stringify(payload));\n  } catch(err) { console.warn('Relay write error:', err); }"
    assert content.count(anchor) == 1, "legal: relay-write anchor not found exactly once"
    injection = anchor + """
    // ── SENTINEL PUSH ──────────────────────────────────────────────────
    // Reuses the payload object already built above -- no invented numbers.
    try {
      function legalSeverityForRisk(score){
        const s = parseFloat(score) || 0;
        if (s >= 75) return 'critical';
        if (s >= 50) return 'high';
        if (s >= 25) return 'moderate';
        return 'low';
      }
      const legalAnomaly = {
        id: 'legal-' + Date.now(),
        vertical: 'Legal',
        title: 'Legal Strategist Synthesis',
        severity: legalSeverityForRisk(payload.riskScore),
        riskScore: payload.riskScore,
        winProb: payload.winProb,
        settleRange: payload.settleRange,
        summary: payload.synthesisText,
        engines: payload.enginesCount,
        timestamp: new Date().toISOString()
      };
      const legalRelay = { anomalies: [legalAnomaly], source: 'legal-main-strategist', ts: Date.now() };
      sessionStorage.setItem('TSM_LEGAL_STRATEGIST_RELAY', JSON.stringify(legalRelay));
      localStorage.setItem('tsm_legal_strategist_relay', JSON.stringify(legalRelay));
      window.dispatchEvent(new Event('TSM_SENTINEL_REFRESH'));
    } catch(e) {}"""
    new_content = content.replace(anchor, injection, 1)
    assert new_content != content, "legal: injection did not change content"
    with open(path, "w") as f:
        f.write(new_content)
    print("legal-main-strategist.html patched")


def apply_finops():
    path = f"{REPO}/html/finops-main-strategist.html"
    with open(path) as f:
        content = f.read()
    anchor = """    localStorage.setItem('tsm_strategist_relay', JSON.stringify({
      summary: _txt,
      source: relaySource,
      timestamp: Date.now(),
      exposure: _expM ? _expM[1] : '$91,800\u2013$112,200',
      riskScore: _riskM ? _riskM[1] : '70/100',
      duplicatePayments: _dupM ? _dupM[1] : null,
      unapprovedVendors: _vendM ? _vendM[1] : null,
      missingPO: _poM ? _poM[1] : null,
      exceptions: _excM ? _excM[1] : null,
      compliance: _compM ? _compM[1].trim().slice(0,12) : null
    }));"""
    assert content.count(anchor) == 1, "finops: relay-write anchor not found exactly once"
    injection = anchor + """
      // ── SENTINEL PUSH ──────────────────────────────────────────────────
      // Reuses the same parsed values (_expM/_riskM/etc.) already computed above.
      try {
        function finSeverityForRisk(str){
          const n = parseInt(str, 10) || 0;
          if (n >= 80) return 'critical';
          if (n >= 60) return 'high';
          if (n >= 40) return 'moderate';
          return 'low';
        }
        const finRiskStr = _riskM ? _riskM[1] : '70/100';
        const finAnomaly = {
          id: 'finops-' + Date.now(),
          vertical: 'FinOps',
          title: 'FinOps Strategist Synthesis',
          severity: finSeverityForRisk(finRiskStr),
          riskScore: finRiskStr,
          exposure: _expM ? _expM[1] : '$91,800\u2013$112,200',
          duplicatePayments: _dupM ? _dupM[1] : null,
          unapprovedVendors: _vendM ? _vendM[1] : null,
          missingPO: _poM ? _poM[1] : null,
          exceptions: _excM ? _excM[1] : null,
          summary: _txt,
          timestamp: new Date().toISOString()
        };
        const finRelay = { anomalies: [finAnomaly], source: 'finops-main-strategist', ts: Date.now() };
        sessionStorage.setItem('TSM_FINOPS_STRATEGIST_RELAY', JSON.stringify(finRelay));
        localStorage.setItem('tsm_finops_strategist_relay', JSON.stringify(finRelay));
        window.dispatchEvent(new Event('TSM_SENTINEL_REFRESH'));
      } catch(e) {}"""
    new_content = content.replace(anchor, injection, 1)
    assert new_content != content, "finops: injection did not change content"
    with open(path, "w") as f:
        f.write(new_content)
    print("finops-main-strategist.html patched")


if __name__ == "__main__":
    apply_legal()
    apply_finops()
    print("Legal + FinOps patched successfully")
