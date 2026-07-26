// ── HC NODE GUIDE PANEL — missing function definitions (generic, all nodes) ──
var Q = runQ; // alias: Q(prompt, btnId, resId) used by guide panel buttons

function loadAI(prompt) {
  var out = document.getElementById('guide-output');
  if (!out) {
    out = document.createElement('div');
    out.id = 'guide-output';
    var guide = document.getElementById('hc-node-guide');
    if (guide) guide.appendChild(out);
  }
  runQ(prompt, null, 'guide-output');
}

function guideAction(type, step) {
  var box = document.getElementById('guide-step-' + step);
  if (box) box.classList.add('active-step');
}

function submitStep(step) {
  var box = document.getElementById('guide-step-' + step);
  var res = document.getElementById('guide-res-' + step);
  if (box) {
    box.classList.remove('active-step');
    box.classList.add('step-complete');
  }
  if (res && !res.textContent.trim()) {
    res.textContent = '✓ Step ' + step + ' submitted.';
  }
  if (step === 1) {
    var step2 = document.getElementById('guide-step-2');
    if (step2) step2.classList.add('active-step');
    var lbl = document.getElementById('guide-step-label');
    if (lbl) lbl.textContent = 'STEP 2 OF 2';
  }
  if (step === 2) {
    var lbl = document.getElementById('guide-step-label');
    if (lbl) lbl.textContent = 'STEPS COMPLETE';
    var next = document.getElementById('guide-next-actions');
    if (next) next.style.display = 'block';
  }
}

function toggleIntake(show) {
  var intake = document.getElementById('guide-intake');
  var collapseBtn = document.getElementById('intake-collapse-btn');
  var expandBtn = document.getElementById('intake-expand-btn');
  if (!intake) return;
  if (show) {
    intake.style.display = 'block';
    if (collapseBtn) collapseBtn.style.display = 'block';
    if (expandBtn) expandBtn.style.display = 'none';
  } else {
    intake.style.display = 'none';
    if (collapseBtn) collapseBtn.style.display = 'none';
    if (expandBtn) expandBtn.style.display = 'block';
  }
}

// Generic intake -> guide-meta. Works for any node: reads every input/textarea
// inside #guide-intake, uses its value or placeholder, and labels it using
// the preceding label div's text (or the input's id as fallback).
function applyPharmMission() {
  var intake = document.getElementById('guide-intake');
  var meta = document.getElementById('guide-meta');
  if (!intake || !meta) { toggleIntake(false); return; }

  var fields = intake.querySelectorAll('input, textarea');
  var parts = [];
  fields.forEach(function(el){
    var val = (el.value || el.placeholder || '').trim();
    if (!val) return;
    var label = '';
    var prev = el.previousElementSibling;
    if (prev && prev.tagName === 'DIV') label = prev.textContent.trim();
    if (!label) label = el.id;
    var color = (el.tagName === 'TEXTAREA') ? '#99cc99' : 'var(--g)';
    parts.push(label + ': <span style="color:' + color + '">' + val + '</span>');
  });
  meta.innerHTML = parts.join(' &middot; ');
  toggleIntake(false);
}

// Alias so node-specific HTML calling applyMission()/applyOpsMission() etc still works
var applyMission = applyPharmMission;
var applyOpsMission = applyPharmMission;