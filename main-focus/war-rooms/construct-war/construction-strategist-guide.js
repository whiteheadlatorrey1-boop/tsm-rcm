(function(){
  if(window.__CONSTRUCTION_STRATEGIST_GUIDE__) return;
  window.__CONSTRUCTION_STRATEGIST_GUIDE__=true;

  const css=document.createElement("style");
  css.textContent=`
    #cs-guide-btn{
      position:fixed;right:22px;bottom:92px;z-index:999999;
      background:#39ff14;color:#021;border:0;border-radius:14px;
      padding:14px 18px;font-weight:950;cursor:pointer;
      box-shadow:0 0 24px rgba(57,255,20,.35);
    }
    #cs-guide-modal{
      position:fixed;inset:0;background:rgba(0,0,0,.78);
      backdrop-filter:blur(7px);z-index:999999;display:flex;
      align-items:center;justify-content:center;padding:26px;
    }
    .cs-guide-shell{
      width:min(1220px,96vw);max-height:92vh;overflow:auto;
      background:#071007;color:#eaffdf;border:1px solid rgba(57,255,20,.35);
      border-radius:22px;padding:24px;font-family:Inter,system-ui,Arial;
      box-shadow:0 0 48px rgba(57,255,20,.18);
    }
    .cs-guide-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px}
    .cs-guide-title{font-size:28px;color:#39ff14;font-weight:950;letter-spacing:.04em}
    .cs-guide-sub{color:#9fbd96;margin-top:6px}
    .cs-guide-close{background:#152414;color:#fff;border:0;border-radius:12px;padding:11px 15px;cursor:pointer}
    .cs-guide-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
    .cs-guide-card{background:#0b180b;border:1px solid rgba(57,255,20,.16);border-radius:16px;padding:16px}
    .cs-guide-card.wide{grid-column:span 2}
    .cs-guide-card.full{grid-column:1/-1}
    .cs-guide-card h3{margin:0 0 10px;color:#ffc400;font-size:12px;letter-spacing:.14em}
    .cs-list div{padding:9px 0;border-bottom:1px solid rgba(255,255,255,.07);line-height:1.45}
    .cs-step{display:flex;gap:12px;align-items:flex-start;background:#081308;border-radius:12px;padding:11px;margin:9px 0}
    .cs-step b{background:#39ff14;color:#021;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex:0 0 28px}
    .cs-pill{display:inline-block;background:#081308;border:1px solid rgba(57,255,20,.18);border-radius:999px;padding:7px 10px;margin:4px;color:#eaffdf}
    .cs-risk{color:#ff5b5b}.cs-good{color:#39ff14}.cs-gold{color:#ffc400}
    @media(max-width:1000px){.cs-guide-grid{grid-template-columns:1fr}.cs-guide-card.wide{grid-column:auto}}
  `;
  document.head.appendChild(css);

  function openGuide(){
    const old=document.getElementById("cs-guide-modal");
    if(old) old.remove();

    const modal=document.createElement("div");
    modal.id="cs-guide-modal";
    modal.innerHTML=`
      <div class="cs-guide-shell">
        <div class="cs-guide-head">
          <div>
            <div class="cs-guide-title">Construction Strategist · Feature Walkthrough</div>
            <div class="cs-guide-sub">Project Executive · Superintendent · PM · Safety · Finance · Compliance</div>
            <div class="cs-guide-sub">Use this page to explain project risk, schedule drift, cost exposure, field leadership, and cross-app BNCA.</div>
          </div>
          <button class="cs-guide-close" id="cs-guide-close">Close</button>
        </div>

        <div class="cs-guide-grid">

          <div class="cs-guide-card wide">
            <h3>DEMO TALK TRACK</h3>
            <div class="cs-list">
              <div>This is the construction command brain. It watches schedule, budget, permits, safety, legal, tax, procurement, and field execution in one executive view.</div>
              <div>The system does not just show project status. It identifies what is slipping, who owns the risk, what financial exposure exists, and what action should happen next.</div>
              <div><b class="cs-good">Positioning:</b> Construction Strategist is the operational command layer between field activity and executive decision-making.</div>
            </div>
          </div>

          <div class="cs-guide-card">
            <h3>WHO USES THIS</h3>
            <span class="cs-pill">Project Executive</span>
            <span class="cs-pill">Project Manager</span>
            <span class="cs-pill">Superintendent</span>
            <span class="cs-pill">Safety Officer</span>
            <span class="cs-pill">Finance Lead</span>
            <span class="cs-pill">Compliance / Legal</span>
          </div>

          <div class="cs-guide-card">
            <h3>PHASE CARDS</h3>
            <div class="cs-list">
              <div><b class="cs-good">Foundation</b> — confirms site readiness, permits, and ground prep.</div>
              <div><b class="cs-good">Structure</b> — tracks steel, framing, crane, and structural sequencing.</div>
              <div><b class="cs-good">Envelope</b> — monitors roofing, cladding, weather risk, and subcontractor progress.</div>
              <div><b class="cs-good">Systems</b> — flags MEP rough-in, inspection delays, and coordination bottlenecks.</div>
            </div>
          </div>

          <div class="cs-guide-card">
            <h3>TOP INDICATORS</h3>
            <div class="cs-list">
              <div><b class="cs-risk">Risk Score</b> — executive-level project pressure.</div>
              <div><b class="cs-gold">Schedule Variance</b> — delay exposure.</div>
              <div><b class="cs-gold">Budget Overrun</b> — margin risk.</div>
              <div><b class="cs-risk">Supply Chain</b> — vendor / material dependency risk.</div>
              <div><b class="cs-risk">Legal Exposure</b> — contract, lien, or compliance pressure.</div>
            </div>
          </div>

          <div class="cs-guide-card">
            <h3>COMMAND BUTTONS</h3>
            <div class="cs-list">
              <div><b class="cs-good">Run Node</b> — analyzes the currently selected construction risk lane.</div>
              <div><b class="cs-good">Synthesize All</b> — creates full-suite BNCA across construction modules.</div>
              <div><b class="cs-good">Zero Trust</b> — checks access/security posture.</div>
              <div><b class="cs-good">Tax Prep</b> — reviews 1099 / filing readiness.</div>
              <div><b class="cs-good">Legal</b> — checks contract/lien exposure.</div>
              <div><b class="cs-good">Expansion</b> — routes strategy to growth/ops planning.</div>
            </div>
          </div>

          <div class="cs-guide-card">
            <h3>ACTIVE ALERTS</h3>
            <div class="cs-list">
              <div><span class="cs-risk">●</span> MEP inspection overdue — schedule delay risk.</div>
              <div><span class="cs-risk">●</span> Supply chain ETA slip — field sequencing risk.</div>
              <div><span class="cs-gold">●</span> Permit delay — compliance/schedule risk.</div>
              <div><span class="cs-gold">●</span> Budget variance — margin exposure.</div>
            </div>
          </div>

          <div class="cs-guide-card wide">
            <h3>WHAT TO CLICK DURING DEMO</h3>
            ${[
              "Start with the phase cards to show project progress and bottlenecks.",
              "Point to the risk score and explain the top drivers: schedule, budget, supply chain, legal exposure.",
              "Open the timeline to show how field events become executive intelligence.",
              "Click Run Node to generate a BNCA for the current risk lane.",
              "Click Synthesize All to show cross-app orchestration across ops, legal, tax, finance, and procurement.",
              "Use the Active Alerts panel to explain what needs intervention today.",
              "End by showing the BNCA output as an executive action plan."
            ].map((x,i)=>`<div class="cs-step"><b>${i+1}</b><span>${x}</span></div>`).join("")}
          </div>

          <div class="cs-guide-card">
            <h3>BNCA OUTPUT MEANS</h3>
            <div class="cs-list">
              <div><b class="cs-good">Top Issue</b> — what leadership must address first.</div>
              <div><b class="cs-good">Why It Matters</b> — cost, schedule, safety, or legal impact.</div>
              <div><b class="cs-good">Best Next Actions</b> — operational steps by owner lane.</div>
              <div><b class="cs-good">Confidence</b> — strength of recommendation.</div>
            </div>
          </div>

          <div class="cs-guide-card">
            <h3>CROSS-APP STATE FEED</h3>
            <div class="cs-list">
              <div>Operations pushes schedule and field pressure.</div>
              <div>Security reports Zero Trust posture.</div>
              <div>Tax flags 1099 / documentation exposure.</div>
              <div>Legal tracks liens, contracts, and claims.</div>
              <div>Planroom / Procurement / RFI modules feed execution risk.</div>
            </div>
          </div>

          <div class="cs-guide-card full">
            <h3>EXECUTIVE INTERPRETATION</h3>
            <div class="cs-list">
              <div>This page translates construction chaos into executive decision intelligence.</div>
              <div>It connects jobsite signals, phase progress, field leadership, active alerts, and financial exposure into one BNCA operating layer.</div>
              <div><b class="cs-gold">Close this page with:</b> “This does not just tell the project team what happened. It tells them what risk matters most, who owns it, and what to do next.”</div>
            </div>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("cs-guide-close").onclick=()=>modal.remove();
    modal.addEventListener("click",e=>{ if(e.target===modal) modal.remove(); });
  }

  function boot(){
    if(document.getElementById("cs-guide-btn")) return;
    const btn=document.createElement("button");
    btn.id="cs-guide-btn";
    btn.textContent="? HOW TO";
    btn.onclick=openGuide;
    document.body.appendChild(btn);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
