'use strict';

const assert = require('assert');
const http = require('http');
const { spawn } = require('child_process');

const PORT = 8091;
const BASE = `http://127.0.0.1:${PORT}`;

let serverProcess;
let cookie;

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;

    const req = http.request(
      `${BASE}${path}`,
      {
        method,
        headers: {
          ...(payload ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          } : {}),
          ...headers
        }
      },
      res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          let json = null;

          try {
            json = JSON.parse(data);
          } catch (_) {}

          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: json
          });
        });
      }
    );

    req.on('error', reject);

    if (payload) req.write(payload);
    req.end();
  });
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const response = await request('GET', '/');
      if (response.status) return;
    } catch (_) {}

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('Test server did not start');
}

async function main() {
  serverProcess = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(PORT),
      TSM_ADMIN_PASSWORD: 'localtest-pw',
      TSM_SESSION_SECRET: 'localtest-secret-0123456789abcdef'
    },
    stdio: 'ignore'
  });

  try {
    await waitForServer();

    const login = await request(
      'POST',
      '/api/auth/login',
      { password: 'localtest-pw' }
    );

    assert.strictEqual(login.status, 200);
    assert.strictEqual(login.body.ok, true);
    assert.strictEqual(login.body.role, 'admin');

    const setCookie = login.headers['set-cookie'];
    assert.ok(setCookie && setCookie.length > 0);

    cookie = setCookie[0].split(';')[0];

    console.log('PASS authenticated admin login');

    const unauthenticated = await request(
      'POST',
      '/api/l1-copilot/lost-stolen/assess',
      {
        asset: 'TEST-ASSET-001',
        userVerified: true,
        assetVerified: true
      }
    );

    assert.strictEqual(unauthenticated.status, 401);

    console.log('PASS Lost/Stolen rejects unauthenticated request');

    const missingAsset = await request(
      'POST',
      '/api/l1-copilot/lost-stolen/assess',
      {
        userVerified: true,
        assetVerified: true
      },
      { Cookie: cookie }
    );

    assert.strictEqual(missingAsset.status, 400);
    assert.strictEqual(missingAsset.body.error, 'asset required');

    console.log('PASS Lost/Stolen requires asset');

    const missingUserVerification = await request(
      'POST',
      '/api/l1-copilot/lost-stolen/assess',
      {
        asset: 'TEST-ASSET-001',
        userVerified: false,
        assetVerified: true
      },
      { Cookie: cookie }
    );

    assert.strictEqual(missingUserVerification.status, 400);
    assert.strictEqual(
      missingUserVerification.body.error,
      'userVerified must be true'
    );

    console.log('PASS Lost/Stolen requires user verification');

    const missingAssetVerification = await request(
      'POST',
      '/api/l1-copilot/lost-stolen/assess',
      {
        asset: 'TEST-ASSET-001',
        userVerified: true,
        assetVerified: false
      },
      { Cookie: cookie }
    );

    assert.strictEqual(missingAssetVerification.status, 400);
    assert.strictEqual(
      missingAssetVerification.body.error,
      'assetVerified must be true'
    );

    console.log('PASS Lost/Stolen requires asset verification');

    const assessment = await request(
      'POST',
      '/api/l1-copilot/lost-stolen/assess',
      {
        asset: 'TEST-ASSET-001',
        userVerified: true,
        assetVerified: true
      },
      { Cookie: cookie }
    );

    assert.strictEqual(assessment.status, 200);
    assert.strictEqual(assessment.body.ok, true);
    assert.ok(assessment.body.assessment);

    assert.strictEqual(
      assessment.body.assessment.autonomousActionAllowed,
      false
    );

    assert.strictEqual(
      assessment.body.assessment.humanApprovalRequired,
      true
    );

    assert.strictEqual(
      assessment.body.assessment.requiresSecurityGate,
      true
    );

    console.log('PASS authenticated Lost/Stolen assessment');
    console.log('PASS autonomous action remains prohibited');
    console.log('PASS human approval remains required');
    console.log('PASS security gate remains required');

    console.log('');
    console.log('L1 Lost/Stolen route integration tests complete.');
  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  }
}

main().catch(error => {
  console.error('FAIL:', error.message);
  if (serverProcess) serverProcess.kill('SIGTERM');
  process.exit(1);
});
