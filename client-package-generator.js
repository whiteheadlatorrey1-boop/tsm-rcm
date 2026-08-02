/* ============================================================
   CLIENT PACKAGE GENERATOR
   Sits alongside tsm-doc-search-multi.html. Reuses its existing
   storage conventions (loadIndexForClient, clientScopedKey,
   slugifyClient) instead of inventing new ones.

   Purpose: turn the raw internal record stream into something
   safe and useful to hand a client, with an explicit redaction
   boundary in between.
   ============================================================ */

/* ------------------------------------------------------------
   1. FIELD CLASSIFICATION
   Every field on a record falls into one of three buckets.
   Getting this list wrong is the actual risk in this feature —
   everything downstream just trusts it.

   SAFE        -> passes through unchanged
   TRANSLATE   -> internal shorthand, needs a human-readable
                  mapping before a client sees it
   INTERNAL    -> never leaves the building
   ------------------------------------------------------------ */

const FIELD_POLICY = {
  fileName:      'SAFE',
  documentType:  'SAFE',       // EXCEPT type === 'ESCALATION' — see docTypeIsClientSafe()
  vendor:        'SAFE',
  invoiceNo:     'SAFE',
  amount:        'SAFE',
  timestamp:     'SAFE',

  exclusionCode: 'TRANSLATE',  // e.g. 'SLA-BRK', 'AR-90', 'CO-4' — opaque without a codebook
  defectFlags:   'TRANSLATE',  // e.g. 'Title Defect', 'Inspection Issues'

  sourceNode:    'INTERNAL',   // reveals your internal routing architecture
  sourceNodes:   'INTERNAL',
  routing:       'INTERNAL',   // same
  id:            'INTERNAL',   // internal record id, not a client reference number
};

// Document types that represent internal escalation/ops artifacts,
// not client deliverables. A BNCA escalation about a client's SLA
// breach is *input* to a client report, not a line item in one.
const INTERNAL_ONLY_DOC_TYPES = new Set(['ESCALATION']);

function docTypeIsClientSafe(documentType) {
  return !INTERNAL_ONLY_DOC_TYPES.has(documentType);
}

// Codebook for TRANSLATE fields. Fill this in with your real
// exclusion-code taxonomy — this is intentionally a small seed set.
const CODE_LABELS = {
  'SLA-BRK': 'Service level breach',
  'AR-90':   '90+ day aging item',
  'CO-4':    'Coverage exception under review',
  'AP-14':   'Payable pending approval',
  'VAR-12':  'Ledger variance under review',
  '':        null, // empty exclusion code -> omit, not "unknown"
};

function translateCode(code) {
  if (!code) return null;
  return CODE_LABELS[code] || `Flagged item (${code})`; // fail safe, not fail silent
}

/* ------------------------------------------------------------
   2. REDACTION
   One record in, one client-safe record out (or null if the
   whole record shouldn't surface at all).
   ------------------------------------------------------------ */

function redactRecord(record) {
  if (!docTypeIsClientSafe(record.documentType)) return null;

  const out = {};
  for (const [field, policy] of Object.entries(FIELD_POLICY)) {
    if (!(field in record)) continue;
    if (policy === 'SAFE') out[field] = record[field];
  }

  const translatedNote = translateCode(record.exclusionCode);
  if (translatedNote) out.note = translatedNote;

  if (Array.isArray(record.defectFlags) && record.defectFlags.length) {
    out.flags = record.defectFlags; // human-readable strings already in your seed data
  }

  return out;
}

/* ------------------------------------------------------------
   3. PACKAGE ASSEMBLY
   Pulls everything for one client in one vertical, redacts it,
   and adds summary stats a client actually wants at a glance.
   ------------------------------------------------------------ */

function buildClientPackage(vertical, clientId, { periodLabel } = {}) {
  const raw = loadIndexForClient(vertical, clientId);           // existing fn
  const registry = getClientRegistry().find(c => c.id === clientId); // existing fn

  const items = raw
    .map(redactRecord)
    .filter(Boolean)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const summary = {
    totalItems: items.length,
    totalAmount: items.reduce((sum, i) => sum + (i.amount || 0), 0),
    flaggedItems: items.filter(i => i.flags || i.note).length,
  };

  return {
    client: registry ? registry.label : clientId,
    clientId,
    vertical,
    periodLabel: periodLabel || null,
    generatedAt: Date.now(),
    summary,
    items,
  };
}

/* ------------------------------------------------------------
   4. RENDER
   Plain HTML string. window.print() -> PDF is enough for a V1
   with a human reviewing before send — no PDF library needed yet.
   ------------------------------------------------------------ */

function renderClientPackageHTML(pkg) {
  const rows = pkg.items.map(i => `
    <tr>
      <td>${new Date(i.timestamp).toLocaleDateString()}</td>
      <td>${i.documentType || ''}</td>
      <td>${i.fileName || ''}</td>
      <td>${i.vendor || ''}</td>
      <td>${i.amount ? '$' + i.amount.toLocaleString() : ''}</td>
      <td>${[i.note, ...(i.flags || [])].filter(Boolean).join('; ')}</td>
    </tr>`).join('');

  return `
    <div class="client-report">
      <h1>${pkg.client}</h1>
      <p class="meta">${pkg.periodLabel || ''} &middot; Generated ${new Date(pkg.generatedAt).toLocaleDateString()}</p>
      <div class="summary">
        <div><strong>${pkg.summary.totalItems}</strong> items</div>
        <div><strong>$${pkg.summary.totalAmount.toLocaleString()}</strong> total</div>
        <div><strong>${pkg.summary.flaggedItems}</strong> flagged for attention</div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Document</th><th>Vendor</th><th>Amount</th><th>Notes</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ------------------------------------------------------------
   5. DELIVERY (manual V1 — no backend/email service required)
   Opens the user's own mail client with the summary pre-filled.
   A human still attaches the printed/exported PDF and hits send —
   intentional, until the redaction rules are proven trustworthy.
   ------------------------------------------------------------ */

function buildClientEmailDraft(pkg, clientEmail) {
  const subject = encodeURIComponent(`${pkg.client} — ${pkg.periodLabel || 'Report'}`);
  const body = encodeURIComponent(
    `Hi,\n\nAttached is your latest report: ${pkg.summary.totalItems} items, ` +
    `$${pkg.summary.totalAmount.toLocaleString()} total, ` +
    `${pkg.summary.flaggedItems} flagged for attention.\n\nLet us know if you have questions.`
  );
  return `mailto:${clientEmail}?subject=${subject}&body=${body}`;
}

/* ------------------------------------------------------------
   NOTE: this assumes the client registry has an `email` field,
   which it doesn't yet. Minimal addition needed to the existing
   registry object shape:

     { id, label, createdAt, email: null }   // add this field

   and a small UI input wherever clients get registered/edited.
   ------------------------------------------------------------ */