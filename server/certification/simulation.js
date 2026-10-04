'use strict';
const { getWeightedBlueprint } = require('./weighted-blueprints');

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Questions per domain for an exam of `total` items, by weight (largest remainder).
function quotas(blueprint, total) {
  const rows = blueprint.domains.map((d) => { const x = d.weight * total / 100; return { id: d.id, n: Math.floor(x), frac: x - Math.floor(x), w: d.weight }; });
  let left = total - rows.reduce((s, r) => s + r.n, 0);
  rows.slice().sort((a, b) => b.frac - a.frac || b.w - a.w).forEach((r) => { if (left > 0) { r.n++; left--; } });
  const out = {};
  rows.forEach((r) => { out[r.id] = r.n; });
  return out;
}

function bankCoverage(bank, blueprint, total) {
  const q = quotas(blueprint, total || blueprint.exam.questions);
  return blueprint.domains.map((d) => {
    const mine = bank.filter((x) => x.domainId === d.id);
    return { domainId: d.id, have: mine.length, need: q[d.id], reviewed: mine.filter((x) => x.reviewed === true).length };
  });
}

// opts: { seed, questions, allowShort }
function buildSimulation(blueprintId, bank, opts) {
  const o = opts || {};
  const bp = getWeightedBlueprint(blueprintId);
  const total = o.questions || bp.exam.questions;
  const seed = Number.isFinite(o.seed) ? o.seed : Math.floor(Math.random() * 4294967296);
  const rnd = mulberry32(seed);
  const q = quotas(bp, total);
  let items = [];
  bp.domains.forEach((d) => {
    const pool = bank.filter((x) => x.domainId === d.id);
    if (pool.length < q[d.id] && !o.allowShort) throw new Error(`Question bank short in ${d.id}: ${pool.length}/${q[d.id]}`);
    shuffle(pool, rnd).slice(0, q[d.id]).forEach((x) => {
      const order = shuffle(x.options.map((_, i) => i), rnd);
      items.push({
        qid: x.id, domainId: d.id, type: x.type, stem: x.stem,
        options: order.map((i) => x.options[i]),
        correct: x.correct.map((c) => order.indexOf(c)).sort((a, b) => a - b),
        reviewed: x.reviewed === true,
      });
    });
  });
  items = shuffle(items, rnd);
  return { blueprintId, seed, total: items.length, minutes: bp.exam.minutes, items };
}

// answers: { [qid]: [selected option indexes] }. Unanswered = wrong. Multi-select is all-or-nothing.
function gradeSimulation(sim, answers, minutesUsed) {
  const a = answers && typeof answers === 'object' ? answers : {};
  const byDomain = {};
  let correct = 0;
  const domainEvidence = sim.items.map((it) => {
    const raw = Array.isArray(a[it.qid]) ? a[it.qid] : [];
    const sel = Array.from(new Set(raw.filter((n) => Number.isInteger(n)))).sort((x, y) => x - y);
    const ok = sel.length === it.correct.length && sel.every((v, i) => v === it.correct[i]);
    if (ok) correct++;
    const d = byDomain[it.domainId] || (byDomain[it.domainId] = { domainId: it.domainId, correct: 0, total: 0 });
    d.total++; if (ok) d.correct++;
    return { domainId: it.domainId, score: ok ? 100 : 0 };
  });
  const total = sim.items.length;
  const score = total ? Math.round((correct / total) * 10000) / 100 : 0;
  const domains = Object.keys(byDomain).map((k) => Object.assign({ score: Math.round((byDomain[k].correct / byDomain[k].total) * 10000) / 100 }, byDomain[k]));
  return {
    correct, total, score, domains, domainEvidence,
    simRecord: { score, questions: total, minutes: Number(minutesUsed), unreviewedQuestions: sim.items.filter((i) => !i.reviewed).length },
  };
}

module.exports = { quotas, bankCoverage, buildSimulation, gradeSimulation };
