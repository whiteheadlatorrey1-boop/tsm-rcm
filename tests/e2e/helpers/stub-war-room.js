// Deterministic stand-in for POST /api/war-room/stream (SSE, same shape as server.js).
// `outputs` is an array of 6 strings, one per engine, in call order.
async function stubWarRoom(page, outputs) {
  let calls = 0;
  await page.route('**/api/war-room/stream', async (route) => {
    const req = route.request();
    if (req.method() !== 'POST') return route.continue();
    let idx = calls++;
    try {
      const body = JSON.parse(req.postData() || '{}');
      const prompt = (body.messages || []).map(m => m.content).join('\n');
      const m = /ENGINE 0([1-6])/.exec(prompt);
      if (m) idx = Number(m[1]) - 1;   // prefer the prompt's own engine number
    } catch (e) { /* fall back to call order */ }
    const text = outputs[Math.min(idx, outputs.length - 1)];
    const sse = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n` +
                `data: [DONE]\n\n`;
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      body: sse,
    });
  });
}
module.exports = { stubWarRoom };
