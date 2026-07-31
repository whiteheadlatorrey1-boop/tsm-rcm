(function(){
  if(window.__HC_ENTERPRISE_FINAL_LAYER__) return;
  window.__HC_ENTERPRISE_FINAL_LAYER__=true;

  const node=(location.pathname.toLowerCase().match(/hc-([a-z]+)/)||[])[1] || "healthcare";

  const seed=[
    {time:"08:42 AM", event:"Medical flagged documentation gap", risk:"MED"},
    {time:"08:51 AM", event:"Billing denial probability increased", risk:"HIGH"},
    {time:"09:02 AM", event:"Strategist escalation triggered", risk:"HIGH"},
    {time:"09:11 AM", event:"Compliance review initiated", risk:"MED"}
  ];

  function css(){
    if(document.getElementById("hc-final-css")) return;
    const s=document.createElement("style");
    s.id="hc-final-css";
    s.textContent=`
      #hc-enterprise-final{
        margin:14px 18px;padding:16px;background:#07131d;border:1px solid rgba(0,255,198,.28);
        border-radius:14px;color:#dff7ff;font-family:Inter,system-ui,Arial;
      }
      .hc-final-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}
      .hc-final-card{background:#0b1b28;border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:13px}
      .hc-final-card small{color:#8aa6b7;letter-spacing:.12em}.hc-final-card b{display:block;color:#00ffc6;font-size:20px;margin-top:5px}
      .hc-final-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .hc-final-panel{background:#050b12;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px}
      .hc-final-panel h4{color:#ffc400;letter-spacing:.12em;margin:0 0 10px}
      .hc-final-btn{background:#00ffc6;color:#001;border:0;border-radius:10px;padding:10px 12px;font-weight:950;margin:4px;cursor:pointer}
      .hc-final-btn.purple{background:#b56cff;color:#fff}.hc-final-btn.gold{background:#ffc400;color:#001}
      #hc-presenter{
        position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:100000;
        width:min(920px,94vw);max-height:86vh;overflow:auto;background:#050b12;color:#dff7ff;
        border:1px solid #00ffc6;border-radius:18px;padding:24px;box-shadow:0 0 44px rgba(0,255,198,.24);
        display:none;white-space:pre-wrap;
      }
      #hc-presenter.active{display:block}
      @media(max-width:900px){.hc-final-grid,.hc-final-cols{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function timeline(){
    return seed.map(x=>`${x.time}
${x.event}
Risk: ${x.risk}`).join("\n\n");
  }

  function presenterText(){
    return `HEALTHCARE COMMAND SUITE · PRESENTATION MODE

POSITIONING
This is an AI-native healthcare operations command system. It connects frontline workflows, node-specific AI assistance, BNCA routing, strategist relay, and executive visibility.

DEMO FLOW
1. Start at HC Command Chain.
2. Show the 11-node operating model.
3. Open one frontline node: Billing, Medical, Compliance, or Financial.
4. Show Frontline Features.
5. Click an AI action.
6. Show TOP ISSUE / WHY IT MATTERS / BEST NEXT ACTIONS.
7. Click HC Strategist Rollup.
8. Explain that unresolved risk becomes executive operational memory.

ENTERPRISE VALUE
Problem detected
↓
AI interprets operational risk
↓
Owner assigned
↓
Cross-node coordination begins
↓
BNCA generated
↓
Escalation tracked
↓
Executive visibility maintained
↓
Outcome recorded

TRUST LAYER
✓ Audit logging enabled
✓ PHI-safe workflow framing
✓ Role-restricted access indicators
✓ Strategist relay trail
✓ Owner lane assignment
✓ SLA watch
✓ Executive rollup

CLOSE
“We are not giving your staff another dashboard. We are giving the office a next-action operating layer.”`;
  }

  function exportReport(){
    const text=`HC EXECUTIVE BRIEFING

NODE
${node.toUpperCase()}

OWNER
${node.toUpperCase()} Lead

STATUS
Open

SLA
18h remaining

TOP ISSUE
Operational risk requires owner-lane action.

WHY IT MATTERS
Delayed handoffs, revenue leakage, compliance exposure, or patient-flow friction can compound across nodes.

NEXT AUTOMATIONS
✓ Create task
✓ Notify owner
✓ Queue strategist review
✓ Escalate after SLA breach
✓ Generate executive summary

TIMELINE
${timeline()}`;
    const blob=new Blob([text],{type:"text/plain"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`hc-${node}-executive-brief.txt`;
    a.click();
  }

  function build(){
    css();
    if(document.getElementById("hc-enterprise-final")) return;

    const section=document.createElement("section");
    section.id="hc-enterprise-final";
    section.innerHTML=`
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
        <div>
          <div style="color:#00ffc6;font-weight:950;letter-spacing:.16em">ENTERPRISE OPERATING LAYER</div>
          <div style="color:#8aa6b7;margin-top:5px">Ownership · SLA · incident thread · explainability · presentation mode</div>
        </div>
        <div>
          <button class="hc-final-btn" id="hc-present-btn">Presentation Mode</button>
          <button class="hc-final-btn gold" id="hc-export-btn">Export Brief</button>
          <button class="hc-final-btn purple" onclick="window.hcStrategistRollup && window.hcStrategistRollup()">Strategist Rollup</button>
        </div>
      </div>

      <div class="hc-final-grid">
        <div class="hc-final-card"><small>OWNER</small><b>${node.toUpperCase()} Lead</b></div>
        <div class="hc-final-card"><small>STATUS</small><b>Open</b></div>
        <div class="hc-final-card"><small>SLA</small><b>18h remaining</b></div>
        <div class="hc-final-card"><small>SECURITY</small><b>Audit Trail On</b></div>
      </div>

      <div class="hc-final-cols">
        <div class="hc-final-panel">
          <h4>CROSS-NODE INCIDENT THREAD</h4>
          <div>PRIOR AUTH / CLAIM RISK</div>
          <div style="color:#9fb8c8;margin-top:8px;line-height:1.6">
            ↳ Billing impact<br>
            ↳ Medical documentation issue<br>
            ↳ Compliance exposure<br>
            ↳ Patient scheduling delay
          </div>
        </div>

        <div class="hc-final-panel">
          <h4>AI EXPLAINABILITY</h4>
          <div style="color:#9fb8c8;line-height:1.6">
            WHY THIS WAS GENERATED<br>
            Data signals show queue pressure, SLA risk, and unresolved owner lane.<br><br>
            DATA SIGNALS USED<br>
            Node KPIs · active tab · frontline action · strategist memory.<br><br>
            CONFIDENCE<br>
            92%
          </div>
        </div>

        <div class="hc-final-panel">
          <h4>NEXT AUTOMATIONS</h4>
          <div style="color:#9fb8c8;line-height:1.8">
            ✓ Create task<br>
            ✓ Notify owner<br>
            ✓ Queue strategist review<br>
            ✓ Escalate after SLA breach<br>
            ✓ Generate executive summary
          </div>
        </div>

        <div class="hc-final-panel">
          <h4>OPERATIONAL TIMELINE</h4>
          <pre style="white-space:pre-wrap;color:#9fb8c8">${timeline()}</pre>
        </div>
      </div>
    `;

    const anchor=document.querySelector("main,.content,.dashboard,.node-main") || document.body;
    anchor.prepend(section);

    const modal=document.createElement("pre");
    modal.id="hc-presenter";
    modal.textContent=presenterText();
    modal.onclick=()=>modal.classList.remove("active");
    document.body.appendChild(modal);

    document.getElementById("hc-present-btn").onclick=()=>modal.classList.add("active");
    document.getElementById("hc-export-btn").onclick=exportReport;
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",build);
  else build();

  console.log("HC Enterprise Final Layer installed");
})();
