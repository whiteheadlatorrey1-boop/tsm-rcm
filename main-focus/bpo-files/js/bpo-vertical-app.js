(function(){
  if(window.__TSM_BPO_VERTICAL_APP__) return;
  window.__TSM_BPO_VERTICAL_APP__ = true;

  const CONFIGS = {
    "bpo-legal.html": {
      sector:"LegalOps BPO",
      sub:"MATTER INTAKE · BILLING AUDIT · CONTRACT REVIEW · QC / COMPLIANCE",
      lanes:{
        "DASHBOARD":["Open Matters","Billing Exposure","Contract Risk","Compliance Watch"],
        "MATTER INTAKE":["Conflict Check","Engagement Letter","Scope Review","Deadline Capture"],
        "BILLING AUDIT":["Rate Review","Block Billing","AR Exposure","Write-Down Recommendation"],
        "CONTRACT REVIEW":["Risk Clauses","Indemnity","Termination","Governing Law"],
        "QC / COMPLIANCE":["Ethics Review","Trust Accounting","File Retention","Policy Gaps"],
        "AI ANALYST":["BNCA Engine","Risk Summary","Owner Lane","Executive Report"]
      }
    },
    "bpo-healthcare.html": {
      sector:"Healthcare BPO",
      sub:"INTAKE · PRIOR AUTH · BILLING / RCM · COMPLIANCE OPS",
      lanes:{
        "DASHBOARD":["Patient Queue","Auth Aging","Denial Exposure","RCM Watch"],
        "INTAKE":["Patient Intake","Eligibility Check","Scheduling Pressure","Document Routing"],
        "PRIOR AUTH":["Auth Aging","Payer Rules","Appeal Queue","Approval SLA"],
        "BILLING / RCM":["Claim Scrubbing","Denial Queue","AR Follow-Up","Clean Claim Rate"],
        "COMPLIANCE":["PII / PHI Review","Audit Trail","Policy Exceptions","Escalation Log"],
        "AI ANALYST":["BNCA Engine","Risk Summary","Owner Lane","Executive Report"]
      }
    },
    "bpo-tax.html": {
      sector:"TaxOps BPO",
      sub:"TAX INTAKE · PREP OPS · ENTITY · IRS / STATE",
      lanes:{
        "DASHBOARD":["Returns Queue","Missing Docs","Entity Watch","Notice Risk"],
        "TAX INTAKE":["W2 / 1099 Intake","K-1 Tracking","Missing Docs","Client Organizer"],
        "PREP OPS":["Preparer Queue","Reviewer Routing","E-file Status","Return Readiness"],
        "ENTITY":["LLC / S-Corp","Compliance Calendar","Election Tracking","Registered Agent"],
        "IRS / STATE":["Notice Intake","Transcript Review","Penalty Risk","Response Deadline"],
        "AI ANALYST":["BNCA Engine","Risk Summary","Owner Lane","Executive Report"]
      }
    },
    "rrd-bpo.html": {
      sector:"RRD BPO",
      sub:"DOC INTAKE · PRINT / MAIL · QA ROUTING · COMPLIANCE",
      lanes:{
        "DASHBOARD":["Batch Queue","SLA Watch","QA Exceptions","Release Ready"],
        "DOC INTAKE":["Batch Intake","Metadata Capture","Routing Rules","Exception Detection"],
        "PRINT / MAIL":["Print Queue","Mail Hold","Address Validation","SLA Timing"],
        "QA ROUTING":["Batch QA","Error Review","Rework Queue","Release Approval"],
        "COMPLIANCE":["PII / PHI Review","Regulated Mail","Audit Trail","Exception Log"],
        "AI ANALYST":["BNCA Engine","Risk Summary","Owner Lane","Executive Report"]
      }
    },
    "finops-bpo.html": {
      sector:"FinOps BPO",
      sub:"AP OPS · AR OPS · RECON · CLOSE · AUDIT",
      lanes:{
        "DASHBOARD":["Invoice Queue","Recon Variance","Close Blockers","Recovery Watch"],
        "AP OPS":["Vendor Invoice Intake","Duplicate Detection","Approval Routing","Payment Timing"],
        "AR OPS":["Collections Queue","Aging Buckets","Client Follow-Up","Cash Acceleration"],
        "RECON":["Bank Reconciliation","GL Matching","Variance Detection","Controller Review"],
        "CLOSE":["Close Checklist","Accruals / Prepaids","JE Support","Blocker Ownership"],
        "AUDIT":["Audit Trail","Exception Package","Support Evidence","Compliance Review"],
        "AI ANALYST":["BNCA Engine","Risk Summary","Owner Lane","Executive Report"]
      }
    }
  };

  const file = location.pathname.split('/').pop();
  const cfg = CONFIGS[file] || CONFIGS["finops-bpo.html"];
  document.body.dataset.sector = cfg.sector;

  function icon(lane){
    return ({
      "DASHBOARD":"⬛","AI ANALYST":"🤖","MATTER INTAKE":"⚖️","BILLING AUDIT":"💳","CONTRACT REVIEW":"📄",
      "QC / COMPLIANCE":"✅","INTAKE":"🩺","PRIOR AUTH":"🛡️","BILLING / RCM":"💰","COMPLIANCE":"✅",
      "TAX INTAKE":"🧾","PREP OPS":"📑","ENTITY":"🏢","IRS / STATE":"📬","DOC INTAKE":"📥",
      "PRINT / MAIL":"🖨️","QA ROUTING":"📋","AP OPS":"📥","AR OPS":"📤","RECON":"🏦","CLOSE":"📆","AUDIT":"🔍"
    })[lane] || "▣";
  }

  function shell(){
    document.body.innerHTML = `
      <header>
        <div>
          <div class="logo">TSM OPS CLOUD</div>
          <div class="sub">${cfg.sector.toUpperCase()} · ${cfg.sub}</div>
        </div>
        <div class="top-actions">
          <select><option>Ameris Construction</option><option>Desert Financial</option><option>HonorHealth</option></select>
          <a class="pill" href="/bpo/bpo-website.html">BPO Website</a>
          <a class="pill" href="/client-access.html">Client Access</a>
        </div>
      </header>
      <div id="nav"></div>
      <div id="app"><aside id="side"></aside><main id="main"></main></div>
    `;
  }

  function renderSide(active){
    side.innerHTML = Object.keys(cfg.lanes).map((x,i)=>`
      <div class="si ${x===active?'active':''}" data-lane="${x}">
        <span>${icon(x)} ${x}</span><b>${i+1}</b>
      </div>`).join('');
  }

  function renderNav(active){
    nav.innerHTML = Object.keys(cfg.lanes).map(x=>`
      <button class="nb ${x===active?'active':''}" data-lane="${x}">${icon(x)} ${x}</button>
    `).join('');
  }

  function render(lane="DASHBOARD"){
    renderNav(lane);
    renderSide(lane);
    const items = cfg.lanes[lane] || [];

    main.innerHTML = `
      <div class="kpis">
        <div class="stat"><small>LANE STATUS</small><strong>ACTIVE</strong><span>${lane}</span></div>
        <div class="stat"><small>SLA WATCH</small><strong>4</strong><span>needs review</span></div>
        <div class="stat"><small>QUEUE ITEMS</small><strong>18</strong><span>in operating lane</span></div>
        <div class="stat"><small>BNCA</small><strong>READY</strong><span>strategist relay</span></div>
      </div>

      <section class="card hero">
        <p class="ey">ACTIVE OPERATING LANE</p>
        <h1>${lane}</h1>
        <p>This lane manages queue ownership, SLA risk, document processing, BNCA recommendations, and strategist escalation for ${cfg.sector}.</p>
      </section>

      <section class="grid4">
        ${items.map(x=>`
          <div class="card">
            <p class="ey">${lane}</p>
            <h2 style="color:var(--a)">${x}</h2>
            <p style="color:#8aa6b7;line-height:1.45">
              Queue status, owner lane, SLA risk, document evidence, and next-action readiness.
            </p>
          </div>
        `).join('')}
      </section>

      <section class="grid2">
        <div class="card">
          <p class="ey">WORKFLOW INTAKE</p>
          <input placeholder="Client / matter / project / account">
          <textarea id="lane-context" placeholder="Paste notes, documents, issue summary, or operational context..."></textarea>
          <button class="primary" onclick="window.TSM_BPO.runLane('${lane}')">⚡ RUN ${lane} BNCA</button>
          <pre id="lane-output" class="out"></pre>
        </div>

        <div class="card">
          <p class="ey">STRATEGIST OUTPUT</p>
          <pre class="box">TOP ISSUE
${lane} requires operating review.

BEST NEXT ACTIONS
1. Assign accountable owner.
2. Clear blockers older than current SLA.
3. Document evidence.
4. Relay unresolved risk to Strategist.

CONFIDENCE
92%</pre>
        </div>
      </section>
    `;
  }

  shell();
  document.addEventListener("click", e => {
    const hit = e.target.closest("[data-lane]");
    if(hit) render(hit.dataset.lane);
  });
  render("DASHBOARD");
})();
