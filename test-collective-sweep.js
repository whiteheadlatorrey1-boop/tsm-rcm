#!/usr/bin/env node
/**
 * Backend-only smoke test for the Collective BNCA cross-vertical pipeline.
 * No browser needed -- exercises the real server routes end-to-end:
 *   1. Clears any stale signals
 *   2. Pushes realistic sample signals for all 17 wired verticals
 *   3. Confirms they landed (GET /api/collective/signals)
 *   4. Triggers the real Groq synthesis (POST /api/collective/bnca)
 *   5. Prints the synthesis exactly as a client would see it rendered
 *
 * Run against your local server:
 *   node server.js &        # or: npm start &
 *   node test-collective-sweep.js
 */

const BASE = process.env.TSM_BASE_URL || 'http://localhost:8080';

// Representative sample signals across all 17 wired verticals.
// Field shapes match what each war room actually sends -- same fields
// verified against source during the wiring sweep.
const SIGNALS = [
  { vertical: 'finops', warRoom: 'FinOps War Room', riskLevel: 'HIGH', confidence: 78,
    topIssue: 'Revenue recognition discrepancy in Q3 GL close', ownerLanes: ['CFO','Controller'],
    hitlRequired: true, actions: ['Review flagged GL exceptions','Escalate write-off risk to CFO'],
    kpi: { 'Risk Score': '82/100' }, source: 'test-sweep' },

  { vertical: 'bpo', warRoom: 'BPO War Room', riskLevel: 'WATCH', confidence: 72,
    topIssue: 'SLA slippage on Tier-2 ticket queue', ownerLanes: ['Ops Manager'],
    hitlRequired: true, actions: ['Reassign backlog to on-call agents'],
    kpi: { 'Open Tickets': 41, 'SLA Compliance': '91%' }, source: 'test-sweep' },

  { vertical: 'legal', warRoom: 'Legal War Room', riskLevel: 'WATCH', confidence: 70,
    topIssue: 'Contract renewal clause flagged for non-standard indemnity terms',
    ownerLanes: ['General Counsel'], hitlRequired: true,
    actions: ['Route to outside counsel for review'], kpi: {}, source: 'test-sweep' },

  { vertical: 'real-estate', warRoom: 'Real Estate War Room', riskLevel: 'READY', confidence: 80,
    topIssue: 'Portfolio nominal', ownerLanes: ['Portfolio Manager'], hitlRequired: false,
    actions: [], kpi: {}, source: 'test-sweep' },

  { vertical: 'insurance', warRoom: 'Insurance War Room', riskLevel: 'HIGH', confidence: 75,
    topIssue: 'Claims backlog exceeding 30-day threshold on 12 files',
    ownerLanes: ['Claims Manager'], hitlRequired: true,
    actions: ['Escalate aged claims to senior adjuster'], kpi: {}, source: 'test-sweep' },

  { vertical: 'construction', warRoom: 'Construction War Room', riskLevel: 'WATCH', confidence: 74,
    topIssue: '3 open RFIs blocking critical path on Phase 2',
    ownerLanes: ['Project Manager'], hitlRequired: true,
    actions: ['Expedite RFI responses from architect'], kpi: {}, source: 'test-sweep' },

  { vertical: 'logistics', warRoom: 'Logistics Situation Room', riskLevel: 'WATCH', confidence: 68,
    topIssue: 'Carrier delay on 2 inbound shipments', ownerLanes: ['Logistics Coordinator'],
    hitlRequired: true, actions: ['Contact carrier for updated ETA'], kpi: {}, source: 'test-sweep' },

  { vertical: 'supplier-vendor', warRoom: 'Supplier/Vendor Situation Room', riskLevel: 'HIGH', confidence: 71,
    topIssue: 'Key supplier flagged for financial distress',
    ownerLanes: ['Procurement Lead'], hitlRequired: true,
    actions: ['Activate backup supplier contingency plan'], kpi: {}, source: 'test-sweep' },

  { vertical: 'approval', warRoom: 'Approval War Room', riskLevel: 'HIGH', confidence: 75,
    topIssue: '2 requests escalated — approver unresponsive 36h',
    ownerLanes: ['Approvals Manager', 'Compliance'], hitlRequired: true,
    actions: ['Reassign escalated approvals to backup approver'],
    kpi: { 'Pending': 9, 'Escalated': 2, 'SLA Breaches': 1, 'Approval Rate': '87%' }, source: 'test-sweep' },

  { vertical: 'catalog', warRoom: 'Catalog War Room', riskLevel: 'WATCH', confidence: 75,
    topIssue: '4 SKUs approaching EOL without replacement mapped',
    ownerLanes: ['Product Manager', 'Pricing'], hitlRequired: true,
    actions: ['Map EOL SKUs to replacement products'],
    kpi: { 'Active SKUs': 214, 'Low Stock': 6, 'Compliance Flags': 0, 'EOL': 4 }, source: 'test-sweep' },

  { vertical: 'cpq', warRoom: 'CPQ War Room', riskLevel: 'WATCH', confidence: 75,
    topIssue: '3 quote(s) breaching SLA', ownerLanes: ['Sales Ops', 'Deal Desk'],
    hitlRequired: true, actions: ['Escalate stalled quotes to deal desk'],
    kpi: { 'Open Quotes': 18, 'Quote Value': 412000, 'Avg Discount': '11%' }, source: 'test-sweep' },

  { vertical: 'crm', warRoom: 'CRM War Room', riskLevel: 'WATCH', confidence: 75,
    topIssue: '2 case/opportunity SLA breach(es)', ownerLanes: ['Sales Manager', 'Customer Success'],
    hitlRequired: true, actions: ['Review breached cases with CS lead'],
    kpi: { 'Open Leads': 37, 'Win Rate': '42%', 'Open Cases': 15 }, source: 'test-sweep' },

  { vertical: 'o2c', warRoom: 'O2C War Room', riskLevel: 'HIGH', confidence: 75,
    topIssue: '5 order(s) bottlenecked', ownerLanes: ['Order Management', 'Credit/Collections'],
    hitlRequired: true, actions: ['Clear credit-hold bottleneck on largest order'],
    kpi: { 'Cycle Time': '4.2d', 'Order Value': 198000, 'Bottlenecks': 5 }, source: 'test-sweep' },

  { vertical: 'governance', warRoom: 'Governance War Room', riskLevel: 'HIGH', confidence: 75,
    topIssue: 'GOV-014 ("Vendor Access Review") at 81/100', ownerLanes: ['Compliance Officer', 'Risk Owner'],
    hitlRequired: true, actions: ['Mitigate GOV-014: Vendor Access Review'],
    kpi: { 'Controls Pass': '38/41', 'Open Risks': 3, 'Avg Risk Score': 58 }, source: 'test-sweep' },

  { vertical: 'mortgage', warRoom: 'Mortgage War Room', riskLevel: 'HIGH', confidence: 75,
    topIssue: '3 loan file(s) breaching SLA', ownerLanes: ['Loan Officer', 'Underwriting'],
    hitlRequired: true, actions: ['Expedite underwriting on aged files'],
    kpi: { 'Open Loans': 22, 'Over SLA': 3, 'CTC Ready': 5, 'Pipeline Value': 6800000 }, source: 'test-sweep' },

  { vertical: 'noc', warRoom: 'NOC War Room', riskLevel: 'HIGH', confidence: 75,
    topIssue: '1 active SEV1 incident(s)', ownerLanes: ['NOC Lead', 'Network Engineering'],
    hitlRequired: true, actions: ['Escalate SEV1 to on-call network engineer'],
    kpi: { 'Open Incidents': 6, 'SEV1': 1, 'Uptime': '99.2%', 'Devices Down': 2 }, source: 'test-sweep' },

  { vertical: 'integration-hub', warRoom: 'Integration Hub War Room', riskLevel: 'HIGH', confidence: 75,
    topIssue: '2 ETL job(s) failed', ownerLanes: ['Integration Engineering', 'Platform Ops'],
    hitlRequired: true, actions: ['Investigate 2 failed ETL job(s)'],
    kpi: { 'Healthy Systems': '11/13', 'Degraded': 2, 'Avg Latency': '142ms', 'Failed ETL': 2 }, source: 'test-sweep' },

  { vertical: 'mdm', warRoom: 'MDM War Room', riskLevel: 'WATCH', confidence: 75,
    topIssue: '14 duplicate record(s) pending review', ownerLanes: ['Data Steward', 'Master Data Management'],
    hitlRequired: true, actions: ['Review 6 pending merge approval(s)'],
    kpi: { 'Total Records': 8420, 'Duplicates': 14, 'Quality Score': 88, 'Pending Approvals': 6 }, source: 'test-sweep' },

  { vertical: 'healthcare', warRoom: 'HC Main Strategist', riskLevel: 'HIGH', confidence: 75,
    topIssue: 'CO-29 timely filing denial — assign immediately', ownerLanes: ['HC Billing', 'HC Compliance'],
    hitlRequired: true, actions: ['Assign CO-29 denial to billing lead','Audit CPT upcoding pattern before Friday'],
    kpi: { 'Revenue at Risk': '$412K', 'Denial Rate': '14.2%' }, source: 'test-sweep' },
];

