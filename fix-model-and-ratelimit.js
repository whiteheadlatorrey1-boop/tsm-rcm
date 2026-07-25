const fs = require('fs');
let src = fs.readFileSync('server.js', 'utf8');
let changes = 0;

// STEP 1 — switch default model from openai/gpt-oss-120b to llama-3.1-8b-instant
// 70b uses ~10x more tokens per request vs 8b — free tier burns out in minutes
const oldModel = `process.env.TSM_MODEL || 'openai/gpt-oss-120b'`;
const newModel = `process.env.TSM_MODEL || 'llama-3.1-8b-instant'`;
const modelCount = (src.match(new RegExp(oldModel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
src = src.replaceAll(oldModel, newModel);
changes += modelCount;
console.log(`✓ Switched ${modelCount} routes to llama-3.1-8b-instant`);

// STEP 2 — replace safeParseGroq with a version that detects rate limits
const oldHelper = `// safeParseGroq — extracts valid JSON from Groq responses even if truncated
function safeParseGroq(text, fallback = {}) {
  try {
    const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
    // try direct parse first
    return JSON.parse(clean);
  } catch(_) {
    try {
      // extract largest {...} block
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        return JSON.parse(text.slice(start, end + 1));
      }
    } catch(_) {}
    return { ok: false, error: 'parse_failed', raw: text.slice(0, 200), ...fallback };
  }
}`;

const newHelper = `// safeParseGroq — extracts valid JSON, handles rate limits and truncation
function safeParseGroq(text, fallback = {}) {
  try {
    const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
    return JSON.parse(clean);
  } catch(_) {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        return JSON.parse(text.slice(start, end + 1));
      }
    } catch(_) {}
    return { ok: false, error: 'parse_failed', raw: text.slice(0, 200), ...fallback };
  }
}

// groqFetch — wraps Groq API call with rate limit detection
async function groqFetch(prompt, maxTokens = 900) {
  const model = process.env.TSM_MODEL || 'llama-3.1-8b-instant';
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const raw = await r.json();
  if (raw.error?.code === 'rate_limit_exceeded') {
    const msg = raw.error.message || '';
    const match = msg.match(/try again in ([\\d\\.]+[smh])/i);
    throw new Error('RATE_LIMITED:' + (match ? match[1] : '60s'));
  }
  const text = (raw.choices?.[0]?.message?.content || '').replace(/\`\`\`json|\`\`\`/g, '').trim();
  return text;
}`;

if (src.includes(oldHelper)) {
  src = src.replace(oldHelper, newHelper);
  console.log('✓ safeParseGroq upgraded with rate limit detection + groqFetch helper');
  changes++;
} else {
  console.log('⚠ Could not find old safeParseGroq — may need manual update');
}

// STEP 3 — add rate limit catch to all music route try/catch blocks
// Replace the catch pattern to detect RATE_LIMITED errors
const oldCatch = `} catch(e) { return res.json({ ok:false, error: e.message }); }`;
const newCatch = `} catch(e) {
    if (e.message?.startsWith('RATE_LIMITED:')) {
      return res.status(429).json({ ok:false, error:'rate_limited', retry_after: e.message.split(':')[1], message:'AI quota reached. Try again in ' + e.message.split(':')[1] });
    }
    return res.json({ ok:false, error: e.message });
  }`;

const catchCount = (src.match(new RegExp(oldCatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
src = src.replaceAll(oldCatch, newCatch);
console.log(`✓ Added rate limit handling to ${catchCount} route catch blocks`);
changes += catchCount;

fs.writeFileSync('server.js', src);
console.log(`\n✓ ${changes} total changes. Run: node --check server.js && touch server.js && fly deploy --local-only --app tsm-shell`);
