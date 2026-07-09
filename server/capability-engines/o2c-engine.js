const { detectStageBreaches } = require('./stage-breach-engine');

function slaLookup(stages) {
  const map = {};
  for (const s of stages || []) map[s.id] = s.sla_hours;
  return (record) => {
    const sla = map[record.stage];
    return (sla === undefined) ? null : sla;
  };
}

function generateRecommendations(o2cModel) {
  const orders = o2cModel.sample_orders || [];
  const recs = detectStageBreaches(orders, {
    entity: 'order', idField: 'order_id', stageField: 'stage', valueField: 'value',
    hoursAgoField: 'entered_stage_at_hours_ago',
    slaHoursForRecord: slaLookup(o2cModel.stages),
    actionForRecord: (r, h) => `Order ${r.order_id} (${r.customer}, $${(r.value || 0).toLocaleString()}) is ${h}h past SLA in "${r.stage}" — clear the blocker before it slips further downstream.`
  });
  return recs;
}

module.exports = { generateRecommendations };
