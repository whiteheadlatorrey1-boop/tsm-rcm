#!/usr/bin/env python3
"""
Sprint 4 — AI Query Widget.

Adds a free-text "describe the problem" box to the Enterprise Command
Center. Submissions go to a new POST /api/twins/knowledge/query route,
which asks Groq to pick the single best-matching scenario out of the
real 27-entry Knowledge Copilot catalog and returns its title, twin,
confidence, one-line reasoning, and full step list. No keyword-match
fallback — if Groq is unreachable or returns something unusable, the
widget surfaces that as an error rather than guessing.

Idempotent: checks for its own markers before patching either file.
"""
import re
import sys

ROUTER_PATH = "server/enterprise-lab/twins-router.js"
HTML_PATH = "html/enterprise-command-center.html"

MARKER = "AI Query Widget"

# ---------------------------------------------------------------------------
# 1. Backend: twins-router.js
# ---------------------------------------------------------------------------

ROUTER_BLOCK = '''
// ---- AI Query Widget ----
// End users describe a problem in free text; Groq picks the single
// best-matching documented scenario out of the real Knowledge Copilot
// catalog (never invents one) and we return its full step list.
// No keyword-match fallback by design — if the AI call fails, the
// widget reports that rather than silently guessing.

const AI_WIDGET_MODELS = ['openai/gpt-oss-120b', 'llama-3.1-8b-instant'];

async function matchScenarioToQuery(query, entries) {
  const groqKey = process.env.GROQ_KEY || process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('No Groq API key configured');

  const catalog = entries
    .map((e) => `${e.twinType}:${e.faultType} — ${e.title}`)
    .join('\\n');

  const system = [
    'You are a triage assistant for an IT Service Desk knowledge base.',
    "Given a user's free-text description of a problem, pick the single best-matching",
    'documented scenario from the catalog below. Always pick the closest match even if',
    'imperfect. Never invent a scenario key that is not in the catalog.',
    'Return JSON only, no markdown fences, in exactly this shape:',
    '{"key":"<twinType>:<faultType>","confidence":"high|medium|low","reasoning":"<one sentence>"}',
    '',
    'CATALOG:',
    catalog,
  ].join('\\n');

  let lastErr;
  for (const model of AI_WIDGET_MODELS) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + groqKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          max_tokens: 200,
          temperature: 0.1,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: query },
          ],
        }),
      });
      if (!r.ok) {
        const errText = await r.text();
        lastErr = new Error(`Groq API error ${r.status}: ${errText}`);
        if ([429, 500, 502, 503].includes(r.status)) continue;
        throw lastErr;
      }
      const data = await r.json();
      const text = data?.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      if (!parsed.key || typeof parsed.key !== 'string') {
        throw new Error('Malformed AI response: missing key');
      }
      return parsed;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('AI matching failed');
}

router.post('/knowledge/query', async (req, res) => {
  const { query } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'query is required' });
  }
  try {
    const entries = knowledgeCopilot.listEntries();
    const matched = await matchScenarioToQuery(query.trim(), entries);
    const [twinType, faultType] = matched.key.split(':');
    const full = knowledgeCopilot.lookup(twinType, faultType);
    if (!full) {
      return res.status(502).json({ error: `AI returned an unknown scenario key: ${matched.key}` });
    }
    res.json({
      query: query.trim(),
      twinType,
      faultType,
      title: full.title,
      steps: full.steps,
      confidence: matched.confidence || null,
      reasoning: matched.reasoning || null,
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

'''


def patch_router():
    with open(ROUTER_PATH, "r", encoding="utf-8") as f:
        src = f.read()

    if MARKER in src:
        print(f"[skip] {ROUTER_PATH} already patched")
        return

    anchor = "module.exports = router;"
    assert src.count(anchor) == 1, f"expected exactly one '{anchor}' in {ROUTER_PATH}"

    src = src.replace(anchor, ROUTER_BLOCK.strip("\n") + "\n\n" + anchor)

    with open(ROUTER_PATH, "w", encoding="utf-8") as f:
        f.write(src)
    print(f"[ok] patched {ROUTER_PATH}")


# ---------------------------------------------------------------------------
# 2. Frontend: enterprise-command-center.html
# ---------------------------------------------------------------------------

