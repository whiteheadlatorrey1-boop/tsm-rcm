#!/usr/bin/env python3
"""
Wires the 6 CFG-driven war rooms (Approval, Catalog, CPQ, CRM, O2C, Governance)
into the Collective BNCA cross-vertical queue (/api/collective/signal), following
the same pattern already used by FinOps/BPO/Legal/RealEstate/Insurance/Construction/
Logistics/Supplier-Vendor.

Each insertion is placed immediately after the existing TSM.relay.write(...) call
inside relayToStrategist(), using fields already computed by that file's own
engine.buildRelayPayload() (or, for governance, its inline computeKpis()) —
no new KPI fields are invented.

Idempotent: skips a file if the collective/signal push is already present.
"""
import re, shutil, sys

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


# ── APPROVAL ─────────────────────────────────────────────────────────────────
patch(
    f"{REPO}/html/war-rooms/approval/approval-war-room.html",
    '''    try {
      TSM.relay.write("APPROVAL", payload);
    } catch (e) { console.warn('Relay storage failed', e); }''',
    '''    try {
      TSM.relay.write("APPROVAL", payload);
    } catch (e) { console.warn('Relay storage failed', e); }
    try {
      const flags = payload.attention_flags || [];
      const k = payload.kpis || {};
      const riskLevel = k.sla_breach_count > 0 ? 'HIGH' : (k.escalated_count > 0 ? 'WATCH' : 'READY');
      fetch('/api/collective/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: 'approval', warRoom: 'Approval War Room',
          bnca: payload.ai_analysis ? String(payload.ai_analysis).slice(0, 400) : 'Approval queue analysis complete.',
          riskLevel, confidence: 75,
          topIssue: (flags[0] && flags[0].detail) || 'Approval queue nominal',
          ownerLanes: ['Approvals Manager', 'Compliance'],
          hitlRequired: riskLevel !== 'READY',
          actions: flags.slice(0, 3).map(f => f.detail),
          kpi: { 'Pending': k.pending_requests, 'Escalated': k.escalated_count, 'SLA Breaches': k.sla_breach_count, 'Approval Rate': k.approval_rate_pct + '%' },
          source: 'approval-war-room'
        })
      }).catch(() => {});
    } catch (e) { console.warn('Collective signal push failed', e); }''',
    "approval"
)

# ── CATALOG ──────────────────────────────────────────────────────────────────
patch(
    f"{REPO}/html/war-rooms/catalog/catalog-war-room.html",
    '''    try {
      TSM.relay.write("CATALOG", payload);
    } catch (e) { console.warn('Relay storage failed', e); }''',
    '''    try {
      TSM.relay.write("CATALOG", payload);
    } catch (e) { console.warn('Relay storage failed', e); }
    try {
      const flags = payload.attention_flags || [];
      const k = payload.kpis || {};
      const riskLevel = k.compliance_flag_count > 0 ? 'HIGH' : (k.low_stock_count > 0 || k.eol_count > 0 ? 'WATCH' : 'READY');
      fetch('/api/collective/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: 'catalog', warRoom: 'Catalog War Room',
          bnca: payload.ai_analysis ? String(payload.ai_analysis).slice(0, 400) : 'Catalog lifecycle analysis complete.',
          riskLevel, confidence: 75,
          topIssue: (flags[0] && flags[0].detail) || 'Catalog nominal',
          ownerLanes: ['Product Manager', 'Pricing'],
          hitlRequired: riskLevel !== 'READY',
          actions: flags.slice(0, 3).map(f => f.detail),
          kpi: { 'Active SKUs': k.active_skus, 'Low Stock': k.low_stock_count, 'Compliance Flags': k.compliance_flag_count, 'EOL': k.eol_count },
          source: 'catalog-war-room'
        })
      }).catch(() => {});
    } catch (e) { console.warn('Collective signal push failed', e); }''',
    "catalog"
)

# ── CPQ ──────────────────────────────────────────────────────────────────────
patch(
    f"{REPO}/html/war-rooms/cpq/cpq-war-room.html",
    '''    try {
      TSM.relay.write("CPQ", payload);
    } catch (e) { console.warn('Relay storage failed', e); }''',
    '''    try {
      TSM.relay.write("CPQ", payload);
    } catch (e) { console.warn('Relay storage failed', e); }
    try {
      const breaches = payload.sla_breaches || [];
      const k = payload.kpis || {};
      const riskLevel = breaches.length > 2 ? 'HIGH' : (breaches.length > 0 ? 'WATCH' : 'READY');
      fetch('/api/collective/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: 'cpq', warRoom: 'CPQ War Room',
          bnca: payload.ai_analysis ? String(payload.ai_analysis).slice(0, 400) : 'CPQ quote analysis complete.',
          riskLevel, confidence: 75,
          topIssue: breaches.length ? `${breaches.length} quote(s) breaching SLA` : 'Quote pipeline nominal',
          ownerLanes: ['Sales Ops', 'Deal Desk'],
          hitlRequired: riskLevel !== 'READY',
          actions: breaches.slice(0, 3).map(b => b.detail || `Quote ${b.quote_id || ''} needs review`),
          kpi: { 'Open Quotes': k.open_quotes, 'Quote Value': k.quote_value, 'Avg Discount': k.avg_discount_pct + '%' },
          source: 'cpq-war-room'
        })
      }).catch(() => {});
    } catch (e) { console.warn('Collective signal push failed', e); }''',
    "cpq"
)

