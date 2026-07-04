path = "server.js"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

start_marker = "app.post('/api/war-room/stream'"
start_idx = None
for i, line in enumerate(lines):
    if start_marker in line:
        if start_idx is not None:
            print(f"FAIL: multiple occurrences of {start_marker} found. Aborting.")
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

required_markers = ["groqKey", "fetch('https://api.groq.com", "stream: true"]
missing = [m for m in required_markers if m not in old_block]
if missing:
    print(f"FAIL: extracted block missing expected markers {missing}. Aborting.")
    print(old_block)
    raise SystemExit(1)

if "ensureHeaders" in old_block:
    print("SKIP: live-streaming empty-stream fix already applied")
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

  const maxEmptyRetries = 2;
  let succeeded = false;
  let headersSent = false;

  function ensureHeaders() {
    if (!headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      headersSent = true;
    }
  }

  try {
    for (let attempt = 0; attempt <= maxEmptyRetries && !succeeded; attempt++) {
      const groqRes = await fetchGroqStream();
      const reader = groqRes.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let gotContent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const d = line.slice(6);
          if (d === '[DONE]') continue;
          let delta = '';
          try { delta = JSON.parse(d).choices?.[0]?.delta?.content || ''; } catch (e) {}
          if (delta) {
            gotContent = true;
            ensureHeaders();
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\\n\\n`);
          }
        }
      }

      if (gotContent) {
        succeeded = true;
      } else {
        debugLog(`Empty stream content on attempt ${attempt + 1}/${maxEmptyRetries + 1}, retrying`);
        if (attempt === maxEmptyRetries) {
          debugLog('Exhausted empty-stream retries, giving up');
        }
      }
    }

    ensureHeaders();
    res.write('data: [DONE]\\n\\n');
    res.end();
  } catch (e) {
    if (res.headersSent) {
      res.end();
    } else {
      res.status(e.status || 500).json({ error: e.message });
    }
  }
});
"""

new_lines = lines[:start_idx] + [new_block] + lines[end_idx + 1:]
with open(path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print(f"OK: replaced route spanning original lines {start_idx+1}-{end_idx+1} with live-streaming + retry-on-empty version")
print("File written.")
