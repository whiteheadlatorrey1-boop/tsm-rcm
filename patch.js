#!/usr/bin/env node
// TSM Fix: AI proxy routes + scroll height
const fs = require('fs');
const { execSync } = require('child_process');

function find(name) {
  try {
    return execSync(`find . -name "${name}" -not -path "*/node_modules/*" 2>/dev/null`)
      .toString().trim().split('\n').filter(Boolean)[0];
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════════
// FIX 1 — server.js: add /api/claude/proxy + /api/groq/complete
// ══════════════════════════════════════════════════════════════
const NEW_ROUTES = `
// ── /api/claude/proxy — Anthropic msg format, Groq fallback ──
app.post('/api/claude/proxy', express.json({limit:'4mb'}), async (req, res) => {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const GROQ_KEY      = process.env.GROQ_API_KEY;
  if (ANTHROPIC_KEY) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key':ANTHROPIC_KEY,
                   'anthropic-version':'2023-06-01' },
        body: JSON.stringify(req.body)
      });
      return res.json(await r.json());
    } catch(e) { /* fall through to Groq */ }
  }
  if (!GROQ_KEY) return res.status(503).json({error:{message:'No AI key configured'}});
  try {
    const { system, messages, max_tokens = 1200 } = req.body;
    const msgs = system ? [{role:'system', content:system}, ...messages] : messages;
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization':'Bearer '+GROQ_KEY, 'Content-Type':'application/json' },
      body: JSON.stringify({ model: process.env.TSM_MODEL||'openai/gpt-oss-120b',
                             max_tokens, messages: msgs })
    });
    const data = await r.json();
    const text = data.choices?.[0]?.message?.content || '';
    res.json({ content: [{ type:'text', text }] }); // Anthropic-shape response
  } catch(e) { res.status(500).json({error:{message:e.message}}); }
});

// ── /api/groq/complete — OpenAI format passthrough, non-streaming ──
app.post('/api/groq/complete', express.json({limit:'2mb'}), async (req, res) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(503).json({error:{message:'No GROQ_API_KEY'}});
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization':'Bearer '+key, 'Content-Type':'application/json' },
      body: JSON.stringify({ ...req.body, stream:false })
    });
    res.json(await r.json());
  } catch(e) { res.status(500).json({error:{message:e.message}}); }
});
`;

let server = fs.readFileSync('server.js','utf8');
if (!server.includes('/api/claude/proxy')) {
  server = server.replace('app.listen(8080', NEW_ROUTES + '\napp.listen(8080');
  fs.writeFileSync('server.js', server);
  console.log('✅ server.js — proxy routes added');
} else { console.log('⏭  server.js — routes exist'); }

// ══════════════════════════════════════════════════════════════
// FIX 2 — ce-study-prep: redirect Anthropic calls to proxy
// ══════════════════════════════════════════════════════════════
const cePath = find('ce-study-prep.html');
if (cePath) {
  let ce = fs.readFileSync(cePath,'utf8');
  const before = ce;
  ce = ce.split('https://api.anthropic.com/v1/messages').join('/api/claude/proxy');
  if (ce !== before) { fs.writeFileSync(cePath,ce); console.log('✅ ce-study-prep.html — Anthropic → /api/claude/proxy'); }
  else { console.log('⏭  ce-study-prep.html — already patched'); }
} else { console.log('⚠️  ce-study-prep.html — file not found'); }

// ══════════════════════════════════════════════════════════════
// FIX 3 — az-life: direct Groq browser calls → server proxy
// ══════════════════════════════════════════════════════════════
const azLifePath = find('az-life.html');
if (azLifePath) {
  let life = fs.readFileSync(azLifePath,'utf8');
  const before = life;
  life = life.split('https://api.groq.com/openai/v1/chat/completions').join('/api/groq/complete');
  if (life !== before) { fs.writeFileSync(azLifePath,life); console.log('✅ az-life.html — Groq → /api/groq/complete'); }
  else { console.log('⏭  az-life.html — already patched'); }
} else { console.log('⚠️  az-life.html — file not found'); }

// ══════════════════════════════════════════════════════════════
// FIX 4 — Scroll height: inject override CSS into problem pages
// ══════════════════════════════════════════════════════════════
const SCROLL_FIX = `
`;

const scrollPages = [
  find('az-ins.html'),
  find('wip-dashboard.html'),
  find('construction-pro.html'),
  find('az-life.html'),
].filter(Boolean);

for (const f of scrollPages) {
  let html = fs.readFileSync(f,'utf8');
  if (!html.includes('tsm-scroll-fix')) {
    html = html.replace('', SCROLL_FIX + '\n');
    fs.writeFileSync(f, html);
    console.log('✅ ' + f.split('/').pop() + ' — scroll fix injected');
  } else { console.log('⏭  ' + f.split('/').pop() + ' — scroll fix exists'); }
}

console.log('\n🚀 Done. Now run:');
console.log('   git add -A && git commit -m "fix: AI proxies + scroll height" && fly deploy');
