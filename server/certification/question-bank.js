'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'question-banks');

function bankFile(id, dir) { return path.join(dir || DIR, id + '.json'); }

// Every question defaults to unreviewed. Only markReviewed() changes that.
function loadBank(id, dir) {
  const raw = JSON.parse(fs.readFileSync(bankFile(id, dir), 'utf8'));
  return raw.questions.map((q) => Object.assign({ reviewed: false, reviewedBy: null }, q));
}

function writeBank(file, raw) {
  const body = raw.questions.map((q) => JSON.stringify(q)).join(',\n');
  fs.writeFileSync(file, '{"blueprintId":' + JSON.stringify(raw.blueprintId) + ',"questions":[\n' + body + '\n]}\n');
}

function markReviewed(id, questionId, reviewer, dir) {
  const name = String(reviewer || '').trim();
  if (!name) throw new Error('reviewer name required');
  const file = bankFile(id, dir);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const q = raw.questions.find((x) => x.id === questionId);
  if (!q) throw new Error('Unknown question: ' + questionId);
  q.reviewed = true; q.reviewedBy = name; q.reviewedAt = new Date().toISOString();
  writeBank(file, raw);
  return q;
}

function validateBank(questions, blueprint) {
  const problems = [];
  const ids = new Set();
  const domainIds = new Set(blueprint.domains.map((d) => d.id));
  (questions || []).forEach((q) => {
    const tag = q && q.id ? q.id : '(no id)';
    if (!q || !q.id) problems.push('question without id');
    else if (ids.has(q.id)) problems.push(tag + ': duplicate id');
    else ids.add(q.id);
    if (!q) return;
    if (!domainIds.has(q.domainId)) problems.push(tag + ': unknown domain ' + q.domainId);
    if (!q.stem || !String(q.stem).trim()) problems.push(tag + ': empty stem');
    if (!Array.isArray(q.options) || q.options.length < 3) problems.push(tag + ': needs at least 3 options');
    else if (new Set(q.options).size !== q.options.length) problems.push(tag + ': duplicate options');
    const ok = Array.isArray(q.correct) && q.correct.length > 0 && Array.isArray(q.options) &&
      q.correct.every((c) => Number.isInteger(c) && c >= 0 && c < q.options.length) && new Set(q.correct).size === q.correct.length;
    if (!ok) problems.push(tag + ': bad correct indexes');
    else if (q.type === 'single' && q.correct.length !== 1) problems.push(tag + ': single needs exactly 1 correct');
    else if (q.type === 'multi' && q.correct.length < 2) problems.push(tag + ': multi needs 2+ correct');
    if (q.type !== 'single' && q.type !== 'multi') problems.push(tag + ': type must be single or multi');
    if (!q.explanation || !String(q.explanation).trim()) problems.push(tag + ': missing explanation');
  });
  return problems;
}

module.exports = { loadBank, markReviewed, validateBank, bankFile };
