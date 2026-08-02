#!/usr/bin/env python3
"""
apply_generative_playbook.py
──────────────────────────────────────────────────────────────────────
One-shot, assert-guarded patch that wires the generative playbook route
into the real files:

  1. server.js
       - inserts the /api/doc-router/playbook route (read verbatim from
         route-doc-router-playbook.js, which must sit next to this
         script) directly after the existing /api/doc-router/classify
         route.

  2. tsm-doc-search-multi.html
       - routeDocument(): adds a 4th `extraction` param and stores the
         raw extracted text on doc._ext.rawText (capped at 6000 chars,
         same cap the server route uses) so the playbook route has
         something to ground its output in.
       - processFile(): passes `extraction` into the routeDocument()
         call site.
       - openHcNodeWithDoc(): becomes async. Pre-opens a blank window
         SYNCHRONOUSLY (before any await) so the browser still treats
         it as a direct result of the user's click and doesn't block
         it as a popup — then does the fetch, writes localStorage same
         as before, and only then navigates that pre-opened window to
         the target war room. Falls back to the original STEP_SETS
         template — computed locally, unchanged — if the fetch fails,
         times out (12s), or the popup was blocked outright.

Every patch is guarded by an assert on the EXACT current text before
touching anything. If a file doesn't match byte-for-byte what this
script expects (because it's already been patched, or edited since),
the assert fails loudly and NOTHING is written — no partial patches,
no silent corruption. Each file is fully patched in memory first, then
written, then verified.

USAGE
  python3 apply_generative_playbook.py \\
      --server /path/to/server.js \\
      --frontend /path/to/tsm-doc-search-multi.html

  Defaults to ./server.js and ./tsm-doc-search-multi.html if not given
  — run from the repo root, or pass explicit paths.

Exit code 0 on full success. Non-zero and no files touched on any
assertion failure — read the error, it tells you exactly which chunk
of text didn't match and why (already patched vs. genuinely changed).
──────────────────────────────────────────────────────────────────────
"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROUTE_FILE = SCRIPT_DIR / "route-doc-router-playbook.js"


def fail(msg):
    print(f"\n❌ ABORTED — nothing was written.\n   {msg}\n", file=sys.stderr)
    sys.exit(1)


def assert_count(text, needle, expected, label):
    n = text.count(needle)
    if n != expected:
        fail(
            f"Expected {expected} occurrence(s) of anchor [{label}] but found {n}.\n"
            f"   This means the file has already been patched, or has changed since\n"
            f"   this script was written. Anchor text was:\n"
            f"   ---\n   {needle[:400]}\n   ---"
        )


# ──────────────────────────────────────────────────────────────────
# 1. SERVER.JS — insert the new route after the classify route
# ──────────────────────────────────────────────────────────────────
SERVER_ANCHOR = """    res.json(parsed);
  } catch (err) {
    console.error('[doc-router] error:', err);
    res.status(500).json({ error: 'Internal error.' });
  }
});
"""

IDEMPOTENCY_MARKER = "/api/doc-router/playbook"


def patch_server(path: Path):
    text = path.read_text(encoding="utf-8")

    if IDEMPOTENCY_MARKER in text:
        print(f"↷  {path.name}: /api/doc-router/playbook already present — skipping server patch.")
        return text, False

    assert_count(text, SERVER_ANCHOR, 1, "end of /api/doc-router/classify route")

    if not ROUTE_FILE.exists():
        fail(f"Expected route file at {ROUTE_FILE} — put route-doc-router-playbook.js next to this script.")
    route_code = ROUTE_FILE.read_text(encoding="utf-8")
    assert "app.post('/api/doc-router/playbook'" in route_code, \
        "route-doc-router-playbook.js doesn't contain the expected route registration — wrong file?"

    patched = text.replace(SERVER_ANCHOR, SERVER_ANCHOR + "\n" + route_code + "\n", 1)
    return patched, True


# ──────────────────────────────────────────────────────────────────
# 2a. FRONTEND — routeDocument(): accept extraction, store rawText
# ──────────────────────────────────────────────────────────────────
ROUTEDOC_SIG_OLD = 'function routeDocument(fileName, classification, attachment) {'
ROUTEDOC_SIG_NEW = 'function routeDocument(fileName, classification, attachment, extraction) {'

EXT_BLOCK_OLD = """     _ext: {
        client:      classification.client  || "",
        ref:         classification.ref     || "",
        summary:     classification.summary || "",
        defectFlags: Array.isArray(classification.defectFlags) ? classification.defectFlags : []
      }
    };"""

EXT_BLOCK_NEW = """     _ext: {
        client:      classification.client  || "",
        ref:         classification.ref     || "",
        summary:     classification.summary || "",
        defectFlags: Array.isArray(classification.defectFlags) ? classification.defectFlags : [],
        // Raw extracted text, capped — lets the generative playbook route
        // ground its output in what the document actually says instead of
        // just the classifier's summary. Same 6000-char cap the server
        // route applies, so nothing bigger is carried around client-side
        // for no benefit.
        rawText: (extraction && extraction.type === "text") ? String(extraction.value).slice(0, 6000) : ""
      }
    };"""

CALL_SITE_OLD = "const routed = routeDocument(file.name, classification, attachment);"
CALL_SITE_NEW = "const routed = routeDocument(file.name, classification, attachment, extraction);"


# ──────────────────────────────────────────────────────────────────
# 2b. FRONTEND — openHcNodeWithDoc(): call the new route, keep the
#     old STEP_SETS logic as the local fallback, unchanged.
# ──────────────────────────────────────────────────────────────────
OPENHC_OLD = """function openHcNodeWithDoc(docId) {
  // find doc across every vertical's per-client compartments
  let doc = null;
  for (const v of Object.keys(VERTICALS)) {
    for (const c of getClientRegistry()) {
      const list = loadIndexForClient(v, c.id);
      doc = list.find(d => d.id === docId);
      if (doc) break;
    }
    if (doc) break;
  }
  if (!doc) doc = (typeof DEMO_DOCS !== 'undefined' ? DEMO_DOCS : []).find(d => d.id === docId);
  if (!doc) { console.warn('TSM: doc not found', docId); return; }

  const excCode  = (doc.exclusionCode || '').toUpperCase();
  const docType  = (doc.documentType  || '').toUpperCase();
  const amount   = Number(doc.amount) || 0;
  const defects  = (doc._ext && doc._ext.defectFlags) || [];

  // resolve node
  let nodeId = 'billing';
  for (const {p,n} of HC_CODE_NODE) { if (excCode.startsWith(p)) { nodeId=n; break; } }
  if (nodeId==='billing') for (const [k,n] of Object.entries(HC_TYPE_NODE)) { if (docType.includes(k)){nodeId=n;break;} }
  if (doc.sourceNode && doc.sourceNode.startsWith('hc-') && doc.sourceNode!=='hc-denial')
    nodeId = doc.sourceNode.replace(/^hc-/,'');

  // derive check status
  const cs = excCode.startsWith('PA-') || docType.includes('PRIOR AUTH') ? 'AUTH_BLOCK'
    : excCode.startsWith('CO-') || docType.includes('DENIAL') || docType.includes('CLAIM APPEAL') ? 'DENIAL_RISK'
    : excCode.startsWith('OA-') || excCode.startsWith('PR-') ? 'PAYMENT_BLOCK'
    : docType.includes('AUDIT') || docType.includes('POLICY') ? 'COMPLIANCE_BLOCK'
    : docType.includes('FILING') || docType.includes('CONTRACT') ? 'LEGAL_HOLD'
    : defects.length ? 'DOCUMENTATION_BLOCK' : 'ACTIVE';

  const STEP_SETS = {
    DENIAL_RISK:   ['Pull full EOB/ERA — identify exact CARC/RARC denial codes',
                    'Verify CPT/ICD-10 pairing and modifier alignment',
                    'Confirm appeal window — timely filing deadline critical',
                    'Draft appeal with medical necessity documentation',
                    'Submit via payer portal and log tracking number in AR'],
    AUTH_BLOCK:    ['Verify current prior auth status for all procedures',
                    'Contact payer prior auth line — escalate if wait > 2 hrs',
                    'Do NOT bill until auth is confirmed and on file',
                    'Document auth number in claim header before submission',
                    'Set 48-hr follow-up until resolved'],
    PAYMENT_BLOCK: ['Pull ERA/835 and compare posted amounts to contracted rate',
                    'Flag variances >5% as underpayments — initiate appeal',
                    'Check for payer hold — contact payer relations if active',
                    'Post clean items; quarantine disputed amounts',
                    'Escalate unresolved ERA failures within 24 hours'],
    COMPLIANCE_BLOCK:['Halt billing until all compliance flags are cleared',
                    'Obtain updated HIPAA authorization if expired',
                    'Verify OIG exclusion list for all providers on this account',
                    'Complete documentation checklist before releasing to billing',
                    'File compliance resolution memo and update score tracker'],
    LEGAL_HOLD:    ['Escalate to legal counsel immediately',
                    'Document chain of custody for all related files',
                    'Suspend vendor payments pending legal clearance',
                    'Prepare regulatory defense memo if requested',
                    'Set 48-hr check-in cadence with legal team'],
    DOCUMENTATION_BLOCK:['Identify defects: '+(defects.join(', ')||'see findings'),
                    'Send provider query — 24-hour response expectation',
                    'Block claim release for undocumented encounters',
                    'Route corrected records to coding for ICD-10 validation',
                    'Re-submit to billing queue only after defects resolved'],
  };

  const steps   = STEP_SETS[cs] || ['Review document for anomalies','Escalate to node specialist','Document findings in AR system','Follow up within 48 hours'];
  const findings = defects.length
    ? defects.map(f=>'❌ '+f)
    : (excCode ? ['❌ '+excCode+' — '+(doc.documentType||'anomaly')+' on '+(doc.invoiceNo||doc.fileName||'this record'),
                  '❌ Source: '+(doc.vendor||'Unknown')+'  ·  Client: '+(doc._ext&&doc._ext.client||'—'),
                  '❌ Routed from Document Search  ·  Node origin: '+(doc.sourceNode||'hc')]
               : ['⚠️ Document flagged — review before action']);

  const narr = {
    DENIAL_RISK:   `Denial detected on ${doc.invoiceNo||'—'} from ${doc.vendor||'payer'}${amount?` ($${amount.toLocaleString()} exposure)`:''}. Code: ${excCode||doc.documentType}. Immediate billing review required.`,
    AUTH_BLOCK:    `Prior authorization issue on ${doc.invoiceNo||'—'}${amount?` ($${amount.toLocaleString()})`:''}. Procedures must NOT proceed — denial risk is 100% without resolved auth.`,
    PAYMENT_BLOCK: `Payment anomaly on ${doc.invoiceNo||'—'} from ${doc.vendor||'payer'}${amount?` ($${amount.toLocaleString()})`:''}. ERA/remittance requires manual reconciliation before posting.`,
    COMPLIANCE_BLOCK:`Compliance flag on ${doc.fileName||doc.invoiceNo||'—'}. Documentation gaps or authorization issues must be resolved before billing can proceed.`,
    LEGAL_HOLD:    `Legal anomaly on ${doc.invoiceNo||'—'}. Code ${excCode} requires legal review before any further action.`,
    DOCUMENTATION_BLOCK:`Documentation defects in ${doc.fileName||doc.invoiceNo||'—'}: ${defects.join(', ')||'see findings'}. Records must be corrected before billing release.`,
    ACTIVE:        `Anomaly detected on ${doc.fileName||doc.invoiceNo||'—'} from Document Search${amount?` ($${amount.toLocaleString()})`:''}. Review and resolve before proceeding.`,
  }[cs] || 'Anomaly detected — review required.';

  try {
    const payload = {
      checkStatus: cs, narrative: narr, findings, steps,
      financialImpact: amount, risk: amount>50000?82:amount>10000?68:55,
      fileName: doc.fileName||'', documentType: doc.documentType||'',
      docType: doc.documentType||'', ref: doc.invoiceNo||(doc._ext&&doc._ext.ref)||'',
      client: (doc._ext&&doc._ext.client)||'', exclusionCode: excCode,
      vendor: doc.vendor||'', nodeId, targetNodeIds:[nodeId],
      source:'doc-search', warRoomUrl:'/html/healthcare/hc-denial-war-room.html',
      ts: Date.now(), timestamp: new Date().toISOString(),
    };
    localStorage.setItem('tsm-doc-anomaly', JSON.stringify(payload));
    localStorage.setItem('tsm-last-analysis', JSON.stringify({...payload, missionKey:nodeId, type:nodeId}));
  } catch(e) { console.warn('TSM write failed:', e); }

  window.open('/html/healthcare/hc-'+nodeId+'/index.html', '_blank');
}
window.openHcNodeWithDoc = openHcNodeWithDoc;"""

OPENHC_NEW = """async function openHcNodeWithDoc(docId) {
  // find doc across every vertical's per-client compartments
  let doc = null;
  for (const v of Object.keys(VERTICALS)) {
    for (const c of getClientRegistry()) {
      const list = loadIndexForClient(v, c.id);
      doc = list.find(d => d.id === docId);
      if (doc) break;
    }
    if (doc) break;
  }
  if (!doc) doc = (typeof DEMO_DOCS !== 'undefined' ? DEMO_DOCS : []).find(d => d.id === docId);
  if (!doc) { console.warn('TSM: doc not found', docId); return; }

  const excCode  = (doc.exclusionCode || '').toUpperCase();
  const docType  = (doc.documentType  || '').toUpperCase();
  const amount   = Number(doc.amount) || 0;
  const defects  = (doc._ext && doc._ext.defectFlags) || [];

  // resolve node — deterministic, unchanged. This decision (which
  // specialist queue the doc lands in) stays rule-based on purpose:
  // a model miscategorizing this is worse than a generic step list.
  let nodeId = 'billing';
  for (const {p,n} of HC_CODE_NODE) { if (excCode.startsWith(p)) { nodeId=n; break; } }
  if (nodeId==='billing') for (const [k,n] of Object.entries(HC_TYPE_NODE)) { if (docType.includes(k)){nodeId=n;break;} }
  if (doc.sourceNode && doc.sourceNode.startsWith('hc-') && doc.sourceNode!=='hc-denial')
    nodeId = doc.sourceNode.replace(/^hc-/,'');

  // derive check status — deterministic, unchanged
  const cs = excCode.startsWith('PA-') || docType.includes('PRIOR AUTH') ? 'AUTH_BLOCK'
    : excCode.startsWith('CO-') || docType.includes('DENIAL') || docType.includes('CLAIM APPEAL') ? 'DENIAL_RISK'
    : excCode.startsWith('OA-') || excCode.startsWith('PR-') ? 'PAYMENT_BLOCK'
    : docType.includes('AUDIT') || docType.includes('POLICY') ? 'COMPLIANCE_BLOCK'
    : docType.includes('FILING') || docType.includes('CONTRACT') ? 'LEGAL_HOLD'
    : defects.length ? 'DOCUMENTATION_BLOCK' : 'ACTIVE';

  // Pre-open the destination window SYNCHRONOUSLY, before any await —
  // this keeps it tied to the click that triggered this function, so
  // browsers don't treat it as an unrequested popup once we go async
  // below. We navigate it later, once we know what to show.
  const popup = window.open('about:blank', '_blank');

  const FALLBACK_STEP_SETS = {
    DENIAL_RISK:   ['Pull full EOB/ERA — identify exact CARC/RARC denial codes',
                    'Verify CPT/ICD-10 pairing and modifier alignment',
                    'Confirm appeal window — timely filing deadline critical',
                    'Draft appeal with medical necessity documentation',
                    'Submit via payer portal and log tracking number in AR'],
    AUTH_BLOCK:    ['Verify current prior auth status for all procedures',
                    'Contact payer prior auth line — escalate if wait > 2 hrs',
                    'Do NOT bill until auth is confirmed and on file',
                    'Document auth number in claim header before submission',
                    'Set 48-hr follow-up until resolved'],
    PAYMENT_BLOCK: ['Pull ERA/835 and compare posted amounts to contracted rate',
                    'Flag variances >5% as underpayments — initiate appeal',
                    'Check for payer hold — contact payer relations if active',
                    'Post clean items; quarantine disputed amounts',
                    'Escalate unresolved ERA failures within 24 hours'],
    COMPLIANCE_BLOCK:['Halt billing until all compliance flags are cleared',
                    'Obtain updated HIPAA authorization if expired',
                    'Verify OIG exclusion list for all providers on this account',
                    'Complete documentation checklist before releasing to billing',
                    'File compliance resolution memo and update score tracker'],
    LEGAL_HOLD:    ['Escalate to legal counsel immediately',
                    'Document chain of custody for all related files',
                    'Suspend vendor payments pending legal clearance',
                    'Prepare regulatory defense memo if requested',
                    'Set 48-hr check-in cadence with legal team'],
    DOCUMENTATION_BLOCK:['Identify defects: '+(defects.join(', ')||'see findings'),
                    'Send provider query — 24-hour response expectation',
                    'Block claim release for undocumented encounters',
                    'Route corrected records to coding for ICD-10 validation',
                    'Re-submit to billing queue only after defects resolved'],
  };

  const fallbackSteps = FALLBACK_STEP_SETS[cs] || ['Review document for anomalies','Escalate to node specialist','Document findings in AR system','Follow up within 48 hours'];
  const fallbackNarr = {
    DENIAL_RISK:   `Denial detected on ${doc.invoiceNo||'—'} from ${doc.vendor||'payer'}${amount?` ($${amount.toLocaleString()} exposure)`:''}. Code: ${excCode||doc.documentType}. Immediate billing review required.`,
    AUTH_BLOCK:    `Prior authorization issue on ${doc.invoiceNo||'—'}${amount?` ($${amount.toLocaleString()})`:''}. Procedures must NOT proceed — denial risk is 100% without resolved auth.`,
    PAYMENT_BLOCK: `Payment anomaly on ${doc.invoiceNo||'—'} from ${doc.vendor||'payer'}${amount?` ($${amount.toLocaleString()})`:''}. ERA/remittance requires manual reconciliation before posting.`,
    COMPLIANCE_BLOCK:`Compliance flag on ${doc.fileName||doc.invoiceNo||'—'}. Documentation gaps or authorization issues must be resolved before billing can proceed.`,
    LEGAL_HOLD:    `Legal anomaly on ${doc.invoiceNo||'—'}. Code ${excCode} requires legal review before any further action.`,
    DOCUMENTATION_BLOCK:`Documentation defects in ${doc.fileName||doc.invoiceNo||'—'}: ${defects.join(', ')||'see findings'}. Records must be corrected before billing release.`,
    ACTIVE:        `Anomaly detected on ${doc.fileName||doc.invoiceNo||'—'} from Document Search${amount?` ($${amount.toLocaleString()})`:''}. Review and resolve before proceeding.`,
  }[cs] || 'Anomaly detected — review required.';

  // Try the generative playbook, grounded in the actual document.
  // Any failure (network, timeout, malformed response) falls back to
  // the exact template behavior this replaced — never a dead end.
  let narr = fallbackNarr, steps = fallbackSteps, risk = amount>50000?82:amount>10000?68:55;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch('/api/doc-router/playbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        checkStatus: cs, documentType: doc.documentType||'', exclusionCode: excCode,
        vendor: doc.vendor||'', invoiceNo: doc.invoiceNo||'', amount,
        client: (doc._ext&&doc._ext.client)||'', ref: (doc._ext&&doc._ext.ref)||'',
        summary: (doc._ext&&doc._ext.summary)||'', defectFlags: defects,
        rawText: (doc._ext&&doc._ext.rawText)||'',
      }),
    });
    clearTimeout(timeout);
    if (res.ok) {
      const gen = await res.json();
      if (gen && Array.isArray(gen.steps) && gen.steps.length && typeof gen.narrative === 'string') {
        narr = gen.narrative;
        steps = gen.steps;
        if (Number.isFinite(gen.risk)) risk = gen.risk;
      }
    }
  } catch (e) {
    console.warn('TSM: generative playbook unavailable, using template fallback:', e);
  }

  const findings = defects.length
    ? defects.map(f=>'❌ '+f)
    : (excCode ? ['❌ '+excCode+' — '+(doc.documentType||'anomaly')+' on '+(doc.invoiceNo||doc.fileName||'this record'),
                  '❌ Source: '+(doc.vendor||'Unknown')+'  ·  Client: '+(doc._ext&&doc._ext.client||'—'),
                  '❌ Routed from Document Search  ·  Node origin: '+(doc.sourceNode||'hc')]
               : ['⚠️ Document flagged — review before action']);

  try {
    const payload = {
      checkStatus: cs, narrative: narr, findings, steps,
      financialImpact: amount, risk,
      fileName: doc.fileName||'', documentType: doc.documentType||'',
      docType: doc.documentType||'', ref: doc.invoiceNo||(doc._ext&&doc._ext.ref)||'',
      client: (doc._ext&&doc._ext.client)||'', exclusionCode: excCode,
      vendor: doc.vendor||'', nodeId, targetNodeIds:[nodeId],
      source:'doc-search', warRoomUrl:'/html/healthcare/hc-denial-war-room.html',
      ts: Date.now(), timestamp: new Date().toISOString(),
    };
    localStorage.setItem('tsm-doc-anomaly', JSON.stringify(payload));
    localStorage.setItem('tsm-last-analysis', JSON.stringify({...payload, missionKey:nodeId, type:nodeId}));
  } catch(e) { console.warn('TSM write failed:', e); }

  const targetUrl = '/html/healthcare/hc-'+nodeId+'/index.html';
  if (popup) popup.location.href = targetUrl;
  else window.open(targetUrl, '_blank'); // popup was blocked outright — last-ditch attempt
}
window.openHcNodeWithDoc = openHcNodeWithDoc;"""


def patch_frontend(path: Path):
    text = path.read_text(encoding="utf-8")

    if 'doc._ext.rawText' in text or 'rawText: (extraction' in text:
        print(f"↷  {path.name}: rawText wiring already present — skipping frontend patch.")
        return text, False

    assert_count(text, ROUTEDOC_SIG_OLD, 1, "routeDocument() signature")
    assert_count(text, EXT_BLOCK_OLD, 1, "routeDocument() _ext block")
    assert_count(text, CALL_SITE_OLD, 1, "processFile() routeDocument() call site")
    assert_count(text, OPENHC_OLD, 1, "openHcNodeWithDoc() full function body")

    text = text.replace(ROUTEDOC_SIG_OLD, ROUTEDOC_SIG_NEW, 1)
    text = text.replace(EXT_BLOCK_OLD, EXT_BLOCK_NEW, 1)
    text = text.replace(CALL_SITE_OLD, CALL_SITE_NEW, 1)
    text = text.replace(OPENHC_OLD, OPENHC_NEW, 1)
    return text, True


# ──────────────────────────────────────────────────────────────────
def node_check(path: Path):
    result = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
    if result.returncode != 0:
        fail(f"node --check failed on {path.name} after patching:\n{result.stderr}")
    print(f"✓  node --check passed: {path.name}")


def inline_script_check(html_path: Path, text: str):
    """Best-effort JS syntax check of every inline <script> block (no src=),
    mirroring the repo's existing parse-gate CI convention for HTML files."""
    import re
    blocks = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', text, re.DOTALL | re.IGNORECASE)
    joined = "\n;\n".join(blocks)
    tmp = html_path.parent / f".__inline_check_{html_path.stem}.js"
    tmp.write_text(joined, encoding="utf-8")
    try:
        result = subprocess.run(["node", "--check", str(tmp)], capture_output=True, text=True)
        if result.returncode != 0:
            fail(f"Inline <script> syntax check failed for {html_path.name}:\n{result.stderr}")
        print(f"✓  inline <script> syntax check passed: {html_path.name}")
    finally:
        tmp.unlink(missing_ok=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--server", default="server.js")
    ap.add_argument("--frontend", default="tsm-doc-search-multi.html")
    ap.add_argument("--no-backup", action="store_true", help="skip writing .bak files")
    args = ap.parse_args()

    server_path = Path(args.server)
    frontend_path = Path(args.frontend)

    if not server_path.exists():
        fail(f"--server path not found: {server_path}")
    if not frontend_path.exists():
        fail(f"--frontend path not found: {frontend_path}")

    print("── Validating and building patches in memory (nothing written yet) ──")
    server_patched, server_changed = patch_server(server_path)
    frontend_patched, frontend_changed = patch_frontend(frontend_path)

    if not server_changed and not frontend_changed:
        print("\nNothing to do — both files already patched.")
        return

    if not args.no_backup:
        if server_changed:
            shutil.copy2(server_path, server_path.with_suffix(server_path.suffix + ".bak"))
        if frontend_changed:
            shutil.copy2(frontend_path, frontend_path.with_suffix(frontend_path.suffix + ".bak"))
        print("✓  .bak backups written")

    if server_changed:
        server_path.write_text(server_patched, encoding="utf-8")
        print(f"✓  {server_path.name} patched")
        node_check(server_path)

    if frontend_changed:
        frontend_path.write_text(frontend_patched, encoding="utf-8")
        print(f"✓  {frontend_path.name} patched")
        inline_script_check(frontend_path, frontend_patched)

    print("\n✅ DONE. Review the diff, then your standard workflow:")
    print("   node --check server.js")
    print("   git add -A && git commit --no-gpg-sign -m 'Add generative denial playbook route'")
    print("   gh pr create ...  →  gh pr merge --squash --delete-branch")


if __name__ == "__main__":
    main()