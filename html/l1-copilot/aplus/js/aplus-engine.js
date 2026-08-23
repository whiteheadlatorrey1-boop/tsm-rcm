/* ============================================================
   TSM A+ Training Engine — Phase 1 Foundation
   ------------------------------------------------------------
   Question Engine + Answer Intelligence + Mastery/Remediation,
   consolidated into one file deliberately (per build-order note:
   don't scatter into disconnected files before the pattern is
   proven). Depends on APLUS_QUESTION_BANK / APLUS_OBJECTIVES from
   ../data/aplus-question-bank.js loaded first.

   Storage: localStorage, same convention as the existing
   study-check / servicenow prep tools in this repo (plain string
   keys, no framework). Namespaced under `tsm_aplus_`.
   ============================================================ */

const TSMAplusEngine = (function () {
  const MASTERY_KEY = 'tsm_aplus_mastery_v1';
  const WEAK_THRESHOLD = 0.6;   // below this accuracy (with enough attempts) = weak area
  const MIN_ATTEMPTS_FOR_SIGNAL = 3;

  /* ---------- Question Engine ---------- */

  function getBank() {
    return (typeof APLUS_QUESTION_BANK !== 'undefined') ? APLUS_QUESTION_BANK : [];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Build a session: `count` questions, optionally restricted to one objective,
  // choices shuffled per attempt so the correct letter isn't memorizable.
  function buildSession(count, objectiveId) {
    let pool = getBank();
    if (objectiveId) pool = pool.filter(q => q.objective === objectiveId);
    const picked = shuffle(pool).slice(0, count || pool.length);
    return picked.map(q => ({
      ...q,
      choices: shuffle(q.choices)
    }));
  }

  function getQuestionById(id) {
    return getBank().find(q => q.id === id) || null;
  }

  /* ---------- Answer Intelligence ---------- */

  // Evaluates a picked choice against a question and returns everything
  // the UI needs to teach from — not just right/wrong.
  function evaluateAnswer(question, pickedChoiceId) {
    const picked = question.choices.find(c => c.id === pickedChoiceId);
    const correctChoice = question.choices.find(c => c.correct);
    if (!picked || !correctChoice) return null;

    return {
      isCorrect: !!picked.correct,
      picked,
      correctChoice,
      // every choice annotated, so the UI can render "what every option teaches"
      allChoices: question.choices.map(c => ({
        ...c,
        isPicked: c.id === pickedChoiceId
      })),
      concept: picked.concept || correctChoice.concept || null
    };
  }

  /* ---------- Mastery Engine ---------- */

  function loadMastery() {
    try {
      const raw = localStorage.getItem(MASTERY_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveMastery(data) {
    try {
      localStorage.setItem(MASTERY_KEY, JSON.stringify(data));
    } catch (e) { /* storage unavailable — mastery just won't persist */ }
  }

  // Records one attempt. Tracks both by A+ objective (domain) and by the
  // finer-grained `concept` tag, so remediation can say "you keep mixing up
  // ping vs ipconfig" rather than only "networking is weak."
  function recordAttempt(objectiveId, conceptId, isCorrect) {
    const data = loadMastery();
    [['objectives', objectiveId], ['concepts', conceptId]].forEach(([bucket, key]) => {
      if (!key) return;
      if (!data[bucket]) data[bucket] = {};
      if (!data[bucket][key]) data[bucket][key] = { correct: 0, total: 0 };
      data[bucket][key].total++;
      if (isCorrect) data[bucket][key].correct++;
    });
    saveMastery(data);
    return data;
  }

  function getMasteryReport() {
    const data = loadMastery();
    const objectives = data.objectives || {};
    const report = {};
    Object.keys(objectives).forEach(k => {
      const { correct, total } = objectives[k];
      report[k] = { correct, total, pct: total ? Math.round((correct / total) * 100) : null };
    });
    return report;
  }

  // Weak concepts = enough attempts AND below threshold. This is what
  // "Teach Me Until I Get It" / remediation would hook into next.
  function getWeakConcepts() {
    const data = loadMastery();
    const concepts = data.concepts || {};
    return Object.keys(concepts)
      .map(k => ({ concept: k, ...concepts[k], pct: concepts[k].total ? concepts[k].correct / concepts[k].total : 0 }))
      .filter(c => c.total >= MIN_ATTEMPTS_FOR_SIGNAL && c.pct < WEAK_THRESHOLD)
      .sort((a, b) => a.pct - b.pct);
  }

  function resetMastery() {
    saveMastery({});
  }

  return {
    buildSession,
    getQuestionById,
    evaluateAnswer,
    recordAttempt,
    getMasteryReport,
    getWeakConcepts,
    resetMastery
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TSMAplusEngine };
}
