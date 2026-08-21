// Standalone test (node tests/unit/l1-copilot/graph-intune-adapter.test.js).
// Spins up a local HTTP server that mimics both the Azure AD token endpoint
// and the Microsoft Graph API shape, so the adapter's real token-fetching,
// caching, and response-parsing logic is exercised end-to-end — not just
// reviewed by eye. No live Azure AD tenant is reachable from this sandbox,
// so this is the honest substitute; it does not replace a smoke test
// against a real tenant (with an actual app registration + admin consent)
// before rollout.

const http = require('http');
const adapter = require('../../../server/l1-copilot/graph-intune-adapter');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS:', name); }
  else { fail++; console.log('FAIL:', name); }
}

const DEVICES = [
  {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    deviceName: 'L1-TEST-LAPTOP-01',
    userPrincipalName: 'jane.doe@contoso.com',
    complianceState: 'compliant',
    managementState: 'managed',
    operatingSystem: 'Windows',
    osVersion: '10.0.22631',
    isEncrypted: true,
    lastSyncDateTime: '2026-08-20T12:00:00Z',
    manufacturer: 'Dell Inc.',
    model: 'Latitude 7440',
    autopilotEnrolled: true
  }
];

let tokenRequestCount = 0;

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const u = new URL(req.url, 'http://localhost');

    if (req.method === 'POST' && u.pathname === '/token') {
      tokenRequestCount++;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ access_token: 'fake-token-' + tokenRequestCount, expires_in: 3600 }));
      return;
    }

    if (req.method === 'GET' && u.pathname === '/graph/deviceManagement/managedDevices') {
      const filter = u.searchParams.get('$filter') || '';
      const match = DEVICES.filter(d => filter.includes(d.deviceName));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ value: filter.includes('NOPE') ? [] : match }));
      return;
    }

    if (req.method === 'GET' && u.pathname.startsWith('/graph/deviceManagement/managedDevices/')) {
      const id = u.pathname.split('/').pop();
      const match = DEVICES.find(d => d.id === id);
      if (!match) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: { message: 'Device not found' } })); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(match));
      return;
    }

    if (req.method === 'POST' && u.pathname === '/token-broken') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_client', error_description: 'AADSTS7000215: Invalid client secret provided.' }));
      return;
    }

    res.writeHead(404); res.end('not found');
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseCfg = {
    tenantId: 'test-tenant', clientId: 'test-client', clientSecret: 'test-secret',
    tokenUrl: `http://localhost:${port}/token`,
    graphBaseUrl: `http://localhost:${port}/graph`
  };

  check('isConfigured true with tenantId+clientId+clientSecret', adapter.isConfigured(baseCfg));
  check('isConfigured false with missing clientSecret', !adapter.isConfigured({ tenantId: 'x', clientId: 'y' }));

  try {
    await adapter.getDevice('L1-TEST-LAPTOP-01', {});
    check('getDevice throws GraphNotConfiguredError when unconfigured', false);
  } catch (e) {
    check('getDevice throws GraphNotConfiguredError when unconfigured', e.code === 'GRAPH_NOT_CONFIGURED');
  }

  {
    const result = await adapter.getDevice('L1-TEST-LAPTOP-01', baseCfg);
    check('getDevice returns matching record by name', result && result.deviceName === 'L1-TEST-LAPTOP-01');
    check('getDevice resolves complianceState', result.complianceState === 'compliant');
    check('getDevice resolves isEncrypted (BitLocker proxy)', result.isEncrypted === true);
    check('getDevice resolves userPrincipalName', result.userPrincipalName === 'jane.doe@contoso.com');
    check('getDevice resolves manufacturer/model', result.manufacturer === 'Dell Inc.' && result.model === 'Latitude 7440');
  }

  {
    const result = await adapter.getDevice('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', baseCfg);
    check('getDevice returns matching record by GUID', result && result.deviceName === 'L1-TEST-LAPTOP-01');
  }

  {
    const result = await adapter.getDevice('11111111-2222-3333-4444-555555555555', baseCfg);
    check('getDevice returns null for unknown GUID (404)', result === null);
  }

  {
    const result = await adapter.getDevice('NOPE-DOES-NOT-EXIST', baseCfg);
    check('getDevice returns null when name not found', result === null);
  }

  {
    const beforeCount = tokenRequestCount;
    await adapter.getDevice('L1-TEST-LAPTOP-01', baseCfg);
    await adapter.getDevice('L1-TEST-LAPTOP-01', baseCfg);
    check('token is cached across requests (no new token fetch)', tokenRequestCount === beforeCount);
  }

  {
    const brokenCfg = { ...baseCfg, tenantId: 'broken-tenant', tokenUrl: `http://localhost:${port}/token-broken` };
    try {
      await adapter.getDevice('L1-TEST-LAPTOP-01', brokenCfg);
      check('bad client secret surfaces Azure AD error message', false);
    } catch (e) {
      check('bad client secret surfaces Azure AD error message', /Invalid client secret/.test(e.message));
    }
  }

  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
})();
