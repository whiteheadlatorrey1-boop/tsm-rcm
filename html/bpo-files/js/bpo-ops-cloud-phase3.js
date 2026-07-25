(function(){
  if(window.__TSM_BPO_PHASE3_API__) return;
  window.__TSM_BPO_PHASE3_API__=true;

  async function api(path,opts={}){
    const r=await fetch(path,{
      ...opts,
      headers:{'Content-Type':'application/json',...(opts.headers||{})}
    });
    return await r.json();
  }

  function client(){
    const sel=document.getElementById("bpo-client-select");
    return sel ? sel.options[sel.selectedIndex].text : "Ameris Construction";
  }

  async function refreshPanel(){
    const panel=document.getElementById("bpo-cloud-panel");
    if(!panel) return;

    const d=await api("/api/bpo/tasks?client="+encodeURIComponent(client()));
    const r=await api("/api/bpo/rollup?client="+encodeURIComponent(client()));
    const tasks=d.tasks||[];

    panel.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="color:#00ffc6;font-weight:900;letter-spacing:.16em">TSM BPO OPS CLOUD · LIVE</div>
          <div style="color:#8aa6b7;font-size:12px">${client()}</div>
        </div>
        <button onclick="document.getElementById('bpo-cloud-panel').classList.remove('active')" style="background:#102033;color:#fff;border:1px solid #244;border-radius:8px;padding:6px 9px">Close</button>
      </div>

      <div class="bpo-kpis">
        <div><small>OPEN</small><b>${r.open}</b></div>
        <div><small>HIGH</small><b>${r.high}</b></div>
        <div><small>SLA</small><b>${r.sla}</b></div>
        <div><small>TOTAL</small><b>${r.total}</b></div>
      </div>

      <button onclick="window.bpoCreateTaskFromPage()" style="width:100%;background:#00ffc6;color:#001;border:0;border-radius:10px;padding:11px;font-weight:900">+ CREATE LIVE TASK</button>
      <button onclick="window.bpoShowRollup()" style="width:100%;margin-top:8px;background:#ffc400;color:#001;border:0;border-radius:10px;padding:11px;font-weight:900">LIVE EXECUTIVE ROLLUP</button>

      ${tasks.map(t=>`
        <div class="bpo-task ${t.risk==='HIGH'?'high':t.risk==='MED'?'med':''}">
          <b>${t.id} · ${t.lane}</b><br>
          <span style="color:#9fb8c8">${t.summary}</span><br>
          <small>Owner: ${t.owner} · SLA: ${t.sla} · Risk: ${t.risk} · Status: ${t.status}</small><br>
          <button onclick="window.bpoMarkDone('${t.id}')" style="margin-top:8px;background:#102033;color:#dff7ff;border:1px solid #244;border-radius:8px;padding:6px 8px">Mark Done</button>
        </div>
      `).join("")}
    `;
  }

  window.bpoCreateTaskFromPage=async function(){
    const lane=(document.querySelector(".nb.active,.si.active,.nav-btn.active")?.innerText||"Current Lane").replace(/[0-9]/g,"").trim();
    await api("/api/bpo/tasks",{
      method:"POST",
      body:JSON.stringify({
        client:client(),
        lane,
        owner:"Strategist",
        sla:"2h",
        risk:"HIGH",
        summary:`${lane} needs owner assignment, SLA review, and BNCA follow-up`
      })
    });
    await refreshPanel();
    document.getElementById("bpo-cloud-panel")?.classList.add("active");
  };

  window.bpoMarkDone=async function(id){
    await api("/api/bpo/tasks/"+id+"/status",{
      method:"POST",
      body:JSON.stringify({status:"Done"})
    });
    await refreshPanel();
  };

  window.bpoShowRollup=async function(){
    const r=await api("/api/bpo/rollup?client="+encodeURIComponent(client()));
    const out=document.createElement("pre");
    out.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10000;width:min(760px,92vw);max-height:80vh;overflow:auto;background:#050b12;color:#dff7ff;border:1px solid #00ffc6;border-radius:16px;padding:22px;white-space:pre-wrap;box-shadow:0 0 40px rgba(0,255,198,.22)";
    out.textContent=r.executive;
    out.onclick=()=>out.remove();
    document.body.appendChild(out);
  };

  setTimeout(()=>{
    const btn=document.getElementById("bpo-open-cloud");
    if(btn) btn.onclick=async()=>{await refreshPanel();document.getElementById("bpo-cloud-panel")?.classList.add("active");};

    const roll=document.getElementById("bpo-rollup");
    if(roll) roll.onclick=window.bpoShowRollup;

    const sel=document.getElementById("bpo-client-select");
    if(sel) sel.onchange=async()=>refreshPanel();
  },500);
})();
