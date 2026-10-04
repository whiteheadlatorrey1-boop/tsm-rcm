'use strict';
// Renders one simulation as a single self-contained HTML page (no server needed).
const { getWeightedBlueprint } = require('./weighted-blueprints');

// JSON that is safe to embed inside a <script> block.
function safeJson(o) {
  return JSON.stringify(o)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

const PAGE = String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CSA practice simulation</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#0f172a;color:#e2e8f0;font:16px/1.5 system-ui,sans-serif}
#app{max-width:820px;margin:0 auto;padding:16px}
.card{background:#1e293b;border-radius:10px;padding:16px;margin:12px 0}
.bar{display:flex;justify-content:space-between;gap:8px;position:sticky;top:0;background:#0f172a;padding:8px 0;font-weight:600;z-index:2}
.dom,.mut{color:#94a3b8;font-size:14px}
.stem{font-size:18px;margin:8px 0 12px}
.opt{display:block;padding:10px 12px;margin:6px 0;border:1px solid #334155;border-radius:8px;cursor:pointer}
.opt.on{border-color:#38bdf8;background:#0c4a6e}
.opt input{margin-right:8px}
button{background:#334155;color:#e2e8f0;border:0;border-radius:8px;padding:10px 14px;font:inherit;cursor:pointer}
button:disabled{opacity:.4;cursor:default}
button.sub{background:#0284c7}
.nav{display:flex;gap:8px;flex-wrap:wrap}
.grid{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.g{width:42px;padding:8px 0;text-align:center}
.g.a{background:#166534}
.g.c{outline:2px solid #38bdf8}
.warn{background:#78350f;color:#fde68a;border-radius:8px;padding:10px 12px;margin:12px 0}
.good{background:#14532d;color:#bbf7d0;border-radius:8px;padding:10px 12px;margin:12px 0}
.ok{color:#4ade80}
.bad{color:#f87171}
table{width:100%;border-collapse:collapse}
td,th{text-align:left;padding:6px;border-bottom:1px solid #334155}
textarea{width:100%;height:150px;background:#0b1220;color:#e2e8f0;border:1px solid #334155;border-radius:8px;font:12px monospace}
</style></head><body><div id="app"></div>
<script>
var DATA = __DATA__;
(function () {
  var D = DATA, items = D.items, N = items.length, LIMIT = D.minutes * 60;
  var KEY = 'csa-sim-' + D.seed;
  var st = { ans: {}, idx: 0, start: null, done: false, secs: 0 };
  var app = document.getElementById('app');
  try { var s0 = localStorage.getItem(KEY); if (s0) { var o0 = JSON.parse(s0); if (o0 && o0.ans) { st = o0; } } } catch (e0) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e1) {} }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function elapsed() { return Math.floor((Date.now() - st.start) / 1000); }
  function fmt(s) { return Math.floor(s / 60) + 'm ' + (s % 60) + 's'; }
  function domName(id) { for (var i = 0; i < D.domains.length; i++) { if (D.domains[i].id === id) { return D.domains[i].name; } } return id; }
  function answered() { var n = 0; items.forEach(function (x) { if ((st.ans[x.qid] || []).length) { n++; } }); return n; }
  function unrev() { return items.filter(function (x) { return !x.reviewed; }).length; }
  function banner() {
    var u = unrev();
    if (u > 0) { return '<div class="warn"><b>PRACTICE ONLY.</b> ' + u + ' of ' + N + ' questions have not been reviewed by a person. This run will not count toward readiness, and its results for those questions are not used as evidence.</div>'; }
    return '<div class="good">All ' + N + ' questions in this run are reviewed. A full run finished within the time limit can count toward readiness once you record it.</div>';
  }
  function grade() {
    var correct = 0, by = {}, wrong = [];
    items.forEach(function (it) {
      var sel = (st.ans[it.qid] || []).slice().sort(function (a, b) { return a - b; });
      var ok = sel.length === it.correct.length && sel.every(function (v, i) { return v === it.correct[i]; });
      var d = by[it.domainId] || (by[it.domainId] = { c: 0, t: 0 });
      d.t++;
      if (ok) { d.c++; correct++; } else { wrong.push({ it: it, sel: sel }); }
    });
    return { correct: correct, by: by, wrong: wrong, score: Math.round(correct / N * 10000) / 100 };
  }
  function startView() {
    return '<h1>CSA practice simulation</h1><div class="card"><p>' + N + ' questions, ' + D.minutes + ' minutes, drawn by exam weight. The timer starts when you press Start and cannot be paused. Your answers are kept in this browser if you reload.</p><p class="mut">Run ID (seed): ' + D.seed + '</p></div>' + banner() + '<button class="sub" data-a="start">Start</button>';
  }
  function qView() {
    var it = items[st.idx], sel = st.ans[it.qid] || [];
    var h = '<div class="bar"><span>Question ' + (st.idx + 1) + ' of ' + N + '</span><span id="timer"></span><span>Answered ' + answered() + '/' + N + '</span></div>';
    h += '<div class="card"><div class="dom">' + esc(domName(it.domainId)) + (it.type === 'multi' ? ' - select all that apply' : '') + '</div><p class="stem">' + esc(it.stem) + '</p>';
    it.options.forEach(function (o, i) {
      var on = sel.indexOf(i) >= 0;
      h += '<label class="opt' + (on ? ' on' : '') + '"><input type="' + (it.type === 'multi' ? 'checkbox' : 'radio') + '" name="o" data-i="' + i + '"' + (on ? ' checked' : '') + '>' + esc(o) + '</label>';
    });
    h += '</div><div class="nav"><button data-a="prev"' + (st.idx === 0 ? ' disabled' : '') + '>Previous</button><button data-a="next"' + (st.idx === N - 1 ? ' disabled' : '') + '>Next</button><button class="sub" data-a="submit">Submit exam</button></div><div class="grid">';
    items.forEach(function (x, i) {
      var a = (st.ans[x.qid] || []).length > 0;
      h += '<button class="g' + (a ? ' a' : '') + (i === st.idx ? ' c' : '') + '" data-a="go" data-i="' + i + '">' + (i + 1) + '</button>';
    });
    return h + '</div>';
  }
  function resultView() {
    var g = grade();
    var h = '<h1>Result (provisional)</h1><div class="card"><p style="font-size:28px;margin:0"><b>' + g.score + '%</b> <span class="mut">' + g.correct + ' of ' + N + ' correct, ' + fmt(st.secs) + ' used of ' + D.minutes + ' minutes</span></p></div>' + banner();
    h += '<div class="card"><table><tr><th>Domain</th><th>Weight</th><th>Correct</th><th>Score</th></tr>';
    D.domains.forEach(function (d) {
      var r = g.by[d.id] || { c: 0, t: 0 };
      h += '<tr><td>' + esc(d.name) + '</td><td>' + d.weight + '%</td><td>' + r.c + '/' + r.t + '</td><td>' + (r.t ? Math.round(r.c / r.t * 100) : 0) + '%</td></tr>';
    });
    h += '</table></div>';
    var rec = { v: 1, blueprintId: D.blueprintId, seed: D.seed, minutes: Math.max(0.01, Math.round(st.secs / 60 * 100) / 100), answers: st.ans };
    var NL = String.fromCharCode(10);
    var cmd = 'node scripts/csa-record.js <<' + "'EOF'" + NL + JSON.stringify(rec) + NL + 'EOF';
    h += '<div class="card"><b>Record this run</b><p class="mut">This score is provisional. To count it, paste the command below into the Sprite terminal from ~/tsm-rcm. The terminal regrades it with the official grader.</p><textarea id="cmd" readonly>' + esc(cmd) + '</textarea><p><button data-a="copy">Copy command</button></p></div>';
    h += '<h2>Missed questions (' + g.wrong.length + ')</h2>';
    g.wrong.forEach(function (w) {
      var mine = w.sel.map(function (i) { return w.it.options[i]; }).join('; ') || 'no answer';
      var right = w.it.correct.map(function (i) { return w.it.options[i]; }).join('; ');
      h += '<div class="card"><div class="dom">' + esc(domName(w.it.domainId)) + '</div><p>' + esc(w.it.stem) + '</p><p class="bad">Your answer: ' + esc(mine) + '</p><p class="ok">Correct: ' + esc(right) + '</p></div>';
    });
    return h;
  }
  function tick() {
    if (!st.start || st.done) { return; }
    var left = LIMIT - elapsed();
    if (left <= 0) { finish(); return; }
    var el = document.getElementById('timer');
    if (el) { el.textContent = pad(Math.floor(left / 60)) + ':' + pad(left % 60) + ' left'; }
  }
  function render() {
    app.innerHTML = st.done ? resultView() : (!st.start ? startView() : qView());
    tick();
  }
  function finish() { st.secs = Math.min(elapsed(), LIMIT); st.done = true; save(); render(); }
  app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-a]');
    if (!t || t.disabled) { return; }
    var a = t.getAttribute('data-a');
    if (a === 'start') { st.start = Date.now(); save(); render(); }
    else if (a === 'prev' && st.idx > 0) { st.idx--; save(); render(); }
    else if (a === 'next' && st.idx < N - 1) { st.idx++; save(); render(); }
    else if (a === 'go') { st.idx = Number(t.getAttribute('data-i')); save(); render(); }
    else if (a === 'submit') {
      var left = N - answered();
      if (window.confirm(left ? left + ' questions are unanswered and will count as wrong. Submit anyway?' : 'Submit your exam?')) { finish(); }
    }
    else if (a === 'copy') {
      var ta = document.getElementById('cmd');
      ta.select();
      try { document.execCommand('copy'); } catch (e2) {}
    }
  });
  app.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name !== 'o' || st.done) { return; }
    var it = items[st.idx], i = Number(t.getAttribute('data-i'));
    if (it.type === 'multi') {
      var s = (st.ans[it.qid] || []).slice(), p = s.indexOf(i);
      if (t.checked) { if (p < 0) { s.push(i); } } else if (p >= 0) { s.splice(p, 1); }
      s.sort(function (x, y) { return x - y; });
      st.ans[it.qid] = s;
    } else {
      st.ans[it.qid] = [i];
    }
    save(); render();
  });
  setInterval(tick, 1000);
  render();
})();
</script></body></html>
`;

function renderSimulationPage(sim) {
  const bp = getWeightedBlueprint(sim.blueprintId);
  const data = {
    blueprintId: sim.blueprintId, seed: sim.seed, minutes: sim.minutes, title: bp.name,
    domains: bp.domains.map((d) => ({ id: d.id, name: d.name, weight: d.weight })),
    items: sim.items,
  };
  const json = safeJson(data);
  return PAGE.replace('__DATA__', () => json);
}

module.exports = { renderSimulationPage, safeJson };
