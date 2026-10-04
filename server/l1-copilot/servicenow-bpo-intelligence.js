'use strict';

/**
 * ServiceNow → BPO/MSP Intelligence
 *
 * READ-ONLY correlation layer.
 *
 * Boundary:
 *   Incident
 *      ↓
 *   Problem
 *      ↓
 *   Related Incidents
 *      ↓
 *   CMDB CI + relationships
 *
 * This module does NOT:
 *   - change incident state
 *   - close incidents
 *   - write work notes
 *   - create/update/delete ServiceNow records
 *   - infer root cause from topology
 *   - invent financial exposure, SLA, recovery time, or remediation
 *
 * It follows relationships that already exist in ServiceNow and packages
 * those records as governed evidence for the BPO workflow.
 */

const snAdapter = require('./servicenow-adapter');

const { snRequest, readField } = snAdapter._internal;

const INCIDENT_FIELDS = [
  'sys_id',
  'number',
  'priority',
  'impact',
  'urgency',
  'state',
  'short_description',
  'description',
  'caller_id',
  'company',
  'assignment_group',
  'assigned_to',
  'cmdb_ci',
  'problem_id',
  'escalation',
  'made_sla',
  'sla_due'
].join(',');

const PROBLEM_FIELDS = [
  'sys_id',
  'number',
  'priority',
  'impact',
  'urgency',
  'state',
  'problem_state',
  'short_description',
  'description',
  'category',
  'active',
  'major_problem',
  'known_error',
  'workaround_applied',
  'related_incidents',
  'assigned_to',
  'assignment_group',
  'cmdb_ci',
  'opened_at',
  'confirmed_at',
  'confirmed_by',
  'first_reported_by_task',
  'escalation'
].join(',');

const CMDB_FIELDS = [
  'sys_id',
  'name',
  'sys_class_name',
  'operational_status',
  'install_status',
  'owned_by',
  'managed_by',
  'support_group',
  'change_control',
  'model_id',
  'asset',
  'company',
  'department',
  'manufacturer',
  'serial_number',
  'ip_address',
  'warranty_expiration',
  'purchase_date'
].join(',');

const REL_FIELDS = [
  'sys_id',
  'parent',
  'child',
  'type'
].join(',');

function assertIdentifier(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`${label} is required.`);
  }

  const text = String(value).trim();

  // ServiceNow identifiers used here are incident/problem numbers or sys_ids.
  // Keep the query boundary deliberately narrow.
  if (!/^[A-Za-z0-9_.:-]+$/.test(text)) {
    throw new Error(`Unsafe ${label}.`);
  }

  return text;
}

function valueOf(record, field) {
  return readField(record, field);
}

function sysIdOf(record) {
  if (!record) return null;
  const value = record.sys_id;
  if (value && typeof value === 'object') {
    return value.value || null;
  }
  return value || null;
}

function displayOf(record, field) {
  if (!record) return null;
  return valueOf(record, field);
}

function compactIncident(record) {
  if (!record) return null;

  return {
    sysId: sysIdOf(record),
    number: displayOf(record, 'number'),
    priority: displayOf(record, 'priority'),
    impact: displayOf(record, 'impact'),
    urgency: displayOf(record, 'urgency'),
    state: displayOf(record, 'state'),
    shortDescription: displayOf(record, 'short_description'),
    description: displayOf(record, 'description'),
    caller: displayOf(record, 'caller_id'),
    company: displayOf(record, 'company'),
    assignmentGroup: displayOf(record, 'assignment_group'),
    assignedTo: displayOf(record, 'assigned_to'),
    incidentCi: displayOf(record, 'cmdb_ci'),
    problem: displayOf(record, 'problem_id'),
    escalation: displayOf(record, 'escalation'),
    madeSla: displayOf(record, 'made_sla'),
    slaDue: displayOf(record, 'sla_due')
  };
}

function compactProblem(record) {
  if (!record) return null;

  return {
    sysId: sysIdOf(record),
    number: displayOf(record, 'number'),
    priority: displayOf(record, 'priority'),
    impact: displayOf(record, 'impact'),
    urgency: displayOf(record, 'urgency'),
    state: displayOf(record, 'state'),
    problemState: displayOf(record, 'problem_state'),
    shortDescription: displayOf(record, 'short_description'),
    description: displayOf(record, 'description'),
    category: displayOf(record, 'category'),
    active: displayOf(record, 'active'),
    majorProblem: displayOf(record, 'major_problem'),
    knownError: displayOf(record, 'known_error'),
    workaroundApplied: displayOf(record, 'workaround_applied'),
    relatedIncidentCount: displayOf(record, 'related_incidents'),
    assignedTo: displayOf(record, 'assigned_to'),
    assignmentGroup: displayOf(record, 'assignment_group'),
    cmdbCi: displayOf(record, 'cmdb_ci'),
    openedAt: displayOf(record, 'opened_at'),
    confirmedAt: displayOf(record, 'confirmed_at'),
    confirmedBy: displayOf(record, 'confirmed_by'),
    firstReportedByTask: displayOf(record, 'first_reported_by_task'),
    escalation: displayOf(record, 'escalation')
  };
}

