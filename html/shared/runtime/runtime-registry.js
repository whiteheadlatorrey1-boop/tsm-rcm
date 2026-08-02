/**
 * runtime-registry.js
 * Central registry so every page declares what it is and what it uses.
 * Pure client-side, no dependencies. Attaches to window.RuntimeRegistry.
 */
(function (global) {
  const PAGES = new Map();

  function register(entry) {
    if (!entry || !entry.page) {
      console.warn('[RuntimeRegistry] register() requires at least { page }');
      return;
    }
    const record = Object.assign({
      vertical: null,
      runtime: 'legacy',      // 'mission' | 'legacy'
      version: '0.0.0',
      capabilities: [],
      registeredAt: new Date().toISOString()
    }, entry);
    PAGES.set(entry.page, record);
    if (global.RuntimeEvents) {
      global.RuntimeEvents.publish('PAGE_REGISTERED', record);
    }
  }

  function get(page) {
    return PAGES.get(page) || null;
  }

  function all() {
    return Array.from(PAGES.values());
  }

  function adoptionSummary() {
    const total = PAGES.size;
    const onMission = all().filter(p => p.runtime === 'mission').length;
    return {
      total,
      onMission,
      pct: total ? Math.round((onMission / total) * 100) : 0
    };
  }

  global.RuntimeRegistry = { register, get, all, adoptionSummary };
})(typeof window !== 'undefined' ? window : globalThis);
