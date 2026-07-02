#!/usr/bin/env node
/**
 * TSM Music Command Center — Patch Script
 * Fixes:
 *   1. Collapse/back button on the hook/bridge/adlib generation box
 *   2. Full tab-aware TSM AI Coach (Draft+Analysis, Revision, Generate,
 *      Song Bank, Artist DNA, Studio Tools)
 */

const fs = require('fs');
const path = require('path');

// ─── Locate files ────────────────────────────────────────────────────────────
const HTML_PATH  = path.resolve('html/music-command/index.html');
const SERVER_PATH = path.resolve('server.js');

[HTML_PATH, SERVER_PATH].forEach(p => {
  if (!fs.existsSync(p)) {
    console.error(`✗ Not found: ${p}`);
    process.exit(1);
  }
});

let html   = fs.readFileSync(HTML_PATH,   'utf8');
let server = fs.readFileSync(SERVER_PATH, 'utf8');

// ─── 1. SERVER — /api/music/coach route ──────────────────────────────────────
const COACH_ROUTE = `
// ── TSM AI Coach ──────────────────────────────────────────────────────────────
app.post('/api/music/coach', async (req, res) => {
  try {
    const { tab, lyrics, dna, songTitle, sessionData } = req.body;

    const tabPrompts = {
      'draft': \`You are TSM Music Coach. The creator is in DRAFT + ANALYSIS mode.
Their current lyrics/hook: \${lyrics || '(none yet)'}
Song title: \${songTitle || 'untitled'}

Give concise, actionable coaching (3-5 bullet points) covering:
• Hook strength — does it have a sticky opening line?
• Cadence & flow — syllable count, stressed beats
• Emotional resonance — what feeling does it trigger?
• One specific rewrite suggestion with example
• Next best action (e.g. "Generate hook variants", "Add a pre-chorus")\`,

      'revision': \`You are TSM Music Coach. The creator is in REVISION MODE.
Current draft: \${lyrics || '(none yet)'}

Give targeted revision coaching:
• Identify the weakest line and show a rewrite
• Check rhyme scheme consistency (AABB, ABAB, etc.)
• Suggest one word swap that elevates the imagery
• Flag any clichés and offer fresher alternatives
• Confirm whether the hook hits within the first 8 bars\`,

      'generate': \`You are TSM Music Coach. The creator is in GENERATE mode, creating AI variants.
Base lyrics: \${lyrics || '(none yet)'}
Artist DNA: \${JSON.stringify(dna || {})}

Coaching for AI generation:
• Best prompt strategy for their style (from DNA)
• 3 variation directions to try (e.g. "darker tone", "uptempo energy", "hook-first")
• How to evaluate which AI output to keep
• What to paste into the variant prompt box for best results
• Warning signs of a weak AI-generated hook\`,

      'song-bank': \`You are TSM Music Coach. The creator is browsing their SONG BANK.
Help them curate and decide:
• How to identify their strongest unreleased track
• What makes a song "release ready" vs "needs work"
• How to sequence songs for maximum impact
• Which draft to prioritize for revision next
• How to tag songs for quick retrieval\`,

      'artist-dna': \`You are TSM Music Coach. The creator is building their ARTIST DNA profile.
Current DNA: \${JSON.stringify(dna || {})}

DNA coaching:
• How to define their sonic lane in 3 words
• Key influences to list and why they matter to A&R
• Emotional signature — what feeling should every song leave?
• Style keywords that help AI generate on-brand output
• Common DNA mistakes that make output too generic\`,

      'studio-tools': \`You are TSM Music Coach. The creator is in STUDIO TOOLS.
Available tools: vocal chain presets, beat matching, key/tempo analyzer, mix notes

Coaching:
• Which tool to use first for their current session goal
• How to use the vocal chain to match their DNA style
• Beat matching tips for their target BPM range
• How to write mix notes that a producer can actually use
• Checklist before sending a session to a collaborator\`
    };

    const prompt = tabPrompts[tab] || tabPrompts['draft'];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${process.env.GROQ_API_KEY}\`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_tokens: 600,
        messages: [
          { role: 'system', content: 'You are TSM Music Coach — a sharp, encouraging A&R advisor who gives punchy, specific advice. No fluff. Use bullet points. Speak to the creator like a trusted collaborator who knows the music industry.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();
    const coaching = data.choices?.[0]?.message?.content || 'Unable to generate coaching right now.';
    res.json({ ok: true, coaching, tab });
  } catch (err) {
    console.error('Coach error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
`;

