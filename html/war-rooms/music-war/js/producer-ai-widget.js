/**
 * producer-ai-widget.js
 * TSM Sweet Music™ OS — Floating Producer AI (ZAY)
 *
 * A persistent floating assistant that lives on every music-command page.
 * Reactive: watches SMOS state for stage transitions and surfaces a single
 *           dismissible nudge toward the logical next step.
 * Proactive: click-to-open chat panel, calls /api/music/sweet/ai with the
 *            current page + SMOS context so ZAY can answer in-context.
 *
 * Requires sweet-music-engine.js to be loaded first (depends on window.SMOS).
 *
 * Usage: <script src="../js/producer-ai-widget.js"></script>
 *        (adjust relative path per page depth, same convention as sweet-music-engine.js)
 */

(function () {
  if (typeof window === 'undefined') return;

  function boot() {
    if (!window.SMOS) {
      console.warn('[ProducerAI] SMOS engine not found — widget disabled on this page.');
      return;
    }
    injectStyles();
    injectMarkup();
    wireEvents();
    maybeShowReactiveNudge();
  }

  // ── Styles ──────────────────────────────────────────────────────
  function injectStyles() {
    const css = `
      #pai-bubble{position:fixed;bottom:22px;right:22px;width:54px;height:54px;border-radius:50%;
        background:var(--purple,#b388ff);color:#000;display:flex;align-items:center;justify-content:center;
        font-size:1.3rem;cursor:pointer;z-index:9999;box-shadow:0 4px 18px rgba(179,136,255,0.45);
        border:none;transition:transform 0.15s ease;font-family:'IBM Plex Mono',monospace;}
      #pai-bubble:hover{transform:scale(1.07);}
      #pai-bubble .pai-dot{position:absolute;top:-2px;right:-2px;width:12px;height:12px;border-radius:50%;
        background:var(--cyan,#00e5ff);border:2px solid var(--bg,#0a0a0c);display:none;}
      #pai-bubble.pai-has-nudge .pai-dot{display:block;}

      #pai-nudge{position:fixed;bottom:88px;right:22px;max-width:280px;background:var(--card,#13131f);
        border:1px solid rgba(179,136,255,0.35);border-radius:10px;padding:14px 16px;z-index:9998;
        font-family:'IBM Plex Mono',monospace;font-size:0.72rem;color:var(--text,#e0e0e0);line-height:1.5;
        box-shadow:0 8px 24px rgba(0,0,0,0.5);display:none;animation:paiSlideIn 0.25s ease;}
      #pai-nudge.show{display:block;}
      @keyframes paiSlideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      #pai-nudge .pai-nudge-label{font-family:'Orbitron',sans-serif;font-size:0.55rem;color:var(--purple,#b388ff);
        letter-spacing:0.15em;margin-bottom:8px;text-transform:uppercase;}
      #pai-nudge .pai-nudge-actions{display:flex;gap:8px;margin-top:12px;}
      #pai-nudge button{font-family:'Orbitron',sans-serif;font-size:0.58rem;font-weight:700;border-radius:5px;
        padding:7px 12px;cursor:pointer;border:none;}
      #pai-nudge .pai-go{background:var(--purple,#b388ff);color:#000;}
      #pai-nudge .pai-dismiss{background:transparent;color:var(--muted,#666680);border:1px solid var(--border,#1e1e2e);}

      #pai-panel{position:fixed;bottom:22px;right:22px;width:320px;max-height:440px;background:var(--card,#13131f);
        border:1px solid rgba(179,136,255,0.35);border-radius:12px;z-index:9999;display:none;flex-direction:column;
        font-family:'IBM Plex Mono',monospace;box-shadow:0 12px 36px rgba(0,0,0,0.6);overflow:hidden;}
      #pai-panel.show{display:flex;}
      #pai-panel-header{padding:14px 16px;border-bottom:1px solid var(--border,#1e1e2e);display:flex;
        align-items:center;justify-content:space-between;background:rgba(179,136,255,0.05);}
      #pai-panel-header .pai-title{font-family:'Orbitron',sans-serif;font-size:0.68rem;color:var(--purple,#b388ff);
        letter-spacing:0.1em;}
      #pai-panel-header .pai-title small{display:block;font-size:0.52rem;color:var(--muted,#666680);margin-top:2px;
        letter-spacing:0.05em;}
      #pai-close{background:none;border:none;color:var(--muted,#666680);cursor:pointer;font-size:1rem;line-height:1;}
      #pai-close:hover{color:var(--text,#e0e0e0);}
      #pai-messages{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px;
        min-height:120px;max-height:260px;}
      .pai-msg{font-size:0.72rem;line-height:1.55;padding:9px 12px;border-radius:8px;max-width:90%;}
      .pai-msg-zay{background:var(--surface,#111118);color:var(--text,#e0e0e0);align-self:flex-start;
        border:1px solid var(--border,#1e1e2e);}
      .pai-msg-user{background:rgba(179,136,255,0.15);color:var(--text,#e0e0e0);align-self:flex-end;}
      #pai-input-row{display:flex;gap:8px;padding:12px 14px;border-top:1px solid var(--border,#1e1e2e);}
      #pai-input{flex:1;background:var(--surface,#111118);border:1px solid var(--border,#1e1e2e);border-radius:6px;
        padding:8px 10px;color:var(--text,#e0e0e0);font-family:'IBM Plex Mono',monospace;font-size:0.72rem;outline:none;}
      #pai-input:focus{border-color:var(--purple,#b388ff);}
      #pai-send{background:var(--purple,#b388ff);color:#000;border:none;border-radius:6px;padding:0 12px;
        cursor:pointer;font-family:'Orbitron',sans-serif;font-size:0.6rem;font-weight:700;}
      .pai-thinking{font-size:0.68rem;color:var(--muted,#666680);align-self:flex-start;}
    `;
    const style = document.createElement('style');
    style.id = 'pai-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Markup ──────────────────────────────────────────────────────
  function injectMarkup() {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="pai-nudge"></div>
      <div id="pai-panel">
        <div id="pai-panel-header">
          <div class="pai-title">🎚️ ZAY<small>Your Producer AI</small></div>
          <button id="pai-close" aria-label="Close">✕</button>
        </div>
        <div id="pai-messages"></div>
        <div id="pai-input-row">
          <input id="pai-input" type="text" placeholder="Ask ZAY anything..." />
          <button id="pai-send">→</button>
        </div>
      </div>
      <button id="pai-bubble" aria-label="Open Producer AI">🎚️<span class="pai-dot"></span></button>
    `;
    document.body.appendChild(wrap);
  }

  // ── State ───────────────────────────────────────────────────────
  const PAI_KEY = 'smos_producer_ai_state';
  function loadState() {
    return SMOS.store.get(PAI_KEY) || { lastNudgeStage: null, dismissed: {} };
  }
  function saveState(s) {
    SMOS.store.set(PAI_KEY, s);
  }

  // ── Reactive nudges ─────────────────────────────────────────────
  // Each rule: condition based on SMOS state + current page, returns a nudge or null.
  function getApplicablePage() {
    const p = window.location.pathname;
    if (p.includes('song-builder')) return 'song-builder';
    if (p.includes('cadence-builder')) return 'cadence-builder';
    if (p.includes('beat-workbench')) return 'beat-workbench';
    if (p.includes('producer-ai')) return 'producer-ai';
    if (p.includes('/index.html') || p.endsWith('/music-command/')) return 'dashboard';
    return 'other';
  }

  function maybeShowReactiveNudge() {
    const page = getApplicablePage();
    const state = loadState();
    const song = SMOS.song.load();
    const beat = SMOS.beatIntel.load();

    let nudge = null;
    let stageKey = null;

    if (page === 'song-builder' && song && song.verse1) {
      stageKey = 'song-ready';
      nudge = {
        text: "Song's ready — want me to check your flow and syllable count in Cadence Studio?",
        actionLabel: '→ Cadence Studio',
        action: () => SMOS.nav.toCadence()
      };
    } else if (page === 'dashboard' && beat && beat.bpm && !(song && song.verse1)) {
      stageKey = 'beat-no-song';
      nudge = {
        text: `You've got a beat locked in (${beat.genre || 'genre'} · ${beat.bpm} BPM) but no song yet — want to build one around it?`,
        actionLabel: '→ Song Builder',
        action: () => SMOS.nav.toSongBuilder()
      };
    } else if (page === 'cadence-builder' && song && song.verse1) {
      // only nudge once they've likely finished analyzing — keep light touch, no auto-detect of analysis completion yet
      stageKey = 'cadence-loaded';
      nudge = null; // reserved for future: nudge toward Recording Coach once flow is solid
    }

    if (nudge && stageKey && state.lastNudgeStage !== stageKey && !state.dismissed[stageKey]) {
      showNudge(nudge, stageKey);
    }
  }

  function showNudge(nudge, stageKey) {
    const el = document.getElementById('pai-nudge');
    el.innerHTML = `
      <div class="pai-nudge-label">🎚️ ZAY suggests</div>
      <div>${nudge.text}</div>
      <div class="pai-nudge-actions">
        <button class="pai-go">${nudge.actionLabel}</button>
        <button class="pai-dismiss">Not now</button>
      </div>
    `;
    el.classList.add('show');
    document.getElementById('pai-bubble').classList.add('pai-has-nudge');

    el.querySelector('.pai-go').onclick = () => {
      el.classList.remove('show');
      nudge.action();
    };
    el.querySelector('.pai-dismiss').onclick = () => {
      el.classList.remove('show');
      const state = loadState();
      state.dismissed[stageKey] = true;
      state.lastNudgeStage = stageKey;
      saveState(state);
      document.getElementById('pai-bubble').classList.remove('pai-has-nudge');
    };

    const state = loadState();
    state.lastNudgeStage = stageKey;
    saveState(state);
  }

  // ── Proactive chat ──────────────────────────────────────────────
  function wireEvents() {
    const bubble = document.getElementById('pai-bubble');
    const panel = document.getElementById('pai-panel');
    const nudgeEl = document.getElementById('pai-nudge');
    const closeBtn = document.getElementById('pai-close');
    const sendBtn = document.getElementById('pai-send');
    const input = document.getElementById('pai-input');

    bubble.addEventListener('click', () => {
      nudgeEl.classList.remove('show');
      panel.classList.toggle('show');
      bubble.classList.remove('pai-has-nudge');
      if (panel.classList.contains('show') && !panel.dataset.greeted) {
        panel.dataset.greeted = '1';
        addMessage('zay', "What's up — I'm ZAY, your producer. Ask me anything about where you are in the process, or what to do next.");
      }
    });

    closeBtn.addEventListener('click', () => panel.classList.remove('show'));

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      addMessage('user', text);
      input.value = '';
      const thinkingEl = addThinking();

      const page = getApplicablePage();
      const song = SMOS.song.load();
      const beat = SMOS.beatIntel.load();
      const context = `Current page: ${page}. Beat context: ${beat && beat.bpm ? `${beat.genre||'?'} ${beat.bpm}BPM ${beat.key||''}` : 'none set'}. Song built: ${song && song.verse1 ? 'yes' : 'no'}.`;

      try {
        const reply = await SMOS.ask(
          `User question: "${text}"\nContext: ${context}\nRespond in 1-3 short sentences, practical and direct, like a producer in the room. Suggest a single next concrete action if relevant.`,
          "You are ZAY, an experienced, encouraging but no-nonsense music producer AI embedded as a floating assistant inside Sweet Music OS. Keep replies brief and conversational, never a list."
        );
        thinkingEl.remove();
        addMessage('zay', reply);
      } catch (e) {
        thinkingEl.remove();
        addMessage('zay', "Couldn't reach the studio line just now — try that again in a sec.");
      }
    }

    function addMessage(who, text) {
      const messages = document.getElementById('pai-messages');
      const div = document.createElement('div');
      div.className = `pai-msg pai-msg-${who === 'zay' ? 'zay' : 'user'}`;
      div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    function addThinking() {
      const messages = document.getElementById('pai-messages');
      const div = document.createElement('div');
      div.className = 'pai-thinking';
      div.textContent = 'ZAY is thinking...';
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
      return div;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();