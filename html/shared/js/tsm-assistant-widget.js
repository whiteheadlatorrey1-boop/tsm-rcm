// html/shared/js/tsm-assistant-widget.js
//
// TSM Assistant Widget — platform-wide, vertical-agnostic floating AI
// assistant. Generalized from html/finops-suite/js/rcm-assistant.js so any
// war room / strategist / executive portal can drop it in.
//
// On open, instead of a generic greeting, it renders an EXPLAINABILITY
// BRIEFING: the current highest-severity open items, ranked, each with
// { severity, title, nextAction, why, riskOfInaction, tool } — the same
// shape as the platform's explainability contract (confidence/recommendedAction/
// reasoning/evidence). Falls back to a normal greeting if getBriefing is not
// supplied or returns nothing. Manual free-text queries still work at any time.
//
// Usage:
//   <script src="/html/shared/js/tsm-assistant-widget.js"></script>
//   <script>
//     TSMAssistant.init({
//       vertical: 'HotelOps',                 // display name in header
//       app: 'hotelops',                      // matches server SP[app] system prompt
//       getContext: () => buildContextString(), // plain-text snapshot for manual Q&A
//       getBriefing: () => buildBriefingItems(), // array of items, ranked, or []
//       quickPrompts: ['What needs attention today?', 'Any SLA breaches?'],
//       endpoint: '/api/ai/query'             // optional override; default works platform-wide
//     });
//   </script>
//
// Namespaced CSS (tsm-asst-*) and injected inline so it never depends on the
// host page's stylesheet, and never collides with existing page classes.

