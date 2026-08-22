#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function extractPdfText(filePath) {
  const buf = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    return result.text.slice(0, 20000);
  } finally {
    await parser.destroy();
  }
}

async function classify(baseUrl, filePath) {
  const fileName = path.basename(filePath);
  const textContent = await extractPdfText(filePath);
  console.log(`\n=== ${fileName} ===`);
  console.log(`extracted ${textContent.length} chars of text`);

  const started = Date.now();
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/doc-router/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, textContent }),
  });
  const elapsed = Date.now() - started;

  let body;
  try {
    body = await res.json();
  } catch (e) {
    body = { parseError: e.message, raw: await res.text().catch(() => '') };
  }

  console.log(`status: ${res.status}  (${elapsed}ms)`);
  console.log(JSON.stringify(body, null, 2));
  return { fileName, status: res.status, body };
}

async function main() {
  const [, , baseUrl, ...files] = process.argv;
  if (!baseUrl || files.length === 0) {
    console.error('Usage: node test-classify.js <base-url> <file1.pdf> [file2.pdf ...]');
    process.exit(1);
  }

  const results = [];
  for (const f of files) {
    try {
      results.push(await classify(baseUrl, f));
    } catch (e) {
      console.error(`\n=== ${path.basename(f)} FAILED TO RUN ===`);
      console.error(e.stack || e.message);
      results.push({ fileName: path.basename(f), status: 'script_error', error: e.message });
    }
  }

  console.log('\n=== SUMMARY ===');
  for (const r of results) {
    console.log(`${r.fileName}: ${r.status}${r.body?.error ? ' -- ' + r.body.error : ''}`);
  }
}

main();
