'use strict';
// Adapts the reviewed certification question banks (server/certification/
// question-banks/*.json) to the shape the Training Intelligence engine serves.
// Only reviewed, single-answer questions are exposed; multi-answer questions
// are skipped because the engine grades one correct choice per question.
const fs = require('fs');
const path = require('path');

const BANKS = {
  'servicenow-csa': {
    file: path.join(__dirname, 'certification', 'question-banks', 'servicenow-csa-2026.json'),
    domainMap: {
      'platform-nav': 'platform-overview-navigation',
      'instance-config': 'instance-configuration',
      'collaboration': 'configuring-applications-collaboration',
      'self-service-automation': 'self-service-automation',
      'database-security': 'database-management-platform-security',
      'migration-integration': 'data-migration-integration'
    }
  }
};

function convertQuestion(q, domainMap) {
  if (!q || q.reviewed !== true || q.type !== 'single') return null;
  const domainId = domainMap[q.domainId];
  if (!domainId || typeof q.stem !== 'string' || !Array.isArray(q.options)) return null;
  if (!Array.isArray(q.correct) || q.correct.length !== 1) return null;
  const correctIdx = q.correct[0];
  if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx >= q.options.length) return null;
  const ids = 'abcdefghij';
  return {
    id: 'cert-' + q.id,
    domainId,
    question: q.stem,
    source: 'certification-bank',
    choices: q.options.map((text, i) => ({
      id: ids[i],
      text: String(text),
      correct: i === correctIdx,
      explanation: i === correctIdx ? (q.explanation || null) : null,
      knowledge: []
    }))
  };
}

function extraQuestions(providerId) {
  const cfg = BANKS[providerId];
  if (!cfg || !fs.existsSync(cfg.file)) return [];
  try {
    const src = JSON.parse(fs.readFileSync(cfg.file, 'utf8'));
    return (src.questions || []).map(q => convertQuestion(q, cfg.domainMap)).filter(Boolean);
  } catch {
    return [];
  }
}

module.exports = { extraQuestions, convertQuestion, BANKS };
