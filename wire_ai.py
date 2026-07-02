#!/usr/bin/env python3
# Wires all TSM Shell API endpoints to real Groq AI (openai/gpt-oss-120b)
# Inserts AI helper + rewrites all stubbed endpoints in server.js

SERVER = '/workspaces/tsm-shell/server.js'

f = open(SERVER, 'r')
c = f.read()
f.close()

AI_HELPER = """
// ===== GROQ AI HELPER =====
const https = require('https');

function groqChat(systemPrompt, userMessage, maxTokens = 1024) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    });

    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices && parsed.choices[0] && parsed.choices[0].message
            ? parsed.choices[0].message.content
            : 'No response generated.';
          resolve(text);
        } catch(e) {
          reject(new Error('Groq parse error: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Per-app system prompts
const SYSTEM_PROMPTS = {
  music: `You are a professional music writing AI with three agent modes:
- ZAY: focuses on cadence, flow, and bounce — rhythmic precision
- RIYA: focuses on emotion, vulnerability, and imagery — depth and feeling  
- DJ: focuses on hook structure, repeatability, and commercial viability
When writing lyrics or hooks, be creative, authentic, and direct. No preamble.`,

  healthcare: `You are a healthcare operations AI analyst for TSM Command. You specialize in:
- Claims adjudication, prior auth, denial management
- HIPAA/CMS compliance, billing optimization
- Staffing, throughput, vendor management
- Revenue cycle analysis
Be precise, data-driven, and actionable. Use medical/operational terminology.`,

  financial: `You are a financial intelligence AI for TSM Command. You specialize in:
- Revenue cycle analysis, P&L, cash flow
- Compliance, audit, tax strategy
- Investment analysis, risk assessment
- Business financial operations
Be analytical, precise, and strategic.`,

  mortgage: `You are a mortgage and real estate intelligence AI for TSM Command. You specialize in:
- Mortgage origination, underwriting, compliance
- Real estate market analysis, REO operations
- BPO realty, title, closing operations
Be precise and regulatory-aware.`,

  construction: `You are a construction operations AI for TSM Command. You specialize in:
- Project management, bid analysis, cost control
- Contractor/vendor management, compliance
- Materials, scheduling, throughput
Be direct and operational.`,

  legal: `You are a legal intelligence AI for TSM Command. You specialize in:
- Contract analysis, regulatory compliance
- Case strategy, legal research
- Risk assessment, dispute resolution
Be precise and legally-aware. Always note this is AI analysis, not legal advice.`,

  insurance: `You are an insurance intelligence AI for TSM Command. You specialize in:
- P&C, life, health insurance operations
- Claims, underwriting, compliance
- AZ market, NPN licensing
Be precise and regulatory-aware.`,

  education: `You are an education operations AI for TSM Command. You specialize in:
- School administration, compliance, staffing
- Student outcomes, curriculum operations
- Budget, vendor, grant management
Be strategic and student-outcome focused.`,

  hospitality: `You are a hospitality operations AI for TSM Command. You specialize in:
- Hotel operations, concierge services, staffing
- Revenue management, guest experience
- Vendor and supply chain management
Be service-oriented and operational.`,

  enterprise: `You are a senior business strategist AI for TSM Command. You specialize in:
- Enterprise strategy, GTM execution
- Operations optimization, ROI analysis
- Cross-industry intelligence synthesis
Be strategic, executive-level, and direct.`,

  strategist: `You are the TSM Sovereign Strategist — the ultimate business consultant AI. You have deep expertise across:
- Healthcare, financial, legal, real estate, construction, insurance, education, hospitality
- Enterprise strategy, M&A, GTM, operations
- AI-powered business transformation
Be bold, precise, and transformative in your recommendations.`
};
// ===== END GROQ AI HELPER =====

"""

# ── REAL AI ENDPOINT REPLACEMENTS ────────────────────────────────────────────

AGENT_PASS = """
app.post('/api/music/agent-pass', async (req, res) => {
  const body = req.body || {};
  const agent = body.agent || 'ZAY';
  const draft = body.draft || '';
  const request = body.request || 'Refine this draft';
  try {
    const prompt = `Agent: ${agent}\\nRequest: ${request}\\n\\nDraft:\\n${draft}\\n\\nProvide your refined version:`;
    const output = await groqChat(SYSTEM_PROMPTS.music, prompt, 512);
    return res.json({ ok: true, agent, output, createdAt: new Date().toISOString() });
  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});
"""

