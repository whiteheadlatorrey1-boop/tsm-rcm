/**
 * sweet-music-engine.js
 * TSM Sweet Music™ OS — Shared Module Bus
 * Handles localStorage state, cross-module handoffs, and Neural Core API wrapper
 */

const SMOS = (() => {

  const KEYS = {
    BEAT_INTEL:    'smos_beat_intel',
    SONG:          'smos_song',
    SESSION:       'smos_session',
    MENTOR:        'smos_mentor_prefs',
    RELEASE_META:  'smos_release_meta',
  };

  // ── Storage ──────────────────────────────────────────────────
  const store = {
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); return true; }
      catch(e) { console.warn('[SMOS] store.set failed:', e); return false; }
    },
    get(key) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
      catch(e) { return null; }
    },
    clear(key) { try { localStorage.removeItem(key); } catch(e) {} }
  };

  // ── Beat Intel bus ────────────────────────────────────────────
  const beatIntel = {
    save(data)  { store.set(KEYS.BEAT_INTEL, data); },
    load()      { return store.get(KEYS.BEAT_INTEL) || {}; },
    clear()     { store.clear(KEYS.BEAT_INTEL); }
  };

  // ── Song bus ──────────────────────────────────────────────────
  const song = {
    save(data)  { store.set(KEYS.SONG, data); },
    load()      { return store.get(KEYS.SONG) || {}; },
    clear()     { store.clear(KEYS.SONG); }
  };

  // ── Release metadata bus ──────────────────────────────────────
  const releaseMeta = {
    save(data)  { store.set(KEYS.RELEASE_META, data); },
    load()      { return store.get(KEYS.RELEASE_META) || {}; },
    clear()     { store.clear(KEYS.RELEASE_META); }
  };

  // ── Mentor preferences ────────────────────────────────────────
  const mentor = {
    save(prefs) { store.set(KEYS.MENTOR, prefs); },
    load()      { return store.get(KEYS.MENTOR) || { inspirations: [], genre: '', style: '' }; }
  };

  // ── TSM Neural Core API wrapper ───────────────────────────────
  async function ask(userPrompt, systemPrompt = '', maxTokens = 1000) {
    const res = await fetch('/api/music/sweet/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: systemPrompt, prompt: userPrompt, maxTokens })
    });

    if (!res.ok) throw new Error(`Neural Core error: ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Neural Core error');
    return data.text;
  }

  async function askJSON(userPrompt, systemPrompt = '') {
    const sys = (systemPrompt || '') + '\nRespond ONLY with valid JSON. No markdown, no preamble.';
    const text = await ask(userPrompt, sys);
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  }

  // ── Navigation helpers ────────────────────────────────────────
  const nav = {
    base: (() => {
      const p = window.location.pathname;
      const idx = p.indexOf('/music-command/');
      return idx >= 0 ? p.slice(0, idx + '/music-command/'.length) : '/html/music-command/';
    })(),
    go(path) { window.location.href = this.base + path; },
    toSongBuilder()     { this.go('creation/song-builder.html'); },
    toBeatWorkbench()   { this.go('creation/beat-workbench.html'); },
    toCadence()         { this.go('cadence-builder.html'); },
    toProducerAI()      { this.go('producer/producer-ai.html'); },
    toRecordingCoach()  { this.go('producer/recording-coach.html'); },
    toMixCoach()        { this.go('producer/mixing-coach.html'); },
    toMasterCoach()     { this.go('producer/mastering-coach.html'); },
    toDAWAcademy()      { this.go('academy/daw-academy.html'); },
    toReleaseCenter()   { this.go('release/release-center.html'); },
    toMarketing()       { this.go('release/marketing.html'); },
    toAnalytics()       { this.go('analytics.html'); },
    toDashboard()       { this.go('index.html'); }
  };

  // ── Pipeline stage renderer ───────────────────────────────────
  function renderPipeline(containerId, activeStage) {
    const stages = ['Idea','Beat','Cadence','Producer','Lyrics','Arrangement','Recording','Mix','Master','Release','Marketing','Analytics'];
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = stages.map(s =>
      `<span class="pipe-stage ${s === activeStage ? 'pipe-active' : ''}">${s}</span><span class="pipe-sep">→</span>`
    ).slice(0,-1).join('');
  }

  // ── Beat intel summary (for injecting into other pages) ───────
  function beatContextString() {
    const d = beatIntel.load();
    if (!d.bpm) return 'No beat analyzed yet.';
    return `Genre: ${d.genre || '?'} | BPM: ${d.bpm} | Key: ${d.key || '?'} | Mood: ${d.mood || '?'} | Energy: ${d.energy || '?'}`;
  }

  // ── Session init ──────────────────────────────────────────────
  function init() {
    const session = store.get(KEYS.SESSION) || {};
    session.lastActive = Date.now();
    session.version = '2.0';
    store.set(KEYS.SESSION, session);
    console.log('[SMOS] Sweet Music™ OS Engine v2.0 initialized');
  }

  // ── Public API ────────────────────────────────────────────────
  return { KEYS, store, beatIntel, song, releaseMeta, mentor, ask, askJSON, nav, renderPipeline, beatContextString, init };

})();

// Auto-init
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => SMOS.init());
  window.SMOS = SMOS;
}
