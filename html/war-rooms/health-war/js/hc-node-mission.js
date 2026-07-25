window.addEventListener('load', function () {
  const node = (window.location.pathname.split('/').find(p => p.startsWith('hc-')) || '').replace('hc-', '');
  if (!node) return;
  const activeMission =
  JSON.parse(
    localStorage.getItem(
      'tsm_active_mission'
    ) || 'null'
  );

if(!activeMission) return;

const objectives = {};

activeMission.progression_steps
  .forEach((step,i)=>{

    objectives[i] = {

      node,

      instruction: step.detail,

      success:
        step.label + ' complete',

      learn:
        'Mission progress updated',

      action:{
        label:'COMPLETE STEP'
      },

      fields:[
  {
    label:'Status',
    value:step.status,
    editable:false
  },
  {
    label:'Next Action',
    value:step.hint || 'Review and complete this step.',
    editable:false
  }
]

    };

});
  
  const steps = Object.entries(objectives).filter(([, o]) => o.node === node);
  if (!steps.length) return;
  let html = `
    <div id="tsm-mission" style="margin-top:16px;border-top:1px solid #0f4;padding-top:12px;">
      <div style="font-size:10px;letter-spacing:2px;color:#0f4;margin-bottom:8px;">MISSION OBJECTIVES · ${node.toUpperCase()}</div>
  `;
  steps.forEach(([idx, obj], i) => {
    html += `
      <div id="ms-${idx}" style="background:#0a1a0a;border:1px solid #1a3a1a;border-radius:4px;padding:10px;margin-bottom:8px;${i > 0 ? 'opacity:0.4;pointer-events:none;' : ''}">
        <div style="font-size:10px;color:#888;margin-bottom:4px;">STEP ${+idx + 1} OF ${steps.length}</div>
        <div style="font-size:12px;color:#ccc;margin-bottom:8px;">${obj.instruction}</div>
        ${obj.fields.map(f => `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:11px;color:#888;">${f.label}</span>
            ${f.editable
              ? `<input value="${f.value}" style="background:#111;border:1px solid #333;color:#0f4;font-size:11px;padding:2px 6px;width:160px;font-family:monospace;">`
              : `<span style="font-size:11px;color:#0f4;font-family:monospace;">${f.value}</span>`}
          </div>`).join('')}
        <button onclick="completeMissionStep('${idx}')" style="margin-top:8px;background:#0f4;color:#000;border:none;padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;border-radius:2px;letter-spacing:1px;">${obj.action.label}</button>
        <div id="ok-${idx}" style="display:none;margin-top:8px;font-size:11px;color:#0f4;">✓ ${obj.success}</div>
        <div id="lrn-${idx}" style="display:none;margin-top:4px;font-size:10px;color:#888;font-style:italic;">${obj.learn}</div>
      </div>`;
  });
  html += '</div>';
  const desc = document.querySelector('.hc-guide-desc');
  if (desc) desc.insertAdjacentHTML('afterend', html);
  const guide = document.querySelector('.hc-guide');
  if (guide) { guide.style.overflowY = 'auto'; guide.style.maxHeight = 'calc(100vh - 120px)'; guide.style.paddingBottom = '60px'; }
  setTimeout(() => {
    const mission = document.getElementById('tsm-mission');
    if (mission && guide) guide.scrollTop = mission.offsetTop;
  }, 200);
  document.querySelectorAll('.hc-guide-btn, .hc-guide-run').forEach(b => b.style.display = 'none');
  window.completeMissionStep = function (idx) {
    document.getElementById('ok-' + idx).style.display = 'block';
    document.getElementById('lrn-' + idx).style.display = 'block';
    document.getElementById('ms-' + idx).querySelector('button').style.display = 'none';
    const next = document.getElementById('ms-' + (+idx + 1));
    if (next) {
      next.style.opacity = '1';
      next.style.pointerEvents = 'auto';
    } else {
      const panel = document.getElementById('tsm-mission');
      const done = document.createElement('div');
      done.style.cssText = 'margin-top:12px;padding:10px;background:#001a00;border:1px solid #0f4;border-radius:4px;text-align:center;';
      done.innerHTML = `<div style="font-size:12px;color:#0f4;font-weight:700;letter-spacing:1px;">✓ MISSION COMPLETE · ${node.toUpperCase()}</div><div style="font-size:11px;color:#aaa;margin-top:4px;">All objectives resolved. Ready for BNCA or Strategist relay.</div>`;
      panel.appendChild(done);
      document.querySelectorAll('.hc-guide-btn, .hc-guide-run').forEach(b => b.style.display = '');
      const mission =
  JSON.parse(
    localStorage.getItem(
      'tsm_active_mission'
    )
  );

if(mission){

  const queue =
    JSON.parse(
      localStorage.getItem(
        'tsm_mission_queue'
      ) || '[]'
    );

  const record =
    queue.find(
      q => q.id === mission.id
    );

  if(record){

    record.progression_steps[idx]
      .status = 'complete';

    const completed =
      record.progression_steps
      .filter(
        x => x.status === 'complete'
      ).length;

    record.completion_pct =
      Math.round(
        completed /
        record.progression_steps.length
        * 100
      )

    if(
      record.completion_pct === 100
    ){
      record.status =
        'complete';
    }

    localStorage.setItem(
      'tsm_mission_queue',
      JSON.stringify(queue)
    );
  }
}
    }
  };
});