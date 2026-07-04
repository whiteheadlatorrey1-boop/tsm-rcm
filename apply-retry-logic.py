path = "server.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changed = False

# Insert retry helper function right before the /api/war-room/stream route
old_route_start = "app.post('/api/war-room/stream', async (req, res) => {"

retry_helper = '''async function fetchGroqWithRetry(groqKey, body, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + groqKey
      },
      body: JSON.stringify(body)
    });
    if (groqRes.ok) return groqRes;
    const err = await groqRes.json().catch(() => ({}));
    console.error('Groq error response:', JSON.stringify(err));
    const isRateLimit = err.error?.code === 'rate_limit_exceeded';
    if (isRateLimit && attempt < maxRetries) {
      const match = /try again in ([\\d.]+)(ms|s)/.exec(err.error.message || '');
      let waitMs = 1500;
      if (match) {
        const val = parseFloat(match[1]);
        waitMs = match[2] === 's' ? val * 1000 : val;
      }
      waitMs = Math.min(waitMs + 250, 10000);
      console.error(`Rate limited, retrying in \${waitMs}ms (attempt \${attempt + 1}/\${maxRetries})`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    const failErr = new Error(err.error?.message || 'Groq error');
    failErr.status = 502;
    throw failErr;
  }
}

'''

if 'async function fetchGroqWithRetry' in content:
    print("SKIP: retry helper already present")
elif old_route_start in content:
    content = content.replace(old_route_start, retry_helper + old_route_start, 1)
    changed = True
    print("OK: inserted fetchGroqWithRetry helper")
else:
    print("FAIL: could not find route start anchor")

# Replace the direct fetch call + error handling inside the route with the retry-wrapped version
old_call = '''    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + groqKey
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-oss-120b',
        stream: true,
        max_tokens: max_tokens || 400,
        temperature: temperature ?? 0.4,
        messages
      })
    });
    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      console.error('Groq error response:', JSON.stringify(err));
      return res.status(502).json({ error: err.error?.message || 'Groq error' });
    }'''

new_call = '''    let groqRes;
    try {
      groqRes = await fetchGroqWithRetry(groqKey, {
        model: model || 'openai/gpt-oss-120b',
        stream: true,
        max_tokens: max_tokens || 400,
        temperature: temperature ?? 0.4,
        messages
      });
    } catch (e) {
      return res.status(e.status || 502).json({ error: e.message || 'Groq error' });
    }'''

if 'fetchGroqWithRetry(groqKey' in content and old_call not in content:
    print("SKIP: route call already updated")
elif old_call in content:
    content = content.replace(old_call, new_call, 1)
    changed = True
    print("OK: route now uses fetchGroqWithRetry")
else:
    print("FAIL: could not find exact fetch block to replace — check spacing/max_tokens value")

if changed:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("\\nFile written.")
else:
    print("\\nNo changes written.")
