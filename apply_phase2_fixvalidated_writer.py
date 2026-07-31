path = "html/l1-copilot/enterprise-command-center.html"
src = open(path, encoding="utf-8").read()

# 1. Load relay.core.js — matches the exact include path/position used on
#    l1-ticket-copilot.html and vmware-copilot.html.
head_anchor = '<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
assert src.count(head_anchor) == 1, "head anchor not found or not unique"
head_block = (
'<html lang="en">\n'
'<head>\n'
'<script src="/html/war-rooms/_relay_control_plane/relay.core.js"></script>\n'
'<meta charset="UTF-8">\n'
)
assert 'relay.core.js' not in src, "relay.core.js already included — aborting"
src2 = src.replace(head_anchor, head_block, 1)
assert src2 != src, "relay.core.js insertion had no effect"
src = src2

# 2. Write FIX_VALIDATED_FROM_CC when a mission actually transitions to
#    'resolved' inside openMission() — the real, existing stage-advance flow,
#    not a bolted-on button. mission.id is generated server-side as INC00xxxx
#    (server/enterprise-lab/incident-engine.js), which is exactly the format
#    l1-ticket-copilot.html's #tkIncident field expects, so ticketId lines up
#    for real, not just superficially.
js_anchor = (
"  const next = mission.status === 'new' ? 'working'\n"
"    : mission.status === 'working' ? 'resolved'\n"
"    : mission.status;\n"
"  await fetchJSON(`${API}/missions/${id}/advance`, {\n"
"    method: 'POST',\n"
"    headers: { 'Content-Type': 'application/json' },\n"
"    body: JSON.stringify({ status: next }),\n"
"  });\n"
"  renderWallAndQueue();\n"
"  renderStats();\n"
"}\n"
)
assert src.count(js_anchor) == 1, "openMission anchor not found or not unique"
js_block = (
"  const next = mission.status === 'new' ? 'working'\n"
"    : mission.status === 'working' ? 'resolved'\n"
"    : mission.status;\n"
"  await fetchJSON(`${API}/missions/${id}/advance`, {\n"
"    method: 'POST',\n"
"    headers: { 'Content-Type': 'application/json' },\n"
"    body: JSON.stringify({ status: next }),\n"
"  });\n"
"  if (next === 'resolved') {\n"
"    try {\n"
"      window.TSM.relay.write('FIX_VALIDATED_FROM_CC', {\n"
"        id: 'fv-' + id + '-' + Date.now(),\n"
"        ticketId: id,\n"
"        message: `Fix validated for ${mission.device} — ${mission.issue}. Ticket resolved and closed out.`,\n"
"      });\n"
"    } catch (e) { console.warn('Relay write failed', e); }\n"
"  }\n"
"  renderWallAndQueue();\n"
"  renderStats();\n"
"}\n"
)
assert "FIX_VALIDATED_FROM_CC" not in src, "writer already present — aborting"
src2 = src.replace(js_anchor, js_block, 1)
assert src2 != src, "writer insertion had no effect"
src = src2

open(path, "w", encoding="utf-8").write(src)
print("Applied: Phase 2 — enterprise-command-center.html writes FIX_VALIDATED_FROM_CC on mission resolve")
