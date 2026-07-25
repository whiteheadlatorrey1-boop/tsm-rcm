'use strict';
// =====================================================
// TSM LIVE DATA MODULE — generic per-domain uploader
// =====================================================
// Lets any war room swap its hardcoded sample/mock data for data the
// user actually uploads (CSV, JSON, or XLSX). Uploaded data is parsed
// into an array of plain-object records and persisted to a small JSON
// file per domain under data/live-data-store/. Nothing here fabricates
// numbers — if nothing has been uploaded, the API reports "sample" and
// the front end keeps using its existing hardcoded/sample arrays.
//
// Domains: approval, bpo, catalog, cpq, crm, o2c, governance,
//          digital-twin, integration-hub

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const VALID_DOMAINS = new Set([
  'approval', 'bpo', 'catalog', 'cpq', 'crm', 'o2c',
  'governance', 'digital-twin', 'integration-hub'
]);

const STORE_DIR = path.join(__dirname, '..', 'data', 'live-data-store');

function ensureStoreDir() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function storeFile(domain) {
  return path.join(STORE_DIR, `${domain}.json`);
}

function readStore(domain) {
  ensureStoreDir();
  const f = storeFile(domain);
  if (!fs.existsSync(f)) return null;
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeStore(domain, payload) {
  ensureStoreDir();
  fs.writeFileSync(storeFile(domain), JSON.stringify(payload, null, 2));
}

function deleteStore(domain) {
  ensureStoreDir();
  const f = storeFile(domain);
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

// ── Tabular parsing ──────────────────────────────────────────────────
// Turns CSV / JSON / XLSX bytes into an array of plain-object records.
// Returns { records, columns } or throws with a human-readable message.

function coerceValue(raw) {
  if (raw === '') return '';
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isNaN(n)) return n;
  }
  if (/^(true|false)$/i.test(trimmed)) return /^true$/i.test(trimmed);
  return raw;
}

function parseCSVLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { fields.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseCSV(text) {
  const lines = text.split(/\r\n|\n|\r/).filter(l => l.length > 0);
  if (lines.length === 0) return { records: [], columns: [] };
  const header = parseCSVLine(lines[0]).map(h => h.trim());
  const records = lines.slice(1).map(line => {
    const cells = parseCSVLine(line);
    const rec = {};
    header.forEach((h, i) => { rec[h] = coerceValue(cells[i] !== undefined ? cells[i] : ''); });
    return rec;
  });
  return { records, columns: header };
}

function parseJSONData(text) {
  const data = JSON.parse(text);
  const records = Array.isArray(data) ? data : (Array.isArray(data.records) ? data.records : [data]);
  const columns = records.length ? Object.keys(records[0]) : [];
  return { records, columns };
}

function parseXLSX(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const columns = records.length ? Object.keys(records[0]) : [];
  return { records, columns };
}

function parseUpload(file) {
  const name = (file.originalname || '').toLowerCase();
  if (name.endsWith('.csv')) {
    return parseCSV(file.buffer.toString('utf8'));
  }
  if (name.endsWith('.json')) {
    return parseJSONData(file.buffer.toString('utf8'));
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseXLSX(file.buffer);
  }
  const err = new Error(`Unsupported file type: ${file.originalname}. Use .csv, .json, or .xlsx.`);
  err.statusCode = 400;
  throw err;
}

function requireValidDomain(req, res, next) {
  const { domain } = req.params;
  if (!VALID_DOMAINS.has(domain)) {
    return res.status(404).json({ ok: false, error: `Unknown domain: ${domain}` });
  }
  next();
}

// ── Routes ───────────────────────────────────────────────────────────

// GET /api/live-data/:domain/status — is this domain running live or sample data?
router.get('/api/live-data/:domain/status', requireValidDomain, (req, res) => {
  const { domain } = req.params;
  const stored = readStore(domain);
  if (!stored) {
    return res.json({ ok: true, domain, source: 'sample', record_count: 0 });
  }
  res.json({
    ok: true,
    domain,
    source: 'live',
    filename: stored.filename,
    uploaded_at: stored.uploaded_at,
    record_count: (stored.records || []).length,
    columns: stored.columns || []
  });
});

// GET /api/live-data/:domain/data — the actual uploaded records (empty if none)
router.get('/api/live-data/:domain/data', requireValidDomain, (req, res) => {
  const { domain } = req.params;
  const stored = readStore(domain);
  if (!stored) {
    return res.json({ ok: true, domain, source: 'sample', records: [] });
  }
  res.json({
    ok: true,
    domain,
    source: 'live',
    filename: stored.filename,
    uploaded_at: stored.uploaded_at,
    records: stored.records || [],
    columns: stored.columns || []
  });
});

// POST /api/live-data/:domain/upload — upload a CSV/JSON/XLSX file
router.post('/api/live-data/:domain/upload', requireValidDomain, upload.single('file'), (req, res) => {
  const { domain } = req.params;
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded (expected multipart field "file").' });
    }
    const { records, columns } = parseUpload(req.file);
    const payload = {
      filename: req.file.originalname,
      uploaded_at: new Date().toISOString(),
      records,
      columns
    };
    writeStore(domain, payload);
    res.json({
      ok: true,
      domain,
      source: 'live',
      filename: payload.filename,
      uploaded_at: payload.uploaded_at,
      record_count: records.length,
      columns
    });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message || 'Upload failed' });
  }
});

// DELETE /api/live-data/:domain — revert to sample/mock data
router.delete('/api/live-data/:domain', requireValidDomain, (req, res) => {
  const { domain } = req.params;
  deleteStore(domain);
  res.json({ ok: true, domain, source: 'sample' });
});

module.exports = router;
module.exports.readStore = readStore;
module.exports.writeStore = writeStore;
module.exports.VALID_DOMAINS = VALID_DOMAINS;
