/* Phase 8C — Match explainability. Pure, deterministic, unwired.
   Turns an 8B match result (or an 8B-2 proxy result) into plain-language
   explanations per requirement plus an overview. No ranking, no overall score,
   no recommendation. Does not import any other module. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.TSMMatchExplainer = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';

  function pct(x) { return Math.round(x * 100) + '%'; }
  function pts(x) { return Math.round(x * 100) + ' point' + (Math.round(x * 100) === 1 ? '' : 's'); }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }

  function explainRequirement(r) {
    r = r || {};
    var label = r.rawText || r.competencyRef || r.requirementId || 'requirement';
    var headline, detail;
    var req = isNum(r.requiredLevel) ? pct(r.requiredLevel) : null;

    if (r.status === 'met') {
      headline = 'Met';
      detail = 'Meets the required level (candidate ' + pct(r.candidateScore) + ', required ' + req + ').';
    } else if (r.status === 'gap') {
      headline = 'Gap';
      detail = 'Below the required level by ' + pts(r.gap) + ' (candidate ' + pct(r.candidateScore) + ', required ' + req + ').';
    } else if (r.status === 'present') {
      headline = 'Present';
      detail = 'Candidate has a recorded score of ' + pct(r.candidateScore) + '; the job specifies no required level.';
    } else if (r.status === 'no-candidate-data') {
      headline = 'No data';
      detail = 'No competency-level data is recorded for this candidate. This is not a zero score.';
    } else if (r.status === 'dimension-proxy') {
      headline = 'Dimension-level indicator only';
      detail = 'Indicator from ' + r.proxyDimension + ' (' + pct(r.candidateScore) + ')' +
        (isNum(r.gap) && r.gap > 0 && req ? ', ' + pts(r.gap) + ' below the required ' + req : '') +
        '. Not competency evidence. Internal use only.';
    } else {
      headline = 'Not mapped';
      detail = 'This requirement does not map to a known competency and was not scored.';
    }

    var support = Array.isArray(r.supportingEvidence) ? r.supportingEvidence : [];
    var evidenceNote = support.length
      ? support.length + ' supporting evidence record' + (support.length === 1 ? '' : 's') +
        ' (' + support.filter(function (e) { return e && e.verified === true; }).length + ' marked verified).'
      : null;

    return Object.freeze({
      requirementId: r.requirementId === undefined ? null : r.requirementId,
      label: label,
      necessity: r.necessity || null,
      status: r.status,
      headline: headline,
      detail: detail,
      evidenceNote: evidenceNote
    });
  }

  function explainMatch(result) {
    if (!result || typeof result !== 'object' || typeof result.jobId !== 'string' || !Array.isArray(result.requirements)) {
      throw new Error('match result required');
    }
    var items = result.requirements.map(explainRequirement);
    var count = function (s) { return items.filter(function (x) { return x.status === s; }).length; };
    var unmapped = items.filter(function (x) {
      return ['met', 'gap', 'present', 'no-candidate-data', 'dimension-proxy'].indexOf(x.status) === -1;
    }).length;
    var attention = items.filter(function (x) {
      return x.necessity === 'required' && (x.status === 'gap' || x.status === 'no-candidate-data' || x.status === 'dimension-proxy');
    }).map(function (x) { return x.requirementId; });

    var o = {
      evaluated: items.length,
      met: count('met'),
      present: count('present'),
      gap: count('gap'),
      noCandidateData: count('no-candidate-data'),
      dimensionProxy: count('dimension-proxy'),
      unmapped: unmapped,
      unspecifiedNecessity: items.filter(function (x) { return x.necessity === null; }).length,
      requiredAttention: Object.freeze(attention)
    };

    var lines = [];
    lines.push(o.evaluated + ' requirement' + (o.evaluated === 1 ? '' : 's') + ' evaluated: ' +
      o.met + ' met, ' + o.present + ' present, ' + o.gap + ' with a gap, ' +
      o.noCandidateData + ' with no candidate data, ' + o.dimensionProxy + ' dimension-level only, ' +
      o.unmapped + ' not mapped.');
    if (attention.length) lines.push('Required requirements needing attention: ' + attention.join(', ') + '.');
    if (o.dimensionProxy) lines.push('Dimension-level indicators are not competency evidence and are for internal use only.');
    if (o.unspecifiedNecessity) lines.push(o.unspecifiedNecessity + ' requirement' + (o.unspecifiedNecessity === 1 ? ' has' : 's have') + ' no stated necessity.');
    lines.push('Human review is required. This explanation is not a hiring decision.');
    o.lines = Object.freeze(lines);

    return Object.freeze({
      explainerVersion: VERSION,
      jobId: result.jobId,
      candidateId: result.candidateId === undefined ? null : result.candidateId,
      employerFacing: result.employerFacing === false ? false : null,
      requirements: Object.freeze(items),
      overview: Object.freeze(o),
      review: Object.freeze({ humanReviewRequired: true, automatedDecision: false })
    });
  }

  return { VERSION: VERSION, explainMatch: explainMatch };
}));
