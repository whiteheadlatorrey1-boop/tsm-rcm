// Standalone test (node tests/unit/l1-copilot/cloud-ops-adapter.test.js).
// Injects a fake EC2Client (matching the .send(command) shape the AWS SDK
// v3 uses) so the adapter's request-building and response-normalization
// logic is exercised without needing a real AWS account or network access.
// This is the honest substitute here too — it does not replace a smoke
// test against a real AWS account before rollout.

const adapter = require('../../../server/l1-copilot/cloud-ops-adapter');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS:', name); }
  else { fail++; console.log('FAIL:', name); }
}

const INSTANCE = {
  InstanceId: 'i-0abc123def456789',
  InstanceType: 't3.medium',
  State: { Name: 'running' },
  Placement: { AvailabilityZone: 'us-east-1a' },
  PrivateIpAddress: '10.0.1.15',
  PublicIpAddress: '54.10.20.30',
  LaunchTime: '2026-01-01T00:00:00Z',
  Tags: [{ Key: 'Name', Value: 'l1-test-box' }]
};

/** Fake EC2Client — mimics the AWS SDK v3 `.send(command)` interface. */
function makeFakeClient({ describeResult, statusResult, throwOnStatus } = {}) {
  return {
    async send(command) {
      const name = command.constructor.name;
      if (name === 'DescribeInstancesCommand') {
        return describeResult !== undefined ? describeResult : { Reservations: [{ Instances: [INSTANCE] }] };
      }
      if (name === 'DescribeInstanceStatusCommand') {
        if (throwOnStatus) throw new Error('instance has no status (e.g. stopped)');
        return statusResult !== undefined ? statusResult : {
          InstanceStatuses: [{ SystemStatus: { Status: 'ok' }, InstanceStatus: { Status: 'ok' } }]
        };
      }
      throw new Error('unexpected command: ' + name);
    }
  };
}

const cfg = { accessKeyId: 'AKIAFAKE', secretAccessKey: 'fakesecret', region: 'us-east-1' };

(async () => {
  check('isConfigured true with accessKeyId+secretAccessKey+region', adapter.isConfigured(cfg));
  check('isConfigured false with missing region', !adapter.isConfigured({ accessKeyId: 'x', secretAccessKey: 'y' }));

  // getInstance throws when unconfigured
  try {
    await adapter.getInstance('i-0abc123def456789', {});
    check('getInstance throws CloudOpsNotConfiguredError when unconfigured', false);
  } catch (e) {
    check('getInstance throws CloudOpsNotConfiguredError when unconfigured', e.code === 'CLOUD_OPS_NOT_CONFIGURED');
  }

  // getInstance by instance ID, with status
  {
    const client = makeFakeClient({});
    const result = await adapter.getInstance('i-0abc123def456789', cfg, client);
    check('getInstance returns matching record by ID', result && result.instanceId === 'i-0abc123def456789');
    check('getInstance resolves Name tag', result.name === 'l1-test-box');
    check('getInstance resolves state', result.state === 'running');
    check('getInstance resolves instanceType', result.instanceType === 't3.medium');
    check('getInstance resolves privateIp', result.privateIp === '10.0.1.15');
    check('getInstance resolves publicIp', result.publicIp === '54.10.20.30');
    check('getInstance resolves systemStatus', result.systemStatus === 'ok');
    check('getInstance resolves instanceStatus', result.instanceStatus === 'ok');
  }

  // getInstance by Name tag
  {
    const client = makeFakeClient({});
    const result = await adapter.getInstance('l1-test-box', cfg, client);
    check('getInstance returns record when queried by Name tag', result && result.instanceId === 'i-0abc123def456789');
  }

  // getInstance returns null when not found
  {
    const client = makeFakeClient({ describeResult: { Reservations: [] } });
    const result = await adapter.getInstance('i-doesnotexist', cfg, client);
    check('getInstance returns null when not found', result === null);
  }

  // getInstance still succeeds (best-effort) when status check throws (e.g. stopped instance)
  {
    const client = makeFakeClient({ throwOnStatus: true });
    const result = await adapter.getInstance('i-0abc123def456789', cfg, client);
    check('getInstance succeeds when status check throws', result && result.instanceId === 'i-0abc123def456789');
    check('getInstance has null systemStatus when status check failed', !result.systemStatus);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
})();
