path = "server.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
    }"""

new = """  try {
    const groqRes = await fetchGroqWithRetry(groqKey, {
      model: model || 'openai/gpt-oss-120b',
      stream: true,
      max_tokens: max_tokens || 400,
      temperature: temperature ?? 0.4,
      messages
    });"""

if new in content:
    print("SKIP: already applied")
elif old in content:
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: route now calls fetchGroqWithRetry")
else:
    print("FAIL: exact block not found")
