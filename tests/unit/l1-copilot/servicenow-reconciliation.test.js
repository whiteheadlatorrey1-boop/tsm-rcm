'use strict';

const http = require('http');
const { reconcile } = require('../../../server/l1-copilot/servicenow-reconciliation');

const config = {
  instanceUrl: 'http://127.0.0.1:0',
  username: 'test-user',
  password: 'test-password'
};

const IDS = {
  ritm: '11111111111111111111111111111111',
  requestedFor: '33333333333333333333333333333333',
  group: '44444444444444444444444444444444',
  catalogItem: '66666666666666666666666666666666',
  scTask: '77777777777777777777777777777777',
  asset: 'HW0001'
};

const fixtures = {
  incident: {
    sys_id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    number: 'INC0010001',
    priority: '2',
    caller_id: 'Jane Doe',
    short_description: 'Laptop issue',
    description: 'Laptop will not connect.',
    assignment_group: 'Desktop Support',
    state: '2',
    cmdb_ci: IDS.asset
  },

  ritm: {
    sys_id: IDS.ritm,
    number: 'RITM0010001',
    request: 'REQ0010001',
    requested_for: {
      value: IDS.requestedFor,
      display_value: 'Jane Doe'
    },
    short_description: 'Laptop replacement',
    description: 'Replacement laptop request.',
    state: '2',
    assignment_group: {
      value: IDS.group,
      display_value: 'Desktop Support'
    },
    assigned_to: {
      value: '55555555555555555555555555555555',
      display_value: 'Tech One'
    },
    cat_item: {
      value: IDS.catalogItem,
      display_value: 'Laptop'
    }
  },

  scTask: {
    sys_id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    number: 'SCTASK0010001',
    request_item: {
      value: IDS.ritm,
      display_value: 'RITM0010001'
    },
    short_description: 'Prepare replacement laptop',
    description: 'Configure and test replacement device.',
    state: '2',
    assignment_group: {
      value: IDS.group,
      display_value: 'Desktop Support'
    },
    assigned_to: {
      value: '55555555555555555555555555555555',
      display_value: 'Tech One'
    }
  },

  asset: {
    sys_id: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    asset_tag: IDS.asset,
    manufacturer: 'Dell',
    model_id: 'Latitude 7440',
    warranty_expiration: '2028-01-01',
    assigned_to: {
      value: IDS.requestedFor,
      display_value: 'Jane Doe'
    },
    department: {
      value: 'dddddddddddddddddddddddddddddddddddddd',
      display_value: 'Finance'
    },
    purchase_date: '2025-01-01',
    install_status: '1'
  }
};

function sendJson(res, body) {
  const payload = JSON.stringify(body);
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405);
    return res.end();
  }

  const url = new URL(req.url, 'http://127.0.0.1');

  if (url.pathname === '/api/now/table/incident') {
    const query = url.searchParams.get('sysparm_query') || '';

    if (
      query.includes('number=INC0010001') ||
      query.includes(`sys_id=${fixtures.incident.sys_id}`)
    ) {
      return sendJson(res, { result: [fixtures.incident] });
    }

    return sendJson(res, { result: [] });
  }

  if (url.pathname === '/api/now/table/sc_req_item') {
    const number = url.searchParams.get('number');
    const sysId = url.searchParams.get('sys_id');

    if (number === 'RITM0010001' || sysId === IDS.ritm) {
      return sendJson(res, { result: [fixtures.ritm] });
    }

    return sendJson(res, { result: [] });
  }

  if (url.pathname === '/api/now/table/sc_task') {
    const requestItem = url.searchParams.get('request_item');

    if (requestItem === IDS.ritm) {
      return sendJson(res, { result: [fixtures.scTask] });
    }

    const number = url.searchParams.get('number');
    const sysId = url.searchParams.get('sys_id');

    if (
      number === fixtures.scTask.number ||
      sysId === fixtures.scTask.sys_id
    ) {
      return sendJson(res, { result: [fixtures.scTask] });
    }

    return sendJson(res, { result: [] });
  }

  if (url.pathname === '/api/now/table/cmdb_ci_hardware') {
    const query = url.searchParams.get('sysparm_query') || '';

    if (query.includes(`asset_tag=${IDS.asset}`)) {
      return sendJson(res, { result: [fixtures.asset] });
    }

    return sendJson(res, { result: [] });
  }

  res.writeHead(404);
  res.end();
});

let passed = 0;
let failed = 0;

function check(label, condition) {
  if (condition) {
    passed += 1;
    console.log(`PASS: ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL: ${label}`);
  }
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  const port = server.address().port;
  const testConfig = {
    ...config,
    instanceUrl: `http://127.0.0.1:${port}`
  };

  try {
    console.log('=== SERVICE NOW RECONCILIATION TEST ===');

    const result = await reconcile({
      incident: 'INC0010001',
      ritm: 'RITM0010001',
      sctask: 'SCTASK0010001',
      asset: IDS.asset
    }, testConfig);

    check('incident reconciled', result.incident?.number === 'INC0010001');
    check('RITM reconciled', result.ritm?.number === 'RITM0010001');
    check('SC Tasks reconciled', result.scTasks.length === 1);
    check('selected SC Task reconciled', result.selectedScTask?.number === 'SCTASK0010001');
    check('asset reconciled', result.asset?.assetTag === IDS.asset);

    check(
      'Incident → RITM is explicit input',
      result.relationships.incidentToRitm === 'EXPLICIT_INPUT'
    );

    check(
      'RITM → SC Tasks resolved',
      result.relationships.ritmToScTasks === 'RESOLVED'
    );

    check('matching Incident/Asset has no mismatch', result.mismatches.length === 0);

    check('read-only governance', result.governed.readOnly === true);
    check('no state changes', result.governed.canChangeState === false);
    check('no autonomous close', result.governed.autonomousCloseAllowed === false);
    check('technician evidence untouched', result.governed.technicianEvidenceUntouched === true);

    const missingRitm = await reconcile({
      incident: 'INC0010001',
      ritm: 'RITM-NOT-FOUND'
    }, testConfig);

    check(
      'missing RITM is explicit',
      missingRitm.missingContext.some(
        item => item.source === 'ritm' && item.identifier === 'RITM-NOT-FOUND'
      )
    );

    const mismatch = await reconcile({
      incident: 'INC0010001',
      asset: 'HW0001'
    }, {
      ...testConfig,
      instanceUrl: testConfig.instanceUrl
    });

    check(
      'Incident/Asset comparison executes',
      Array.isArray(mismatch.mismatches)
    );

    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);

    if (failed) process.exitCode = 1;
  } finally {
    server.close();
  }
})().catch(error => {
  console.error('TEST ERROR:', error);
  process.exitCode = 1;
  server.close();
});
