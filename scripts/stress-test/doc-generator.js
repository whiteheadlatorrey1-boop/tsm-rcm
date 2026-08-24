'use strict';

/**
 * Synthetic document generator for BPO Services stress testing.
 *
 * Produces realistic-*looking* claims, contracts, vendor forms, invoices,
 * and a few deliberately-hostile edge cases (oversized / unsupported /
 * malformed), in the plain-text-family formats routes/doc-router.js and
 * the BPO document-upload route already parse natively (.txt/.csv/.json)
 * — no new npm dependencies required.
 *
 * This is data generation only. It does not talk to the network — see
 * run-stress-test.js for the harness that uploads what this produces.
 */

const crypto = require('crypto');

// ---------------------------------------------------------------------
// Name / value pools — enough variety that a 500-document run doesn't
// look like the same 5 records copy-pasted, without needing a fixtures
// dependency.
// ---------------------------------------------------------------------
const FIRST_NAMES = ['James', 'Maria', 'Wei', 'Fatima', 'Carlos', 'Aisha', 'Noah', 'Priya', 'Liam', 'Sofia', 'Kenji', 'Grace', 'Omar', 'Elena', 'Marcus', 'Ingrid'];
const LAST_NAMES = ['Whitfield', 'Nakamura', 'Okonkwo', 'Reyes', 'Petrov', 'Larsson', 'Haddad', 'Kowalski', 'Mensah', 'Delgado', 'Kaur', 'Bianchi'];
const COMPANIES = ['Apex Drywall Corp', 'CloudServe Infrastructure', 'Meridian Retail Group', 'Titan Logistics', 'Horizon Mutual', 'Aetna Choice', 'Allied Steel Framing', 'Northgate Supply Co', 'BlueRiver Facilities', 'Cascade Materials LLC', 'Redline Freight', 'Vantage Underwriters'];
const PAYERS = ['Horizon Mutual', 'Aetna Choice', 'BlueShield Regional', 'Arizona Health Network', 'Pacific Sun Insurance'];
const DENIAL_CODES = ['CO-197', 'CO-16', 'CO-29', 'PR-1', 'CO-45'];
const VENDOR_CATEGORIES = ['IT Supplies', 'Facilities', 'Professional Services', 'Construction Materials', 'Logistics', 'Staffing'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randMoney(min, max) { return (Math.random() * (max - min) + min).toFixed(2); }
function randDate(daysBack = 120) {
  const d = new Date(Date.now() - randInt(0, daysBack) * 86400000);
  return d.toISOString().slice(0, 10);
}
function fullName() { return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; }
function id(prefix, len = 5) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex').slice(0, len).toUpperCase()}`;
}

// ---------------------------------------------------------------------
// Document type generators. Each returns { filename, content, mimetype,
// docType, vertical, expectSupported }. Content is plain text/CSV/JSON
// so extraction always succeeds unless deliberately corrupted.
// ---------------------------------------------------------------------

function genInsuranceClaim(i) {
  const claimId = id('CLM', 6);
  const patient = fullName();
  const payer = pick(PAYERS);
  const denial = pick(DENIAL_CODES);
  const billed = randMoney(500, 32000);
  const content =
`INSURANCE CLAIM PACKET
Claim ID: ${claimId}
Patient: ${patient}
Payer: ${payer}
Amount Billed: $${billed}
Denial Code: ${denial}
Service Date: ${randDate()}
CPT Code: ${randInt(70000, 99999)}
Notes: Claim flagged during routine intake sweep #${i}. Requires review for
authorization status and timely-filing exposure before resubmission.`;
  return {
    filename: `claim_${claimId}.txt`,
    content,
    mimetype: 'text/plain',
    docType: 'claim',
    vertical: 'healthcare',
    expectSupported: true,
  };
}

function genVendorContract(i) {
  const contractId = id('CTR', 6);
  const vendor = pick(COMPANIES);
  const value = randMoney(15000, 480000);
  const term = randInt(6, 36);
  const content =
`MASTER SERVICES AGREEMENT — SUMMARY SHEET
Contract ID: ${contractId}
Vendor: ${vendor}
Category: ${pick(VENDOR_CATEGORIES)}
Contract Value: $${value}
Term: ${term} months
Effective Date: ${randDate(365)}
Indemnification: ${pick(['Mutual, capped at 1x contract value', 'Unlimited — vendor-favorable', 'Standard mutual cap', 'Not specified — flag for legal review'])}
Governing Law: ${pick(['Delaware', 'Arizona', 'New York', 'Cayman Islands (foreign venue — flag)'])}
Auto-Renewal: ${pick(['Yes, 30-day notice to terminate', 'No', 'Yes, 90-day notice to terminate'])}
Intake Note: Batch upload #${i} for periodic contract-portfolio review.`;
  return {
    filename: `contract_${contractId}.txt`,
    content,
    mimetype: 'text/plain',
    docType: 'contract',
    vertical: 'legal',
    expectSupported: true,
  };
}

function genVendorForm(i) {
  // CSV — exercises a different extraction code path than plain text.
  const vendorId = id('V', 4);
  const rows = [
    ['field', 'value'],
    ['vendor_id', vendorId],
    ['vendor_name', pick(COMPANIES)],
    ['category', pick(VENDOR_CATEGORIES)],
    ['tax_id', `${randInt(10, 99)}-${randInt(1000000, 9999999)}`],
    ['w9_on_file', pick(['yes', 'no'])],
    ['insurance_coi_expiration', randDate(-180)],
    ['payment_terms', pick(['Net 30', 'Net 45', 'Net 60', '2/10 Net 30'])],
    ['approved_credit_limit', `$${randMoney(5000, 250000)}`],
    ['intake_batch', String(i)],
  ];
  const content = rows.map(r => r.join(',')).join('\n');
  return {
    filename: `vendor_form_${vendorId}.csv`,
    content,
    mimetype: 'text/csv',
    docType: 'vendor_form',
    vertical: 'finops',
    expectSupported: true,
  };
}

