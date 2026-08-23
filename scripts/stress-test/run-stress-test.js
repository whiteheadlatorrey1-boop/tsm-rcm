#!/usr/bin/env node
'use strict';

/**
 * BPO Services stress-test harness.
 *
 * Generates synthetic claims/contracts/vendor-forms/invoices (plus a
 * deliberate slice of hostile edge cases) via doc-generator.js and pushes
 * them through the REAL BPO pipeline exactly the way a client's document
 * intake would:
 *
 *   1. POST /api/auth/login                          — authenticate
 *   2. POST /api/bpo/batches                          — open a batch
 *   3. POST /api/bpo/work-items/:caseId (x N cases)   — open cases to spread load across
 *   4. POST /api/bpo/work-items/:caseId/documents     — upload each doc (concurrent pool)
 *   5. POST /api/bpo/batches/:batchId/documents        — report each outcome back to the batch
 *   6. GET  /api/bpo/batches/:batchId/summary          — pull the server's own tally
 *
 * No new dependencies — uses Node 18+'s built-in fetch/FormData/Blob.
 *
 * USAGE
 *   node scripts/stress-test/run-stress-test.js \
 *     --base-url http://localhost:8080 \
 *     --password "$TSM_ADMIN_PASSWORD" \
 *     --count 200 \
 *     --concurrency 10 \
 *     --cases 25
 *
 *   Dry run (no network — just generate and inspect the mix):
 *   node scripts/stress-test/run-stress-test.js --dry-run --count 50
 *
 * FLAGS
 *   --base-url <url>       Target server (default: http://localhost:8080)
 *   --password <pw>        Admin password (or set TSM_ADMIN_PASSWORD env var)
 *   --access-code <code>   Staff/client access code instead of admin password
 *   --count <n>             Number of documents to generate (default: 100)
 *   --concurrency <n>       Concurrent in-flight uploads (default: 8)
 *   --cases <n>             Number of work-items to spread documents across (default: 20)
 *   --vertical <name>       Vertical tag for the batch record (default: bpo)
 *   --client-id <id>        Attach all cases to an existing BPO client id
 *   --dry-run               Generate docs and print the mix; skip all network calls
 *   --save-dir <path>       Also write every generated doc to disk (useful with --dry-run)
 *   --report <path>         Write the full JSON result report to this path
 */

const fs = require('fs');
const path = require('path');
const { generateBatch } = require('./doc-generator');

// ---------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------
function parseArgs(argv) {
  const opts = {
    baseUrl: process.env.TSM_STRESS_BASE_URL || 'http://localhost:8080',
    password: process.env.TSM_ADMIN_PASSWORD || null,
    accessCode: null,
    count: 100,
    concurrency: 8,
    cases: 20,
    vertical: 'bpo',
    clientId: null,
    dryRun: false,
    saveDir: null,
    report: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--base-url': opts.baseUrl = next(); break;
      case '--password': opts.password = next(); break;
      case '--access-code': opts.accessCode = next(); break;
      case '--count': opts.count = parseInt(next(), 10); break;
      case '--concurrency': opts.concurrency = parseInt(next(), 10); break;
      case '--cases': opts.cases = parseInt(next(), 10); break;
      case '--vertical': opts.vertical = next(); break;
      case '--client-id': opts.clientId = next(); break;
      case '--dry-run': opts.dryRun = true; break;
      case '--save-dir': opts.saveDir = next(); break;
      case '--report': opts.report = next(); break;
      default:
        console.error(`Unknown flag: ${a}`);
        process.exit(1);
    }
  }
  return opts;
}

// ---------------------------------------------------------------------
// Tiny concurrency pool — no dependency needed for this.
// ---------------------------------------------------------------------
async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, next);
  await Promise.all(workers);
  return results;
}

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.min(sortedArr.length - 1, Math.floor((p / 100) * sortedArr.length));
  return sortedArr[idx];
}

// ---------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------
function parseSessionCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/tsm_session=([^;]+)/);
  return match ? `tsm_session=${match[1]}` : null;
}

async function login(baseUrl, { password, accessCode }) {
  const body = password ? { password } : { accessCode };
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(`Login failed (${res.status}): ${json.error || res.statusText}`);
  }
  const cookie = parseSessionCookie(res.headers.get('set-cookie'));
  if (!cookie) throw new Error('Login succeeded but no session cookie was returned');
  return { cookie, role: json.role, label: json.label };
}

