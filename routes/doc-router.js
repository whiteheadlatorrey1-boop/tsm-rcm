'use strict';
const express = require('express');
const router  = express.Router();

// =====================================================
// GENERIC DOCUMENT EXTRACTION ROUTE — vertical-agnostic
// Real server-side text extraction for binary (zip-based) document
// formats: .docx, .xlsx, .xls, plus .pdf for completeness. Any page
// can call this instead of duplicating the pattern already proven in
// routes/construction.js and routes/finops.js (upload-doc).
//
// Client contract (see html/tsm-doc-search-multi.html extractBinaryDoc()):
//   POST /api/doc-router/extract-file   multipart/form-data, field "file"
//   200  { text: "<extracted plain text>" }
//   4xx/5xx { error: "<message>" }
// =====================================================
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

const SUPPORTED_EXTENSIONS = ['.txt', '.csv', '.md', '.json', '.pdf', '.docx', '.xlsx', '.xls'];
function isSupported(filename) {
  const name = (filename || '').toLowerCase();
  return SUPPORTED_EXTENSIONS.some(ext => name.endsWith(ext));
}

async function extractDocText(file) {
  const name = (file.originalname || 'uploaded-document').toLowerCase();
  const raw = file.buffer || Buffer.from('');
  let text = '';

  if (name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.md') || name.endsWith('.json')) {
    text = raw.toString('utf8');
  } else if (name.endsWith('.pdf')) {
    const parser = new PDFParse({ data: raw });
    try {
      const result = await parser.getText();
      text = result.text || '';
    } finally {
      await parser.destroy();
    }
  } else if (name.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: raw });
    text = result.value || '';
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const workbook = XLSX.read(raw, { type: 'buffer' });
    text = workbook.SheetNames.map(sheetName =>
      XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])
    ).join('\n\n');
  } else {
    // Unsupported binary type (images, etc.) — caller should route these
    // elsewhere (e.g. extractPdf()/fileToBase64() for images). Returning
    // an explicit error keeps this honest instead of silently returning ''.
    throw new Error('unsupported_file_type');
  }

  return String(text || '');
}

router.post('/api/doc-router/extract-file', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!isSupported(file.originalname)) {
      return res.status(415).json({ error: 'unsupported_file_type' });
    }

    const text = await extractDocText(file);
    return res.json({ text });
  } catch (err) {
    console.error(`[doc-router extract-file] failed for ${req.file && req.file.originalname}:`, err.message);
    return res.status(500).json({ error: err.message || 'extraction_failed' });
  }
});

// Export the router as the default (Express expects app.use(require(...)) to
// get a router/middleware function), while also attaching the extraction
// helpers as properties on it so other modules (e.g. the BPO upload route in
// server.js) can reuse the same isSupported()/extractDocText() logic instead
// of duplicating it. `require('./routes/doc-router')` still works exactly as
// before for `app.use(...)`; callers that want the helpers do
// `require('./routes/doc-router').extractDocText` etc.
module.exports = router;
module.exports.isSupported = isSupported;
module.exports.extractDocText = extractDocText;
