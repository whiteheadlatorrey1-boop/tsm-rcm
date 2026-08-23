# BPO Services Stress Test

Generates synthetic claims, contracts, vendor forms, invoices, and property
maintenance forms — plus a deliberate slice of hostile edge cases — and
pushes them through the **real** BPO document pipeline:

```
login → open batch → open N cases → upload docs (concurrent) → report outcomes → pull server summary
```

This isn't a mock. It exercises the same routes the actual client-facing
intake flow uses: `POST /api/bpo/batches`, `POST /api/bpo/work-items/:caseId`,
`POST /api/bpo/work-items/:caseId/documents` (which runs real extraction —
mammoth/xlsx/pdf-parse — via `routes/doc-router.js`), and
`POST /api/bpo/batches/:batchId/documents`.

No new npm dependencies — everything runs on Node 18+'s built-in `fetch`,
`FormData`, and `Blob`.

## Quick start

```bash
# Preview the document mix without touching the network
node scripts/stress-test/run-stress-test.js --dry-run --count 50 --save-dir /tmp/preview

# Run against a local dev server
TSM_ADMIN_PASSWORD=your-dev-password \
  node scripts/stress-test/run-stress-test.js \
    --base-url http://localhost:8080 \
    --count 200 \
    --concurrency 10 \
    --cases 25 \
    --report ./stress-report.json
```

## Flags

| Flag | Default | What it does |
|---|---|---|
| `--base-url <url>` | `http://localhost:8080` | Target server |
| `--password <pw>` | `$TSM_ADMIN_PASSWORD` | Admin password |
| `--access-code <code>` | — | Staff/client access code instead of admin password |
| `--count <n>` | 100 | Number of documents to generate |
| `--concurrency <n>` | 8 | Concurrent in-flight uploads |
| `--cases <n>` | 20 | Work-items to spread documents across (round-robin) |
| `--vertical <name>` | `bpo` | Vertical tag on the batch record |
| `--client-id <id>` | — | Attach cases to an existing BPO client |
| `--dry-run` | off | Generate + print the mix, skip all network calls |
| `--save-dir <path>` | — | Also write every generated doc to disk |
| `--report <path>` | — | Write the full JSON result report to disk |

## What it measures

- **Throughput** — docs/sec sustained through the upload pipeline
- **Latency** — p50/p95/p99/max per document upload
- **Success/failure rate**, broken down by document type
- **Edge-case behavior** — oversized (>8MB), unsupported extension, malformed
  JSON, empty file — each with the *expected* outcome noted, since a
  "failure" here (e.g. the oversized file getting rejected) is the correct
  result, not a bug
- **Server-side cross-check** — pulls `/api/bpo/batches/:batchId/summary`
  from the server itself and prints it next to the harness's own tally;
  if they disagree, that's worth investigating on its own

## Extending the document mix

`doc-generator.js` exports `GENERATORS` (one function per doc type) and
`DEFAULT_MIX` (relative weights). To add a new document type or vertical,
add a generator function following the existing pattern (return
`{ filename, content, mimetype, docType, vertical, expectSupported }`) and
add it to `GENERATORS` + `DEFAULT_MIX`.

## Safety notes

- Run this against a **local or dev** instance, not a production Fly
  deployment with real client data, unless you specifically intend to load
  real production infrastructure.
- Every case this script creates is prefixed `STRESS-<batchId>-`, so
  stress-test cases are easy to find and clean up afterward (`GET
  /api/bpo/cases?...` filtered by that prefix, or query the batch by
  `batchId` printed at the end of the run).
- The `edge_case_oversized` generator creates a ~10MB in-memory string per
  document — keep `--count` and `--concurrency` reasonable if your mix
  weighting includes many of these, since it's real memory pressure on
  the machine running the script.