WIDGET_CSS = '''
  /* AI Query Widget */
  .ai-widget {
    margin: 20px 22px 0;
    background: #12161c;
    border: 1px solid #262b33;
    border-radius: 8px;
    padding: 16px 18px;
  }
  .ai-widget-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  .ai-widget-header h3 {
    margin: 0;
    font-size: 14px;
    color: #e6e9ef;
  }
  .ai-widget-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(0, 229, 255, 0.12);
    color: #00e5ff;
    border: 1px solid rgba(0, 229, 255, 0.4);
  }
  .ai-widget-subtitle {
    font-size: 11px;
    color: #8b94a3;
    margin: 6px 0 14px;
    max-width: 900px;
    line-height: 1.5;
  }
  .ai-widget-form {
    display: flex;
    gap: 8px;
  }
  .ai-widget-input {
    flex: 1;
    background: #1b2028;
    color: #cfd4dc;
    border: 1px solid #333a45;
    border-radius: 4px;
    font-size: 12px;
    padding: 8px 10px;
    font-family: inherit;
  }
  .ai-widget-input:focus {
    outline: none;
    border-color: #00e5ff;
  }
  .ai-widget-submit {
    background: rgba(0, 229, 255, 0.12);
    color: #00e5ff;
    border: 1px solid #00e5ff;
    border-radius: 4px;
    font-size: 11px;
    letter-spacing: 0.5px;
    padding: 8px 16px;
    cursor: pointer;
    white-space: nowrap;
  }
  .ai-widget-submit:hover { background: rgba(0, 229, 255, 0.2); }
  .ai-widget-submit:disabled { opacity: 0.5; cursor: default; }
  .ai-widget-result {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid #262b33;
  }
  .ai-widget-result:empty { display: none; border-top: none; margin-top: 0; padding-top: 0; }
  .ai-widget-result-top {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .ai-widget-result-title {
    font-size: 13px;
    font-weight: 700;
    color: #e6e9ef;
  }
  .ai-widget-confidence {
    font-size: 8px;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 700;
  }
  .ai-widget-confidence.high { background: rgba(0, 255, 80, 0.12); color: #00ff50; border: 1px solid #00ff50; }
  .ai-widget-confidence.medium { background: rgba(255, 149, 0, 0.12); color: #ff9500; border: 1px solid #ff9500; }
  .ai-widget-confidence.low { background: rgba(255, 59, 59, 0.12); color: #ff3b3b; border: 1px solid #ff3b3b; }
  .ai-widget-reasoning {
    font-size: 11px;
    color: #8b94a3;
    font-style: italic;
    margin: 6px 0 10px;
  }
  .ai-widget-result-steps {
    font-size: 11px;
    color: #cfd4dc;
  }
  .ai-widget-result-steps ol { margin: 0; padding-left: 18px; }
  .ai-widget-result-steps li { margin-bottom: 4px; line-height: 1.4; }
  .ai-widget-status {
    font-size: 11px;
    color: #8b94a3;
    font-style: italic;
  }
  .ai-widget-status.error { color: #ff3b3b; font-style: normal; }
'''

WIDGET_HTML = '''<section class="ai-widget" id="ai-widget">
  <div class="ai-widget-header">
    <h3>AI Widget — Describe the Issue, Get the Playbook</h3>
    <span class="ai-widget-badge">GROQ-POWERED</span>
  </div>
  <p class="ai-widget-subtitle">
    Type what you're seeing in plain language and the AI will match it against the
    documented Scenario Library below and return the exact step-by-step response.
  </p>
  <form class="ai-widget-form" id="ai-widget-form">
    <input
      type="text"
      class="ai-widget-input"
      id="ai-widget-input"
      placeholder="e.g. &quot;users can't log in and getting locked out repeatedly&quot;"
      autocomplete="off"
    />
    <button type="submit" class="ai-widget-submit" id="ai-widget-submit">Get Guidance</button>
  </form>
  <div class="ai-widget-result" id="ai-widget-result"></div>
</section>

'''

