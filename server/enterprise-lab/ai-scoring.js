'use strict';

/**
 * AI Scoring Engine
 * NOTE: this is a deterministic weighted-heuristic risk model based on
 * SLA proximity and breach status — not a literal trained ML model. Same
 * class of scoring you'd see in real ITSM tools (priority matrices), just
 * transparent about what's under the hood.
 */

const MODULE_WEIGHT = {
  ad: 1.2,
  m365: 1.0,
  network: 1.3,
  vmware: 1.3,
  vendor: 0.8,
};

const STATUS_BASE = {
  'on-track': 20,
  'at-risk': 60,
  'breached': 90,
};

class AIScoringEngine {
  constructor(slaEngine) {
    this.slaEngine = slaEngine;
  }

  _scoreIssue(issue) {
    const base = STATUS_BASE[issue.status] || 20;
    const proximity = Math.min(issue.hoursElapsed / issue.slaHours, 1.5);
    const proximityPoints = proximity * 15;
    const weight = MODULE_WEIGHT[issue.module] || 1.0;
    const raw = (base + proximityPoints) * weight;
    const riskScore = Math.max(0, Math.min(100, Math.round(raw)));
    const riskTier = riskScore >= 80 ? 'critical' : riskScore >= 50 ? 'elevated' : 'normal';
    return { ...issue, riskScore, riskTier };
  }

  score() {
    return this.slaEngine.evaluate().map((issue) => this._scoreIssue(issue));
  }

  summary() {
    const scored = this.score();
    const summary = { critical: 0, elevated: 0, normal: 0, avgScore: 0, total: scored.length };
    if (!scored.length) return summary;
    let total = 0;
    for (const s of scored) {
      total += s.riskScore;
      summary[s.riskTier] += 1;
    }
    summary.avgScore = Number((total / scored.length).toFixed(1));
    return summary;
  }
}

module.exports = { AIScoringEngine };
