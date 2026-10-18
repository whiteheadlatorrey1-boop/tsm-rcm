'use strict';

/**
 * Generic PDF cover-sheet export for a BPO-service weekly report -- same
 * pdfkit pattern as server.js's existing BPO evidence-package export and
 * the construction-bpo-specific one in routes/construction-bpo.js, but
 * driven entirely off the report's own data rather than hardcoded field
 * names: `report.summary` is an ordered array of { key, label, value }
 * (not a plain object) specifically so the rendered label text and order
 * are the plug-in's choice, not this file's.
 */

const PDFDocument = require('pdfkit');

function fmtValue(v) {
  if (v == null) return '—';
  return typeof v === 'number' ? v.toLocaleString() : String(v);
}

function flagLine(f) {
  const parts = [f.type];
  if (f.reason) parts.push(f.reason);
  if (f.jobId) parts.push('job ' + f.jobId);
  if (f.id) parts.push(f.id);
  if (f.subcontractor) parts.push(f.subcontractor);
  if (f.status) parts.push('[' + f.status + ']');
  return parts.join(' - ');
}

/** renderReportPdf(res, report, title?) -- pipes a PDF directly to res. report should already be client-sanitized if the requester isn't staff. */
function renderReportPdf(res, report, title) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="bpo-${report.vertical}-${report.clientId}-${report.weekEnding}.pdf"`);
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text(title || 'Weekly Review', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#555')
    .text(`Client: ${report.clientId}    Week ending: ${report.weekEnding}`)
    .text(`Published ${report.publishedAt || '—'} by ${report.publishedBy || '—'}`);
  doc.fillColor('#000').moveDown();

  doc.fontSize(13).text('Summary');
  doc.fontSize(10);
  for (const row of report.summary || []) {
    doc.text(`${row.label}: ${fmtValue(row.value)}`);
  }
  doc.moveDown();

  doc.fontSize(13).text('Flags');
  const flags = report.flags || [];
  if (!flags.length) {
    doc.fontSize(10).fillColor('#777').text('No flags on this report.').fillColor('#000');
  } else {
    doc.fontSize(9);
    for (const f of flags) doc.text(flagLine(f));
  }
  doc.end();
}

module.exports = { renderReportPdf };