(function (global) {
  if (global.TSMAssistant) return; // idempotent across accidental double-includes

  const STYLE = `
  .tsm-asst-fab{position:fixed;bottom:22px;right:22px;width:52px;height:52px;border-radius:50%;
    background:#e8a838;color:#241705;border:none;font-size:22px;cursor:pointer;z-index:9998;
    box-shadow:0 4px 14px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;
    transition:transform .15s ease;}
  .tsm-asst-fab:hover{transform:scale(1.06);}
  .tsm-asst-panel{position:fixed;bottom:86px;right:22px;width:360px;max-height:70vh;background:#15171c;
    border:1px solid #2a2d34;border-radius:12px;display:none;flex-direction:column;z-index:9999;
    font-family:'Inter',system-ui,sans-serif;color:#e7e7ea;box-shadow:0 8px 30px rgba(0,0,0,.5);}
  .tsm-asst-panel.open{display:flex;}
  .tsm-asst-header{padding:14px 16px;border-bottom:1px solid #2a2d34;display:flex;
    justify-content:space-between;align-items:center;}
  .tsm-asst-title{font-weight:600;font-size:13.5px;}
  .tsm-asst-sub{font-size:10.5px;color:#9a9aa2;margin-top:2px;}
  .tsm-asst-close{background:transparent;border:none;color:#9a9aa2;cursor:pointer;font-size:16px;}
  .tsm-asst-body{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px;}
  .tsm-a-msg{font-size:12.5px;line-height:1.5;padding:9px 11px;border-radius:9px;white-space:pre-wrap;}
  .tsm-a-msg.user{background:#2a2d34;align-self:flex-end;}
  .tsm-a-msg.bot{background:#1e2129;border:1px solid #2a2d34;}
  .tsm-a-msg.pending{color:#9a9aa2;font-style:italic;}
  .tsm-brief-head{font-size:11.5px;color:#9a9aa2;margin-bottom:8px;}
  .tsm-brief-item{border:1px solid #2a2d34;border-radius:8px;padding:9px 10px;margin-bottom:8px;}
  .tsm-brief-item:last-child{margin-bottom:0;}
  .tsm-brief-top{display:flex;align-items:center;gap:7px;margin-bottom:4px;}
  .tsm-sev{font-size:9.5px;font-weight:700;text-transform:uppercase;padding:2px 6px;border-radius:4px;}
  .tsm-sev.critical,.tsm-sev.urgent,.tsm-sev.high{background:#4a1d1d;color:#f28b82;}
  .tsm-sev.medium{background:#4a3a1d;color:#f2c48b;}
  .tsm-sev.low{background:#1d3a2a;color:#8bf2a8;}
  .tsm-brief-title{font-size:12.5px;font-weight:600;}
  .tsm-brief-next{font-size:11.5px;margin:3px 0;color:#d7d7dc;}
  .tsm-brief-why{font-size:10.5px;color:#9a9aa2;}
  .tsm-brief-open{margin-top:6px;background:transparent;border:1px solid #3a3d44;color:#e7e7ea;
    border-radius:6px;padding:4px 9px;font-size:10.5px;cursor:pointer;}
  .tsm-brief-empty{font-size:12px;color:#9a9aa2;}
  .tsm-asst-quick{display:flex;gap:6px;flex-wrap:wrap;padding:0 16px 10px;}
  .tsm-qchip{font-size:10.5px;background:#1e2129;border:1px solid #2a2d34;border-radius:20px;
    padding:5px 10px;cursor:pointer;color:#d7d7dc;}
  .tsm-qchip:hover{border-color:#e8a838;}
  .tsm-asst-input-row{display:flex;gap:8px;padding:12px 16px;border-top:1px solid #2a2d34;}
  .tsm-asst-input-row input{flex:1;background:#1e2129;border:1px solid #2a2d34;border-radius:8px;
    padding:9px 11px;color:#e7e7ea;font-size:12.5px;}
  .tsm-asst-input-row input:focus{outline:none;border-color:#e8a838;}
  .tsm-asst-send{background:#e8a838;color:#241705;border:none;border-radius:8px;padding:0 14px;
    font-weight:600;font-size:12px;cursor:pointer;}
  `;

  function injectStyle() {
    if (document.getElementById('tsm-asst-style')) return;
    const s = document.createElement('style');
    s.id = 'tsm-asst-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function init(opts) {
    const {
      vertical = 'TSM',
      app = 'enterprise',
      getContext = () => '',
      getBriefing = null,
      quickPrompts = [],
      endpoint = '/api/ai/query',
      buildRequestBody = null, // optional override for verticals with bespoke endpoint schemas
      threadKey = null, // optional: e.g. 'TSM_RE_ASSISTANT_THREAD'. When set, conversation
                         // history + open/closed state persist (sessionStorage) across full
                         // page navigations, so the assistant "follows" the user through a
                         // multi-page chain (War Room -> Strategist -> Exec Portal) instead
                         // of resetting to empty every time. Omit to keep current per-page
                         // behavior unchanged.
    } = opts || {};

    injectStyle();

    const MSG_KEY = threadKey ? threadKey + ':messages' : null;
    const OPEN_KEY = threadKey ? threadKey + ':open' : null;

    function loadThread() {
      if (!MSG_KEY) return [];
      try { return JSON.parse(sessionStorage.getItem(MSG_KEY) || '[]'); } catch (e) { return []; }
    }
    function saveThread(list) {
      if (!MSG_KEY) return;
      try { sessionStorage.setItem(MSG_KEY, JSON.stringify(list.slice(-40))); } catch (e) {}
    }
    function setOpenState(isOpen) {
      if (!OPEN_KEY) return;
      try { sessionStorage.setItem(OPEN_KEY, isOpen ? '1' : '0'); } catch (e) {}
    }
    let thread = loadThread();

    document.body.appendChild(el(`<button class="tsm-asst-fab" id="tsmAsstFab" title="Ask the ${esc(vertical)} Assistant">🤖</button>`));
    document.body.appendChild(el(`
      <div class="tsm-asst-panel" id="tsmAsstPanel">
        <div class="tsm-asst-header">
          <div>
            <div class="tsm-asst-title">${esc(vertical)} Assistant</div>
            <div class="tsm-asst-sub">${thread.length ? 'Continued from your last step' : 'WIP · Status · Ask about this workspace'}</div>
          </div>
          <button class="tsm-asst-close" id="tsmAsstClose">✕</button>
        </div>
        <div class="tsm-asst-body" id="tsmAsstBody"></div>
        <div class="tsm-asst-quick" id="tsmAsstQuick"></div>
        <div class="tsm-asst-input-row">
          <input type="text" id="tsmAsstInput" placeholder="Ask about status, WIP, or SLAs...">
          <button class="tsm-asst-send" id="tsmAsstSend">Send</button>
        </div>
      </div>
    `));

    const fab = document.getElementById('tsmAsstFab');
    const panel = document.getElementById('tsmAsstPanel');
    const closeBtn = document.getElementById('tsmAsstClose');
    const body = document.getElementById('tsmAsstBody');
    const input = document.getElementById('tsmAsstInput');
    const send = document.getElementById('tsmAsstSend');
    const quick = document.getElementById('tsmAsstQuick');

    quick.innerHTML = quickPrompts.map(q => `<span class="tsm-qchip">${esc(q)}</span>`).join('');
    quick.querySelectorAll('.tsm-qchip').forEach((chip, i) => {
      chip.addEventListener('click', () => ask(quickPrompts[i]));
    });

    // Restore prior conversation, if any, before anything else can add a
    // greeting/briefing message - this is what makes body.children.length
    // already non-zero on a followed page, so the fab-click handler below
    // naturally skips the greeting and just shows the continued thread.
    thread.forEach(m => {
      const div = document.createElement('div');
      div.className = 'tsm-a-msg ' + m.cls;
      div.textContent = m.text;
      body.appendChild(div);
    });
    if (thread.length) body.scrollTop = body.scrollHeight;
    if (OPEN_KEY) {
      try { if (sessionStorage.getItem(OPEN_KEY) === '1') panel.classList.add('open'); } catch (e) {}
    }

    function addMsg(text, cls, persist) {
      const div = document.createElement('div');
      div.className = 'tsm-a-msg ' + cls;
      div.textContent = text;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      if (persist !== false) {
        thread.push({ text, cls });
        saveThread(thread);
      }
      return div;
    }

    // Explainability-shaped briefing: severity + concrete next action + the
    // reasoning behind it (why it matters, what happens if left alone),
    // instead of a generic greeting.
    function addBriefingMsg(items) {
      const div = document.createElement('div');
      div.className = 'tsm-a-msg bot';
      if (!items || !items.length) {
        div.innerHTML = `<div class="tsm-brief-empty">No open flags or exceptions right now — you're caught up. Ask me anything about status, WIP, or how to use a specific module.</div>`;
        body.appendChild(div);
        body.scrollTop = body.scrollHeight;
        return div;
      }
      const rows = items.slice(0, 5).map(it => `
        <div class="tsm-brief-item">
          <div class="tsm-brief-top">
            <span class="tsm-sev ${esc((it.severity || 'medium').toLowerCase())}">${esc(it.severity || 'medium')}</span>
            <span class="tsm-brief-title">${esc(it.title || 'Untitled item')}</span>
          </div>
          <div class="tsm-brief-next"><strong>Next:</strong> ${esc(it.nextAction || '—')}</div>
          <div class="tsm-brief-why">${esc(it.why || '')}${it.riskOfInaction ? ' · <strong>If left:</strong> ' + esc(it.riskOfInaction) : ''}</div>
          ${it.tool ? `<button class="tsm-brief-open" data-tool="${esc(it.tool)}">Open ${esc(it.tool.replace('.html', ''))} ↗</button>` : ''}
        </div>`).join('');
      div.innerHTML = `<div class="tsm-brief-head">Here's what needs attention right now, ranked by severity:</div>${rows}`;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      div.querySelectorAll('.tsm-brief-open').forEach(btn => {
        btn.addEventListener('click', () => window.open(btn.dataset.tool, '_blank'));
      });
      return div;
    }

    async function ask(question) {
      if (!question || !question.trim()) return;
      addMsg(question, 'user');
      const pending = addMsg('Thinking…', 'bot pending', false);

      const ctx = getContext ? getContext() : '';
      const reqBody = buildRequestBody
        ? buildRequestBody(question, ctx)
        : { app, question, context: String(ctx).slice(0, 3000), maxTokens: 500 };

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody)
        });
        const data = await res.json();
        const answer = (data && (data.answer || data.content || data.reply || data.output)) ||
          "I couldn't get an answer back from the assistant service just now.";
        pending.textContent = answer;
        pending.classList.remove('pending');
        thread.push({ text: answer, cls: 'bot' });
        saveThread(thread);
      } catch (err) {
        const fallback = "I can't reach the assistant service right now, but here's what the workspace shows:\n\n" + ctx;
        pending.textContent = fallback;
        pending.classList.remove('pending');
        thread.push({ text: fallback, cls: 'bot' });
        saveThread(thread);
      }
    }

    fab.addEventListener('click', async () => {
      panel.classList.toggle('open');
      setOpenState(panel.classList.contains('open'));
      if (panel.classList.contains('open') && !body.children.length) {
        if (getBriefing) {
          const thinking = addMsg('Checking current status…', 'bot pending', false);
          try {
            const items = await getBriefing();
            thinking.remove();
            addBriefingMsg(items);
          } catch (e) {
            thinking.remove();
            addMsg(`Hi — I can help with status, WIP, and questions for this workspace. Ask me anything, or tap a suggestion below.`, 'bot');
          }
        } else {
          addMsg(`Hi — I can help with status, WIP, and questions for this workspace. Ask me anything, or tap a suggestion below.`, 'bot');
        }
      }
    });
    closeBtn.addEventListener('click', () => { panel.classList.remove('open'); setOpenState(false); });
    send.addEventListener('click', () => { const q = input.value; input.value = ''; ask(q); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const q = input.value; input.value = ''; ask(q); }
    });

    return { ask };
  }

  global.TSMAssistant = { init };
})(window);
