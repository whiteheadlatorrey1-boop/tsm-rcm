// logistics-engine.js — deterministic shipment/logistics logic. No AI dependency,
// testable standalone. Mirrors html/mdm-suite/mdm-core.js's approach: every score
// traces back to real fields on the record, and anything that can't be computed
// from real data is reported as null/not-estimated rather than guessed.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(a, b) {
  if (!a || !b) return null;
  const diff = new Date(b).getTime() - new Date(a).getTime();
  if (Number.isNaN(diff)) return null;
  return Math.round(diff / MS_PER_DAY);
}

// Days a shipment is behind its ETA right now (delivered late or still in flight
// past ETA). Returns 0 for on-time/ahead, null if we can't compute it.
function daysLate(shipment, now) {
  const eta = shipment.eta;
  if (!eta) return null;
  const reference = shipment.actualDelivery || (now || new Date().toISOString());
  const late = daysBetween(eta, reference);
  return late == null ? null : Math.max(0, late);
}

// Doc completeness — three booleans that gate whether a shipment can be closed
// out cleanly (bill of lading, invoice, tracking updated). Missing any one of
// these is real operational risk (memory: "Missing Documentation" KPI on the
// original spec), not a cosmetic issue.
function docCompleteness(shipment) {
  const docs = shipment.docs || {};
  const fields = ['billOfLading', 'invoice', 'trackingUpdated'];
  const present = fields.filter(f => docs[f] === true).length;
  return { present, total: fields.length, missing: fields.filter(f => docs[f] !== true) };
}

const STATUS_BASE_RISK = {
  DELIVERED: 0,
  IN_TRANSIT: 10,
  DELAYED: 55,
  EXCEPTION: 75,
  DELIVERED_LATE: 35
};

// Risk = how urgent this shipment is right now. Combines status severity,
// how many days late it actually is, missing documentation, and dollar
// exposure (only when the record actually carries a valueAtRisk > 0 —
// never inferred). 0-100, higher = more urgent. Same shape/intent as
// mdm-core.js's riskFor().
function riskForShipment(shipment, now) {
  const base = STATUS_BASE_RISK[shipment.status] ?? 20;
  const late = daysLate(shipment, now) || 0;
  const lateRisk = Math.min(30, late * 6); // caps out around 5 days late
  const { missing } = docCompleteness(shipment);
  const docRisk = missing.length * 8;
  const valueRisk = shipment.valueAtRisk > 0 ? Math.min(20, Math.round(shipment.valueAtRisk / 5000)) : 0;
  return Math.min(100, base + lateRisk + docRisk + valueRisk);
}

function scoreShipment(shipment, now) {
  const { present, total, missing } = docCompleteness(shipment);
  return {
    id: shipment.id,
    status: shipment.status,
    daysLate: daysLate(shipment, now),
    docsComplete: present === total,
    missingDocs: missing,
    risk: riskForShipment(shipment, now),
    valueAtRisk: shipment.valueAtRisk || 0
  };
}

// Summary block — every field here is computed straight from the seed data.
// avgDeliveryDays only counts shipments that actually have both a shipDate and
// an actualDelivery; if none do yet, it's null (not 0, not a guess).
function summarize(shipments, now) {
  const active = shipments.filter(s => s.status === 'IN_TRANSIT' || s.status === 'DELAYED' || s.status === 'EXCEPTION');
  const delayed = shipments.filter(s => s.status === 'DELAYED' || s.status === 'EXCEPTION' || s.status === 'DELIVERED_LATE');
  const missingDocs = shipments.filter(s => docCompleteness(s).missing.length > 0);

  const delivered = shipments.filter(s => s.shipDate && s.actualDelivery);
  const deliveryDurations = delivered.map(s => daysBetween(s.shipDate, s.actualDelivery)).filter(d => d != null);
  const avgDeliveryDays = deliveryDurations.length
    ? Math.round((deliveryDurations.reduce((a, b) => a + b, 0) / deliveryDurations.length) * 10) / 10
    : null;

  const atRisk = shipments.filter(s => s.valueAtRisk > 0);
  const valueAtRiskTotal = atRisk.reduce((sum, s) => sum + s.valueAtRisk, 0);

  return {
    totalShipments: shipments.length,
    active: active.length,
    delayed: delayed.length,
    missingDocs: missingDocs.length,
    avgDeliveryDays,
    valueAtRiskTotal,
    valueAtRiskCount: atRisk.length
  };
}

// Highest-risk shipments first — this is the "SHIPMENT COMMAND CENTER" feed
// from the spec doc, computed rather than hand-authored.
function topRisks(shipments, now, limit) {
  const scored = shipments.map(s => Object.assign({}, s, { _risk: riskForShipment(s, now) }));
  scored.sort((a, b) => b._risk - a._risk);
  return (limit ? scored.slice(0, limit) : scored).map(s => scoreShipment(s, now));
}

module.exports = {
  daysBetween, daysLate, docCompleteness, riskForShipment, scoreShipment, summarize, topRisks
};