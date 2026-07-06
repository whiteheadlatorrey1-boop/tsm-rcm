#!/usr/bin/env node
/**
 * apply-l1-assistant.js
 * ---------------------------------------------------------------------
 * One-shot installer for the L1 Copilot floating Assistant.
 * Run this FROM YOUR REPO ROOT (same folder as server.js):
 *
 *   node apply-l1-assistant.js
 *
 * Optional args if your paths differ from the defaults:
 *
 *   node apply-l1-assistant.js --server=path/to/server.js --html=path/to/l1-ticket-copilot.html
 *
 * What it does:
 *   1. Adds SP.l1Assistant prompt to the SP object in server.js
 *   2. Adds POST /api/l1-copilot/assistant route to server.js
 *   3. Injects the floating widget (button+panel+script) before </body>
 *      in your L1 Ticket Copilot HTML page
 *
 * Safety:
 *   - Idempotent: re-running it after it already applied is a no-op
 *     (it checks for markers before touching anything)
 *   - Backs up every file it edits to <file>.bak-<timestamp> before writing
 *   - Never touches anything if it can't find a safe insertion point —
 *     it prints what it needs from you instead of guessing
 * ---------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

// ── arg parsing ──────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  })
);

const SERVER_PATH = args.server || path.join(process.cwd(), 'server.js');
let HTML_PATH = args.html || null;

function log(msg)  { console.log('  ' + msg); }
function ok(msg)   { console.log('✔ ' + msg); }
function warn(msg) { console.log('⚠ ' + msg); }
function fail(msg) { console.log('✘ ' + msg); }

function backup(filePath) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bakPath = `${filePath}.bak-${stamp}`;
  fs.copyFileSync(filePath, bakPath);
  return bakPath;
}

// ── content blocks ───────────────────────────────────────────────────────
const SP_ENTRY = `  l1Assistant: 'You are the L1 Ticket Copilot Assistant for TSM Command IT support. ' +
    'A tier-1 technician will describe a live scenario in their own words — a ticket ' +
    'they are stuck on, an error message, a user complaint, or a "what should I do here" ' +
    'question. Give fast, practical, best-practice guidance a working L1 tech can act on ' +
    'immediately. Structure every answer as: (1) likely root cause in one line, ' +
    '(2) the 2-4 concrete next steps in order, (3) when to escalate and to whom ' +
    '(L2, vendor, or manager) if the steps do not resolve it. If the scenario mentions ' +
    'Dell hardware, factor in ProSupport vs Basic warranty guidance and what info ' +
    '(service tag / express service code) to have ready before contacting Dell. ' +
    'Be concise, no filler, no preamble, plain operational language a technician can ' +
    'read in a few seconds mid-ticket.',
`;

const ROUTE_BLOCK = `app.post('/api/l1-copilot/assistant', async (req, res) => {
  try {
    var scenario = (req.body.scenario || req.body.question || req.body.query || '').trim();
    if (!scenario) return res.status(400).json({ ok: false, error: 'scenario is required' });
    var a = await groqChat(SP.l1Assistant, scenario, req.body.maxTokens || 700);
    return res.json({ ok: true, answer: a, createdAt: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

`;

const WIDGET_MARKER = 'id="l1a-fab"';
const WIDGET_FRAGMENT = fs.existsSync(path.join(__dirname, 'l1-assistant-widget.html'))
  ? fs.readFileSync(path.join(__dirname, 'l1-assistant-widget.html'), 'utf8')
  : null;

// ── step 1: server.js ────────────────────────────────────────────────────
function applyServer() {
  if (!fs.existsSync(SERVER_PATH)) {
    fail(`server.js not found at ${SERVER_PATH}. Pass --server=path/to/server.js`);
    return false;
  }

  let src = fs.readFileSync(SERVER_PATH, 'utf8');
  let changed = false;
  const bak = backup(SERVER_PATH);
  log(`backed up server.js -> ${path.basename(bak)}`);

  // 1a. SP entry
  if (src.includes('l1Assistant:')) {
    warn('SP.l1Assistant already present — skipping prompt insertion');
  } else {
    const spStart = src.indexOf('var SP = {');
    if (spStart === -1) {
      fail('Could not find "var SP = {" in server.js — skipping prompt insertion. Add SP.l1Assistant manually (see SERVER_SNIPPET.md).');
    } else {
      let closeIdx = src.indexOf('\n};', spStart);
      if (closeIdx === -1) {
        fail('Could not find the closing "};" of the SP object — skipping prompt insertion.');
      } else {
        // The last entry before "};" may or may not have a trailing comma.
        // Find the last non-whitespace char before the close and add a
        // comma after it if it's missing, so the object stays valid.
        let i = closeIdx - 1;
        while (i > spStart && /\s/.test(src[i])) i--;
        if (src[i] !== ',') {
          src = src.slice(0, i + 1) + ',' + src.slice(i + 1);
          closeIdx += 1; // shifted by the inserted comma
        }
        src = src.slice(0, closeIdx + 1) + SP_ENTRY + src.slice(closeIdx + 1);
        changed = true;
        ok('inserted SP.l1Assistant prompt');
      }
    }
  }

  // 1b. route
  if (src.includes("/api/l1-copilot/assistant")) {
    warn('/api/l1-copilot/assistant route already present — skipping route insertion');
  } else {
    let anchorIdx = src.indexOf("app.post('/api/schools/query'");
    if (anchorIdx === -1) anchorIdx = src.indexOf('app.listen(');
    if (anchorIdx === -1) {
      fail('Could not find a safe anchor point for the new route — skipping. Add it manually (see SERVER_SNIPPET.md).');
    } else {
      src = src.slice(0, anchorIdx) + ROUTE_BLOCK + src.slice(anchorIdx);
      changed = true;
      ok('inserted POST /api/l1-copilot/assistant route');
    }
  }

  if (changed) {
    fs.writeFileSync(SERVER_PATH, src, 'utf8');
    ok(`wrote ${path.basename(SERVER_PATH)}`);
  } else {
    log('no changes needed for server.js');
  }
  return true;
}

// ── step 2: html widget ──────────────────────────────────────────────────
function findLikelyHtmlFile() {
  const htmlDir = path.join(process.cwd(), 'html');
  if (!fs.existsSync(htmlDir)) return null;

  const candidates = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) {
        const content = fs.readFileSync(full, 'utf8');
        if (/l1[\s-]?(ticket)?[\s-]?copilot/i.test(content) || /l1[\s-]?(ticket)?[\s-]?copilot/i.test(entry.name)) {
          candidates.push(full);
        }
      }
    }
  })(htmlDir);

  return candidates;
}

function applyWidget() {
  if (!WIDGET_FRAGMENT) {
    fail('l1-assistant-widget.html not found next to this script — download it into the same folder and re-run.');
    return;
  }

  if (!HTML_PATH) {
    const candidates = findLikelyHtmlFile();
    if (!candidates || candidates.length === 0) {
      warn('Could not auto-detect the L1 Ticket Copilot page under ./html.');
      log('Re-run with: node apply-l1-assistant.js --html=html/your-page.html');
      return;
    }
    if (candidates.length > 1) {
      warn('Found multiple possible pages, not guessing:');
      candidates.forEach(c => log(' - ' + c));
      log('Re-run with: node apply-l1-assistant.js --html=<one of the paths above>');
      return;
    }
    HTML_PATH = candidates[0];
    log(`auto-detected page: ${HTML_PATH}`);
  }

  if (!fs.existsSync(HTML_PATH)) {
    fail(`HTML file not found at ${HTML_PATH}`);
    return;
  }

  let html = fs.readFileSync(HTML_PATH, 'utf8');

  if (html.includes(WIDGET_MARKER)) {
    warn('widget already present in this page — skipping');
    return;
  }

  const bak = backup(HTML_PATH);
  log(`backed up ${path.basename(HTML_PATH)} -> ${path.basename(bak)}`);

  if (html.includes('</body>')) {
    html = html.replace('</body>', WIDGET_FRAGMENT + '\n</body>');
  } else {
    html = html + '\n' + WIDGET_FRAGMENT;
    warn('no </body> tag found — appended widget to end of file instead');
  }

  fs.writeFileSync(HTML_PATH, html, 'utf8');
  ok(`inserted floating widget into ${path.basename(HTML_PATH)}`);
}

// ── run ───────────────────────────────────────────────────────────────────
console.log('L1 Copilot Assistant — installer\n');
const serverOk = applyServer();
console.log('');
applyWidget();
console.log('\nDone. Restart your server (e.g. `npm start` / your Railway deploy) to pick up the new route.');
if (!serverOk) process.exitCode = 1;