WIDGET_JS = '''<script>
(function () {
  const TWIN_LABELS_AI = {
    ad: 'Active Directory',
    m365: 'Microsoft 365',
    network: 'Network',
    vmware: 'VMware',
    device: 'Device',
    vendor: 'Vendor',
  };

  const form = document.getElementById('ai-widget-form');
  const input = document.getElementById('ai-widget-input');
  const submitBtn = document.getElementById('ai-widget-submit');
  const resultEl = document.getElementById('ai-widget-result');

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    submitBtn.disabled = true;
    resultEl.innerHTML = '<div class="ai-widget-status">Thinking…</div>';

    let res, body;
    try {
      res = await fetch('/api/twins/knowledge/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      body = await res.json().catch(() => null);
    } catch (networkErr) {
      resultEl.innerHTML = '<div class="ai-widget-status error">Could not reach the AI service. Check your connection and try again.</div>';
      submitBtn.disabled = false;
      return;
    }

    if (!res.ok || !body) {
      const msg = (body && body.error) ? body.error : `Request failed (${res.status})`;
      resultEl.innerHTML = `<div class="ai-widget-status error">${escapeHtml(msg)}</div>`;
      submitBtn.disabled = false;
      return;
    }

    const twinLabel = TWIN_LABELS_AI[body.twinType] || body.twinType;
    const conf = (body.confidence || '').toLowerCase();
    const confBadge = conf
      ? `<span class="ai-widget-confidence ${conf}">${escapeHtml(conf)}</span>`
      : '';
    const reasoning = body.reasoning
      ? `<div class="ai-widget-reasoning">${escapeHtml(body.reasoning)}</div>`
      : '';
    const stepsHtml = (body.steps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('');

    resultEl.innerHTML = `
      <div class="ai-widget-result-top">
        <span class="ai-widget-result-title">${escapeHtml(body.title)}</span>
        <span class="scenario-card-twin">${escapeHtml(twinLabel)}</span>
        ${confBadge}
      </div>
      ${reasoning}
      <div class="ai-widget-result-steps"><ol>${stepsHtml}</ol></div>
    `;
    submitBtn.disabled = false;
  });
})();
</script>

'''

HOWTO_SECTION = '''      <div class="howto-section">
        <h4>AI Widget</h4>
        <p>Type a plain-language description of what you're seeing into the AI Widget box and click "Get Guidance." Groq reasons over the real Scenario Library and returns the single best-matching playbook, its confidence, a one-line explanation of the match, and the full step list — no keyword matching involved.</p>
      </div>

'''


def patch_html():
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        src = f.read()

    if MARKER in src or 'id="ai-widget"' in src:
        print(f"[skip] {HTML_PATH} already patched")
        return

    # 1. CSS: insert right after the scenario-library CSS block's closing rule
    css_anchor = "  .scenario-card-loading {\n    font-size: 10px;\n    color: #8b94a3;\n    font-style: italic;\n  }\n"
    assert src.count(css_anchor) == 1, "scenario-card-loading CSS block not found or not unique"
    src = src.replace(css_anchor, css_anchor + WIDGET_CSS, 1)

    # 2. HTML markup: insert right before the Scenario Library section
    html_anchor = '<section class="scenario-library" id="scenario-library">'
    assert src.count(html_anchor) == 1, "scenario-library section anchor not found or not unique"
    marker_comment = f"<!-- {MARKER} -->\n"
    src = src.replace(html_anchor, marker_comment + WIDGET_HTML + html_anchor, 1)

    # 3. JS: insert right before the Scenario Library's own <script> closes and
    #    the How-To overlay markup begins, i.e. right after loadScenarioLibrary();})();</script>
    js_anchor = "  loadScenarioLibrary();\n})();\n</script>\n"
    assert src.count(js_anchor) == 1, "scenario library closing script anchor not found or not unique"
    src = src.replace(js_anchor, js_anchor + "\n" + WIDGET_JS, 1)

    # 4. How To modal: add a section right after the Scenario Library how-to entry
    howto_anchor = (
        '      <div class="howto-section">\n'
        '        <h4>SLA Summary</h4>\n'
    )
    assert src.count(howto_anchor) == 1, "SLA Summary how-to section anchor not found or not unique"
    src = src.replace(howto_anchor, HOWTO_SECTION + howto_anchor, 1)

    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write(src)
    print(f"[ok] patched {HTML_PATH}")


if __name__ == "__main__":
    patch_router()
    patch_html()
    print("Done.")