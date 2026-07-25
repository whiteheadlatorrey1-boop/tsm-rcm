
// 🔥 HARD BLOCK all legacy music endpoints (fetch + XHR)
(function(){
  if(window.__TSM_MUSIC_LEGACY_BLOCK__) return;
  window.__TSM_MUSIC_LEGACY_BLOCK__ = true;

  const isLegacyMusic = function(url){
    return typeof url === "string" &&
      url.includes("/api/music/") &&
      !url.includes("/api/music/agent-pass");
  };

  // --- Block fetch ---
  const origFetch = window.fetch;
  window.fetch = function(url, opts){
    const u = typeof url === "string" ? url : (url && url.url) || "";
    if(isLegacyMusic(u)){
      console.warn("⛔ Blocked legacy fetch:", u);
      return Promise.resolve(new Response(JSON.stringify({ ok:true, blocked:true, endpoint:u }), {
        status:200,
        headers:{ "Content-Type":"application/json" }
      }));
    }
    return origFetch.apply(this, arguments);
  };

  // --- Block XHR ---
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url){
    this.__tsmBlockedMusic = false;
    if(isLegacyMusic(url)){
      console.warn("⛔ Blocked legacy XHR:", url);
      this.__tsmBlockedMusic = true;
      this.__tsmBlockedUrl = url;
    }
    return origOpen.apply(this, arguments);
  };

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(){
    if(this.__tsmBlockedMusic){
      try{
        Object.defineProperty(this, "readyState", { value:4 });
        Object.defineProperty(this, "status", { value:200 });
        Object.defineProperty(this, "responseText", { value:JSON.stringify({ok:true,blocked:true,endpoint:this.__tsmBlockedUrl}) });
        Object.defineProperty(this, "response", { value:JSON.stringify({ok:true,blocked:true,endpoint:this.__tsmBlockedUrl}) });
      }catch(e){}
      if(typeof this.onreadystatechange === "function") this.onreadystatechange();
      if(typeof this.onload === "function") this.onload();
      return;
    }
    return origSend.apply(this, arguments);
  };
})();

(function(){
  if(window.__TSM_FORCE_AGENT_PASS__) return;
  window.__TSM_FORCE_AGENT_PASS__ = true;

  console.log("🔥 FORCE AGENT PASS ACTIVE");

  function findOutput(){
    return document.querySelector('.agent-output, #agent-output, #agentOutput, #output, #ai-output, #zay-output, #producer-output, [class*=output], [id*=output]');
  }

  function findDraft(){
    const fields = Array.from(document.querySelectorAll('textarea, input'))
      .filter(el => !/file|search|password/i.test(el.type || ''));
    const filled = fields.find(el => (el.value || '').trim().length > 10);
    return filled ? filled.value.trim() : "";
  }

  function format(text){
    return String(text || "")
      .replace(/HOOK:/g, '<div style="color:#00ffc6;font-weight:900;margin-top:12px;">HOOK</div>')
      .replace(/ADLIBS:/g, '<div style="color:#ff9d00;font-weight:900;margin-top:12px;">ADLIBS</div>')
      .replace(/BRIDGE:/g, '<div style="color:#9fe7ff;font-weight:900;margin-top:12px;">BRIDGE</div>')
      .replace(/PRODUCER NOTE:/g, '<div style="color:#ffc400;font-weight:900;margin-top:12px;">PRODUCER NOTE</div>')
      .replace(/\n/g, '<br>');
  }

  async function runZayFullPass(){
    const draft = findDraft() || "Grindin' n Slavin' while Misbavin'! Feelin' so Fresh n So Clean even Missed on Shavin'! Some look at the Hustle! n Cant Stand the Struggle, Those Real in the Field see A Time for Muscle! I Plan for Greatest! Rule 1: No Fakeness! Real is What You FEEL! That's Pill! So Take This!";
    let out = findOutput();

    if(!out){
      out = document.createElement('div');
      out.className = 'agent-output';
      out.style.cssText = 'margin:16px;padding:16px;border:1px solid rgba(0,255,198,.25);border-radius:12px;background:rgba(255,255,255,.04);color:#eaffff;font-family:ui-monospace,Menlo,monospace;line-height:1.55;';
      (document.querySelector('main,.workspace,.content') || document.body).appendChild(out);
    }

    out.innerHTML = '<div style="color:#00ffc6;font-weight:900;">ZAY building full producer pass...</div>';

    try{
      const res = await fetch('https://tsm-consultz.fly.dev/api/music/agent-pass', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          agent:'ZAY',
          step:'Full Producer Pass',
          draft,
          message:'Return HOOK, ADLIBS, BRIDGE, PRODUCER NOTE.'
        })
      });

      const data = await res.json();
      const text = data.reply || data.content || 'No response';

      out.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid rgba(255,255,255,.1);padding-bottom:8px;">
          <div style="color:#00ffc6;font-weight:900;letter-spacing:1px;">ZAY PRODUCER OUTPUT</div>
          <div style="color:#6ef3c5;font-size:11px;">LIVE</div>
        </div>
        <div style="white-space:normal;color:#eaffff;font-size:13px;line-height:1.6;">
          ${format(text)}
        </div>
      `;

      out.scrollIntoView({behavior:'smooth', block:'center'});
      window.__TSM_LAST_ZAY_PASS__ = data;
    }catch(e){
      out.innerHTML = '<div style="color:#ff4d6d;">Producer pass failed: '+e.message+'</div>';
    }
  }

  window.runZAYProducerPass = runZayFullPass;

  document.addEventListener('click', function(e){
    const btn = e.target.closest('button, a, [role=button]');
    if(!btn) return;
    const txt = (btn.innerText || btn.textContent || '').toLowerCase();

    if(txt.includes('full producer pass') || txt.includes('producer pass')){
      e.preventDefault();
      e.stopPropagation();
      runZayFullPass();
    }
  }, true);

  function addButton(){
    if(document.getElementById('zayFullProducerPassBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'zayFullProducerPassBtn';
    btn.textContent = '🎛 Full Producer Pass';
    btn.style.cssText = 'position:fixed;right:18px;bottom:58px;z-index:99999;background:#00ffc6;color:#001;border:0;border-radius:10px;padding:10px 14px;font-weight:900;box-shadow:0 0 18px rgba(0,255,198,.25);cursor:pointer;';
    btn.onclick = runZayFullPass;
    document.body.appendChild(btn);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton);
  else addButton();
})();