function compactCi(record) {
  if (!record) return null;

  return {
    sysId: sysIdOf(record),
    name: displayOf(record, 'name'),
    className: displayOf(record, 'sys_class_name'),
    operationalStatus: displayOf(record, 'operational_status'),
    installStatus: displayOf(record, 'install_status'),
    ownedBy: displayOf(record, 'owned_by'),
    managedBy: displayOf(record, 'managed_by'),
    supportGroup: displayOf(record, 'support_group'),
    changeControl: displayOf(record, 'change_control'),
    model: displayOf(record, 'model_id'),
    asset: displayOf(record, 'asset'),
    company: displayOf(record, 'company'),
    department: displayOf(record, 'department'),
    manufacturer: displayOf(record, 'manufacturer'),
    serialNumber: displayOf(record, 'serial_number'),
    ipAddress: displayOf(record, 'ip_address'),
    warrantyExpiration: displayOf(record, 'warranty_expiration'),
    purchaseDate: displayOf(record, 'purchase_date')
  };
}

function compactRelationship(record) {
  if (!record) return null;

  return {
    sysId: sysIdOf(record),
    parent: displayOf(record, 'parent'),
    child: displayOf(record, 'child'),
    type: displayOf(record, 'type')
  };
}

async function getSingleRecord(cfg, table, query, fields) {
  const data = await snRequest(cfg, 'GET', `/api/now/table/${table}`, {
    query: {
      sysparm_query: query,
      sysparm_fields: fields,
      sysparm_limit: '1'
    }
  });

  return data.result && data.result[0] ? data.result[0] : null;
}

async function getRecords(cfg, table, query, fields, limit = '100') {
  const data = await snRequest(cfg, 'GET', `/api/now/table/${table}`, {
    query: {
      sysparm_query: query,
      sysparm_fields: fields,
      sysparm_limit: limit
    }
  });

  return Array.isArray(data.result) ? data.result : [];
}

