#!/usr/bin/env python3
# One-shot: injects callAI + AI widget into all unwired TSM Shell apps
# Maps each file to the correct API endpoint and system context

import os, re

ROOT = '/workspaces/tsm-shell'

# file → { api, context_key }
WIRE_MAP = {
    'access.html':                  {'api': '/api/ai/query', 'app': 'enterprise'},
    'agents-ins.html':              {'api': '/api/insurance/query', 'app': 'insurance'},
    'az-life.html':                 {'api': '/api/insurance/query', 'app': 'insurance'},
    'client-access.html':           {'api': '/api/ai/query', 'app': 'enterprise'},
    'concierge-command.html':       {'api': '/api/ai/query', 'app': 'hospitality'},
    'construction-center.html':     {'api': '/api/construction/query', 'app': 'construction'},
    'construction.html':            {'api': '/api/construction/query', 'app': 'construction'},
    'dme.html':                     {'api': '/api/hc/query', 'app': 'healthcare'},
    'financial.html':               {'api': '/api/financial/query', 'app': 'financial'},
    'mortgage-command.html':        {'api': '/api/mortgage/query', 'app': 'mortgage'},
    'strategist-index.html':        {'api': '/api/strategist/query', 'app': 'strategist'},
    'suite-builder.html':           {'api': '/api/strategist/query', 'app': 'enterprise'},
    # Partially wired — upgrade callAI to real endpoint
    'samplehealthsystem-dee.html':         {'api': '/api/hc/query', 'app': 'healthcare'},
    'tsm-samplehealthsystem-dee.tsmatter.html': {'api': '/api/hc/query', 'app': 'healthcare'},
    'reo-command.html':             {'api': '/api/mortgage/query', 'app': 'mortgage'},
    'zero-trust.html':              {'api': '/api/ai/query', 'app': 'enterprise'},
}

# The AI injection block — inserted before </body>
def make_injection(api, app):
    return f"""
<div id="tsm-ai-widget" style="position:fixed;bottom:16px;right:16px;z-index:9999;width:340px;font-family:'Share Tech Mono',monospace">
  <div id="tsm-ai-toggle" onclick="document.getElementById('tsm-ai-panel').style.display=document.getElementById('tsm-ai-panel').style.display==='none'?'flex':'none'" style="background:#0a1628;border:1px solid rgba(0,229,255,0.3);border-radius:3px;padding:7px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:9px;color:#00e5ff;letter-spacing:.1em;box-shadow:0 0 20px rgba(0,229,255,0.1)">
    <span style="width:6px;height:6px;border-radius:50%;background:#00e676;animation:tsmpulse 2s infinite;flex-shrink:0"></span>
    TSM AI · {app.upper()} NODE · LIVE
  </div>
  <div id="tsm-ai-panel" style="display:none;flex-direction:column;gap:0;background:#070d18;border:1px solid rgba(0,229,255,0.2);border-radius:3px;margin-top:4px;overflow:hidden;box-shadow:0 0 40px rgba(0,0,0,0.6)">
    <div style="padding:8px 12px;border-bottom:1px solid rgba(0,229,255,0.08);font-size:8px;color:#5a7a9a;letter-spacing:.1em">// TSM AI COMMAND · {api}</div>
    <div id="tsm-ai-msgs" style="max-height:240px;overflow-y:auto;padding:8px 12px;display:flex;flex-direction:column;gap:6px;font-size:10px;line-height:1.6;scrollbar-width:thin;scrollbar-color:rgba(0,229,255,0.1) transparent"></div>
    <div id="tsm-ai-think" style="display:none;padding:4px 12px;font-size:8px;color:#00b8d4;letter-spacing:.08em;animation:tsmpulse 1s infinite">// AI PROCESSING…</div>
    <div style="display:flex;gap:0;border-top:1px solid rgba(0,229,255,0.08)">
      <input id="tsm-ai-input" placeholder="Ask {app} AI…" onkeydown="if(event.key==='Enter')tsmAsk()" style="flex:1;background:transparent;border:none;outline:none;padding:8px 12px;font-family:'Share Tech Mono',monospace;font-size:10px;color:#c8d8e8;caret-color:#00e5ff" />
      <button onclick="tsmAsk()" style="background:transparent;border:none;border-left:1px solid rgba(0,229,255,0.08);padding:8px 12px;font-family:'Share Tech Mono',monospace;font-size:8px;color:#00e5ff;cursor:pointer;letter-spacing:.08em">SEND</button>
    </div>
  </div>
</div>
<style>
@keyframes tsmpulse{{0%,100%{{opacity:1}}50%{{opacity:.3}}}}
#tsm-ai-msgs::-webkit-scrollbar{{width:2px}}
#tsm-ai-msgs::-webkit-scrollbar-thumb{{background:rgba(0,229,255,0.15)}}
</style>
<script>
async function tsmAsk() {{
  var input = document.getElementById('tsm-ai-input');
  var msgs = document.getElementById('tsm-ai-msgs');
  var think = document.getElementById('tsm-ai-think');
  var q = input.value.trim();
  if (!q) return;
  input.value = '';

  var uDiv = document.createElement('div');
  uDiv.style.cssText = 'color:#00b8d4;border-left:2px solid rgba(0,229,255,0.3);padding-left:6px';
  uDiv.textContent = q;
  msgs.appendChild(uDiv);

  think.style.display = 'block';
  msgs.scrollTop = msgs.scrollHeight;

  try {{
    var res = await fetch('{api}', {{
      method: 'POST',
      headers: {{'Content-Type': 'application/json'}},
      body: JSON.stringify({{ question: q, app: '{app}', maxTokens: 1024 }})
    }});
    var data = await res.json();
    var text = data.answer || data.response || 'No response.';
    think.style.display = 'none';

    var aDiv = document.createElement('div');
    aDiv.style.cssText = 'color:#c8d8e8;border-left:2px solid rgba(0,229,255,0.08);padding-left:6px;white-space:pre-wrap';
    msgs.appendChild(aDiv);

    var words = text.split(' ');
    for (var i = 0; i < words.length; i++) {{
      aDiv.textContent += (i===0?'':' ') + words[i];
      msgs.scrollTop = msgs.scrollHeight;
      if (i%8===0) await new Promise(function(r){{setTimeout(r,15)}});
    }}
  }} catch(e) {{
    think.style.display = 'none';
    var eDiv = document.createElement('div');
    eDiv.style.color = '#ff4d6d';
    eDiv.textContent = 'Error: ' + e.message;
    msgs.appendChild(eDiv);
  }}
}}
// Also wire callAI if it exists on the page
if (typeof callAI === 'undefined') {{
  window.callAI = async function(systemPrompt, userMessage, onChunk, onDone) {{
    try {{
      var res = await fetch('{api}', {{
        method: 'POST',
        headers: {{'Content-Type': 'application/json'}},
        body: JSON.stringify({{ question: userMessage, context: systemPrompt, app: '{app}', maxTokens: 1024 }})
      }});
      var data = await res.json();
      var text = data.answer || data.response || 'No response.';
      if (onChunk) {{
        var words = text.split(' ');
        for (var i = 0; i < words.length; i++) {{
          onChunk((i===0?'':' ') + words[i]);
          if (i%8===0) await new Promise(function(r){{setTimeout(r,15)}});
        }}
      }}
      if (onDone) onDone();
    }} catch(e) {{
      if (onChunk) onChunk('[AI Error] ' + e.message);
      if (onDone) onDone();
    }}
  }};
}}
</script>
"""

