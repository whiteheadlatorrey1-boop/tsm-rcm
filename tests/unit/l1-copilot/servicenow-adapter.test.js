// Standalone test (node tests/unit/l1-copilot/servicenow-adapter.test.js).
// Spins up a local HTTP server that mimics ServiceNow's Table API shape so
// the adapter's real request-building, auth, and response-parsing logic is
// exercised end-to-end — not just reviewed by eye. No live ServiceNow
// instance is reachable from this sandbox, so this is the honest substitute;
// it does not replace a smoke test against a real dev instance before rollout.

const http = require('http');
const adapter = require('../../../server/l1-copilot/servicenow-adapter');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS:', name); }
  else { fail++; console.log('FAIL:', name); }
}

const HARDWARE = [
  { sys_id: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', asset_tag: 'FIN-LT-0042', manufacturer: { display_value: 'Dell', value: 'dellsysid' }, model_id: { display_value: 'Latitude 7440' }, warranty_expiration: '2027-03-01', assigned_to: { display_value: 'Jane Doe' }, department: { display_value: 'Finance' }, purchase_date: '2024-03-01', install_status: '1' }
];
const INCIDENTS = [
  { sys_id: 'ffffffffffffffffffffffffffffffff', number: 'INC0012345', priority: '2', caller_id: { display_value: 'Jane Doe' }, short_description: 'Laptop will not boot', assignment_group: { display_value: 'Desktop Support' }, state: '2', cmdb_ci: { display_value: 'FIN-LT-0042' } }
];

let lastRequest = null;
let patchBody = null;

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    lastRequest = { method: req.method, url: req.url, headers: req.headers, body };
    const u = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && u.pathname === '/api/now/table/cmdb_ci_hardware') {
      const q = u.searchParams.get('sysparm_query') || '';
      const match = q.includes('assigned_to') ? HARDWARE : HARDWARE.filter(h => q.includes(h.asset_tag));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result: q.includes('NOPE') ? [] : match }));
      return;
    }
    if (req.method === 'GET' && u.pathname === '/api/now/table/incident') {
      const q = u.searchParams.get('sysparm_query') || '';
      const match = INCIDENTS.filter(i => q.includes(i.number) || q.includes(i.sys_id));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result: q.includes('NOPE') ? [] : match }));
      return;
    }
    if (req.method === 'PATCH' && u.pathname.startsWith('/api/now/table/incident/')) {
      patchBody = JSON.parse(body || '{}');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result: { sys_id: u.pathname.split('/').pop(), ...patchBody } }));
      return;
    }
    if (req.method === 'GET' && u.pathname === '/api/now/table/broken') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Internal instance error' } }));
      return;
    }
    res.writeHead(404); res.end('not found');
  });
});

async function main() {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const config = { instanceUrl: `http://localhost:${port}`, username: 'admin', password: 'secret', fieldMap: adapter.DEFAULT_FIELD_MAP };

  // isConfigured / not-configured error
  check('isConfigured true with instanceUrl+username+password', adapter.isConfigured(config));
  check('isConfigured false with no instanceUrl', !adapter.isConfigured({}));
  let threwNotConfigured = false;
  try { await adapter.getAsset('X', {}); } catch (e) { threwNotConfigured = e instanceof adapter.ServiceNowNotConfiguredError; }
  check('getAsset throws ServiceNowNotConfiguredError when unconfigured', threwNotConfigured);

  // getAsset happy path
  const asset = await adapter.getAsset('FIN-LT-0042', config);
  check('getAsset returns matching record', asset && asset.assetTag === 'FIN-LT-0042');
  check('getAsset resolves manufacturer display_value', asset.manufacturer === 'Dell');
  check('getAsset resolves model display_value', asset.model === 'Latitude 7440');
  check('getAsset resolves warranty field', asset.warrantyStatus === '2027-03-01');
  check('getAsset request used Basic auth header', lastRequest.headers.authorization === 'Basic ' + Buffer.from('admin:secret').toString('base64'));
  check('getAsset request set sysparm_display_value=all', lastRequest.url.includes('sysparm_display_value=all'));

  // getAsset not found
  const missing = await adapter.getAsset('NOPE-0000', config);
  check('getAsset returns null when not found', missing === null);

  // getTicket happy path (by number)
  const ticket = await adapter.getTicket('INC0012345', config);
  check('getTicket returns matching incident', ticket && ticket.number === 'INC0012345');
  check('getTicket resolves requester', ticket.requester === 'Jane Doe');
  check('getTicket resolves assignment group', ticket.assignmentGroup === 'Desktop Support');
  check('getTicket captures sys_id for later writes', ticket.sysId === 'ffffffffffffffffffffffffffffffff');

  // writeWorkNote — looks up sys_id first, then PATCHes
  const wn = await adapter.writeWorkNote('INC0012345', 'Replaced battery, verified boot.', config);
  check('writeWorkNote reports success', wn.success === true);
  check('writeWorkNote PATCHed the work_notes field with the given text', patchBody.work_notes === 'Replaced battery, verified boot.');
  check('writeWorkNote PATCHed the correct sys_id path', lastRequest.url.includes('ffffffffffffffffffffffffffffffff'));

  // updateTicketStatus
  const st = await adapter.updateTicketStatus('INC0012345', '6', config);
  check('updateTicketStatus reports success', st.success === true);
  check('updateTicketStatus PATCHed the state field', patchBody.state === '6');

  // writeWorkNote against a nonexistent incident -> real error, not silently ok
  let noTicketErr = null;
  try { await adapter.writeWorkNote('INC-NOPE-0000', 'x', config); } catch (e) { noTicketErr = e; }
  check('writeWorkNote errors when incident not found', !!noTicketErr && /No incident found/.test(noTicketErr.message));

  // searchAssetsByUser
  const owned = await adapter.searchAssetsByUser('Jane Doe', config);
  check('searchAssetsByUser returns asset tags', owned.includes('FIN-LT-0042'));

  // upstream HTTP error surfaces as a real error with the ServiceNow message
  let upstreamErr = null;
  try { await adapter._internal.snRequest(config, 'GET', '/api/now/table/broken'); } catch (e) { upstreamErr = e; }
  check('upstream 500 surfaces ServiceNow error message', !!upstreamErr && upstreamErr.message === 'Internal instance error');

  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
