// Shared client helper for TSM War Room engine calls.
//
// Fixes two bugs that were duplicated across plant-incident.html,
// supplier-shutdown.html, cyber-incident.html, and honeywell-strategist.html:
//
// 1. SSE chunks were decoded and split on '\n' in isolation, with no buffer
//    for a `data: ...` line that straddles two chunk boundaries. That drops
//    content silently — which is what was surfacing as "Empty response from
//    stream" on later engines, even though Groq had actually returned text.
//    server.js already buffers correctly; this brings the client in line.
//
// 2. No client-side retry existed at all, so a single dropped chunk meant a
//    permanent error badge for that engine until a full manual re-run.
//
// Usage: callWarRoomAPI(prompt, systemPrompt, { maxTokens, model, retries })

async function callWarRoomAPI(prompt, systemPrompt, opts = {}) {
  const { maxTokens = 400, model = 'openai/gpt-oss-120b', retries = 2 } = opts;

  async function attemptOnce() {
    const res = await fetch('/api/war-room/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!res.ok) {
      throw new Error(`API returned ${res.status} ${res.statusText}`);
    }

    if (res.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let out = '';
      let buf = ''; // holds an incomplete trailing line across chunk boundaries

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop(); // last element may be partial — carry it to the next read
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const d = line.slice(6);
          if (d === '[DONE]') continue;
          try { out += JSON.parse(d).choices?.[0]?.delta?.content || ''; } catch (e) {}
        }
      }

      if (!out) throw new Error('Empty response from stream');
      return out;
    }

    const data = await res.json();
    const text = data.output || data.answer || data.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('Empty response from API');
    return text;
  }

  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await attemptOnce();
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise(r => setTimeout(r, 800 + i * 600));
    }
  }
  throw lastErr;
}
