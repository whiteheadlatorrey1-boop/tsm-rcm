#!/usr/bin/env python3
# Clean AI wiring for TSM Shell server.js
# Uses string concatenation to avoid backtick/quote conflicts

SERVER = '/workspaces/tsm-shell/server.js'

f = open(SERVER, 'r')
c = f.read()
f.close()

AI_BLOCK = r"""
// ===== GROQ AI ENGINE =====
const https = require('https');

global.MUSIC_PLATFORM = global.MUSIC_PLATFORM || {
  artistDNA: { status:'active', artist:'Current Artist', styleTerms:['pain','resilience'], weights:{ cadence:0.88, emotion:0.91, structure:0.76, imagery:0.82 }, learnedSongs:[] },
  agentRuns: [], activity: []
};
global.MUSIC_SUITE_STATE = global.MUSIC_SUITE_STATE || {
  artistsOnline:12, releasesDropping:3, monthlyStreams:'84M', revenueMTD:847400, pipelineValue:2400000, aiStatus:'online'
};

function groqChat(system, user, maxTokens) {
  maxTokens = maxTokens || 1024;
  return new Promise(function(resolve, reject) {
    var body = JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    });
    var options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          var parsed = JSON.parse(data);
          var text = parsed.choices && parsed.choices[0] && parsed.choices[0].message
            ? parsed.choices[0].message.content : 'No response.';
          resolve(text);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

var SP = {
  music: 'You are a professional music writing AI with three agent modes: ZAY (cadence/flow/bounce), RIYA (emotion/imagery/vulnerability), DJ (hook/structure/commercial). Write lyrics and hooks creatively and directly. No preamble.',
  healthcare: 'You are a healthcare operations AI for TSM Command. Expert in claims adjudication, prior auth, denial management, HIPAA/CMS compliance, billing, staffing, throughput, revenue cycle. Be precise and data-driven.',
  financial: 'You are a financial intelligence AI for TSM Command. Expert in revenue cycle, P&L, cash flow, compliance, audit, tax strategy, investment analysis. Be analytical and strategic.',
  mortgage: 'You are a mortgage and real estate AI for TSM Command. Expert in mortgage origination, underwriting, REO, BPO realty, title, closing. Be precise and regulatory-aware.',
  construction: 'You are a construction operations AI for TSM Command. Expert in project management, bid analysis, cost control, contractor/vendor management, scheduling. Be direct and operational.',
  legal: 'You are a legal intelligence AI for TSM Command. Expert in contract analysis, regulatory compliance, case strategy, risk assessment. Note: AI analysis only, not legal advice.',
  insurance: 'You are an insurance intelligence AI for TSM Command. Expert in P&C, life, health insurance, claims, underwriting, AZ market, NPN licensing. Be precise.',
  education: 'You are an education operations AI for TSM Command. Expert in school administration, compliance, staffing, student outcomes, budget, grants. Be strategic.',
  hospitality: 'You are a hospitality operations AI for TSM Command. Expert in hotel ops, concierge, staffing, revenue management, guest experience. Be service-oriented.',
  enterprise: 'You are a senior business strategist AI for TSM Command. Expert in enterprise strategy, GTM, operations optimization, ROI analysis. Be executive-level and direct.',
  strategist: 'You are the TSM Sovereign Strategist — the ultimate business consultant AI. Deep expertise across healthcare, financial, legal, real estate, construction, insurance, education, hospitality, enterprise strategy, M&A, GTM. Be bold and transformative.'
};

// Music endpoints
app.post('/api/music/agent-pass', async function(req, res) {
  var body = req.body || {};
  var agent = body.agent || 'ZAY';
  var draft = body.draft || '';
  var request = body.request || 'Refine this draft';
  try {
    var prompt = 'Agent: ' + agent + '\nRequest: ' + request + '\n\nDraft:\n' + draft + '\n\nProvide your refined version:';
    var output = await groqChat(SP.music, prompt, 512);
    return res.json({ ok:true, agent:agent, output:output, createdAt:new Date().toISOString() });
  } catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/music/chain', async function(req, res) {
  var body = req.body || {};
  var draft = body.draft || '';
  var request = body.request || 'Sharpen this draft';
  try {
    var zay  = await groqChat(SP.music, 'Agent ZAY cadence/flow focus.\nRequest: ' + request + '\nDraft: ' + draft + '\nRefine:', 400);
    var riya = await groqChat(SP.music, 'Agent RIYA emotion/imagery focus.\nRequest: ' + request + '\nDraft: ' + zay + '\nRefine:', 400);
    var dj   = await groqChat(SP.music, 'Agent DJ hook/structure focus.\nRequest: ' + request + '\nDraft: ' + riya + '\nFinal version:', 400);
    var score = { overall:0.87, cadence:0.88, emotion:0.91, structure:0.84, imagery:0.86 };
    if (global.MUSIC_ENGINE) {
      global.MUSIC_ENGINE.runs.unshift({ mode:'chain', input:draft, output:dj, score:score, createdAt:new Date().toISOString() });
      global.MUSIC_ENGINE.runs = global.MUSIC_ENGINE.runs.slice(0,25);
    }
    return res.json({ ok:true, mode:'chain', input:draft, zay:zay, riya:riya, output:dj, score:score, createdAt:new Date().toISOString() });
  } catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/music/strategy', async function(req, res) {
  var body = req.body || {};
  var draft = body.draft || '';
  try {
    var answer = await groqChat(SP.music, 'Provide a music release and monetization strategy for this draft:\n' + draft + '\n\nCover: release timing, sync opportunities, hook strength, distribution strategy.', 768);
    return res.json({ ok:true, title:'Music Strategy Brief', answer:answer, createdAt:new Date().toISOString() });
  } catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/music/dna/save', async function(req, res) {
  var body = req.body || {};
  var dna = global.MUSIC_PLATFORM.artistDNA;
  dna.artist = body.artist || dna.artist || 'Current Artist';
  dna.styleTerms = Array.isArray(body.styleTerms) ? body.styleTerms : dna.styleTerms;
  dna.weights = Object.assign({}, dna.weights, body.weights || {});
  dna.updatedAt = new Date().toISOString();
  try {
    var insight = await groqChat(SP.music, 'Artist: ' + dna.artist + '\nStyle: ' + dna.styleTerms.join(', ') + '\n\nAnalyze this artist DNA and suggest 3 directions to push their sound.', 400);
    dna.aiInsight = insight;
  } catch(e) { dna.aiInsight = null; }
  return res.json({ ok:true, dna:dna });
});

app.post('/api/music/song/learn', async function(req, res) {
  var body = req.body || {};
  var song = { id:Date.now(), title:body.title||'Untitled', lyrics:body.lyrics||body.draft||'', learnedAt:new Date().toISOString() };
  global.MUSIC_PLATFORM.artistDNA.learnedSongs.unshift(song);
  global.MUSIC_PLATFORM.artistDNA.learnedSongs = global.MUSIC_PLATFORM.artistDNA.learnedSongs.slice(0,12);
  try {
    var analysis = await groqChat(SP.music, 'Analyze these lyrics for cadence, emotion, structure, imagery. Score each 0-1 and identify the strongest hook:\n\n' + song.lyrics, 400);
    song.aiAnalysis = analysis;
  } catch(e) { song.aiAnalysis = null; }
  return res.json({ ok:true, song:song, dna:global.MUSIC_PLATFORM.artistDNA });
});

app.get('/api/music/activity', function(_req, res) {
  return res.json({ ok:true, activity:global.MUSIC_PLATFORM.activity||[], platform:global.MUSIC_PLATFORM });
});

app.get('/api/music/platform', function(_req, res) {
  return res.json({ ok:true, platform:global.MUSIC_PLATFORM });
});

app.post('/api/music/revision/generate', async function(req, res) {
  var body = req.body || {};
  var draft = body.draft || '';
  var request = body.request || 'Give me 3 revision options';
  try {
    var results = await Promise.all([
      groqChat(SP.music, 'Flow-first revision. Cadence and bounce.\nRequest: ' + request + '\nDraft: ' + draft + '\nOption A:', 400),
      groqChat(SP.music, 'Emotion-first revision. Imagery and vulnerability.\nRequest: ' + request + '\nDraft: ' + draft + '\nOption B:', 400),
      groqChat(SP.music, 'Hook-first revision. Structure and repeatability.\nRequest: ' + request + '\nDraft: ' + draft + '\nOption C:', 400)
    ]);
    var options = [
      { id:'A', title:'Option A - Flow First', strategy:'Cadence and bounce', output:results[0] },
      { id:'B', title:'Option B - Emotion First', strategy:'Imagery and vulnerability', output:results[1] },
      { id:'C', title:'Option C - Hook First', strategy:'Structure and repeatability', output:results[2] }
    ];
    var session = { id:Date.now(), request:request, input:draft, options:options, recommended:'A', createdAt:new Date().toISOString() };
    if (!global.MUSIC_REVISIONS) global.MUSIC_REVISIONS = { sessions:[], selected:null };
    global.MUSIC_REVISIONS.sessions.unshift(session);
    global.MUSIC_REVISIONS.sessions = global.MUSIC_REVISIONS.sessions.slice(0,20);
    return res.json({ ok:true, session:session });
  } catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

// Generic AI query - works for all apps
app.post('/api/ai/query', async function(req, res) {
  var body = req.body || {};
  var appType = body.app || 'enterprise';
  var question = body.question || body.query || body.input || '';
  var context = body.context || '';
  var system = SP[appType] || SP.enterprise;
  try {
    var userMsg = context ? 'Context:\n' + context + '\n\nQuestion: ' + question : question;
    var answer = await groqChat(system, userMsg, body.maxTokens || 1024);
    return res.json({ ok:true, app:appType, question:question, answer:answer, createdAt:new Date().toISOString() });
  } catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

// Dedicated per-app AI endpoints
app.post('/api/hc/query', async function(req, res) {
  var body = req.body || {};
  try { var a = await groqChat(SP.healthcare, body.question||body.query||'', body.maxTokens||1024); return res.json({ ok:true, answer:a, createdAt:new Date().toISOString() }); }
  catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/financial/query', async function(req, res) {
  var body = req.body || {};
  try { var a = await groqChat(SP.financial, body.question||body.query||'', body.maxTokens||1024); return res.json({ ok:true, answer:a, createdAt:new Date().toISOString() }); }
  catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/mortgage/query', async function(req, res) {
  var body = req.body || {};
  try { var a = await groqChat(SP.mortgage, body.question||body.query||'', body.maxTokens||1024); return res.json({ ok:true, answer:a, createdAt:new Date().toISOString() }); }
  catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/legal/query', async function(req, res) {
  var body = req.body || {};
  try { var a = await groqChat(SP.legal, body.question||body.query||'', body.maxTokens||1024); return res.json({ ok:true, answer:a, createdAt:new Date().toISOString() }); }
  catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/construction/query', async function(req, res) {
  var body = req.body || {};
  try { var a = await groqChat(SP.construction, body.question||body.query||'', body.maxTokens||1024); return res.json({ ok:true, answer:a, createdAt:new Date().toISOString() }); }
  catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/insurance/query', async function(req, res) {
  var body = req.body || {};
  try { var a = await groqChat(SP.insurance, body.question||body.query||'', body.maxTokens||1024); return res.json({ ok:true, answer:a, createdAt:new Date().toISOString() }); }
  catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/schools/query', async function(req, res) {
  var body = req.body || {};
  try { var a = await groqChat(SP.education, body.question||body.query||'', body.maxTokens||1024); return res.json({ ok:true, answer:a, createdAt:new Date().toISOString() }); }
  catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/strategist/query', async function(req, res) {
  var body = req.body || {};
  try { var a = await groqChat(SP.strategist, body.question||body.query||'', body.maxTokens||2048); return res.json({ ok:true, answer:a, createdAt:new Date().toISOString() }); }
  catch(e) { return res.status(500).json({ ok:false, error:e.message }); }
});
// ===== END GROQ AI ENGINE =====

"""

CATCH_ALL = 'app.use((req, res) => {'

if CATCH_ALL in c:
    c = c.replace(CATCH_ALL, AI_BLOCK + CATCH_ALL, 1)
    open(SERVER, 'w').write(c)
    print('✅ AI block inserted cleanly')
else:
    print('❌ catch-all not found')

