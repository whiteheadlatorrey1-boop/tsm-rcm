#!/usr/bin/env python3
"""
Wires Roadmap #6 (Agent Registry) and #9 (Delivery Package) into
html/bpo/bpo-strategist-v2.html. Both engines were already <script>-tagged
on this page but never invoked -- this adds the real call sites.

#6 Agent Registry:
  - toExplainItems(obj) already produces the canonical items array used by
    Quality Score. This tags those same items via TSMAgentRegistry.run()
    against the new 'bpo-war-room' roster (see apply_agent_registry_bpo_
    roster.py -- run that one FIRST, this depends on that roster existing)
    before they're scored, same "tag once, reuse everywhere" convention as
    every other engine on this platform.
  - Adds a small agent-summary render alongside the existing Quality Score
    box, using TSMAgentRegistry.summarize().

#9 Delivery Package:
  - Adds an "EXPORT CLIENT PACKAGE" button next to the existing "EXPORT"
    button, using the exact same Blob/createObjectURL download pattern
    already established by exportBrief() on this page -- just JSON instead
    of the plain-text brief, since TSMDeliveryPackage.build() returns a
    structured object, not prose.
  - Reuses the same tagged items + quality score already computed for #6,
    per this platform's "reuse rather than re-derive" convention.

Run from repo root: python3 apply_bpo_strategist_wiring.py
Fails loudly (no changes written) if any anchor doesn't match exactly once.
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
        print(f"ABORT: anchor for [{label}] is not unique ({content.count(old)} matches) — refusing to guess.")
        sys.exit(1)
    return content.replace(old, new, 1)

# ── 1. add mount div for the agent-summary panel, right after qualityScoreBox ──
old_html = '''      <div class="explain-section">
        <div class="explain-label">QUALITY SCORE</div>
        <div class="reasoning-box" id="qualityScoreBox">
          <div style="color:var(--muted)">Quality score will appear after strategy generation completes.</div>
        </div>
      </div>
    </div>'''
new_html = '''      <div class="explain-section">
        <div class="explain-label">QUALITY SCORE</div>
        <div class="reasoning-box" id="qualityScoreBox">
          <div style="color:var(--muted)">Quality score will appear after strategy generation completes.</div>
        </div>
      </div>

      <div class="explain-section">
        <div class="explain-label">AGENT ATTRIBUTION</div>
        <div class="reasoning-box" id="agentRegistryBox">
          <div style="color:var(--muted)">Agent attribution will appear after strategy generation completes.</div>
        </div>
      </div>
    </div>'''
assert old_html in content, "qualityScoreBox HTML block not found"
assert content.count(old_html) == 1, "qualityScoreBox HTML block not unique"
content = content.replace(old_html, new_html)

# ── 2. add the EXPORT CLIENT PACKAGE button next to the existing EXPORT button ──
old_btn = '''  <button class="act-btn secondary" onclick="exportBrief()">⬇ EXPORT</button>'''
new_btn = '''  <button class="act-btn secondary" onclick="exportBrief()">⬇ EXPORT</button>
  <button class="act-btn secondary" onclick="exportClientPackage()">⬇ EXPORT CLIENT PACKAGE</button>'''
assert old_btn in content, "EXPORT button not found"
assert content.count(old_btn) == 1, "EXPORT button not unique"
content = content.replace(old_btn, new_btn)

# ── 3. tag items via Agent Registry before scoring, render the summary,
#      and stash the tagged items + score on module scope so exportClientPackage() can reuse them ──
old_render_qs = '''function renderQualityScore(obj) {
  const box = document.getElementById('qualityScoreBox');
  if (!box) return;
  if (!window.TSMQualityScoreEngine) {
    box.innerHTML = '<div style="color:var(--muted)">Quality score engine not loaded.</div>';
    return;
  }
  const items = toExplainItems(obj);
  const q = TSMQualityScoreEngine.fromExplainItems(items, {});
  const rows = [
    { key: 'Overall', val: q.overall + '% (' + q.band + ')' },
    { key: 'Accuracy', val: q.accuracy + '%' },
    { key: 'Completeness', val: q.completeness + '%' },
    { key: 'Compliance', val: q.compliance + '%' },
    { key: 'Confidence', val: q.confidence + '%' }
  ];
  box.innerHTML = rows.map(r =>
    `<div class="reasoning-line"><span class="rl-key">${r.key}:</span> <span class="rl-val">${r.val}</span></div>`
  ).join('');
}'''

new_render_qs = '''// Roadmap #6/#9 -- last tagged items + score, stashed here so
// exportClientPackage() can reuse the exact same data renderQualityScore()
// already computed rather than re-deriving it (this platform's established
// convention -- see renderOutcome() callers elsewhere).
let lastTaggedItems = [];
let lastQualityScore = null;

function renderQualityScore(obj) {
  const box = document.getElementById('qualityScoreBox');
  if (!box) return;
  if (!window.TSMQualityScoreEngine) {
    box.innerHTML = '<div style="color:var(--muted)">Quality score engine not loaded.</div>';
    return;
  }
  const items = toExplainItems(obj);

  // Roadmap #6 -- tag items with which specialized agent concern surfaced
  // them, before scoring. 'bpo-war-room' roster is currently a labeled
  // stub (see tsm-agent-registry.js) -- everything will show as
  // "Unassigned" until that roster's matchers are confirmed against real
  // finding text, same honest-empty convention as the rest of this file.
  const tagged = window.TSMAgentRegistry ? TSMAgentRegistry.run('bpo-war-room', items) : items;
  lastTaggedItems = tagged;

  const q = TSMQualityScoreEngine.fromExplainItems(tagged, {});
  lastQualityScore = q;
  const rows = [
    { key: 'Overall', val: q.overall + '% (' + q.band + ')' },
    { key: 'Accuracy', val: q.accuracy + '%' },
    { key: 'Completeness', val: q.completeness + '%' },
    { key: 'Compliance', val: q.compliance + '%' },
    { key: 'Confidence', val: q.confidence + '%' }
  ];
  box.innerHTML = rows.map(r =>
    `<div class="reasoning-line"><span class="rl-key">${r.key}:</span> <span class="rl-val">${r.val}</span></div>`
  ).join('');

  renderAgentSummary(tagged);
}

// Roadmap #6 -- pure render layer over TSMAgentRegistry.summarize(), same
// convention as every other render*() function on this page: no
// classification logic here, just display of what the registry computed.
function renderAgentSummary(taggedItems) {
  const box = document.getElementById('agentRegistryBox');
  if (!box) return;
  if (!window.TSMAgentRegistry) {
    box.innerHTML = '<div style="color:var(--muted)">Agent registry not loaded.</div>';
    return;
  }
  const summary = TSMAgentRegistry.summarize(taggedItems);
  if (!summary.length) {
    box.innerHTML = '<div style="color:var(--muted)">No findings to attribute yet.</div>';
    return;
  }
  box.innerHTML = summary.map(s =>
    `<div class="reasoning-line"><span class="rl-key">${s.agentLabel}:</span> <span class="rl-val">${s.count} finding(s)${s.highSeverity ? ', ' + s.highSeverity + ' high-severity' : ''}</span></div>`
  ).join('');
}'''

assert old_render_qs in content, "renderQualityScore function not found"
assert content.count(old_render_qs) == 1, "renderQualityScore function not unique"
content = content.replace(old_render_qs, new_render_qs)

# ── 4. add exportClientPackage(), right after exportBrief() ──
old_export = '''function exportBrief(){
  const content = [
    'TSM SHELL · BPO DECISION INTELLIGENCE BRIEF',
    '============================================',
    'Generated: ' + new Date().toLocaleString(),
    'Sector: ' + (warData?.selectedSector||'—'),
    'Scenario Selected: ' + (selectedScenario||'—'),
    'Confidence: ' + (generatedRec?.confidence||'—') + '%',
    '',
    'STRATEGY BRIEF:',
    stratBrief || '(Not yet generated)',
    '',
    'RECOMMENDED ACTIONS:',
    (generatedRec?.recommendedActions||[]).map((a,i)=>`${i+1}. ${a.text} — ${a.owner}`).join('\\n'),
    '',
    'REASONING:',
    (generatedRec?.reasoning||[]).map(r=>`${r.key}: ${r.val}`).join('\\n'),
  ].join('\\n');
  const blob = new Blob([content],{type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tsm-decision-brief-'+Date.now()+'.txt';
  a.click();
}'''

new_export = '''function exportBrief(){
  const content = [
    'TSM SHELL · BPO DECISION INTELLIGENCE BRIEF',
    '============================================',
    'Generated: ' + new Date().toLocaleString(),
    'Sector: ' + (warData?.selectedSector||'—'),
    'Scenario Selected: ' + (selectedScenario||'—'),
    'Confidence: ' + (generatedRec?.confidence||'—') + '%',
    '',
    'STRATEGY BRIEF:',
    stratBrief || '(Not yet generated)',
    '',
    'RECOMMENDED ACTIONS:',
    (generatedRec?.recommendedActions||[]).map((a,i)=>`${i+1}. ${a.text} — ${a.owner}`).join('\\n'),
    '',
    'REASONING:',
    (generatedRec?.reasoning||[]).map(r=>`${r.key}: ${r.val}`).join('\\n'),
  ].join('\\n');
  const blob = new Blob([content],{type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tsm-decision-brief-'+Date.now()+'.txt';
  a.click();
}

// Roadmap #9 -- pure assembly layer, same convention as TSMDeliveryPackage
// itself: nothing computed here, just reuses lastTaggedItems/lastQualityScore
// already produced by renderQualityScore() and hands them to the engine.
// documentCount is left undefined (honest null in the package) since this
// page has no canonical "documents processed" counter, matching the
// engine's own documented fallback.
function exportClientPackage(){
  if (!window.TSMDeliveryPackage) {
    alert('Delivery package engine not loaded.');
    return;
  }
  const pkg = TSMDeliveryPackage.build({
    domain: warData?.selectedSector || 'BPO',
    explainItems: lastTaggedItems,
    qualityScore: lastQualityScore
  });
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tsm-client-package-' + Date.now() + '.json';
  a.click();
}'''

assert old_export in content, "exportBrief function not found"
assert content.count(old_export) == 1, "exportBrief function not unique"
content = content.replace(old_export, new_export)

assert content != original, "no changes were made"
with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"OK: {PATH} patched — Agent Registry tagging + Delivery Package export wired.")