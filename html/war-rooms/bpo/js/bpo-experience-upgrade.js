(function(){
  if(window.__TSM_BPO_EXPERIENCE_UPGRADE_V2__) return;
  window.__TSM_BPO_EXPERIENCE_UPGRADE_V2__ = true;

  function sector(){
    var p = location.pathname.toLowerCase();
    if(p.indexOf("construction")>-1) return "ConstructionOps";
    if(p.indexOf("healthcare")>-1) return "HealthcareOps";
    if(p.indexOf("finops")>-1) return "FinOps";
    if(p.indexOf("legal")>-1) return "LegalOps";
    if(p.indexOf("tax")>-1) return "TaxOps";
    if(p.indexOf("rrd")>-1) return "RRD";
    return "BPO";
  }

  var DATA = {
    ConstructionOps:{
      exposure:"$182K",
      queue:["Permit revision pending","CO #7 awaiting PM approval","Lien waiver missing","Fastener delay unresolved","Inspection failed — electrical"],
      owners:["Permit Queue → Project Engineer","Billing Risk → Finance Ops","Safety Escalation → Compliance","Subcontractor Holdback → PM Office"],
      docs:["permit-foundation.pdf → permit escalation","change-order-7.pdf → billing variance","Lien waiver → legal exposure","GL extract → recon issue"],
      timeline:["Document Received","Issue Detected","Owner Assigned","SLA Risk","Strategist Escalation","Executive Action"]
    },
    HealthcareOps:{
      exposure:"$189K",
      queue:["Claims pending appeal","Prior auth exceeds SLA","CPT drift detected","AR aging above threshold","Payer denial cluster active"],
      owners:["Prior Auth → RCM Lead","Denials → Revenue Integrity","CPT Review → Coding Manager","Compliance → Office Manager"],
      docs:["denial letter → appeal action","eligibility notes → payer rule check","claim export → AR risk","prior-auth packet → missing evidence"],
      timeline:["Care Delivered","Claim Coded","Payer Delay","Risk Detected","Owner Assigned","Revenue Protected"]
    },
    FinOps:{
      exposure:"$480K",
      queue:["AP invoices awaiting approval","Bank reconciliation gap open","Vendor variance detected","Close checklist incomplete","1099 readiness flagged"],
      owners:["AP Queue → Staff Accountant","Recon → Controller","Close Blocker → Finance Manager","Audit Evidence → Compliance"],
      docs:["GL extract → variance check","invoice workbook → AP aging","expenditure log → restriction review","approval packet → policy gap"],
      timeline:["Invoice Received","Variance Detected","Owner Assigned","SLA Watch","Controller Review","Close Ready"]
    },
    LegalOps:{
      exposure:"$22.5K",
      queue:["Filing deadlines inside 7 days","Matter invoice approval pending","Discovery packet missing exhibit","Contract risk review open","Client status brief needed"],
      owners:["Matter Queue → Legal Ops","Billing WIP → Attorney Owner","Discovery → Paralegal","Compliance → Managing Partner"],
      docs:["engagement packet → matter intake","billing export → unbilled WIP","contract sample → clause risk","discovery packet → exhibit gap"],
      timeline:["Matter Opened","Document Gap Found","Owner Assigned","Deadline Watch","Partner Review","Client Brief"]
    },
    TaxOps:{
      exposure:"$39K",
      queue:["Missing K-1 packet","W-9 vendor gap open","IRS notice deadline approaching","Extension tracker active","1099 threshold review pending"],
      owners:["Tax Intake → Admin","Missing Docs → Client Coordinator","IRS Notice → Reviewer","Entity Compliance → Tax Manager"],
      docs:["organizer → missing docs","1099 packet → threshold review","K-1 tracker → follow-up","IRS notice → deadline action"],
      timeline:["Packet Received","Missing Docs Found","Reviewer Assigned","Deadline Watch","Notice Escalation","Return Ready"]
    },
    RRD:{
      exposure:"$220K",
      queue:["Charge-off review open","Payment dispute aging","Legal referral candidate","Recovery package incomplete","Owner assignment pending"],
      owners:["Recovery Queue → Collections Lead","Legal Referral → Legal Ops","Payment Dispute → Account Owner","Portfolio Rollup → Executive Sponsor"],
      docs:["payment history → recovery scoring","legal status → referral path","portfolio WIP → owner lane","stage notes → next action"],
      timeline:["Account Flagged","Recovery Scored","Owner Assigned","Legal Risk","Strategist Relay","Executive Rollup"]
    }
  };

  function css(){
    if(document.getElementById("tsm-bpo-exp-v2-css")) return;
    var s=document.createElement("style");
    s.id="tsm-bpo-exp-v2-css";
    s.textContent =
      ".tsm-exp-wrap{max-width:1280px;margin:22px auto;padding:0 18px;color:#e8f7ff;font-family:Inter,system-ui,Arial}" +
      ".tsm-exp-head,.tsm-exp-card{background:rgba(7,16,23,.96);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:18px;margin-bottom:14px}" +
      ".tsm-exp-head h2{color:#00ffc6;margin:0 0 8px;font-size:28px}" +
      ".tsm-exp-head p{color:#9fb8c8;margin:0;line-height:1.5}" +
      ".tsm-exp-actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}" +
      ".tsm-exp-actions button,.tsm-exp-select{background:#00ffc6;color:#001;border:0;border-radius:10px;padding:11px 14px;font-weight:900;cursor:pointer}" +
      ".tsm-exp-actions button.alt{background:#0b1722;color:#dff7ff;border:1px solid rgba(255,255,255,.16)}" +
      ".tsm-exp-output{white-space:pre-wrap;background:#030913;border:1px solid rgba(255,255,255,.14);border-left:3px solid #00ffc6;border-radius:12px;padding:15px;color:#dff7ff;line-height:1.55;min-height:145px;margin-top:10px}" +
      ".tsm-exp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}" +
      ".tsm-exp-card h3{margin:0 0 10px;color:#00ffc6;font-size:13px;letter-spacing:.14em;text-transform:uppercase}" +
      ".tsm-exp-card li{margin:8px 0;color:#bfd2df;font-size:13px;line-height:1.35}" +
      ".tsm-exp-pill{display:inline-block;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:7px 10px;margin:4px;color:#dff7ff;background:rgba(255,255,255,.03);font-size:12px}" +
      ".tsm-exp-feed li{animation:tsmPulse 4s infinite}" +
      ".tsm-exp-timeline{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}" +
      ".tsm-exp-step{padding:8px 10px;border-radius:999px;border:1px solid rgba(0,255,198,.22);background:#07131d;color:#dff7ff;font-size:12px}" +
      ".tsm-exp-step.active{background:#00ffc6;color:#001;font-weight:900}" +
      ".tsm-exp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}" +
      ".tsm-exp-kpi{background:#06121a;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px}" +
      ".tsm-exp-kpi b{display:block;color:#00ffc6;font-size:22px}" +
      ".tsm-exp-kpi span{color:#9fb8c8;font-size:11px;text-transform:uppercase;letter-spacing:.12em}" +
      "@keyframes tsmPulse{0%{opacity:.72}50%{opacity:1}100%{opacity:.72}}" +
      "@media(max-width:900px){.tsm-exp-grid,.tsm-exp-kpis{grid-template-columns:1fr}}";
    document.head.appendChild(s);
  }

  function ul(arr, cls){
    return "<ul" + (cls ? " class='" + cls + "'" : "") + ">" + arr.map(function(x){return "<li>" + x + "</li>";}).join("") + "</ul>";
  }

  function personaNarrative(persona, name, d){
    var lens = {
      CFO:"cash impact, leakage prevention, recovery opportunity, and close-readiness",
      Controller:"variance, reconciliation, approvals, audit evidence, and owner accountability",
      Operations:"queue aging, throughput, bottlenecks, staffing pressure, and daily execution",
      Compliance:"policy risk, evidence validation, deadlines, audit trail, and escalation discipline",
      Legal:"liability, contract exposure, matter ownership, deadlines, and defensible evidence",
      Executive:"operational risk, strategic exposure, ROI, leadership visibility, and best next action"
    };
    return lens[persona] || lens.Executive;
  }

  function renderOutput(mode, persona){
    var name=sector(), d=DATA[name] || DATA.FinOps;
    var out=document.getElementById("tsm-exp-output");
    if(!out) return;

    var top = d.queue[0];
    var owner = d.owners[0];
    var lens = personaNarrative(persona, name, d);

    out.textContent =
      persona.toUpperCase() + " · " + mode.toUpperCase() + " MODE ACTIVE\n\n" +
      "TOP ISSUE\n" + top + "\n\n" +
      "WHY IT MATTERS\n" +
      "From the " + persona + " view, this matters because it affects " + lens + ". Current exposure: " + d.exposure + ".\n\n" +
      "QUEUE STATE MUTATION\n" +
      "→ priority raised\n" +
      "→ owner lane updated\n" +
      "→ strategist relay prepared\n" +
      "→ executive summary refreshed\n\n" +
      "OWNER LANE\n" + owner + "\n\n" +
      "BEST NEXT ACTIONS\n" +
      "1. Validate supporting document evidence.\n" +
      "2. Assign accountable owner.\n" +
      "3. Clear SLA blocker.\n" +
      "4. Generate client-ready status brief.\n" +
      "5. Escalate unresolved exposure to Strategist.\n\n" +
      "EXECUTIVE TALK TRACK\n" +
      "The system is showing active operational exposure in " + name + ". TSM identifies what is open, what is aging, who owns it, what is financially exposed, and what needs action today.";
  }

  function escalate(){
    var name=sector(), d=DATA[name] || DATA.FinOps;
    var out=document.getElementById("tsm-exp-output");
    if(!out) return;

    out.textContent =
      "STRATEGIST ESCALATION INITIATED\n\n" +
      "Escalated Item\n" + d.queue[0] + "\n\n" +
      "Exposure\n" + d.exposure + "\n\n" +
      "Relay Status\n" +
      "→ Strategist notified\n" +
      "→ Executive summary generated\n" +
      "→ Owner lane locked\n" +
      "→ SLA watch enabled\n\n" +
      "Recommended Executive Action\n" +
      "Review owner response within current operating window and approve next-course action.";
    animateTimeline();
  }

  function animateTimeline(){
    var steps=document.querySelectorAll(".tsm-exp-step");
    steps.forEach(function(x){x.classList.remove("active");});
    steps.forEach(function(step,i){
      setTimeout(function(){ step.classList.add("active"); }, i*450);
    });
  }

  function build(){
    if(document.getElementById("tsm-bpo-experience-layer")) return;
    css();

    var name=sector(), d=DATA[name] || DATA.FinOps;

    var wrap=document.createElement("section");
    wrap.id="tsm-bpo-experience-layer";
    wrap.className="tsm-exp-wrap";

    wrap.innerHTML =
      "<div class='tsm-exp-head'>" +
        "<h2>" + name + " Interactive AI Operating Layer</h2>" +
        "<p>State-changing workflow simulation: queue mutation, owner lane reassignment, strategist escalation, document-to-action intelligence, and role-based executive narratives.</p>" +

        "<div class='tsm-exp-kpis'>" +
          "<div class='tsm-exp-kpi'><b id='riskScore'>82</b><span>Risk Score</span></div>" +
          "<div class='tsm-exp-kpi'><b id='exposureVal'>" + d.exposure + "</b><span>Exposure</span></div>" +
          "<div class='tsm-exp-kpi'><b id='slaVal'>HIGH</b><span>SLA Pressure</span></div>" +
          "<div class='tsm-exp-kpi'><b id='ownerVal'>ACTIVE</b><span>Owner Lane</span></div>" +
        "</div>" +

        "<div class='tsm-exp-actions'>" +
          "<select id='tsmPersona' class='tsm-exp-select'>" +
            "<option>CFO</option><option>Controller</option><option>Operations</option><option>Compliance</option><option>Legal</option><option selected>Executive</option>" +
          "</select>" +
          "<button data-mode='executive'>Generate Executive Talk Track</button>" +
          "<button class='alt' data-mode='operations'>Operations Mode</button>" +
          "<button class='alt' data-mode='finance'>Finance Mode</button>" +
          "<button class='alt' data-mode='compliance'>Compliance Mode</button>" +
          "<button class='alt' data-mode='legal'>Legal Mode</button>" +
          "<button class='alt' id='tsmEscalate'>Escalate to Strategist</button>" +
        "</div>" +

        "<div id='tsm-exp-output' class='tsm-exp-output'>Live AI operating layer ready. Select a persona and mode to mutate workflow state.</div>" +

        "<div class='tsm-exp-timeline'>" +
          d.timeline.map(function(x,i){return "<span class='tsm-exp-step " + (i===0?"active":"") + "'>" + x + "</span>";}).join("") +
        "</div>" +
      "</div>" +

      "<div class='tsm-exp-grid'>" +
        "<div class='tsm-exp-card'><h3>Live Operations Feed</h3>" + ul(d.queue,"tsm-exp-feed") + "</div>" +
        "<div class='tsm-exp-card'><h3>Owner Lane</h3>" + ul(d.owners) + "</div>" +
        "<div class='tsm-exp-card'><h3>Executive Impact</h3>" + ul([d.exposure + " active exposure","SLA pressure high","Owner lane active","Strategist-ready"]) + "</div>" +
        "<div class='tsm-exp-card'><h3>Document → Action Feed</h3>" + ul(d.docs) + "</div>" +
        "<div class='tsm-exp-card'><h3>Strategist Relay</h3>" + ul(d.queue.slice(0,4).map(function(x){return "Escalated: " + x;})) + "</div>" +
        "<div class='tsm-exp-card'><h3>AI Next Actions</h3>" +
          "<span class='tsm-exp-pill'>Assign owner</span>" +
          "<span class='tsm-exp-pill'>Validate evidence</span>" +
          "<span class='tsm-exp-pill'>Clear SLA blocker</span>" +
          "<span class='tsm-exp-pill'>Generate summary</span>" +
          "<span class='tsm-exp-pill'>Relay to Strategist</span>" +
        "</div>" +
      "</div>";

    (document.querySelector("main") || document.body).appendChild(wrap);

    wrap.querySelectorAll("[data-mode]").forEach(function(btn){
      btn.onclick=function(){
        var persona=document.getElementById("tsmPersona").value;
        var mode=btn.getAttribute("data-mode");
        document.getElementById("riskScore").textContent = String(84 + Math.floor(Math.random()*10));
        document.getElementById("slaVal").textContent = mode==="compliance" ? "CRITICAL" : "HIGH";
        document.getElementById("ownerVal").textContent = "UPDATED";
        renderOutput(mode, persona);
        animateTimeline();
      };
    });

    document.getElementById("tsmEscalate").onclick = escalate;

    setTimeout(function(){ renderOutput("executive","Executive"); }, 500);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",build);
  else build();
})();
