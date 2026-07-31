(function(){
  if(window.__HC_CONTEXTUAL_HOWTO_V2__) return;
  window.__HC_CONTEXTUAL_HOWTO_V2__=true;

  const CONFIG={
    operations:{
      title:"HC Operations Node",
      persona:"Office Manager · Operations Lead · Scheduling Team",
      state:["Intake queue shows frontline pressure","Staff coverage below target signals throughput risk","Scheduling backlog indicates delayed patient flow","Vendor alerts may affect room/equipment readiness"],
      meaning:"Operations is the first pressure point. When intake, staffing, and scheduling drift, the effects cascade into billing delays, patient dissatisfaction, compliance gaps, and provider overload.",
      owners:["Primary: Operations Lead","Secondary: Office Manager","Escalation: HC Strategist / COO lane"],
      actions:["Rebalance intake queue","Review staff coverage gaps","Clear scheduling backlog","Route vendor blockers","Run throughput BNCA"],
      automations:["Strategist memory updated","SLA timer initiated","Executive rollup prepared","Incident thread attached","Owner lane assigned"],
      impact:["Patient wait time","Staff burnout","Provider throughput","Revenue cycle timing","Service recovery risk"]
    },
    medical:{
      title:"HC Medical Command",
      persona:"Clinical Ops Lead · Provider Manager · Care Coordination",
      state:["Clinical task queue shows care-flow backlog","Open care plans indicate follow-up exposure","Provider load measures staff capacity pressure","No-show risk forecasts schedule leakage"],
      meaning:"Medical operations connects clinical throughput to revenue integrity. Documentation gaps, provider overload, and delayed care plans create downstream coding, billing, compliance, and patient-experience risk.",
      owners:["Primary: Clinical Ops Lead","Secondary: Provider Manager","Escalation: Medical Director / HC Strategist"],
      actions:["Review today’s patient list","Check clinical task backlog","Upload visit summary / labs","Run no-show risk forecast","Route documentation gaps to billing"],
      automations:["Clinical backlog flagged","Documentation handoff queued","BNCA sent to strategist","Owner lane assigned","Executive risk note generated"],
      impact:["Clinical quality","Clean claim readiness","Provider productivity","Patient follow-up","Revenue leakage"]
    },
    billing:{
      title:"HC Billing Command",
      persona:"Billing Lead · Revenue Cycle Manager · AR Specialist · Denials Team",
      state:["Claims pending shows backlog volume","Denial rate indicates payer or documentation friction","Clean claim rate shows billing quality","Stalled revenue measures immediate financial exposure"],
      meaning:"Billing is where operational breakdown becomes financial loss. Denials, AR aging, coding gaps, and payer inactivity directly affect cash flow and executive revenue exposure.",
      owners:["Primary: Billing Lead","Secondary: RCM Director","Escalation: CFO lane / HC Strategist"],
      actions:["Scrub claim batch","Review AR aging","Create appeal packet","Route payer inactivity alert","Run denial reduction BNCA"],
      automations:["Appeal workflow queued","Payer escalation prepared","Strategist memory updated","SLA watch started","Executive recovery brief generated"],
      impact:["Cash acceleration","Denial reduction","Payer recovery","AR aging","Revenue at risk"]
    },
    compliance:{
      title:"HC Compliance Command",
      persona:"Compliance Officer · HIPAA Lead · Audit Manager",
      state:["HIPAA logs show access activity","Policy gaps indicate audit exposure","Audit risk highlights regulatory pressure","Access review shows security/control posture"],
      meaning:"Compliance converts operational drift into governance risk. Missing documentation, access anomalies, policy gaps, and CMS/OIG exposure require immediate owner-lane accountability.",
      owners:["Primary: Compliance Officer","Secondary: HIPAA Lead","Escalation: CCO / HC Strategist"],
      actions:["Review PHI access logs","Check expired credentials","Generate audit packet","Escalate policy gap","Run compliance BNCA"],
      automations:["Audit trail created","Evidence packet prepared","Policy gap routed","Strategist notified","Executive compliance note generated"],
      impact:["HIPAA exposure","CMS readiness","Audit penalties","Credential risk","Enterprise trust"]
    },
    financial:{
      title:"HC Financial Command",
      persona:"CFO · Finance Director · Revenue Integrity",
      state:["Revenue risk shows financial exposure","Margin pressure signals operating drag","Batch recon indicates accounting readiness","Forecast measures executive predictability"],
      meaning:"Financial command connects operational causes to executive consequences. Payer delays, AR aging, reimbursement gaps, and margin pressure become visible as leadership-ready financial intelligence.",
      owners:["Primary: Finance Director","Secondary: Revenue Integrity Lead","Escalation: CFO / HC Strategist"],
      actions:["Run revenue forecast","Match payer deposits","Review margin contribution","Export finance summary","Run reimbursement recovery BNCA"],
      automations:["Forecast brief generated","Payer variance flagged","Executive summary prepared","Strategist memory updated","Recovery workflow queued"],
      impact:["Cash flow","Margin protection","Payer performance","Revenue predictability","Executive decision-making"]
    },
    insurance:{
      title:"HC Insurance Command",
      persona:"Insurance Coordinator · Prior Auth Lead · Payer Operations",
      state:["Eligibility checks show front-end readiness","PA aging shows authorization bottlenecks","Denial risk exposes payer friction","Payer SLA measures response delay"],
      meaning:"Insurance is the payer-friction control point. Delayed authorizations and eligibility misses create clinical delays, denial acceleration, and avoidable patient throughput issues.",
      owners:["Primary: Prior Auth Lead","Secondary: Insurance Coordinator","Escalation: RCM Director / HC Strategist"],
      actions:["Verify eligibility","Review prior auth aging","Run denial risk score","Attach payer policy PDF","Escalate payer SLA breach"],
      automations:["Payer SLA timer started","Authorization blocker routed","Denial risk attached","Strategist notified","Owner lane assigned"],
      impact:["Denial prevention","Clinical access","Patient scheduling","Payer compliance","Revenue timing"]
    },
    pharmacy:{
      title:"HC Pharmacy Command",
      persona:"Pharmacy Lead · Medication Access Coordinator · Clinical Ops",
      state:["Refill queue shows medication access pressure","Medication PA count shows payer friction","Inventory flags show supply risk","Formulary risk indicates coverage mismatch"],
      meaning:"Pharmacy operations affect care continuity, payer approvals, inventory readiness, and patient experience. Delays can cascade into clinical and scheduling risk.",
      owners:["Primary: Pharmacy Lead","Secondary: Medication Access Coordinator","Escalation: Medical Lead / HC Strategist"],
      actions:["Review refill queue","Check formulary status","Run medication PA review","Flag restock need","Escalate access blocker"],
      automations:["Medication access issue logged","Prior-auth blocker routed","Inventory watch started","Strategist relay queued","Patient impact note generated"],
      impact:["Medication continuity","Patient adherence","Payer approval timing","Inventory risk","Clinical quality"]
    },
    vendors:{
      title:"HC Vendors Command",
      persona:"Vendor Manager · Supply Chain Lead · Operations Lead",
      state:["Vendor SLAs show external dependency risk","PO requests show supply pressure","Spend watch tracks cost exposure","Contract gaps indicate procurement/compliance risk"],
      meaning:"Vendor performance directly impacts operational throughput. Supply delays, expired documents, SLA failures, and spend variance can block care delivery and staffing productivity.",
      owners:["Primary: Vendor Manager","Secondary: Supply Chain Lead","Escalation: Operations Director / HC Strategist"],
      actions:["Review vendor SLA","Create supply order","Check certificate expiry","Sync invoice to finance","Escalate supply blocker"],
      automations:["Vendor incident logged","SLA timer started","Finance sync prepared","Strategist notified","Procurement task created"],
      impact:["Supply continuity","Cost control","Throughput readiness","Contract compliance","Operational resilience"]
    },
    grants:{
      title:"HC Grants Command",
      persona:"Grants Manager · Compliance Reporting · Finance Support",
      state:["Open grants show active funding workload","Reports due indicate compliance deadlines","Eligibility signals opportunity readiness","Renewals show funding continuity risk"],
      meaning:"Grants operations protect funding continuity and compliance. Missed reports or eligibility gaps can create financial risk and lost opportunity.",
      owners:["Primary: Grants Manager","Secondary: Compliance Reporting","Escalation: Finance Director / HC Strategist"],
      actions:["Search grant opportunity","Track application deadline","Upload grant form","Generate compliance report","Escalate overdue reporting"],
      automations:["Deadline watch started","Compliance report queued","Funding risk attached","Strategist memory updated","Executive grant note generated"],
      impact:["Funding continuity","Compliance reporting","Revenue opportunity","Deadline risk","Program sustainability"]
    },
    taxprep:{
      title:"HC Tax Prep Command",
      persona:"Tax Prep Lead · Finance Ops · Vendor Administration",
      state:["1099 readiness shows filing progress","W-9 gaps show vendor documentation risk","Receipt volume shows evidence readiness","Tax export indicates reporting status"],
      meaning:"Tax readiness protects finance operations from filing delays, vendor documentation gaps, and avoidable audit exposure.",
      owners:["Primary: Tax Prep Lead","Secondary: Finance Ops","Escalation: Controller / HC Strategist"],
      actions:["Export revenue report","Check W-9 gaps","Prepare 1099 packet","Generate deduction worksheet","Escalate filing blocker"],
      automations:["Tax packet prepared","Vendor gap routed","Deadline watch started","Strategist notified","Controller summary generated"],
      impact:["Filing readiness","Vendor compliance","Audit support","Finance close","Deadline protection"]
    },
    legal:{
      title:"HC Legal Command",
      persona:"Legal Ops · Contract Manager · Credentialing Lead",
      state:["Contract count shows active legal workload","Renewals show deadline exposure","Credentialing queue shows provider readiness","Escalations show legal risk requiring review"],
      meaning:"Legal operations protect the enterprise from contract, credentialing, and policy risk. Unresolved legal exceptions can block provider operations and payer workflows.",
      owners:["Primary: Legal Ops Lead","Secondary: Contract Manager","Escalation: General Counsel / HC Strategist"],
      actions:["Review expiring contract","Check credentialing queue","Open legal escalation","Sync compliance flag","Run legal risk BNCA"],
      automations:["Contract watch started","Credentialing task created","Compliance sync attached","Strategist notified","Executive legal note generated"],
      impact:["Contract risk","Provider readiness","Payer access","Compliance posture","Operational continuity"]
    }
  };

  function detectNode(){
    const p=location.pathname.toLowerCase();
    const text=(document.body.innerText||"").toLowerCase();
    if(p.includes("taxprep")||text.includes("tax prep")) return "taxprep";
    return Object.keys(CONFIG).find(k=>p.includes(k)||text.includes(`hc ${k}`)||text.includes(`${k} command`)||text.includes(`${k} node`)) || "operations";
  }

  function currentTab(){
    const sel=[".active[role='tab']",".tab.active","nav .active","button.active","a.active","[aria-selected='true']"];
    for(const q of sel){
      const el=document.querySelector(q);
      if(el && (el.innerText||"").trim()) return el.innerText.trim().replace(/\s+/g," ");
    }
    return "Current View";
  }

  function injectStyles(){
    if(document.getElementById("hc-context-guide-css")) return;
    const s=document.createElement("style");
    s.id="hc-context-guide-css";
    s.textContent=`
      #hc-howto-float{
        position:fixed;right:22px;bottom:90px;z-index:999999;background:#00ffc6;color:#001018;
        border:0;border-radius:14px;padding:14px 18px;font-weight:950;cursor:pointer;
        box-shadow:0 0 24px rgba(0,255,198,.35)
      }
      #hc-context-modal{
        position:fixed;inset:0;background:rgba(0,0,0,.76);backdrop-filter:blur(7px);z-index:999999;
        display:flex;align-items:center;justify-content:center;padding:28px
      }
      .hc-context-shell{
        width:min(1180px,96vw);max-height:92vh;overflow:auto;background:#041018;color:#dff7ff;
        border:1px solid rgba(0,255,198,.35);border-radius:22px;padding:24px;
        box-shadow:0 0 46px rgba(0,255,198,.18);font-family:Inter,system-ui,Arial
      }
      .hc-context-title{font-size:28px;color:#00ffc6;font-weight:950;letter-spacing:.04em}
      .hc-context-sub{color:#8aa6b7;margin-top:6px}
      .hc-context-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:16px;margin-top:18px}
      .hc-context-card{background:#071822;border:1px solid rgba(0,255,198,.16);border-radius:17px;padding:17px}
      .hc-context-card h3{margin:0 0 12px;color:#ffc400;font-size:13px;letter-spacing:.14em}
      .hc-context-list div{padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07);line-height:1.45}
      .hc-context-pill{display:inline-block;background:#08131d;border:1px solid rgba(0,255,198,.18);border-radius:999px;padding:7px 10px;margin:4px;color:#dff7ff}
      .hc-context-number{display:flex;gap:12px;align-items:flex-start;padding:11px;background:#08131d;border-radius:12px;margin-bottom:10px}
      .hc-context-number b{background:#00ffc6;color:#001;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex:0 0 28px}
      .hc-context-close{background:#102030;color:#fff;border:0;border-radius:12px;padding:11px 15px;cursor:pointer}
      @media(max-width:900px){.hc-context-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function render(){
    injectStyles();
    if(document.getElementById("hc-howto-float")) return;

    const btn=document.createElement("button");
    btn.id="hc-howto-float";
    btn.textContent="? HOW TO";
    btn.onclick=open;
    document.body.appendChild(btn);
  }

  function open(){
    const old=document.getElementById("hc-context-modal");
    if(old) old.remove();

    const key=detectNode();
    const g=CONFIG[key]||CONFIG.operations;
    const tab=currentTab();

    const modal=document.createElement("div");
    modal.id="hc-context-modal";
    modal.innerHTML=`
      <div class="hc-context-shell">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start">
          <div>
            <div class="hc-context-title">${g.title} · Enterprise Interpretation Guide</div>
            <div class="hc-context-sub">${g.persona}</div>
            <div class="hc-context-sub">Current tab/view: <b style="color:#00ffc6">${tab}</b></div>
          </div>
          <button class="hc-context-close" id="hc-context-close">Close</button>
        </div>

        <div class="hc-context-grid">
          <div class="hc-context-card">
            <h3>CURRENT OPERATIONAL STATE</h3>
            <div class="hc-context-list">${g.state.map(x=>`<div>• ${x}</div>`).join("")}</div>
          </div>

          <div class="hc-context-card">
            <h3>WHAT THIS MEANS</h3>
            <div style="line-height:1.65;color:#cfe7f6">${g.meaning}</div>
          </div>

          <div class="hc-context-card">
            <h3>WHO SHOULD ACT</h3>
            <div>${g.owners.map(x=>`<span class="hc-context-pill">${x}</span>`).join("")}</div>
          </div>

          <div class="hc-context-card">
            <h3>EXECUTIVE IMPACT</h3>
            <div class="hc-context-list">${g.impact.map(x=>`<div>⚠ ${x}</div>`).join("")}</div>
          </div>

          <div class="hc-context-card">
            <h3>EXPECTED ACTIONS</h3>
            ${g.actions.map((x,i)=>`<div class="hc-context-number"><b>${i+1}</b><span>${x}</span></div>`).join("")}
          </div>

          <div class="hc-context-card">
            <h3>AUTOMATED FOLLOW-UPS</h3>
            <div class="hc-context-list">${g.automations.map(x=>`<div>✓ ${x}</div>`).join("")}</div>
          </div>

          <div class="hc-context-card" style="grid-column:1/-1">
            <h3>HOW TO PRESENT THIS PAGE</h3>
            <div style="line-height:1.7;color:#cfe7f6">
              Start with the KPIs at the top, then explain the active alerts and indicators as operational signals.
              Show that each signal has an owner lane, an escalation path, and a BNCA action.
              Use the AI buttons to generate next actions, then explain that unresolved risk feeds HC Strategist and the Executive Portal.
              <br><br>
              Talk track: <b style="color:#00ffc6">“This page does not just show what is happening. It tells the responsible team what to do next and when to escalate.”</b>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("hc-context-close").onclick=()=>modal.remove();
    modal.addEventListener("click",e=>{ if(e.target===modal) modal.remove(); });
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",render);
  else render();

  [800,1800,3200].forEach(ms=>setTimeout(render,ms));
})();
