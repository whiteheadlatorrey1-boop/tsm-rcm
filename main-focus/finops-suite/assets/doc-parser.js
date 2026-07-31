/**
 * doc-parser.js — FinOps Suite Document Extraction Engine
 * ─────────────────────────────────────────────────────────
 * Handles: PDF (text + scanned/OCR), DOCX, XLSX, CSV, TXT
 *
 * Usage:
 *   <script src="doc-parser.js"></script>
 *   const result = await DocParser.parse(file);
 *   // result.text    — extracted plain text
 *   // result.meta    — { name, type, pages, method, wordCount }
 *   // result.tables  — array of table data (XLSX/CSV)
 *   // result.preview — first 500 chars
 *
 * CDN deps loaded on demand (no bundler needed):
 *   pdf.js  → Mozilla CDN
 *   Tesseract.js → CDN (OCR fallback for scanned PDFs)
 *   mammoth → CDN (DOCX)
 *   SheetJS → CDN (XLSX)
 *   PapaParse → CDN (CSV)
 */

(function (global) {
  'use strict';

  /* ── CDN URLs ─────────────────────────────────────── */
  const CDN = {
    pdfjs:      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfjsWorker:'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    tesseract:  'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.0.3/tesseract.min.js',
    mammoth:    'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
    sheetjs:    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    papaparse:  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',
  };

  /* ── Script loader ────────────────────────────────── */
  const loaded = {};
  function loadScript(url) {
    if (loaded[url]) return loaded[url];
    loaded[url] = new Promise((res, rej) => {
      if (document.querySelector(`script[src="${url}"]`)) { res(); return; }
      const s = document.createElement('script');
      s.src = url; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    return loaded[url];
  }

  /* ── File → ArrayBuffer / text ────────────────────── */
  const toBuffer  = f => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsArrayBuffer(f); });
  const toBase64  = f => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.onerror=rej; r.readAsDataURL(f); });
  const toText    = f => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsText(f); });

  /* ── Emit progress events ─────────────────────────── */
  function emit(stage, detail) {
    document.dispatchEvent(new CustomEvent('docparser:progress', { detail: { stage, ...detail } }));
  }

  /* ════════════════════════════════════════════════════
     PDF PARSER
     1. Extract text layer via pdf.js
     2. If text yield < threshold → scanned → OCR via Tesseract
  ════════════════════════════════════════════════════ */
  async function parsePDF(file) {
    emit('loading', { msg: 'Loading PDF engine…' });
    await loadScript(CDN.pdfjs);

    const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfjsWorker;

    const buf   = await toBuffer(file);
    const pdf   = await pdfjsLib.getDocument({ data: buf }).promise;
    const nPages = pdf.numPages;

    emit('extracting', { msg: `Extracting text from ${nPages} page(s)…`, pages: nPages });

    let fullText = '';
    let totalChars = 0;
    const scannedPages = [];

    // ── Pass 1: text layer ──────────────────────────────
    for (let p = 1; p <= nPages; p++) {
      emit('page', { msg: `Reading page ${p}/${nPages}`, page: p, total: nPages });
      const page    = await pdf.getPage(p);
      const content = await page.getTextContent();
      const pageText = content.items.map(i => i.str).join(' ').trim();

      if (pageText.length > 30) {
        fullText  += `\n\n[PAGE ${p}]\n${pageText}`;
        totalChars += pageText.length;
      } else {
        scannedPages.push(p);
      }
    }

    // ── Pass 2: OCR for scanned / image pages ───────────
    if (scannedPages.length > 0) {
      emit('ocr', { msg: `${scannedPages.length} scanned page(s) detected — starting OCR…`, scannedPages });
      await loadScript(CDN.tesseract);

      const worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            emit('ocr_progress', { msg: `OCR: ${Math.round(m.progress * 100)}%`, progress: m.progress });
          }
        }
      });

      for (const p of scannedPages) {
        emit('ocr_page', { msg: `OCR page ${p}/${nPages}…`, page: p });
        const page = await pdf.getPage(p);

        // Render page to canvas
        const viewport = page.getViewport({ scale: 2.0 }); // 2x for better OCR
        const canvas   = document.createElement('canvas');
        canvas.width   = viewport.width;
        canvas.height  = viewport.height;
        const ctx      = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        const dataUrl = canvas.toDataURL('image/png');
        const { data: { text } } = await worker.recognize(dataUrl);

        if (text.trim().length > 10) {
          fullText  += `\n\n[PAGE ${p} — OCR]\n${text.trim()}`;
          totalChars += text.length;
        }
      }

      await worker.terminate();
    }

    const method = scannedPages.length === nPages ? 'ocr-only'
                 : scannedPages.length > 0        ? 'text+ocr'
                 : 'text';

    return {
      text:      fullText.trim(),
      preview:   fullText.trim().slice(0, 500),
      meta: {
        name:      file.name,
        type:      'pdf',
        pages:     nPages,
        scanned:   scannedPages.length,
        method,
        wordCount: fullText.split(/\s+/).filter(Boolean).length,
        chars:     totalChars,
      },
      tables: [],
    };
  }

  /* ════════════════════════════════════════════════════
     DOCX PARSER — mammoth.js
  ════════════════════════════════════════════════════ */
  async function parseDOCX(file) {
    emit('loading', { msg: 'Loading DOCX engine…' });
    await loadScript(CDN.mammoth);
    const buf    = await toBuffer(file);
    emit('extracting', { msg: 'Extracting DOCX content…' });
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    const text   = result.value || '';
    return {
      text,
      preview:   text.slice(0, 500),
      meta: {
        name:      file.name,
        type:      'docx',
        method:    'mammoth',
        wordCount: text.split(/\s+/).filter(Boolean).length,
        chars:     text.length,
        messages:  result.messages,
      },
      tables: [],
    };
  }

  /* ════════════════════════════════════════════════════
     XLSX PARSER — SheetJS
     Returns text summary + structured tables
  ════════════════════════════════════════════════════ */
  async function parseXLSX(file) {
    emit('loading', { msg: 'Loading XLSX engine…' });
    await loadScript(CDN.sheetjs);
    const buf  = await toBuffer(file);
    emit('extracting', { msg: 'Parsing spreadsheet…' });
    const wb   = XLSX.read(buf, { type: 'array', cellDates: true });

    const tables = [];
    let fullText = '';

    for (const sheetName of wb.SheetNames) {
      const ws   = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const csv  = XLSX.utils.sheet_to_csv(ws);

      tables.push({ sheet: sheetName, rows: json, csv });
      fullText += `\n\n[SHEET: ${sheetName}]\n${csv}`;
    }

    return {
      text:    fullText.trim(),
      preview: fullText.trim().slice(0, 500),
      meta: {
        name:      file.name,
        type:      'xlsx',
        method:    'sheetjs',
        sheets:    wb.SheetNames,
        wordCount: fullText.split(/\s+/).filter(Boolean).length,
        chars:     fullText.length,
      },
      tables,
    };
  }

  /* ════════════════════════════════════════════════════
     CSV PARSER — PapaParse
  ════════════════════════════════════════════════════ */
  async function parseCSV(file) {
    emit('loading', { msg: 'Loading CSV engine…' });
    await loadScript(CDN.papaparse);
    const rawText = await toText(file);
    emit('extracting', { msg: 'Parsing CSV…' });

    const result  = Papa.parse(rawText, { header: true, skipEmptyLines: true, dynamicTyping: true });
    const headers = result.meta.fields || [];
    const rows    = result.data || [];

    // Build a readable text summary
    let text = `CSV: ${file.name}\nColumns: ${headers.join(', ')}\nRows: ${rows.length}\n\n`;
    // Include first 100 rows as text
    text += rawText.split('\n').slice(0, 101).join('\n');

    return {
      text,
      preview:   text.slice(0, 500),
      meta: {
        name:      file.name,
        type:      'csv',
        method:    'papaparse',
        rows:      rows.length,
        columns:   headers,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        chars:     text.length,
      },
      tables: [{ sheet: 'Sheet1', rows: [headers, ...rows.map(r => headers.map(h => r[h]))], csv: rawText }],
    };
  }

  /* ════════════════════════════════════════════════════
     TXT / fallback — plain FileReader
  ════════════════════════════════════════════════════ */
  async function parseTXT(file) {
    emit('extracting', { msg: 'Reading text file…' });
    const text = await toText(file);
    return {
      text,
      preview:   text.slice(0, 500),
      meta: {
        name:      file.name,
        type:      'txt',
        method:    'filereader',
        wordCount: text.split(/\s+/).filter(Boolean).length,
        chars:     text.length,
      },
      tables: [],
    };
  }

  /* ════════════════════════════════════════════════════
     MAIN ENTRY — DocParser.parse(file)
  ════════════════════════════════════════════════════ */
  async function parse(file) {
    if (!file) throw new Error('No file provided');

    const name = file.name.toLowerCase();
    const ext  = name.split('.').pop();
    const mime = file.type;

    emit('start', { msg: `Parsing ${file.name}…`, file: file.name, size: file.size });

    let result;
    try {
      if (ext === 'pdf' || mime === 'application/pdf') {
        result = await parsePDF(file);
      } else if (ext === 'docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        result = await parseDOCX(file);
      } else if (ext === 'xlsx' || ext === 'xls' || mime.includes('spreadsheet') || mime.includes('excel')) {
        result = await parseXLSX(file);
      } else if (ext === 'csv' || mime === 'text/csv') {
        result = await parseCSV(file);
      } else {
        result = await parseTXT(file);
      }
    } catch (err) {
      emit('error', { msg: `Parse error: ${err.message}`, error: err.message });
      throw err;
    }

    emit('done', { msg: `Done — ${result.meta.wordCount} words extracted`, meta: result.meta });
    return result;
  }

  /* ── Expose globally ─────────────────────────────── */
  global.DocParser = { parse, version: '1.0.0' };

})(window);
