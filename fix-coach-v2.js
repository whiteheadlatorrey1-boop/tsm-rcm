#!/usr/bin/env node
/**
 * fix-coach-v2.js
 * 1. Fixes the parse_failed error — replaces old Anthropic response parser
 *    in the existing /api/music/coach route with the correct Groq parser
 * 2. Fixes collapse button — replaces selector logic to find the tightest
 *    container around the generation buttons, not a broad parent div
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH   = path.resolve('html/music-command/index.html');
const SERVER_PATH = path.resolve('server.js');

[HTML_PATH, SERVER_PATH].forEach(p => {
  if (!fs.existsSync(p)) { console.error(`✗ Not found: ${p}`); process.exit(1); }
});

let html   = fs.readFileString ? fs.readFileString(HTML_PATH) : fs.readFileSync(HTML_PATH, 'utf8');
let server = fs.readFileSync(SERVER_PATH, 'utf8');

// ─── FIX 1: server.js — replace old Anthropic parser with Groq parser ────────
// The old code may have: data.content?.[0]?.text  (Anthropic format)
// We need:               data.choices?.[0]?.message?.content  (Groq/OpenAI format)

let serverFixed = false;

// Fix response parser
if (server.includes("data.content?.[0]?.text")) {
  server = server.replace(
    /const coaching = data\.content\?\.\[0\]\?\.text \|\| ['"]Unable[^'"]*['"]\s*;/g,
    `const coaching = data.choices?.[0]?.message?.content || 'Unable to generate coaching right now.';`
  );
  console.log('✓ Fixed Anthropic→Groq response parser');
  serverFixed = true;
}

// Fix model if still pointing at Claude
if (server.includes("claude-opus-4-5") || server.includes("claude-sonnet")) {
  server = server.replace(/claude-opus-4-5|claude-sonnet-[^\'"]+/g, 'openai/gpt-oss-120b');
  console.log('✓ Fixed model name to openai/gpt-oss-120b');
  serverFixed = true;
}

// Fix auth header if still using x-api-key
if (server.includes("'x-api-key': process.env.ANTHROPIC_API_KEY") &&
    server.includes('/api/music/coach')) {
  server = server.replace(
    /'x-api-key': process\.env\.ANTHROPIC_API_KEY,\s*\n\s*'anthropic-version': '2023-06-01'/,
    `'Authorization': \`Bearer \${process.env.GROQ_API_KEY}\``
  );
  console.log('✓ Fixed auth header to Groq Bearer token');
  serverFixed = true;
}

// Fix endpoint URL if still Anthropic
if (server.includes('api.anthropic.com/v1/messages') && server.includes('/api/music/coach')) {
  server = server.replace(
    /https:\/\/api\.anthropic\.com\/v1\/messages/g,
    'https://api.groq.com/openai/v1/chat/completions'
  );
  console.log('✓ Fixed API endpoint to Groq');
  serverFixed = true;
}

// Fix messages format — Anthropic uses system at top level, Groq uses it in messages array
// Pattern: body: JSON.stringify({ model:..., max_tokens:..., system: '...', messages:[{role:'user'...}] })
// becomes: body: JSON.stringify({ model:..., max_tokens:..., messages:[{role:'system',...},{role:'user'...}] })
if (server.includes("role: 'system'") === false && server.includes('/api/music/coach')) {
  server = server.replace(
    /system: '([^']+)',\s*\n(\s*)messages: \[\{ role: 'user'/,
    `messages: [\n$2  { role: 'system', content: '$1' },\n$2  { role: 'user'`
  );
  console.log('✓ Fixed system prompt into messages array (Groq format)');
  serverFixed = true;
}

if (!serverFixed) {
  console.log('→ server.js already looks correct, no changes needed');
}

// ─── FIX 2: html — replace collapse selector + add MutationObserver ──────────
// Replace the patchGenerationBox function with a smarter version that:
// - Finds the button row directly
// - Walks up only 1-2 levels to find the actual box
// - Uses a MutationObserver to catch dynamically rendered boxes

const OLD_PATCH_FN = `  // ── Collapse the hook/bridge/adlib generation box ─────────────────────────
  function patchGenerationBox() {
    // Find the monetization / generation box by looking for the buttons
    const btns = Array.from(document.querySelectorAll('button'));
    const hookBtn = btns.find(b => /generate hook/i.test(b.textContent));
    if (!hookBtn) return;

    const box = hookBtn.closest('[class*="panel"], [class*="box"], [class*="card"], [class*="modal"], section, div') || hookBtn.parentElement?.parentElement;
    if (!box || box.classList.contains('tsm-gen-box')) return;

    box.classList.add('tsm-gen-box');

    // Wrap inner content in collapsible body
    const body = document.createElement('div');
    body.className = 'tsm-gen-body';
    body.style.maxHeight = box.scrollHeight + 'px';
    while (box.firstChild) body.appendChild(box.firstChild);
    box.appendChild(body);

    // Add collapse button
    const colBtn = document.createElement('button');
    colBtn.className = 'tsm-gen-collapse-btn';
    colBtn.title = 'Collapse / Back';
    colBtn.innerHTML = '&#x2715;';
    colBtn.addEventListener('click', () => {
      box.classList.toggle('collapsed');
      colBtn.title = box.classList.contains('collapsed') ? 'Expand' : 'Collapse / Back';
      colBtn.innerHTML = box.classList.contains('collapsed') ? '&#x25BC;' : '&#x2715;';
    });
    box.insertBefore(colBtn, box.firstChild);
    console.log('[TSM Coach] Generation box collapse button added');
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    buildPanel();
    watchNav();
    // Try patching now, retry after JS finishes rendering
    patchGenerationBox();
    setTimeout(patchGenerationBox, 800);
    setTimeout(patchGenerationBox, 2000);
  }`;

const NEW_PATCH_FN = `  // ── Collapse the hook/bridge/adlib generation box ─────────────────────────
  function patchGenerationBox() {
    // Find any of the 4 generation buttons
    const btns = Array.from(document.querySelectorAll('button'));
    const genBtn = btns.find(b =>
      /generate hook|build bridge|place ad.lib|song structure/i.test(b.textContent)
    );
    if (!genBtn) return;

    // Walk up to find the tightest container that holds ALL 4 buttons
    let box = genBtn.parentElement;
    for (let i = 0; i < 4; i++) {
      if (!box) break;
      const inner = box.querySelectorAll('button');
      const hasAll = Array.from(inner).some(b => /generate hook/i.test(b.textContent)) &&
                     Array.from(inner).some(b => /build bridge/i.test(b.textContent));
      if (hasAll) break;
      box = box.parentElement;
    }
    if (!box || box === document.body) return;
    if (box.dataset.tsmGen) return; // already patched
    box.dataset.tsmGen = '1';
    box.style.position = 'relative';

    // Add collapse button directly — no wrapper needed
    const colBtn = document.createElement('button');
    colBtn.className = 'tsm-gen-collapse-btn';
    colBtn.title = 'Collapse';
    colBtn.textContent = '✕';
    colBtn.style.cssText = [
      'position:absolute', 'top:10px', 'right:10px',
      'width:28px', 'height:28px', 'border-radius:6px',
      'background:rgba(255,255,255,0.1)', 'border:1px solid rgba(255,255,255,0.2)',
      'color:rgba(255,255,255,0.8)', 'font-size:14px', 'cursor:pointer',
      'display:flex', 'align-items:center', 'justify-content:center',
      'z-index:100', 'transition:background 0.15s'
    ].join(';');

    let collapsed = false;
    // Identify the "body" — everything except the button row at the bottom
    const btnRow = genBtn.parentElement; // the row containing the 4 buttons

    colBtn.addEventListener('click', () => {
      collapsed = !collapsed;
      colBtn.textContent = collapsed ? '▼' : '✕';
      colBtn.title = collapsed ? 'Expand' : 'Collapse';
      // Hide everything inside the box except the button row and the colBtn itself
      Array.from(box.children).forEach(child => {
        if (child === colBtn || child === btnRow) return;
        child.style.display = collapsed ? 'none' : '';
      });
      // Also collapse if btnRow is a sibling of content
      if (collapsed) btnRow.style.display = 'none';
      else btnRow.style.display = '';
    });

    box.appendChild(colBtn);
    console.log('[TSM Coach] Collapse button added to generation box', box.className || box.id);
  }

  // ── MutationObserver — catch dynamically rendered generation box ───────────
  function watchForGenBox() {
    const observer = new MutationObserver(() => {
      const unpatched = Array.from(document.querySelectorAll('button')).find(b =>
        /generate hook/i.test(b.textContent)
      );
      if (unpatched) {
        const box = unpatched.closest('[data-tsm-gen]') ||
                    (unpatched.parentElement?.dataset?.tsmGen ? null : unpatched);
        if (unpatched && !unpatched.closest('[data-tsm-gen]')) patchGenerationBox();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    buildPanel();
    watchNav();
    patchGenerationBox();
    setTimeout(patchGenerationBox, 500);
    setTimeout(patchGenerationBox, 1500);
    setTimeout(patchGenerationBox, 3000);
    watchForGenBox();
  }`;

if (html.includes('patchGenerationBox')) {
  html = html.replace(OLD_PATCH_FN, NEW_PATCH_FN);
  if (html.includes('watchForGenBox')) {
    console.log('✓ Collapse button logic upgraded (smarter selector + MutationObserver)');
  } else {
    console.log('✗ Could not replace patchGenerationBox — string mismatch, applying fallback');
    // Fallback: inject a separate script that overrides the function
    const FALLBACK = `
<script id="tsm-collapse-fix">
(function() {
  function patchGenBox() {
    const btns = Array.from(document.querySelectorAll('button'));
    const genBtn = btns.find(b => /generate hook/i.test(b.textContent));
    if (!genBtn) return;
    let box = genBtn.parentElement;
    for (let i = 0; i < 5; i++) {
      if (!box || box === document.body) break;
      const allBtns = box.querySelectorAll('button');
      const hasHook   = Array.from(allBtns).some(b => /generate hook/i.test(b.textContent));
      const hasBridge = Array.from(allBtns).some(b => /build bridge/i.test(b.textContent));
      if (hasHook && hasBridge) break;
      box = box.parentElement;
    }
    if (!box || box === document.body || box.dataset.tsmGen) return;
    box.dataset.tsmGen = '1';
    box.style.position = 'relative';
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.title = 'Collapse';
    btn.style.cssText = 'position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:6px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);color:#fff;font-size:15px;cursor:pointer;z-index:200;display:flex;align-items:center;justify-content:center;';
    let open = true;
    btn.addEventListener('click', () => {
      open = !open;
      btn.textContent = open ? '✕' : '▼';
      Array.from(box.children).forEach(c => {
        if (c === btn) return;
        c.style.display = open ? '' : 'none';
      });
    });
    box.appendChild(btn);
    console.log('[TSM] Collapse btn attached to', box.tagName, box.className);
  }
  // Run after everything loads
  ['DOMContentLoaded','load'].forEach(e => window.addEventListener(e, () => {
    patchGenBox();
    setTimeout(patchGenBox, 800);
    setTimeout(patchGenBox, 2000);
  }));
  // Watch for dynamic render
  new MutationObserver(patchGenBox).observe(document.documentElement, {childList:true, subtree:true});
})();
</script>`;
    if (!html.includes('tsm-collapse-fix')) {
      html = html.replace('</body>', FALLBACK + '\n</body>');
      console.log('✓ Collapse fix injected via fallback script');
    }
  }
} else {
  console.log('→ patchGenerationBox not found in HTML — injecting standalone collapse script');
  const STANDALONE = `
<script id="tsm-collapse-fix">
(function() {
  function patchGenBox() {
    const btns = Array.from(document.querySelectorAll('button'));
    const genBtn = btns.find(b => /generate hook/i.test(b.textContent));
    if (!genBtn) return;
    let box = genBtn.parentElement;
    for (let i = 0; i < 5; i++) {
      if (!box || box === document.body) break;
      const all = box.querySelectorAll('button');
      if (Array.from(all).some(b => /generate hook/i.test(b.textContent)) &&
          Array.from(all).some(b => /build bridge/i.test(b.textContent))) break;
      box = box.parentElement;
    }
    if (!box || box === document.body || box.dataset.tsmGen) return;
    box.dataset.tsmGen = '1';
    box.style.position = 'relative';
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.title = 'Collapse';
    btn.style.cssText = 'position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:6px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);color:#fff;font-size:15px;cursor:pointer;z-index:200;';
    let open = true;
    btn.addEventListener('click', () => {
      open = !open;
      btn.textContent = open ? '✕' : '▼';
      Array.from(box.children).forEach(c => { if (c !== btn) c.style.display = open ? '' : 'none'; });
    });
    box.appendChild(btn);
  }
  ['DOMContentLoaded','load'].forEach(e => window.addEventListener(e, () => {
    patchGenBox(); setTimeout(patchGenBox, 800); setTimeout(patchGenBox, 2000);
  }));
  new MutationObserver(patchGenBox).observe(document.documentElement, {childList:true,subtree:true});
})();
</script>`;
  if (!html.includes('tsm-collapse-fix')) {
    html = html.replace('</body>', STANDALONE + '\n</body>');
    console.log('✓ Standalone collapse script injected');
  }
}

// ─── Write files ──────────────────────────────────────────────────────────────
fs.writeFileSync(HTML_PATH,   html,   'utf8');
fs.writeFileSync(SERVER_PATH, server, 'utf8');
console.log('\n✓ Both files written.\n');
console.log('Deploy:');
console.log('  node --check server.js && fly deploy --local-only --app tsm-shell\n');
console.log('Then verify in DevTools console — look for:');
console.log('  [TSM] Collapse btn attached to ...');
console.log('  No parse errors on /api/music/coach');