async function jsonRequest(baseUrl, cookie, method, urlPath, payload) {
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}${urlPath}`, {
      method,
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });
    const latencyMs = Date.now() - start;
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok && json.ok !== false, status: res.status, json, latencyMs };
  } catch (err) {
    return { ok: false, status: 0, json: { error: err.message }, latencyMs: Date.now() - start };
  }
}

async function uploadDocument(baseUrl, cookie, caseId, doc) {
  const start = Date.now();
  try {
    const form = new FormData();
    const blob = new Blob([doc.content], { type: doc.mimetype });
    form.append('file', blob, doc.filename);

    const res = await fetch(`${baseUrl}/api/bpo/work-items/${encodeURIComponent(caseId)}/documents`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    });
    const latencyMs = Date.now() - start;
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok && json.ok !== false, status: res.status, json, latencyMs };
  } catch (err) {
    return { ok: false, status: 0, json: { error: err.message }, latencyMs: Date.now() - start };
  }
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------
async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log(`\n=== TSM BPO Stress Test ===`);
  console.log(`Target:      ${opts.dryRun ? '(dry run — no network)' : opts.baseUrl}`);
  console.log(`Documents:   ${opts.count}`);
  console.log(`Concurrency: ${opts.concurrency}`);
  console.log(`Cases:       ${opts.cases}`);
  console.log('');

  const docs = generateBatch(opts.count);

  // Mix breakdown, always printed — useful even outside dry-run.
  const mixCounts = {};
  for (const d of docs) mixCounts[d.docType] = (mixCounts[d.docType] || 0) + 1;
  console.log('Generated mix:');
  for (const [type, n] of Object.entries(mixCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(28)} ${n}`);
  }
  console.log('');

  if (opts.saveDir) {
    fs.mkdirSync(opts.saveDir, { recursive: true });
    let savedCount = 0;
    for (const d of docs) {
      // Skip writing the multi-MB oversized fixture to disk by default —
      // still generated/uploaded, just not dumped as a giant file locally.
      if (d.docType === 'edge_case_oversized') continue;
      fs.writeFileSync(path.join(opts.saveDir, d.filename), d.content);
      savedCount++;
    }
    console.log(`Saved ${savedCount} documents to ${opts.saveDir}\n`);
  }

  if (opts.dryRun) {
    console.log('Dry run complete — no documents were uploaded.');
    return;
  }

  if (!opts.password && !opts.accessCode) {
    console.error('ERROR: no credential provided. Pass --password (or set TSM_ADMIN_PASSWORD) or --access-code.');
    process.exit(1);
  }

  // 1. Auth
  console.log('Logging in...');
  const session = await login(opts.baseUrl, opts);
  console.log(`  Authenticated as role=${session.role}${session.label ? ` (${session.label})` : ''}\n`);

  // 2. Open a batch
  console.log('Creating batch record...');
  const batchRes = await jsonRequest(opts.baseUrl, session.cookie, 'POST', '/api/bpo/batches', {
    vertical: opts.vertical,
    source: 'stress-test',
    totalDocuments: docs.length,
    tenantId: opts.clientId,
  });
  if (!batchRes.ok) {
    console.error(`Failed to create batch: ${JSON.stringify(batchRes.json)}`);
    process.exit(1);
  }
  const batchId = batchRes.json.batch.batchId;
  console.log(`  Batch ${batchId} opened for ${docs.length} documents\n`);

  // 3. Open N cases to spread documents across (round-robin assignment)
  console.log(`Opening ${opts.cases} work-items...`);
  const caseIds = Array.from({ length: opts.cases }, (_, i) => `STRESS-${batchId}-${i + 1}`);
  await runPool(caseIds, opts.concurrency, async (caseId) => {
    await jsonRequest(opts.baseUrl, session.cookie, 'POST', `/api/bpo/work-items/${encodeURIComponent(caseId)}`, {
      clientId: opts.clientId,
      vertical: opts.vertical,
      stage: 'war-room',
      status: 'open',
      payload: { source: 'stress-test', createdBy: 'run-stress-test.js' },
    });
  });
  console.log(`  ${caseIds.length} cases ready\n`);

  // 4 + 5. Upload every document, then report its outcome to the batch.
  console.log(`Uploading ${docs.length} documents (concurrency ${opts.concurrency})...`);
  const overallStart = Date.now();
  let completed = 0;

  const results = await runPool(docs, opts.concurrency, async (doc, i) => {
    const caseId = caseIds[i % caseIds.length];
    const uploadResult = await uploadDocument(opts.baseUrl, session.cookie, caseId, doc);

    await jsonRequest(opts.baseUrl, session.cookie, 'POST', `/api/bpo/batches/${batchId}/documents`, {
      caseId: uploadResult.ok ? uploadResult.json.document && uploadResult.json.document.caseId || caseId : undefined,
      ok: uploadResult.ok,
    });

    completed++;
    if (completed % Math.max(1, Math.floor(docs.length / 10)) === 0 || completed === docs.length) {
      process.stdout.write(`  ${completed}/${docs.length}\r`);
    }

    return {
      filename: doc.filename,
      docType: doc.docType,
      vertical: doc.vertical,
      caseId,
      expectSupported: doc.expectSupported,
      expectReason: doc.expectReason || null,
      status: uploadResult.status,
      ok: uploadResult.ok,
      latencyMs: uploadResult.latencyMs,
      error: uploadResult.ok ? null : (uploadResult.json && uploadResult.json.error) || 'unknown error',
      extractionError: uploadResult.ok ? (uploadResult.json.document && uploadResult.json.document.extractionError) || null : null,
    };
  });

  const wallMs = Date.now() - overallStart;
  console.log(`\n\nUpload phase complete in ${(wallMs / 1000).toFixed(1)}s\n`);

  // 6. Pull the server's own batch summary as a cross-check against our
  //    client-side tally — if these disagree, that's a real bug to chase.
  const summaryRes = await jsonRequest(opts.baseUrl, session.cookie, 'GET', `/api/bpo/batches/${batchId}/summary`);

  // ---- Report ---------------------------------------------------------
  const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
  const successes = results.filter(r => r.ok);
  const failures = results.filter(r => !r.ok);
  const throughput = docs.length / (wallMs / 1000);

  const byType = {};
  for (const r of results) {
    byType[r.docType] = byType[r.docType] || { total: 0, ok: 0, failed: 0 };
    byType[r.docType].total++;
    byType[r.docType][r.ok ? 'ok' : 'failed']++;
  }

  console.log('=== RESULTS ===');
  console.log(`Total:        ${results.length}`);
  console.log(`Succeeded:    ${successes.length}`);
  console.log(`Failed:       ${failures.length}`);
  console.log(`Throughput:   ${throughput.toFixed(2)} docs/sec`);
  console.log(`Latency p50:  ${percentile(latencies, 50)}ms`);
  console.log(`Latency p95:  ${percentile(latencies, 95)}ms`);
  console.log(`Latency p99:  ${percentile(latencies, 99)}ms`);
  console.log(`Latency max:  ${latencies[latencies.length - 1] || 0}ms`);
  console.log('');

  console.log('By document type:');
  for (const [type, s] of Object.entries(byType)) {
    console.log(`  ${type.padEnd(28)} ${s.ok}/${s.total} ok`);
  }
  console.log('');

  if (failures.length) {
    console.log('Failures (first 15):');
    for (const f of failures.slice(0, 15)) {
      console.log(`  [${f.status}] ${f.filename} — ${f.error}`);
    }
    console.log('');
  }

  // Edge cases get their own callout since "failed" there is often the
  // CORRECT outcome (e.g. oversized file should be rejected) — flag any
  // edge case that behaved unexpectedly instead of burying it in the
  // generic failure list above.
  const edgeCases = results.filter(r => r.docType.startsWith('edge_case'));
  if (edgeCases.length) {
    console.log('Edge-case behavior check:');
    for (const e of edgeCases) {
      const note = e.expectReason ? ` — expected: ${e.expectReason}` : '';
      console.log(`  ${e.filename}: ok=${e.ok} status=${e.status}${note}`);
    }
    console.log('');
  }

  if (summaryRes.ok) {
    console.log('Server-side batch summary (cross-check):');
    console.log(`  ${JSON.stringify(summaryRes.json.summary)}`);
    console.log('');
  } else {
    console.log('Could not fetch server-side batch summary for cross-check.\n');
  }

  const report = {
    baseUrl: opts.baseUrl,
    batchId,
    startedAt: new Date(overallStart).toISOString(),
    wallMs,
    throughputDocsPerSec: throughput,
    latency: {
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      max: latencies[latencies.length - 1] || 0,
    },
    totals: { total: results.length, succeeded: successes.length, failed: failures.length },
    byType,
    serverBatchSummary: summaryRes.ok ? summaryRes.json.summary : null,
    results,
  };

  if (opts.report) {
    fs.writeFileSync(opts.report, JSON.stringify(report, null, 2));
    console.log(`Full report written to ${opts.report}`);
  }

  console.log(`Batch ID for follow-up: ${batchId}`);
}

main().catch(err => {
  console.error('\nStress test failed:', err);
  process.exit(1);
});
