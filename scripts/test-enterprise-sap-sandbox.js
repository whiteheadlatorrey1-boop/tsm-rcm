'use strict';
// Offline regression coverage for the SAP Business Accelerator Hub sandbox
// adapter (server/enterprise/sap-sandbox-adapter.js) and its routes
// (routes/sap-sandbox.js). Fakes global.fetch -- no network calls, no real
// SAP sandbox key needed. See scripts/test-enterprise-sap-sandbox-live.js
// for the live acceptance run against the real sandbox.

process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || 'test-session-secret';

const assert = require('assert');
const http = require('http');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('PASS: ' + msg); } else { fail++; console.log('FAIL: ' + msg); } };

function httpGet(port, path, cookie) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (cookie) headers.Cookie = cookie;
    http.request({ host: '127.0.0.1', port, path, method: 'GET', headers }, (res) => {
      let d = ''; res.on('data', (c) => d += c); res.on('end', () => {
        let b = null; try { b = d ? JSON.parse(d) : null; } catch (e) { b = d; }
        resolve({ status: res.statusCode, body: b });
      });
    }).on('error', reject).end();
  });
}

async function configGating() {
  delete process.env.SAP_INTEGRATION_ENABLED;
  delete process.env.SAP_SANDBOX_API_KEY;
  const sap = require('../server/enterprise/sap-sandbox-adapter');
  ok(sap.loadConfigFromEnv() === null, 'loadConfigFromEnv() is null with SAP_INTEGRATION_ENABLED unset');
  ok(sap.isConfigured() === false, 'isConfigured() is false with nothing set');

  process.env.SAP_SANDBOX_API_KEY = 'fake-key-no-flag';
  ok(sap.loadConfigFromEnv() === null, 'a present API key alone (no SAP_INTEGRATION_ENABLED=true) still does not configure it');

  process.env.SAP_INTEGRATION_ENABLED = 'true';
  delete process.env.SAP_SANDBOX_API_KEY;
  ok(sap.loadConfigFromEnv() === null, 'SAP_INTEGRATION_ENABLED=true alone (no key) still does not configure it');

  process.env.SAP_SANDBOX_API_KEY = 'fake-key';
  const cfg = sap.loadConfigFromEnv();
  ok(!!cfg && cfg.apiKey === 'fake-key' && cfg.baseUrl === 'https://sandbox.api.sap.com', 'both set -> configured, baseUrl is the real sandbox host');
  ok(sap.isConfigured() === true, 'isConfigured() is true once both are set');

  delete process.env.SAP_INTEGRATION_ENABLED;
  delete process.env.SAP_SANDBOX_API_KEY;
}

async function requestShapeAndNormalization() {
  process.env.SAP_INTEGRATION_ENABLED = 'true';
  process.env.SAP_SANDBOX_API_KEY = 'fake-key';
  const sap = require('../server/enterprise/sap-sandbox-adapter');

  let capturedUrl = null;
  let capturedHeaders = null;
  const origFetch = global.fetch;
  global.fetch = async (url, opts) => {
    capturedUrl = url;
    capturedHeaders = opts.headers;
    if (String(url).includes('API_BUSINESS_PARTNER')) {
      return {
        ok: true, status: 200,
        text: async () => JSON.stringify({ d: { results: [
          { BusinessPartner: '1003764', BusinessPartnerFullName: 'Sample Corp', BusinessPartnerCategory: '2', OrganizationBPName1: 'Sample Corp' },
        ] } }),
      };
    }
    if (String(url).includes('API_SALES_ORDER_SRV')) {
      return {
        ok: true, status: 200,
        text: async () => JSON.stringify({ d: { results: [
          { SalesOrder: '101', SoldToParty: '1003764', SalesOrderType: 'OR', TotalNetAmount: '1500.00', TransactionCurrency: 'USD' },
        ] } }),
      };
    }
    return { ok: false, status: 404, text: async () => '{}' };
  };

  try {
    const partners = await sap.getBusinessPartners({ top: 5 });
    ok(String(capturedUrl).startsWith('https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner'), 'getBusinessPartners hits the real sandbox Business Partner path');
    ok(capturedHeaders.APIKey === 'fake-key', 'request carries the APIKey header (not Basic/Bearer auth)');
    ok(String(capturedUrl).includes('%24top=5'), 'top param is forwarded as OData $top (percent-encoded as %24top, which SAP decodes server-side)');
    ok(Array.isArray(partners) && partners.length === 1 && partners[0].businessPartner === '1003764' && partners[0].raw.BusinessPartner === '1003764', 'getBusinessPartners normalizes the OData d.results row and keeps raw');

    const orders = await sap.getSalesOrders({ top: 5 });
    ok(String(capturedUrl).startsWith('https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder'), 'getSalesOrders hits the real sandbox Sales Order path');
    ok(orders.length === 1 && orders[0].salesOrder === '101' && orders[0].totalNetAmount === '1500.00', 'getSalesOrders normalizes the OData row');

    global.fetch = async () => ({ ok: false, status: 500, text: async () => JSON.stringify({ error: { message: { value: 'boom' } } }) });
    try {
      await assert.rejects(sap.getBusinessPartners({ top: 1 }), /boom/);
      ok(true, 'a non-2xx sandbox response surfaces the SAP error message');
    } catch (e) {
      ok(false, 'a non-2xx sandbox response surfaces the SAP error message: ' + e.message);
    }
  } finally {
    global.fetch = origFetch;
    delete process.env.SAP_INTEGRATION_ENABLED;
    delete process.env.SAP_SANDBOX_API_KEY;
  }
}

