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
    const { getContext, quickPrompts = [], endpoint = '/api/financial/query', getBriefing = null } = opts;

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

    function esc(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function addMsg(text, cls) {
      const div = document.createElement('div');
      div.className = 'a-msg ' + cls;
      div.textContent = text;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      return div;
    }

    // Renders the proactive guidance list as a structured bot message —
    // severity badge, concrete next action, and the reasoning behind the
    // route (why this tool, what's gained, what's at risk from inaction) —
    // rather than a generic greeting. Falls back to plain addMsg() if no
    // items are supplied (nothing currently needs attention).
    function addBriefingMsg(items) {
      const div = document.createElement('div');
      div.className = 'a-msg bot briefing';
      if (!items || !items.length) {
        div.innerHTML = `<div class="a-brief-empty">No open flags or exceptions right now — you're caught up. Ask me anything about status, WIP, SLAs, or how to use a specific module.</div>`;
        body.appendChild(div);
        body.scrollTop = body.scrollHeight;
        return div;
      }
      const rows = items.slice(0, 5).map(it => `
        <div class="a-brief-item" data-tool="${esc(it.tool || '')}" data-title="${esc(it.title || '')}">
          <div class="a-brief-top">
            <span class="sev-badge ${esc(it.severity || 'medium')}">${esc(it.severity || 'medium')}</span>
            <span class="a-brief-title">${esc(it.title || 'Untitled item')}</span>
          </div>
          <div class="a-brief-next"><strong>Next:</strong> ${esc(it.nextAction || '—')}</div>
          <div class="a-brief-why">${esc(it.why || '')}${it.riskOfInaction ? ' · <strong>If left:</strong> ' + esc(it.riskOfInaction) : ''}</div>
          ${it.tool ? `<button class="a-brief-open" data-tool="${esc(it.tool)}">Open ${esc(it.tool.replace('.html', ''))} ↗</button>` : ''}
        </div>`).join('');
      div.innerHTML = `<div class="a-brief-head">Here's what needs attention right now, ranked by severity:</div>${rows}`;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      div.querySelectorAll('.a-brief-open').forEach(btn => {
        btn.addEventListener('click', () => { window.open(btn.dataset.tool, '_blank'); });
      });
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
        const answer = (data && (data.answer || data.content || data.reply || data.output)) ||
          "I couldn't get an answer back from the assistant service just now.";
        pending.textContent = answer;
        pending.classList.remove('pending');
      } catch (err) {
        pending.textContent = "I can't reach the assistant service right now, but here's what the workspace shows:\n\n" + ctx;
        pending.classList.remove('pending');
      }
    }

    fab.addEventListener('click', async () => {
      panel.classList.toggle('open');
      if (panel.classList.contains('open') && !body.children.length) {
        if (getBriefing) {
          const thinking = addMsg('Checking current status…', 'bot pending');
          try {
            const items = await getBriefing();
            thinking.remove();
            addBriefingMsg(items);
          } catch (e) {
            thinking.remove();
            addMsg("Hi — I can help with status, WIP, and SLA questions for this workspace. Ask me anything, or tap a suggestion below.", 'bot');
          }
        } else {
          addMsg("Hi — I can help with status, WIP, and SLA questions for this workspace. Ask me anything, or tap a suggestion below.", 'bot');
        }
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