// decisions-store.js
// Same pattern as events-store.js: JSON file for now, swap for real DB later.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DECISIONS_FILE = path.join(DATA_DIR, 'decisions.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DECISIONS_FILE)) fs.writeFileSync(DECISIONS_FILE, '[]');
}

function loadAll() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DECISIONS_FILE, 'utf8'));
}

function saveAll(decisions) {
  fs.writeFileSync(DECISIONS_FILE, JSON.stringify(decisions, null, 2));
}

function saveDecision(decision) {
  const decisions = loadAll();
  const stored = {
    decision_id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    ...decision
  };
  decisions.push(stored);
  saveAll(decisions);
  return stored;
}

/**
 * Record whether a human reviewer confirmed a decision was correct.
 * This is what lets historicalPrecision in confidence.js actually improve
 * over time instead of being a permanent guess.
 */
function recordReviewOutcome(decision_id, wasCorrect) {
  const decisions = loadAll();
  const idx = decisions.findIndex(d => d.decision_id === decision_id);
  if (idx === -1) return null;
  decisions[idx].review_outcome = wasCorrect;
  decisions[idx].reviewed_at = new Date().toISOString();
  saveAll(decisions);
  return decisions[idx];
}

/**
 * Historical precision for a given rule_id: fraction of reviewed decisions
 * from that rule that were confirmed correct. Defaults to a conservative
 * 0.6 until there are at least 5 reviewed outcomes.
 */
function getHistoricalPrecision(rule_id) {
  const decisions = loadAll().filter(d => d.rule_id === rule_id && typeof d.review_outcome === 'boolean');
  if (decisions.length < 5) return 0.6;
  const correct = decisions.filter(d => d.review_outcome === true).length;
  return Math.round((correct / decisions.length) * 100) / 100;
}

module.exports = { saveDecision, recordReviewOutcome, getHistoricalPrecision, loadAll };
