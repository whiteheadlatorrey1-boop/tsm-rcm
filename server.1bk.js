const express = require('express');
const path    = require('path');
const fs      = require('fs');
const https   = require('https');
const http    = require('http');

const app  = express();
const PORT = process.env.NODE_PORT || 3000;

app.use(express.json({ limit: '4mb' }));

// ─────────────────────────────────────────────
// 📁 DATA STORE (Fly-safe, ephemeral)
// ─────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data', 'hc-strategist');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const NODE_STATE_FILE = path.join(DATA_DIR, 'node-state.json');

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(REPORTS_FILE)) fs.writeFileSync(REPORTS_FILE, '[]');
  if (!fs.existsSync(NODE_STATE_FILE)) fs.writeFileSync(NODE_STATE_FILE, '{}');
}
ensureStore();

const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f)); } catch { return d; } };
const write = (f, v) => fs.writeFileSync(f, JSON.stringify(v,null,2));

// ─────────────────────────────────────────────
// 🧠 GROQ PROXY (TSM Neural Core Bridge)
// ─────────────────────────────────────────────
app.post('/api/groq', (req, res) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: 'Missing GROQ_API_KEY' });

  const payload = JSON.stringify({
    model: 'openai/gpt-oss-120b',
    max_tokens: 1000,
    stream: false,
    messages: req.body.messages
  });

  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key,
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const r = https.request(options, r2 => {
    let body = '';
    r2.on('data', d => body += d);
    r2.on('end', () => res.send(body));
  });

  r.on('error', e => res.status(500).json({ error: e.message }));
  r.write(payload);
  r.end();
});

// ─────────────────────────────────────────────
// 🏥 HC REPORT STORAGE
// ─────────────────────────────────────────────
app.get('/api/hc/reports', (req,res)=>{
  res.json({ ok:true, reports: read(REPORTS_FILE,[]) });
});

app.post('/api/hc/reports', (req,res)=>{
  const reports = read(REPORTS_FILE,[]);
  const now = new Date().toISOString();

  const rpt = {
    id: "rpt_"+Date.now(),
    title: req.body.title || "Untitled",
    company: req.body.company || "",
    summary: req.body.summary || "",
    createdAt: now
  };

  reports.unshift(rpt);
  write(REPORTS_FILE, reports.slice(0,200));

  res.json({ ok:true, report:rpt });
});

app.delete('/api/hc/reports/:id', (req,res)=>{
  const data = read(REPORTS_FILE,[]);
  const next = data.filter(r=>r.id !== req.params.id);
  write(REPORTS_FILE,next);
  res.json({ ok:true });
});

// ─────────────────────────────────────────────
// 🔁 HC NODE REAL-TIME STATE
// ─────────────────────────────────────────────
app.get('/api/hc/nodes', (req,res)=>{
  res.json({ ok:true, state: read(NODE_STATE_FILE,{}) });
});

app.post('/api/hc/nodes/:node', (req,res)=>{
  const state = read(NODE_STATE_FILE,{});

  state[req.params.node] = {
    ...req.body,
    updated: new Date().toISOString()
  };

  write(NODE_STATE_FILE,state);

  res.json({ ok:true });
});

// ─────────────────────────────────────────────
// 📦 SUITE BUILDER (unchanged core logic)
// ─────────────────────────────────────────────
app.post('/api/suite', (req, res) => {
  const { title, apps } = req.body;
  if (!title || !apps?.length) {
    return res.status(400).json({ error: 'title and apps required' });
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const dir = path.join(__dirname, 'html', 'suite', slug);
  fs.mkdirSync(dir, { recursive: true });

  const html = `
  <html><body>
  <h1>${title}</h1>
  ${apps.map(a=>`<div onclick="window.open('${a.url}')">${a.name}</div>`).join('')}
  </body></html>
  `;

  fs.writeFileSync(path.join(dir,'index.html'), html);

  res.json({ ok:true, url:`/html/suite/${slug}/` });
});

// ─────────────────────────────────────────────
// 🌐 STATIC APPS (TSM SYSTEM)
// ─────────────────────────────────────────────
app.use('/html/hc-strategist', express.static(path.join(__dirname,'html/hc-strategist')));
app.use('/html/healthcare', express.static(path.join(__dirname,'html/healthcare')));
app.use('/html/suite', express.static(path.join(__dirname,'html/suite')));

// ─────────────────────────────────────────────
// 🟢 STATUS
// ─────────────────────────────────────────────
app.get('/api/status', (req,res)=>{
  res.json({
    system: "TSM FULL SYSTEM MODE",
    groq: process.env.GROQ_API_KEY ? "READY" : "MISSING",
    reports: read(REPORTS_FILE,[]).length,
    nodes: Object.keys(read(NODE_STATE_FILE,{})).length
  });
});

// ─────────────────────────────────────────────
// 🚀 START
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`TSM FULL SYSTEM MODE running on ${PORT}`);
});