async function notConfiguredThrows() {
  const sap = require('../server/enterprise/sap-sandbox-adapter');
  try {
    await sap.getBusinessPartners({ top: 1 });
    ok(false, 'getBusinessPartners throws when not configured');
  } catch (e) {
    ok(e.code === 'SAP_NOT_CONFIGURED', 'getBusinessPartners throws SapNotConfiguredError when not configured (code=' + e.code + ')');
  }
}

function neverExportsAWriteFunction() {
  const sap = require('../server/enterprise/sap-sandbox-adapter');
  const exportedNames = Object.keys(sap);
  ok(!exportedNames.some((n) => /^(create|update|post|write|delete)/i.test(n)), 'adapter exports no write-shaped function at all (' + exportedNames.join(', ') + ')');
}

async function routesConfigured() {
  process.env.SAP_INTEGRATION_ENABLED = 'true';
  process.env.SAP_SANDBOX_API_KEY = 'fake-key';

  const origFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes('API_BUSINESS_PARTNER')) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ d: { results: [{ BusinessPartner: 'BP1' }] } }) };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify({ d: { results: [{ SalesOrder: 'SO1' }] } }) };
  };

  const express = require('express');
  const { signSession } = require('../middleware/require-auth');
  const router = require('../routes/sap-sandbox');
  const app = express();
  app.use(express.json());
  app.use(router);
  const cookieFor = (role) => 'tsm_session=' + signSession({ role, exp: Date.now() + 60000 });

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.on('listening', resolve));
  const port = server.address().port;

  try {
    let r = await httpGet(port, '/api/enterprise/sap/business-partners', null);
    ok(r.status === 401, 'GET business-partners without a session -> 401 (got ' + r.status + ')');

    r = await httpGet(port, '/api/enterprise/sap/business-partners', cookieFor('client'));
    ok(r.status === 200 && r.body.ok && Array.isArray(r.body.businessPartners) && r.body.businessPartners[0].businessPartner === 'BP1',
      'GET business-partners with any authenticated session (client) -> 200 with normalized data');

    r = await httpGet(port, '/api/enterprise/sap/sales-orders', cookieFor('admin'));
    ok(r.status === 200 && r.body.ok && r.body.salesOrders[0].salesOrder === 'SO1', 'GET sales-orders with a staff session -> 200');

    r = await httpGet(port, '/api/enterprise/sap/status', cookieFor('admin'));
    ok(r.status === 200 && r.body.enabled === true, 'GET status reflects enabled:true when configured');
  } finally {
    server.close();
    global.fetch = origFetch;
    delete process.env.SAP_INTEGRATION_ENABLED;
    delete process.env.SAP_SANDBOX_API_KEY;
  }
}

async function routesNotConfigured() {
  const { signSession } = require('../middleware/require-auth');
  const router = require('../routes/sap-sandbox');
  const express = require('express');
  const app = express();
  app.use(router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.on('listening', resolve));
  const port = server.address().port;
  try {
    const cookie = 'tsm_session=' + signSession({ role: 'admin', exp: Date.now() + 60000 });
    const r = await httpGet(port, '/api/enterprise/sap/business-partners', cookie);
    ok(r.status === 503 && r.body.error === 'SAP_NOT_CONFIGURED', 'GET business-partners with SAP_INTEGRATION_ENABLED unset -> 503 SAP_NOT_CONFIGURED (got ' + r.status + ')');
  } finally {
    server.close();
  }
}

(async () => {
  await configGating();
  await requestShapeAndNormalization();
  await notConfiguredThrows();
  neverExportsAWriteFunction();
  await routesConfigured();
  await routesNotConfigured();

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
