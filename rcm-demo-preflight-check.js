// Pre-demo preflight check for RCM OS Acts 2 & 3.
//
// Unlike rcm-os-prod-check.js (page-load health), this hits the actual
// mutating endpoints that Act 2 (relay hand-off) and Act 3 (AI guidance)
// depend on, using the real auth contract: POST /api/auth/login (server.js)
// checks the password against TSM_ADMIN_PASSWORD and, on success, sets a
// signed `tsm_session` cookie via middleware/require-auth.js. That's a
// different mechanism than TSM_CLIENT_KEY, which the demo script's
// presenter notes incorrectly point to -- this script uses the real one.
//
// Usage:
//   node rcm-demo-preflight-check.js
//   TSM_ADMIN_PASSWORD="<real password>" node rcm-demo-preflight-check.js --login
//
// Run once with no flags to confirm the endpoints correctly reject
// unauthenticated requests. Then re-run with --login (and the real
// password set via TSM_ADMIN_PASSWORD, or --password) to log in for real
// and verify Act 2 and Act 3 end-to-end.
//
// Alternative: if you'd rather not put the password in your shell/env,
// pass an already-obtained cookie directly with --cookie "tsm_session=<value>"
// (e.g. copied from browser dev tools after logging in through the UI).

const BASE = process.env.TSM_BASE_URL || 'https://tsm-consultz.fly.dev';

function parseFlagArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function parseCookieArg() {
  const raw = parseFlagArg('--cookie');
  if (!raw) return null;
  // Accept either "tsm_session=abc.def" or just the raw "abc.def" value.
  return raw.includes('=') ? raw : `tsm_session=${raw}`;
}

// Logs in via the real POST /api/auth/login route and returns a usable
// Cookie header string, or null if login wasn't requested/failed.
async function loginAndGetCookie() {
  const wantsLogin = process.argv.includes('--login');
  if (!wantsLogin) return null;

  const password = parseFlagArg('--password') || process.env.TSM_ADMIN_PASSWORD;
  if (!password) {
    console.error('--login given but no password found. Set TSM_ADMIN_PASSWORD or pass --password "<value>".');
    process.exit(1);
  }

  const res = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const json = await res.json().catch(() => null);

  if (res.status !== 200 || !json || json.ok !== true) {
    console.error(`Login failed: status ${res.status} -- ${JSON.stringify(json)}`);
    process.exit(1);
  }

  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) {
    console.error('Login returned ok:true but no Set-Cookie header came back. Cannot proceed.');
    process.exit(1);
  }
  // Set-Cookie looks like: tsm_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=...
  const cookiePair = setCookie.split(';')[0];
  console.log(`Logged in successfully. Session cookie acquired.\n`);
  return cookiePair;
}

async function req(method, path, { cookie, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON or empty body, fine */ }
  return { status: res.status, json };
}

const SAMPLE_RELAY_PAYLOAD = {
  docName: 'preflight-check-sample.pdf',
  generatedAt: new Date().toISOString(),
  engines: {
    triage: 'Sample triage text for preflight check only.',
    variance: 'Sample variance text for preflight check only.',
    actionPlan: 'Sample action plan text for preflight check only.',
    executive: 'Sample executive summary text for preflight check only.',
  },
};

const SAMPLE_GUIDANCE_PAYLOAD = {
  engines: SAMPLE_RELAY_PAYLOAD.engines,
  stats: { openExceptions: 2, pctComplete: 40, docName: SAMPLE_RELAY_PAYLOAD.docName },
  selfReported: [],
};

