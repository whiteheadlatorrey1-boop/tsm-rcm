// Integration test for /api/music/* endpoints.
// Verifies each endpoint accepts the field name it actually reads server-side.
// Run: node test-music-endpoints.js [base_url]
// Exits non-zero on any failure, so it's CI-friendly.

const BASE = process.argv[2] || 'https://tsm-consultz.fly.dev';

const cases = [
  {
    name: 'agent-pass (reads body.request, body.draft/lyrics, body.agent)',
    path: '/api/music/agent-pass',
    body: { request: 'Generate a one-line test hook about resilience' },
    check: (data) => data.ok === true && typeof data.output === 'string' && data.output.length > 0,
  },
  {
    name: 'strategy (reads body.query)',
    path: '/api/music/strategy',
    body: { query: 'Give a one-sentence test release strategy' },
    check: (data) => data.ok === true && typeof data.output === 'string' && data.output.length > 0,
  },
  {
    name: 'coach (reads body.query || body.message)',
    path: '/api/music/coach',
    body: { query: 'One sentence of test coaching advice' },
    check: (data) => data.ok === true && typeof data.output === 'string' && data.output.length > 0,
  },
  {
    name: 'guidance (reads body.query)',
    path: '/api/music/guidance',
    body: { query: 'One sentence of test industry guidance' },
    check: (data) => data.ok === true && typeof data.output === 'string' && data.output.length > 0,
  },
];

async function run() {
  let failures = 0;

  for (const c of cases) {
    process.stdout.write(`Testing ${c.name} ... `);
    try {
      const res = await fetch(BASE + c.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c.body),
      });
      const data = await res.json();
      if (c.check(data)) {
        console.log('PASS');
      } else {
        console.log('FAIL');
        console.log('  Response:', JSON.stringify(data).slice(0, 300));
        failures++;
      }
    } catch (e) {
      console.log('FAIL (request error)');
      console.log('  Error:', e.message);
      failures++;
    }
  }

  console.log(`\n${cases.length - failures}/${cases.length} passed`);
  if (failures > 0) process.exit(1);
}

run();
