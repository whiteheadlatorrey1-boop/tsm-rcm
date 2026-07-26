(function(){
  window.__TSM_HC_BRIDGE_FORCE__=true;
  function node(){
    const p=location.pathname.toLowerCase(), t=(document.body.innerText||"").toLowerCase();
    if(p.includes("billing")||t.includes("billing command")) return "BILLING";
    if(p.includes("medical")||t.includes("medical command")) return "MEDICAL";
    if(p.includes("compliance")||t.includes("compliance command")) return "COMPLIANCE";
    if(p.includes("financial")||t.includes("financial command")) return "FINANCIAL";
    if(p.includes("insurance")) return "INSURANCE";
    if(p.includes("pharmacy")) return "PHARMACY";
    if(p.includes("vendor")) return "VENDORS";
    if(p.includes("legal")) return "LEGAL";
    if(p.includes("grant")) return "GRANTS";
    if(p.includes("tax")) return "TAXPREP";
    if(p.includes("strategist")) return "STRATEGIST";
    return "OPERATIONS";
  }
  function tab(){
    const el=document.querySelector(".active,[aria-selected='true']");
    return (el?.innerText||"Current View").trim().replace(/\s+/g," ");
  }
  async function askHC(prompt, extra={}){
    const n=extra.node||node(), tb=extra.tab||tab();
    const r=await fetch("/api/hc/query",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({payload:{node:n,tab:tb,context:prompt,priority:"HIGH",human_in_the_loop:true,relay_to_strategist:true}})});
    const d=await r.json();
    return d.reply||d.content||JSON.stringify(d,null,2);
  }
  window.TSMBridge={detectNode:node,activeTab:tab,askHC};
  window.tsmAskHC=askHC;
  window.tsmDetectHCNode=node;
})();
