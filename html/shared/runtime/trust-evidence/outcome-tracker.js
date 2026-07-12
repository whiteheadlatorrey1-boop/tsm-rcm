/**
 * outcome-tracker.js
 *
 * Closes the loop: "what happened after TSM decided this?" Outcomes are
 * attached back onto the originating evidence record so accuracy / impact
 * can eventually be measured per rule, per domain, per confidence band --
 * this is the raw data the existing Quality Score Engine can be extended
 * to consume, without this layer needing to know anything about scoring.
 */

const VALID_RESULTS = ['confirmed', 'reversed', 'partial', 'unknown'];

function logOutcome(evidenceLedger, recordId, opts) {
  if (VALID_RESULTS.indexOf(opts.result) === -1) {
    throw new Error('Invalid outcome result: ' + opts.result);
  }
  return evidenceLedger.attachOutcome(recordId, {
    result: opts.result,
    impact: opts.impact != null ? opts.impact : null,
    notes: opts.notes || '',
  });
}

function outcomeSummary(evidenceLedger, domain) {
  const records = evidenceLedger.getByDomain(domain, 100000);
  const tally = { confirmed: 0, reversed: 0, partial: 0, unknown: 0, noOutcomeYet: 0 };

  records.forEach(function (r) {
    if (!r.outcomes.length) {
      tally.noOutcomeYet += 1;
      return;
    }
    const latest = r.outcomes[r.outcomes.length - 1];
    tally[latest.result] = (tally[latest.result] || 0) + 1;
  });

  const decided = records.length - tally.noOutcomeYet;
  const accuracy = decided > 0 ? tally.confirmed / decided : null;

  return Object.assign({ domain: domain, total: records.length, accuracy: accuracy }, tally);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { logOutcome: logOutcome, outcomeSummary: outcomeSummary };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.outcomeTracker = { logOutcome: logOutcome, outcomeSummary: outcomeSummary };
}
