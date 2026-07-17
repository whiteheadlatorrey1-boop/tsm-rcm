(function(){
  if(window.__TSM_BPO_OPS_ENHANCE__) return;
  window.__TSM_BPO_OPS_ENHANCE__ = true;

  const path = location.pathname.toLowerCase();

  const SECTOR = path.includes("construction") ? "construction"
    : path.includes("healthcare") ? "healthcare"
    : path.includes("finops") ? "finops"
    : path.includes("legal") ? "legal"
    : path.includes("tax") ? "tax"
    : path.includes("rrd") ? "rrd"
    : "bpo";

  const DATA = {
    construction: {
      title:"ConstructionOps",
      accent:"#00ffc6",
      queue:["Permit revision pending","CO #7 awaiting PM approval","Lien waiver missing","Fastener delay notice unresolved","Inspection failed — electrical","Architect addendum uploaded"],
      owners:["Permit Queue → Project Engineer","Billing Risk → Finance Ops","Safety Escalation → Compliance","Subcontractor Holdback → PM Office"],
      impact:["$182K delayed billing exposure","$94K retainage risk","14-day permit delay risk","$61K unresolved change order exposure"],
      docs:["permit-foundation.pdf analyzed","change-order-7.pdf scope drift detected","Subcontractor_Final_Lien_Waiver.pdf incomplete","GL_Extract_Q1.csv variance checked","Fastener_Supply_Delay_Notice.msg delay risk flagged"],
      relay:["retainage anomaly","permit risk","lien waiver exposure","fastener supply delay"],
      deltas:["Permit approvals +11%","Billing backlog -8%","CO processing speed +17%","Safety exposure -11%"]
    },
    healthcare: {
      title:"HealthcareOps",
      accent:"#00ffc6",
      queue:["14 claims pending appeal","Prior auth aging exceeds SLA","CPT drift detected","AR aging above threshold","Payer denial cluster active"],
      owners:["Prior Auth → RCM Lead","Denials → Revenue Integrity","CPT Review → Coding Manager","Compliance → Office Manager"],
      impact:["$189K AR exposure","$62K auth risk","18.4% denial pressure","30-day appeal window risk"],
      docs:["payer denial letter reviewed","eligibility notes checked","claim queue export analyzed","CPT gap flagged","prior-auth packet incomplete"],
      relay:["denial spike","auth aging","CPT drift","AR recovery exposure"],
      deltas:["Claims processed +14%","Denials reduced -6%","Auth backlog -9%","Clean claim rate +4%"]
    },
    finops: {
      title:"FinOps",
      accent:"#00ffc6",
      queue:["AP invoices awaiting approval","Bank reconciliation gap open","Vendor variance detected","Close checklist incomplete","1099 readiness flagged"],
      owners:["AP Queue → Staff Accountant","Recon → Controller","Close Blocker → Finance Manager","Audit Evidence → Compliance"],
      impact:["$480K grant restriction exposure","$18.4K AR at risk","12 invoices pending","6 access gaps"],
      docs:["GL_Extract_Q1.csv mapped","invoice-q1.xlsx variance reviewed","HOME_Expenditure_Log.xlsx category check","vendor approvals missing"],
      relay:["AP aging","reconciliation gap","close blocker","policy gap"],
      deltas:["Manual review -12%","AP backlog -8%","Recon speed +16%","Audit evidence +9%"]
    },
    legal: {
      title:"LegalOps",
      accent:"#ffaa00",
      queue:["3 filing deadlines inside 7 days","Matter invoice approval pending","Discovery packet missing exhibit","Contract risk review open","Client status brief needed"],
      owners:["Matter Queue → Legal Ops","Billing WIP → Attorney Owner","Discovery → Paralegal","Compliance → Managing Partner"],
      impact:["$22.5K unbilled WIP","7-day filing risk","3 exhibit gaps","1 client escalation pending"],
      docs:["engagement packet reviewed","matter notes summarized","billing export checked","contract risk clause flagged"],
      relay:["unbilled attorney work","filing deadline","missing exhibit","client status risk"],
      deltas:["Matter backlog -7%","Billing packet +12%","Deadline coverage +9%","Client briefs +3"]
    },
    tax: {
      title:"TaxOps",
      accent:"#ffc857",
      queue:["Missing K-1 packet","W-9 vendor gap open","IRS notice deadline approaching","Extension tracker active","1099 threshold review pending"],
      owners:["Tax Intake → Admin","Missing Docs → Client Coordinator","IRS Notice → Reviewer","Entity Compliance → Tax Manager"],
      impact:["$39K filing exposure","22 open tax items","5 aging over SLA","3 notice deadlines"],
      docs:["organizer reviewed","1099 packet checked","K-1 missing item flagged","IRS notice summarized"],
      relay:["missing documents","notice deadline","reviewer bottleneck","filing readiness"],
      deltas:["Missing docs -10%","Returns ready +8%","Notice queue -2","Reviewer routing +13%"]
    },
    rrd: {
      title:"RRD",
      accent:"#35d05a",
      queue:["Charge-off review open","Payment dispute aging","Legal referral candidate","Recovery package incomplete","Owner assignment pending"],
      owners:["Recovery Queue → Collections Lead","Legal Referral → Legal Ops","Payment Dispute → Account Owner","Portfolio Rollup → Executive Sponsor"],
      impact:["$220K charge-off exposure","87% prevention target","6.4% legal referral rate","14.2 avg days to resolve"],
      docs:["payment history reviewed","legal status notes checked","portfolio WIP analyzed","recovery stage summarized"],
      relay:["charge-off risk","legal referral exposure","missing evidence","owner lane gap"],
      deltas:["Recovery actions +11%","Charge-off risk -6%","Owner assignment +15%","Docs processed +22"]
    }
  };

  const d = DATA[SECTOR] || DATA.bpo || DATA.construction;

  function css(){
    if(document.getElementById("tsm-bpo-ops-enhance-css")) return;
    const style=document.createElement("style");
    style.id="tsm-bpo-ops-enhance-css";
    style.textContent=`
      .tsm-bpo-ops-layer{margin:22px auto;max-width:1280px;padding:0 18px;color:#e8f7ff;font-family:Inter,system-ui,Arial}
      .tsm-bpo-ops-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:14px 0}
      .tsm-bpo-ops-card{background:rgba(7,16,23,.96);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:16px;min-height:168px}
      .tsm-bpo-ops-card h3{margin:0 0 12px;color:${d.accent};font-size:13px;letter-spacing:.14em;text-transform:uppercase}
      .tsm-bpo-ops-card li{margin:8px 0;color:#bfd2df;font-size:13px;line-height:1.35}
      .tsm-bpo-ops-card b{color:#fff}
      .tsm-bpo-pill{display:inline-block;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:7px 10px;margin:4px;color:#dff7ff;background:rgba(255,255,255,.03);font-size:12px}
      .tsm-bpo-actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}
      .tsm-bpo-actions button{border:0;border-radius:10px;padding:11px 14px;font-weight:900;cursor:pointer;background:${d.accent};color:#001}
      .tsm-bpo-actions button.secondary{background:#0b1722;color:#dff7ff;border:1px solid rgba(255,255,255,.16)}
      .tsm-bpo-ai-output{white-space:pre-wrap;background:#030913;border:1px solid rgba(255,255,255,.14);border-left:3px solid ${d.accent};border-radius:12px;padding:15px;color:#dff7ff;line-height:1.55;min-height:150px;margin-top:10px}
      .tsm-bpo-ops-head{background:rgba(7,16,23,.96);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:18px;margin-bottom:14px}
      .tsm-bpo-ops-head h2{margin:0 0 6px;color:${d.accent};font-size:28px}
      .tsm-bpo-ops-head p{margin:0;color:#9fb8c8;line-height:1.5}
      @media(max-width:900px){.tsm-bpo-ops-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function list(items){ return `<ul>${items.map(x=>`<li>${x}</li>`).join("")}</ul>`; }

  function build(){
    if(document.getElementById("tsm-bpo-ops-layer")) return;
    css();

    const wrap=document.createElement("section");
    wrap.className="tsm-bpo-ops-layer";
    wrap.id="tsm-bpo-ops-layer";

    wrap.innerHTML=`
      <div class="tsm-bpo-ops-head">
        <h2>${d.title} AI Operations Layer</h2>
        <p>Live workflow queue, owner lane, document intelligence, executive impact, strategist relay, and AI next-action support. Built to stay operational, executive-readable, workflow-driven, ownership-focused, and escalation-oriented.</p>
        <div class="tsm-bpo-actions">
          <button onclick="window.TSM_BPO_ENHANCE_RUN('executive')">Generate Executive Talk Track</button>
          <button onclick="window.TSM_BPO_ENHANCE_RUN('operations')" class="secondary">Operations Mode</button>
          <button onclick="window.TSM_BPO_ENHANCE_RUN('finance')" class="secondary">Finance Mode</button>
          <button onclick="window.TSM_BPO_ENHANCE_RUN('compliance')" class="secondary">Compliance Mode</button>
          <button onclick="window.TSM_BPO_ENHANCE_RUN('legal')" class="secondary">Legal Mode</button>
        </div>
        <div id="tsm-bpo-ai-output" class="tsm-bpo-ai-output">Select a mode above to generate AI-assisted narrative and next actions.</div>
      </div>

      <div class="tsm-bpo-ops-grid">
        <div class="tsm-bpo-ops-card"><h3>Active Workflow Queue</h3>${list(d.queue)}</div>
        <div class="tsm-bpo-ops-card"><h3>Owner Lane</h3>${list(d.owners)}</div>
        <div class="tsm-bpo-ops-card"><h3>Executive Impact</h3>${list(d.impact)}</div>
        <div class="tsm-bpo-ops-card"><h3>Document Intel Feed</h3>${list(d.docs)}</div>
        <div class="tsm-bpo-ops-card"><h3>Strategist Relay</h3>${list(d.relay.map(x=>"Escalated: "+x))}</div>
        <div class="tsm-bpo-ops-card"><h3>Today's Operating Changes</h3>${list(d.deltas)}</div>
      </div>

      <div class="tsm-bpo-ops-card">
        <h3>AI Next Actions</h3>
        <span class="tsm-bpo-pill">Assign accountable owner</span>
        <span class="tsm-bpo-pill">Validate missing evidence</span>
        <span class="tsm-bpo-pill">Clear blockers over SLA</span>
        <span class="tsm-bpo-pill">Generate executive summary</span>
        <span class="tsm-bpo-pill">Relay unresolved risk to Strategist</span>
      </div>
    `;

    const anchor = document.querySelector("main") || document.body;
    anchor.appendChild(wrap);
  }

  window.TSM_BPO_ENHANCE_RUN = async function(mode){
    const out=document.getElementById("tsm-bpo-ai-output");
    if(!out) return;

    const prompt = `${d.title} BPO ${mode} mode.
Active queue: ${d.queue.join("; ")}
Owner lanes: ${d.owners.join("; ")}
Executive impact: ${d.impact.join("; ")}
Documents: ${d.docs.join("; ")}
Relay items: ${d.relay.join("; ")}

Create concise output:
1. Top issue
2. Why it matters
3. Best next actions
4. Owner lane
5. Executive talk track`;

    out.textContent="TSM Neural Core running...";

    try{
      const r=await fetch("/api/bpo/query",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({payload:{sector:d.title,lane:mode,context:prompt,priority:"HIGH"}})
      });
      const x=await r.json();
      out.textContent=x.reply || x.content || fallback(mode);
    }catch(e){
      out.textContent=fallback(mode);
    }
  };

  function fallback(mode){
    return `TOP ISSUE
${d.title} has active workflow pressure requiring owner-lane action.

WHY IT MATTERS
Open WIP, document gaps, SLA aging, and financial exposure can create delayed revenue, compliance risk, or operational leakage.

BEST NEXT ACTIONS
1. Assign accountable owner.
2. Validate document evidence.
3. Clear blockers older than SLA.
4. Generate executive status brief.
5. Relay unresolved exposure to Strategist.

OWNER LANE
${d.owners[0] || "Operations Lead"}

EXECUTIVE TALK TRACK
The system is showing active operational exposure in ${d.title}. The value is that TSM identifies what is open, what is aging, who owns it, what is financially exposed, and what needs action today.`;
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
