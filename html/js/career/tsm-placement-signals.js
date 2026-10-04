/* Phase 8G - Placement signals. Pure, deterministic, unwired.
   Reads the 8F placement_outcome stream and derives aggregate workforce
   signals: stage reach, stage-to-stage elapsed hours, terminal outcome per
   placement, and per-employer counts plus median submitted->placed hours.
   Hard boundary: no scores, no rates, no inference, and no candidateId in
   the output, so nothing here can become a per-candidate ranking or feed
   7B/7C/8D/9C readiness. Timestamps come from the records only.
   Does not import any other module. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.TSMPlacementSignals = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';
  var STREAM = 'placement_outcome';
  var STAGES = ['submitted', 'interviewing', 'offered', 'placed', 'declined', 'ended'];
  var TERMINAL = ['placed', 'declined', 'ended'];

  function isStr(x) { return typeof x === 'string' && x.length > 0; }
  function isIso(x) { return isStr(x) && !isNaN(Date.parse(x)); }
  function hoursBetween(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 36e5 * 100) / 100; }
  function median(nums) {
    if (!nums.length) { return null; }
    var s = nums.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2 * 100) / 100;
  }

  function buildPlacementSignals(records) {
    var rejected = [];
    var seen = {};
    var byPlacement = {};

    (Array.isArray(records) ? records : []).forEach(function (r, i) {
      if (!r || typeof r !== 'object' || r.stream !== STREAM || STAGES.indexOf(r.stage) === -1) {
        rejected.push({ index: i, reason: 'not-placement-evidence' }); return;
      }
      if (!isStr(r.placementId)) { rejected.push({ index: i, reason: 'placement-id-missing' }); return; }
      if (!isIso(r.occurredAt)) { rejected.push({ index: i, reason: 'timestamp-invalid', stage: r.stage }); return; }
      var key = isStr(r.placementEvidenceId) ? r.placementEvidenceId : r.placementId + '|' + r.stage + '|' + r.occurredAt;
      if (seen[key]) { rejected.push({ index: i, reason: 'duplicate-entry', stage: r.stage }); return; }
      seen[key] = true;
      (byPlacement[r.placementId] = byPlacement[r.placementId] || []).push({
        stage: r.stage,
        at: r.occurredAt,
        employerId: isStr(r.employerId) ? r.employerId : null,
        jobOrderId: isStr(r.jobOrderId) ? r.jobOrderId : null
      });
    });

    var stageReach = {};
    STAGES.forEach(function (s) { stageReach[s] = 0; });
    var employers = {};

    var placements = Object.keys(byPlacement).sort().map(function (pid) {
      var evs = byPlacement[pid].sort(function (a, b) {
        return (Date.parse(a.at) - Date.parse(b.at)) || (STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage));
      });
      var reached = {};
      var transitions = [];
      evs.forEach(function (e, i) {
        reached[e.stage] = true;
        if (i > 0) { transitions.push(Object.freeze({ from: evs[i - 1].stage, to: e.stage, hours: hoursBetween(evs[i - 1].at, e.at) })); }
      });
      Object.keys(reached).forEach(function (s) { stageReach[s] += 1; });

      var last = evs[evs.length - 1];
      var terminal = TERMINAL.indexOf(last.stage) !== -1 ? last.stage : 'open';
      var firstAt = function (s) { for (var i = 0; i < evs.length; i++) { if (evs[i].stage === s) { return evs[i].at; } } return null; };
      var sub = firstAt('submitted'), plc = firstAt('placed');
      var hoursToPlace = (sub && plc) ? hoursBetween(sub, plc) : null;
      var employerId = null, jobOrderId = null;
      evs.forEach(function (e) { employerId = employerId || e.employerId; jobOrderId = jobOrderId || e.jobOrderId; });

      var ekey = employerId || 'unassigned';
      var emp = employers[ekey] = employers[ekey] || { employerId: employerId, placements: 0, terminal: { placed: 0, declined: 0, ended: 0, open: 0 }, _hours: [] };
      emp.placements += 1;
      emp.terminal[terminal] += 1;
      if (hoursToPlace !== null) { emp._hours.push(hoursToPlace); }

      return Object.freeze({
        placementId: pid, employerId: employerId, jobOrderId: jobOrderId,
        stagesReached: Object.freeze(STAGES.filter(function (s) { return reached[s]; })),
        transitions: Object.freeze(transitions),
        terminal: terminal, hoursToPlace: hoursToPlace
      });
    });

    var employerList = Object.keys(employers).sort().map(function (k) {
      var e = employers[k];
      return Object.freeze({
        employerId: e.employerId, placements: e.placements, terminal: Object.freeze(e.terminal),
        medianHoursToPlace: median(e._hours), placedSampleSize: e._hours.length
      });
    });

    return Object.freeze({
      signals: Object.freeze({
        version: VERSION, stream: STREAM, placementCount: placements.length,
        stageReach: Object.freeze(stageReach),
        placements: Object.freeze(placements), employers: Object.freeze(employerList)
      }),
      rejected: Object.freeze(rejected)
    });
  }

  return { VERSION: VERSION, STREAM: STREAM, STAGES: STAGES, TERMINAL: TERMINAL, buildPlacementSignals: buildPlacementSignals };
}));
