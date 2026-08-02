import re, sys

path = "html/l1-copilot/l1-ticket-copilot.html"
src = open(path, encoding="utf-8").read()

# 1. CSS insertion
css_anchor = "  --text:#c9d6dc;--text-dim:#5a7684;--card:#0d1418;\n}\n"
assert src.count(css_anchor) == 1, "CSS anchor not found or not unique"
css_block = (
"  --text:#c9d6dc;--text-dim:#5a7684;--card:#0d1418;\n}\n"
".fix-validated-banner {\n"
"  display: none;\n"
"  margin: 0 0 14px;\n"
"  padding: 10px 14px;\n"
"  border: 1px solid var(--green);\n"
"  border-radius: 8px;\n"
"  background: rgba(0,255,80,.08);\n"
"  color: var(--green);\n"
"  font-size: 13px;\n"
"  font-weight: 600;\n"
"  letter-spacing: .02em;\n"
"}\n"
".fix-validated-banner.show { display: block; }\n"
)
assert src.count(css_block) == 0, "CSS block already present — aborting"
src2 = src.replace(css_anchor, css_block, 1)
assert src2 != src, "CSS insertion had no effect"
src = src2

# 2. Banner div insertion
html_anchor = '    <section class="section active" id="sec-ticket">\n      <div class="ticket-head-grid">\n'
assert src.count(html_anchor) == 1, "HTML anchor not found or not unique"
html_block = (
'    <section class="section active" id="sec-ticket">\n'
'      <div id="fixValidatedBanner" class="fix-validated-banner"></div>\n'
'      <div class="ticket-head-grid">\n'
)
assert 'id="fixValidatedBanner"' not in src, "banner div already present — aborting"
src2 = src.replace(html_anchor, html_block, 1)
assert src2 != src, "HTML insertion had no effect"
src = src2

# 3. JS function + init wiring
js_anchor = (
"  // ── Init ─────────────────────────────────────────────────────────────────\n"
"  renderChecklist();\n"
"  renderHistory();\n"
"  renderExecStrip();\n"
"  loadCurrentTicket();\n"
"  applyIncomingEscalation();\n"
"})();\n"
"</script>\n"
)
assert src.count(js_anchor) == 1, "JS init anchor not found or not unique"
js_block = (
"  // ── Fix-validated notification (from Command Center) ─────────────────────\n"
"  // Same dedupe pattern as applyIncomingEscalation above: relay only stores\n"
"  // the last payload per domain, so remember the last id we've applied.\n"
"  // NOTE (orphan relay key as of this commit): no page currently writes\n"
"  // FIX_VALIDATED_FROM_CC — this is a consumer with no producer yet. Add the\n"
"  // Command Center write-side before expecting this banner to ever show.\n"
"  const FIX_VALIDATED_SEEN_KEY = 'TSM_L1_LAST_FIX_VALIDATED_SEEN';\n"
"  function applyFixValidatedNotification() {\n"
"    let payload;\n"
"    try {\n"
"      if (!window.TSM || !window.TSM.relay) return;\n"
"      payload = window.TSM.relay.read('FIX_VALIDATED_FROM_CC');\n"
"    } catch (e) { return; }\n"
"    if (!payload || !payload.ticketId || !payload.message) return;\n"
"\n"
"    const seenId = sessionStorage.getItem(FIX_VALIDATED_SEEN_KEY);\n"
"    if (seenId === payload.id) return;\n"
"    try { sessionStorage.setItem(FIX_VALIDATED_SEEN_KEY, payload.id); } catch (e) {}\n"
"\n"
"    const currentIncident = document.getElementById('tkIncident').value;\n"
"    if (!currentIncident || currentIncident !== payload.ticketId) return;\n"
"\n"
"    const banner = document.getElementById('fixValidatedBanner');\n"
"    banner.textContent = 'ENTERPRISE COMMAND CENTER: ' + payload.message;\n"
"    banner.classList.add('show');\n"
"  }\n"
"\n"
"  // ── Init ─────────────────────────────────────────────────────────────────\n"
"  renderChecklist();\n"
"  renderHistory();\n"
"  renderExecStrip();\n"
"  loadCurrentTicket();\n"
"  applyIncomingEscalation();\n"
"  applyFixValidatedNotification();\n"
"})();\n"
"</script>\n"
)
assert "function applyFixValidatedNotification" not in src, "JS function already present — aborting"
src2 = src.replace(js_anchor, js_block, 1)
assert src2 != src, "JS insertion had no effect"
src = src2

open(path, "w", encoding="utf-8").write(src)
print("Applied: fix-validated notification (CSS + banner div + JS function + init wiring)")
