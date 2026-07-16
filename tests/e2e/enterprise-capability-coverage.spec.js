// tests/playwright/enterprise-capability-coverage.spec.js
//
// Source of truth: the "TSM Enterprise Capability Matrix" reference email
// (Jul 9 2026). 10 generic capabilities x 7 industry verticals = 70 cells,
// none of which exist as dedicated flavored pages yet. Neither system in
// the codebase (phases.json's 10 generic capability war rooms, and each
// vertical's single unflavored war room) references the matrix or the
// other system.
//
// This spec does NOT assert pass/fail against a spec that isn't built —
// that would just be permanently red CI for a known, tracked architecture
// gap. Instead it scores REAL, CURRENT coverage: for each vertical's
// existing war room (+ strategist + executive portal where present), does
// the rendered page text already contain language matching each
// capability's matrix-defined flavor for that industry? This answers
// "how much of the matrix does today's single page already touch" using
// the matrix's own wording, not invented criteria.
//
// Output: reports/logs/capability-matrix-coverage.json — a per-vertical,
// per-capability hit/miss table, plus a printed summary. Nothing here
// hard-fails the build; it's a coverage report to drive the real build-out
// decision (which cells to build first), not a regression gate.
//
// Run via: npx playwright test tests/playwright/enterprise-capability-coverage.spec.js

const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const REPORT_PATH = path.join(__dirname, '..', '..', 'reports', 'logs', 'capability-matrix-coverage.json');

// Matrix cells verbatim from the reference email (row = capability, col = vertical).
// Each cell is split into keyword terms for a loose content match.
const MATRIX = {
  'Order-to-Cash': {
    Construction: ['contract', 'progress billing', 'retainage', 'collection'],
    Healthcare: ['claim', 'reimbursement', 'denial'],
    'Real Estate': ['listing', 'offer', 'closing'],
    Insurance: ['policy billing', 'claims settlement', 'settlement'],
    Legal: ['engagement', 'invoice'],
    Finance: ['revenue cycle'],
    'BPO Services': ['client delivery', 'invoicing'],
  },
  CRM: {
    Construction: ['owner', 'gc', 'general contractor', 'sub'],
    Healthcare: ['patient', 'provider', 'payer'],
    'Real Estate': ['buyer', 'seller', 'agent'],
    Insurance: ['policyholder', 'broker'],
    Legal: ['client', 'attorney'],
    Finance: ['customer', 'vendor'],
    'BPO Services': ['client', 'workforce'],
  },
  CPQ: {
    Construction: ['estimate', 'bid', 'proposal'],
    Healthcare: ['procedure', 'care package'],
    'Real Estate': ['property service'],
    Insurance: ['coverage package'],
    Legal: ['legal service package'],
    Finance: ['financial product'],
    'BPO Services': ['outsourcing proposal'],
  },
  'Product Catalog': {
    Construction: ['material', 'equipment', 'labor'],
    Healthcare: ['cpt', 'hcpcs', 'service'],
    'Real Estate': ['propert', 'service'],
    Insurance: ['policy', 'product'],
    Legal: ['legal service'],
    Finance: ['financial product'],
    'BPO Services': ['service catalog'],
  },
  'Approval Center': {
    Construction: ['change order'],
    Healthcare: ['prior authorization', 'prior auth'],
    'Real Estate': ['contract'],
    Insurance: ['claims approval', 'claim approval'],
    Legal: ['legal review'],
    Finance: ['loan approval', 'investment approval'],
    'BPO Services': ['qa approval'],
  },
  'Master Data Management': {
    Construction: ['project', 'vendor'],
    Healthcare: ['patient', 'provider'],
    'Real Estate': ['propert', 'owner'],
    Insurance: ['customer', 'polic'],
    Legal: ['matter', 'client'],
    Finance: ['account', 'entit'],
    'BPO Services': ['client', 'employee'],
  },
  'Integration Hub': {
    Construction: ['procore', 'erp', 'accounting'],
    Healthcare: ['ehr', 'emr', 'clearinghouse'],
    'Real Estate': ['mls', 'crm'],
    Insurance: ['policy system'],
    Legal: ['case system'],
    Finance: ['banking system'],
    'BPO Services': ['ocr', 'rpa', 'erp'],
  },
  Governance: {
    Construction: ['osha', 'contract'],
    Healthcare: ['hipaa', 'cms'],
    'Real Estate': ['fair housing'],
    Insurance: ['regulatory compliance', 'compliance'],
    Legal: ['legal standard'],
    Finance: ['financial control'],
    'BPO Services': ['iso', 'soc2', 'sla'],
  },
  'WIP Command Center': {
    Construction: ['project status'],
    Healthcare: ['claims backlog', 'backlog'],
    'Real Estate': ['transaction'],
    Insurance: ['claims pipeline', 'pipeline'],
    Legal: ['case workload', 'workload'],
    Finance: ['portfolio monitoring'],
    'BPO Services': ['work queue', 'queue'],
  },
  'Digital Twin': {
    Construction: ['portfolio simulation', 'simulation'],
    Healthcare: ['hospital operations'],
    'Real Estate': ['market forecast'],
    Insurance: ['risk model'],
    Legal: ['case forecast'],
    Finance: ['financial model'],
    'BPO Services': ['workforce planning'],
  },
};

