const { detectStageBreaches } = require('./stage-breach-engine');

// Builds a stage-id -> sla_hours lookup from the model's entities.<entity>.stages array.
function slaLookup(stages) {
  const map = {};
  for (const s of stages || []) map[s.id] = s.sla_hours;
  return (record) => {
    const sla = map[record.stage];
    return (sla === undefined) ? null : sla;
  };
}

function generateRecommendations(crmModel) {
  const entities = crmModel.entities || {};
  const sample = crmModel.sample_data || {};
  const recs = [];

  if (entities.lead) {
    recs.push(...detectStageBreaches(sample.leads, {
      entity: 'lead', idField: 'lead_id', stageField: 'stage', ownerField: 'owner',
      hoursAgoField: 'entered_stage_at_hours_ago',
      slaHoursForRecord: slaLookup(entities.lead.stages),
      actionForRecord: (r, h) => `Lead ${r.lead_id} (${r.company}) has sat ${h}h past SLA in "${r.stage}" — have ${r.owner || 'the owner'} follow up now.`
    }));
  }

  if (entities.opportunity) {
    recs.push(...detectStageBreaches(sample.opportunities, {
      entity: 'opportunity', idField: 'opp_id', stageField: 'stage', ownerField: 'owner', valueField: 'value',
      hoursAgoField: 'entered_stage_at_hours_ago',
      slaHoursForRecord: slaLookup(entities.opportunity.stages),
      actionForRecord: (r, h) => `Opportunity ${r.opp_id} ($${(r.value || 0).toLocaleString()}) is stalled ${h}h past SLA in "${r.stage}" — ${r.owner || 'owner'} should re-engage the account.`
    }));
  }

  if (entities.case) {
    recs.push(...detectStageBreaches(sample.cases, {
      entity: 'case', idField: 'case_id', stageField: 'stage', ownerField: 'owner',
      hoursAgoField: 'entered_stage_at_hours_ago',
      slaHoursForRecord: slaLookup(entities.case.stages),
      actionForRecord: (r, h) => `Case ${r.case_id} ("${r.subject}") breached SLA by ${h}h in "${r.stage}" — escalate to ${r.owner || 'support lead'} immediately.`
    }));
  }

  recs.sort((a, b) => b.hoursOverdue - a.hoursOverdue);
  return recs;
}

module.exports = { generateRecommendations };
