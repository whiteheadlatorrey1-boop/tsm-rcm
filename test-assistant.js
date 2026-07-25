#!/usr/bin/env node
'use strict';

/**
 * test-assistant.js
 * 1. Verifies all patched functions exist in the HTML
 * 2. Extracts the Groq API key + endpoint from the HTML
 * 3. Fires live test calls for each new function's prompt path
 * 4. Reports pass/fail per test
 *
 * Usage:
 *   node test-assistant.js
 *   node test-assistant.js --verbose
 */

const fs   = require('fs');
const http  = require('https');

const FILE    = 'html/music-command/index.html';
const VERBOSE = process.argv.includes('--verbose');
const PASS    = '✅';
const FAIL    = '❌';
const WARN    = '⚠️ ';

let totalPass = 0;
let totalFail = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ok(label) {
  console.log(`${PASS}  ${label}`);
  totalPass++;
}

function fail(label, detail) {
  console.log(`${FAIL}  ${label}`);
  if (detail) console.log(`     ${detail}`);
  totalFail++;
}

function log(msg) {
  if (VERBOSE) console.log(`     ${msg}`);
}

function post(url, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts    = {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers }
    };
    const req = http.request(url, opts, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch (e) { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Step 1 — File exists ─────────────────────────────────────────────────────
console.log('\n── Step 1: File integrity ───────────────────────────────────────');

if (!fs.existsSync(FILE)) {
  fail('HTML file found', `${FILE} missing`);
  process.exit(1);
}
const html = fs.readFileSync(FILE, 'utf8');
ok(`HTML file readable (${(html.length / 1024).toFixed(0)} KB)`);

// ─── Step 2 — All patched functions present ───────────────────────────────────
console.log('\n── Step 2: Patched functions present ────────────────────────────');

const REQUIRED_FNS = [
  'function placeAdlibs()',
  'function generateHook()',
  'function buildBridge()',
  'function tsmStudioGuide()',
  'function tsmAssistantUpdate(',
];

for (const fn of REQUIRED_FNS) {
  if (html.includes(fn)) ok(fn);
  else                    fail(fn, 'not found in HTML after patch');
}

// Check for duplicate definitions (would cause silent JS bugs)
console.log('\n── Step 3: No duplicate function definitions ─────────────────────');
for (const fn of REQUIRED_FNS) {
  const count = (html.split(fn)).length - 1;
  if (count === 1)      ok(`${fn} — defined once`);
  else if (count === 0) fail(`${fn} — missing`);
  else                  fail(`${fn} — defined ${count}× (duplicate!)`);
}

// ─── Step 4 — Extract Groq key & endpoint from the HTML ───────────────────────
console.log('\n── Step 4: Groq config extraction ───────────────────────────────');

// Common patterns: GROQ_API_KEY, apiKey, groq.com/openai/v1
// Broader key search: catches gsk_ keys in any quote style, header assignments, or env vars
  const keyMatch = html.match(/gsk_[A-Za-z0-9_]{20,}/)
                || html.match(/['"`](gsk_[A-Za-z0-9_]{20,})['"`]/)
                || html.match(/GROQ_API_KEY[^'"`]*['"`]([^'"`]{20,})['"`]/);
const endpointMatch = html.match(/['"`](https:\/\/[^'"`]*groq[^'"`]*)['"`]/i)
                   || html.match(/['"`](https:\/\/api\.groq\.com[^'"`]*)['"`]/i);

let groqKey = keyMatch
    ? (keyMatch[1] || keyMatch[0])  // broader regex may not have a capture group
    : null;
let groqEndpoint = endpointMatch ? endpointMatch[1] : 'https://api.groq.com/openai/v1/chat/completions';

// Also check for a process.env / server-side key if this is a Node backend
if (!groqKey) {
  groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || null;
}

if (groqKey) {
  ok(`Groq API key found (${groqKey.slice(0, 8)}...)`);
  log(`Endpoint: ${groqEndpoint}`);
} else {
  fail('Groq API key', 'not found in HTML or env. Set GROQ_API_KEY env var to test live calls.');
  console.log('\n── Skipping live API tests (no key) ─────────────────────────────');
  summary();
  process.exit(totalFail > 0 ? 1 : 0);
}

// ─── Step 5 — Live API tests ──────────────────────────────────────────────────
console.log('\n── Step 5: Live Groq API calls ──────────────────────────────────');

// Detect model used in the HTML
const modelMatch = html.match(/model['":\s]+['"`]([\w\d.:-]+)['"`]/i);
const MODEL = modelMatch ? modelMatch[1] : 'openai/gpt-oss-120b';
log(`Using model: ${MODEL}`);

const HEADERS = {
  'Authorization': `Bearer ${groqKey}`,
};

async function liveTest(label, messages, validator) {
  try {
    const res = await post(
      new URL(groqEndpoint),
      HEADERS,
      { model: MODEL, max_tokens: 120, messages }
    );
    if (res.status !== 200) {
      fail(label, `HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 120)}`);
      return;
    }
    const text = res.body?.choices?.[0]?.message?.content || '';
    log(`Response: ${text.slice(0, 120).replace(/\n/g,' ')}`);
    if (validator && !validator(text)) {
      fail(label, `Response didn't pass validator. Got: ${text.slice(0, 80)}`);
    } else {
      ok(label);
    }
  } catch (e) {
    fail(label, e.message);
  }
}

async function runLiveTests() {

  // Test 1 — basic connectivity
  await liveTest(
    'Basic connectivity (ping)',
    [{ role: 'user', content: 'Reply with only the word: PONG' }],
    t => t.toUpperCase().includes('PONG')
  );

  // Test 2 — placeAdlibs prompt path
  await liveTest(
    'placeAdlibs prompt path',
    [
      {
        role: 'system',
        content: 'You are a precision ad-lib placement tool. Return ONLY the lyrics with (ad-libs) in parentheses. No commentary.'
      },
      {
        role: 'user',
        content: 'Ad-lib words: yeah, ay\n\nPlace them in:\nI came from nothing\nNow I stand on top'
      }
    ],
    t => (t.includes('yeah') || t.includes('ay')) && t.toLowerCase().includes('nothing')
  );

  // Test 3 — generateHook prompt path
  await liveTest(
    'generateHook prompt path',
    [
      {
        role: 'system',
        content: 'You are an elite hook writer. Output ONLY hook options — no preamble.'
      },
      {
        role: 'user',
        content: 'Write 2 hook options (2 lines each) for a song about rising from struggle.\nLabel them Hook Option 1 / Hook Option 2.'
      }
    ],
    t => t.includes('Hook Option 1') && t.includes('Hook Option 2')
  );

  // Test 4 — buildBridge prompt path
  await liveTest(
    'buildBridge prompt path',
    [
      {
        role: 'system',
        content: 'You are a bridge architect. Output ONLY bridge options — no preamble.'
      },
      {
        role: 'user',
        content: 'Write 2 bridge options (2 lines each) that contrast a dark verse about struggle.\nLabel them Bridge Option 1 / Bridge Option 2.'
      }
    ],
    t => t.includes('Bridge Option') 
  );

  // Test 5 — tsmStudioGuide prompt path
  await liveTest(
    'tsmStudioGuide prompt path',
    [
      {
        role: 'system',
        content: 'You are TSM\'s AI music mentor. Be direct — no filler.'
      },
      {
        role: 'user',
        content: 'Name 3 studio tools with one pro tip each. Format: Tool: Tip'
      }
    ],
    t => t.length > 20
  );

  // Test 6 — tsmAssistantUpdate dispatcher: check all action branches exist
  console.log('\n── Step 6: tsmAssistantUpdate action coverage ───────────────────');
  const ACTIONS = ['place_adlibs', 'generate_hook', 'build_bridge', 'send_to_revision', 'save_to_bank', 'open_tool', 'studio_guide'];
  for (const action of ACTIONS) {
    if (html.includes(`'${action}'`) || html.includes(`"${action}"`)) {
      ok(`action '${action}' present`);
    } else {
      fail(`action '${action}' missing from tsmAssistantUpdate`);
    }
  }

  summary();
}

function summary() {
  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log(`Results: ${totalPass} passed, ${totalFail} failed`);
  if (totalFail === 0) {
    console.log('\n🚀  All checks passed — safe to deploy:');
    console.log('    fly deploy -a tsm-shell');
  } else {
    console.log('\n🛑  Fix the failures above before deploying.');
  }
}

runLiveTests().catch(e => {
  console.error('\nUnhandled error:', e);
  process.exit(1);
});
