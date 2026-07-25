// ═══════════════════════════════════════════════
// TSM SHARED — Core launcher + Groq utility
// ═══════════════════════════════════════════════

window.TSM = {
  version: '2.0',
  launcher: {
    registry: {},
    register(name, fn){ this.registry[name] = fn; },
    run(action, argsStr, el){
      const fn = this.registry[action] || window[action];
      if(typeof fn === 'function'){
        try{
          const args = argsStr ? (function(){ return eval('['+argsStr+']'); }).call(el) : [];
          fn(...args);
        }catch(e){ console.warn('[TSM] Error running',action,e); }
      } else {
        console.warn('[TSM] launcher missing:',action, argsStr);
      }
    }
  }
};

// Global Groq caller
window.callGroq = async function(messages, onStream, model='openai/gpt-oss-120b'){
  const key = document.querySelector('[id*=groq],[id*=api-key]')?.value
    || localStorage.getItem('tsm_groq_key') || '';
  if(!key) throw new Error('No Groq API key');
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify({model, max_tokens:1024, messages})
  });
  const d = await r.json();
  const text = d.choices?.[0]?.message?.content || '';
  const tok = d.usage?.completion_tokens || 0;
  const spd = Math.round(tok / ((d.usage?.total_time||1)));
  if(onStream) onStream(text, tok, spd);
  return {text, tokens:tok, speed:spd};
};

// Save groq key to localStorage on input
document.addEventListener('change', e=>{
  if(e.target.id?.includes('groq') || e.target.id?.includes('Key')){
    const v = e.target.value?.trim();
    if(v) localStorage.setItem('tsm_groq_key', v);
  }
});

// TSM click dispatcher
document.addEventListener('click', e=>{
  const el = e.target.closest('[data-tsm-action]');
  if(!el) return;
  const action = el.getAttribute('data-tsm-action');
  const args = el.getAttribute('data-tsm-args') || '';
  TSM.launcher.run(action, args, el);
});

console.log('[TSM SHARED] v2.0 loaded');