// Insert before the last app.listen or before module.exports
const SERVER_INSERT_BEFORE = server.includes('app.listen') ? 'app.listen' : 'module.exports';
if (!server.includes('/api/music/coach')) {
  server = server.replace(SERVER_INSERT_BEFORE, COACH_ROUTE + '\n' + SERVER_INSERT_BEFORE);
  console.log('✓ /api/music/coach route added to server.js');
} else {
  console.log('→ /api/music/coach already exists, skipping');
}

// ─── 2. HTML — Collapse button injected into the generation box ───────────────
// The hook/bridge/adlib box has buttons: GENERATE HOOK, BUILD BRIDGE, PLACE AD-LIBS, SONG STRUCTURE
// We inject a close/collapse button at the top-right of that panel.

const MONETIZATION_CSS = `
/* ── Generation Box Collapse ──────────────────────────────────────────── */
.tsm-gen-box { position: relative; }
.tsm-gen-collapse-btn {
  position: absolute;
  top: 8px; right: 8px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.7);
  border-radius: 6px;
  width: 28px; height: 28px;
  font-size: 16px; line-height: 1;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
  z-index: 10;
}
.tsm-gen-collapse-btn:hover { background: rgba(255,255,255,0.18); color: #fff; }
.tsm-gen-body { transition: max-height 0.25s ease, opacity 0.2s; overflow: hidden; }
.tsm-gen-box.collapsed .tsm-gen-body { max-height: 0 !important; opacity: 0; pointer-events: none; }
.tsm-gen-box.collapsed .tsm-gen-collapse-btn { transform: rotate(180deg); }

/* ── TSM AI Coach Panel ───────────────────────────────────────────────── */
#tsm-coach-fab {
  position: fixed;
  bottom: 24px; right: 24px;
  width: 52px; height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: #fff;
  border: none;
  font-size: 22px;
  cursor: pointer;
  z-index: 9000;
  box-shadow: 0 4px 18px rgba(124,58,237,0.5);
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
}
#tsm-coach-fab:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(124,58,237,0.65); }

#tsm-coach-panel {
  position: fixed;
  bottom: 90px; right: 24px;
  width: 340px;
  max-height: 520px;
  background: #111827;
  border: 1px solid rgba(124,58,237,0.4);
  border-radius: 14px;
  overflow: hidden;
  display: flex; flex-direction: column;
  z-index: 8999;
  box-shadow: 0 8px 40px rgba(0,0,0,0.55);
  transform: translateY(16px) scale(0.97);
  opacity: 0;
  pointer-events: none;
  transition: transform 0.22s ease, opacity 0.18s ease;
}
#tsm-coach-panel.open {
  transform: translateY(0) scale(1);
  opacity: 1;
  pointer-events: all;
}
#tsm-coach-header {
  padding: 12px 16px;
  background: rgba(124,58,237,0.18);
  border-bottom: 1px solid rgba(124,58,237,0.3);
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
#tsm-coach-header h3 {
  margin: 0; font-size: 13px; font-weight: 600;
  color: #c4b5fd; letter-spacing: 0.04em; text-transform: uppercase;
}
#tsm-coach-tab-label {
  font-size: 11px; color: rgba(196,181,253,0.6);
  background: rgba(124,58,237,0.2);
  padding: 2px 8px; border-radius: 20px;
}
#tsm-coach-close {
  background: none; border: none; color: rgba(196,181,253,0.5);
  font-size: 18px; cursor: pointer; line-height: 1;
}
#tsm-coach-close:hover { color: #fff; }
#tsm-coach-tabs {
  display: flex; gap: 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0; overflow-x: auto;
}
.tsm-ctab {
  padding: 7px 12px; font-size: 11px; color: rgba(255,255,255,0.45);
  border: none; background: none; cursor: pointer; white-space: nowrap;
  border-bottom: 2px solid transparent; transition: color 0.15s;
  flex-shrink: 0;
}
.tsm-ctab.active { color: #a78bfa; border-bottom-color: #7c3aed; }
.tsm-ctab:hover:not(.active) { color: rgba(255,255,255,0.7); }
#tsm-coach-body {
  flex: 1; overflow-y: auto; padding: 14px 16px; font-size: 13px;
  color: rgba(255,255,255,0.82); line-height: 1.65;
}
#tsm-coach-body ul { margin: 8px 0; padding-left: 18px; }
#tsm-coach-body li { margin-bottom: 6px; }
#tsm-coach-body strong { color: #c4b5fd; }
#tsm-coach-loading {
  display: flex; align-items: center; gap: 8px;
  color: rgba(255,255,255,0.4); font-size: 12px;
}
.tsm-coach-spinner {
  width: 14px; height: 14px; border: 2px solid rgba(124,58,237,0.3);
  border-top-color: #7c3aed; border-radius: 50%;
  animation: tsm-spin 0.7s linear infinite;
}
@keyframes tsm-spin { to { transform: rotate(360deg); } }
#tsm-coach-footer {
  padding: 10px 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
#tsm-coach-refresh {
  width: 100%; padding: 8px;
  background: rgba(124,58,237,0.2);
  border: 1px solid rgba(124,58,237,0.4);
  color: #a78bfa; border-radius: 8px;
  font-size: 12px; cursor: pointer; transition: background 0.15s;
}
#tsm-coach-refresh:hover { background: rgba(124,58,237,0.35); }
`;

