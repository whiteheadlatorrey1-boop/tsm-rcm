/**
 * ==========================================
 * TSM RUNTIME ENGINE v1
 * Single control layer for entire platform
 * ==========================================
 */

(function () {
  const TSM = window.TSM = window.TSM || {};

  // -----------------------------
  // CONFIG
  // -----------------------------
  TSM.config = {
    api: {
      financial: "/api/financial/query",
      construction: "/api/construction/query",
      insurance: "/api/insurance/query"
    },
    groq: "https://api.groq.com/openai/v1/chat/completions",
    model: "openai/gpt-oss-120b"
  };

  // -----------------------------
  // STATE STORE (GLOBAL SINGLE SOURCE)
  // -----------------------------
  TSM.state = {
    initialized: false,
    scores: {},
    context: null
  };

  // -----------------------------
  // SAFE FETCH WRAPPER
  // -----------------------------
  TSM.api = async function (type, payload) {
    const url = TSM.config.api[type] || type;

    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!r.ok) throw new Error("API " + r.status);
      return await r.json();
    } catch (e) {
      console.warn("[TSM API FAIL]", type, e.message);
      return null;
    }
  };

  // -----------------------------
  // SCORE ENGINE (NO 0% BUG)
  // -----------------------------
  TSM.score = {
    calculate: function () {
      const checks = document.querySelectorAll(
        '.check,[class*="check"],[data-complete="true"]'
      );

      let done = 0;

      checks.forEach(el => {
        if (el.textContent.includes("✓") || el.dataset.done === "true") {
          done++;
        }
      });

      const total = Math.max(checks.length, 1); // prevents divide-by-zero bug
      const pct = Math.round((done / total) * 100);

      return { done, total, pct };
    },

    render: function () {
      const s = TSM.score.calculate();

      const pctEl = document.querySelector(
        '[class*="pct"],[class*="score"],#score,#pct'
      );

      if (pctEl) pctEl.textContent = s.pct + "%";

      const gradeEl = document.querySelector(
        '[class*="grade"],#grade'
      );

      if (gradeEl) {
        gradeEl.textContent =
          s.pct >= 90 ? "A" :
          s.pct >= 80 ? "B" :
          s.pct >= 70 ? "C" :
          s.pct >= 60 ? "D" : "F";
      }

      TSM.state.scores.last = s;
      return s;
    }
  };

  // -----------------------------
  // ACTION DISPATCHER
  // -----------------------------
  TSM.actions = {
    run: async function (type, prompt) {
      const res = await TSM.api(type, {
        query: prompt,
        maxTokens: 1024
      });

      return res?.answer || res?.result || res;
    }
  };

  // -----------------------------
  // LAUNCHER REGISTRY
  // -----------------------------
  TSM.launcher = {
    registry: {},

    register: function (name, fn) {
      this.registry[name] = fn;
    },

    run: function (name, ...args) {
      if (this.registry[name]) {
        return this.registry[name](...args);
      }
      console.warn("[TSM] Missing launcher:", name);
    }
  };

  // -----------------------------
  // AUTO BUTTON WIRING (GLOBAL)
  // -----------------------------
  function wireButtons() {
    document.querySelectorAll("button").forEach(btn => {
      if (btn.dataset.tsmWired) return;
      btn.dataset.tsmWired = "1";

      btn.addEventListener("click", async () => {
        const label = btn.innerText?.toLowerCase() || "";

        if (label.includes("summary")) {
          const res = await TSM.actions.run("construction", "generate summary");
          console.log("[SUMMARY]", res);
        }

        if (label.includes("assign")) {
          const res = await TSM.actions.run("construction", "assign owner");
          console.log("[ASSIGN]", res);
        }
      });
    });
  }

  // -----------------------------
  // INITIALIZE ENGINE
  // -----------------------------
  function init() {
    if (TSM.state.initialized) return;

    wireButtons();
    TSM.score.render();

    setInterval(() => {
      TSM.score.render();
    }, 1500);

    TSM.state.initialized = true;

    console.log("[TSM ENGINE v1 ACTIVE]");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