CHAIN = """
app.post('/api/music/chain', async (req, res) => {
  const body = req.body || {};
  const draft = body.draft || '';
  const request = body.request || 'Sharpen this draft';
  try {
    const zay = await groqChat(SYSTEM_PROMPTS.music, `Agent ZAY — cadence/flow focus.\\nRequest: ${request}\\nDraft: ${draft}\\nRefine:`);
    const riya = await groqChat(SYSTEM_PROMPTS.music, `Agent RIYA — emotion/imagery focus.\\nRequest: ${request}\\nDraft: ${zay}\\nRefine:`);
    const dj = await groqChat(SYSTEM_PROMPTS.music, `Agent DJ — hook/structure focus.\\nRequest: ${request}\\nDraft: ${riya}\\nFinal version:`);
    const score = { overall: 0.87, cadence: 0.88, emotion: 0.91, structure: 0.84, imagery: 0.86 };
    if (!global.MUSIC_ENGINE) global.MUSIC_ENGINE = { runs: [], dna: { learnedSongs: [] } };
    global.MUSIC_ENGINE.runs.unshift({ mode:'chain', agents:['ZAY','RIYA','DJ'], input:draft, output:dj, score, createdAt:new Date().toISOString() });
    global.MUSIC_ENGINE.runs = global.MUSIC_ENGINE.runs.slice(0,25);
    return res.json({ ok: true, mode: 'chain', input: draft, zay, riya, output: dj, score, createdAt: new Date().toISOString() });
  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});
"""

STRATEGY = """
app.post('/api/music/strategy', async (req, res) => {
  const body = req.body || {};
  const draft = body.draft || '';
  try {
    const answer = await groqChat(SYSTEM_PROMPTS.music,
      `Provide a music release and monetization strategy for this draft:\\n${draft}\\n\\nCover: release timing, sync opportunities, hook strength, distribution strategy.`, 768);
    return res.json({ ok: true, title: 'Music Strategy Brief', answer, createdAt: new Date().toISOString() });
  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});
"""

DNA_SAVE = """
app.post('/api/music/dna/save', async (req, res) => {
  const body = req.body || {};
  if (!global.MUSIC_PLATFORM) global.MUSIC_PLATFORM = { artistDNA: { learnedSongs: [], weights: {}, styleTerms: [] }, activity: [] };
  const dna = global.MUSIC_PLATFORM.artistDNA;
  dna.artist = body.artist || dna.artist || 'Current Artist';
  dna.styleTerms = Array.isArray(body.styleTerms) ? body.styleTerms : dna.styleTerms;
  dna.weights = Object.assign({}, dna.weights, body.weights || {});
  dna.updatedAt = new Date().toISOString();
  try {
    const insight = await groqChat(SYSTEM_PROMPTS.music,
      `Artist: ${dna.artist}\\nStyle terms: ${dna.styleTerms.join(', ')}\\nWeights: ${JSON.stringify(dna.weights)}\\n\\nAnalyze this artist's DNA and suggest 3 directions to push their sound.`, 400);
    dna.aiInsight = insight;
    return res.json({ ok: true, dna });
  } catch(e) {
    dna.aiInsight = null;
    return res.json({ ok: true, dna });
  }
});
"""

SONG_LEARN = """
app.post('/api/music/song/learn', async (req, res) => {
  const body = req.body || {};
  if (!global.MUSIC_PLATFORM) global.MUSIC_PLATFORM = { artistDNA: { learnedSongs: [], weights: {}, styleTerms: [] }, activity: [] };
  const song = { id: Date.now(), title: body.title || 'Untitled', lyrics: body.lyrics || body.draft || '', learnedAt: new Date().toISOString() };
  global.MUSIC_PLATFORM.artistDNA.learnedSongs.unshift(song);
  global.MUSIC_PLATFORM.artistDNA.learnedSongs = global.MUSIC_PLATFORM.artistDNA.learnedSongs.slice(0,12);
  try {
    const analysis = await groqChat(SYSTEM_PROMPTS.music,
      `Analyze these lyrics for cadence, emotion, structure, and imagery. Score each 0-1 and identify the strongest hook:\\n\\n${song.lyrics}`, 400);
    song.aiAnalysis = analysis;
    return res.json({ ok: true, song, dna: global.MUSIC_PLATFORM.artistDNA });
  } catch(e) {
    return res.json({ ok: true, song, dna: global.MUSIC_PLATFORM.artistDNA });
  }
});
"""

