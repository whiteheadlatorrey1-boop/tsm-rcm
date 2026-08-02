#!/usr/bin/env python3
"""
apply_finops_confidence_fix.py

Fixes: html/finops-suite/finops-war/finops-main-strategist.html
Sentinel push was silently defaulting confidence to 62 with no trace
when the model's output had no parseable RISK SCORE line. This makes
it flag the default (console.warn + confidenceDefaulted=true), matching
the convention already applied to bpo-strategist.html / hc-main-strategist.html.

Run from repo root:
    python3 apply_finops_confidence_fix.py
"""
import os
import re
import subprocess
import sys

TARGET = "html/finops-suite/finops-war/finops-main-strategist.html"

OLD = """    const finopsSentRiskStr = _riskM ? _riskM[1] : (existing.riskScore || null);
    const finopsSentConf = finopsSentRiskStr ? parseInt(finopsSentRiskStr) : null;
    const finopsSentAnomalies = [{
      id: 'finops-strat-' + Date.now(),
      title: 'FinOps Strategist Synthesis',
      severity: finopsSeverityForExposure(finopsSentExposureNum),
      exposure: finopsSentExposureNum,
      confidence: finopsSentConf !== null ? finopsSentConf : 62,
      rootCause: output ? output.slice(0, 240) : 'See strategist brief for detailed reasoning.',
      recommendedAction: 'Review the strategist brief and route to executive escalation.'
    }];"""

NEW = """    const finopsSentRiskStr = _riskM ? _riskM[1] : (existing.riskScore || null);
    let finopsSentConf = finopsSentRiskStr ? parseInt(finopsSentRiskStr) : null;
    // Flag when the live model's output has no parseable RISK SCORE — every
    // downstream consumer (Sentinel Center card) reads this anomaly's
    // confidence, so patch it here once instead of silently fabricating 62
    // with no trace. Mirrors the same convention already applied to
    // bpo-strategist.html / hc-main-strategist.html (console.warn + default
    // + confidenceDefaulted flag) rather than a bare fallback.
    let finopsConfDefaulted = false;
    if (finopsSentConf === null || Number.isNaN(finopsSentConf)) {
      console.warn('[finops-strategist] Live response had no parseable RISK SCORE — defaulting confidence to 62 for Sentinel push.');
      finopsSentConf = 62;
      finopsConfDefaulted = true;
    }
    const finopsSentAnomalies = [{
      id: 'finops-strat-' + Date.now(),
      title: 'FinOps Strategist Synthesis',
      severity: finopsSeverityForExposure(finopsSentExposureNum),
      exposure: finopsSentExposureNum,
      confidence: finopsSentConf,
      confidenceDefaulted: finopsConfDefaulted,
      rootCause: output ? output.slice(0, 240) : 'See strategist brief for detailed reasoning.',
      recommendedAction: 'Review the strategist brief and route to executive escalation.'
    }];"""


def main():
    assert os.path.isfile(TARGET), f"Not found: {TARGET} — run this from the repo root."

    with open(TARGET, "r", encoding="utf-8") as f:
        content = f.read()

    assert content.count(OLD) == 1, (
        f"Expected exactly 1 occurrence of the old block in {TARGET}, "
        f"found {content.count(OLD)}. File may have already been patched, "
        f"or has diverged from what this script expects — aborting rather "
        f"than guessing."
    )

    # Already-patched guard: if the new marker text is present, don't double-apply.
    assert "confidenceDefaulted" not in content, (
        f"{TARGET} already contains 'confidenceDefaulted' — looks like this "
        f"fix is already applied. Aborting to avoid a duplicate/garbled patch."
    )

    patched = content.replace(OLD, NEW)

    with open(TARGET, "w", encoding="utf-8") as f:
        f.write(patched)

    print(f"Patched: {TARGET}")

    # Syntax-check every inline <script> block (mirrors your node --check habit).
    check_script = r"""
const fs = require('fs');
const html = fs.readFileSync(process.argv[1], 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let ok = 0, fail = 0;
scripts.forEach((s, i) => {
  try { new Function(s); ok++; }
  catch (e) { fail++; console.error('Block', i, 'error:', e.message); }
});
console.log('inline <script> blocks OK:', ok, ' FAIL:', fail, ' total:', scripts.length);
process.exit(fail ? 1 : 0);
"""
    result = subprocess.run(
        ["node", "-e", check_script, TARGET],
        capture_output=True, text=True
    )
    print(result.stdout.strip())
    if result.returncode != 0:
        print(result.stderr.strip(), file=sys.stderr)
        print("Syntax check FAILED — check the file before committing.", file=sys.stderr)
        sys.exit(1)

    print("\nDone. Review with `git diff`, then commit:")
    print(f'  git add {TARGET}')
    print('  git commit -m "flag: finops-main-strategist warns + marks confidenceDefaulted '
          'when live response has no parseable RISK SCORE"')


if __name__ == "__main__":
    main()
