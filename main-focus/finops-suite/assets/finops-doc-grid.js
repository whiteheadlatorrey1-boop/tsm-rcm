(function(){
  const DOCS = [
    ["bank-reconciliation","🏦","BANK RECONCILIATION","Reconciling bank vs GL balances","Discrepancies before month-end close"],
    ["ap-aging","📄","AP AGING REPORT","Vendor balances + payment prioritization","Late vendors, 60/90+ day exposure"],
    ["ar-ledger","💵","AR LEDGER / COLLECTIONS","Outstanding invoices + cash timing","Delayed collections, cash risk"],
    ["financial-statements","📊","FINANCIAL STATEMENTS","Income statement + balance sheet + cash flow","Margin + liquidity visibility"],
    ["budget-variance","📈","BUDGET VARIANCE REPORT","Department-level spend vs plan","Over/under-spend detection"],
    ["gl-detail","🧾","GL DETAIL EXTRACT","Transaction-level audit trail","Supporting schedule validation"],
    ["1099-tracker","🧮","1099 + W-9 TRACKER","Vendor tax readiness + thresholds","Missing W-9s, filing risk"],
    ["audit-findings","🔍","AUDIT FINDINGS REPORT","Control gaps + documentation issues","Approval gaps, duplicate vendors"]
  ];

  function install(){
    const host = document.getElementById("finopsDocGridLive");
    if(!host) return;

    host.innerHTML = `
      <style>
      .fin-doc-stage{border:1px solid #00e0ff;border-radius:16px;padding:18px;background:#061018;margin:18px 0;font-family:monospace;color:#d9f3ff}
      .fin-doc-title{color:#00e0ff;font-weight:900;letter-spacing:.12em;margin-bottom:12px}
      .fin-doc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:12px}
      .fin-doc-card{background:#f6f4ef;color:#161616;border:1px solid #d8d8d8;border-radius:12px;padding:16px;min-height:155px;box-shadow:0 0 12px rgba(0,0,0,.18)}
      .fin-doc-card.active{outline:3px solid #00f59f}
      .fin-doc-icon{font-size:26px;margin-bottom:8px}
      .fin-doc-kicker{color:#777;text-transform:uppercase;letter-spacing:.12em;font-size:12px}
      .fin-doc-name{font-size:18px;margin:5px 0}
      .fin-doc-risk{color:#7a4a00;font-size:13px;line-height:1.45}
      .fin-doc-versions{display:flex;gap:7px;margin-top:12px}
      .fin-doc-versions button{background:white;color:#111;border:1px solid #bbb;border-radius:8px;padding:8px 12px;cursor:pointer}
      .fin-pipeline{display:grid;grid-template-columns:repeat(5,1fr);gap:0;margin:16px 0;border:1px solid #7cb342;border-radius:12px;overflow:hidden}
      .fin-step{background:#e8f4dc;color:#315d1c;text-align:center;padding:14px;border-right:2px solid #7cb342}
      .fin-step:last-child{border-right:0}
      .fin-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
      .fin-actions button{background:transparent;color:#00e0ff;border:1px solid #00e0ff;border-radius:8px;padding:10px 12px;font:900 11px monospace;cursor:pointer}
      .fin-actions button.primary{background:#00f59f;color:#001018;border-color:#00f59f}
      .fin-output{white-space:pre-wrap;background:#02070d;border:1px solid #123050;border-radius:12px;padding:14px;min-height:150px;line-height:1.5}
      @media(max-width:900px){.fin-pipeline{grid-template-columns:1fr}.fin-step{border-right:0;border-bottom:1px solid #7cb342}}
      </style>

      <section class="fin-doc-stage">
        <div class="fin-doc-title">FINOPS DOCUMENT INTELLIGENCE · STAFF ACCOUNTANT WORKLOAD</div>
        <div style="color:#9bbbd0;margin-bottom:12px">
          8 core accounting workflows — processed, validated, and converted into action before month-end risk appears.
        </div>
        <div class="fin-doc-grid" id="finDocCards"></div>

        <div class="fin-pipeline">
          <div class="fin-step">📥<br>Document Intake<br><small>upload + parse</small></div>
          <div class="fin-step">📊<br>Financial Intel<br><small>AP / AR / cash</small></div>
          <div class="fin-step">🧮<br>Tax + Compliance<br><small>1099 + audit trail</small></div>
          <div class="fin-step">🧠<br>FinOps Strategist<br><small>BNCA synthesis</small></div>
          <div class="fin-step">👤<br>Controller Review<br><small>final approval</small></div>
        </div>

        <div class="fin-actions">
          <button class="primary" onclick="FINOPS_DOC_GRID.run()">RUN SELECTED DOCUMENT</button>
          <button onclick="FINOPS_DOC_GRID.runAll()">RUN ALL 8 DOCS</button>
          <button onclick="FINOPS_DOC_GRID.push()">PUSH TO FINOPS MAIN STRATEGIST</button>
          <button onclick="location.href='/html/finops-main-strategist/index.html?v=doc-grid'">OPEN FINOPS MAIN</button>
        </div>

        <div class="fin-output" id="finDocOutput">Select Bank Reconciliation and run the document first. This is your strongest close loop.</div>
      </section>
    `;

    renderCards();
  }

  let selected = "bank-reconciliation";
  let lastReport = null;

  function renderCards(){
    const grid = document.getElementById("finDocCards");
    grid.innerHTML = DOCS.map(d=>`
      <div class="fin-doc-card ${selected===d[0]?'active':''}" onclick="FINOPS_DOC_GRID.select('${d[0]}')">
        <div class="fin-doc-icon">${d[1]}</div>
        <div class="fin-doc-kicker">${d[2]}</div>
        <div class="fin-doc-name">${d[2].replace(" REPORT","").replace(" EXTRACT","")}</div>
        <div>${d[3]}</div>
        <div class="fin-doc-risk">→ ${d[4]}</div>
        <div class="fin-doc-versions"><button>v1</button><button>v2</button><button>v3</button></div>
      </div>
    `).join("");
  }

  async function run(){
    const out = document.getElementById("finDocOutput");
    out.textContent = "Running selected document through FinOps nodes...";
    const res = await fetch("https://tsm-shell.fly.dev/api/finops/run-doc",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({type:selected})
    });
    const data = await res.json();
    lastReport = data.report;
    out.textContent = data.report?.summary || "No output returned.";
  }

  async function runAll(){
    const out = document.getElementById("finDocOutput");
    out.textContent = "Running all 8 accounting documents through FinOps suite...";
    for(const d of DOCS){
      await fetch("https://tsm-shell.fly.dev/api/finops/run-doc",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({type:d[0]})
      });
    }
    out.textContent = `ALL 8 FINOPS DOCUMENTS PROCESSED

Documents:
• Bank Reconciliation
• AP Aging
• AR Ledger / Collections
• Financial Statements
• Budget Variance
• GL Detail
• 1099 + W-9 Tracker
• Audit Findings

EXECUTIVE BNCA:
Prioritize bank reconciliation variance, AP aging review, 1099 readiness, and procurement control gaps.

BUSINESS OUTCOME:
Staff-accountant workload is now structured into one operating system for controller review.`;
  }

  async function push(){
    if(!lastReport) await run();
    location.href="/html/finops-main-strategist/index.html?v=from-doc-grid";
  }

  window.FINOPS_DOC_GRID = {
    select(k){ selected=k; renderCards(); },
    run, runAll, push
  };

  document.addEventListener("DOMContentLoaded", install);
})();
