#!/usr/bin/env python3
"""
Wires Roadmap #8 (TSMBenchmarkIntelligence) into
html/healthcare/executive-portal.html, alongside the existing #7
(TSMExecutiveOutcome) mount.

No live TSMProcessMining data exists anywhere yet (confirmed absent from
the live codebase during this session -- the only prior "hit" was a
documentation mention, not a real wiring), so this will render entirely
from TSMBenchmarkIntelligence's REFERENCE_BENCHMARKS table for now,
clearly labeled as reference data. The moment a real Process Mining
integration starts producing hopSummary data anywhere, this same call
(TSMBenchmarkIntelligence.compare('HEALTHCARE', { live: ... })) will
switch over to live figures automatically -- no changes needed here.

Run from repo root: python3 wire_benchmark_intelligence_healthcare.py
Fails loudly (no changes written) if an anchor doesn't match exactly once.
"""
import sys

PATH = "html/healthcare/executive-portal.html"

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

original = content

def must_replace(content, old, new, label):
    if old not in content:
        print(f"ABORT: anchor not found for [{label}] — no changes written.")
        sys.exit(1)
    if content.count(old) > 1:
        print(f"ABORT: anchor for [{label}] is not unique ({content.count(old)} matches) — "
              f"refusing to guess. No changes written.")
        sys.exit(1)
    return content.replace(old, new, 1)

# 1. Add the new mount div right after tsmk-outcome-auto
content = must_replace(
    content,
    '    <div id="tsmk-outcome-auto" style="margin:10px 0 24px;"></div>\n'
    '  </div>\n'
    '  <!-- ▲ TSM EXEC KIT ▲ -->',

    '    <div id="tsmk-outcome-auto" style="margin:10px 0 24px;"></div>\n'
    '    <div id="tsmk-benchmark-auto" style="margin:10px 0 24px;"></div>\n'
    '  </div>\n'
    '  <!-- ▲ TSM EXEC KIT ▲ -->',
    "benchmark mount div"
)

# 2. Load the benchmark engine right after the executive-outcome engine
content = must_replace(
    content,
    '<script src="/html/shared/tsm-executive-outcome.js"></script>\n'
    '\n'
    '<script>\n'
    '/* TSM EXEC KIT — AUTO-INJECTED 2026-06-29 23:19 UTC */',

    '<script src="/html/shared/tsm-executive-outcome.js"></script>\n'
    '<script src="/html/shared/tsm-benchmark-intelligence.js"></script>\n'
    '\n'
    '<script>\n'
    '/* TSM EXEC KIT — AUTO-INJECTED 2026-06-29 23:19 UTC */',
    "benchmark engine script tag"
)

# 3. Add renderBenchmark() to the TSMExecKit IIFE and expose it
content = must_replace(
    content,
    "  global.TSMExecKit = {\n"
    "    renderWIP: renderWIP,\n"
    "    renderExplainability: renderExplainability,\n"
    "    renderOutcome: renderOutcome,\n"
    "    fromRelay: fromRelay\n"
    "  };",

    "  /* Roadmap #8 — renders TSMBenchmarkIntelligence.compare()'s single-domain\n"
    "     result. Pure render layer, same as renderOutcome above: no scoring or\n"
    "     aggregation logic here, just display of what the engine computed. */\n"
    "  function renderBenchmark(target, benchmark) {\n"
    "    var el = typeof target === 'string' ? document.getElementById(target) : target;\n"
    "    if (!el) return;\n"
    "    if (!benchmark) {\n"
    "      el.innerHTML = '<div class=\"tsmk-explain\"><div class=\"tsmk-exp-empty\">No benchmark data available.</div></div>';\n"
    "      return;\n"
    "    }\n"
    "    var sourceLabel = benchmark.source === 'live'\n"
    "      ? ('Live \\u00b7 n=' + benchmark.sampleSize)\n"
    "      : 'Reference figure \\u2014 not yet sourced from your live data';\n"
    "    el.innerHTML =\n"
    "      '<div class=\"tsmk-explain\">' +\n"
    "        '<div class=\"tsmk-exp-why-label\">BENCHMARK \\u00b7 ' + esc((benchmark.metric || '').toUpperCase()) + '</div>' +\n"
    "        '<div class=\"tsmk-exp-rationale\">Your average: ' + esc(benchmark.avgDays) + ' day(s) &middot; Top performer: ' + esc(benchmark.topPerformerDays) + ' day(s)</div>' +\n"
    "        '<div class=\"tsmk-exp-rationale\" style=\"opacity:.7;font-size:.85em;\">' + esc(sourceLabel) + '</div>' +\n"
    "      '</div>';\n"
    "  }\n"
    "\n"
    "  global.TSMExecKit = {\n"
    "    renderWIP: renderWIP,\n"
    "    renderExplainability: renderExplainability,\n"
    "    renderOutcome: renderOutcome,\n"
    "    renderBenchmark: renderBenchmark,\n"
    "    fromRelay: fromRelay\n"
    "  };",
    "renderBenchmark function + export"
)

# 4. Wire BENCHMARK_ID + build/render call into the AUTO-INJECTED mount()
content = must_replace(
    content,
    "  var OUTCOME_ID = 'tsmk-outcome-auto';",

    "  var OUTCOME_ID = 'tsmk-outcome-auto';\n"
    "  var BENCHMARK_ID = 'tsmk-benchmark-auto';",
    "BENCHMARK_ID var"
)

content = must_replace(
    content,
    "      TSMExecKit.renderOutcome(OUTCOME_ID, outcome);\n"
    "    }\n"
    "  }",

    "      TSMExecKit.renderOutcome(OUTCOME_ID, outcome);\n"
    "    }\n"
    "\n"
    "    // Roadmap #8 — no live TSMProcessMining data exists yet anywhere in\n"
    "    // this codebase, so this reads from TSMBenchmarkIntelligence's\n"
    "    // clearly-labeled reference table. Once a real Process Mining\n"
    "    // integration produces hopSummary data, pass it as { live: ... } here\n"
    "    // and this will prefer live figures automatically -- no other change needed.\n"
    "    if (window.TSMBenchmarkIntelligence) {\n"
    "      var benchmark = TSMBenchmarkIntelligence.compare('HEALTHCARE');\n"
    "      TSMExecKit.renderBenchmark(BENCHMARK_ID, benchmark);\n"
    "    }\n"
    "  }",
    "mount() benchmark wiring"
)

if content == original:
    print("No changes made (unexpected — should have errored above instead).")
    sys.exit(1)

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"OK: {PATH} patched successfully.")