async function getBpoIntelligence(incidentIdentifier, config) {
  const identifier = assertIdentifier(
    incidentIdentifier,
    'incident identifier'
  );

  const cfg = config || snAdapter.loadConfigFromEnv();

  if (!snAdapter.isConfigured(cfg)) {
    throw new snAdapter.ServiceNowNotConfiguredError();
  }

  /*
   * 1. INCIDENT
   *
   * We intentionally query the incident directly rather than depending on
   * getTicket(), because BPO intelligence needs relationship fields such as
   * problem_id, impact, urgency, and cmdb_ci.
   */
  const looksLikeSysId = /^[0-9a-f]{32}$/i.test(identifier);

  const incidentRecord = await getSingleRecord(
    cfg,
    'incident',
    looksLikeSysId
      ? `sys_id=${identifier}`
      : `number=${identifier}`,
    INCIDENT_FIELDS
  );

  if (!incidentRecord) {
    return {
      source: 'servicenow',
      mode: 'READ_ONLY',
      incident: null,
      problem: null,
      relatedIncidents: [],
      cmdb: {
        problemCi: null,
        incidentCi: null,
        relationships: []
      },
      evidence: {
        known: [],
        unknown: [`No ServiceNow incident found for "${identifier}".`]
      },
      governed: {
        readOnly: true,
        canChangeState: false,
        autonomousCloseAllowed: false,
        autonomousWorkNoteWriteAllowed: false
      }
    };
  }

  const incident = compactIncident(incidentRecord);

  /*
   * 2. PROBLEM
   *
   * Prefer the incident's actual problem_id reference. We do not search
   * problems by description or guess a matching problem.
   */
  const problemRef = incidentRecord.problem_id;
  const problemSysId =
    problemRef && typeof problemRef === 'object'
      ? problemRef.value
      : null;

  let problemRecord = null;

  if (problemSysId) {
    problemRecord = await getSingleRecord(
      cfg,
      'problem',
      `sys_id=${problemSysId}`,
      PROBLEM_FIELDS
    );
  }

  const problem = compactProblem(problemRecord);

  /*
   * 3. RELATED INCIDENTS
   *
   * ServiceNow's incident.problem_id relationship is the authoritative
   * relationship. We resolve it directly against the Problem sys_id.
   */
  let relatedIncidentRecords = [];

  if (problemSysId) {
    relatedIncidentRecords = await getRecords(
      cfg,
      'incident',
      `problem_id=${problemSysId}`,
      INCIDENT_FIELDS,
      '100'
    );
  }

  const relatedIncidents = relatedIncidentRecords
    .map(compactIncident)
    .filter(Boolean);

  /*
   * 4. CMDB
   *
   * Resolve both the Problem CI and the Incident CI. They may be different
   * records; that distinction is preserved.
   */
  const problemCiRef = problemRecord && problemRecord.cmdb_ci;
  const incidentCiRef = incidentRecord.cmdb_ci;

  const problemCiSysId =
    problemCiRef && typeof problemCiRef === 'object'
      ? problemCiRef.value
      : null;

  const incidentCiSysId =
    incidentCiRef && typeof incidentCiRef === 'object'
      ? incidentCiRef.value
      : null;

  let problemCiRecord = null;
  let incidentCiRecord = null;

  if (problemCiSysId) {
    problemCiRecord = await getSingleRecord(
      cfg,
      'cmdb_ci',
      `sys_id=${problemCiSysId}`,
      CMDB_FIELDS
    );
  }

  if (incidentCiSysId) {
    incidentCiRecord = await getSingleRecord(
      cfg,
      'cmdb_ci',
      `sys_id=${incidentCiSysId}`,
      CMDB_FIELDS
    );
  }

  /*
   * 5. CMDB RELATIONSHIPS
   *
   * Retrieve relationships touching either verified CI.
   * We preserve direction and relationship type exactly as ServiceNow
   * reports them.
   */
  const ciIds = [...new Set(
    [problemCiSysId, incidentCiSysId].filter(Boolean)
  )];

  const relationshipRecords = [];

  for (const ciSysId of ciIds) {
    const records = await getRecords(
      cfg,
      'cmdb_rel_ci',
      `parent=${ciSysId}^ORchild=${ciSysId}`,
      REL_FIELDS,
      '100'
    );

    for (const record of records) {
      if (!relationshipRecords.some(
        existing => sysIdOf(existing) === sysIdOf(record)
      )) {
        relationshipRecords.push(record);
      }
    }
  }

  const relationships = relationshipRecords
    .map(compactRelationship)
    .filter(Boolean);

  /*
   * 6. GOVERNED EVIDENCE
   *
   * Facts only. No causal inference.
   */
  const known = [];
  const unknown = [];

  if (incident.number) {
    known.push(`${incident.number} is a ServiceNow incident.`);
  }

  if (incident.priority) {
    known.push(`${incident.number} priority: ${incident.priority}.`);
  }

  if (problem) {
    known.push(
      `${incident.number} is linked to ${problem.number}.`
    );
  } else {
    unknown.push('No linked ServiceNow Problem was resolved from the incident.');
  }

  if (problem && relatedIncidents.length) {
    known.push(
      `${problem.number} has ${relatedIncidents.length} related incident(s) resolved from incident.problem_id.`
    );
  }

  if (problemCiRecord) {
    known.push(
      `${problem.number} references CMDB CI "${displayOf(problemCiRecord, 'name')}".`
    );
  }

  if (incidentCiRecord) {
    known.push(
      `${incident.number} references CMDB CI "${displayOf(incidentCiRecord, 'name')}".`
    );
  }

  if (relationships.length) {
    known.push(
      `${relationships.length} CMDB relationship(s) were returned for the verified CI(s).`
    );
  }

  unknown.push('Root cause is not inferred by this adapter.');
  unknown.push('Remediation is not inferred by this adapter.');
  unknown.push('Financial exposure is not present unless explicitly supplied by ServiceNow source data.');
  unknown.push('Recovery time is not inferred from CMDB relationships.');

  return {
    source: 'servicenow',
    mode: 'READ_ONLY',

    incident,

    problem,

    relatedIncidents,

    cmdb: {
      problemCi: compactCi(problemCiRecord),
      incidentCi: compactCi(incidentCiRecord),
      relationships
    },

    evidence: {
      known,
      unknown
    },

    governed: {
      readOnly: true,
      canChangeState: false,
      autonomousCloseAllowed: false,
      autonomousWorkNoteWriteAllowed: false
    }
  };
}

module.exports = {
  getBpoIntelligence
};
