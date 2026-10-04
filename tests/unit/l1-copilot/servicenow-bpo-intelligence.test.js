'use strict';

const assert = require('assert');
const http = require('http');

const { getBpoIntelligence } = require('../../../server/l1-copilot/servicenow-bpo-intelligence');

const PORT = 18991;

const incidentSysId = '11111111111111111111111111111111';
const problemSysId = '22222222222222222222222222222222';
const problemCiSysId = '33333333333333333333333333333333';
const incidentCiSysId = '44444444444444444444444444444444';
const loadBal01SysId = '55555555555555555555555555555555';
const loadBal02SysId = '66666666666666666666666666666666';

const relatedIncidents = [
  ['INC0010001', 'SAP Controlling', 'In Progress'],
  ['INC0010002', 'SAP Financial Accounting', 'In Progress'],
  ['INC0010003', 'SAP Human Resources', 'In Progress'],
  ['INC0010004', 'SAP Materials Management', 'On Hold'],
  ['INC0010005', 'SAP Sales and Distribution', 'In Progress']
];

function ref(value, display) {
  return {
    value,
    display_value: display
  };
}

function json(res, body) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ result: body }));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const table = url.pathname.split('/').pop();
  const query = url.searchParams.get('sysparm_query') || '';

  if (table === 'incident') {
    if (query.includes(`sys_id=${incidentSysId}`) || query.includes('number=INC0010001')) {
      return json(res, [{
        sys_id: incidentSysId,
        number: ref(incidentSysId, 'INC0010001'),
        short_description: ref('sap sales unavailable', 'SAP Sales app is not accessible'),
        description: ref('sales app unavailable', 'Unable to get into the SAP Sales app.'),
        priority: ref('1', '1 - Critical'),
        impact: ref('1', '1 - High'),
        urgency: ref('1', '1 - High'),
        state: ref('2', '2 - In Progress'),
        caller_id: ref('caller001', 'Carol Coughlin'),
        assignment_group: ref('group001', 'Service Desk'),
        assigned_to: ref('user001', 'Beth Anglin'),
        company: ref('company001', 'ACME North America'),
        cmdb_ci: ref(incidentCiSysId, 'SAP Sales and Distribution'),
        problem_id: ref(problemSysId, 'PRB0010001')
      }]);
    }

    if (query.includes(`problem_id=${problemSysId}`)) {
      return json(res, relatedIncidents.map(([number, ciName, state], index) => ({
        sys_id: `${String(index + 10).padStart(32, '0')}`,
        number: ref(`related-${index}`, number),
        short_description: ref(`desc-${index}`, `${ciName} unavailable`),
        priority: ref('1', '1 - Critical'),
        state: ref(state === 'On Hold' ? '3' : '2', state),
        company: ref('company001', 'ACME North America'),
        cmdb_ci: ref(`ci-${index}`, ciName),
        problem_id: ref(problemSysId, 'PRB0010001')
      })));
    }

    return json(res, []);
  }

  if (table === 'problem') {
    if (query.includes(`sys_id=${problemSysId}`)) {
      return json(res, [{
        sys_id: problemSysId,
        number: ref(problemSysId, 'PRB0010001'),
        short_description: ref('sap outage', 'Unknown source of SAP outage'),
        description: ref(
          'multiple SAP incidents',
          'Several hours ago we experienced a flood of incidents related to various SAP applications.'
        ),
        state: ref('101', 'Root Cause Analysis'),
        priority: ref('1', '1 - Critical'),
        impact: ref('1', '1 - High'),
        urgency: ref('1', '1 - High'),
        category: ref('software', 'Software'),
        active: ref('true', 'true'),
        cmdb_ci: ref(problemCiSysId, 'SAP Enterprise Services')
      }]);
    }

    return json(res, []);
  }

  if (table === 'cmdb_ci') {
    if (query.includes(`sys_id=${problemCiSysId}`)) {
      return json(res, [{
        sys_id: problemCiSysId,
        name: ref(problemCiSysId, 'SAP Enterprise Services'),
        sys_class_name: ref('cmdb_ci_service', 'Service'),
        operational_status: ref('1', 'Operational'),
        install_status: ref('1', 'Installed')
      }]);
    }

    if (query.includes(`sys_id=${incidentCiSysId}`)) {
      return json(res, [{
        sys_id: incidentCiSysId,
        name: ref(incidentCiSysId, 'SAP Sales and Distribution'),
        sys_class_name: ref('cmdb_ci_service', 'Service'),
        operational_status: ref('1', 'Operational'),
        install_status: ref('1', 'Installed'),
        owned_by: ref('owner001', 'James Vittolo'),
        managed_by: ref('manager001', 'Bow Ruggeri'),
        support_group: ref('group002', 'Software')
      }]);
    }

    return json(res, []);
  }

  if (table === 'cmdb_rel_ci') {
    const relationships = [
      {
        sys_id: 'rel001',
        parent: ref(problemCiSysId, 'SAP Enterprise Services'),
        child: ref(incidentCiSysId, 'SAP Sales and Distribution'),
        type: ref('type001', 'Contains::Contained by')
      },
      {
        sys_id: 'rel002',
        parent: ref(incidentCiSysId, 'SAP Sales and Distribution'),
        child: ref(loadBal01SysId, 'SAP LoadBal01'),
        type: ref('type002', 'Depends on::Used by')
      },
      {
        sys_id: 'rel003',
        parent: ref(incidentCiSysId, 'SAP Sales and Distribution'),
        child: ref(loadBal02SysId, 'SAP LoadBal02'),
        type: ref('type002', 'Depends on::Used by')
      }
    ];

    return json(res, relationships);
  }

  return json(res, []);
});

