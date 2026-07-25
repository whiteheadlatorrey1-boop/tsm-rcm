#!/usr/bin/env python3
"""
Wires Roadmap #7 (TSMExecutiveOutcome) into
html/construction-suite/construction-executive-portal.html.
Run from the repo root: python3 wire_outcome_view_construction.py
Fails loudly (no changes written) if an anchor doesn't match exactly once.
"""
import sys

PATH = "html/construction-suite/construction-executive-portal.html"

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

# 1. Add the new mount div right after tsmk-exp-auto
content = must_replace(
    content,
    '  <div id="tsmk-wip-auto" style="margin:18px 0 10px;"></div>\n'
    '  <div id="tsmk-exp-auto" style="margin:10px 0 24px;"></div>',

    '  <div id="tsmk-wip-auto" style="margin:18px 0 10px;"></div>\n'
    '  <div id="tsmk-exp-auto" style="margin:10px 0 24px;"></div>\n'
    '  <div id="tsmk-outcome-auto" style="margin:10px 0 24px;"></div>',
    "outcome mount div"
)

# 2. Load the two missing engines before the AUTO-INJECTED exec-kit block
content = must_replace(
    content,
    '/* TSM EXEC KIT — AUTO-INJECTED 2026-06-29 23:19 UTC */\n'
    '(function() {\n'
    '  var RELAY_KEYS = ["TSM_CONSTRUCTION_STRATEGIST_RELAY", "tsm_construction_war_relay", "tsm_construction_strategist_output", "TSM_CONSTRUCTION_WAR_RELAY"];',

    '<script src="/html/shared/tsm-quality-score-engine.js"></script>\n'
    '<script src="/html/shared/tsm-executive-outcome.js"></script>\n'
    '</script>\n\n<script>\n'
    '/* TSM EXEC KIT — AUTO-INJECTED 2026-06-29 23:19 UTC */\n'
    '(function() {\n'
    '  var RELAY_KEYS = ["TSM_CONSTRUCTION_STRATEGIST_RELAY", "tsm_construction_war_relay", "tsm_construction_strategist_output", "TSM_CONSTRUCTION_WAR_RELAY"];',
    "engine script tags"
)

