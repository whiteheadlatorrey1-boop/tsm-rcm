
'use strict';

/*
 * Phase 8.13B test environment.
 * server.js owns the listener; this test uses the real auth middleware.
 */
process.env.TSM_SESSION_SECRET = 'phase8-13b-test-secret';
process.env.PORT = '8080';

const auth = require('../middleware/require-auth');

const PHASE8_13B_TEST_SESSION_COOKIE =
  'tsm_session=' +
  encodeURIComponent(
    auth.signSession({
      role: 'admin',
      staffId: 'TECH-813',
      label: 'Phase 8.13B Technician',
      exp: Date.now() + 60 * 60 * 1000
    })
  );


/**
 * Phase 8.13B
 * Governed L1 escalation execute-route regression.
 *
 * Verifies:
 * - authentication/role gate
 * - required fields
 * - technician confirmation gate
 * - technician identity comes from session
 * - CLOUD_OPS_HANDOFF Action Gate flow
 * - EXECUTED action
 * - durable handoff commit
 * - reference preservation
 * - no ServiceNow state write
 * - no ticket closure
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const HANDOFF_FILE = path.join(ROOT, 'data', 'l1-copilot-handoffs.json');
const BACKUP = '/tmp/tsm-phase8-backups/l1-copilot-handoffs.json.phase8.13b';

if (fs.existsSync(HANDOFF_FILE)) {
  fs.copyFileSync(HANDOFF_FILE, BACKUP);
}

function cleanHandoffs() {
  if (fs.existsSync(HANDOFF_FILE)) {
    fs.unlinkSync(HANDOFF_FILE);
  }
}

cleanHandoffs();

let server;
let originalSnAdapter;

function request(port, method, route, body, cookie) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);

    const req = http.request({
      host: '127.0.0.1',
      port,
      method,
      path: route,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(cookie ? { Cookie: cookie } : {})
      }
    }, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        let parsed = null;

        try {
          parsed = data ? JSON.parse(data) : null;
        } catch (_) {
          parsed = data;
        }

        resolve({
          status: res.statusCode,
          body: parsed
        });
      });
    });

    req.on('error', reject);

    if (payload) req.write(payload);
    req.end();
  });
}

function fakeSessionCookie(session) {
  /*
   * The test server's auth middleware is mocked below so the route sees
   * the exact technician session we want to verify.
   */
  return `tsm_test_session=${encodeURIComponent(JSON.stringify(session))}`;
}

