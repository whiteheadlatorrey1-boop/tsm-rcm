/**
 * TSM Mission System · Shared Library
 * Hub writes → Node reads → localStorage synced
 *
 * Keys:
 *   tsm_active_mission   → { vertical, label, progression_steps[], generated_at }
 *   tsm_mission_queue    → [ { id, vertical, label, status, step_index, completion_pct } ]
 */

const TSMMission = (() => {

  const MISSION_KEY  = 'tsm_active_mission';
  const QUEUE_KEY    = 'tsm_mission_queue';

  /* ── WRITE ─────────────────────────────────────── */

  function setActiveMission(vertical, label, steps) {
    const mission = {
      vertical,
      label,
      progression_steps: steps,
      generated_at: Date.now()
    };
    localStorage.setItem(MISSION_KEY, JSON.stringify(mission));

    // Upsert queue entry
    const queue = getQueue();
    const existing = queue.findIndex(q => q.vertical === vertical);
    const entry = {
      id: `tsm-${vertical}-${Date.now()}`,
      vertical,
      label,
      status: 'active',
      step_index: 0,
      completion_pct: 0
    };
    if (existing >= 0) queue[existing] = entry;
    else queue.push(entry);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    return mission;
  }

  function advanceStep(vertical, completedIndex) {
    const mission = getActiveMission();
    if (!mission || mission.vertical !== vertical) return null;

    const total = mission.progression_steps.length;
    const newIndex = completedIndex + 1;
    const pct = Math.round((newIndex / total) * 100);
    const done = newIndex >= total;

    const queue = getQueue();
    const qi = queue.findIndex(q => q.vertical === vertical);
    if (qi >= 0) {
      queue[qi].step_index = newIndex;
      queue[qi].completion_pct = done ? 100 : pct;
      queue[qi].status = done ? 'complete' : 'active';
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }

    return { newIndex, pct: done ? 100 : pct, done };
  }

  /* ── READ ──────────────────────────────────────── */

  function getActiveMission() {
    try { return JSON.parse(localStorage.getItem(MISSION_KEY)); }
    catch { return null; }
  }

  function getQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; }
    catch { return []; }
  }

  function getQueueEntry(vertical) {
    return getQueue().find(q => q.vertical === vertical) || null;
  }

  function getMissionForVertical(vertical) {
    const m = getActiveMission();
    return (m && m.vertical === vertical) ? m : null;
  }

  /* ── STEP HINTS ────────────────────────────────── */
  // Derived from step text — first imperative verb phrase
  function extractHint(stepText) {
    const clean = stepText.replace(/^step\s*\d+[:\.\-]\s*/i, '').trim();
    const sentences = clean.split(/[.!]/);
    return sentences[0] ? sentences[0].trim().substring(0, 90) : clean.substring(0, 90);
  }

  return { setActiveMission, advanceStep, getActiveMission, getQueue, getQueueEntry, getMissionForVertical, extractHint };
})();

window.TSMMission = TSMMission;