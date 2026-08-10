(function(){
  const D = window.PRESENTATION_DATA;
  if(!D){ document.body.innerHTML = '<p style="color:#f87171;font-family:monospace;padding:40px">No PRESENTATION_DATA found.</p>'; return; }

  const IMG_ROOT = '/demo-screenshots/' + D.folder + '/';
  const steps = D.steps;
  let idx = 0;

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    document.title = D.title + ' — TSM Demo';
    render();
    document.addEventListener('keydown', (e)=>{
      if(e.key === 'ArrowRight' || e.key === ' '){ e.preventDefault(); go(idx+1); }
      if(e.key === 'ArrowLeft'){ e.preventDefault(); go(idx-1); }
    });
  }

  function go(n){
    if(n < 0) n = 0;
    if(n > steps.length) n = steps.length; // steps.length index == closing slide
    idx = n;
    render();
  }

  function render(){
    const root = document.getElementById('app');
    const isClosing = idx === steps.length;

    let body;
    if(isClosing){
      body = `
        <div class="closing">
          <div class="step-eyebrow">THE CLOSE</div>
          <div class="big">${escapeHtml(D.cta)}</div>
          <div class="small">${D.title.toUpperCase()} · READY TO PILOT ON YOUR DATA</div>
        </div>`;
    } else {
      const s = steps[idx];
      const imgSrc = IMG_ROOT + s.shot + '.png';
      body = `
        <div class="deck-body">
          <div class="shot-pane" id="shotPane">
            <div class="wow-badge ${s.wow ? 'show':''}">✨ WOW MOMENT</div>
            <img src="${imgSrc}" alt="${escapeHtml(s.caption)}"
                 onerror="this.style.display='none';document.getElementById('shotMissing').style.display='block'">
            <div class="shot-missing" id="shotMissing" style="display:none">
              Screenshot not found.<br>
              Run <b>npm run test:e2e -- ${D.folder}</b> in Codespaces first,<br>
              then reload this page.<br><br>
              Expected: <b>/demo-screenshots/${D.folder}/${s.shot}.png</b>
            </div>
          </div>
          <div class="talk-pane">
            <div class="step-eyebrow">STEP ${idx+1} OF ${steps.length}${s.wow ? ' · WOW MOMENT':''}</div>
            <div class="step-caption">${escapeHtml(s.caption || D.title)}</div>
            <div class="step-talk ${s.wow?'wow-text':''}">${escapeHtml(s.talk)}</div>
            <div class="cta-box"><b>PAIN POINT</b>${escapeHtml(D.painPoint)}</div>
          </div>
        </div>`;
    }

    root.innerHTML = `
      <div class="deck">
        <div class="deck-hdr">
          <div>
            <div class="brand">TSM CONSULTZ · LIVE DEMO</div>
            <h1>${escapeHtml(D.title)}</h1>
            <div class="tagline">${escapeHtml(D.tagline)}</div>
          </div>
          <div class="counter">${isClosing ? 'CLOSE' : (idx+1) + ' / ' + steps.length}</div>
        </div>
        ${body}
        <div class="deck-ftr">
          <button class="nav-btn" id="prevBtn" ${idx===0?'disabled':''}>&larr; Prev</button>
          <div class="dots" id="dots"></div>
          <button class="nav-btn" id="nextBtn" ${isClosing?'disabled':''}>Next &rarr;</button>
          <div class="hint">←/→ or click image to advance</div>
        </div>
      </div>`;

    const dotsEl = document.getElementById('dots');
    steps.forEach((s,i)=>{
      const d = document.createElement('div');
      d.className = 'dot' + (s.wow?' wow':'') + (i===idx?' active':'');
      d.title = s.caption || ('Step ' + (i+1));
      d.onclick = ()=>go(i);
      dotsEl.appendChild(d);
    });
    const closeDot = document.createElement('div');
    closeDot.className = 'dot' + (isClosing?' active':'');
    closeDot.style.background = '#e8b84b55';
    closeDot.title = 'Close';
    closeDot.onclick = ()=>go(steps.length);
    dotsEl.appendChild(closeDot);

    document.getElementById('prevBtn').onclick = ()=>go(idx-1);
    document.getElementById('nextBtn').onclick = ()=>go(idx+1);
    const shotPane = document.getElementById('shotPane');
    if(shotPane) shotPane.onclick = ()=>go(idx+1);
  }

  function escapeHtml(str){
    if(!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
})();
