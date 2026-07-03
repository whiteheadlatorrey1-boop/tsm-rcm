// extract-fields.js
// Pulls a vendor identifier and a dollar amount out of REAL text content.
// Only meant to be called on file types where safeTextFromBuffer() in
// routes/finops.js returns actual file content (.txt/.csv/.md/.json) —
// never call this on the placeholder boilerplate text generated for
// PDF/DOCX/XLSX until real parsing exists for those formats.
//
// Returns null whenever it can't find a confident vendor + amount pair.
// Returning null is the correct, honest behavior — it means "not enough
// signal," not "guess something."

function tryExtractFromCsv(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const vendorIdx = header.findIndex(h => /vendor|supplier|payee/.test(h));
  const amountIdx = header.findIndex(h => /amount|total|balance/.test(h));

  if (vendorIdx === -1 || amountIdx === -1) return null;

  // NOTE: only reads the first data row. A CSV with many rows is more
  // likely a ledger/aging report than a single invoice — multi-row
  // handling is a separate, not-yet-built feature, not this function's job.
  const firstRow = lines[1].split(',').map(c => c.trim());
  const vendorName = firstRow[vendorIdx];
  const amountRaw = firstRow[amountIdx];

  if (!vendorName || !amountRaw) return null;

  const amount = parseAmount(amountRaw);
  if (amount === null) return null;

  return { vendorName, amount, method: 'csv_header_match' };
}

function tryExtractFromPlainText(text) {
  const vendorMatch = text.match(/(?:vendor(?:\s*name)?|supplier|bill(?:ed)?\s*(?:from|by))\s*[:\-]\s*([^\n\r]{2,80})/i);
  if (!vendorMatch) return null;
  const vendorName = vendorMatch[1].trim();

  // Prefer an explicit labeled total; fall back to the largest dollar
  // figure in the document (common invoice heuristic: line items are
  // smaller than the total). Both are honest best-effort, not guaranteed.
  const labeledMatch = text.match(/(?:total|amount\s*due|balance\s*due|grand\s*total)\s*[:\-]?\s*\$?\s*([\d,]+\.\d{2})/i);
  let amount = labeledMatch ? parseAmount(labeledMatch[1]) : null;

  if (amount === null) {
    const allAmounts = [...text.matchAll(/\$\s*([\d,]+\.\d{2})/g)]
      .map(m => parseAmount(m[1]))
      .filter(n => n !== null);
    if (allAmounts.length === 0) return null;
    amount = Math.max(...allAmounts);
  }

  return { vendorName, amount, method: labeledMatch ? 'labeled_total' : 'largest_dollar_figure' };
}

function parseAmount(raw) {
  const cleaned = raw.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

function normalizeVendorId(vendorName) {
  return vendorName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * @param {string} text - real extracted file content (not placeholder text)
 * @returns {{ vendor_id: string, vendor_name: string, amount: number, method: string } | null}
 */
function extractInvoiceFields(text) {
  if (!text || typeof text !== 'string') return null;

  const result = tryExtractFromCsv(text) || tryExtractFromPlainText(text);
  if (!result) return null;

  return {
    vendor_id: normalizeVendorId(result.vendorName),
    vendor_name: result.vendorName,
    amount: result.amount,
    method: result.method
  };
}

module.exports = { extractInvoiceFields };
