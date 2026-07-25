#!/usr/bin/env node
/**
 * fix-v4.js — Complete overhaul
 * 1. Fixes SyntaxError (regex → indexOf)
 * 2. Fixes collapse button on generation box
 * 3. Replaces floating coach panel with INLINE guidance banners
 *    injected directly into each of the 6 tab sections
 * 4. Each tab gets its own persistent tip bar + "Get AI Help" button
 *    that loads contextual Groq coaching right inside the tab
 */

const fs   = require('fs');
const path = require('path');

const HTML_PATH   = path.resolve('html/music-command/index.html');
const SERVER_PATH = path.resolve('server.js');

[HTML_PATH, SERVER_PATH].forEach(p => {
  if (!fs.existsSync(p)) { console.error(`✗ Not found: ${p}`); process.exit(1); }
});

let html   = fs.readFileSync(HTML_PATH,   'utf8');
let server = fs.readFileSync(SERVER_PATH, 'utf8');

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SERVER — ensure /api/music/coach exists with correct Groq format
// ═══════════════════════════════════════════════════════════════════════════════

const COACH_ROUTE = `
// ── TSM AI Coach (v4) ─────────────────────────────────────────────────────────
app.post('/api/music/coach', async (req, res) => {
  try {
    const { tab, lyrics, context } = req.body;

    const systemPrompt = 'You are TSM Music Coach — a sharp A&R advisor and hit-song strategist. Give punchy, specific, immediately actionable advice. Always use short bullet points starting with an action verb. Max 5 bullets. No fluff, no intros, no sign-offs.';

    const tabPrompts = {
      'draft': \`The creator is in DRAFT + ANALYSIS mode.
Current lyrics: \${lyrics || '(none yet)'}
Coach them on:
• Is the opening hook sticky? Give a 1-line rewrite example if not
• Cadence check — which lines feel choppy? Suggest a fix
• Emotional punch — what feeling does this trigger? Is it intentional?
• One concrete word swap that elevates the imagery
• What to do next: which button to press and why\`,

      'revision': \`The creator is in REVISION MODE reviewing a draft.
Current lyrics: \${lyrics || '(none yet)'}
Coach them on:
• The single weakest line — rewrite it right now
• Rhyme scheme check (AABB? ABAB? broken?) — flag and fix
• Cliché alert — find one and offer a fresher image
• Does the hook land in the first 8 bars?
• Specific next revision step to take\`,

      'generate': \`The creator is using the GENERATE feature to create AI song variants.
Current lyrics: \${lyrics || '(none yet)'}
Coach them on:
• Best 3 variation directions to try (e.g. "darker tone", "double-time flow")
• How to write a strong generation prompt for their style
• How to evaluate which AI output to keep vs discard
• One specific prompt they should paste into the generator right now
• Red flags that mean a generated hook is too weak to use\`,

      'song-bank': \`The creator is in SONG BANK managing their catalog.
Coach them on:
• How to identify their strongest unreleased track right now
• The 3 criteria for "release ready" vs "needs another pass"
• How to sequence songs for a project or EP rollout
• Which type of draft to prioritize for revision this week
• How to use tags and labels to find songs faster\`,

      'artist-dna': \`The creator is building their ARTIST DNA profile.
Current DNA context: \${context || '(not set yet)'}
Coach them on:
• How to define their sonic lane in exactly 3 words
• Which influences to list that actually help AI generate on-brand output
• What "emotional signature" means and how to write theirs
• The most common DNA mistake that makes AI output sound generic
• One DNA field they should update right now and what to write\`,

      'studio-tools': \`The creator is in STUDIO TOOLS.
Coach them on:
• Which tool to reach for first based on where they are in the process
• How to use the vocal chain preset that matches their DNA style
• Beat matching tip for locking their flow to a specific BPM
• How to write mix notes a producer can actually act on
• The 3-item checklist before sending a session file to a collaborator\`
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
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq error:', response.status, errText);
      return res.status(502).json({ ok: false, error: 'Groq API error: ' + response.status });
    }

    const data = await response.json();
    const coaching = data.choices?.[0]?.message?.content || 'No coaching available.';
    res.json({ ok: true, coaching, tab });
  } catch (err) {
    console.error('Coach route error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
`;

