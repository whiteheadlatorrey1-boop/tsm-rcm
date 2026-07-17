#!/usr/bin/env python3
"""
Batch 2: wires Mortgage, NOC, Integration Hub, and MDM into the Collective BNCA
cross-vertical queue (/api/collective/signal). Same approach as batch 1 — every
field pulled into the signal push already exists in that file's own
computeKpis()/buildRelayPayload() output; nothing invented.
Idempotent: skips a file if the collective/signal push is already present.
"""
import shutil

REPO = "."

def patch(path, old, new, label):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    if "/api/collective/signal" in content:
        print(f"SKIP: {label} -- already wired")
        return
    count = content.count(old)
    assert count == 1, f"FAIL: {label} -- expected 1 match for anchor, found {count}"
    shutil.copy(path, path + ".bak")
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK: {label} -- collective signal push added, backup at {path}.bak")


# ── MORTGAGE ─────────────────────────────────────────────────────────────────
patch(
    f"{REPO}/html/war-rooms/mortgage/mortgage-war-room.html",
    '''    try {
      localStorage.setItem('TSM_MORTGAGE_STRATEGIST_RELAY', JSON.stringify(payload));
      if (window.TSM && window.TSM.relay && window.TSM.relay.write) {
        window.TSM.relay.write('MORTGAGE', payload);
      }
    } catch (e) { console.warn('Relay storage failed', e); }''',
    '''    try {
      localStorage.setItem('TSM_MORTGAGE_STRATEGIST_RELAY', JSON.stringify(payload));
      if (window.TSM && window.TSM.relay && window.TSM.relay.write) {
        window.TSM.relay.write('MORTGAGE', payload);
      }
    } catch (e) { console.warn('Relay storage failed', e); }
    try {
      const breaches = payload.loan_breaches || [];
      const k = payload.kpis || {};
      const riskLevel = k.loans_over_sla > 2 ? 'HIGH' : (k.loans_over_sla > 0 || k.open_exceptions > 0 ? 'WATCH' : 'READY');
      fetch('/api/collective/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: 'mortgage', warRoom: 'Mortgage War Room',
          bnca: 'Mortgage pipeline analysis complete.',
          riskLevel, confidence: 75,
          topIssue: breaches.length ? `${breaches.length} loan file(s) breaching SLA` : 'Loan pipeline nominal',
          ownerLanes: ['Loan Officer', 'Underwriting'],
          hitlRequired: riskLevel !== 'READY',
          actions: breaches.slice(0, 3).map(b => b.detail || 'Loan file needs review'),
          kpi: { 'Open Loans': k.open_loan_files, 'Over SLA': k.loans_over_sla, 'CTC Ready': k.ctc_ready, 'Pipeline Value': k.pipeline_value },
          source: 'mortgage-war-room'
        })
      }).catch(() => {});
    } catch (e) { console.warn('Collective signal push failed', e); }''',
    "mortgage"
)

# ── NOC ──────────────────────────────────────────────────────────────────────
patch(
    f"{REPO}/html/war-rooms/noc/noc-war-room.html",
    '''    try {
      TSM.relay.write("NOC", payload);
    } catch (e) { console.warn('Relay storage failed', e); }''',
    '''    try {
      TSM.relay.write("NOC", payload);
    } catch (e) { console.warn('Relay storage failed', e); }
    try {
      const breaches = payload.incident_breaches || [];
      const k = payload.kpis || {};
      const riskLevel = k.sev1_incidents > 0 ? 'HIGH' : (k.incident_breach_count > 0 || k.open_alerts > 0 ? 'WATCH' : 'READY');
      fetch('/api/collective/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: 'noc', warRoom: 'NOC War Room',
          bnca: 'NOC incident/uptime analysis complete.',
          riskLevel, confidence: 75,
          topIssue: k.sev1_incidents > 0 ? `${k.sev1_incidents} active SEV1 incident(s)` : (breaches.length ? `${breaches.length} incident(s) breaching SLA` : 'Network nominal'),
          ownerLanes: ['NOC Lead', 'Network Engineering'],
          hitlRequired: riskLevel !== 'READY',
          actions: breaches.slice(0, 3).map(b => b.detail || 'Incident needs review'),
          kpi: { 'Open Incidents': k.open_incidents, 'SEV1': k.sev1_incidents, 'Uptime': k.uptime_pct + '%', 'Devices Down': k.devices_down },
          source: 'noc-war-room'
        })
      }).catch(() => {});
    } catch (e) { console.warn('Collective signal push failed', e); }''',
    "noc"
)