# ── CRM ──────────────────────────────────────────────────────────────────────
patch(
    f"{REPO}/html/war-rooms/crm/crm-war-room.html",
    '''    try {
      TSM.relay.write("CRM", payload);
    } catch (e) { console.warn('Relay storage failed', e); }''',
    '''    try {
      TSM.relay.write("CRM", payload);
    } catch (e) { console.warn('Relay storage failed', e); }
    try {
      const caseBreaches = payload.case_breaches || [];
      const oppBreaches = payload.opp_breaches || [];
      const k = payload.kpis || {};
      const totalBreaches = caseBreaches.length + oppBreaches.length;
      const riskLevel = totalBreaches > 2 ? 'HIGH' : (totalBreaches > 0 ? 'WATCH' : 'READY');
      fetch('/api/collective/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: 'crm', warRoom: 'CRM War Room',
          bnca: payload.ai_summary ? String(payload.ai_summary).slice(0, 400) : 'CRM pipeline analysis complete.',
          riskLevel, confidence: 75,
          topIssue: totalBreaches ? `${totalBreaches} case/opportunity SLA breach(es)` : 'Pipeline nominal',
          ownerLanes: ['Sales Manager', 'Customer Success'],
          hitlRequired: riskLevel !== 'READY',
          actions: caseBreaches.concat(oppBreaches).slice(0, 3).map(b => b.detail || 'SLA review needed'),
          kpi: { 'Open Leads': k.open_leads, 'Win Rate': k.win_rate + '%', 'Open Cases': k.open_cases },
          source: 'crm-war-room'
        })
      }).catch(() => {});
    } catch (e) { console.warn('Collective signal push failed', e); }''',
    "crm"
)

# ── O2C ──────────────────────────────────────────────────────────────────────
patch(
    f"{REPO}/html/war-rooms/o2c/o2c-war-room.html",
    '''    try {
      TSM.relay.write("O2C", payload);
    } catch (e) { console.warn('Relay storage failed', e); }''',
    '''    try {
      TSM.relay.write("O2C", payload);
    } catch (e) { console.warn('Relay storage failed', e); }
    try {
      const breaches = payload.sla_breaches || [];
      const k = payload.kpis || {};
      const riskLevel = k.bottleneck_count > 2 ? 'HIGH' : (k.bottleneck_count > 0 ? 'WATCH' : 'READY');
      fetch('/api/collective/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: 'o2c', warRoom: 'O2C War Room',
          bnca: payload.analysis ? String(payload.analysis).slice(0, 400) : 'Order-to-cash analysis complete.',
          riskLevel, confidence: 75,
          topIssue: breaches.length ? `${breaches.length} order(s) bottlenecked` : 'Order flow nominal',
          ownerLanes: ['Order Management', 'Credit/Collections'],
          hitlRequired: riskLevel !== 'READY',
          actions: breaches.slice(0, 3).map(b => b.detail || 'Order needs review'),
          kpi: { 'Cycle Time': k.cycle_time + 'd', 'Order Value': k.order_value, 'Bottlenecks': k.bottleneck_count },
          source: 'o2c-war-room'
        })
      }).catch(() => {});
    } catch (e) { console.warn('Collective signal push failed', e); }''',
    "o2c"
)

# ── GOVERNANCE ───────────────────────────────────────────────────────────────
patch(
    f"{REPO}/html/war-rooms/governance/governance-war-room.html",
    '''    try{ TSM.relay.write("GOVERNANCE",{vertical:'governance',controls:CONTROLS,risks:RISKS,kpis:computeKpis(),explain:getExplainItems(),ai_analysis:document.getElementById('aiOutput').textContent,timestamp:new Date().toISOString()}); } catch(e){}''',
    '''    try{ TSM.relay.write("GOVERNANCE",{vertical:'governance',controls:CONTROLS,risks:RISKS,kpis:computeKpis(),explain:getExplainItems(),ai_analysis:document.getElementById('aiOutput').textContent,timestamp:new Date().toISOString()}); } catch(e){}
    try {
      const k = computeKpis();
      const highRisks = RISKS.filter(r => r.severity >= 75);
      const riskLevel = highRisks.length > 0 ? 'HIGH' : (k.open_risks > 0 ? 'WATCH' : 'READY');
      fetch('/api/collective/signal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: 'governance', warRoom: 'Governance War Room',
          bnca: document.getElementById('aiOutput').textContent || 'Governance compliance analysis complete.',
          riskLevel, confidence: 75,
          topIssue: highRisks[0] ? `${highRisks[0].id} ("${highRisks[0].name}") at ${highRisks[0].severity}/100` : 'Controls nominal',
          ownerLanes: ['Compliance Officer', 'Risk Owner'],
          hitlRequired: riskLevel !== 'READY',
          actions: highRisks.slice(0, 3).map(r => `Mitigate ${r.id}: ${r.name}`),
          kpi: { 'Controls Pass': k.controls_pass, 'Open Risks': k.open_risks, 'Avg Risk Score': k.avg_risk_score },
          source: 'governance-war-room'
        })
      }).catch(() => {});
    } catch (e) { console.warn('Collective signal push failed', e); }''',
    "governance"
)

print("=== Done: 6 CFG-driven verticals wired ===")