// demo.js
// Run with: node demo.js
// Seeds two similar invoices for the same vendor, then a third that should
// trip the duplicate-invoice rule, and prints the full decision the service
// produces — rule result, computed confidence, and explanation.
//
// Works with no GROQ_API_KEY set (uses the offline fallback explainer).
// Set GROQ_API_KEY in your environment to see live Groq explanations instead.

const fs = require('fs');
const path = require('path');
const { appendEvent } = require('./events-store');
const { processEvent } = require('./decision-service');

// Fresh state for each demo run
const dataDir = path.join(__dirname, 'data');
if (fs.existsSync(dataDir)) fs.rmSync(dataDir, { recursive: true, force: true });

async function main() {
  console.log('--- TSM Decision Service demo ---\n');

  // Two prior, unrelated invoices for context (should NOT trigger anything)
  appendEvent({
    type: 'INVOICE_RECEIVED',
    domain: 'finops',
    entity_id: 'vendor_1187',
    payload: { vendor_id: 'vendor_1187', amount: 4200.0, invoice_number: 'INV-1001' },
    timestamp: daysAgo(45)
  });

  appendEvent({
    type: 'INVOICE_RECEIVED',
    domain: 'finops',
    entity_id: 'vendor_2201',
    payload: { vendor_id: 'vendor_2201', amount: 900.0, invoice_number: 'INV-1002' },
    timestamp: daysAgo(20)
  });

  // The original invoice that will later look duplicated
  appendEvent({
    type: 'INVOICE_RECEIVED',
    domain: 'finops',
    entity_id: 'vendor_1187',
    payload: { vendor_id: 'vendor_1187', amount: 12500.0, invoice_number: 'INV-1003' },
    timestamp: daysAgo(10)
  });

  console.log('Seeded 3 baseline invoices. Now submitting a likely duplicate...\n');

  // The triggering event: same vendor, nearly identical amount, 10 days later
  const triggerEvent = appendEvent({
    type: 'INVOICE_RECEIVED',
    domain: 'finops',
    entity_id: 'vendor_1187',
    payload: { vendor_id: 'vendor_1187', amount: 12480.0, invoice_number: 'INV-1004' },
    timestamp: new Date().toISOString()
  });

  const decisions = await processEvent(triggerEvent, {
    entityContext: { vendor_name: 'Meridian Fabrication', vendor_since: '2022-03-01' }
  });

  if (decisions.length === 0) {
    console.log('No rules fired. (Check rules/dup_invoice_v1.js thresholds if this is unexpected.)');
    return;
  }

  for (const d of decisions) {
    console.log('DECISION PRODUCED:');
    console.log(JSON.stringify(d, null, 2));
  }

  console.log('\n--- Also submitting a legitimate, unrelated invoice for comparison ---\n');

  const cleanEvent = appendEvent({
    type: 'INVOICE_RECEIVED',
    domain: 'finops',
    entity_id: 'vendor_2201',
    payload: { vendor_id: 'vendor_2201', amount: 3100.0, invoice_number: 'INV-1005' },
    timestamp: new Date().toISOString()
  });

  const cleanDecisions = await processEvent(cleanEvent);
  console.log(cleanDecisions.length === 0
    ? 'Correctly did NOT flag the unrelated invoice. No decision produced.'
    : 'Unexpected: rule fired on an unrelated invoice — check thresholds.');
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

main().catch(err => {
  console.error('Demo failed:', err);
  process.exit(1);
});
