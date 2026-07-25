(function(){
  if(window.__HC_DEEP_INTEL_WORKBENCH__) return;
  window.__HC_DEEP_INTEL_WORKBENCH__ = true;

  const NODE_META = {
    operations:{title:"OPERATIONS", color:"#00aaff", queue:["Renata H. · Intake Hold","Marcus T. · Awaiting Authorization","Dorothy K. · Documentation Gap"], risk:"MED", owner:"Operations Lead"},
    medical:{title:"MEDICAL", color:"#00ffc6", queue:["CPT mismatch review","Clinical note gap","Provider escalation"], risk:"MED", owner:"Clinical Lead"},
    pharmacy:{title:"PHARMACY", color:"#ffc400", queue:["Drug interaction alert","Prior auth dependency","DEA schedule review"], risk:"HIGH", owner:"Pharmacy Lead"},
    billing:{title:"BILLING", color:"#00ffc6", queue:["Denial rate 18.4%","CO-197 appeal queue","AR aging >30 days"], risk:"HIGH", owner:"Billing Lead"},
    compliance:{title:"COMPLIANCE", color:"#ff3366", queue:["PHI transfer flag","HIPAA audit trail","Policy gap review"], risk:"HIGH", owner:"Compliance Lead"},
    insurance:{title:"INSURANCE", color:"#00aaff", queue:["Prior auth aging","Payer rule conflict","Eligibility check"], risk:"MED", owner:"Insurance Lead"},
    financial:{title:"FINANCIAL", color:"#00aaff", queue:["Revenue cycle drag","P&L variance","Cash-flow exposure"], risk:"MED", owner:"Finance Lead"},
    legal:{title:"LEGAL", color:"#b56cff", queue:["Contract exception","Regulatory review","Escalation memo"], risk:"MED", owner:"Legal Lead"},
    vendors:{title:"VENDORS", color:"#ff7a00", queue:["Vendor SLA breach","Contract renewal","ROI review"], risk:"MED", owner:"Vendor Lead"},
    grants:{title:"GRANTS", color:"#4aa3ff", queue:["Grant reporting due","Budget restriction","Funding compliance"], risk:"LOW", owner:"Grants Lead"},
    taxprep:{title:"TAX PREP", color:"#d86cff", queue:["APR filing window","1099 readiness","W-9 gap"], risk:"MED", owner:"Tax Lead"}
  };

  function keyFromText(txt){
    txt=(txt||"").toLowerCase();
    if(txt.includes("tax")) return "taxprep";
    return Object.keys(NODE_META).find(k=>txt.includes(k)) || "operations";
  }

  function css(){
    if(document.getElementById("hc-deep-workbench-css")) return;
    const s=document.createElement("style");
    s.id="hc-deep-workbench-css";
    s.textContent=`
      .hc-intel-gold-btn,.hce-launch,.nc-open-btn{
        background:#ffc400!important;
        color:#001!important;
        border:1px solid rgba(255,196,0,.75)!important;
        border-radius:11px!important;
        padding:11px 18px!important;
        min-width:170px!important;
        font-weight:950!important;
        letter-spacing:.08em!important;
        text-transform:uppercase!important;
        box-shadow:0 0 22px rgba(255,196,0,.24)!important;
        cursor:pointer!important;
      }
      .hce-overlay{
        position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.84);
        display:flex;align-items:center;justify-content:center;padding:28px;
      }
      .hce-panel{
        width:min(1180px,96vw);height:min(760px,90vh);overflow:auto;
        background:#07131d;border:1px solid var(--hce-color,#00ffc6);
        border-radius:16px;color:#dff7ff;box-shadow:0 0 42px rgba(0,255,198,.25);
        font-family:Inter,system-ui,Arial;
      }
      .hce-head{
        display:flex;align-items:center;justify-content:space-between;padding:18px 22px;
        border-bottom:1px solid rgba(255,255,255,.09);
      }
      .hce-title{font-size:22px;font-weight:950;letter-spacing:.16em;color:var(--hce-color,#00ffc6)}
      .hce-sub{font-size:11px;color:#8aa6b7;letter-spacing:.18em;margin-top:4px}
      .hce-close{background:#102033;color:#dff7ff;border:1px solid #244;border-radius:10px;padding:9px 12px}
      .hce-body{display:grid;grid-template-columns:260px 1fr 310px;min-height:620px}
      .hce-left,.hce-right{background:#06101a;border-right:1px solid rgba(255,255,255,.08);padding:16px}
      .hce-right{border-right:0;border-left:1px solid rgba(255,255,255,.08)}
      .hce-main{padding:16px}
      .hce-q{background:#0b1b28;border:1px solid rgba(0,255,198,.22);border-radius:10px;padding:13px;margin-bottom:10px}
      .hce-tag{font-size:11px;color:#ff5252;font-weight:900}
      .hce-tabs{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
      .hce-tab{padding:10px 13px;border:1px solid rgba(255,255,255,.12);border-radius:9px;color:#9fb8c8;cursor:pointer}
      .hce-tab.active{border-color:var(--hce-color,#00ffc6);color:var(--hce-color,#00ffc6)}
      .hce-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}
      .hce-card{background:#0b1b28;border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:14px}
      .hce-card b{color:#fff}.hce-value{font-size:28px;color:#ff4d6d;font-weight:950;margin-top:6px}
      .hce-timeline{border-left:1px solid rgba(255,255,255,.16);padding-left:16px}
      .hce-step{background:#0b1b28;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:13px;margin:12px 0;position:relative}
      .hce-step:before{content:"";position:absolute;left:-22px;top:18px;width:9px;height:9px;border-radius:50%;background:#ff4d6d}
      .hce-note{width:100%;min-height:95px;background:#050b12;color:#dff7ff;border:1px solid rgba(0,255,198,.22);border-radius:10px;padding:12px}
      .hce-btn{background:var(--hce-color,#00ffc6);color:#001;border:0;border-radius:10px;padding:11px 13px;font-weight:950;margin:6px 4px 6px 0}
      .hce-log{background:#0b1b28;border:1px solid rgba(0,255,198,.18);border-radius:10px;padding:12px;margin-bottom:10px}
      @media(max-width:950px){.hce-body{grid-template-columns:1fr}.hce-grid{grid-template-columns:1fr}.hce-left,.hce-right{border:0}}
    `;
    document.head.appendChild(s);
  }

  function panel(key){
    css();
    const m=NODE_META[key] || NODE_META.operations;
    const old=document.querySelector(".hce-overlay");
    if(old) old.remove();

    const o=document.createElement("div");
    o.className="hce-overlay";
    o.style.setProperty("--hce-color",m.color);
    o.innerHTML=`
      <div class="hce-panel">
        <div class="hce-head">
          <div>
            <div class="hce-title">${m.title} NODE WORKBENCH</div>
            <div class="hce-sub">TIMELINE · NOTES · SMART PROMPTS · BNCA · STRATEGIST RELAY</div>
          </div>
          <button class="hce-close">× Close</button>
        </div>

        <div class="hce-body">
          <div class="hce-left">
            <div class="hce-sub" style="margin-bottom:12px">QUEUE</div>
            ${m.queue.map((q,i)=>`<div class="hce-q"><b>${q}</b><br><span class="hce-tag">${i<2?"HIGH PRIORITY":"WATCH"}</span></div>`).join("")}
          </div>

          <div class="hce-main">
            <div class="hce-tabs">
              <div class="hce-tab active" data-tab="timeline">Timeline</div>
              <div class="hce-tab" data-tab="notes">Notes</div>
              <div class="hce-tab" data-tab="prompts">Smart Prompts</div>
              <div class="hce-tab" data-tab="bnca">BNCA</div>
            </div>

            <div class="hce-grid">
              <div class="hce-card"><b>Risk</b><div class="hce-value">${m.risk}</div></div>
              <div class="hce-card"><b>Queue</b><div class="hce-value" style="color:#ffc400">${m.queue.length*17+13}</div></div>
              <div class="hce-card"><b>Confidence</b><div class="hce-value" style="color:#00ffc6">92%</div></div>
            </div>

            <div class="hce-content">
              <div class="hce-timeline">
                <div class="hce-step"><b>Top Issue</b><br>${m.title} node has active operating pressure and unresolved queue items.</div>
                <div class="hce-step"><b>Recommended Action</b><br>Assign ${m.owner}, clear blockers, document handoff evidence, refresh BNCA.</div>
                <div class="hce-step"><b>Executive Impact</b><br>Reduces delayed handoffs, revenue leakage, compliance exposure, and throughput drag.</div>
              </div>
            </div>
          </div>

          <div class="hce-right">
            <div class="hce-sub" style="margin-bottom:12px">ACTIVITY LOG</div>
            <div class="hce-log"><b>System</b><br>Workbench opened for ${m.title}</div>
            <div class="hce-log"><b>BNCA</b><br>Smart prompt ready</div>
            <div class="hce-log"><b>Owner Lane</b><br>${m.owner} · Today</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(o);

    o.querySelector(".hce-close").onclick=()=>o.remove();

    o.querySelectorAll(".hce-tab").forEach(t=>{
      t.onclick=()=>{
        o.querySelectorAll(".hce-tab").forEach(x=>x.classList.remove("active"));
        t.classList.add("active");
        const c=o.querySelector(".hce-content");
        const tab=t.dataset.tab;
        if(tab==="notes"){
          c.innerHTML=`<textarea class="hce-note" placeholder="Type interaction note, payer update, blocker, or handoff detail..."></textarea><br><button class="hce-btn">💾 Save Note</button><button class="hce-btn">↗ Send to BNCA</button>`;
        } else if(tab==="prompts"){
          c.innerHTML=`<div class="hce-step"><b>Prompt 1</b><br>Analyze ${m.title} queue pressure and return Best Next Course of Action.</div><div class="hce-step"><b>Prompt 2</b><br>Identify owner lane, SLA blockers, and executive risk for ${m.title}.</div><button class="hce-btn">Run Smart Prompt</button>`;
        } else if(tab==="bnca"){
          c.innerHTML=`<pre style="white-space:pre-wrap;background:#050b12;border:1px solid rgba(0,255,198,.18);padding:14px;border-radius:10px;color:#dff7ff">TOP ISSUE
${m.title} node has active operating pressure requiring owner-lane action.

RISK LEVEL
${m.risk}

BEST NEXT ACTIONS
1. Assign ${m.owner} as accountable owner.
2. Clear blockers older than the current operating window.
3. Document handoff requirements before downstream routing.
4. Relay unresolved exposure to Healthcare Strategist.

CONFIDENCE
92%</pre>`;
        } else {
          c.innerHTML=`<div class="hce-timeline"><div class="hce-step"><b>Top Issue</b><br>${m.title} node has active operating pressure and unresolved queue items.</div><div class="hce-step"><b>Recommended Action</b><br>Assign ${m.owner}, clear blockers, document handoff evidence, refresh BNCA.</div><div class="hce-step"><b>Executive Impact</b><br>Reduces delayed handoffs, revenue leakage, compliance exposure, and throughput drag.</div></div>`;
        }
      };
    });
  }

  window.hcOpenEnhancedNode = panel;
  window.openNodeWorkbench = panel;

  function decorate(){
    css();

    document.querySelectorAll(".nc-open-btn,button").forEach(btn=>{
      const t=(btn.innerText||"").trim().toUpperCase();
      if(t==="INTEL"){
        btn.innerText="INTEL WORKBENCH";
        btn.classList.add("hc-intel-gold-btn");
      }
    });

    document.querySelectorAll(".node-card,.nc-card,.card,[data-node],[data-key]").forEach(card=>{
      const txt=(card.innerText||"").toLowerCase();
      if(!Object.keys(NODE_META).some(k=>txt.includes(k)) && !txt.includes("tax prep")) return;
      if(card.querySelector(".hc-intel-gold-btn")) return;

      const key=card.dataset.node || card.dataset.key || keyFromText(txt);
      const btn=document.createElement("button");
      btn.className="hc-intel-gold-btn";
      btn.textContent="INTEL WORKBENCH";
      btn.onclick=e=>{
        e.preventDefault();
        e.stopPropagation();
        panel(key);
      };
      card.appendChild(btn);
    });

    document.querySelectorAll(".hc-intel-gold-btn,.nc-open-btn").forEach(btn=>{
      if(btn.dataset.hcDeepWired) return;
      btn.dataset.hcDeepWired="true";
      btn.onclick=e=>{
        e.preventDefault();
        e.stopPropagation();
        const card=btn.closest(".node-card,.nc-card,.card,[data-node],[data-key]") || btn.parentElement;
        panel(keyFromText(card?.innerText||btn.innerText));
      };
    });
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",decorate);
  else decorate();

  [500,1200,2500,4000].forEach(ms=>setTimeout(decorate,ms));

  console.log("HC Deep Intel Workbench installed");
})();
