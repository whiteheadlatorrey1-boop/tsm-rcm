#!/usr/bin/env python3
"""
Wires a Quality Score panel into html/bpo/bpo-strategist-v2.html using the
shared TSMQualityScoreEngine (already loaded on this page via
<script src="/shared/tsm-quality-score-engine.js"> -- no new script tag
needed).

This page has no getExplainItems() and no canonical explain-items array
like the other 6 exec portals -- it builds a page-local `obj` shape
(recommendedActions/dataSources/reasoning/confidence) from the AI's raw
JSON response. So this adds a small honest adapter, toExplainItems(obj),
that maps that real shape into ONE canonical explain item (the whole
recommendation, since that's the actual granularity this page's data
has -- there's no per-action confidence/severity to fabricate). Severity
is left unset so the engine's own documented 'med' default applies,
same as it would for any other caller that doesn't have severity data.

Reuses the page's EXISTING .reasoning-line/.rl-key/.rl-val CSS classes
(same ones already rendering the Reasoning Chain section) -- no new
CSS added, since those classes already give the right layout/typography
and are proven to work correctly on this exact page.

Run from the repo root: python3 wire_quality_score_bpo.py
Fails loudly (no changes written) if an anchor doesn't match exactly once.
"""
import sys

PATH = "html/bpo/bpo-strategist-v2.html"

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


# 1. Add the new mount section right after the Reasoning Chain section,
#    still inside .explain-panel.
content = must_replace(
    content,
    '      <div class="explain-section">\n'
    '        <div class="explain-label">REASONING CHAIN</div>\n'
    '        <div class="reasoning-box" id="reasoningBox">\n'
    '          <div style="color:var(--muted)">Reasoning trace will appear after strategy generation completes. This shows exactly how the AI arrived at its recommendation.</div>\n'
    '        </div>\n'
    '      </div>\n'
    '    </div>\n'
    '\n'
    '  </div>\n'
    '</div>',

    '      <div class="explain-section">\n'
    '        <div class="explain-label">REASONING CHAIN</div>\n'
    '        <div class="reasoning-box" id="reasoningBox">\n'
    '          <div style="color:var(--muted)">Reasoning trace will appear after strategy generation completes. This shows exactly how the AI arrived at its recommendation.</div>\n'
    '        </div>\n'
    '      </div>\n'
    '\n'
    '      <div class="explain-section">\n'
    '        <div class="explain-label">QUALITY SCORE</div>\n'
    '        <div class="reasoning-box" id="qualityScoreBox">\n'
    '          <div style="color:var(--muted)">Quality score will appear after strategy generation completes.</div>\n'
    '        </div>\n'
    '      </div>\n'
    '    </div>\n'
    '\n'
    '  </div>\n'
    '</div>',
    "quality score mount section"
)

# 2. Add renderQualityScore(obj) right after renderExplainability(obj),
#    same pattern as renderRecommendation/renderExplainability above it.
content = must_replace(
    content,
    '      generatedRec = obj;\n'
    '      renderRecommendation(obj);\n'
    '      renderExplainability(obj);\n',

    '      generatedRec = obj;\n'
    '      renderRecommendation(obj);\n'
    '      renderExplainability(obj);\n'
    '      renderQualityScore(obj);\n',
    "renderQualityScore call site"
)