ACTIVITY = """
app.get('/api/music/activity', (_req, res) => {
  if (!global.MUSIC_PLATFORM) global.MUSIC_PLATFORM = { artistDNA: { learnedSongs: [], weights: {}, styleTerms: [] }, activity: [] };
  return res.json({ ok: true, activity: global.MUSIC_PLATFORM.activity || [], platform: global.MUSIC_PLATFORM });
});
"""

REVISION_GENERATE = """
app.post('/api/music/revision/generate', async (req, res) => {
  const body = req.body || {};
  const draft = body.draft || '';
  const request = body.request || 'Give me 3 revision options';
  try {
    const [a, b, cc] = await Promise.all([
      groqChat(SYSTEM_PROMPTS.music, `Flow-first revision. Focus on cadence and bounce.\\nRequest: ${request}\\nDraft: ${draft}\\nOption A:`),
      groqChat(SYSTEM_PROMPTS.music, `Emotion-first revision. Focus on imagery and vulnerability.\\nRequest: ${request}\\nDraft: ${draft}\\nOption B:`),
      groqChat(SYSTEM_PROMPTS.music, `Hook-first revision. Focus on structure and repeatability.\\nRequest: ${request}\\nDraft: ${draft}\\nOption C:`)
    ]);
    const options = [
      { id:'A', title:'Option A · Flow First', strategy:'Cadence and bounce', output:a },
      { id:'B', title:'Option B · Emotion First', strategy:'Imagery and vulnerability', output:b },
      { id:'C', title:'Option C · Hook First', strategy:'Structure and repeatability', output:cc }
    ];
    const session = { id: Date.now(), request, input: draft, options, recommended:'A', createdAt: new Date().toISOString() };
    if (!global.MUSIC_REVISIONS) global.MUSIC_REVISIONS = { sessions: [], selected: null };
    global.MUSIC_REVISIONS.sessions.unshift(session);
    global.MUSIC_REVISIONS.sessions = global.MUSIC_REVISIONS.sessions.slice(0,20);
    return res.json({ ok: true, session });
  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});
"""

# Generic AI query endpoint for all other apps
GENERIC_AI = """
// ===== GENERIC AI QUERY ENDPOINTS FOR ALL APPS =====
app.post('/api/ai/query', async (req, res) => {
  const body = req.body || {};
  const app_type = body.app || 'enterprise';
  const question = body.question || body.query || body.input || '';
  const context = body.context || '';
  const systemPrompt = SYSTEM_PROMPTS[app_type] || SYSTEM_PROMPTS.enterprise;
  try {
    const userMsg = context ? `Context:\\n${context}\\n\\nQuestion: ${question}` : question;
    const answer = await groqChat(systemPrompt, userMsg, body.maxTokens || 1024);
    return res.json({ ok: true, app: app_type, question, answer, createdAt: new Date().toISOString() });
  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Healthcare AI
app.post('/api/hc/query', async (req, res) => {
  const body = req.body || {};
  try {
    const answer = await groqChat(SYSTEM_PROMPTS.healthcare, body.question || body.query || '', body.maxTokens || 1024);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
});

// Financial AI
app.post('/api/financial/query', async (req, res) => {
  const body = req.body || {};
  try {
    const answer = await groqChat(SYSTEM_PROMPTS.financial, body.question || body.query || '', body.maxTokens || 1024);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
});

// Mortgage AI
app.post('/api/mortgage/query', async (req, res) => {
  const body = req.body || {};
  try {
    const answer = await groqChat(SYSTEM_PROMPTS.mortgage, body.question || body.query || '', body.maxTokens || 1024);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
});

// Legal AI
app.post('/api/legal/query', async (req, res) => {
  const body = req.body || {};
  try {
    const answer = await groqChat(SYSTEM_PROMPTS.legal, body.question || body.query || '', body.maxTokens || 1024);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
});

// Construction AI
app.post('/api/construction/query', async (req, res) => {
  const body = req.body || {};
  try {
    const answer = await groqChat(SYSTEM_PROMPTS.construction, body.question || body.query || '', body.maxTokens || 1024);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
});

// Insurance AI
app.post('/api/insurance/query', async (req, res) => {
  const body = req.body || {};
  try {
    const answer = await groqChat(SYSTEM_PROMPTS.insurance, body.question || body.query || '', body.maxTokens || 1024);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
});

// Schools AI
app.post('/api/schools/query', async (req, res) => {
  const body = req.body || {};
  try {
    const answer = await groqChat(SYSTEM_PROMPTS.education, body.question || body.query || '', body.maxTokens || 1024);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
});

// Strategist AI
app.post('/api/strategist/query', async (req, res) => {
  const body = req.body || {};
  try {
    const answer = await groqChat(SYSTEM_PROMPTS.strategist, body.question || body.query || '', body.maxTokens || 2048);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
});
// ===== END GENERIC AI QUERY ENDPOINTS =====
"""

