(function(){
  if(window.__HC_STRATEGIST_RELAY__) return;
  window.__HC_STRATEGIST_RELAY__=true;

  function detectNode(){
    const path=location.pathname.toLowerCase();
    const body=(document.body.innerText||"").toLowerCase();
    const nodes=["billing","medical","compliance","financial","insurance","legal","pharmacy","vendors","grants","taxprep","operations"];
    if(path.includes("taxprep") || body.includes("tax prep")) return "TAXPREP";
    return (nodes.find(n=>path.includes(n)||body.includes(`hc ${n}`)) || "operations").toUpperCase();
  }

  async function relay(action, risk="MED"){
    const node=detectNode();
    const payload={
      node,
      action,
      risk,
      owner: node+" Lead",
      summary: `${node}: ${action}`,
      status:"Open"
    };

    let out=document.getElementById("hc-feature-output");
    if(out){
      out.style.display="block";
      out.textContent="Relaying to HC Strategist...";
    }

    try{
      const r=await fetch("/api/hc/strategist-memory",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      const d=await r.json();

      if(out){
        out.textContent=`RELAYED TO HC STRATEGIST

NODE
${node}

ACTION
${action}

OWNER
${node} Lead

STATUS
Open

NEXT
Review in HC Strategist rollup.`;
      }

      window.dispatchEvent(new CustomEvent("hc-strategist-relayed",{detail:d.item}));
      return d;
    }catch(e){
      if(out) out.textContent="Relay failed. Check /api/hc/strategist-memory.";
    }
  }

  async function rollup(){
    const r=await fetch("/api/hc/strategist-rollup");
    const d=await r.json();
    const pre=document.createElement("pre");
    pre.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:100000;width:min(760px,92vw);max-height:82vh;overflow:auto;background:#050b12;color:#dff7ff;border:1px solid #00ffc6;border-radius:16px;padding:22px;white-space:pre-wrap;box-shadow:0 0 40px rgba(0,255,198,.24)";
    pre.textContent=d.executive||JSON.stringify(d,null,2);
    pre.onclick=()=>pre.remove();
    document.body.appendChild(pre);
  }

  window.hcRelayToStrategist=relay;
  window.hcStrategistRollup=rollup;

  function wire(){
    document.querySelectorAll(".hc-feature-action").forEach(btn=>{
      if(btn.dataset.relayWired) return;
      btn.dataset.relayWired="true";
      const old=btn.onclick;
      btn.onclick=async function(e){
        if(old) old.call(btn,e);
        setTimeout(()=>relay(btn.dataset.action || btn.innerText.replace("⚡","").trim(),"HIGH"),600);
      };
    });

    document.querySelectorAll("button").forEach(btn=>{
      const t=(btn.innerText||"").toLowerCase();
      if(t.includes("relay to strategist") || t.includes("run bnca")){
        if(btn.dataset.hcRelayWired) return;
        btn.dataset.hcRelayWired="true";
        btn.addEventListener("click",()=>relay("BNCA run / strategist relay from node","HIGH"),true);
      }
    });

    if(!document.getElementById("hc-rollup-floating")){
      const b=document.createElement("button");
      b.id="hc-rollup-floating";
      b.textContent="HC STRATEGIST ROLLUP";
      b.style.cssText="position:fixed;right:18px;bottom:74px;z-index:99999;background:#b56cff;color:#fff;border:0;border-radius:18px;padding:12px 16px;font-weight:950;box-shadow:0 0 22px rgba(181,108,255,.28)";
      b.onclick=rollup;
      document.body.appendChild(b);
    }
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",wire);
  else wire();

  [800,1800,3500].forEach(ms=>setTimeout(wire,ms));
})();
