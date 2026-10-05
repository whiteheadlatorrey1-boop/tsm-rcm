'use strict';

process.env.TSM_SESSION_SECRET = 'phase9-template-assist-test-secret';
process.env.PORT = '8080';

const assert = require('assert');
const http = require('http');
const auth = require('../middleware/require-auth');

require('../server');

const cookie =
  'tsm_session=' +
  encodeURIComponent(
    auth.signSession({
      role: 'admin',
      staffId: 'TECH-902',
      label: 'Phase 9 Technician',
      exp: Date.now() + 60 * 60 * 1000
    })
  );

function request(path, body, useAuth = true) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {});

    const req = http.request({
      hostname: '127.0.0.1',
      port: 8080,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(useAuth ? { Cookie: cookie } : {})
      }
    }, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        let parsed = {};

        try {
          parsed = JSON.parse(data);
        } catch (_) {}

        resolve({
          status: res.statusCode,
          body: parsed
        });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  console.log('==========================================');
  console.log('PHASE 9.3 — TEMPLATE ASSIST ROUTE');
  console.log('==========================================');

  let result = await request(
    '/api/l1-copilot/template-assist',
    {
      shortDescription: 'Failed laptop needs replacement',
      fields: {
        INCIDENT_NUMBER: 'INC0090001',
        ASSET_TAG: 'HW0090',
        TECHNICIAN: 'TECH-902'
      }
    },
    false
  );

  assert.strictEqual(result.status, 401);
  console.log('PASS — unauthenticated request rejected');

  result = await request(
    '/api/l1-copilot/template-assist',
    {
      shortDescription: 'Failed laptop needs replacement',
      fields: {
        INCIDENT_NUMBER: 'INC0090001',
        ASSET_TAG: 'HW0090',
        TECHNICIAN: 'TECH-902'
      }
    }
  );

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.ok, true);
  assert.strictEqual(
    result.body.suggestion.templateId,
    'DEVICE_REPLACEMENT'
  );
  console.log('PASS — controlled template suggested');

  assert.strictEqual(
    result.body.suggestion.technicianConfirmed,
    false
  );
  assert.strictEqual(
    result.body.suggestion.executable,
    false
  );
  console.log('PASS — suggestion remains unconfirmed/non-executable');

  assert.strictEqual(
    result.body.governed.readOnly,
    true
  );
  assert.strictEqual(
    result.body.governed.serviceNowWrite,
    false
  );
  assert.strictEqual(
    result.body.governed.ticketStateChanged,
    false
  );
  console.log('PASS — governance flags preserved');

  result = await request(
    '/api/l1-copilot/template-assist',
    {
      shortDescription: 'Replace device',
      description: 'x'.repeat(20001)
    }
  );

  assert.strictEqual(result.status, 413);
  console.log('PASS — oversized context rejected');

  console.log('');
  console.log('PHASE 9.3 — ALL TESTS PASSED');
})().then(() => process.exit());