(async () => {
  const cookie = parseCookieArg() || await loginAndGetCookie();
  const results = [];

  console.log(`\n=== RCM OS Demo Preflight Check ===`);
  console.log(`Target: ${BASE}`);
  console.log(cookie ? `Auth: cookie supplied\n` : `Auth: none (testing unauthenticated behavior)\n`);

  // 1. Unauthenticated relay POST should always 401, regardless of --cookie,
  //    so run this check with cookie stripped out deliberately.
  {
    const r = await req('POST', '/api/rcm/relay', { body: SAMPLE_RELAY_PAYLOAD });
    const ok = r.status === 401;
    results.push({
      name: 'POST /api/rcm/relay with NO auth returns 401',
      pass: ok,
      detail: `status ${r.status}` + (ok ? '' : ` (expected 401) -- body: ${JSON.stringify(r.json)}`),
    });
  }

  // 2. Unauthenticated guidance POST should also 401.
  {
    const r = await req('POST', '/api/rcm/guidance', { body: SAMPLE_GUIDANCE_PAYLOAD });
    const ok = r.status === 401;
    results.push({
      name: 'POST /api/rcm/guidance with NO auth returns 401',
      pass: ok,
      detail: `status ${r.status}` + (ok ? '' : ` (expected 401) -- body: ${JSON.stringify(r.json)}`),
    });
  }

  if (cookie) {
    // 3. Authenticated relay POST should succeed -- this is Act 2.
    {
      const r = await req('POST', '/api/rcm/relay', { cookie, body: SAMPLE_RELAY_PAYLOAD });
      const ok = r.status === 200 && r.json && r.json.ok === true;
      results.push({
        name: 'POST /api/rcm/relay WITH session cookie succeeds (Act 2 dependency)',
        pass: ok,
        detail: `status ${r.status} -- body: ${JSON.stringify(r.json)}`,
      });
    }

    // 4. Confirm the relay we just staged is retrievable, same as RCM OS
    //    would do on load to show the RELAY RECEIVED modal.
    {
      const r = await req('GET', '/api/rcm/relay');
      const ok = r.status === 200 && r.json && r.json.docName === SAMPLE_RELAY_PAYLOAD.docName;
      results.push({
        name: 'GET /api/rcm/relay returns the staged payload (RCM OS pickup)',
        pass: ok,
        detail: `status ${r.status} -- docName: ${r.json && r.json.docName}`,
      });
    }

    // 5. Authenticated guidance POST -- this is Act 3. Report degraded vs live.
    {
      const r = await req('POST', '/api/rcm/guidance', { cookie, body: SAMPLE_GUIDANCE_PAYLOAD });
      const ok = r.status === 200 && Array.isArray(r.json && r.json.items);
      const degraded = r.json && r.json.degraded;
      results.push({
        name: 'POST /api/rcm/guidance WITH session cookie succeeds (Act 3 dependency)',
        pass: ok,
        detail: ok
          ? (degraded
              ? `LIVE, but running in FALLBACK mode -- reason: "${r.json.reason}". The "honesty beat" will trigger live; confirm that's what you want to demo.`
              : `LIVE and using real Groq guidance (degraded: false) -- ${r.json.items.length} item(s) returned.`)
          : `status ${r.status} -- body: ${JSON.stringify(r.json)}`,
      });
    }

    // 6. Clean up the sample relay so it doesn't sit in history/current
    //    ahead of the real demo.
    {
      const r = await req('DELETE', '/api/rcm/relay', { cookie });
      results.push({
        name: 'DELETE /api/rcm/relay cleans up the sample payload',
        pass: r.status === 200,
        detail: `status ${r.status}`,
      });
    }
  } else {
    results.push({
      name: 'Authenticated checks (Act 2 / Act 3 end-to-end)',
      pass: null,
      detail: 'SKIPPED -- re-run with --cookie "tsm_session=<value>" to actually verify these before demoing live.',
    });
  }

  console.log('--- Results ---\n');
  let anyFail = false;
  for (const r of results) {
    const tag = r.pass === true ? 'PASS' : r.pass === false ? 'FAIL' : 'SKIP';
    if (r.pass === false) anyFail = true;
    console.log(`[${tag}] ${r.name}`);
    console.log(`   ${r.detail}\n`);
  }

  if (!cookie) {
    console.log('NOTE: this run only confirmed the endpoints reject unauthenticated requests.');
    console.log('It did NOT confirm Act 2 or Act 3 will work live -- re-run with:');
    console.log('  TSM_ADMIN_PASSWORD="<real password>" node rcm-demo-preflight-check.js --login\n');
  }

  console.log(anyFail ? '=== RESULT: FAIL (see above) ===' : '=== RESULT: OK (see notes above) ===');
  process.exit(anyFail ? 1 : 0);
})();