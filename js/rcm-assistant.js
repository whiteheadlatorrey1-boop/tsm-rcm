// js/rcm-assistant.js
//
// RCM Assistant widget — floating chat that answers status/WIP/SLA questions.
// Decoupled from page internals: the host page passes in a getContext()
// function that returns a plain-text context string, so this file doesn't
// need to know about CADENCES, taskState, relayData, etc.
//
// Usage in tsm-rcm-os.html:
//   <script src="js/rcm-assistant.js"></script>
//   <script>
//     RCMAssistant.init({
//       getContext: () => buildAssistantContext(), // returns a string
//       quickPrompts: ["What's my SLA status?", ...]
//     });
//   </script>

(function (global) {
  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function init(opts) {
    const { getContext, quickPrompts = [], endpoint = '/api/financial/query' } = opts;

    document.body.appendChild(el(`
      <button class="assistant-fab" id="assistantFab" title="Ask the RCM Assistant">🤖</button>
    `));
    document.body.appendChild(el(`
      <div class="assistant-panel" id="assistantPanel">
        <div class="assistant-header">
          <div>
            <div class="assistant-title">RCM Assistant</div>
            <div class="assistant-sub">Status · WIP · SLAs — ask about this workspace</div>
          </div>
          <button class="assistant-close" id="assistantClose">✕</button>
        </div>
        <div class="assistant-body" id="assistantBody"></div>
        <div class="assistant-quick" id="assistantQuick"></div>
        <div class="assistant-input-row">
          <input type="text" id="assistantInput" placeholder="Ask about status, WIP, or SLAs...">
          <button class="assistant-send" id="assistantSend">Send</button>
        </div>
      </div>
    `));

    const fab = document.getElementById('assistantFab');
    const panel = document.getElementById('assistantPanel');
    const close = document.getElementById('assistantClose');
    const body = document.getElementById('assistantBody');
    const input = document.getElementById('assistantInput');
    const send = document.getElementById('assistantSend');
    const quick = document.getElementById('assistantQuick');

    quick.innerHTML = quickPrompts.map(q => `<span class="qchip">${q}</span>`).join('');
    quick.querySelectorAll('.qchip').forEach((chip, i) => {
      chip.addEventListener('click', () => ask(quickPrompts[i]));
    });

    function addMsg(text, cls) {
      const div = document.createElement('div');
      div.className = 'a-msg ' + cls;
      div.textContent = text;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      return div;
    }

    async function ask(question) {
      if (!question || !question.trim()) return;
      addMsg(question, 'user');
      const pending = addMsg('Thinking…', 'bot pending');

      const ctx = getContext ? getContext() : '';
      const prompt = `${ctx}\n\nEU QUESTION: ${question}\n\nAnswer directly and concisely, grounded in the data above. If asked about SLAs and none are explicitly defined in the data, say so plainly rather than inventing figures.`;

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: prompt.slice(0, 3000), max_tokens: 500 })
        });
        const data = await res.json();
        const answer = (data && (data.content || data.reply || data.output)) ||
          "I couldn't get an answer back from the assistant service just now.";
        pending.textContent = answer;
        pending.classList.remove('pending');
      } catch (err) {
        pending.textContent = "I can't reach the assistant service right now, but here's what the workspace shows:\n\n" + ctx;
        pending.classList.remove('pending');
      }
    }

    fab.addEventListener('click', () => {
      panel.classList.toggle('open');
      if (panel.classList.contains('open') && !body.children.length) {
        addMsg("Hi — I can help with status, WIP, and SLA questions for this workspace. Ask me anything, or tap a suggestion below.", 'bot');
      }
    });
    close.addEventListener('click', () => panel.classList.remove('open'));
    send.addEventListener('click', () => { const q = input.value; input.value = ''; ask(q); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const q = input.value; input.value = ''; ask(q); }
    });

    return { ask };
  }

  global.RCMAssistant = { init };
})(window);