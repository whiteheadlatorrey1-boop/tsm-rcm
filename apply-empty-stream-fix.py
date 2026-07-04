path = "server.js"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

start_marker = "app.post('/api/war-room/stream'"
start_idx = None
for i, line in enumerate(lines):
    if start_marker in line:
        if start_idx is not None:
            print(f"FAIL: multiple occurrences of {start_marker} found (lines {start_idx+1} and {i+1}). Aborting.")
            raise SystemExit(1)
        start_idx = i

if start_idx is None:
    print(f"FAIL: could not find route start marker: {start_marker}")
    raise SystemExit(1)

end_idx = None
for j in range(start_idx + 1, len(lines)):
    if lines[j].rstrip('\n') == "});":
        end_idx = j
        break

if end_idx is None:
    print("FAIL: could not find matching top-level closing '});' for the route. Aborting.")
    raise SystemExit(1)

old_block = "".join(lines[start_idx:end_idx + 1])

required_markers = ["groqKey", "fetch('https://api.groq.com", "Readable.fromWeb", "stream: true"]
missing = [m for m in required_markers if m not in old_block]
if missing:
    print(f"FAIL: extracted block missing expected markers {missing}. Not safe to replace. Aborting.")
    print("----- extracted block for manual review -----")
    print(old_block)
    raise SystemExit(1)

if "maxEmptyRetries" in old_block:
    print("SKIP: empty-stream fix already applied")
    raise SystemExit(0)

new_block = """app.post('/api/war-room/stream', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { model, messages, max_tokens, temperature } = req.body;
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'Missing messages' });

  const groqKey = process.env.GROQ_KEY || process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_KEY not configured on server.' });

  async function fetchGroqStream() {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + groqKey
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-oss-120b',
        stream: true,
        max_tokens: max_tokens || 600,
        temperature: temperature ?? 0.4,
        messages
      })
    });
    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      console.error('Groq error response:', JSON.stringify(err));
      const e = new Error(err.error?.message || 'Groq error');
      e.status = 502;
      throw e;
    }
    return groqRes;
  }

  try {
    let fullContent = '';
    const maxEmptyRetries = 2;
    for (let emptyAttempt = 0; emptyAttempt <= maxEmptyRetries; emptyAttempt++) {
      const groqRes = await fetchGroqStream();
      const reader = groqRes.body.getReader();
      const dec = new TextDecoder();
      let chunkText = '';
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\\n');
        buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const d = line.slice(6);
            if (d === '[DONE]') continue;
            try { chunkText += JSON.parse(d).choices?.[0]?.delta?.content || ''; } catch (e) {}
          }
        }
      }
      if (chunkText.trim()) {
        fullContent = chunkText;
        break;
      }
      debugLog(`Empty stream content on attempt ${emptyAttempt + 1}/${maxEmptyRetries + 1}, retrying`);
      if (emptyAttempt === maxEmptyRetries) {
        debugLog('Exhausted empty-stream retries, giving up');
      }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (!fullContent.trim()) {
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: '' } }] })}\\n\\n`);
    } else {
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: fullContent } }] })}\\n\\n`);
    }
    res.write('data: [DONE]\\n\\n');
    res.end();
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});
"""

new_lines = lines[:start_idx] + [new_block] + lines[end_idx + 1:]
with open(path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print(f"OK: replaced route spanning original lines {start_idx+1}-{end_idx+1}")
print("File written.")