// Remove old coach route if present, replace with v4
if (server.includes('/api/music/coach')) {
  server = server.replace(
    /\/\/ ── TSM AI Coach[\s\S]*?}\);\n/,
    COACH_ROUTE.trim() + '\n'
  );
  console.log('✓ /api/music/coach route replaced with v4');
} else {
  const insertBefore = server.includes('app.listen') ? 'app.listen' : 'module.exports';
  server = server.replace(insertBefore, COACH_ROUTE + '\n' + insertBefore);
  console.log('✓ /api/music/coach route added (v4)');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. HTML — Remove old coach scripts, inject clean v4 system
// ═══════════════════════════════════════════════════════════════════════════════

// Strip all previous coach/collapse script blocks
['tsm-coach-system', 'tsm-collapse-fix', 'tsm-coach-fab', 'tsm-coach-panel'].forEach(id => {
  const re = new RegExp(`<script id="${id}">[\\s\\S]*?</script>`, 'g');
  if (re.test(html)) {
    html = html.replace(re, '');
    console.log(`✓ Removed old script#${id}`);
  }
});

// Strip old injected CSS block
html = html.replace(/\/\* ── Generation Box Collapse[\s\S]*?── TSM AI Coach Panel[\s\S]*?\*\//g, '');
html = html.replace(/\/\* ── TSM AI Coach Panel[\s\S]*?animation: tsm-spin[\s\S]*?}\s*/g, '');

// ─── CSS ──────────────────────────────────────────────────────────────────────
const COACH_CSS = `
<style id="tsm-coach-v4-css">
/* TSM Inline Coach v4 */
.tsm-guide-bar {
  display: none;
  margin: 0 0 14px 0;
  border-radius: 10px;
  border: 1px solid rgba(124,58,237,0.3);
  background: rgba(124,58,237,0.07);
  overflow: hidden;
  font-size: 13px;
}
.tsm-guide-bar.visible { display: block; }
.tsm-guide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  background: rgba(124,58,237,0.12);
  border-bottom: 1px solid rgba(124,58,237,0.2);
  cursor: pointer;
  user-select: none;
}
.tsm-guide-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #a78bfa;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tsm-guide-title::before { content: '♪'; font-size: 13px; }
.tsm-guide-actions { display: flex; align-items: center; gap: 8px; }
.tsm-guide-ask-btn {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid rgba(167,139,250,0.5);
  background: rgba(124,58,237,0.15);
  color: #a78bfa;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.tsm-guide-ask-btn:hover { background: rgba(124,58,237,0.3); }
.tsm-guide-toggle {
  font-size: 11px;
  color: rgba(167,139,250,0.5);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}
.tsm-guide-body {
  padding: 12px 14px;
  color: rgba(255,255,255,0.8);
  line-height: 1.6;
}
.tsm-guide-body.collapsed { display: none; }

/* Static tips — always visible */
.tsm-guide-tips {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}
.tsm-guide-tip {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: rgba(255,255,255,0.65);
  padding: 5px 8px;
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  border-left: 2px solid rgba(124,58,237,0.4);
}
.tsm-guide-tip-icon { flex-shrink: 0; font-size: 13px; }

/* AI coaching output */
.tsm-guide-ai {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.07);
}
.tsm-guide-ai-label {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(167,139,250,0.5);
  margin-bottom: 8px;
}
.tsm-guide-ai-content {
  font-size: 12.5px;
  color: rgba(255,255,255,0.82);
  line-height: 1.7;
}
.tsm-guide-ai-content ul { margin: 4px 0; padding-left: 16px; }
.tsm-guide-ai-content li { margin-bottom: 5px; }
.tsm-guide-ai-content strong { color: #c4b5fd; }
.tsm-guide-spinner {
  display: inline-block;
  width: 12px; height: 12px;
  border: 2px solid rgba(124,58,237,0.3);
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: tsmSpin 0.7s linear infinite;
  vertical-align: middle;
  margin-right: 6px;
}
@keyframes tsmSpin { to { transform: rotate(360deg); } }

/* Collapse button on generation box */
.tsm-gen-wrap { position: relative; }
.tsm-collapse-btn {
  position: absolute !important;
  top: 10px !important;
  right: 10px !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: 6px !important;
  background: rgba(255,255,255,0.1) !important;
  border: 1px solid rgba(255,255,255,0.22) !important;
  color: rgba(255,255,255,0.8) !important;
  font-size: 14px !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 999 !important;
  line-height: 1 !important;
  transition: background 0.15s !important;
}
.tsm-collapse-btn:hover { background: rgba(255,255,255,0.2) !important; }
</style>
`;

html = html.replace('</head>', COACH_CSS + '\n</head>');
console.log('✓ Coach v4 CSS injected');

// ─── JS ───────────────────────────────────────────────────────────────────────
const COACH_JS = `
<script id="tsm-coach-v4">
(function() {
'use strict';

// ── Static tips per tab — always visible, no API needed ───────────────────────
const TAB_TIPS = {
  'draft': {
    label: 'Draft + Analysis',
    tips: [
      { icon: '🎯', text: 'Paste your lyrics in the left panel, then hit Analyze to score cadence, emotion, structure and imagery.' },
      { icon: '🔁', text: 'Use "Iterate Again" after each analysis — each pass sharpens your score toward hit potential.' },
      { icon: '💡', text: 'Low cadence score? Try breaking long lines into two shorter punchy lines.' },
      { icon: '📊', text: 'Check the Evolution Timeline to see which revision moved your score the most.' },
    ]
  },
  'revision': {
    label: 'Revision Mode',
    tips: [
      { icon: '✂️', text: 'Use Revision Mode to compare your current draft against a rewritten version side by side.' },
      { icon: '🎵', text: 'Focus on the hook first — if the first 8 bars don\'t grab, the rest won\'t matter.' },
      { icon: '🔤', text: 'Try the Tighten button to cut filler words and sharpen each line automatically.' },
      { icon: '📝', text: 'Use "Save to Song Bank" after each strong revision — never lose a good version.' },
    ]
  },
  'generate': {
    label: 'Generate',
    tips: [
      { icon: '✨', text: 'Generate Hook creates 3 hook variants based on your Artist DNA — pick the strongest and build from it.' },
      { icon: '🌉', text: 'Build Bridge generates an emotional pivot — use it when your song needs a moment of contrast.' },
      { icon: '🎤', text: 'Place Ad-Libs adds signature vocal punctuation (yeah, uh, let\'s go) in the right spots.' },
      { icon: '🏗️', text: 'Song Structure maps your full layout — use it before generating sections so everything fits together.' },
    ]
  },
  'song-bank': {
    label: 'Song Bank',
    tips: [
      { icon: '🗂️', text: 'Tag songs by mood, tempo, and release readiness so you can filter your catalog instantly.' },
      { icon: '⭐', text: 'Mark your top 3 unreleased tracks — these should be your next revision priority.' },
      { icon: '📅', text: 'Sort by "Last Modified" to find drafts you\'ve abandoned — they often have hidden gems.' },
      { icon: '🔗', text: 'Export TXT from any song to share with a producer or co-writer without losing your format.' },
    ]
  },
  'artist-dna': {
    label: 'Artist DNA',
    tips: [
      { icon: '🧬', text: 'Your DNA profile trains every AI generation — the more specific you are, the more on-brand the output.' },
      { icon: '🎸', text: 'Add 3-5 sonic influences (artists, not genres) — this is what helps AI nail your sound.' },
      { icon: '💬', text: 'Write your Emotional Signature as a single sentence: "I make music that makes people feel ___."' },
      { icon: '🔑', text: 'Style keywords are the most powerful DNA field — use adjectives like "raw", "cinematic", "punchy".' },
    ]
  },
  'studio-tools': {
    label: 'Studio Tools',
    tips: [
      { icon: '🎛️', text: 'Run the Vocal Chain preset that matches your DNA style before recording — it sets the right tone.' },
      { icon: '🥁', text: 'Use Beat Match to lock your syllable flow to the target BPM before writing — it prevents rewriting later.' },
      { icon: '🔑', text: 'Key Analyzer finds the best key for your vocal range — always check this before a session.' },
      { icon: '📋', text: 'Write Mix Notes using the template: [element] sounds [adjective], needs [action] — producers love clarity.' },
    ]
  }
};

// ── Tab key detection ─────────────────────────────────────────────────────────
function getActiveTab() {
  // Try nav tabs first (top bar with DRAFT + ANALYSIS, REVISION MODE, etc.)
  const navTabs = document.querySelectorAll('[class*="tab"], [class*="nav"] button, nav button, [role="tab"]');
  for (const t of navTabs) {
    const txt = (t.textContent || '').toLowerCase();
    const isActive = t.classList.contains('active') ||
                     t.getAttribute('aria-selected') === 'true' ||
                     t.getAttribute('data-active') === 'true' ||
                     t.style.borderBottomColor !== '';
    if (!isActive) continue;
    if (txt.includes('draft') || txt.includes('analysis')) return 'draft';
    if (txt.includes('revision'))   return 'revision';
    if (txt.includes('generate'))   return 'generate';
    if (txt.includes('song bank'))  return 'song-bank';
    if (txt.includes('artist dna') || txt.includes('dna')) return 'artist-dna';
    if (txt.includes('studio'))     return 'studio-tools';
  }
  // Try sidebar
  const sideActive = document.querySelector('.sidebar a.active, [class*="sidebar"] .active, [class*="workspace"] .active');
  if (sideActive) {
    const txt = (sideActive.textContent || '').toLowerCase();
    if (txt.includes('draft'))   return 'draft';
    if (txt.includes('revision')) return 'revision';
    if (txt.includes('generate')) return 'generate';
    if (txt.includes('song'))    return 'song-bank';
    if (txt.includes('dna'))     return 'artist-dna';
    if (txt.includes('studio'))  return 'studio-tools';
  }
  return 'draft';
}

// ── Get current lyrics ────────────────────────────────────────────────────────
function getLyrics() {
  const els = document.querySelectorAll('textarea, [contenteditable="true"], .lyric-display, .lyrics-panel');
  for (const el of els) {
    const val = (el.value || el.textContent || '').trim();
    if (val.length > 15) return val.slice(0, 600);
  }
  return '';
}

// ── Build the guide bar for a tab ─────────────────────────────────────────────
function buildGuideBar(tabKey) {
  const meta = TAB_TIPS[tabKey];
  if (!meta) return null;

  const bar = document.createElement('div');
  bar.className = 'tsm-guide-bar';
  bar.dataset.tsmTab = tabKey;

  const tipsHtml = meta.tips.map(t =>
    '<div class="tsm-guide-tip">' +
      '<span class="tsm-guide-tip-icon">' + t.icon + '</span>' +
      '<span>' + t.text + '</span>' +
    '</div>'
  ).join('');

  bar.innerHTML =
    '<div class="tsm-guide-header">' +
      '<span class="tsm-guide-title">TSM Coach · ' + meta.label + '</span>' +
      '<div class="tsm-guide-actions">' +
        '<button class="tsm-guide-ask-btn">✦ Get AI Coaching</button>' +
        '<button class="tsm-guide-toggle">▲</button>' +
      '</div>' +
    '</div>' +
    '<div class="tsm-guide-body">' +
      '<div class="tsm-guide-tips">' + tipsHtml + '</div>' +
      '<div class="tsm-guide-ai" style="display:none">' +
        '<div class="tsm-guide-ai-label">AI Coaching</div>' +
        '<div class="tsm-guide-ai-content"></div>' +
      '</div>' +
    '</div>';

  // Toggle collapse
  const toggle = bar.querySelector('.tsm-guide-toggle');
  const body   = bar.querySelector('.tsm-guide-body');
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    body.classList.toggle('collapsed');
    toggle.textContent = body.classList.contains('collapsed') ? '▼' : '▲';
  });
  bar.querySelector('.tsm-guide-header').addEventListener('click', () => {
    body.classList.toggle('collapsed');
    toggle.textContent = body.classList.contains('collapsed') ? '▼' : '▲';
  });

  // AI coaching button
  bar.querySelector('.tsm-guide-ask-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    const btn     = e.currentTarget;
    const aiBox   = bar.querySelector('.tsm-guide-ai');
    const content = bar.querySelector('.tsm-guide-ai-content');
    const bodyEl  = bar.querySelector('.tsm-guide-body');

    // Expand if collapsed
    if (bodyEl.classList.contains('collapsed')) {
      bodyEl.classList.remove('collapsed');
      toggle.textContent = '▲';
    }

    aiBox.style.display = 'block';
    content.innerHTML = '<span class="tsm-guide-spinner"></span> Coaching loading…';
    btn.disabled = true;
    btn.textContent = '…';

    try {
      const r = await fetch('/api/music/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: tabKey, lyrics: getLyrics() })
      });
      const d = await r.json();
      if (d.ok && d.coaching) {
        // Convert markdown to HTML
        let html = d.coaching
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>')
          .replace(/(<li>[\s\S]*?<\/li>)+/g, '<ul>$&</ul>')
          .replace(/\n\n/g, '<br>');
        content.innerHTML = html;
      } else {
        content.innerHTML = '<span style="color:rgba(255,100,100,0.8)">Could not load coaching. Check your GROQ_API_KEY.</span>';
      }
    } catch (err) {
      content.innerHTML = '<span style="color:rgba(255,100,100,0.8)">Network error: ' + err.message + '</span>';
    }

    btn.disabled = false;
    btn.textContent = '↻ Refresh';
  });

  return bar;
}

// ── Find the best injection point for a tab's content area ────────────────────
function findContentArea() {
  // Look for the main content panel — the area right of the sidebar
  const candidates = [
    document.querySelector('[class*="main-content"]'),
    document.querySelector('[class*="content-area"]'),
    document.querySelector('[class*="panel-content"]'),
    document.querySelector('main'),
    // Fall back: the div that contains the Music Decision Engine header
    (() => {
      const headers = Array.from(document.querySelectorAll('*'));
      const mde = headers.find(el =>
        el.children.length === 0 &&
        (el.textContent || '').toLowerCase().includes('music decision engine')
      );
      return mde ? mde.closest('div[class]')?.parentElement : null;
    })(),
    // Last resort: find the tab nav bar and use its parent
    (() => {
      const tabBar = Array.from(document.querySelectorAll('*')).find(el =>
        (el.textContent || '').toLowerCase().includes('draft + analysis') &&
        (el.textContent || '').toLowerCase().includes('revision mode')
      );
      return tabBar ? tabBar.parentElement : null;
    })(),
  ];
  return candidates.find(Boolean) || document.body;
}

// ── Show guide bar for the active tab ─────────────────────────────────────────
let currentGuideBar = null;

function showGuideForTab(tabKey) {
  // Remove existing bar
  if (currentGuideBar) {
    currentGuideBar.remove();
    currentGuideBar = null;
  }

  const bar = buildGuideBar(tabKey);
  if (!bar) return;

  const area = findContentArea();

  // Try to insert before the first real content child (after any nav bar)
  const navBar = area.querySelector('[class*="tab"], [class*="nav-tab"], [role="tablist"]');
  if (navBar && navBar.parentElement === area) {
    navBar.after(bar);
  } else {
    area.prepend(bar);
  }

  // Animate in
  requestAnimationFrame(() => {
    bar.classList.add('visible');
  });

  currentGuideBar = bar;
  console.log('[TSM Coach v4] Guide bar shown for tab:', tabKey);
}

// ── Collapse button for the generation box ────────────────────────────────────
function attachCollapseButton() {
  const allBtns = Array.from(document.querySelectorAll('button'));
  const hookBtn = allBtns.find(b =>
    b.textContent.toLowerCase().includes('generate hook')
  );
  if (!hookBtn) return;

  // Walk up to find container holding ALL generation buttons
  let box = hookBtn.parentElement;
  for (let i = 0; i < 6; i++) {
    if (!box || box === document.body) break;
    const inner = Array.from(box.querySelectorAll('button'));
    const hasHook   = inner.some(b => b.textContent.toLowerCase().includes('generate hook'));
    const hasBridge = inner.some(b => b.textContent.toLowerCase().includes('build bridge'));
    if (hasHook && hasBridge) break;
    box = box.parentElement;
  }
  if (!box || box === document.body || box.dataset.tsmCollapseAttached) return;
  box.dataset.tsmCollapseAttached = '1';

  // Ensure relative positioning
  const cs = window.getComputedStyle(box);
  if (cs.position === 'static') box.style.position = 'relative';

  const btn = document.createElement('button');
  btn.className = 'tsm-collapse-btn';
  btn.textContent = '✕';
  btn.title = 'Collapse this panel';

  let open = true;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    open = !open;
    btn.textContent = open ? '✕' : '▼';
    btn.title = open ? 'Collapse this panel' : 'Expand';
    // Hide all children except the button itself
    Array.from(box.children).forEach(child => {
      if (child === btn) return;
      child.style.transition = 'opacity 0.2s';
      child.style.opacity    = open ? '1' : '0';
      child.style.display    = open ? '' : 'none';
    });
  });

  box.appendChild(btn);
  console.log('[TSM Coach v4] Collapse button attached');
}

// ── Watch for tab switches ─────────────────────────────────────────────────────
function initTabWatcher() {
  let lastTab = null;

  function checkTab() {
    const tab = getActiveTab();
    if (tab !== lastTab) {
      lastTab = tab;
      showGuideForTab(tab);
    }
  }

  // Check on clicks anywhere (tab switches are clicks)
  document.addEventListener('click', () => setTimeout(checkTab, 200));

  // Poll as fallback for JS-driven tab changes
  setInterval(checkTab, 1500);

  // Initial render
  checkTab();
}

// ── MutationObserver for generation box (no regex) ────────────────────────────
function watchForGenBox() {
  let attached = false;
  const obs = new MutationObserver(() => {
    if (attached) return;
    const allBtns = Array.from(document.querySelectorAll('button'));
    const has = allBtns.some(b => b.textContent.toLowerCase().includes('generate hook'));
    if (has) {
      attachCollapseButton();
      attached = true;
      // Reset so it can re-attach if the box is re-rendered
      setTimeout(() => { attached = false; }, 3000);
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

// ── Init ───────────────────────────────────────────────────────────────────────
function init() {
  initTabWatcher();
  attachCollapseButton();
  setTimeout(attachCollapseButton, 1000);
  setTimeout(attachCollapseButton, 2500);
  watchForGenBox();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
</script>
`;

// Remove any old coach scripts before injecting fresh one
html = html.replace(/<script id="tsm-coach-v4">[\s\S]*?<\/script>/g, '');
html = html.replace('</body>', COACH_JS + '\n</body>');
console.log('✓ Coach v4 JS injected');

// ─── Write files ──────────────────────────────────────────────────────────────
fs.writeFileSync(HTML_PATH,   html,   'utf8');
fs.writeFileSync(SERVER_PATH, server, 'utf8');

console.log('\n✓ All files written.\n');
console.log('Deploy:');
console.log('  node --check server.js && fly deploy --local-only --app tsm-shell');
console.log('\nWhat to expect after deploy:');
console.log('  • A "TSM Coach · Draft + Analysis" bar appears at top of content area');
console.log('  • Static tips always visible — no API call needed');
console.log('  • "✦ Get AI Coaching" button fetches live Groq advice for that tab');
console.log('  • Switching tabs swaps the guide bar automatically');
console.log('  • Generation box gets a ✕ collapse button top-right');
