/* ═══════════════════════════════════════════════════════════
   TSM RELEVANCE ENGINE + WAR ROOM REGISTRY
   /architecture/kernel/relevance-engine.js
   Requires metadata-engine.js loaded first (for TSMMetadataEngine,
   optional — relevance engine works standalone off TSMExtraction).
═══════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  const registry = [];

  function register(def) {
    if (!def || !def.id) throw new Error("TSMRegistry.register requires an id");
    const existing = registry.findIndex((r) => r.id === def.id);
    const entry = {
      id: def.id,
      title: def.title || def.id,
      entities: def.entities || [],
      weights: def.weights || {},
      route: def.route || "",
      color: def.color || "#38bdf8"
    };
    if (existing >= 0) registry[existing] = entry;
    else registry.push(entry);
    return entry;
  }

  function all() {
    return registry.slice();
  }

  function get(id) {
    return registry.find((r) => r.id === id) || null;
  }

  /**
   * Score every registered war room against a TSMExtraction object.
   * Optionally accepts a launchSeed (from war-room-prep.html's
   * sessionStorage.tsmWarRoomLaunch payload) to boost a specific
   * sector and surface a "seeded" reason in the Why? panel.
   */
  function rankWarRooms(extraction, launchSeed) {
    if (!extraction || !extraction.entities) {
      return { ranked: [], topScore: 0 };
    }

    const ranked = registry.map((room) => {
      let score = 0;
      const matched = [];

      room.entities.forEach((entityKey) => {
        const val = extraction.entities[entityKey];
        if (val && val.length) {
          const weight = room.weights[entityKey] || 1;
          score += weight;
          matched.push(entityKey);
        }
      });

      return {
        room,
        score,
        matched,
        seeded: false,
        seedReason: null
      };
    });

    if (launchSeed && launchSeed.sector) {
      const match = ranked.find((r) => r.room.id === launchSeed.sector);
      if (match) {
        const boost = (launchSeed.explainability && launchSeed.explainability.confidence) || 0;
        match.score += boost;
        match.seeded = true;
        match.seedReason = (launchSeed.explainability && launchSeed.explainability.reasoning) ||
          `Seeded from War Room Prep launch (${launchSeed.origin || "war-room-prep"})`;
      }
    }

    ranked.sort((a, b) => b.score - a.score);

    const maxPossible = ranked.reduce((max, r) => {
      const roomMax = r.room.entities.reduce((sum, e) => sum + (r.room.weights[e] || 1), 0);
      return Math.max(max, roomMax);
    }, 1);

    ranked.forEach((r) => {
      r.confidencePct = Math.round(Math.min(r.score / maxPossible, 1) * 100);
    });

    return { ranked, topScore: ranked.length ? ranked[0].score : 0 };
  }

  /** Build the "Why?" explainability payload for a single ranked entry. */
  function explain(rankedEntry) {
    if (!rankedEntry) return null;
    return {
      room: rankedEntry.room.id,
      label: rankedEntry.room.title,
      confidence: rankedEntry.confidencePct,
      matched: rankedEntry.matched,
      seeded: rankedEntry.seeded,
      seedReason: rankedEntry.seedReason
    };
  }

  /** Reads the launch seed written by war-room-prep.html, if present. */
  function readLaunchSeed() {
    try {
      const qs = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
      let seed = null;
      try {
        const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("tsmWarRoomLaunch") : null;
        if (raw) seed = JSON.parse(raw);
      } catch (e) {
        seed = null;
      }

      const sector = qs.get("sector") || (seed && seed.sector);
      if (!sector) return null;

      return {
        sector,
        title: qs.get("title") || (seed && seed.title) || sector,
        scenario: qs.get("scenario") || (seed && seed.scenario) || "",
        explainability: (seed && seed.explainability) || null,
        origin: "war-room-prep"
      };
    } catch (e) {
      return null;
    }
  }

  const TSMRegistry = { register, all, get };
  const TSMRelevanceEngine = { rankWarRooms, explain, readLaunchSeed };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { TSMRegistry, TSMRelevanceEngine };
  } else {
    global.TSMRegistry = TSMRegistry;
    global.TSMRelevanceEngine = TSMRelevanceEngine;
  }
})(typeof window !== "undefined" ? window : globalThis);