// ─── 3. HTML — inject CSS ─────────────────────────────────────────────────────
if (!html.includes('tsm-coach-fab')) {
  html = html.replace('</style>', MONETIZATION_CSS + '\n</style>');
  console.log('✓ Coach + collapse CSS injected');
} else {
  console.log('→ Coach CSS already present');
}

// ─── 4. HTML — inject JS before </body> ──────────────────────────────────────
const COACH_JS = `
<script id="tsm-coach-system">
(function() {
  // ── Tab names ──────────────────────────────────────────────────────────────
  const TAB_META = {
    'draft':        { label: 'Draft + Analysis', icon: '✏️', key: 'draft' },
    'revision':     { label: 'Revision Mode',    icon: '🔁', key: 'revision' },
    'generate':     { label: 'Generate',          icon: '✨', key: 'generate' },
    'song-bank':    { label: 'Song Bank',         icon: '🗂️', key: 'song-bank' },
    'artist-dna':   { label: 'Artist DNA',        icon: '🧬', key: 'artist-dna' },
    'studio-tools': { label: 'Studio Tools',      icon: '🎛️', key: 'studio-tools' },
  };
  let activeTab = 'draft';
  let coachOpen = false;
  let lastCoaching = {};

  // ── Detect active tab from sidebar links ───────────────────────────────────
  function detectTab() {
    const active = document.querySelector('.sidebar-link.active, [data-tab].active, nav a.active');
    if (!active) return 'draft';
    const text = (active.textContent || '').toLowerCase().trim();
    if (text.includes('draft') || text.includes('analysis')) return 'draft';
    if (text.includes('revision')) return 'revision';
    if (text.includes('generate')) return 'generate';
    if (text.includes('song bank')) return 'song-bank';
    if (text.includes('artist dna')) return 'artist-dna';
    if (text.includes('studio')) return 'studio-tools';
    return 'draft';
  }

  // ── Get current lyrics from whatever textarea is visible ──────────────────
  function getCurrentLyrics() {
    const areas = document.querySelectorAll('textarea, .lyric-input, [contenteditable]');
    for (const el of areas) {
      const val = el.value || el.textContent || '';
      if (val.trim().length > 10) return val.trim().slice(0, 800);
    }
    return '';
  }

  // ── Fetch coaching from server ─────────────────────────────────────────────
  async function fetchCoaching(tab) {
    if (lastCoaching[tab]) {
      renderCoaching(lastCoaching[tab], tab);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/music/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab, lyrics: getCurrentLyrics() })
      });
      const d = await r.json();
      if (d.ok) {
        lastCoaching[tab] = d.coaching;
        renderCoaching(d.coaching, tab);
      } else {
        renderCoaching('Unable to load coaching. Check your API key.', tab);
      }
    } catch (e) {
      renderCoaching('Could not connect to coaching server.', tab);
    }
    setLoading(false);
  }

  function setLoading(on) {
    const body = document.getElementById('tsm-coach-body');
    if (!body) return;
    if (on) body.innerHTML = '<div class="tsm-coach-loading"><div class="tsm-coach-spinner"></div>Loading coaching…</div>';
  }

  function renderCoaching(text, tab) {
    const body = document.getElementById('tsm-coach-body');
    if (!body) return;
    // Convert markdown bullets to HTML
    const html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^\\* (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\\n/g, '<br>');
    body.innerHTML = html;
    const label = document.getElementById('tsm-coach-tab-label');
    if (label && TAB_META[tab]) label.textContent = TAB_META[tab].label;
  }

  // ── Build coach panel HTML ─────────────────────────────────────────────────
  function buildPanel() {
    const fab = document.createElement('button');
    fab.id = 'tsm-coach-fab';
    fab.title = 'TSM AI Coach';
    fab.innerHTML = '🎵';
    document.body.appendChild(fab);

    const panel = document.createElement('div');
    panel.id = 'tsm-coach-panel';
    panel.innerHTML = \`
      <div id="tsm-coach-header">
        <h3>TSM AI Coach</h3>
        <span id="tsm-coach-tab-label">Draft + Analysis</span>
        <button id="tsm-coach-close" title="Close">✕</button>
      </div>
      <div id="tsm-coach-tabs">
        \${Object.entries(TAB_META).map(([k,v]) =>
          \`<button class="tsm-ctab\${k===activeTab?' active':''}" data-tab="\${k}">\${v.icon} \${v.label}</button>\`
        ).join('')}
      </div>
      <div id="tsm-coach-body">
        <div class="tsm-coach-loading">
          <div class="tsm-coach-spinner"></div>Select a tab to start coaching…
        </div>
      </div>
      <div id="tsm-coach-footer">
        <button id="tsm-coach-refresh">↻ Refresh coaching for this tab</button>
      </div>
    \`;
    document.body.appendChild(panel);

    // Events
    fab.addEventListener('click', () => {
      coachOpen = !coachOpen;
      panel.classList.toggle('open', coachOpen);
      if (coachOpen) {
        activeTab = detectTab();
        highlightTab(activeTab);
        fetchCoaching(activeTab);
      }
    });

    document.getElementById('tsm-coach-close').addEventListener('click', () => {
      coachOpen = false;
      panel.classList.remove('open');
    });

    document.getElementById('tsm-coach-refresh').addEventListener('click', () => {
      delete lastCoaching[activeTab];
      fetchCoaching(activeTab);
    });

    panel.querySelectorAll('.tsm-ctab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        highlightTab(activeTab);
        fetchCoaching(activeTab);
      });
    });
  }

  function highlightTab(tab) {
    document.querySelectorAll('.tsm-ctab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
  }

  // ── Watch sidebar nav for tab switches ────────────────────────────────────
  function watchNav() {
    const nav = document.querySelector('.sidebar, nav, [data-nav]');
    if (!nav) return;
    nav.addEventListener('click', (e) => {
      const link = e.target.closest('a, button, [data-tab]');
      if (!link) return;
      setTimeout(() => {
        const newTab = detectTab();
        if (newTab !== activeTab) {
          activeTab = newTab;
          if (coachOpen) {
            highlightTab(activeTab);
            fetchCoaching(activeTab);
          }
        }
      }, 150);
    });
  }

  // ── Collapse the hook/bridge/adlib generation box ─────────────────────────
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>
`;

if (!html.includes('tsm-coach-system')) {
  html = html.replace('</body>', COACH_JS + '\n</body>');
  console.log('✓ Coach JS + collapse logic injected before </body>');
} else {
  console.log('→ Coach JS already present');
}

// ─── Write files ──────────────────────────────────────────────────────────────
fs.writeFileSync(HTML_PATH,   html);
fs.writeFileSync(SERVER_PATH, server);
console.log('✓ Files written successfully\n');
console.log('Run:');
console.log('  node --check server.js && fly deploy --local-only --app tsm-shell');
