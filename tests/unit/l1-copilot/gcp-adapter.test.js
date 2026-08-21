// Standalone test (node tests/unit/l1-copilot/gcp-adapter.test.js).
// Injects a fake InstancesClient (matching the aggregatedListAsync async-
// iterable shape the GCP Compute SDK uses) so the adapter's request logic
// and response normalization are exercised without needing a real GCP
// project or network access. This is the honest substitute here too — it
// does not replace a smoke test against a real GCP project before rollout.

const adapter = require('../../../server/l1-copilot/gcp-adapter');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS:', name); }
  else { fail++; console.log('FAIL:', name); }
}

const INSTANCE = {
  id: '1234567890123456789',
  name: 'l1-test-vm',
  status: 'RUNNING',
  machineType: 'https://www.googleapis.com/compute/v1/projects/demo/zones/us-central1-a/machineTypes/e2-medium',
  zone: 'https://www.googleapis.com/compute/v1/projects/demo/zones/us-central1-a',
  creationTimestamp: '2026-01-01T00:00:00.000-08:00',
  networkInterfaces: [{
    networkIP: '10.128.0.5',
    accessConfigs: [{ natIP: '34.10.20.30' }]
  }]
};

/** Fake InstancesClient — mimics aggregatedListAsync's async-iterable [zoneKey, scopedList] pairs. */
function makeFakeClient({ pages } = {}) {
  const defaultPages = [
    ['zones/us-west1-a', { instances: [] }],
    ['zones/us-central1-a', { instances: [INSTANCE] }]
  ];
  const usePages = pages !== undefined ? pages : defaultPages;
  return {
    aggregatedListAsync() {
      return (async function* () {
        for (const page of usePages) yield page;
      })();
    }
  };
}

async function run() {
  // isConfigured checks
  check('isConfigured true with projectId+credentials',
    adapter.isConfigured({ projectId: 'demo', credentials: { client_email: 'x', private_key: 'y' } }));
  check('isConfigured false with missing credentials',
    !adapter.isConfigured({ projectId: 'demo' }));

  // loadConfigFromEnv malformed JSON
  const prevProject = process.env.GCP_PROJECT_ID;
  const prevKey = process.env.GCP_SERVICE_ACCOUNT_KEY_JSON;
  process.env.GCP_PROJECT_ID = 'demo';
  process.env.GCP_SERVICE_ACCOUNT_KEY_JSON = '{not valid json';
  check('loadConfigFromEnv returns null on malformed key JSON', adapter.loadConfigFromEnv() === null);
  delete process.env.GCP_PROJECT_ID;
  delete process.env.GCP_SERVICE_ACCOUNT_KEY_JSON;

  // getInstance: not configured
  try {
    await adapter.getInstance('l1-test-vm', {});
    check('getInstance throws GcpNotConfiguredError when unconfigured', false);
  } catch (e) {
    check('getInstance throws GcpNotConfiguredError when unconfigured', e.code === 'GCP_NOT_CONFIGURED');
  }

  const cfg = { projectId: 'demo', credentials: { client_email: 'x', private_key: 'y' } };

  // getInstance: found, across zones
  const found = await adapter.getInstance('l1-test-vm', cfg, makeFakeClient());
  check('getInstance returns matching record across zones', !!found);
  check('getInstance resolves zone short name', found && found.zone === 'us-central1-a');
  check('getInstance resolves status', found && found.status === 'RUNNING');
  check('getInstance resolves machineType short name', found && found.machineType === 'e2-medium');
  check('getInstance resolves privateIp', found && found.privateIp === '10.128.0.5');
  check('getInstance resolves publicIp', found && found.publicIp === '34.10.20.30');
  check('getInstance resolves instanceId as string', found && found.instanceId === '1234567890123456789');

  // getInstance: not found (all zones empty)
  const notFound = await adapter.getInstance('does-not-exist', cfg, makeFakeClient({ pages: [
    ['zones/us-west1-a', { instances: [] }],
    ['zones/us-central1-a', { instances: [] }]
  ] }));
  check('getInstance returns null when not found', notFound === null);

  // restore env
  if (prevProject !== undefined) process.env.GCP_PROJECT_ID = prevProject; else delete process.env.GCP_PROJECT_ID;
  if (prevKey !== undefined) process.env.GCP_SERVICE_ACCOUNT_KEY_JSON = prevKey; else delete process.env.GCP_SERVICE_ACCOUNT_KEY_JSON;

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