// Vertical -> pages to pool text from (war room + strategist + executive,
// where they exist). Matrix column name mapped to our internal vertical key.
const VERTICALS = [
  { column: 'Healthcare', key: 'Healthcare', pages: [
    '/html/healthcare/hc-denial-war-room.html',
    '/html/healthcare/hc-main-strategist.html',
    '/html/healthcare/executive-portal.html',
  ]},
  { column: 'Finance', key: 'FinOps', pages: [
    '/html/finops-suite/finops-war-room.html',
    '/html/finops-suite/finops-main-strategist.html',
    '/html/finops-suite/finops-executive-portal.html',
  ]},
  { column: 'Insurance', key: 'Insurance', pages: [
    '/html/tsm-insurance/insurance-war-room.html',
    '/html/tsm-insurance/insurance-strategist.html',
    '/html/tsm-insurance/insurance-executive-portal.html',
  ]},
  { column: 'Construction', key: 'Construction', pages: [
    '/html/construction-suite/construction-war-room.html',
    '/html/construction-suite/construction-strategist.html',
    '/html/construction-suite/construction-executive-portal.html',
  ]},
  { column: 'Legal', key: 'Legal', pages: [
    '/html/legal-pro/legal-war-room.html',
    '/html/legal-pro/legal-main-strategist.html',
    '/html/legal-pro/legal-executive-portal.html',
  ]},
  { column: 'Real Estate', key: 'Real Estate', pages: [
    '/html/reo-pro/re-war-room.html',
    '/html/reo-pro/re-strategist.html',
    '/html/reo-pro/re-exec-portal.html',
  ]},
  { column: 'BPO Services', key: 'BPO', pages: [
    '/html/bpo/bpo-situation-room.html',
    '/html/bpo/bpo-strategist-v2.html',
    '/html/bpo/bpo-executive-portal.html',
  ]},
];

async function poolText(page, urls) {
  let combined = '';
  for (const url of urls) {
    try {
      await page.goto(`${BASE_URL}${url}`, { waitUntil: 'load', timeout: 15000 });
      combined += ' ' + (await page.evaluate(() => document.body.innerText.toLowerCase()));
    } catch (e) {
      combined += ` [UNREACHABLE: ${url} — ${e.message}]`;
    }
  }
  return combined;
}

test.describe('Enterprise Capability Matrix — current coverage report', () => {
  const report = {};

  for (const vertical of VERTICALS) {
    test(`coverage: ${vertical.key}`, async ({ page }) => {
      const text = await poolText(page, vertical.pages);
      const row = {};
      let hits = 0;

      for (const [capability, byVertical] of Object.entries(MATRIX)) {
        const terms = byVertical[vertical.column] || [];
        const matched = terms.filter((t) => text.includes(t));
        const covered = matched.length > 0;
        if (covered) hits++;
        row[capability] = { covered, matchedTerms: matched, expectedTerms: terms };
      }

      report[vertical.key] = { coverage: `${hits}/10`, capabilities: row };
      console.log(`[capability-coverage] ${vertical.key}: ${hits}/10 — ${
        Object.entries(row).filter(([, v]) => !v.covered).map(([k]) => k).join(', ') || 'full coverage'
      }`);
    });
  }

  test.afterAll(() => {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`\n[capability-coverage] Full report written to ${REPORT_PATH}`);
  });
});