(function(){

if(window.__HC_UNIVERSAL_CONTROLLER__) return;
window.__HC_UNIVERSAL_CONTROLLER__ = true;

function qs(x){ return document.querySelector(x); }
function qsa(x){ return [...document.querySelectorAll(x)]; }

function log(){
  console.log("[HC-UNIVERSAL]", ...arguments);
}

function wireTabs(){

  const tabs = qsa(`
    [data-tab],
    .tab,
    .node-tab,
    button[onclick*="tab"],
    button[onclick*="switch"]
  `);

  const panels = qsa(`
    [data-panel],
    .tab-panel,
    .tab-content,
    .panel,
    section
  `);

  if(!tabs.length){
    log("No tabs found");
    return;
  }

  tabs.forEach((tab,idx)=>{

    if(tab.dataset.hcWired) return;
    tab.dataset.hcWired = "1";

    tab.addEventListener("click",()=>{

      const key =
        tab.dataset.tab ||
        tab.getAttribute("data-target") ||
        tab.innerText.trim().toLowerCase().replace(/\s+/g,"-");

      tabs.forEach(t=>t.classList.remove("active"));

      tab.classList.add("active");

      let matched = false;

      panels.forEach(p=>{

        const txt = (
          p.dataset.panel ||
          p.id ||
          p.className ||
          ""
        ).toLowerCase();

        if(txt.includes(key)){
          p.style.display = "";
          p.style.opacity = "1";
          matched = true;
        }else{
          p.style.display = "none";
        }
      });

      if(!matched && panels[idx]){
        panels.forEach(p=>p.style.display="none");
        panels[idx].style.display="";
      }

      log("Tab switched:", key);
    });

  });

  if(tabs[0]) tabs[0].click();
}

function ensureAI(){

  const existing = qs("#hcUniversalAI");

  if(existing) return;

  const box = document.createElement("div");

  box.id = "hcUniversalAI";

  box.innerHTML = `
  <div style="
    position:fixed;
    right:18px;
    bottom:18px;
    width:340px;
    z-index:99999;
    background:#07131d;
    border:1px solid rgba(0,255,198,.25);
    border-radius:18px;
    padding:16px;
    box-shadow:0 0 24px rgba(0,255,198,.12);
    color:#dff;
    font-family:Inter,Arial;
  ">
    <div style="
      color:#00ffc6;
      font-size:11px;
      letter-spacing:.16em;
      font-weight:900;
      text-transform:uppercase;
      margin-bottom:8px;
    ">
      HC STRATEGIST RELAY
    </div>

    <textarea id="hcUniversalPrompt"
      placeholder="Ask strategist..."
      style="
        width:100%;
        min-height:90px;
        background:#050c13;
        color:#dff;
        border:1px solid rgba(255,255,255,.08);
        border-radius:12px;
        padding:10px;
      "
    ></textarea>

    <div style="display:flex;gap:8px;margin-top:10px">
      <button id="hcRunBNCA"
        style="
          flex:1;
          background:#00ffc6;
          color:#001;
          border:0;
          border-radius:10px;
          padding:10px;
          font-weight:900;
          cursor:pointer;
        ">
        Run BNCA
      </button>

      <button id="hcExplain"
        style="
          flex:1;
          background:#102030;
          color:#dff;
          border:1px solid rgba(0,255,198,.2);
          border-radius:10px;
          padding:10px;
          font-weight:900;
          cursor:pointer;
        ">
        Explain Risk
      </button>
    </div>

    <pre id="hcUniversalOutput"
      style="
        white-space:pre-wrap;
        margin-top:12px;
        background:#050c13;
        border:1px solid rgba(0,255,198,.14);
        border-radius:12px;
        padding:12px;
        max-height:240px;
        overflow:auto;
        color:#dff;
      "
    >Strategist online.</pre>
  </div>
  `;

  document.body.appendChild(box);

  async function run(mode){

    const out = qs("#hcUniversalOutput");
    const prompt =
      qs("#hcUniversalPrompt")?.value?.trim() ||
      "Analyze current healthcare operational risk and return BNCA.";

    out.textContent = "Running Healthcare Strategist synthesis...";

    try{

      const r = await fetch("/api/hc/query",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          payload:{
            sector:"HEALTHCARE",
            node:"HC UNIVERSAL CONTROLLER",
            mode,
            context:prompt,
            executive:true,
            hitl:true,
            relay_to_strategist:true
          }
        })
      });

      const d = await r.json();

      out.textContent =
        d.reply ||
        d.content ||
        JSON.stringify(d,null,2);

    }catch(e){

      out.textContent =
        "Healthcare strategist unavailable.";
    }
  }

  qs("#hcRunBNCA")?.addEventListener("click",()=>run("bnca"));
  qs("#hcExplain")?.addEventListener("click",()=>run("risk"));

  log("AI layer ready");
}

function forceVisiblePanels(){

  const hidden = qsa(`
    .tab-content,
    .tab-panel,
    [data-panel]
  `);

  hidden.forEach((el,i)=>{
    if(i===0){
      el.style.display="";
      el.style.opacity="1";
    }
  });
}

function init(){

  try{
    wireTabs();
    ensureAI();
    forceVisiblePanels();
    log("Universal HC controller active");
  }catch(e){
    console.error("HC controller failed",e);
  }
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init);
}else{
  init();
}

setTimeout(init,1500);

})();