async function main() {
  console.log(`Target: ${BASE}\n`);

  // 1. Clear stale signals
  await fetch(`${BASE}/api/collective/signals`, { method: 'DELETE' });
  console.log('Cleared existing signals.\n');

  // 2. Push all 19 sample signals (17 verticals + BPO already counted, 19 rows above)
  for (const sig of SIGNALS) {
    const res = await fetch(`${BASE}/api/collective/signal`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sig)
    });
    if (!res.ok) {
      console.error(`FAIL push ${sig.vertical}: HTTP ${res.status}`);
      process.exitCode = 1;
      return;
    }
  }
  console.log(`Pushed ${SIGNALS.length} vertical signals.\n`);

  // 3. Confirm accumulation
  const listRes = await fetch(`${BASE}/api/collective/signals`);
  const listData = await listRes.json();
  console.log(`GET /api/collective/signals -> ${listData.signals.length} signals stored.`);
  const verticals = [...new Set(listData.signals.map(s => s.vertical))];
  console.log(`Verticals represented: ${verticals.length} -> ${verticals.join(', ')}\n`);

  // 4. Run real Groq synthesis
  console.log('Running cross-vertical synthesis (POST /api/collective/bnca)...\n');
  const bncaRes = await fetch(`${BASE}/api/collective/bnca`, { method: 'POST' });
  if (!bncaRes.ok) {
    const errBody = await bncaRes.text();
    console.error(`FAIL synthesis: HTTP ${bncaRes.status} -- ${errBody}`);
    process.exitCode = 1;
    return;
  }
  const bncaData = await bncaRes.json();

  // 5. Print exactly what a client would see
  console.log('═'.repeat(78));
  console.log('COLLECTIVE BNCA SYNTHESIS — CLIENT-FACING OUTPUT');
  console.log('═'.repeat(78));
  console.log(`\nSummary:\n${bncaData.bnca.summary}\n`);

  console.log('Cross-Vertical Conflicts:');
  (bncaData.bnca.conflicts || []).forEach((c, i) => console.log(`  ${i+1}. ${c}`));
  if (!bncaData.bnca.conflicts?.length) console.log('  (none identified)');

  console.log('\nSynergies / Compounding Risks:');
  (bncaData.bnca.synergies || []).forEach((s, i) => console.log(`  ${i+1}. ${s}`));
  if (!bncaData.bnca.synergies?.length) console.log('  (none identified)');

  console.log('\nRanked HITL Decision Queue:');
  (bncaData.bnca.hitlQueue || []).forEach((h, i) =>
    console.log(`  ${i+1}. [${h.priority}] ${h.vertical}: ${h.action}\n     Rationale: ${h.rationale}`));
  if (!bncaData.bnca.hitlQueue?.length) console.log('  (none)');

  console.log('\n' + '═'.repeat(78));
  console.log(`Signal count fed into synthesis: ${bncaData.bnca.signalCount}`);
  console.log('═'.repeat(78));
}

main().catch(err => { console.error('Test script error:', err); process.exitCode = 1; });