# 3. Add renderOutcome() to the TSMExecKit IIFE and expose it
content = must_replace(
    content,
    "  function fromRelay(relayObj) {\n"
    "    relayObj = relayObj || {};\n"
    "    return {\n"
    "      wip: Array.isArray(relayObj.wip) ? relayObj.wip : [],\n"
    "      explain: Array.isArray(relayObj.explain) ? relayObj.explain : []\n"
    "    };\n"
    "  }\n"
    "\n"
    "  global.TSMExecKit = {\n"
    "    renderWIP: renderWIP,\n"
    "    renderExplainability: renderExplainability,\n"
    "    fromRelay: fromRelay\n"
    "  };",

    "  function fromRelay(relayObj) {\n"
    "    relayObj = relayObj || {};\n"
    "    return {\n"
    "      wip: Array.isArray(relayObj.wip) ? relayObj.wip : [],\n"
    "      explain: Array.isArray(relayObj.explain) ? relayObj.explain : []\n"
    "    };\n"
    "  }\n"
    "\n"
    "  /* Roadmap #7 — renders TSMExecutiveOutcome.build()'s four-question view.\n"
    "     Pure render layer, same as renderExplainability above: no scoring or\n"
    "     classification logic here, just display of what the engine computed. */\n"
    "  function renderOutcome(target, outcome) {\n"
    "    var el = typeof target === 'string' ? document.getElementById(target) : target;\n"
    "    if (!el) return;\n"
    "    if (!outcome) {\n"
    "      el.innerHTML = '<div class=\"tsmk-explain\"><div class=\"tsmk-exp-empty\">No executive outcome data yet.</div></div>';\n"
    "      return;\n"
    "    }\n"
    "    var wh = outcome.whatHappened || {};\n"
    "    var wim = outcome.whyItMatters || {};\n"
    "    var wsd = outcome.whatShouldWeDo || [];\n"
    "    var who = outcome.whoOwnsIt || {};\n"
    "\n"
    "    var actionsHtml = wsd.length\n"
    "      ? wsd.map(function (a) {\n"
    "          return '<div class=\"tsmk-exp-card\" data-severity=\"' + esc(a.severity || '') + '\">' +\n"
    "                   '<div class=\"tsmk-exp-row\"><div class=\"tsmk-exp-claim\">' + esc(a.action) + '</div>' +\n"
    "                   (a.confidence != null ? '<span class=\"tsmk-conf-badge\">' + Math.round(a.confidence) + '% conf</span>' : '') +\n"
    "                   '</div></div>';\n"
    "        }).join('')\n"
    "      : '<div class=\"tsmk-exp-empty\">No open action items.</div>';\n"
    "\n"
    "    el.innerHTML =\n"
    "      '<div class=\"tsmk-explain\">' +\n"
    "        '<div class=\"tsmk-exp-why-label\">WHAT HAPPENED</div>' +\n"
    "        '<div class=\"tsmk-exp-rationale\">' + esc(wh.domain || '') + ' &mdash; ' +\n"
    "          esc(wh.documentsProcessed != null ? wh.documentsProcessed : '\\u2014') + ' record(s), accuracy ' +\n"
    "          esc(wh.accuracy || '\\u2014') + ' (' + esc(wh.band || '\\u2014') + '), ' +\n"
    "          esc(wh.openFindings) + ' open finding(s).</div>' +\n"
    "        '<div class=\"tsmk-exp-why-label\" style=\"margin-top:14px;\">WHY IT MATTERS</div>' +\n"
    "        '<div class=\"tsmk-exp-rationale\">' + esc(wim.highSeverityFindings) + ' high-severity finding(s).' +\n"
    "          (wim.financialExposure != null\n"
    "            ? ' Est. exposure: $' + esc(wim.financialExposure.toLocaleString()) +\n"
    "              (wim.financialExposureIsPartial ? ' (partial \\u2014 not all items estimated)' : '')\n"
    "            : ' Exposure not estimated.') +\n"
    "          '</div>' +\n"
    "        '<div class=\"tsmk-exp-why-label\" style=\"margin-top:14px;\">WHAT TO DO</div>' +\n"
    "        actionsHtml +\n"
    "        '<div class=\"tsmk-exp-why-label\" style=\"margin-top:14px;\">WHO OWNS IT</div>' +\n"
    "        '<div class=\"tsmk-exp-rationale\">' + esc(who.owner) + ' \\u00b7 ' +\n"
    "          esc(who.claimedCount) + ' claimed, ' + esc(who.queuedCount) + ' queued</div>' +\n"
    "      '</div>';\n"
    "  }\n"
    "\n"
    "  global.TSMExecKit = {\n"
    "    renderWIP: renderWIP,\n"
    "    renderExplainability: renderExplainability,\n"
    "    renderOutcome: renderOutcome,\n"
    "    fromRelay: fromRelay\n"
    "  };",
    "renderOutcome function + export"
)

# 4. Wire OUTCOME_ID + build/render call into the AUTO-INJECTED mount()
content = must_replace(
    content,
    "  var WIP_ID     = 'tsmk-wip-auto';\n"
    "  var EXP_ID     = 'tsmk-exp-auto';",

    "  var WIP_ID     = 'tsmk-wip-auto';\n"
    "  var EXP_ID     = 'tsmk-exp-auto';\n"
    "  var OUTCOME_ID = 'tsmk-outcome-auto';",
    "OUTCOME_ID var"
)

content = must_replace(
    content,
    "    TSMExecKit.renderExplainability(EXP_ID, items, { openFirst: true });\n"
    "  }",

    "    TSMExecKit.renderExplainability(EXP_ID, items, { openFirst: true });\n"
    "\n"
    "    // Roadmap #7 — same items already flow through the explain widget above;\n"
    "    // reuse them rather than re-deriving anything.\n"
    "    if (window.TSMQualityScoreEngine && window.TSMExecutiveOutcome) {\n"
    "      var qualityScore = TSMQualityScoreEngine.fromExplainItems(items, { recordCount: items.length });\n"
    "      var outcome = TSMExecutiveOutcome.build({\n"
    "        domain: 'Construction',\n"
    "        explainItems: items,\n"
    "        qualityScore: qualityScore\n"
    "      });\n"
    "      TSMExecKit.renderOutcome(OUTCOME_ID, outcome);\n"
    "    }\n"
    "  }",
    "mount() outcome wiring"
)

if content == original:
    print("No changes made (unexpected — should have errored above instead).")
    sys.exit(1)

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"OK: {PATH} patched successfully.")