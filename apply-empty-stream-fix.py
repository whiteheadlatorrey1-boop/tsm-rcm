path = "server.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changed = False

old = '''    const groqRes = await fetchGroqWithRetry(groqKey, {
      model: model || 'openai/gpt-oss-120b',
      stream: true,
      max_tokens: max_tokens || 400,
      temperature: temperature ?? 0.4,
      messages
    });
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const { Readable } = require('stream');
    Readable.fromWeb(groqRes.body).pipe(res);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});'''

new = '''    const reqBody = {
      model: model || 'openai/gpt-oss-120b',
      stream: true,
      max_tokens: max_tokens || 400,
      temperature: temperature ?? 0.4,
      messages
    };

    let fullContent = '';
    const maxEmptyRetries = 2;
    for (let emptyAttempt = 0; emptyAttempt <= maxEmptyRetries; emptyAttempt++) {
      const groqRes = await fetchGroqWithRetry(groqKey, reqBody);
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
});'''

if new in content:
    print("SKIP: empty-stream fix already applied")
elif old in content:
    content = content.replace(old, new, 1)
    changed = True
    print("OK: applied empty-stream detection and retry")
else:
    print("FAIL: exact block not found")

if changed:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("File written.")
else:
    print("No changes written.")
