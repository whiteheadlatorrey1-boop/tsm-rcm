'use strict';
// =====================================================
// TSM CAREER AI PROXY — server-side Groq completion
// =====================================================
// Powers two client features in tsm-career-training-platform.html:
//   1. AB-100 Command Center (msaiTutor / msaiGenScen / msaiGradeAnswer)
//   2. AI Interview Proof Map (iqGenerate)
// Both previously called api.anthropic.com directly from the browser
// with no key attached — always failed. This proxies to Groq instead,
// keeping GROQ_API_KEY server-side only, same pattern as the rest of
// TSM Shell (Groq routed server-side, never client-exposed).

const express = require('express');
const router = express.Router();

const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// POST /api/career/ai-complete
// Body: { messages: [{ role: 'user', content: '<prompt>' }], max_tokens? }
// Response shape matches what the client already parses:
//   { content: [{ type: 'text', text: '<completion>' }] }
router.post('/api/career/ai-complete', async (req, res) => {
  const { messages, max_tokens } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ ok: false, error: 'messages array required' });
  }
  const groqKey = process.env.GROQ_KEY || process.env.GROQ_API_KEY;
  if (!groqKey) {
    return res.status(500).json({ ok: false, error: 'GROQ_KEY / GROQ_API_KEY not set on server' });
  }

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: max_tokens || 1000
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', groqRes.status, errText);
      return res.status(502).json({ ok: false, error: `Groq API error: ${groqRes.status}` });
    }

    const data = await groqRes.json();
    const text = data.choices?.[0]?.message?.content || '';

    res.json({ content: [{ type: 'text', text }] });
  } catch (e) {
    console.error('Career AI proxy error:', e);
    res.status(500).json({ ok: false, error: 'AI proxy failed' });
  }
});

module.exports = router;