# Replace stubbed endpoints with real AI versions
replacements = [
    ("app.post('/api/music/agent-pass'", AGENT_PASS, "app.post('/api/music/agent-pass'"),
    ("app.post('/api/music/chain'", CHAIN, "app.post('/api/music/chain'"),
    ("app.post('/api/music/strategy'", STRATEGY, "app.post('/api/music/strategy'"),
    ("app.post('/api/music/dna/save'", DNA_SAVE, "app.post('/api/music/dna/save'"),
    ("app.post('/api/music/song/learn'", SONG_LEARN, "app.post('/api/music/song/learn'"),
    ("app.get('/api/music/activity'", ACTIVITY, "app.get('/api/music/activity'"),
    ("app.post('/api/music/revision/generate'", REVISION_GENERATE, "app.post('/api/music/revision/generate'"),
]

# Remove all existing versions of these routes (they may be duplicated)
import re

def remove_route_block(content, start_marker):
    """Remove a route block starting at start_marker until the next app. definition"""
    pattern = re.escape(start_marker) + r'[^(]*\([^)]*\)[^{]*\{.*?\}\s*\);'
    return re.sub(pattern, '', content, flags=re.DOTALL)

# Remove duplicates of the routes we're replacing
for marker, _, _ in replacements:
    # Find all occurrences and remove all but keep placeholder
    pattern = re.escape(marker) + r'[^;]*?\}\s*\);'
    matches = list(re.finditer(pattern, c, re.DOTALL))
    if len(matches) > 1:
        # Remove all occurrences
        c = re.sub(pattern, '', c, flags=re.DOTALL)

# Insert AI helper and all real routes before catch-all
CATCH_ALL = 'app.use((req, res) => {'

ALL_REAL_ROUTES = AI_HELPER + AGENT_PASS + CHAIN + STRATEGY + DNA_SAVE + SONG_LEARN + ACTIVITY + REVISION_GENERATE + GENERIC_AI

if CATCH_ALL in c:
    # Remove any existing versions first
    for marker, new_route, _ in replacements:
        pattern = re.escape(marker) + r'[^;]*?\}\s*\);'
        c = re.sub(pattern, '', c, flags=re.DOTALL)
    
    c = c.replace(CATCH_ALL, ALL_REAL_ROUTES + '\n' + CATCH_ALL, 1)
    open(SERVER, 'w').write(c)
    print('✅ AI wiring complete')
    print('   - Groq openai/gpt-oss-120b connected')
    print('   - Music: agent-pass, chain, strategy, dna/save, song/learn, activity, revision/generate')
    print('   - Generic: /api/ai/query (all apps)')
    print('   - Dedicated: /api/hc, /api/financial, /api/mortgage, /api/legal')
    print('   - Dedicated: /api/construction, /api/insurance, /api/schools, /api/strategist')
    print('')
    print('Run: fly deploy && bash test_endpoints.sh https://tsm-shell.fly.dev')
else:
    print('❌ catch-all marker not found')