(async () => {
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));

  try {
    const result = await getBpoIntelligence('INC0010001', {
      instanceUrl: `http://127.0.0.1:${PORT}`,
      username: 'admin',
      password: 'test-password'
    });

    assert.strictEqual(result.source, 'servicenow');
    assert.strictEqual(result.mode, 'READ_ONLY');

    assert.strictEqual(result.incident.number, 'INC0010001');
    assert.strictEqual(result.incident.priority, '1 - Critical');

    assert.strictEqual(result.problem.number, 'PRB0010001');

    assert.strictEqual(
      result.relatedIncidents.length,
      5,
      'Expected exactly five related incidents'
    );

    assert(
      result.relatedIncidents.every(item => item.priority === '1 - Critical'),
      'All five related incidents should be Critical'
    );

    assert.strictEqual(
      result.cmdb.problemCi.name,
      'SAP Enterprise Services'
    );

    assert.strictEqual(
      result.cmdb.incidentCi.name,
      'SAP Sales and Distribution'
    );

    assert.strictEqual(
      result.cmdb.relationships.length,
      3,
      'Expected three CMDB relationships'
    );

    assert(
      result.cmdb.relationships.some(
        r => r.parent === 'SAP Enterprise Services' &&
             r.child === 'SAP Sales and Distribution'
      ),
      'Missing Enterprise Services -> Sales relationship'
    );

    assert(
      result.cmdb.relationships.some(
        r => r.parent === 'SAP Sales and Distribution' &&
             r.child === 'SAP LoadBal01'
      ),
      'Missing Sales -> LoadBal01 relationship'
    );

    assert(
      result.cmdb.relationships.some(
        r => r.parent === 'SAP Sales and Distribution' &&
             r.child === 'SAP LoadBal02'
      ),
      'Missing Sales -> LoadBal02 relationship'
    );

    assert(
      result.evidence.known.some(text => text.includes('PRB0010001')),
      'Known evidence should identify the Problem'
    );

    assert(
      result.evidence.unknown.some(text => text.toLowerCase().includes('root cause')),
      'Unknown evidence should explicitly preserve root cause uncertainty'
    );

    assert(
      result.evidence.unknown.some(text => text.toLowerCase().includes('financial exposure')),
      'Financial exposure must remain unknown'
    );

    assert.strictEqual(result.governed.readOnly, true);
    assert.strictEqual(result.governed.canChangeState, false);
    assert.strictEqual(result.governed.autonomousCloseAllowed, false);
    assert.strictEqual(result.governed.autonomousWorkNoteWriteAllowed, false);

    console.log('==========================================');
    console.log('SERVICE NOW BPO INTELLIGENCE UNIT TEST');
    console.log('==========================================');
    console.log('Incident:        PASS');
    console.log('Problem:         PASS');
    console.log('Related count:   PASS (5)');
    console.log('Critical scope:  PASS (5/5)');
    console.log('Problem CI:      PASS');
    console.log('Incident CI:     PASS');
    console.log('CMDB graph:      PASS (3 relationships)');
    console.log('Known/Unknown:   PASS');
    console.log('Governance:      PASS');
    console.log('==========================================');
    console.log('ALL TESTS PASSED');
  } finally {
    server.close();
  }
})().catch(error => {
  console.error('TEST FAILED');
  console.error(error);
  process.exitCode = 1;
});
