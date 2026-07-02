/**
 * TSM AI Client — drop into any TSMatter app's static folder
 * Talks to TSM-AI-3200 via TSM Neural Core openai/gpt-oss-120b
 *
 * Usage (3 lines in any HTML page):
 *   <input id="ai-input" placeholder="Ask anything..." />
 *   <button id="ai-btn">Ask</button>
 *   <div id="ai-output"></div>
 *   <script type="module">
 *     import { initAIButton } from '/tsm-ai-client.js';
 *     initAIButton('#ai-btn', '#ai-input', '#ai-output');
 *   </script>
 */

const AI_ENDPOINT = "https://tsm-core.fly.dev/ask";

function getAppSlug() {
  return window.location.hostname.replace(".tsmatter.com", "");
}

async function askAI(userMessage, history = []) {
  const messages = [...history, { role: "user", content: userMessage }];
  const res = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app: getAppSlug(), messages })
  });
  if (!res.ok) throw new Error(`AI service returned ${res.status}`);
  const data = await res.json();
  return data.reply;
}

function initAIButton(btnSel, inputSel, outputSel, options = {}) {
  const btn    = document.querySelector(btnSel);
  const input  = document.querySelector(inputSel);
  const output = document.querySelector(outputSel);

  if (!btn || !input || !output) {
    console.error("TSM AI: selector not found", { btnSel, inputSel, outputSel });
    return;
  }

  const history = [];
  const placeholder = options.placeholder || "Ask anything...";
  input.placeholder = placeholder;

  function esc(str) {
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function fmt(text) {
    // Render code blocks, preserve line breaks
    return esc(text)
      .replace(/```([\s\S]*?)```/g, (_, c) =>
        `<pre style="background:rgba(0,0,0,0.06);padding:8px 12px;border-radius:6px;font-size:12px;overflow-x:auto;margin:6px 0">${c.trim()}</pre>`)
      .replace(/\n/g, "<br>");
  }

  function append(role, html) {
    const d = document.createElement("div");
    d.style.cssText = role === "user"
      ? "text-align:right;margin:6px 0;font-size:13px"
      : "text-align:left;margin:6px 0;font-size:13px;line-height:1.5";
    d.innerHTML = role === "user"
      ? `<span style="background:#e8f0fe;padding:5px 10px;border-radius:12px;display:inline-block">${html}</span>`
      : `<span style="background:#f4f4f4;padding:5px 10px;border-radius:12px;display:inline-block;max-width:90%;text-align:left">${html}</span>`;
    output.appendChild(d);
    output.scrollTop = output.scrollHeight;
    return d;
  }

  async function send() {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    btn.disabled = true;
    btn.textContent = "...";

    append("user", esc(text));
    const thinking = append("ai", "<em style='color:#999'>Thinking...</em>");

    try {
      const reply = await askAI(text, history);
      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: reply });
      thinking.innerHTML = `<span style="background:#f4f4f4;padding:5px 10px;border-radius:12px;display:inline-block;max-width:90%;text-align:left">${fmt(reply)}</span>`;
    } catch (err) {
      thinking.innerHTML = `<span style="color:#c00;font-size:12px">Error: ${esc(err.message)}</span>`;
    }

    btn.disabled = false;
    btn.textContent = options.btnLabel || "Ask";
  }

  btn.addEventListener("click", send);
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) send(); });
}