(async () => {
  try {
    console.log('==========================================');
    console.log('PHASE 8.13B — ESCALATION EXECUTE REGRESSION');
    console.log('==========================================');

    /*
     * Prevent accidental ServiceNow access.
     */
    const snAdapter = require('../server/l1-copilot/servicenow-adapter');
    originalSnAdapter = {
      writeWorkNote: snAdapter.writeWorkNote,
      isConfigured: snAdapter.isConfigured
    };

    let serviceNowCalls = 0;

    snAdapter.writeWorkNote = async () => {
      serviceNowCalls += 1;
      throw new Error('ServiceNow write must not be called by escalation handoff');
    };

    snAdapter.isConfigured = () => false;

    /*
     * Load server after the adapter guard is installed.
     */
    /*
     * server.js owns the HTTP listener.
     * Do NOT call app.listen() here.
     */
    const appModule = require('../server');

    // server.js owns the listener. This test does not call app.listen().
    await new Promise(resolve => setTimeout(resolve, 500));

    const port = Number(process.env.PORT || 8080);

    /*
     * NOTE:
     * Existing auth middleware in this application may require a real
     * authenticated session. The route itself is protected by
     * requireRole(L1_COPILOT_ROLES), so first establish that the route
     * is not publicly callable.
     */

    console.log('\n1. Unauthenticated request must be rejected');

    const unauth = await request(
      port,
      'POST',
      '/api/l1-copilot/escalation/execute',
      {
        ticket: 'INC0010001',
        package: 'Tier 2 handoff package',
        destinationTeam: 'Network',
        technicianConfirmed: true
      }
    );

    assert(
      [401, 403].includes(unauth.status),
      `Expected 401/403, received ${unauth.status}`
    );

    console.log(`PASS — unauthenticated request returned ${unauth.status}`);

    /*
     * The remaining route tests are performed by invoking the Express
     * route through a controlled authenticated test session when the
     * application exposes its test session mechanism.
     *
     * If this deployment does not expose one, fail explicitly rather
     * than weakening the authentication boundary.
     */

    const auth = require('../middleware/require-auth');

    const cookie =
      'tsm_session=' +
      encodeURIComponent(
        auth.signSession({
          role: 'admin',
          staffId: 'TECH-813',
          label: 'Phase 8.13B Technician',
          exp: Date.now() + 60 * 60 * 1000
        })
      );

    console.log('\n2. Missing ticket');

    let r = await request(
      port,
      'POST',
      '/api/l1-copilot/escalation/execute',
      {
        package: 'Tier 2 handoff package',
        destinationTeam: 'Network',
        technicianConfirmed: true
      },
      cookie
    );

    assert.strictEqual(r.status, 400);
    console.log('PASS — missing ticket rejected');

    console.log('\n3. Missing package');

    r = await request(
      port,
      'POST',
      '/api/l1-copilot/escalation/execute',
      {
        ticket: 'INC0010001',
        destinationTeam: 'Network',
        technicianConfirmed: true
      },
      cookie
    );

    assert.strictEqual(r.status, 400);
    console.log('PASS — missing package rejected');

    console.log('\n4. Missing destination team');

    r = await request(
      port,
      'POST',
      '/api/l1-copilot/escalation/execute',
      {
        ticket: 'INC0010001',
        package: 'Tier 2 handoff package',
        technicianConfirmed: true
      },
      cookie
    );

    assert.strictEqual(r.status, 400);
    console.log('PASS — missing destination team rejected');

    console.log('\n5. Technician confirmation required');

    r = await request(
      port,
      'POST',
      '/api/l1-copilot/escalation/execute',
      {
        ticket: 'INC0010001',
        package: 'Tier 2 handoff package',
        destinationTeam: 'Network',
        technicianConfirmed: false
      },
      cookie
    );

    assert.strictEqual(r.status, 403);
    assert.strictEqual(
      require('../server/l1-copilot/handoff-store').countHandoffs(),
      0
    );

    console.log('PASS — false confirmation rejected and no handoff committed');

    console.log('\n6. Successful governed handoff');

    const references = {
      incident: {
        number: 'INC0010001',
        sysId: 'incident-sys-1'
      },
      ritm: {
        number: 'RITM0010001',
        sysId: 'ritm-sys-1'
      },
      sctask: {
        number: 'SCTASK0010001',
        sysId: 'sctask-sys-1'
      },
      asset: {
        assetTag: 'HW0001',
        sysId: 'asset-sys-1'
      }
    };

    r = await request(
      port,
      'POST',
      '/api/l1-copilot/escalation/execute',
      {
        ticket: 'INC0010001',
        package:
          'Root cause requires Network L2 access. L1 verified endpoint configuration and reproduced connectivity failure.',
        destinationTeam: 'Network',
        technicianConfirmed: true,
        references,
        workPerformed: 'Validated endpoint configuration and reproduced failure.',
        validation: 'Ping and DNS diagnostics completed.',
        blocker: 'Network-side access required.',
        requestedTier2Action: 'Review switch port and DHCP path.'
      },
      cookie
    );

    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.ok, true);

    assert.strictEqual(
      r.body.action.actionType,
      'CLOUD_OPS_HANDOFF'
    );

    assert.strictEqual(
      r.body.action.state,
      'EXECUTED'
    );

    assert.strictEqual(
      r.body.action.technician.id,
      'TECH-813'
    );

    assert.strictEqual(
      r.body.governed.technicianConfirmed,
      true
    );

    assert.strictEqual(
      r.body.governed.handoffCommitted,
      true
    );

    assert.strictEqual(
      r.body.governed.ticketClosureRequested,
      false
    );

    assert.strictEqual(
      r.body.governed.ticketStateChanged,
      false
    );

    assert.strictEqual(
      r.body.governed.serviceNowStateWrite,
      false
    );

    assert.strictEqual(serviceNowCalls, 0);

    const store = require('../server/l1-copilot/handoff-store');

    assert.strictEqual(store.countHandoffs(), 1);

    const handoffId = r.body.handoff.id;
    const saved = store.getHandoff(handoffId);

    assert(saved, 'Expected durable handoff record');

    assert.strictEqual(
      saved.status,
      'COMMITTED'
    );

    assert.strictEqual(
      saved.technician.id,
      'TECH-813'
    );

    assert.strictEqual(
      saved.destinationTeam,
      'Network'
    );

    assert.deepStrictEqual(
      saved.references,
      references
    );

    assert.strictEqual(
      saved.ticketClosureRequested,
      false
    );

    assert.strictEqual(
      saved.ticketStateChanged,
      false
    );

    console.log('PASS — Action Gate reached EXECUTED');
    console.log('PASS — technician identity derived from session');
    console.log('PASS — CLOUD_OPS_HANDOFF committed');
    console.log('PASS — references preserved');
    console.log('PASS — no ServiceNow write');
    console.log('PASS — ticket closure not requested');
    console.log('PASS — ticket state not changed');

    console.log('\n==========================================');
    console.log('PHASE 8.13B — ALL TESTS PASSED');
    console.log('==========================================');
  } finally {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }

    if (originalSnAdapter) {
      const snAdapter = require('../server/l1-copilot/servicenow-adapter');
      snAdapter.writeWorkNote = originalSnAdapter.writeWorkNote;
      snAdapter.isConfigured = originalSnAdapter.isConfigured;
    }

    cleanHandoffs();

    if (fs.existsSync(BACKUP)) {
      fs.copyFileSync(BACKUP, HANDOFF_FILE);
      fs.unlinkSync(BACKUP);
    }
  }
})().catch(err => {
  console.error('\nFAIL:', err.stack || err.message);
  process.exitCode = 1;
}).finally(() => process.exit(process.exitCode || 0)); /* exit-after-pass */