CALL_AI_PATTERN = re.compile(
    r'async function callAI\s*\([^)]*\)\s*\{.*?\n\}',
    re.DOTALL
)

NEW_CALL_AI_TEMPLATE = """async function callAI(systemPrompt, userMessage, onChunk, onDone) {{
  try {{
    var res = await fetch('{api}', {{
      method: 'POST',
      headers: {{'Content-Type': 'application/json'}},
      body: JSON.stringify({{ question: userMessage, context: systemPrompt, app: '{app}', maxTokens: 1024 }})
    }});
    var data = await res.json();
    var text = data.answer || data.response || 'No response.';
    if (onChunk) {{
      var words = text.split(' ');
      for (var i = 0; i < words.length; i++) {{
        onChunk((i===0?'':' ') + words[i]);
        if (i%8===0) await new Promise(function(r){{setTimeout(r,15)}});
      }}
    }}
    if (onDone) onDone();
  }} catch(e) {{
    if (onChunk) onChunk('[AI Error] ' + e.message);
    if (onDone) onDone();
  }}
}}"""

BRIDGE_PATTERN = re.compile(r'<script>[^<]*TSM_BRIDGE[^<]*</script>\s*')

patched = 0
skipped = 0

for fname, cfg in WIRE_MAP.items():
    fpath = os.path.join(ROOT, fname)
    if not os.path.exists(fpath):
        print(f'⚠️  NOT FOUND: {fname}')
        skipped += 1
        continue

    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    api = cfg['api']
    app = cfg['app']

    # Remove TSM_BRIDGE
    content = BRIDGE_PATTERN.sub('', content)

    # Replace existing callAI with real version
    if 'async function callAI' in content:
        new_call_ai = NEW_CALL_AI_TEMPLATE.format(api=api, app=app)
        content = CALL_AI_PATTERN.sub(new_call_ai, content)

    # Inject AI widget before </body> if not already wired
    if 'tsmAsk' not in content and '</body>' in content:
        injection = make_injection(api, app)
        content = content.replace('</body>', injection + '\n</body>', 1)

    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'✅ {fname} → {api}')
        patched += 1
    else:
        print(f'— {fname} (no changes needed)')

print(f'\n=== DONE: {patched} patched, {skipped} skipped ===')
print('Run: bash predeploy_titles.sh && fly deploy')