function genInvoice(i) {
  const invId = id('INV', 6);
  const vendor = pick(COMPANIES);
  const amount = randMoney(200, 45000);
  const payload = {
    invoice_id: invId,
    vendor,
    amount_due: Number(amount),
    po_reference: id('PO', 5),
    submitted_date: randDate(60),
    due_date: randDate(-30),
    line_items: Array.from({ length: randInt(1, 5) }, (_, n) => ({
      description: pick(['Materials', 'Labor', 'Freight', 'Service Fee', 'Equipment Rental']),
      qty: randInt(1, 40),
      unit_price: Number(randMoney(20, 900)),
    })),
    batch_seq: i,
  };
  return {
    filename: `invoice_${invId}.json`,
    content: JSON.stringify(payload, null, 2),
    mimetype: 'application/json',
    docType: 'invoice',
    vertical: 'finops',
    expectSupported: true,
  };
}

function genPropertyMaintenanceForm(i) {
  const unit = `U-${randInt(100, 499)}`;
  const content =
`PROPERTY MAINTENANCE / SLA INTAKE FORM
Unit: ${unit}
Issue: ${pick(['HVAC failure', 'Plumbing leak', 'Appliance malfunction', 'Electrical fault', 'Pest control request'])}
Opened: ${randDate(14)}
SLA Target: 24 Hours
Tenant: ${fullName()}
Priority: ${pick(['Low', 'Medium', 'High'])}
Batch Intake: #${i}`;
  return {
    filename: `maintenance_${unit}.txt`,
    content,
    mimetype: 'text/plain',
    docType: 'maintenance_form',
    vertical: 'realestate',
    expectSupported: true,
  };
}

// --- Deliberately hostile / edge-case documents -----------------------
// These exist to prove the fault-isolation path actually isolates faults
// instead of taking down the batch. Mix a small percentage of these into
// any real stress run.

function genOversizedFile(i) {
  // Just over the 8MB multer cap — should be rejected at the multer layer
  // (413/500 depending on how the route surfaces it), not crash the server.
  const bigText = 'STRESS-TEST FILLER LINE. '.repeat(400000); // ~10MB
  return {
    filename: `oversized_${i}.txt`,
    content: bigText,
    mimetype: 'text/plain',
    docType: 'edge_case_oversized',
    vertical: 'bpo',
    expectSupported: false,
    expectReason: 'exceeds 8MB multer limit',
  };
}

function genUnsupportedType(i) {
  return {
    filename: `binary_dump_${i}.exe`,
    content: 'not a real binary, just an unsupported extension on purpose',
    mimetype: 'application/octet-stream',
    docType: 'edge_case_unsupported_ext',
    vertical: 'bpo',
    expectSupported: false,
    expectReason: 'unsupported_file_type — should still store, skip extraction',
  };
}

function genMalformedJson(i) {
  return {
    filename: `malformed_${i}.json`,
    content: '{ "invoice_id": "INV-BAD", "amount_due": 4500, ', // truncated on purpose
    mimetype: 'application/json',
    docType: 'edge_case_malformed_json',
    vertical: 'finops',
    expectSupported: true, // .json IS a supported extension — extraction should
    expectReason: 'malformed JSON — extractDocText treats .json as raw text, so this should still succeed as plain text (no JSON.parse in the extraction path)',
  };
}

function genEmptyFile(i) {
  return {
    filename: `empty_${i}.txt`,
    content: '',
    mimetype: 'text/plain',
    docType: 'edge_case_empty',
    vertical: 'bpo',
    expectSupported: true,
    expectReason: 'zero-byte file — should store with empty extracted text, not error',
  };
}

const GENERATORS = {
  claim: genInsuranceClaim,
  contract: genVendorContract,
  vendor_form: genVendorForm,
  invoice: genInvoice,
  maintenance_form: genPropertyMaintenanceForm,
  edge_oversized: genOversizedFile,
  edge_unsupported: genUnsupportedType,
  edge_malformed_json: genMalformedJson,
  edge_empty: genEmptyFile,
};

/**
 * Default realistic mix: mostly normal business docs, a small slice of
 * edge cases. Weights don't need to sum to 1 — they're normalized.
 */
const DEFAULT_MIX = {
  claim: 25,
  contract: 20,
  vendor_form: 20,
  invoice: 20,
  maintenance_form: 10,
  edge_oversized: 1,
  edge_unsupported: 2,
  edge_malformed_json: 1,
  edge_empty: 1,
};

function weightedPick(mix) {
  const entries = Object.entries(mix);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    if (r < w) return key;
    r -= w;
  }
  return entries[entries.length - 1][0];
}

/**
 * Generate `count` synthetic documents according to `mix` (defaults to
 * DEFAULT_MIX). Returns an array of document descriptors ready to hand
 * to the upload harness.
 */
function generateBatch(count, mix = DEFAULT_MIX) {
  const docs = [];
  for (let i = 1; i <= count; i++) {
    const type = weightedPick(mix);
    const gen = GENERATORS[type];
    docs.push(gen(i));
  }
  return docs;
}

module.exports = {
  generateBatch,
  GENERATORS,
  DEFAULT_MIX,
};