# 3. Define toExplainItems(obj) + renderQualityScore(obj), right after
#    appendCrossUploadSource() so it sits with the other explainability
#    helpers, before renderFallbackRec().
content = must_replace(
    content,
    "function renderFallbackRec() {",

    "// ── QUALITY SCORE: adapt this page's local obj shape into the shared\n"
    "// engine's canonical explain-item contract. One item, representing the\n"
    "// whole recommendation -- that's the real granularity this page's data\n"
    "// has (no per-action confidence/severity exists to score separately).\n"
    "// severity is left unset so the engine's documented 'med' default\n"
    "// applies, same as any other caller without severity data.\n"
    "function toExplainItems(obj) {\n"
    "  if (!obj) return [];\n"
    "  const reasoning = obj.reasoning || [];\n"
    "  const rationale = reasoning.map(r => `${r.key}: ${r.val}`).join('; ');\n"
    "  return [{\n"
    "    id: 'bpo-recommendation',\n"
    "    claim: obj.summary || (obj.recommendedActions && obj.recommendedActions[0] && obj.recommendedActions[0].text) || 'AI Recommendation',\n"
    "    confidence: typeof obj.confidence === 'number' ? obj.confidence : undefined,\n"
    "    rationale: rationale || undefined,\n"
    "    sources: obj.dataSources || [],\n"
    "    dataPoints: reasoning\n"
    "  }];\n"
    "}\n"
    "\n"
    "function renderQualityScore(obj) {\n"
    "  const box = document.getElementById('qualityScoreBox');\n"
    "  if (!box) return;\n"
    "  if (!window.TSMQualityScoreEngine) {\n"
    "    box.innerHTML = '<div style=\"color:var(--muted)\">Quality score engine not loaded.</div>';\n"
    "    return;\n"
    "  }\n"
    "  const items = toExplainItems(obj);\n"
    "  const q = TSMQualityScoreEngine.fromExplainItems(items, {});\n"
    "  const rows = [\n"
    "    { key: 'Overall', val: q.overall + '% (' + q.band + ')' },\n"
    "    { key: 'Accuracy', val: q.accuracy + '%' },\n"
    "    { key: 'Completeness', val: q.completeness + '%' },\n"
    "    { key: 'Compliance', val: q.compliance + '%' },\n"
    "    { key: 'Confidence', val: q.confidence + '%' }\n"
    "  ];\n"
    "  box.innerHTML = rows.map(r =>\n"
    "    `<div class=\"reasoning-line\"><span class=\"rl-key\">${r.key}:</span> <span class=\"rl-val\">${r.val}</span></div>`\n"
    "  ).join('');\n"
    "}\n"
    "\n"
    "function renderFallbackRec() {",
    "toExplainItems + renderQualityScore definitions"
)

# 4. Wire the fallback path too, so the panel isn't left stuck on
#    "will appear after strategy generation" when the fallback recommendation
#    renders instead of a real AI response.
content = must_replace(
    content,
    "  document.getElementById('reasoningBox').innerHTML = `\n"
    '    <div class="reasoning-line"><span class="rl-key">Threshold:</span> <span class="rl-val">Revenue exposure exceeds containment threshold</span></div>\n'
    '    <div class="reasoning-line"><span class="rl-key">Evidence:</span> <span class="rl-val">Alternative supplier identified and available</span></div>\n'
    '    <div class="reasoning-line"><span class="rl-key">History:</span> <span class="rl-val">Similar incidents resolved in 48hrs with contingency activation</span></div>\n'
    '    <div class="reasoning-line"><span class="rl-key">Risk:</span> <span class="rl-val">Inaction probability of total loss: 94%</span></div>\n'
    "  `;\n"
    "  appendCrossUploadSource();\n"
    "}",

    "  document.getElementById('reasoningBox').innerHTML = `\n"
    '    <div class="reasoning-line"><span class="rl-key">Threshold:</span> <span class="rl-val">Revenue exposure exceeds containment threshold</span></div>\n'
    '    <div class="reasoning-line"><span class="rl-key">Evidence:</span> <span class="rl-val">Alternative supplier identified and available</span></div>\n'
    '    <div class="reasoning-line"><span class="rl-key">History:</span> <span class="rl-val">Similar incidents resolved in 48hrs with contingency activation</span></div>\n'
    '    <div class="reasoning-line"><span class="rl-key">Risk:</span> <span class="rl-val">Inaction probability of total loss: 94%</span></div>\n'
    "  `;\n"
    "  appendCrossUploadSource();\n"
    "  renderQualityScore(generatedRec || {});\n"
    "}",
    "fallback path quality score wiring"
)

if content == original:
    print("No changes made (unexpected — should have errored above instead).")
    sys.exit(1)

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"OK: {PATH} patched successfully.")