# ── INTEGRATION HUB ──────────────────────────────────────────────────────────
patch(
    f"{REPO}/html/war-rooms/integration-hub/integration-hub.html",
    '''    try{ TSM.relay.write("INTEGRATION",{vertical:'integration',systems:SYSTEMS,flows:FLOWS,kpis:computeKpis(),explain:getExplainItems(),ai_analysis:document.getElementById('aiOutput').textContent,timestamp:new Date().toISOString()}); } catch(e){}''',
    '''    try{ TSM.relay.write("INTEGRATION",{vertical:'integration',systems:SYSTEMS,flows:FLOWS,kpis:computeKpis(),explain:getExplainItems(),ai_analysis:document.getElementById('aiOutput').textContent,timestamp:new Date().toISOString()}); } catch(e){}
    try {
      const k = computeKpis();
      const riskLevel = k.failedEtl > 0 || k.totalErrors > 5 ? 'HIGH' : (k.degraded > 0 || k.backedUpQueues > 0 ? 'WATCH' : 'READY');
      fetch('/api/collective/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: 'integration-hub', warRoom: 'Integration Hub War Room',
          bnca: document.getElementById('aiOutput').textContent || 'Integration bus health analysis complete.',
          riskLevel, confidence: 75,
          topIssue: k.failedEtl > 0 ? `${k.failedEtl} ETL job(s) failed` : (k.degraded > 0 ? `${k.degraded} system(s) degraded` : 'Integration bus nominal'),
          ownerLanes: ['Integration Engineering', 'Platform Ops'],
          hitlRequired: riskLevel !== 'READY',
          actions: [
            k.failedEtl > 0 ? `Investigate ${k.failedEtl} failed ETL job(s)` : null,
            k.backedUpQueues > 0 ? `Clear ${k.backedUpQueues} backed-up queue(s)` : null,
            k.degraded > 0 ? `Review ${k.degraded} degraded system(s)` : null
          ].filter(Boolean),
          kpi: { 'Healthy Systems': `${k.healthy}/${k.total}`, 'Degraded': k.degraded, 'Avg Latency': k.avgLatency + 'ms', 'Failed ETL': k.failedEtl },
          source: 'integration-hub'
        })
      }).catch(() => {});
    } catch (e) { console.warn('Collective signal push failed', e); }''',
    "integration-hub"
)

# ── MDM ──────────────────────────────────────────────────────────────────────
patch(
    f"{REPO}/html/war-rooms/mdm/mdm-war-room.html",
    '''    try{
      const caseId = 'MDM-' + new Date().toISOString().slice(0,10) + '-' + Math.random().toString(36).slice(2,8);
      TSM.relay.write("MDM",{vertical:'mdm',records,duplicates,kpis:computeKpis(),explain:getExplainItems(),ai_analysis:document.getElementById('aiOutput').textContent,timestamp:new Date().toISOString(),caseId},{caseId, stage:'war-room'});
    } catch(e){}''',
    '''    try{
      const caseId = 'MDM-' + new Date().toISOString().slice(0,10) + '-' + Math.random().toString(36).slice(2,8);
      TSM.relay.write("MDM",{vertical:'mdm',records,duplicates,kpis:computeKpis(),explain:getExplainItems(),ai_analysis:document.getElementById('aiOutput').textContent,timestamp:new Date().toISOString(),caseId},{caseId, stage:'war-room'});
    } catch(e){}
    try {
      const k = computeKpis();
      const riskLevel = k.duplicate_count > 10 ? 'HIGH' : (k.duplicate_count > 0 || k.anomalies > 0 ? 'WATCH' : 'READY');
      fetch('/api/collective/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: 'mdm', warRoom: 'MDM War Room',
          bnca: document.getElementById('aiOutput').textContent || 'Master data quality analysis complete.',
          riskLevel, confidence: 75,
          topIssue: k.duplicate_count > 0 ? `${k.duplicate_count} duplicate record(s) pending review` : (k.anomalies > 0 ? `${k.anomalies} incomplete record(s)` : 'Data quality nominal'),
          ownerLanes: ['Data Steward', 'Master Data Management'],
          hitlRequired: riskLevel !== 'READY',
          actions: [
            k.pending_approvals > 0 ? `Review ${k.pending_approvals} pending merge approval(s)` : null,
            k.anomalies > 0 ? `Remediate ${k.anomalies} incomplete record(s)` : null
          ].filter(Boolean),
          kpi: { 'Total Records': k.total_records, 'Duplicates': k.duplicate_count, 'Quality Score': k.quality_score, 'Pending Approvals': k.pending_approvals },
          source: 'mdm-war-room'
        })
      }).catch(() => {});
    } catch (e) { console.warn('Collective signal push failed', e); }''',
    "mdm"
)

print("=== Done: batch 2 (Mortgage, NOC, Integration Hub, MDM) wired ===")