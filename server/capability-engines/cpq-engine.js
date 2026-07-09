const { detectStageBreaches } = require('./stage-breach-engine');

// CPQ's SLA config is keyed by stage *label* (e.g. "Pending Approval"), not
// stage id, and quotes carry an ISO stage_entered_at timestamp rather than a
// precomputed hours-ago number.
function slaLookup(slaByStage) {
  return (record) => {
    const sla = slaByStage[record.stage];
    return (sla === undefined) ? null : sla;
  };
}

const MARGIN_FLOOR_PCT = 20; // below this, a quote's margin is a red flag regardless of SLA

function generateRecommendations(cpqModel) {
  const sample = cpqModel.sample_data || {};
  const quotes = sample.quotes || [];
  const slaByStage = sample.sla_hours_by_stage || {};

  const recs = detectStageBreaches(quotes, {
    entity: 'quote', idField: 'quote_id', stageField: 'stage',
    valueField: 'net_value',
    timestampField: 'stage_entered_at',
    slaHoursForRecord: slaLookup(slaByStage),
    actionForRecord: (r, h) => `Quote ${r.quote_id} ("${r.name}") is ${h}h past SLA in "${r.stage}" — nudge it forward before the customer loses momentum.`
  });

  // Margin-risk signals aren't a stage breach, but they're just as real —
  // flag any quote with margin below floor as a separate recommendation type.
  for (const q of quotes) {
    if (typeof q.margin_pct === 'number' && q.margin_pct < MARGIN_FLOOR_PCT) {
      recs.push({
        id: `QUOTE-MARGIN-${q.quote_id}`,
        type: 'margin_risk',
        entity: 'quote',
        recordId: q.quote_id,
        stage: q.stage,
        value: q.net_value != null ? q.net_value : null,
        marginPct: q.margin_pct,
        severity: q.margin_pct < 10 ? 'critical' : 'high',
        recommendedAction: `Quote ${q.quote_id} is at ${q.margin_pct}% margin (floor: ${MARGIN_FLOOR_PCT}%) — review discount before it's sent/approved.`,
        createdAt: new Date().toISOString()
      });
    }
  }

  recs.sort((a, b) => (b.hoursOverdue || 0) - (a.hoursOverdue || 0));
  return recs;
}

module.exports = { generateRecommendations };
