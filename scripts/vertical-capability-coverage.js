#!/usr/bin/env node
/**
 * scripts/vertical-capability-coverage.js
 *
 * Ground-truth report of what enterprise-capability-audit.js's summary
 * calls out as missing: a vertical -> capability matrix. This script does
 * NOT invent one. It re-derives, from the actual code, which industry
 * verticals call POST /api/enterprise/capability-sweep and which phases
 * that endpoint touches when they do.
 *
 * The honest finding this surfaces (confirmed by reading
 * routes/enterprise-capability-bridge.js, which documents itself as
 * "vertical-agnostic by design"): there is currently NO differentiated
 * per-vertical capability set anywhere in the codebase.
 *   - 6 of 9 industry verticals call the sweep (Healthcare, FinOps,
 *     Insurance, Construction, Legal, Real Estate).
 *   - BPO, Mortgage, and Schools never call it -- zero coverage.
 *   - Every caller that DOES fire it gets the exact same fixed bundle of
 *     10 phases (7 write, 3 context-only read).
 *
 * This script exists so that fact stays checkable and doesn't silently
 * rot: if a 7th vertical starts calling the sweep, or the bundle changes,
 * re-running this will catch it. It is read-only -- it does not change
 * capability-bridge.js's behavior.
 *
 * Usage: node scripts/vertical-capability-coverage.js [--root=.] [--json]
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ROOT = path.resolve((args.find(a => a.startsWith('--root=')) || '--root=.').split('=')[1]);
const JSON_OUT = args.includes('--json');

const BRIDGE_FILE = path.join(ROOT, 'routes/enterprise-capability-bridge.js');
const HTML_DIR = path.join(ROOT, 'html');

// The 9 industry verticals this platform currently ships (mirrors
// enterprise-capability-audit.js's INDUSTRY_VERTICAL_LABELS, in vertical-id
// form rather than hub-label form since that's what capability-sweep
// payloads actually send).
const ALL_VERTICALS = ['healthcare', 'finops', 'insurance', 'construction', 'legal', 'real-estate', 'bpo', 'mortgage', 'schools'];

// ── 1. Walk html/ for every file that calls the capability-sweep endpoint,
//       and pull the literal `vertical: '...'` string it sends. ──────────
function findSweepCallers(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findSweepCallers(p, found);
    } else if (entry.name.endsWith('.html')) {
      const text = fs.readFileSync(p, 'utf8');
      const callIdx = text.indexOf("capability-sweep");
      if (callIdx === -1) continue;
      // vertical: '...' appears within the same fetch() body, scan the
      // 800 chars following the call site for it.
      const window = text.slice(callIdx, callIdx + 800);
      const m = window.match(/vertical:\s*'([a-z_-]+)'/);
      found.push({
        file: path.relative(ROOT, p),
        verticalSent: m ? m[1] : '(unable to parse)',
      });
    }
  }
  return found;
}

// ── 2. Parse the bridge file for which `phases.<key>` get set, and whether
//       each is a real write or a context-only read. ─────────────────────
function parseBridgePhases(text) {
  const keys = [...new Set([...text.matchAll(/phases\.(\w+)\s*=/g)].map(m => m[1]))];
  return keys.map(key => {
    // Look at the assignment line itself for a same-line contextOnly flag.
    const lineMatch = text.match(new RegExp(`phases\\.${key}\\s*=\\s*\\{[^}]*\\}`));
    const contextOnly = !!(lineMatch && /contextOnly:\s*true/.test(lineMatch[0]));
    return { key, kind: contextOnly ? 'context-only' : 'write' };
  });
}

function main() {
  const bridgeText = fs.readFileSync(BRIDGE_FILE, 'utf8');
  const isVerticalAgnosticByDesign = /vertical-agnostic/i.test(bridgeText);
  const bundle = parseBridgePhases(bridgeText);
  const callers = findSweepCallers(HTML_DIR);
  const callerVerticals = new Set(callers.map(c => c.verticalSent));
  const uncovered = ALL_VERTICALS.filter(v => !callerVerticals.has(v));

  const report = {
    generatedAt: new Date().toISOString(),
    bridgeFile: path.relative(ROOT, BRIDGE_FILE),
    isVerticalAgnosticByDesign,
    fixedBundle: bundle,
    callers,
    verticalsWithSweepCoverage: [...callerVerticals],
    verticalsWithNoSweepCoverage: uncovered,
    finding: isVerticalAgnosticByDesign
      ? 'No differentiated vertical->capability matrix exists. Every caller receives the identical fixed bundle above, by explicit design. This report documents the current uniform state so it stays checkable rather than assumed.'
      : 'WARNING: capability-bridge.js no longer self-documents as vertical-agnostic -- re-check whether per-vertical logic has since been added, this script may be out of date.',
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }

  console.log('========== Vertical -> Capability Coverage (ground truth) ==========');
  console.log(`Generated: ${report.generatedAt}\n`);

  console.log(`routes/enterprise-capability-bridge.js self-documents as vertical-agnostic: ${isVerticalAgnosticByDesign}\n`);

  console.log(`Fixed bundle every caller receives (${bundle.length} phases):`);
  bundle.forEach(b => console.log(`  - ${b.key.padEnd(14)} [${b.kind}]`));
  console.log('');

  console.log(`Verticals that call the sweep (${callerVerticals.size}):`);
  callers.forEach(c => console.log(`  - ${c.verticalSent.padEnd(14)} <- ${c.file}`));
  console.log('');

  console.log(`Verticals with ZERO sweep coverage (${uncovered.length}):`);
  uncovered.forEach(v => console.log(`  - ${v}`));
  console.log('');

  console.log('Finding:');
  console.log(`  ${report.finding}`);
  console.log('');
  console.log('This is a report, not a fix. No files outside html/ and routes/enterprise-');
  console.log('capability-bridge.js were touched or need to be for this script to run.');

  return report;
}

if (require.main === module) {
  main();
}

module.exports = { main, findSweepCallers, parseBridgePhases };
