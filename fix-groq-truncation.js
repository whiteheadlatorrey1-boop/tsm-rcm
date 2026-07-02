const fs = require('fs');
let src = fs.readFileSync('server.js', 'utf8');

// STEP 1 — inject a safeParseGroq helper right after the music routes comment
// This handles: markdown fences, truncated JSON, extra text before/after
const helperFn = `
// safeParseGroq — extracts valid JSON from Groq responses even if truncated
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
}
`;

// inject helper before the first music billing route
if (!src.includes('safeParseGroq')) {
  src = src.replace(
    `app['get']('/api/music/billing/state'`,
    helperFn + `app['get']('/api/music/billing/state'`
  );
  console.log('✓ safeParseGroq helper injected');
} else {
  console.log('- safeParseGroq already present, skipping');
}

// STEP 2 — replace all JSON.parse(text) in music routes with safeParseGroq(text)
// and also bump max_tokens on known failing routes
const replacements = [
  // agent/run — was 700, bump to 1200
  {
    find: `model: process.env.TSM_MODEL || 'openai/gpt-oss-120b', max_tokens:700, messages:[{role:'user',content:prompt}] }) }); const raw = await r.json(); const text = (raw.choices?.[0]?.message?.content || '').replace(/\\\`\\\`\\\`json|\\\`\\\`\\\`/g,'').trim(); return res.json(JSON.parse(text)); } catch(e) { return res.json({ ok:false, error: e.message }); }
});
app['post']('/api/music/agent/chain'`,
    replace: `model: process.env.TSM_MODEL || 'openai/gpt-oss-120b', max_tokens:1200, messages:[{role:'user',content:prompt}] }) }); const raw = await r.json(); const text = (raw.choices?.[0]?.message?.content || '').replace(/\\\`\\\`\\\`json|\\\`\\\`\\\`/g,'').trim(); return res.json(safeParseGroq(text, {ok:false})); } catch(e) { return res.json({ ok:false, error: e.message }); }
});
app['post']('/api/music/agent/chain'`
  },
  // agent/chain — was 800, bump to 1400
  {
    find: `model: process.env.TSM_MODEL || 'openai/gpt-oss-120b', max_tokens:800, messages:[{role:'user',content:prompt}] }) }); const raw = await r.json(); const text = (raw.choices?.[0]?.message?.content || '').replace(/\\\`\\\`\\\`json|\\\`\\\`\\\`/g,'').trim(); return res.json(JSON.parse(text)); } catch(e) { return res.json({ ok:false, error: e.message }); }`,
    replace: `model: process.env.TSM_MODEL || 'openai/gpt-oss-120b', max_tokens:1400, messages:[{role:'user',content:prompt}] }) }); const raw = await r.json(); const text = (raw.choices?.[0]?.message?.content || '').replace(/\\\`\\\`\\\`json|\\\`\\\`\\\`/g,'').trim(); return res.json(safeParseGroq(text, {ok:false})); } catch(e) { return res.json({ ok:false, error: e.message }); }`
  }
];

// STEP 3 — global replace ALL remaining JSON.parse(text) in music routes with safeParseGroq
let count = 0;
while (src.includes("return res.json(JSON.parse(text));")) {
  src = src.replace("return res.json(JSON.parse(text));", "return res.json(safeParseGroq(text, {ok:false}));");
  count++;
}
console.log(`✓ Replaced ${count} JSON.parse(text) calls with safeParseGroq`);

// STEP 4 — bump remaining low max_tokens values
const tokenBumps = [
  ['max_tokens:500', 'max_tokens:900'],
  ['max_tokens:600', 'max_tokens:1000'],
];
tokenBumps.forEach(([find, replace]) => {
  const before = (src.match(new RegExp(find, 'g')) || []).length;
  src = src.replaceAll(find, replace);
  const after = (src.match(new RegExp(find, 'g')) || []).length;
  console.log(`✓ Bumped ${before - after} instances of ${find} → ${replace}`);
});

fs.writeFileSync('server.js', src);
console.log('\n✓ Patch applied. Run: node --check server.js && fly deploy --local-only --app tsm-shell');
