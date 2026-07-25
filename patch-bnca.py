#!/usr/bin/env python3
"""
GHS BNCA Persistent Renderer + Groq Fix
Run from: /workspaces/tsm-shell
Usage:    python3 patch-bnca.py
"""

import os, sys, re, shutil
from datetime import datetime

TARGET = "healthcare/index.html"

if not os.path.exists(TARGET):
    sys.exit(f"❌ Not found: {TARGET}\n   Run from /workspaces/tsm-shell")

# Backup
bak = f"{TARGET}.bak.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
shutil.copy2(TARGET, bak)
print(f"✅ Backup: {bak}")

PATCH = r"""
<script id="ghs-bnca-renderer">
/* ── GHS BNCA PERSISTENT RENDERER + GROQ FIX ── injected by patch-bnca.py */
(function() {

  /* Persist Groq key across refreshes via localStorage */
  (function() {
    var stored = localStorage.getItem("GHS_GROQ_KEY");
    if (stored && !window.__GROQ_KEY__) window.__GROQ_KEY__ = stored;
    var orig = window.__defineSetter__ ? null : null;
    Object.defineProperty(window, "__GROQ_KEY__", {
      get: function() { return localStorage.getItem("GHS_GROQ_KEY") || ""; },
      set: function(v) { localStorage.setItem("GHS_GROQ_KEY", v); console.log("[GHS] Groq key saved to localStorage"); },
      configurable: true
    });
  })();

  var MODELS = ["openai/gpt-oss-120b", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];

  /* ── Groq caller with 429 retry + model cascade ── */
  async function callGroq(prompt) {
    var key = window.__GROQ_KEY__;
    if (!key) throw new Error("No Groq key. Run: window.__GROQ_KEY__ = 'gsk_...'");

    for (var m = 0; m < MODELS.length; m++) {
      var model = MODELS[m];
      for (var i = 0; i < 4; i++) {
        try {
          var res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
            body: JSON.stringify({ model: model, max_tokens: 450, temperature: 0.3,
              messages: [{ role: "user", content: prompt }] })
          });
          if (res.status === 429) {
            var wait = parseInt(res.headers.get("retry-after") || "") || (1500 * Math.pow(2, i));
            console.warn("[GHS] 429 " + model + " wait " + wait + "ms");
            await new Promise(function(r) { setTimeout(r, wait); });
            continue;
          }
          if (res.status === 400 || res.status === 404) break;
          if (!res.ok) throw new Error("Groq HTTP " + res.status);
          var d = await res.json();
          console.log("[GHS] ✅ " + model);
          return d.choices[0].message.content;
        } catch(e) {
          if (i === 3 && m === MODELS.length - 1) throw e;
          await new Promise(function(r) { setTimeout(r, 1500 * (i + 1)); });
        }
      }
    }
    throw new Error("All Groq models exhausted");
  }

  /* ── Parse BNCA text into structured object ── */
  function parse(raw) {
    var nodes   = (raw.match(/HC NODES REPORTING[:\s]+([\d\s\/]+)/i) || ["","11 / 11"])[1].trim();
    var actions = [];
    var ab = raw.match(/BEST NEXT COURSE OF ACTION([\s\S]*?)(?:TOP ISSUES|RISK LEVEL|OWNER|$)/i);
    if (ab) { for (var m of ab[1].matchAll(/\d+\.\s+(.+?)(?=\d+\.|$)/gs)) actions.push(m[1].trim().replace(/\n/g," ")); }
    var issues = (raw.match(/TOP ISSUES?[:\s]+([\s\S]+?)(?:RISK LEVEL|OWNER|$)/i)||[])[1];
    var risk   = ((raw.match(/RISK LEVEL[:\s]+([A-Z]+)/i)||[])[1]||"HIGH").toUpperCase();
    var owners = (raw.match(/OWNER LANES?[:\s]+([\s\S]+?)$/i)||[])[1];
    return { nodes: nodes, actions: actions,
             issues: issues ? issues.trim() : null,
             risk: risk,
             owners: owners ? owners.trim() : null };
  }

  var RC = {
    CRITICAL: ["#3D0A0A","#D84040","#FF6B6B"],
    HIGH:     ["#2D1A00","#D97706","#FBB040"],
    MEDIUM:   ["#0D2D1A","#059669","#34D399"],
    LOW:      ["#0A1A2D","#4A6FA5","#7EB8F7"]
  };

  /* ── Render parsed BNCA into DOM element ── */
  function render(raw, el) {
    if (!el || !raw || raw.indexOf("COURSE OF ACTION") < 0) return;
    var d = parse(raw);
    var c = RC[d.risk] || RC.HIGH;

    var acts = d.actions.length ? d.actions.map(function(a,i) {
      return '<div style="display:flex;gap:8px;margin-bottom:6px;background:#0D1E30;'
        + 'border-left:2px solid #00A896;padding:7px 9px;border-radius:0 4px 4px 0;">'
        + '<span style="color:#00A896;font-weight:700;min-width:18px;">' + (i+1) + '.</span>'
        + '<span style="color:#c8d8e8;line-height:1.5;">' + a + '</span></div>';
    }).join("") : '<div style="color:#4A6FA5;font-style:italic;padding:6px;">Processing...</div>';

    var iss = d.issues
      ? '<div style="margin-bottom:12px;">'
        + '<div style="color:#7EB8F7;font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px;">⚠ Top Issues</div>'
        + '<div style="background:#0A1929;border-left:2px solid #4A6FA5;padding:7px 9px;'
        + 'color:#8AAABF;font-size:11px;line-height:1.55;border-radius:0 4px 4px 0;">' + d.issues + '</div></div>'
      : "";

    var own = d.owners
      ? '<div style="margin-top:12px;">'
        + '<div style="color:#4A6FA5;font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px;">Owner Lanes</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:5px;">'
        + d.owners.split(/[·,\n]/).map(function(o){
            o = o.trim();
            return o ? '<span style="background:#0D1E30;border:1px solid #1e3a5a;color:#7EB8F7;'
              + 'font-size:10px;padding:3px 8px;border-radius:10px;white-space:nowrap;">' + o + '</span>' : "";
          }).join("") + "</div></div>"
      : "";

    el.style.fontFamily = "Consolas, 'Courier New', monospace";
    el.style.fontSize   = "12px";
    el.style.lineHeight = "1.5";

    el.innerHTML =
      /* nodes */
      '<div style="margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #1e3a5a;">'
      + '<div style="color:#4A6FA5;font-size:10px;letter-spacing:.1em;text-transform:uppercase;">HC Nodes Reporting</div>'
      + '<div style="color:#00A896;font-size:22px;font-weight:700;letter-spacing:.05em;margin-top:3px;">' + d.nodes + ' <span style="color:#4A6FA5;font-size:11px;font-weight:400;">nodes online</span></div>'
      + '</div>'
      /* actions */
      + '<div style="margin-bottom:12px;">'
      + '<div style="color:#00A896;font-size:10px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:7px;">⚡ Best Next Course of Action</div>'
      + acts + '</div>'
      /* issues */
      + iss
      /* risk + engine */
      + '<div style="display:flex;gap:8px;margin-top:10px;">'
      + '<div style="background:' + c[0] + ';border:1px solid ' + c[1] + ';border-radius:4px;padding:7px 12px;min-width:90px;">'
      + '<div style="color:' + c[2] + ';font-size:10px;letter-spacing:.1em;text-transform:uppercase;">Risk Level</div>'
      + '<div style="color:' + c[2] + ';font-size:17px;font-weight:700;margin-top:3px;">' + d.risk + '</div></div>'
      + '<div style="background:#0A1929;border:1px solid #1e3a5a;border-radius:4px;padding:7px 12px;flex:1;">'
      + '<div style="color:#4A6FA5;font-size:10px;letter-spacing:.1em;text-transform:uppercase;">Engine</div>'
      + '<div style="color:#2C4A6E;font-size:10px;margin-top:3px;">openai/gpt-oss-120b · BNCA Mesh · Groq</div></div></div>'
      /* owners */
      + own;
  }

  /* ── Build prompt from live page context ── */
  function buildPrompt(query) {
    var nodeText = Array.from(document.querySelectorAll("[class*=node],[class*=card],.live-node"))
      .map(function(e){ return e.innerText && e.innerText.trim(); })
      .filter(function(t){ return t && t.length > 30 && t.length < 600; })
      .slice(0, 8).join("\n---\n");
    var kpis = ((document.querySelector("[class*=ticker],[class*=kpi],header")||{}).innerText||"").slice(0,300);
    return "You are HC-Strategist for GHS Healthcare Command. Mode: Office Manager | Engine: BNCA | 11 nodes online.\n\n"
      + "KPI CONTEXT:\n" + kpis + "\n\nLIVE NODE FINDINGS:\n" + (nodeText||"See query")
      + "\n\nQUERY: \"" + query + "\"\n\n"
      + "Respond ONLY in this exact format — no preamble:\n"
      + "HC NODES REPORTING: 11 / 11\n\n"
      + "BEST NEXT COURSE OF ACTION\n1. [action]\n2. [action]\n3. [action]\n\n"
      + "TOP ISSUES: [2 sentences]\nRISK LEVEL: [LOW/MEDIUM/HIGH/CRITICAL]\nOWNER LANES: [comma list]";
  }

  /* ── Wire buttons ── */
  function wire() {
    var btns     = Array.from(document.querySelectorAll("button"));
    var deployBtn = btns.find(function(b){ return b.textContent.trim() === "DEPLOY"; });
    var synthBtn  = btns.find(function(b){ return b.textContent.trim() === "SYNTHESIZE"; });
    var queryEl   = document.querySelector("textarea, input[type=text]");
    var bncaEl    = Array.from(document.querySelectorAll("*")).find(function(el){
      return el.textContent.indexOf("BEST NEXT COURSE OF ACTION") > -1
          && el.children.length < 6
          && el !== document.body && el !== document.documentElement;
    });

    if (!deployBtn || !bncaEl) return false;

    /* kill existing poll spam */
    var hid = setTimeout(function(){},0);
    for (var i = 0; i <= hid; i++) clearInterval(i);

    async function run(btn, label) {
      var q = (queryEl && (queryEl.value || queryEl.textContent)) ||
              "Identify top documentation gaps, compliance drift, and remediation actions";
      btn.disabled = true;
      btn.textContent = "⟳ THINKING...";
      bncaEl.innerHTML = '<div style="color:#00A896;padding:10px;font-family:monospace;font-size:12px;">'
        + '⟳ HC-Nodes reporting to HC-Strategist via Groq...</div>';
      try {
        var result = await callGroq(buildPrompt(q));
        render(result, bncaEl);
      } catch(e) {
        console.error("[GHS]", e);
        bncaEl.innerHTML = '<div style="color:#D84040;padding:10px;font-family:monospace;font-size:11px;">'
          + '⚠ ' + e.message + '<br><br>'
          + 'Set key once: <b>window.__GROQ_KEY__ = "gsk_..."</b><br>'
          + '(persists across refreshes via localStorage)</div>';
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    }

    deployBtn.onclick = function(){ run(deployBtn, "DEPLOY"); };
    if (synthBtn) synthBtn.onclick = function(){ run(synthBtn, "SYNTHESIZE"); };

    /* throttled node polling — 1 per 20s */
    var nodes = Array.from(document.querySelectorAll("[class*=node-card],[class*=node]"))
      .filter(function(el){ return el.querySelector("[class*=live],[class*=status]"); });
    if (nodes.length) {
      var idx = 0;
      setInterval(function(){ nodes[idx++ % nodes.length].dispatchEvent(new Event("refresh",{bubbles:true})); }, 20000);
    }

    console.log("[GHS] ✅ Persistent renderer wired — deploy:", !!deployBtn, "synth:", !!synthBtn, "nodes:", nodes.length);
    return true;
  }

  /* Retry until DOM ready */
  if (!wire()) {
    var att = 0, iv = setInterval(function(){ if (wire() || ++att > 30) clearInterval(iv); }, 400);
  }

})();
</script>
"""

# Read file
content = open(TARGET, encoding="utf-8").read()

# Remove any old patch
content = re.sub(r'\n?<script id="ghs-bnca-renderer">.*?</script>', "", content, flags=re.DOTALL)

# Inject before </body>
if "</body>" not in content:
    sys.exit("❌ No </body> tag found in file")

content = content.replace("</body>", PATCH + "\n</body>", 1)

open(TARGET, "w", encoding="utf-8").write(content)

print(f"✅ Patch injected into {TARGET}")
print()
print("Next steps:")
print("  1. git add healthcare/index.html")
print("  2. git commit -m 'feat: persistent BNCA renderer + Groq fix'")
print("  3. git push")
print()
print("  Then set your key ONCE in browser console (persists via localStorage):")
print("  window.__GROQ_KEY__ = 'gsk_...'")
print()
print("  Every DEPLOY after that uses Groq natively, formatted output, no console needed.")
