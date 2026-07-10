(function(){
  if(window.__TSM_OPERATIONAL_MESH__) return;
  window.__TSM_OPERATIONAL_MESH__ = true;

  const path = location.pathname.toLowerCase();

  function detectSector(){
    if(path.includes("integration-hub") || path.includes("integrationhub")) return "IntegrationHub";
    if(path.includes("governance")) return "Governance";
    if(path.includes("/mdm/") || path.includes("mdm-war-room") || path.includes("mdm-suite")) return "MDM";
    if(path.includes("healthcare") || path.includes("hc-")) return "Healthcare";
    if(path.includes("insurance") || path.includes("az-ins")) return "Insurance";
    if(path.includes("construction")) return "Construction";
    if(path.includes("finops") || path.includes("financial")) return "FinOps";
    if(path.includes("tax")) return "TaxOps";
    if(path.includes("legal")) return "LegalOps";
    if(path.includes("rrd")) return "RRD";
    if(path.includes("music")) return "Music Command";
    return "TSM Operations";
  }

  const sector = detectSector();

  const CONFIG = {
    Healthcare: {
      exposure:"$189K",
      queue:"Prior auth / denial pressure",
      owner:"Revenue Integrity",
      relay:"HC Strategist",
      doc:"Claim packet → denial appeal",
      action:"Escalate aging denial and validate payer evidence"
    },
    Insurance: {
      exposure:"$157K",
      queue:"DME / claim reserve watch",
      owner:"Insurance Ops",
      relay:"Insurance Strategist",
      doc:"Policy packet → qualification route",
      action:"Qualify opportunity and route high-value follow-up"
    },
    Construction: {
      exposure:"$182K",
      queue:"Permit / retainage / change-order pressure",
      owner:"Project Engineer",
      relay:"Construction Strategist",
      doc:"Permit + CO package → owner action",
      action:"Escalate permit blocker and validate billing exposure"
    },
    FinOps: {
      exposure:"$480K",
      queue:"AP / reconciliation / close pressure",
      owner:"Controller Ops",
      relay:"FinOps Strategist",
      doc:"GL extract → variance action",
      action:"Assign controller review and clear reconciliation blocker"
    },
    TaxOps: {
      exposure:"$39K",
      queue:"Missing docs / notice deadline",
      owner:"Tax Reviewer",
      relay:"Tax Strategist",
      doc:"Organizer → missing-doc workflow",
      action:"Route missing packet and protect filing deadline"
    },
    LegalOps: {
      exposure:"$22.5K",
      queue:"Matter deadline / unbilled WIP",
      owner:"Legal Ops",
      relay:"Legal Strategist",
      doc:"Matter packet → filing action",
      action:"Assign legal owner and prepare client status brief"
    },
    RRD: {
      exposure:"$220K",
      queue:"Charge-off / recovery exposure",
      owner:"Recovery Lead",
      relay:"RRD Strategist",
      doc:"Payment history → recovery score",
      action:"Route high-risk account to recovery owner"
    },
    "Music Command": {
      exposure:"Session Value",
      queue:"Hook / verse / polish queue",
      owner:"Producer Mode",
      relay:"ZAY Producer Engine",
      doc:"Draft lyric → revision action",
      action:"Generate hook, refine cadence, and prep session path"
    },
    "TSM Operations": {
      exposure:"Active",
      queue:"Operational queue",
      owner:"Ops Lead",
      relay:"TSM Strategist",
      doc:"Document → action",
      action:"Assign owner and generate BNCA"
    },
    MDM: {
      exposure:"Loading…",
      queue:"Master data quality queue",
      owner:"Data Steward",
      relay:"MDM Strategist",
      doc:"Recommendation queue → merge/reject decision",
      action:"Review quality score and clear open recommendations",
      liveEndpoint:"/api/mdm/quality-score"
    },
    Governance: {
      exposure:"Loading…",
      queue:"Open risk register",
      owner:"Compliance Lead",
      relay:"Governance Strategist",
      doc:"Risk register → approve/reject decision",
      action:"Review open risks and clear via HITL approval",
      liveEndpoint:"/api/governance/risk"
    },
    IntegrationHub: {
      exposure:"Loading…",
      queue:"Degraded integration queue",
      owner:"NOC Engineer",
      relay:"Integration Hub Strategist",
      doc:"Integration catalog → remediate/escalate decision",
      action:"Review degraded systems and remediate via HITL approval",
      liveEndpoint:"/api/integration/health"
    }
  };

  const cfg = CONFIG[sector] || CONFIG["TSM Operations"];

  function css(){
    if(document.getElementById("tsm-mesh-css")) return;
    const style = document.createElement("style");
    style.id = "tsm-mesh-css";
    style.textContent = `
      .tsm-mesh{
        max-width:1280px;margin:22px auto;padding:18px;
        background:rgba(5,13,20,.96);border:1px solid rgba(0,255,198,.18);
        border-radius:18px;color:#e8f7ff;font-family:Inter,system-ui,Arial;position:relative;z-index:20
      }
      .tsm-mesh h2{margin:0;color:#00ffc6;font-size:28px}
      .tsm-mesh p{color:#9fb8c8;line-height:1.55}
      .tsm-mesh-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:14px 0}
      .tsm-mesh-card{background:#06131c;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px}
      .tsm-mesh-card small{display:block;color:#7f9aaa;letter-spacing:.14em;text-transform:uppercase;font-size:10px}
      .tsm-mesh-card b{display:block;color:#00ffc6;margin-top:8px;font-size:18px}
      .tsm-mesh-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
      .tsm-mesh-actions button{
        background:#00ffc6;color:#001;border:0;border-radius:999px;padding:11px 15px;font-weight:900;cursor:pointer
      }
      .tsm-mesh-actions button.alt{background:#0b1722;color:#dff7ff;border:1px solid rgba(255,255,255,.16)}
      .tsm-mesh-output{margin-top:14px;white-space:pre-wrap;background:#020913;border-left:3px solid #00ffc6;border-radius:12px;padding:15px;color:#dff7ff;line-height:1.55}
      .tsm-mesh-timeline{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
      .tsm-mesh-step{border:1px solid rgba(0,255,198,.22);border-radius:999px;padding:8px 11px;color:#a8c6d6;font-size:12px}
      .tsm-mesh-step.active{background:#00ffc6;color:#001;font-weight:900}
      @media(max-width:900px){.tsm-mesh-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function activate(n){
    document.querySelectorAll(".tsm-mesh-step").forEach((x,i)=>x.classList.toggle("active", i <= n));
  }

  function write(mode){
    const out = document.getElementById("tsm-mesh-output");
    if(!out) return;
    out.textContent =
`${mode.toUpperCase()} · ${sector}

TOP ISSUE
${cfg.queue}

EXPOSURE
${cfg.exposure}

OWNER LANE
${cfg.owner}

DOCUMENT → ACTION
${cfg.doc}

BEST NEXT ACTION
${cfg.action}

STRATEGIST RELAY
${cfg.relay} notified.

EXECUTIVE TALK TRACK
TSM Operational Mesh is connecting the sector workflow into one command layer: queue pressure, document evidence, owner lane, SLA posture, escalation, and executive action.`;
  }

  // Pulls real numbers from the live endpoints wired up for MDM/Governance/
  // Integration Hub (see server.js: /api/mdm/quality-score, #136;
  // /api/governance/risk + HITL gate, #137; /api/integration/health +
  // HITL gate, #138) instead of the hardcoded per-sector CONFIG placeholders
  // used by the industry-vertical tracker pages. Read-only by design -- this
  // widget is loaded on ~80 pages, so it displays state rather than
  // triggering approve/reject itself; those mutating actions live in each
  // war room's own UI, which has the actor context this shared widget lacks.
  function fetchLive(){
    if(!cfg.liveEndpoint) return;
    fetch(cfg.liveEndpoint).then(function(r){ return r.json(); }).then(function(data){
      if(!data || data.ok === false) return;

      if(sector === "MDM" && data.overall && Array.isArray(data.domains)){
        var atRisk = data.domains.filter(function(d){ return d.band === "AT RISK" || d.band === "CRITICAL"; }).length;
        cfg.exposure = data.overall.band + " (" + data.overall.overall + "/100)";
        cfg.queue = atRisk + " of " + data.domains.length + " domain(s) at risk";
      }

      if(sector === "Governance" && Array.isArray(data.risks)){
        var open = data.risks.filter(function(r){ return r.status === "OPEN"; });
        var worst = open.slice().sort(function(a,b){ return (b.severity||0) - (a.severity||0); })[0];
        cfg.exposure = open.length + " open risk(s)";
        cfg.queue = worst ? ("Highest severity: " + worst.title + " (" + worst.severity + ")") : "No open risks";
      }

      if(sector === "IntegrationHub" && typeof data.degraded === "number"){
        cfg.exposure = data.degraded + " of " + data.total + " degraded";
        cfg.queue = data.degraded > 0 ? "Integration(s) awaiting remediation decision" : "All integrations healthy";
      }

      var exposureEl = document.getElementById("meshExposure");
      if(exposureEl) exposureEl.textContent = cfg.exposure;
      write("Live Baseline");
    }).catch(function(){ /* leave the static placeholder in place if the fetch fails */ });
  }

  function build(){
    if(document.getElementById("tsm-operational-mesh")) return;
    css();

    const box = document.createElement("section");
    box.id = "tsm-operational-mesh";
    box.className = "tsm-mesh";
    box.innerHTML = `
      <h2>TSM Operational Mesh</h2>
      <p>One shared operating engine across BPO, HC nodes, Insurance, Construction, FinOps, Tax, Legal, and sector command systems.</p>

      <div class="tsm-mesh-grid">
        <div class="tsm-mesh-card"><small>Sector</small><b>${sector}</b></div>
        <div class="tsm-mesh-card"><small>Exposure</small><b id="meshExposure">${cfg.exposure}</b></div>
        <div class="tsm-mesh-card"><small>Owner Lane</small><b id="meshOwner">${cfg.owner}</b></div>
        <div class="tsm-mesh-card"><small>Relay</small><b id="meshRelay">${cfg.relay}</b></div>
      </div>

      <div class="tsm-mesh-actions">
        <button data-mesh="assign">Assign Owner</button>
        <button data-mesh="escalate" class="alt">Escalate</button>
        <button data-mesh="summary" class="alt">Generate Summary</button>
        <button data-mesh="clear" class="alt">Clear Blocker</button>
      </div>

      <div class="tsm-mesh-timeline">
        <span class="tsm-mesh-step active">Document</span>
        <span class="tsm-mesh-step">Issue</span>
        <span class="tsm-mesh-step">Owner</span>
        <span class="tsm-mesh-step">Escalation</span>
        <span class="tsm-mesh-step">Executive Action</span>
      </div>

      <div id="tsm-mesh-output" class="tsm-mesh-output">Operational Mesh ready. Select an action.</div>
    `;

    const anchor = document.querySelector("main") || document.body;
    anchor.appendChild(box);

    box.querySelectorAll("[data-mesh]").forEach(btn=>{
      btn.onclick=()=>{
        const a = btn.dataset.mesh;
        if(a === "assign"){
          document.getElementById("meshOwner").textContent = cfg.owner + " · ACTIVE";
          activate(2); write("Owner Assigned");
        }
        if(a === "escalate"){
          document.getElementById("meshRelay").textContent = cfg.relay + " · ESCALATED";
          activate(3); write("Strategist Escalation");
        }
        if(a === "summary"){
          activate(4); write("Executive Summary");
        }
        if(a === "clear"){
          document.getElementById("meshExposure").textContent = "Reduced";
          activate(4); write("Blocker Cleared");
        }
      };
    });

    setTimeout(()=>write("Live Baseline"),300);
    if(cfg.liveEndpoint) fetchLive();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
