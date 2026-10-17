#!/usr/bin/env node
'use strict';
// LIVE read-only acceptance test against the real SAP Business Accelerator
// Hub sandbox (sandbox.api.sap.com) -- proves server/enterprise/sap-sandbox-adapter.js
// and routes/sap-sandbox.js against the actual sandbox gateway, not a mock.
// GET-only: Business Partner + Sales Order. Nothing is ever created,
// modified, or deleted -- this script has no write path to run even if it
// wanted to (the adapter itself exports none).
//
// Opt-in: requires SAP_INTEGRATION_ENABLED=true and SAP_SANDBOX_API_KEY to
// be set (e.g. `. ~/.tsm-sap.env` plus SAP_INTEGRATION_ENABLED=true).
// Skips cleanly (exit 0) otherwise, so `npm test` stays green with no SAP
// credentials present.
//
// SECURITY: never prints, logs, or persists SAP_SANDBOX_API_KEY. Never set
// this key on Fly -- it is for local/CI sandbox acceptance only.
//
// USAGE:
//   . ~/.tsm-sap.env; SAP_INTEGRATION_ENABLED=true node scripts/test-enterprise-sap-sandbox-live.js

if (process.env.SAP_INTEGRATION_ENABLED !== 'true' || !process.env.SAP_SANDBOX_API_KEY) {
  console.log('SAP_INTEGRATION_ENABLED=true and SAP_SANDBOX_API_KEY must both be set -- skipping SAP sandbox live acceptance test.');
  console.log('Set them (e.g. `. ~/.tsm-sap.env; SAP_INTEGRATION_ENABLED=true`) and re-run.');
  process.exit(0);
}

const sap = require('../server/enterprise/sap-sandbox-adapter');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('PASS:', msg); } else { fail++; console.log('FAIL:', msg); } };

const cfg = sap.loadConfigFromEnv();
if (!cfg) {
  console.error('ERROR: SAP_INTEGRATION_ENABLED=true but loadConfigFromEnv() returned null -- check SAP_SANDBOX_API_KEY is set.');
  process.exit(1);
}
console.log('Target:', cfg.baseUrl, '(public sandbox gateway -- canned sample data, not a real tenant)');

(async () => {
  try {
    console.log('\n=== Business Partner (A_BusinessPartner) ===');
    const partners = await sap.getBusinessPartners({ top: 5 });
    ok(Array.isArray(partners), 'getBusinessPartners returns an array (' + partners.length + ' row(s))');
    if (partners.length) {
      const p = partners[0];
      ok(typeof p.businessPartner === 'string' || p.businessPartner === null, 'row has a businessPartner field');
      ok('raw' in p && typeof p.raw === 'object', 'row carries the unmodified raw OData record');
      console.log('  sample:', JSON.stringify({ businessPartner: p.businessPartner, name: p.businessPartnerFullName || p.organizationBPName1 }));
    } else {
      console.log('  (sandbox returned zero rows -- shape of an empty result still asserted above)');
    }

    console.log('\n=== Sales Order (A_SalesOrder) ===');
    const orders = await sap.getSalesOrders({ top: 5 });
    ok(Array.isArray(orders), 'getSalesOrders returns an array (' + orders.length + ' row(s))');
    if (orders.length) {
      const o = orders[0];
      ok(typeof o.salesOrder === 'string' || o.salesOrder === null, 'row has a salesOrder field');
      ok('raw' in o && typeof o.raw === 'object', 'row carries the unmodified raw OData record');
      console.log('  sample:', JSON.stringify({ salesOrder: o.salesOrder, soldToParty: o.soldToParty, totalNetAmount: o.totalNetAmount, currency: o.transactionCurrency }));
    } else {
      console.log('  (sandbox returned zero rows -- shape of an empty result still asserted above)');
    }

    console.log('\n=== HTTP route (server.js, booted in-process) ===');
    const http = require('http');
    process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || ('sap-sandbox-accept-secret-' + Date.now());
    process.env.TSM_ADMIN_PASSWORD = process.env.TSM_ADMIN_PASSWORD || ('sap-sandbox-accept-admin-' + Date.now());
    process.env.PORT = process.env.PORT || '8207';
    const port = Number(process.env.PORT);
    require('../server');
    await new Promise((r) => setTimeout(r, 400));

    const { signSession } = require('../middleware/require-auth');
    const cookie = 'tsm_session=' + encodeURIComponent(signSession({ role: 'admin', exp: Date.now() + 60000 }));
    const routeResult = await new Promise((resolve, reject) => {
      http.request({ host: '127.0.0.1', port, path: '/api/enterprise/sap/business-partners?top=3', method: 'GET', headers: { Cookie: cookie } }, (res) => {
        let d = ''; res.on('data', (c) => d += c); res.on('end', () => {
          let body = null; try { body = JSON.parse(d); } catch (e) { body = d; }
          resolve({ status: res.statusCode, body });
        });
      }).on('error', reject).end();
    });
    ok(routeResult.status === 200 && routeResult.body.ok === true && Array.isArray(routeResult.body.businessPartners),
      'GET /api/enterprise/sap/business-partners (real HTTP route, authenticated) -> 200 with real sandbox data');

    const statusResult = await new Promise((resolve, reject) => {
      http.request({ host: '127.0.0.1', port, path: '/api/enterprise/sap/status', method: 'GET', headers: { Cookie: cookie } }, (res) => {
        let d = ''; res.on('data', (c) => d += c); res.on('end', () => {
          let body = null; try { body = JSON.parse(d); } catch (e) { body = d; }
          resolve({ status: res.statusCode, body });
        });
      }).on('error', reject).end();
    });
    ok(statusResult.status === 200 && statusResult.body.enabled === true, 'GET /api/enterprise/sap/status reflects enabled:true');
  } catch (e) {
    fail++;
    console.error('\nUNEXPECTED ERROR:', e.message);
  } finally {
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }
})();
