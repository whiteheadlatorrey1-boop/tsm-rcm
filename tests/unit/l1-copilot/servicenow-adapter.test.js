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

const RITMS = [
  {
    sys_id: '11111111111111111111111111111111',
    number: 'RITM0010001',
    request: { value: '22222222222222222222222222222222', display_value: 'REQ0010001' },
    requested_for: { value: '33333333333333333333333333333333', display_value: 'Jane Doe' },
    short_description: 'New hire laptop',
    description: 'Prepare laptop for new employee',
    state: { value: '1', display_value: 'Open' },
    assignment_group: { value: '44444444444444444444444444444444', display_value: 'Desktop Support' },
    assigned_to: { value: '55555555555555555555555555555555', display_value: 'Tech One' },
    cat_item: { value: '66666666666666666666666666666666', display_value: 'New Hire Laptop' }
  }
];

const SC_TASKS = [
  {
    sys_id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    number: 'SCTASK0010001',
    request_item: { value: '11111111111111111111111111111111', display_value: 'RITM0010001' },
    short_description: 'Prepare laptop',
    description: 'Configure and test laptop',
    state: { value: '1', display_value: 'Open' },
    assignment_group: { value: '44444444444444444444444444444444', display_value: 'Desktop Support' },
    assigned_to: { value: '55555555555555555555555555555555', display_value: 'Tech One' }
  }
];

let lastRequest = null;
let patchBody = null;
let patchUrl = null;

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
      patchUrl = u.pathname;
      const sysId = u.pathname.split('/').pop();
      const incident = INCIDENTS.find(i => i.sys_id === sysId);

      // Simulate ServiceNow's journal-field append so the adapter's
      // read-after-write verification has real state to inspect.
      if (incident && patchBody.work_notes) {
        incident.work_notes = incident.work_notes
          ? `${incident.work_notes}\n${patchBody.work_notes}`
          : patchBody.work_notes;
      }

      if (incident && patchBody.state !== undefined) {
        incident.state = patchBody.state;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result: { sys_id: sysId, ...patchBody } }));
      return;
    }
    if (req.method === 'GET' && u.pathname === '/api/now/table/sc_req_item') {
      const number = u.searchParams.get('number');
      const sysId = u.searchParams.get('sys_id');

      const match = RITMS.filter(r =>
        (number && r.number === number) ||
        (sysId && r.sys_id === sysId)
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result: match }));
      return;
    }

    if (req.method === 'GET' && u.pathname === '/api/now/table/sc_task') {
      const number = u.searchParams.get('number');
      const sysId = u.searchParams.get('sys_id');
      const requestItem = u.searchParams.get('request_item');

      const match = SC_TASKS.filter(t =>
        (number && t.number === number) ||
        (sysId && t.sys_id === sysId) ||
        (requestItem && t.request_item.value === requestItem)
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result: match }));
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
  check('writeWorkNote PATCHed the correct sys_id path', patchUrl === '/api/now/table/incident/ffffffffffffffffffffffffffffffff');

  // updateTicketStatus
  const st = await adapter._pdi.updateTicketStatus('INC0012345', '6', config);
  check('updateTicketStatus reports success', st.success === true);
  check('updateTicketStatus PATCHed the state field', patchBody.state === '6');

  // writeWorkNote against a nonexistent incident -> real error, not silently ok
  let noTicketErr = null;
  try { await adapter.writeWorkNote('INC-NOPE-0000', 'x', config); } catch (e) { noTicketErr = e; }
  check('writeWorkNote errors when incident not found', !!noTicketErr && /No incident found/.test(noTicketErr.message));

  // getRequestItem — RITM read-only lookup
  const ritm = await adapter.getRequestItem('RITM0010001', config);
  check('getRequestItem returns matching RITM', ritm && ritm.number === 'RITM0010001');
  check('getRequestItem captures sys_id', ritm && ritm.sysId === '11111111111111111111111111111111');
  check('getRequestItem resolves requested_for', ritm && ritm.requestedFor === '33333333333333333333333333333333');
  check('getRequestItem resolves assignment group', ritm && ritm.assignmentGroup === '44444444444444444444444444444444');
  check('getRequestItem resolves catalog item', ritm && ritm.catalogItem === '66666666666666666666666666666666');
  check('getRequestItem sends GET only', lastRequest.method === 'GET');
  check('getRequestItem sends sysparm_limit=1', lastRequest.url.includes('sysparm_limit=1'));
  check('getRequestItem sends sysparm_display_value=all', lastRequest.url.includes('sysparm_display_value=all'));

  // getRequestItem — sys_id lookup
  const ritmBySysId = await adapter.getRequestItem(
    '11111111111111111111111111111111',
    config
  );
  check('getRequestItem accepts sys_id', ritmBySysId && ritmBySysId.number === 'RITM0010001');

  // getCatalogTask — SC Task read-only lookup
  const scTask = await adapter.getCatalogTask('SCTASK0010001', config);
  check('getCatalogTask returns matching SC Task', scTask && scTask.number === 'SCTASK0010001');
  check('getCatalogTask captures sys_id', scTask && scTask.sysId === 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  check('getCatalogTask resolves request item', scTask && scTask.requestItem === '11111111111111111111111111111111');
  check('getCatalogTask resolves assignment group', scTask && scTask.assignmentGroup === '44444444444444444444444444444444');
  check('getCatalogTask sends GET only', lastRequest.method === 'GET');

  // RITM -> SC Task reconciliation
  const tasks = await adapter.getCatalogTasksByRequestItem(
    'RITM0010001',
    config
  );
  check('getCatalogTasksByRequestItem returns matching task', tasks.length === 1);
  check('getCatalogTasksByRequestItem returns SCTASK number', tasks[0] && tasks[0].number === 'SCTASK0010001');
  const taskUrl = new URL(lastRequest.url, config.instanceUrl);
  check(
    'getCatalogTasksByRequestItem uses RITM sys_id reference',
    taskUrl.searchParams.get('request_item') === '11111111111111111111111111111111'
  );
  check('RITM/SC Task lookup leaves PATCH state untouched', patchBody && patchBody.state === '6');

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
